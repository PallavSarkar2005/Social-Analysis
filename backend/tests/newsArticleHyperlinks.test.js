import {
  validateNewsArticleUrl,
  resolveNewsArticleLink,
  extractStoredNewsUrl,
} from "../utils/newsArticleUrl.js";
import { assemblePoliticalDossier } from "../services/reportDossierService.js";
import { generateDossierPDF } from "../services/reportDossierPdf.js";
import { generateDossierMarkdown } from "../services/reportDossierMarkdown.js";
import { REPORT_DOSSIER_TEMPLATE_VERSION } from "../config/reportDossierVersion.js";

function pdfToString(buffer) {
  return buffer.toString("latin1");
}

function countUriAnnotations(pdfText, url) {
  // PDFKit encodes link annotations with /URI (...)
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`/URI\\s*\\(${escaped}\\)`, "g");
  return (pdfText.match(re) || []).length;
}

describe("newsArticleUrl validation", () => {
  test("accepts HTTPS The Hindu article URL", () => {
    const url =
      "https://www.thehindu.com/news/national/those-who-endanger-safety/article123.ece";
    const result = validateNewsArticleUrl(url);
    expect(result.ok).toBe(true);
    expect(result.url).toContain("thehindu.com");
  });

  test("rejects empty and malformed URLs", () => {
    expect(validateNewsArticleUrl("").ok).toBe(false);
    expect(validateNewsArticleUrl("not-a-url").ok).toBe(false);
    expect(validateNewsArticleUrl(null).ok).toBe(false);
  });

  test("rejects non-HTTPS URLs", () => {
    expect(validateNewsArticleUrl("http://www.thehindu.com/article").ok).toBe(false);
  });

  test("rejects untrusted domains and never invents search URLs", () => {
    expect(validateNewsArticleUrl("https://evil.example/phish").ok).toBe(false);
    expect(validateNewsArticleUrl("https://google.com/search?q=yogi").ok).toBe(false);
  });

  test("resolveNewsArticleLink uses only stored fields", () => {
    expect(
      resolveNewsArticleLink({
        headline: "X",
        url: "https://timesofindia.indiatimes.com/india/story/123.cms",
      })
    ).toContain("timesofindia.indiatimes.com");
    expect(resolveNewsArticleLink({ headline: "X" })).toBeNull();
    expect(extractStoredNewsUrl({ articleUrl: "https://ndtv.com/a" })).toContain("ndtv.com");
  });
});

describe("dossier news hyperlinks", () => {
  const profile = {
    biography: { fullName: "Test Leader", party: "BJP", state: "UP" },
    news: [
      {
        headline: "Yogi launches projects in Bulandshahr",
        source: "The Times of India",
        publishedTime: "2026-07-19",
        summary: "Projects worth crores announced.",
        url: "https://timesofindia.indiatimes.com/city/meerut/yogi-launches/articleshow/123.cms",
      },
      {
        headline: "Safety of daughters statement",
        source: "The Hindu",
        publishedTime: "2026-07-18",
        summary: "Remarks on law and order.",
        url: "https://www.thehindu.com/news/national/safety-daughters/article999.ece",
      },
      {
        headline: "Broken link item",
        source: "Unknown Blog",
        publishedTime: "2026-07-17",
        summary: "Should not become a hyperlink.",
        url: "https://random-blog.xyz/post/1",
      },
      {
        headline: "HTTP only article",
        source: "The Hindu",
        url: "http://www.thehindu.com/news/old",
        summary: "Rejected for non-HTTPS.",
      },
    ],
  };

  const report = {
    title: "Test Leader",
    type: "political_profile",
    confidence: 80,
    engineVersion: "4",
    analysisVersion: "2",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { politicianName: "Test Leader" },
  };

  test("buildNewsSection preserves stored HTTPS URLs for website display", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    expect(dossier.templateVersion).toBe(REPORT_DOSSIER_TEMPLATE_VERSION);
    const items = dossier.sections.newsSentiment.items;
    expect(items).toHaveLength(4);

    const toi = items.find((i) => /Bulandshahr/i.test(i.headline));
    const hindu = items.find((i) => /Safety of daughters/i.test(i.headline));
    const otherHttps = items.find((i) => /Broken link/i.test(i.headline));
    const httpOnly = items.find((i) => /HTTP only/i.test(i.headline));

    expect(toi.url).toContain("timesofindia.indiatimes.com");
    expect(hindu.url).toContain("thehindu.com");
    // Website keeps stored HTTPS even if domain is outside PDF allowlist
    expect(otherHttps.url).toContain("random-blog.xyz");
    expect(httpOnly.url).toBe("");
  });

  test("markdown embeds markdown hyperlinks for valid HTTPS URLs", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const md = generateDossierMarkdown(dossier);
    expect(md).toContain(
      "[Yogi launches projects in Bulandshahr](https://timesofindia.indiatimes.com/city/meerut/yogi-launches/articleshow/123.cms)"
    );
    expect(md).toContain("random-blog.xyz");
  });

  test("PDF embeds hyperlink annotations for every stored HTTPS article URL", async () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const buffer = await new Promise((resolve, reject) => {
      try {
        generateDossierPDF(dossier, resolve);
      } catch (err) {
        reject(err);
      }
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);

    const text = pdfToString(buffer);
    expect(text).toMatch(/\/Annot/i);
    expect(text).toMatch(/\/URI/i);

    const toiUrl =
      "https://timesofindia.indiatimes.com/city/meerut/yogi-launches/articleshow/123.cms";
    const hinduUrl =
      "https://www.thehindu.com/news/national/safety-daughters/article999.ece";
    const otherUrl = "https://random-blog.xyz/post/1";

    expect(countUriAnnotations(text, toiUrl)).toBeGreaterThanOrEqual(1);
    expect(countUriAnnotations(text, hinduUrl)).toBeGreaterThanOrEqual(1);
    expect(countUriAnnotations(text, otherUrl)).toBeGreaterThanOrEqual(1);
    expect(text).not.toContain("google.com/search");
    expect(text).not.toContain("http://www.thehindu.com/news/old");
  }, 15000);

  test("legacy reports remain compatible when news has no URLs", () => {
    const thin = {
      biography: { fullName: "Legacy Leader" },
      news: [{ headline: "Old headline", source: "PTI", publishedTime: "2020-01-01", summary: "No url" }],
    };
    const dossier = assemblePoliticalDossier({ report, profile: thin, account: null });
    expect(dossier.sections.newsSentiment.items[0].url).toBe("");
    expect(dossier.sections.newsSentiment.items[0].headline).toBe("Old headline");
  });
});
