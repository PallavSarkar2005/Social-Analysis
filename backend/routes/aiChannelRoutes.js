import express from "express";
import { getChannelInsights } from "../controllers/aiChannelController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/channel-insights", getChannelInsights);

export default router;
