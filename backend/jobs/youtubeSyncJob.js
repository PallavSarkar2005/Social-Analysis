import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import { getCreatorAnalyticsData } from "../controllers/compareController.js";

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
        const analytics = await getCreatorAnalyticsData(account.accountId);

        // Update Account stats
        await Account.updateOne(
          { _id: account._id },
          {
            $set: {
              subscribers: analytics.subscribers,
              views: analytics.totalViews,
              videos: analytics.totalVideos,
              engagement: analytics.engagementRate,
              lastSynced: new Date(),
            }
          }
        );

        await Snapshot.create({
          account: account._id,
          userId: account.userId,
          followers: analytics.subscribers,
          views: analytics.totalViews,
          videos: analytics.totalVideos,
          likes: Math.round(analytics.avgLikes * Math.min(analytics.totalVideos || 1, 10)),
          comments: Math.round(analytics.avgComments * Math.min(analytics.totalVideos || 1, 10)),
          engagementRate: analytics.engagementRate,
          averageEngagement: analytics.averageEngagement,
          party: account.party || "Independent",
          state: account.state || "Unknown State",
          name: account.name,
          profileImage: account.profileImage || analytics.thumbnail || "",
          capturedAt: new Date(),
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