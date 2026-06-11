import axios from "axios";

export const getChannelStats = async (channelId) => {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/channels",
    {
      params: {
        part: "snippet,statistics",
        id: channelId,
        key: process.env.YOUTUBE_API_KEY,
      },
    }
  );

  return response.data.items[0];
};