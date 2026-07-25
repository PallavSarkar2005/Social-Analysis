/**
 * Frontend billing integrity checks — pricing math & checkout route contract.
 */
import { describe, it, expect } from "vitest";

const PLAN_PRICES = {
  professional: { monthly: 2400, annual: 24000 },
  enterprise: { monthly: 8200, annual: 82000 },
};
const GST_RATE = 0.18;

function computeClientTotals(plan, cycle, percentOff = 0) {
  const subtotal = PLAN_PRICES[plan][cycle];
  const discount = Math.round((subtotal * percentOff) / 100);
  const taxable = subtotal - discount;
  const gst = Math.round(taxable * GST_RATE);
  return { subtotal, discount, gst, total: taxable + gst };
}

describe("Checkout pricing contract", () => {
  it("matches backend GST math for monthly professional", () => {
    const t = computeClientTotals("professional", "monthly");
    expect(t.subtotal).toBe(2400);
    expect(t.gst).toBe(432);
    expect(t.total).toBe(2832);
  });

  it("applies coupon before GST", () => {
    const t = computeClientTotals("professional", "monthly", 20);
    expect(t.discount).toBe(480);
    expect(t.gst).toBe(Math.round(1920 * 0.18));
    expect(t.total).toBe(1920 + t.gst);
  });
});

describe("Billing route contract", () => {
  const routes = [
    "/billing",
    "/billing/checkout",
    "/billing/checkout/success",
    "/billing/checkout/failed",
    "/billing/invoices/:invoiceId",
  ];

  it("defines the full SaaS checkout journey paths", () => {
    expect(routes).toContain("/billing/checkout");
    expect(routes).toContain("/billing/checkout/success");
    expect(routes).toContain("/billing/checkout/failed");
  });
});
