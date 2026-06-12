import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import cron from "node-cron";
import { syncAllYoutubeChannels } from "./jobs/youtubeSyncJob.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { startCronJobs } from "./jobs/cronJobs.js";
import analyzerRoutes from "./routes/analyzerRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import aiChannelRoutes from "./routes/aiChannelRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import { startSnapshotJob } from "./jobs/snapshotJob.js";
import xRoutes from "./routes/xRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";

dotenv.config();
console.log("MONGO_URI:", process.env.MONGO_URI);

connectDB();

// startCronJobs();
startSnapshotJob();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/youtube", youtubeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/analyzer", analyzerRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai", aiChannelRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/x", xRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Social Analytics API Running 🚀",
  });
});

app.use("/api/accounts", accountRoutes);

const PORT = process.env.PORT || 5000;

cron.schedule("0 * * * *", async () => {
  await syncAllYoutubeChannels();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
