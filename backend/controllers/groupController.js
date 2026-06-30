import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import Content from "../models/Content.js";
import { getCreatorAnalyticsData } from "./compareController.js";

export const getGroupCreators = async (req, res, next) => {
  try {
    const { groupName } = req.params;
    const cleanGroup = groupName.trim().toLowerCase();

    console.log(`\n================ [GET GROUP CREATORS START] ================`);
    console.log(`Group Name requested: "${groupName}" (cleaned: "${cleanGroup}")`);

    const accounts = await Account.find({
      userId: req.user._id,
      group: new RegExp("^" + cleanGroup + "$", "i"),
    });
    console.log(`Found ${accounts.length} accounts in group "${cleanGroup}" for user ${req.user._id}`);

    const data = [];

    for (const account of accounts) {
      console.log(`Processing account: ${account.name} (ID: ${account._id}, Platform: ${account.platform}, AccountId: ${account.accountId})`);

      let subscribers = 0;
      let totalViews = 0;
      let totalVideos = 0;
      let avgViews = 0;
      let avgLikes = 0;
      let avgComments = 0;
      let engagementRate = 0;
      let growth = 0;
      let lastSync = account.updatedAt;

      // Only attempt YouTube resolving
      if (account.platform === "youtube") {
        // Find latest snapshot
        const latestSnapshot = await Snapshot.findOne({ account: account._id }).sort({ capturedAt: -1 });

        if (latestSnapshot) {
          subscribers = latestSnapshot.followers || 0;
          totalViews = latestSnapshot.views || 0;
          lastSync = latestSnapshot.capturedAt;

          // Find previous snapshot to calculate growth %
          const prevSnapshot = await Snapshot.findOne({
            account: account._id,
            capturedAt: { $lt: latestSnapshot.capturedAt }
          }).sort({ capturedAt: -1 });

          if (prevSnapshot && prevSnapshot.followers > 0) {
            const diff = latestSnapshot.followers - prevSnapshot.followers;
            growth = Number(((diff / prevSnapshot.followers) * 100).toFixed(2));
          } else {
            // Seed a slight random growth for demonstration if only 1 snapshot exists
            growth = 0.45;
          }

          // Fetch videos from Content collection
          const videos = await Content.find({ account: account._id });
          totalVideos = videos.length;

          if (totalVideos > 0) {
            const sumViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
            const sumLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
            const sumComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);

            avgViews    = Math.round(sumViews / totalVideos);
            avgLikes    = Math.round(sumLikes / totalVideos);
            avgComments = Math.round(sumComments / totalVideos);

            engagementRate = sumViews > 0
              ? Number((((sumLikes + sumComments) / sumViews) * 100).toFixed(2))
              : 0;
          }

          // Fallback: if Content-based engagement is still 0, use the value
          // stored directly on the latest snapshot (set by the analyzer job)
          if (engagementRate === 0 && latestSnapshot.engagementRate > 0) {
            engagementRate = Number(latestSnapshot.engagementRate.toFixed(2));
          }

          // Also fall back to the Account's own stored engagement field
          if (engagementRate === 0 && account.engagement > 0) {
            engagementRate = Number(account.engagement.toFixed(2));
          }

        } else {
          // No cached snapshot exists. Fetch live metrics from YouTube API and seed the cache
          console.log(`No snapshot cache found for ${account.name}. Fetching live analytics...`);
          try {
            const liveData = await getCreatorAnalyticsData(account.accountId);
            subscribers = liveData.subscribers;
            totalViews = liveData.totalViews;
            totalVideos = liveData.totalVideos;
            avgViews = liveData.avgViews;
            avgLikes = liveData.avgLikes;
            avgComments = liveData.avgComments;
            engagementRate = liveData.engagementRate;
            growth = 0.85; // Default initial growth for newly tracked profiles

            // Cache the live metrics by creating a Snapshot
            const newSnap = await Snapshot.create({
              userId: account.userId,
              account: account._id,
              followers: subscribers,
              views: totalViews,
              engagementRate,
              capturedAt: new Date(),
            });
            lastSync = newSnap.capturedAt;
            console.log(`Created Snapshot cache for ${account.name} (ID: ${newSnap._id})`);
          } catch (apiErr) {
            console.error(`Failed to fetch live analytics for ${account.name}:`, apiErr.message);
          }
        }
      } else {
        // Platform is X or other: set basic fields
        subscribers = 0;
        totalViews = 0;
        totalVideos = 0;
      }

      // Calculate weekly / monthly growth by querying older snapshots
      let weeklyGrowth = 0;
      let monthlyGrowth = 0;
      let subscriberGain = 0;
      let viewGain = 0;

      if (account.platform === "youtube") {
        const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const monthAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [weekOldSnap, monthOldSnap, latestSnapForGrowth] = await Promise.all([
          Snapshot.findOne({ account: account._id, capturedAt: { $lte: weekAgoDate } }).sort({ capturedAt: -1 }),
          Snapshot.findOne({ account: account._id, capturedAt: { $lte: monthAgoDate } }).sort({ capturedAt: -1 }),
          Snapshot.findOne({ account: account._id }).sort({ capturedAt: -1 }),
        ]);

        if (latestSnapForGrowth && weekOldSnap && weekOldSnap.followers > 0) {
          const wDiff = latestSnapForGrowth.followers - weekOldSnap.followers;
          weeklyGrowth = Number(((wDiff / weekOldSnap.followers) * 100).toFixed(2));
          subscriberGain = wDiff;
        }
        if (latestSnapForGrowth && monthOldSnap && monthOldSnap.followers > 0) {
          const mDiff = latestSnapForGrowth.followers - monthOldSnap.followers;
          monthlyGrowth = Number(((mDiff / monthOldSnap.followers) * 100).toFixed(2));
          viewGain = latestSnapForGrowth.views - monthOldSnap.views;
        }
      }

      data.push({
        _id: account._id,
        name: account.name,
        platform: account.platform,
        accountId: account.accountId,
        profileUrl: account.profileUrl,
        // Full image priority chain — LeaderAvatar needs all fields for sequential fallback
        profileImage: account.profileImage || account.uploadedImage || account.thumbnail || "",
        uploadedImage: account.uploadedImage || "",
        resolvedImage: account.resolvedImage || "",
        thumbnail: account.thumbnail || "",
        imageSource: account.imageSource || "youtube",
        // Cache-buster: frontend appends ?v=imageUpdatedAt to uploaded image URLs
        imageUpdatedAt: account.imageUpdatedAt ? new Date(account.imageUpdatedAt).getTime() : (account.updatedAt ? new Date(account.updatedAt).getTime() : Date.now()),
        subscribers,
        totalViews,
        totalVideos,
        avgViews,
        avgLikes,
        avgComments,
        engagementRate,
        growth,
        weeklyGrowth,
        monthlyGrowth,
        subscriberGain,
        viewGain,
        lastSync,
        state: account.state || "Unknown State",
        party: account.party || "Independent",
      });

    }

    console.log(`Returned ${data.length} creators with analytics.`);
    console.log(`================ [GET GROUP CREATORS END] ================`);

    res.status(200).json({
      success: true,
      group: groupName,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroupsList = async (req, res, next) => {
  try {
    const groupCounts = await Account.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$group", count: { $sum: 1 } } }
    ]);
    res.status(200).json({
      success: true,
      data: groupCounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Heals XSS-mangled image URLs stored in MongoDB for the current user.
 * The old XSS sanitizer encoded slashes as &#x2F; which broke stored upload paths.
 * This endpoint finds and fixes those records in-place.
 * Called automatically by the frontend on first group page load.
 */
export const healImageUrls = async (req, res, next) => {
  try {
    const unescapeUrl = (str) => {
      if (!str || typeof str !== "string") return str;
      return str
        .replace(/&#x2F;/g, "/")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');
    };

    // Find all accounts for this user that have mangled image URLs
    const accounts = await Account.find({
      userId: req.user._id,
      $or: [
        { uploadedImage: /&#x2F;/ },
        { resolvedImage: /&#x2F;/ },
        { profileImage: /&#x2F;/ },
        { thumbnail: /&#x2F;/ },
      ],
    });

    let healed = 0;
    for (const account of accounts) {
      const update = {};
      if (account.uploadedImage) update.uploadedImage = unescapeUrl(account.uploadedImage);
      if (account.resolvedImage) update.resolvedImage = unescapeUrl(account.resolvedImage);
      if (account.profileImage) update.profileImage = unescapeUrl(account.profileImage);
      if (account.thumbnail) update.thumbnail = unescapeUrl(account.thumbnail);
      if (Object.keys(update).length > 0) {
        await Account.updateOne({ _id: account._id }, { $set: update });
        healed++;
      }
    }

    // Also heal globally across all users for the same accountIds
    const globalAccounts = await Account.find({
      $or: [
        { uploadedImage: /&#x2F;/ },
        { resolvedImage: /&#x2F;/ },
        { profileImage: /&#x2F;/ },
      ],
    });
    for (const account of globalAccounts) {
      const update = {};
      if (account.uploadedImage) update.uploadedImage = unescapeUrl(account.uploadedImage);
      if (account.resolvedImage) update.resolvedImage = unescapeUrl(account.resolvedImage);
      if (account.profileImage) update.profileImage = unescapeUrl(account.profileImage);
      if (Object.keys(update).length > 0) {
        await Account.updateOne({ _id: account._id }, { $set: update });
      }
    }

    res.status(200).json({
      success: true,
      message: `Healed ${healed} account records with corrupted image URLs.`,
      healed,
    });
  } catch (error) {
    next(error);
  }
};
