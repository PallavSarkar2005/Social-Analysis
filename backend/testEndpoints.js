import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Account from "./models/Account.js";

dotenv.config();

const BASE_URL = "http://localhost:5000";

const testAllEndpoints = async () => {
  console.log("==================================================");
  console.log("STARTING BACKEND ENDPOINT AUDIT & VERIFICATION...");
  console.log("==================================================");

  try {
    // 1. Connect to DB to fetch valid IDs for testing parameters
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database to retrieve sample accounts.");

    const ytAccount = await Account.findOne({ platform: "youtube" });
    const xAccount = await Account.findOne({ platform: "x" });

    console.log("Found sample YouTube account:", ytAccount ? `${ytAccount.name} (${ytAccount._id})` : "None");
    console.log("Found sample X account:", xAccount ? `${xAccount.name} (${xAccount._id})` : "None");

    const ytId = ytAccount ? ytAccount._id.toString() : "677e48354c03b17cc41e067c"; // fallback or dummy
    const xId = xAccount ? xAccount._id.toString() : "677e483b4c03b17cc41e06d6"; // fallback or dummy

    mongoose.connection.close();
    console.log("Database connection closed. Starting route hits...\n");

    const routesToTest = [
      {
        name: "GET /",
        method: "get",
        url: `${BASE_URL}/`,
      },
      {
        name: "GET /api/accounts",
        method: "get",
        url: `${BASE_URL}/api/accounts`,
      },
      {
        name: "POST /api/accounts (dry run error check)",
        method: "post",
        url: `${BASE_URL}/api/accounts`,
        data: {}, // expect failure 500 or validation fail
      },
      {
        name: "GET /api/analytics/dashboard-overview",
        method: "get",
        url: `${BASE_URL}/api/analytics/dashboard-overview`,
      },
      {
        name: "GET /api/analytics/top-videos",
        method: "get",
        url: `${BASE_URL}/api/analytics/top-videos`,
      },
      {
        name: "GET /api/analytics/highest-engagement",
        method: "get",
        url: `${BASE_URL}/api/analytics/highest-engagement`,
      },
      {
        name: "GET /api/analytics/channel-summary/:accountId",
        method: "get",
        url: `${BASE_URL}/api/analytics/channel-summary/${ytId}`,
      },
      {
        name: "GET /api/analytics/growth/:accountId",
        method: "get",
        url: `${BASE_URL}/api/analytics/growth/${ytId}`,
      },
      {
        name: "GET /api/analytics/posting-frequency/:accountId",
        method: "get",
        url: `${BASE_URL}/api/analytics/posting-frequency/${ytId}`,
      },
      {
        name: "GET /api/analytics/top-content/:accountId",
        method: "get",
        url: `${BASE_URL}/api/analytics/top-content/${ytId}`,
      },
      {
        name: "GET /api/analytics/best-posting-time/:accountId",
        method: "get",
        url: `${BASE_URL}/api/analytics/best-posting-time/${ytId}`,
      },
      {
        name: "GET /api/analytics/growth-rate/:accountId",
        method: "get",
        url: `${BASE_URL}/api/analytics/growth-rate/${ytId}`,
      },
      {
        name: "GET /api/history",
        method: "get",
        url: `${BASE_URL}/api/history`,
      },
      {
        name: "GET /api/history/:accountId",
        method: "get",
        url: `${BASE_URL}/api/history/${ytId}`,
      },
      {
        name: "POST /api/compare",
        method: "post",
        url: `${BASE_URL}/api/compare`,
        data: {
          url1: "https://www.youtube.com/@narendramodi",
          url2: "https://www.youtube.com/@TanmayBhatYT"
        }
      },
      {
        name: "POST /api/analyzer/youtube (channel)",
        method: "post",
        url: `${BASE_URL}/api/analyzer/youtube`,
        data: { url: "https://www.youtube.com/@narendramodi" }
      },
      {
        name: "POST /api/ai/video-insights",
        method: "post",
        url: `${BASE_URL}/api/ai/video-insights`,
        data: {
          title: "How to Build a SaaS Platform",
          views: 150000,
          likes: 8500,
          comments: 920
        }
      },
      {
        name: "POST /api/ai/channel-insights",
        method: "post",
        url: `${BASE_URL}/api/ai/channel-insights`,
        data: {
          title: "Tech Channel",
          subscribers: 2500000,
          totalViews: 450000000,
          videoCount: 340,
          platform: "youtube"
        }
      }
    ];

    for (const route of routesToTest) {
      try {
        console.log(`Testing: ${route.name}`);
        let response;
        if (route.method === "get") {
          response = await axios.get(route.url);
        } else if (route.method === "post") {
          response = await axios.post(route.url, route.data);
        }
        console.log(`  🟢 [SUCCESS] Status: ${response.status}`);
        if (response.data.success) {
          console.log(`    success: true`);
        } else {
          console.log(`    Response data fields: ${Object.keys(response.data).join(", ")}`);
        }
      } catch (err) {
        const status = err.response?.status || "NO_RESPONSE";
        const msg = err.response?.data?.message || err.message;
        if (route.name.includes("dry run error check") && status === 500) {
          console.log(`  🟢 [EXPECTED ERROR] Status: ${status} - Message: ${msg}`);
        } else {
          console.log(`  🔴 [FAILURE] Status: ${status} - Message: ${msg}`);
        }
      }
      console.log("--------------------------------------------------");
    }

  } catch (error) {
    console.error("FATAL AUDIT ERROR:", error);
  }
};

testAllEndpoints();
