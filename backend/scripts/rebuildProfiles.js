import dotenv from "dotenv";
import connectDB from "../config/db.js";
import { validateEnv } from "../config/env.js";
import { rebuildAllProfiles } from "../services/profileBuilderService.js";

dotenv.config();
validateEnv();

const run = async () => {
  await connectDB();

  try {
    const stats = await rebuildAllProfiles({ logPrefix: "[REBUILD PROFILES]" });
    console.log("[REBUILD PROFILES] Summary:", JSON.stringify(stats));
    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("[REBUILD PROFILES] Fatal error:", error);
    process.exit(1);
  }
};

run();
