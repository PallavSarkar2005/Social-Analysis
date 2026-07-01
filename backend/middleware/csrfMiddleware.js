import crypto from "crypto";
import { getCsrfCookieOptions } from "../utils/cookieConfig.js";

export const csrfProtection = (req, res, next) => {
  const cookies = req.cookies || {};
  let csrfToken = cookies["XSRF-TOKEN"];

  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  const isSafe = safeMethods.includes(req.method);

  // In test: enforce CSRF validation using predictable test token (not a full bypass)
  if (process.env.NODE_ENV === "test") {
    if (!csrfToken && isSafe) {
      csrfToken = "test-csrf-token";
      res.cookie("XSRF-TOKEN", csrfToken, getCsrfCookieOptions(req));
    }
    if (!csrfToken && !isSafe) {
      return res.status(403).json({
        success: false,
        message: "CSRF token validation failed. Missing CSRF cookie.",
      });
    }
    req.csrfToken = csrfToken;
    if (isSafe) {
      return next();
    }

    const headerToken =
      req.headers["x-xsrf-token"] || req.headers["x-csrf-token"];
    if (!headerToken || headerToken !== csrfToken) {
      return res.status(403).json({
        success: false,
        message: "CSRF token validation failed. Possible CSRF attack.",
      });
    }
    return next();
  }

  // Generate a CSRF token if one is not already present in the cookie (only during safe requests)
  if (!csrfToken) {
    if (isSafe) {
      csrfToken = crypto.randomBytes(32).toString("hex");
      res.cookie("XSRF-TOKEN", csrfToken, getCsrfCookieOptions(req));
    } else {
      return res.status(403).json({
        success: false,
        message: "CSRF token validation failed. Missing CSRF cookie.",
      });
    }
  }

  req.csrfToken = csrfToken;

  // Bypass validation in development to prevent local cross-origin cookie issues
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  if (isSafe) {
    return next();
  }

  // Bypass CSRF for Razorpay webhooks
  if (
    req.originalUrl === "/api/billing/webhook" ||
    req.path === "/api/billing/webhook"
  ) {
    return next();
  }

  // Validate CSRF token for state-changing requests (double-submit cookie pattern)
  const headerToken =
    req.headers["x-xsrf-token"] || req.headers["x-csrf-token"];

  if (!headerToken || headerToken !== csrfToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token validation failed. Possible CSRF attack.",
    });
  }

  next();
};
