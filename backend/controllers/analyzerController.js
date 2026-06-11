import axios from "axios";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

/*
========================================
Extract Video ID
========================================
*/
const extractVideoId = (url) => {
  try {
    if (url.includes("watch?v=")) {
      return new URL(url).searchParams.get("v");
    }

    if (url.includes("youtu.be/")) {
      return url.split("youtu.be/")[1].split("?")[0];
    }

    if (url.includes("/live/")) {
      return url.split("/live/")[1].split("?")[0];
    }

    if (url.includes("/shorts/")) {
      return url.split("/shorts/")[1].split("?")[0];
    }

    return null;
  } catch {
    return null;
  }
};

/*
========================================
Find Channel ID from @handle
========================================
*/
const getChannelByHandle = async (handle) => {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        key: process.env.YOUTUBE_API_KEY,
        q: handle,
        type: "channel",
        part: "snippet",
        maxResults: 1,
      },
    },
  );

  if (!response.data.items.length) {
    return null;
  }

  return response.data.items[0].snippet.channelId;
};

/*
========================================
Main Analyzer
========================================
*/
export const analyzeYoutubeUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    /*
    ========================================
    CHANNEL ANALYSIS
    ========================================
    */

    if (url.includes("/@")) {
      const handle = url.split("/@")[1].split("/")[0];

      const channelId = await getChannelByHandle(handle);

      if (!channelId) {
        return res.status(404).json({
          success: false,
          message: "Channel not found",
        });
      }

      const channelResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/channels",
        {
          params: {
            part: "snippet,statistics",
            id: channelId,
            key: process.env.YOUTUBE_API_KEY,
          },
        },
      );

      const channel = channelResponse.data.items[0];

      let account = await Account.findOne({
        accountId: channelId,
      });

      if (!account) {
        account = await Account.create({
          name: channel.snippet.title,
          platform: "youtube",
          accountId: channelId,
          profileUrl: url,
        });
      }

      await Snapshot.create({
        account: account._id,
        followers: Number(channel.statistics.subscriberCount || 0),
        views: Number(channel.statistics.viewCount || 0),
      });

      const history = await Snapshot.find({
        account: account._id,
      })
        .sort({ capturedAt: 1 })
        .lean();

      const recentVideosResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            channelId,
            part: "snippet",
            order: "date",
            maxResults: 10,
            type: "video",
          },
        },
      );

      return res.json({
        success: true,
        type: "channel",

        data: {
          mongoId: account._id,

          channelId,

          title: channel.snippet.title,

          description: channel.snippet.description,

          thumbnail:
            channel.snippet.thumbnails.high?.url ||
            channel.snippet.thumbnails.medium?.url,

          subscribers: Number(channel.statistics.subscriberCount || 0),

          totalViews: Number(channel.statistics.viewCount || 0),

          videoCount: Number(channel.statistics.videoCount || 0),

          recentVideos: recentVideosResponse.data.items,

          history: history.map((item) => ({
            date: new Date(item.capturedAt).toLocaleDateString(),
            followers: item.followers,
            views: item.views,
          })),
        },
      });
    }

    if (url.includes("/channel/")) {
      const channelId = url.split("/channel/")[1].split("/")[0];

      const channelResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/channels",
        {
          params: {
            part: "snippet,statistics",
            id: channelId,
            key: process.env.YOUTUBE_API_KEY,
          },
        },
      );

      if (!channelResponse.data.items.length) {
        return res.status(404).json({
          success: false,
          message: "Channel not found",
        });
      }

      const channel = channelResponse.data.items[0];

      let account = await Account.findOne({
        accountId: channelId,
      });

      if (!account) {
        account = await Account.create({
          name: channel.snippet.title,
          platform: "youtube",
          accountId: channelId,
          profileUrl: url,
        });
      }

      await Snapshot.create({
        account: account._id,
        followers: Number(channel.statistics.subscriberCount || 0),
        views: Number(channel.statistics.viewCount || 0),
      });

      const history = await Snapshot.find({
        account: account._id,
      })
        .sort({ capturedAt: 1 })
        .lean();

      const recentVideosResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            channelId,
            part: "snippet",
            order: "date",
            maxResults: 10,
            type: "video",
          },
        },
      );

      return res.json({
        success: true,
        type: "channel",

        data: {
          history: history.map((item) => ({
            date: new Date(item.capturedAt).toLocaleDateString(),
            followers: item.followers,
            views: item.views,
          })),

          mongoId: account._id,

          channelId,

          title: channel.snippet.title,

          description: channel.snippet.description,

          thumbnail:
            channel.snippet.thumbnails.high?.url ||
            channel.snippet.thumbnails.medium?.url,

          subscribers: Number(channel.statistics.subscriberCount || 0),

          totalViews: Number(channel.statistics.viewCount || 0),

          videoCount: Number(channel.statistics.videoCount || 0),

          recentVideos: recentVideosResponse.data.items,
        },
      });
    }

    /*
    ========================================
    VIDEO ANALYSIS
    ========================================
    */

    const videoId = extractVideoId(url);

    if (videoId) {
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos",
        {
          params: {
            part: "snippet,statistics",
            id: videoId,
            key: process.env.YOUTUBE_API_KEY,
          },
        },
      );

      if (!response.data.items.length) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      const video = response.data.items[0];

      const views = Number(video.statistics?.viewCount || 0);

      const likes = Number(video.statistics?.likeCount || 0);

      const comments = Number(video.statistics?.commentCount || 0);

      const engagement = (
        ((likes + comments) / Math.max(views, 1)) *
        100
      ).toFixed(2);

      return res.json({
        success: true,
        type: "video",

        data: {
          videoId,

          title: video.snippet.title,

          description: video.snippet.description,

          channel: video.snippet.channelTitle,

          channelId: video.snippet.channelId,

          thumbnail:
            video.snippet.thumbnails.high?.url ||
            video.snippet.thumbnails.medium?.url ||
            video.snippet.thumbnails.default?.url,

          publishedAt: video.snippet.publishedAt,

          views,
          likes,
          comments,
          engagement,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unsupported YouTube URL",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
