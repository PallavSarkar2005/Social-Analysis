import express from "express";
import { analyzeXProfile } from "../controllers/xController.js";

const router = express.Router();

router.post("/analyze", analyzeXProfile);

export default router;
