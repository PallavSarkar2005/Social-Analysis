import mongoose from "mongoose";

const apiUsageSchema = new mongoose.Schema(
  {
    apiKey: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    quotaCost: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      required: true,
    },
    cached: {
      type: Boolean,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const ApiUsage = mongoose.model("ApiUsage", apiUsageSchema);

export default ApiUsage;
