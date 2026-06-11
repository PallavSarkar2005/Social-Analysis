import express from "express";

import { getChannelInsights } from "../controllers/aiChannelController.js";

const router = express.Router();

router.post("/channel-insights", getChannelInsights);

export default router;
