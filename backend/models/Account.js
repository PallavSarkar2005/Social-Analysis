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
      enum: ["youtube", "instagram", "x"],
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
    uploadedImage: {
      type: String,
      default: "",
    },
    resolvedImage: {
      type: String,
      default: "",
    },
    imageSource: {
      type: String,
      enum: ["user", "official", "youtube", "default"],
      default: "youtube",
    },
    imageUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: {
      type: Date,
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
