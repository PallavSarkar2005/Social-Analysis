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
      required: true,
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
    isVerified: {
      type: Boolean,
      default: false, // Turn off by default or verify via setup links
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
