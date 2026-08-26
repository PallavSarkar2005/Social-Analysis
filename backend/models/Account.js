import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      default: function() {
        return this.userId;
      }
    },

    name: {
      type: String,
      required: true,
    },

    platform: {
      type: String,
      required: true,
      // "political" = platform-independent profile (no required social channel)
      enum: ["youtube", "instagram", "x", "political"],
    },

    // Optional YouTube channel ID — null means this profile has no YouTube channel
    youtubeChannelId: {
      type: String,
      default: null,
    },

    // Optional YouTube handle (e.g. @name) — null means no YouTube channel
    youtubeHandle: {
      type: String,
      default: null,
    },

    accountId: {
      type: String,
      required: true,
    },

    profileUrl: {
      type: String,
    },

    thumbnail: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "General",
    },

    role: {
      type: String,
      default: "Creator",
    },

    description: {
      type: String,
      default: "",
    },

    subscribers: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    videos: {
      type: Number,
      default: 0,
    },

    engagement: {
      type: Number,
      default: 0,
    },

    lastSynced: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isCompetitor: {
      type: Boolean,
      default: false,
    },
    group: {
      type: String,
      default: "Other",
    },
    state: {
      type: String,
      default: "Unknown State",
    },
    party: {
      type: String,
      default: "Independent",
    },
    profileImage: {
      type: String,
      default: "",
    },
    resolvedImage: {
      type: String,
      default: "",
    },
    imageSource: {
      type: String,
      enum: ["official", "youtube", "default"],
      // Political platform profiles default to "official" (no YouTube thumbnail)
      default: "default",
    },
    imageUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    analyzedAt: {
      type: Date,
    },
    cacheExpiresAt: {
      type: Date,
    },
    normalizedUrl: {
      type: String,
    },
    channelId: {
      type: String,
    },
    recentVideos: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

accountSchema.index({ accountId: 1, userId: 1 }, { unique: true });
accountSchema.index({ userId: 1, updatedAt: -1 });
accountSchema.index({ userId: 1, party: 1 });
accountSchema.index({ userId: 1, group: 1 });
accountSchema.index({ userId: 1, platform: 1 });
accountSchema.index({ party: 1 });
accountSchema.index({ state: 1 });
accountSchema.index({ group: 1 });
accountSchema.index({ createdAt: -1 });
accountSchema.index({ updatedAt: -1 });
accountSchema.index({ createdBy: 1 });
accountSchema.index({ normalizedUrl: 1 });
accountSchema.index({ channelId: 1 });
accountSchema.index({ cacheExpiresAt: 1 });

const Account = mongoose.model("Account", accountSchema);

export default Account;
