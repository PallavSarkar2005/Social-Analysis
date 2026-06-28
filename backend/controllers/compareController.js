import { scrapeXProfile } from "../scrapers/xScraper.js";
import axios from "axios";
import { generateCreatorComparisonReport } from "../services/aiCompareService.js";
import { getChannelByHandle, unescapeUrl } from "./analyzerController.js";

const extractXUsername = (url) => {
  const match = url.match(/x\.com\/([^/?]+)/i);
  return match?.[1];
};

const getYoutubeStats = async (channelId) => {
  console.log(`\nLOG [getYoutubeStats] Fetching data for channelId: ${channelId}`);
  const requestUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=YOUR_API_KEY`;
  console.log("YouTube API Request URL:", requestUrl);

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

  console.log("Full YouTube API Response:", JSON.stringify(response.data, null, 2));

  if (!response.data || !response.data.items || !response.data.items.length) {
    console.log("Error: Channel items empty in response");
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

export const compareAccounts = async (req, res, next) => {
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
        if (val === null || val === undefined) return 0;
        if (typeof val === "number") return val;
        const clean = String(val).replace(/,/g, "").trim();
        if (clean.endsWith("K")) return parseFloat(clean) * 1000;
        if (clean.endsWith("M")) return parseFloat(clean) * 1000000;
        return parseFloat(clean) || 0;
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
      console.log("\n================ [COMPARE ACCOUNTS YOUTUBE START] ================");
      console.log("URL 1:", url1);
      console.log("URL 2:", url2);

      const id1 = await resolveChannelId(url1);
      const id2 = await resolveChannelId(url2);

      console.log("Resolved ID 1:", id1);
      console.log("Resolved ID 2:", id2);

      if (!id1 || !id2) {
        console.log(`Failure in compareAccounts: Failed to resolve channel IDs. id1: ${id1}, id2: ${id2}`);
        return res.status(404).json({
          success: false,
          message: "Failed to locate channel IDs for one or both handles/URLs",
        });
      }

      const account1 = await getYoutubeStats(id1);
      const account2 = await getYoutubeStats(id2);

      console.log("================ [COMPARE ACCOUNTS YOUTUBE END] ================\n");
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
    next(error);
  }
};

/*
========================================
HELPERS & ENDPOINT FOR CREATOR COMPARISON
========================================
*/

const resolveChannelId = async (input) => {
  console.log("\n================ [RESOLVE CHANNEL ID START] ================");
  console.log("Original Input URL/Handle:", input);

  if (!input || typeof input !== "string") {
    console.log("Error: Input is empty or not a string");
    console.log("================ [RESOLVE CHANNEL ID END] ================\n");
    return null;
  }

  const cleanInput = unescapeUrl(input.trim());
  console.log("Unescaped Input:", cleanInput);

  let targetHandleOrId = "";

  // 1. If it contains channel/channelId
  if (cleanInput.includes("/channel/")) {
    const channelId = cleanInput.split("/channel/")[1].split("/")[0].split("?")[0];
    console.log("Detected direct channel URL. Resolved Channel ID:", channelId);
    console.log("================ [RESOLVE CHANNEL ID END] ================\n");
    return channelId;
  }

  // 2. If it contains /@handle
  if (cleanInput.includes("/@")) {
    const handle = "@" + cleanInput.split("/@")[1].split("/")[0].split("?")[0];
    console.log("Detected handle URL. Extracted handle:", handle);
    const resolvedId = await getChannelIdByHandleSafe(handle);
    console.log("================ [RESOLVE CHANNEL ID END] ================\n");
    return resolvedId;
  }

  // 3. If it starts with @ (pure handle)
  if (cleanInput.startsWith("@")) {
    const handle = cleanInput.split("?")[0];
    console.log("Detected pure handle. Extracted handle:", handle);
    const resolvedId = await getChannelIdByHandleSafe(handle);
    console.log("================ [RESOLVE CHANNEL ID END] ================\n");
    return resolvedId;
  }

  // 4. If it's a 24-character channel ID starting with UC
  if (cleanInput.startsWith("UC") && cleanInput.length === 24) {
    console.log("Detected direct Channel ID:", cleanInput);
    console.log("================ [RESOLVE CHANNEL ID END] ================\n");
    return cleanInput;
  }

  // 5. Otherwise, treat as general search query or handle name without @
  const handle = "@" + cleanInput.split("?")[0];
  console.log("Detected plain search/handle name. Extracted handle:", handle);
  const resolvedId = await getChannelIdByHandleSafe(handle);
  console.log("================ [RESOLVE CHANNEL ID END] ================\n");
  return resolvedId;
};

const getChannelIdByHandleSafe = async (handleOrQuery) => {
  const clean = handleOrQuery.trim();
  console.log(`LOG [getChannelIdByHandleSafe] Executing resolution for: "${clean}"`);
  
  // 1. Try resolving using forHandle if it starts with @
  if (clean.startsWith("@")) {
    const apiRequestUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(clean)}&key=YOUR_API_KEY`;
    console.log("YouTube API Request (forHandle):", apiRequestUrl);
    try {
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/channels",
        {
          params: {
            part: "id",
            forHandle: clean,
            key: process.env.YOUTUBE_API_KEY,
          },
        },
      );
      
      console.log("Full YouTube API Response (forHandle):", JSON.stringify(response.data, null, 2));

      if (response.data?.items?.[0]?.id) {
        const resolvedId = response.data.items[0].id;
        console.log("Resolved Channel ID (forHandle Success):", resolvedId);
        return resolvedId;
      }
    } catch (err) {
      console.error(`Error resolving forHandle ${clean}:`, err.message);
      if (err.response) {
        console.error("Full Error Response Data (forHandle):", JSON.stringify(err.response.data, null, 2));
      }
    }
  }

  // 2. Fallback: Reuse the Analyzer's search logic by calling getChannelByHandle
  console.log("Falling back to shared Analyzer handle-resolution logic (getChannelByHandle)...");
  try {
    const resolvedId = await getChannelByHandle(clean);
    if (resolvedId) {
      console.log("Resolved Channel ID (getChannelByHandle Success):", resolvedId);
      return resolvedId;
    }
  } catch (err) {
    console.error(`Error in shared getChannelByHandle for ${clean}:`, err.message);
  }

  // 3. Second Fallback: If clean started with @, try searching without the @ using shared logic
  if (clean.startsWith("@")) {
    const cleanWithoutAt = clean.slice(1);
    console.log(`Falling back to shared Analyzer handle-resolution logic without @ ("${cleanWithoutAt}")...`);
    try {
      const resolvedId = await getChannelByHandle(cleanWithoutAt);
      if (resolvedId) {
        console.log("Resolved Channel ID (getChannelByHandle fallback Success):", resolvedId);
        return resolvedId;
      }
    } catch (err) {
      console.error(`Error in shared getChannelByHandle fallback for ${cleanWithoutAt}:`, err.message);
    }
  }

  return null;
};

export const getCreatorAnalyticsData = async (channelId) => {
  console.log(`\nLOG [getCreatorAnalyticsData] Fetching channel metadata for channelId: ${channelId}`);
  const channelsRequestUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=YOUR_API_KEY`;
  console.log("YouTube API Request URL (Channels):", channelsRequestUrl);

  // Fetch channel metadata
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

  console.log("Full YouTube API Response (Channels):", JSON.stringify(channelResponse.data, null, 2));

  if (!channelResponse.data || !channelResponse.data.items || !channelResponse.data.items.length) {
    console.log("Failure in getCreatorAnalyticsData: Channel metadata not found");
    throw new Error("Channel details not found");
  }

  const channel = channelResponse.data.items[0];
  const statistics = channel.statistics;
  const snippet = channel.snippet;

  console.log(`\nLOG [getCreatorAnalyticsData] Fetching recent uploads for channelId: ${channelId}`);
  const recentRequestUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&key=YOUR_API_KEY`;
  console.log("YouTube API Request URL (Recent Search):", recentRequestUrl);

  // Fetch recent videos (10 videos)
  const searchResponse = await axios.get(
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

  console.log("Full YouTube API Response (Recent Search):", JSON.stringify(searchResponse.data, null, 2));

  const searchItems = searchResponse.data?.items || [];
  const videoIds = searchItems.map((item) => item.id?.videoId).filter(Boolean);

  let avgViews = 0;
  let avgLikes = 0;
  let avgComments = 0;
  let engagementRate = 0;
  let uploadFrequency = "Infrequent";
  let latestUpload = null;

  if (videoIds.length > 0) {
    console.log(`\nLOG [getCreatorAnalyticsData] Fetching statistics for recent video IDs: ${videoIds.join(",")}`);
    const videosRequestUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(",")}&key=YOUR_API_KEY`;
    console.log("YouTube API Request URL (Videos):", videosRequestUrl);

    // Fetch detailed statistics for recent videos
    const videosResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "statistics,snippet",
          id: videoIds.join(","),
          key: process.env.YOUTUBE_API_KEY,
        },
      },
    );

    console.log("Full YouTube API Response (Videos):", JSON.stringify(videosResponse.data, null, 2));

    const videoItems = videosResponse.data?.items || [];
    if (videoItems.length > 0) {
      const totalViews = videoItems.reduce((sum, item) => sum + Number(item.statistics?.viewCount || 0), 0);
      const totalLikes = videoItems.reduce((sum, item) => sum + Number(item.statistics?.likeCount || 0), 0);
      const totalComments = videoItems.reduce((sum, item) => sum + Number(item.statistics?.commentCount || 0), 0);

      avgViews = totalViews / videoItems.length;
      avgLikes = totalLikes / videoItems.length;
      avgComments = totalComments / videoItems.length;
      engagementRate = totalViews > 0 ? (((totalLikes + totalComments) / totalViews) * 100) : 0;

      // Extract latest upload
      const sortedVideos = [...videoItems].sort(
        (a, b) => new Date(b.snippet?.publishedAt).getTime() - new Date(a.snippet?.publishedAt).getTime()
      );
      latestUpload = sortedVideos[0]?.snippet?.publishedAt || null;

      // Calculate upload frequency based on publication intervals
      const dates = videoItems
        .map((item) => new Date(item.snippet?.publishedAt).getTime())
        .filter(Boolean)
        .sort((a, b) => a - b);

      if (dates.length >= 2) {
        const diffMs = dates[dates.length - 1] - dates[0];
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const avgDays = diffDays / (dates.length - 1);
        if (avgDays < 1.5) {
          uploadFrequency = "Daily";
        } else if (avgDays <= 3.5) {
          uploadFrequency = "Every 2-3 days";
        } else if (avgDays <= 7.5) {
          uploadFrequency = "Weekly";
        } else if (avgDays <= 15.5) {
          uploadFrequency = "Bi-weekly";
        } else {
          uploadFrequency = `Every ${Math.round(avgDays)} days`;
        }
      } else {
        uploadFrequency = "Weekly";
      }
    }
  }

  return {
    name: snippet.title || "",
    handle: snippet.customUrl || snippet.title || "",
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || "",
    subscribers: Number(statistics.subscriberCount || 0),
    totalViews: Number(statistics.viewCount || 0),
    totalVideos: Number(statistics.videoCount || 0),
    avgViews: Math.round(avgViews),
    avgLikes: Math.round(avgLikes),
    avgComments: Math.round(avgComments),
    engagementRate: Number(engagementRate.toFixed(2)),
    uploadFrequency,
    latestUpload,
    publishedAt: snippet.publishedAt || null,
    lastUpdated: new Date().toISOString(),
  };
};

export const compareYoutubeCreators = async (req, res, next) => {
  console.log("\n================ [COMPARE YOUTUBE CREATORS START] ================");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));

  try {
    const { creator1, creator2 } = req.body;
    console.log("Creator 1 URL/Handle (Input A):", creator1);
    console.log("Creator 2 URL/Handle (Input B):", creator2);

    if (!creator1 || !creator2) {
      console.log("Error at line 483: Missing creators in request body");
      return res.status(400).json({
        success: false,
        message: "Both creators are required",
      });
    }

    if (!process.env.YOUTUBE_API_KEY) {
      console.log("Error at line 490: YOUTUBE_API_KEY is not defined in backend process.env");
      return res.status(500).json({
        success: false,
        message: "Missing YouTube API key configuration in environment variables",
      });
    }

    // Resolve both creator channel IDs
    console.log("\n--- Resolving Creator A (Input 1) ---");
    const id1 = await resolveChannelId(creator1);
    console.log("Extracted Channel ID A (ID1):", id1);

    console.log("\n--- Resolving Creator B (Input 2) ---");
    const id2 = await resolveChannelId(creator2);
    console.log("Extracted Channel ID B (ID2):", id2);

    if (!id1 || !id2) {
      console.log(`Error at line 501: Failed to resolve one or both channel IDs. id1: "${id1}", id2: "${id2}"`);
      return res.status(404).json({
        success: false,
        message: "Failed to resolve one or both YouTube handles/URLs. Please check the spelling or format.",
      });
    }

    // Analyze both creators
    console.log("\n--- Fetching analytics telemetry for Creator A ---");
    const creatorA = await getCreatorAnalyticsData(id1);
    console.log("\n--- Fetching analytics telemetry for Creator B ---");
    const creatorB = await getCreatorAnalyticsData(id2);

    // Call Groq comparison service to get AI comparison report
    console.log("\n--- Fetching AI comparison report via Groq ---");
    const aiReport = await generateCreatorComparisonReport(creatorA, creatorB);

    // Helper comparison function
    const getComparisonWinner = (valA, valB) => {
      if (valA > valB) return "creatorA";
      if (valB > valA) return "creatorB";
      return "tie";
    };

    const winnerSubscribers = getComparisonWinner(creatorA.subscribers, creatorB.subscribers);
    const winnerViews = getComparisonWinner(creatorA.totalViews, creatorB.totalViews);
    const winnerEngagement = getComparisonWinner(creatorA.engagementRate, creatorB.engagementRate);
    const winnerVideos = getComparisonWinner(creatorA.totalVideos, creatorB.totalVideos);

    // Calculate overall winner by tallying wins across 5 categories: subscribers, views, videos, average views, engagement rate
    let scoreA = 0;
    let scoreB = 0;

    if (creatorA.subscribers > creatorB.subscribers) scoreA++;
    else if (creatorB.subscribers > creatorA.subscribers) scoreB++;

    if (creatorA.totalViews > creatorB.totalViews) scoreA++;
    else if (creatorB.totalViews > creatorA.totalViews) scoreB++;

    if (creatorA.totalVideos > creatorB.totalVideos) scoreA++;
    else if (creatorB.totalVideos > creatorA.totalVideos) scoreB++;

    if (creatorA.avgViews > creatorB.avgViews) scoreA++;
    else if (creatorB.avgViews > creatorA.avgViews) scoreB++;

    if (creatorA.engagementRate > creatorB.engagementRate) scoreA++;
    else if (creatorB.engagementRate > creatorA.engagementRate) scoreB++;

    let overallWinner = "tie";
    if (scoreA > scoreB) {
      overallWinner = "creatorA";
    } else if (scoreB > scoreA) {
      overallWinner = "creatorB";
    } else {
      // TIE BREAKER: use subscribers
      if (creatorA.subscribers > creatorB.subscribers) {
        overallWinner = "creatorA";
      } else if (creatorB.subscribers > creatorA.subscribers) {
        overallWinner = "creatorB";
      }
    }

    console.log("Comparison completed. Overall Winner:", overallWinner);
    console.log("================ [COMPARE YOUTUBE CREATORS END] ================\n");

    res.status(200).json({
      success: true,
      creatorA,
      creatorB,
      aiReport,
      comparison: {
        winnerSubscribers,
        winnerViews,
        winnerEngagement,
        winnerVideos,
        overallWinner,
      },
    });
  } catch (error) {
    console.error("Error at catch block in compareYoutubeCreators:", error.message);
    if (error.response?.data?.error?.message?.includes("quota")) {
      return res.status(403).json({
        success: false,
        message: "YouTube API quota exceeded. Please try again later.",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to compare YouTube creators.",
    });
  }
};

