import PROFILE_BUILDER_VERSIONS, {
  MODULE_CACHE_TTL_MS,
  SECTION_VERSION_KEY,
  getStoredVersion,
} from "../config/profileBuilderVersion.js";

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const computeCacheExpiresAt = (lastUpdated, moduleKey, now = new Date()) => {
  const ttl = MODULE_CACHE_TTL_MS[moduleKey] ?? MODULE_CACHE_TTL_MS.overview;
  const base = lastUpdated ? new Date(lastUpdated) : now;
  const expires = new Date(base.getTime() + ttl);
  return expires.toISOString();
};

const buildModuleDescriptor = ({
  enabled = true,
  hasData = false,
  lastUpdated = null,
  confidence = 0,
  version = 0,
  moduleKey = "overview",
  now = new Date(),
}) => {
  const updatedIso = toIso(lastUpdated) ?? toIso(now);
  return {
    enabled,
    hasData,
    lastUpdated: updatedIso,
    confidence,
    version,
    cacheExpiresAt: computeCacheExpiresAt(updatedIso, moduleKey, now),
  };
};

/**
 * Self-contained module metadata for dynamic profile UI and upgrade tracking.
 */
export const buildModuleMeta = ({
  profile = {},
  account = {},
  snapshotCount = 0,
  now = new Date(),
} = {}) => {
  const lastVerified = profile.lastVerified || profile.lastSynced || null;
  const confidenceBreakdown = profile.confidenceBreakdown || {};
  const timeline = Array.isArray(profile.timeline) ? profile.timeline : [];
  const elections =
    (Array.isArray(profile.electionIntelligence) && profile.electionIntelligence.length > 0
      ? profile.electionIntelligence
      : profile.elections) || [];
  const news = Array.isArray(profile.news) ? profile.news : [];
  const sources = Array.isArray(profile.sources) ? profile.sources : [];
  const verificationCatalog = Array.isArray(profile.verificationCatalog)
    ? profile.verificationCatalog
    : [];
  const relationships = profile.relationships || {};
  const relationshipNodes = Array.isArray(relationships.nodes) ? relationships.nodes : [];
  const aiSummary = profile.aiSummary || {};
  const aiInsights = Array.isArray(profile.aiInsights) ? profile.aiInsights : [];
  const influence = profile.influence || {};
  const geographicReach = Array.isArray(profile.geographicReach) ? profile.geographicReach : [];

  const hasAiSummary =
    Object.values(aiSummary).some((v) => v && String(v).trim()) || aiInsights.length > 0;

  const moduleVersions = profile.moduleVersions || {};
  const profileActive = Boolean(profile.biography?.fullName || account.name);

  return {
    overview: buildModuleDescriptor({
      enabled: profileActive,
      hasData: profileActive,
      lastUpdated: lastVerified || profile.lastBuiltAt,
      confidence: profile.confidenceScore ?? confidenceBreakdown.overall ?? 0,
      version:
        moduleVersions.overview ??
        getStoredVersion(profile, SECTION_VERSION_KEY.overview),
      moduleKey: "overview",
      now,
    }),
    timeline: buildModuleDescriptor({
      enabled: profileActive,
      hasData: timeline.length > 0,
      lastUpdated: lastVerified || profile.lastBuiltAt,
      confidence: confidenceBreakdown.biography || confidenceBreakdown.overall || 0,
      version:
        moduleVersions.timeline ??
        getStoredVersion(profile, SECTION_VERSION_KEY.timeline),
      moduleKey: "timeline",
      now,
    }),
    youtube: buildModuleDescriptor({
      enabled: profileActive,
      hasData: snapshotCount > 0 || Number(account.subscribers || 0) > 0,
      lastUpdated: account.lastSynced || profile.lastSynced,
      confidence: influence.digitalInfluence ?? 0,
      version: moduleVersions.youtube ?? getStoredVersion(profile, SECTION_VERSION_KEY.influence),
      moduleKey: "youtube",
      now,
    }),
    news: buildModuleDescriptor({
      enabled: profileActive,
      hasData: news.length > 0,
      lastUpdated: profile.lastSynced,
      confidence: confidenceBreakdown.overall || 0,
      version:
        moduleVersions.news ?? getStoredVersion(profile, SECTION_VERSION_KEY.news),
      moduleKey: "news",
      now,
    }),
    elections: buildModuleDescriptor({
      enabled: profileActive,
      hasData: elections.length > 0,
      lastUpdated: lastVerified || profile.lastBuiltAt,
      confidence: confidenceBreakdown.electionHistory || confidenceBreakdown.overall || 0,
      version:
        moduleVersions.elections ??
        getStoredVersion(profile, SECTION_VERSION_KEY.elections),
      moduleKey: "elections",
      now,
    }),
    sentiment: buildModuleDescriptor({
      enabled: profileActive,
      hasData: news.length > 0 && Boolean(profile.newsSentiment),
      lastUpdated: profile.lastSynced,
      confidence: confidenceBreakdown.overall || 0,
      version:
        moduleVersions.news ?? getStoredVersion(profile, SECTION_VERSION_KEY.news),
      moduleKey: "sentiment",
      now,
    }),
    verification: buildModuleDescriptor({
      enabled: profileActive,
      hasData: verificationCatalog.length > 0 || sources.some((s) => (s.confidence ?? 0) > 0),
      lastUpdated: lastVerified,
      confidence: confidenceBreakdown.identity || confidenceBreakdown.overall || 0,
      version:
        moduleVersions.facts ?? getStoredVersion(profile, SECTION_VERSION_KEY.facts),
      moduleKey: "verification",
      now,
    }),
    aiSummary: buildModuleDescriptor({
      enabled: profileActive,
      hasData: hasAiSummary,
      lastUpdated: profile.lastBuiltAt || lastVerified,
      confidence: confidenceBreakdown.overall || 0,
      version: moduleVersions.ai ?? getStoredVersion(profile, SECTION_VERSION_KEY.ai),
      moduleKey: "aiSummary",
      now,
    }),
    influence: buildModuleDescriptor({
      enabled: profileActive,
      hasData:
        Number(influence.digitalInfluence || 0) > 0 || geographicReach.length > 0,
      lastUpdated: profile.lastBuiltAt || account.lastSynced,
      confidence: influence.digitalInfluence ?? 0,
      version:
        moduleVersions.influence ??
        getStoredVersion(profile, SECTION_VERSION_KEY.influence),
      moduleKey: "influence",
      now,
    }),
    relationships: buildModuleDescriptor({
      enabled: profileActive,
      hasData: relationshipNodes.length > 0,
      lastUpdated: lastVerified || profile.lastBuiltAt,
      confidence: confidenceBreakdown.biography || confidenceBreakdown.overall || 0,
      version:
        moduleVersions.relationships ??
        getStoredVersion(profile, SECTION_VERSION_KEY.relationships),
      moduleKey: "relationships",
      now,
    }),
  };
};

/** Flat boolean map — module slot available (tabs always render when enabled). */
export const deriveModules = (moduleMeta = {}) => ({
  overview: moduleMeta.overview?.enabled ?? true,
  timeline: moduleMeta.timeline?.enabled ?? true,
  youtube: moduleMeta.youtube?.enabled ?? true,
  news: moduleMeta.news?.enabled ?? true,
  elections: moduleMeta.elections?.enabled ?? true,
  sentiment: moduleMeta.sentiment?.enabled ?? true,
  verification: moduleMeta.verification?.enabled ?? true,
  aiSummary: moduleMeta.aiSummary?.enabled ?? true,
  influence: moduleMeta.influence?.enabled ?? true,
  relationships: moduleMeta.relationships?.enabled ?? true,
});

/** Whether each module currently has stored content (for badges / empty states). */
export const deriveModuleDataFlags = (moduleMeta = {}) => ({
  overview: moduleMeta.overview?.hasData ?? false,
  timeline: moduleMeta.timeline?.hasData ?? false,
  youtube: moduleMeta.youtube?.hasData ?? false,
  news: moduleMeta.news?.hasData ?? false,
  elections: moduleMeta.elections?.hasData ?? false,
  sentiment: moduleMeta.sentiment?.hasData ?? false,
  verification: moduleMeta.verification?.hasData ?? false,
  aiSummary: moduleMeta.aiSummary?.hasData ?? false,
  influence: moduleMeta.influence?.hasData ?? false,
  relationships: moduleMeta.relationships?.hasData ?? false,
});

/** Hydrate moduleMeta from legacy documents missing the new descriptor fields. */
export const buildModuleMetaFromLegacy = (profile, context = {}) =>
  buildModuleMeta({
    profile,
    account: context.account || {},
    snapshotCount: context.snapshotCount ?? 0,
    now: context.now || new Date(),
  });

/**
 * Section-level freshness metadata for intelligence panels.
 */
export const buildSectionMeta = ({
  sources = [],
  lastVerified = null,
  confidenceBreakdown = {},
  timeline = [],
  verifiedFacts = [],
  elections = [],
}) => {
  const sourceCount = sources.filter((s) => (s.confidence ?? 0) > 0 || s.verified).length;
  const verifiedAt = lastVerified ? new Date(lastVerified).toISOString() : null;
  const verifiedDate = lastVerified ? new Date(lastVerified).toISOString().slice(0, 10) : null;

  const base = {
    lastVerified: verifiedDate,
    sourceCount,
    confidence: confidenceBreakdown.overall || 0,
  };

  return {
    profile: { ...base },
    timeline: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.biography || confidenceBreakdown.overall || 0,
      eventCount: timeline.length,
    },
    facts: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.identity || confidenceBreakdown.overall || 0,
      factCount: verifiedFacts.length,
    },
    elections: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.electionHistory || confidenceBreakdown.overall || 0,
      electionCount: elections.length,
    },
    relationships: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.biography || confidenceBreakdown.overall || 0,
    },
    ai: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.overall || 0,
    },
  };
};

/**
 * Canonical verification sources with match status from scraped data.
 */
export const CANONICAL_VERIFICATION_SOURCES = [
  { key: "lokSabha", label: "Lok Sabha", matchers: ["lok sabha", "sansad"] },
  { key: "rajyaSabha", label: "Rajya Sabha", matchers: ["rajya sabha"] },
  { key: "myneta", label: "MyNeta", matchers: ["myneta"] },
  { key: "eci", label: "Election Commission", matchers: ["election commission", "eci affidavit"] },
  { key: "stateAssembly", label: "State Assembly", matchers: ["state assembly", "legislative assembly"] },
  { key: "government", label: "Government", matchers: ["government", "sansad.in"] },
  { key: "partyWebsite", label: "Party Website", matchers: ["party website", "official party", "bjp", "congress", "aap", "trinamool", "samajwadi", "bahujan"] },
  { key: "wikipedia", label: "Wikipedia", matchers: ["wikipedia"] },
];

export const buildVerificationCatalog = (sources = [], lastVerified = null) => {
  const safeSources = Array.isArray(sources) ? sources : [];
  return CANONICAL_VERIFICATION_SOURCES.map((canonical) => {
    const match = safeSources.find((s) => {
      const name = String(s.name || "").toLowerCase();
      return (canonical.matchers ?? []).some((m) => name.includes(m));
    });

    return {
      key: canonical.key,
      label: canonical.label,
      verified: Boolean(match),
      url: match?.url || null,
      confidence: match?.confidence ?? 0,
      fetchedAt: match?.fetchedAt || null,
      lastVerified: lastVerified ? new Date(lastVerified).toISOString().slice(0, 10) : null,
    };
  }).filter((entry) => entry.verified);
};
