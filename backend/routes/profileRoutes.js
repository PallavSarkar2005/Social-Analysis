import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getProfile,
  getTimeline,
  getNews,
  getCharts,
  getElections,
  getInfluence,
  getAiInsights,
  getHistory,
  getSimilar,
  chatProfile,
} from "../controllers/profileController.js";

const router = express.Router();

// All profile endpoints are protected by authentication middleware
router.use(protect);

router.get("/:creatorId", getProfile);
router.get("/:creatorId/timeline", getTimeline);
router.get("/:creatorId/news", getNews);
router.get("/:creatorId/charts", getCharts);
router.get("/:creatorId/elections", getElections);
router.get("/:creatorId/influence", getInfluence);
router.get("/:creatorId/ai-insights", getAiInsights);
router.get("/:creatorId/history", getHistory);
router.get("/:creatorId/similar", getSimilar);
router.post("/:creatorId/chat", chatProfile);

export default router;
