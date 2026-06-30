import cron from "node-cron";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import axios from "axios";
import { scrapeXProfile } from "../scrapers/xScraper.js";
import { getCreatorAnalyticsData } from "../controllers/compareController.js";

// Helper to scrape/fetch metrics and save a snapshot
export const runSnapshotSync = async (frequencyLabel = "Scheduled") => {
  try {
    console.log(`[Snapshot Job] Running ${frequencyLabel} snapshot sync...`);

    const accounts = await Account.find({ isActive: true });
    console.log(`[Snapshot Job] Syncing ${accounts.length} active accounts...`);

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

        if (account.platform === "youtube") {
          const analytics = await getCreatorAnalyticsData(account.accountId);
          if (analytics) {
            followers = analytics.subscribers;
            views = analytics.totalViews;
            videos = analytics.totalVideos;
            likes = Math.round(analytics.avgLikes * Math.min(analytics.totalVideos || 1, 10));
            comments = Math.round(analytics.avgComments * Math.min(analytics.totalVideos || 1, 10));
            engagementRate = analytics.engagementRate;
            averageEngagement = analytics.averageEngagement;
            profileImage = account.profileImage || analytics.thumbnail || "";

            // Update Account stats
            await Account.updateOne(
              { _id: account._id },
              {
                $set: {
                  subscribers: followers,
                  views,
                  videos,
                  engagement: engagementRate,
                  lastSynced: new Date(),
                }
              }
            );
          }
        } else if (account.platform === "x") {
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
        }

        // Only save snapshot if we retrieved a valid status (e.g. followers > 0 or views > 0)
        if (followers > 0 || views > 0) {
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
            capturedAt: new Date(),
          });
          console.log(`[Snapshot Job] Captured snapshot for ${account.name} (${account.platform})`);
        }
      } catch (err) {
        console.error(`[Snapshot Job] Failed to sync account ${account.name}:`, err.message);
      }
    }
    console.log(`[Snapshot Job] Finished ${frequencyLabel} snapshot sync.`);
  } catch (error) {
    console.error(`[Snapshot Job] Critical error in runSnapshotSync:`, error);
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
