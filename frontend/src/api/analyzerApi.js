import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const analyzeYoutubeUrl = async (url) => {
  const response = await API.post("/analyzer/youtube", { url });

  return response.data;
};

export const analyzeXUrl = async (url) => {
  const response = await API.post("/x/analyze", { url });

  return response.data;
};
