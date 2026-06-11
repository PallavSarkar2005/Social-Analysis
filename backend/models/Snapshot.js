import mongoose from "mongoose";

const snapshotSchema = new mongoose.Schema(
  {
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

const Snapshot = mongoose.model("Snapshot", snapshotSchema);

export default Snapshot;