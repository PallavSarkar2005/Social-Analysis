import express from "express";
import {
  getAccounts,
  deleteAccount,
  updateAccountGroup,
  updateAccountPartyState,
} from "../controllers/accountController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateMongoId } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAccounts);
router.delete("/:id", validateMongoId, deleteAccount);
router.patch("/:id/group", validateMongoId, updateAccountGroup);
router.patch("/:id/party-state", validateMongoId, updateAccountPartyState);

export default router;
