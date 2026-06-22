import mongoose from "mongoose";

const emailScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    frequency: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    reportTypes: {
      type: [String],
      enum: ["competitor", "growth", "ai"],
      default: ["growth"],
    },
    emailAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

emailScheduleSchema.index({ userId: 1, isActive: 1 });

const EmailSchedule = mongoose.model("EmailSchedule", emailScheduleSchema);

export default EmailSchedule;
