import express from "express";
import {
  getEmailSchedule,
  updateEmailSchedule,
  updateProfile,
  updatePassword,
  getNotificationPreferences,
  updateNotificationPreferences,
  getAppearance,
  updateAppearance,
} from "../controllers/settingsController.js";
import { protect, optionalAuth } from "../middleware/authMiddleware.js";
import { body } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public read — guests use defaults; logged-in users get saved prefs (no 401 on boot)
router.get("/appearance", optionalAuth, getAppearance);

router.use(protect);

router.get("/email-schedule", getEmailSchedule);
router.post("/email-schedule", updateEmailSchedule);

router.get("/notifications", getNotificationPreferences);
router.post("/notifications", updateNotificationPreferences);

router.post(
  "/profile",
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("Valid email is required"),
  validateResult,
  updateProfile
);

router.post(
  "/password",
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage("New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  validateResult,
  updatePassword
);

router.put("/appearance", updateAppearance);

export default router;
