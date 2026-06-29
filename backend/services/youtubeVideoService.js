import { youtubeGet } from "../utils/youtubeClient.js";

export const getChannelVideos = async (channelId, forceRefresh = false) => {
  const { data } = await youtubeGet(
    "getChannelVideos",
    "https://www.googleapis.com/youtube/v3/search",
    {
      channelId,
      part: "snippet",
      order: "date",
      maxResults: 20,
    },
    forceRefresh
  );

  return data?.items || [];
};

export const getVideoStats = async (videoId, forceRefresh = false) => {
  const { data } = await youtubeGet(
    "getVideoStats",
    "https://www.googleapis.com/youtube/v3/videos",
    {
      part: "statistics,snippet",
      id: videoId,
    },
    forceRefresh
  );

  return data?.items?.[0];
};