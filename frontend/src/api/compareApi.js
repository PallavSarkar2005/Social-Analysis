import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const compareAccounts = async (url1, url2) => {
  const response = await API.post("/compare", {
    url1,
    url2,
  });

  return response.data;
};