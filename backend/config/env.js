import dotenv from "dotenv";
dotenv.config();

const REQUIRED_ENV_VARS = ["MONGO_URI", "YOUTUBE_API_KEY", "GROQ_API_KEY"];

export const validateEnv = () => {
  const missing = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("==================================================");
    console.error("CRITICAL CONFIGURATION ERROR: MISSING SECRETS!");
    console.error("The following required variables must be defined in your .env file:");
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error("==================================================");
    process.exit(1);
  }

  // Ensure default port fallback is safe
  if (!process.env.PORT) {
    process.env.PORT = "5000";
    console.log(`[Config] PORT variable undefined. Falling back to default: 5000`);
  }

  console.log("[Config] All required environment variables successfully validated.");
};
