import Snapshot from "../models/Snapshot.js";
import Content from "../models/Content.js";
import Account from "../models/Account.js";
import { calculateForecast } from "../services/forecastService.js";

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
    const videos = await Content.find({ userId: req.user._id });

    const ranked = videos
      .map((video) => ({
        ...video.toObject(),
        engagement:
          ((video.likes + video.comments) / Math.max(video.views, 1)) * 100,
      }))
      .sort((a, b) => b.engagement - a.engagement);

    res.json({
      success: true,
      data: ranked.slice(0, 10),
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

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const latestSnapshot = await Snapshot.findOne({
      account: accountId,
      userId: req.user._id,
    }).sort({
      capturedAt: -1,
    });

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
        ? (
            videos.reduce(
              (sum, video) =>
                sum +
                ((video.likes + video.comments) / Math.max(video.views, 1)) * 100,
              0
            ) / videosTracked
          ).toFixed(2)
        : 0;

    if (Number(avgEngagement) === 0 && latestSnapshot?.engagementRate > 0) {
      avgEngagement = Number(latestSnapshot.engagementRate.toFixed(2));
    }
    if (Number(avgEngagement) === 0 && account.engagement > 0) {
      avgEngagement = Number(account.engagement.toFixed(2));
    }

    res.json({
      success: true,
      data: {
        followers: latestSnapshot?.followers || 0,
        totalViews: latestSnapshot?.views || 0,
        avgViews,
        avgLikes,
        avgComments,
        avgEngagement: Number(avgEngagement),
        videosTracked,
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
    const accounts = await Account.find({ userId: req.user._id });

    const comparison = [];

    for (const account of accounts) {
      const latestSnapshot = await Snapshot.findOne({
        account: account._id,
        userId: req.user._id,
      }).sort({
        capturedAt: -1,
      });

      const videos = await Content.find({
        account: account._id,
        userId: req.user._id,
      });

      const avgViews =
        videos.length > 0
          ? Math.round(
              videos.reduce((sum, video) => sum + video.views, 0) / videos.length
            )
          : 0;

      let avgEngagement =
        videos.length > 0
          ? (
              videos.reduce(
                (sum, video) =>
                  sum +
                  ((video.likes + video.comments) / Math.max(video.views, 1)) * 100,
                0
              ) / videos.length
            ).toFixed(2)
          : 0;

      if (Number(avgEngagement) === 0 && latestSnapshot?.engagementRate > 0) {
        avgEngagement = Number(latestSnapshot.engagementRate.toFixed(2));
      }
      if (Number(avgEngagement) === 0 && account.engagement > 0) {
        avgEngagement = Number(account.engagement.toFixed(2));
      }


      comparison.push({
        accountId: account._id,
        name: account.name,
        followers: latestSnapshot?.followers || 0,
        totalViews: latestSnapshot?.views || 0,
        avgViews,
        avgEngagement,
        videosTracked: videos.length,
        state: account.state || "Unknown State",
        party: account.party || "Independent",
      });
    }

    comparison.sort((a, b) => b.followers - a.followers);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
GROWTH DATA
========================
*/
export const getGrowthData = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const snapshots = await Snapshot.find({
      account: accountId,
      userId: req.user._id,
    }).sort({
      capturedAt: 1,
    });

    const data = snapshots.map((snapshot) => ({
      date: snapshot.capturedAt.toISOString().split("T")[0],
      followers: snapshot.followers,
      views: snapshot.views,
    }));

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
POSTING FREQUENCY
========================
*/
export const getPostingFrequency = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
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
        },
      });
    }

    const dates = videos.map((video) => new Date(video.publishedAt));
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));

    const days = Math.max(
      1,
      (newest - oldest) / (1000 * 60 * 60 * 24)
    );

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

    // Verify account belongs to user
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

    // Verify account belongs to user
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

    const hourMap = {};

    videos.forEach((video) => {
      const hour = new Date(video.publishedAt).getUTCHours();

      if (!hourMap[hour]) {
        hourMap[hour] = {
          views: 0,
          count: 0,
        };
      }

      hourMap[hour].views += video.views;
      hourMap[hour].count += 1;
    });

    const result = Object.entries(hourMap).map(([hour, data]) => ({
      hour,
      avgViews: data.views / data.count,
    }));

    result.sort((a, b) => b.avgViews - a.avgViews);

    res.json({
      success: true,
      bestTime: result[0],
      allTimes: result,
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

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or unauthorized",
      });
    }

    const snapshots = await Snapshot.find({
      account: accountId,
      userId: req.user._id,
    }).sort({
      capturedAt: 1,
    });

    if (snapshots.length < 2) {
      return res.json({
        success: true,
        data: {
          growthRate: 0,
          message: "Not enough snapshots",
        },
      });
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const followerGrowth = last.followers - first.followers;
    const viewGrowth = last.views - first.views;

    const followerGrowthPercent =
      first.followers > 0
        ? ((followerGrowth / first.followers) * 100).toFixed(2)
        : 0;

    res.json({
      success: true,
      data: {
        startingFollowers: first.followers,
        currentFollowers: last.followers,
        followerGrowth,
        followerGrowthPercent,
        startingViews: first.views,
        currentViews: last.views,
        viewGrowth,
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
    const activeAccounts = await Account.find({ userId: req.user._id, isCompetitor: { $ne: true } });
    const activeAccountIds = activeAccounts.map((acc) => acc._id);

    const totalAccounts = activeAccounts.length;
    const totalVideos = await Content.countDocuments({ userId: req.user._id, account: { $in: activeAccountIds } });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayFollowers = 0;
    let todaySubscribers = 0;
    let todayViews = 0;
    let totalEngRateSum = 0;

    let lastWeekFollowers = 0;
    let lastWeekSubscribers = 0;
    let lastWeekViews = 0;
    let lastWeekEngRateSum = 0;

    let lastMonthFollowers = 0;
    let lastMonthSubscribers = 0;
    let lastMonthViews = 0;
    let lastMonthEngRateSum = 0;

    let youtubeCount = 0;
    let xCount = 0;

    for (const account of activeAccounts) {
      const latest = await Snapshot.findOne({ account: account._id, userId: req.user._id }).sort({ capturedAt: -1 });
      const weekAgo = await Snapshot.findOne({ account: account._id, userId: req.user._id, capturedAt: { $lte: sevenDaysAgo } }).sort({ capturedAt: -1 })
                     || await Snapshot.findOne({ account: account._id, userId: req.user._id }).sort({ capturedAt: 1 });
      const monthAgo = await Snapshot.findOne({ account: account._id, userId: req.user._id, capturedAt: { $lte: thirtyDaysAgo } }).sort({ capturedAt: -1 })
                     || await Snapshot.findOne({ account: account._id, userId: req.user._id }).sort({ capturedAt: 1 });

      const lFollowers = latest?.followers || 0;
      const lViews = latest?.views || 0;
      const lEng = latest?.engagementRate || 0;

      const wFollowers = weekAgo?.followers || 0;
      const wViews = weekAgo?.views || 0;
      const wEng = weekAgo?.engagementRate || 0;

      const mFollowers = monthAgo?.followers || 0;
      const mViews = monthAgo?.views || 0;
      const mEng = monthAgo?.engagementRate || 0;

      if (account.platform === "youtube") {
        todaySubscribers += lFollowers;
        lastWeekSubscribers += wFollowers;
        lastMonthSubscribers += mFollowers;

        todayViews += lViews;
        lastWeekViews += wViews;
        lastMonthViews += mViews;
        youtubeCount++;
      } else if (account.platform === "x") {
        todayFollowers += lFollowers;
        lastWeekFollowers += wFollowers;
        lastMonthFollowers += mFollowers;
        xCount++;
      }

      totalEngRateSum += lEng;
      lastWeekEngRateSum += wEng;
      lastMonthEngRateSum += mEng;
    }

    const accountCount = activeAccounts.length;
    const todayEngagement = accountCount > 0 ? parseFloat((totalEngRateSum / accountCount).toFixed(2)) : 0;
    const lastWeekEngagement = accountCount > 0 ? parseFloat((lastWeekEngRateSum / accountCount).toFixed(2)) : 0;
    const lastMonthEngagement = accountCount > 0 ? parseFloat((lastMonthEngRateSum / accountCount).toFixed(2)) : 0;

    const getGrowthPct = (current, previous) => {
      if (!previous) return 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };

    const growthMetrics = {
      subscribers: {
        current: todaySubscribers,
        lastWeek: {
          value: todaySubscribers - lastWeekSubscribers,
          percentage: getGrowthPct(todaySubscribers, lastWeekSubscribers),
        },
        lastMonth: {
          value: todaySubscribers - lastMonthSubscribers,
          percentage: getGrowthPct(todaySubscribers, lastMonthSubscribers),
        },
      },
      followers: {
        current: todayFollowers,
        lastWeek: {
          value: todayFollowers - lastWeekFollowers,
          percentage: getGrowthPct(todayFollowers, lastWeekFollowers),
        },
        lastMonth: {
          value: todayFollowers - lastMonthFollowers,
          percentage: getGrowthPct(todayFollowers, lastMonthFollowers),
        },
      },
      views: {
        current: todayViews,
        lastWeek: {
          value: todayViews - lastWeekViews,
          percentage: getGrowthPct(todayViews, lastWeekViews),
        },
        lastMonth: {
          value: todayViews - lastMonthViews,
          percentage: getGrowthPct(todayViews, lastMonthViews),
        },
      },
      engagement: {
        current: todayEngagement,
        lastWeek: {
          value: parseFloat((todayEngagement - lastWeekEngagement).toFixed(2)),
          percentage: getGrowthPct(todayEngagement, lastWeekEngagement),
        },
        lastMonth: {
          value: parseFloat((todayEngagement - lastMonthEngagement).toFixed(2)),
          percentage: getGrowthPct(todayEngagement, lastMonthEngagement),
        },
      },
    };

    res.json({
      success: true,
      data: {
        totalAccounts,
        totalVideos,
        totalFollowers: todayFollowers + todaySubscribers, // combined dashboard followers
        totalViews: todayViews,
        avgEngagement: todayEngagement,
        growth: growthMetrics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
========================
METRICS FORECASTING
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

    const snapshots = await Snapshot.find({ account: accountId, userId: req.user._id }).sort({ capturedAt: 1 });
    const forecast = calculateForecast(snapshots);

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};