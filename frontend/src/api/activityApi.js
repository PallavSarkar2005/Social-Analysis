import client from "./client";

export const getActivityLogs = async () => {
  const res = await client.get("/api/activity");
  return res.data;
};
