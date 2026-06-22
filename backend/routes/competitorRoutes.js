import express from "express";
import {
  addCompetitor,
  removeCompetitor,
  listCompetitors,
} from "../controllers/competitorController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateAddCompetitor,
  validateMongoId,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply auth middleware to protect all competitor routes
router.use(protect);

router.get("/", listCompetitors);
router.post("/", validateAddCompetitor, addCompetitor);
router.delete("/:id", validateMongoId, removeCompetitor);

export default router;
