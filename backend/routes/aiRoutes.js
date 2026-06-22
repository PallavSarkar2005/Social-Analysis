import express from "express";
import { getVideoInsights } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/video-insights", getVideoInsights);

export default router;