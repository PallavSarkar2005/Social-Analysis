import express from "express";
import {
  createAccount,
  getAccounts,
  deleteAccount,
  updateAccountGroup,
} from "../controllers/accountController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateCreateAccount,
  validateMongoId,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", validateCreateAccount, createAccount);
router.get("/", getAccounts);
router.delete("/:id", validateMongoId, deleteAccount);
router.patch("/:id/group", validateMongoId, updateAccountGroup);

export default router;
