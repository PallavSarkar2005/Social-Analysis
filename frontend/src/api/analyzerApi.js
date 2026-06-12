import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const analyzeYoutubeUrl = async (url) => {
  const response = await API.post("/analyzer/youtube", { url });

  return response.data;
};

export const analyzeXUrl = async (url) => {
  const response = await API.post("/x/analyze", { url });

  return response.data;
};
