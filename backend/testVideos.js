// testVideos.js

import dotenv from "dotenv";
import { getChannelVideos } from "./services/youtubeVideoService.js";

dotenv.config();

const videos = await getChannelVideos(
  "UCX6OQ3DkcsbYNE6H8uQQuVA"
);

console.log(videos.length);
console.log(videos[0]);
