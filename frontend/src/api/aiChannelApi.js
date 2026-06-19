import client from "./client";

export const getChannelInsights = async (channel) => {
  const response = await client.post("/api/ai/channel-insights", channel);
  return response.data;
};
