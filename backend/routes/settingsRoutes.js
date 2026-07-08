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
  getPrivacyPreferences,
  updatePrivacyPreferences,
  getSecurityPreferences,
  updateSecurityPreferences,
  getAdvancedPreferences,
  updateAdvancedPreferences,
  getIntegrations,
  updateIntegration,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  getPlanCatalog,
  exportProfileData,
} from "../controllers/settingsController.js";
import { protect, optionalAuth } from "../middleware/authMiddleware.js";
import { body } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.get("/appearance", optionalAuth, getAppearance);
router.get("/plans", getPlanCatalog);

router.use(protect);

router.get("/email-schedule", getEmailSchedule);
router.post("/email-schedule", updateEmailSchedule);

router.get("/notifications", getNotificationPreferences);
router.post("/notifications", updateNotificationPreferences);

router.get("/privacy", getPrivacyPreferences);
router.put("/privacy", updatePrivacyPreferences);

router.get("/security", getSecurityPreferences);
router.put("/security", updateSecurityPreferences);

router.get("/advanced", getAdvancedPreferences);
router.put("/advanced", updateAdvancedPreferences);

router.get("/integrations", getIntegrations);
router.put("/integrations/:id", updateIntegration);

router.get("/api-keys", listApiKeys);
router.post("/api-keys", createApiKey);
router.delete("/api-keys/:id", revokeApiKey);

router.get("/data-export/profile", exportProfileData);

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
