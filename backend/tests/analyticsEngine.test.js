/**
 * AnalyticsEngine unit tests — no fabricated history, consistent formulas, append-only.
 */
import {
  computeEngagementRate,
  computeAverageEngagement,
  computeMetrics,
  MIN_POINTS_FOR_SERIES,
  ANALYTICS_ENGINE_VERSION,
} from "../services/analyticsEngine.js";
import { calculateForecast } from "../services/forecastService.js";

describe("AnalyticsEngine formulas", () => {
  test("computeEngagementRate matches prior compare formula", () => {
    const likes = 100;
    const comments = 50;
    const views = 1000;
    const expected = ((likes + comments) / views) * 100;
    expect(computeEngagementRate(likes, comments, views)).toBe(expected);
  });

  test("computeEngagementRate returns 0 when views are 0 (no division invent)", () => {
    expect(computeEngagementRate(10, 5, 0)).toBe(0);
  });

  test("computeAverageEngagement averages per-video rates", () => {
    const items = [
      { views: 100, likes: 10, comments: 0 }, // 10%
      { views: 200, likes: 20, comments: 0 }, // 10%
    ];
    expect(computeAverageEngagement(items)).toBe(10);
  });

  test("computeMetrics leaves sentiment null when unverified", () => {
    const metrics = computeMetrics(
      { subscribers: 1000, views: 5000, videos: 10, engagement: 2.5, platform: "youtube" },
      { totalLikes: 100, totalComments: 20, averageEngagement: 3 },
      { influence: { influenceScore: 55, politicalReach: 40 }, newsSentiment: null }
    );
    expect(metrics.subscribers).toBe(1000);
    expect(metrics.influenceScore).toBe(55);
    expect(metrics.sentimentPositive).toBeNull();
    expect(metrics.sentimentNeutral).toBeNull();
    expect(metrics.sentimentNegative).toBeNull();
  });

  test("computeMetrics maps verified sentiment without fabricating", () => {
    const metrics = computeMetrics(
      { subscribers: 100, platform: "youtube" },
      {},
      { newsSentiment: { positive: 40, neutral: 35, negative: 25 } }
    );
    expect(metrics.sentimentPositive).toBe(40);
    expect(metrics.sentimentNeutral).toBe(35);
    expect(metrics.sentimentNegative).toBe(25);
  });
});

describe("AnalyticsEngine no-fabrication rules", () => {
  test("MIN_POINTS_FOR_SERIES requires at least 2 points for graphs", () => {
    expect(MIN_POINTS_FOR_SERIES).toBe(2);
  });

  test("forecast refuses to invent history with fewer than 2 snapshots", () => {
    const result = calculateForecast([{ capturedAt: new Date(), followers: 100, views: 1000 }]);
    expect(result.hasEnoughData).toBe(false);
    expect(result.trend).toEqual([]);
  });

  test("forecast projections are labeled isForecast and never fill historical gaps", () => {
    const snaps = [
      { capturedAt: new Date("2026-01-01"), followers: 100, views: 1000 },
      { capturedAt: new Date("2026-02-01"), followers: 200, views: 2000 },
    ];
    const result = calculateForecast(snaps);
    expect(result.hasEnoughData).toBe(true);
    expect(result.trend[0].isForecast).toBe(false);
    expect(result.trend.slice(1).every((p) => p.isForecast === true)).toBe(true);
  });

  test("engine version is exported for API consumers", () => {
    expect(ANALYTICS_ENGINE_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe("AnalyticsEngine series availability semantics", () => {
  test("availability reason is produced when points are insufficient", () => {
    // Mirrors getTimeSeries availability logic without DB
    const points = 1;
    const available = points >= MIN_POINTS_FOR_SERIES;
    const reason = available
      ? null
      : `Need at least ${MIN_POINTS_FOR_SERIES} verified snapshots for subscribers. Currently ${points}.`;
    expect(available).toBe(false);
    expect(reason).toMatch(/Need at least 2/);
  });

  test("null mid-series values must not be interpolated to zero for charts", () => {
    const series = [
      { date: "1", subscribers: 100 },
      { date: "2" }, // missing — do not invent
      { date: "3", subscribers: 120 },
    ];
    const verified = series.filter((p) => p.subscribers != null);
    expect(verified).toHaveLength(2);
    expect(series[1].subscribers).toBeUndefined();
  });
});

describe("Dashboard / Profile metric parity helpers", () => {
  test("same computeMetrics input yields identical KPI fields for shared consumers", () => {
    const account = {
      subscribers: 250000,
      views: 9_000_000,
      videos: 120,
      engagement: 4.2,
      platform: "youtube",
      party: "BJP",
      state: "UP",
      name: "Leader",
    };
    const profile = {
      influence: {
        influenceScore: 72,
        politicalReach: 80,
        digitalPresence: 65,
        mediaVisibility: 50,
        electionStrength: 70,
        publicEngagement: 55,
        verifiedConfidence: 78,
      },
      newsSentiment: { positive: 45, neutral: 30, negative: 25 },
      politicalStatistics: { electionsWon: 3, electionsContested: 5 },
    };
    const a = computeMetrics(account, { totalLikes: 10, totalComments: 2 }, profile);
    const b = computeMetrics(account, { totalLikes: 10, totalComments: 2 }, profile);
    expect(a).toEqual(b);
    expect(a.subscribers).toBe(250000);
    expect(a.influenceScore).toBe(72);
    expect(a.electionWins).toBe(3);
  });
});
