import { isVerifiedValue } from "./politicalFactEngine.js";
import { computeFactConfidence } from "./confidenceEngine.js";

const normalizeValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Semantic fields that can conflict across providers. */
const CONFLICT_FIELDS = {
  party: { types: ["Political Party"], titles: ["Political Party"] },
  constituency: { types: ["Election"], titles: ["Constituency"] },
  currentOffice: { types: ["Current Office", "Government Position"], titles: ["Current Office", "Current Position"] },
  education: { types: ["School Education", "College Education", "Degree"], titles: ["Education"] },
  profession: { types: ["Profession"], titles: ["Profession", "Prior Career"] },
  dob: { types: ["Birth"], titles: ["Date of Birth"] },
  state: { types: ["Government Position"], titles: ["State"] },
};

const matchesField = (fact, config) => {
  const types = config?.types ?? [];
  const titles = config?.titles ?? [];
  if (!types.includes(fact.type)) return false;
  if (titles.length === 0) return true;
  const title = normalizeValue(fact.title);
  return titles.some((t) => title.includes(normalizeValue(t)));
};

const scoreCandidate = (candidate, lastVerified) => {
  const sources = candidate.sources || [];
  const avgWeight =
    sources.length > 0
      ? sources.reduce((sum, s) => sum + (s.weight || 50), 0) / sources.length
      : 50;
  return computeFactConfidence(
    { ...candidate, verifiedBy: sources.map((s) => s.name), confidence: candidate.confidence || 0 },
    lastVerified
  ) + avgWeight * 0.1;
};

/**
 * Detect disagreements between trusted sources for the same semantic field.
 * Returns winning value + alternatives — never silently discards dissenting data.
 */
export const detectFieldConflicts = (rawFacts = [], lastVerified = null) => {
  const conflicts = [];
  const safeFacts = Array.isArray(rawFacts) ? rawFacts : [];

  for (const [fieldKey, config] of Object.entries(CONFLICT_FIELDS)) {
    const relevant = safeFacts.filter((f) => matchesField(f, config) && isVerifiedValue(f.value || f.title));
    if (relevant.length < 2) continue;

    const valueGroups = new Map();

    for (const fact of relevant) {
      const value = String(fact.value || fact.title).trim();
      const norm = normalizeValue(value);
      if (!norm) continue;

      if (!valueGroups.has(norm)) {
        valueGroups.set(norm, {
          value,
          sources: [],
          confidence: 0,
        });
      }

      const group = valueGroups.get(norm);
      const sourceName = fact.source;
      const groupSources = group.sources ?? [];
      if (sourceName && !groupSources.some((s) => s.name === sourceName)) {
        groupSources.push({ name: sourceName, url: fact.sourceUrl || "", weight: fact._weight || 50 });
        group.sources = groupSources;
      }
      group.confidence = Math.max(group.confidence, fact.confidence || 0);
    }

    if (valueGroups.size < 2) continue;

    const candidates = [...valueGroups.values()].sort(
      (a, b) => scoreCandidate(b, lastVerified) - scoreCandidate(a, lastVerified)
    );

    const winner = candidates[0];
    const alternatives = candidates.slice(1).map((alt) => ({
      value: alt.value,
      sources: (alt.sources ?? []).map((s) => s.name),
      confidence: Math.round(scoreCandidate(alt, lastVerified)),
    }));

    conflicts.push({
      field: fieldKey,
      value: winner.value,
      conflict: true,
      alternatives,
      verifiedBy: (winner.sources ?? []).map((s) => s.name),
      confidence: Math.round(scoreCandidate(winner, lastVerified)),
      lastVerified: lastVerified ? new Date(lastVerified).toISOString().slice(0, 10) : null,
    });
  }

  return conflicts;
};

/**
 * Apply conflict resolutions to verified facts and field provenance.
 */
export const applyConflictsToProfile = (verifiedFacts = [], fieldProvenance = {}, conflicts = []) => {
  const safeFacts = Array.isArray(verifiedFacts) ? verifiedFacts : [];
  const safeConflicts = Array.isArray(conflicts) ? conflicts : [];
  const conflictByField = Object.fromEntries(safeConflicts.map((c) => [c.field, c]));
  const updatedFacts = safeFacts.map((fact) => {
    const conflict = conflictByField[fact.key];
    if (!conflict) return { ...fact, alternatives: fact.alternatives ?? [], verifiedBy: fact.verifiedBy ?? [] };
    return {
      ...fact,
      value: conflict.value,
      conflict: true,
      alternatives: conflict.alternatives ?? [],
      confidence: conflict.confidence,
      verifiedBy: conflict.verifiedBy ?? [],
    };
  });

  const updatedProvenance = { ...(fieldProvenance ?? {}) };
  for (const conflict of safeConflicts) {
    updatedProvenance[conflict.field] = {
      value: conflict.value,
      confidence: conflict.confidence,
      verifiedBy: conflict.verifiedBy ?? [],
      conflict: true,
      alternatives: conflict.alternatives ?? [],
      lastVerified: conflict.lastVerified,
      verificationCount: (conflict.verifiedBy ?? []).length,
    };
  }

  return { verifiedFacts: updatedFacts, fieldProvenance: updatedProvenance, fieldConflicts: safeConflicts };
};
