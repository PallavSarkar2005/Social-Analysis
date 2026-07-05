import Account from "../models/Account.js";
import ApiUsage from "../models/ApiUsage.js";
import { syncYoutubeAccountTelemetry } from "../services/youtubeAccountSyncService.js";

let isYoutubeSyncJobRunning = false;
let activeYoutubeSyncJob = null;

const summarizeApiUsageWindow = async (startedAt, endedAt) => {
  const [summary] = await ApiUsage.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startedAt,
          $lte: endedAt,
        },
      },
    },
    {
      $group: {
        _id: null,
        requestCount: { $sum: 1 },
        quotaCost: { $sum: "$quotaCost" },
        cachedHits: {
          $sum: {
            $cond: ["$cached", 1, 0],
          },
        },
        liveRequests: {
          $sum: {
            $cond: ["$cached", 0, 1],
          },
        },
        failures: {
          $sum: {
            $cond: [{ $eq: ["$status", "success"] }, 0, 1],
          },
        },
      },
    },
  ]);

  return (
    summary || {
      requestCount: 0,
      quotaCost: 0,
      cachedHits: 0,
      liveRequests: 0,
      failures: 0,
    }
  );
};

export const syncAllYoutubeChannels = async (
  userId = null,
  { reasonLabel = "YouTube Sync", forceRefresh = false, useLock = false } = {}
) => {
  const startedAt = new Date();

  if (useLock && isYoutubeSyncJobRunning) {
    const activeReason = activeYoutubeSyncJob?.reasonLabel || "another scheduled sync";
    const activeStartedAt = activeYoutubeSyncJob?.startedAt;
    const runningForMs = activeStartedAt ? Date.now() - activeStartedAt.getTime() : null;

    console.warn(
      `[Job:${reasonLabel}] Skipped because ${activeReason} is already running${
        runningForMs != null ? ` (${runningForMs}ms so far)` : ""
      }.`
    );

    return {
      executionSkipped: true,
      startedAt,
      endedAt: startedAt,
      runtimeMs: 0,
      runtimeSeconds: 0,
      accountsProcessed: 0,
      snapshotsCreated: 0,
      snapshotsSkipped: 0,
      apiFailures: 0,
      apiUsage: {
        requestCount: 0,
        quotaCost: 0,
        cachedHits: 0,
        liveRequests: 0,
        failures: 0,
      },
    };
  }

  if (useLock) {
    isYoutubeSyncJobRunning = true;
    activeYoutubeSyncJob = {
      reasonLabel,
      startedAt,
    };
  }

  try {
    const filter = {
      platform: "youtube",
      isActive: true,
    };
    if (userId) {
      filter.userId = userId;
    }

    const accounts = await Account.find(filter);
    const summary = {
      executionSkipped: false,
      startedAt,
      accountsProcessed: accounts.length,
      snapshotsCreated: 0,
      snapshotsSkipped: 0,
      apiFailures: 0,
    };

    console.log(`[Job] Syncing ${accounts.length} YouTube channels for ${reasonLabel}...`);

    for (const account of accounts) {
      try {
        const result = await syncYoutubeAccountTelemetry(account, {
          forceRefresh,
          logPrefix: `[Job:${reasonLabel}]`,
        });

        if (result.snapshotCreated) {
          summary.snapshotsCreated += 1;
        } else if (result.snapshotSkipped) {
          summary.snapshotsSkipped += 1;
        }
      } catch (err) {
        summary.apiFailures += 1;
        console.error(`[Job:${reasonLabel}] Error syncing YouTube channel ${account.name}:`, err.message);
      }
    }

    const endedAt = new Date();
    const runtimeMs = endedAt.getTime() - startedAt.getTime();
    const apiUsage = await summarizeApiUsageWindow(startedAt, endedAt);

    console.log(
      `[Job:${reasonLabel}] Complete. Start=${startedAt.toISOString()}, End=${endedAt.toISOString()}, RuntimeMs=${runtimeMs}, RuntimeSeconds=${(runtimeMs / 1000).toFixed(2)}, Processed=${summary.accountsProcessed}, Created=${summary.snapshotsCreated}, Skipped=${summary.snapshotsSkipped}, Failures=${summary.apiFailures}, ApiRequests=${apiUsage.requestCount}, ApiQuotaCost=${apiUsage.quotaCost}, ApiCachedHits=${apiUsage.cachedHits}, ApiLiveRequests=${apiUsage.liveRequests}, ApiFailures=${apiUsage.failures}`
    );

    return {
      ...summary,
      endedAt,
      runtimeMs,
      runtimeSeconds: Number((runtimeMs / 1000).toFixed(2)),
      apiUsage,
    };
  } catch (error) {
    const endedAt = new Date();
    const runtimeMs = endedAt.getTime() - startedAt.getTime();
    const apiUsage = await summarizeApiUsageWindow(startedAt, endedAt);

    console.error(`[Job:${reasonLabel}] Sync job critical error:`, error);
    return {
      executionSkipped: false,
      startedAt,
      endedAt,
      runtimeMs,
      runtimeSeconds: Number((runtimeMs / 1000).toFixed(2)),
      accountsProcessed: 0,
      snapshotsCreated: 0,
      snapshotsSkipped: 0,
      apiFailures: 1,
      apiUsage,
    };
  } finally {
    if (useLock) {
      isYoutubeSyncJobRunning = false;
      activeYoutubeSyncJob = null;
    }
  }
};