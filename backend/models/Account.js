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
    imageSource: {
      type: String,
      enum: ["upload", "youtube", "x"],
      default: "youtube",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to allow different users to track the same accountId
accountSchema.index({ accountId: 1, userId: 1 }, { unique: true });
accountSchema.index({ party: 1 });
accountSchema.index({ state: 1 });
accountSchema.index({ createdBy: 1 });

const Account = mongoose.model("Account", accountSchema);

export default Account;
