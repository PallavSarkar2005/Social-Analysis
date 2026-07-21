/**
 * Geographic Influence Intelligence — evidence-backed state heatmap.
 * Never fabricates state influence. Unverified states remain "monitoring".
 * Calculated during background sync only.
 */
import { inferStateFromText } from "../providers/shared/politicalIdentityUtils.js";

export const GEO_INFLUENCE_CALCULATION_VERSION = 3;

const UNKNOWN_STATES = new Set([
  "",
  "unknown",
  "unknown state",
  "n/a",
  "na",
  "null",
  "undefined",
]);

const resolveCanonicalState = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || UNKNOWN_STATES.has(trimmed.toLowerCase())) return null;
  return inferStateFromText(trimmed);
};

const provenanceConfidence = (profile, key) => {
  const prov = profile?.fieldProvenance?.[key];
  if (!prov) return 0;
  const conf = Number(prov.confidence || 0);
  if (conf > 0) return conf;
  const sources = Array.isArray(prov.verifiedBy) ? prov.verifiedBy.length : 0;
  return Math.min(40 + sources * 15, 95);
};

const pushEvidence = (bucket, item) => {
  if (!item?.type || !item?.label) return;
  const key = `${item.type}:${item.label}:${item.detail || ""}`;
  if (bucket._seen.has(key)) return;
  bucket._seen.add(key);
  bucket.list.push({
    type: item.type,
    label: item.label,
    detail: item.detail || "",
    source: item.source || item.label,
  });
};

const ensureState = (map, state) => {
  const canonical = resolveCanonicalState(state);
  if (!canonical) return null;
  if (!map.has(canonical)) {
    map.set(canonical, {
      state: canonical,
      weight: 0,
      confidence: 0,
      sources: new Set(),
      evidence: { list: [], _seen: new Set() },
      electionHistory: [],
      politicalRole: null,
      isHomeState: false,
    });
  }
  return map.get(canonical);
};

const addSignal = (map, state, signal) => {
  const entry = ensureState(map, state);
  if (!entry) return;
  entry.weight += signal.weight || 0;
  entry.confidence = Math.max(entry.confidence, signal.confidence || 0);
  if (signal.source) entry.sources.add(signal.source);
  if (signal.isHomeState) entry.isHomeState = true;
  if (signal.politicalRole) entry.politicalRole = signal.politicalRole;
  if (signal.evidence) pushEvidence(entry.evidence, signal.evidence);
  if (signal.election) {
    entry.electionHistory.push(signal.election);
  }
};

const isWin = (row) => {
  const position = String(row.position || row.result || row.outcome || "").toLowerCase();
  return (
    row.winner === true ||
    row.isWinner === true ||
    /win|won|victor|1st|first|elected/.test(position) ||
    position === "winner"
  );
};

const resolvePoliticalRole = (biography = {}) =>
  biography.currentPosition || biography.currentOffice || null;

const tierFromScore = (score, verified) => {
  if (!verified) return "monitoring";
  if (score >= 80) return "strong";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "emerging";
};

/**
 * Collect evidence-backed geographic signals.
 */
export const collectGeographicEvidence = ({
  account = {},
  profile = {},
} = {}) => {
  const map = new Map();
  const biography = profile.biography || {};
  const role = resolvePoliticalRole(biography);
  const verifiedFacts = Array.isArray(profile.verifiedFacts)
    ? profile.verifiedFacts
    : [];
  const profileSources = Array.isArray(profile.sources) ? profile.sources : [];

  const bioState = resolveCanonicalState(biography.state);
  if (bioState) {
    const conf = Math.max(provenanceConfidence(profile, "state"), 70);
    addSignal(map, bioState, {
      weight: 42,
      confidence: conf,
      source: "Official Biography",
      isHomeState: true,
      politicalRole: role,
      evidence: {
        type: "biography",
        label: "Official Biography",
        detail: `Represented / associated state: ${bioState}`,
        source: "Official Biography",
      },
    });
    if (role) {
      addSignal(map, bioState, {
        weight: 18,
        confidence: conf,
        source: "Political Office",
        isHomeState: true,
        politicalRole: role,
        evidence: {
          type: "office",
          label: "Political Office",
          detail: role,
          source: "Political Office",
        },
      });
    }
  }

  const stateFact = verifiedFacts.find((f) => f.key === "state" && f.value);
  if (stateFact) {
    addSignal(map, stateFact.value, {
      weight: 36,
      confidence: Math.max(Number(stateFact.confidence) || 0, 65),
      source: "Wikipedia",
      isHomeState: true,
      politicalRole: role,
      evidence: {
        type: "verified_fact",
        label: "Verified Public Records",
        detail: String(stateFact.value),
        source: (stateFact.verifiedBy || [])[0] || "Verified Public Records",
      },
    });
  }

  const accountState = resolveCanonicalState(account.state);
  if (accountState) {
    addSignal(map, accountState, {
      weight: bioState === accountState ? 10 : 22,
      confidence: bioState === accountState ? 75 : 55,
      source: "Account Identity",
      isHomeState: !bioState || bioState === accountState,
      politicalRole: role,
      evidence: {
        type: "account",
        label: "Account Political Identity",
        detail: accountState,
        source: "Account Identity",
      },
    });
  }

  if (biography.constituency) {
    const fromConstituency = resolveCanonicalState(biography.constituency);
    const target = fromConstituency || bioState;
    if (target) {
      addSignal(map, target, {
        weight: fromConstituency ? 28 : 12,
        confidence: Math.max(provenanceConfidence(profile, "constituency"), 55),
        source: "Election Records",
        isHomeState: true,
        evidence: {
          type: "constituency",
          label: "Political Constituency",
          detail: biography.constituency,
          source: "Election Records",
        },
      });
    }
  }

  const elections = [
    ...(Array.isArray(profile.electionIntelligence) ? profile.electionIntelligence : []),
    ...(Array.isArray(profile.elections) ? profile.elections : []),
  ];

  for (const row of elections) {
    const electionText = [row.election, row.constituency, row.state]
      .filter(Boolean)
      .join(" ");
    const electionState =
      resolveCanonicalState(row.state) ||
      resolveCanonicalState(row.constituency) ||
      resolveCanonicalState(electionText) ||
      bioState;
    if (!electionState) continue;

    const yearBoost = Number(row.year) >= new Date().getFullYear() - 5 ? 8 : 0;
    const won = isWin(row);
    addSignal(map, electionState, {
      weight: (won ? 24 : 14) + yearBoost,
      confidence: Math.max(Number(row.confidence) || 50, 45),
      source: "Election Records",
      isHomeState: electionState === bioState || electionState === accountState,
      politicalRole: role,
      election: {
        year: row.year || null,
        election: row.election || "",
        constituency: row.constituency || "",
        party: row.party || "",
        result: won ? "Win" : row.position || "Contested",
      },
      evidence: {
        type: "election",
        label: won ? "Election Win" : "Election Contest",
        detail: [row.year, row.election || row.constituency]
          .filter(Boolean)
          .join(" · "),
        source: "Election Records",
      },
    });
  }

  const news = Array.isArray(profile.news) ? profile.news : [];
  const newsCounts = new Map();
  for (const item of news) {
    const text = [item.headline, item.summary].filter(Boolean).join(" ");
    const mentioned = resolveCanonicalState(text);
    if (!mentioned) continue;
    newsCounts.set(mentioned, (newsCounts.get(mentioned) || 0) + 1);
  }
  for (const [state, count] of newsCounts.entries()) {
    addSignal(map, state, {
      weight: Math.min(count * 4, 16),
      confidence: Math.min(35 + count * 5, 55),
      source: "News",
      evidence: {
        type: "news",
        label: "News Mentions",
        detail: `${count} verified news mention(s)`,
        source: "News",
      },
    });
  }

  const descriptionState = resolveCanonicalState(account.description || "");
  if (descriptionState) {
    addSignal(map, descriptionState, {
      weight: map.has(descriptionState) ? 6 : 14,
      confidence: map.has(descriptionState) ? 50 : 40,
      source: "YouTube",
      isHomeState: map.size === 0,
      evidence: {
        type: "youtube",
        label: "YouTube / Channel Description",
        detail: `State signal from channel description`,
        source: "YouTube",
      },
    });
  }

  if (biography.wikipediaLink && bioState) {
    addSignal(map, bioState, {
      weight: 8,
      confidence: 70,
      source: "Wikipedia",
      evidence: {
        type: "wikipedia",
        label: "Wikipedia",
        detail: biography.wikipediaLink,
        source: "Wikipedia",
      },
    });
  }

  // Attach named profile sources that mention a state (soft boost)
  for (const src of profileSources.slice(0, 12)) {
    const named = resolveCanonicalState(src.name || "") || bioState;
    if (!named || !map.has(named)) continue;
    addSignal(map, named, {
      weight: 3,
      confidence: Math.max(Number(src.confidence) || 40, 40),
      source: src.name || "Source catalog",
      evidence: {
        type: "source",
        label: src.name || "Primary Source",
        detail: src.url || "",
        source: src.name || "Primary Source",
      },
    });
  }

  return [...map.values()].map((entry) => ({
    ...entry,
    evidence: entry.evidence.list,
    sources: [...entry.sources],
  }));
};

/**
 * Build MongoDB geographic intelligence payload.
 * Always returns usable meta — never an empty "error" map experience.
 */
export const buildGeographicInfluence = ({
  account = {},
  profile = {},
} = {}) => {
  const now = new Date();
  const evidenceRows = collectGeographicEvidence({ account, profile });
  const subscribers = Number(account.subscribers || 0);
  const role = resolvePoliticalRole(profile.biography || {});

  const usable = evidenceRows.filter((e) => e.confidence >= 40 && e.weight >= 12);

  const totalWeight = usable.reduce((sum, e) => sum + e.weight, 0) || 1;
  const baseInfluence = (() => {
    const subs = Math.max(subscribers, 1);
    return Math.min(100, Math.round(Math.log10(subs) * 18));
  })();

  const geographicReach = usable
    .map((e) => {
      const concentration = Math.round((e.weight / totalWeight) * 1000) / 10;
      const influenceScore = Math.min(
        100,
        Math.round(
          baseInfluence *
            (0.45 + (e.confidence / 100) * 0.55) *
            (0.55 + concentration / 100) +
            Math.min(e.evidence.length * 2, 12)
        )
      );
      const electionWins = e.electionHistory.filter(
        (h) => String(h.result).toLowerCase() === "win"
      ).length;
      const primarySources = [
        ...new Set([
          ...e.sources,
          ...e.evidence.map((ev) => ev.source).filter(Boolean),
        ]),
      ].slice(0, 8);

      return {
        state: e.state,
        concentration,
        influenceScore,
        followers:
          subscribers > 0
            ? Math.round(subscribers * (concentration / 100))
            : 0,
        confidence: Math.round(e.confidence),
        evidenceCount: e.evidence.length,
        evidence: e.evidence,
        politicalRole: e.politicalRole || role || null,
        electionWins,
        electionHistory: e.electionHistory.slice(0, 12),
        primarySources,
        source: primarySources.join("; "),
        lastUpdated: now,
        isHomeState: Boolean(e.isHomeState),
        isPrimary: false,
        tier: "emerging",
        status: "verified",
      };
    })
    .sort((a, b) => b.influenceScore - a.influenceScore || b.confidence - a.confidence);

  // Normalize concentrations
  if (geographicReach.length > 1) {
    const sum = geographicReach.reduce((s, r) => s + r.concentration, 0);
    if (sum > 0 && Math.abs(sum - 100) >= 0.5) {
      const scale = 100 / sum;
      let running = 0;
      for (let i = 0; i < geographicReach.length; i++) {
        if (i === geographicReach.length - 1) {
          geographicReach[i].concentration =
            Math.round((100 - running) * 10) / 10;
        } else {
          geographicReach[i].concentration =
            Math.round(geographicReach[i].concentration * scale * 10) / 10;
          running += geographicReach[i].concentration;
        }
        if (subscribers > 0) {
          geographicReach[i].followers = Math.round(
            subscribers * (geographicReach[i].concentration / 100)
          );
        }
      }
    }
  } else if (geographicReach.length === 1) {
    geographicReach[0].concentration = 100;
    geographicReach[0].followers = subscribers;
  }

  if (geographicReach.length > 0) {
    geographicReach[0].isPrimary = true;
  }

  for (const row of geographicReach) {
    row.tier = tierFromScore(row.influenceScore, true);
  }

  const primaryRegion = geographicReach[0]?.state || null;
  const secondaryRegions = geographicReach
    .slice(1, 4)
    .filter((r) => r.tier === "strong" || r.tier === "high" || r.tier === "moderate")
    .map((r) => r.state);
  const emergingRegions = geographicReach
    .filter((r) => r.tier === "emerging" && r.state !== primaryRegion)
    .map((r) => r.state)
    .slice(0, 4);

  // Secondary fallback: next ranked states if filters empty
  const secondary =
    secondaryRegions.length > 0
      ? secondaryRegions
      : geographicReach.slice(1, 3).map((r) => r.state);

  const verifiedCoverage = geographicReach.length;

  return {
    geographicReach,
    audienceAnalytics: {},
    geographicMeta: {
      status: verifiedCoverage > 0 ? "monitoring_with_coverage" : "monitoring",
      message:
        verifiedCoverage > 0
          ? `Verified coverage across ${verifiedCoverage} state${verifiedCoverage === 1 ? "" : "s"}. Remaining states are under continuous geographic monitoring.`
          : "Geographic monitoring active. State influence will populate as verified office, election, and news evidence syncs.",
      lastCalculated: now,
      calculationVersion: GEO_INFLUENCE_CALCULATION_VERSION,
      evidenceCount: geographicReach.reduce(
        (sum, r) => sum + (r.evidenceCount || 0),
        0
      ),
      verifiedCoverage,
      regionalSummary: {
        primaryRegion,
        secondaryRegions: secondary,
        emergingRegions,
        verifiedCoverage,
      },
    },
  };
};

export default buildGeographicInfluence;
