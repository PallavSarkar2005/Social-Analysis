/**
 * Shared cookie/security helpers for consistent behavior across
 * localhost, Railway, Render, Vercel, and custom HTTPS domains.
 */
export const checkIsProd = (req) => {
  const host = req?.headers?.host || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const isHttps = forwardedProto === "https";

  if (isLocal && !isHttps) {
    return false;
  }

  return process.env.NODE_ENV === "production" || isHttps || (host && !isLocal);
};

export const getAuthCookieOptions = (req, overrides = {}) => {
  const isProd = checkIsProd(req);
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    ...overrides,
  };
};

export const getCsrfCookieOptions = (req, overrides = {}) => {
  const isProd = checkIsProd(req);
  return {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    httpOnly: false,
    path: "/",
    ...overrides,
  };
};

export const getAppUrl = (req) => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }
  return checkIsProd(req)
    ? "https://social-analysis-smoky.vercel.app"
    : "http://localhost:5173";
};
