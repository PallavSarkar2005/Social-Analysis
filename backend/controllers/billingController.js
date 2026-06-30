import Razorpay from "razorpay";
import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";
import Usage from "../models/Usage.js";
import Account from "../models/Account.js";
import { PLAN_LIMITS } from "../middleware/billingMiddleware.js";

// Helper to safely instantiate Razorpay
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
  return new Razorpay({ key_id, key_secret });
};

// Plan details in INR
export const PLAN_PRICES = {
  professional: { monthly: 2400, annual: 24000 },
  enterprise: { monthly: 8200, annual: 82000 },
};

// @desc Create Razorpay Order
// @route POST /api/billing/create-order
export const createOrder = async (req, res, next) => {
  try {
    const { plan, billingCycle } = req.body; // plan: 'professional'|'enterprise', billingCycle: 'monthly'|'annual'

    if (!["professional", "enterprise"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan selected" });
    }

    const cycle = billingCycle === "annual" ? "annual" : "monthly";
    const price = PLAN_PRICES[plan][cycle];

    const rzp = getRazorpayInstance();
    const orderOptions = {
      amount: price * 100, // in paise
      currency: "INR",
      receipt: `receipt_${req.user._id.toString().slice(-6)}_${Date.now()}`,
    };

    const order = await rzp.orders.create(orderOptions);

    // Save initial payment record
    const payment = await Payment.create({
      userId: req.user._id,
      amount: price,
      currency: "INR",
      status: "created",
      razorpayOrderId: order.id,
    });

    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    next(error);
  }
};

// @desc Verify Razorpay Payment Signature
// @route POST /api/billing/verify-payment
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan, billingCycle } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !plan) {
      return res.status(400).json({ success: false, message: "Missing required verification credentials" });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    
    // Verify cryptographic signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Security signature mismatch.",
      });
    }

    // Find and update the payment document
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Associated transaction order not found" });
    }

    payment.status = "captured";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    await payment.save();

    // Determine period end date
    const daysToAdd = billingCycle === "annual" ? 365 : 30;
    const periodEnd = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    // Update or Create Subscription
    let subscription = await Subscription.findOne({ userId: req.user._id });
    if (subscription) {
      subscription.plan = plan;
      subscription.status = "active";
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = periodEnd;
      subscription.razorpaySubscriptionId = razorpayPaymentId; // track active payment reference
      subscription.cancelAtPeriodEnd = false;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        userId: req.user._id,
        plan,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        razorpaySubscriptionId: razorpayPaymentId,
      });
    }

    // Update payment reference
    payment.subscriptionId = subscription._id;
    await payment.save();

    // Generate Invoice record
    const invoiceNum = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoice = await Invoice.create({
      userId: req.user._id,
      paymentId: payment._id,
      subscriptionId: subscription._id,
      invoiceNumber: invoiceNum,
      amount: payment.amount,
      currency: payment.currency,
      issuedAt: new Date(),
    });

    // Reset Usage limits cycle
    let usage = await Usage.findOne({ userId: req.user._id });
    if (usage) {
      usage.billingCycleStart = subscription.currentPeriodStart;
      usage.billingCycleEnd = subscription.currentPeriodEnd;
      usage.analysesCount = 0;
      usage.aiRequestsCount = 0;
      usage.reportsCount = 0;
      await usage.save();
    } else {
      await Usage.create({
        userId: req.user._id,
        billingCycleStart: subscription.currentPeriodStart,
        billingCycleEnd: subscription.currentPeriodEnd,
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully. Subscription upgraded.",
      plan: subscription.plan,
      expiryDate: subscription.currentPeriodEnd,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    next(error);
  }
};

// @desc Get Subscription and Limits Usage status
// @route GET /api/billing/status
export const getBillingStatus = async (req, res, next) => {
  try {
    let subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription) {
      subscription = await Subscription.create({
        userId: req.user._id,
        plan: "free",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }

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

    // Monitored creators count
    const trackedCreatorsCount = await Account.countDocuments({ userId: req.user._id, isCompetitor: { $ne: true } });

    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;

    res.status(200).json({
      success: true,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      usage: {
        trackedCreatorsCount,
        maxTrackedCreators: limits.maxTrackedCreators,
        aiRequestsCount: usage.aiRequestsCount,
        maxAiRequestsCount: limits.maxAiRequestsCount,
        reportsCount: usage.reportsCount,
        maxReportsCount: limits.maxReportsCount,
      },
    });
  } catch (error) {
    console.error("Error retrieving billing status:", error);
    next(error);
  }
};

// @desc Cancel Auto-renew / Subscription
// @route POST /api/billing/cancel
export const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription || subscription.plan === "free") {
      return res.status(400).json({ success: false, message: "No active paid subscription found" });
    }

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Auto-renewal turned off. Access remains until the billing cycle expires.",
      subscription,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    next(error);
  }
};

// @desc Get Invoice List
// @route GET /api/billing/invoices
export const getInvoiceHistory = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id }).sort({ issuedAt: -1 });
    res.status(200).json({
      success: true,
      invoices,
    });
  } catch (error) {
    console.error("Error retrieving invoices:", error);
    next(error);
  }
};

// @desc Webhook handler for async events
// @route POST /api/billing/webhook
export const webhookHandler = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!webhookSecret || !signature) {
      return res.status(400).json({ success: false, message: "Missing webhook key or signature" });
    }

    // Verify webhook authenticity
    const bodyStr = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyStr)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(403).json({ success: false, message: "Invalid webhook signature" });
    }

    const { event, payload } = req.body;
    console.log(`[Razorpay Webhook Event Received]: ${event}`);

    if (event === "payment.captured") {
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;
      const amount = payload.payment.entity.amount / 100;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status !== "captured") {
        payment.status = "captured";
        payment.razorpayPaymentId = paymentId;
        await payment.save();

        let subscription = await Subscription.findOne({ userId: payment.userId });
        if (subscription) {
          subscription.status = "active";
          subscription.currentPeriodStart = new Date();
          subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await subscription.save();
        }
      }
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
