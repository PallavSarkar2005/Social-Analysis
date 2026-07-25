import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createOrder,
  verifyPayment,
  reportPaymentFailed,
  getBillingStatus,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  changePlan,
  getInvoiceHistory,
  getInvoiceById,
  downloadInvoicePdf,
  getPlans,
  applyCoupon,
  webhookHandler,
} from "../controllers/billingController.js";

const router = express.Router();

// Public webhook (CSRF-exempt; signature-verified)
router.post("/webhook", webhookHandler);

// Public plan catalog (auth optional for pricing pages)
router.get("/plans", getPlans);

// Protected billing APIs
router.use(protect);

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.post("/payment-failed", reportPaymentFailed);
router.post("/apply-coupon", applyCoupon);
router.post("/change-plan", changePlan);
router.post("/cancel", cancelSubscription);
router.post("/resume", resumeSubscription);

router.get("/subscription", getSubscription);
router.get("/status", getBillingStatus);
router.get("/invoices", getInvoiceHistory);
router.get("/invoice/:id", getInvoiceById);
router.get("/invoice/:id/pdf", downloadInvoicePdf);

export default router;
