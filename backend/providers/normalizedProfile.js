/**
 * Canonical empty shape returned by every political profile provider.
 */
export const createEmptyNormalizedProfile = () => ({
  legalName: null,
  dateOfBirth: null,
  age: null,
  gender: null,
  constituency: null,
  currentOffice: null,
  currentPosition: null,
  education: null,
  profession: null,
  priorCareer: null,
  joinedParty: null,
  party: null,
  state: null,
  biography: null,
  previousPositions: [],
  timeline: [],
  elections: [],
  facts: [],
  wikipediaLink: null,
  officialWebsite: null,
  sources: [],
});

export const isPresent = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const pickFirst = (...values) => {
  for (const value of values) {
    if (isPresent(value)) return value;
  }
  return null;
};

export const normalizeWhitespace = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/\s+/g, " ").trim();
};

export const parseAgeFromBirthDate = (dateOfBirth) => {
  if (!dateOfBirth) return null;

  const yearMatch = String(dateOfBirth).match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;

  const birthYear = Number(yearMatch[0]);
  const age = new Date().getFullYear() - birthYear;
  return age > 0 && age < 120 ? age : null;
};

export const addSource = (profile, source) => {
  if (!source?.name) return;
  if (!Array.isArray(profile.sources)) profile.sources = [];
  const exists = (profile.sources ?? []).some(
    (entry) => entry.name === source.name && entry.url === (source.url || "")
  );
  if (!exists) {
    profile.sources.push({
      name: source.name,
      url: source.url || "",
      fetchedAt: source.fetchedAt || new Date().toISOString(),
    });
  }
};
