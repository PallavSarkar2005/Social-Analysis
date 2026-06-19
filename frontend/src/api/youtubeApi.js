import client from "./client";

export const syncYoutubeChannel = async (accountId) => {
  const response = await client.post(`/api/youtube/sync/${accountId}`);
  return response.data;
};

export const syncChannelContent = async (accountId) => {
  const response = await client.post(`/api/youtube/sync-content/${accountId}`);
  return response.data;
};

export const syncAllChannels = async () => {
  const response = await client.post("/api/youtube/sync-all");
  return response.data;
};
