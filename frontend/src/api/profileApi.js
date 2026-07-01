import client from "./client";

export const getProfileBiography = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}`);
  return response.data;
};

export const getProfileTimeline = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/timeline`);
  return response.data;
};

export const getProfileNews = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/news`);
  return response.data;
};

export const getProfileCharts = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/charts`);
  return response.data;
};

export const getProfileElections = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/elections`);
  return response.data;
};

export const getProfileInfluence = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/influence`);
  return response.data;
};

export const getProfileAiInsights = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/ai-insights`);
  return response.data;
};

export const getProfileHistory = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/history`);
  return response.data;
};

export const getProfileSimilar = async (creatorId) => {
  const response = await client.get(`/api/profile/${creatorId}/similar`);
  return response.data;
};
