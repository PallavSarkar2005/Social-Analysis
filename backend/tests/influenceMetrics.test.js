import { calculateInfluenceMetrics } from "../services/influenceScoreService.js";
import { buildGeographicInfluence } from "../services/geographicInfluenceService.js";

describe("influenceScoreService v3", () => {
  test("exposes intelligence metrics with tooltips and sources", () => {
    const { influence } = calculateInfluenceMetrics({
      account: {
        subscribers: 1_200_000,
        views: 90_000_000,
        videos: 250,
        engagement: 3.8,
        platform: "youtube",
      },
      profile: {
        confidenceScore: 78,
        verifiedFacts: [
          { key: "state", value: "Uttar Pradesh", confidence: 90 },
          { key: "party", value: "BJP", confidence: 88 },
        ],
        sources: [{ name: "Wikipedia", confidence: 80 }],
        biography: {
          state: "Uttar Pradesh",
          currentPosition: "Chief Minister",
          socialLinks: { youtube: "https://youtube.com", twitter: "https://x.com" },
        },
        elections: [
          { year: 2022, election: "Assembly", constituency: "Gorakhpur", position: "Winner", party: "BJP" },
          { year: 2017, election: "Assembly", constituency: "Gorakhpur", position: "Winner", party: "BJP" },
        ],
        news: [{ headline: "CM addresses rally in Lucknow", source: "PTI", summary: "" }],
      },
      snapshots: [],
    });

    expect(influence.calculationVersion).toBe(3);
    expect(influence.metrics).toHaveLength(6);
    expect(influence.metrics.map((m) => m.key)).toEqual([
      "politicalReach",
      "electionStrength",
      "mediaVisibility",
      "publicEngagement",
      "digitalPresence",
      "verifiedConfidence",
    ]);
    for (const m of influence.metrics) {
      expect(m.tooltip).toBeTruthy();
      expect(m.lastUpdated).toBeInstanceOf(Date);
      expect(m.score).toBeGreaterThanOrEqual(0);
    }
    expect(influence.electionStrength).toBeGreaterThan(50);
    expect(influence.politicalReach).toBeGreaterThan(40);
    expect(influence.digitalInfluence).toBe(influence.influenceScore);
  });

  test("still returns a useful board when telemetry is thin", () => {
    const { influence } = calculateInfluenceMetrics({
      account: { subscribers: 0, views: 0, engagement: 0 },
      profile: { biography: { state: "Delhi", currentPosition: "MLA" }, elections: [] },
      snapshots: [],
    });
    expect(influence.metrics).toHaveLength(6);
    expect(influence.explanation).toMatch(/monitoring|Influence/i);
  });
});

describe("geographicInfluenceService v3", () => {
  test("never returns insufficient empty error copy", () => {
    const result = buildGeographicInfluence({
      account: { subscribers: 1000, state: "Unknown State" },
      profile: { biography: {}, elections: [], news: [] },
    });
    expect(result.geographicMeta.status).toMatch(/monitoring/);
    expect(result.geographicMeta.message).not.toMatch(/Insufficient verified geographic data/i);
    expect(result.geographicMeta.regionalSummary.verifiedCoverage).toBe(0);
  });

  test("marks single verified state as primary and keeps others monitoring via UI tiers", () => {
    const result = buildGeographicInfluence({
      account: { subscribers: 800_000, state: "Madhya Pradesh" },
      profile: {
        biography: {
          state: "Madhya Pradesh",
          constituency: "Vidisha",
          currentPosition: "Chief Minister",
          wikipediaLink: "https://en.wikipedia.org/wiki/Example",
        },
        fieldProvenance: { state: { confidence: 88, verifiedBy: ["Wikipedia"] } },
        elections: [
          {
            year: 2023,
            election: "Madhya Pradesh Assembly",
            constituency: "Budhni",
            position: "Winner",
            party: "BJP",
            confidence: 80,
          },
        ],
        news: [],
      },
    });

    expect(result.geographicMeta.status).toBe("monitoring_with_coverage");
    expect(result.geographicReach.length).toBeGreaterThanOrEqual(1);
    expect(result.geographicReach[0].isPrimary).toBe(true);
    expect(result.geographicReach[0].state).toBe("Madhya Pradesh");
    expect(result.geographicReach[0].tier).not.toBe("monitoring");
    expect(result.geographicReach[0].evidenceCount).toBeGreaterThan(0);
    expect(result.geographicReach[0].evidence.length).toBeGreaterThan(0);
    expect(result.geographicReach[0].primarySources.length).toBeGreaterThan(0);
    expect(result.geographicMeta.regionalSummary.primaryRegion).toBe("Madhya Pradesh");
    expect(result.geographicMeta.regionalSummary.verifiedCoverage).toBe(
      result.geographicReach.length
    );
    // No fabricated filler states
    expect(result.geographicReach.every((r) => r.evidenceCount > 0)).toBe(true);
  });
});
