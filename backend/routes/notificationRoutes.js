import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);

router.put(
  "/:id/read",
  param("id").isMongoId().withMessage("Invalid notification ID format"),
  validateResult,
  markAsRead
);

export default router;
