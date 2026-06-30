import express from "express";
import {
  exportDashboard,
  exportCompetitors,
  exportSavedReport,
} from "../controllers/exportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

import { checkPlanLimits } from "../middleware/billingMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/dashboard", checkPlanLimits("pdfExport"), exportDashboard);
router.get("/competitors", checkPlanLimits("pdfExport"), exportCompetitors);

router.get(
  "/reports/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  checkPlanLimits("pdfExport"),
  exportSavedReport
);

export default router;
