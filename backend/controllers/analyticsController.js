import Snapshot from "../models/Snapshot.js";
import Content from "../models/Content.js";
import Account from "../models/Account.js";

/*
========================
TOP VIDEOS
========================
*/
export const getTopVideos = async (req, res) => {
  try {
    const videos = await Content.find()
      .sort({ views: -1 })
      .limit(10);

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
========================
HIGHEST ENGAGEMENT
========================
*/
export const getHighestEngagement = async (req, res) => {
  try {
    const videos = await Content.find();

    const ranked = videos
      .map((video) => ({
        ...video.toObject(),
        engagement:
          ((video.likes + video.comments) /
            Math.max(video.views, 1)) *
          100,
      }))
      .sort(
        (a, b) => b.engagement - a.engagement
      );

    res.json({
      success: true,
      data: ranked.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
========================
CHANNEL SUMMARY
========================
*/
export const getChannelSummary = async (
  req,
  res
) => {
  try {
    const { accountId } = req.params;

    const latestSnapshot =
      await Snapshot.findOne({
        account: accountId,
      }).sort({
        capturedAt: -1,
      });

    const videos = await Content.find({
      account: accountId,
    });

    const videosTracked =
      videos.length;

    const totalViews =
      videos.reduce(
        (sum, video) =>
          sum + video.views,
        0
      );

    const totalLikes =
      videos.reduce(
        (sum, video) =>
          sum + video.likes,
        0
      );

    const totalComments =
      videos.reduce(
        (sum, video) =>
          sum + video.comments,
        0
      );

    const avgViews = videosTracked
      ? Math.round(
          totalViews / videosTracked
        )
      : 0;

    const avgLikes = videosTracked
      ? Math.round(
          totalLikes / videosTracked
        )
      : 0;

    const avgComments =
      videosTracked
        ? Math.round(
            totalComments /
              videosTracked
          )
        : 0;

    const avgEngagement =
      videosTracked > 0
        ? (
            videos.reduce(
              (sum, video) =>
                sum +
                ((video.likes +
                  video.comments) /
                  Math.max(
                    video.views,
                    1
                  )) *
                  100,
              0
            ) / videosTracked
          ).toFixed(2)
        : 0;

    res.json({
      success: true,
      data: {
        followers:
          latestSnapshot?.followers ||
          0,

        totalViews:
          latestSnapshot?.views || 0,

        avgViews,
        avgLikes,
        avgComments,
        avgEngagement,
        videosTracked,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
========================
COMPARE ACCOUNTS
========================
*/
export const compareAccounts = async (
  req,
  res
) => {
  try {
    const accounts =
      await Account.find();

    const comparison = [];

    for (const account of accounts) {
      const latestSnapshot =
        await Snapshot.findOne({
          account: account._id,
        }).sort({
          capturedAt: -1,
        });

      const videos =
        await Content.find({
          account: account._id,
        });

      const avgViews =
        videos.length > 0
          ? Math.round(
              videos.reduce(
                (sum, video) =>
                  sum +
                  video.views,
                0
              ) / videos.length
            )
          : 0;

      const avgEngagement =
        videos.length > 0
          ? (
              videos.reduce(
                (sum, video) =>
                  sum +
                  ((video.likes +
                    video.comments) /
                    Math.max(
                      video.views,
                      1
                    )) *
                    100,
                0
              ) / videos.length
            ).toFixed(2)
          : 0;

      comparison.push({
        accountId:
          account._id,

        name: account.name,

        followers:
          latestSnapshot?.followers ||
          0,

        totalViews:
          latestSnapshot?.views ||
          0,

        avgViews,

        avgEngagement,

        videosTracked:
          videos.length,
      });
    }

    comparison.sort(
      (a, b) =>
        b.followers -
        a.followers
    );

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
========================
GROWTH DATA
========================
*/
export const getGrowthData = async (
  req,
  res
) => {
  try {
    const { accountId } = req.params;

    const snapshots =
      await Snapshot.find({
        account: accountId,
      }).sort({
        capturedAt: 1,
      });

    const data =
      snapshots.map(
        (snapshot) => ({
          date: snapshot.capturedAt
            .toISOString()
            .split("T")[0],

          followers:
            snapshot.followers,

          views: snapshot.views,
        })
      );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
========================
POSTING FREQUENCY
========================
*/
export const getPostingFrequency =
  async (req, res) => {
    try {
      const { accountId } =
        req.params;

      const videos =
        await Content.find({
          account: accountId,
        });

      if (!videos.length) {
        return res.json({
          success: true,
          data: {
            videosTracked: 0,
            videosPerWeek: 0,
            videosPerMonth: 0,
            mostActiveDay:
              "N/A",
          },
        });
      }

      const dates =
        videos.map(
          (video) =>
            new Date(
              video.publishedAt
            )
        );

      const oldest =
        new Date(
          Math.min(...dates)
        );

      const newest =
        new Date(
          Math.max(...dates)
        );

      const days =
        Math.max(
          1,
          (newest - oldest) /
            (1000 *
              60 *
              60 *
              24)
        );

      const weeks = days / 7;
      const months =
        days / 30;

      const dayCount = {};

      dates.forEach((date) => {
        const day =
          date.toLocaleDateString(
            "en-US",
            {
              weekday:
                "long",
            }
          );

        dayCount[day] =
          (dayCount[day] ||
            0) + 1;
      });

      const mostActiveDay =
        Object.keys(
          dayCount
        ).reduce((a, b) =>
          dayCount[a] >
          dayCount[b]
            ? a
            : b
        );

      res.json({
        success: true,
        data: {
          videosTracked:
            videos.length,

          videosPerWeek: (
            videos.length /
            weeks
          ).toFixed(2),

          videosPerMonth: (
            videos.length /
            months
          ).toFixed(2),

          mostActiveDay,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
========================
TOP CONTENT
========================
*/
export const getTopContent =
  async (req, res) => {
    try {
      const { accountId } =
        req.params;

      const content =
        await Content.find({
          account: accountId,
        })
          .sort({
            views: -1,
          })
          .limit(20);

      res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
========================
BEST POSTING TIME
========================
*/
export const getBestPostingTime =
  async (req, res) => {
    try {
      const { accountId } =
        req.params;

      const videos =
        await Content.find({
          account: accountId,
        });

      const hourMap = {};

      videos.forEach(
        (video) => {
          const hour =
            new Date(
              video.publishedAt
            ).getUTCHours();

          if (
            !hourMap[hour]
          ) {
            hourMap[hour] = {
              views: 0,
              count: 0,
            };
          }

          hourMap[
            hour
          ].views +=
            video.views;

          hourMap[
            hour
          ].count += 1;
        }
      );

      const result =
        Object.entries(
          hourMap
        ).map(
          ([hour, data]) => ({
            hour,
            avgViews:
              data.views /
              data.count,
          })
        );

      result.sort(
        (a, b) =>
          b.avgViews -
          a.avgViews
      );

      res.json({
        success: true,
        bestTime:
          result[0],
        allTimes:
          result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
========================
GROWTH RATE
========================
*/
export const getGrowthRate =
  async (req, res) => {
    try {
      const { accountId } =
        req.params;

      const snapshots =
        await Snapshot.find({
          account: accountId,
        }).sort({
          capturedAt: 1,
        });

      if (
        snapshots.length < 2
      ) {
        return res.json({
          success: true,
          data: {
            growthRate: 0,
            message:
              "Not enough snapshots",
          },
        });
      }

      const first =
        snapshots[0];

      const last =
        snapshots[
          snapshots.length - 1
        ];

      const followerGrowth =
        last.followers -
        first.followers;

      const viewGrowth =
        last.views -
        first.views;

      const followerGrowthPercent =
        first.followers > 0
          ? (
              (followerGrowth /
                first.followers) *
              100
            ).toFixed(2)
          : 0;

      res.json({
        success: true,
        data: {
          startingFollowers:
            first.followers,

          currentFollowers:
            last.followers,

          followerGrowth,

          followerGrowthPercent,

          startingViews:
            first.views,

          currentViews:
            last.views,

          viewGrowth,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
========================
DASHBOARD OVERVIEW
========================
*/
export const getDashboardOverview =
  async (req, res) => {
    try {
      const totalAccounts =
        await Account.countDocuments();

      const totalVideos =
        await Content.countDocuments();

      const latestSnapshots =
        await Snapshot.aggregate([
          {
            $sort: {
              capturedAt:
                -1,
            },
          },
          {
            $group: {
              _id:
                "$account",
              followers: {
                $first:
                  "$followers",
              },
              views: {
                $first:
                  "$views",
              },
            },
          },
        ]);

      const totalFollowers =
        latestSnapshots.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.followers,
          0
        );

      const totalViews =
        latestSnapshots.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.views,
          0
        );

      const videos =
        await Content.find();

      const avgEngagement =
        videos.length > 0
          ? (
              videos.reduce(
                (
                  sum,
                  video
                ) =>
                  sum +
                  ((video.likes +
                    video.comments) /
                    Math.max(
                      video.views,
                      1
                    )) *
                    100,
                0
              ) /
              videos.length
            ).toFixed(2)
          : 0;

      res.json({
        success: true,
        data: {
          totalAccounts,
          totalVideos,
          totalFollowers,
          totalViews,
          avgEngagement,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };