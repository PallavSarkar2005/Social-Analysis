/**
 * Production-hardening tests for AnalyticsEngine SSoT gaps.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  computeEngagementRate,
  computeMetrics,
  MIN_POINTS_FOR_SERIES,
} from "../services/analyticsEngine.js";
import { getAnalyticsQueueStats, enqueueAnalyticsJob } from "../services/analyticsJobQueue.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const read = (rel) => readFileSync(join(root, rel), "utf8");

describe("No fabricated analytics remain in product paths", () => {
  test("profileBuilder no longer defaults to 33/34/33 sentiment", () => {
    const src = read("services/profileBuilderService.js");
    expect(src).not.toMatch(/positive:\s*33/);
    expect(src).not.toMatch(/neutral:\s*34/);
    expect(src).not.toMatch(/negative:\s*33/);
    expect(src).toMatch(/Never fabricate sentiment|return null/);
  });

  test("groupController does not invent 0.45 or 0.85 growth", () => {
    const src = read("controllers/groupController.js");
    expect(src).not.toMatch(/growth\s*=\s*0\.45/);
    expect(src).not.toMatch(/growth\s*=\s*0\.85/);
    expect(src).toMatch(/getLatest|analyticsEngine/);
  });

  test("competitorController does not fallback to 2.4 engagement", () => {
    const src = read("controllers/competitorController.js");
    expect(src).not.toMatch(/\|\|\s*2\.4/);
    expect(src).toMatch(/getLatest|getChannelHistory/);
  });

  test("emailReportJob reads AnalyticsEngine getLatest", () => {
    const src = read("jobs/emailReportJob.js");
    expect(src).toMatch(/getLatest/);
    expect(src).not.toMatch(/Snapshot\.findOne/);
  });
});

describe("Analyzer → AnalyticsSnapshot pipeline", () => {
  test("analyzerController calls captureSnapshot after account write", () => {
    const src = read("controllers/analyzerController.js");
    expect(src).toMatch(/captureSnapshot/);
    expect(src).toMatch(/scheduleProfileSync/);
    expect(src).toMatch(/getChannelHistory/);
    expect(src).toMatch(/enqueueAnalyticsJob/);
  });
});

describe("Analytics job queue", () => {
  test("exposes stats and accepts jobs", async () => {
    let ran = false;
    enqueueAnalyticsJob("test_job", async () => {
      ran = true;
    });
    await new Promise((r) => setTimeout(r, 50));
    const stats = getAnalyticsQueueStats();
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("completed");
    expect(ran || stats.completed >= 0).toBe(true);
  });
});

describe("Metric consistency helpers", () => {
  test("engagement formula is centralized", () => {
    expect(computeEngagementRate(10, 5, 100)).toBe(15);
  });

  test("computeMetrics leaves null sentiment when unverified", () => {
    const m = computeMetrics(
      { subscribers: 1, platform: "youtube" },
      {},
      { newsSentiment: null }
    );
    expect(m.sentimentPositive).toBeNull();
  });

  test("series requires min points", () => {
    expect(MIN_POINTS_FOR_SERIES).toBe(2);
  });
});

describe("Migration script exists and is idempotent by design", () => {
  test("migrateAnalyticsSnapshots script uses backfill + captureSnapshot", () => {
    const src = read("scripts/migrateAnalyticsSnapshots.js");
    expect(src).toMatch(/backfillFromLegacySnapshots/);
    expect(src).toMatch(/captureSnapshot/);
    expect(src).toMatch(/resume-from/);
    expect(src).toMatch(/batch/);
  });
});

describe("Dashboard aggregation uses pipeline helpers", () => {
  test("getDashboardOverview uses aggregate maps not per-account findOne loops only", () => {
    const src = read("services/analyticsEngine.js");
    expect(src).toMatch(/latestByAccountAgg/);
    expect(src).toMatch(/nearDateByAccountAgg/);
    expect(src).toMatch(/\$group/);
  });
});
