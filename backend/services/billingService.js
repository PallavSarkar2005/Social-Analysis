import crypto from "crypto";
import Coupon from "../models/Coupon.js";
import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";
import Subscription from "../models/Subscription.js";
import Usage from "../models/Usage.js";
import User from "../models/User.js";
import {
  BUILTIN_COUPONS,
  computeOrderAmounts,
  isPaidPlan,
  periodDays,
  PLAN_CATALOG,
  PLAN_FEATURES,
  PLAN_PRICES,
  GST_RATE,
  CURRENCY,
} from "../config/plans.js";
import paymentService from "./payments/PaymentService.js";
import { generateInvoicePdf } from "./invoicePdfService.js";
import {
  sendPaymentConfirmationEmail,
  sendSubscriptionActivatedEmail,
  sendCancellationConfirmationEmail,
  sendFailedPaymentEmail,
} from "./billingEmailService.js";

export { PLAN_PRICES, PLAN_CATALOG, PLAN_FEATURES, GST_RATE, CURRENCY, computeOrderAmounts };

function nextInvoiceNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `INV-${stamp}-${rand}`;
}

export async function resolveCoupon(code, { plan, billingCycle } = {}) {
  if (!code || typeof code !== "string") return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  let coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) {
    const builtin = BUILTIN_COUPONS[normalized];
    if (builtin) coupon = builtin;
  }
  if (!coupon || coupon.active === false) return null;

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return null;
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) return null;

  if (coupon.applicablePlans?.length && plan && !coupon.applicablePlans.includes(plan)) {
    return null;
  }
  if (
    coupon.applicableCycles?.length &&
    billingCycle &&
    !coupon.applicableCycles.includes(billingCycle === "annual" ? "annual" : "monthly")
  ) {
    return null;
  }

  return {
    code: coupon.code || normalized,
    percentOff: coupon.percentOff,
    amountOff: coupon.amountOff,
    applicablePlans: coupon.applicablePlans,
    applicableCycles: coupon.applicableCycles,
    active: true,
    _id: coupon._id,
  };
}

export async function incrementCouponRedemption(coupon) {
  if (!coupon?._id) return;
  await Coupon.updateOne({ _id: coupon._id }, { $inc: { redemptionCount: 1 } });
}

export async function getOrCreateSubscription(userId) {
  let subscription = await Subscription.findOne({ userId });
  if (!subscription) {
    subscription = await Subscription.create({
      userId,
      plan: "free",
      status: "active",
      billingCycle: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      startDate: new Date(),
      autoRenew: false,
      paymentProvider: "none",
    });
  }
  return subscription;
}

export async function resetUsageCycle(userId, periodStart, periodEnd) {
  let usage = await Usage.findOne({ userId });
  if (usage) {
    usage.billingCycleStart = periodStart;
    usage.billingCycleEnd = periodEnd;
    usage.analysesCount = 0;
    usage.aiRequestsCount = 0;
    usage.reportsCount = 0;
    await usage.save();
    return usage;
  }
  return Usage.create({
    userId,
    billingCycleStart: periodStart,
    billingCycleEnd: periodEnd,
  });
}

/**
 * Activate or upgrade a subscription after verified payment.
 * Idempotent when called with an already-captured payment.
 */
export async function activateSubscriptionFromPayment(payment, { user } = {}) {
  if (!payment || payment.status !== "captured") {
    throw new Error("Payment must be captured before activating subscription");
  }

  const existingInvoice = await Invoice.findOne({ paymentId: payment._id });
  if (existingInvoice) {
    const subscription = await Subscription.findById(payment.subscriptionId);
    return { subscription, invoice: existingInvoice, alreadyProcessed: true };
  }

  const plan = payment.plan;
  const billingCycle = payment.billingCycle || "monthly";
  if (!isPaidPlan(plan)) {
    throw new Error("Invalid plan on payment");
  }

  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + periodDays(billingCycle) * 24 * 60 * 60 * 1000);

  let subscription = await getOrCreateSubscription(payment.userId);
  subscription.plan = plan;
  subscription.status = "active";
  subscription.billingCycle = billingCycle;
  subscription.currentPeriodStart = periodStart;
  subscription.currentPeriodEnd = periodEnd;
  subscription.renewalDate = periodEnd;
  subscription.startDate = subscription.startDate || periodStart;
  subscription.endDate = null;
  subscription.autoRenew = true;
  subscription.cancelAtPeriodEnd = false;
  subscription.cancelledAt = null;
  subscription.gracePeriodEndsAt = null;
  subscription.paymentProvider = payment.provider || "razorpay";
  subscription.razorpayOrderId = payment.razorpayOrderId;
  subscription.lastPaymentId = payment.razorpayPaymentId;
  subscription.pendingPlan = null;
  subscription.pendingBillingCycle = null;
  await subscription.save();

  payment.subscriptionId = subscription._id;
  await payment.save();

  const customer = payment.billingDetails || {};
  const invoice = await Invoice.create({
    userId: payment.userId,
    subscriptionId: subscription._id,
    paymentId: payment._id,
    invoiceNumber: nextInvoiceNumber(),
    plan,
    billingCycle,
    subtotal: payment.subtotal ?? payment.amount,
    discount: payment.discount || 0,
    gst: payment.gst || 0,
    amount: payment.amount,
    total: payment.amount,
    currency: payment.currency || "INR",
    status: "paid",
    paymentMethod: payment.paymentMethod || "razorpay",
    razorpayPaymentId: payment.razorpayPaymentId,
    razorpayOrderId: payment.razorpayOrderId,
    transactionStatus: "success",
    customer,
    issuedAt: new Date(),
    paidAt: payment.capturedAt || new Date(),
    renewalDate: periodEnd,
  });

  subscription.invoiceIds = [...(subscription.invoiceIds || []), invoice._id];
  await subscription.save();

  // Sync legacy User.plan field (map professional -> pro for User enum)
  const userDoc = user || (await User.findById(payment.userId));
  if (userDoc) {
    const userPlanMap = { professional: "pro", enterprise: "enterprise", free: "free" };
    userDoc.plan = userPlanMap[plan] || userDoc.plan;
    await userDoc.save();
  }

  await resetUsageCycle(payment.userId, periodStart, periodEnd);

  try {
    const { pdfPath, pdfUrl } = await generateInvoicePdf(invoice, userDoc);
    invoice.pdfPath = pdfPath;
    invoice.pdfUrl = pdfUrl;
    await invoice.save();
  } catch (pdfErr) {
    console.error("[Billing] Invoice PDF generation failed:", pdfErr.message);
  }

  if (payment.couponCode) {
    const coupon = await resolveCoupon(payment.couponCode, { plan, billingCycle });
    await incrementCouponRedemption(coupon);
  }

  // Fire-and-forget emails
  if (userDoc?.email) {
    Promise.allSettled([
      sendPaymentConfirmationEmail({ user: userDoc, invoice, subscription }),
      sendSubscriptionActivatedEmail({ user: userDoc, subscription }),
    ]).catch(() => {});
  }

  return { subscription, invoice, alreadyProcessed: false };
}

export async function createCheckoutOrder({
  user,
  plan,
  billingCycle,
  couponCode,
  billingDetails,
}) {
  if (!isPaidPlan(plan)) {
    const err = new Error("Invalid plan selected");
    err.statusCode = 400;
    throw err;
  }

  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const coupon = await resolveCoupon(couponCode, { plan, billingCycle: cycle });
  const amounts = computeOrderAmounts(plan, cycle, coupon);

  const order = await paymentService.createOrder({
    amount: amounts.total,
    currency: amounts.currency,
    receipt: `siq_${user._id.toString().slice(-6)}_${Date.now()}`,
    notes: {
      userId: String(user._id),
      plan,
      billingCycle: cycle,
      coupon: coupon?.code || "",
    },
  });

  const payment = await Payment.create({
    userId: user._id,
    provider: "razorpay",
    plan,
    billingCycle: cycle,
    amount: amounts.total,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    gst: amounts.gst,
    currency: amounts.currency,
    status: "created",
    razorpayOrderId: order.id,
    couponCode: coupon?.code || undefined,
    billingDetails: billingDetails || undefined,
    metadata: { gstRate: amounts.gstRate },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    amountMajor: amounts.total,
    currency: order.currency,
    keyId: paymentService.getPublicKey(),
    paymentId: payment._id,
    plan,
    billingCycle: cycle,
    pricing: amounts,
    coupon: coupon ? { code: coupon.code, percentOff: coupon.percentOff, amountOff: coupon.amountOff } : null,
    features: PLAN_FEATURES[plan] || [],
    renewalDate: new Date(Date.now() + periodDays(cycle) * 24 * 60 * 60 * 1000),
  };
}

export async function verifyAndActivatePayment({
  user,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  billingDetails,
}) {
  const valid = paymentService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!valid) {
    const err = new Error("Payment verification failed. Security signature mismatch.");
    err.statusCode = 400;
    throw err;
  }

  // Duplicate payment ID guard
  const existingByPaymentId = await Payment.findOne({ razorpayPaymentId });
  if (existingByPaymentId && existingByPaymentId.status === "captured") {
    const result = await activateSubscriptionFromPayment(existingByPaymentId, { user });
    return { ...result, duplicate: true };
  }

  const payment = await Payment.findOne({ razorpayOrderId, userId: user._id });
  if (!payment) {
    const err = new Error("Associated transaction order not found");
    err.statusCode = 404;
    throw err;
  }

  if (payment.status === "captured") {
    const result = await activateSubscriptionFromPayment(payment, { user });
    return { ...result, duplicate: true };
  }

  payment.status = "captured";
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.verifiedAt = new Date();
  payment.capturedAt = new Date();
  if (billingDetails) {
    payment.billingDetails = { ...(payment.billingDetails?.toObject?.() || payment.billingDetails || {}), ...billingDetails };
  }
  await payment.save();

  return activateSubscriptionFromPayment(payment, { user });
}

export async function markPaymentFailed({ razorpayOrderId, userId, reason }) {
  const payment = await Payment.findOne({ razorpayOrderId, ...(userId ? { userId } : {}) });
  if (!payment) return null;
  if (payment.status === "captured") return payment;

  payment.status = "failed";
  payment.failureReason = reason || "Payment failed";
  payment.errorMessage = reason || "Payment failed";
  await payment.save();

  const user = await User.findById(payment.userId);
  if (user?.email) {
    sendFailedPaymentEmail({ user, reason, plan: payment.plan }).catch(() => {});
  }
  return payment;
}

export async function cancelUserSubscription(user, { immediate = false } = {}) {
  const subscription = await getOrCreateSubscription(user._id);
  if (subscription.plan === "free") {
    const err = new Error("No active paid subscription found");
    err.statusCode = 400;
    throw err;
  }

  if (immediate) {
    subscription.status = "cancelled";
    subscription.plan = "free";
    subscription.billingCycle = null;
    subscription.autoRenew = false;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = new Date();
    subscription.endDate = new Date();
    subscription.paymentProvider = "none";
  } else {
    subscription.cancelAtPeriodEnd = true;
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
  }
  await subscription.save();

  sendCancellationConfirmationEmail({ user, subscription }).catch(() => {});
  return subscription;
}

export async function resumeUserSubscription(user) {
  const subscription = await getOrCreateSubscription(user._id);
  if (subscription.plan === "free" || subscription.status === "expired") {
    const err = new Error("No cancellable paid subscription to resume");
    err.statusCode = 400;
    throw err;
  }

  subscription.cancelAtPeriodEnd = false;
  subscription.autoRenew = true;
  subscription.cancelledAt = null;
  if (subscription.status === "cancelled" && subscription.currentPeriodEnd > new Date()) {
    subscription.status = "active";
  }
  await subscription.save();
  return subscription;
}

export async function changePlanIntent(user, { plan, billingCycle }) {
  if (!isPaidPlan(plan)) {
    const err = new Error("Invalid target plan");
    err.statusCode = 400;
    throw err;
  }
  const subscription = await getOrCreateSubscription(user._id);
  const cycle = billingCycle === "annual" ? "annual" : "monthly";

  // Same plan+cycle: no-op
  if (subscription.plan === plan && subscription.billingCycle === cycle && subscription.status === "active") {
    return { action: "noop", subscription };
  }

  // Downgrade scheduled for period end; upgrade requires checkout
  const rank = { free: 0, professional: 1, enterprise: 2 };
  const isDowngrade = rank[plan] < rank[subscription.plan];

  if (isDowngrade && subscription.status === "active" && subscription.plan !== "free") {
    subscription.pendingPlan = plan;
    subscription.pendingBillingCycle = cycle;
    await subscription.save();
    return { action: "scheduled_downgrade", subscription, requiresCheckout: false };
  }

  return {
    action: "requires_checkout",
    requiresCheckout: true,
    plan,
    billingCycle: cycle,
    pricing: computeOrderAmounts(plan, cycle),
    subscription,
  };
}

export default {
  resolveCoupon,
  createCheckoutOrder,
  verifyAndActivatePayment,
  activateSubscriptionFromPayment,
  markPaymentFailed,
  cancelUserSubscription,
  resumeUserSubscription,
  changePlanIntent,
  getOrCreateSubscription,
  computeOrderAmounts,
};
