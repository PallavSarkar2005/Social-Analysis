import mongoose from "mongoose";

const billingAddressSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    companyName: String,
    gstNumber: String,
    phone: String,
    country: String,
    state: String,
    address: String,
    city: String,
    zipCode: String,
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    provider: {
      type: String,
      enum: ["razorpay", "stripe", "paypal"],
      default: "razorpay",
      required: true,
    },
    plan: {
      type: String,
      enum: ["professional", "enterprise"],
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
    },
    amount: {
      type: Number,
      required: true,
    },
    subtotal: { type: Number },
    discount: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    currency: {
      type: String,
      default: "INR",
      required: true,
    },
    status: {
      type: String,
      enum: ["created", "pending", "captured", "failed", "refunded"],
      default: "created",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      unique: true,
    },
    razorpaySignature: {
      type: String,
      sparse: true,
    },
    couponCode: { type: String },
    failureReason: { type: String },
    errorMessage: { type: String },
    paymentMethod: { type: String },
    billingDetails: billingAddressSchema,
    metadata: { type: mongoose.Schema.Types.Mixed },
    verifiedAt: { type: Date },
    capturedAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
