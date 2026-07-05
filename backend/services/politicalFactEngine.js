import crypto from "crypto";
import { SOURCE_PRIORITY_WEIGHT } from "../providers/shared/factTypes.js";
import { isPresent, pickFirst, parseAgeFromBirthDate } from "../providers/normalizedProfile.js";
import { computeFactConfidence } from "./confidenceEngine.js";

const PLACEHOLDER_PATTERN = /^(n\/a|na|unknown|—|-|–|\.+|not available|none|null|undefined|tbd|pending)$/i;

export const isVerifiedValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (PLACEHOLDER_PATTERN.test(trimmed)) return false;
    return true;
  }
  if (Array.isArray(value)) return value.some((entry) => isVerifiedValue(entry));
  return true;
};

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const factDedupeKey = (fact) =>
  `${fact.type}:${normalizeKey(fact.value || fact.title)}:${fact.year || ""}`;

const sourceWeight = (sourceName) => {
  const normalized = normalizeKey(sourceName);
  for (const [key, weight] of Object.entries(SOURCE_PRIORITY_WEIGHT)) {
    const display = normalizeKey(key);
    if (normalized.includes(display) || display.includes(normalized)) return weight;
  }
  if (normalized.includes("myneta") || normalized.includes("election")) return 88;
  if (normalized.includes("lok sabha") || normalized.includes("sansad")) return 100;
  if (normalized.includes("rajya sabha")) return 95;
  if (normalized.includes("wikipedia")) return 70;
  return 50;
};

const titlesOf = (mapping) => mapping?.titles ?? [];
const typesOf = (mapping) => mapping?.types ?? [];

/**
 * Merge facts from all providers — deduplicate, aggregate provenance, keep highest confidence.
 */
export const mergeFacts = (factSets) => {
  const merged = new Map();

  for (const { facts = [], providerKey } of factSets ?? []) {
    for (const fact of facts) {
      if (!fact?.type || !isVerifiedValue(fact.value || fact.title)) continue;

      const key = factDedupeKey(fact);
      const existing = merged.get(key);
      const weight = SOURCE_PRIORITY_WEIGHT[providerKey] || sourceWeight(fact.source);

      if (!existing) {
        merged.set(key, {
          ...fact,
          verifiedBy: [fact.source].filter(Boolean),
          sourceWeights: [weight],
        });
        continue;
      }

      const verifiedBy = existing.verifiedBy ?? [];
      if (!verifiedBy.includes(fact.source) && fact.source) {
        verifiedBy.push(fact.source);
        existing.verifiedBy = verifiedBy;
        (existing.sourceWeights ??= []).push(weight);
      }

      const newConfidence = Math.max(existing.confidence || 0, fact.confidence || 0);
      const verificationBoost = Math.min((existing.verifiedBy ?? []).length * 8, 24);
      existing.confidence = Math.min(100, newConfidence + verificationBoost);

      if ((fact.confidence || 0) > (existing.confidence || 0) - verificationBoost) {
        if (isPresent(fact.year) && !isPresent(existing.year)) existing.year = fact.year;
        if (isPresent(fact.date) && !isPresent(existing.date)) existing.date = fact.date;
        if (isPresent(fact.sourceUrl) && !isPresent(existing.sourceUrl)) {
          existing.sourceUrl = fact.sourceUrl;
        }
      }
    }
  }

  return Array.from(merged.values());
};

const FIELD_FACT_MAP = {
  legalName: { types: [], titles: [] },
  fullName: { types: [], titles: [] },
  dob: { types: ["Birth"], titles: ["Date of Birth"] },
  birthPlace: { types: ["Birth Place"], titles: ["Birth Place"] },
  age: { types: ["Birth"], titles: [] },
  gender: { types: ["Birth"], titles: ["Gender"] },
  education: { types: ["School Education", "College Education", "Degree"], titles: ["Education"] },
  profession: { types: ["Profession"], titles: ["Profession"] },
  priorCareer: { types: ["Profession"], titles: ["Prior Career"] },
  party: { types: ["Political Party"], titles: ["Political Party"] },
  joinedParty: { types: ["Party Join"], titles: ["Joined Political Party"] },
  constituency: { types: ["Election"], titles: ["Constituency"] },
  state: { types: ["Government Position"], titles: ["State"] },
  currentOffice: { types: ["Current Office"], titles: ["Current Office"] },
  currentPosition: { types: ["Government Position"], titles: ["Current Position"] },
  wikipediaLink: { types: ["Social Milestone"], titles: ["Wikipedia"] },
  officialWebsite: { types: ["Social Milestone"], titles: ["Official Website"] },
};

const pickFactValue = (facts, fieldKey) => {
  const mapping = FIELD_FACT_MAP[fieldKey];
  if (!mapping) return null;

  const safeFacts = Array.isArray(facts) ? facts : [];
  const titles = titlesOf(mapping);
  const types = typesOf(mapping);

  const matches = safeFacts.filter((f) => {
    if (types.includes(f.type)) {
      if (titles.length === 0) return true;
      return titles.some((t) => normalizeKey(f.title).includes(normalizeKey(t)));
    }
    if (titles.length === 0) return false;
    return titles.some((t) => normalizeKey(f.title).includes(normalizeKey(t)));
  });

  if (matches.length === 0) return null;
  const best = matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  return best.value || best.title;
};

const buildFieldProvenance = (facts, fieldKey) => {
  const mapping = FIELD_FACT_MAP[fieldKey];
  if (!mapping) return null;

  const safeFacts = Array.isArray(facts) ? facts : [];
  const titles = titlesOf(mapping);
  const types = typesOf(mapping);

  const matches = safeFacts.filter((f) => {
    if (types.includes(f.type)) {
      if (titles.length === 0) return true;
      return titles.some((t) => normalizeKey(f.title).includes(normalizeKey(t)));
    }
    if (titles.length === 0) return false;
    return titles.some((t) => normalizeKey(f.title).includes(normalizeKey(t)));
  });

  if (matches.length === 0) return null;

  const verifiedBy = [...new Set(matches.flatMap((f) => f.verifiedBy || [f.source]).filter(Boolean))];
  const confidence = Math.min(
    100,
    Math.round(matches.reduce((sum, f) => sum + (f.confidence || 0), 0) / matches.length)
  );

  return {
    value: pickFactValue(facts, fieldKey),
    confidence,
    verifiedBy,
    lastVerified: new Date().toISOString().slice(0, 10),
    verificationCount: verifiedBy.length,
  };
};

/**
 * Flatten provider facts for conflict detection (pre-merge).
 */
export const flattenProviderFacts = (factSets) => {
  const raw = [];
  for (const { facts = [], providerKey } of factSets ?? []) {
    const weight = SOURCE_PRIORITY_WEIGHT[providerKey] || 50;
    for (const fact of facts) {
      raw.push({ ...fact, _weight: weight, _providerKey: providerKey });
    }
  }
  return raw;
};

/**
 * Assemble biography and verified facts from merged fact set.
 */
export const assembleProfileFromFacts = (facts, identity = {}, lastVerified = null) => {
  const safeFacts = Array.isArray(facts) ? facts : [];
  const educationFacts = safeFacts.filter((f) =>
    ["School Education", "College Education", "Degree"].includes(f.type)
  );
  const education = educationFacts.map((f) => f.value).join("; ") || null;

  const dob = pickFactValue(safeFacts, "dob");
  const age = parseAgeFromBirthDate(dob);

  const biography = {
    fullName: pickFirst(pickFactValue(safeFacts, "fullName"), identity.name) || null,
    dob,
    age: age ?? null,
    gender: pickFactValue(safeFacts, "gender"),
    state: pickFirst(pickFactValue(safeFacts, "state"), identity.state) || null,
    constituency: pickFactValue(safeFacts, "constituency"),
    party: pickFirst(pickFactValue(safeFacts, "party"), identity.party) || null,
    currentPosition: pickFactValue(safeFacts, "currentPosition"),
    previousPositions: safeFacts
      .filter((f) => f.type === "Government Position" && f.title === "Political Position")
      .map((f) => f.value)
      .filter(isVerifiedValue),
    currentOffice: pickFactValue(safeFacts, "currentOffice"),
    dateJoinedParty: pickFactValue(safeFacts, "joinedParty"),
    dateFirstElected: null,
    yearsInOffice: null,
    education: isVerifiedValue(education) ? education : null,
    profession: pickFactValue(safeFacts, "profession"),
    officialWebsite: pickFactValue(safeFacts, "officialWebsite"),
    wikipediaLink: pickFactValue(safeFacts, "wikipediaLink"),
    socialLinks: {
      youtube: "",
      twitter: "",
      facebook: "",
      instagram: "",
    },
  };

  const birthPlace = pickFactValue(safeFacts, "birthPlace");
  const priorCareer = pickFactValue(safeFacts, "priorCareer");

  const verifiedFacts = [];

  const addVerifiedFact = (key, label, value, provenanceKey) => {
    if (!isVerifiedValue(value)) return;
    const prov = buildFieldProvenance(safeFacts, provenanceKey || key);
    const mapping = FIELD_FACT_MAP[provenanceKey || key];
    const matchingFacts = mapping
      ? safeFacts.filter((f) => typesOf(mapping).includes(f.type))
      : [];
    const factConfidence =
      matchingFacts.length > 0
        ? Math.max(...matchingFacts.map((f) => computeFactConfidence(f, lastVerified)))
        : prov?.confidence ?? 0;

    verifiedFacts.push({
      key,
      label,
      value: String(value),
      confidence: factConfidence,
      verifiedBy: prov?.verifiedBy ?? [],
      lastVerified: prov?.lastVerified ?? (lastVerified ? new Date(lastVerified).toISOString().slice(0, 10) : null),
      conflict: false,
      alternatives: [],
    });
  };

  addVerifiedFact("legalName", "Legal Name", biography.fullName, "fullName");
  addVerifiedFact("knownAs", "Known As", identity.name !== biography.fullName ? identity.name : null);
  addVerifiedFact("dob", "Date of Birth", biography.dob, "dob");
  addVerifiedFact("birthPlace", "Birth Place", birthPlace, "birthPlace");
  if (biography.age) addVerifiedFact("age", "Age", `${biography.age} years`, "age");
  addVerifiedFact("gender", "Gender", biography.gender, "gender");
  addVerifiedFact("education", "Education", biography.education, "education");
  addVerifiedFact("profession", "Profession", biography.profession, "profession");
  addVerifiedFact("priorCareer", "Prior Career", priorCareer, "priorCareer");
  addVerifiedFact("party", "Political Party", biography.party, "party");
  addVerifiedFact("joinedParty", "Joined Party", biography.dateJoinedParty, "joinedParty");
  addVerifiedFact("currentOffice", "Current Office", biography.currentOffice || biography.currentPosition, "currentOffice");
  addVerifiedFact("currentPosition", "Current Position", biography.currentPosition, "currentPosition");
  addVerifiedFact("constituency", "Constituency", biography.constituency, "constituency");
  addVerifiedFact("state", "State", biography.state, "state");

  const parliamentHouse = safeFacts.find(
    (f) => f.type === "Parliament Membership" || /lok sabha|rajya sabha|parliament/i.test(f.value || "")
  );
  if (parliamentHouse) {
    addVerifiedFact("parliamentHouse", "Parliament House", parliamentHouse.value);
  }

  const assembly = safeFacts.find((f) => f.type === "Assembly Membership");
  if (assembly) addVerifiedFact("assembly", "Assembly", assembly.value);

  addVerifiedFact("officialWebsite", "Official Website", biography.officialWebsite, "officialWebsite");
  addVerifiedFact("wikipedia", "Wikipedia", biography.wikipediaLink, "wikipediaLink");

  const fieldProvenance = {};
  for (const key of Object.keys(FIELD_FACT_MAP)) {
    const prov = buildFieldProvenance(safeFacts, key);
    if (prov?.value) fieldProvenance[key] = prov;
  }

  return { biography, verifiedFacts, fieldProvenance };
};

export const generateFactId = (event) =>
  crypto
    .createHash("sha256")
    .update(`${event.year}:${event.category}:${event.title}`)
    .digest("hex")
    .slice(0, 12);
