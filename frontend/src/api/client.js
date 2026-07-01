import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const client = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];
let inMemoryToken = null;
let csrfTokenInMemory = null;

export const setAccessToken = (token) => {
  inMemoryToken = token;
};

export const getAccessToken = () => inMemoryToken;

export const setCsrfToken = (token) => {
  csrfTokenInMemory = token || null;
};

export const getCsrfToken = () => {
  if (csrfTokenInMemory) return csrfTokenInMemory;
  return getCookie("XSRF-TOKEN");
};

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

const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

export const fetchCsrfToken = async () => {
  try {
    const response = await client.get("/api/auth/csrf");
    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
    return csrfTokenInMemory;
  } catch (error) {
    console.error("[API CSRF Fetch Error]", error);
    return null;
  }
};

const syncAuthFromResponse = (data) => {
  if (!data) return null;
  const { token, csrfToken, ...userData } = data;
  if (token) setAccessToken(token);
  if (csrfToken) setCsrfToken(csrfToken);
  return { token, userData };
};

export { syncAuthFromResponse };

client.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const safeMethods = ["get", "head", "options"];
    if (!safeMethods.includes(config.method?.toLowerCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-XSRF-TOKEN"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorMessage = error.response?.data?.message || "";

    // CSRF mismatch: re-fetch token and retry once (fixes stale in-memory token after login)
    if (
      status === 403 &&
      errorMessage.toLowerCase().includes("csrf") &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      await fetchCsrfToken();
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        originalRequest.headers["X-XSRF-TOKEN"] = csrfToken;
      }
      return client(originalRequest);
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
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
        const response = await client.post("/api/auth/refresh");
        syncAuthFromResponse(response.data?.data);
        isRefreshing = false;
        processQueue(null);
        const token = getAccessToken();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth-logout"));
        }
        return Promise.reject(refreshError);
      }
    }

    const message = (error.message || "").toLowerCase();
    const url = originalRequest?.url || "";
    const skipRedirect =
      url.includes("/auth/") ||
      url.includes("/csrf") ||
      url.includes("/activity/log") ||
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
        if (!status && (message.includes("network error") || message.includes("timeout"))) {
          window.location.href = "/error/network";
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default client;
