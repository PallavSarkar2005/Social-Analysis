import {
  ensureCsrfToken,
  validateCsrfToken,
  shouldBypassCsrfValidation,
} from "../services/csrfService.js";

export const csrfProtection = async (req, res, next) => {
  try {
    await ensureCsrfToken(req, res);

    if (shouldBypassCsrfValidation(req)) {
      return next();
    }

    if (!validateCsrfToken(req)) {
      return res.status(403).json({
        success: false,
        message: "CSRF token validation failed. Possible CSRF attack.",
      });
    }

    next();
  } catch (error) {
    console.error("[CSRF] Middleware error:", error.message);
    if (error.stack) console.error(error.stack);

    // Never block safe/read-only requests because CSRF setup failed.
    if (shouldBypassCsrfValidation(req)) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: "Security token service temporarily unavailable. Please retry.",
    });
  }
};
