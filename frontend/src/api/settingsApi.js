import client from "./client";

export const getEmailSchedule = async () => {
  const res = await client.get("/api/settings/email-schedule");
  return res.data;
};

export const updateEmailSchedule = async (data) => {
  const res = await client.post("/api/settings/email-schedule", data);
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await client.post("/api/settings/profile", data);
  return res.data;
};

export const updatePassword = async (data) => {
  const res = await client.post("/api/settings/password", data);
  return res.data;
};
