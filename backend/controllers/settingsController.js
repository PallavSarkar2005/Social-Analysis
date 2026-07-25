import EmailSchedule from "../models/EmailSchedule.js";
import User from "../models/User.js";
import UserApiKey from "../models/UserApiKey.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PLAN_PRICES, PLAN_FEATURES } from "../config/plans.js";

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


    res.json({
      success: true,
      data: user.notificationPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user appearance preferences (public — returns defaults for guests)
// @route   GET /api/settings/appearance
// @access  Public (optional auth)
export const getAppearance = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        data: {
          theme: "dark",
          accent: "indigo",
          fontSize: "medium",
          compact: false,
          animations: "full",
        },
      });
    }

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


    res.json({
      success: true,
      data: user.appearancePreferences,
    });
  } catch (error) {
    next(error);
  }
};

const DEFAULT_PRIVACY = {
  publicProfile: false,
  searchVisibility: false,
  analyticsSharing: true,
  telemetry: false,
  personalizedAI: true,
};

const DEFAULT_SECURITY = {
  twoFactorEnabled: false,
  passkeysEnabled: false,
  suspiciousLoginAlerts: true,
};

const DEFAULT_ADVANCED = {
  debugMode: false,
  experimentalFeatures: false,
  forceCacheBypass: false,
};

const INTEGRATION_IDS = [
  "youtube", "twitter", "instagram", "drive", "slack",
  "discord", "zapier", "n8n", "webhook", "github", "microsoft", "linkedin",
];

const OAUTH_INTEGRATIONS = new Set([
  "youtube", "twitter", "instagram", "drive", "slack",
  "discord", "zapier", "n8n", "github", "microsoft", "linkedin",
]);

export const getPrivacyPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("privacyPreferences");
    res.json({
      success: true,
      data: { ...DEFAULT_PRIVACY, ...(user?.privacyPreferences || {}) },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePrivacyPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.privacyPreferences = {
      publicProfile: req.body.publicProfile === true,
      searchVisibility: req.body.searchVisibility === true,
      analyticsSharing: req.body.analyticsSharing !== false,
      telemetry: req.body.telemetry === true,
      personalizedAI: req.body.personalizedAI !== false,
    };
    await user.save();

    res.json({ success: true, data: user.privacyPreferences });
  } catch (error) {
    next(error);
  }
};

export const getSecurityPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("securityPreferences");
    const prefs = { ...DEFAULT_SECURITY, ...(user?.securityPreferences || {}) };
    res.json({
      success: true,
      data: {
        ...prefs,
        passkeyCount: user?.securityPreferences?.passkeysEnabled ? 1 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSecurityPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const current = user.securityPreferences || {};
    user.securityPreferences = {
      twoFactorEnabled: req.body.twoFactorEnabled !== undefined ? Boolean(req.body.twoFactorEnabled) : (current.twoFactorEnabled ?? false),
      passkeysEnabled: req.body.passkeysEnabled !== undefined ? Boolean(req.body.passkeysEnabled) : (current.passkeysEnabled ?? false),
      suspiciousLoginAlerts: req.body.suspiciousLoginAlerts !== undefined ? Boolean(req.body.suspiciousLoginAlerts) : (current.suspiciousLoginAlerts ?? true),
    };
    await user.save();

    res.json({
      success: true,
      data: {
        ...user.securityPreferences,
        passkeyCount: user.securityPreferences.passkeysEnabled ? 1 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdvancedPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("advancedPreferences");
    res.json({
      success: true,
      data: {
        ...DEFAULT_ADVANCED,
        ...(user?.advancedPreferences || {}),
        apiEndpoint: process.env.API_PUBLIC_URL || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdvancedPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const current = user.advancedPreferences || {};
    user.advancedPreferences = {
      debugMode: req.body.debugMode !== undefined ? Boolean(req.body.debugMode) : (current.debugMode ?? false),
      experimentalFeatures: req.body.experimentalFeatures !== undefined ? Boolean(req.body.experimentalFeatures) : (current.experimentalFeatures ?? false),
      forceCacheBypass: req.body.forceCacheBypass !== undefined ? Boolean(req.body.forceCacheBypass) : (current.forceCacheBypass ?? false),
    };
    await user.save();

    res.json({
      success: true,
      data: {
        ...user.advancedPreferences,
        apiEndpoint: process.env.API_PUBLIC_URL || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getIntegrations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("integrations provider googleId");
    const integrations = user?.integrations || {};

    const list = INTEGRATION_IDS.map((id) => {
      const entry = integrations[id] || {};
      return {
        id,
        connected: Boolean(entry.connected),
        connectedAt: entry.connectedAt || null,
        lastSyncedAt: entry.lastSyncedAt || null,
        status: entry.connected ? (entry.lastSyncedAt ? "Healthy" : "Active") : "Disconnected",
        oauthAvailable: id === "webhook" ? true : OAUTH_INTEGRATIONS.has(id) && Boolean(process.env[`${id.toUpperCase()}_OAUTH_ENABLED`]),
      };
    });

    res.json({
      success: true,
      data: {
        google: {
          connected: user?.provider === "google" || Boolean(user?.googleId),
        },
        integrations: list,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateIntegration = async (req, res, next) => {
  try {
    const integrationId = req.params.id;
    if (!INTEGRATION_IDS.includes(integrationId)) {
      return res.status(400).json({ success: false, message: "Unknown integration" });
    }

    if (integrationId !== "webhook" && OAUTH_INTEGRATIONS.has(integrationId)) {
      return res.status(501).json({
        success: false,
        message: `${integrationId} OAuth integration is not configured on this server.`,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user.integrations) user.integrations = {};

    const connected = req.body.connected === true;
    const now = new Date();

    user.integrations[integrationId] = {
      connected,
      connectedAt: connected ? now : null,
      lastSyncedAt: connected ? now : null,
      url: integrationId === "webhook" ? (req.body.url || "") : undefined,
    };

    user.markModified("integrations");
    await user.save();


    res.json({
      success: true,
      data: user.integrations[integrationId],
    });
  } catch (error) {
    next(error);
  }
};

export const listApiKeys = async (req, res, next) => {
  try {
    const keys = await UserApiKey.find({ userId: req.user._id, revokedAt: null })
      .sort({ createdAt: -1 })
      .select("name tokenPrefix permissions lastUsedAt expiresAt createdAt");

    res.json({
      success: true,
      data: keys.map((k) => ({
        id: k._id,
        name: k.name,
        tokenPrefix: k.tokenPrefix,
        permissions: k.permissions === "read_write" ? "Read & Write" : "Read Only",
        lastUsed: k.lastUsedAt ? k.lastUsedAt.toISOString() : "Never",
        expiry: k.expiresAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createApiKey = async (req, res, next) => {
  try {
    const { name, permissions } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Key name is required" });
    }

    const perm = permissions === "Read Only" || permissions === "read" ? "read" : "read_write";
    const rawToken = `sq_live_${crypto.randomBytes(24).toString("hex")}`;
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const key = await UserApiKey.create({
      userId: req.user._id,
      name: name.trim(),
      tokenHash,
      tokenPrefix: `${rawToken.substring(0, 12)}...`,
      permissions: perm,
      expiresAt,
    });


    res.status(201).json({
      success: true,
      data: {
        id: key._id,
        name: key.name,
        token: rawToken,
        permissions: perm === "read_write" ? "Read & Write" : "Read Only",
        expiry: key.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const revokeApiKey = async (req, res, next) => {
  try {
    const key = await UserApiKey.findOne({ _id: req.params.id, userId: req.user._id, revokedAt: null });
    if (!key) {
      return res.status(404).json({ success: false, message: "API key not found" });
    }

    key.revokedAt = new Date();
    await key.save();


    res.json({ success: true, data: { id: key._id } });
  } catch (error) {
    next(error);
  }
};

export const getPlanCatalog = async (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        currency: "INR",
        plans: [
          {
            id: "free",
            name: "Starter",
            prices: { monthly: 0, annual: 0 },
            features: PLAN_FEATURES.free,
          },
          {
            id: "professional",
            name: "Professional",
            prices: PLAN_PRICES.professional,
            features: PLAN_FEATURES.professional,
          },
          {
            id: "enterprise",
            name: "Enterprise",
            prices: PLAN_PRICES.enterprise,
            features: PLAN_FEATURES.enterprise,
          },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportProfileData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash -passwordHistory");
    const schedule = await EmailSchedule.findOne({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        profile: user,
        emailSchedule: schedule || null,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
