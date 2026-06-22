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
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateRegister,
  validateLogin,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public auth endpoints
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protected auth endpoints
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAll);

export default router;
