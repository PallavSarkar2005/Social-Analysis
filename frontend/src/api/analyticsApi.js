import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getTopVideos = async () => {
  const res = await API.get("/api/analytics/top-videos");
  return res.data;
};

export const getHighestEngagement = async () => {
  const res = await API.get("/api/analytics/highest-engagement");
  return res.data;
};

export const getDashboardOverview = async () => {
  const res = await API.get("/api/analytics/dashboard-overview");
  return res.data;
};

export const getCompareAccounts = async () => {
  const res = await API.get("/api/analytics/compare");
  return res.data;
};

export const getGrowthData = async (accountId) => {
  const res = await API.get(`/api/analytics/growth/${accountId}`);

  return res.data;
};
