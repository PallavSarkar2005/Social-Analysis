import express from "express";
import { getVideoInsights, chatAssistant } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/video-insights", getVideoInsights);
router.post("/chat", chatAssistant);

export default router;