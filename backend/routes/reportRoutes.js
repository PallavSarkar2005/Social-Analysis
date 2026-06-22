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

const router = express.Router();

router.use(protect);

router.post("/", validateSaveReport, saveReport);
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
