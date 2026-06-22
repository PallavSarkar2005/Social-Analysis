import express from "express";
import { analyzeYoutubeUrl } from "../controllers/analyzerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateYoutubeUrl } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/youtube", validateYoutubeUrl, analyzeYoutubeUrl);

export default router;