import client from "./client";

export const getNotifications = async () => {
  const res = await client.get("/api/notifications");
  return res.data;
};

export const markAsRead = async (id) => {
  const res = await client.put(`/api/notifications/${id}/read`);
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await client.put("/api/notifications/read-all");
  return res.data;
};
