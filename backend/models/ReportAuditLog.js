import mongoose from "mongoose";

export const REPORT_AUDIT_ACTIONS = [
  "created",
  "viewed",
  "exported",
  "shared",
  "revoked",
  "deleted",
  "updated",
  "favorited",
  "pinned",
  "regenerated",
];

const reportAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavedReport",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: REPORT_AUDIT_ACTIONS,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

reportAuditLogSchema.index({ reportId: 1, createdAt: -1 });
reportAuditLogSchema.index({ userId: 1, createdAt: -1 });

const ReportAuditLog = mongoose.model("ReportAuditLog", reportAuditLogSchema);

export default ReportAuditLog;
