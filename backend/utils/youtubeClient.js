import axios from "axios";
import YoutubeCache from "../models/YoutubeCache.js";
import ApiUsage from "../models/ApiUsage.js";

// Active requests for coalescing (Map of cacheKey -> Promise)
const activeRequests = new Map();

// Helper to load unique API keys
const getApiKeys = () => {
  const keys = [];
  if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== "") {
    keys.push(process.env.YOUTUBE_API_KEY.trim());
  }
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("YOUTUBE_API_KEY_")) {
      const val = process.env[key];
      if (val && typeof val === "string" && val.trim() !== "") {
        keys.push(val.trim());
      }
    }
  });
  return [...new Set(keys)];
};

let currentKeyIndex = 0;

// Log API usage to MongoDB
const logUsage = async (apiKey, endpoint, quotaCost, status, cached) => {
  try {
    const maskedKey = apiKey && apiKey.length > 10
      ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
      : apiKey || "N/A";

    await ApiUsage.create({
      apiKey: maskedKey,
      endpoint,
      quotaCost,
      status,
      cached,
    });
  } catch (err) {
    console.error("Error logging API usage to DB:", err.message);
  }
};

// Internal function to call YouTube API with rotation
const callYoutubeWithRotation = async (endpoint, url, params = {}) => {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No YouTube API keys configured in environment variables.");
  }

  let attempts = 0;
  const totalKeys = keys.length;

  while (attempts < totalKeys) {
    // Keep index inside bounds
    if (currentKeyIndex >= totalKeys) {
      currentKeyIndex = 0;
    }
    const key = keys[currentKeyIndex];
    let quotaCost = 1;
    if (url.includes("/search")) {
      quotaCost = 100;
    }

    try {
      const response = await axios.get(url, {
        params: {
          ...params,
          key,
        },
      });

      // Log success
      await logUsage(key, endpoint, quotaCost, "success", false);
      return response.data;
    } catch (error) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      const errorDetails = errorData?.error?.errors?.[0] || {};
      const reason = (errorDetails.reason || "").toLowerCase();
      const message = (errorData?.error?.message || error.message || "").toLowerCase();

      const isQuotaExceeded =
        reason === "quotaexceeded" ||
        reason === "dailylimitexceeded" ||
        reason === "ratelimitexceeded" ||
        reason === "userratelimitexceeded" ||
        message.includes("quota exceeded") ||
        message.includes("limit exceeded") ||
        status === 403 ||
        status === 429;

      if (isQuotaExceeded) {
        console.warn(`YouTube Key index ${currentKeyIndex} (ending in ${key.slice(-4)}) exhausted quota. Reason: ${reason || message}. Rotating...`);
        
        // Log quota failure
        await logUsage(key, endpoint, quotaCost, `quotaExceeded: ${reason || message}`, false);
        
        // Move to the next key
        currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
        attempts++;
      } else {
        // Log other failures and throw immediately (non-quota errors)
        await logUsage(key, endpoint, quotaCost, `failed: ${message}`, false);
        throw error;
      }
    }
  }

  // All keys exhausted
  throw new Error("All YouTube API keys have exhausted their quota.");
};

// Generic fetch wrapper with Caching + Coalescing
export const youtubeGet = async (endpoint, url, params = {}, forceRefresh = false) => {
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Create a stable cache key based on url and params (excluding API key)
  const cleanParams = { ...params };
  delete cleanParams.key;

  const sortedParams = Object.keys(cleanParams)
    .sort()
    .reduce((obj, key) => {
      obj[key] = cleanParams[key];
      return obj;
    }, {});

  const cacheKey = `${endpoint}:${url}:${JSON.stringify(sortedParams)}`;

  // 1. Check cache if not forceRefresh
  if (!forceRefresh) {
    try {
      const cachedRecord = await YoutubeCache.findOne({ cacheKey });
      if (cachedRecord && (Date.now() - new Date(cachedRecord.cachedAt).getTime() <= CACHE_DURATION)) {
        // Log cache hit
        await logUsage("CACHED", endpoint, 0, "success", true);
        return { data: cachedRecord.data, cached: true, cachedAt: cachedRecord.cachedAt };
      }
    } catch (err) {
      console.error("Cache retrieval error:", err.message);
    }
  }

  // 2. Prevent duplicate concurrent calls using request coalescing
  let activePromise = activeRequests.get(cacheKey);
  if (activePromise) {
    console.log(`Coalescing concurrent request for cache key: ${cacheKey}`);
    try {
      const result = await activePromise;
      // Log as coalesced cache hit
      await logUsage("COALESCED", endpoint, 0, "success", true);
      
      const cachedRecord = await YoutubeCache.findOne({ cacheKey });
      return {
        data: result,
        cached: true,
        cachedAt: cachedRecord ? cachedRecord.cachedAt : new Date(),
      };
    } catch (err) {
      // If the coalesced promise failed, retry fresh
      console.error("Coalesced promise failed, retrying fresh fetch:", err.message);
    }
  }

  // Start new fetch and store promise
  const fetchPromise = (async () => {
    try {
      const freshData = await callYoutubeWithRotation(endpoint, url, params);
      
      // Update cache in MongoDB
      await YoutubeCache.findOneAndUpdate(
        { cacheKey },
        { data: freshData, cachedAt: new Date() },
        { upsert: true, new: true }
      );
      
      return freshData;
    } finally {
      activeRequests.delete(cacheKey);
    }
  })();

  activeRequests.set(cacheKey, fetchPromise);

  try {
    const data = await fetchPromise;
    return { data, cached: false, cachedAt: new Date() };
  } catch (error) {
    throw error;
  }
};
