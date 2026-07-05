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

/** In-memory fallback when MongoDB is temporarily unavailable. */
const memoryCsrfSessions = new Map();

const shouldUseMemoryCsrf = () =>
  process.env.CSRF_MEMORY_ONLY === "true" || process.env.NODE_ENV === "development";

const pruneMemorySessions = () => {
  const now = Date.now();
  for (const [sessionId, entry] of memoryCsrfSessions) {
    if (entry.expiresAt <= now) {
      memoryCsrfSessions.delete(sessionId);
    }
  }
};

const createMemoryCsrfSession = (req, res) => {
  pruneMemorySessions();
  const sessionId = generateSecureToken(40);
  const csrfToken = generateSecureToken(32);
  memoryCsrfSessions.set(sessionId, {
    csrfToken,
    expiresAt: Date.now() + CSRF_SESSION_TTL_MS,
  });
  res.cookie(CSRF_COOKIE_NAME, sessionId, getCsrfCookieOptions(req));
  req.csrfToken = csrfToken;
  return csrfToken;
};

const getMemoryCsrfToken = (sessionId) => {
  const entry = memoryCsrfSessions.get(sessionId);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryCsrfSessions.delete(sessionId);
    return null;
  }
  return entry.csrfToken;
};

/**
 * Ensure a CSRF synchronizer token exists for this browser session.
 * The cookie stores only an opaque session id; the real token stays server-side.
 */
const createCsrfSession = async (req, res) => {
  const sessionId = generateSecureToken(40);
  const csrfToken = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + CSRF_SESSION_TTL_MS);

  try {
    await CsrfSessionRepository.create({
      sessionId,
      csrfToken,
      expiresAt,
    });
  } catch (dbError) {
    console.error("[CSRF] Database create failed, using in-memory fallback:", dbError.message);
    return createMemoryCsrfSession(req, res);
  }

  res.cookie(CSRF_COOKIE_NAME, sessionId, getCsrfCookieOptions(req));
  req.csrfToken = csrfToken;
  return csrfToken;
};

export const ensureCsrfToken = async (req, res) => {
  if (req.csrfToken) {
    return req.csrfToken;
  }

  const sessionId = getCsrfSessionIdFromRequest(req);

  if (shouldUseMemoryCsrf()) {
    if (sessionId) {
      const memoryToken = getMemoryCsrfToken(sessionId);
      if (memoryToken) {
        req.csrfToken = memoryToken;
        return memoryToken;
      }
    }
    return createMemoryCsrfSession(req, res);
  }

  if (!sessionId) {
    return createCsrfSession(req, res);
  }

  const memoryToken = getMemoryCsrfToken(sessionId);
  if (memoryToken) {
    req.csrfToken = memoryToken;
    return memoryToken;
  }

  try {
    const session = await CsrfSessionRepository.findBySessionId(sessionId);
    if (!session) {
      return createCsrfSession(req, res);
    }

    req.csrfToken = session.csrfToken;
    return session.csrfToken;
  } catch (dbError) {
    console.error("[CSRF] Database lookup failed, using in-memory fallback:", dbError.message);
    return createMemoryCsrfSession(req, res);
  }
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
