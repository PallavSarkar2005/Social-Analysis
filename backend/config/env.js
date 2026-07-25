import dotenv from "dotenv";
dotenv.config();

const REQUIRED_ENV_VARS = ["MONGO_URI", "GROQ_API_KEY", "JWT_SECRET"];
const MIN_JWT_SECRET_LENGTH = 32;

export const validateEnv = () => {
  const missing = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  const hasYoutubeKey = (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== "") || 
    Object.keys(process.env).some(k => k.startsWith("YOUTUBE_API_KEY_") && process.env[k] && process.env[k].trim() !== "");

  if (!hasYoutubeKey) {
    missing.push("YOUTUBE_API_KEY (or at least one YOUTUBE_API_KEY_*)");
  }

  if (missing.length > 0) {
    console.error("==================================================");
    console.error("CRITICAL CONFIGURATION ERROR: MISSING SECRETS!");
    console.error("The following required variables must be defined in your .env file:");
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error("==================================================");
    process.exit(1);
  }

  if (
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH
  ) {
    console.error("==================================================");
    console.error("CRITICAL CONFIGURATION ERROR: WEAK JWT_SECRET!");
    console.error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`,
    );
    console.error("==================================================");
    process.exit(1);
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.GOOGLE_CLIENT_ID
  ) {
    console.warn(
      "[Config] GOOGLE_CLIENT_ID is not set. Google Sign-In will reject all tokens until configured.",
    );
  }

  // Ensure default port fallback is safe
  if (!process.env.PORT) {
    process.env.PORT = "5000";
    console.log(`[Config] PORT variable undefined. Falling back to default: 5000`);
  }

  console.log("[Config] All required environment variables successfully validated.");
};
