import express from "express";
import {
  register,
  login,
  logout,
  logoutAll,
  refresh,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  googleSignIn,
  googleConnect,
  googleDisconnect,
  logoutOtherDevices,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateGoogleSignIn,
  validateChangePassword,
  validateResendVerification,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public auth endpoints
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.post("/refresh", refresh);



// Password recovery
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);

// Google Sign-In Callback
router.post("/google", validateGoogleSignIn, googleSignIn);

// Protected auth endpoints
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAll);
router.post("/logout-other", protect, logoutOtherDevices);
router.post("/change-password", protect, validateChangePassword, changePassword);

// Google account linking/unlinking
router.post("/google/connect", protect, validateGoogleSignIn, googleConnect);
router.post("/google/disconnect", protect, googleDisconnect);

export default router;
