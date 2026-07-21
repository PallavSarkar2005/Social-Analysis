import express from "express";
import {
  saveReport,
  upsertSavedReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  shareReport,
  revokeReportShare,
  getReportHistory,
  regenerateReport,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import {
  validateResult,
  validateSaveReport,
  validatePatchReport,
} from "../middleware/validationMiddleware.js";
import { checkPlanLimits } from "../middleware/billingMiddleware.js";
import {
  reportShareLimiter,
  reportRegenerateLimiter,
} from "../middleware/reportRateLimit.js";

const router = express.Router();

router.use(protect);

router.post("/", validateSaveReport, checkPlanLimits("reports"), saveReport);
router.post("/upsert", validateSaveReport, upsertSavedReport);
router.get("/", getReports);

router.post(
  "/:id/regenerate",
  reportRegenerateLimiter,
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  regenerateReport
);

router.post(
  "/:id/share",
  reportShareLimiter,
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  shareReport
);

router.delete(
  "/:id/share",
  reportShareLimiter,
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  revokeReportShare
);

router.get(
  "/:id/history",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  getReportHistory
);

router.get(
  "/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  getReportById
);

router.patch(
  "/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  validatePatchReport,
  updateReport
);

router.delete(
  "/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  deleteReport
);

export default router;
