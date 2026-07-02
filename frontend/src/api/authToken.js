let accessToken = null;
let telemetryUserId = null;
let onAuthFailure = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const setTelemetryUserId = (userId) => {
  telemetryUserId = userId || null;
};

export const getTelemetryUserId = () => telemetryUserId || "Guest";

export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

export const notifyAuthFailure = () => {
  onAuthFailure?.();
};

export const clearLegacyAuthStorage = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("socialiq_user");
};
