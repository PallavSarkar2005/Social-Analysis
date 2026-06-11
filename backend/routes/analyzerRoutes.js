import express from "express";

import {
  analyzeYoutubeUrl,
} from "../controllers/analyzerController.js";

const router = express.Router();

router.post(
  "/youtube",
  analyzeYoutubeUrl
);

export default router;