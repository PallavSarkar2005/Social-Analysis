import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    browser: String,
    device: String,
    os: String,
    isRevoked: {
      type: Boolean,
      default: false,
    },
    replacedByToken: String,
    familyId: String,
  },
  {
    timestamps: true,
  }
);

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
    refreshTokens: [refreshTokenSchema],
    bio: {
      type: String,
      default: "",
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

userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

const User = mongoose.model("User", userSchema);

export default User;
