import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const compareAccounts = async (url1, url2) => {
  const response = await API.post("/compare", {
    url1,
    url2,
  });

  return response.data;
};