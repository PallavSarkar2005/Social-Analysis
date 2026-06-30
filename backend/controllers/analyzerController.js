import axios from "axios";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import { youtubeGet } from "../utils/youtubeClient.js";
import { getCreatorAnalyticsData } from "./compareController.js";
import { resolveOfficialPublicImage } from "../utils/imageResolver.js";


/*
========================================
Unescape URL
========================================
Converts HTML entities (like &#x2F;, &amp;) back to normal characters.
This is critical because global XSS sanitization encodes URL characters.
*/
export const unescapeUrl = (str) => {
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
Normalize YouTube URL
========================================
Parses and normalizes YouTube URLs into a standard format.
Handles handles, custom aliases, channel paths, protocol, and subdomains.
*/
export const normalizeYoutubeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  
  // 1. Unescape html entities
  let url = unescapeUrl(rawUrl.trim());
  
  // 2. Remove query parameters
  url = url.split("?")[0];
  
  // 3. Remove trailing slashes
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  
  // 4. Standardize protocol and subdomains
  url = url.replace(/^http:\/\//i, "https://");
  url = url.replace(/^https:\/\/www\./i, "https://");
  
  // 5. Handles startsWith("@") -> convert to handle path
  if (url.startsWith("@")) {
    return `https://youtube.com/${url.toLowerCase()}`;
  }
  
  // 6. Handle "/@" paths -> lowercase handle part
  if (url.includes("youtube.com/@")) {
    const parts = url.split("youtube.com/@");
    return `https://youtube.com/@${parts[1].toLowerCase()}`;
  }
  
  // 7. Handle "/c/" paths -> lowercase custom path part
  if (url.includes("youtube.com/c/")) {
    const parts = url.split("youtube.com/c/");
    return `https://youtube.com/c/${parts[1].toLowerCase()}`;
  }
  
  // 8. Handle "/channel/" paths -> keep channel ID case-sensitive!
  if (url.includes("youtube.com/channel/")) {
    const parts = url.split("youtube.com/channel/");
    return `https://youtube.com/channel/${parts[1]}`;
  }
  
  return url;
};

/*
========================================
Extract Video ID
========================================
A robust regex extractor with multiple fallbacks to extract the 11-char video ID.
*/
export const extractVideoId = (url) => {
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
export const getChannelByHandle = async (handle, forceRefresh = false) => {
  console.log("STEP 4.1.a: Resolving channel ID for handle =", handle);
  const cleanHandle = handle.startsWith("@") ? handle.substring(1) : handle;
  
  const { data, cached } = await youtubeGet(
    "resolveHandle",
    "https://www.googleapis.com/youtube/v3/channels",
    {
      forHandle: cleanHandle,
      part: "id,snippet",
    },
    forceRefresh
  );

  console.log("Full YouTube API Response (forHandle):", JSON.stringify(data, null, 2));
  console.log("STEP 4.1.c: YouTube channels API raw response items count =", data?.items?.length);
  
  if (!data || !data.items) {
    console.error("STEP 4.1.d Error: Channels API response data or items missing");
    throw new Error("YouTube API returned empty items");
  }

  if (!data.items.length) {
    console.log("STEP 4.1.e: Channels API returned 0 items");
    return null;
  }

  const channelId = data.items[0].id;
  console.log("STEP 4.1.f: Resolved channel ID =", channelId, "(cached:", cached, ")");
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
// Coalescing request map
const activeRequests = new Map();

const fetchYoutubeData = async (channelId, url, forceRefresh) => {
  const channelDataPromise = youtubeGet(
    "getChannelStats",
    "https://www.googleapis.com/youtube/v3/channels",
    {
      part: "snippet,statistics,contentDetails",
      id: channelId,
    },
    forceRefresh
  );
  
  const uploadsPlaylistId = `UU${channelId.substring(2)}`;
  const recentVideosPromise = youtubeGet(
    "getChannelVideos",
    "https://www.googleapis.com/youtube/v3/playlistItems",
    {
      playlistId: uploadsPlaylistId,
      part: "snippet",
      maxResults: 10,
    },
    forceRefresh
  );
  
  const analyticsPromise = getCreatorAnalyticsData(channelId);
  
  const [channelDataRes, recentVideosDataRes, analytics] = await Promise.all([
    channelDataPromise,
    recentVideosPromise,
    analyticsPromise
  ]);
  
  return { 
    channelData: channelDataRes.data, 
    recentVideosData: recentVideosDataRes.data, 
    analytics 
  };
};

const getCoalescedYoutubeData = (channelId, url, forceRefresh) => {
  const key = `${channelId}_${forceRefresh}`;
  if (activeRequests.has(key)) {
    console.log(`COALESCE: Reusing active YouTube API fetch for channel: ${channelId}`);
    return activeRequests.get(key);
  }
  
  const promise = fetchYoutubeData(channelId, url, forceRefresh).finally(() => {
    activeRequests.delete(key);
  });
  
  activeRequests.set(key, promise);
  return promise;
};

export const analyzeYoutubeUrl = async (req, res, next) => {
  try {
    console.log("========== ANALYZER START ==========");
    console.log("STEP 1: Request received. Method:", req.method, "URL:", req.originalUrl);
    console.log("STEP 1.1: Request Body:", JSON.stringify(req.body));
    console.log("STEP 1.2: Authenticated User (req.user):", req.user ? { _id: req.user._id, email: req.user.email } : "null");

    // Env Validation Check
    console.log("STEP 2: Verifying YOUTUBE_API_KEY presence");
    const configuredKeys = [];
    if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== "") {
      configuredKeys.push(process.env.YOUTUBE_API_KEY);
    }
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("YOUTUBE_API_KEY_") && process.env[key] && process.env[key].trim() !== "") {
        configuredKeys.push(process.env[key]);
      }
    });

    if (configuredKeys.length === 0) {
      console.error("STEP 2 Error: YOUTUBE_API_KEY is missing from environment variables");
      return res.status(500).json({
        success: false,
        message: "Missing YOUTUBE_API_KEY"
      });
    }
    console.log("STEP 2.1: YOUTUBE_API_KEY is present (Total keys configured:", configuredKeys.length, ")");

    const rawUrl = req.body?.url;
    const selectedGroup = req.body?.group || "Other";
    const selectedState = req.body?.state || "Unknown State";
    const selectedParty = req.body?.party || "Independent";
    const forceRefresh = req.body?.forceRefresh === true || req.body?.forceRefresh === "true";
    // profileImage is a URL string like /uploads/filename.jpg — extracted before any further processing
    const submittedProfileImage = (req.body?.profileImage || "").trim();
    console.log("STEP 1.3: Submitted profileImage =", submittedProfileImage || "(none)");
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
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be") || url.startsWith("@");
    if (!isYoutube) {
      console.error("STEP 3 Error: Invalid YouTube URL format");
      return res.status(400).json({
        success: false,
        message: "Invalid YouTube URL"
      });
    }

    // Normalize URL
    const normalizedUrl = normalizeYoutubeUrl(url);
    console.log("Normalized URL:", normalizedUrl);

    // ────────────────────────────────────────────────────────────────────────
    // 1. VIDEO ANALYSIS BLOCK (Separate Flow)
    // ────────────────────────────────────────────────────────────────────────
    const videoId = extractVideoId(url);
    if (videoId) {
      console.log("STEP 4: URL identified as video. ID =", videoId);
      
      const { data: videoData, cached: videoCached, cachedAt: videoCachedAt } = await youtubeGet(
        "getVideoStats",
        "https://www.googleapis.com/youtube/v3/videos",
        {
          part: "snippet,statistics",
          id: videoId,
        },
        forceRefresh
      );

      if (!videoData || !videoData.items || !videoData.items.length) {
        return res.status(404).json({ success: false, message: "Video not found" });
      }

      const video = videoData.items[0];
      const views = Number(video.statistics?.viewCount || 0);
      const likes = Number(video.statistics?.likeCount || 0);
      const comments = Number(video.statistics?.commentCount || 0);
      const engagement = (((likes + comments) / Math.max(views, 1)) * 100).toFixed(2);

      return res.json({
        success: true,
        type: "video",
        cached: videoCached,
        cachedAt: videoCachedAt ? new Date(videoCachedAt).getTime() : Date.now(),
        data: {
          videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          channel: video.snippet.channelTitle,
          channelId: video.snippet.channelId,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
          publishedAt: video.snippet.publishedAt,
          views,
          likes,
          comments,
          engagement,
        },
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. CHANNEL ANALYSIS BLOCK (Intelligent Cache & DB updates)
    // ────────────────────────────────────────────────────────────────────────
    const now = new Date();
    
    // Fast URL cache lookup
    let cachedAccount = null;
    if (!forceRefresh) {
      cachedAccount = await Account.findOne({
        normalizedUrl: normalizedUrl,
        cacheExpiresAt: { $gt: now }
      }).lean();
    }

    let channelId = null;
    if (cachedAccount) {
      channelId = cachedAccount.accountId || cachedAccount.channelId;
      console.log(`CACHE HIT (URL): Found valid global cache for URL ${normalizedUrl} with channelId ${channelId}`);
    } else {
      // Resolve channelId from handle or URL structure
      if (url.includes("/channel/")) {
        channelId = url.split("/channel/")[1].split("/")[0].split("?")[0];
      } else {
        let handle = null;
        if (url.startsWith("@")) {
          handle = url;
        } else if (url.includes("/@")) {
          handle = "@" + url.split("/@")[1].split("/")[0].split("?")[0];
        }
        
        if (handle) {
          channelId = await getChannelByHandle(handle, forceRefresh);
        } else {
          // Fallback custom alias
          if (url.includes("/c/")) {
            const customName = url.split("/c/")[1].split("/")[0].split("?")[0];
            handle = "@" + customName;
            channelId = await getChannelByHandle(handle, forceRefresh);
          }
        }
      }
    }

    if (!channelId) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    // Global cache lookup by resolved channelId
    if (!cachedAccount && !forceRefresh) {
      cachedAccount = await Account.findOne({
        accountId: channelId,
        cacheExpiresAt: { $gt: now }
      }).lean();
      if (cachedAccount) {
        console.log(`CACHE HIT (ChannelId): Found valid global cache for channelId ${channelId}`);
      }
    }

    let accountData = null;
    let isDataCached = false;
    let cachedTime = Date.now();

    if (cachedAccount) {
      isDataCached = true;
      cachedTime = cachedAccount.analyzedAt ? new Date(cachedAccount.analyzedAt).getTime() : Date.now();
      accountData = {
        title: cachedAccount.name,
        description: cachedAccount.description || "",
        thumbnail: cachedAccount.thumbnail || "",
        profileImage: cachedAccount.profileImage || cachedAccount.uploadedImage || cachedAccount.thumbnail || "",
        uploadedImage: cachedAccount.uploadedImage || "",
        resolvedImage: cachedAccount.resolvedImage || "",
        imageSource: cachedAccount.imageSource || "youtube",
        subscribers: cachedAccount.subscribers || 0,
        views: cachedAccount.views || 0,
        videos: cachedAccount.videos || 0,
        engagement: cachedAccount.engagement || 0,
        recentVideos: cachedAccount.recentVideos || [],
      };
    } else {
      // Refresh cache: Fetch fresh data with coalesced request Map
      console.log(`CACHE MISS: Fetching fresh YouTube data for channelId ${channelId}`);
      const freshData = await getCoalescedYoutubeData(channelId, url, forceRefresh);
      
      const channel = freshData.channelData?.items?.[0];
      if (!channel) {
        return res.status(404).json({ success: false, message: "Channel details not found on YouTube" });
      }

      const recentVideosRaw = freshData.recentVideosData?.items || [];
      const recentVideosItems = recentVideosRaw.map(item => ({
        id: {
          kind: "youtube#video",
          videoId: item.snippet?.resourceId?.videoId
        },
        snippet: item.snippet
      }));

      const youtubeThumbnail = channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.medium?.url || "";

      accountData = {
        title: channel.snippet.title,
        description: channel.snippet.description || "",
        thumbnail: youtubeThumbnail,
        subscribers: Number(channel.statistics.subscriberCount || 0),
        views: Number(channel.statistics.viewCount || 0),
        videos: Number(channel.statistics.videoCount || 0),
        engagement: freshData.analytics.engagementRate || 0,
        recentVideos: recentVideosItems,
      };
    }

    // Now update or create the Account document specific to the logged-in User
    let account = await Account.findOne({
      accountId: channelId,
      userId: req.user._id,
    });

    const analyzedAt = isDataCached ? (cachedAccount.analyzedAt || new Date()) : new Date();
    const cacheExpiresAt = isDataCached ? (cachedAccount.cacheExpiresAt || new Date()) : new Date(Date.now() + 3 * 60 * 1000);

    const updateFields = {
      name: accountData.title,
      platform: "youtube",
      accountId: channelId,
      channelId: channelId,
      profileUrl: url,
      userId: req.user._id,
      description: accountData.description,
      thumbnail: accountData.thumbnail,
      subscribers: accountData.subscribers,
      views: accountData.views,
      videos: accountData.videos,
      engagement: accountData.engagement,
      recentVideos: accountData.recentVideos,
      normalizedUrl: normalizedUrl,
      group: selectedGroup,
      state: selectedState,
      party: selectedParty,
      analyzedAt,
      cacheExpiresAt,
    };

    // ── Resolve Image: 4-Tier Priority ─────────────────────────────────────────
    //
    // Priority 1 — User just uploaded a new image (highest, always replaces everything)
    // Priority 2 — Global previously uploaded image for this creator (same channelId, any user)
    // Priority 3 — Official public image resolved via Wikimedia/dictionary
    // Priority 4 — YouTube channel thumbnail (always available)
    //
    // IMPORTANT: If Priority 1 is set, it MUST replace whatever was stored before.
    // ────────────────────────────────────────────────────────────────────────────

    let uploadedImage = "";
    let resolvedImage = "";
    let profileImage = "";
    let imageSource = "youtube";

    console.log("[IMAGE] submittedProfileImage =", submittedProfileImage || "(none)");

    if (submittedProfileImage) {
      // ── Priority 1: Brand-new user upload → always wins ──────────────────────
      uploadedImage = submittedProfileImage;
      profileImage  = submittedProfileImage;
      imageSource   = "user";
      updateFields.uploadedBy = req.user._id;
      updateFields.uploadedAt = new Date();
      console.log("[IMAGE] Priority 1 (user upload) selected:", uploadedImage);

    } else {
      // ── No new upload this run: inherit the best image that already exists ───
      // Fetch global uploaded image (any user, same creator)
      let globalUploadedImage = "";
      const existingWithUpload = await Account.findOne({
        accountId: channelId,
        uploadedImage: { $exists: true, $ne: "" },
      }).sort({ imageUpdatedAt: -1, updatedAt: -1 }).lean();
      if (existingWithUpload?.uploadedImage) {
        globalUploadedImage = existingWithUpload.uploadedImage;
      }

      // Also check the current user's existing account
      const localUploadedImage = account?.uploadedImage || "";

      if (globalUploadedImage) {
        uploadedImage = globalUploadedImage;
        profileImage  = globalUploadedImage;
        imageSource   = "user";
        console.log("[IMAGE] Priority 2a (global uploaded) selected:", uploadedImage);
      } else if (localUploadedImage) {
        uploadedImage = localUploadedImage;
        profileImage  = localUploadedImage;
        imageSource   = "user";
        console.log("[IMAGE] Priority 2b (local uploaded) selected:", uploadedImage);
      }
    }

    // ── Priority 3: Official resolved image (Wikimedia / verified dictionary) ──
    let globalResolvedImage = "";
    const existingWithResolved = await Account.findOne({
      accountId: channelId,
      resolvedImage: { $exists: true, $ne: "" },
    }).sort({ updatedAt: -1 }).lean();
    if (existingWithResolved?.resolvedImage) {
      globalResolvedImage = existingWithResolved.resolvedImage;
    }

    let resolvedOfficialImage = globalResolvedImage || account?.resolvedImage || "";
    if (!isDataCached && !resolvedOfficialImage) {
      resolvedOfficialImage = await resolveOfficialPublicImage(accountData.title);
    }

    resolvedImage = resolvedOfficialImage || globalResolvedImage || account?.resolvedImage || (isDataCached && accountData.resolvedImage) || "";

    // Use resolved image as profileImage only if no user upload exists
    if (!uploadedImage && resolvedImage) {
      profileImage = resolvedImage;
      imageSource  = "official";
      console.log("[IMAGE] Priority 3 (resolved official) selected:", profileImage);
    }

    // ── Priority 4: YouTube channel thumbnail ─────────────────────────────────
    if (!profileImage) {
      profileImage = accountData.thumbnail;
      imageSource  = accountData.thumbnail ? "youtube" : "default";
      console.log("[IMAGE] Priority 4 (youtube thumbnail) selected:", profileImage);
    }

    // Stamp the final image state into the update fields
    updateFields.uploadedImage   = uploadedImage;
    updateFields.resolvedImage   = resolvedImage;
    updateFields.profileImage    = profileImage;
    updateFields.imageSource     = imageSource;
    updateFields.imageUpdatedAt  = new Date();

    console.log("[IMAGE] Final state → uploadedImage:", uploadedImage, "| profileImage:", profileImage, "| imageSource:", imageSource);

    // ── Persist: Create or Update the Account document ────────────────────────
    if (!account) {
      console.log("[DB] Creating new Account record");
      account = await Account.create(updateFields);
    } else {
      console.log("[DB] Updating existing Account record:", account._id.toString());
      account = await Account.findOneAndUpdate(
        { _id: account._id },
        { $set: updateFields },
        { new: true }
      );
      console.log("[DB] Update result — uploadedImage:", account.uploadedImage, "| profileImage:", account.profileImage);
    }

    // ── Propagate images globally to all other user accounts for this creator ──
    const globalUpdateResult = await Account.updateMany(
      { accountId: channelId, _id: { $ne: account._id } },
      {
        $set: {
          profileImage,
          uploadedImage,
          resolvedImage,
          imageSource,
          imageUpdatedAt: new Date(),
        },
      }
    );
    console.log("[DB] Global updateMany propagated to", globalUpdateResult.modifiedCount, "other account(s)");


    // Create Snapshot record for tracking history
    await Snapshot.create({
      account: account._id,
      userId: req.user._id,
      followers: account.subscribers,
      views: account.views,
      videos: account.videos,
      likes: Math.round((account.engagement / 100) * account.views),
      engagementRate: account.engagement,
      party: selectedParty,
      state: selectedState,
      name: account.name,
      profileImage: account.profileImage || account.thumbnail,
      capturedAt: new Date(),
    });
    // Fetch snapshot history
    const history = await Snapshot.find({
      account: account._id,
      userId: req.user._id,
    })
      .sort({ capturedAt: 1 })
      .lean();

    return res.json({
      success: true,
      type: "channel",
      cached: isDataCached,
      cachedAt: cachedTime,
      data: {
        mongoId: account._id,
        channelId: channelId,
        title: account.name,
        description: account.description || "",
        thumbnail: account.thumbnail,
        profileImage: account.profileImage || "",
        uploadedImage: account.uploadedImage || "",
        resolvedImage: account.resolvedImage || "",
        imageSource: account.imageSource || "youtube",
        // imageUpdatedAt is used by the frontend as a cache-buster (?v=timestamp)
        // so the browser always loads the latest image even if the filename didn't change
        imageUpdatedAt: account.imageUpdatedAt ? new Date(account.imageUpdatedAt).getTime() : Date.now(),
        subscribers: account.subscribers,
        totalViews: account.views,
        videoCount: account.videos,
        recentVideos: account.recentVideos,
        history: history.map((item) => ({
          date: new Date(item.capturedAt).toLocaleDateString(),
          followers: item.followers,
          views: item.views,
        })),
      }
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
