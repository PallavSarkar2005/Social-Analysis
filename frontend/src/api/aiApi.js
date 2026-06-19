import client from "./client";

export const getVideoInsights = async (video) => {
  const response = await client.post("/api/ai/video-insights", video);
  return response.data;
};
