import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    notificationPreferences: {
      growthSpike: { type: Boolean, default: true },
      newAiReport: { type: Boolean, default: true },
      snapshotCompleted: { type: Boolean, default: true },
      milestoneReached: { type: Boolean, default: true },
    },
    appearancePreferences: {
      theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
      accent: { type: String, enum: ["indigo", "emerald", "violet", "amber", "rose", "cyan", "orange"], default: "indigo" },
      fontSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      compact: { type: Boolean, default: false },
      animations: { type: String, enum: ["full", "minimal", "off"], default: "full" },
    },
    passwordHistory: {
      type: [String],
      default: [],
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true,
    },
    isVerified: {
      type: Boolean,
      default: true, // Legacy field sync
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    verificationToken: String, // Legacy token sync
    verificationTokenExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    bio: {
      type: String,
      default: "",
    },
    username: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    organization: {
      type: String,
      default: "",
      trim: true,
    },
    designation: {
      type: String,
      default: "",
      trim: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    timeZone: {
      type: String,
      default: "UTC",
      trim: true,
    },
    language: {
      type: String,
      default: "English",
      trim: true,
    },
    privacyPreferences: {
      publicProfile: { type: Boolean, default: false },
      searchVisibility: { type: Boolean, default: false },
      analyticsSharing: { type: Boolean, default: true },
      telemetry: { type: Boolean, default: false },
      personalizedAI: { type: Boolean, default: true },
    },
    securityPreferences: {
      twoFactorEnabled: { type: Boolean, default: false },
      passkeysEnabled: { type: Boolean, default: false },
      suspiciousLoginAlerts: { type: Boolean, default: true },
    },
    advancedPreferences: {
      debugMode: { type: Boolean, default: false },
      experimentalFeatures: { type: Boolean, default: false },
      forceCacheBypass: { type: Boolean, default: false },
    },
    integrations: {
      youtube: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      twitter: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      instagram: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      drive: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      slack: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      discord: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      zapier: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      n8n: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      webhook: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date, url: { type: String, default: "" } },
      github: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      microsoft: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
      linkedin: { connected: { type: Boolean, default: false }, connectedAt: Date, lastSyncedAt: Date },
    },
    lastLogin: Date,
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        browser: String,
        device: String,
        os: String,
        loggedInAt: { type: Date, default: Date.now },
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Perfect sync hook for isVerified and isEmailVerified fields, and verification tokens
userSchema.pre("save", function () {
  if (this.isModified("isVerified")) {
    this.isEmailVerified = this.isVerified;
  } else if (this.isModified("isEmailVerified")) {
    this.isVerified = this.isEmailVerified;
  }
  if (this.isModified("verificationToken")) {
    this.emailVerificationToken = this.verificationToken;
  } else if (this.isModified("emailVerificationToken")) {
    this.verificationToken = this.emailVerificationToken;
  }
  if (this.isModified("verificationTokenExpires")) {
    this.emailVerificationExpires = this.verificationTokenExpires;
  } else if (this.isModified("emailVerificationExpires")) {
    this.verificationTokenExpires = this.emailVerificationExpires;
  }
});

userSchema.index({ createdAt: -1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

const User = mongoose.model("User", userSchema);

export default User;
