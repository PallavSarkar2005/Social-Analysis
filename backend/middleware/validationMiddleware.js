import { body, param, query, validationResult } from "express-validator";

// Middleware to run validations and return formatted errors
export const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Registration validations - Enforcing strong password policy
export const validateRegister = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters long")
    .escape(),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  validateResult,
];

// Login validations
export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validateResult,
];

// YouTube URL / Handle validations
export const validateYoutubeUrl = [
  body("url")
    .trim()
    .notEmpty()
    .withMessage("YouTube URL or handle is required")
    .custom((val) => {
      const isYoutubeUrl =
        val.includes("youtube.com") ||
        val.includes("youtu.be") ||
        val.includes("youtube-nocookie.com");
      const isHandle = val.startsWith("@") && /^[a-zA-Z0-9_\-\.]+$/.test(val.slice(1));
      
      if (!isYoutubeUrl && !isHandle) {
        throw new Error("Must be a valid YouTube URL or channel handle (starting with @)");
      }
      return true;
    }),
  validateResult,
];

// X (Twitter) URL / Handle validations
export const validateXUrl = [
  body("url")
    .trim()
    .notEmpty()
    .withMessage("X URL or handle is required")
    .custom((val) => {
      const isHandle = val.startsWith("@") && /^[a-zA-Z0-9_]{1,15}$/.test(val.slice(1));
      const isXUrl =
        val.includes("x.com") ||
        val.includes("twitter.com") ||
        val.includes("t.co");
      
      if (!isHandle && !isXUrl) {
        throw new Error("Must be a valid X profile URL or username starting with @");
      }
      return true;
    }),
  validateResult,
];

// Mongo ID validations
export const validateMongoId = [
  param("id").isMongoId().withMessage("Invalid database ID format"),
  validateResult,
];

export const validateQueryMongoId = (field) => [
  query(field).isMongoId().withMessage(`Invalid ID format for query field: ${field}`),
  validateResult,
];

export const validateBodyMongoId = (field) => [
  body(field).isMongoId().withMessage(`Invalid ID format for body field: ${field}`),
  validateResult,
];

// Global Search Query validation
export const validateSearchQuery = [
  query("query")
    .trim()
    .notEmpty()
    .withMessage("Search query is required")
    .isLength({ min: 1, max: 60 })
    .withMessage("Search query cannot exceed 60 characters")
    .escape(),
  validateResult,
];

// Save Report validation
export const validateSaveReport = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters")
    .escape(),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["insight", "comparison", "analysis"])
    .withMessage("Invalid report type"),
  body("source")
    .trim()
    .notEmpty()
    .withMessage("Source is required")
    .escape(),
  body("content")
    .notEmpty()
    .withMessage("Report content is required"), // Content is detailed text, we will clean it downstream
  validateResult,
];

// Add Competitor validation
export const validateAddCompetitor = [
  body("platform")
    .trim()
    .notEmpty()
    .withMessage("Platform is required")
    .isIn(["youtube", "x"])
    .withMessage("Platform must be either 'youtube' or 'x'"),
  body("urlOrHandle")
    .trim()
    .notEmpty()
    .withMessage("URL or handle is required")
    .custom((val, { req }) => {
      const platform = req.body.platform;
      if (platform === "youtube") {
        const isYoutubeUrl =
          val.includes("youtube.com") ||
          val.includes("youtu.be") ||
          val.includes("youtube-nocookie.com");
        const isHandle = val.startsWith("@") && /^[a-zA-Z0-9_\-\.]+$/.test(val.slice(1));
        const isId = /^[a-zA-Z0-9_-]{24}$/.test(val);
        if (!isYoutubeUrl && !isHandle && !isId) {
          throw new Error("Must be a valid YouTube URL, handle (starting with @), or channel ID");
        }
      } else if (platform === "x") {
        const isHandle = val.startsWith("@") && /^[a-zA-Z0-9_]{1,15}$/.test(val.slice(1));
        const isXUrl =
          val.includes("x.com") ||
          val.includes("twitter.com");
        const isPlainUsername = /^[a-zA-Z0-9_]{1,15}$/.test(val);
        if (!isHandle && !isXUrl && !isPlainUsername) {
          throw new Error("Must be a valid X profile URL, username (starting with @), or handle");
        }
      }
      return true;
    }),
  validateResult,
];

// Compare Accounts validation
export const validateCompareAccounts = [
  body("url1")
    .trim()
    .notEmpty()
    .withMessage("First URL is required")
    .custom((val) => {
      const isYoutubeUrl = val.includes("youtube.com") || val.includes("youtu.be");
      const isXUrl = val.includes("x.com") || val.includes("twitter.com");
      if (!isYoutubeUrl && !isXUrl) {
        throw new Error("First URL must be a valid YouTube or X profile URL");
      }
      return true;
    }),
  body("url2")
    .trim()
    .notEmpty()
    .withMessage("Second URL is required")
    .custom((val, { req }) => {
      const isYoutubeUrl = val.includes("youtube.com") || val.includes("youtu.be");
      const isXUrl = val.includes("x.com") || val.includes("twitter.com");
      if (!isYoutubeUrl && !isXUrl) {
        throw new Error("Second URL must be a valid YouTube or X profile URL");
      }
      // Check that both belong to the same platform
      const u1 = req.body.url1 || "";
      const u1IsYt = u1.includes("youtube.com") || u1.includes("youtu.be");
      const u1IsX = u1.includes("x.com") || u1.includes("twitter.com");
      
      if (u1IsYt && !isYoutubeUrl) {
        throw new Error("Both URLs must be for the same platform (YouTube vs YouTube)");
      }
      if (u1IsX && !isXUrl) {
        throw new Error("Both URLs must be for the same platform (X vs X)");
      }
      return true;
    }),
  validateResult,
];

// Create Account validation
export const validateCreateAccount = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Account name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Account name cannot exceed 100 characters")
    .escape(),
  body("platform")
    .trim()
    .notEmpty()
    .withMessage("Platform is required")
    .isIn(["youtube", "x"])
    .withMessage("Platform must be either 'youtube' or 'x'"),
  body("accountId")
    .trim()
    .notEmpty()
    .withMessage("Account ID is required")
    .escape(),
  body("profileUrl")
    .trim()
    .notEmpty()
    .withMessage("Profile URL is required")
    .isURL()
    .withMessage("Please enter a valid URL"),
  validateResult,
];
