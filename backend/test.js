import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

try {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/channels",
    {
      params: {
        part: "snippet,statistics",
        id: "UCX6OQ3DkcsbYNE6H8uQQuVA",
        key: process.env.YOUTUBE_API_KEY,
      },
    }
  );

  console.log(response.data);
} catch (error) {
  console.log(error.response?.data || error.message);
}