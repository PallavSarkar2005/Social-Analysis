import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import User from "../models/User.js";
import Account from "../models/Account.js";
import ApiUsage from "../models/ApiUsage.js";
import YoutubeCache from "../models/YoutubeCache.js";
import Subscription from "../models/Subscription.js";

describe("Social IQ Backend API & Security Verification Suite", () => {
  let token = "";
  let sampleAccountId = "";
  const testUser = {
    name: "QA Automated Tester",
    email: `tester_${Date.now()}@test.com`,
    password: "SuperSecurePass_2026!",
  };

  beforeAll(async () => {
    // Clear test-scoped records
    await User.deleteMany({ email: /@test.com$/ });
  });

  afterAll(async () => {
    // Clean up created entities
    await User.deleteMany({ email: testUser.email });
    if (sampleAccountId) {
      await Account.deleteMany({ _id: sampleAccountId });
    }
    await mongoose.connection.close();
  });

  // ==========================================
  // PHASE 2: Authentication Flow Tests
  // ==========================================
  describe("Authentication Flow", () => {
    it("should successfully register a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const user = await User.findOne({ email: testUser.email });
      if (user) {
        await Subscription.create({
          userId: user._id,
          plan: "professional",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    });

    it("should fail registration on duplicate email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should login successfully and return a token", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      token = res.body.data.token;
    });

    it("should reject access to protected routes with missing token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should reject access to protected routes with invalid JWT token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-jwt-value");
      expect(res.status).toBe(401);
    });

    it("should grant access to /me with valid JWT token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });
  });

  // ==========================================
  // PHASE 3: Functional / Account Management Tests
  // ==========================================
  describe("Account Operations", () => {
    it("should register a new YouTube account node", async () => {
      const res = await request(app)
        .post("/api/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "PewDiePie Channel",
          platform: "youtube",
          accountId: "UCX6OQ3DkcsbYNE6H8uQQuVA",
          profileUrl: "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA",
          state: "Delhi",
          party: "Independent",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      sampleAccountId = res.body.data._id;
    });

    it("should reject account registration with invalid formats", async () => {
      const res = await request(app)
        .post("/api/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "",
          platform: "unsupported-platform",
          accountId: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should list all registered accounts for the user", async () => {
      const res = await request(app)
        .get("/api/accounts")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // PHASE 4: Analyzer & Caching Tests
  // ==========================================
  describe("Analyzer & Intelligent Cache Layer", () => {
    it("should run audit analysis and bypass/create cache", async () => {
      // Clear specific cache key first to test fresh run
      const targetUrl = "https://www.youtube.com/@narendramodi";
      
      const res1 = await request(app)
        .post("/api/analyzer/youtube")
        .set("Authorization", `Bearer ${token}`)
        .send({ url: targetUrl, forceRefresh: true, state: "Gujarat", party: "BJP" });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.cached).toBe(false); // Forced refresh, must be live
      expect(res1.body.data.channelId).toBeDefined();

      // Subsequent call should fetch from cache
      const res2 = await request(app)
        .post("/api/analyzer/youtube")
        .set("Authorization", `Bearer ${token}`)
        .send({ url: targetUrl, forceRefresh: false, state: "Gujarat", party: "BJP" });

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.cached).toBe(true); // Must be cached
      expect(res2.body.cachedAt).toBeDefined();
    });
  });

  // ==========================================
  // PHASE 8: Security & Parameter Injection Tests
  // ==========================================
  describe("Security Payloads & Parameter Injection", () => {
    it("should reject malicious SQL/NoSQL payload in login credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: { "$gt": "" },
          password: "password",
        });

      // Express mongo sanitize should filter this or validation fail
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should sanitize and reject XSS injection script payload in name input", async () => {
      const maliciousName = "<script>alert('xss')</script> Malicious Node";
      const res = await request(app)
        .post("/api/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: maliciousName,
          platform: "youtube",
          accountId: "UCX6OQ3DkcsbYNE6H8uQQuVB",
          profileUrl: "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVB",
          state: "Delhi",
          party: "Independent",
        });

      // Either sanitization strips it or fails gracefully
      expect(res.status).toBe(201);
      expect(res.body.data.name).not.toContain("<script>");
    });
  });

  // ==========================================
  // PHASE 9: Political Profile & Deep Research Tests
  // ==========================================
  describe("Political Profile & Deep Research Endpoints", () => {
    it("should successfully fetch biography for a valid creator ID", async () => {
      const res = await request(app)
        .get(`/api/profile/${sampleAccountId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.biography).toBeDefined();
    });

    it("should successfully fetch timeline milestones", async () => {
      const res = await request(app)
        .get(`/api/profile/${sampleAccountId}/timeline`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should successfully fetch press news and sentiment logs", async () => {
      const res = await request(app)
        .get(`/api/profile/${sampleAccountId}/news`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.news).toBeDefined();
      expect(res.body.data.sentiment).toBeDefined();
    });

    it("should successfully fetch election history", async () => {
      const res = await request(app)
        .get(`/api/profile/${sampleAccountId}/elections`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should successfully fetch reach & influence matrix", async () => {
      const res = await request(app)
        .get(`/api/profile/${sampleAccountId}/influence`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.influence).toBeDefined();
      expect(res.body.data.geographicReach).toBeDefined();
    });
  });
});
