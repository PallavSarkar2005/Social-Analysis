import { generateSecureToken } from "../utils/crypto.js";
import { getCsrfCookieOptions } from "../utils/cookies.js";

export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAMES = ["x-xsrf-token", "x-csrf-token"];

export const getCsrfTokenFromRequest = (req) => {
  const cookies = req.cookies || {};
  return cookies[CSRF_COOKIE_NAME] || null;
};

export const getCsrfTokenFromHeaders = (req) => {
  for (const header of CSRF_HEADER_NAMES) {
    const value = req.headers[header];
    if (value) return value;
  }
  return null;
};

/**
 * Ensure a CSRF token exists on the request and in the cookie.
 * Never regenerates an existing token — prevents cookie/header mismatch.
 */
export const ensureCsrfToken = (req, res) => {
  const existing = getCsrfTokenFromRequest(req) || req.csrfToken;
  const csrfToken = existing || generateSecureToken(32);

  if (!existing) {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(req));
  }

  req.csrfToken = csrfToken;
  return csrfToken;
};

export const validateCsrfToken = (req) => {
  const cookieToken = getCsrfTokenFromRequest(req) || req.csrfToken;
  const headerToken = getCsrfTokenFromHeaders(req);
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
};

export const shouldBypassCsrfValidation = (req) => {
  if (process.env.NODE_ENV === "test") return true;

  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return true;

  if (
    req.originalUrl === "/api/billing/webhook" ||
    req.path === "/api/billing/webhook"
  ) {
    return true;
  }

  return false;
};
