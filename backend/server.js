import dotenv from "dotenv";
import { validateEnv } from "./config/env.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
validateEnv();
console.log("YOUTUBE_API_KEY loaded:", !!process.env.YOUTUBE_API_KEY);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import cron from "node-cron";
import { mongoSanitizeMiddleware } from "./middleware/mongoSanitize.js";
import { xssSanitizer } from "./middleware/xssSanitizer.js";
import { cookieParser } from "./middleware/cookieParser.js";
import { csrfProtection } from "./middleware/csrfMiddleware.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import analyzerRoutes from "./routes/analyzerRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import aiChannelRoutes from "./routes/aiChannelRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import xRoutes from "./routes/xRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import competitorRoutes from "./routes/competitorRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// Jobs & Schedulers
import { syncAllYoutubeChannels } from "./jobs/youtubeSyncJob.js";
import { startSnapshotJob } from "./jobs/snapshotJob.js";
import { startEmailReportJobs } from "./jobs/emailReportJob.js";

// Error handling middleware
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

connectDB();
startSnapshotJob();
startEmailReportJobs();

const app = express();

app.set("trust proxy", 1);

// Strict CORS whitelisting with credentials support for HttpOnly cookies
const corsWhitelist = [
  "https://social-analysis-smoky.vercel.app",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsWhitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Blocked by CORS policy"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-XSRF-TOKEN", "X-CSRF-TOKEN"],
};

app.use(cookieParser);

// Payload size limit to prevent Denial of Service
app.use(express.json({ limit: "10kb" }));

app.use(cors(corsOptions));

// Configure Helmet with strict headers and CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://*.ytimg.com"],
        connectSrc: [
          "'self'",
          "https://social-analysis-smoky.vercel.app",
          "http://localhost:5173",
          "http://localhost:5000",
          "https://api.groq.com",
          "https://api.openai.com",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    contentTypeNosniff: true,
    referrerPolicy: {
      policy: "same-origin",
    },
  })
);

app.use(csrfProtection);

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "storage/uploads")));

// Prevent NoSQL parameter injection attacks
app.use(mongoSanitizeMiddleware);

// Sanitize user inputs to prevent Cross-Site Scripting (XSS)
app.use(xssSanitizer);

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 150,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20,
  skip: () => process.env.NODE_ENV === "test",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many request attempts, please try again in 15 minutes.",
  },
});

// Apply global rate limiting to all api endpoints
app.use("/api", apiLimiter);

// Specific routes
app.use("/api/auth", strictLimiter, authRoutes);
app.use("/api/media", strictLimiter, mediaRoutes);
app.use("/api/analyzer", strictLimiter, analyzerRoutes);
app.use("/api/compare", strictLimiter, compareRoutes);
app.use("/api/ai", strictLimiter, aiRoutes);
app.use("/api/ai", strictLimiter, aiChannelRoutes);
app.use("/api/competitors", strictLimiter, competitorRoutes);
app.use("/api/reports", strictLimiter, reportRoutes);
app.use("/api/notifications", strictLimiter, notificationRoutes);
app.use("/api/activity", strictLimiter, activityRoutes);
app.use("/api/exports", strictLimiter, exportRoutes);
app.use("/api/settings", strictLimiter, settingsRoutes);
app.use("/api/search", strictLimiter, searchRoutes);
app.use("/api/users", strictLimiter, userRoutes);

app.use("/api/youtube", youtubeRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/x", xRoutes);
app.use("/api/groups", groupRoutes);

app.get("/api/debug/youtube", (req, res) => {
  const apiKey = process.env.YOUTUBE_API_KEY || "";
  res.json({
    youtubeApiKeyPresent: !!apiKey,
    youtubeApiKeyLength: apiKey.length,
    nodeEnv: process.env.NODE_ENV || null,
    railway: process.env.RAILWAY_ENVIRONMENT || null
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Social Analytics API Running 🚀",
  });
});

// Fallback to error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Sync YouTube channels hourly
cron.schedule("0 * * * *", async () => {
  await syncAllYoutubeChannels();
});

const logRuntimeDiagnostics = async () => {
  console.log("\n=== Railway Runtime Diagnostics ===");
  console.log("Platform:", process.platform);
  console.log("Node version:", process.version);
  
  try {
    const { stdout } = await execPromise(process.platform === "win32" ? "where.exe python" : "which python3 || which python");
    console.log("python3 path:", stdout.trim());
  } catch (e) {
    console.log("python3 path: not found");
  }

  try {
    const { stdout } = await execPromise(process.platform === "win32" ? "python --version" : "python3 --version || python --version");
    console.log("python3 version:", stdout.trim());
  } catch (e) {
    console.log("python3 version: not found");
  }

  try {
    const { stdout } = await execPromise(process.platform === "win32" ? "pip --version" : "pip3 --version || pip --version");
    console.log("pip version:", stdout.trim());
  } catch (e) {
    console.log("pip version: not found");
  }

  try {
    const { stdout } = await execPromise("npx playwright --version");
    console.log("playwright version:", stdout.trim());
  } catch (e) {
    console.log("playwright version: not found");
  }
  console.log("===================================\n");
};

if (process.env.NODE_ENV !== "test" || process.env.START_SERVER === "true") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    logRuntimeDiagnostics();
  });
}

export default app;
