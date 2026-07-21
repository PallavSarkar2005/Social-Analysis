import https from "https";
import http from "http";
import { stripHonorifics } from "../providers/shared/politicalIdentityUtils.js";

const hasText = (v) => typeof v === "string" && v.trim().length > 0;

export const ALLOWED_EVIDENCE_PROVIDERS = new Set([
  "Wikipedia",
  "Election Commission of India",
  "Official Government",
  "Lok Sabha",
  "Rajya Sabha",
  "Official Party Website",
  "Verified News",
  "News Sources",
  "Official Biography",
  "Verified Biography",
]);

export function identityNameTokens(name = "") {
  return stripHonorifics(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !["of", "the", "and", "dr", "shri", "smt"].includes(t));
}

export function slugifyName(name = "") {
  return identityNameTokens(name).join("_");
}

function decodePathSegment(segment = "") {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Heuristic: does the URL path look like it belongs to this politician?
 */
export function urlMatchesIdentity(url, identity = {}) {
  if (!hasText(url)) return { matchedIdentity: false, reason: "missing_url" };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { matchedIdentity: false, reason: "invalid_url" };
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const path = decodePathSegment(parsed.pathname || "").toLowerCase();
  const tokens = identityNameTokens(identity.name || "");
  if (tokens.length === 0) {
    // No name to match — allow only non-person-specific provider roots
    if (
      host.includes("eci.gov.in") ||
      host.includes("wikipedia.org") ||
      host.includes("gov.in")
    ) {
      return { matchedIdentity: true, reason: "provider_root_no_name" };
    }
    return { matchedIdentity: false, reason: "no_identity_name" };
  }

  const slug = tokens.join("_");
  const compact = tokens.join("");
  const pathCompact = path.replace(/[^a-z0-9]/g, "");

  // Wikipedia article slug must contain the politician name tokens
  if (host.includes("wikipedia.org")) {
    const wikiTitle = path.split("/wiki/")[1] || "";
    const titleNorm = wikiTitle.replace(/_/g, " ").toLowerCase();
    const allPresent = tokens.every((t) => titleNorm.includes(t) || pathCompact.includes(t));
    if (!allPresent) {
      return { matchedIdentity: false, reason: "wikipedia_name_mismatch" };
    }
    return { matchedIdentity: true, reason: "wikipedia_slug" };
  }

  // Person-specific parliamentary / profile URLs should mention the name in path or query
  if (host.includes("sansad.in") || host.includes("loksabha") || host.includes("rajyasabha")) {
    const hay = `${path} ${parsed.search}`.toLowerCase();
    const hit = tokens.filter((t) => hay.includes(t) || pathCompact.includes(t)).length;
    if (hit >= Math.min(2, tokens.length)) {
      return { matchedIdentity: true, reason: "parliament_path" };
    }
    // Generic listing pages without a member identity — reject for dossier links
    if (/\/member\/?$|\/ls\/?$|\/rs\/?$/i.test(path) || path.split("/").filter(Boolean).length < 2) {
      return { matchedIdentity: false, reason: "generic_parliament_url" };
    }
    // Opaque member IDs cannot be trusted without content check
    return { matchedIdentity: false, reason: "opaque_member_url", needsContentCheck: true };
  }

  if (host.includes("myneta.info") || host.includes("eci.gov.in") || host.includes("gov.in")) {
    const hay = `${path} ${parsed.search}`.toLowerCase();
    if (tokens.some((t) => hay.includes(t)) || pathCompact.includes(compact) || path.includes(slug)) {
      return { matchedIdentity: true, reason: "gov_path" };
    }
    // Official roots without a person slug are acceptable as provider citations (no deep link)
    if (path === "/" || path === "" || /^\/(en|hindi)?\/?$/i.test(path)) {
      return { matchedIdentity: true, reason: "provider_homepage", stripToProvider: true };
    }
    return { matchedIdentity: false, reason: "gov_name_mismatch", needsContentCheck: true };
  }

  // Other hosts: require name tokens in path
  const hits = tokens.filter((t) => path.includes(t) || pathCompact.includes(t)).length;
  if (hits >= Math.min(2, tokens.length)) {
    return { matchedIdentity: true, reason: "path_tokens" };
  }
  return { matchedIdentity: false, reason: "path_mismatch", needsContentCheck: true };
}

export function textMatchesIdentity(text = "", identity = {}) {
  const tokens = identityNameTokens(identity.name || "");
  if (!tokens.length) return false;
  const hay = String(text || "").toLowerCase();
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits >= Math.min(2, tokens.length) || (tokens.length === 1 && hits === 1);
}

function defaultFetch(url, { method = "GET", timeoutMs = 2500 } = {}) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, statusCode: 0, finalUrl: url, body: "" });
      return;
    }
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      { method, timeout: timeoutMs, headers: { "User-Agent": "SocialIQ-SourceVerifier/1.0" } },
      (res) => {
        const statusCode = res.statusCode || 0;
        // Follow one redirect
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          defaultFetch(next, { method, timeoutMs }).then(resolve);
          return;
        }
        const chunks = [];
        res.on("data", (c) => {
          if (chunks.join("").length < 8000) chunks.push(c);
        });
        res.on("end", () => {
          resolve({
            ok: statusCode >= 200 && statusCode < 400,
            statusCode,
            finalUrl: url,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        res.on("error", () =>
          resolve({ ok: false, statusCode, finalUrl: url, body: "" })
        );
      }
    );
    req.on("error", () => resolve({ ok: false, statusCode: 0, finalUrl: url, body: "" }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, statusCode: 0, finalUrl: url, body: "" });
    });
    req.end();
  });
}

/**
 * Verify a single source against politician identity.
 * Network probe is optional (inject fetchImpl for tests).
 */
export async function verifySource(source, identity = {}, options = {}) {
  const {
    fetchImpl = defaultFetch,
    timeoutMs = 2500,
    allowNetwork = true,
  } = options;

  const now = new Date().toISOString();
  const name = source?.name || source?.source || source?.label || "";
  const url = source?.url || "";

  if (!hasText(url)) {
    return {
      ...source,
      name,
      url: "",
      verified: true,
      matchedIdentity: true,
      lastChecked: now,
      statusCode: null,
      verificationReason: "no_url_provider_citation",
    };
  }

  const heuristic = urlMatchesIdentity(url, identity);

  // Hard reject clear Wikipedia / path mismatches without network
  if (
    heuristic.matchedIdentity === false &&
    ["wikipedia_name_mismatch", "generic_parliament_url", "invalid_url", "missing_url"].includes(
      heuristic.reason
    )
  ) {
    return {
      ...source,
      name,
      url: "",
      verified: false,
      matchedIdentity: false,
      lastChecked: now,
      statusCode: null,
      verificationReason: heuristic.reason,
      rejectedUrl: url,
    };
  }

  if (heuristic.matchedIdentity && !heuristic.needsContentCheck && !allowNetwork) {
    return {
      ...source,
      name,
      url: heuristic.stripToProvider ? "" : url,
      verified: true,
      matchedIdentity: true,
      lastChecked: now,
      statusCode: null,
      verificationReason: heuristic.reason,
    };
  }

  if (!allowNetwork) {
    return {
      ...source,
      name,
      url: heuristic.matchedIdentity ? url : "",
      verified: heuristic.matchedIdentity,
      matchedIdentity: Boolean(heuristic.matchedIdentity),
      lastChecked: now,
      statusCode: null,
      verificationReason: heuristic.reason || "offline_heuristic",
    };
  }

  const probe = await fetchImpl(url, { method: "GET", timeoutMs });
  const statusCode = probe.statusCode || 0;
  const reachable = Boolean(probe.ok);

  let matchedIdentity = heuristic.matchedIdentity;
  if (heuristic.needsContentCheck || !matchedIdentity) {
    matchedIdentity = textMatchesIdentity(
      `${probe.finalUrl || ""} ${probe.body || ""}`,
      identity
    );
  } else if (reachable && probe.body) {
    // Confirm page still about the same person
    if (probe.body.length > 200 && !textMatchesIdentity(probe.body, identity)) {
      // Only downgrade when body clearly lacks the name on person-specific hosts
      const host = (() => {
        try {
          return new URL(probe.finalUrl || url).hostname;
        } catch {
          return "";
        }
      })();
      if (host.includes("wikipedia") || host.includes("sansad") || host.includes("myneta")) {
        matchedIdentity = false;
      }
    }
  }

  // Final URL after redirects must still match when Wikipedia
  if (matchedIdentity && probe.finalUrl && probe.finalUrl !== url) {
    const finalHeuristic = urlMatchesIdentity(probe.finalUrl, identity);
    if (
      finalHeuristic.reason === "wikipedia_name_mismatch" ||
      (finalHeuristic.matchedIdentity === false && finalHeuristic.reason === "generic_parliament_url")
    ) {
      matchedIdentity = false;
    }
  }

  const verified = reachable && matchedIdentity;

  return {
    ...source,
    name,
    url: verified ? url : "",
    verified,
    matchedIdentity,
    lastChecked: now,
    statusCode,
    verificationReason: verified
      ? heuristic.reason || "content_match"
      : !reachable
        ? "unreachable"
        : "identity_mismatch",
    rejectedUrl: verified ? undefined : url,
  };
}

export async function verifySources(sources = [], identity = {}, options = {}) {
  const list = Array.isArray(sources) ? sources : [];
  return Promise.all(list.map((s) => verifySource(s, identity, options)));
}

export function isAllowedEvidenceProvider(name = "", category = "") {
  const n = String(name || "");
  const c = String(category || "");
  if (ALLOWED_EVIDENCE_PROVIDERS.has(n) || ALLOWED_EVIDENCE_PROVIDERS.has(c)) return true;
  const hay = `${n} ${c}`.toLowerCase();
  return (
    hay.includes("wikipedia") ||
    hay.includes("election commission") ||
    hay.includes("eci") ||
    hay.includes("lok sabha") ||
    hay.includes("rajya sabha") ||
    hay.includes("official government") ||
    hay.includes("government") ||
    hay.includes("party website") ||
    hay.includes("news") ||
    hay.includes("biography")
  );
}

/**
 * Keep only verified + identity-matched sources for dossier evidence.
 */
export function filterVerifiedEvidenceSources(sources = []) {
  return (Array.isArray(sources) ? sources : []).filter(
    (s) => s && s.verified === true && s.matchedIdentity === true && isAllowedEvidenceProvider(s.name, s.category)
  );
}
