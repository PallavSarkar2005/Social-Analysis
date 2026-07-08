import mongoose from "mongoose";

const userApiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
    },
    permissions: {
      type: String,
      enum: ["read", "read_write"],
      default: "read_write",
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userApiKeySchema.index({ userId: 1, revokedAt: 1 });

const UserApiKey = mongoose.model("UserApiKey", userApiKeySchema);

export default UserApiKey;
