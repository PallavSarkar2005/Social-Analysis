import crypto from "crypto";

export const csrfProtection = (req, res, next) => {
  const cookies = req.cookies || {};
  let csrfToken = cookies["XSRF-TOKEN"];

  // Generate a CSRF token if one is not already present in the cookie
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString("hex");
    const isSecureConnection = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("XSRF-TOKEN", csrfToken, {
      secure: isSecureConnection,
      sameSite: isSecureConnection ? "none" : "lax",
      httpOnly: false, // Must be readable by client-side JS
      path: "/",
    });
  }

  req.csrfToken = csrfToken;

  // Bypass validation in test or local development environments to prevent cross-origin port/cookie blockages
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    return next();
  }

  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass CSRF for Razorpay webhooks
  if (req.originalUrl === "/api/billing/webhook" || req.path === "/api/billing/webhook") {
    return next();
  }

  // Validate CSRF token for state-changing requests
  const headerToken = req.headers["x-xsrf-token"] || req.headers["x-csrf-token"];

  if (!headerToken || headerToken !== csrfToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token validation failed. Possible CSRF attack.",
    });
  }

  next();
};
