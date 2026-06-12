import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getVideoInsights = async (video) => {
  const response = await API.post("/api/ai/video-insights", video);

  return response.data;
};
