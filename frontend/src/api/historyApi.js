import client from "./client";

export const getChannelHistory = async (accountId) => {
  const response = await client.get(`/api/history/${accountId}`);
  return response.data;
};

export const getAllHistory = async () => {
  const response = await client.get("/api/history");
  return response.data;
};

