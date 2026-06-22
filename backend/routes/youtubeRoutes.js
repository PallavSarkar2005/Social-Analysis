import express from "express";
import {
  syncYoutubeChannel,
  syncAllChannels,
  syncChannelContent,
} from "../controllers/youtubeController.js";
import { protect } from "../middleware/authMiddleware.js";
import { param } from "express-validator";
import { validateResult } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post(
  "/sync/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  syncYoutubeChannel
);

router.post(
  "/sync-all",
  syncAllChannels
);

router.post(
  "/sync-content/:accountId",
  param("accountId").isMongoId().withMessage("Invalid account ID format"),
  validateResult,
  syncChannelContent
);

export default router;