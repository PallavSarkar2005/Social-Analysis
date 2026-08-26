import cron from "node-cron";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import axios from "axios";
import { scrapeXProfile } from "../scrapers/xScraper.js";
import { syncAllYoutubeChannels } from "./youtubeSyncJob.js";
import { syncAllProfileAccounts } from "../services/profileBuilderService.js";
import { validateAllProfileIdentities } from "../services/profileIdentityValidationService.js";
import { captureSnapshot as captureAnalyticsSnapshot } from "../services/analyticsEngine.js";

// Helper to scrape/fetch metrics and save a snapshot
export const runSnapshotSync = async (frequencyLabel = "Scheduled") => {
  const startedAt = new Date();
  try {
    console.log(`[Snapshot Job] Running ${frequencyLabel} snapshot sync at ${startedAt.toISOString()}...`);

    const youtubeSummary = await syncAllYoutubeChannels(null, {
      reasonLabel: `${frequencyLabel} Snapshot Job`,
      forceRefresh: false,
      useLock: true,
    });

    const identityReport = await validateAllProfileIdentities({
      repair: true,
      logPrefix: `[Snapshot Job:${frequencyLabel}] Identity Validation`,
    });
    console.log(
      `[Snapshot Job] Identity validation: checked=${identityReport.profilesChecked} repaired=${identityReport.profilesRepaired} failed=${identityReport.profilesFailed} manualReview=${identityReport.profilesManualReview} rebuildsScheduled=${identityReport.rebuildsScheduled}`
    );

    const profileUpgradeSummary = await syncAllProfileAccounts({
      logPrefix: `[Snapshot Job:${frequencyLabel}] Profile Upgrade`,
    });
    console.log(
      `[Snapshot Job] Profile upgrade summary: processed=${profileUpgradeSummary.processed} updated=${profileUpgradeSummary.updated} migrated=${profileUpgradeSummary.migrated} skipped=${profileUpgradeSummary.skipped}`
    );

    const accounts = await Account.find({ isActive: true, platform: { $ne: "youtube" } });
    console.log(`[Snapshot Job] Syncing ${accounts.length} non-YouTube active accounts...`);
    let xSnapshotsCreated = 0;
    let xFailures = 0;

    for (const account of accounts) {
      try {
        let followers = 0;
        let views = 0;
        let videos = 0;
        let likes = 0;
        let comments = 0;
        let engagementRate = 0;
        let averageEngagement = 0;
        let profileImage = account.profileImage || account.thumbnail || "";

        if (account.platform === "x") {
          const profile = await scrapeXProfile(account.accountId);
          if (profile) {
            const parseMetric = (val) => {
              if (!val) return 0;
              const clean = val.toString().replace(/,/g, "").trim();
              if (clean.endsWith("K")) return Math.round(parseFloat(clean) * 1000);
              if (clean.endsWith("M")) return Math.round(parseFloat(clean) * 1000000);
              return Number(clean);
            };
            followers = parseMetric(profile.followers);
            views = 0;
          }
        } else if (account.platform === "political") {
          // Political platform profiles have no YouTube/X channel to sync.
          // Skip silently — this is not a failure.
          console.log(`[Snapshot Job] Skipped ${account.name} (platform=political, no social channel to sync).`);
          continue;
        }

        // Only save snapshot if we retrieved a valid status (e.g. followers > 0 or views > 0)
        if (followers > 0 || views > 0) {
          const capturedAt = new Date();
          await Snapshot.create({
            account: account._id,
            userId: account.userId,
            followers,
            views,
            videos,
            likes,
            comments,
            engagementRate,
            averageEngagement,
            party: account.party || "Independent",
            state: account.state || "Unknown State",
            name: account.name,
            profileImage,
            capturedAt,
          });
          xSnapshotsCreated += 1;
          console.log(`[Snapshot Job] Captured snapshot for ${account.name} (${account.platform})`);

          try {
            await captureAnalyticsSnapshot({
              userId: account.userId,
              accountId: account._id,
              source: "x_sync",
              force: true,
              account: {
                ...account.toObject?.() || account,
                subscribers: followers,
                views,
                videos,
                engagement: engagementRate,
                profileImage,
              },
              capturedAt,
            });
          } catch (analyticsErr) {
            console.warn(
              `[Snapshot Job] AnalyticsEngine capture failed for ${account.name}:`,
              analyticsErr.message
            );
          }
        }
      } catch (err) {
        xFailures += 1;
        console.error(`[Snapshot Job] Failed to sync account ${account.name}:`, err.message);
      }
    }
    const endedAt = new Date();
    const runtimeMs = endedAt.getTime() - startedAt.getTime();
    const totalProcessed = youtubeSummary.accountsProcessed + accounts.length;
    const totalCreated = youtubeSummary.snapshotsCreated + xSnapshotsCreated;
    const totalSkipped = youtubeSummary.snapshotsSkipped;
    const totalFailures = youtubeSummary.apiFailures + xFailures;
    console.log(
      `[Snapshot Job] Finished ${frequencyLabel} snapshot sync. Start=${startedAt.toISOString()}, End=${endedAt.toISOString()}, RuntimeMs=${runtimeMs}, RuntimeSeconds=${(runtimeMs / 1000).toFixed(2)}, Processed=${totalProcessed}, Created=${totalCreated}, Skipped=${totalSkipped}, Failures=${totalFailures}; YouTube processed=${youtubeSummary.accountsProcessed}, created=${youtubeSummary.snapshotsCreated}, skipped=${youtubeSummary.snapshotsSkipped}, failures=${youtubeSummary.apiFailures}, executionSkipped=${youtubeSummary.executionSkipped ? "yes" : "no"}; X processed=${accounts.length}, created=${xSnapshotsCreated}, failures=${xFailures}; YouTubeApiRequests=${youtubeSummary.apiUsage?.requestCount ?? 0}, YouTubeApiQuotaCost=${youtubeSummary.apiUsage?.quotaCost ?? 0}, YouTubeApiCachedHits=${youtubeSummary.apiUsage?.cachedHits ?? 0}, YouTubeApiLiveRequests=${youtubeSummary.apiUsage?.liveRequests ?? 0}, YouTubeApiFailures=${youtubeSummary.apiUsage?.failures ?? 0}.`
    );
  } catch (error) {
    const endedAt = new Date();
    const runtimeMs = endedAt.getTime() - startedAt.getTime();
    console.error(
      `[Snapshot Job] Critical error in runSnapshotSync. Start=${startedAt.toISOString()}, End=${endedAt.toISOString()}, RuntimeMs=${runtimeMs}, RuntimeSeconds=${(runtimeMs / 1000).toFixed(2)}:`,
      error
    );
  }
};

// Start all Cron Jobs
export const startSnapshotJob = () => {
  // 1. Daily snapshot job - runs every day at midnight (00:00)
  cron.schedule("0 0 * * *", async () => {
    await runSnapshotSync("Daily");
  });

  // 2. Weekly snapshot job - runs every Sunday at midnight (00:00)
  cron.schedule("0 0 * * 0", async () => {
    await runSnapshotSync("Weekly");
  });

  // 3. Monthly snapshot job - runs on the 1st of every month at midnight (00:00)
  cron.schedule("0 0 1 * *", async () => {
    await runSnapshotSync("Monthly");
  });

  console.log("[Scheduler] Daily, Weekly, and Monthly snapshot cron jobs scheduled successfully.");
};
