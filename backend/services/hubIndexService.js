/**
 * Intelligence Hub indexing — one SavedReport card per PoliticalProfile/account.
 * Idempotent. Incremental. One-time legacy backfill. No duplicates.
 */
import mongoose from "mongoose";
import Account from "../models/Account.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import SavedReport from "../models/SavedReport.js";
import { autoSavePoliticalProfileReport } from "./autoSaveReportService.js";

const backfillInFlight = new Set();
let globalBackfillStarted = false;

/** Per-process memo: userId → last successful ensure timestamp */
const userEnsureCache = new Map();
const USER_ENSURE_TTL_MS = 60_000;

export function modulesFromProfile(profile, fallback = []) {
  if (Array.isArray(fallback) && fallback.length) return fallback;
  const modules = ["political_profile"];
  if (Array.isArray(profile?.timeline) && profile.timeline.length) modules.push("timeline");
  if (Array.isArray(profile?.elections) && profile.elections.length) modules.push("election");
  if (profile?.influence && typeof profile.influence === "object") modules.push("influence");
  if (
    (Array.isArray(profile?.geographicReach) && profile.geographicReach.length) ||
    profile?.geographicMeta
  ) {
    modules.push("geographic");
  }
  if (Array.isArray(profile?.news) && profile.news.length) modules.push("news_sentiment");
  if (profile?.aiSummary) modules.push("ai_insight");
  return modules;
}

/**
 * Core indexer for a single user. Creates missing cards; refreshes stale ones.
 */
export async function ensureHubIndexForUser(userId, { force = false } = {}) {
  if (!userId) return { created: 0, updated: 0, skipped: 0, profiles: 0 };

  const uid = String(userId);
  if (backfillInFlight.has(uid)) {
    return { created: 0, updated: 0, skipped: 0, profiles: 0, deferred: true };
  }

  const cachedAt = userEnsureCache.get(uid);
  if (!force && cachedAt && Date.now() - cachedAt < USER_ENSURE_TTL_MS) {
    return { created: 0, updated: 0, skipped: 0, profiles: 0, cached: true };
  }

  backfillInFlight.add(uid);
  try {
    const accounts = await Account.find({ userId })
      .select("_id name party state thumbnail thumbnails userId")
      .lean();

    if (!accounts.length) {
      userEnsureCache.set(uid, Date.now());
      return { created: 0, updated: 0, skipped: 0, profiles: 0 };
    }

    const accountIds = accounts.map((a) => a._id);
    const accountById = new Map(accounts.map((a) => [String(a._id), a]));

    const profiles = await PoliticalProfile.find({
      accountId: { $in: accountIds },
    })
      .select(
        "_id accountId biography confidenceScore aiSummary timeline elections influence geographicReach geographicMeta news builderVersion profileSchemaVersion syncStatus updatedAt"
      )
      .lean();

    if (!profiles.length) {
      userEnsureCache.set(uid, Date.now());
      return { created: 0, updated: 0, skipped: 0, profiles: 0 };
    }

    // Lightweight coverage check — only backfill missing account cards
    if (!force) {
      const indexedAccountIds = await SavedReport.distinct("accountId", {
        userId,
        type: "political_profile",
        accountId: { $in: accountIds },
        status: { $ne: "archived" },
      });
      const indexed = new Set(indexedAccountIds.map(String));
      const missing = profiles.filter(
        (p) => p.accountId && !indexed.has(String(p.accountId))
      );
      if (missing.length === 0) {
        const refreshed = await refreshStaleHubCards(userId, profiles, accountById);
        userEnsureCache.set(uid, Date.now());
        return {
          created: 0,
          updated: refreshed,
          skipped: profiles.length,
          profiles: profiles.length,
        };
      }
    }

    const existing = await SavedReport.find({
      userId,
      type: "political_profile",
      $or: [
        { accountId: { $in: accountIds } },
        { profileId: { $in: profiles.map((p) => p._id) } },
      ],
    })
      .select("_id accountId profileId updatedAt")
      .lean();

    const reportByAccount = new Map();
    for (const r of existing) {
      if (r.accountId) reportByAccount.set(String(r.accountId), r);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const profile of profiles) {
      const accountIdStr = profile.accountId ? String(profile.accountId) : null;
      const accountLean = accountById.get(accountIdStr);
      if (!accountLean) {
        skipped += 1;
        continue;
      }

      const account = { ...accountLean, userId };
      const existingReport = accountIdStr ? reportByAccount.get(accountIdStr) : null;
      const profileUpdated = profile.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
      const reportUpdated = existingReport?.updatedAt
        ? new Date(existingReport.updatedAt).getTime()
        : 0;
      const needsRefresh = !existingReport || profileUpdated > reportUpdated;

      if (existingReport && !needsRefresh) {
        skipped += 1;
        continue;
      }

      const result = await autoSavePoliticalProfileReport(account, profile, {
        sectionsBuilt: modulesFromProfile(profile),
        skipQuota: true,
      });

      if (!result) {
        skipped += 1;
        continue;
      }

      if (result.created) created += 1;
      else if (result.updated) updated += 1;
      else skipped += 1;

      if (accountIdStr && result.report) {
        reportByAccount.set(accountIdStr, {
          _id: result.report._id,
          accountId: accountIdStr,
          updatedAt: new Date(),
        });
      }
    }

    userEnsureCache.set(uid, Date.now());
    return { created, updated, skipped, profiles: profiles.length };
  } finally {
    backfillInFlight.delete(uid);
  }
}

async function refreshStaleHubCards(userId, profiles, accountById) {
  let updated = 0;
  const accountIds = profiles.map((p) => p.accountId).filter(Boolean);
  const reports = await SavedReport.find({
    userId,
    type: "political_profile",
    accountId: { $in: accountIds },
    status: { $ne: "archived" },
  })
    .select("_id accountId updatedAt")
    .lean();

  const byAccount = new Map(reports.map((r) => [String(r.accountId), r]));

  for (const profile of profiles) {
    const aid = profile.accountId ? String(profile.accountId) : null;
    if (!aid) continue;
    const report = byAccount.get(aid);
    if (!report) continue;
    const profileUpdated = profile.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
    const reportUpdated = report.updatedAt ? new Date(report.updatedAt).getTime() : 0;
    if (profileUpdated <= reportUpdated) continue;

    const accountLean = accountById.get(aid);
    if (!accountLean) continue;

    const result = await autoSavePoliticalProfileReport(
      { ...accountLean, userId },
      profile,
      { sectionsBuilt: modulesFromProfile(profile), skipQuota: true }
    );
    if (result?.updated) updated += 1;
  }
  return updated;
}

/**
 * One-time (process) legacy backfill for all users who own PoliticalProfiles.
 * Safe to call on startup — guarded by globalBackfillStarted.
 * Runs shareToken repair first so creates are not blocked by E11000.
 */
export async function backfillAllHubIndexes() {
  if (globalBackfillStarted) return { skipped: true };
  globalBackfillStarted = true;

  if (process.env.NODE_ENV === "test") {
    return { skipped: true, reason: "test" };
  }

  try {
    const { repairShareTokenNulls } = await import("./hubIndexRepair.js");
    await repairShareTokenNulls();

    const accountIds = await PoliticalProfile.distinct("accountId");
    if (!accountIds.length) return { users: 0, created: 0 };

    const accounts = await Account.find({ _id: { $in: accountIds } })
      .select("userId")
      .lean();

    const userIds = [
      ...new Set(
        accounts
          .map((a) => (a.userId ? String(a.userId) : null))
          .filter(Boolean)
      ),
    ];

    let created = 0;
    let updated = 0;
    let failed = 0;
    for (const uid of userIds) {
      if (!mongoose.Types.ObjectId.isValid(uid)) continue;
      userEnsureCache.delete(uid);
      const result = await ensureHubIndexForUser(uid, { force: true });
      created += result.created || 0;
      updated += result.updated || 0;
      if (result.error) failed += 1;
    }

    console.log(
      `[HubIndex] Legacy backfill complete users=${userIds.length} created=${created} updated=${updated} failed=${failed}`
    );
    return { users: userIds.length, created, updated, failed };
  } catch (err) {
    console.warn("[HubIndex] Legacy backfill failed:", err.message);
    return { error: err.message };
  }
}

/**
 * Lightweight entry for list endpoint — TTL-cached, coverage-gated.
 * Forces a one-shot repair+index on first hub visit after deploy if cards are missing.
 */
export async function ensureHubIndexIncremental(userId) {
  // First call after process start: clear null tokens so creates succeed
  if (!userEnsureCache.has("__share_repaired__")) {
    try {
      const { repairShareTokenNulls } = await import("./hubIndexRepair.js");
      await repairShareTokenNulls();
      userEnsureCache.set("__share_repaired__", Date.now());
    } catch (err) {
      console.warn("[HubIndex] shareToken repair on demand:", err.message);
    }
  }
  return ensureHubIndexForUser(userId, { force: false });
}
