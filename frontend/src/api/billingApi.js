import client from "./client";

export const getBillingStatus = async () => {
  const response = await client.get("/api/billing/status");
  return response.data;
};

export const getSubscription = async () => {
  const response = await client.get("/api/billing/subscription");
  return response.data;
};

export const getBillingPlans = async () => {
  const response = await client.get("/api/billing/plans");
  return response.data;
};

export const createBillingOrder = async (payload) => {
  const response = await client.post("/api/billing/create-order", payload);
  return response.data;
};

export const verifyBillingPayment = async (payload) => {
  const response = await client.post("/api/billing/verify-payment", payload);
  return response.data;
};

export const reportPaymentFailed = async (payload) => {
  const response = await client.post("/api/billing/payment-failed", payload);
  return response.data;
};

export const applyCoupon = async (payload) => {
  const response = await client.post("/api/billing/apply-coupon", payload);
  return response.data;
};

export const changePlan = async (payload) => {
  const response = await client.post("/api/billing/change-plan", payload);
  return response.data;
};

export const cancelSubscription = async (payload = {}) => {
  const response = await client.post("/api/billing/cancel", payload);
  return response.data;
};

export const resumeSubscription = async () => {
  const response = await client.post("/api/billing/resume");
  return response.data;
};

export const getInvoices = async () => {
  const response = await client.get("/api/billing/invoices");
  return response.data;
};

export const getInvoice = async (id) => {
  const response = await client.get(`/api/billing/invoice/${id}`);
  return response.data;
};

export const getInvoicePdfUrl = (id) => `/api/billing/invoice/${id}/pdf`;
