import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import { getChannelStats } from "../services/youtubeService.js";

export const syncAllYoutubeChannels = async (userId = null) => {
  try {
    const filter = {
      platform: "youtube",
      isActive: true,
    };
    if (userId) {
      filter.userId = userId;
    }

    const accounts = await Account.find(filter);

    console.log(`[Job] Syncing ${accounts.length} YouTube channels...`);

    for (const account of accounts) {
      try {
        const channel = await getChannelStats(account.accountId);

        await Snapshot.create({
          account: account._id,
          followers: Number(channel.statistics.subscriberCount || 0),
          views: Number(channel.statistics.viewCount || 0),
          userId: account.userId, // Maintain user isolation
        });

        console.log(`[Job] Synced ${account.name} successfully.`);
      } catch (err) {
        console.error(`[Job] Error syncing YouTube channel ${account.name}:`, err.message);
      }
    }

    console.log("[Job] YouTube Sync Complete");
  } catch (error) {
    console.error("[Job] Sync job critical error:", error);
  }
};