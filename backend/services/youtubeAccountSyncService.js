import Account from "../models/Account.js";
import Content from "../models/Content.js";
import Snapshot from "../models/Snapshot.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import { getCreatorAnalyticsData } from "../controllers/compareController.js";
import { captureSnapshot as captureAnalyticsSnapshot } from "./analyticsEngine.js";
export const buildRecentVideoRecord = (video) => ({
  id: {
    kind: "youtube#video",
    videoId: video.id,
  },
  snippet: video.snippet,
  statistics: video.statistics,
  type: video.type || "video",
});

export const summarizeRecentVideoMetrics = (recentVideos = []) => {
  const totalLikes = recentVideos.reduce(
    (sum, video) => sum + Number(video.statistics?.likeCount || 0),
    0
  );
  const totalComments = recentVideos.reduce(
    (sum, video) => sum + Number(video.statistics?.commentCount || 0),
    0
  );

  const averageEngagement = recentVideos.length > 0
    ? recentVideos.reduce((sum, video) => {
        const views = Number(video.statistics?.viewCount || 0);
        const likes = Number(video.statistics?.likeCount || 0);
        const comments = Number(video.statistics?.commentCount || 0);
        return sum + (views > 0 ? (((likes + comments) / views) * 100) : 0);
      }, 0) / recentVideos.length
    : 0;

  return {
    totalLikes: Math.round(totalLikes),
    totalComments: Math.round(totalComments),
    averageEngagement: Number(averageEngagement.toFixed(2)),
  };
};

export const syncRecentYoutubeContent = async (account, userId, recentVideos = []) => {
  const operations = recentVideos
    .filter((video) => video?.id?.videoId)
    .map((video) => ({
      updateOne: {
        filter: {
          contentId: video.id.videoId,
          userId,
        },
        update: {
          $set: {
            account: account._id,
            contentId: video.id.videoId,
            userId,
            title: video.snippet?.title || "",
            thumbnail:
              video.snippet?.thumbnails?.high?.url ||
              video.snippet?.thumbnails?.medium?.url ||
              video.snippet?.thumbnails?.default?.url ||
              "",
            type: video.type === "short" ? "short" : "video",
            views: Number(video.statistics?.viewCount || 0),
            likes: Number(video.statistics?.likeCount || 0),
            comments: Number(video.statistics?.commentCount || 0),
            publishedAt: video.snippet?.publishedAt || null,
          },
        },
        upsert: true,
      },
    }));

  if (operations.length === 0) {
    return 0;
  }

  await Content.bulkWrite(operations);
  return operations.length;
};

const buildSnapshotPayload = (account, analytics, recentVideoMetrics) => ({
  account: account._id,
  userId: account.userId,
  followers: Number(account.subscribers || 0),
  views: Number(account.views || 0),
  videos: Number(account.videos || 0),
  likes: recentVideoMetrics.totalLikes,
  comments: recentVideoMetrics.totalComments,
  engagementRate: Number(account.engagement || 0),
  averageEngagement: Number(
    analytics.averageEngagement || recentVideoMetrics.averageEngagement || 0
  ),
  party: account.party || "Independent",
  state: account.state || "Unknown State",
  name: account.name || "",
  profileImage: account.profileImage || account.thumbnail || "",
});

const shouldSkipSnapshot = (latestSnapshot, nextSnapshot) => {
  if (!latestSnapshot) return false;

  return (
    Number(latestSnapshot.followers || 0) === Number(nextSnapshot.followers || 0) &&
    Number(latestSnapshot.views || 0) === Number(nextSnapshot.views || 0) &&
    Number(latestSnapshot.videos || 0) === Number(nextSnapshot.videos || 0) &&
    Number(latestSnapshot.likes || 0) === Number(nextSnapshot.likes || 0) &&
    Number(latestSnapshot.comments || 0) === Number(nextSnapshot.comments || 0) &&
    Number(latestSnapshot.engagementRate || 0) === Number(nextSnapshot.engagementRate || 0) &&
    Number(latestSnapshot.averageEngagement || 0) === Number(nextSnapshot.averageEngagement || 0)
  );
};

export const syncYoutubeAccountTelemetry = async (
  account,
  { forceRefresh = false, logPrefix = "[YouTube Sync]" } = {}
) => {
  const analytics = await getCreatorAnalyticsData(account.accountId, forceRefresh);
  const recentVideos = (analytics.recentVideos || []).map(buildRecentVideoRecord);
  const recentVideoMetrics = summarizeRecentVideoMetrics(recentVideos);
  const syncTimestamp = new Date();

  const updatedAccount = await Account.findOneAndUpdate(
    { _id: account._id },
    {
      $set: {
        name: analytics.name || account.name,
        description: analytics.description || account.description || "",
        thumbnail: analytics.thumbnail || account.thumbnail || "",
        subscribers: Number(analytics.subscribers || 0),
        views: Number(analytics.totalViews || 0),
        videos: Number(analytics.totalVideos || 0),
        engagement: Number(analytics.engagementRate || 0),
        recentVideos,
        lastSynced: syncTimestamp,
      },
    },
    { new: true }
  );

  const syncedContentCount = await syncRecentYoutubeContent(
    updatedAccount,
    updatedAccount.userId,
    recentVideos
  );

  const profile = await PoliticalProfile.findOne({ accountId: updatedAccount._id });

  const latestSnapshot = await Snapshot.findOne({
    account: updatedAccount._id,
    userId: updatedAccount.userId,
  })
    .sort({ capturedAt: -1 })
    .lean();

  const nextSnapshot = buildSnapshotPayload(
    updatedAccount,
    analytics,
    recentVideoMetrics
  );

  let snapshot = null;
  let snapshotCreated = false;
  let snapshotSkipped = false;

  if (shouldSkipSnapshot(latestSnapshot, nextSnapshot)) {
    snapshotSkipped = true;
    console.log(`${logPrefix} Snapshot skipped for ${updatedAccount.name} (no telemetry changes).`);
  } else {
    snapshot = await Snapshot.create({
      ...nextSnapshot,
      capturedAt: syncTimestamp,
    });
    snapshotCreated = true;
    console.log(`${logPrefix} Snapshot created for ${updatedAccount.name}.`);
  }

  // Dual-write into AnalyticsEngine (SSoT for all graphs). Force when legacy snapshot written.
  let analyticsCapture = null;
  try {
    analyticsCapture = await captureAnalyticsSnapshot({
      userId: updatedAccount.userId,
      accountId: updatedAccount._id,
      source: "youtube_sync",
      force: snapshotCreated,
      account: updatedAccount,
      politicalProfile: profile,
      contentStats: {
        totalLikes: recentVideoMetrics.totalLikes,
        totalComments: recentVideoMetrics.totalComments,
        averageEngagement: recentVideoMetrics.averageEngagement,
      },
      capturedAt: syncTimestamp,
    });
  } catch (analyticsErr) {
    console.warn(
      `${logPrefix} AnalyticsEngine capture failed for ${updatedAccount.name}:`,
      analyticsErr.message
    );
  }

  return {
    account: updatedAccount,
    profile,
    analytics,
    syncedContentCount,
    snapshot,
    snapshotCreated,
    snapshotSkipped,
    analyticsCapture,
  };
};
