import express from "express";
import {
  updateProfile,
  changeEmail,
  deleteAccount,
  getActiveSessions,
  revokeSession,
  resetWorkspace,
  getAccountStats,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All userRoutes are protected by JWT authentication
router.use(protect);

router.patch("/profile", updateProfile);
router.patch("/email", changeEmail);
router.put("/email", changeEmail);
router.delete("/account", deleteAccount);
router.get("/sessions", getActiveSessions);
router.delete("/sessions/:id", revokeSession);
router.get("/account-stats", getAccountStats);
router.post("/reset-workspace", resetWorkspace);

export default router;
