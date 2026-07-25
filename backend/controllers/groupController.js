import Account from "../models/Account.js";
import Content from "../models/Content.js";
import {
  getLatest,
  getGrowthDeltas,
  captureSnapshot,
  computeAverageEngagement,
} from "../services/analyticsEngine.js";

/**
 * Group creators analytics — AnalyticsEngine only.
 * Never fabricates growth or engagement.
 */
export const getGroupCreators = async (req, res, next) => {
  try {
    const { groupName } = req.params;
    const cleanGroup = groupName.trim().toLowerCase();

    const accounts = await Account.find({
      userId: req.user._id,
      group: new RegExp("^" + cleanGroup + "$", "i"),
    });

    const data = [];

    for (const account of accounts) {
      const latest = await getLatest(account._id, { userId: req.user._id });
      const growthDeltas = await getGrowthDeltas(account._id, { userId: req.user._id });

      const videos = await Content.find({ account: account._id, userId: req.user._id })
        .select("views likes comments")
        .lean();

      const totalVideos = videos.length;
      let avgViews = null;
      let avgLikes = null;
      let avgComments = null;
      let engagementRate = latest.metrics?.engagementRate ?? null;

      if (totalVideos > 0) {
        const sumViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
        const sumLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
        const sumComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
        avgViews = Math.round(sumViews / totalVideos);
        avgLikes = Math.round(sumLikes / totalVideos);
        avgComments = Math.round(sumComments / totalVideos);
        if (engagementRate == null) {
          engagementRate = Number(computeAverageEngagement(videos).toFixed(2));
        }
      }

      // Growth: only when verified week-over-week percentage exists — never invent 0.45/0.85
      const growthPct = growthDeltas?.available
        ? growthDeltas.subscribers?.lastWeek?.percentage
        : null;
      const weeklyGrowth = growthDeltas?.available
        ? growthDeltas.subscribers?.lastWeek?.percentage
        : null;
      const monthlyGrowth = growthDeltas?.available
        ? growthDeltas.subscribers?.lastMonth?.percentage
        : null;
      const subscriberGain = growthDeltas?.available
        ? growthDeltas.subscribers?.lastWeek?.value
        : null;
      const viewGain = growthDeltas?.available
        ? growthDeltas.views?.lastMonth?.value
        : null;

      // If no analytics history yet, capture once from current Account (no fake metrics)
      if (!latest.available && account.platform === "youtube") {
        try {
          await captureSnapshot({
            userId: req.user._id,
            accountId: account._id,
            source: "manual",
            force: true,
            account,
          });
        } catch (err) {
          console.warn(`[Group] capture failed ${account.name}:`, err.message);
        }
      }

      const refreshed = latest.available
        ? latest
        : await getLatest(account._id, { userId: req.user._id });

      data.push({
        _id: account._id,
        name: account.name,
        platform: account.platform,
        accountId: account.accountId,
        profileUrl: account.profileUrl,
        profileImage: account.profileImage || account.resolvedImage || account.thumbnail || "",
        resolvedImage: account.resolvedImage || "",
        thumbnail: account.thumbnail || "",
        imageSource: account.imageSource || "youtube",
        imageUpdatedAt: account.imageUpdatedAt
          ? new Date(account.imageUpdatedAt).getTime()
          : account.updatedAt
            ? new Date(account.updatedAt).getTime()
            : Date.now(),
        subscribers: refreshed.metrics?.subscribers ?? null,
        totalViews: refreshed.metrics?.views ?? null,
        totalVideos,
        avgViews,
        avgLikes,
        avgComments,
        engagementRate,
        growth: growthPct,
        weeklyGrowth,
        monthlyGrowth,
        subscriberGain,
        viewGain,
        lastSync: refreshed.capturedAt || account.updatedAt,
        state: account.state || "Unknown State",
        party: account.party || "Independent",
        analyticsAvailable: refreshed.available === true,
        influenceScore: refreshed.metrics?.influenceScore ?? null,
      });
    }

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
      { $group: { _id: "$group", count: { $sum: 1 } } },
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

    const accounts = await Account.find({
      userId: req.user._id,
      $or: [
        { resolvedImage: /&#x2F;/ },
        { profileImage: /&#x2F;/ },
        { thumbnail: /&#x2F;/ },
      ],
    });

    let healed = 0;
    for (const account of accounts) {
      const update = {};
      if (account.resolvedImage) update.resolvedImage = unescapeUrl(account.resolvedImage);
      if (account.profileImage) update.profileImage = unescapeUrl(account.profileImage);
      if (account.thumbnail) update.thumbnail = unescapeUrl(account.thumbnail);
      if (Object.keys(update).length > 0) {
        await Account.updateOne({ _id: account._id }, { $set: update });
        healed++;
      }
    }

    const globalAccounts = await Account.find({
      $or: [
        { resolvedImage: /&#x2F;/ },
        { profileImage: /&#x2F;/ },
      ],
    });
    for (const account of globalAccounts) {
      const update = {};
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
