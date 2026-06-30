import express from "express";
import { getGroupCreators, getGroupsList, healImageUrls } from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getGroupsList);
router.post("/heal-images", healImageUrls);
router.get("/:groupName", getGroupCreators);

export default router;
