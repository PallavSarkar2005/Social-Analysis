import client from "./client";

export const getBillingStatus = async () => {
  const response = await client.get("/api/billing/status");
  return response.data;
};

export const cancelSubscription = async () => {
  const response = await client.post("/api/billing/cancel");
  return response.data;
};

export const getInvoices = async () => {
  const response = await client.get("/api/billing/invoices");
  return response.data;
};
