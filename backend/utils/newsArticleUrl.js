/**
 * Validate stored news article URLs for dossier / PDF hyperlinks.
 * Never invents or rewrites URLs — only accepts HTTPS links already stored
 * that resolve to known trusted news / official domains.
 */

const TRUSTED_NEWS_HOST_SUFFIXES = [
  // India majors
  "thehindu.com",
  "thehindubusinessline.com",
  "timesofindia.indiatimes.com",
  "indiatimes.com",
  "indianexpress.com",
  "hindustantimes.com",
  "theprint.in",
  "ndtv.com",
  "aninews.in",
  "ptinews.com",
  "pti.org.in",
  "economictimes.indiatimes.com",
  "business-standard.com",
  "livemint.com",
  "deccanherald.com",
  "telegraphindia.com",
  "news18.com",
  "india.com",
  "firstpost.com",
  "thewire.in",
  "scroll.in",
  "outlookindia.com",
  "newslaundry.com",
  "thequint.com",
  "republicworld.com",
  "zeenews.india.com",
  "indiatoday.in",
  "dnaindia.com",
  "freepressjournal.in",
  "mid-day.com",
  "tribuneindia.com",
  "asianage.com",
  "deccanchronicle.com",
  // International wire / major
  "bbc.com",
  "bbc.co.uk",
  "reuters.com",
  "apnews.com",
  "afp.com",
  "aljazeera.com",
  "theguardian.com",
  "nytimes.com",
  "washingtonpost.com",
  "bloomberg.com",
  "ft.com",
  "cnn.com",
  // Official / government news
  "pib.gov.in",
  "gov.in",
  "nic.in",
  "india.gov.in",
];

function hostnameMatchesTrusted(hostname = "") {
  const host = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");
  if (!host) return false;
  return TRUSTED_NEWS_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

/**
 * Extract a candidate article URL from a news item without inventing one.
 */
export function extractStoredNewsUrl(item = {}) {
  if (!item || typeof item !== "object") return "";
  const candidates = [item.url, item.articleUrl, item.link, item.sourceUrl, item.href];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

/**
 * Accept any well-formed HTTPS URL already stored (for website / markdown display).
 * Does not invent URLs. Does not require trusted-domain allowlist.
 */
export function validateStoredHttpsUrl(rawUrl) {
  if (rawUrl == null || rawUrl === "") {
    return { ok: false, url: null, reason: "empty" };
  }
  if (typeof rawUrl !== "string") {
    return { ok: false, url: null, reason: "not_string" };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, url: null, reason: "empty" };

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, url: null, reason: "malformed" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, url: null, reason: "not_https" };
  }

  if (!parsed.hostname || parsed.hostname.includes(" ")) {
    return { ok: false, url: null, reason: "malformed_host" };
  }

  if (
    /^(example\.com|localhost|127\.0\.0\.1)$/i.test(parsed.hostname) ||
    trimmed.includes("{{") ||
    /^javascript:/i.test(trimmed)
  ) {
    return { ok: false, url: null, reason: "placeholder" };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * @returns {{ ok: boolean, url: string|null, reason?: string }}
 */
export function validateNewsArticleUrl(rawUrl) {
  const base = validateStoredHttpsUrl(rawUrl);
  if (!base.ok) return base;

  let hostname;
  try {
    hostname = new URL(base.url).hostname;
  } catch {
    return { ok: false, url: null, reason: "malformed" };
  }

  if (!hostnameMatchesTrusted(hostname)) {
    return { ok: false, url: null, reason: "untrusted_domain" };
  }

  return { ok: true, url: base.url };
}

/**
 * Resolve a clickable article URL from a stored news item for website display.
 * Any stored HTTPS URL is kept — never invented.
 */
export function resolveNewsDisplayLink(item) {
  const raw = extractStoredNewsUrl(item);
  const result = validateStoredHttpsUrl(raw);
  return result.ok ? result.url : null;
}

/**
 * Resolve a PDF-safe article URL (HTTPS + trusted news / official domain only).
 */
export function resolveNewsArticleLink(item) {
  const raw = extractStoredNewsUrl(item);
  const result = validateNewsArticleUrl(raw);
  return result.ok ? result.url : null;
}

export { TRUSTED_NEWS_HOST_SUFFIXES, hostnameMatchesTrusted };
