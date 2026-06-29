import crypto from "crypto";

export const csrfProtection = (req, res, next) => {
  const cookies = req.cookies || {};
  let csrfToken = cookies["XSRF-TOKEN"];

  // Generate a CSRF token if one is not already present in the cookie
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString("hex");
    const host = req.headers.host || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const isProd = process.env.NODE_ENV === "production" || !isLocal;
    res.cookie("XSRF-TOKEN", csrfToken, {
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      httpOnly: false, // Must be readable by client-side JS
      path: "/",
    });
  }

  req.csrfToken = csrfToken;

  // Bypass validation for safe HTTP methods or in testing environment
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
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
