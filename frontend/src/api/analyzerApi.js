import client from "./client";

export const analyzeYoutubeUrl = async (url, group = "Other", forceRefresh = false) => {
  const response = await client.post("/api/analyzer/youtube", { url, group, forceRefresh });
  return response.data;
};

export const analyzeXUrl = async (url) => {
  const response = await client.post("/api/x/analyze", { url });
  return response.data;
};
