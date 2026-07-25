import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "professional", "enterprise"],
      default: "free",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "past_due", "trialing"],
      default: "active",
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual", null],
      default: null,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    renewalDate: {
      type: Date,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
    },
    gracePeriodEndsAt: {
      type: Date,
    },
    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe", "paypal", "none"],
      default: "none",
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
    },
    lastPaymentId: {
      type: String,
      sparse: true,
    },
    invoiceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],
    pendingPlan: {
      type: String,
      enum: ["free", "professional", "enterprise", null],
      default: null,
    },
    pendingBillingCycle: {
      type: String,
      enum: ["monthly", "annual", null],
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionSchema.pre("save", function preSave(next) {
  if (!this.renewalDate && this.currentPeriodEnd) {
    this.renewalDate = this.currentPeriodEnd;
  }
  next();
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
