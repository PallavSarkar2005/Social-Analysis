import {
  ensureHubIndexForUser,
  modulesFromProfile,
} from "../services/hubIndexService.js";
import { buildIdentityQuery } from "../services/reportService.js";
import { generateDossierPDF } from "../services/reportDossierPdf.js";
import { assemblePoliticalDossier } from "../services/reportDossierService.js";
import { repairShareTokenNulls } from "../services/hubIndexRepair.js";

describe("hubIndexService", () => {
  test("ensureHubIndexForUser returns empty stats for missing userId", async () => {
    const result = await ensureHubIndexForUser(null);
    expect(result).toEqual({ created: 0, updated: 0, skipped: 0, profiles: 0 });
  });

  test("modulesFromProfile derives available modules from data", () => {
    const modules = modulesFromProfile({
      timeline: [{ year: 2020 }],
      elections: [{ year: 2021 }],
      influence: { influenceScore: 50 },
      news: [{ headline: "x" }],
      aiSummary: { overview: "ok" },
    });
    expect(modules).toContain("timeline");
    expect(modules).toContain("election");
    expect(modules).toContain("influence");
    expect(modules).toContain("news_sentiment");
    expect(modules).toContain("ai_insight");
  });
});

describe("political_profile identity", () => {
  test("buildIdentityQuery keys political profiles by accountId", () => {
    const accountId = "507f1f77bcf86cd799439011";
    const q = buildIdentityQuery("507f1f77bcf86cd799439012", {
      type: "political_profile",
      source: `political_profile:${accountId}`,
      accountId,
      profileId: "507f1f77bcf86cd799439013",
    });
    expect(q).toEqual({
      userId: "507f1f77bcf86cd799439012",
      type: "political_profile",
      accountId,
    });
  });
});

describe("shareToken repair", () => {
  test("repairShareTokenNulls is exported and callable", () => {
    expect(typeof repairShareTokenNulls).toBe("function");
  });
});

describe("dossier PDF compactness", () => {
  test("generateDossierPDF produces a non-empty buffer without hanging", async () => {
    const dossier = assemblePoliticalDossier({
      report: {
        title: "Leader — Political Intelligence Report",
        type: "political_profile",
        confidence: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      profile: {
        biography: {
          fullName: "Test Leader",
          party: "BJP",
          state: "Assam",
          currentPosition: "Chief Minister",
        },
        confidenceScore: 80,
        timeline: [
          { year: "2016", title: "Minister" },
          { year: "2021", title: "CM" },
        ],
        elections: [
          {
            year: 2021,
            election: "Assembly",
            constituency: "X",
            party: "BJP",
            position: "Won",
            votes: 1000,
          },
        ],
        influence: { influenceScore: 70, politicalReach: 65 },
      },
      account: { name: "Test Leader" },
    });

    const buf = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("PDF timeout")), 8000);
      try {
        generateDossierPDF(dossier, (b) => {
          clearTimeout(t);
          resolve(b);
        });
      } catch (e) {
        clearTimeout(t);
        reject(e);
      }
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
  });
});
