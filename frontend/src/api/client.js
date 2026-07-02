import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  notifyAuthFailure,
} from "./authToken.js";

// Load environment variables dynamically, falling back to localhost:5000 in development
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const client = axios.create({
  baseURL,
  timeout: 30000, // Scraper calls or AI analysis might take up to 30 seconds
  withCredentials: true, // Enable cookies for cross-origin requests
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Helper to parse cookies on the client side
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

let csrfTokenInMemory = null;

export const fetchCsrfToken = async () => {
  try {
    const response = await client.get("/api/auth/csrf");
    if (response.data && response.data.csrfToken) {
      csrfTokenInMemory = response.data.csrfToken;
      console.log("[CSRF] Fresh token:", csrfTokenInMemory);
    }
    return csrfTokenInMemory;
  } catch (error) {
    console.error("[API CSRF Fetch Error]", error);
    return null;
  }
};

export const restoreSession = async () => {
  await fetchCsrfToken();
  try {
    const response = await client.post("/api/auth/refresh", null, {
      _skipAuthRetry: true,
    });
    const token = response.data?.data?.token;
    if (token) {
      setAccessToken(token);
      return { success: true };
    }
  } catch {
    clearAccessToken();
  }
  return { success: false };
};

export const ensureAccessToken = async () => {
  if (getAccessToken()) return getAccessToken();
  const result = await restoreSession();
  return result.success ? getAccessToken() : null;
};

// Request Interceptor
client.interceptors.request.use(
  async (config) => {
    console.log(
      `[API Request] ${config.method.toUpperCase()} ${config.url}`,
      config.data || "",
    );

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const safeMethods = ["get", "head", "options"];

    // Ensure CSRF cookie exists before any state-changing request
    if (!safeMethods.includes(config.method?.toLowerCase())) {
      const existingCsrf = getCookie("XSRF-TOKEN");
      if (!existingCsrf && !csrfTokenInMemory) {
        await fetchCsrfToken();
      }
    }

    // Attach CSRF header for state-changing requests
    if (!safeMethods.includes(config.method?.toLowerCase())) {
      const csrfToken = getCookie("XSRF-TOKEN") || csrfTokenInMemory;
      if (csrfToken) {
        config.headers["X-XSRF-TOKEN"] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// Response Interceptor
client.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error("[API Response Error]", {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    // Check if error is 401 (Unauthorized) and not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRetry &&
      originalRequest.url &&
      !originalRequest.url.includes("/auth/refresh") &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/register")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => client(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await client.post("/api/auth/refresh", null, {
          _skipAuthRetry: true,
        });
        const token = response.data?.data?.token;
        if (token) {
          setAccessToken(token);

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          };
        }
        isRefreshing = false;
        processQueue(null);
        return client(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        clearAccessToken();
        notifyAuthFailure();
        return Promise.reject(refreshError);
      }
    }

    // Smart error page redirection for hard infrastructure failures
    const status = error.response?.status;
    const message = (error.message || "").toLowerCase();
    const url = originalRequest?.url || "";

    // Skip redirects for auth, CSRF, and refresh token endpoints — these are handled by AuthContext
    const skipRedirect =
      url.includes("/auth/") ||
      url.includes("/csrf") ||
      url.includes("/activity/log") ||
      originalRequest?._skipErrorRedirect;

    if (!skipRedirect && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      // Only redirect if not already on an error page to avoid redirect loops
      if (!currentPath.startsWith("/error")) {
        if (!navigator.onLine) {
          window.location.href = "/error/offline";
          return Promise.reject(error);
        }
        if (status === 403) {
          window.location.href = "/error/403";
          return Promise.reject(error);
        }
        if (status === 503 || status === 504) {
          window.location.href = "/error/network";
          return Promise.reject(error);
        }
        if (status >= 500) {
          window.location.href = "/error/500";
          return Promise.reject(error);
        }
        if (
          !status &&
          (message.includes("network error") || message.includes("timeout"))
        ) {
          window.location.href = "/error/network";
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  },
);

export default client;
