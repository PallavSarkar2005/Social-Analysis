import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import LoginAttempt from "../models/LoginAttempt.js";
import { logSecurityEvent } from "../utils/securityLogger.js";
import { sendEmailReport } from "../services/emailService.js";
import axios from "axios";
import {
  getWelcomeEmail,
  getForgotPasswordTemplate,
  getPasswordChangedTemplate,
  getAccountDeletedTemplate,
  getVerifyEmailTemplate,
} from "../services/emailTemplateService.js";
import {
  getAuthCookieOptions,
  getCsrfCookieOptions,
  getAppUrl,
} from "../utils/cookieConfig.js";

// Helper to hash tokens for secure storage
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Geolocation helper
const getIpLocation = async (ip) => {
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("127.")
  ) {
    return "Localhost";
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 2000,
    });

    if (response.data?.status === "success") {
      const { city, regionName, country } = response.data;
      return `${city || ""}, ${regionName || ""}, ${country || ""}`
        .replace(/^,\s*/, "")
        .replace(/,\s*$/, "");
    }
  } catch (error) {
    console.error(`Failed to geolocate IP ${ip}:`, error.message);
  }

  return "Unknown Location";
};

const verifyGoogleIdToken = async (idToken) => {
  if (
    idToken === "dummy-developer-token" &&
    (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development")
  ) {
    return {
      sub: "dev-google-sub-123",
      email: "dev.user@socialiq.ai",
      name: "Developer Node",
      picture: "https://api.dicebear.com/7.x/adventurer/svg?seed=dev",
    };
  }

  const ticket = await axios.get(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken,
    )}`,
    { timeout: 5000 },
  );

  const payload = ticket.data;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && payload.aud !== clientId) {
    throw new Error("Google token audience mismatch");
  }

  if (!payload.email) {
    throw new Error("Google token missing email");
  }

  return payload;
};

// GET /api/auth/csrf
export const getCsrfToken = async (req, res, next) => {
  try {
    res.json({
      success: true,
      csrfToken: req.csrfToken,
    });
  } catch (error) {
    next(error);
  }
};

// Simple User Agent parser
const parseUserAgent = (userAgentString) => {
  if (!userAgentString) {
    return { browser: "Unknown", os: "Unknown", device: "Desktop" };
  }
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  const ua = userAgentString.toLowerCase();

  // Browser detection
  if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("chrome") || ua.includes("chromium")) {
    browser = "Chrome";
  } else if (
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium")
  ) {
    browser = "Safari";
  } else if (ua.includes("edge") || ua.includes("edg")) {
    browser = "Edge";
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera";
  }

  // OS detection
  if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
  }

  // Device detection
  if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) {
    device = "Mobile";
  } else if (ua.includes("ipad") || ua.includes("tablet")) {
    device = "Tablet";
  }

  return { browser, os, device };
};

// Helper to issue access & refresh tokens via secure httpOnly cookies
const sendTokenResponse = async (user, statusCode, req, res) => {
  const rememberMe = req.body?.rememberMe === true;

  const ipAddressRaw =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = Array.isArray(ipAddressRaw)
    ? ipAddressRaw[0]
    : ipAddressRaw.split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "";
  const { browser, os, device } = parseUserAgent(userAgent);

  // Geolocate IP (best effort)
  const location = await getIpLocation(ipAddress);

  const expiresAt = new Date();
  if (rememberMe) {
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  } else {
    expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours
  }

  const refreshTokenVal = crypto.randomBytes(40).toString("hex");
  const hashedRefreshToken = hashToken(refreshTokenVal);

  const session = await Session.create({
    userId: user._id,
    tokenHash: hashedRefreshToken,
    expiresAt,
    ipAddress,
    location,
    userAgent,
    browser,
    device,
    os,
    isRememberMe: rememberMe,
  });

  // Update user lastLogin & loginHistory
  user.lastLogin = new Date();
  if (!user.loginHistory) {
    user.loginHistory = [];
  }
  user.loginHistory.push({
    ip: ipAddress,
    userAgent,
    browser,
    device,
    os,
    loggedInAt: new Date(),
  });
  if (user.loginHistory.length > 10) {
    user.loginHistory.shift();
  }

  await user.save();

  const accessToken = jwt.sign(
    { id: user._id, sessionId: session._id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const authCookieBase = getAuthCookieOptions(req);

  res.cookie("socialiq_access_token", accessToken, {
    ...authCookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("socialiq_refresh_token", refreshTokenVal, {
    ...authCookieBase,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
  });

  // CSRF token rotation on auth status change — client must sync in-memory token from response
  const newCsrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie("XSRF-TOKEN", newCsrfToken, getCsrfCookieOptions(req));

  await logSecurityEvent({
    userId: user._id,
    action: "login_success",
    details: `User authenticated. Provider: ${user.provider || "local"}. Session ID: ${session._id}`,
    ipAddress,
    email: user.email,
  });

  res.status(statusCode).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      avatar: user.avatar,
      token: accessToken,
      csrfToken: newCsrfToken,
    },
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
      plan: "free",
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      isEmailVerified: true,
      isVerified: true,
    });

    await sendTokenResponse(user, 201, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const ipAddressRaw =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = Array.isArray(ipAddressRaw)
    ? ipAddressRaw[0]
    : ipAddressRaw.split(",")[0].trim();
  const { email, password } = req.body;

  try {
    const attempt = await LoginAttempt.findOne({ email, ipAddress });
    if (attempt && attempt.lockoutUntil && attempt.lockoutUntil > new Date()) {
      const waitSecs = Math.ceil((attempt.lockoutUntil - new Date()) / 1000);

      await logSecurityEvent({
        action: "login_lockout_blocked",
        details: `Login attempt blocked due to active lockout (${waitSecs}s remaining).`,
        ipAddress,
        email,
      });

      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to excessive failed attempts. Try again in ${waitSecs} seconds.`,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await handleFailedLogin(email, ipAddress);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.provider === "google" && !user.passwordHash) {
      return res.status(400).json({
        success: false,
        message:
          "This account logs in with Google. Please use Sign in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await handleFailedLogin(email, ipAddress);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (attempt) {
      await attempt.deleteOne();
    }

    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// Helper function to process failed logins and apply lockout
const handleFailedLogin = async (email, ipAddress) => {
  let attempt = await LoginAttempt.findOne({ email, ipAddress });

  if (!attempt) {
    attempt = await LoginAttempt.create({ email, ipAddress, attempts: 1 });
  } else {
    attempt.attempts += 1;
    if (attempt.attempts >= 5) {
      attempt.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockouts
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

// @desc    Refresh JWT access tokens (RTR)
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res, next) => {
  const ipAddressRaw =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = Array.isArray(ipAddressRaw)
    ? ipAddressRaw[0]
    : ipAddressRaw.split(",")[0].trim();

  try {
    const refreshTokenVal = req.cookies.socialiq_refresh_token;

    if (!refreshTokenVal) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const hashedRefreshToken = hashToken(refreshTokenVal);

    // 1. Find Session with this tokenHash or check if it was reused (matches oldTokenHashes)
    let session = await Session.findOne({
      tokenHash: hashedRefreshToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      // Replay check
      const reusedSession = await Session.findOne({
        oldTokenHashes: hashedRefreshToken,
      });

      if (reusedSession) {
        reusedSession.isRevoked = true;
        await reusedSession.save();
        return res.status(401).json({
          success: false,
          message: "Refresh token has been reused",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Rotate refresh token
    const newRefreshTokenVal = crypto.randomBytes(40).toString("hex");
    const newHashedRefreshToken = hashToken(newRefreshTokenVal);
    session.tokenHash = newHashedRefreshToken;
    session.oldTokenHashes = [...(session.oldTokenHashes || []), hashedRefreshToken];
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    session.lastUsedAt = new Date();
    session.ipAddress = ipAddress;
    session.location = await getIpLocation(ipAddress);
    await session.save();

    const accessToken = jwt.sign(
      { id: user._id, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const authCookieBase = getAuthCookieOptions(req);
    res.cookie("socialiq_access_token", accessToken, {
      ...authCookieBase,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("socialiq_refresh_token", newRefreshTokenVal, {
      ...authCookieBase,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    const refreshTokenVal = req.cookies.socialiq_refresh_token;
    if (refreshTokenVal) {
      const hashedRefreshToken = hashToken(refreshTokenVal);
      await Session.findOneAndUpdate(
        { tokenHash: hashedRefreshToken },
        { $set: { isRevoked: true } },
      );
    }

    res.clearCookie("socialiq_access_token", getAuthCookieOptions(req));
    res.clearCookie("socialiq_refresh_token", getAuthCookieOptions(req));
    res.clearCookie("XSRF-TOKEN", getCsrfCookieOptions(req));

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const payload = await verifyGoogleIdToken(idToken);

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name || payload.email,
        email: payload.email,
        role: "user",
        plan: "free",
        avatar: payload.picture,
        provider: "google",
        isEmailVerified: true,
        isVerified: true,
      });
    }

    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const user = await User.findOne({ verifyToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.isEmailVerified = true;
    user.isVerified = true;
    user.verifyToken = null;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset email has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendEmailReport({
      to: user.email,
      subject: "Password Reset Request",
      html: getForgotPasswordTemplate(user.name, resetToken),
    });

    res.json({
      success: true,
      message: "If an account exists, a reset email has been sent",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await sendEmailReport({
      to: user.email,
      subject: "Password Updated",
      html: getPasswordChangedTemplate(user.name),
    });

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/auth/delete-account
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await Session.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    await sendEmailReport({
      to: user.email,
      subject: "Account Deleted",
      html: getAccountDeletedTemplate(user.name),
    });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
