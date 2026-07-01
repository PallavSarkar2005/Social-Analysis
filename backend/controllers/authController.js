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
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("127.")) {
    return "Localhost";
  }
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 2000 });
    if (response.data && response.data.status === "success") {
      const { city, regionName, country } = response.data;
      return `${city || ""}, ${regionName || ""}, ${country || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "");
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
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { timeout: 5000 }
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
  } else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")) {
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

  const ipAddressRaw = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = Array.isArray(ipAddressRaw) ? ipAddressRaw[0] : ipAddressRaw.split(",")[0].trim();
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
    { expiresIn: "15m" }
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
  const ipAddressRaw = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = Array.isArray(ipAddressRaw) ? ipAddressRaw[0] : ipAddressRaw.split(",")[0].trim();
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
        message: "This account logs in with Google. Please use Sign in with Google.",
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
        details: "Account/IP pair temporarily locked due to 5 consecutive login failures.",
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
  const ipAddressRaw = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = Array.isArray(ipAddressRaw) ? ipAddressRaw[0] : ipAddressRaw.split(",")[0].trim();

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
        // Immediate response: Revoke all active sessions for this user!
        await Session.updateMany({ userId: reusedSession.userId }, { isRevoked: true });
        
        res.clearCookie("socialiq_access_token");
        res.clearCookie("socialiq_refresh_token");

        await logSecurityEvent({
          userId: reusedSession.userId,
          action: "refresh_token_reuse_breach",
          details: `Reused refresh token submitted! Revoking all sessions for user ${reusedSession.userId}.`,
          ipAddress,
        });

        return res.status(401).json({
          success: false,
          message: "Breach detected: Session has already been refreshed. Terminating all logins.",
        });
      }

      await logSecurityEvent({
        action: "refresh_failed_invalid_token",
        details: "Refresh attempt with unrecognized or expired refresh token.",
        ipAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Perform rotation: generate new refresh token, update tokenHash on the session
    const newRefreshTokenVal = crypto.randomBytes(40).toString("hex");
    const newHashedToken = hashToken(newRefreshTokenVal);

    session.oldTokenHashes.push(session.tokenHash);
    if (session.oldTokenHashes.length > 20) {
      session.oldTokenHashes.shift();
    }
    session.tokenHash = newHashedToken;

    const daysToAdd = session.isRememberMe ? 30 : 1;
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);
    session.expiresAt = newExpiresAt;
    session.lastActivity = new Date();
    session.ipAddress = ipAddress;

    await session.save();

    const newAccessToken = jwt.sign(
      { id: user._id, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const authCookieBase = getAuthCookieOptions(req);
    res.cookie("socialiq_access_token", newAccessToken, {
      ...authCookieBase,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("socialiq_refresh_token", newRefreshTokenVal, {
      ...authCookieBase,
      maxAge: daysToAdd * 24 * 60 * 60 * 1000,
    });

    await logSecurityEvent({
      userId: user._id,
      action: "refresh_token_rotated",
      details: `Refresh token rotated for session ${session._id}`,
      ipAddress,
    });

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        token: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear session cookies
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res, next) => {
  try {
    const refreshTokenVal = req.cookies.socialiq_refresh_token;

    if (refreshTokenVal) {
      const hashedTokenVal = hashToken(refreshTokenVal);
      await Session.updateOne({ tokenHash: hashedTokenVal }, { isRevoked: true });
    }

    const cookieOptions = getAuthCookieOptions(req);
    res.clearCookie("socialiq_access_token", cookieOptions);
    res.clearCookie("socialiq_refresh_token", cookieOptions);

    await logSecurityEvent({
      action: "logout",
      details: "User logged out of current session",
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user everywhere (revoke all user sessions)
// @route   POST /api/auth/logout-all
// @access  Private
export const logoutAll = async (req, res, next) => {
  try {
    await Session.updateMany({ userId: req.user._id }, { isRevoked: true });

    const cookieOptions = getAuthCookieOptions(req);
    res.clearCookie("socialiq_access_token", cookieOptions);
    res.clearCookie("socialiq_refresh_token", cookieOptions);

    await logSecurityEvent({
      userId: req.user._id,
      action: "logout_all",
      details: "User logged out of all sessions",
    });

    res.json({
      success: true,
      message: "Logged out of all sessions successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout other devices (revoke other sessions except current)
// @route   POST /api/auth/logout-other
// @access  Private
export const logoutOtherDevices = async (req, res, next) => {
  try {
    const currentRefreshToken = req.cookies.socialiq_refresh_token;

    if (currentRefreshToken) {
      // Primary: identify current session via the refresh token cookie hash
      const hashedCurrentToken = hashToken(currentRefreshToken);
      await Session.updateMany(
        { userId: req.user._id, tokenHash: { $ne: hashedCurrentToken } },
        { isRevoked: true }
      );
    } else if (req.sessionId) {
      // Fallback: identify current session via the sessionId embedded in the access token JWT
      await Session.updateMany(
        { userId: req.user._id, _id: { $ne: req.sessionId } },
        { isRevoked: true }
      );
    } else {
      // No identifiers — revoke all sessions for safety
      await Session.updateMany({ userId: req.user._id }, { isRevoked: true });
    }

    await logSecurityEvent({
      userId: req.user._id,
      action: "logout_other_devices",
      details: "User logged out of all other device sessions",
    });

    res.json({
      success: true,
      message: "Logged out of other devices successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const hashedTokenVal = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedTokenVal,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification token is invalid or has expired",
      });
    }

    user.isEmailVerified = true;
    user.isVerified = true; // legacy sync
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.verificationToken = undefined; // legacy sync
    user.verificationTokenExpires = undefined; // legacy sync
    await user.save();

    // Send Welcome Email
    try {
      const welcomeHtml = getWelcomeEmail(user.name);
      await sendEmailReport(user.email, "Social IQ - Welcome to the Platform!", welcomeHtml);
    } catch (mailError) {
      console.error("[Mail Delivery Warning] Failed to dispatch welcome email:", mailError.message);
    }

    res.json({
      success: true,
      message: "Email verified successfully. You can now access your workspace.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res, next) => {
  console.log("[Resend Verification] Request received.");
  try {
    const email = req.body?.email || req.user?.email;
    if (!email) {
      console.log("[Resend Verification] Failed: Email not provided.");
      return res.status(400).json({
        success: false,
        message: "Email is required to resend verification link.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Resend Verification] Email not found in DB: ${email}. Returning generic success to prevent enumeration.`);
      return res.json({
        success: true,
        message: "If the email exists, a verification link has been resent.",
      });
    }
    console.log(`[Resend Verification] User found: ${user._id} (${user.email})`);

    if (user.isEmailVerified) {
      console.log("[Resend Verification] Failed: User is already verified.");
      return res.status(400).json({
        success: false,
        message: "This email address is already verified.",
      });
    }
    console.log("[Resend Verification] User is not verified. Generating fresh token...");

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedVerificationToken = hashToken(verificationToken);
    
    user.emailVerificationToken = hashedVerificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    console.log("[Resend Verification] Saving user verification token...");
    await user.save();
    console.log("[Resend Verification] User saved successfully.");

    const appUrl = getAppUrl(req);
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;

    console.log(`[Resend Verification] Verification Link generated: ${verificationLink}`);

    console.log(`[Resend Verification] Dispatching email to: ${user.email}`);
    const emailHtml = getVerifyEmailTemplate(user.name, verificationLink);
    await sendEmailReport(user.email, "Social IQ - Verify Your Account", emailHtml);
    console.log("[Resend Verification] Verification email dispatched successfully.");

    res.json({
      success: true,
      message: "If the email exists, a verification link has been resent.",
    });
  } catch (error) {
    console.error("[Resend Verification Error]:", error);
    next(error);
  }
};

// @desc    Forgot Password - Request reset link
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Avoid revealing user exists, return generic success msg
      return res.json({
        success: true,
        message: "Password reset link has been dispatched if the email was registered.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(resetToken);

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    const appUrl = getAppUrl(req);
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    try {
      const emailHtml = getForgotPasswordTemplate(user.name, resetLink);
      await sendEmailReport(user.email, "Social IQ - Reset Password", emailHtml);
    } catch (mailError) {
      console.error("[Mail Delivery Warning] Failed to dispatch forgot-password email:", mailError.message);
    }

    res.json({
      success: true,
      message: "Password reset link has been dispatched if the email was registered.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Verification token and new password are required",
      });
    }

    const hashedTokenVal = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedTokenVal,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    // Verify Password History (last 3 passwords)
    if (user.passwordHash) {
      const matchesHistory = await Promise.all(
        user.passwordHistory.map((hash) => bcrypt.compare(password, hash))
      );

      if (matchesHistory.includes(true)) {
        return res.status(400).json({
          success: false,
          message: "You cannot reuse any of your last 3 passwords",
        });
      }

      // Add old password hash to history
      user.passwordHistory.push(user.passwordHash);
      if (user.passwordHistory.length > 3) {
        user.passwordHistory.shift();
      }
    }

    // Set new password (hashes with cost factor 12)
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Invalidate old refresh tokens (Force logout on all devices)
    await Session.updateMany({ userId: user._id }, { isRevoked: true });

    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "password_reset",
      details: "User password successfully reset via link.",
      email: user.email,
    });

    // Send confirmation email
    try {
      const emailHtml = getPasswordChangedTemplate(user.name);
      await sendEmailReport(user.email, "Social IQ - Password Reset Confirmation", emailHtml);
    } catch (mailError) {
      console.error("[Mail Delivery Warning] Failed to dispatch password reset confirmation email:", mailError.message);
    }

    res.json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password (authenticated)
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const oldPassword = req.body.oldPassword || req.body.currentPassword;
    const { newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.provider === "google" && !user.passwordHash) {
      // Connect flow: user doesn't have a local password set yet
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.json({
        success: true,
        message: "Local password set successfully",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Verify Password History (last 3 passwords)
    const matchesHistory = await Promise.all(
      user.passwordHistory.map((hash) => bcrypt.compare(newPassword, hash))
    );

    if (matchesHistory.includes(true)) {
      return res.status(400).json({
        success: false,
        message: "You cannot reuse any of your last 3 passwords",
      });
    }

    // Add old password hash to history
    user.passwordHistory.push(user.passwordHash);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Invalidate old refresh tokens (Force logout on other devices)
    const currentRefreshToken = req.cookies.socialiq_refresh_token;
    if (currentRefreshToken) {
      const hashedCurrentToken = hashToken(currentRefreshToken);
      await Session.updateMany(
        { userId: user._id, tokenHash: { $ne: hashedCurrentToken } },
        { isRevoked: true }
      );
    } else {
      await Session.updateMany({ userId: user._id }, { isRevoked: true });
    }

    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "password_changed",
      details: "User changed password successfully.",
      email: user.email,
    });

    // Send confirmation email
    try {
      const emailHtml = getPasswordChangedTemplate(user.name);
      await sendEmailReport(user.email, "Social IQ - Password Changed", emailHtml);
    } catch (mailError) {
      console.error("[Mail Delivery Warning] Failed to dispatch password changed confirmation email:", mailError.message);
    }

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google Sign-In callback
// @route   POST /api/auth/google
// @access  Public
export const googleSignIn = async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID Token is required.",
    });
  }

  try {
    const payload = await verifyGoogleIdToken(idToken);
    
    const { sub, email, name, picture } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      // Create a verified Google user (no local password required initially)
      user = await User.create({
        name,
        email,
        avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        isVerified: true, // Google emails are pre-verified
        isEmailVerified: true,
        provider: "google",
        googleId: sub,
      });
    } else {
      // Safe merge: user exists. Link Google ID and sync details
      user.provider = "google";
      user.googleId = sub;
      user.isEmailVerified = true;
      user.isVerified = true; // legacy sync
      if (!user.avatar) {
        user.avatar = picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
      }
      await user.save();
    }

    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    console.error("[Google OAuth Error]", error.message);
    res.status(400).json({
      success: false,
      message: "Google Sign-In authentication failed. Token is invalid or expired.",
    });
  }
};

// @desc    Connect Google Account to current user
// @route   POST /api/auth/google/connect
// @access  Private
export const googleConnect = async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID Token is required.",
    });
  }

  try {
    const payload = await verifyGoogleIdToken(idToken);

    const { sub, email } = payload;
    const user = await User.findById(req.user._id);

    // Verify if this Google account is already linked to another user
    const existingLink = await User.findOne({ googleId: sub, _id: { $ne: user._id } });
    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: "This Google account is already linked to another Social IQ user.",
      });
    }

    user.googleId = sub;
    user.provider = "google"; // Enable Google login compatibility
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "google_connected",
      details: `Google account linked: ${email}`,
    });

    res.json({
      success: true,
      message: "Google account successfully linked.",
      data: {
        googleId: user.googleId,
        provider: user.provider,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Linking Google account failed.",
    });
  }
};

// @desc    Disconnect Google Account
// @route   POST /api/auth/google/disconnect
// @access  Private
export const googleDisconnect = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Security check: Must have a password set to allow unlinking Google
    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: "You must set a local password before unlinking your Google account.",
      });
    }

    user.googleId = undefined;
    user.provider = "local";
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "google_disconnected",
      details: "Google account unlinked successfully.",
    });

    res.json({
      success: true,
      message: "Google account successfully unlinked.",
      data: {
        provider: user.provider,
      },
    });
  } catch (error) {
    next(error);
  }
};
