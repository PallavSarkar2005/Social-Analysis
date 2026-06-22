import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import LoginAttempt from "../models/LoginAttempt.js";
import { logSecurityEvent } from "../utils/securityLogger.js";
import { sendEmailReport } from "../services/emailService.js";

// Helper to parse cookies from request headers
const parseCookies = (req) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name.trim();
    if (!name) return;
    list[name] = decodeURIComponent(rest.join("=").trim());
  });
  return list;
};

// Helper to issue access & refresh tokens via secure httpOnly cookies
const sendTokenResponse = async (user, statusCode, req, res) => {
  const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "15m", // 15 minutes
  });

  const refreshTokenVal = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  // Save the refresh token to database
  await RefreshToken.create({
    userId: user._id,
    token: refreshTokenVal,
    expiresAt,
  });

  const isProd = process.env.NODE_ENV === "production";

  // Set HTTP-only secure cookie configurations
  res.cookie("socialiq_access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("socialiq_refresh_token", refreshTokenVal, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Log successful login audit
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  await logSecurityEvent({
    userId: user._id,
    action: "login_success",
    details: "User successfully logged in and tokens were issued.",
    ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
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

    // Hash password with cost factor >= 12
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
      plan: "free",
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      verificationToken,
      verificationTokenExpires,
    });

    const isProd = process.env.NODE_ENV === "production";
    const appUrl = isProd ? "https://social-analysis-smoky.vercel.app" : "http://localhost:5173";
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    await sendEmailReport(
      user.email,
      "Social IQ - Verify Your Account",
      `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Verify your email address</h2>
        <p>Thank you for registering at Social IQ. Click below to verify your account:</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Account</a>
        <p style="margin-top: 20px; font-size: 11px; color: #888;">If you did not request this, please ignore this email.</p>
       </div>`
    );

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
    // 1. Check for active lockout
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

    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      await handleFailedLogin(email, ipAddress);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await handleFailedLogin(email, ipAddress);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 4. Successful login: reset failed counters
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
      // 15-minute lockouts
      attempt.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
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

// @desc    Refresh JWT access tokens
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res, next) => {
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";

  try {
    const cookies = parseCookies(req);
    const refreshTokenVal = cookies.socialiq_refresh_token;

    if (!refreshTokenVal) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshTokenVal });

    if (!storedToken) {
      await logSecurityEvent({
        action: "refresh_failed_invalid_token",
        details: "Refresh attempt with unrecognized refresh token format.",
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Reuse Detection: If token is already revoked, breach is assumed!
    if (storedToken.isRevoked) {
      await RefreshToken.deleteMany({ userId: storedToken.userId });
      
      res.clearCookie("socialiq_access_token");
      res.clearCookie("socialiq_refresh_token");

      await logSecurityEvent({
        userId: storedToken.userId,
        action: "refresh_token_reuse_breach",
        details: "Reused refresh token submitted! Revoking all sessions for this user.",
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      });

      return res.status(401).json({
        success: false,
        message: "Breach detected: Session has already been refreshed. Terminating all logins.",
      });
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      await storedToken.deleteOne();
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    // Perform rotation: revoke current, issue new refresh token
    const newRefreshTokenVal = crypto.randomBytes(40).toString("hex");
    storedToken.isRevoked = true;
    storedToken.replacedByToken = newRefreshTokenVal;
    await storedToken.save();

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await RefreshToken.create({
      userId: storedToken.userId,
      token: newRefreshTokenVal,
      expiresAt: newExpiresAt,
    });

    const user = await User.findById(storedToken.userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("socialiq_access_token", newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("socialiq_refresh_token", newRefreshTokenVal, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
    const cookies = parseCookies(req);
    const refreshTokenVal = cookies.socialiq_refresh_token;

    if (refreshTokenVal) {
      await RefreshToken.deleteOne({ token: refreshTokenVal });
    }

    res.clearCookie("socialiq_access_token");
    res.clearCookie("socialiq_refresh_token");

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
    await RefreshToken.deleteMany({ userId: req.user._id });

    res.clearCookie("socialiq_access_token");
    res.clearCookie("socialiq_refresh_token");

    res.json({
      success: true,
      message: "Logged out of all sessions successfully",
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
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification token is invalid or has expired",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
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
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    const isProd = process.env.NODE_ENV === "production";
    const appUrl = isProd ? "https://social-analysis-smoky.vercel.app" : "http://localhost:5173";
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await sendEmailReport(
      user.email,
      "Social IQ - Reset Password",
      `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>We received a password reset request. Click below to reset your credentials:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
        <p style="margin-top: 20px; font-size: 11px; color: #888;">This link expires in 1 hour.</p>
       </div>`
    );

    res.json({
      success: true,
      message: "Password reset link has been dispatched if the email was registered.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using link
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    // Verify Password History (last 3 passwords)
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

    // Set new password (hashes with cost factor 12)
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "password_reset",
      details: "User password successfully reset via link.",
      email: user.email,
    });

    res.json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    next(error);
  }
};
