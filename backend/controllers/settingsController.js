import EmailSchedule from "../models/EmailSchedule.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { logActivity } from "../utils/activityLogger.js";

// @desc    Get user email report schedule
// @route   GET /api/settings/email-schedule
// @access  Private
export const getEmailSchedule = async (req, res, next) => {
  try {
    let schedule = await EmailSchedule.findOne({ userId: req.user._id });

    if (!schedule) {
      // Return default template schedule if none exists yet
      schedule = {
        userId: req.user._id,
        frequency: "weekly",
        reportTypes: ["growth"],
        emailAddress: req.user.email,
        isActive: false,
      };
    }

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update user email report schedule
// @route   POST /api/settings/email-schedule
// @access  Private
export const updateEmailSchedule = async (req, res, next) => {
  try {
    const { frequency, reportTypes, emailAddress, isActive } = req.body;

    if (!emailAddress) {
      return res.status(400).json({
        success: false,
        message: "Email address is required for scheduling",
      });
    }

    const schedule = await EmailSchedule.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          frequency,
          reportTypes,
          emailAddress,
          isActive,
        },
      },
      { upsert: true, new: true }
    );

    await logActivity(
      req.user._id,
      "email_schedule_updated",
      `Email schedule updated to: ${frequency} [Active: ${isActive}]`,
      req
    );

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   POST /api/settings/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // Check email uniqueness if changed
    if (email.toLowerCase() !== req.user.email.toLowerCase()) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already taken by another user",
        });
      }
    }

    const user = await User.findById(req.user._id);
    user.name = name;
    user.email = email;
    await user.save();

    await logActivity(
      req.user._id,
      "profile_updated",
      `Profile preferences updated to name: ${name}, email: ${email}`,
      req
    );

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user password
// @route   POST /api/settings/password
// @access  Private
export const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    // Enforce Password History (check last 3 passwords)
    const matchesHistory = await Promise.all(
      user.passwordHistory.map((hash) => bcrypt.compare(newPassword, hash))
    );

    if (matchesHistory.includes(true)) {
      return res.status(400).json({
        success: false,
        message: "You cannot reuse any of your last 3 passwords",
      });
    }

    // Add current password to history
    user.passwordHistory.push(user.passwordHash);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logActivity(req.user._id, "password_changed", `Password successfully changed`, req);

    res.json({
      success: true,
      message: "Password successfully updated",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user notification preferences
// @route   GET /api/settings/notifications
// @access  Private
export const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user.notificationPreferences || {
        growthSpike: true,
        newAiReport: true,
        snapshotCompleted: true,
        milestoneReached: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user notification preferences
// @route   POST /api/settings/notifications
// @access  Private
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { growthSpike, newAiReport, snapshotCompleted, milestoneReached } = req.body;

    const user = await User.findById(req.user._id);
    user.notificationPreferences = {
      growthSpike: growthSpike !== false,
      newAiReport: newAiReport !== false,
      snapshotCompleted: snapshotCompleted !== false,
      milestoneReached: milestoneReached !== false,
    };

    await user.save();

    await logActivity(
      req.user._id,
      "notification_preferences_updated",
      `Notification preferences updated`,
      req
    );

    res.json({
      success: true,
      data: user.notificationPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user appearance preferences
// @route   GET /api/settings/appearance
// @access  Private
export const getAppearance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("appearancePreferences");
    res.json({
      success: true,
      data: user.appearancePreferences || {
        theme: "dark",
        accent: "indigo",
        fontSize: "medium",
        compact: false,
        animations: "full",
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user appearance preferences
// @route   PUT /api/settings/appearance
// @access  Private
export const updateAppearance = async (req, res, next) => {
  try {
    const { theme, accent, fontSize, compact, animations } = req.body;

    const allowed = {
      theme: ["dark", "light", "system"],
      accent: ["indigo", "emerald", "violet", "amber", "rose", "cyan", "orange"],
      fontSize: ["small", "medium", "large"],
      animations: ["full", "minimal", "off"],
    };

    if (theme && !allowed.theme.includes(theme)) {
      return res.status(400).json({ success: false, message: "Invalid theme value" });
    }
    if (accent && !allowed.accent.includes(accent)) {
      return res.status(400).json({ success: false, message: "Invalid accent value" });
    }
    if (fontSize && !allowed.fontSize.includes(fontSize)) {
      return res.status(400).json({ success: false, message: "Invalid fontSize value" });
    }
    if (animations && !allowed.animations.includes(animations)) {
      return res.status(400).json({ success: false, message: "Invalid animations value" });
    }

    const user = await User.findById(req.user._id);
    user.appearancePreferences = {
      theme: theme ?? user.appearancePreferences?.theme ?? "dark",
      accent: accent ?? user.appearancePreferences?.accent ?? "indigo",
      fontSize: fontSize ?? user.appearancePreferences?.fontSize ?? "medium",
      compact: compact !== undefined ? Boolean(compact) : (user.appearancePreferences?.compact ?? false),
      animations: animations ?? user.appearancePreferences?.animations ?? "full",
    };

    await user.save();

    await logActivity(
      req.user._id,
      "appearance_updated",
      `Appearance preferences updated: theme=${user.appearancePreferences.theme}, accent=${user.appearancePreferences.accent}`,
      req
    );

    res.json({
      success: true,
      data: user.appearancePreferences,
    });
  } catch (error) {
    next(error);
  }
};
