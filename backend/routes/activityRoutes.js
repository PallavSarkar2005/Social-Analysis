import express from "express";
import { getActivityLogs, logClientError } from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getActivityLogs);
router.post("/log", logClientError);

export default router;
