import PoliticalProfile from "../models/PoliticalProfile.js";
import Account from "../models/Account.js";
import { REPORT_DOSSIER_TEMPLATE_VERSION } from "../config/reportDossierVersion.js";
import PROFILE_BUILDER_VERSIONS from "../config/profileBuilderVersion.js";
import {
  buildIntelligenceTimeline,
  polishTimelineEventsForDisplay,
  sanitizeTimelineForResponse,
} from "./politicalTimelineService.js";
import {
  verifySources,
  filterVerifiedEvidenceSources,
  isAllowedEvidenceProvider,
  urlMatchesIdentity,
} from "./sourceVerificationService.js";
import { resolveNewsDisplayLink } from "../utils/newsArticleUrl.js";
import { getLatest as getAnalyticsLatest } from "./analyticsEngine.js";

const hasText = (v) => typeof v === "string" && v.trim().length > 0;
const hasNum = (v) => v != null && !Number.isNaN(Number(v));

/** Strip legacy hub suffixes like " — Political Profile" from stored titles. */
export function stripReportTitleSuffix(title) {
  if (!hasText(title)) return title || "";
  return String(title)
    .replace(
      /\s*[—–\-]\s*(Political Profile|Election Intelligence|Influence Intelligence|News & Sentiment|Timeline Report|Political Intelligence Report)\s*$/i,
      ""
    )
    .trim();
}

export function resolvePoliticianDisplayName({ report, profile, account } = {}) {
  const biography = profile?.biography || {};
  return (
    biography.fullName ||
    account?.name ||
    report?.metadata?.politicianName ||
    report?.content?.politicianName ||
    stripReportTitleSuffix(report?.title) ||
    null
  );
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function isVerifiedFact(profile, key) {
  const facts = Array.isArray(profile?.verifiedFacts) ? profile.verifiedFacts : [];
  return facts.some((f) => f?.key === key && (f.value != null && String(f.value).trim()));
}

function pickVerified(profile, key, fallback) {
  const facts = Array.isArray(profile?.verifiedFacts) ? profile.verifiedFacts : [];
  const hit = facts.find((f) => f?.key === key && f.value != null && String(f.value).trim());
  if (hit) return String(hit.value).trim();
  if (fallback != null && String(fallback).trim()) return String(fallback).trim();
  return null;
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function trimToWordLimit(sentences, maxWords = 120) {
  const kept = [];
  let words = 0;
  for (const s of sentences) {
    const w = countWords(s);
    if (words + w > maxWords && kept.length > 0) break;
    kept.push(s);
    words += w;
    if (kept.length >= 5) break;
  }
  return kept;
}

/**
 * Build a concise executive Summary (2–4 sentences) from verified profile fields only.
 * No influence/confidence/generic filler. Skip any sentence whose facts are missing.
 */
export function buildExecutiveSummary({
  biography = {},
  elections,
  account,
  geographicMeta,
} = {}) {
  const name = biography.fullName || account?.name || null;
  const position = biography.currentPosition || biography.currentOffice || null;
  const party = biography.party || account?.party || null;
  const state = biography.state || account?.state || geographicMeta?.primaryRegion || null;
  const constituency = biography.constituency || null;

  if (!hasText(name)) return null;
  if (!hasText(position) && !hasText(party) && !hasText(state) && !hasText(constituency)) {
    return null;
  }

  const sentences = [];

  const partyArticle = (p) => (/^[aeiou]/i.test(String(p).trim()) ? "an" : "a");

  // Sentence 1 — identity: name, party, state, current office
  if (hasText(party) && hasText(state) && hasText(position)) {
    const office = /^(the|a|an)\s+/i.test(position) ? position : `the ${position}`;
    sentences.push(
      `${name} is ${partyArticle(party)} ${party} politician from ${state} currently serving as ${office}.`
    );
  } else if (hasText(party) && hasText(position)) {
    const office = /^(the|a|an)\s+/i.test(position) ? position : `the ${position}`;
    sentences.push(
      `${name} is ${partyArticle(party)} ${party} politician currently serving as ${office}.`
    );
  } else if (hasText(state) && hasText(position)) {
    const office = /^(the|a|an)\s+/i.test(position) ? position : `the ${position}`;
    sentences.push(`${name} is a politician from ${state} currently serving as ${office}.`);
  } else if (hasText(position)) {
    const office = /^(the|a|an)\s+/i.test(position) ? position : `the ${position}`;
    sentences.push(`${name} is currently serving as ${office}.`);
  } else if (hasText(party) && hasText(state)) {
    sentences.push(`${name} is ${partyArticle(party)} ${party} politician from ${state}.`);
  } else if (hasText(party)) {
    sentences.push(`${name} is ${partyArticle(party)} ${party} politician.`);
  } else if (hasText(state)) {
    sentences.push(`${name} is a politician from ${state}.`);
  }

  // Sentence 2 — representation (constituency), skip when missing or already covered by office title
  if (hasText(constituency)) {
    const alreadyInOffice =
      hasText(position) &&
      normalizeLoose(position).includes(normalizeLoose(constituency));
    if (!alreadyInOffice) {
      if (hasText(state) && /assembly|legislative|vidhan|mla/i.test(String(position || ""))) {
        sentences.push(
          `${name} represents ${constituency} in the ${state} Legislative Assembly.`
        );
      } else {
        sentences.push(`${name} represents the ${constituency} constituency.`);
      }
    }
  }

  // Sentence 3 — latest verified electoral victory
  const wins = (Array.isArray(elections) ? elections : [])
    .filter(isMeaningfulElectionRow)
    .filter(isElectionVictory);
  const latestWin = [...wins].sort((a, b) => Number(b.year || 0) - Number(a.year || 0))[0] || null;

  if (latestWin) {
    const year = latestWin.year ? String(latestWin.year) : null;
    const electionName = hasText(latestWin.election) ? String(latestWin.election).trim() : null;
    const winConstituency = hasText(latestWin.constituency)
      ? String(latestWin.constituency).trim()
      : null;

    if (year && electionName && winConstituency) {
      const yearAlreadyInName = electionName.includes(year);
      sentences.push(
        yearAlreadyInName
          ? `${name}'s most recent verified electoral victory was in the ${electionName} from ${winConstituency}.`
          : `${name}'s most recent verified electoral victory was in ${year}, winning the ${electionName} from ${winConstituency}.`
      );
    } else if (year && electionName) {
      const yearAlreadyInName = electionName.includes(year);
      sentences.push(
        yearAlreadyInName
          ? `${name}'s most recent verified electoral victory was in the ${electionName}.`
          : `${name}'s most recent verified electoral victory was in the ${year} ${electionName}.`
      );
    } else if (year && winConstituency) {
      sentences.push(
        `${name}'s most recent verified electoral victory was in ${year} from ${winConstituency}.`
      );
    } else if (year) {
      sentences.push(`${name}'s most recent verified electoral victory was in ${year}.`);
    }
  }

  // Sentence 4 (optional) — win count + active leadership in state
  if (wins.length >= 2 && hasText(state)) {
    sentences.push(
      `${name} has won ${wins.length} verified elections and remains an active political leader in ${state}.`
    );
  } else if (wins.length >= 2) {
    sentences.push(`${name} has won ${wins.length} verified elections.`);
  }

  const trimmed = trimToWordLimit(sentences, 120);
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, 4);
}

const normalizeLoose = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function isElectionVictory(e) {
  return /win|won|elected|victory|winner/i.test(String(e?.position || e?.result || ""));
}

function buildCover({ report, profile, account, biography, confidence }) {
  const name = resolvePoliticianDisplayName({ report, profile, account });
  const photo =
    report.thumbnail ||
    account?.thumbnails?.high?.url ||
    account?.thumbnails?.medium?.url ||
    account?.thumbnail ||
    report.metadata?.avatar ||
    "";

  const isPolitical =
    report.type === "political_profile" ||
    report.type === "election" ||
    report.type === "influence" ||
    report.type === "news_sentiment" ||
    report.type === "timeline" ||
    Boolean(profile);

  const cover = {
    brand: "Social IQ",
    documentType: isPolitical ? "Political Intelligence Report" : "Intelligence Report",
    // Cover headline is the politician name only — never "Name — Political Profile"
    title: name || stripReportTitleSuffix(report.title) || "Intelligence Report",
    politicianName: name || null,
    reportTypeLabel: isPolitical ? "Political Profile" : null,
    photo: photo || null,
    currentPosition: biography.currentPosition || biography.currentOffice || null,
    party: biography.party || account?.party || null,
    state: biography.state || account?.state || null,
    generatedAt: report.updatedAt || report.createdAt || new Date(),
    confidence: confidence != null ? Math.round(Number(confidence)) : null,
    reportVersion: report.reportVersion || "1",
    generatedBy: "Social IQ Intelligence Engine",
  };

  return cover;
}

function buildPoliticalProfileSection(biography, account, confidence, profile) {
  const fields = [
    { label: "Full Name", value: biography.fullName || account?.name },
    { label: "Current Position", value: biography.currentPosition || biography.currentOffice },
    { label: "Political Party", value: biography.party || account?.party },
    { label: "State", value: biography.state || account?.state },
    { label: "Constituency", value: biography.constituency },
    { label: "Date of Birth", value: biography.dob },
    { label: "Age", value: biography.age != null ? String(biography.age) : null },
    { label: "Education", value: biography.education },
    { label: "Profession", value: biography.profession },
    {
      label: "Religion",
      value: isVerifiedFact(profile, "religion")
        ? pickVerified(profile, "religion")
        : null,
    },
    { label: "Official Website", value: biography.officialWebsite },
    { label: "Wikipedia", value: biography.wikipediaLink },
  ].filter((f) => hasText(f.value) || hasNum(f.value));

  const social = biography.socialLinks || {};
  const socialAccounts = [
    social.youtube && { platform: "YouTube", url: social.youtube },
    social.twitter && { platform: "X / Twitter", url: social.twitter },
    social.facebook && { platform: "Facebook", url: social.facebook },
    social.instagram && { platform: "Instagram", url: social.instagram },
  ].filter(Boolean);

  if (fields.length === 0 && socialAccounts.length === 0 && confidence == null) return null;

  return {
    fields,
    socialAccounts,
    profileConfidence: confidence != null ? Math.round(Number(confidence)) : null,
  };
}

/**
 * Build a clean chronological career journey (Birth → Education → Party → Elections → Office).
 * Deduplicates birth, party, elections, and consecutive duplicate roles.
 */
function inferTimelineCategory(event) {
  if (event?.category) return event.category;
  const text = `${event?.title || ""} ${event?.description || ""} ${event?.narrative || ""}`.toLowerCase();
  if (/\b(born|birth|date of birth|dob)\b/.test(text)) return "birth";
  if (/\b(school|college|degree|education|university|master|bachelor|ph\.?d)\b/.test(text)) {
    return "college";
  }
  if (/\b(joined|affiliated|party entry|party affiliation)\b/.test(text)) return "joinedParty";
  if (/\b(elected|election|won|re-elected|contest|mla|mp|lok sabha|assembly)\b/.test(text)) {
    return "election";
  }
  if (/\b(current office|current position|incumbent)\b/.test(text)) return "currentOffice";
  if (/\b(chief minister|prime minister|minister|governor|cabinet)\b/.test(text)) return "position";
  return "position";
}

function buildTimelineSection(profile) {
  if (!profile) return null;

  const storedTimeline = (Array.isArray(profile.timeline) ? profile.timeline : [])
    .filter(Boolean)
    .map((e) => ({
      ...e,
      category: inferTimelineCategory(e),
      year: e.year || e.yearLabel || null,
    }));

  // Rebuild then sanitize — same pipeline as profile API so Intelligence Hub
  // never persists corrupted titles like "Won Won Re" into report.dossier.
  const events = sanitizeTimelineForResponse(
    buildIntelligenceTimeline({
      biography: profile.biography || {},
      elections: profile.elections || [],
      sources: profile.sources || [],
      facts: profile.facts || profile.verifiedFacts || [],
      storedTimeline,
    }),
    { elections: profile.elections || [] }
  );

  if (!Array.isArray(events) || events.length === 0) {
    // Last-resort: sanitize stored timeline directly
    const fallback = sanitizeTimelineForResponse(storedTimeline, {
      elections: profile.elections || [],
    });
    if (!fallback.length) {
      const polished = polishTimelineEventsForDisplay(
        storedTimeline
          .filter((e) => e && (hasText(e.title) || hasText(e.year)))
          .map((e) => ({
            year: e.year || null,
            date: e.date || null,
            title: e.title || "Career event",
            description: e.narrative || e.description || "",
            source: e.source || "",
            sourceUrl: e.sourceUrl || "",
            category: e.category || "",
            confidence: e.confidence ?? null,
          }))
          .sort((a, b) => String(a.year || "").localeCompare(String(b.year || "")))
      );
      return polished.length
        ? {
            events: polished.map((e) => ({
              year: e.year || null,
              date: e.date || null,
              title: e.title || "Career event",
              description: e.description || "",
              source: "",
              sourceUrl: "",
              category: e.category || "",
              confidence: e.confidence ?? null,
            })),
          }
        : null;
    }
    return {
      events: fallback.map((e) => ({
        year: e.year || null,
        date: e.date || null,
        title: e.title || "Career event",
        description: e.description || "",
        source: "",
        sourceUrl: "",
        category: e.category || "",
        confidence: e.confidence ?? null,
      })),
    };
  }

  const mapped = [];
  let prevKey = "";
  for (const e of events) {
    if (!e || (!hasText(e.title) && !hasText(e.year))) continue;
    const year = e.year || e.yearLabel || null;
    const title = e.title || "Career event";
    // Drop residual corrupted display titles if any slip through
    if (/^(won\s+){2,}/i.test(title) || /^won\s+re$/i.test(title)) continue;
    const key = `${year}|${String(title).toLowerCase().trim()}`;
    if (key === prevKey) continue;
    prevKey = key;
    mapped.push({
      year,
      date: e.date || null,
      title,
      description: e.description || "",
      source: "",
      sourceUrl: "",
      category: e.category || "",
      confidence: e.confidence ?? null,
    });
  }

  return mapped.length ? { events: mapped } : null;
}

function isMeaningfulElectionRow(e) {
  if (!e) return false;
  const hasIdentity = hasNum(e.year) || hasText(e.election);
  const hasDetail =
    hasText(e.constituency) ||
    hasText(e.party) ||
    hasText(e.position) ||
    hasText(e.result) ||
    hasNum(e.votes) ||
    hasNum(e.votePct) ||
    hasNum(e.voteShare) ||
    hasNum(e.margin);
  if (!hasIdentity || !hasDetail) return false;

  // Incomplete stub rows: zeros across vote signals and no opponent
  const votes = Number(e.votes);
  const margin = Number(e.margin);
  const votePct = Number(e.votePct ?? e.voteShare);
  const votesZero = !Number.isFinite(votes) || votes === 0;
  const marginZero = !Number.isFinite(margin) || margin === 0;
  const pctZero = !Number.isFinite(votePct) || votePct === 0;
  const opponentMissing = !hasText(e.opponent) && !hasText(e.runnerUp);

  if (votesZero && marginZero && pctZero && opponentMissing) {
    return false;
  }

  return true;
}

function buildElectionSection(elections) {
  if (!Array.isArray(elections) || elections.length === 0) return null;
  const rows = elections
    .filter(isMeaningfulElectionRow)
    .map((e) => ({
      election: e.election || (e.year ? `${e.year} Election` : "Election"),
      year: e.year ?? null,
      constituency: e.constituency || "",
      party: e.party || "",
      result: e.position || e.result || "",
      votes: e.votes ?? null,
      votePct: e.votePct ?? e.voteShare ?? null,
      margin: e.margin ?? null,
      opponent: e.opponent || e.runnerUp || "",
      source: e.source || "",
    }))
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  return rows.length ? { rows } : null;
}

function buildInfluenceSection(influence) {
  if (!influence || typeof influence !== "object") return null;
  const metrics = [
    { key: "overall", label: "Overall Influence Score", value: influence.influenceScore },
    { key: "politicalReach", label: "Political Reach", value: influence.politicalReach },
    { key: "electionStrength", label: "Election Strength", value: influence.electionStrength },
    { key: "mediaVisibility", label: "Media Visibility", value: influence.mediaVisibility },
    { key: "publicEngagement", label: "Public Engagement", value: influence.publicEngagement },
    {
      key: "digitalPresence",
      label: "Digital Presence",
      value: influence.digitalPresence ?? influence.digitalInfluence,
    },
    { key: "verifiedConfidence", label: "Verified Confidence", value: influence.verifiedConfidence },
  ]
    .filter((m) => hasNum(m.value))
    .map((m) => ({
      ...m,
      value: Math.round(Number(m.value)),
      explanation:
        Array.isArray(influence.metrics)
          ? influence.metrics.find((x) => x.key === m.key)?.tooltip ||
            influence.metrics.find((x) => x.key === m.key)?.explanation ||
            null
          : null,
    }));

  if (metrics.length === 0 && !hasText(influence.explanation)) return null;

  return {
    metrics,
    explanation: hasText(influence.explanation) ? influence.explanation : null,
    calculatedAt: influence.lastCalculated || null,
    calculationVersion: influence.calculationVersion ?? null,
  };
}

/**
 * Geographic section for map + summary only — no raw evidence dump.
 */
function buildGeographicSection(geographicReach, geographicMeta) {
  const rows = Array.isArray(geographicReach)
    ? geographicReach
        .filter((g) => g && hasText(g.state))
        .map((g) => ({
          state: g.state,
          influence: g.influence ?? g.score ?? g.weight ?? null,
          confidence: g.confidence ?? null,
          tier: g.tier || g.band || g.category || "",
        }))
    : [];

  const meta = geographicMeta || {};
  const hasMeta =
    hasText(meta.primaryRegion) ||
    hasText(meta.primaryState) ||
    (Array.isArray(meta.secondaryRegions) && meta.secondaryRegions.length) ||
    meta.regionalSummary?.verifiedCoverage != null;

  if (rows.length === 0 && !hasMeta) return null;

  const tierSummary = uniqBy(
    rows
      .filter((r) => hasText(r.tier))
      .map((r) => ({ state: r.state, tier: r.tier, influence: r.influence })),
    (r) => `${r.state}|${r.tier}`
  ).slice(0, 12);

  return {
    primaryRegion: meta.primaryRegion || meta.primaryState || rows[0]?.state || null,
    secondaryRegions: meta.secondaryRegions || meta.secondaryStates || [],
    emergingRegions: meta.emergingRegions || meta.emergingStates || [],
    verifiedCoverage: meta.regionalSummary?.verifiedCoverage ?? meta.verifiedCoverage ?? null,
    message: meta.message || null,
    influenceTiers: tierSummary,
    // Map-ready states without evidence strings
    states: rows,
  };
}

function buildNewsSection(news, newsSentiment) {
  const items = Array.isArray(news)
    ? news
        .filter((n) => n && hasText(n.headline))
        .slice(0, 20)
        .map((n) => {
          // Keep any stored HTTPS URL for website / markdown; PDF re-checks trusted domains
          const articleUrl = resolveNewsDisplayLink(n);
          return {
            headline: n.headline,
            date: n.publishedTime || n.publishedAt || n.date || "",
            source: n.source || "",
            sentiment: n.sentiment || null,
            importance: n.importance ?? null,
            summary: n.summary || "",
            url: articleUrl || "",
            publishedAt: n.publishedTime || n.publishedAt || n.date || "",
          };
        })
    : [];

  const sentiment =
    newsSentiment && typeof newsSentiment === "object"
      ? {
          positive: newsSentiment.positive ?? null,
          neutral: newsSentiment.neutral ?? null,
          negative: newsSentiment.negative ?? null,
          keywords: Array.isArray(newsSentiment.keywords) ? newsSentiment.keywords : [],
        }
      : null;

  if (items.length === 0 && !sentiment) return null;
  return { items, sentiment };
}

function buildAiInsightsSection(aiSummary, intelligenceOverview, influence) {
  const blocks = [];

  if (typeof aiSummary === "string" && hasText(aiSummary)) {
    blocks.push({ title: "Strategic Overview", body: aiSummary });
  } else if (aiSummary && typeof aiSummary === "object") {
    const keys = [
      ["overview", "Strategic Overview"],
      ["summary", "Summary"],
      ["strengths", "Strengths"],
      ["weaknesses", "Weaknesses"],
      ["opportunities", "Opportunities"],
      ["threats", "Threats"],
      ["trends", "Political Trends"],
      ["mediaTrends", "Media Trends"],
      ["digitalGrowth", "Digital Growth"],
      ["outlook", "Future Observations"],
    ];
    for (const [k, title] of keys) {
      const v = aiSummary[k];
      if (Array.isArray(v) && v.length) {
        blocks.push({ title, items: v.map(String).filter(hasText) });
      } else if (hasText(v)) {
        blocks.push({ title, body: String(v) });
      }
    }
  }

  if (Array.isArray(intelligenceOverview)) {
    for (const card of intelligenceOverview.slice(0, 8)) {
      if (!card) continue;
      const title = card.title || card.label || card.key;
      const body = card.summary || card.description || card.value;
      if (hasText(title) && (hasText(body) || hasNum(body))) {
        blocks.push({ title: String(title), body: String(body) });
      }
    }
  }

  if (Array.isArray(influence?.factors) && influence.factors.length) {
    blocks.push({
      title: "Influence Factors",
      items: influence.factors.map(String).filter(hasText),
    });
  }

  if (blocks.length === 0) return null;
  return { blocks };
}

function categorizeSource(name = "", type = "") {
  const n = `${name} ${type}`.toLowerCase();
  if (n.includes("wikipedia")) return "Wikipedia";
  if (n.includes("election") || n.includes("eci") || n.includes("commission") || n.includes("myneta")) {
    return "Election Commission of India";
  }
  if (n.includes("lok sabha") || n.includes("sansad")) return "Lok Sabha";
  if (n.includes("rajya sabha")) return "Rajya Sabha";
  if (n.includes("party") && n.includes("official")) return "Official Party Website";
  if (n.includes("gov") || n.includes("official") || n.includes("cabinet") || n.includes("government")) {
    return "Official Government";
  }
  if (n.includes("biography") || n.includes("bio")) return "Verified Biography";
  if (n.includes("youtube")) return "YouTube";
  if (n.includes("news") || n.includes("pti") || n.includes("times") || n.includes("hindu")) {
    return "News Sources";
  }
  return "Other Verified Sources";
}

function sourceDescription(category, type = "") {
  const t = String(type || "").toLowerCase();
  if (category === "Wikipedia") return "Verified Biography";
  if (category === "Election Commission of India") return "Verified Election Records";
  if (category === "Lok Sabha") return "Official Parliamentary Profile";
  if (category === "Rajya Sabha") return "Official Parliamentary Profile";
  if (category === "Official Government") return "Official Government Records";
  if (category === "Official Party Website") return "Official Party Website";
  if (category === "News Sources") return "News Sources";
  if (t.includes("biography") || category === "Verified Biography") return "Verified Biography";
  return category;
}

export function confidenceToLabel(confidence, status) {
  const statusText = String(status || "").toLowerCase();
  if (/verif/i.test(statusText)) return "Verified";
  if (confidence == null || Number.isNaN(Number(confidence))) {
    if (statusText) return statusText.charAt(0).toUpperCase() + statusText.slice(1);
    return null;
  }
  const c = Number(confidence);
  if (c >= 80) return "Verified";
  if (c >= 60) return "High";
  return "Medium";
}

function normalizeSourceKey(name = "", url = "") {
  const host = (() => {
    try {
      if (!url) return "";
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  })();
  const base = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  // Collapse duplicate Wikipedia / Lok Sabha variants
  if (base.includes("wikipedia") || host.includes("wikipedia")) return "wikipedia";
  if (base.includes("lok sabha") || host.includes("sansad")) return "lok-sabha";
  if (base.includes("rajya sabha")) return "rajya-sabha";
  if (base.includes("election") || base.includes("eci") || host.includes("eci")) return "eci";
  return `${base}|${host || url}`;
}

function buildEvidenceSection(sources, verificationCatalog, identity = {}) {
  const list = [];
  const pushSource = (s) => {
    if (!s) return;
    const rawName = s.name || s.source || s.label;
    if (!hasText(rawName)) return;

    const category = categorizeSource(rawName, s.type || s.key);
    if (!isAllowedEvidenceProvider(category, category)) return;

    let url = s.url || "";
    let verified = s.verified;
    let matchedIdentity = s.matchedIdentity;

    if (verified === false || matchedIdentity === false) {
      url = "";
      verified = true;
      matchedIdentity = true;
    } else if (verified == null || matchedIdentity == null) {
      if (!hasText(url)) {
        verified = true;
        matchedIdentity = true;
      } else {
        const heuristic = urlMatchesIdentity(url, identity);
        if (heuristic.matchedIdentity) {
          verified = true;
          matchedIdentity = true;
          if (heuristic.stripToProvider) url = "";
        } else {
          // Wrong / opaque person URL — cite provider without the bad link
          url = "";
          verified = true;
          matchedIdentity = true;
        }
      }
    }

    if (verified !== true || matchedIdentity !== true) return;

    list.push({
      name: category === "Other Verified Sources" ? rawName : category,
      description: sourceDescription(category, s.type),
      url,
      category,
      verificationStatus: "verified",
      confidenceLabel: confidenceToLabel(s.confidence, "verified"),
      lastUpdated: s.fetchedAt || s.updatedAt || s.lastChecked || null,
      confidence: s.confidence ?? null,
      verified: true,
      matchedIdentity: true,
      lastChecked: s.lastChecked || null,
      statusCode: s.statusCode ?? null,
    });
  };

  if (Array.isArray(sources)) {
    for (const s of sources) pushSource(s);
  }
  if (Array.isArray(verificationCatalog)) {
    for (const s of verificationCatalog) {
      pushSource({
        ...s,
        name: s.name || s.label || s.source,
      });
    }
  }

  let unique = uniqBy(list, (x) => normalizeSourceKey(x.name, x.url || x.name));
  unique = filterVerifiedEvidenceSources(unique);
  unique.sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));

  if (unique.length === 0) return null;

  const groups = {};
  for (const item of unique) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }

  return {
    items: unique,
    groups,
  };
}

function buildMetadataSection(report, modulesIncluded, sizeEstimate) {
  return {
    generated: report.createdAt || null,
    updated: report.updatedAt || null,
    engineVersion: report.engineVersion || String(PROFILE_BUILDER_VERSIONS.builderVersion),
    analysisVersion: report.analysisVersion || "",
    reportVersion: report.reportVersion || "1",
    templateVersion: REPORT_DOSSIER_TEMPLATE_VERSION,
    confidence: report.confidence ?? null,
    modulesIncluded,
    reportSize: sizeEstimate,
    generatedBy: "Social IQ Intelligence Engine",
  };
}

/**
 * Channel / telemetry metrics from AnalyticsEngine — same values as Dashboard/Profile.
 */
function buildChannelAnalyticsSection(analyticsLatest) {
  if (!analyticsLatest?.available || !analyticsLatest.metrics) return null;
  const m = analyticsLatest.metrics;
  const rows = [
    { key: "subscribers", label: "Subscribers", value: m.subscribers },
    { key: "views", label: "Total Views", value: m.views },
    { key: "videos", label: "Videos", value: m.videos },
    { key: "engagementRate", label: "Engagement Rate %", value: m.engagementRate },
    { key: "averageEngagement", label: "Avg Engagement %", value: m.averageEngagement },
    { key: "influenceScore", label: "Influence Score", value: m.influenceScore },
    { key: "politicalReach", label: "Political Reach", value: m.politicalReach },
    { key: "digitalPresence", label: "Digital Presence", value: m.digitalPresence },
    { key: "mediaVisibility", label: "Media Visibility", value: m.mediaVisibility },
    { key: "verifiedConfidence", label: "Verified Confidence", value: m.verifiedConfidence },
    { key: "sentimentPositive", label: "Sentiment Positive %", value: m.sentimentPositive },
    { key: "sentimentNeutral", label: "Sentiment Neutral %", value: m.sentimentNeutral },
    { key: "sentimentNegative", label: "Sentiment Negative %", value: m.sentimentNegative },
    { key: "electionWins", label: "Election Wins", value: m.electionWins },
    { key: "electionContested", label: "Elections Contested", value: m.electionContested },
  ].filter((r) => hasNum(r.value));

  if (!rows.length) return null;

  return {
    label: "Channel Analytics",
    capturedAt: analyticsLatest.capturedAt || null,
    source: analyticsLatest.source || null,
    engineVersion: analyticsLatest.engineVersion ?? null,
    metrics: rows,
  };
}

/**
 * Assemble a political intelligence dossier from Mongo profile + report shell.
 * Only includes sections with verified/available data.
 */
export function assemblePoliticalDossier({ report, profile, account, analyticsLatest = null }) {
  const biography = profile?.biography || {};
  const confidence = profile?.confidenceScore ?? report.confidence ?? null;

  const cover = buildCover({ report, profile, account, biography, confidence });
  const executiveSummary = buildExecutiveSummary({
    biography,
    elections: profile?.elections,
    account,
    geographicMeta: profile?.geographicMeta,
  });
  const politicalProfile = buildPoliticalProfileSection(
    biography,
    account,
    confidence,
    profile
  );
  const careerTimeline = buildTimelineSection(profile);
  const electionHistory = buildElectionSection(profile?.elections);
  const influenceIntelligence = buildInfluenceSection(profile?.influence);
  const geographicInfluence = buildGeographicSection(
    profile?.geographicReach,
    profile?.geographicMeta
  );
  const newsSentiment = buildNewsSection(profile?.news, profile?.newsSentiment);
  const aiInsights = buildAiInsightsSection(
    profile?.aiSummary,
    profile?.intelligenceOverview,
    profile?.influence
  );
  const evidenceSources = buildEvidenceSection(
    profile?.sources,
    profile?.verificationCatalog,
    {
      name: biography.fullName || account?.name || report.metadata?.politicianName,
      state: biography.state || account?.state,
      party: biography.party || account?.party,
      constituency: biography.constituency,
      office: biography.currentPosition || biography.currentOffice,
    }
  );

  const sections = {};
  const modulesIncluded = [];

  sections.cover = cover;
  modulesIncluded.push("cover");

  if (executiveSummary) {
    sections.executiveSummary = { paragraphs: executiveSummary, label: "Summary" };
    modulesIncluded.push("executiveSummary");
  }
  if (politicalProfile) {
    sections.politicalProfile = politicalProfile;
    modulesIncluded.push("politicalProfile");
  }
  if (careerTimeline) {
    sections.careerTimeline = careerTimeline;
    modulesIncluded.push("careerTimeline");
  }
  if (electionHistory) {
    sections.electionHistory = electionHistory;
    modulesIncluded.push("electionHistory");
  }
  if (influenceIntelligence) {
    sections.influenceIntelligence = influenceIntelligence;
    modulesIncluded.push("influenceIntelligence");
  }
  if (geographicInfluence) {
    sections.geographicInfluence = geographicInfluence;
    modulesIncluded.push("geographicInfluence");
  }
  if (newsSentiment) {
    sections.newsSentiment = newsSentiment;
    modulesIncluded.push("newsSentiment");
  }
  if (aiInsights) {
    sections.aiInsights = aiInsights;
    modulesIncluded.push("aiInsights");
  }
  if (evidenceSources) {
    sections.evidenceSources = evidenceSources;
    modulesIncluded.push("evidenceSources");
  }

  const channelAnalytics = buildChannelAnalyticsSection(analyticsLatest);
  if (channelAnalytics) {
    sections.channelAnalytics = channelAnalytics;
    modulesIncluded.push("channelAnalytics");
  }

  const sizeEstimate = Buffer.byteLength(JSON.stringify(sections), "utf8");
  sections.metadata = buildMetadataSection(report, modulesIncluded, sizeEstimate);
  modulesIncluded.push("metadata");

  return {
    templateVersion: REPORT_DOSSIER_TEMPLATE_VERSION,
    kind: "political_intelligence",
    engineVersion: String(
      profile?.builderVersion || report.engineVersion || PROFILE_BUILDER_VERSIONS.builderVersion
    ),
    analysisVersion: String(
      profile?.profileSchemaVersion || report.analysisVersion || ""
    ),
    assembledAt: new Date().toISOString(),
    modulesIncluded,
    sections,
  };
}

/**
 * Fallback dossier for non-profile report types (comparison, AI, etc.)
 * Uses only stored report fields — never invents facts.
 */
export function assembleGenericDossier(report) {
  const content = report.content && typeof report.content === "object" ? report.content : {};
  const paragraphs = [];
  if (hasText(report.summary)) paragraphs.push(report.summary);
  if (hasText(report.description)) paragraphs.push(report.description);

  const displayTitle =
    report.metadata?.politicianName ||
    stripReportTitleSuffix(report.title) ||
    report.title;

  const sections = {
    cover: {
      brand: "Social IQ",
      documentType: "Intelligence Report",
      title: displayTitle,
      politicianName: report.metadata?.politicianName || null,
      reportTypeLabel: null,
      photo: report.thumbnail || report.metadata?.avatar || null,
      currentPosition: null,
      party: null,
      state: null,
      generatedAt: report.updatedAt || report.createdAt || new Date(),
      confidence: report.confidence != null ? Math.round(Number(report.confidence)) : null,
      reportVersion: report.reportVersion || "1",
      generatedBy: "Social IQ Intelligence Engine",
    },
  };

  const modulesIncluded = ["cover"];

  if (paragraphs.length) {
    sections.executiveSummary = { paragraphs: paragraphs.slice(0, 5), label: "Summary" };
    modulesIncluded.push("executiveSummary");
  }

  if (content.kind === "comparison" && (content.creatorA || content.creatorB)) {
    sections.aiInsights = {
      blocks: [
        {
          title: "Comparison Snapshot",
          body: `${content.creatorA?.name || "Creator A"} vs ${content.creatorB?.name || "Creator B"}`,
        },
        content.comparison?.overallWinner
          ? {
              title: "Overall Winner Signal",
              body: String(content.comparison.overallWinner),
            }
          : null,
        typeof content.aiReport === "string" && hasText(content.aiReport)
          ? { title: "AI Comparison Notes", body: content.aiReport.slice(0, 4000) }
          : null,
      ].filter(Boolean),
    };
    if (sections.aiInsights.blocks.length) modulesIncluded.push("aiInsights");
  }

  if (content.kind === "ai_insight" && Array.isArray(content.transcript) && content.transcript.length) {
    sections.aiInsights = {
      blocks: content.transcript.slice(-6).map((m, i) => ({
        title: m.role === "user" ? `Query ${i + 1}` : `Response ${i + 1}`,
        body: String(m.content || "").slice(0, 2000),
      })),
    };
    modulesIncluded.push("aiInsights");
  }

  sections.metadata = buildMetadataSection(report, modulesIncluded, Buffer.byteLength(JSON.stringify(sections), "utf8"));
  modulesIncluded.push("metadata");

  return {
    templateVersion: REPORT_DOSSIER_TEMPLATE_VERSION,
    kind: content.kind || report.type || "custom",
    engineVersion: String(report.engineVersion || ""),
    analysisVersion: String(report.analysisVersion || ""),
    assembledAt: new Date().toISOString(),
    modulesIncluded,
    sections,
  };
}

export function dossierNeedsRebuild(report, dossier) {
  if (!dossier || typeof dossier !== "object") return true;
  if (Number(dossier.templateVersion) !== REPORT_DOSSIER_TEMPLATE_VERSION) return true;

  const reportEngine = String(report.engineVersion || "");
  const reportAnalysis = String(report.analysisVersion || "");
  if (reportEngine && String(dossier.engineVersion || "") !== reportEngine) return true;
  if (reportAnalysis && String(dossier.analysisVersion || "") !== reportAnalysis) return true;

  return false;
}

/**
 * Load linked profile + account for a SavedReport (references only).
 */
export async function loadReportHydrationSources(report) {
  let account = null;
  let profile = null;

  const accountId = report.accountId || report.content?.accountId || null;
  const profileId = report.profileId || report.content?.profileId || null;

  if (accountId) {
    account = await Account.findById(accountId).lean();
  }
  if (profileId) {
    profile = await PoliticalProfile.findById(profileId).lean();
  }
  if (!profile && account?._id) {
    profile = await PoliticalProfile.findOne({ accountId: account._id }).lean();
  }
  if (!account && profile?.accountId) {
    account = await Account.findById(profile.accountId).lean();
  }

  return { account, profile };
}

/**
 * Ensure report has a current dossier document stored on the model.
 * Regenerates only when template/engine/analysis versions require it.
 * Re-verifies source URLs against politician identity before assembly.
 */
export async function ensureReportDossier(report, { force = false, allowNetwork = true } = {}) {
  if (!report) return null;

  const existing =
    report.dossier ||
    (report.content && typeof report.content === "object" ? report.content.dossier : null);

  if (!force && !dossierNeedsRebuild(report, existing)) {
    return existing;
  }

  const { account, profile } = await loadReportHydrationSources(report);

  let hydratedProfile = profile;
  if (profile) {
    const identity = {
      name:
        profile.biography?.fullName ||
        account?.name ||
        report.metadata?.politicianName ||
        null,
      state: profile.biography?.state || account?.state || null,
      party: profile.biography?.party || account?.party || null,
      constituency: profile.biography?.constituency || null,
      office: profile.biography?.currentPosition || profile.biography?.currentOffice || null,
    };

    try {
      const verifiedSources = await verifySources(profile.sources || [], identity, {
        allowNetwork,
        timeoutMs: 2500,
      });
      // Drop rejected URLs from stored profile on next save path
      const cleanedSources = verifiedSources.map((s) => ({
        name: s.name,
        url: s.verified && s.matchedIdentity ? s.url || "" : "",
        type: s.type || "scrape",
        confidence: s.confidence ?? 0,
        fetchedAt: s.fetchedAt || new Date(),
        verified: s.verified === true,
        matchedIdentity: s.matchedIdentity === true,
        lastChecked: s.lastChecked || null,
        statusCode: s.statusCode ?? null,
      }));

      hydratedProfile = {
        ...profile,
        sources: cleanedSources,
        timeline: buildIntelligenceTimeline({
          biography: profile.biography || {},
          elections: profile.elections || [],
          sources: cleanedSources,
          facts: profile.facts || profile.verifiedFacts || [],
          storedTimeline: profile.timeline || [],
        }),
      };

      // Persist cleaned sources + refined timeline onto the profile document when possible
      if (profile._id) {
        await PoliticalProfile.updateOne(
          { _id: profile._id },
          {
            $set: {
              sources: cleanedSources,
              timeline: hydratedProfile.timeline,
              updatedAt: new Date(),
            },
          }
        ).catch(() => {});
      }
    } catch (err) {
      console.warn("[ensureReportDossier] source verification skipped:", err.message);
      hydratedProfile = profile;
    }
  }

  const dossier =
    hydratedProfile || report.type === "political_profile" || report.type === "election" ||
    report.type === "influence" || report.type === "news_sentiment" || report.type === "timeline"
      ? assemblePoliticalDossier({
          report: report.toObject ? report.toObject() : report,
          profile: hydratedProfile,
          account,
          analyticsLatest: account?._id
            ? await getAnalyticsLatest(account._id, {
                userId: account.userId || report.userId,
              }).catch(() => null)
            : null,
        })
      : assembleGenericDossier(report.toObject ? report.toObject() : report);

  report.dossier = dossier;
  report.reportVersion = String(REPORT_DOSSIER_TEMPLATE_VERSION);

  // Keep card/list summary aligned with the executive Summary section
  const summaryParagraphs = dossier?.sections?.executiveSummary?.paragraphs;
  if (Array.isArray(summaryParagraphs) && summaryParagraphs.length) {
    report.summary = summaryParagraphs.join(" ").slice(0, 2000);
  }

  // Keep stored hub title as politician name (no duplicate type suffix)
  const displayName = resolvePoliticianDisplayName({ report, profile, account });
  if (
    displayName &&
    (report.type === "political_profile" || report.type === "election" ||
      report.type === "influence" || report.type === "news_sentiment" || report.type === "timeline")
  ) {
    report.title = displayName;
  }

  if (report.content && typeof report.content === "object") {
    report.content = {
      ...report.content,
      dossierTemplateVersion: REPORT_DOSSIER_TEMPLATE_VERSION,
      hasDossier: true,
    };
    if (typeof report.markModified === "function") report.markModified("content");
  }

  if (typeof report.save === "function") {
    await report.save();
  }

  return dossier;
}

/**
 * Structured datasets for CSV export (no raw dumps).
 */
export function dossierToCsvDatasets(dossier) {
  const datasets = {};
  const s = dossier?.sections || {};

  if (s.careerTimeline?.events?.length) {
    datasets.timeline = s.careerTimeline.events.map((e) => ({
      Year: e.year || "",
      Date: e.date || "",
      Title: e.title || "",
      Description: e.description || "",
      Source: e.source || "",
      Category: e.category || "",
    }));
  }

  if (s.electionHistory?.rows?.length) {
    datasets.elections = s.electionHistory.rows.map((r) => ({
      Election: r.election || "",
      Year: r.year ?? "",
      Constituency: r.constituency || "",
      Party: r.party || "",
      Result: r.result || "",
      Votes: r.votes ?? "",
      "Vote %": r.votePct ?? "",
      Margin: r.margin ?? "",
      Opponent: r.opponent || "",
      Source: r.source || "",
    }));
  }

  if (s.influenceIntelligence?.metrics?.length) {
    datasets.influence = s.influenceIntelligence.metrics.map((m) => ({
      Metric: m.label,
      Score: m.value,
      Explanation: m.explanation || "",
    }));
  }

  if (s.newsSentiment?.items?.length) {
    datasets.news = s.newsSentiment.items.map((n) => ({
      Headline: n.headline || "",
      Date: n.date || n.publishedAt || "",
      Source: n.source || "",
      Sentiment: n.sentiment || "",
      Summary: n.summary || "",
      URL: n.url || "",
    }));
  }

  if (s.geographicInfluence?.states?.length) {
    datasets.geographic = s.geographicInfluence.states.map((g) => ({
      State: g.state || "",
      Influence: g.influence ?? "",
      Confidence: g.confidence ?? "",
      Tier: g.tier || "",
    }));
  }

  if (s.evidenceSources?.items?.length) {
    datasets.evidence = s.evidenceSources.items.map((item) => ({
      Source: item.name || "",
      Description: item.description || "",
      Confidence: item.confidenceLabel || "",
      Updated: item.lastUpdated || "",
      URL: item.url || "",
    }));
  }

  if (s.channelAnalytics?.metrics?.length) {
    datasets.channelAnalytics = s.channelAnalytics.metrics.map((m) => ({
      Metric: m.label,
      Key: m.key,
      Value: m.value,
      CapturedAt: s.channelAnalytics.capturedAt || "",
      Source: s.channelAnalytics.source || "",
    }));
  }

  return datasets;
}
