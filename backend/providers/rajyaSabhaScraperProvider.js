import { createEmptyNormalizedProfile } from "./normalizedProfile.js";
import {
  createProviderResult,
  failedProviderResult,
  scoreNormalizedData,
} from "./shared/providerResult.js";
import {
  scrapeWithBrowser,
  stripHtml,
  extractTableLabelValue,
  namesMatch,
  parseAgeFromText,
} from "./shared/scrapeUtils.js";

const SOURCE_NAME = "Rajya Sabha (Sansad.in)";
const DIRECTORY_URL = "https://sansad.in/rs/members";

const extractMemberLinks = (html) => {
  const members = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    const linkMatch = row.match(/<a[^>]+href="(\/rs\/members\/biography\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripHtml(m[1]));
    members.push({
      url: `https://sansad.in${linkMatch[1]}`,
      name: stripHtml(linkMatch[2]),
      party: cells[1] || null,
      state: cells[2] || null,
    });
  }

  return members;
};

const parseBiographyPage = (html, fallback) => {
  const data = createEmptyNormalizedProfile();

  data.legalName =
    extractTableLabelValue(html, ["Name", "Member Name"]) ||
    stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "") ||
    fallback.name;
  data.state = extractTableLabelValue(html, ["State", "State of Election"]) || fallback.state;
  data.party = extractTableLabelValue(html, ["Party", "Political Party"]) || fallback.party;
  data.dateOfBirth = extractTableLabelValue(html, ["Date of Birth", "DOB", "Born"]);
  data.age = parseAgeFromText(data.dateOfBirth);
  data.education = extractTableLabelValue(html, ["Education", "Qualification"]);
  data.profession = extractTableLabelValue(html, ["Profession", "Occupation"]);
  data.priorCareer = data.profession;
  data.currentPosition = "Member of Rajya Sabha";
  data.currentOffice = "Parliament of India — Rajya Sabha";

  const bioBlock = html.match(/Biography[\s\S]*?<(?:div|p)[^>]*>([\s\S]*?)<\/(?:div|p|section)/i);
  data.biography = bioBlock ? stripHtml(bioBlock[1]).slice(0, 900) : null;

  return data;
};

/**
 * Scrape Rajya Sabha member directory and biography pages from sansad.in.
 */
export const fetchRajyaSabhaProfile = async (identity) => {
  if (!identity?.name) {
    return failedProviderResult(SOURCE_NAME, DIRECTORY_URL);
  }

  try {
    const directoryHtml = await scrapeWithBrowser(DIRECTORY_URL, async (page) => {
      const searchInput = page.locator('input[placeholder*="Name"], input[type="search"], input[type="text"]').first();
      if (await searchInput.count()) {
        await searchInput.fill(identity.name);
        await searchInput.press("Enter").catch(() => null);
        await page.waitForTimeout(2500);
      }
    });

    const members = extractMemberLinks(directoryHtml);
    const member =
      members.find((entry) => namesMatch(entry.name, identity.name)) ||
      members.find((entry) => entry.name.toLowerCase().includes(identity.name.split(" ").pop()?.toLowerCase() || ""));

    if (!member) {
      return failedProviderResult(SOURCE_NAME, DIRECTORY_URL);
    }

    const bioHtml = await scrapeWithBrowser(member.url);
    const data = parseBiographyPage(bioHtml, member);
    const confidence = scoreNormalizedData(data);

    if (confidence === 0) {
      return failedProviderResult(SOURCE_NAME, member.url);
    }

    return createProviderResult({
      success: true,
      confidence,
      data,
      source: { name: SOURCE_NAME, url: member.url, type: "scrape" },
    });
  } catch (err) {
    console.error("[Rajya Sabha Scraper]", err.message);
    return failedProviderResult(SOURCE_NAME, DIRECTORY_URL);
  }
};
