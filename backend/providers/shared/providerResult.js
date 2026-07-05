import { createEmptyNormalizedProfile, isPresent } from "../normalizedProfile.js";

export const SOURCE_TYPES = {
  SCRAPE: "scrape",
  API: "api",
};

/**
 * Standard provider response envelope.
 */
export const createProviderResult = ({ success, confidence, data, source }) => ({
  success: Boolean(success),
  confidence: Math.min(100, Math.max(0, Math.round(confidence || 0))),
  data: data || null,
  source: {
    name: source?.name || "",
    url: source?.url || "",
    type: source?.type || SOURCE_TYPES.SCRAPE,
    fetchedAt: source?.fetchedAt || new Date().toISOString(),
  },
});

export const failedProviderResult = (sourceName, url = "", type = SOURCE_TYPES.SCRAPE) =>
  createProviderResult({
    success: false,
    confidence: 0,
    data: null,
    source: { name: sourceName, url, type },
  });

const SCALAR_FIELDS = [
  "legalName",
  "dateOfBirth",
  "age",
  "gender",
  "constituency",
  "currentOffice",
  "currentPosition",
  "education",
  "profession",
  "priorCareer",
  "joinedParty",
  "party",
  "state",
  "biography",
  "wikipediaLink",
  "officialWebsite",
];

/**
 * Score how complete a normalized profile payload is (0–100).
 */
export const scoreNormalizedData = (data) => {
  if (!data) return 0;

  const filledScalars = SCALAR_FIELDS.filter((field) => isPresent(data[field])).length;
  const timelineScore = Math.min((data.timeline?.length || 0) * 4, 16);
  const electionScore = Math.min((data.elections?.length || 0) * 4, 12);

  const raw = filledScalars * 5 + timelineScore + electionScore;
  return Math.min(100, raw);
};

export const normalizeProviderData = (data) => {
  const base = createEmptyNormalizedProfile();
  if (!data || typeof data !== "object") return base;
  return {
    ...base,
    ...data,
    previousPositions: Array.isArray(data.previousPositions) ? data.previousPositions : [],
    timeline: Array.isArray(data.timeline) ? data.timeline : [],
    elections: Array.isArray(data.elections) ? data.elections : [],
    facts: Array.isArray(data.facts) ? data.facts : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
};

/**
 * Execute a provider without throwing — failures return a failed envelope.
 */
export const runProviderSafely = async (providerFn, identity, sourceMeta) => {
  try {
    const result = await providerFn(identity);
    if (result?.success && result?.data) {
      result.data = normalizeProviderData(result.data);
    }
    return result;
  } catch (err) {
    console.warn(`[${sourceMeta.name}] Provider failed:`, err.message);
    return failedProviderResult(sourceMeta.name, sourceMeta.url, sourceMeta.type);
  }
};

export const hasUsableData = (result) =>
  result?.success && result?.data && scoreNormalizedData(result.data) > 0;
