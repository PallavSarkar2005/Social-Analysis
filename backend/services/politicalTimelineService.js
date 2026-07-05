import { isPresent } from "../providers/normalizedProfile.js";
import { FACT_TYPE_TO_TIMELINE_CATEGORY, TIMELINE_CATEGORY_ORDER } from "../providers/shared/factTypes.js";
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

const CATEGORY_ORDER = TIMELINE_CATEGORY_ORDER;

const SCHOOL_PATTERN = /\b(school|ssc|matric|matriculation|secondary|high school|10th|12th|intermediate|h\.?s\.?c|s\.?s\.?c)\b/i;
const COLLEGE_PATTERN = /\b(university|college|iit|iim|mba|ph\.?d|b\.?a\.?|b\.?s\.?c|m\.?a\.?|m\.?s\.?c|degree|alma mater|graduate|b\.?tech|m\.?tech|llb|llm|md|b\.?com|m\.?com)\b/i;

const SOURCE_MATCHERS = [
  { keys: ["myneta", "election commission", "eci"], label: "Election Commission / MyNeta" },
  { keys: ["lok sabha", "sansad"], label: "Lok Sabha (Sansad.in)" },
  { keys: ["rajya sabha"], label: "Rajya Sabha" },
  { keys: ["state assembly", "assembly"], label: "State Assembly" },
  { keys: ["wikipedia"], label: "Wikipedia" },
  { keys: ["party", "bjp", "congress", "aap", "trinamool", "samajwadi", "bahujan"], label: "Official Party Website" },
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

const splitEducation = (education) => {
  if (!isVerifiedValue(education)) return { school: null, college: null };

  const text = String(education).trim();
  const segments = text.split(/[;|•\n]+/).map((segment) => segment.trim()).filter(Boolean);

  let school = null;
  let college = null;

  for (const segment of segments) {
    if (!school && SCHOOL_PATTERN.test(segment)) school = segment;
    if (!college && COLLEGE_PATTERN.test(segment)) college = segment;
  }

  if (!school && SCHOOL_PATTERN.test(text)) school = text;
  if (!college && COLLEGE_PATTERN.test(text)) college = text;

  if (!school && !college && segments.length > 1) {
    return { school: segments[0], college: segments.slice(1).join("; ") };
  }

  if (!college && !school) return { school: null, college: text };
  return { school, college };
};

const resolveSource = (sources = [], preferredKeys = []) => {
  const safeSources = Array.isArray(sources) ? sources : [];
  for (const preferred of preferredKeys) {
    const match = safeSources.find((source) =>
      normalizeText(source.name).includes(normalizeText(preferred))
    );
    if (match) {
      return {
        name: match.name,
        url: match.url || "",
        confidence: match.confidence ?? 0,
      };
    }
  }

  for (const matcher of SOURCE_MATCHERS) {
    const match = safeSources.find((source) =>
      (matcher.keys ?? []).some((key) => normalizeText(source.name).includes(key))
    );
    if (match) {
      return {
        name: match.name,
        url: match.url || "",
        confidence: match.confidence ?? 0,
      };
    }
  }

  const first = safeSources.find((source) => isVerifiedValue(source.name));
  return first
    ? { name: first.name, url: first.url || "", confidence: first.confidence ?? 0 }
    : { name: "Verified Public Records", url: "", confidence: 0 };
};

const createEvent = ({ year, title, description, source, category }) => ({
  year: String(year),
  category,
  title,
  description,
  source: source.name,
  sourceUrl: source.url || "",
  confidence: source.confidence ?? 0,
  sortKey: CATEGORY_ORDER[category] ?? 99,
});

const dedupeEvents = (events) => {
  const seen = new Set();
  const result = [];

  for (const event of events) {
    const key = `${event.year}:${event.category}:${normalizeText(event.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { sortKey, ...stored } = event;
    result.push(stored);
  }

  return result;
};

const categorizeRawEvent = (eventText = "") => {
  const text = normalizeText(eventText);
  if (text.includes("born")) return "birth";
  if (text.includes("affiliated") || text.includes("joined")) return "joinedParty";
  if (
    text.includes("assumed office") ||
    text.includes("minister") ||
    text.includes("member") ||
    text.includes("speaker") ||
    text.includes("chair")
  ) {
    return "position";
  }
  return "position";
};

const parseRawTimelineEvent = (rawEvent, sources) => {
  const year =
    extractYear(rawEvent.year) ||
    (rawEvent.year !== "—" ? extractYear(String(rawEvent.year)) : null);
  if (!year) return null;

  const text = String(rawEvent.event || "").trim();
  if (!isVerifiedValue(text)) return null;

  const category = categorizeRawEvent(text);
  const source = resolveSource(
    sources,
    category === "birth" ? ["wikipedia"] : ["lok sabha", "rajya sabha", "wikipedia"]
  );

  let title = text;
  let description = text;

  if (category === "birth") {
    title = "Birth";
    description = text.replace(/^born[:\s]*/i, "").trim() || text;
  } else if (category === "joinedParty") {
    title = "Political Party Affiliation";
    description = text;
  } else if (text.toLowerCase().startsWith("assumed office")) {
    title = "Assumed Office";
    description = text.replace(/^assumed office[:\s]*/i, "").trim();
  }

  return createEvent({ year, title, description, source, category });
};

const buildBirthEvent = (biography, sources) => {
  const year = extractYear(biography.dob);
  if (!year) return null;

  const source = resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]);
  const place = biography.dob?.includes(",")
    ? biography.dob.split(",").slice(1).join(",").trim()
    : null;

  const description = [
    isVerifiedValue(biography.dob) ? biography.dob : null,
    isVerifiedValue(place) ? `Birth place: ${place}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return createEvent({
    year,
    title: "Birth",
    description: description || `Born in ${year}`,
    source,
    category: "birth",
  });
};

const buildEducationEvents = (biography, sources) => {
  const { school, college } = splitEducation(biography.education);
  const source = resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]);
  const events = [];

  if (isVerifiedValue(school)) {
    const year = extractYear(school);
    if (year) {
      events.push(
        createEvent({
          year,
          title: "School Education",
          description: school,
          source,
          category: "school",
        })
      );
    }
  }

  if (isVerifiedValue(college) && college !== school) {
    const year = extractYear(college);
    if (year) {
      events.push(
        createEvent({
          year,
          title: "College / University",
          description: college,
          source,
          category: "college",
        })
      );
    }
  }

  return events;
};

const buildEarlyCareerEvent = (biography, sources) => {
  const career = biography.profession || biography.priorCareer;
  if (!isVerifiedValue(career)) return null;

  const politicalRole = /\b(mp|mla|minister|member of|parliament|legislative|politician|party)\b/i.test(
    career
  );
  if (politicalRole) return null;

  const year = extractYear(career);
  if (!year) return null;

  return createEvent({
    year,
    title: "Early Career",
    description: career,
    source: resolveSource(sources, ["wikipedia", "lok sabha", "myneta"]),
    category: "earlyCareer",
  });
};

const buildJoinedPartyEvent = (biography, sources) => {
  const joined = biography.dateJoinedParty;
  const year = extractYear(joined);
  const party = biography.party;

  if (!year) return null;

  const description = [
    isVerifiedValue(party) ? `Joined ${party}` : null,
    isVerifiedValue(joined) && !joined.match(/^\d{4}$/) ? joined : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return createEvent({
    year,
    title: "Joined Political Party",
    description: description || `Entered active party politics in ${year}`,
    source: resolveSource(sources, ["party", "wikipedia"]),
    category: "joinedParty",
  });
};

const buildElectionEvents = (elections = [], sources) => {
  const source = resolveSource(sources, ["myneta", "election commission"]);
  const events = [];

  for (const row of elections) {
    const year = row.year ? String(row.year) : null;
    if (!year) continue;

    const resultLabel = isVerifiedValue(row.position) ? row.position : "Contested";
    const title = `${row.election || "Election"} — ${resultLabel}`;

    const details = [
      isVerifiedValue(row.constituency) ? `Constituency: ${row.constituency}` : null,
      isVerifiedValue(row.party) ? `Party: ${row.party}` : null,
      row.votes != null && row.votes > 0 ? `Votes: ${Number(row.votes).toLocaleString()}` : null,
      row.margin != null && row.margin > 0 ? `Margin: +${Number(row.margin).toLocaleString()}` : null,
      row.votePct != null && row.votePct > 0 ? `Vote share: ${row.votePct}%` : null,
    ].filter(Boolean);

    events.push(
      createEvent({
        year,
        title,
        description: details.join(" · ") || title,
        source,
        category: "election",
      })
    );
  }

  return events;
};

const buildPositionEvents = (biography, rawTimeline = [], sources) => {
  const source = resolveSource(sources, ["lok sabha", "rajya sabha", "wikipedia", "state assembly"]);
  const events = [];

  for (const position of biography.previousPositions || []) {
    if (!isVerifiedValue(position)) continue;
    const year = extractYear(position);
    if (!year) continue;

    events.push(
      createEvent({
        year,
        title: "Political Position",
        description: position,
        source,
        category: "position",
      })
    );
  }

  for (const raw of rawTimeline) {
    const parsed = parseRawTimelineEvent(raw, sources);
    if (parsed && parsed.category === "position") {
      events.push(parsed);
    }
  }

  return events;
};

const buildCurrentOfficeEvent = (biography, elections = [], rawTimeline = [], sources) => {
  const office = biography.currentOffice || biography.currentPosition;
  if (!isVerifiedValue(office)) return null;

  let year =
    rawTimeline
      .map((entry) => {
        const text = String(entry.event || "");
        if (!/assumed office|term start|current/i.test(text)) return null;
        return extractYear(entry.year) || extractYear(text);
      })
      .find(Boolean) || null;

  if (!year) {
    const winningElections = [...elections]
      .filter((row) => isVerifiedValue(row.position) && /winner|won|elected/i.test(row.position))
      .sort((a, b) => (b.year || 0) - (a.year || 0));
    if (winningElections.length > 0) {
      year = String(winningElections[0].year);
    }
  }

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
    title: "Current Office",
    description,
    source: resolveSource(sources, ["lok sabha", "rajya sabha", "myneta", "wikipedia"]),
    category: "currentOffice",
  });
};

const sortTimeline = (events) =>
  events
    .filter((event) => {
      const numericYear = Number(event.year);
      return Number.isFinite(numericYear) && numericYear > 1800;
    })
    .sort((a, b) => {
      const yearDiff = Number(a.year) - Number(b.year);
      if (yearDiff !== 0) return yearDiff;
      return (a.sortKey ?? CATEGORY_ORDER[a.category] ?? 99) - (b.sortKey ?? CATEGORY_ORDER[b.category] ?? 99);
    })
    .map(({ sortKey, ...event }) => ({
      ...event,
      id: event.id || generateFactId(event),
    }));

const factToTimelineEvent = (fact) => {
  const category = FACT_TYPE_TO_TIMELINE_CATEGORY[fact.type];
  if (!category) return null;
  if (!fact.year) return null;

  return {
    id: generateFactId({ year: fact.year, category, title: fact.title }),
    year: String(fact.year),
    date: fact.date || null,
    category,
    title: fact.title,
    description: fact.description || fact.value || fact.title,
    source: fact.source || "",
    sourceUrl: fact.sourceUrl || "",
    confidence: fact.confidence ?? 0,
    verifiedBy: fact.verifiedBy ?? [fact.source].filter(Boolean),
    sortKey: CATEGORY_ORDER[category] ?? 99,
  };
};

/**
 * Build timeline primarily from merged facts — falls back to biography inference.
 */
export const buildTimelineFromFacts = (facts = []) => {
  const safeFacts = Array.isArray(facts) ? facts : [];
  const fromFacts = safeFacts.map(factToTimelineEvent).filter(Boolean);

  return sortTimeline(dedupeEvents(fromFacts));
};

/**
 * Build normalized political intelligence timeline from merged enrichment data.
 */
const buildCabinetCommitteeEvents = (facts = [], sources) => {
  const source = resolveSource(sources, ["lok sabha", "rajya sabha", "wikipedia"]);
  const events = [];

  for (const fact of facts) {
    if (!["Cabinet Position", "Committee"].includes(fact.type)) continue;
    if (!fact.year) continue;
    events.push(
      createEvent({
        year: fact.year,
        title: fact.title || fact.value,
        description: fact.description || fact.value,
        source: {
          name: fact.source || source.name,
          url: fact.sourceUrl || source.url,
          confidence: fact.confidence ?? source.confidence,
        },
        category: "cabinetCommittee",
      })
    );
  }

  return events;
};

const buildLegacyTimelineEvents = (biography, rawTimeline, elections, sources, facts) => {
  const events = [];

  const birth = buildBirthEvent(biography, sources);
  if (birth) events.push(birth);

  events.push(...buildEducationEvents(biography, sources));

  const earlyCareer = buildEarlyCareerEvent(biography, sources);
  if (earlyCareer) events.push(earlyCareer);

  const joinedParty = buildJoinedPartyEvent(biography, sources);
  if (joinedParty) events.push(joinedParty);

  events.push(...buildElectionEvents(elections, sources));
  events.push(...buildPositionEvents(biography, rawTimeline, sources));
  events.push(...buildCabinetCommitteeEvents(facts, sources));

  for (const raw of rawTimeline) {
    const parsed = parseRawTimelineEvent(raw, sources);
    if (parsed && !["position", "cabinetCommittee"].includes(parsed.category)) {
      events.push(parsed);
    }
  }

  const currentOffice = buildCurrentOfficeEvent(biography, elections, rawTimeline, sources);
  if (currentOffice) events.push(currentOffice);

  return events;
};

export const buildIntelligenceTimeline = ({
  biography = {},
  rawTimeline = [],
  elections = [],
  sources = [],
  facts = [],
}) => {
  const factEvents = facts.length > 0 ? buildTimelineFromFacts(facts) : [];
  const legacyEvents = buildLegacyTimelineEvents(
    biography,
    Array.isArray(rawTimeline) ? rawTimeline : [],
    Array.isArray(elections) ? elections : [],
    Array.isArray(sources) ? sources : [],
    Array.isArray(facts) ? facts : []
  );
  return sortTimeline(dedupeEvents([...factEvents, ...legacyEvents].filter(Boolean)));
};

/**
 * Sanitize stored timeline for API responses — drops legacy { year, event } rows.
 */
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
    }));
};
