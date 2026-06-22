import express from "express";
import {
  getTopVideos,
  getHighestEngagement,
  getChannelSummary,
  compareAccounts,
  getGrowthData,
  getPostingFrequency,
  getTopContent,
  getBestPostingTime,
  getGrowthRate,
  getDashboardOverview,
  getForecast,
} from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/top-videos", getTopVideos);
router.get("/highest-engagement", getHighestEngagement);
router.get("/dashboard-overview", getDashboardOverview);
router.get("/compare", compareAccounts);

// Param validations for endpoints requiring accountId
router.get(
  "/channel-summary/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getChannelSummary
);

router.get(
  "/growth/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getGrowthData
);

router.get(
  "/posting-frequency/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getPostingFrequency
);

router.get(
  "/top-content/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getTopContent
);

router.get(
  "/best-posting-time/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getBestPostingTime
);

router.get(
  "/growth-rate/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getGrowthRate
);

router.get(
  "/forecast/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  getForecast
);

export default router;
