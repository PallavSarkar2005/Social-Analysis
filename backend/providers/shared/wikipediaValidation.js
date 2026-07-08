import { namesMatch } from "./scrapeUtils.js";
import { stripHonorifics } from "./politicalIdentityUtils.js";

/** Wikipedia URLs that describe elections/events, not people. */
export const WIKIPEDIA_ELECTION_PAGE_PATTERN =
  /general_election|legislative_assembly_election|_election_in_|_elections_in_|_by-election|_by_election/i;

export const isWikipediaElectionPage = (url = "") =>
  Boolean(url && WIKIPEDIA_ELECTION_PAGE_PATTERN.test(url));

export const extractWikipediaSlug = (url = "") => {
  if (!url || !url.includes("/wiki/")) return "";
  try {
    return decodeURIComponent(url.split("/wiki/")[1].split("#")[0].split("?")[0]).replace(/_/g, " ");
  } catch {
    return "";
  }
};

/**
 * Heuristic person-page check without a network fetch.
 */
export const isWikipediaPersonUrl = (url = "", name = "") => {
  if (!url || !url.includes("wikipedia.org/wiki/")) return false;
  if (isWikipediaElectionPage(url)) return false;

  const slug = extractWikipediaSlug(url);
  if (!slug) return false;

  const searchName = stripHonorifics(name) || name;
  return namesMatch(slug, searchName);
};

export const classifyWikipediaLink = (url = "", name = "") => {
  if (!url) return "missing";
  if (!url.includes("wikipedia.org")) return "non_wikipedia";
  if (isWikipediaElectionPage(url)) return "election_page";
  if (isWikipediaPersonUrl(url, name)) return "person";
  return "suspect";
};
