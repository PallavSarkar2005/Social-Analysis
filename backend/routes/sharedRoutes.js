import express from "express";
import { param } from "express-validator";
import { getSharedReport } from "../controllers/reportController.js";
import { validateResult } from "../middleware/validationMiddleware.js";
import { publicShareViewLimiter } from "../middleware/reportRateLimit.js";

const router = express.Router();

router.get(
  "/:token",
  publicShareViewLimiter,
  param("token")
    .isString()
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid share token"),
  validateResult,
  getSharedReport
);

export default router;
