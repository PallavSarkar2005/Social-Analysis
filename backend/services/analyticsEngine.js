/**
 * AnalyticsEngine — single source of truth for all platform metrics and graphs.
 *
 * Rules:
 * - Never invent, interpolate, or fabricate metric values
 * - Append-only snapshots; never overwrite history
 * - Charts read persisted snapshots; compute only on capture (background sync)
 */

import mongoose from "mongoose";
import AnalyticsSnapshot from "../models/AnalyticsSnapshot.js";
import Snapshot from "../models/Snapshot.js";
import Account from "../models/Account.js";
import Content from "../models/Content.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import { calculateForecast } from "./forecastService.js";

export const ANALYTICS_ENGINE_VERSION = 1;

export const TIME_RANGES = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
  all: null,
};

export const MIN_POINTS_FOR_SERIES = 2;

/** Canonical metric keys used across Dashboard, Profile, History, Reports */
export const METRIC_KEYS = [
  "subscribers",
  "views",
  "videos",
  "likes",
  "comments",
  "engagementRate",
  "averageEngagement",
  "politicalReach",
  "digitalPresence",
  "mediaVisibility",
  "electionStrength",
  "publicEngagement",
  "verifiedConfidence",
  "influenceScore",
  "sentimentPositive",
  "sentimentNeutral",
  "sentimentNegative",
  "electionWins",
  "electionContested",
];

/**
 * Single engagement formula used everywhere (matches prior compare / sync formula).
 * @returns {number} engagement rate as percentage
 */
export const computeEngagementRate = (likes, comments, views) => {
  const v = Number(views) || 0;
  if (v <= 0) return 0;
  return ((Number(likes) || 0) + (Number(comments) || 0)) / v * 100;
};

/**
 * Average per-video engagement from Content documents or recent video stats.
 */
export const computeAverageEngagement = (items = []) => {
  if (!items.length) return 0;
  const sum = items.reduce((acc, item) => {
    const views = Number(item.views ?? item.statistics?.viewCount ?? 0);
    const likes = Number(item.likes ?? item.statistics?.likeCount ?? 0);
    const comments = Number(item.comments ?? item.statistics?.commentCount ?? 0);
    return acc + computeEngagementRate(likes, comments, views);
  }, 0);
  return Number((sum / items.length).toFixed(2));
};

const numOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const pickInfluenceField = (influence, key) => {
  if (!influence || typeof influence !== "object") return null;
  if (influence[key] !== undefined && influence[key] !== null) {
    return numOrNull(influence[key]);
  }
  const board = Array.isArray(influence.metrics)
    ? influence.metrics.find((m) => m.key === key)
    : null;
  return board ? numOrNull(board.score) : null;
};

/**
 * Build a metric payload from live Account / Content / PoliticalProfile.
 * Null fields mean unverified — never fill with zeros for graph history.
 */
export const computeMetrics = (account, contentStats = {}, politicalProfile = null) => {
  const platform = account?.platform || "youtube";
  const subscribers =
    platform === "youtube"
      ? numOrNull(account?.subscribers)
      : numOrNull(account?.followers ?? account?.subscribers);

  const views = numOrNull(account?.views);
  const videos = numOrNull(account?.videos);

  const likes = numOrNull(contentStats.totalLikes);
  const comments = numOrNull(contentStats.totalComments);

  let engagementRate = numOrNull(account?.engagement);
  if (engagementRate === null && likes !== null && comments !== null && views !== null) {
    engagementRate = Number(computeEngagementRate(likes, comments, views).toFixed(2));
  }

  let averageEngagement = numOrNull(contentStats.averageEngagement);
  if (averageEngagement === null && Array.isArray(contentStats.videos) && contentStats.videos.length) {
    averageEngagement = computeAverageEngagement(contentStats.videos);
  }

  const influence = politicalProfile?.influence || null;
  const sentiment = politicalProfile?.newsSentiment || null;
  const stats = politicalProfile?.politicalStatistics || null;

  const hasSentiment =
    sentiment &&
    (sentiment.positive !== undefined ||
      sentiment.neutral !== undefined ||
      sentiment.negative !== undefined);

  return {
    subscribers,
    views,
    videos,
    likes,
    comments,
    engagementRate,
    averageEngagement,
    politicalReach: pickInfluenceField(influence, "politicalReach"),
    digitalPresence: pickInfluenceField(influence, "digitalPresence"),
    mediaVisibility: pickInfluenceField(influence, "mediaVisibility"),
    electionStrength: pickInfluenceField(influence, "electionStrength"),
    publicEngagement: pickInfluenceField(influence, "publicEngagement"),
    verifiedConfidence: pickInfluenceField(influence, "verifiedConfidence"),
    influenceScore: pickInfluenceField(influence, "influenceScore") ??
      numOrNull(influence?.digitalInfluence),
    sentimentPositive: hasSentiment ? numOrNull(sentiment.positive) : null,
    sentimentNeutral: hasSentiment ? numOrNull(sentiment.neutral) : null,
    sentimentNegative: hasSentiment ? numOrNull(sentiment.negative) : null,
    electionWins: numOrNull(stats?.electionsWon ?? stats?.wins ?? stats?.totalWins),
    electionContested: numOrNull(
      stats?.electionsContested ?? stats?.contested ?? stats?.totalContested
    ),
    party: account?.party || politicalProfile?.biography?.party || "",
    state: account?.state || politicalProfile?.biography?.state || "",
    name: account?.name || "",
    profileImage: account?.profileImage || account?.thumbnail || "",
  };
};

const summarizeContent = async (accountId, userId) => {
  const videos = await Content.find({ account: accountId, userId })
    .select("views likes comments type")
    .lean();

  const totalLikes = videos.reduce((s, v) => s + Number(v.likes || 0), 0);
  const totalComments = videos.reduce((s, v) => s + Number(v.comments || 0), 0);

  return {
    videos,
    totalLikes: Math.round(totalLikes),
    totalComments: Math.round(totalComments),
    averageEngagement: computeAverageEngagement(videos),
  };
};

const telemetryEqual = (a, b) => {
  if (!a || !b) return false;
  const keys = [
    "subscribers",
    "views",
    "videos",
    "likes",
    "comments",
    "engagementRate",
    "averageEngagement",
    "influenceScore",
    "sentimentPositive",
    "sentimentNeutral",
    "sentimentNegative",
    "politicalReach",
    "digitalPresence",
    "mediaVisibility",
    "electionStrength",
    "publicEngagement",
    "verifiedConfidence",
    "electionWins",
    "electionContested",
  ];
  return keys.every((k) => Number(a[k] ?? NaN) === Number(b[k] ?? NaN) || (a[k] == null && b[k] == null));
};

/**
 * Capture an append-only analytics snapshot for an account.
 * Skips write when telemetry + political metrics are identical to latest (quota-friendly).
 * Pass force: true to always append (e.g. after profile rebuild).
 */
export const captureSnapshot = async ({
  userId,
  accountId,
  source = "youtube_sync",
  force = false,
  account: accountDoc = null,
  politicalProfile: profileDoc = null,
  contentStats: contentStatsOverride = null,
  capturedAt = new Date(),
} = {}) => {
  const account =
    accountDoc ||
    (await Account.findById(accountId).lean()) ||
    (await Account.findOne({ _id: accountId, userId }).lean());

  if (!account) {
    return { created: false, skipped: true, reason: "account_not_found", snapshot: null };
  }

  const resolvedUserId = userId || account.userId;
  const resolvedAccountId = account._id;

  const [profile, contentStats] = await Promise.all([
    profileDoc
      ? Promise.resolve(profileDoc)
      : PoliticalProfile.findOne({ accountId: resolvedAccountId }).lean(),
    contentStatsOverride
      ? Promise.resolve(contentStatsOverride)
      : summarizeContent(resolvedAccountId, resolvedUserId),
  ]);

  const metrics = computeMetrics(account, contentStats, profile);

  const latest = await AnalyticsSnapshot.findOne({
    accountId: resolvedAccountId,
    userId: resolvedUserId,
  })
    .sort({ capturedAt: -1 })
    .lean();

  if (!force && latest && telemetryEqual(latest, metrics)) {
    return { created: false, skipped: true, reason: "unchanged", snapshot: latest };
  }

  const snapshot = await AnalyticsSnapshot.create({
    userId: resolvedUserId,
    accountId: resolvedAccountId,
    capturedAt,
    source,
    ...metrics,
  });

  return { created: true, skipped: false, reason: null, snapshot };
};

/**
 * One-time / on-demand backfill from legacy Snapshot collection.
 * Does not invent political/sentiment fields — only maps known telemetry.
 */
export const backfillFromLegacySnapshots = async (accountId, { userId = null } = {}) => {
  const filter = { account: accountId };
  if (userId) filter.userId = userId;

  const legacy = await Snapshot.find(filter).sort({ capturedAt: 1 }).lean();
  if (!legacy.length) {
    return { imported: 0, skipped: 0, total: 0 };
  }

  const existing = await AnalyticsSnapshot.find({ accountId })
    .select("capturedAt subscribers views")
    .lean();

  const existingKeys = new Set(
    existing.map(
      (s) =>
        `${new Date(s.capturedAt).getTime()}|${s.subscribers ?? ""}|${s.views ?? ""}`
    )
  );

  let imported = 0;
  let skipped = 0;

  for (const row of legacy) {
    const key = `${new Date(row.capturedAt).getTime()}|${row.followers ?? ""}|${row.views ?? ""}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    await AnalyticsSnapshot.create({
      userId: row.userId,
      accountId: row.account,
      capturedAt: row.capturedAt,
      source: "backfill",
      subscribers: numOrNull(row.followers),
      views: numOrNull(row.views),
      videos: numOrNull(row.videos),
      likes: numOrNull(row.likes),
      comments: numOrNull(row.comments),
      engagementRate: numOrNull(row.engagementRate),
      averageEngagement: numOrNull(row.averageEngagement),
      party: row.party || "",
      state: row.state || "",
      name: row.name || "",
      profileImage: row.profileImage || "",
      // Political / sentiment intentionally null — never fabricate from legacy rows
    });
    imported += 1;
  }

  return { imported, skipped, total: legacy.length };
};

/**
 * Ensure analytics history exists: backfill legacy if AnalyticsSnapshot empty, then return series.
 */
export const ensureAnalyticsHistory = async (accountId, userId) => {
  const count = await AnalyticsSnapshot.countDocuments({ accountId, userId });
  if (count === 0) {
    await backfillFromLegacySnapshots(accountId, { userId });
  }
};

const rangeStart = (range) => {
  const ms = TIME_RANGES[range];
  if (ms == null) return null;
  return new Date(Date.now() - ms);
};

/**
 * Time series for charts. Omits null metric values per point — never interpolates.
 */
export const getTimeSeries = async (
  accountId,
  { userId, metrics = ["subscribers", "views", "engagementRate"], range = "all" } = {}
) => {
  await ensureAnalyticsHistory(accountId, userId);

  const query = { accountId };
  if (userId) query.userId = userId;
  const start = rangeStart(range);
  if (start) query.capturedAt = { $gte: start };

  const rows = await AnalyticsSnapshot.find(query).sort({ capturedAt: 1 }).lean();

  const metricList = Array.isArray(metrics)
    ? metrics
    : String(metrics || "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

  const series = rows.map((row) => {
    const point = {
      id: row._id,
      capturedAt: row.capturedAt,
      date: new Date(row.capturedAt).toLocaleDateString(),
      source: row.source,
    };
    for (const key of metricList) {
      // Only include verified (non-null) values — do not coerce null → 0 for history
      if (row[key] !== null && row[key] !== undefined) {
        point[key] = row[key];
      }
    }
    // Compatibility aliases used by existing frontend pages
    if (point.subscribers !== undefined) point.followers = point.subscribers;
    if (point.engagementRate !== undefined) point.engagement = point.engagementRate;
    return point;
  });

  const verifiedCounts = {};
  for (const key of metricList) {
    verifiedCounts[key] = series.filter((p) => p[key] !== undefined && p[key] !== null).length;
  }

  const insufficient = {};
  for (const key of metricList) {
    if (verifiedCounts[key] < MIN_POINTS_FOR_SERIES) {
      insufficient[key] = {
        available: false,
        points: verifiedCounts[key],
        reason: `Need at least ${MIN_POINTS_FOR_SERIES} verified snapshots for ${key}. Currently ${verifiedCounts[key]}.`,
      };
    } else {
      insufficient[key] = { available: true, points: verifiedCounts[key], reason: null };
    }
  }

  return {
    series,
    metrics: metricList,
    range,
    pointCount: series.length,
    availability: insufficient,
    engineVersion: ANALYTICS_ENGINE_VERSION,
  };
};

/**
 * Latest verified metrics for an account (KPI cards).
 */
export const getLatest = async (accountId, { userId } = {}) => {
  await ensureAnalyticsHistory(accountId, userId);

  const query = { accountId };
  if (userId) query.userId = userId;

  const latest = await AnalyticsSnapshot.findOne(query).sort({ capturedAt: -1 }).lean();
  if (!latest) {
    return {
      available: false,
      reason: "No verified analytics snapshots available yet.",
      metrics: null,
      engineVersion: ANALYTICS_ENGINE_VERSION,
    };
  }

  const metrics = {};
  for (const key of METRIC_KEYS) {
    metrics[key] = latest[key] ?? null;
  }

  return {
    available: true,
    reason: null,
    capturedAt: latest.capturedAt,
    source: latest.source,
    metrics,
    party: latest.party,
    state: latest.state,
    name: latest.name,
    profileImage: latest.profileImage,
    // Compatibility aliases
    followers: metrics.subscribers,
    engagement: metrics.engagementRate,
    engineVersion: ANALYTICS_ENGINE_VERSION,
  };
};

/**
 * Growth deltas vs approx week / month ago snapshots (real points only).
 */
export const getGrowthDeltas = async (accountId, { userId } = {}) => {
  const query = { accountId };
  if (userId) query.userId = userId;

  const latest = await AnalyticsSnapshot.findOne(query).sort({ capturedAt: -1 }).lean();
  if (!latest) {
    return { available: false, reason: "No verified snapshots for growth deltas." };
  }

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const findNear = async (before) =>
    (await AnalyticsSnapshot.findOne({
      ...query,
      capturedAt: { $lte: before },
    })
      .sort({ capturedAt: -1 })
      .lean()) ||
    (await AnalyticsSnapshot.findOne(query).sort({ capturedAt: 1 }).lean());

  const [weekSnap, monthSnap] = await Promise.all([findNear(weekAgo), findNear(monthAgo)]);

  const pct = (current, previous) => {
    if (previous == null || previous === 0) return null;
    if (current == null) return null;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  };

  const delta = (current, previous) => {
    if (current == null || previous == null) return null;
    return current - previous;
  };

  const build = (key) => ({
    current: latest[key] ?? null,
    lastWeek: {
      value: delta(latest[key], weekSnap?.[key]),
      percentage: pct(latest[key], weekSnap?.[key]),
    },
    lastMonth: {
      value: delta(latest[key], monthSnap?.[key]),
      percentage: pct(latest[key], monthSnap?.[key]),
    },
  });

  return {
    available: true,
    subscribers: build("subscribers"),
    views: build("views"),
    engagementRate: build("engagementRate"),
    influenceScore: build("influenceScore"),
  };
};

/**
 * Latest snapshot per account via aggregation (avoids N+1 findOne loops).
 */
const toObjectId = (id) => {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const latestByAccountAgg = async (userId, accountIds) => {
  if (!accountIds.length) return new Map();
  const uid = toObjectId(userId);
  const ids = accountIds.map(toObjectId);
  const rows = await AnalyticsSnapshot.aggregate([
    { $match: { userId: uid, accountId: { $in: ids } } },
    { $sort: { capturedAt: -1 } },
    {
      $group: {
        _id: "$accountId",
        doc: { $first: "$$ROOT" },
      },
    },
  ]);
  const map = new Map();
  for (const r of rows) map.set(String(r._id), r.doc);
  return map;
};

/**
 * Snapshot at-or-before a date per account (or earliest if none before).
 */
const nearDateByAccountAgg = async (userId, accountIds, beforeDate) => {
  if (!accountIds.length) return new Map();
  const uid = toObjectId(userId);
  const ids = accountIds.map(toObjectId);
  const beforeRows = await AnalyticsSnapshot.aggregate([
    {
      $match: {
        userId: uid,
        accountId: { $in: ids },
        capturedAt: { $lte: beforeDate },
      },
    },
    { $sort: { capturedAt: -1 } },
    { $group: { _id: "$accountId", doc: { $first: "$$ROOT" } } },
  ]);
  const map = new Map();
  for (const r of beforeRows) map.set(String(r._id), r.doc);

  const missing = ids.filter((id) => !map.has(String(id)));
  if (missing.length) {
    const earliest = await AnalyticsSnapshot.aggregate([
      { $match: { userId: uid, accountId: { $in: missing } } },
      { $sort: { capturedAt: 1 } },
      { $group: { _id: "$accountId", doc: { $first: "$$ROOT" } } },
    ]);
    for (const r of earliest) map.set(String(r._id), r.doc);
  }
  return map;
};

/**
 * Dashboard overview — aggregates latest AnalyticsSnapshot per active account.
 */
export const getDashboardOverview = async (userId) => {
  const activeAccounts = await Account.find({
    userId,
    isCompetitor: { $ne: true },
  })
    .select("_id name platform")
    .lean();

  const activeAccountIds = activeAccounts.map((a) => a._id);
  const totalAccounts = activeAccounts.length;
  const totalVideos = await Content.countDocuments({
    userId,
    account: { $in: activeAccountIds },
  });

  // Ensure backfill for accounts that only have legacy Snapshots (batched)
  const BATCH = 25;
  for (let i = 0; i < activeAccounts.length; i += BATCH) {
    await Promise.all(
      activeAccounts.slice(i, i + BATCH).map((a) => ensureAnalyticsHistory(a._id, userId))
    );
  }

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [latestMap, weekMap, monthMap] = await Promise.all([
    latestByAccountAgg(userId, activeAccountIds),
    nearDateByAccountAgg(userId, activeAccountIds, sevenDaysAgo),
    nearDateByAccountAgg(userId, activeAccountIds, thirtyDaysAgo),
  ]);

  let todaySubscribers = 0;
  let todayFollowers = 0;
  let todayViews = 0;
  let totalEngRateSum = 0;
  let engCount = 0;

  let lastWeekSubscribers = 0;
  let lastWeekFollowers = 0;
  let lastWeekViews = 0;
  let lastWeekEngRateSum = 0;

  let lastMonthSubscribers = 0;
  let lastMonthFollowers = 0;
  let lastMonthViews = 0;
  let lastMonthEngRateSum = 0;

  const accountSeries = [];

  for (const account of activeAccounts) {
    const key = String(account._id);
    const latest = latestMap.get(key);
    const weekAgo = weekMap.get(key);
    const monthAgo = monthMap.get(key);

    const lSub = latest?.subscribers ?? 0;
    const lViews = latest?.views ?? 0;
    const lEng = latest?.engagementRate ?? 0;
    const wSub = weekAgo?.subscribers ?? 0;
    const wViews = weekAgo?.views ?? 0;
    const wEng = weekAgo?.engagementRate ?? 0;
    const mSub = monthAgo?.subscribers ?? 0;
    const mViews = monthAgo?.views ?? 0;
    const mEng = monthAgo?.engagementRate ?? 0;

    if (account.platform === "youtube") {
      todaySubscribers += lSub;
      lastWeekSubscribers += wSub;
      lastMonthSubscribers += mSub;
      todayViews += lViews;
      lastWeekViews += wViews;
      lastMonthViews += mViews;
    } else if (account.platform === "x") {
      todayFollowers += lSub;
      lastWeekFollowers += wSub;
      lastMonthFollowers += mSub;
    }

    if (latest?.engagementRate != null) {
      totalEngRateSum += lEng;
      engCount += 1;
      lastWeekEngRateSum += wEng;
      lastMonthEngRateSum += mEng;
    }

    if (latest) {
      accountSeries.push({
        accountId: account._id,
        name: account.name,
        platform: account.platform,
        subscribers: latest.subscribers,
        views: latest.views,
        engagementRate: latest.engagementRate,
        influenceScore: latest.influenceScore,
        capturedAt: latest.capturedAt,
      });
    }
  }

  const todayEngagement =
    engCount > 0 ? Number((totalEngRateSum / engCount).toFixed(2)) : 0;
  const lastWeekEngagement =
    engCount > 0 ? Number((lastWeekEngRateSum / engCount).toFixed(2)) : 0;
  const lastMonthEngagement =
    engCount > 0 ? Number((lastMonthEngRateSum / engCount).toFixed(2)) : 0;

  const getGrowthPct = (current, previous) => {
    if (!previous) return 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  };

  // Aggregate user-level series for dashboard charts (sum of latest per day buckets from all accounts)
  const dashboardSeries = await getUserAggregateSeries(userId, activeAccountIds);

  return {
    totalAccounts,
    totalVideos,
    totalFollowers: todayFollowers + todaySubscribers,
    totalViews: todayViews,
    avgEngagement: todayEngagement,
    growth: {
      subscribers: {
        current: todaySubscribers,
        lastWeek: {
          value: todaySubscribers - lastWeekSubscribers,
          percentage: getGrowthPct(todaySubscribers, lastWeekSubscribers),
        },
        lastMonth: {
          value: todaySubscribers - lastMonthSubscribers,
          percentage: getGrowthPct(todaySubscribers, lastMonthSubscribers),
        },
      },
      followers: {
        current: todayFollowers,
        lastWeek: {
          value: todayFollowers - lastWeekFollowers,
          percentage: getGrowthPct(todayFollowers, lastWeekFollowers),
        },
        lastMonth: {
          value: todayFollowers - lastMonthFollowers,
          percentage: getGrowthPct(todayFollowers, lastMonthFollowers),
        },
      },
      views: {
        current: todayViews,
        lastWeek: {
          value: todayViews - lastWeekViews,
          percentage: getGrowthPct(todayViews, lastWeekViews),
        },
        lastMonth: {
          value: todayViews - lastMonthViews,
          percentage: getGrowthPct(todayViews, lastMonthViews),
        },
      },
      engagement: {
        current: todayEngagement,
        lastWeek: {
          value: Number((todayEngagement - lastWeekEngagement).toFixed(2)),
          percentage: getGrowthPct(todayEngagement, lastWeekEngagement),
        },
        lastMonth: {
          value: Number((todayEngagement - lastMonthEngagement).toFixed(2)),
          percentage: getGrowthPct(todayEngagement, lastMonthEngagement),
        },
      },
    },
    accounts: accountSeries,
    series: dashboardSeries,
    engineVersion: ANALYTICS_ENGINE_VERSION,
  };
};

/**
 * Build a daily aggregate series across accounts (sum of verified values per day).
 * Only includes days that have at least one real snapshot — no invented points.
 */
export const getUserAggregateSeries = async (userId, accountIds = []) => {
  if (!accountIds.length) {
    return {
      series: [],
      availability: {
        subscribers: {
          available: false,
          points: 0,
          reason: "No tracked accounts with verified analytics yet.",
        },
        views: {
          available: false,
          points: 0,
          reason: "No tracked accounts with verified analytics yet.",
        },
      },
    };
  }

  const rows = await AnalyticsSnapshot.find({
    userId,
    accountId: { $in: accountIds },
  })
    .sort({ capturedAt: 1 })
    .lean();

  // Group by calendar day: for each account take latest snapshot that day, then sum
  const byDay = new Map();
  for (const row of rows) {
    const dayKey = new Date(row.capturedAt).toISOString().slice(0, 10);
    if (!byDay.has(dayKey)) byDay.set(dayKey, new Map());
    const accountMap = byDay.get(dayKey);
    accountMap.set(String(row.accountId), row);
  }

  const series = [];
  for (const [dayKey, accountMap] of [...byDay.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    let subscribers = 0;
    let views = 0;
    let engSum = 0;
    let engN = 0;
    let hasSub = false;
    let hasViews = false;

    for (const row of accountMap.values()) {
      if (row.subscribers != null) {
        subscribers += row.subscribers;
        hasSub = true;
      }
      if (row.views != null) {
        views += row.views;
        hasViews = true;
      }
      if (row.engagementRate != null) {
        engSum += row.engagementRate;
        engN += 1;
      }
    }

    const point = {
      date: dayKey,
      capturedAt: new Date(dayKey).toISOString(),
    };
    if (hasSub) {
      point.subscribers = subscribers;
      point.followers = subscribers;
    }
    if (hasViews) point.views = views;
    if (engN > 0) {
      point.engagementRate = Number((engSum / engN).toFixed(2));
      point.engagement = point.engagementRate;
    }
    series.push(point);
  }

  const subPoints = series.filter((p) => p.subscribers != null).length;
  const viewPoints = series.filter((p) => p.views != null).length;

  return {
    series,
    availability: {
      subscribers: {
        available: subPoints >= MIN_POINTS_FOR_SERIES,
        points: subPoints,
        reason:
          subPoints >= MIN_POINTS_FOR_SERIES
            ? null
            : `Need at least ${MIN_POINTS_FOR_SERIES} verified daily snapshots for subscriber growth. Currently ${subPoints}.`,
      },
      views: {
        available: viewPoints >= MIN_POINTS_FOR_SERIES,
        points: viewPoints,
        reason:
          viewPoints >= MIN_POINTS_FOR_SERIES
            ? null
            : `Need at least ${MIN_POINTS_FOR_SERIES} verified daily snapshots for view growth. Currently ${viewPoints}.`,
      },
    },
  };
};

/**
 * Compare live metrics for multiple accounts using identical formulas.
 */
export const getCompareMetrics = async (accountIds, { userId } = {}) => {
  const ids = (accountIds || []).filter(Boolean);
  const results = [];

  for (const id of ids) {
    const account = await Account.findOne({
      _id: id,
      ...(userId ? { userId } : {}),
    }).lean();
    if (!account) continue;

    await ensureAnalyticsHistory(account._id, userId || account.userId);
    const latest = await getLatest(account._id, { userId: userId || account.userId });
    const contentStats = await summarizeContent(account._id, userId || account.userId);

    results.push({
      accountId: account._id,
      name: account.name,
      platform: account.platform,
      state: account.state || "Unknown State",
      party: account.party || "Independent",
      followers: latest.metrics?.subscribers ?? null,
      subscribers: latest.metrics?.subscribers ?? null,
      totalViews: latest.metrics?.views ?? null,
      views: latest.metrics?.views ?? null,
      avgViews:
        contentStats.videos.length > 0
          ? Math.round(
              contentStats.videos.reduce((s, v) => s + Number(v.views || 0), 0) /
                contentStats.videos.length
            )
          : null,
      avgEngagement:
        latest.metrics?.averageEngagement ??
        latest.metrics?.engagementRate ??
        null,
      engagementRate: latest.metrics?.engagementRate ?? null,
      influenceScore: latest.metrics?.influenceScore ?? null,
      videosTracked: contentStats.videos.length,
      capturedAt: latest.capturedAt || null,
      available: latest.available,
    });
  }

  results.sort(
    (a, b) => (b.followers || 0) - (a.followers || 0)
  );

  return {
    data: results,
    engineVersion: ANALYTICS_ENGINE_VERSION,
  };
};

/**
 * History payload compatible with existing HistoryLogs UI.
 */
export const getChannelHistory = async (accountId, { userId } = {}) => {
  await ensureAnalyticsHistory(accountId, userId);

  const query = { accountId };
  if (userId) query.userId = userId;

  const rows = await AnalyticsSnapshot.find(query)
    .sort({ capturedAt: 1 })
    .lean();

  const account = await Account.findById(accountId)
    .select("profileImage resolvedImage thumbnail imageSource imageUpdatedAt name platform")
    .lean();

  return rows.map((row) => ({
    id: row._id,
    capturedAt: row.capturedAt,
    date: new Date(row.capturedAt).toLocaleDateString(),
    followers: row.subscribers ?? 0,
    subscribers: row.subscribers,
    views: row.views ?? 0,
    videos: row.videos ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    engagementRate: row.engagementRate ?? 0,
    averageEngagement: row.averageEngagement ?? 0,
    politicalReach: row.politicalReach,
    digitalPresence: row.digitalPresence,
    mediaVisibility: row.mediaVisibility,
    influenceScore: row.influenceScore,
    sentimentPositive: row.sentimentPositive,
    sentimentNeutral: row.sentimentNeutral,
    sentimentNegative: row.sentimentNegative,
    party: row.party || "Independent",
    state: row.state || "Unknown State",
    name: row.name || account?.name || "",
    profileImage: row.profileImage || account?.profileImage || "",
    resolvedImage: account?.resolvedImage || "",
    thumbnail: account?.thumbnail || "",
    imageSource: account?.imageSource || "youtube",
    imageUpdatedAt: account?.imageUpdatedAt
      ? new Date(account.imageUpdatedAt).getTime()
      : Date.now(),
    source: row.source,
  }));
};

/**
 * Chart datasets for Political Profile — built only from AnalyticsSnapshot + Content.
 */
export const getChartDatasets = async (accountId, { userId } = {}) => {
  await ensureAnalyticsHistory(accountId, userId);

  const query = { accountId };
  if (userId) query.userId = userId;

  const [rows, contents] = await Promise.all([
    AnalyticsSnapshot.find(query).sort({ capturedAt: 1 }).lean(),
    Content.find({ account: accountId, ...(userId ? { userId } : {}) })
      .select("type")
      .lean(),
  ]);

  const timeSeries = rows.map((s) => {
    const point = {
      capturedAt: new Date(s.capturedAt).toISOString(),
      date: new Date(s.capturedAt).toLocaleDateString(),
    };
    if (s.subscribers != null) point.subscribers = s.subscribers;
    if (s.views != null) point.views = s.views;
    if (s.engagementRate != null) point.engagement = s.engagementRate;
    return point;
  });

  const uploadsByMonth = new Map();
  for (let i = 1; i < rows.length; i++) {
    const previous = rows[i - 1];
    const current = rows[i];
    if (previous.videos == null || current.videos == null) continue;
    const uploadsDelta = Number(current.videos) - Number(previous.videos);
    if (uploadsDelta <= 0) continue;

    const capturedAt = new Date(current.capturedAt);
    const monthKey = `${capturedAt.getFullYear()}-${String(capturedAt.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = capturedAt.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    if (!uploadsByMonth.has(monthKey)) {
      uploadsByMonth.set(monthKey, { month: monthLabel, uploads: 0 });
    }
    uploadsByMonth.get(monthKey).uploads += uploadsDelta;
  }

  const contentTypeCounts = new Map();
  for (const content of contents) {
    const normalizedType =
      content.type === "short" ? "Shorts" : content.type === "video" ? "Videos" : null;
    if (!normalizedType) continue;
    contentTypeCounts.set(
      normalizedType,
      (contentTypeCounts.get(normalizedType) || 0) + 1
    );
  }

  const totalContentItems = Array.from(contentTypeCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  );
  const categories = Array.from(contentTypeCounts.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage:
        totalContentItems > 0
          ? Number(((value / totalContentItems) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const subPoints = timeSeries.filter((p) => p.subscribers != null).length;
  const viewPoints = timeSeries.filter((p) => p.views != null).length;
  const engPoints = timeSeries.filter((p) => p.engagement != null).length;

  return {
    timeSeries,
    uploadsDistribution: Array.from(uploadsByMonth.values()),
    categories,
    contentDistributionMessage:
      contents.length === 0
        ? "No synced YouTube content metadata is available for this profile yet."
        : categories.length === 0
          ? "Stored YouTube content items do not include distribution metadata yet."
          : "",
    availability: {
      subscribers: {
        available: subPoints >= MIN_POINTS_FOR_SERIES,
        points: subPoints,
        reason:
          subPoints >= MIN_POINTS_FOR_SERIES
            ? null
            : `Need at least ${MIN_POINTS_FOR_SERIES} verified snapshots for subscriber growth.`,
      },
      views: {
        available: viewPoints >= MIN_POINTS_FOR_SERIES,
        points: viewPoints,
        reason:
          viewPoints >= MIN_POINTS_FOR_SERIES
            ? null
            : `Need at least ${MIN_POINTS_FOR_SERIES} verified snapshots for view growth.`,
      },
      engagement: {
        available: engPoints >= MIN_POINTS_FOR_SERIES,
        points: engPoints,
        reason:
          engPoints >= MIN_POINTS_FOR_SERIES
            ? null
            : `Need at least ${MIN_POINTS_FOR_SERIES} verified snapshots for engagement trend.`,
      },
      uploads: {
        available: Array.from(uploadsByMonth.values()).length > 0,
        points: Array.from(uploadsByMonth.values()).length,
        reason:
          Array.from(uploadsByMonth.values()).length > 0
            ? null
            : "No verified upload deltas between snapshots yet.",
      },
      categories: {
        available: categories.length > 0,
        points: categories.length,
        reason:
          categories.length > 0
            ? null
            : "No verified content distribution metadata available yet.",
      },
    },
    engineVersion: ANALYTICS_ENGINE_VERSION,
  };
};

/**
 * Forecast / projection — labeled separately; requires ≥2 real snapshots.
 * Maps AnalyticsSnapshot → shape expected by calculateForecast (followers alias).
 */
export const getForecastForAccount = async (accountId, { userId } = {}) => {
  await ensureAnalyticsHistory(accountId, userId);

  const query = { accountId };
  if (userId) query.userId = userId;

  const rows = await AnalyticsSnapshot.find(query).sort({ capturedAt: 1 }).lean();
  const mapped = rows
    .filter((r) => r.subscribers != null || r.views != null)
    .map((r) => ({
      capturedAt: r.capturedAt,
      followers: r.subscribers ?? 0,
      views: r.views ?? 0,
    }));

  return calculateForecast(mapped);
};

export default {
  ANALYTICS_ENGINE_VERSION,
  METRIC_KEYS,
  computeEngagementRate,
  computeAverageEngagement,
  computeMetrics,
  captureSnapshot,
  backfillFromLegacySnapshots,
  ensureAnalyticsHistory,
  getTimeSeries,
  getLatest,
  getGrowthDeltas,
  getDashboardOverview,
  getUserAggregateSeries,
  getCompareMetrics,
  getChannelHistory,
  getChartDatasets,
  getForecastForAccount,
};
