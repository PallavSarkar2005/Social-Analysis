import mongoose from "mongoose";

const savedReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["ai_insight", "comparison", "analysis", "competitor_report"],
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize report lookups by user and creation date
savedReportSchema.index({ userId: 1, createdAt: -1 });

const SavedReport = mongoose.model("SavedReport", savedReportSchema);

export default SavedReport;
