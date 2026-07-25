import Content from "../models/Content.js";
import Account from "../models/Account.js";
import mongoose from "mongoose";
import {
  getDashboardOverview as engineDashboardOverview,
  getTimeSeries,
  getLatest,
  getCompareMetrics,
  getForecastForAccount,
  getGrowthDeltas,
  computeEngagementRate,
} from "../services/analyticsEngine.js";

/*
========================
TOP VIDEOS
========================
*/
export const getTopVideos = async (req, res, next) => {
  try {
    const videos = await Content.find({ userId: req.user._id })
      .sort({ views: -1 })
      .limit(10);

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
HIGHEST ENGAGEMENT
========================
*/
export const getHighestEngagement = async (req, res, next) => {
  try {
    const ranked = await Content.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(String(req.user._id)) } },
      {
        $addFields: {
          engagement: {
            $cond: [
              { $gt: ["$views", 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: [{ $ifNull: ["$likes", 0] }, { $ifNull: ["$comments", 0] }] },
                      "$views",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { engagement: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: ranked,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
CHANNEL SUMMARY
========================
*/
export const getChannelSummary = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const latest = await getLatest(accountId, { userId: req.user._id });
    const videos = await Content.find({
      account: accountId,
      userId: req.user._id,
    });

    const videosTracked = videos.length;
    const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
    const totalLikes = videos.reduce((sum, video) => sum + video.likes, 0);
    const totalComments = videos.reduce((sum, video) => sum + video.comments, 0);

    const avgViews = videosTracked ? Math.round(totalViews / videosTracked) : 0;
    const avgLikes = videosTracked ? Math.round(totalLikes / videosTracked) : 0;
    const avgComments = videosTracked ? Math.round(totalComments / videosTracked) : 0;

    let avgEngagement =
      videosTracked > 0
        ? Number(
            (
              videos.reduce(
                (sum, video) =>
                  sum + computeEngagementRate(video.likes, video.comments, video.views),
                0
              ) / videosTracked
            ).toFixed(2)
          )
        : 0;

    if (avgEngagement === 0 && latest.metrics?.engagementRate) {
      avgEngagement = Number(latest.metrics.engagementRate);
    }

    res.json({
      success: true,
      data: {
        followers: latest.metrics?.subscribers ?? 0,
        totalViews: latest.metrics?.views ?? 0,
        avgViews,
        avgLikes,
        avgComments,
        avgEngagement,
        videosTracked,
        engineVersion: latest.engineVersion,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
COMPARE ACCOUNTS
========================
*/
export const compareAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ userId: req.user._id }).select("_id").lean();
    const ids = accounts.map((a) => a._id);
    const { data } = await getCompareMetrics(ids, { userId: req.user._id });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
GROWTH DATA / TIME SERIES
========================
*/
export const getGrowthData = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const range = req.query.range || "all";
    const metrics = req.query.metrics || "subscribers,views,engagementRate";

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const result = await getTimeSeries(accountId, {
      userId: req.user._id,
      metrics,
      range,
    });

    res.json({
      success: true,
      data: result.series.map((p) => ({
        date: p.date || (p.capturedAt && new Date(p.capturedAt).toISOString().split("T")[0]),
        followers: p.subscribers ?? p.followers,
        subscribers: p.subscribers,
        views: p.views,
        engagementRate: p.engagementRate,
      })),
      availability: result.availability,
      engineVersion: result.engineVersion,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
ANALYTICS SERIES (canonical)
========================
*/
export const getAnalyticsSeries = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const range = req.query.range || "all";
    const metrics = req.query.metrics || "subscribers,views,engagementRate";

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const result = await getTimeSeries(accountId, {
      userId: req.user._id,
      metrics,
      range,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
LATEST METRICS
========================
*/
export const getAnalyticsLatest = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const latest = await getLatest(accountId, { userId: req.user._id });
    const growth = await getGrowthDeltas(accountId, { userId: req.user._id });

    res.json({
      success: true,
      data: { ...latest, growth },
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
ENGINE COMPARE BY IDS
========================
*/
export const getAnalyticsCompare = async (req, res, next) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: "Provide ids query param (comma-separated account IDs)",
      });
    }

    const result = await getCompareMetrics(ids, { userId: req.user._id });
    res.json({
      success: true,
      data: result.data,
      engineVersion: result.engineVersion,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
POSTING FREQUENCY
========================
*/
export const getPostingFrequency = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const videos = await Content.find({
      account: accountId,
      userId: req.user._id,
    });

    if (!videos.length) {
      return res.json({
        success: true,
        data: {
          videosTracked: 0,
          videosPerWeek: 0,
          videosPerMonth: 0,
          mostActiveDay: "N/A",
          available: false,
          reason: "No verified content metadata available yet.",
        },
      });
    }

    const dates = videos
      .map((video) => new Date(video.publishedAt))
      .filter((d) => Number.isFinite(d.getTime()));

    if (!dates.length) {
      return res.json({
        success: true,
        data: {
          videosTracked: videos.length,
          videosPerWeek: 0,
          videosPerMonth: 0,
          mostActiveDay: "N/A",
          available: false,
          reason: "Content items lack verified publishedAt dates.",
        },
      });
    }

    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));

    const days = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
    const weeks = days / 7;
    const months = days / 30;

    const dayCount = {};
    dates.forEach((date) => {
      const day = date.toLocaleDateString("en-US", { weekday: "long" });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const mostActiveDay = Object.keys(dayCount).reduce((a, b) =>
      dayCount[a] > dayCount[b] ? a : b
    );

    res.json({
      success: true,
      data: {
        videosTracked: videos.length,
        videosPerWeek: (videos.length / weeks).toFixed(2),
        videosPerMonth: (videos.length / months).toFixed(2),
        mostActiveDay,
        available: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
TOP CONTENT
========================
*/
export const getTopContent = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const content = await Content.find({
      account: accountId,
      userId: req.user._id,
    })
      .sort({ views: -1 })
      .limit(20);

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
BEST POSTING TIME
========================
*/
export const getBestPostingTime = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const videos = await Content.find({
      account: accountId,
      userId: req.user._id,
    });

    if (!videos.length) {
      return res.json({
        success: true,
        data: {
          available: false,
          reason: "No verified content for posting-time analysis.",
          bestHour: null,
          bestDay: null,
        },
      });
    }

    const hourCount = {};
    const dayCount = {};

    for (const video of videos) {
      if (!video.publishedAt) continue;
      const d = new Date(video.publishedAt);
      if (!Number.isFinite(d.getTime())) continue;
      const hour = d.getUTCHours();
      const day = d.toLocaleDateString("en-US", { weekday: "long" });
      hourCount[hour] = (hourCount[hour] || 0) + 1;
      dayCount[day] = (dayCount[day] || 0) + 1;
    }

    const hours = Object.keys(hourCount);
    const days = Object.keys(dayCount);
    if (!hours.length || !days.length) {
      return res.json({
        success: true,
        data: {
          available: false,
          reason: "Content items lack verified publishedAt timestamps.",
          bestHour: null,
          bestDay: null,
        },
      });
    }

    const bestHour = hours.reduce((a, b) => (hourCount[a] > hourCount[b] ? a : b));
    const bestDay = days.reduce((a, b) => (dayCount[a] > dayCount[b] ? a : b));

    res.json({
      success: true,
      data: {
        available: true,
        bestHour: Number(bestHour),
        bestDay,
        hourDistribution: hourCount,
        dayDistribution: dayCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
GROWTH RATE
========================
*/
export const getGrowthRate = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const { series } = await getTimeSeries(accountId, {
      userId: req.user._id,
      metrics: ["subscribers", "views"],
      range: "all",
    });

    const withSub = series.filter((p) => p.subscribers != null);
    if (withSub.length < 2) {
      return res.json({
        success: true,
        data: {
          growthRate: 0,
          message: "Not enough snapshots",
          available: false,
        },
      });
    }

    const first = withSub[0];
    const last = withSub[withSub.length - 1];
    const followerGrowth = last.subscribers - first.subscribers;
    const viewGrowth = (last.views ?? 0) - (first.views ?? 0);

    const followerGrowthPercent =
      first.subscribers > 0
        ? Number(((followerGrowth / first.subscribers) * 100).toFixed(2))
        : 0;

    res.json({
      success: true,
      data: {
        startingFollowers: first.subscribers,
        currentFollowers: last.subscribers,
        followerGrowth,
        followerGrowthPercent,
        startingViews: first.views ?? null,
        currentViews: last.views ?? null,
        viewGrowth,
        available: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
DASHBOARD OVERVIEW
========================
*/
export const getDashboardOverview = async (req, res, next) => {
  try {
    const data = await engineDashboardOverview(req.user._id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
METRICS FORECASTING (labeled projection)
========================
*/
export const getForecast = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const forecast = await getForecastForAccount(accountId, { userId: req.user._id });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};
