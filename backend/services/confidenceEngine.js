import { SOURCE_PRIORITY_WEIGHT } from "../providers/shared/factTypes.js";
import { isVerifiedValue } from "./politicalFactEngine.js";

const FRESHNESS_DAYS = 30;

const freshnessBonus = (lastVerified) => {
  if (!lastVerified) return 0;
  const days = (Date.now() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 10;
  if (days <= FRESHNESS_DAYS) return 5;
  return 0;
};

const sourceWeight = (sourceName) => {
  const normalized = String(sourceName || "").toLowerCase();
  if (normalized.includes("lok sabha") || normalized.includes("sansad")) return 100;
  if (normalized.includes("rajya sabha")) return 95;
  if (normalized.includes("state assembly") || normalized.includes("assembly")) return 90;
  if (normalized.includes("myneta") || normalized.includes("election")) return 88;
  if (normalized.includes("wikipedia")) return 70;
  if (normalized.includes("party")) return 65;
  return 50;
};

/**
 * Per-fact confidence from source count, priority weights, freshness, completeness.
 */
export const computeFactConfidence = (fact, lastVerified = null) => {
  const verifiedBy = fact.verifiedBy || (fact.source ? [fact.source] : []);
  const uniqueSources = [...new Set(verifiedBy.filter(Boolean))];
  const sourceCountScore = Math.min(uniqueSources.length * 14, 42);

  const weights = uniqueSources.map(sourceWeight);
  const priorityScore =
    weights.length > 0
      ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length * 0.35)
      : 0;

  const completeness = isVerifiedValue(fact.year) ? 8 : 0;
  const base = Number(fact.confidence) || 0;

  return Math.min(
    100,
    Math.round(sourceCountScore + priorityScore + completeness + freshnessBonus(lastVerified) + base * 0.15)
  );
};

/**
 * Compute per-category and overall confidence from merged facts and provenance.
 */
export const computeConfidenceBreakdown = ({
  facts = [],
  biography = {},
  sources = [],
  lastVerified = null,
  electionsCount = 0,
}) => {
  const freshness = freshnessBonus(lastVerified);

  const scoreFromFacts = (types, biographyField) => {
    const safeFacts = Array.isArray(facts) ? facts : [];
    const matching = safeFacts.filter((f) => types.includes(f.type));
    const uniqueSources = new Set(matching.flatMap((f) => f.verifiedBy || [f.source]).filter(Boolean));
    const sourceScore = Math.min(uniqueSources.size * 15, 60);
    const avgConfidence =
      matching.length > 0
        ? matching.reduce((sum, f) => sum + computeFactConfidence(f, lastVerified), 0) / matching.length
        : 0;
    const fieldBonus = isVerifiedValue(biographyField) ? 20 : 0;
    return Math.min(100, Math.round(sourceScore + avgConfidence * 0.3 + fieldBonus));
  };

  const identityFacts = (Array.isArray(facts) ? facts : []).filter(
    (f) =>
      ["Birth", "Political Party", "Government Position"].includes(f.type) ||
      /legal name|gender/i.test(f.title || "")
  );
  const identitySources = new Set(identityFacts.flatMap((f) => f.verifiedBy || [f.source]).filter(Boolean));
  const identity = Math.min(
    100,
    Math.round(identitySources.size * 20 + (isVerifiedValue(biography.fullName) ? 30 : 0))
  );

  const sourceCount = (Array.isArray(sources) ? sources : []).filter((s) => s.confidence > 0).length;
  const sourceBonus = Math.min(sourceCount * 5, 25);

  const categories = {
    identity: Math.min(100, identity + freshness + sourceBonus),
    birth: Math.min(100, scoreFromFacts(["Birth", "Birth Place"], biography.dob) + freshness),
    education: Math.min(
      100,
      scoreFromFacts(["School Education", "College Education", "Degree"], biography.education) + freshness
    ),
    career: Math.min(100, scoreFromFacts(["Profession"], biography.profession) + freshness),
    electionHistory: Math.min(
      100,
      scoreFromFacts(["Election"], electionsCount > 0 ? "elections" : null) +
        (electionsCount > 0 ? 15 : 0) +
        freshness
    ),
    biography: Math.min(
      100,
      scoreFromFacts(
        ["Government Position", "Current Office", "Cabinet Position", "Committee"],
        biography.currentOffice || biography.currentPosition
      ) + freshness
    ),
  };

  const values = Object.values(categories).filter((v) => v > 0);
  const overall =
    values.length > 0
      ? Math.min(100, Math.round(values.reduce((a, b) => a + b, 0) / values.length))
      : 0;

  return { ...categories, overall };
};

export const computeProviderConfidence = (successfulResults) => {
  if (!successfulResults.length) return 0;
  const weighted = successfulResults.reduce((sum, result) => {
    const key = Object.keys(SOURCE_PRIORITY_WEIGHT).find((k) =>
      result.source?.name?.toLowerCase().includes(k.replace(/([A-Z])/g, " $1").trim().toLowerCase())
    );
    const weight = key ? SOURCE_PRIORITY_WEIGHT[key] : 50;
    return sum + result.confidence * (weight / 100);
  }, 0);
  return Math.min(100, Math.round(weighted / successfulResults.length));
};
