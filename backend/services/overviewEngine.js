import { isVerifiedValue } from "./politicalFactEngine.js";

const extractYear = (text) => {
  if (!isVerifiedValue(text)) return null;
  const match = String(text).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

/**
 * Generate intelligence overview cards from stored profile data only.
 */
export const buildIntelligenceOverview = ({
  biography = {},
  account = {},
  elections = [],
  electionIntelligence = [],
  confidenceBreakdown = {},
  influence = {},
  timeline = [],
  lastVerified = null,
}) => {
  const cards = [];
  const electionRows = electionIntelligence.length > 0 ? electionIntelligence : elections;

  const firstElectionYear = electionRows.reduce((min, row) => {
    const y = Number(row.year);
    return y && (!min || y < min) ? y : min;
  }, null);

  const joinedYear = extractYear(biography.dateJoinedParty);
  const startYear = firstElectionYear || joinedYear;
  if (startYear) {
    const yearsInPolitics = new Date().getFullYear() - startYear;
    if (yearsInPolitics > 0) {
      cards.push({
        key: "yearsInPolitics",
        label: "Years in Politics",
        value: `${yearsInPolitics}+`,
        confidence: confidenceBreakdown.electionHistory || 0,
      });
    }
  }

  if (isVerifiedValue(biography.currentOffice) || isVerifiedValue(biography.currentPosition)) {
    cards.push({
      key: "currentOffice",
      label: "Current Office",
      value: biography.currentOffice || biography.currentPosition,
      confidence: confidenceBreakdown.biography || 0,
    });
  }

  if (isVerifiedValue(biography.party)) {
    cards.push({
      key: "currentParty",
      label: "Current Party",
      value: biography.party,
      confidence: confidenceBreakdown.identity || 0,
    });
  }

  if (isVerifiedValue(biography.constituency)) {
    cards.push({
      key: "constituency",
      label: "Constituency",
      value: biography.constituency,
      confidence: confidenceBreakdown.electionHistory || 0,
    });
  }

  if (electionRows.length > 0) {
    cards.push({
      key: "electionCount",
      label: "Elections Contested",
      value: String(electionRows.length),
      confidence: confidenceBreakdown.electionHistory || 0,
    });

    const wins = electionRows.filter(
      (r) => /winner|won|elected/i.test(r.position || "") || r.winner
    ).length;
    if (wins > 0) {
      const winRate = Math.round((wins / electionRows.length) * 100);
      cards.push({
        key: "winRate",
        label: "Win Rate",
        value: `${winRate}%`,
        confidence: confidenceBreakdown.electionHistory || 0,
      });
    }
  }

  if (confidenceBreakdown.overall > 0) {
    cards.push({
      key: "verificationScore",
      label: "Verification Score",
      value: `${confidenceBreakdown.overall}%`,
      confidence: confidenceBreakdown.overall,
    });
  }

  if (influence.digitalInfluence > 0 || account.subscribers > 0) {
    cards.push({
      key: "reachScore",
      label: "Reach Score",
      value: `${influence.digitalInfluence || Math.min(100, Math.round(Math.log10(Math.max(account.subscribers || 1, 1)) * 14))}%`,
      confidence: influence.engagementScore || 0,
    });
  }

  if (influence.digitalInfluence > 0) {
    cards.push({
      key: "influenceScore",
      label: "Influence Score",
      value: `${influence.digitalInfluence}%`,
      confidence: influence.trustScore || 0,
    });
  }

  const latestEvent = [...timeline].sort((a, b) => Number(b.year) - Number(a.year))[0];
  if (latestEvent) {
    cards.push({
      key: "latestActivity",
      label: "Latest Milestone",
      value: `${latestEvent.year}: ${latestEvent.title}`,
      confidence: latestEvent.confidence || 0,
    });
  }

  if (lastVerified) {
    cards.push({
      key: "lastVerified",
      label: "Last Verified",
      value: new Date(lastVerified).toLocaleDateString(),
      confidence: confidenceBreakdown.overall || 0,
    });
  }

  return cards;
};
