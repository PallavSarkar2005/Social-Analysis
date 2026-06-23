import axios from "axios";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

/*
========================================
Unescape URL
========================================
Converts HTML entities (like &#x2F;, &amp;) back to normal characters.
This is critical because global XSS sanitization encodes URL characters.
*/
const unescapeUrl = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
};

/*
========================================
Extract Video ID
========================================
A robust regex extractor with multiple fallbacks to extract the 11-char video ID.
*/
const extractVideoId = (url) => {
  console.log("LOG: [extractVideoId] Attempting extraction on URL:", url);
  try {
    // Matches standard watch?v=, short links youtu.be/, /embed/, /shorts/, /live/
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
      console.log("LOG: [extractVideoId] Regex match success:", match[1]);
      return match[1];
    }
  } catch (err) {
    console.error("LOG: [extractVideoId] Regex matching error:", err.message);
  }

  // Fallback 1: Query parameter search
  try {
    if (url.includes("watch?v=")) {
      const parsedUrl = new URL(url);
      const v = parsedUrl.searchParams.get("v");
      if (v) {
        console.log("LOG: [extractVideoId] Fallback searchParams success:", v);
        return v;
      }
    }
  } catch (err) {
    console.error("LOG: [extractVideoId] Fallback searchParams error:", err.message);
  }

  // Fallback 2: String split extraction
  try {
    if (url.includes("youtu.be/")) {
      const v = url.split("youtu.be/")[1].split("?")[0];
      console.log("LOG: [extractVideoId] Fallback youtu.be split success:", v);
      return v;
    }
    if (url.includes("/live/")) {
      const v = url.split("/live/")[1].split("?")[0];
      console.log("LOG: [extractVideoId] Fallback live split success:", v);
      return v;
    }
    if (url.includes("/shorts/")) {
      const v = url.split("/shorts/")[1].split("?")[0];
      console.log("LOG: [extractVideoId] Fallback shorts split success:", v);
      return v;
    }
  } catch (err) {
    console.error("LOG: [extractVideoId] Fallback split error:", err.message);
  }

  console.log("LOG: [extractVideoId] Extraction failed, returning null");
  return null;
};

/*
========================================
Find Channel ID from @handle
========================================
*/
const getChannelByHandle = async (handle) => {
  console.log("STEP 4.1.a: Resolving channel ID for handle =", handle);
  console.log("STEP 4.1.b: Calling YouTube search API for handle");
  
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

  console.log("STEP 4.1.c: YouTube search API raw response items count =", response.data?.items?.length);
  
  if (!response.data || !response.data.items) {
    console.error("STEP 4.1.d Error: Search API response data or items missing");
    throw new Error("YouTube API returned empty items");
  }

  if (!response.data.items.length) {
    console.log("STEP 4.1.e: Search API returned 0 items");
    return null;
  }

  const channelId = response.data.items[0].snippet.channelId;
  console.log("STEP 4.1.f: Resolved channel ID =", channelId);
  return channelId;
};

/*
========================================
Analyze YouTube Error Helper
========================================
*/
const analyzeYoutubeError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    console.error(`LOG: YouTube API responded with status ${status}:`, JSON.stringify(data));
    
    const errorDetails = data?.error?.errors?.[0] || {};
    const reason = (errorDetails.reason || "").toLowerCase();
    const message = (data?.error?.message || "").toLowerCase();

    if (reason === "quotaexceeded" || message.includes("quota exceeded") || message.includes("limit exceeded")) {
      return { status: 403, message: "YouTube quota exceeded" };
    }
    if (reason === "keyinvalid" || message.includes("key not valid") || message.includes("invalid api key")) {
      return { status: 400, message: "Invalid API key" };
    }
    return { status: status || 500, message: `YouTube API Error: ${data?.error?.message || error.message}` };
  }
  
  console.error("LOG: Network/Server error calling YouTube API:", error.message);
  return { status: 500, message: `YouTube API Network Error: ${error.message}` };
};

/*
========================================
Main Analyzer Controller
========================================
*/
export const analyzeYoutubeUrl = async (req, res, next) => {
  try {
    console.log("========== ANALYZER START ==========");
    console.log("STEP 1: Request received. Method:", req.method, "URL:", req.originalUrl);
    console.log("STEP 1.1: Request Body:", JSON.stringify(req.body));
    console.log("STEP 1.2: Authenticated User (req.user):", req.user ? { _id: req.user._id, email: req.user.email } : "null");

    // Env Validation Check
    console.log("STEP 2: Verifying YOUTUBE_API_KEY presence");
    if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY.trim() === "") {
      console.error("STEP 2 Error: YOUTUBE_API_KEY is missing from environment variables");
      return res.status(500).json({
        success: false,
        message: "Missing YOUTUBE_API_KEY"
      });
    }
    console.log("STEP 2.1: YOUTUBE_API_KEY is present (Length:", process.env.YOUTUBE_API_KEY.length, ")");

    const rawUrl = req.body?.url;
    if (!rawUrl || typeof rawUrl !== "string") {
      console.error("STEP 3 Error: URL parsing failed due to empty/invalid url parameter");
      return res.status(400).json({
        success: false,
        message: "URL parsing failed"
      });
    }

    // Unescape the URL (XSS sanitization fix)
    const url = unescapeUrl(rawUrl.trim());
    console.log("STEP 3: URL unescaped successfully.");
    console.log("STEP 3.1: Raw Input =", rawUrl);
    console.log("STEP 3.2: Decoded URL =", url);

    // Validate overall YouTube structure
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube-nocookie.com") || url.startsWith("@");
    if (!isYoutube) {
      console.error("STEP 3 Error: Invalid YouTube URL format");
      return res.status(400).json({
        success: false,
        message: "Invalid YouTube URL"
      });
    }

    /*
    ========================================
    CHANNEL ANALYSIS (By Handle /@)
    ========================================
    */
    if (url.includes("/@") || url.startsWith("@")) {
      console.log("STEP 4: URL identified as a channel handle. Resolving handle...");
      
      let handle = null;
      if (url.startsWith("@")) {
        handle = url;
      } else {
        handle = "@" + url.split("/@")[1].split("/")[0].split("?")[0];
      }
      console.log("STEP 4.1: Extracted handle name =", handle);

      const channelId = await getChannelByHandle(handle);
      if (!channelId) {
        console.error("STEP 4.2 Error: Channel handle did not resolve to a channel ID");
        return res.status(404).json({
          success: false,
          message: "Channel not found",
        });
      }

      console.log("STEP 4.2: Channel ID resolved successfully. Fetching channel statistics...");
      console.log("STEP 4.2.a: Calling YouTube channels API for channelId =", channelId);
      
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

      console.log("STEP 4.3: YouTube channels API raw response metadata items count =", channelResponse.data?.items?.length);
      
      if (!channelResponse.data || !channelResponse.data.items) {
        console.error("STEP 4.3 Error: YouTube API response schema missing data/items");
        return res.status(500).json({
          success: false,
          message: "YouTube API returned empty items",
        });
      }

      if (!channelResponse.data.items.length) {
        console.error("STEP 4.3 Error: Channel details not found in API response");
        return res.status(404).json({
          success: false,
          message: "Channel not found",
        });
      }

      const channel = channelResponse.data.items[0];

      let account;
      try {
        console.log("STEP 4.4: Querying MongoDB for Account model with channelId =", channelId, "userId =", req.user._id);
        account = await Account.findOne({
          accountId: channelId,
          userId: req.user._id,
        });

        if (!account) {
          console.log("STEP 4.4.a: Creating a new Account model record in MongoDB");
          account = await Account.create({
            name: channel.snippet.title,
            platform: "youtube",
            accountId: channelId,
            profileUrl: url,
            userId: req.user._id,
          });
        }
        console.log("STEP 4.4.b: MongoDB Account ID =", account._id);

        console.log("STEP 4.4.c: Creating Snapshot record in MongoDB");
        await Snapshot.create({
          account: account._id,
          followers: Number(channel.statistics.subscriberCount || 0),
          views: Number(channel.statistics.viewCount || 0),
          userId: req.user._id,
        });
      } catch (dbErr) {
        console.error("STEP 4.4 Error: MongoDB insert/find operation failed:", dbErr.message);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      let history;
      try {
        console.log("STEP 4.5: Fetching Snapshot history from MongoDB");
        history = await Snapshot.find({
          account: account._id,
          userId: req.user._id,
        })
          .sort({ capturedAt: 1 })
          .lean();
        console.log("STEP 4.5.a: Snapshot history records count =", history.length);
      } catch (dbErr) {
        console.error("STEP 4.5 Error: Fetching snapshot history failed:", dbErr.message);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      console.log("STEP 4.6: Fetching recent video uploads for channelId =", channelId);
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

      console.log("STEP 4.6.a: YouTube search API raw response videos count =", recentVideosResponse.data?.items?.length);

      const responsePayload = {
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
          recentVideos: recentVideosResponse.data?.items || [],
          history: history.map((item) => ({
            date: new Date(item.capturedAt).toLocaleDateString(),
            followers: item.followers,
            views: item.views,
          })),
        },
      };

      console.log("STEP 4.7: Final Channel response payload constructed. Sending to client.");
      return res.json(responsePayload);
    }

    /*
    ========================================
    CHANNEL ANALYSIS (By Channel ID)
    ========================================
    */
    if (url.includes("/channel/")) {
      console.log("STEP 4: URL identified as direct channel URL. Extracting Channel ID...");
      const channelId = url.split("/channel/")[1].split("/")[0].split("?")[0];
      console.log("STEP 4.1: Extracted channelId =", channelId);

      console.log("STEP 4.2: Fetching channel statistics from YouTube channels API...");
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

      console.log("STEP 4.3: YouTube channels API raw response metadata items count =", channelResponse.data?.items?.length);
      
      if (!channelResponse.data || !channelResponse.data.items) {
        console.error("STEP 4.3 Error: YouTube API response schema missing data/items");
        return res.status(500).json({
          success: false,
          message: "YouTube API returned empty items",
        });
      }

      if (!channelResponse.data.items.length) {
        console.error("STEP 4.3 Error: Channel details not found in API response");
        return res.status(404).json({
          success: false,
          message: "Channel not found",
        });
      }

      const channel = channelResponse.data.items[0];

      let account;
      try {
        console.log("STEP 4.4: Querying MongoDB for Account model with channelId =", channelId, "userId =", req.user._id);
        account = await Account.findOne({
          accountId: channelId,
          userId: req.user._id,
        });

        if (!account) {
          console.log("STEP 4.4.a: Creating a new Account model record in MongoDB");
          account = await Account.create({
            name: channel.snippet.title,
            platform: "youtube",
            accountId: channelId,
            profileUrl: url,
            userId: req.user._id,
          });
        }
        console.log("STEP 4.4.b: MongoDB Account ID =", account._id);

        console.log("STEP 4.4.c: Creating Snapshot record in MongoDB");
        await Snapshot.create({
          account: account._id,
          followers: Number(channel.statistics.subscriberCount || 0),
          views: Number(channel.statistics.viewCount || 0),
          userId: req.user._id,
        });
      } catch (dbErr) {
        console.error("STEP 4.4 Error: MongoDB insert/find operation failed:", dbErr.message);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      let history;
      try {
        console.log("STEP 4.5: Fetching Snapshot history from MongoDB");
        history = await Snapshot.find({
          account: account._id,
          userId: req.user._id,
        })
          .sort({ capturedAt: 1 })
          .lean();
        console.log("STEP 4.5.a: Snapshot history records count =", history.length);
      } catch (dbErr) {
        console.error("STEP 4.5 Error: Fetching snapshot history failed:", dbErr.message);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      console.log("STEP 4.6: Fetching recent video uploads for channelId =", channelId);
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

      console.log("STEP 4.6.a: YouTube search API raw response videos count =", recentVideosResponse.data?.items?.length);

      const responsePayload = {
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
          recentVideos: recentVideosResponse.data?.items || [],
          history: history.map((item) => ({
            date: new Date(item.capturedAt).toLocaleDateString(),
            followers: item.followers,
            views: item.views,
          })),
        },
      };

      console.log("STEP 4.7: Final Channel response payload constructed. Sending to client.");
      return res.json(responsePayload);
    }

    /*
    ========================================
    VIDEO ANALYSIS (Single Video URL)
    ========================================
    */
    console.log("STEP 4: Extracting video ID from URL");
    const videoId = extractVideoId(url);
    console.log("STEP 4.1: Extracted video ID =", videoId);

    if (videoId) {
      console.log("STEP 5: Calling YouTube video statistics API");
      console.log("STEP 5.1: Request parameters for videos API:", { part: "snippet,statistics", id: videoId });
      
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

      console.log("STEP 5.2: YouTube API raw response received");
      console.log("STEP 5.3: Raw Response Data =", JSON.stringify(response.data, null, 2));

      if (!response.data || !response.data.items) {
        console.error("STEP 5.4 Error: YouTube API response schema missing data/items");
        return res.status(500).json({
          success: false,
          message: "YouTube API returned empty items",
        });
      }

      if (!response.data.items.length) {
        console.error("STEP 5.4 Error: Video ID not found on YouTube");
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

      const responsePayload = {
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
      };

      console.log("STEP 6: Final Video response payload constructed. Sending to client.");
      return res.json(responsePayload);
    }

    // Video extraction failed
    console.error("STEP 4.1 Error: Video ID extraction failed for unhandled URL patterns");
    return res.status(400).json({
      success: false,
      message: "Video ID extraction failed",
    });

  } catch (error) {
    console.error("================ ANALYZER ERROR ================");
    console.error("ERROR TYPE/MESSAGE:", error.name, "-", error.message);
    
    if (error.response) {
      console.error("HTTP ERROR CODE:", error.response.status);
      console.error("HTTP ERROR DATA:", JSON.stringify(error.response.data));
    }

    if (error.isAxiosError || error.response) {
      const errRes = analyzeYoutubeError(error);
      return res.status(errRes.status).json({
        success: false,
        message: errRes.message
      });
    }

    next(error);
  }
};
