import express from "express";

import {
  getChannelHistory,
} from "../controllers/historyController.js";

const router = express.Router();

router.get(
  "/:accountId",
  getChannelHistory
);

export default router;