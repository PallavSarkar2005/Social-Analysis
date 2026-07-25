import crypto from "crypto";
import Razorpay from "razorpay";
import { PaymentProvider } from "./PaymentProvider.js";

export class RazorpayProvider extends PaymentProvider {
  constructor({ keyId, keySecret, webhookSecret } = {}) {
    super();
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
    this._client = null;
  }

  get name() {
    return "razorpay";
  }

  get isConfigured() {
    return Boolean(
      this.keyId &&
        this.keySecret &&
        !this.keyId.includes("placeholder") &&
        this.keySecret !== "placeholder_secret"
    );
  }

  getClient() {
    if (!this._client) {
      this._client = new Razorpay({
        key_id: this.keyId || "rzp_test_placeholder",
        key_secret: this.keySecret || "placeholder_secret",
      });
    }
    return this._client;
  }

  /**
   * Create a Razorpay Order.
   * @param {{ amount: number, currency?: string, receipt?: string, notes?: object }} options
   * amount is in major currency units (INR rupees); converted to paise.
   */
  async createOrder({ amount, currency = "INR", receipt, notes = {} }) {
    const amountPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      throw new Error("Order amount must be at least ₹1.00");
    }

    const order = await this.getClient().orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes,
    });

    return {
      id: order.id,
      amount: order.amount,
      amountMajor: order.amount / 100,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt,
      raw: order,
    };
  }

  /**
   * Verify checkout payment signature.
   * @returns {boolean}
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;
    const expected = crypto
      .createHmac("sha256", this.keySecret || "placeholder_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
    } catch {
      return false;
    }
  }

  /**
   * Verify webhook signature against raw body buffer/string.
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!this.webhookSecret || !signature) return false;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "");
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(bodyStr).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
    } catch {
      return false;
    }
  }

  async fetchPayment(paymentId) {
    return this.getClient().payments.fetch(paymentId);
  }
}

export default RazorpayProvider;
