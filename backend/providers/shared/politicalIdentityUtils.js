/** Indian states and UTs used for text-based state inference. */
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
];

const STATE_ALIASES = [
  { pattern: /\bmadhya pradesh\b|#madhyapradesh\b|\bmp\s+cm\b|\bcm\s+of\s+mp\b/i, state: "Madhya Pradesh" },
  { pattern: /\buttar pradesh\b|#uttarpradesh\b|\bup\s+cm\b/i, state: "Uttar Pradesh" },
  { pattern: /\bbihar\b/i, state: "Bihar" },
  { pattern: /\bgujarat\b/i, state: "Gujarat" },
  { pattern: /\brajasthan\b/i, state: "Rajasthan" },
  { pattern: /\bwest bengal\b/i, state: "West Bengal" },
  { pattern: /\btamil nadu\b/i, state: "Tamil Nadu" },
  { pattern: /\bkarnataka\b/i, state: "Karnataka" },
  { pattern: /\bmaharashtra\b/i, state: "Maharashtra" },
  { pattern: /\bassam\b/i, state: "Assam" },
  { pattern: /\bodisha\b/i, state: "Odisha" },
  { pattern: /\bpunjab\b/i, state: "Punjab" },
  { pattern: /\bharyana\b/i, state: "Haryana" },
  { pattern: /\bjharkhand\b/i, state: "Jharkhand" },
  { pattern: /\bchhattisgarh\b/i, state: "Chhattisgarh" },
  { pattern: /\buttarakhand\b/i, state: "Uttarakhand" },
  { pattern: /\bhimachal pradesh\b/i, state: "Himachal Pradesh" },
  { pattern: /\btelangana\b/i, state: "Telangana" },
  { pattern: /\bandhra pradesh\b/i, state: "Andhra Pradesh" },
  { pattern: /\bkerala\b/i, state: "Kerala" },
];

export const stripHonorifics = (name = "") =>
  String(name)
    .replace(/^(shri|smt|dr|mr|mrs|prof|hon'ble|honble)\.?\s+/gi, "")
    .trim();

export const inferStateFromText = (text = "") => {
  if (!text || typeof text !== "string") return null;

  for (const { pattern, state } of STATE_ALIASES) {
    if (pattern.test(text)) return state;
  }

  const lower = text.toLowerCase();
  for (const state of INDIAN_STATES) {
    if (lower.includes(state.toLowerCase())) return state;
  }

  return null;
};

export const collectAccountTextSignals = (account = {}) => {
  const parts = [account.description, account.name];

  for (const video of account.recentVideos || []) {
    parts.push(video?.snippet?.description);
    parts.push(video?.snippet?.title);
    if (Array.isArray(video?.snippet?.tags)) {
      parts.push(...video.snippet.tags);
    }
  }

  return parts.filter(Boolean).join(" ");
};

const KNOWN_PARTY_GROUPS = new Set([
  "BJP",
  "Congress",
  "INC",
  "AAP",
  "TMC",
  "AITC",
  "DMK",
  "SP",
  "BSP",
  "NCP",
  "Shiv Sena",
  "JDU",
  "RJD",
  "TRS",
  "BRS",
  "YSRCP",
  "CPI",
  "CPI(M)",
  "CPM",
]);

const GENERIC_PARTY_VALUES = new Set([
  "independent",
  "unknown",
  "other",
  "unknown party",
  "general",
]);

export const normalizePartyToken = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

export const isGenericParty = (party = "") =>
  GENERIC_PARTY_VALUES.has(normalizePartyToken(party).toLowerCase());

/**
 * Resolve party from account metadata and text signals.
 */
export const resolveAccountParty = (account = {}) => {
  const accountParty = normalizePartyToken(account.party) || "Independent";
  const group = normalizePartyToken(account.group);
  const biographyParty = normalizePartyToken(account.biographyParty);
  const signalParty = inferPartyFromText(collectAccountTextSignals(account));

  if (!isGenericParty(accountParty)) {
    return { party: accountParty, corrected: false, source: "account" };
  }

  if (group && KNOWN_PARTY_GROUPS.has(group)) {
    return { party: group, corrected: true, source: "group" };
  }

  if (signalParty) {
    return { party: signalParty, corrected: true, source: "signals" };
  }

  if (biographyParty && !isGenericParty(biographyParty)) {
    return { party: biographyParty, corrected: true, source: "biography" };
  }

  return { party: accountParty, corrected: false, source: "account" };
};

export const inferPartyFromText = (text = "") => {
  if (!text) return null;
  const patterns = [
    { pattern: /\b(?:bjp|bharatiya janata party)\b/i, party: "BJP" },
    { pattern: /\b(?:congress|inc|indian national congress)\b/i, party: "Congress" },
    { pattern: /\b(?:aam aadmi party|aap)\b/i, party: "AAP" },
    { pattern: /\b(?:trinamool|aitc|tmc)\b/i, party: "TMC" },
    { pattern: /\b(?:dmk|dravida munnetra)\b/i, party: "DMK" },
    { pattern: /\b(?:samajwadi party|sp)\b/i, party: "SP" },
    { pattern: /\b(?:bahujan samaj|bsp)\b/i, party: "BSP" },
  ];

  for (const { pattern, party } of patterns) {
    if (pattern.test(text)) return party;
  }

  return null;
};

/**
 * Resolve identity for enrichment providers.
 * Prefers state inferred from channel description/tags over incorrect manual selection.
 */
export const resolveEnrichmentIdentity = (account = {}) => {
  const name = account.name?.trim() || "";
  const searchName = stripHonorifics(name) || name;
  const accountState = account.state?.trim() || "";
  const signals = collectAccountTextSignals(account);
  const inferredState = inferStateFromText(signals);
  const descriptionState = inferStateFromText(account.description || "");
  const tagOnlyState = inferStateFromText(
    collectAccountTextSignals({ ...account, description: "" })
  );
  const partyResolution = resolveAccountParty(account);

  let state = accountState || "Unknown State";
  let stateCorrected = false;
  let stateConflict = false;

  if (descriptionState && tagOnlyState && descriptionState !== tagOnlyState) {
    stateConflict = true;
  }

  if (descriptionState && descriptionState !== accountState) {
    state = descriptionState;
    stateCorrected = true;
  } else if (
    inferredState &&
    (!accountState || accountState === "Unknown State" || inferredState !== accountState)
  ) {
    state = inferredState;
    stateCorrected = inferredState !== accountState;
  }

  return {
    name,
    searchName,
    party: partyResolution.party || account.party?.trim() || "",
    state,
    accountId: account._id,
    platform: account.platform || "",
    inferredState,
    stateCorrected,
    stateConflict,
    partyCorrected: partyResolution.corrected,
    partySource: partyResolution.source,
  };
};

/**
 * Pick the best state when saving a new YouTube account.
 */
export const resolveAccountState = ({ description = "", selectedState = "Unknown State", recentVideos = [] } = {}) => {
  const signals = [description, ...recentVideos.flatMap((v) => [v?.snippet?.description, v?.snippet?.title, ...(v?.snippet?.tags || [])])]
    .filter(Boolean)
    .join(" ");
  const inferred = inferStateFromText(signals) || inferStateFromText(description);
  if (inferred) return inferred;
  return selectedState || "Unknown State";
};
