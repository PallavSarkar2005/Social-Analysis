import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Account from "../models/Account.js";
import TrackedCompetitor from "../models/TrackedCompetitor.js";
import SavedReport from "../models/SavedReport.js";
import Snapshot from "../models/Snapshot.js";
import EmailSchedule from "../models/EmailSchedule.js";
import Subscription from "../models/Subscription.js";
import Usage from "../models/Usage.js";
import { PLAN_LIMITS } from "../middleware/billingMiddleware.js";
import { logSecurityEvent } from "../utils/securityLogger.js";
import { sendEmailReport } from "../services/emailService.js";
import {
  getActiveSessions as listActiveSessions,
  revokeSessionById,
  revokeAllSessions,
} from "../services/sessionService.js";
import { clearAuthCookies } from "../services/cookieService.js";
import { hashToken } from "../utils/crypto.js";
import {
  getAccountDeletedTemplate,
} from "../services/emailTemplateService.js";

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

    const profileFields = [
      "username", "phone", "organization", "designation",
      "website", "country", "state", "timeZone", "language",
    ];
    for (const field of profileFields) {
      if (req.body[field] !== undefined) {
        user[field] = String(req.body[field]).trim();
      }
    }

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
        username: user.username,
        phone: user.phone,
        organization: user.organization,
        designation: user.designation,
        website: user.website,
        country: user.country,
        state: user.state,
        timeZone: user.timeZone,
        language: user.language,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
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
    await revokeAllSessions(user._id);

    await user.deleteOne();

    clearAuthCookies(res, req);

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
    const formattedSessions = await listActiveSessions(
      req.user._id,
      req.cookies.socialiq_refresh_token,
    );

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
    const currentRefreshToken = req.cookies.socialiq_refresh_token;

    const sessionToRevoke = await revokeSessionById(req.user._id, sessionId);
    if (!sessionToRevoke) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const isCurrent = currentRefreshToken
      ? sessionToRevoke.tokenHash === hashToken(currentRefreshToken)
      : false;

    await logSecurityEvent({
      userId: req.user._id,
      action: "session_revoked",
      details: `Revoked session ${sessionId}. Current session: ${isCurrent}`,
    });

    if (isCurrent) {
      clearAuthCookies(res, req);
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

// @desc    Reset workspace data (keeps user account)
// @route   POST /api/users/reset-workspace
// @access  Private
export const resetWorkspace = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Account.deleteMany({ userId });
    await TrackedCompetitor.deleteMany({ userId });
    await SavedReport.deleteMany({ userId });
    await Snapshot.deleteMany({ userId });

    await logSecurityEvent({
      userId,
      action: "workspace_reset",
      details: "User reset all workspace data (accounts, competitors, reports, snapshots).",
    });

    res.json({
      success: true,
      message: "Workspace data reset successfully.",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get account registry stats for settings
// @route   GET /api/users/account-stats
// @access  Private
export const getAccountStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      subscription = { plan: "free", status: "active" };
    }

    let usage = await Usage.findOne({
      userId: user._id,
      billingCycleStart: { $lte: new Date() },
      billingCycleEnd: { $gte: new Date() },
    });

    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    const reportsCount = usage?.reportsCount ?? 0;
    const aiRequestsCount = usage?.aiRequestsCount ?? 0;
    const maxApiCalls = limits.maxAiRequestsCount + limits.maxReportsCount;

    const [reportDocs, snapshotDocs] = await Promise.all([
      SavedReport.countDocuments({ userId: user._id }),
      Snapshot.countDocuments({ userId: user._id }),
    ]);

    const storageBytes = (reportDocs * 48_000) + (snapshotDocs * 12_000);
    const storageMb = Number((storageBytes / (1024 * 1024)).toFixed(1));

    res.json({
      success: true,
      data: {
        accountType: user.role || "user",
        memberSince: user.createdAt,
        userId: user._id,
        currentPlan: subscription.plan || user.plan || "free",
        workspaceId: `ws_${user._id.toString().substring(0, 8)}`,
        accountStatus: "active",
        isEmailVerified: user.isEmailVerified ?? false,
        storageUsedMb: storageMb,
        apiUsage: {
          used: aiRequestsCount + reportsCount,
          limit: maxApiCalls,
          aiRequestsCount,
          reportsCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
