import { isPresent } from "../providers/normalizedProfile.js";
import { FACT_TYPE_TO_TIMELINE_CATEGORY } from "../providers/shared/factTypes.js";
import { generateFactId, isVerifiedValue } from "./politicalFactEngine.js";

export const TIMELINE_CATEGORIES = [
  "birth",
  "school",
  "college",
  "earlyCareer",
  "joinedParty",
  "election",
  "position",
  "cabinetCommittee",
  "currentOffice",
];

const SCHOOL_PATTERN = /\b(school|ssc|matric|matriculation|secondary|high school|10th|12th|intermediate|h\.?s\.?c|s\.?s\.?c)\b/i;
const COLLEGE_PATTERN = /\b(university|college|iit|iim|mba|ph\.?d|b\.?a\.?|b\.?s\.?c|m\.?a\.?|m\.?s\.?c|degree|alma mater|graduate|b\.?tech|m\.?tech|llb|llm|md|mbbs|b\.?com|m\.?com)\b/i;

const MAJOR_ROLE_PATTERN =
  /\b(chief minister|prime minister|governor|minister|cabinet|mla|mp|member of parliament|lok sabha|mayor|speaker|deputy speaker)\b/i;

const SOURCE_MATCHERS = [
  { keys: ["myneta", "election commission", "eci"], label: "Election Commission / MyNeta" },
  { keys: ["lok sabha", "sansad"], label: "Lok Sabha (Sansad.in)" },
  { keys: ["rajya sabha"], label: "Rajya Sabha" },
  { keys: ["state assembly", "assembly"], label: "State Assembly" },
  { keys: ["wikipedia"], label: "Wikipedia" },
  { keys: ["party"], label: "Official Party Website" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const extractYear = (text) => {
  if (!isVerifiedValue(text)) return null;
  const match = String(text).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Strip Wikipedia-style tenure annotations from party labels and drop
 * affiliations that could not yet apply in the event year.
 *
 * Examples:
 *   "BJP (2015–present)" + eventYear 2001 → ""  (anachronistic)
 *   "BJP (2015–present)" + eventYear 2016 → "BJP"
 *   "Indian National Congress (1991–2015)" + 2001 → "Indian National Congress"
 *   "Bharatiya Janata Party (–present)" → "Bharatiya Janata Party"
 */
export function cleanPartyLabel(party = "", eventYear = null) {
  let p = String(party || "").trim();
  if (!p) return "";

  // Capture tenure start/end before stripping
  // (2015–present), (2015-present), (2015—2024), (since 2015), (–present)
  const tenureRe =
    /\(\s*(?:since\s+)?(\d{4})?\s*[–\-—to]{1,3}\s*(?:present|now|\d{4})?\s*\)|\(\s*since\s+(\d{4})\s*\)/i;
  const tenureMatch = p.match(tenureRe);
  let tenureStart = null;
  let tenureEnd = null;
  if (tenureMatch) {
    tenureStart = tenureMatch[1] || tenureMatch[2] ? Number(tenureMatch[1] || tenureMatch[2]) : null;
    const endRaw = tenureMatch[0].match(/[–\-—to]{1,3}\s*(\d{4}|present|now)\s*\)/i)?.[1];
    if (endRaw && /^\d{4}$/.test(endRaw)) tenureEnd = Number(endRaw);
  }

  // Always remove tenure / date-range parentheticals from the display name
  p = p
    .replace(/\(\s*(?:since\s+)?\d{0,4}\s*[–\-—to]{1,3}\s*(?:present|now|\d{4})?\s*\)/gi, "")
    .replace(/\(\s*since\s+\d{4}\s*\)/gi, "")
    .replace(/\(\s*[–\-—]+\s*(?:present|now)?\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*$/g, "")
    .trim();

  if (!p) return "";

  const y = eventYear != null ? Number(String(eventYear).replace(/[^\d]/g, "").slice(0, 4)) : null;
  if (y && Number.isFinite(y)) {
    // Current-affiliation annotation that starts after this event → do not show
    if (tenureStart != null && y < tenureStart) return "";
    // Historical tenure that ended before this event → do not show
    if (tenureEnd != null && y > tenureEnd) return "";
  }

  return p;
}

/** Clean "Party: …" segments inside timeline descriptions. */
export function cleanPartyInText(text = "", eventYear = null) {
  let d = String(text || "");
  if (!d) return "";

  d = d.replace(/\bParty:\s*([^·|\n]+)/gi, (_, rawParty) => {
    const cleaned = cleanPartyLabel(rawParty, eventYear);
    return cleaned ? `Party: ${cleaned}` : "";
  });

  // Orphan tenure leftovers after year-stripping: "(–present)", "(-present)"
  d = d
    .replace(/\(\s*[–\-—]+\s*(?:present|now)?\s*\)/gi, "")
    .replace(/\(\s*present\s*\)/gi, "")
    .replace(/\s*·\s*·+/g, " · ")
    .replace(/^\s*·\s*/g, "")
    .replace(/\s*·\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return d;
}

const eventText = (event) =>
  normalizeText([event?.title, event?.description, event?.value].filter(Boolean).join(" "));


/** Convert ISO / messy DOB strings into a single readable date (e.g. "25 March 1965"). */
export function formatReadableDate(value) {
  if (!isVerifiedValue(value)) return "";
  let s = String(value).trim();

  const iso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const month = MONTH_NAMES[Number(iso[2]) - 1];
    if (month) return `${Number(iso[3])} ${month} ${iso[1]}`;
  }

  const readable = s.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);
  if (readable) {
    const monthRaw = readable[2];
    const monthIdx = MONTH_NAMES.findIndex(
      (m) => m.toLowerCase().startsWith(monthRaw.slice(0, 3).toLowerCase())
    );
    const month = monthIdx >= 0 ? MONTH_NAMES[monthIdx] : monthRaw;
    return `${Number(readable[1])} ${month} ${readable[3]}`;
  }

  // Fix mangled leftovers from stripping a year out of ISO dates: "(-03-25)" / "-03-25"
  s = s
    .replace(/\(\s*-?\d{2}-\d{2}\s*\)/g, " ")
    .replace(/(^|[\s·|,;])-\d{2}-\d{2}(?=[\s·|,;]|$)/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

/**
 * Build a single clean birth description: date line + place, no repeats.
 * Hard-capped to at most two lines. Strips Wikipedia name/age dumps.
 */
export function cleanBirthDescription(description = "", { year = null, place = "", name = "" } = {}) {
  let blob = String(description || "").trim();
  if (place && isVerifiedValue(place)) {
    blob = blob ? `${blob} · ${place}` : String(place);
  }
  if (!blob) return "";

  const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalizePlaceLine = (value = "") => {
    const parts = String(value || "")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,]+|[\s,]+$/g, "")
      .trim()
      .split(/\s*,\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    const unique = [];
    for (const part of parts) {
      const norm = normalizeText(part);
      if (!norm || unique.some((u) => normalizeText(u) === norm)) continue;
      unique.push(part);
    }
    return unique.join(", ");
  };

  blob = blob.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (m) => formatReadableDate(m));

  // Strip person name so bio dumps don't leak into the card
  if (name && isVerifiedValue(name)) {
    const full = String(name).trim();
    blob = blob.replace(new RegExp(escapeRegExp(full), "gi"), " ");
    for (const part of full.split(/\s+/).filter((p) => p.length > 2)) {
      blob = blob.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi"), " ");
    }
  } else {
    // Strip leading "First Last" before a date/paren on the same line only
    // (do not cross newlines — that would eat "India" before the next "Name (")
    blob = blob.replace(/\b[A-Z][a-z]+(?:[ \t]+[A-Z][a-z.]+){1,3}[ \t]*(?=\(|\d{1,2}\s)/g, " ");
  }

  blob = blob
    .replace(/\(\s*age\s*\d{1,3}\s*\)/gi, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\(\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*\)/gi, " ")
    .replace(/\b(born|birth|date of birth|dob)\b/gi, " ");

  let dateLine = "";
  const dateMatch = blob.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (dateMatch) {
    dateLine = formatReadableDate(dateMatch[0]);
  } else if (year) {
    const partial = blob.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\b/);
    if (partial) dateLine = formatReadableDate(`${partial[1]} ${partial[2]} ${year}`);
  }

  // Remove every date echo before place extraction
  if (dateLine) {
    const dm = dateLine.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (dm) {
      blob = blob.replace(
        new RegExp(`\\b${escapeRegExp(dm[1])}\\s+${escapeRegExp(dm[2])}\\s+${escapeRegExp(dm[3])}\\b`, "gi"),
        " "
      );
      blob = blob.replace(
        new RegExp(`\\b${escapeRegExp(dm[1])}\\s+${escapeRegExp(dm[2])}\\b`, "gi"),
        " "
      );
    }
  }
  blob = blob
    .replace(/\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/gi, " ")
    .replace(/\(\s*age\s*\d{1,3}\s*\)/gi, " ")
    .replace(/\(\s*\)/g, " ");
  if (year) blob = blob.replace(new RegExp(`\\b${escapeRegExp(String(year))}\\b`, "g"), " ");

  let placeLine = place && isVerifiedValue(place) ? normalizePlaceLine(place) : "";
  if (!placeLine) {
    const threePart = [
      ...blob.matchAll(
        /\b([A-Za-z][A-Za-z .'-]*\s*,\s*[A-Za-z][A-Za-z .'-]*\s*,\s*[A-Za-z][A-Za-z .'-]*)\b/g
      ),
    ].map((m) => normalizePlaceLine(m[1]));
    const twoPart = [
      ...blob.matchAll(/\b([A-Za-z][A-Za-z .'-]*\s*,\s*[A-Za-z][A-Za-z .'-]*)\b/g),
    ].map((m) => normalizePlaceLine(m[1]));
    placeLine =
      threePart.find((p) => /,\s*India$/i.test(p)) ||
      threePart[0] ||
      twoPart.find((p) => /,\s*(Haryana|India|[A-Z][a-z]+)$/i.test(p) && p.split(",").length === 2) ||
      twoPart[0] ||
      "";
  }

  if (placeLine && (/\bage\b/i.test(placeLine) || (name && normalizeText(placeLine).includes(normalizeText(name))))) {
    placeLine = "";
  }

  // Hard cap: date + place only
  return [dateLine, placeLine].filter(Boolean).join("\n");
}

const resolveSource = (sources = [], preferredKeys = []) => {
  const safeSources = Array.isArray(sources) ? sources : [];
  for (const preferred of preferredKeys) {
    const match = safeSources.find((source) =>
      normalizeText(source.name).includes(normalizeText(preferred))
    );
    if (match) return { name: match.name, url: match.url || "", confidence: match.confidence ?? 0 };
  }
  for (const matcher of SOURCE_MATCHERS) {
    const match = safeSources.find((source) =>
      (matcher.keys ?? []).some((key) => normalizeText(source.name).includes(key))
    );
    if (match) return { name: match.name, url: match.url || "", confidence: match.confidence ?? 0 };
  }
  const first = safeSources.find((source) => isVerifiedValue(source.name));
  return first
    ? { name: first.name, url: first.url || "", confidence: first.confidence ?? 0 }
    : { name: "Verified Public Records", url: "", confidence: 0 };
};

const createEvent = ({
  year,
  title,
  description,
  source,
  category,
  id,
  date,
  verifiedBy,
  confidence,
  election,
}) => ({
  year: year != null ? String(year) : null,
  category,
  title,
  description: description || "",
  source: typeof source === "string" ? source : source?.name || "",
  sourceUrl: typeof source === "string" ? "" : source?.url || "",
  confidence: confidence ?? (typeof source === "object" ? source?.confidence ?? 0 : 0),
  verifiedBy: Array.isArray(verifiedBy) ? verifiedBy : [],
  date: date || null,
  id,
  election: election || null,
});

const isBirthEvent = (event) =>
  event.category === "birth" || /\b(born|birth|date of birth|dob)\b/.test(eventText(event));

const isPartyEvent = (event) =>
  event.category === "joinedParty" ||
  /\b(joined|affiliated|party join|party affiliation)\b/.test(eventText(event));

const isEducationEvent = (event) =>
  event.category === "school" || event.category === "college";

const isCurrentOfficeEvent = (event) =>
  event.category === "currentOffice" ||
  /\b(current office|current position|incumbent)\b/.test(eventText(event));

const isMajorAppointment = (event) => {
  if (isBirthEvent(event) || isEducationEvent(event) || isPartyEvent(event) || event.category === "election") {
    return false;
  }
  if (event.category === "cabinetCommittee" && /\bcommittee\b/i.test(eventText(event))) return false;
  if (["position", "cabinetCommittee"].includes(event.category)) {
    return MAJOR_ROLE_PATTERN.test(eventText(event));
  }
  return false;
};

const parseElectionResult = (position = "") => {
  const text = String(position).toLowerCase();
  if (/winner|won|elected|re-?elected/.test(text)) return "Won";
  if (/lost|defeated|runner/.test(text)) return "Lost";
  return "Contested";
};

const buildElectionCard = (row, source) => {
  const year = row.year ? String(row.year) : null;
  if (!year) return null;

  const result = parseElectionResult(row.position);
  const party = cleanPartyLabel(row.party || "", year) || null;
  const type = normalizeElectionTypeLabel(row.election || "Election");
  const election = {
    year,
    type,
    constituency: row.constituency || null,
    party,
    result,
    margin: row.margin != null && row.margin > 0 ? Number(row.margin) : null,
    voteShare: row.votePct != null && row.votePct > 0 ? Number(row.votePct) : null,
  };

  const details = [
    election.constituency ? `Constituency: ${election.constituency}` : null,
    election.party ? `Party: ${election.party}` : null,
    election.margin != null ? `Margin: +${election.margin.toLocaleString()}` : null,
    election.voteShare != null ? `Vote share: ${election.voteShare}%` : null,
  ].filter(Boolean);

  return createEvent({
    year,
    title: election.type,
    description: details.join(" · "),
    source,
    category: "election",
    election,
  });
};

const splitEducation = (education) => {
  if (!isVerifiedValue(education)) return null;
  const text = String(education).trim();
  const segments = text.split(/[;|•\n]+/).map((s) => s.trim()).filter(Boolean);
  const school = segments.find((s) => SCHOOL_PATTERN.test(s)) || null;
  const college = segments.find((s) => COLLEGE_PATTERN.test(s)) || null;
  const merged = [school, college].filter(Boolean).join(" · ") || text;
  const year = extractYear(text) || extractYear(college) || extractYear(school);
  if (!year) return null;
  return { text: merged, year };
};

const pickBestEvent = (current, candidate) => {
  if (!current) return candidate;
  const score = (e) => (e.confidence ?? 0) * 10 + String(e.description || "").length;
  return score(candidate) > score(current) ? candidate : current;
};

const mergeBirthEvents = (current, candidate) => {
  if (!current) return candidate;
  const best = pickBestEvent(current, candidate);
  const other = best === current ? candidate : current;
  const description = cleanBirthDescription(
    [best.description, other.description].filter(Boolean).join(" · "),
    { year: best.year }
  );
  return {
    ...best,
    title: "Birth",
    category: "birth",
    description,
    verifiedBy: [
      ...new Set([...(best.verifiedBy || []), ...(other.verifiedBy || []), best.source, other.source].filter(Boolean)),
    ],
    confidence: Math.max(best.confidence ?? 0, other.confidence ?? 0),
    source: best.source || other.source,
    sourceUrl: best.sourceUrl || other.sourceUrl,
  };
};

export const normalizeTimelineEvent = (event) => {
  if (!event) return null;
  let { category, title, description } = event;
  description = String(description || event.value || title || "").trim();
  title = String(title || "").trim();

  if (isBirthEvent(event)) {
    return createEvent({ ...event, category: "birth", title: "Birth", description });
  }
  if (isPartyEvent(event)) {
    const blob = `${title} ${description}`;
    const joined = blob.match(/\bjoined\s+(.+?)(?:\s+in\s+\d{4})?$/i)?.[1]?.trim();
    const smartTitle = /^joined\b/i.test(title)
      ? title
      : joined
        ? `Joined ${joined.replace(/^the\s+/i, "")}`
        : title && !/party entry|affiliated|political party/i.test(title)
          ? title
          : "Party Entry";
    return createEvent({
      ...event,
      category: "joinedParty",
      title: smartTitle,
      description: normalizeText(description) === normalizeText(smartTitle) ? "" : description,
    });
  }
  if (isEducationEvent(event)) {
    return createEvent({ ...event, category: "college", title: "Education", description });
  }
  if (isCurrentOfficeEvent(event)) {
    return createEvent({ ...event, category: "currentOffice", title: title || "Current Position", description });
  }
  return createEvent({ ...event, category, title, description });
};

export const mergeDuplicateTimelineEvents = (events = []) => {
  let birth = null;
  let education = null;
  let party = null;
  let currentOffice = null;
  const elections = [];
  const appointments = [];

  for (const raw of events) {
    const event = normalizeTimelineEvent(raw);
    if (!event?.year) continue;

    if (isBirthEvent(event)) {
      birth = mergeBirthEvents(birth, event);
    } else if (isEducationEvent(event)) {
      education = pickBestEvent(education, event);
    } else if (isPartyEvent(event)) {
      party = pickBestEvent(party, event);
    } else if (isCurrentOfficeEvent(event)) {
      currentOffice = pickBestEvent(currentOffice, event);
    } else if (event.category === "election" || isElectionLikeEvent(event)) {
      elections.push({ ...event, category: "election" });
    } else if (isMajorAppointment(event)) {
      appointments.push(event);
    }
  }

  return { birth, education, party, currentOffice, elections, appointments, other: [] };
};

/**
 * Normalize assembly / parliamentary election labels so provider variants collapse.
 * "Madhya Pradesh Legislative Assembly — Elected MLA" → same family as
 * "Madhya Pradesh Legislative Assembly".
 */
export const normalizeElectionFamily = (text = "") => {
  const t = normalizeText(text);
  if (!t) return "election";
  if (/\blok sabha\b|\bmember of parliament\b|\bmp\b/.test(t) && !/\bmla\b/.test(t)) {
    return "lok-sabha";
  }
  if (/\brajya sabha\b/.test(t)) return "rajya-sabha";
  if (
    /\blegislative assembly\b|\bvidhan sabha\b|\bassembly election\b|\bmla\b|\bassembly\b/.test(t)
  ) {
    return "assembly";
  }
  if (/\blok sabha\b|\bgeneral election\b/.test(t)) return "lok-sabha";
  return t
    .replace(/\b(elected|re elected|won|winner|mla|mp|constituency|party)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "election";
};

export const normalizeConstituencyKey = (text = "") =>
  normalizeText(text)
    .replace(/\b(assembly|constituency|sc|st|gen|general|reserved)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const electionMilestoneKey = (event) => {
  const year = String(event?.year || "");
  const family = normalizeElectionFamily(
    [
      event?.election?.type,
      event?.title,
      event?.description,
      event?.election?.constituency,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const constituency = normalizeConstituencyKey(
    event?.election?.constituency ||
      String(event?.description || "").match(/constituency[:\s]+([^·|]+)/i)?.[1] ||
      ""
  );
  const party = normalizeText(event?.election?.party || "");
  return `${year}|${family}|${constituency}|${party}`;
};

const isElectionLikeEvent = (event) => {
  if (!event) return false;
  if (event.category === "election") return true;
  const text = eventText(event);
  if (/\b(chief minister|prime minister|cabinet minister|minister of|governor|union minister)\b/i.test(text)) {
    // Office appointment — not an election card (unless explicitly election category)
    return false;
  }
  return /\b(elected|re-?elected|mla|mp\b|member of (the )?legislative|legislative assembly|vidhan sabha|assembly election|won (the )?seat|lok sabha|rajya sabha|contested|general election)\b/i.test(
    text
  );
};

const normalizeRoleFamily = (event) => {
  const text = eventText(event);
  if (/\bchief minister\b/.test(text)) return "chief-minister";
  if (/\bprime minister\b/.test(text)) return "prime-minister";
  if (/\bunion minister\b/.test(text)) return "union-minister";
  if (/\bcabinet minister\b/.test(text)) return "cabinet-minister";
  if (/\bminister\b/.test(text)) return "minister";
  if (/\bgovernor\b/.test(text)) return "governor";
  if (/\bmla\b|legislative assembly|vidhan sabha/.test(text)) return "mla-seat";
  if (/\bmp\b|lok sabha|member of parliament/.test(text)) return "mp-seat";
  return normalizeText(event?.title || text).slice(0, 48) || "role";
};

/** Identity key for semantic milestone collapse (same year + same office/election/role). */
export const semanticMilestoneKey = (event) => {
  if (!event) return "";
  const year = String(event.year || "");
  if (isBirthEvent(event)) return `${year}|birth`;
  if (isEducationEvent(event)) return `${year}|education`;
  if (isPartyEvent(event)) return `${year}|party`;
  if (event.category === "election" || isElectionLikeEvent(event)) {
    const family = normalizeElectionFamily(
      [event?.election?.type, event?.title, event?.description].filter(Boolean).join(" ")
    );
    const constituency = normalizeConstituencyKey(
      event?.election?.constituency ||
        String(event?.description || "").match(/constituency[:\s]+([^·|\n]+)/i)?.[1] ||
        ""
    );
    return `${year}|election|${family}|${constituency}`;
  }
  if (isCurrentOfficeEvent(event) || isMajorAppointment(event) || event.category === "position") {
    return `${year}|role|${normalizeRoleFamily(event)}`;
  }
  return `${year}|other|${normalizeText(event.title).slice(0, 48)}`;
};

const toElectionEvent = (event, sourceFallback) => {
  if (event.category === "election" && event.election) return event;
  const result = parseElectionResult(`${event.title} ${event.description}`);
  const constituency =
    event.election?.constituency ||
    String(event.description || "").match(/constituency[:\s]+([^·|]+)/i)?.[1]?.trim() ||
    null;
  const party =
    event.election?.party ||
    String(event.description || "").match(/party[:\s]+([^·|]+)/i)?.[1]?.trim() ||
    null;
  return createEvent({
    ...event,
    category: "election",
    title: event.title,
    description: event.description,
    source: event.source || sourceFallback,
    election: {
      year: String(event.year),
      type: event.election?.type || event.title || "Election",
      constituency,
      party,
      result,
      margin: event.election?.margin ?? null,
      voteShare: event.election?.voteShare ?? null,
    },
  });
};

const mergeTwoEvents = (current, candidate) => {
  if (!current) return candidate;
  const best = pickBestEvent(current, candidate);
  const other = best === current ? candidate : current;
  const election = {
    ...(other.election || {}),
    ...(best.election || {}),
  };
  // Prefer non-null richer fields
  for (const key of ["constituency", "party", "type", "result"]) {
    if (!election[key] && other.election?.[key]) election[key] = other.election[key];
  }
  for (const key of ["margin", "voteShare"]) {
    if ((election[key] == null || election[key] === 0) && other.election?.[key]) {
      election[key] = other.election[key];
    }
  }
  const verifiedBy = [
    ...new Set(
      [
        ...(best.verifiedBy || []),
        ...(other.verifiedBy || []),
        best.source,
        other.source,
      ].filter(Boolean)
    ),
  ];
  const description =
    String(best.description || "").length >= String(other.description || "").length
      ? best.description
      : other.description;
  const title =
    String(best.title || "").length >= String(other.title || "").length ? best.title : other.title;
  return {
    ...best,
    title,
    description,
    election:
      best.category === "election" || other.category === "election" || best.election || other.election
        ? election
        : best.election,
    verifiedBy,
    confidence: Math.max(best.confidence ?? 0, other.confidence ?? 0),
    source: best.source || other.source,
    sourceUrl: best.sourceUrl || other.sourceUrl,
  };
};

/**
 * Collapse events that describe the same milestone (year + office/election/role),
 * keeping the richest description and collecting supporting sources.
 * @param {object[]} events
 * @param {{ sort?: boolean }} [options] — set sort:false to preserve input order
 *   (used for Birth → Education → Party story prefixes).
 */
export const collapseSemanticDuplicates = (events = [], options = {}) => {
  const { sort = true } = options;
  const merged = [];
  for (const raw of events || []) {
    if (!raw?.year) continue;
    const event = { ...raw, year: String(raw.year) };
    const key = semanticMilestoneKey(event);
    const existingIdx = merged.findIndex((m) => {
      if (semanticMilestoneKey(m) === key) return true;
      // Same-year election family with one missing constituency still merges
      if (String(m.year) !== String(event.year)) return false;
      if (!(m.category === "election" || event.category === "election" || isElectionLikeEvent(m) || isElectionLikeEvent(event))) {
        return false;
      }
      const mFamily = normalizeElectionFamily(`${m.election?.type || ""} ${m.title || ""} ${m.description || ""}`);
      const eFamily = normalizeElectionFamily(
        `${event.election?.type || ""} ${event.title || ""} ${event.description || ""}`
      );
      if (mFamily !== eFamily) return false;
      const mConst = normalizeConstituencyKey(
        m.election?.constituency ||
          String(m.description || "").match(/constituency[:\s]+([^·|\n]+)/i)?.[1] ||
          ""
      );
      const eConst = normalizeConstituencyKey(
        event.election?.constituency ||
          String(event.description || "").match(/constituency[:\s]+([^·|\n]+)/i)?.[1] ||
          ""
      );
      return !mConst || !eConst || mConst === eConst;
    });
    if (existingIdx >= 0) {
      merged[existingIdx] = mergeTwoEvents(merged[existingIdx], event);
    } else {
      merged.push(event);
    }
  }
  if (!sort) return merged;
  return merged.sort(
    (a, b) =>
      Number(a.year) - Number(b.year) ||
      timelineCategoryRank(a) - timelineCategoryRank(b) ||
      String(a.title).localeCompare(String(b.title))
  );
};

const timelineCategoryRank = (event) => {
  if (isBirthEvent(event)) return 0;
  if (isEducationEvent(event)) return 1;
  if (isPartyEvent(event)) return 2;
  if (event.category === "election" || isElectionLikeEvent(event)) return 3;
  if (isCurrentOfficeEvent(event)) return 6;
  if (isMajorAppointment(event) || event.category === "position") return 4;
  return 5;
};

/**
 * Merge election milestones that describe the same contest from different providers.
 */
export const mergeElectionsByMilestone = (elections = []) => {
  const items = [];
  for (const raw of elections) {
    if (!raw?.year) continue;
    items.push(toElectionEvent(raw));
  }

  const merged = [];
  for (const event of items) {
    const family = normalizeElectionFamily(
      `${event.election?.type || ""} ${event.title || ""} ${event.description || ""}`
    );
    const constituency = normalizeConstituencyKey(
      event.election?.constituency ||
        String(event.description || "").match(/constituency[:\s]+([^·|]+)/i)?.[1] ||
        ""
    );
    const party = normalizeText(event.election?.party || "");
    const year = String(event.year);

    const existingIdx = merged.findIndex((m) => {
      if (String(m.year) !== year) return false;
      const mFamily = normalizeElectionFamily(
        `${m.election?.type || ""} ${m.title || ""} ${m.description || ""}`
      );
      if (mFamily !== family) return false;
      const mConst = normalizeConstituencyKey(
        m.election?.constituency ||
          String(m.description || "").match(/constituency[:\s]+([^·|]+)/i)?.[1] ||
          ""
      );
      const mParty = normalizeText(m.election?.party || "");
      // Same constituency (or one missing) and compatible party
      const constOk = !constituency || !mConst || constituency === mConst;
      const partyOk = !party || !mParty || party === mParty;
      return constOk && partyOk;
    });

    if (existingIdx >= 0) {
      merged[existingIdx] = mergeTwoEvents(merged[existingIdx], event);
    } else {
      merged.push(event);
    }
  }

  return merged.sort((a, b) => Number(a.year) - Number(b.year));
};

const appointmentOverlapsElection = (appointment, elections) => {
  const year = String(appointment.year);
  const family = normalizeElectionFamily(`${appointment.title} ${appointment.description}`);
  return elections.some((e) => {
    if (String(e.year) !== year) return false;
    const eFamily = normalizeElectionFamily(
      `${e.election?.type || ""} ${e.title || ""} ${e.description || ""}`
    );
    if (family === eFamily) return true;
    // Same-year MLA/MP language vs assembly/lok sabha win
    if (
      (family === "assembly" || family === "lok-sabha") &&
      (eFamily === family || eFamily === "assembly" || eFamily === "lok-sabha")
    ) {
      return true;
    }
    return false;
  });
};

const looksLikePersonName = (text = "") => {
  const t = String(text || "").trim();
  if (!t || t.length < 3) return false;
  if (
    /\b(election|assembly|sabha|vidhan|lok|rajya|mla|mp|won|contested|party|constituency|minister|general|legislative|parliamentary|parliament|re-?elected|bye|joined|affiliated|education|birth|college|school|appointed|became|retired)\b/i.test(
      t
    )
  ) {
    return false;
  }
  // 1–4 capitalized name tokens (e.g. "Yogi Adityanath", "Narendra Modi")
  return /^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.']*){0,3}$/.test(t);
};

const collapseRepeatedWords = (text = "") => {
  let t = String(text || "").trim();
  if (!t) return "";
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = t.replace(/\b([\w'’-]+)(?:\s+\1\b)+/gi, "$1");
  }
  return t.replace(/\s{2,}/g, " ").trim();
};

const isMangledElectionTitle = (title = "") => {
  const t = String(title || "").trim();
  if (!t) return true;
  if (/^(won\s+){2,}/i.test(t)) return true;
  if (/^won\s+re$/i.test(t) || /^won\s*-?\s*$/i.test(t)) return true;
  if (/^contested\s+re$/i.test(t)) return true;
  if (/^won\s+(parliamentary|assembly|general|lok sabha|rajya sabha)$/i.test(t)) return true;
  if (looksLikePersonName(t)) return true;
  return false;
};

/**
 * Normalize the election TYPE label (not the display title).
 * Must NEVER return values that start with "Won"/"Contested" — those are display
 * prefixes. Historical bug: buildElectionDisplayTitle did `Won ${type}` while type
 * already started with "Won", writing "Won Won Re" into Mongo and compounding on rebuild.
 */
export const normalizeElectionTypeLabel = (typeRaw = "") => {
  let t = String(typeRaw || "").trim();
  if (!t) return "Election";

  // Strip display-title prefixes first (source of "Won Won Re" corruption)
  t = t
    .replace(/^(won\s+)+/i, "")
    .replace(/^(contested\s+)+/i, "")
    .replace(/^(re-elected\s+(as\s+)?)/i, "")
    .trim();

  if (!t || looksLikePersonName(t)) return "Election";

  // Bare remnant after stripping "Won" from "Won Re" / "Won Won Re"
  if (/^re$/i.test(t)) return "Re-election";

  const isReElection = /\bre[-\s]?elections?\b/i.test(t);
  const isByeElection = /\bbye[-\s]?elections?\b/i.test(t);

  t = t
    .replace(/\s*[—–-]\s*(Elected|Re-elected|Winner|Won).*$/i, "")
    .replace(/\bElected MLA\b/gi, "")
    .trim();

  if (isReElection || /^re$/i.test(t)) return "Re-election";
  if (isByeElection) return "Bye-election";
  if (!t || looksLikePersonName(t)) return "Election";
  // Guard: never persist a type that still looks like a Won-title
  if (/^won\b/i.test(t)) return "Election";
  return t;
};

const finalizeElectionTitle = (title = "") => {
  let t = collapseRepeatedWords(String(title || "").trim());
  t = t
    .replace(/^(won\s+)+/i, "Won ")
    .replace(/\bWon\s+India\s+Lok\s+Sabha\b/i, "Won the Indian Lok Sabha")
    .replace(/\bWon\s+Indian\s+Lok\s+Sabha\b/i, "Won the Indian Lok Sabha")
    .replace(/\bWon\s+the\s+Indian\s+Lok\s+Sabha(?!\s+Election)\b/i, "Won the Indian Lok Sabha Election")
    .replace(/^Won\s+Parliamentary$/i, "Won Parliamentary Election")
    .replace(/^Won\s+Assembly$/i, "Won Assembly Election")
    .replace(/^Won\s+General$/i, "Won General Election")
    .replace(/^Won\s+Lok\s+Sabha$/i, "Won the Indian Lok Sabha Election")
    .replace(/^Re-elected\s+MP$/i, "Re-elected as Member of Parliament")
    .replace(/^Re-elected\s+MLA$/i, "Re-elected as MLA")
    .replace(/\belection\s+election\b/gi, "Election")
    .replace(/\bthe\s+the\b/gi, "the")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t;
};

const buildElectionDisplayTitle = (cleanType, family, result, winIndexInFamily) => {
  if (result === "Lost") {
    if (family === "lok-sabha") return "Contested the Indian Lok Sabha Election";
    if (family === "assembly") return "Contested Assembly Election";
    if (/^re[-\s]?election$/i.test(cleanType)) return "Contested Re-election";
    if (/^election$/i.test(cleanType)) return "Contested Election";
    const base = collapseRepeatedWords(
      String(cleanType)
        .replace(/\belections?\b/gi, "")
        .replace(/\s*[-\s]+$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    );
    if (!base || base.length < 3 || /^(re|bye|won)$/i.test(base)) return "Contested Election";
    return finalizeElectionTitle(`Contested ${base}`);
  }

  if (result !== "Won") {
    if (looksLikePersonName(cleanType) || !cleanType) return "Election";
    return finalizeElectionTitle(cleanType);
  }

  if (winIndexInFamily > 0) {
    return family === "lok-sabha"
      ? "Re-elected as Member of Parliament"
      : "Re-elected as MLA";
  }
  if (/^re[-\s]?election$/i.test(cleanType)) {
    return family === "lok-sabha" ? "Won Lok Sabha Re-election" : "Won Re-election";
  }
  if (/^bye[-\s]?election$/i.test(cleanType)) return "Won Bye-election";
  if (/^election$/i.test(cleanType)) {
    if (family === "lok-sabha") return "Won the Indian Lok Sabha Election";
    if (family === "assembly") return "Won Assembly Election";
    return "Won Election";
  }

  // Strip "election" carefully — do not turn "Re-election" into "Re"
  let base = String(cleanType)
    .replace(/^(won\s+)+/i, "")
    .replace(/\bre[-\s]?elections?\b/gi, "RE_ELECTION_TOKEN")
    .replace(/\bbye[-\s]?elections?\b/gi, "BYE_ELECTION_TOKEN")
    .replace(/\belections?\b/gi, "")
    .replace(/RE_ELECTION_TOKEN/g, "Re-election")
    .replace(/BYE_ELECTION_TOKEN/g, "Bye-election")
    .replace(/\bIndia\b/g, "Indian")
    .replace(/\s*[-\s]+$/g, "")
    .replace(/^\s*[-\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  base = collapseRepeatedWords(base);

  if (!base || base.length < 3 || /^(re|bye|the|a|an|won)$/i.test(base)) {
    if (family === "lok-sabha") return "Won the Indian Lok Sabha Election";
    if (family === "assembly") return "Won Assembly Election";
    return "Won Election";
  }

  if (/\bindian\s+lok\s+sabha\b/i.test(base) || /\blok\s+sabha\b/i.test(base)) {
    return finalizeElectionTitle("Won the Indian Lok Sabha Election");
  }
  if (/parliamentary/i.test(base)) {
    return finalizeElectionTitle("Won Parliamentary Election");
  }
  if (/assembly|vidhan|rajya sabha/i.test(base)) {
    return finalizeElectionTitle(`Won ${base} Election`);
  }
  if (/re-election|bye-election/i.test(base)) return finalizeElectionTitle(`Won ${base}`);
  return finalizeElectionTitle(`Won ${base}`);
};

const polishElectionEvent = (event, winIndexInFamily) => {
  const result = event.election?.result || parseElectionResult(`${event.title} ${event.description}`);
  const typeRaw = event.election?.type || event.title || "Election";
  const cleanType = normalizeElectionTypeLabel(typeRaw);
  const family = normalizeElectionFamily(`${cleanType} ${event.title} ${event.description || ""}`);
  const constituency = event.election?.constituency;
  const party = cleanPartyLabel(event.election?.party || "", event.year) || null;
  const title = buildElectionDisplayTitle(cleanType, family, result, winIndexInFamily);

  const details = [
    constituency ? `Constituency: ${constituency}` : null,
    party ? `Party: ${party}` : null,
    event.election?.margin != null && event.election.margin > 0
      ? `Margin: +${Number(event.election.margin).toLocaleString()}`
      : null,
    event.election?.voteShare != null && event.election.voteShare > 0
      ? `Vote share: ${event.election.voteShare}%`
      : null,
  ].filter(Boolean);

  return {
    ...event,
    title,
    description: details.join(" · ") || cleanPartyInText(event.description || "", event.year),
    election: {
      ...(event.election || {}),
      // Persist normalized TYPE only — never a "Won …" display title
      type: cleanType,
      result,
      party,
    },
  };
};

const polishAppointmentTitle = (event) => {
  const text = `${event.title || ""} ${event.description || ""}`;
  if (/\bchief minister\b/i.test(text)) {
    const state =
      text.match(/chief minister of ([A-Za-z\s]+?)(?:\s*[—–\-|,]|\s*$)/i)?.[1]?.trim() || null;
    return {
      ...event,
      title: state ? `Became Chief Minister of ${state}` : "Became Chief Minister",
      description:
        event.description && !normalizeText(event.description).includes("chief minister")
          ? event.description
          : "",
    };
  }
  if (/\bprime minister\b/i.test(text)) {
    return { ...event, title: "Became Prime Minister", description: "" };
  }
  if (/\bunion minister\b/i.test(text)) {
    return { ...event, title: "Became Union Minister" };
  }
  if (/\bcabinet minister\b/i.test(text)) {
    return { ...event, title: "Appointed Cabinet Minister" };
  }
  if (/\bmember of parliament\b|\bmp\b/i.test(text) && !/\belect/i.test(text)) {
    return { ...event, title: "Became Member of Parliament" };
  }
  if (/\bretired|retirement\b/i.test(text)) {
    return { ...event, title: "Retired" };
  }
  return event;
};

/**
 * Merge elections + appointments into a clean chronological middle section.
 * Election-like appointment cards are folded into election milestones.
 */
export const mergeChronologicalMiddle = (elections = [], appointments = []) => {
  const electionBucket = [];
  const appointmentBucket = [];

  for (const e of elections || []) {
    if (e) electionBucket.push(e);
  }
  for (const a of appointments || []) {
    if (!a) continue;
    if (isElectionLikeEvent(a)) electionBucket.push(toElectionEvent(a));
    else appointmentBucket.push(a);
  }

  const mergedElections = mergeElectionsByMilestone(electionBucket);
  const winCounts = new Map();
  const polishedElections = mergedElections.map((event) => {
    const family = normalizeElectionFamily(
      `${event.election?.type || ""} ${event.title || ""}`
    );
    const result = event.election?.result || parseElectionResult(`${event.title}`);
    let winIndex = 0;
    if (result === "Won") {
      winIndex = winCounts.get(family) || 0;
      winCounts.set(family, winIndex + 1);
    }
    return polishElectionEvent(event, winIndex);
  });

  const seenAppt = new Set();
  const polishedAppointments = [];
  for (const raw of appointmentBucket) {
    if (appointmentOverlapsElection(raw, polishedElections)) continue;
    const event = polishAppointmentTitle(raw);
    const key = `${event.year}:${normalizeRoleFamily(event)}`;
    if (seenAppt.has(key)) continue;
    seenAppt.add(key);
    polishedAppointments.push(event);
  }

  return [...polishedElections, ...polishedAppointments].sort(
    (a, b) => Number(a.year) - Number(b.year) || String(a.title).localeCompare(String(b.title))
  );
};

const dedupeAppointments = (appointments) => {
  const seen = new Set();
  const result = [];
  for (const event of appointments) {
    const key = `${event.year}:${normalizeText(event.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result.sort((a, b) => Number(a.year) - Number(b.year));
};

const buildBirthEvent = (biography, sources, facts) => {
  const fromBio = extractYear(biography.dob);
  const birthFact = (facts || []).find((f) => f.type === "Birth" && f.year);
  const placeFact = (facts || []).find((f) => f.type === "Birth Place" && (f.value || f.description));
  const year = fromBio || birthFact?.year;
  if (!year) return null;

  const place =
    biography.birthPlace ||
    biography.placeOfBirth ||
    placeFact?.value ||
    placeFact?.description ||
    "";
  const name = biography.fullName || biography.name || "";

  const rawBits = [
    isVerifiedValue(biography.dob) ? biography.dob : null,
    birthFact?.value || birthFact?.description || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const description = cleanBirthDescription(rawBits, { year, place, name });

  return createEvent({
    year,
    title: "Birth",
    description,
    source: resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]),
    category: "birth",
  });
};

const buildEducationEvent = (biography, sources, facts) => {
  const eduFacts = (facts || []).filter((f) =>
    ["School Education", "College Education", "Degree"].includes(f.type)
  );
  const fromBio = splitEducation(biography.education);

  if (eduFacts.length > 0) {
    const withYear = eduFacts.find((f) => f.year);
    if (!withYear?.year) {
      if (!fromBio) return null;
      return createEvent({
        year: fromBio.year,
        title: "Education",
        description: fromBio.text,
        source: resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]),
        category: "college",
      });
    }
    return createEvent({
      year: withYear.year,
      title: "Education",
      description: eduFacts.map((f) => f.value || f.description).filter(Boolean).join(" · "),
      source: resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]),
      category: "college",
    });
  }

  if (!fromBio) return null;
  return createEvent({
    year: fromBio.year,
    title: "Education",
    description: fromBio.text,
    source: resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]),
    category: "college",
  });
};

const buildPartyEvent = (biography, sources, facts) => {
  const partyFact = (facts || []).find((f) => ["Party Join", "Political Party"].includes(f.type) && f.year);
  const year = extractYear(biography.dateJoinedParty) || partyFact?.year;
  if (!year) return null;

  const rawParty = biography.party || partyFact?.value || partyFact?.description;
  // For join events, strip tenure annotations but keep the party name (year badge carries the join year)
  const party = cleanPartyLabel(rawParty, null);
  const title = isVerifiedValue(party) ? `Joined ${party}` : "Party Entry";

  return createEvent({
    year,
    title,
    description: "",
    source: resolveSource(sources, ["party", "wikipedia"]),
    category: "joinedParty",
  });
};

const buildElectionEvents = (elections = [], sources) => {
  const source = resolveSource(sources, ["myneta", "election commission"]);
  return elections.map((row) => buildElectionCard(row, source)).filter(Boolean);
};

const buildAppointmentEvents = (biography, facts, rawTimeline, sources) => {
  const source = resolveSource(sources, ["lok sabha", "rajya sabha", "wikipedia", "state assembly"]);
  const events = [];

  for (const position of biography.previousPositions || []) {
    if (!isVerifiedValue(position)) continue;
    const year = extractYear(position);
    if (!year || !MAJOR_ROLE_PATTERN.test(position)) continue;
    events.push(
      createEvent({
        year,
        title: position.split(/[,.]/)[0].trim().slice(0, 80),
        description: position,
        source,
        category: "position",
      })
    );
  }

  for (const fact of facts || []) {
    if (!["Appointment", "Government Position", "Cabinet Position", "Parliament Membership", "Assembly Membership"].includes(fact.type)) {
      continue;
    }
    if (!fact.year || !MAJOR_ROLE_PATTERN.test(`${fact.title} ${fact.value} ${fact.description}`)) continue;
    events.push(
      createEvent({
        year: fact.year,
        title: fact.title || fact.value,
        description: fact.description || fact.value,
        source: { name: fact.source, url: fact.sourceUrl, confidence: fact.confidence },
        category: "position",
      })
    );
  }

  for (const raw of rawTimeline || []) {
    const text = String(raw.event || "").trim();
    const year = extractYear(raw.year) || extractYear(text);
    if (!year || !MAJOR_ROLE_PATTERN.test(text)) continue;
    events.push(
      createEvent({
        year,
        title: text.replace(/^assumed office[:\s]*/i, "").trim().slice(0, 80),
        description: text,
        source,
        category: "position",
      })
    );
  }

  return events;
};

const buildCurrentOfficeEvent = (biography, elections, existingEvents, sources) => {
  const office = biography.currentOffice || biography.currentPosition;
  if (!isVerifiedValue(office)) return null;

  let year =
    existingEvents
      .filter(isCurrentOfficeEvent)
      .map((e) => e.year)
      .find(Boolean) ||
    [...(elections || [])]
      .filter((row) => /winner|won|elected/i.test(String(row.position || "")))
      .sort((a, b) => (b.year || 0) - (a.year || 0))[0]?.year ||
    extractYear(biography.dateFirstElected) ||
    extractYear(biography.dateJoinedParty);

  if (year) year = String(year);
  // Last resort: keep current office visible on career timeline even without a precise year
  if (!year) year = String(new Date().getFullYear());

  const description = [
    isVerifiedValue(biography.constituency) ? `Constituency: ${biography.constituency}` : null,
    isVerifiedValue(biography.party) ? `Party: ${cleanPartyLabel(biography.party, year)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return createEvent({
    year,
    title: office,
    description,
    source: resolveSource(sources, ["lok sabha", "rajya sabha", "myneta", "wikipedia"]),
    category: "currentOffice",
  });
};

const factToTimelineEvent = (fact) => {
  const category = FACT_TYPE_TO_TIMELINE_CATEGORY[fact.type];
  if (!category || !fact.year) return null;

  const event = createEvent({
    year: fact.year,
    title: fact.title || fact.type,
    description: fact.description || fact.value || fact.title,
    source: { name: fact.source, url: fact.sourceUrl, confidence: fact.confidence },
    category,
    verifiedBy: fact.verifiedBy,
  });

  if (category === "election" && fact.value) {
    event.election = {
      year: String(fact.year),
      type: fact.title || "Election",
      constituency: null,
      party: null,
      result: parseElectionResult(fact.description || fact.value),
      margin: null,
      voteShare: null,
    };
  }

  return event;
};

const ingestStoredTimeline = (storedTimeline = [], sources = []) => {
  const events = [];
  for (const entry of storedTimeline || []) {
    if (!entry) continue;
    if (isPresent(entry.title) && isPresent(entry.category) && isPresent(entry.year)) {
      events.push(
        createEvent({
          year: entry.year,
          title: entry.title,
          description: entry.description || entry.narrative || "",
          source: { name: entry.source, url: entry.sourceUrl, confidence: entry.confidence },
          category: entry.category,
          id: entry.id,
          date: entry.date,
          verifiedBy: entry.verifiedBy,
          election: entry.election || null,
        })
      );
    }
  }
  return events;
};

const assembleStoryTimeline = (pools, biography, elections, sources) => {
  const { birth, education, party, elections: electionEvents, appointments, currentOffice: storedCurrent } = pools;

  const middle = mergeChronologicalMiddle(electionEvents, appointments);
  const current =
    buildCurrentOfficeEvent(biography, elections, [...middle, ...(storedCurrent ? [storedCurrent] : [])], sources) ||
    storedCurrent;
  const polishedCurrent = current ? polishAppointmentTitle({ ...current, category: "currentOffice" }) : null;

  // Story prefix: Education → Party (birth is excluded from career timeline)
  const prefixMerged = collapseSemanticDuplicates([education, party].filter(Boolean), { sort: false });
  const orderedPrefix = [
    ...prefixMerged.filter((e) => isEducationEvent(e)),
    ...prefixMerged.filter((e) => isPartyEvent(e) && !isEducationEvent(e)),
  ];
  let timeline = [...orderedPrefix, ...middle];

  if (polishedCurrent) {
    const key = semanticMilestoneKey(polishedCurrent);
    const overlapIdx = timeline.findIndex((e) => semanticMilestoneKey(e) === key);
    if (overlapIdx >= 0) {
      const merged = mergeTwoEvents(timeline[overlapIdx], polishedCurrent);
      timeline.splice(overlapIdx, 1);
      timeline.push({ ...merged, category: "currentOffice" });
    } else {
      timeline.push(polishedCurrent);
    }
  }

  return timeline.map((event) => ({
    ...event,
    id: event.id || generateFactId(event),
  }));
};

const collectRawEvents = ({ biography, rawTimeline, elections, sources, facts, storedTimeline }) => {
  const events = [];

  // Birth is intentionally omitted from the career timeline
  events.push(buildEducationEvent(biography, sources, facts));
  events.push(buildPartyEvent(biography, sources, facts));
  events.push(...buildElectionEvents(elections, sources));
  events.push(...buildAppointmentEvents(biography, facts, rawTimeline, sources));

  for (const fact of facts || []) {
    const mapped = factToTimelineEvent(fact);
    if (mapped && mapped.category !== "birth" && !isBirthEvent(mapped)) events.push(mapped);
  }

  events.push(
    ...ingestStoredTimeline(storedTimeline, sources).filter(
      (e) => e && e.category !== "birth" && !isBirthEvent(e)
    )
  );

  for (const raw of rawTimeline || []) {
    const text = String(raw.event || "").trim();
    const year = extractYear(raw.year) || extractYear(text);
    if (!year || !isVerifiedValue(text)) continue;
    if (/\b(born|birth)\b/i.test(text)) {
      // Skip birth milestones — career timeline starts at education / party / elections
      continue;
    } else if (/\b(joined|affiliated)\b/i.test(text)) {
      events.push(
        createEvent({
          year,
          title: "Party Entry",
          description: text,
          source: resolveSource(sources, ["party", "wikipedia"]),
          category: "joinedParty",
        })
      );
    }
  }

  return events.filter(Boolean);
};

/**
 * Build a clean storytelling timeline: Education → Party → Elections & Appointments → Current Role.
 */
export const buildIntelligenceTimeline = ({
  biography = {},
  rawTimeline = [],
  elections = [],
  sources = [],
  facts = [],
  storedTimeline = [],
}) => {
  const rawEvents = collectRawEvents({
    biography,
    rawTimeline,
    elections,
    sources,
    facts,
    storedTimeline,
  });

  const pools = mergeDuplicateTimelineEvents(rawEvents);
  const assembled = assembleStoryTimeline(pools, biography, elections, sources);
  return polishTimelineEventsForDisplay(assembled);
};

/**
 * Collapse repeated words, strip year/date echoes, and drop redundant descriptions
 * so the timeline reads like a clean biography card list.
 */
export function cleanTimelineTitle(title = "", year = null) {
  let t = String(title || "").trim();
  if (!t) return "";
  t = collapseRepeatedWords(t);
  t = t
    .replace(/\s*[—–]\s*/g, " — ")
    .replace(/\s+-\s+/g, " — ")
    .replace(/^(won\s+)+/i, "Won ")
    .replace(/\b(election)\s+\1\b/gi, "$1")
    .replace(/\b(won)\s+\1\b/gi, "$1")
    .replace(/\b(re-elected)\s+\1\b/gi, "$1")
    .replace(/\b(became)\s+\1\b/gi, "$1")
    .replace(/\belection\s+election\b/gi, "Election")
    .replace(/\bWon\s+India\s+Lok\s+Sabha\b/i, "Won the Indian Lok Sabha")
    .replace(/\bWon\s+Indian\s+Lok\s+Sabha\b/i, "Won the Indian Lok Sabha")
    .replace(/\bWon\s+the\s+Indian\s+Lok\s+Sabha(?!\s+Election)\b/i, "Won the Indian Lok Sabha Election")
    .replace(/^Won\s+Parliamentary$/i, "Won Parliamentary Election")
    .replace(/^Won\s+Assembly$/i, "Won Assembly Election")
    .replace(/^Won\s+Re$/i, "Won Re-election")
    .replace(/^Re-elected\s+MP$/i, "Re-elected as Member of Parliament")
    .replace(/^Re-elected\s+MLA$/i, "Re-elected as MLA")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Year badge already shows the year — strip echoes from the title
  const y = year != null ? String(year).replace(/[^\d]/g, "").slice(0, 4) : "";
  if (y) {
    t = t
      .replace(new RegExp(`\\bin\\s+${y}\\b`, "gi"), "")
      .replace(new RegExp(`\\bof\\s+${y}\\b`, "gi"), "")
      .replace(new RegExp(`\\(\\s*${y}\\s*\\)`, "g"), "")
      .replace(new RegExp(`[,;·]\\s*${y}\\b`, "g"), "")
      .replace(new RegExp(`\\s*[—–\\-]\\s*${y}\\b`, "g"), "")
      .replace(new RegExp(`\\b${y}\\b`, "g"), "")
      .replace(/\s*[—–-]\s*$/g, "")
      .replace(/^\s*[—–-]\s*/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return collapseRepeatedWords(t);
}

export function cleanTimelineDescription(description = "", { title = "", year = null, category = "" } = {}) {
  let d = String(description || "").trim();
  if (!d) return "";

  // Birth keeps a curated date + place block (including year on the date line)
  if (category === "birth") {
    return cleanBirthDescription(d, { year });
  }

  // Convert ISO dates before year stripping can produce "(-03-25)" leftovers
  d = d.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (m) => formatReadableDate(m));

  const titleNorm = normalizeText(title);
  const descNorm = normalizeText(d);

  // Drop description that merely repeats the title
  if (titleNorm && (descNorm === titleNorm || titleNorm.includes(descNorm) || descNorm.includes(titleNorm))) {
    // Keep only if description adds constituency / party / margin facts
    if (!/\b(constituency|party|margin|vote share)\b/i.test(d)) {
      return "";
    }
  }

  // Remove echoed years when the year badge already shows them
  if (year) {
    const y = String(year);
    d = d
      .replace(new RegExp(`\\bin\\s+${y}\\b`, "gi"), "")
      .replace(new RegExp(`\\bborn\\s+in\\s*`, "gi"), "")
      .replace(new RegExp(`\\b${y}\\b`, "g"), "")
      .replace(/\(\s*-?\d{2}-\d{2}\s*\)/g, "")
      .replace(/(^|[\s·|,;])-\d{2}-\d{2}(?=[\s·|,;]|$)/g, "$1")
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "");
  }

  // Scrub tenure leftovers created when a year was stripped from "(2015–present)" → "(–present)"
  d = cleanPartyInText(d, year);

  // Strip title fragment from the start of description
  if (title) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    d = d.replace(new RegExp(`^${escaped}\\s*[—–\\-:·]?\\s*`, "i"), "");
  }

  d = d
    .replace(/\b(born|birth|date of birth)\b/gi, "")
    .replace(/^\s*on\s+/i, "")
    .replace(/\s*[·|,;]\s*[·|,;]+/g, " · ")
    .replace(/^\s*[·|,;:\-—–]+\s*/g, "")
    .replace(/\s*[·|,;:\-—–]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+·\s+/g, " · ")
    .trim();

  // Empty / punctuation-only leftovers
  if (!d || /^[·|,;:\-—–.\s]+$/.test(d)) return "";
  if (titleNorm && normalizeText(d) === titleNorm) return "";

  return d;
}

/**
 * Final presentation pass for timeline events used by profile UI + dossiers.
 * Also collapses semantic duplicates so legacy stored timelines clean up on read.
 * Preserves storytelling order: Education → Party → chronological middle → Current office.
 * Birth milestones are excluded from the career timeline.
 */
export function polishTimelineEventsForDisplay(events = []) {
  const education = [];
  const party = [];
  const current = [];
  const middle = [];

  for (const raw of events || []) {
    if (!raw) continue;
    // Career timeline never shows birth
    if (isBirthEvent(raw) || raw.category === "birth") continue;
    if (isEducationEvent(raw)) education.push(raw);
    else if (isPartyEvent(raw)) party.push(raw);
    else if (isCurrentOfficeEvent(raw)) current.push(raw);
    else middle.push(raw);
  }

  const ordered = [
    ...collapseSemanticDuplicates(education, { sort: false }),
    ...collapseSemanticDuplicates(party, { sort: false }),
    ...collapseSemanticDuplicates(middle),
    ...collapseSemanticDuplicates(current, { sort: false }),
  ];

  const cleaned = [];
  let prevFingerprint = "";

  for (const raw of ordered) {
    if (!raw) continue;
    if (isBirthEvent(raw) || raw.category === "birth") continue;

    const year =
      raw.year != null ? String(raw.year).replace(/[^\d]/g, "").slice(0, 4) || String(raw.year) : null;

    // Clean party tenure annotations before year-stripping can produce "(–present)"
    let preTitle = String(raw.title || "");
    let preDescription = String(raw.description || raw.narrative || "");
    let electionPayload = raw.election || null;

    // Repair only mangled election titles (e.g. "Yogi Adityanath", "Won Re") —
    // never rewrite Education / Joined Party / Current Office cards.
    const shouldRepairElectionTitle =
      (raw.category === "election" || Boolean(electionPayload) || /party:|constituency:/i.test(preDescription)) &&
      isMangledElectionTitle(preTitle);

    if (shouldRepairElectionTitle) {
      const repaired = polishElectionEvent(
        {
          ...raw,
          title: looksLikePersonName(preTitle) ? electionPayload?.type || "Election" : preTitle,
          election: {
            ...(electionPayload || {}),
            type: normalizeElectionTypeLabel(
              looksLikePersonName(electionPayload?.type || "")
                ? "Election"
                : electionPayload?.type || preTitle
            ),
            party: electionPayload?.party,
            constituency: electionPayload?.constituency,
            result: electionPayload?.result || parseElectionResult(`${preTitle} ${preDescription}`),
          },
        },
        0
      );
      preTitle = repaired.title;
      preDescription = repaired.description || preDescription;
      electionPayload = repaired.election;
    }

    if (electionPayload || raw.category === "election" || /party:/i.test(preDescription)) {
      const cleanedParty = cleanPartyLabel(electionPayload?.party || "", year);
      if (electionPayload) {
        electionPayload = {
          ...electionPayload,
          party: cleanedParty || null,
        };
      }
      preDescription = cleanPartyInText(preDescription, year);
    }

    // Party-join titles: "Joined BJP (2015–present)" → "Joined BJP"
    if (raw.category === "joinedParty" || isPartyEvent(raw)) {
      preTitle = preTitle.replace(
        /\b(joined|affiliated with|affiliated)\s+(.+)$/i,
        (_, verb, partyPart) => {
          const cleaned = cleanPartyLabel(partyPart, null);
          return cleaned ? `${verb} ${cleaned}` : verb;
        }
      );
      preDescription = cleanPartyInText(
        preDescription.replace(
          /\b(joined|affiliated with|affiliated)\s+(.+)$/i,
          (_, verb, partyPart) => {
            const cleaned = cleanPartyLabel(partyPart, null);
            return cleaned ? `${verb} ${cleaned}` : verb;
          }
        ),
        year
      );
    }

    let title = cleanTimelineTitle(preTitle, year);
    // Final guard — only for election cards
    if (
      (raw.category === "election" || electionPayload) &&
      isMangledElectionTitle(title)
    ) {
      title = buildElectionDisplayTitle(
        normalizeElectionTypeLabel(electionPayload?.type || "Election"),
        normalizeElectionFamily(`${electionPayload?.type || ""} ${title}`),
        electionPayload?.result || "Won",
        0
      );
    }
    if (!title && !year) continue;

    const category =
      raw.category === "election" || electionPayload
        ? raw.category || "election"
        : raw.category || "";
    let description = cleanTimelineDescription(preDescription, {
      title,
      year,
      category,
    });

    if ((category === "joinedParty" || isPartyEvent({ ...raw, title, description })) && title === "Party Entry") {
      const joined =
        String(description || "").match(/^(?:joined|affiliated with)\s+(.+)$/i)?.[1]?.trim() ||
        cleanPartyLabel(description, null);
      if (joined) {
        title = `Joined ${cleanPartyLabel(joined, null) || joined}`;
        description = "";
      }
    }

    // Prefer a single year label — don't also surface a redundant date string
    let date = raw.date || null;
    if (date && year && String(date).includes(year) && !/[A-Za-z]{3,}/.test(String(date))) {
      date = null;
    }
    if (date && year && String(date).trim() === year) {
      date = null;
    }

    const next = {
      ...raw,
      year,
      date,
      title,
      description,
      category: category || raw.category,
      election: electionPayload,
    };

    const prev = cleaned[cleaned.length - 1];
    if (prev && semanticMilestoneKey(prev) === semanticMilestoneKey(next)) {
      cleaned[cleaned.length - 1] = mergeTwoEvents(prev, next);
      cleaned[cleaned.length - 1].title = cleanTimelineTitle(
        cleaned[cleaned.length - 1].title || title,
        year
      );
      continue;
    }

    // Same-year near-duplicate of previous card → skip
    const fingerprint = `${year}|${normalizeText(title)}|${normalizeText(description).slice(0, 48)}`;
    if (fingerprint === prevFingerprint) continue;

    // Same year + same title as previous → merge description extras only once
    const titleKey = `${year}|${normalizeText(title)}`;
    if (prev && `${prev.year}|${normalizeText(prev.title)}` === titleKey) {
      if (description && !prev.description) prev.description = description;
      continue;
    }

    prevFingerprint = fingerprint;
    cleaned.push(next);
  }

  const rest = cleaned.filter((e) => !isCurrentOfficeEvent(e));
  const currents = cleaned.filter((e) => isCurrentOfficeEvent(e));
  return currents.length ? [...rest, currents[currents.length - 1]] : rest;
}

export const buildTimelineFromFacts = (facts = []) =>
  buildIntelligenceTimeline({ facts: Array.isArray(facts) ? facts : [] });

export const refineStoredTimeline = (storedTimeline = [], biography = {}) =>
  buildIntelligenceTimeline({ biography, storedTimeline });

/** @deprecated Intelligence layer removed — returns timeline only. */
export const buildCareerTimelinePackage = (params) => ({
  timeline: buildIntelligenceTimeline(params),
  timelineIntelligence: {},
});

const hasMeaningfulElection = (election) => {
  if (!election || typeof election !== "object") return false;
  return Boolean(
    isPresent(election.type) ||
      isPresent(election.constituency) ||
      isPresent(election.party) ||
      isPresent(election.result) ||
      election.margin != null ||
      election.voteShare != null
  );
};

const hydrateElectionPayload = (entry, elections = []) => {
  if (hasMeaningfulElection(entry?.election)) return entry.election;
  if (entry?.category !== "election" && !isElectionLikeEvent(entry || {})) return null;

  const year = String(entry?.year || "");
  const candidates = (elections || []).filter((row) => String(row?.year) === year);
  if (candidates.length === 1) {
    const rebuilt = buildElectionEvents(candidates, [])[0];
    if (hasMeaningfulElection(rebuilt?.election)) return rebuilt.election;
  }
  if (candidates.length > 1) {
    const titleNorm = normalizeText(entry?.title || "");
    const match =
      candidates.find((row) => {
        const typeNorm = normalizeText(row.election || "");
        const constNorm = normalizeText(row.constituency || "");
        return (
          (typeNorm && titleNorm.includes(typeNorm)) ||
          (constNorm && (titleNorm.includes(constNorm) || normalizeText(entry?.description || "").includes(constNorm)))
        );
      }) || candidates[0];
    const rebuilt = buildElectionEvents([match], [])[0];
    if (hasMeaningfulElection(rebuilt?.election)) return rebuilt.election;
  }

  // Rebuild from title/description when nested election was stripped by schema
  try {
    const rebuilt = toElectionEvent(entry);
    if (hasMeaningfulElection(rebuilt?.election)) return rebuilt.election;
  } catch {
    /* ignore */
  }
  return null;
};

export const sanitizeTimelineForResponse = (timeline = [], options = {}) => {
  if (!Array.isArray(timeline)) return [];
  const elections = options.elections || [];

  return polishTimelineEventsForDisplay(timeline)
    .filter(
      (entry) =>
        entry?.category !== "birth" &&
        !isBirthEvent(entry) &&
        isPresent(entry?.year) &&
        isPresent(entry?.title) &&
        isPresent(entry?.category) &&
        TIMELINE_CATEGORIES.includes(entry.category) &&
        !looksLikePersonName(entry.title)
    )
    .map((entry) => {
      let election =
        entry.category === "election" || isElectionLikeEvent(entry)
          ? hydrateElectionPayload(entry, elections)
          : null;

      if (election) {
        const party = cleanPartyLabel(election.party || "", entry.year) || null;
        // Never expose corrupted type strings like "Won Won Re" to the client
        const type = normalizeElectionTypeLabel(election.type || entry.title || "Election");
        election = { ...election, party, type };
      }

      let description = cleanPartyInText(entry.description || "", entry.year);
      // Rebuild election detail line when nested party was corrected
      if (election && entry.category === "election") {
        const details = [
          election.constituency ? `Constituency: ${election.constituency}` : null,
          election.party ? `Party: ${election.party}` : null,
          election.margin != null && Number(election.margin) > 0
            ? `Margin: +${Number(election.margin).toLocaleString()}`
            : null,
          election.voteShare != null && Number(election.voteShare) > 0
            ? `Vote share: ${election.voteShare}%`
            : null,
        ].filter(Boolean);
        if (details.length) description = details.join(" · ");
      }

      return {
        id: entry.id || generateFactId(entry),
        year: String(entry.year),
        date: entry.date || null,
        category: entry.category,
        title: entry.title,
        description,
        source: entry.source || "",
        sourceUrl: isPresent(entry.sourceUrl) ? entry.sourceUrl : null,
        confidence: Number(entry.confidence) || 0,
        verifiedBy: Array.isArray(entry.verifiedBy) ? entry.verifiedBy : [],
        election,
      };
    });
};

export const sanitizeTimelineIntelligenceForResponse = () => ({});

// Legacy exports kept for tests
export const curateTimelineByDensity = (events) => events;
export const mergeCareerProgression = (events) => events;
export const scoreEventImportance = () => 0;
export const buildTimelineInsights = () => ({});
