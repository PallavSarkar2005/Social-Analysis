import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  notifyAuthFailure,
} from "./authToken.js";
import { devError, devWarn } from "../utils/devLog.js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const client = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/** In-flight GET deduplication — identical concurrent requests share one promise */
const inflightGets = new Map();

function getDedupeKey(config) {
  const method = (config.method || "get").toLowerCase();
  if (method !== "get") return null;
  if (config._skipDedupe) return null;
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${method}:${config.url}:${params}`;
}

const originalRequest = client.request.bind(client);
client.request = function dedupedRequest(config) {
  const key = getDedupeKey(config);
  if (!key) return originalRequest(config);

  if (inflightGets.has(key)) {
    return inflightGets.get(key);
  }

  const promise = originalRequest(config).finally(() => {
    inflightGets.delete(key);
  });
  inflightGets.set(key, promise);
  return promise;
};

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
      const response = await client.get("/api/auth/csrf", { _skipDedupe: true });
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

export const fetchCsrfToken = () => requestCsrfToken();
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

const RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const MAX_NETWORK_RETRIES = 2;

client.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const safeMethods = ["get", "head", "options"];

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
    const status = error.response?.status;

    if (
      originalRequest &&
      RETRYABLE_METHODS.has((originalRequest.method || "").toLowerCase()) &&
      !originalRequest._networkRetryCount
    ) {
      originalRequest._networkRetryCount = 0;
    }
    const networkRetry = originalRequest?._networkRetryCount ?? 0;
    const isTransient =
      !error.response ||
      status === 408 ||
      status === 429 ||
      (status >= 500 && status < 600);
    if (
      originalRequest &&
      RETRYABLE_METHODS.has((originalRequest.method || "").toLowerCase()) &&
      isTransient &&
      networkRetry < MAX_NETWORK_RETRIES &&
      !originalRequest._skipNetworkRetry
    ) {
      originalRequest._networkRetryCount = networkRetry + 1;
      const delay = 300 * 2 ** networkRetry;
      await new Promise((r) => setTimeout(r, delay));
      return client(originalRequest);
    }

    devError("[API Response Error]", {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

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

    const message = (error.message || "").toLowerCase();
    const url = originalRequest?.url || "";

    const skipRedirect =
      url.includes("/auth/") ||
      url.includes("/csrf") ||
      url.includes("/settings/appearance") ||
      url.includes("/api/profile/") ||
      url.includes("/api/reports/upsert") ||
      originalRequest?._skipErrorRedirect;

    if (!skipRedirect && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

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
