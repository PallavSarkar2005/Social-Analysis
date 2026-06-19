import client from "./client";

export const analyzeYoutubeUrl = async (url) => {
  const response = await client.post("/api/analyzer/youtube", { url });
  return response.data;
};

export const analyzeXUrl = async (url) => {
  const response = await client.post("/api/x/analyze", { url });
  return response.data;
};
