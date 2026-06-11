import axios from "axios";

const API = "http://localhost:5000/api";

export const getChannelInsights = async (channel) => {
  const response = await axios.post(`${API}/ai/channel-insights`, channel);

  return response.data;
};
