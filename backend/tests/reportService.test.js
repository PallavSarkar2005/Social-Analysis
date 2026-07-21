import {
  normalizeReportType,
  TYPE_ALIASES,
  buildFilterQuery,
  buildSortQuery,
  buildCreatePayload,
  buildPatchPayload,
  parsePagination,
  estimateContentSize,
  escapeRegex,
  serializeReport,
  computeContentFingerprint,
  buildIdentityQuery,
  VALID_LIST_FILTERS,
  VALID_SORTS,
} from "../services/reportService.js";
import { REPORT_TYPES } from "../models/SavedReport.js";

describe("reportService.normalizeReportType", () => {
  test("maps legacy insight alias to ai_insight", () => {
    expect(normalizeReportType("insight")).toBe("ai_insight");
    expect(normalizeReportType("AI")).toBe("ai_insight");
  });

  test("accepts all canonical report types", () => {
    for (const t of REPORT_TYPES) {
      expect(normalizeReportType(t)).toBe(t);
    }
  });

  test("returns null for unknown types", () => {
    expect(normalizeReportType("not_a_type")).toBeNull();
    expect(normalizeReportType("")).toBeNull();
    expect(normalizeReportType(null)).toBeNull();
  });

  test("TYPE_ALIASES only map to canonical values", () => {
    for (const alias of Object.keys(TYPE_ALIASES)) {
      expect(REPORT_TYPES).toContain(TYPE_ALIASES[alias]);
    }
  });
});

describe("reportService.buildCreatePayload", () => {
  const userId = "507f1f77bcf86cd799439011";

  test("preserves legacy required fields and defaults hub fields", () => {
    const payload = buildCreatePayload(userId, {
      title: "Legacy Report",
      type: "analysis",
      source: "analyzer",
      content: { text: "hello" },
    });

    expect(payload.userId).toBe(userId);
    expect(payload.title).toBe("Legacy Report");
    expect(payload.type).toBe("analysis");
    expect(payload.source).toBe("analyzer");
    expect(payload.content).toEqual({ text: "hello" });
    expect(payload.favorite).toBe(false);
    expect(payload.pinned).toBe(false);
    expect(payload.status).toBe("ready");
    expect(payload.visibility).toBe("private");
    expect(payload.size).toBeGreaterThan(0);
    expect(payload.tags).toEqual([]);
  });

  test("accepts reportType alias and optional hub metadata", () => {
    const payload = buildCreatePayload(userId, {
      title: "Profile Analysis",
      reportType: "political_profile",
      source: "political_profile",
      content: { profile: true },
      profileId: "507f1f77bcf86cd799439012",
      tags: ["BJP", " MP "],
      confidence: 82,
      summary: "Strong digital presence",
      favorite: true,
      pinned: true,
      sourceModules: ["influence", "elections"],
    });

    expect(payload.type).toBe("political_profile");
    expect(payload.tags).toEqual(["BJP", "MP"]);
    expect(payload.confidence).toBe(82);
    expect(payload.favorite).toBe(true);
    expect(payload.pinned).toBe(true);
    expect(payload.sourceModules).toEqual(["influence", "elections"]);
  });
});

describe("reportService.buildPatchPayload", () => {
  test("only allows patchable hub fields", () => {
    const updates = buildPatchPayload({
      title: " Renamed ",
      favorite: true,
      pinned: false,
      type: "ai_insight",
      content: { hack: true },
      userId: "attacker",
    });

    expect(updates).toEqual({
      title: "Renamed",
      favorite: true,
      pinned: false,
    });
    expect(updates.type).toBeUndefined();
    expect(updates.content).toBeUndefined();
    expect(updates.userId).toBeUndefined();
  });

  test("normalizes tags arrays", () => {
    expect(buildPatchPayload({ tags: [" a ", "", "b"] }).tags).toEqual(["a", "b"]);
  });
});

describe("reportService.buildFilterQuery", () => {
  const userId = "507f1f77bcf86cd799439011";

  test("always scopes to userId", () => {
    expect(buildFilterQuery(userId, {}).userId).toBe(userId);
  });

  test("legacy ?type= still works", () => {
    expect(buildFilterQuery(userId, { type: "comparison" }).type).toBe("comparison");
    expect(buildFilterQuery(userId, { type: "insight" }).type).toBe("ai_insight");
  });

  test("filter presets map correctly", () => {
    expect(buildFilterQuery(userId, { filter: "favorites" }).favorite).toBe(true);
    expect(buildFilterQuery(userId, { filter: "pinned" }).pinned).toBe(true);
    expect(buildFilterQuery(userId, { filter: "ai" }).type).toBe("ai_insight");
    expect(buildFilterQuery(userId, { filter: "archived" }).status).toBe("archived");
    expect(buildFilterQuery(userId, { filter: "draft" }).status).toBe("draft");
    expect(buildFilterQuery(userId, { filter: "comparison" }).type).toEqual({
      $in: ["comparison", "competitor_report"],
    });
  });

  test("search q builds $or regex clauses", () => {
    const filter = buildFilterQuery(userId, { q: "Modi" });
    expect(filter.$or).toBeDefined();
    expect(filter.$or.some((c) => c.title)).toBe(true);
  });

  test("escapes regex metacharacters in search", () => {
    expect(escapeRegex("a+b(c)")).toBe("a\\+b\\(c\\)");
  });

  test("VALID_LIST_FILTERS covers hub presets", () => {
    expect(VALID_LIST_FILTERS).toEqual(
      expect.arrayContaining([
        "all",
        "favorites",
        "pinned",
        "recent",
        "ai",
        "election",
        "influence",
        "comparison",
        "telemetry",
        "news",
        "archived",
        "draft",
      ])
    );
  });

  test("all preset excludes archived by default", () => {
    const filter = buildFilterQuery(userId, { filter: "all" });
    expect(filter.status).toEqual({ $ne: "archived" });
  });

  test("archived preset includes archived status", () => {
    expect(buildFilterQuery(userId, { filter: "archived" }).status).toBe("archived");
  });
});

describe("reportService.buildSortQuery", () => {
  test("newest pins first by default", () => {
    expect(buildSortQuery("newest")).toEqual({ pinned: -1, createdAt: -1 });
  });

  test("supports hub sort presets", () => {
    expect(buildSortQuery("oldest")).toEqual({ createdAt: 1 });
    expect(buildSortQuery("alphabetical")).toEqual({ title: 1 });
    expect(buildSortQuery("confidence")).toEqual({ confidence: -1, createdAt: -1 });
    expect(buildSortQuery("most_opened")).toEqual({ viewCount: -1, createdAt: -1 });
    expect(buildSortQuery("pinned_first")).toEqual({
      pinned: -1,
      favorite: -1,
      createdAt: -1,
    });
  });

  test("VALID_SORTS is complete", () => {
    expect(VALID_SORTS).toEqual(
      expect.arrayContaining([
        "newest",
        "oldest",
        "recently_viewed",
        "alphabetical",
        "confidence",
        "most_opened",
        "favorites",
        "pinned_first",
      ])
    );
  });
});

describe("reportService.parsePagination", () => {
  test("defaults to server-side pagination (page 1, limit 24)", () => {
    expect(parsePagination({})).toEqual({
      paginate: true,
      page: 1,
      limit: 24,
      skip: 0,
    });
  });

  test("page/limit enable pagination", () => {
    expect(parsePagination({ page: "2", limit: "10" })).toEqual({
      paginate: true,
      page: 2,
      limit: 10,
      skip: 10,
    });
  });

  test("caps limit at 100", () => {
    expect(parsePagination({ limit: "500" }).limit).toBe(100);
  });

  test("all=true opts out of pagination", () => {
    expect(parsePagination({ all: "true" }).paginate).toBe(false);
  });
});

describe("reportService.helpers", () => {
  test("estimateContentSize returns positive byte length", () => {
    expect(estimateContentSize({ a: 1 })).toBeGreaterThan(0);
  });

  test("serializeReport adds reportType and id aliases", () => {
    const serialized = serializeReport({
      _id: "507f1f77bcf86cd799439011",
      type: "ai_insight",
      title: "Test",
    });
    expect(serialized.reportType).toBe("ai_insight");
    expect(serialized.id).toBe("507f1f77bcf86cd799439011");
  });
});

describe("reportService.upsert identity + fingerprint", () => {
  test("computeContentFingerprint is stable for same payload", () => {
    const a = computeContentFingerprint({
      type: "political_profile",
      source: "political_profile:acc1",
      title: "Leader — Political Profile",
      summary: "s",
      content: { kind: "political_profile", accountId: "acc1" },
    });
    const b = computeContentFingerprint({
      type: "political_profile",
      source: "political_profile:acc1",
      title: "Leader — Political Profile",
      summary: "s",
      content: { kind: "political_profile", accountId: "acc1" },
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  test("fingerprint changes when content changes", () => {
    const a = computeContentFingerprint({
      type: "comparison",
      source: "youtube_compare:a:b",
      title: "A vs B",
      content: { winner: "a" },
    });
    const b = computeContentFingerprint({
      type: "comparison",
      source: "youtube_compare:a:b",
      title: "A vs B",
      content: { winner: "b" },
    });
    expect(a).not.toBe(b);
  });

  test("buildIdentityQuery scopes by user type source and profileId", () => {
    const userId = "507f1f77bcf86cd799439011";
    const withProfile = buildIdentityQuery(userId, {
      type: "political_profile",
      source: "political_profile:x",
      profileId: "507f1f77bcf86cd799439012",
    });
    expect(withProfile).toEqual({
      userId,
      type: "political_profile",
      source: "political_profile:x",
      profileId: "507f1f77bcf86cd799439012",
    });

    const withoutProfile = buildIdentityQuery(userId, {
      type: "ai_insight",
      source: "ai_session:1",
    });
    expect(withoutProfile.userId).toBe(userId);
    expect(withoutProfile.type).toBe("ai_insight");
    expect(withoutProfile.$or).toBeDefined();
  });
});
