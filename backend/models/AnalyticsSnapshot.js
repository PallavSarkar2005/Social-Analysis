import mongoose from "mongoose";

/**
 * Append-only analytics time series — single source of truth for all graphs.
 * Never overwrite prior rows; never invent missing metric values (null = unverified).
 */
const analyticsSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    source: {
      type: String,
      enum: ["youtube_sync", "profile_build", "x_sync", "backfill", "manual"],
      default: "youtube_sync",
    },

    // Channel telemetry (null = not verified for this capture)
    subscribers: { type: Number, default: null },
    views: { type: Number, default: null },
    videos: { type: Number, default: null },
    likes: { type: Number, default: null },
    comments: { type: Number, default: null },
    engagementRate: { type: Number, default: null },
    averageEngagement: { type: Number, default: null },

    // Influence board (from PoliticalProfile at capture time)
    politicalReach: { type: Number, default: null },
    digitalPresence: { type: Number, default: null },
    mediaVisibility: { type: Number, default: null },
    electionStrength: { type: Number, default: null },
    publicEngagement: { type: Number, default: null },
    verifiedConfidence: { type: Number, default: null },
    influenceScore: { type: Number, default: null },

    // Sentiment distribution (percentages; null when unverified)
    sentimentPositive: { type: Number, default: null },
    sentimentNeutral: { type: Number, default: null },
    sentimentNegative: { type: Number, default: null },

    // Election stats
    electionWins: { type: Number, default: null },
    electionContested: { type: Number, default: null },

    // Denormalized labels for history tables
    party: { type: String, default: "" },
    state: { type: String, default: "" },
    name: { type: String, default: "" },
    profileImage: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

analyticsSnapshotSchema.index({ accountId: 1, capturedAt: -1 });
analyticsSnapshotSchema.index({ userId: 1, capturedAt: -1 });
analyticsSnapshotSchema.index({ userId: 1, accountId: 1, capturedAt: -1 });

const AnalyticsSnapshot = mongoose.model("AnalyticsSnapshot", analyticsSnapshotSchema);

export default AnalyticsSnapshot;
