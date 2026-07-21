import {
  assemblePoliticalDossier,
  assembleGenericDossier,
  dossierNeedsRebuild,
  dossierToCsvDatasets,
  buildExecutiveSummary,
  stripReportTitleSuffix,
  confidenceToLabel,
} from "../services/reportDossierService.js";
import { generateDossierMarkdown } from "../services/reportDossierMarkdown.js";
import { REPORT_DOSSIER_TEMPLATE_VERSION } from "../config/reportDossierVersion.js";

describe("reportDossierService", () => {
  const profile = {
    biography: {
      fullName: "Test Leader",
      currentPosition: "Chief Minister",
      party: "BJP",
      state: "Assam",
      education: "Law",
      dob: "1961-01-01",
    },
    confidenceScore: 88,
    timeline: [
      { year: "1961", title: "Birth", category: "birth", description: "Born in Assam" },
      { year: "1961", title: "Birth", category: "birth", description: "Duplicate birth" },
      { year: "2016", title: "Became Cabinet Minister", source: "Official", category: "position" },
      { year: "2021", title: "Chief Minister of Assam", description: "Won assembly", category: "position" },
      { year: "2021", title: "Chief Minister of Assam", description: "Repeated appointment", category: "position" },
    ],
    elections: [
      {
        year: 2021,
        election: "Assam Assembly 2021",
        constituency: "Jalukbari",
        party: "BJP",
        position: "Won",
        votes: 120000,
        votePct: 58,
        margin: 40000,
        opponent: "Opponent",
        source: "ECI",
      },
    ],
    influence: {
      influenceScore: 72,
      politicalReach: 80,
      electionStrength: 75,
      digitalPresence: 60,
      mediaVisibility: 70,
      explanation: "Strong regional base",
      lastCalculated: new Date("2026-01-01"),
    },
    geographicReach: [
      {
        state: "Assam",
        influence: 90,
        confidence: 85,
        evidence: "Home state with extremely long raw evidence string that should not appear in exports",
        tier: "strong",
      },
    ],
    geographicMeta: {
      primaryRegion: "Assam",
      secondaryRegions: ["Meghalaya"],
      regionalSummary: { verifiedCoverage: "high" },
    },
    news: [
      {
        headline: "Policy announcement",
        publishedTime: "2026-01-10",
        source: "PTI",
        sentiment: "positive",
        summary: "Announced infrastructure package",
        url: "https://www.ptinews.com/news/policy-announcement",
      },
    ],
    aiSummary: { strengths: ["Governance track record"], weaknesses: ["Limited national media"] },
    sources: [
      { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Test_Leader", type: "wikipedia", confidence: 90, fetchedAt: "2026-07-06", verified: true, matchedIdentity: true },
      { name: "Wikipedia Biography", url: "https://en.wikipedia.org/wiki/Test_Leader", type: "wikipedia", confidence: 88, verified: true, matchedIdentity: true },
      { name: "Election Commission of India", url: "https://eci.gov.in", type: "election", confidence: 85, fetchedAt: "2026-07-05", verified: true, matchedIdentity: true },
      { name: "Lok Sabha", url: "https://sansad.in/ls/member", type: "official", confidence: 80, verified: false, matchedIdentity: false },
    ],
  };

  const report = {
    title: "Test Leader — Political Profile",
    type: "political_profile",
    confidence: 88,
    engineVersion: "3",
    analysisVersion: "2",
    reportVersion: "1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-15"),
    metadata: { politicianName: "Test Leader" },
  };

  test("assemblePoliticalDossier includes verified sections only", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: { name: "Test Leader" } });
    expect(dossier.templateVersion).toBe(REPORT_DOSSIER_TEMPLATE_VERSION);
    expect(dossier.sections.cover.politicianName).toBe("Test Leader");
    expect(dossier.sections.executiveSummary.paragraphs.length).toBeGreaterThan(0);
    expect(dossier.sections.politicalProfile.fields.length).toBeGreaterThan(0);
    expect(dossier.sections.careerTimeline.events.length).toBeGreaterThan(0);
    expect(dossier.sections.electionHistory.rows).toHaveLength(1);
    expect(dossier.sections.influenceIntelligence.metrics.length).toBeGreaterThan(0);
    expect(dossier.sections.geographicInfluence.primaryRegion).toBe("Assam");
    expect(dossier.sections.newsSentiment.items).toHaveLength(1);
    expect(dossier.sections.aiInsights.blocks.length).toBeGreaterThan(0);
    expect(dossier.sections.evidenceSources.groups.Wikipedia).toBeDefined();
    expect(dossier.modulesIncluded).toContain("electionHistory");
    expect(dossier.modulesIncluded).not.toContain("rawJson");
  });

  test("duplicate titles removed from cover and hub-style title suffixes stripped", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: { name: "Test Leader" } });
    expect(dossier.sections.cover.title).toBe("Test Leader");
    expect(dossier.sections.cover.title).not.toMatch(/Political Profile/i);
    expect(dossier.sections.cover.documentType).toBe("Political Intelligence Report");
    expect(dossier.sections.cover.reportTypeLabel).toBe("Political Profile");
    expect(stripReportTitleSuffix("Dr Mohan Yadav — Political Profile")).toBe("Dr Mohan Yadav");
  });

  test("summary is labeled Summary and stays concise from verified fields", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    expect(dossier.sections.executiveSummary.label).toBe("Summary");
    const paragraphs = dossier.sections.executiveSummary.paragraphs;
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs.length).toBeLessThanOrEqual(4);
    const wordCount = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(120);
    const text = paragraphs.join(" ");
    expect(text).toMatch(/Test Leader/);
    expect(text).toMatch(/BJP/);
    expect(text).toMatch(/Assam/);
    expect(text).toMatch(/Chief Minister/);
    expect(text).toMatch(/2021|Assam Assembly/i);
    expect(text).not.toMatch(/Profile verification confidence stands at/i);
    expect(text).not.toMatch(/influence signals/i);
    expect(text).not.toMatch(/Verified public records confirm/i);
    expect(text).not.toMatch(/Most verified influence/i);
  });

  test("executive summary follows identity → representation → latest win format", () => {
    const paragraphs = buildExecutiveSummary({
      biography: {
        fullName: "Dr Mohan Yadav",
        party: "Bharatiya Janata Party (BJP)",
        state: "Madhya Pradesh",
        currentPosition: "Chief Minister of Madhya Pradesh",
        constituency: "Ujjain South",
      },
      elections: [
        {
          year: 2018,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 50000,
          votePct: 48,
          margin: 8000,
          opponent: "A",
        },
        {
          year: 2023,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 70000,
          votePct: 52,
          margin: 12000,
          opponent: "B",
        },
      ],
      account: null,
      geographicMeta: null,
    });
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0]).toMatch(
      /Dr Mohan Yadav is a Bharatiya Janata Party \(BJP\) politician from Madhya Pradesh currently serving as the Chief Minister of Madhya Pradesh\./
    );
    expect(paragraphs[1]).toMatch(/represents the Ujjain South constituency/i);
    expect(paragraphs[2]).toMatch(/most recent verified electoral victory/i);
    expect(paragraphs[2]).toMatch(/2023/);
    expect(paragraphs[3]).toMatch(/won 2 verified elections/i);
    expect(paragraphs.join(" ")).not.toMatch(/influence/i);
  });

  test("executive summary skips missing fields and never invents", () => {
    const paragraphs = buildExecutiveSummary({
      biography: {
        fullName: "Sparse Leader",
        party: "INC",
      },
      elections: [],
      account: null,
    });
    expect(paragraphs).toEqual(["Sparse Leader is an INC politician."]);
    expect(
      buildExecutiveSummary({
        biography: {},
        elections: [],
        account: null,
        geographicMeta: null,
      })
    ).toBeNull();
  });

  test("timeline deduplicates birth and repeated office appointments", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const events = dossier.sections.careerTimeline.events;
    const births = events.filter((e) => /birth/i.test(e.title) || e.category === "birth");
    expect(births.length).toBeLessThanOrEqual(1);
    const cm = events.filter((e) => /chief minister of assam/i.test(e.title));
    expect(cm.length).toBeLessThanOrEqual(1);
    const years = events.map((e) => Number(e.year)).filter(Boolean);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  test("hides empty Election History and empty modules", () => {
    const thin = {
      biography: { fullName: "Sparse Leader", party: "INC" },
      confidenceScore: 40,
      elections: [{ year: 2021 }],
    };
    const dossier = assemblePoliticalDossier({ report, profile: thin, account: null });
    expect(dossier.sections.cover).toBeDefined();
    expect(dossier.sections.electionHistory).toBeUndefined();
    expect(dossier.sections.newsSentiment).toBeUndefined();
    expect(dossier.modulesIncluded).not.toContain("electionHistory");
  });

  test("geographic section omits raw evidence dump", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const geo = dossier.sections.geographicInfluence;
    expect(geo.primaryRegion).toBe("Assam");
    expect(geo.verifiedCoverage).toBe("high");
    expect(geo.states[0].evidence).toBeUndefined();
    expect(JSON.stringify(geo)).not.toContain("extremely long raw evidence");
  });

  test("evidence list is deduplicated with confidence labels", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const items = dossier.sections.evidenceSources.items;
    const wiki = items.filter((i) => /wikipedia/i.test(i.name));
    expect(wiki.length).toBe(1);
    expect(wiki[0].confidenceLabel).toBe("Verified");
    expect(wiki[0].description).toMatch(/Biography/i);
    expect(confidenceToLabel(90, "wikipedia")).toBe("Verified");
    expect(confidenceToLabel(65, null)).toBe("High");
    expect(confidenceToLabel(40, null)).toBe("Medium");
  });

  test("hides Election History when all rows are zero-vote stubs", () => {
    const stubOnly = {
      biography: { fullName: "Stub Leader", party: "BJP", state: "MP" },
      elections: [
        {
          year: 2013,
          election: "Assembly",
          constituency: "X",
          party: "BJP",
          position: "Winner",
          votes: 0,
          votePct: 0,
          margin: 0,
          opponent: "",
        },
        {
          year: 2018,
          election: "Assembly",
          constituency: "X",
          party: "BJP",
          position: "Winner",
          votes: 0,
          margin: 0,
          voteShare: 0,
        },
      ],
    };
    const dossier = assemblePoliticalDossier({ report, profile: stubOnly, account: null });
    expect(dossier.sections.electionHistory).toBeUndefined();
    expect(dossier.modulesIncluded).not.toContain("electionHistory");
  });

  test("strips invalid Lok Sabha URL but keeps verified Wikipedia link", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: { name: "Test Leader" } });
    const items = dossier.sections.evidenceSources.items;
    const wiki = items.find((i) => /wikipedia/i.test(i.name));
    const lok = items.find((i) => /lok sabha/i.test(i.name));
    expect(wiki?.url).toContain("Test_Leader");
    if (lok) {
      expect(lok.url).toBeFalsy();
    }
  });

  test("dossierNeedsRebuild detects template version drift so existing reports upgrade", () => {
    expect(dossierNeedsRebuild(report, null)).toBe(true);
    expect(
      dossierNeedsRebuild(report, {
        templateVersion: REPORT_DOSSIER_TEMPLATE_VERSION,
        engineVersion: "3",
        analysisVersion: "2",
      })
    ).toBe(false);
    expect(
      dossierNeedsRebuild(report, {
        templateVersion: 3,
        engineVersion: "3",
        analysisVersion: "2",
      })
    ).toBe(true);
  });

  test("dossierToCsvDatasets exports structured sheets without evidence dump column", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const datasets = dossierToCsvDatasets(dossier);
    expect(datasets.timeline.length).toBeGreaterThan(0);
    expect(datasets.elections[0].Constituency).toBe("Jalukbari");
    expect(datasets.influence.length).toBeGreaterThan(0);
    expect(datasets.news[0].Headline).toBe("Policy announcement");
    expect(datasets.geographic[0].Evidence).toBeUndefined();
    expect(datasets.evidence?.length).toBeGreaterThan(0);
  });

  test("generateDossierMarkdown is a professional document not JSON dump", () => {
    const dossier = assemblePoliticalDossier({ report, profile, account: null });
    const md = generateDossierMarkdown(dossier);
    expect(md).toContain("Political Intelligence Report");
    expect(md).toContain("## 1. Summary");
    expect(md).not.toContain("Executive Summary");
    expect(md).toContain("Test Leader");
    expect(md).not.toMatch(/Test Leader — Political Profile/);
    expect(md).toContain("Election History");
    expect(md).not.toContain("```json");
    expect(md).not.toMatch(/"biography"/);
    expect(md).not.toContain("extremely long raw evidence");
  });

  test("buildExecutiveSummary never invents when no facts", () => {
    expect(
      buildExecutiveSummary({
        biography: {},
        elections: [],
        account: null,
        geographicMeta: null,
      })
    ).toBeNull();
  });

  test("assembleGenericDossier works for comparison content", () => {
    const dossier = assembleGenericDossier({
      title: "A vs B",
      type: "comparison",
      content: {
        kind: "comparison",
        creatorA: { name: "A" },
        creatorB: { name: "B" },
        comparison: { overallWinner: "A" },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(dossier.sections.cover.title).toBe("A vs B");
    expect(dossier.sections.aiInsights.blocks.length).toBeGreaterThan(0);
  });
});
