import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  notifyAuthFailure,
} from "./authToken.js";
import { devError, devWarn } from "../utils/devLog.js";

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

let csrfTokenInMemory = null;
let csrfFetchPromise = null;

const clearCsrfToken = () => {
  csrfTokenInMemory = null;
  csrfFetchPromise = null;
};

export const fetchCsrfToken = async () => {
  if (csrfTokenInMemory) {
    return csrfTokenInMemory;
  }

  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    try {
      const response = await client.get("/api/auth/csrf");
      const responseToken = response.data?.csrfToken || null;
      if (responseToken) {
        csrfTokenInMemory = responseToken;
        return responseToken;
      }

      devWarn("[CSRF] CSRF token missing after fetch.");
      return null;
    } catch (error) {
      clearCsrfToken();
      devError("[API CSRF Fetch Error]", error);
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
};

export const restoreSession = async () => {
  await fetchCsrfToken();
  try {
    const response = await client.post(
      "/api/auth/refresh",
      {},
      {
        _skipAuthRetry: true,
      },
    );
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
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const safeMethods = ["get", "head", "options"];

    // Ensure a synchronizer token exists before any state-changing request.
    if (!safeMethods.includes(config.method?.toLowerCase())) {
      const csrfToken = csrfTokenInMemory || (await fetchCsrfToken());
      if (csrfToken) {
        config.headers["X-XSRF-TOKEN"] = csrfToken;
      } else if (config.headers["X-XSRF-TOKEN"]) {
        delete config.headers["X-XSRF-TOKEN"];
      }
    }

    return config;
  },
  (error) => {
    devError("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// Response Interceptor
client.interceptors.response.use(
  (response) => {
    const url = response.config?.url || "";
    if (url.includes("/auth/logout") && !url.includes("/auth/logout-other")) {
      clearCsrfToken();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    devError("[API Response Error]", {
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
        const response = await client.post(
          "/api/auth/refresh",
          {},
          {
            _skipAuthRetry: true,
          },
        );
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
      url.includes("/settings/appearance") ||
      url.includes("/api/profile/") ||
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
