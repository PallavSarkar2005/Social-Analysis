import Account from "../models/Account.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import WebhookEvent from "../models/WebhookEvent.js";
import User from "../models/User.js";
import Usage from "../models/Usage.js";
import crypto from "crypto";
import { PLAN_LIMITS } from "../middleware/billingMiddleware.js";
import {
  PLAN_CATALOG,
  PLAN_PRICES,
  GST_RATE,
  CURRENCY,
  createCheckoutOrder,
  verifyAndActivatePayment,
  markPaymentFailed,
  cancelUserSubscription,
  resumeUserSubscription,
  changePlanIntent,
  getOrCreateSubscription,
  resolveCoupon,
  computeOrderAmounts,
  activateSubscriptionFromPayment,
} from "../services/billingService.js";
import paymentService from "../services/payments/PaymentService.js";
import { generateInvoicePdf } from "../services/invoicePdfService.js";
import fs from "fs";

// Re-export for settingsController compatibility
export { PLAN_PRICES };

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

// @desc List available plans
// @route GET /api/billing/plans
export const getPlans = async (_req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      currency: CURRENCY,
      gstRate: GST_RATE,
      plans: PLAN_CATALOG,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Apply / preview coupon
// @route POST /api/billing/apply-coupon
export const applyCoupon = async (req, res, next) => {
  try {
    const { code, plan, billingCycle } = req.body;
    if (!code || !plan) return badRequest(res, "Coupon code and plan are required");

    const coupon = await resolveCoupon(code, { plan, billingCycle });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or expired coupon code" });
    }

    const pricing = computeOrderAmounts(plan, billingCycle || "monthly", coupon);
    res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        percentOff: coupon.percentOff,
        amountOff: coupon.amountOff,
      },
      pricing,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create Razorpay Order for checkout
// @route POST /api/billing/create-order
export const createOrder = async (req, res, next) => {
  try {
    const { plan, billingCycle, couponCode, billingDetails } = req.body;

    const result = await createCheckoutOrder({
      user: req.user,
      plan,
      billingCycle,
      couponCode,
      billingDetails,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Error creating Razorpay order:", error);
    next(error);
  }
};

// @desc Verify Razorpay payment signature and activate subscription
// @route POST /api/billing/verify-payment
export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      billingDetails,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return badRequest(res, "Missing required verification credentials");
    }

    const { subscription, invoice, alreadyProcessed, duplicate } = await verifyAndActivatePayment({
      user: req.user,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      billingDetails,
    });

    res.status(200).json({
      success: true,
      message: alreadyProcessed || duplicate
        ? "Payment already verified. Subscription is active."
        : "Payment verified successfully. Subscription upgraded.",
      plan: subscription.plan,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      expiryDate: subscription.currentPeriodEnd,
      renewalDate: subscription.renewalDate,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice._id,
      razorpayPaymentId: invoice.razorpayPaymentId,
      razorpayOrderId: invoice.razorpayOrderId,
      amountPaid: invoice.total || invoice.amount,
      gst: invoice.gst,
      currency: invoice.currency,
      duplicate: Boolean(duplicate || alreadyProcessed),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Error verifying payment:", error);
    next(error);
  }
};

// @desc Report client-side payment failure (does not change subscription)
// @route POST /api/billing/payment-failed
export const reportPaymentFailed = async (req, res, next) => {
  try {
    const { razorpayOrderId, reason } = req.body;
    if (!razorpayOrderId) return badRequest(res, "Order ID is required");

    const payment = await markPaymentFailed({
      razorpayOrderId,
      userId: req.user._id,
      reason,
    });

    res.status(200).json({
      success: true,
      message: "Payment failure recorded. Subscription unchanged.",
      payment: payment
        ? { id: payment._id, status: payment.status, failureReason: payment.failureReason }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current subscription (alias-friendly)
// @route GET /api/billing/subscription  |  GET /api/billing/status
export const getBillingStatus = async (req, res, next) => {
  try {
    const subscription = await getOrCreateSubscription(req.user._id);

    let usage = await Usage.findOne({
      userId: req.user._id,
      billingCycleStart: { $lte: new Date() },
      billingCycleEnd: { $gte: new Date() },
    });

    if (!usage) {
      usage = await Usage.create({
        userId: req.user._id,
        billingCycleStart: subscription.currentPeriodStart,
        billingCycleEnd: subscription.currentPeriodEnd,
      });
    }

    const trackedCreatorsCount = await Account.countDocuments({
      userId: req.user._id,
      isCompetitor: { $ne: true },
    });

    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;

    res.status(200).json({
      success: true,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        renewalDate: subscription.renewalDate || subscription.currentPeriodEnd,
        nextBillingDate: subscription.autoRenew
          ? subscription.renewalDate || subscription.currentPeriodEnd
          : null,
        autoRenew: subscription.autoRenew,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        paymentProvider: subscription.paymentProvider,
        paymentStatus: subscription.status === "past_due" ? "past_due" : subscription.status,
        pendingPlan: subscription.pendingPlan,
        pendingBillingCycle: subscription.pendingBillingCycle,
        gracePeriodEndsAt: subscription.gracePeriodEndsAt,
      },
      usage: {
        trackedCreatorsCount,
        maxTrackedCreators: limits.maxTrackedCreators,
        aiRequestsCount: usage.aiRequestsCount,
        maxAiRequestsCount: limits.maxAiRequestsCount,
        reportsCount: usage.reportsCount,
        maxReportsCount: limits.maxReportsCount,
        allowPdfExport: limits.allowPdfExport,
      },
      razorpayKeyId: paymentService.getPublicKey(),
    });
  } catch (error) {
    console.error("Error retrieving billing status:", error);
    next(error);
  }
};

export const getSubscription = getBillingStatus;

// @desc Cancel subscription (end of period by default)
// @route POST /api/billing/cancel
export const cancelSubscription = async (req, res, next) => {
  try {
    const immediate = Boolean(req.body?.immediate);
    const subscription = await cancelUserSubscription(req.user, { immediate });
    res.status(200).json({
      success: true,
      message: immediate
        ? "Subscription cancelled immediately."
        : "Auto-renewal turned off. Access remains until the billing cycle expires.",
      subscription,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc Resume a cancelled-at-period-end subscription
// @route POST /api/billing/resume
export const resumeSubscription = async (req, res, next) => {
  try {
    const subscription = await resumeUserSubscription(req.user);
    res.status(200).json({
      success: true,
      message: "Auto-renewal resumed successfully.",
      subscription,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc Change plan (upgrade requires checkout; downgrade can be scheduled)
// @route POST /api/billing/change-plan
export const changePlan = async (req, res, next) => {
  try {
    const { plan, billingCycle } = req.body;
    const result = await changePlanIntent(req.user, { plan, billingCycle });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc Invoice history
// @route GET /api/billing/invoices
export const getInvoiceHistory = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id })
      .sort({ issuedAt: -1 })
      .select("-pdfPath")
      .lean();

    res.status(200).json({
      success: true,
      invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Single invoice details
// @route GET /api/billing/invoice/:id
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .select("-pdfPath")
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

// @desc Download invoice PDF
// @route GET /api/billing/invoice/:id/pdf
export const downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      const user = await User.findById(req.user._id);
      const { pdfPath, pdfUrl } = await generateInvoicePdf(invoice, user);
      invoice.pdfPath = pdfPath;
      invoice.pdfUrl = pdfUrl;
      await invoice.save();
    }

    res.download(invoice.pdfPath, `${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    next(error);
  }
};

/**
 * Process a verified webhook payload with idempotency.
 */
async function processWebhookEvent(event, payload) {
  if (event === "payment.captured") {
    const entity = payload?.payment?.entity;
    if (!entity) return { ignored: true };
    const orderId = entity.order_id;
    const paymentId = entity.id;
    const method = entity.method;

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) return { ignored: true, reason: "unknown_order" };

    if (payment.status === "captured" && payment.razorpayPaymentId === paymentId) {
      return { duplicate: true };
    }

    if (payment.status !== "captured") {
      payment.status = "captured";
      payment.razorpayPaymentId = paymentId;
      payment.paymentMethod = method || payment.paymentMethod;
      payment.capturedAt = new Date();
      await payment.save();
    }

    const user = await User.findById(payment.userId);
    await activateSubscriptionFromPayment(payment, { user });
    return { activated: true };
  }

  if (event === "payment.failed") {
    const entity = payload?.payment?.entity;
    if (!entity) return { ignored: true };
    await markPaymentFailed({
      razorpayOrderId: entity.order_id,
      reason: entity.error_description || entity.error_reason || "Payment failed",
    });
    return { failed: true };
  }

  if (event === "refund.processed") {
    const entity = payload?.refund?.entity || payload?.payment?.entity;
    const paymentId = entity?.payment_id || entity?.id;
    if (!paymentId) return { ignored: true };

    const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
    if (payment) {
      payment.status = "refunded";
      await payment.save();
      await Invoice.updateOne(
        { paymentId: payment._id },
        { $set: { status: "refunded", transactionStatus: "refunded" } }
      );
    }
    return { refunded: true };
  }

  // Subscription lifecycle events (when using Razorpay Subscriptions API later)
  if (
    event === "subscription.activated" ||
    event === "subscription.charged" ||
    event === "subscription.completed" ||
    event === "subscription.cancelled"
  ) {
    return { acknowledged: true, event };
  }

  return { ignored: true, reason: "unhandled_event" };
}

// @desc Razorpay webhooks
// @route POST /api/billing/webhook
export const webhookHandler = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    const valid = paymentService.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      return res.status(403).json({ success: false, message: "Invalid webhook signature" });
    }

    const { event, payload } = req.body || {};
    const eventId =
      req.headers["x-razorpay-event-id"] ||
      payload?.payment?.entity?.id ||
      payload?.subscription?.entity?.id ||
      payload?.refund?.entity?.id ||
      crypto
        .createHash("sha256")
        .update(`${event}:${JSON.stringify(payload || {})}`)
        .digest("hex");

    // Idempotency: claim the event
    try {
      await WebhookEvent.create({
        eventId: String(eventId),
        provider: "razorpay",
        event: event || "unknown",
        payloadHash: crypto.createHash("sha256").update(JSON.stringify(payload || {})).digest("hex"),
        status: "processing",
      });
    } catch (dupErr) {
      if (dupErr?.code === 11000) {
        return res.status(200).json({ success: true, duplicate: true, received: true });
      }
      throw dupErr;
    }

    console.log(`[Razorpay Webhook]: ${event} (${eventId})`);

    try {
      const result = await processWebhookEvent(event, payload);
      await WebhookEvent.updateOne(
        { eventId: String(eventId) },
        { $set: { status: "processed", processedAt: new Date() } }
      );
      return res.status(200).json({ success: true, received: true, result });
    } catch (procErr) {
      await WebhookEvent.updateOne(
        { eventId: String(eventId) },
        { $set: { status: "failed", errorMessage: procErr.message } }
      );
      // Return 500 so Razorpay retries
      return res.status(500).json({ success: false, error: procErr.message });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
