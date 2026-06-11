import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getChannelHistory =
  async (accountId) => {
    const response = await API.get(
      `/history/${accountId}`
    );

    return response.data;
  };