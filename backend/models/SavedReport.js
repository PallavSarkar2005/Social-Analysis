import mongoose from "mongoose";

export const REPORT_TYPES = [
  "political_profile",
  "ai_insight",
  "comparison",
  "election",
  "timeline",
  "news_sentiment",
  "influence",
  "telemetry",
  "snapshot",
  "analysis",
  "competitor_report",
  "custom",
];

export const REPORT_STATUSES = ["draft", "ready", "archived", "failed"];
export const REPORT_VISIBILITIES = ["private", "public", "team"];
export const REPORT_EXPORT_FORMATS = ["pdf", "json", "markdown", "csv", "xlsx"];

const savedReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PoliticalProfile",
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    // Canonical report type (API may also accept reportType alias)
    type: {
      type: String,
      required: true,
      enum: REPORT_TYPES,
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
    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "ready",
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    searchKeywords: {
      type: [String],
      default: [],
    },
    sourceModules: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
    reportVersion: {
      type: String,
      trim: true,
      default: "1",
    },
    analysisVersion: {
      type: String,
      trim: true,
      default: "",
    },
    engineVersion: {
      type: String,
      trim: true,
      default: "",
    },
    shareToken: {
      type: String,
      trim: true,
      // Intentionally no default — null values break unique sparse indexes in MongoDB
    },
    visibility: {
      type: String,
      enum: REPORT_VISIBILITIES,
      default: "private",
    },
    shareRevokedAt: {
      type: Date,
      default: null,
    },
    shareExpiresAt: {
      type: Date,
      default: null,
    },
    exportFormats: {
      type: [
        {
          type: String,
          enum: REPORT_EXPORT_FORMATS,
        },
      ],
      default: ["pdf", "json", "csv", "xlsx"],
    },
    size: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /**
     * Assembled Political Intelligence dossier (cover → metadata).
     * Regenerated only when template/engine/analysis versions change.
     */
    dossier: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    contentFingerprint: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Alias reportType <-> type for Intelligence Hub API consumers
savedReportSchema.virtual("reportType").get(function reportTypeGetter() {
  return this.type;
});

savedReportSchema.index({ userId: 1, createdAt: -1 });
savedReportSchema.index({ userId: 1, pinned: -1, favorite: -1, updatedAt: -1 });
savedReportSchema.index({ userId: 1, type: 1, createdAt: -1 });
savedReportSchema.index({ userId: 1, status: 1 });
savedReportSchema.index({ userId: 1, lastViewedAt: -1 });
savedReportSchema.index({ userId: 1, profileId: 1 });
savedReportSchema.index(
  { userId: 1, type: 1, source: 1, profileId: 1 },
  { name: "report_identity_lookup" }
);
savedReportSchema.index(
  { userId: 1, type: 1, accountId: 1 },
  { name: "hub_account_identity", sparse: true }
);
savedReportSchema.index(
  { shareToken: 1 },
  { unique: true, sparse: true, name: "shareToken_1" }
);
savedReportSchema.index({
  title: "text",
  summary: "text",
  tags: "text",
  searchKeywords: "text",
  source: "text",
});

const SavedReport = mongoose.model("SavedReport", savedReportSchema);

export default SavedReport;
