import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getChannelInsights = async (channel) => {
  const response = await axios.post(`${API}/ai/channel-insights`, channel);

  return response.data;
};
