import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import Content from "../models/Content.js";
import { getChannelStats } from "../services/youtubeService.js";
import {
  getChannelVideos,
  getVideoStats,
} from "../services/youtubeVideoService.js";
import { syncAllYoutubeChannels } from "../jobs/youtubeSyncJob.js";
import { getCreatorAnalyticsData } from "./compareController.js";

/*
========================================
Sync Single Channel Snapshot
========================================
*/
export const syncYoutubeChannel = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    // Fetch comprehensive real-time statistics
    const analytics = await getCreatorAnalyticsData(account.accountId);

    // Sync back to Account
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

    const snapshot = await Snapshot.create({
      account: account._id,
      userId: req.user._id,
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

    res.status(200).json({
      success: true,
      channel: account.name,
      snapshot,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================================
Sync All Channels for current user
========================================
*/
export const syncAllChannels = async (req, res, next) => {
  try {
    await syncAllYoutubeChannels(req.user._id);

    res.status(200).json({
      success: true,
      message: "Sync completed for your channels",
    });
  } catch (error) {
    next(error);
  }
};

/*
========================================
Sync Channel Videos
========================================
*/
export const syncChannelContent = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const videos = await getChannelVideos(account.accountId);

    let stored = 0;

    for (const video of videos) {
      if (!video.id?.videoId) continue;

      const stats = await getVideoStats(video.id.videoId);

      if (!stats) continue;

      await Content.findOneAndUpdate(
        {
          contentId: video.id.videoId,
          userId: req.user._id,
        },
        {
          account: account._id,
          contentId: video.id.videoId,
          userId: req.user._id,
          title: stats.snippet?.title || "",
          thumbnail:
            stats.snippet?.thumbnails?.high?.url ||
            stats.snippet?.thumbnails?.medium?.url ||
            stats.snippet?.thumbnails?.default?.url ||
            "",
          views: Number(stats.statistics?.viewCount || 0),
          likes: Number(stats.statistics?.likeCount || 0),
          comments: Number(stats.statistics?.commentCount || 0),
          publishedAt: stats.snippet?.publishedAt,
        },
        {
          upsert: true,
          new: true,
        },
      );

      stored++;
    }

    res.status(200).json({
      success: true,
      stored,
    });
  } catch (error) {
    next(error);
  }
};
