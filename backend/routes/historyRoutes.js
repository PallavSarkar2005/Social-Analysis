import express from "express";
import { getChannelHistory, getAllHistory } from "../controllers/historyController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Base route for global history logs
router.get("/", getAllHistory);

// Specific account history route
router.get("/:accountId", getChannelHistory);

export default router;