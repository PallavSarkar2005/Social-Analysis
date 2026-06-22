import cron from "node-cron";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import axios from "axios";
import { scrapeXProfile } from "../scrapers/xScraper.js";
import { getChannelStats } from "../services/youtubeService.js";

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

        if (account.platform === "youtube") {
          const channel = await getChannelStats(account.accountId);
          if (channel && channel.statistics) {
            followers = Number(channel.statistics.subscriberCount || 0);
            views = Number(channel.statistics.viewCount || 0);
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
