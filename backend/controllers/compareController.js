import { scrapeXProfile } from "../scrapers/xScraper.js";
import axios from "axios";

const extractXUsername = (url) => {
  const match = url.match(/x\.com\/([^/?]+)/i);
  return match?.[1];
};

const extractYoutubeHandle = (url) => {
  const match = url.match(/@([^/?]+)/);
  return match?.[1];
};

const getChannelIdByHandle = async (handle) => {
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

const getYoutubeStats = async (channelId) => {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/channels",
    {
      params: {
        part: "snippet,statistics",
        id: channelId,
        key: process.env.YOUTUBE_API_KEY,
      },
    },
  );

  if (!response.data.items.length) {
    return null;
  }

  const channel = response.data.items[0];
  return {
    username: channel.snippet.title,
    name: channel.snippet.title,
    followers: Number(channel.statistics.subscriberCount || 0),
    following: Number(channel.statistics.videoCount || 0), // map video count to comparison logic
    posts: Number(channel.statistics.videoCount || 0),
    views: Number(channel.statistics.viewCount || 0),
    profileUrl: `https://youtube.com/channel/${channelId}`,
    thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url || "",
  };
};

export const compareAccounts = async (req, res) => {
  try {
    const { url1, url2 } = req.body;

    if (!url1 || !url2) {
      return res.status(400).json({
        success: false,
        message: "Both URLs are required",
      });
    }

    /*
      X VS X
    */
    if (url1.includes("x.com") && url2.includes("x.com")) {
      const username1 = extractXUsername(url1);
      const username2 = extractXUsername(url2);

      let account1, account2;
      try {
        account1 = await scrapeXProfile(username1);
        account2 = await scrapeXProfile(username2);
      } catch (scrapeErr) {
        console.error("[Compare Controller Scraper Error]:", scrapeErr.message);
        return res.status(502).json({
          success: false,
          message: "Failed to scrape X profiles. X.com is currently rate-limiting or blocking automated access.",
        });
      }

      if (!account1 || !account2) {
        return res.status(404).json({
          success: false,
          message: "Failed to locate one or both X profiles in search.",
        });
      }

      // Convert metrics for comparison
      const parseMetric = (val) => {
        if (!val) return 0;
        const clean = val.replace(/,/g, "");
        if (clean.endsWith("K")) return parseFloat(clean) * 1000;
        if (clean.endsWith("M")) return parseFloat(clean) * 1000000;
        return parseFloat(clean);
      };

      return res.json({
        success: true,
        type: "x",
        account1: {
          ...account1,
          followers: parseMetric(account1.followers),
          following: parseMetric(account1.following),
          posts: parseMetric(account1.posts),
        },
        account2: {
          ...account2,
          followers: parseMetric(account2.followers),
          following: parseMetric(account2.following),
          posts: parseMetric(account2.posts),
        },
      });
    }

    /*
      YOUTUBE VS YOUTUBE
    */
    if (
      (url1.includes("youtube.com") || url1.includes("youtu.be")) &&
      (url2.includes("youtube.com") || url2.includes("youtu.be"))
    ) {
      const handle1 = extractYoutubeHandle(url1);
      const handle2 = extractYoutubeHandle(url2);

      if (!handle1 || !handle2) {
        return res.status(400).json({
          success: false,
          message: "Could not parse handles from YouTube URLs (e.g. must contain @handle)",
        });
      }

      const id1 = await getChannelIdByHandle(handle1);
      const id2 = await getChannelIdByHandle(handle2);

      if (!id1 || !id2) {
        return res.status(404).json({
          success: false,
          message: "Failed to locate channel IDs for one or both handles",
        });
      }

      const account1 = await getYoutubeStats(id1);
      const account2 = await getYoutubeStats(id2);

      return res.json({
        success: true,
        type: "youtube",
        account1,
        account2,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Please compare similar platforms: X vs X or YouTube vs YouTube",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
