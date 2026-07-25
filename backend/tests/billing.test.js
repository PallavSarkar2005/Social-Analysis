import crypto from "crypto";
import {
  computeOrderAmounts,
  BUILTIN_COUPONS,
  GST_RATE,
  PLAN_PRICES,
  isPaidPlan,
  periodDays,
} from "../config/plans.js";
import { RazorpayProvider } from "../services/payments/RazorpayProvider.js";
import paymentService from "../services/payments/PaymentService.js";

describe("Billing plan pricing", () => {
  it("prices monthly professional with 18% GST", () => {
    const amounts = computeOrderAmounts("professional", "monthly");
    expect(amounts.subtotal).toBe(PLAN_PRICES.professional.monthly);
    expect(amounts.discount).toBe(0);
    expect(amounts.gst).toBe(Math.round(amounts.subtotal * GST_RATE));
    expect(amounts.total).toBe(amounts.subtotal + amounts.gst);
  });

  it("prices annual enterprise with GST", () => {
    const amounts = computeOrderAmounts("enterprise", "annual");
    expect(amounts.subtotal).toBe(82000);
    expect(amounts.total).toBe(82000 + Math.round(82000 * GST_RATE));
  });

  it("applies percent coupon before GST", () => {
    const coupon = BUILTIN_COUPONS.SOCIALIQ20;
    const amounts = computeOrderAmounts("professional", "monthly", coupon);
    expect(amounts.discount).toBe(Math.round(2400 * 0.2));
    expect(amounts.taxable).toBe(2400 - amounts.discount);
    expect(amounts.gst).toBe(Math.round(amounts.taxable * GST_RATE));
    expect(amounts.total).toBe(amounts.taxable + amounts.gst);
  });

  it("respects annual-only coupons", () => {
    const coupon = BUILTIN_COUPONS.ANNUAL15;
    const monthly = computeOrderAmounts("professional", "monthly", coupon);
    const annual = computeOrderAmounts("professional", "annual", coupon);
    expect(monthly.discount).toBe(0);
    expect(annual.discount).toBe(Math.round(24000 * 0.15));
  });

  it("rejects free plan pricing", () => {
    expect(() => computeOrderAmounts("free", "monthly")).toThrow();
  });

  it("helpers identify paid plans and period length", () => {
    expect(isPaidPlan("professional")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
    expect(periodDays("monthly")).toBe(30);
    expect(periodDays("annual")).toBe(365);
  });
});

describe("RazorpayProvider signature verification", () => {
  const keySecret = "test_secret_key";
  const provider = new RazorpayProvider({
    keyId: "rzp_test_abc",
    keySecret,
    webhookSecret: "whsec_test",
  });

  it("verifies valid payment signatures", () => {
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(provider.verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it("rejects tampered payment signatures", () => {
    expect(
      provider.verifyPaymentSignature({
        orderId: "order_123",
        paymentId: "pay_456",
        signature: "deadbeef",
      })
    ).toBe(false);
  });

  it("verifies webhook signatures against raw body", () => {
    const raw = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const signature = crypto.createHmac("sha256", "whsec_test").update(raw).digest("hex");
    expect(provider.verifyWebhookSignature(raw, signature)).toBe(true);
    expect(provider.verifyWebhookSignature(raw, "bad")).toBe(false);
  });
});

describe("PaymentService provider abstraction", () => {
  it("exposes razorpay as default provider", () => {
    const provider = paymentService.getProvider();
    expect(provider.name).toBe("razorpay");
  });

  it("throws for unknown providers", () => {
    expect(() => paymentService.getProvider("unknown_gateway")).toThrow(/not registered/);
  });
});
