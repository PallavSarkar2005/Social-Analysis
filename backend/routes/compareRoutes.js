import express from "express";
import { compareAccounts, compareYoutubeCreators } from "../controllers/compareController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateCompareAccounts } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", validateCompareAccounts, compareAccounts);
router.post("/youtube", compareYoutubeCreators);

export default router;