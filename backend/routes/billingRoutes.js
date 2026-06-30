import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createOrder,
  verifyPayment,
  getBillingStatus,
  cancelSubscription,
  getInvoiceHistory,
  webhookHandler,
} from "../controllers/billingController.js";

const router = express.Router();

// Webhook endpoint (must be publicly accessible without protect token auth)
router.post("/webhook", webhookHandler);

// Protected routes
router.use(protect);
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/status", getBillingStatus);
router.post("/cancel", cancelSubscription);
router.get("/invoices", getInvoiceHistory);

export default router;
