// testVideoStats.js

import dotenv from "dotenv";
import { getVideoStats } from "./services/youtubeVideoService.js";

dotenv.config();

const stats = await getVideoStats("GpQSUjNsNm0");

console.log(stats);
