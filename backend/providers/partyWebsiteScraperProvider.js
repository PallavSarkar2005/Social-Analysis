import { createEmptyNormalizedProfile, normalizeWhitespace } from "./normalizedProfile.js";
import {
  createProviderResult,
  failedProviderResult,
  scoreNormalizedData,
} from "./shared/providerResult.js";
import { fetchHtml, stripHtml } from "./shared/scrapeUtils.js";

const PARTY_SITES = {
  bjp: {
    name: "Bharatiya Janata Party",
    leadershipUrl: "https://www.bjp.org/en/leadership",
    baseUrl: "https://www.bjp.org",
  },
  inc: {
    name: "Indian National Congress",
    leadershipUrl: "https://inc.in/en/leadership",
    baseUrl: "https://inc.in",
  },
  aap: {
    name: "Aam Aadmi Party",
    leadershipUrl: "https://aamadmiparty.org/leaders",
    baseUrl: "https://aamadmiparty.org",
  },
  tmc: {
    name: "All India Trinamool Congress",
    leadershipUrl: "https://aitmc.org",
    baseUrl: "https://aitmc.org",
  },
  sp: {
    name: "Samajwadi Party",
    leadershipUrl: "https://samajwadiparty.in",
    baseUrl: "https://samajwadiparty.in",
  },
  bsp: {
    name: "Bahujan Samaj Party",
    leadershipUrl: "https://www.bspindia.org",
    baseUrl: "https://www.bspindia.org",
  },
};

const resolvePartySite = (party = "") => {
  const normalized = party.toLowerCase();
  if (normalized.includes("bjp") || normalized.includes("bharatiya janata")) return PARTY_SITES.bjp;
  if (normalized.includes("congress") || normalized.includes("inc")) return PARTY_SITES.inc;
  if (normalized.includes("aam aadmi") || normalized.includes("aap")) return PARTY_SITES.aap;
  if (normalized.includes("trinamool") || normalized.includes("tmc")) return PARTY_SITES.tmc;
  if (normalized.includes("samajwadi")) return PARTY_SITES.sp;
  if (normalized.includes("bahujan") || normalized.includes("bsp")) return PARTY_SITES.bsp;
  return null;
};

const extractLeaderSection = (html, leaderName) => {
  const lastName = leaderName.split(" ").pop()?.toLowerCase() || "";
  const lowerHtml = html.toLowerCase();
  const index = lowerHtml.indexOf(lastName);
  if (index === -1) return null;

  const snippet = html.slice(Math.max(0, index - 250), Math.min(html.length, index + 700));
  return normalizeWhitespace(stripHtml(snippet));
};

/**
 * Scrape official political party websites for leadership bios.
 */
export const fetchPartyWebsiteProfile = async (identity) => {
  const site = resolvePartySite(identity?.party || "");
  if (!identity?.name || !site) {
    return failedProviderResult("Official Party Website");
  }

  try {
    const html = await fetchHtml(site.leadershipUrl);
    const snippet = extractLeaderSection(html, identity.name);

    if (!snippet || !snippet.toLowerCase().includes(identity.name.split(" ").pop()?.toLowerCase() || "")) {
      return failedProviderResult(`${site.name} Official Website`, site.leadershipUrl);
    }

    const data = createEmptyNormalizedProfile();
    data.legalName = identity.name;
    data.party = site.name;
    data.officialWebsite = site.baseUrl;
    data.biography = snippet.length > 600 ? `${snippet.slice(0, 597)}...` : snippet;

    if (/president|national president/i.test(snippet)) {
      data.currentPosition = "Party President";
    } else if (/chief minister/i.test(snippet)) {
      data.currentPosition = "Chief Minister";
    } else if (/general secretary/i.test(snippet)) {
      data.currentPosition = "General Secretary";
    }

    const confidence = scoreNormalizedData(data);
    if (confidence === 0) {
      return failedProviderResult(`${site.name} Official Website`, site.leadershipUrl);
    }

    return createProviderResult({
      success: true,
      confidence,
      data,
      source: { name: `${site.name} Official Website`, url: site.leadershipUrl, type: "scrape" },
    });
  } catch (err) {
    console.error("[Party Website Scraper]", err.message);
    return failedProviderResult(`${site.name} Official Website`, site.leadershipUrl);
  }
};
