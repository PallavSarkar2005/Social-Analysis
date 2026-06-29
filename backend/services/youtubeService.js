import { youtubeGet } from "../utils/youtubeClient.js";

export const getChannelStats = async (channelId, forceRefresh = false) => {
  const { data } = await youtubeGet(
    "getChannelStats",
    "https://www.googleapis.com/youtube/v3/channels",
    {
      part: "snippet,statistics",
      id: channelId,
    },
    forceRefresh
  );

  return data?.items?.[0];
};