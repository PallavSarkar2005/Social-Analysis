import client from "./client";

export const getEmailSchedule = async () => {
  const res = await client.get("/api/settings/email-schedule");
  return res.data;
};

export const updateEmailSchedule = async (data) => {
  const res = await client.post("/api/settings/email-schedule", data);
  return res.data;
};

export const getNotificationPreferences = async () => {
  const res = await client.get("/api/settings/notifications");
  return res.data;
};

export const updateNotificationPreferences = async (data) => {
  const res = await client.post("/api/settings/notifications", data);
  return res.data;
};

export const getPrivacyPreferences = async () => {
  const res = await client.get("/api/settings/privacy");
  return res.data;
};

export const updatePrivacyPreferences = async (data) => {
  const res = await client.put("/api/settings/privacy", data);
  return res.data;
};

export const getSecurityPreferences = async () => {
  const res = await client.get("/api/settings/security");
  return res.data;
};

export const updateSecurityPreferences = async (data) => {
  const res = await client.put("/api/settings/security", data);
  return res.data;
};

export const getAdvancedPreferences = async () => {
  const res = await client.get("/api/settings/advanced");
  return res.data;
};

export const updateAdvancedPreferences = async (data) => {
  const res = await client.put("/api/settings/advanced", data);
  return res.data;
};

export const getIntegrations = async () => {
  const res = await client.get("/api/settings/integrations");
  return res.data;
};

export const updateIntegration = async (id, data) => {
  const res = await client.put(`/api/settings/integrations/${id}`, data);
  return res.data;
};

export const listApiKeys = async () => {
  const res = await client.get("/api/settings/api-keys");
  return res.data;
};

export const createApiKey = async (data) => {
  const res = await client.post("/api/settings/api-keys", data);
  return res.data;
};

export const revokeApiKey = async (id) => {
  const res = await client.delete(`/api/settings/api-keys/${id}`);
  return res.data;
};

export const getPlanCatalog = async () => {
  const res = await client.get("/api/settings/plans");
  return res.data;
};

export const exportProfileData = async () => {
  const res = await client.get("/api/settings/data-export/profile");
  return res.data;
};

export const getAccountStats = async () => {
  const res = await client.get("/api/users/account-stats");
  return res.data;
};

export const resetWorkspace = async () => {
  const res = await client.post("/api/users/reset-workspace");
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await client.patch("/api/users/profile", data);
  return res.data;
};

export const updatePassword = async (data) => {
  const res = await client.post("/api/auth/change-password", data);
  return res.data;
};
