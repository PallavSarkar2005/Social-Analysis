import express from "express";
import { compareAccounts } from "../controllers/compareController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateCompareAccounts } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", validateCompareAccounts, compareAccounts);

export default router;