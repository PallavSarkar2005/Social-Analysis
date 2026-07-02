import LoginAttempt from "../models/LoginAttempt.js";
import { logSecurityEvent } from "../utils/securityLogger.js";
import { extractIpAddress } from "../utils/requestMeta.js";
import { isSecureConnection } from "../utils/cookies.js";
import { issueAuthTokens } from "./tokenService.js";

export const getAppUrl = (req) =>
  isSecureConnection(req)
    ? "https://social-analysis-smoky.vercel.app"
    : "http://localhost:5173";

export const sendTokenResponse = async (user, statusCode, req, res) => {
  const rememberMe = req.body?.rememberMe === true;
  const ipAddress = extractIpAddress(req);
  const { payload } = await issueAuthTokens(user, req, res, { rememberMe });

  await logSecurityEvent({
    userId: user._id,
    action: "login_success",
    details: `User successfully logged in. Provider: ${user.provider || "local"}`,
    ipAddress,
    email: user.email,
  });

  res.status(statusCode).json({
    success: true,
    data: payload,
  });
};

export const handleFailedLogin = async (email, ipAddress) => {
  let attempt = await LoginAttempt.findOne({ email, ipAddress });

  if (!attempt) {
    attempt = await LoginAttempt.create({ email, ipAddress, attempts: 1 });
  } else {
    attempt.attempts += 1;
    if (attempt.attempts >= 5) {
      attempt.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      await logSecurityEvent({
        action: "account_locked",
        details:
          "Account/IP pair temporarily locked due to 5 consecutive login failures.",
        ipAddress,
        email,
      });
    }
    await attempt.save();
  }

  await logSecurityEvent({
    action: "login_failed",
    details: `Login attempt failed. Attempt count: ${attempt.attempts}/5.`,
    ipAddress,
    email,
  });
};
