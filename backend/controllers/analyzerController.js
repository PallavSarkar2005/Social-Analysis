import axios from "axios";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

/*
========================================
Extract Video ID
========================================
*/
const extractVideoId = (url) => {
  if (!url || typeof url !== "string") return null;

  const cleanUrl = url.trim();

  const regexes = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/
  ];

  for (const regex of regexes) {
    const match = cleanUrl.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  try {
    const urlWithProtocol = cleanUrl.match(/^https?:\/\//i) ? cleanUrl : `https://${cleanUrl}`;
    const parsed = new URL(urlWithProtocol);
    
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }
    }
  } catch (e) {
    // Ignore URL parsing errors
  }

  return null;
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
Handle YouTube API Errors defensively
========================================
*/
const handleYoutubeApiError = (apiError, res, next) => {
  if (axios.isAxiosError(apiError)) {
    const status = apiError.response?.status;
    const errorData = apiError.response?.data?.error;
    const errors = errorData?.errors || [];

    const isQuotaExceeded =
      errors.some((e) => e.reason === "quotaExceeded") ||
      (errorData?.message && errorData.message.includes("quota"));

    const isKeyInvalid =
      errors.some((e) => e.reason === "keyInvalid") ||
      (errorData?.message &&
        (errorData.message.includes("API key not valid") ||
          errorData.message.includes("key, developer token, or client ID you provided is not registered")));

    if (isKeyInvalid) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    if (isQuotaExceeded) {
      return res.status(429).json({
        success: false,
        message: "YouTube API quota exceeded",
      });
    }

    if (errorData?.message) {
      return res.status(status || 500).json({
        success: false,
        message: `YouTube API Error: ${errorData.message}`,
      });
    }
  }

  next(apiError);
};

/*
========================================
Main Analyzer
========================================
*/
export const analyzeYoutubeUrl = async (req, res, next) => {
  let currentStep = "INITIALIZATION";
  try {
    const { url } = req.body;
    console.log("INPUT URL:", url);
    console.log("ANALYZER STEP:", currentStep);

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
      currentStep = "CHANNEL_HANDLE_RESOLVE";
      console.log("ANALYZER STEP:", currentStep);
      const handle = url.split("/@")[1].split("/")[0];
      console.log("EXTRACTED HANDLE:", handle);

      const channelId = await getChannelByHandle(handle);
      console.log("RESOLVED CHANNEL ID:", channelId);

      if (!channelId) {
        return res.status(404).json({
          success: false,
          message: "Channel not found",
        });
      }

      currentStep = "CHANNEL_FETCH_BY_HANDLE";
      console.log("ANALYZER STEP:", currentStep);
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

      console.log("CHANNEL API RESPONSE:", channelResponse?.data);

      if (!channelResponse.data.items || !channelResponse.data.items.length) {
        return res.status(404).json({
          success: false,
          message: "Channel not found on YouTube",
        });
      }

      const channel = channelResponse.data.items[0];

      let account = await Account.findOne({
        accountId: channelId,
        userId: req.user._id,
      });

      if (!account) {
        account = await Account.create({
          name: channel.snippet.title,
          platform: "youtube",
          accountId: channelId,
          profileUrl: url,
          userId: req.user._id,
        });
      }

      await Snapshot.create({
        account: account._id,
        followers: Number(channel.statistics.subscriberCount || 0),
        views: Number(channel.statistics.viewCount || 0),
        userId: req.user._id,
      });

      const history = await Snapshot.find({
        account: account._id,
        userId: req.user._id,
      })
        .sort({ capturedAt: 1 })
        .lean();

      currentStep = "CHANNEL_VIDEOS_FETCH";
      console.log("ANALYZER STEP:", currentStep);
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

      console.log("CHANNEL VIDEOS RESPONSE:", recentVideosResponse?.data);

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
      currentStep = "CHANNEL_ID_RESOLVE";
      console.log("ANALYZER STEP:", currentStep);
      const channelId = url.split("/channel/")[1].split("/")[0];
      console.log("EXTRACTED CHANNEL ID:", channelId);

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

      console.log("CHANNEL API RESPONSE:", channelResponse?.data);

      if (!channelResponse.data.items || !channelResponse.data.items.length) {
        return res.status(404).json({
          success: false,
          message: "Channel not found on YouTube",
        });
      }

      const channel = channelResponse.data.items[0];

      let account = await Account.findOne({
        accountId: channelId,
        userId: req.user._id,
      });

      if (!account) {
        account = await Account.create({
          name: channel.snippet.title,
          platform: "youtube",
          accountId: channelId,
          profileUrl: url,
          userId: req.user._id,
        });
      }

      await Snapshot.create({
        account: account._id,
        followers: Number(channel.statistics.subscriberCount || 0),
        views: Number(channel.statistics.viewCount || 0),
        userId: req.user._id,
      });

      const history = await Snapshot.find({
        account: account._id,
        userId: req.user._id,
      })
        .sort({ capturedAt: 1 })
        .lean();

      currentStep = "CHANNEL_VIDEOS_FETCH";
      console.log("ANALYZER STEP:", currentStep);
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

      console.log("CHANNEL VIDEOS RESPONSE:", recentVideosResponse?.data);

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

    currentStep = "VIDEO_ID_EXTRACTION";
    console.log("ANALYZER STEP:", currentStep);
    let videoId;
    try {
      videoId = extractVideoId(url);
    } catch (parseError) {
      console.error("URL PARSING EXCEPTION:", parseError);
      return res.status(400).json({
        success: false,
        message: "URL parsing failed",
      });
    }

    console.log("EXTRACTED VIDEO ID:", videoId);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Video ID missing",
      });
    }

    currentStep = "VIDEO_FETCH";
    console.log("ANALYZER STEP:", currentStep);

    try {
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

      console.log("VIDEO API RESPONSE:", response?.data);

      if (!response.data || !response.data.items || !response.data.items.length) {
        return res.status(404).json({
          success: false,
          message: "YouTube API returned no video",
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

      currentStep = "SUCCESS";
      console.log("ANALYZER STEP:", currentStep);

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
    } catch (apiError) {
      console.error("VIDEO FETCH ERROR:", apiError);
      return handleYoutubeApiError(apiError, res, next);
    }
  } catch (error) {
    next(error);
  }
};
