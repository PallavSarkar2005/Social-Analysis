import crypto from "crypto";

export const errorHandler = (err, req, res, next) => {
  // Generate a correlation ID for every error — clients display this to users
  const correlationId = "err-" + crypto.randomBytes(4).toString("hex");

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "An unexpected server error occurred";
  let errors = null;

  // Mongoose Bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = "Resource not found. Invalid ID format.";
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value entered for ${duplicatedField}. Please use another value.`;
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Not authorized — invalid token format";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Not authorized — session token has expired";
  }

  // Rate limiter passthrough
  if (err.status === 429) {
    statusCode = 429;
    message = "Too many requests. Please slow down and retry.";
  }

  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    statusCode = 403;
    message = "Request origin not permitted by CORS policy.";
  }

  // CSRF errors
  if (err.code === "EBADCSRFTOKEN") {
    statusCode = 403;
    message = "Invalid or missing CSRF token. Please refresh and try again.";
  }

  // Structured response — NEVER expose raw stack traces or internal details to clients
  const response = {
    success: false,
    message,
    correlationId,
  };

  if (errors) {
    response.errors = errors;
  }

  // Log full details server-side only (never sent to frontend)
  console.error(`[API Error] [${correlationId}] ${statusCode} | ${message}`, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?._id || "unauthenticated",
    ip: req.ip,
    stack: err.stack,
  });

  res.status(statusCode).json(response);
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};
