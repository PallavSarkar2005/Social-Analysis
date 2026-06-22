import mongoose from "mongoose";

const trackedCompetitorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["youtube", "x"],
    },
    accountId: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    trackedSince: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent tracking the same competitor account multiple times for the same user
trackedCompetitorSchema.index({ userId: 1, platform: 1, accountId: 1 }, { unique: true });

const TrackedCompetitor = mongoose.model(
  "TrackedCompetitor",
  trackedCompetitorSchema
);

export default TrackedCompetitor;
