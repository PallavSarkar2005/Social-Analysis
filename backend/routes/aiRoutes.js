import express from "express";
import { getVideoInsights } from "../controllers/aiController.js";

const router = express.Router();

router.post("/video-insights", getVideoInsights);

export default router;