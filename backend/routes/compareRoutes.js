import express from "express";
import { compareAccounts } from "../controllers/compareController.js";

const router = express.Router();

router.post("/", compareAccounts);

export default router;