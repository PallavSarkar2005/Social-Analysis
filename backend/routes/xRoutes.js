import express from "express";
import { analyzeXProfile } from "../controllers/xController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateXUrl } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/analyze", validateXUrl, analyzeXProfile);

export default router;
