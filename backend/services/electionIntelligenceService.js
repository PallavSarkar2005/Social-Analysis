import { isVerifiedValue } from "./politicalFactEngine.js";

const mergeElectionRow = (existing, incoming) => {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (!isVerifiedValue(value) && value !== 0) continue;
    if (!isVerifiedValue(merged[key]) && merged[key] !== 0) {
      merged[key] = value;
    } else if (typeof value === "number" && value > (merged[key] || 0)) {
      merged[key] = value;
    }
  }
  if (incoming.source && !merged.source) merged.source = incoming.source;
  if (incoming.affidavitLink && !merged.affidavitLink) merged.affidavitLink = incoming.affidavitLink;
  return merged;
};

/**
 * Build enriched election intelligence records from provider election data.
 */
export const buildElectionIntelligence = (providerElections = [], biography = {}, sources = []) => {
  const eciSource = sources.find((s) => /myneta|election commission|eci/i.test(s.name || ""));
  const defaultSource = eciSource?.name || "Election Commission / MyNeta";
  const defaultUrl = eciSource?.url || "";

  const byKey = new Map();

  for (const rows of providerElections ?? []) {
    const safeRows = Array.isArray(rows) ? rows : [];
    for (const row of safeRows) {
      if (!row?.year) continue;
      const key = `${row.year}:${row.election || "general"}:${row.constituency || ""}`;
      const enriched = {
        election: row.election || "General Election",
        year: Number(row.year),
        constituency: row.constituency || biography.constituency || "",
        party: row.party || biography.party || "",
        opponent: row.opponent || "",
        votes: row.votes ?? null,
        voteShare: row.votePct ?? row.voteShare ?? null,
        margin: row.margin ?? null,
        winner: /winner|won|elected/i.test(row.position || "") ? biography.fullName || "Winner" : row.winner || "",
        runnerUp: row.runnerUp || row.opponent || "",
        turnout: row.turnout ?? null,
        assets: row.assets ?? null,
        liabilities: row.liabilities ?? null,
        criminalCases: row.criminalCases ?? null,
        education: row.education || biography.education || "",
        occupation: row.occupation || biography.profession || "",
        affidavitLink: row.affidavitLink || defaultUrl,
        source: row.source || defaultSource,
        position: row.position || "",
      };

      if (byKey.has(key)) {
        byKey.set(key, mergeElectionRow(byKey.get(key), enriched));
      } else {
        byKey.set(key, enriched);
      }
    }
  }

  return Array.from(byKey.values())
    .filter((row) => row.year)
    .sort((a, b) => b.year - a.year);
};

/**
 * Legacy-compatible elections array for backward compatibility.
 */
export const toLegacyElections = (intelligence = []) =>
  (Array.isArray(intelligence) ? intelligence : []).map((row) => ({
    year: row.year,
    election: row.election,
    constituency: row.constituency,
    party: row.party,
    votes: row.votes || 0,
    margin: row.margin || 0,
    position: row.position || (row.winner ? "Winner" : "Contested"),
    votePct: row.voteShare || 0,
  }));
