import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getAccounts = async () => {
  const res = await API.get("/accounts");
  return res.data;
};

export const createAccount = async (
  data
) => {
  const res = await API.post(
    "/accounts",
    data
  );

  return res.data;
};

export const deleteAccount = async (
  id
) => {
  const res = await API.delete(
    `/accounts/${id}`
  );

  return res.data;
};