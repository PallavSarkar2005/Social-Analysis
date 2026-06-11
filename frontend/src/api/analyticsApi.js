import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getTopVideos = async () => {
  const res = await API.get("/analytics/top-videos");
  return res.data;
};

export const getHighestEngagement = async () => {
  const res = await API.get("/analytics/highest-engagement");

  return res.data;
};

export const getDashboardOverview = async () => {
  const res = await API.get("/analytics/dashboard-overview");

  return res.data;
};

export const getCompareAccounts = async () => {
  const res = await API.get("/analytics/compare");

  return res.data;
};
export const getGrowthData = async (
  accountId
) => {
  const res = await API.get(
    `/analytics/growth/${accountId}`
  );

  return res.data;
};