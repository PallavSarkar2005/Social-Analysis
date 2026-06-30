import express from "express";
import { getVideoInsights, chatAssistant } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

import { checkPlanLimits } from "../middleware/billingMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/video-insights", checkPlanLimits("aiRequests"), getVideoInsights);
router.post("/chat", checkPlanLimits("aiRequests"), chatAssistant);

export default router;