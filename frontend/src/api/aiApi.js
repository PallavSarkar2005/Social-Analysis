import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const getVideoInsights = async (video) => {
  const response = await axios.post(`${API_URL}/ai/video-insights`, video);

  return response.data;
};
