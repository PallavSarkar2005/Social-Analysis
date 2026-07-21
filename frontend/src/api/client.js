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

const isCsrfError = (error) => {
  const status = error?.response?.status;
  const msg = (error?.response?.data?.message || "").toLowerCase();
  return status === 403 && msg.includes("csrf");
};

const requestCsrfToken = async ({ force = false } = {}) => {
  if (!force && csrfTokenInMemory) {
    return csrfTokenInMemory;
  }

  if (!force && csrfFetchPromise) {
    return csrfFetchPromise;
  }

  if (force) {
    clearCsrfToken();
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

/** Returns cached CSRF token when available. */
export const fetchCsrfToken = () => requestCsrfToken();

/** Always fetches a fresh CSRF token from the server. */
export const refreshCsrfToken = () => requestCsrfToken({ force: true });

const AUTH_MUTATION_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/google",
  "/auth/change-password",
];

const isAuthMutation = (url = "") =>
  AUTH_MUTATION_PATHS.some((path) => url.includes(path));

export const restoreSession = async () => {
  await refreshCsrfToken();
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
      const url = config.url || "";
      const csrfToken = isAuthMutation(url)
        ? await refreshCsrfToken()
        : csrfTokenInMemory || (await fetchCsrfToken());
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

    // Retry once after refreshing CSRF when the header/cookie pair is out of sync.
    if (
      isCsrfError(error) &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      clearCsrfToken();
      const csrfToken = await refreshCsrfToken();
      if (csrfToken) {
        originalRequest.headers = {
          ...originalRequest.headers,
          "X-XSRF-TOKEN": csrfToken,
        };
        return client(originalRequest);
      }
    }

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

    // Skip redirects for auth, CSRF, refresh, profile reads, and background hub auto-save.
    // Auto-save must never eject the user from an analysis page on quota / server errors.
    const skipRedirect =
      url.includes("/auth/") ||
      url.includes("/csrf") ||
      url.includes("/settings/appearance") ||
      url.includes("/api/profile/") ||
      url.includes("/api/reports/upsert") ||
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
