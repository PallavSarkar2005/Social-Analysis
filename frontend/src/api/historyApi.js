import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getChannelHistory =
  async (accountId) => {
    const response = await API.get(
      `/history/${accountId}`
    );

    return response.data;
  };