import express from "express";
import {
  createAccount,
  getAccounts,
  deleteAccount,
} from "../controllers/accountController.js";

const router = express.Router();

router.post("/", createAccount);
router.get("/", getAccounts);
router.delete("/:id", deleteAccount);

export default router;
