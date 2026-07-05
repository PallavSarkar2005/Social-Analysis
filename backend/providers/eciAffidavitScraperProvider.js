import { createEmptyNormalizedProfile, normalizeWhitespace, isPresent } from "./normalizedProfile.js";
import {
  createProviderResult,
  failedProviderResult,
  scoreNormalizedData,
} from "./shared/providerResult.js";
import { fetchHtml } from "./shared/scrapeUtils.js";

const SOURCE_NAME = "Election Commission Affidavits (MyNeta)";
const SEARCH_URL = "https://myneta.info/search_myneta.php";

const scrapeAffidavitProfile = async (name, state) => {
  const searchHtml = await fetchHtml(`${SEARCH_URL}?h0=${encodeURIComponent(name)}&h1=${encodeURIComponent(state || "")}&action=Search`);
  const profileLinkMatch = searchHtml.match(/href="(candidate\.php\?candidate_id=\d+)"/i);
  if (!profileLinkMatch) return null;

  const profileUrl = `https://myneta.info/${profileLinkMatch[1]}`;
  const profileHtml = await fetchHtml(profileUrl);

  const extractLabel = (label) => {
    const regex = new RegExp(`${label}[^<]*</td>\\s*<td[^>]*>([^<]+)`, "i");
    const match = profileHtml.match(regex);
    return match?.[1] ? normalizeWhitespace(match[1]) : null;
  };

  const constituency = extractLabel("Constituency");
  const party = extractLabel("Party");
  const stateName = extractLabel("State");
  const ageText = extractLabel("Age");
  const education = extractLabel("Education");
  const profession = extractLabel("Profession");
  const assets = extractLabel("Assets");
  const liabilities = extractLabel("Liabilities");
  const criminalCasesText = extractLabel("Criminal Cases");
  const criminalCases = criminalCasesText
    ? Number(criminalCasesText.replace(/\D/g, "")) || null
    : null;

  const elections = [];
  const electionRowRegex = /<tr[^>]*>\s*<td[^>]*>(\d{4})<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
  let electionMatch;
  while ((electionMatch = electionRowRegex.exec(profileHtml)) !== null && elections.length < 10) {
    elections.push({
      year: Number(electionMatch[1]),
      election: normalizeWhitespace(electionMatch[2]),
      constituency: normalizeWhitespace(electionMatch[3]) || constituency || "",
      party: party || "",
      votes: null,
      margin: null,
      position: normalizeWhitespace(electionMatch[4]) || null,
      votePct: null,
      assets: assets || "",
      liabilities: liabilities || "",
      criminalCases,
      education: education || "",
      occupation: profession || "",
      affidavitLink: profileUrl,
      source: SOURCE_NAME,
    });
  }

  const votesMatch = profileHtml.match(/Total Votes Polled[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
  const marginMatch = profileHtml.match(/Margin[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
  const votePctMatch = profileHtml.match(/Vote\s*%[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
  const opponentMatch = profileHtml.match(/Runner[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);

  if (elections.length > 0) {
    const latest = elections[0];
    if (votesMatch) latest.votes = Number(votesMatch[1].replace(/,/g, "")) || null;
    if (marginMatch) latest.margin = Number(marginMatch[1].replace(/,/g, "")) || null;
    if (votePctMatch) latest.votePct = Number(votePctMatch[1].replace(/[^\d.]/g, "")) || null;
    if (opponentMatch) latest.opponent = normalizeWhitespace(opponentMatch[1]);
    if (opponentMatch) latest.runnerUp = normalizeWhitespace(opponentMatch[1]);
  }

  return {
    constituency,
    party,
    state: stateName,
    age: ageText ? Number(ageText.replace(/\D/g, "")) || null : null,
    education,
    profession,
    assets,
    liabilities,
    criminalCases,
    elections,
    profileUrl,
  };
};

/**
 * Scrape ECI candidate affidavit data published via MyNeta.info.
 */
export const fetchEciAffidavitProfile = async (identity) => {
  if (!identity?.name) {
    return failedProviderResult(SOURCE_NAME, SEARCH_URL);
  }

  try {
    const result = await scrapeAffidavitProfile(identity.name, identity.state);
    if (!result) {
      return failedProviderResult(SOURCE_NAME, SEARCH_URL);
    }

    const data = createEmptyNormalizedProfile();
    data.legalName = identity.name;
    data.constituency = result.constituency;
    data.party = result.party || identity.party || null;
    data.state = result.state || identity.state || null;
    data.age = result.age;
    data.education = result.education;
    data.profession = result.profession;
    data.priorCareer = result.profession;
    data.elections = result.elections;

    if (isPresent(result.constituency)) {
      data.currentPosition = /lok sabha|parliament/i.test(result.constituency)
        ? "Member of Parliament"
        : "Elected Representative";
    }

    const confidence = scoreNormalizedData(data);
    if (confidence === 0) {
      return failedProviderResult(SOURCE_NAME, result.profileUrl);
    }

    return createProviderResult({
      success: true,
      confidence,
      data,
      source: { name: SOURCE_NAME, url: result.profileUrl, type: "scrape" },
    });
  } catch (err) {
    console.error("[ECI Affidavit Scraper]", err.message);
    return failedProviderResult(SOURCE_NAME, SEARCH_URL);
  }
};
