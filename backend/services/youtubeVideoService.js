import axios from "axios";

export const getChannelVideos = async (channelId) => {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        key: process.env.YOUTUBE_API_KEY,
        channelId,
        part: "snippet",
        order: "date",
        maxResults: 20,
      },
    }
  );

  return response.data.items;
};

export const getVideoStats = async (videoId) => {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos",
    {
      params: {
        part: "statistics,snippet",
        id: videoId,
        key: process.env.YOUTUBE_API_KEY,
      },
    }
  );

  return response.data.items[0];
};