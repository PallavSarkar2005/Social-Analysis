import { isPresent, normalizeWhitespace } from "../normalizedProfile.js";
import { SOURCE_DISPLAY_NAMES } from "./factTypes.js";

const extractYear = (text) => {
  if (!isPresent(text)) return null;
  const match = String(text).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
};

const SCHOOL_PATTERN = /\b(school|ssc|matric|matriculation|secondary|high school|10th|12th|intermediate|h\.?s\.?c|s\.?s\.?c)\b/i;
const COLLEGE_PATTERN = /\b(university|college|iit|iim|mba|ph\.?d|b\.?a\.?|b\.?s\.?c|m\.?a\.?|m\.?s\.?c|degree|alma mater|graduate|b\.?tech|m\.?tech|llb|llm|md|b\.?com|m\.?com)\b/i;

const createFact = ({
  type,
  title,
  description = "",
  value = "",
  date = null,
  year = null,
  confidence = 0,
  source = "",
  sourceUrl = "",
}) => ({
  type,
  title,
  description: description || value || title,
  value: value || description || title,
  date,
  year: year ? String(year) : null,
  confidence,
  source,
  sourceUrl: sourceUrl || "",
});

const splitEducationFacts = (education, sourceName, sourceUrl, confidence) => {
  if (!isPresent(education)) return [];
  const text = String(education).trim();
  const segments = text.split(/[;|•\n]+/).map((s) => s.trim()).filter(Boolean);
  const facts = [];

  for (const segment of segments) {
    const year = extractYear(segment);
    if (SCHOOL_PATTERN.test(segment)) {
      facts.push(
        createFact({
          type: "School Education",
          title: "School Education",
          value: segment,
          year,
          confidence,
          source: sourceName,
          sourceUrl,
        })
      );
    } else if (COLLEGE_PATTERN.test(segment)) {
      facts.push(
        createFact({
          type: "College Education",
          title: "College / University",
          value: segment,
          year,
          confidence,
          source: sourceName,
          sourceUrl,
        })
      );
    }
  }

  if (facts.length === 0) {
    facts.push(
      createFact({
        type: COLLEGE_PATTERN.test(text) ? "College Education" : "School Education",
        title: "Education",
        value: text,
        year: extractYear(text),
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  return facts;
};

const categorizeTimelineEvent = (eventText) => {
  const text = String(eventText || "").toLowerCase();
  if (text.includes("born")) return "Birth";
  if (text.includes("affiliated") || text.includes("joined")) return "Party Join";
  if (text.includes("assumed office") || text.includes("minister")) return "Government Position";
  if (text.includes("member of lok sabha") || text.includes("lok sabha")) return "Parliament Membership";
  if (text.includes("member of rajya sabha") || text.includes("rajya sabha")) return "Parliament Membership";
  if (text.includes("mla") || text.includes("legislative assembly")) return "Assembly Membership";
  if (text.includes("election") || text.includes("elected")) return "Election";
  return "Government Position";
};

/**
 * Convert a provider's normalized profile payload into normalized facts.
 */
export const extractFactsFromProviderData = (data, providerKey, sourceMeta, confidence = 0) => {
  if (!data) return [];

  const sourceName = SOURCE_DISPLAY_NAMES[providerKey] || sourceMeta?.name || providerKey;
  const sourceUrl = sourceMeta?.url || "";
  const facts = [];

  if (isPresent(data.dateOfBirth)) {
    const dob = String(data.dateOfBirth);
    const year = extractYear(dob);
    facts.push(
      createFact({
        type: "Birth",
        title: "Date of Birth",
        value: dob,
        date: dob,
        year,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );

    const commaParts = dob.split(",").map((p) => p.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      const place = commaParts.slice(1).join(", ");
      if (isPresent(place)) {
        facts.push(
          createFact({
            type: "Birth Place",
            title: "Birth Place",
            value: place,
            confidence,
            source: sourceName,
            sourceUrl,
          })
        );
      }
    }
  }

  if (isPresent(data.gender)) {
    facts.push(
      createFact({
        type: "Birth",
        title: "Gender",
        value: data.gender,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  facts.push(...splitEducationFacts(data.education, sourceName, sourceUrl, confidence));

  if (isPresent(data.profession)) {
    facts.push(
      createFact({
        type: "Profession",
        title: "Profession",
        value: data.profession,
        year: extractYear(data.profession),
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.priorCareer) && data.priorCareer !== data.profession) {
    facts.push(
      createFact({
        type: "Profession",
        title: "Prior Career",
        value: data.priorCareer,
        year: extractYear(data.priorCareer),
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.party)) {
    facts.push(
      createFact({
        type: "Political Party",
        title: "Political Party",
        value: data.party,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.joinedParty)) {
    facts.push(
      createFact({
        type: "Party Join",
        title: "Joined Political Party",
        value: data.joinedParty,
        year: extractYear(data.joinedParty),
        date: data.joinedParty,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.constituency)) {
    facts.push(
      createFact({
        type: "Election",
        title: "Constituency",
        value: data.constituency,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.state)) {
    facts.push(
      createFact({
        type: "Government Position",
        title: "State",
        value: data.state,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.currentPosition)) {
    facts.push(
      createFact({
        type: "Government Position",
        title: "Current Position",
        value: data.currentPosition,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.currentOffice)) {
    facts.push(
      createFact({
        type: "Current Office",
        title: "Current Office",
        value: data.currentOffice,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  if (isPresent(data.wikipediaLink)) {
    facts.push(
      createFact({
        type: "Social Milestone",
        title: "Wikipedia",
        value: data.wikipediaLink,
        confidence,
        source: sourceName,
        sourceUrl: data.wikipediaLink,
      })
    );
  }

  if (isPresent(data.officialWebsite)) {
    facts.push(
      createFact({
        type: "Social Milestone",
        title: "Official Website",
        value: data.officialWebsite,
        confidence,
        source: sourceName,
        sourceUrl: data.officialWebsite,
      })
    );
  }

  for (const position of data.previousPositions || []) {
    if (!isPresent(position)) continue;
    facts.push(
      createFact({
        type: "Government Position",
        title: "Political Position",
        value: position,
        year: extractYear(position),
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  for (const row of data.elections || []) {
    const year = row.year ? String(row.year) : null;
    const title = `${row.election || "Election"}${row.position ? ` — ${row.position}` : ""}`;
    const details = [
      row.constituency ? `Constituency: ${row.constituency}` : null,
      row.party ? `Party: ${row.party}` : null,
      row.votes ? `Votes: ${Number(row.votes).toLocaleString()}` : null,
      row.margin ? `Margin: +${Number(row.margin).toLocaleString()}` : null,
      row.votePct ? `Vote share: ${row.votePct}%` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    facts.push(
      createFact({
        type: "Election",
        title,
        description: details || title,
        value: row.constituency || row.election || title,
        year,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  for (const raw of data.timeline || []) {
    const eventText = normalizeWhitespace(raw.event || "");
    if (!isPresent(eventText)) continue;
    const year = extractYear(raw.year) || extractYear(eventText);
    if (!year) continue;

    const factType = categorizeTimelineEvent(eventText);
    facts.push(
      createFact({
        type: factType,
        title: eventText.slice(0, 120),
        value: eventText,
        year,
        confidence,
        source: sourceName,
        sourceUrl,
      })
    );
  }

  return facts;
};
