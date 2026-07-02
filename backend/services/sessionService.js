import * as SessionRepository from "../repositories/SessionRepository.js";
import { hashToken } from "../utils/crypto.js";
import { clearAuthCookies } from "./cookieService.js";

export const revokeRefreshToken = async (refreshTokenVal) => {
  if (!refreshTokenVal) return;
  await SessionRepository.deleteByTokenHash(hashToken(refreshTokenVal));
};

export const revokeAllSessions = async (userId) => {
  await SessionRepository.deleteAllByUserId(userId);
};

export const revokeOtherSessions = async (userId, currentRefreshToken) => {
  if (!currentRefreshToken) {
    await SessionRepository.deleteAllByUserId(userId);
    return;
  }
  await SessionRepository.deleteOthersByUserId(
    userId,
    hashToken(currentRefreshToken),
  );
};

export const getActiveSessions = async (userId, currentRefreshToken) => {
  const hashedCurrent = currentRefreshToken
    ? hashToken(currentRefreshToken)
    : null;

  const sessions = await SessionRepository.findActiveByUserId(userId);

  return sessions.map((session) => ({
    _id: session._id,
    browser: session.browser || "Unknown",
    device: session.device || "Unknown",
    os: session.os || "Unknown",
    ipAddress: session.ipAddress || "Unknown",
    userAgent: session.userAgent || "Unknown",
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    isCurrent: hashedCurrent ? session.tokenHash === hashedCurrent : false,
  }));
};

export const revokeSessionById = async (userId, sessionId) => {
  const session = await SessionRepository.findByIdForUser(sessionId, userId);
  if (!session) return null;
  await SessionRepository.deleteById(session._id);
  return session;
};

export const clearSessionCookies = (res, req) => clearAuthCookies(res, req);

export const handleTokenReuseBreach = async (userId, res, req) => {
  await SessionRepository.deleteAllByUserId(userId);
  clearAuthCookies(res, req);
};

export const enforceSessionLimit = async (userId, maxSessions = 50) => {
  const count = await SessionRepository.countActiveByUserId(userId);
  if (count < maxSessions) return;

  const excess = count - maxSessions + 1;
  const oldestSessions = await SessionRepository.findOldestActive(
    userId,
    excess,
  );
  const ids = oldestSessions.map((s) => s._id);
  if (ids.length > 0) {
    await SessionRepository.deleteManyByIds(ids);
  }
};
