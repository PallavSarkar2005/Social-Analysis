// Recursive XSS sanitization middleware for Express 5 compatibility
const cleanXssString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const cleanXssObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    if (typeof obj === "string") {
      return cleanXssString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanXssObject);
  }

  const cleaned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cleaned[key] = cleanXssObject(obj[key]);
    }
  }
  return cleaned;
};

export const xssSanitizer = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        req.body[key] = cleanXssObject(req.body[key]);
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (Object.prototype.hasOwnProperty.call(req.query, key)) {
        req.query[key] = cleanXssObject(req.query[key]);
      }
    }
  }
  if (req.params) {
    for (const key in req.params) {
      if (Object.prototype.hasOwnProperty.call(req.params, key)) {
        req.params[key] = cleanXssObject(req.params[key]);
      }
    }
  }
  next();
};
