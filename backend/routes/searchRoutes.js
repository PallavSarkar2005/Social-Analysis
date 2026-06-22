import express from "express";
import { globalSearch } from "../controllers/searchController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateSearchQuery } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", validateSearchQuery, globalSearch);

export default router;
