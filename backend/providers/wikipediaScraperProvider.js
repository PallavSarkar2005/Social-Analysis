import {
  createEmptyNormalizedProfile,
  normalizeWhitespace,
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

const SOURCE_NAME = "Wikipedia";
const BASE_URL = "https://en.wikipedia.org";

const mapGender = (value) => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("female")) return "Female";
  if (lower.includes("male")) return "Male";
  return null;
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

const resolveArticleUrl = async (identity) => {
  const searchUrl = `${BASE_URL}/w/index.php?search=${encodeURIComponent(
    `${identity.name} Indian politician ${identity.party || ""} ${identity.state || ""}`
  )}&title=Special:Search`;

  const searchHtml = await fetchHtml(searchUrl);

  if (searchHtml.includes('class="mw-search-result-heading"')) {
    const resultMatch = searchHtml.match(
      /class="mw-search-result-heading"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (resultMatch) {
      const href = resultMatch[1].startsWith("http") ? resultMatch[1] : `${BASE_URL}${resultMatch[1]}`;
      return { url: href.split("#")[0], title: stripHtml(resultMatch[2]) };
    }
  }

  const directMatch = searchHtml.match(/<link rel="canonical" href="([^"]+)"/i);
  if (directMatch && !directMatch[1].includes("Special:Search")) {
    const titleMatch = searchHtml.match(/<h1[^>]*id="firstHeading"[^>]*>([\s\S]*?)<\/h1>/i);
    return {
      url: directMatch[1],
      title: titleMatch ? stripHtml(titleMatch[1]) : identity.name,
    };
  }

  const slug = identity.name.replace(/ /g, "_");
  return { url: `${BASE_URL}/wiki/${encodeURIComponent(slug)}`, title: identity.name };
};

/**
 * Scrape Wikipedia article HTML for politician biography and timeline.
 */
export const fetchWikipediaProfile = async (identity) => {
  if (!identity?.name) {
    return failedProviderResult(SOURCE_NAME, BASE_URL);
  }

  try {
    const article = await resolveArticleUrl(identity);
    const html = await fetchHtml(article.url);

    if (!html.includes("infobox") && !namesMatch(stripHtml(html), identity.name)) {
      return failedProviderResult(SOURCE_NAME, article.url);
    }

    const pairs = extractInfoboxPairs(html);
    const introMatch = html.match(/<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*?)<h2/i);
    const introText = introMatch ? stripHtml(introMatch[1]).slice(0, 800) : null;

    const data = createEmptyNormalizedProfile();
    data.legalName = article.title || identity.name;
    data.biography = introText || null;
    data.wikipediaLink = article.url;
    data.dateOfBirth = pickInfoboxValue(pairs, ["born", "birth date", "birth_date"]);
    data.age = parseAgeFromBirthDate(data.dateOfBirth);
    data.gender = mapGender(pickInfoboxValue(pairs, ["gender", "sex"]));
    data.constituency = pickInfoboxValue(pairs, ["constituency", "constituency mp", "constituency mla"]);
    data.currentOffice = pickInfoboxValue(pairs, ["residence", "appointer"]);
    data.currentPosition = pickInfoboxValue(pairs, ["office", "title", "office1"]);
    data.education = pickInfoboxValue(pairs, ["education", "alma mater"]);
    data.profession = pickInfoboxValue(pairs, ["occupation", "profession"]);
    data.priorCareer = data.profession;
    data.party = pickInfoboxValue(pairs, ["party", "other party"]) || identity.party || null;
    data.state = pickInfoboxValue(pairs, ["state", "constituency"]) || identity.state || null;
    data.timeline = buildTimelineFromInfobox(pairs);

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
