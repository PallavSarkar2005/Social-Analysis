import express from "express";
import {
  exportDashboard,
  exportCompetitors,
  exportSavedReport,
} from "../controllers/exportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/dashboard", exportDashboard);
router.get("/competitors", exportCompetitors);

router.get(
  "/reports/:id",
  param("id").isMongoId().withMessage("Invalid report ID format"),
  validateResult,
  exportSavedReport
);

export default router;
