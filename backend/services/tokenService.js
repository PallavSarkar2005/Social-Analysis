import * as SessionRepository from "../repositories/SessionRepository.js";
import * as UserRepository from "../repositories/UserRepository.js";
import { generateSecureToken, hashToken } from "../utils/crypto.js";
import { getRequestMeta } from "../utils/requestMeta.js";
import { signAccessToken } from "../utils/jwt.js";
import {
  setRefreshTokenCookie,
  setRefreshTokenCookieWithMaxAge,
  SEVEN_DAYS_MS,
  THIRTY_DAYS_MS,
} from "./cookieService.js";
import { enforceSessionLimit } from "./sessionService.js";

const MAX_LOGIN_HISTORY = 10;

export const createSession = async (userId, req, rememberMe = false) => {
  const refreshTokenVal = generateSecureToken(40);
  const tokenHash = hashToken(refreshTokenVal);
  const familyId = generateSecureToken(20);
  const { ipAddress, userAgent, browser, device, os } = getRequestMeta(req);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

  await enforceSessionLimit(userId);

  await SessionRepository.create({
    userId,
    tokenHash,
    familyId,
    ipAddress,
    userAgent,
    browser,
    device,
    os,
    expiresAt,
    revoked: false,
  });

  return { plainToken: refreshTokenVal, rememberMe };
};

export const recordLogin = (user, req) => {
  const { ipAddress, userAgent, browser, device, os } = getRequestMeta(req);
  user.lastLogin = new Date();
  if (!user.loginHistory) user.loginHistory = [];
  user.loginHistory.push({
    ip: ipAddress,
    userAgent,
    browser,
    device,
    os,
    loggedInAt: new Date(),
  });
  if (user.loginHistory.length > MAX_LOGIN_HISTORY) {
    user.loginHistory.shift();
  }
};

export const buildAuthUserPayload = (user, accessToken) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  plan: user.plan,
  avatar: user.avatar,
  token: accessToken,
});

export const issueAuthTokens = async (
  user,
  req,
  res,
  { rememberMe = false } = {},
) => {
  const accessToken = signAccessToken(user._id);
  const { plainToken, rememberMe: sessionRememberMe } = await createSession(
    user._id,
    req,
    rememberMe,
  );

  recordLogin(user, req);
  await UserRepository.save(user);

  setRefreshTokenCookie(res, req, plainToken, sessionRememberMe);

  return {
    accessToken,
    refreshToken: plainToken,
    payload: buildAuthUserPayload(user, accessToken),
  };
};

export const rotateRefreshToken = async (user, session, req) => {
  const newRefreshTokenVal = generateSecureToken(40);
  const newTokenHash = hashToken(newRefreshTokenVal);
  const { ipAddress, userAgent, browser, device, os } = getRequestMeta(req);

  session.revoked = true;
  session.replacedByToken = newTokenHash;
  await SessionRepository.save(session);

  const originalMaxAgeDays =
    session.createdAt && session.expiresAt
      ? (session.expiresAt - session.createdAt) / (24 * 60 * 60 * 1000)
      : 7;
  const daysToAdd = originalMaxAgeDays > 10 ? 30 : 7;

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

  await enforceSessionLimit(user._id);

  await SessionRepository.create({
    userId: user._id,
    tokenHash: newTokenHash,
    expiresAt: newExpiresAt,
    familyId: session.familyId,
    ipAddress,
    userAgent,
    browser,
    device,
    os,
    revoked: false,
  });

  const accessToken = signAccessToken(user._id);
  const maxAgeMs = daysToAdd > 10 ? THIRTY_DAYS_MS : SEVEN_DAYS_MS;

  return {
    accessToken,
    refreshToken: newRefreshTokenVal,
    maxAgeMs,
    payload: buildAuthUserPayload(user, accessToken),
  };
};

export const findUserByRefreshToken = async (_User, refreshTokenVal) => {
  const hashedRefreshToken = hashToken(refreshTokenVal);
  const session = await SessionRepository.findByTokenHash(hashedRefreshToken);
  if (!session) {
    return { user: null, session: null, hashedRefreshToken };
  }

  const user = await UserRepository.findById(session.userId);
  return { user, session, hashedRefreshToken };
};

export { hashToken };
