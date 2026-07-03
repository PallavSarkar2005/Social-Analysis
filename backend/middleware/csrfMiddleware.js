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
    next(error);
  }
};
