import mongoose from "mongoose";

const snapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    followers: {
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

    likes: {
      type: Number,
      default: 0,
    },

    comments: {
      type: Number,
      default: 0,
    },

    engagementRate: {
      type: Number,
      default: 0,
    },

    averageEngagement: {
      type: Number,
      default: 0,
    },

    party: {
      type: String,
      default: "Independent",
    },

    state: {
      type: String,
      default: "Unknown State",
    },

    name: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    capturedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);


// Indexing for quick query execution per user and account
snapshotSchema.index({ userId: 1, account: 1, capturedAt: -1 });
snapshotSchema.index({ capturedAt: -1 });
snapshotSchema.index({ party: 1 });
snapshotSchema.index({ state: 1 });

const Snapshot = mongoose.model("Snapshot", snapshotSchema);


export default Snapshot;