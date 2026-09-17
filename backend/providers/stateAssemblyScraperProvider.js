import { createEmptyNormalizedProfile } from "./normalizedProfile.js";
import {
  createProviderResult,
  failedProviderResult,
  scoreNormalizedData,
} from "./shared/providerResult.js";
import {
  fetchHtml,
  stripHtml,
  findFirstLinkMatchingName,
  namesMatch,
} from "./shared/scrapeUtils.js";

/**
 * Official state legislative assembly member listing pages.
 * Keys are matched case-insensitively against identity.state.
 */
const STATE_ASSEMBLY_TARGETS = [
  {
    state: "Delhi",
    name: "Delhi Legislative Assembly",
    url: "https://delhiassembly.nic.in/Constituency/All_MLA",
  },
  {
    state: "Uttar Pradesh",
    name: "Uttar Pradesh Legislative Assembly",
    url: "https://uplegisassembly.gov.in/Members/main.htm",
  },
  {
    state: "Maharashtra",
    name: "Maharashtra Legislative Assembly",
    url: "https://www.maharashtra.gov.in/1165/National-Parliament-Members",
  },
  {
    state: "Karnataka",
    name: "Karnataka Legislative Assembly",
    url: "https://kla.kar.nic.in/assembly/members/assemblymembers.htm",
  },
  {
    state: "West Bengal",
    name: "West Bengal Legislative Assembly",
    url: "https://wbassembly.gov.in/mla-list",
  },
  {
    state: "Tamil Nadu",
    name: "Tamil Nadu Legislative Assembly",
    url: "https://www.tnassembly.gov.in/members/list",
  },
  {
    state: "Gujarat",
    name: "Gujarat Legislative Assembly",
    url: "https://gujaratindia.gov.in/government/legislative-assembly.htm",
  },
  {
    state: "Rajasthan",
    name: "Rajasthan Legislative Assembly",
    url: "https://assembly.rajasthan.gov.in/MembersMain.aspx",
  },
];

const resolveAssemblyTarget = (state = "") => {
  const normalized = state.toLowerCase().trim();
  if (!normalized) return null;
  return STATE_ASSEMBLY_TARGETS.find((target) => normalized.includes(target.state.toLowerCase())) || null;
};

const extractMemberContext = (html, name) => {
  const lowerHtml = html.toLowerCase();
  const lowerName = name.toLowerCase();
  const index = lowerHtml.indexOf(lowerName.split(" ").pop() || lowerName);
  if (index === -1) return null;

  const snippet = html.slice(Math.max(0, index - 400), Math.min(html.length, index + 800));
  const rowMatch = snippet.match(/<tr[^>]*>[\s\S]*?<\/tr>/i);
  const text = stripHtml(rowMatch ? rowMatch[0] : snippet);

  const constituencyMatch = text.match(/(?:constituency|seat|from)\s*[:-]?\s*([A-Za-z0-9\s()-]+)/i);
  const partyMatch = text.match(/(?:party|political party)\s*[:-]?\s*([A-Za-z0-9\s()-]+)/i);

  return {
    text: text.slice(0, 600),
    constituency: constituencyMatch ? constituencyMatch[1].trim() : null,
    party: partyMatch ? partyMatch[1].trim() : null,
  };
};

/**
 * Scrape official state legislative assembly websites for MLA profiles.
 */
export const fetchStateAssemblyProfile = async (identity) => {
  const target = resolveAssemblyTarget(identity?.state || "");
  if (!identity?.name || !target) {
    return failedProviderResult(
      "State Legislative Assembly",
      target?.url || "https://sansad.in"
    );
  }

  try {
    const html = await fetchHtml(target.url);
    const link = findFirstLinkMatchingName(html, identity.name);
    let profileHtml = html;
    let profileUrl = target.url;

    if (link?.href) {
      profileUrl = link.href.startsWith("http")
        ? link.href
        : new URL(link.href, target.url).toString();
      profileHtml = await fetchHtml(profileUrl);
    }

    const context = extractMemberContext(profileHtml, identity.name);
    if (!context || !namesMatch(context.text, identity.name)) {
      return failedProviderResult(target.name, target.url);
    }

    const data = createEmptyNormalizedProfile();
    data.legalName = link?.text || identity.name;
    data.state = identity.state;
    data.constituency = context.constituency;
    data.party = context.party || identity.party || null;
    data.currentPosition = "Member of Legislative Assembly";
    data.currentOffice = target.name;
    data.biography = context.text || null;

    const confidence = scoreNormalizedData(data);
    if (confidence === 0) {
      return failedProviderResult(target.name, profileUrl);
    }

    return createProviderResult({
      success: true,
      confidence,
      data,
      source: { name: target.name, url: profileUrl, type: "scrape" },
    });
  } catch (err) {
    console.error("[State Assembly Scraper]", err.message);
    return failedProviderResult(target.name, target.url);
  }
};
