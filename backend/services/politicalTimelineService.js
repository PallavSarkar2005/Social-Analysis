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

const eventText = (event) =>
  normalizeText([event?.title, event?.description, event?.value].filter(Boolean).join(" "));

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
  const election = {
    year,
    type: row.election || "Election",
    constituency: row.constituency || null,
    party: row.party || null,
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

export const normalizeTimelineEvent = (event) => {
  if (!event) return null;
  let { category, title, description } = event;
  description = String(description || event.value || title || "").trim();
  title = String(title || "").trim();

  if (isBirthEvent(event)) {
    return createEvent({ ...event, category: "birth", title: "Birth", description });
  }
  if (isPartyEvent(event)) {
    return createEvent({ ...event, category: "joinedParty", title: "Party Entry", description });
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
  const other = [];

  for (const raw of events) {
    const event = normalizeTimelineEvent(raw);
    if (!event?.year) continue;

    if (isBirthEvent(event)) {
      birth = pickBestEvent(birth, event);
    } else if (isEducationEvent(event)) {
      education = pickBestEvent(education, event);
    } else if (isPartyEvent(event)) {
      party = pickBestEvent(party, event);
    } else if (isCurrentOfficeEvent(event)) {
      currentOffice = pickBestEvent(currentOffice, event);
    } else if (event.category === "election") {
      elections.push(event);
    } else if (isMajorAppointment(event)) {
      appointments.push(event);
    } else if (!isCurrentOfficeEvent(event)) {
      other.push(event);
    }
  }

  return { birth, education, party, currentOffice, elections, appointments, other };
};

const dedupeElections = (elections) => {
  const seen = new Set();
  const result = [];
  for (const event of elections) {
    const key = `${event.year}:${normalizeText(event.election?.constituency || event.description)}:${normalizeText(event.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result.sort((a, b) => Number(a.year) - Number(b.year));
};

const dedupeAppointments = (appointments) => {
  const seen = new Set();
  const result = [];
  for (const event of appointments) {
    const key = `${event.year}:${normalizeText(event.title)}:${normalizeText(event.description).slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result.sort((a, b) => Number(a.year) - Number(b.year));
};

const mergeChronologicalMiddle = (elections, appointments) =>
  [...dedupeElections(elections), ...dedupeAppointments(appointments)].sort(
    (a, b) => Number(a.year) - Number(b.year)
  );

const buildBirthEvent = (biography, sources, facts) => {
  const fromBio = extractYear(biography.dob);
  const birthFact = (facts || []).find((f) => f.type === "Birth" && f.year);
  const year = fromBio || birthFact?.year;
  if (!year) return null;

  const description = [
    isVerifiedValue(biography.dob) ? biography.dob : null,
    birthFact?.value || birthFact?.description,
  ]
    .filter(Boolean)
    .join(" · ");

  return createEvent({
    year,
    title: "Birth",
    description: description || `Born in ${year}`,
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

  const party = biography.party || partyFact?.value || partyFact?.description;
  const description = isVerifiedValue(party) ? `Joined ${party}` : partyFact?.description || "Party Entry";

  return createEvent({
    year,
    title: "Party Entry",
    description,
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
      .sort((a, b) => (b.year || 0) - (a.year || 0))[0]?.year;

  if (year) year = String(year);
  if (!year) return null;

  const description = [
    office,
    isVerifiedValue(biography.constituency) ? `Constituency: ${biography.constituency}` : null,
    isVerifiedValue(biography.party) ? `Party: ${biography.party}` : null,
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
          description: entry.description || "",
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

  const timeline = [birth, education, party, ...middle, current].filter(Boolean);

  return timeline.map((event) => ({
    ...event,
    id: event.id || generateFactId(event),
  }));
};

const collectRawEvents = ({ biography, rawTimeline, elections, sources, facts, storedTimeline }) => {
  const events = [];

  events.push(buildBirthEvent(biography, sources, facts));
  events.push(buildEducationEvent(biography, sources, facts));
  events.push(buildPartyEvent(biography, sources, facts));
  events.push(...buildElectionEvents(elections, sources));
  events.push(...buildAppointmentEvents(biography, facts, rawTimeline, sources));

  for (const fact of facts || []) {
    const mapped = factToTimelineEvent(fact);
    if (mapped) events.push(mapped);
  }

  events.push(...ingestStoredTimeline(storedTimeline, sources));

  for (const raw of rawTimeline || []) {
    const text = String(raw.event || "").trim();
    const year = extractYear(raw.year) || extractYear(text);
    if (!year || !isVerifiedValue(text)) continue;
    if (/\b(born|birth)\b/i.test(text)) {
      events.push(
        createEvent({
          year,
          title: "Birth",
          description: text,
          source: resolveSource(sources, ["wikipedia"]),
          category: "birth",
        })
      );
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
 * Build a clean storytelling timeline: Birth → Education → Party → Elections & Appointments → Current Role.
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
  return assembleStoryTimeline(pools, biography, elections, sources);
};

export const buildTimelineFromFacts = (facts = []) =>
  buildIntelligenceTimeline({ facts: Array.isArray(facts) ? facts : [] });

export const refineStoredTimeline = (storedTimeline = [], biography = {}) =>
  buildIntelligenceTimeline({ biography, storedTimeline });

/** @deprecated Intelligence layer removed — returns timeline only. */
export const buildCareerTimelinePackage = (params) => ({
  timeline: buildIntelligenceTimeline(params),
  timelineIntelligence: {},
});

export const sanitizeTimelineForResponse = (timeline = []) => {
  if (!Array.isArray(timeline)) return [];

  return timeline
    .filter(
      (entry) =>
        isPresent(entry?.year) &&
        isPresent(entry?.title) &&
        isPresent(entry?.category) &&
        TIMELINE_CATEGORIES.includes(entry.category)
    )
    .map((entry) => ({
      id: entry.id || generateFactId(entry),
      year: String(entry.year),
      date: entry.date || null,
      category: entry.category,
      title: entry.title,
      description: entry.description || "",
      source: entry.source || "",
      sourceUrl: isPresent(entry.sourceUrl) ? entry.sourceUrl : null,
      confidence: Number(entry.confidence) || 0,
      verifiedBy: Array.isArray(entry.verifiedBy) ? entry.verifiedBy : [],
      election: entry.election || null,
    }));
};

export const sanitizeTimelineIntelligenceForResponse = () => ({});

// Legacy exports kept for tests
export const curateTimelineByDensity = (events) => events;
export const mergeCareerProgression = (events) => events;
export const scoreEventImportance = () => 0;
export const buildTimelineInsights = () => ({});
