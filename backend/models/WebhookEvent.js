import mongoose from "mongoose";

/**
 * Idempotency ledger for Razorpay (and future provider) webhook events.
 */
const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: "razorpay",
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    payloadHash: { type: String },
    status: {
      type: String,
      enum: ["processing", "processed", "failed", "ignored"],
      default: "processing",
    },
    errorMessage: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
export default WebhookEvent;
