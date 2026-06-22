import dotenv from "dotenv";
import { validateEnv } from "./config/env.js";

dotenv.config();
validateEnv();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import cron from "node-cron";
import { mongoSanitizeMiddleware } from "./middleware/mongoSanitize.js";
import { xssSanitizer } from "./middleware/xssSanitizer.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
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
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
};

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

// Payload size limit to prevent Denial of Service
app.use(express.json({ limit: "10kb" }));

// Prevent NoSQL parameter injection attacks
app.use(mongoSanitizeMiddleware);

// Sanitize user inputs to prevent Cross-Site Scripting (XSS)
app.use(xssSanitizer);

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 150,
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

app.use("/api/youtube", youtubeRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/x", xRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
