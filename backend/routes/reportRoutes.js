import express from "express";
import {
  saveReport,
  getReports,
  getReportById,
  deleteReport,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import { validateResult, validateSaveReport } from "../middleware/validationMiddleware.js";

import { checkPlanLimits } from "../middleware/billingMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", validateSaveReport, checkPlanLimits("reports"), saveReport);
router.get("/", getReports);

router.get(
  "/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  getReportById
);

router.delete(
  "/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  deleteReport
);

export default router;
