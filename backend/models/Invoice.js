import mongoose from "mongoose";

const customerSnapshotSchema = new mongoose.Schema(
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

const invoiceSchema = new mongoose.Schema(
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
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["professional", "enterprise"],
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["draft", "paid", "void", "refunded"],
      default: "paid",
      index: true,
    },
    paymentMethod: { type: String },
    razorpayPaymentId: { type: String, index: true },
    razorpayOrderId: { type: String, index: true },
    transactionStatus: {
      type: String,
      enum: ["success", "failed", "pending", "refunded"],
      default: "success",
    },
    customer: customerSnapshotSchema,
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
    },
    renewalDate: { type: Date },
    pdfUrl: { type: String },
    pdfPath: { type: String },
  },
  { timestamps: true }
);

invoiceSchema.index({ userId: 1, issuedAt: -1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
