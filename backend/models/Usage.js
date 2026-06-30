import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    billingCycleStart: {
      type: Date,
      default: Date.now,
      required: true,
    },
    billingCycleEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      required: true,
    },
    analysesCount: {
      type: Number,
      default: 0,
    },
    aiRequestsCount: {
      type: Number,
      default: 0,
    },
    reportsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Usage = mongoose.model("Usage", usageSchema);
export default Usage;
