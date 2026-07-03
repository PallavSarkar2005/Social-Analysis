import { generateSecureToken } from "../utils/crypto.js";
import { getCsrfCookieOptions } from "../utils/cookies.js";
import * as CsrfSessionRepository from "../repositories/CsrfSessionRepository.js";

export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAMES = ["x-xsrf-token", "x-csrf-token"];
const CSRF_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const getCsrfSessionIdFromRequest = (req) => {
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
 * Ensure a CSRF synchronizer token exists for this browser session.
 * The cookie stores only an opaque session id; the real token stays server-side.
 */
const createCsrfSession = async (req, res) => {
  const sessionId = generateSecureToken(40);
  const csrfToken = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + CSRF_SESSION_TTL_MS);

  await CsrfSessionRepository.create({
    sessionId,
    csrfToken,
    expiresAt,
  });

  res.cookie(CSRF_COOKIE_NAME, sessionId, getCsrfCookieOptions(req));
  req.csrfToken = csrfToken;
  return csrfToken;
};

export const ensureCsrfToken = async (req, res) => {
  if (req.csrfToken) {
    return req.csrfToken;
  }

  const sessionId = getCsrfSessionIdFromRequest(req);
  if (!sessionId) {
    return createCsrfSession(req, res);
  }

  const session = await CsrfSessionRepository.findBySessionId(sessionId);
  if (!session) {
    return createCsrfSession(req, res);
  }

  req.csrfToken = session.csrfToken;
  return session.csrfToken;
};

export const validateCsrfToken = (req) => {
  const headerToken = getCsrfTokenFromHeaders(req);
  return Boolean(req.csrfToken && headerToken && req.csrfToken === headerToken);
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
