import mongoose from "mongoose";
import dotenv from "dotenv";
import { youtubeGet } from "./utils/youtubeClient.js";
import YoutubeCache from "./models/YoutubeCache.js";
import ApiUsage from "./models/ApiUsage.js";

dotenv.config();

async function runTests() {
  console.log("Starting Youtube Client Verification Tests...");
  
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is missing from env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  // Clear previous caches and logs for a clean test
  await YoutubeCache.deleteMany({});
  await ApiUsage.deleteMany({});
  console.log("Cleared temporary caches and logs.");

  // 1. Test 1: Fetch Channel statistics (should be cache miss)
  console.log("\n--- TEST 1: Fetching channel statistics (First run, should be cache miss) ---");
  const testChannelId = "UCX6OQ3DkcsbYNE6H8uQQuVA"; // PewDiePie
  
  const start = Date.now();
  const res1 = await youtubeGet(
    "getChannelStats",
    "https://www.googleapis.com/youtube/v3/channels",
    { part: "snippet,statistics", id: testChannelId }
  );
  console.log("Res1 Cached Status (expected: false):", res1.cached);
  console.log("Fetch took:", Date.now() - start, "ms");
  console.log("Title:", res1.data.items[0].snippet.title);

  // 2. Test 2: Fetch Channel statistics again (should be cache hit)
  console.log("\n--- TEST 2: Fetching channel statistics again (Second run, should be cache hit) ---");
  const start2 = Date.now();
  const res2 = await youtubeGet(
    "getChannelStats",
    "https://www.googleapis.com/youtube/v3/channels",
    { part: "snippet,statistics", id: testChannelId }
  );
  console.log("Res2 Cached Status (expected: true):", res2.cached);
  console.log("Fetch took:", Date.now() - start2, "ms (should be very fast)");
  console.log("Title:", res2.data.items[0].snippet.title);

  // 3. Test 3: Force refresh (should bypass cache)
  console.log("\n--- TEST 3: Fetching channel statistics with forceRefresh=true (should bypass cache) ---");
  const start3 = Date.now();
  const res3 = await youtubeGet(
    "getChannelStats",
    "https://www.googleapis.com/youtube/v3/channels",
    { part: "snippet,statistics", id: testChannelId },
    true // forceRefresh
  );
  console.log("Res3 Cached Status (expected: false):", res3.cached);
  console.log("Fetch took:", Date.now() - start3, "ms");
  
  // 4. Test 4: Verify ApiUsage and YoutubeCache records in MongoDB
  console.log("\n--- TEST 4: Verifying DB records ---");
  const cacheCount = await YoutubeCache.countDocuments({});
  const logCount = await ApiUsage.countDocuments({});
  console.log("Number of cached items in DB:", cacheCount);
  console.log("Number of API logs in DB:", logCount);

  const logs = await ApiUsage.find({});
  logs.forEach((log, index) => {
    console.log(`Log #${index + 1}: key=${log.apiKey}, endpoint=${log.endpoint}, cost=${log.quotaCost}, cached=${log.cached}, status=${log.status}`);
  });

  await mongoose.disconnect();
  console.log("\nAll tests completed successfully!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  mongoose.disconnect();
});
