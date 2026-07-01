import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Account from "../models/Account.js";
import TrackedCompetitor from "../models/TrackedCompetitor.js";
import SavedReport from "../models/SavedReport.js";
import Snapshot from "../models/Snapshot.js";
import EmailSchedule from "../models/EmailSchedule.js";
import ActivityLog from "../models/ActivityLog.js";
import { logSecurityEvent } from "../utils/securityLogger.js";
import { sendEmailReport } from "../services/emailService.js";
import {
  getAccountDeletedTemplate,
} from "../services/emailTemplateService.js";

// Helper to hash tokens
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// @desc    Update user profile details (name, avatar, bio)
// @route   PATCH /api/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, bio } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();
    if (bio !== undefined) user.bio = bio.trim();

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user email (requires password, sets user to unverified, sends verification link)
// @route   PATCH /api/users/email
// @access  Private
export const changeEmail = async (req, res, next) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "New email and password are required",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify Password if user is local provider
    if (user.provider === "local" || user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Incorrect password",
        });
      }
    }

    // Check email uniqueness
    const emailExists = await User.findOne({ email: newEmail.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email address is already in use by another account",
      });
    }

    const oldEmail = user.email;
    user.email = newEmail.toLowerCase();
    user.isEmailVerified = true;
    user.isVerified = true;

    await user.save();

    // Send email change notification alert
    try {
      await sendEmailReport(
        user.email,
        "Social IQ - Email Address Updated",
        `<h1>Email Updated</h1><p>Hello ${user.name},</p><p>This is to confirm that the primary email address for your Social IQ account was successfully updated from <strong>${oldEmail}</strong> to <strong>${user.email}</strong>.</p>`
      );
    } catch (mailErr) {
      console.error("Failed to send email change notification:", mailErr.message);
    }

    const ipAddressRaw = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const ipAddress = Array.isArray(ipAddressRaw) ? ipAddressRaw[0] : ipAddressRaw.split(",")[0].trim();

    await logSecurityEvent({
      userId: user._id,
      action: "email_changed_initiated",
      details: `Email change initiated from ${oldEmail} to ${newEmail}`,
      ipAddress,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Email updated successfully. Please verify your new email address to regain full access.",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account (requires password, deletes all associated data)
// @route   DELETE /api/users/account
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify Password if local provider
    if (user.provider === "local" || user.passwordHash) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required to delete your account",
        });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Incorrect password",
        });
      }
    }

    const ipAddressRaw = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const ipAddress = Array.isArray(ipAddressRaw) ? ipAddressRaw[0] : ipAddressRaw.split(",")[0].trim();

    await logSecurityEvent({
      userId: user._id,
      action: "account_deleted",
      details: `User ${user.email} deleted their account and all associated resources.`,
      ipAddress,
      email: user.email,
    });

    // Send deletion confirmation email
    try {
      const emailHtml = getAccountDeletedTemplate(user.name);
      await sendEmailReport(user.email, "Social IQ - Account Deleted", emailHtml);
    } catch (mailErr) {
      console.error("Failed to send deletion confirmation email:", mailErr.message);
    }

    // Delete associated data
    await Account.deleteMany({ userId: user._id });
    await TrackedCompetitor.deleteMany({ userId: user._id });
    await SavedReport.deleteMany({ userId: user._id });
    await Snapshot.deleteMany({ userId: user._id });
    await EmailSchedule.deleteMany({ userId: user._id });
    await ActivityLog.deleteMany({ userId: user._id });
    await Session.deleteMany({ userId: user._id });

    await user.deleteOne();

    const { getAuthCookieOptions } = await import("../utils/cookieConfig.js");
    const cookieOptions = getAuthCookieOptions(req);
    res.clearCookie("socialiq_access_token", cookieOptions);
    res.clearCookie("socialiq_refresh_token", cookieOptions);

    res.json({
      success: true,
      message: "Account and all associated data deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active refresh token sessions for the logged in user
// @route   GET /api/users/sessions
// @access  Private
export const getActiveSessions = async (req, res, next) => {
  try {
    const currentRefreshToken = req.cookies.socialiq_refresh_token;
    const hashedCurrentToken = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    const dbSessions = await Session.find({
      userId: req.user._id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: -1 });

    const now = Date.now();
    const formattedSessions = dbSessions.map((session) => {
      const lastActiveMs = now - new Date(session.lastActivity || session.createdAt).getTime();
      const isActive = lastActiveMs < 30 * 60 * 1000;

      return {
        _id: session._id,
        ipAddress: session.ipAddress || "Unknown",
        location: session.location || "Unknown Location",
        userAgent: session.userAgent || "Unknown",
        browser: session.browser || "Unknown",
        device: session.device || "Unknown",
        os: session.os || "Unknown",
        createdAt: session.createdAt,
        loggedInAt: session.createdAt,
        lastActivity: session.lastActivity || session.createdAt,
        isRememberMe: session.isRememberMe || false,
        status: isActive ? "active" : "offline",
        isCurrent: session.tokenHash === hashedCurrentToken,
      };
    });

    res.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke an individual session
// @route   DELETE /api/users/sessions/:id
// @access  Private
export const revokeSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await Session.findById(sessionId);

    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const currentRefreshToken = req.cookies.socialiq_refresh_token;
    const hashedCurrentToken = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const isCurrent = session.tokenHash === hashedCurrentToken;

    // Revoke the session document
    session.isRevoked = true;
    await session.save();

    await logSecurityEvent({
      userId: req.user._id,
      action: "session_revoked",
      details: `Revoked session ${sessionId}. Current session: ${isCurrent}`,
    });

    if (isCurrent) {
      const { getAuthCookieOptions } = await import("../utils/cookieConfig.js");
      const cookieOptions = getAuthCookieOptions(req);
      res.clearCookie("socialiq_access_token", cookieOptions);
      res.clearCookie("socialiq_refresh_token", cookieOptions);
    }

    res.json({
      success: true,
      message: isCurrent ? "Current session revoked. Logging out..." : "Session successfully revoked",
      data: { isCurrent },
    });
  } catch (error) {
    next(error);
  }
};
