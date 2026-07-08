import { fetchWikipediaProfile } from "../providers/wikipediaScraperProvider.js";
import { fetchLokSabhaProfile } from "../providers/lokSabhaScraperProvider.js";
import { fetchRajyaSabhaProfile } from "../providers/rajyaSabhaScraperProvider.js";
import { fetchStateAssemblyProfile } from "../providers/stateAssemblyScraperProvider.js";
import { fetchPartyWebsiteProfile } from "../providers/partyWebsiteScraperProvider.js";
import { fetchEciAffidavitProfile } from "../providers/eciAffidavitScraperProvider.js";
import { extractFactsFromProviderData } from "../providers/shared/factExtractor.js";
import {
  pickFirst,
  isPresent,
  parseAgeFromBirthDate,
} from "../providers/normalizedProfile.js";
import {
  runProviderSafely,
  hasUsableData,
} from "../providers/shared/providerResult.js";
import { mergeFacts, assembleProfileFromFacts, flattenProviderFacts } from "./politicalFactEngine.js";
import { computeConfidenceBreakdown } from "./confidenceEngine.js";
import { detectFieldConflicts, applyConflictsToProfile } from "./conflictDetectionService.js";
import { buildPoliticalStatistics } from "./politicalStatisticsService.js";
import { buildSectionMeta, buildVerificationCatalog } from "./sectionMetaService.js";
import { buildIntelligenceTimeline } from "./politicalTimelineService.js";
import {
  buildElectionIntelligence,
  toLegacyElections,
} from "./electionIntelligenceService.js";
import { buildRelationshipGraph } from "./relationshipGraphService.js";
import { resolveEnrichmentIdentity } from "../providers/shared/politicalIdentityUtils.js";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Higher-priority sources win for scalar fields during merge. */
export const SOURCE_PRIORITY = [
  "lokSabha",
  "rajyaSabha",
  "stateAssembly",
  "eciAffidavit",
  "wikipedia",
  "partyWebsite",
];

const PROVIDER_REGISTRY = [
  { key: "lokSabha", fn: fetchLokSabhaProfile },
  { key: "rajyaSabha", fn: fetchRajyaSabhaProfile },
  { key: "stateAssembly", fn: fetchStateAssemblyProfile },
  { key: "eciAffidavit", fn: fetchEciAffidavitProfile },
  { key: "wikipedia", fn: fetchWikipediaProfile },
  { key: "partyWebsite", fn: fetchPartyWebsiteProfile },
];

export const resolvePoliticianIdentity = (account) => resolveEnrichmentIdentity(account);

const getSuccessfulDataMap = (providerResults) => {
  const map = {};
  for (const { key } of PROVIDER_REGISTRY) {
    const result = providerResults[key];
    if (hasUsableData(result)) {
      map[key] = result.data;
    }
  }
  return map;
};

const mergeRawProviderTimeline = (dataMap) => {
  const timeline = [];
  const seen = new Set();

  for (const key of SOURCE_PRIORITY) {
    for (const event of dataMap[key]?.timeline || []) {
      const normalized = `${event.year}:${event.event}`;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      timeline.push(event);
    }
  }

  return timeline.sort((a, b) => {
    const yearA = Number(String(a.year).replace(/\D/g, "")) || 0;
    const yearB = Number(String(b.year).replace(/\D/g, "")) || 0;
    return yearA - yearB;
  });
};

const mergeElections = (dataMap) => {
  const elections = [];
  const seen = new Set();

  for (const key of SOURCE_PRIORITY) {
    for (const row of dataMap[key]?.elections || []) {
      const normalized = `${row.year}:${row.election}:${row.constituency}`;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      elections.push(row);
    }
  }

  return elections.sort((a, b) => (b.year || 0) - (a.year || 0));
};

const mergeSources = (successfulResults) =>
  successfulResults.map((result) => ({
    name: result.source.name,
    url: result.source.url,
    type: result.source.type,
    confidence: result.confidence,
    fetchedAt: result.source.fetchedAt ? new Date(result.source.fetchedAt) : new Date(),
  }));

const mergeScalarField = (field, dataMap) =>
  pickFirst(...SOURCE_PRIORITY.map((key) => dataMap[key]?.[field]));

const mergePreviousPositions = (dataMap) => {
  const positions = [];
  const seen = new Set();

  for (const key of SOURCE_PRIORITY) {
    for (const entry of dataMap[key]?.previousPositions || []) {
      if (!entry || seen.has(entry)) continue;
      seen.add(entry);
      positions.push(entry);
    }
  }

  return positions;
};

/**
 * Legacy merge for backward compatibility — superseded by fact engine but kept as fallback.
 */
export const mergeProviderResults = (providerResults, identity) => {
  const dataMap = getSuccessfulDataMap(providerResults);
  const dateOfBirth = mergeScalarField("dateOfBirth", dataMap);
  const age = mergeScalarField("age", dataMap) ?? parseAgeFromBirthDate(dateOfBirth);

  return {
    biography: {
      fullName: mergeScalarField("legalName", dataMap) || identity.name || null,
      dob: dateOfBirth,
      age: age ?? null,
      gender: mergeScalarField("gender", dataMap),
      state: mergeScalarField("state", dataMap) || identity.state || null,
      constituency: mergeScalarField("constituency", dataMap),
      party: mergeScalarField("party", dataMap) || identity.party || null,
      currentPosition: mergeScalarField("currentPosition", dataMap),
      previousPositions: mergePreviousPositions(dataMap),
      currentOffice: mergeScalarField("currentOffice", dataMap),
      dateJoinedParty: mergeScalarField("joinedParty", dataMap),
      dateFirstElected: null,
      yearsInOffice: null,
      education: mergeScalarField("education", dataMap),
      profession:
        mergeScalarField("profession", dataMap) || mergeScalarField("priorCareer", dataMap),
      officialWebsite: mergeScalarField("officialWebsite", dataMap),
      wikipediaLink: mergeScalarField("wikipediaLink", dataMap),
    },
    rawTimeline: mergeRawProviderTimeline(dataMap),
    elections: mergeElections(dataMap),
    biographySummary: mergeScalarField("biography", dataMap),
  };
};

const extractAllFacts = (providerResults) => {
  const factSets = [];

  for (const { key } of PROVIDER_REGISTRY) {
    const result = providerResults[key];
    if (!hasUsableData(result)) continue;

    const facts = extractFactsFromProviderData(
      result.data,
      key,
      result.source,
      result.confidence
    );
    factSets.push({ facts: Array.isArray(facts) ? facts : [], providerKey: key });
  }

  return { factSets, facts: mergeFacts(factSets) };
};

export const computeConfidenceScore = (successfulResults, facts = [], biography = {}, sources = [], lastVerified = null) => {
  const breakdown = computeConfidenceBreakdown({
    facts,
    biography,
    sources,
    lastVerified,
  });
  return breakdown.overall;
};

export const isProfileStale = (profile) => {
  if (!profile) return true;
  if (!profile.lastVerified) return true;
  return Date.now() - new Date(profile.lastVerified).getTime() > CACHE_TTL_MS;
};

/**
 * Fetch public profile data from all providers concurrently.
 */
export const enrichPoliticalProfile = async (account) => {
  const identity = resolvePoliticianIdentity(account);
  console.log(`[PROFILE ENRICHMENT] Starting concurrent scrape for: ${identity.name}`);

  const settled = await Promise.all(
    PROVIDER_REGISTRY.map(({ key, fn }) =>
      runProviderSafely(fn, identity, { name: key, url: "", type: "scrape" }).then((result) => ({
        key,
        result,
      }))
    )
  );

  const providerResults = {};
  const allResults = [];

  for (const { key, result } of settled) {
    providerResults[key] = result;
    allResults.push(result);
    console.log(
      `[PROFILE ENRICHMENT] ${key}: ${result.success ? "success" : "failed"} (confidence=${result.confidence})`
    );
  }

  const successfulResults = allResults.filter(hasUsableData);

  if (successfulResults.length === 0) {
    console.warn(`[PROFILE ENRICHMENT] All providers failed for ${identity.name}`);
    return {
      enrichmentSuccess: false,
      biography: {
        fullName: identity.name || null,
        state: identity.state || null,
        party: identity.party || null,
      },
      facts: [],
      verifiedFacts: [],
      fieldProvenance: {},
      timeline: [],
      elections: [],
      electionIntelligence: [],
      relationships: { nodes: [], edges: [] },
      sources: [],
      confidenceScore: 0,
      confidenceBreakdown: {},
      fieldConflicts: [],
      politicalStatistics: [],
      sectionMeta: {},
      verificationCatalog: [],
      lastVerified: null,
    };
  }

  const merged = mergeProviderResults(providerResults, identity);
  const { factSets, facts: mergedFacts } = extractAllFacts(providerResults);
  const facts = Array.isArray(mergedFacts) ? mergedFacts : [];
  const lastVerified = new Date();

  try {
    const rawFacts = flattenProviderFacts(factSets);

    let { biography, verifiedFacts, fieldProvenance } = assembleProfileFromFacts(
      facts,
      identity,
      lastVerified
    );
    const fieldConflicts = detectFieldConflicts(rawFacts, lastVerified);
    ({ verifiedFacts, fieldProvenance } = applyConflictsToProfile(
      verifiedFacts ?? [],
      fieldProvenance ?? {},
      fieldConflicts ?? []
    ));
    const enrichedBiography = {
      ...merged.biography,
      ...biography,
      fullName: biography.fullName || merged.biography.fullName,
      party: biography.party || merged.biography.party,
      state: biography.state || merged.biography.state,
    };

    const sources = mergeSources(successfulResults);

    const providerElectionLists = SOURCE_PRIORITY.map(
      (key) => providerResults[key]?.data?.elections ?? []
    );
    const electionIntelligence = buildElectionIntelligence(
      providerElectionLists,
      enrichedBiography,
      sources
    );
    const elections = toLegacyElections(
      electionIntelligence.length > 0 ? electionIntelligence : (merged.elections ?? [])
    );

    const confidenceBreakdown = computeConfidenceBreakdown({
      facts,
      biography: enrichedBiography,
      sources,
      lastVerified,
      electionsCount: elections.length,
    });
    const confidenceScore = confidenceBreakdown.overall;

    const timeline = buildIntelligenceTimeline({
      biography: enrichedBiography,
      rawTimeline: merged.rawTimeline ?? [],
      elections,
      sources,
      facts,
    });

    const relationships = buildRelationshipGraph({
      biography: enrichedBiography,
      facts,
      elections: electionIntelligence,
    });

    const politicalStatistics = buildPoliticalStatistics({
      biography: enrichedBiography,
      elections,
      electionIntelligence,
      facts,
      timeline,
      lastVerified,
    });

    const sectionMeta = buildSectionMeta({
      sources,
      lastVerified,
      confidenceBreakdown,
      timeline,
      verifiedFacts,
      elections,
    });

    const verificationCatalog = buildVerificationCatalog(sources, lastVerified);

    console.log(
      `[PROFILE ENRICHMENT] Completed for ${identity.name} — ${successfulResults.length}/${PROVIDER_REGISTRY.length} sources, confidence=${confidenceScore}, facts=${facts.length}, timeline=${timeline.length} events`
    );

    const { rawTimeline: _raw, ...mergedPublic } = merged;

    return {
      enrichmentSuccess: true,
      ...mergedPublic,
      biography: enrichedBiography,
      facts,
      verifiedFacts,
      fieldProvenance,
      fieldConflicts,
      timeline,
      elections,
      electionIntelligence,
      relationships,
      politicalStatistics,
      sectionMeta,
      verificationCatalog,
      sources,
      confidenceScore,
      confidenceBreakdown,
      lastVerified,
    };
  } catch (assemblyError) {
    console.warn(
      `[PROFILE ENRICHMENT] Intelligence assembly failed for ${identity.name}:`,
      assemblyError.message
    );
    return {
      enrichmentSuccess: false,
      biography: {
        fullName: identity.name || null,
        state: identity.state || null,
        party: identity.party || null,
      },
      facts: [],
      verifiedFacts: [],
      fieldProvenance: {},
      fieldConflicts: [],
      timeline: [],
      elections: [],
      electionIntelligence: [],
      relationships: { nodes: [], edges: [] },
      politicalStatistics: [],
      sectionMeta: {},
      verificationCatalog: [],
      sources: mergeSources(successfulResults),
      confidenceScore: 0,
      confidenceBreakdown: {},
      lastVerified: null,
    };
  }
};

export const buildProfileUpdatePayload = (accountId, enriched) => {
  const payload = {
    accountId,
    biography: enriched.biography,
    facts: enriched.facts || [],
    verifiedFacts: enriched.verifiedFacts || [],
    fieldProvenance: enriched.fieldProvenance || {},
    fieldConflicts: enriched.fieldConflicts || [],
    timeline: enriched.timeline,
    elections: enriched.elections,
    electionIntelligence: enriched.electionIntelligence || [],
    relationships: enriched.relationships || { nodes: [], edges: [] },
    politicalStatistics: enriched.politicalStatistics || [],
    sectionMeta: enriched.sectionMeta || {},
    verificationCatalog: enriched.verificationCatalog || [],
    sources: enriched.sources,
    confidenceScore: enriched.confidenceScore,
    confidenceBreakdown: enriched.confidenceBreakdown || {},
    lastSynced: new Date(),
  };

  if (enriched.enrichmentSuccess && enriched.lastVerified) {
    payload.lastVerified = enriched.lastVerified;
  }

  return payload;
};

export const buildEmptyProfileShell = (account) => ({
  accountId: account._id,
  biography: {
    fullName: account.name || null,
    state: account.state || null,
    party: account.party || null,
  },
  facts: [],
  verifiedFacts: [],
  fieldProvenance: {},
  timeline: [],
  elections: [],
  electionIntelligence: [],
  relationships: { nodes: [], edges: [] },
  fieldConflicts: [],
  politicalStatistics: [],
  sectionMeta: {},
  verificationCatalog: [],
  sources: [],
  confidenceScore: 0,
  confidenceBreakdown: {},
  lastVerified: null,
  lastSynced: new Date(),
});

export const sanitizeBiographyForResponse = (biography = {}) => {
  const safeBiography =
    biography && typeof biography === "object" && !Array.isArray(biography)
      ? biography
      : {};
  const sanitized = {};
  for (const [key, value] of Object.entries(safeBiography)) {
    if (key === "previousPositions") {
      sanitized[key] = Array.isArray(value) && value.length > 0 ? value : [];
      continue;
    }
    if (key === "socialLinks") {
      sanitized[key] = value;
      continue;
    }
    if (value === "" || value === undefined) {
      sanitized[key] = null;
    } else if (key === "age" && (value === 0 || value === null)) {
      sanitized[key] = null;
    } else if (key === "yearsInOffice" && value === 0) {
      sanitized[key] = null;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const sanitizeVerifiedFactsForResponse = (facts = []) =>
  (facts || []).filter((f) => f?.value && isPresent(f.value)).map((f) => ({
    key: f.key,
    label: f.label,
    value: f.value,
    confidence: f.confidence ?? 0,
    verifiedBy: f.verifiedBy || [],
    lastVerified: f.lastVerified || null,
    conflict: Boolean(f.conflict),
    alternatives: f.alternatives || [],
  }));

export const sanitizeSourcesForResponse = (sources = []) =>
  (sources || []).map((s) => ({
    name: s.name,
    url: s.url || null,
    type: s.type || "scrape",
    confidence: s.confidence ?? 0,
    fetchedAt: s.fetchedAt || null,
    verified: (s.confidence ?? 0) > 0,
  }));
