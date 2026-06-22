import { sanitize } from "express-mongo-sanitize";

// Custom Mongo sanitization middleware for Express 5 compatibility
export const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    sanitize(req.body);
  }
  if (req.query) {
    sanitize(req.query);
  }
  if (req.params) {
    sanitize(req.params);
  }
  next();
};
