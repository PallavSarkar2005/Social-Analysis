import client from "./client";

export const getTopVideos = async () => {
  const res = await client.get("/api/analytics/top-videos");
  return res.data;
};

export const getHighestEngagement = async () => {
  const res = await client.get("/api/analytics/highest-engagement");
  return res.data;
};

export const getChannelSummary = async (accountId) => {
  const res = await client.get(`/api/analytics/channel-summary/${accountId}`);
  return res.data;
};

export const getCompareAccounts = async () => {
  const res = await client.get("/api/analytics/compare");
  return res.data;
};

export const getGrowthData = async (accountId) => {
  const res = await client.get(`/api/analytics/growth/${accountId}`);
  return res.data;
};

export const getPostingFrequency = async (accountId) => {
  const res = await client.get(`/api/analytics/posting-frequency/${accountId}`);
  return res.data;
};

export const getTopContent = async (accountId) => {
  const res = await client.get(`/api/analytics/top-content/${accountId}`);
  return res.data;
};

export const getBestPostingTime = async (accountId) => {
  const res = await client.get(`/api/analytics/best-posting-time/${accountId}`);
  return res.data;
};

export const getGrowthRate = async (accountId) => {
  const res = await client.get(`/api/analytics/growth-rate/${accountId}`);
  return res.data;
};

export const getDashboardOverview = async () => {
  const res = await client.get("/api/analytics/dashboard-overview");
  return res.data;
};

export const getForecast = async (accountId) => {
  const res = await client.get(`/api/analytics/forecast/${accountId}`);
  return res.data;
};
