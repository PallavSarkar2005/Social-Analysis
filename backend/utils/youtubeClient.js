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

const maskKeyLast25 = (k) => {
  if (!k) return "(empty)";
  const s = String(k);
  if (s.length <= 25) return "*".repeat(s.length);
  return s.slice(0, s.length - 25) + "*".repeat(25);
};

const dumpOutgoingYoutubeRequest = (config) => {
  const rawUrl = config.url || "";
  const isYoutube =
    rawUrl.includes("googleapis.com/youtube") ||
    rawUrl.includes("youtube.googleapis.com");
  if (!isYoutube) return config;

  const params = { ...(config.params || {}) };
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    query.set(k, String(v));
  }
  const qs = query.toString();
  const fullUrl = qs ? `${rawUrl}?${qs}` : rawUrl;
  const maskedFullUrl = fullUrl.replace(
    /([?&]key=)([^&]*)/i,
    (_, prefix, val) => `${prefix}${maskKeyLast25(decodeURIComponent(val))}`
  );

  const headers = { ...(config.headers || {}) };
  // Flatten AxiosHeaders if present
  const flatHeaders = {};
  if (typeof headers.toJSON === "function") {
    Object.assign(flatHeaders, headers.toJSON());
  } else {
    for (const [k, v] of Object.entries(headers)) {
      if (v !== undefined && typeof v !== "function") flatHeaders[k] = v;
    }
  }
  // Include axios defaults that will be merged
  const common = axios.defaults?.headers?.common || {};
  const methodDefaults = axios.defaults?.headers?.[String(config.method || "get").toLowerCase()] || {};
  const mergedHeaders = { ...common, ...methodDefaults, ...flatHeaders };

  console.log("------------------------------------");
  console.log("FULL URL");
  console.log(maskedFullUrl);
  console.log("HTTP METHOD");
  console.log(String(config.method || "get").toUpperCase());
  console.log("QUERY PARAMETERS");
  for (const [k, v] of Object.entries(params)) {
    if (k === "key") {
      console.log(`${k}=${maskKeyLast25(v)}`);
    } else {
      console.log(`${k}=${v}`);
    }
  }
  console.log("HEADERS");
  const auth =
    mergedHeaders.Authorization ||
    mergedHeaders.authorization ||
    null;
  console.log(`Authorization: ${auth ? String(auth).replace(/Bearer\s+.+/i, "Bearer ****") : "NONE"}`);
  for (const [k, v] of Object.entries(mergedHeaders)) {
    if (/^authorization$/i.test(k)) continue;
    console.log(`${k}: ${v}`);
  }
  console.log("AXIOS CONFIG (pre-flight, secrets masked)");
  console.log(
    JSON.stringify(
      {
        method: config.method || "get",
        url: config.url,
        params: {
          ...params,
          key: params.key ? maskKeyLast25(params.key) : undefined,
        },
        headers: {
          ...mergedHeaders,
          Authorization: auth ? "PRESENT(masked)" : "NONE",
          authorization: undefined,
        },
        baseURL: config.baseURL || axios.defaults.baseURL || null,
        timeout: config.timeout ?? axios.defaults.timeout ?? null,
        adapter: typeof config.adapter,
      },
      null,
      2
    )
  );
  console.log("------------------------------------");
  return config;
};

// Inspection-only: capture exact outgoing YouTube requests after axios merges defaults
const youtubeRequestInterceptorId = axios.interceptors.request.use(
  dumpOutgoingYoutubeRequest,
  (err) => Promise.reject(err)
);

console.log("[YT INSPECT] axios request interceptor registered id=", youtubeRequestInterceptorId);
console.log("[YT INSPECT] axios.defaults.headers.common=", axios.defaults?.headers?.common || {});
console.log(
  "[YT INSPECT] global request interceptor count=",
  axios.interceptors.request.handlers?.filter(Boolean).length ?? "(unknown)"
);

const maskApiKey = (k) =>
  !k
    ? "(empty)"
    : `${String(k).substring(0, 4)}${"*".repeat(Math.max(0, String(k).length - 8))}${String(k).slice(-4)}`;

const logYoutubeRequest = (url, params, key, { force = false } = {}) => {
  if (!force && process.env.YT_DEBUG !== "1") return;
  const safeParams = { ...params, key: maskApiKey(key) };
  console.log("[YT] URL:", url);
  console.log("[YT] Params:", safeParams);
  console.log("[YT] Headers: Authorization: NONE");
};

// Internal function to call YouTube API with rotation
const callYoutubeWithRotation = async (endpoint, url, params = {}) => {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No YouTube API keys configured in environment variables.");
  }

  let attempts = 0;
  const totalKeys = keys.length;
  let lastError = null;

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
      const requestParams = {
        ...params,
        key,
      };
      logYoutubeRequest(url, requestParams, key);

      const response = await axios.get(url, {
        params: requestParams,
        // Never send Authorization — YouTube Data API public reads use ?key= only
        headers: {},
      });

      // Log success
      await logUsage(key, endpoint, quotaCost, "success", false);
      return response.data;
    } catch (error) {
      lastError = error;
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      const errorDetails = errorData?.error?.errors?.[0] || {};
      const reason = (errorDetails.reason || "").toLowerCase();
      const googleMessage = errorData?.error?.message || error.message || "";
      const message = googleMessage.toLowerCase();

      logYoutubeRequest(url, { ...params, key }, key, { force: true });
      console.error("[YT] Request failed:", {
        endpoint,
        status,
        reason: errorDetails.reason || null,
        message: googleMessage,
        key: maskApiKey(key),
        authHeader: "NONE",
      });

      const isAuthFailure =
        status === 401 ||
        reason === "keyinvalid" ||
        reason === "required" ||
        message.includes("credentials_missing") ||
        message.includes("api keys are not supported") ||
        message.includes("key not valid") ||
        message.includes("invalid api key");

      const isQuotaExceeded =
        reason === "quotaexceeded" ||
        reason === "dailylimitexceeded" ||
        reason === "ratelimitexceeded" ||
        reason === "userratelimitexceeded" ||
        message.includes("quota exceeded") ||
        message.includes("limit exceeded") ||
        status === 429 ||
        // Only treat 403 as quota when Google says so (not every 403)
        (status === 403 &&
          (reason.includes("quota") ||
            reason.includes("limit") ||
            message.includes("quota") ||
            message.includes("limit exceeded")));

      if (isAuthFailure || isQuotaExceeded) {
        const label = isAuthFailure ? "authFailure" : "quotaExceeded";
        console.warn(
          `YouTube key index ${currentKeyIndex} (${maskApiKey(key)}) ${label}: ${reason || message}. Rotating...`
        );
        await logUsage(key, endpoint, quotaCost, `${label}: ${reason || message}`, false);
        currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
        attempts++;
      } else {
        await logUsage(key, endpoint, quotaCost, `failed: ${message}`, false);
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
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

  const data = await fetchPromise;
  return { data, cached: false, cachedAt: new Date() };
};
