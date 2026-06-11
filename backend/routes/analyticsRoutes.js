import express from "express";
import {
  getTopVideos,
  getHighestEngagement,
  getChannelSummary,
  compareAccounts,
  getGrowthData,
  getPostingFrequency,
  getTopContent,
  getBestPostingTime,
  getGrowthRate,
  getDashboardOverview,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/top-videos", getTopVideos);

router.get("/highest-engagement", getHighestEngagement);

router.get("/channel-summary/:accountId", getChannelSummary);

router.get("/compare", compareAccounts);

router.get("/growth/:accountId", getGrowthData);

router.get("/posting-frequency/:accountId", getPostingFrequency);

router.get("/top-content/:accountId", getTopContent);

router.get("/best-posting-time/:accountId", getBestPostingTime);

router.get("/growth-rate/:accountId", getGrowthRate);

router.get("/dashboard-overview", getDashboardOverview);

export default router;
