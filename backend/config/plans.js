import { PLAN_LIMITS } from "../middleware/billingMiddleware.js";

/** Plan prices in INR (exclusive of GST). */
export const PLAN_PRICES = {
  professional: { monthly: 2400, annual: 24000 },
  enterprise: { monthly: 8200, annual: 82000 },
};

export const GST_RATE = 0.18;

export const CURRENCY = "INR";

export const PLAN_FEATURES = {
  free: [
    "Up to 2 tracked creators",
    "3 AI strategy requests / month",
    "5 reports / month",
    "Manual sync",
    "Community support",
  ],
  professional: [
    "Up to 15 tracked creators",
    "100 AI strategy requests / cycle",
    "100 reports / cycle",
    "Automated hourly syncs",
    "PDF / Excel exports",
    "Priority email support",
  ],
  enterprise: [
    "Up to 1000 tracked creators",
    "10,000 AI requests / cycle",
    "10,000 reports / cycle",
    "Real-time telemetry",
    "Custom model fine-tuning",
    "Dedicated strategist (24/7)",
  ],
};

export const PLAN_CATALOG = [
  {
    id: "free",
    name: "Starter",
    prices: { monthly: 0, annual: 0 },
    features: PLAN_FEATURES.free,
    limits: PLAN_LIMITS.free,
  },
  {
    id: "professional",
    name: "Professional",
    prices: PLAN_PRICES.professional,
    features: PLAN_FEATURES.professional,
    limits: PLAN_LIMITS.professional,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    prices: PLAN_PRICES.enterprise,
    features: PLAN_FEATURES.enterprise,
    limits: PLAN_LIMITS.enterprise,
  },
];

/** Built-in promo codes (can be overridden by Coupon documents). */
export const BUILTIN_COUPONS = {
  SOCIALIQ20: { code: "SOCIALIQ20", percentOff: 20, maxRedemptions: null, active: true },
  WELCOME10: { code: "WELCOME10", percentOff: 10, maxRedemptions: null, active: true },
  ANNUAL15: { code: "ANNUAL15", percentOff: 15, applicableCycles: ["annual"], active: true },
};

export function isPaidPlan(plan) {
  return plan === "professional" || plan === "enterprise";
}

export function periodDays(billingCycle) {
  return billingCycle === "annual" ? 365 : 30;
}

/**
 * Compute order amounts from plan + optional coupon.
 * @returns {{ subtotal, discount, taxable, gst, total, currency, gstRate }}
 */
export function computeOrderAmounts(plan, billingCycle, coupon = null) {
  if (!isPaidPlan(plan)) {
    throw new Error("Cannot price a free plan");
  }
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const subtotal = PLAN_PRICES[plan][cycle];
  let discount = 0;

  if (coupon && coupon.active !== false) {
    const allowedCycles = coupon.applicableCycles;
    if (!allowedCycles || allowedCycles.length === 0 || allowedCycles.includes(cycle)) {
      if (coupon.percentOff) {
        discount = Math.round((subtotal * Number(coupon.percentOff)) / 100);
      } else if (coupon.amountOff) {
        discount = Math.min(subtotal, Number(coupon.amountOff));
      }
    }
  }

  discount = Math.max(0, Math.min(subtotal, discount));
  const taxable = subtotal - discount;
  const gst = Math.round(taxable * GST_RATE);
  const total = taxable + gst;

  return {
    subtotal,
    discount,
    taxable,
    gst,
    total,
    currency: CURRENCY,
    gstRate: GST_RATE,
    billingCycle: cycle,
  };
}
