import axios from "axios";
import { chromium } from "playwright";
import { normalizeWhitespace } from "../normalizedProfile.js";

const DEFAULT_HEADERS = {
  "User-Agent": "SocialIQ-PoliticalProfile/1.0 (+https://socialiq.local)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-IN,en;q=0.9",
};

const httpClient = axios.create({
  timeout: 15000,
  headers: DEFAULT_HEADERS,
  maxRedirects: 5,
});

export const stripHtml = (html = "") =>
  normalizeWhitespace(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  );

export const decodeHtmlEntities = (text = "") =>
  String(text)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");

export const fetchHtml = async (url) => {
  const { data } = await httpClient.get(url);
  return String(data || "");
};

let browserInstance = null;

const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserInstance;
};

/**
 * Fetch rendered HTML for JS-heavy government sites (Sansad, etc.).
 */
export const fetchRenderedHtml = async (url, { waitForSelector = null, timeout = 20000 } = {}) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout }).catch(() => null);
    }
    return await page.content();
  } finally {
    await page.close();
  }
};

/**
 * Interact with a page via Playwright and return rendered HTML.
 */
export const scrapeWithBrowser = async (url, interactFn, { timeout = 25000 } = {}) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    if (typeof interactFn === "function") {
      await interactFn(page);
    }
    return await page.content();
  } finally {
    await page.close();
  }
};

export const normalizeName = (name = "") =>
  name
    .toLowerCase()
    .replace(/^(shri|smt|dr|mr|mrs|prof|hon'ble|honble)\.?\s+/gi, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const namesMatch = (candidateName, searchName) => {
  const a = normalizeName(candidateName);
  const b = normalizeName(searchName);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const aParts = a.split(" ").filter(Boolean);
  const bParts = b.split(" ").filter(Boolean);
  const aLast = aParts[aParts.length - 1];
  const bLast = bParts[bParts.length - 1];

  return aLast === bLast && aParts[0] === bParts[0];
};

export const extractTableLabelValue = (html, labels = []) => {
  for (const label of labels) {
    const regex = new RegExp(
      `<(?:th|td)[^>]*>\\s*${label}\\s*<\\/(?:th|td)>\\s*<(?:th|td)[^>]*>([\\s\\S]*?)<\\/(?:th|td)>`,
      "i"
    );
    const match = html.match(regex);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }
  return null;
};

export const extractInfoboxPairs = (html) => {
  const pairs = {};
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!infoboxMatch) return pairs;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(infoboxMatch[1])) !== null) {
    const rowHtml = rowMatch[1];
    const headerMatch = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const valueMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!headerMatch || !valueMatch) continue;

    const key = stripHtml(headerMatch[1]).toLowerCase();
    const value = stripHtml(valueMatch[1]);
    if (key && value) pairs[key] = value;
  }

  return pairs;
};

export const pickInfoboxValue = (pairs, keys) => {
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    const direct = pairs[lowerKey];
    if (direct) return direct;

    const fuzzy = Object.entries(pairs).find(([pairKey]) => pairKey.includes(lowerKey));
    if (fuzzy?.[1]) return fuzzy[1];
  }
  return null;
};

export const extractYear = (value) => {
  if (!value) return null;
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
};

export const parseAgeFromText = (value) => {
  if (!value) return null;
  const ageMatch = String(value).match(/\b(\d{2})\b/);
  if (ageMatch) {
    const age = Number(ageMatch[1]);
    if (age > 17 && age < 120) return age;
  }
  const year = extractYear(value);
  if (!year) return null;
  const age = new Date().getFullYear() - Number(year);
  return age > 0 && age < 120 ? age : null;
};

export const findFirstLinkMatchingName = (html, name) => {
  const anchorRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = stripHtml(match[2]);
    if (namesMatch(text, name)) {
      return { href, text };
    }
  }
  return null;
};
