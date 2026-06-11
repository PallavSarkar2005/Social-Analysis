import express from "express";

import {
  syncYoutubeChannel,
  syncAllChannels,
  syncChannelContent,
} from "../controllers/youtubeController.js";

const router = express.Router();

router.post(
  "/sync/:accountId",
  syncYoutubeChannel
);

router.post(
  "/sync-all",
  syncAllChannels
);

router.post(
  "/sync-content/:accountId",
  syncChannelContent
);

export default router;