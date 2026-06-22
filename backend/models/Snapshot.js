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

    engagementRate: {
      type: Number,
      default: 0,
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

const Snapshot = mongoose.model("Snapshot", snapshotSchema);

export default Snapshot;