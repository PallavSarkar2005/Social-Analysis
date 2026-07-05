import { isVerifiedValue } from "./politicalFactEngine.js";

const extractYear = (text) => {
  if (!isVerifiedValue(text)) return null;
  const match = String(text).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

const isWin = (row) =>
  /winner|won|elected/i.test(row.position || "") ||
  (row.winner && !/runner|lost/i.test(row.position || ""));

/**
 * Compute political statistics purely from stored verified data.
 */
export const buildPoliticalStatistics = ({
  biography = {},
  elections = [],
  electionIntelligence = [],
  facts = [],
  timeline = [],
  lastVerified = null,
}) => {
  const safeElections = Array.isArray(elections) ? elections : [];
  const safeElectionIntelligence = Array.isArray(electionIntelligence) ? electionIntelligence : [];
  const safeFacts = Array.isArray(facts) ? facts : [];
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const electionRows = safeElectionIntelligence.length > 0 ? safeElectionIntelligence : safeElections;
  const stats = [];

  const firstElectionYear = electionRows.reduce((min, row) => {
    const y = Number(row.year);
    return y && (!min || y < min) ? y : min;
  }, null);

  const joinedYear = extractYear(biography.dateJoinedParty);
  const firstTimelineYear = safeTimeline.reduce((min, e) => {
    const y = Number(e.year);
    return y && (!min || y < min) ? y : min;
  }, null);

  const startYear = firstElectionYear || joinedYear || firstTimelineYear;
  if (startYear) {
    const years = new Date().getFullYear() - startYear;
    if (years > 0) {
      stats.push({ key: "yearsInPolitics", label: "Years in Politics", value: String(years) });
    }
  }

  if (electionRows.length > 0) {
    stats.push({
      key: "electionsContested",
      label: "Elections Contested",
      value: String(electionRows.length),
    });

    const wins = electionRows.filter(isWin).length;
    if (wins > 0) {
      stats.push({ key: "electionsWon", label: "Elections Won", value: String(wins) });
      stats.push({
        key: "winRate",
        label: "Win Rate",
        value: `${Math.round((wins / electionRows.length) * 100)}%`,
      });
    }
  }

  const offices = new Set();
  for (const pos of biography.previousPositions ?? []) {
    if (isVerifiedValue(pos)) offices.add(pos);
  }
  for (const fact of safeFacts) {
    if (
      ["Government Position", "Cabinet Position", "Current Office", "Appointment"].includes(fact.type) &&
      isVerifiedValue(fact.value)
    ) {
      offices.add(fact.value);
    }
  }
  for (const event of safeTimeline) {
    if (["position", "cabinetCommittee", "currentOffice"].includes(event.category)) {
      if (isVerifiedValue(event.title)) offices.add(event.title);
    }
  }
  if (offices.size > 0) {
    stats.push({ key: "officesHeld", label: "Offices Held", value: String(offices.size) });
  }

  if (isVerifiedValue(biography.currentOffice) || isVerifiedValue(biography.currentPosition)) {
    stats.push({
      key: "currentOffice",
      label: "Current Office",
      value: biography.currentOffice || biography.currentPosition,
    });
  }

  const committees = safeFacts
    .filter((f) => f.type === "Committee" && isVerifiedValue(f.value))
    .map((f) => f.value);
  const cabinetRoles = safeFacts
    .filter((f) => f.type === "Cabinet Position" && isVerifiedValue(f.value))
    .map((f) => f.value);
  const committeeCount = new Set([...committees, ...cabinetRoles]).size;

  if (committeeCount > 0) {
    stats.push({ key: "committees", label: "Committees & Cabinet Roles", value: String(committeeCount) });
  }

  if (startYear) {
    const experienceYears = new Date().getFullYear() - startYear;
    if (experienceYears > 0) {
      stats.push({
        key: "experience",
        label: "Political Experience",
        value: `${experienceYears} years`,
      });
    }
  }

  if (lastVerified) {
    stats.push({
      key: "lastVerified",
      label: "Last Verified",
      value: new Date(lastVerified).toLocaleDateString(),
    });
  }

  return stats;
};
