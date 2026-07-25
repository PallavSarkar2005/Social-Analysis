/**
 * Standalone YouTube Data API v3 probe.
 * No app middleware, no youtubeClient wrapper, no axios interceptors.
 *
 * Usage: node testYoutubeApi.js
 */
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const key = process.env.YOUTUBE_API_KEY;

const maskKey = (k) =>
  !k ? "(empty)" : `${k.substring(0, 4)}${"*".repeat(Math.max(0, k.length - 8))}${k.slice(-4)}`;

console.log("YT KEY present:", !!key);
console.log("YT KEY LENGTH:", key?.length);

const url = "https://www.googleapis.com/youtube/v3/channels";
const params = {
  part: "snippet",
  forHandle: "HimantaBiswaSarma",
  key,
};

console.log("\n--- Request ---");
console.log("URL:", url);
console.log("Params:", { ...params, key: maskKey(params.key) });
console.log("Headers: Authorization: NONE (not set)");

try {
  const response = await axios.get(url, {
    params,
    headers: {},
    validateStatus: () => true,
  });

  console.log("\n--- Response ---");
  console.log("Status:", response.status);
  console.log("Body:", JSON.stringify(response.data, null, 2).slice(0, 2000));

  if (response.status >= 400) {
    console.log("\nAuth diagnosis: Google rejected credentials or request.");
    console.log("error.response.status:", response.status);
    console.log("error.response.data:", JSON.stringify(response.data, null, 2));
  }
} catch (error) {
  console.log("\n--- Error ---");
  console.log("Message:", error.message);
  console.log("error.response.status:", error.response?.status);
  console.log("error.response.data:", JSON.stringify(error.response?.data, null, 2));
}
