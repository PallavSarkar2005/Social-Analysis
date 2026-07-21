import rateLimit from "express-rate-limit";

const skipTest = () => process.env.NODE_ENV === "test";

/** Tight limit for creating/revoking share links */
export const reportShareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  skip: skipTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many share actions. Please try again in a few minutes.",
  },
});

/** Public shared-report fetches — protect token enumeration / scraping */
export const publicShareViewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  skip: skipTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many shared-report requests. Please try again later.",
  },
});

/** Expensive regenerate builds */
export const reportRegenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: skipTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Regenerate limit reached. Please wait before trying again.",
  },
});
