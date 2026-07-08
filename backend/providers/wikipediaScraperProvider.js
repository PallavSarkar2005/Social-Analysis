import {
  createEmptyNormalizedProfile,
  parseAgeFromBirthDate,
} from "./normalizedProfile.js";
import {
  createProviderResult,
  failedProviderResult,
  scoreNormalizedData,
} from "./shared/providerResult.js";
import {
  fetchHtml,
  stripHtml,
  extractInfoboxPairs,
  pickInfoboxValue,
  extractYear,
  namesMatch,
} from "./shared/scrapeUtils.js";
import { stripHonorifics } from "./shared/politicalIdentityUtils.js";
import { WIKIPEDIA_ELECTION_PAGE_PATTERN,
  isWikipediaElectionPage,
} from "./shared/wikipediaValidation.js";

const SOURCE_NAME = "Wikipedia";
const BASE_URL = "https://en.wikipedia.org";

const stripWikiMarkup = (value = "") =>
  stripHtml(String(value).replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

const mapGender = (value) => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("female")) return "Female";
  if (lower.includes("male")) return "Male";
  return null;
};

const inferStateFromBorn = (bornText = "") => {
  if (!bornText) return null;
  const match = bornText.match(/,\s*([^,]+),\s*India/i);
  return match?.[1]?.trim() || null;
};

const isPersonArticle = (html, article, identity) => {
  const url = article.url || "";
  if (isWikipediaElectionPage(url)) return false;
  if (!/infobox\s+vcard|infobox\s+officeholder/i.test(html)) return false;

  const title = article.title || identity.searchName || identity.name;
  if (!namesMatch(title, identity.searchName || identity.name)) return false;

  const pageText = stripHtml(html).slice(0, 4000);
  if (/Indian politician|chief minister|member of parliament|member of.*legislative assembly/i.test(pageText)) {
    return true;
  }

  const pairs = extractInfoboxPairs(html);
  return Boolean(
    pickInfoboxValue(pairs, ["born", "birth date"]) ||
      pickInfoboxValue(pairs, ["party", "office", "constituency"])
  );
};

const buildTimelineFromInfobox = (pairs) => {
  const events = [];
  const birth = pickInfoboxValue(pairs, ["born", "birth date"]);
  const birthYear = extractYear(birth);
  if (birthYear) events.push({ year: birthYear, event: "Born" });

  const office = pickInfoboxValue(pairs, ["office", "title"]);
  const termStart = pickInfoboxValue(pairs, ["term start", "assumed office"]);
  const termYear = extractYear(termStart);
  if (office && termYear) {
    events.push({ year: termYear, event: `Assumed office: ${office}` });
  }

  const party = pickInfoboxValue(pairs, ["party", "other party"]);
  if (party) {
    events.push({ year: "—", event: `Affiliated with ${party}` });
  }

  return events;
};

const parseWikipediaCategories = (html) => {
  const match = html.match(/"wgCategories":(\[[\s\S]*?\])\s*,\s*"wgPageViewLanguage"/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
};

const extractElectionsFromWikipedia = (html, pairs, identity) => {
  const elections = [];
  const party = pickInfoboxValue(pairs, ["party", "other party"]) || identity.party || "";
  const constituency =
    pickInfoboxValue(pairs, ["constituency", "constituency mp", "constituency mla"]) || "";
  const born = pickInfoboxValue(pairs, ["born", "birth date"]);
  const state = inferStateFromBorn(born) || identity.state || "";

  const pushElection = (row) => {
    if (!row?.year) return;
    const key = `${row.year}:${row.election}:${row.constituency}`;
    if (elections.some((e) => `${e.year}:${e.election}:${e.constituency}` === key)) return;
    elections.push({
      year: row.year,
      election: row.election,
      constituency: row.constituency || constituency || "",
      party: row.party || party || "",
      votes: null,
      margin: null,
      position: row.position || "Elected",
      votePct: null,
      source: SOURCE_NAME,
    });
  };

  for (const category of parseWikipediaCategories(html)) {
    const mla = category.match(/^(.+?)\s+MLAs?\s+(\d{4})[–-](\d{4})$/);
    if (mla) {
      pushElection({
        year: Number(mla[2]),
        election: `${mla[1]} Legislative Assembly`,
        constituency,
        party,
        position: "Elected MLA",
      });
      continue;
    }

    const mp = category.match(/^(.+?)\s+MPs?\s+(\d{4})[–-](\d{4})$/);
    if (mp) {
      pushElection({
        year: Number(mp[2]),
        election: `${mp[1]} Lok Sabha`,
        constituency,
        party,
        position: "Elected MP",
      });
    }
  }

  const officeByIndex = {};
  const constituencyByIndex = {};
  for (const match of html.matchAll(/office(\d*)":\{"wt":"([^"]+)"/g)) {
    officeByIndex[match[1] || "0"] = stripWikiMarkup(match[2]);
  }
  for (const match of html.matchAll(/constituency(\d*)":\{"wt":"([^"]+)"/g)) {
    constituencyByIndex[match[1] || "0"] = stripWikiMarkup(match[2]);
  }

  for (const match of html.matchAll(/term_start(\d*)":\{"wt":"(\d{4})"\}/g)) {
    const index = match[1] || "0";
    const office = officeByIndex[index] || "";
    if (!/member of|legislative assembly|lok sabha|parliament/i.test(office)) continue;

    const electionLabel = /lok sabha|parliament/i.test(office)
      ? "Lok Sabha"
      : state
        ? `${state} Legislative Assembly`
        : "Legislative Assembly";

    pushElection({
      year: Number(match[2]),
      election: electionLabel,
      constituency: constituencyByIndex[index] || constituency,
      party,
      position: "Elected",
    });
  }

  return elections.sort((a, b) => b.year - a.year);
};

const resolveArticleUrl = async (identity) => {
  const searchName = identity.searchName || stripHonorifics(identity.name) || identity.name;
  const queries = [
    `${searchName} Indian politician ${identity.state || ""}`.trim(),
    `${searchName} Indian politician`,
    searchName,
  ];

  for (const query of queries) {
    const searchUrl = `${BASE_URL}/w/index.php?search=${encodeURIComponent(query)}&title=Special:Search`;
    const searchHtml = await fetchHtml(searchUrl);

    if (searchHtml.includes('class="mw-search-result-heading"')) {
      const resultRegex =
        /class="mw-search-result-heading"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let resultMatch;
      while ((resultMatch = resultRegex.exec(searchHtml)) !== null) {
        const href = resultMatch[1].startsWith("http")
          ? resultMatch[1]
          : `${BASE_URL}${resultMatch[1]}`;
        const candidate = {
          url: href.split("#")[0],
          title: stripHtml(resultMatch[2]),
        };
        if (!isWikipediaElectionPage(candidate.url)) {
          return candidate;
        }
      }
    }

    const directMatch = searchHtml.match(/<link rel="canonical" href="([^"]+)"/i);
    if (directMatch && !directMatch[1].includes("Special:Search")) {
      const titleMatch = searchHtml.match(/<h1[^>]*id="firstHeading"[^>]*>([\s\S]*?)<\/h1>/i);
      const candidate = {
        url: directMatch[1],
        title: titleMatch ? stripHtml(titleMatch[1]) : searchName,
      };
      if (!isWikipediaElectionPage(candidate.url)) {
        return candidate;
      }
    }
  }

  const slug = (identity.searchName || identity.name).replace(/ /g, "_");
  return { url: `${BASE_URL}/wiki/${encodeURIComponent(slug)}`, title: identity.searchName || identity.name };
};

/**
 * Scrape Wikipedia article HTML for politician biography, timeline, and elections.
 */
export const fetchWikipediaProfile = async (identity) => {
  if (!identity?.name) {
    return failedProviderResult(SOURCE_NAME, BASE_URL);
  }

  try {
    const article = await resolveArticleUrl(identity);
    const html = await fetchHtml(article.url);

    if (!isPersonArticle(html, article, identity)) {
      return failedProviderResult(SOURCE_NAME, article.url);
    }

    const pairs = extractInfoboxPairs(html);
    const introMatch = html.match(/<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*?)<h2/i);
    const introText = introMatch ? stripHtml(introMatch[1]).slice(0, 800) : null;
    const born = pickInfoboxValue(pairs, ["born", "birth date", "birth_date"]);

    const data = createEmptyNormalizedProfile();
    data.legalName = article.title || identity.name;
    data.biography = introText || null;
    data.wikipediaLink = article.url;
    data.dateOfBirth = born;
    data.age = parseAgeFromBirthDate(data.dateOfBirth);
    data.gender = mapGender(pickInfoboxValue(pairs, ["gender", "sex"]));
    data.constituency = pickInfoboxValue(pairs, ["constituency", "constituency mp", "constituency mla"]);
    data.currentOffice = pickInfoboxValue(pairs, ["residence", "appointer"]);
    data.currentPosition = pickInfoboxValue(pairs, ["office", "title", "office1", "chief minister"]);
    data.education = pickInfoboxValue(pairs, ["education", "alma mater"]);
    data.profession = pickInfoboxValue(pairs, ["occupation", "profession"]);
    data.priorCareer = data.profession;
    data.party = pickInfoboxValue(pairs, ["party", "other party"]) || identity.party || null;
    data.state = inferStateFromBorn(born) || pickInfoboxValue(pairs, ["state"]) || identity.state || null;
    data.timeline = buildTimelineFromInfobox(pairs);
    data.elections = extractElectionsFromWikipedia(html, pairs, {
      ...identity,
      state: data.state || identity.state,
      party: data.party || identity.party,
      constituency: data.constituency,
    });

    const confidence = scoreNormalizedData(data);
    if (confidence === 0) {
      return failedProviderResult(SOURCE_NAME, article.url);
    }

    return createProviderResult({
      success: true,
      confidence,
      data,
      source: { name: SOURCE_NAME, url: article.url, type: "scrape" },
    });
  } catch (err) {
    console.error("[Wikipedia Scraper]", err.message);
    return failedProviderResult(SOURCE_NAME, BASE_URL);
  }
};
