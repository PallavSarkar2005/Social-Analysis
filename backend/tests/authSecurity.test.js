import app from "../server.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import crypto from "crypto";
import request from "supertest";
import {
  createTestAgent,
  syncCsrfFromResponse,
  agentPost,
  agentPatch,
} from "./helpers.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

describe("Authentication Security & CSRF Tests", () => {
  const testEmail = `security_${Date.now()}@test.com`;
  const password = "SuperSecurePass_2026!";
  let agent;
  let accessToken = "";
  let csrfToken = "";
  let refreshCookie = "";

  beforeAll(async () => {
    await User.deleteMany({ email: testEmail });
    agent = await createTestAgent(app);
  });

  afterAll(async () => {
    await User.deleteMany({ email: testEmail });
  });

  it("should reject POST without CSRF header when cookie exists", async () => {
    const csrfRes = await agent.get("/api/auth/csrf");
    const token = csrfRes.body.csrfToken;

    const res = await agent
      .post("/api/auth/login")
      .set("Cookie", `XSRF-TOKEN=${token}`)
      .send({ email: "nobody@test.com", password: "WrongPass1!" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CSRF/i);
  });

  it("should register with valid CSRF double-submit token", async () => {
    const res = await agentPost(agent, "/api/auth/register").send({
      name: "Security Tester",
      email: testEmail,
      password,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.csrfToken).toBeDefined();
    accessToken = res.body.data.token;
    csrfToken = res.body.data.csrfToken;
    syncCsrfFromResponse(agent, res);

    const cookies = res.headers["set-cookie"] || [];
    refreshCookie = cookies.find((c) => c.includes("socialiq_refresh_token")) || "";
  });

  it("should reject requests with stale CSRF token after login rotation", async () => {
    const staleToken = "deadbeef".repeat(8);
    const res = await agent
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", `XSRF-TOKEN=${staleToken}`)
      .set("X-XSRF-TOKEN", staleToken)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("should allow authenticated mutation with rotated CSRF token", async () => {
    const res = await agentPatch(agent, "/api/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "CSRF Safe Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("CSRF Safe Name");
  });

  it("should detect refresh token reuse and revoke all sessions", async () => {
    const oldRefresh = refreshCookie.split(";")[0].split("=")[1];

    const refresh1 = await request(app)
      .post("/api/auth/refresh")
      .set("X-XSRF-TOKEN", csrfToken)
      .set("Cookie", `${refreshCookie.split(";")[0]}; XSRF-TOKEN=${csrfToken}`);

    expect(refresh1.status).toBe(200);

    const replay = await request(app)
      .post("/api/auth/refresh")
      .set("X-XSRF-TOKEN", csrfToken)
      .set("Cookie", `socialiq_refresh_token=${oldRefresh}; XSRF-TOKEN=${csrfToken}`);

    expect(replay.status).toBe(401);
    expect(replay.body.message).toMatch(/Breach|Invalid/i);

    const user = await User.findOne({ email: testEmail });
    const activeSessions = await Session.countDocuments({
      userId: user._id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
    expect(activeSessions).toBe(0);

    const reLogin = await agentPost(agent, "/api/auth/login").send({
      email: testEmail,
      password,
    });
    syncCsrfFromResponse(agent, reLogin);
    accessToken = reLogin.body.data.token;
  });

  it("should support multiple simultaneous device sessions", async () => {
    const device2Login = await agentPost(agent, "/api/auth/login").send({
      email: testEmail,
      password,
      rememberMe: true,
    });

    expect(device2Login.status).toBe(200);
    syncCsrfFromResponse(agent, device2Login);

    const sessionsRes = await agent
      .get("/api/users/sessions")
      .set("Authorization", `Bearer ${device2Login.body.data.token}`);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("should reject tampered JWT access tokens", async () => {
    const tampered = accessToken.slice(0, -5) + "xxxxx";
    const res = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });

  it("should reject NoSQL injection in login email field", async () => {
    const res = await agentPost(agent, "/api/auth/login").send({
      email: { $gt: "" },
      password: "anything",
    });

    expect([400, 401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("should lock account after repeated failed login attempts", async () => {
    const lockEmail = `lockout_${Date.now()}@test.com`;
    const reg = await agentPost(agent, "/api/auth/register").send({
      name: "Lockout Test",
      email: lockEmail,
      password,
    });
    syncCsrfFromResponse(agent, reg);

    for (let i = 0; i < 5; i++) {
      await agentPost(agent, "/api/auth/login").send({
        email: lockEmail,
        password: "WrongPass1!",
      });
    }

    const locked = await agentPost(agent, "/api/auth/login").send({
      email: lockEmail,
      password: "WrongPass1!",
    });

    expect(locked.status).toBe(423);
    await User.deleteMany({ email: lockEmail });
  });
});

describe("Authentication Stress Tests", () => {
  const stressEmail = `stress_${Date.now()}@test.com`;
  const password = "SuperSecurePass_2026!";
  let agent;
  let token = "";

  beforeAll(async () => {
    await User.deleteMany({ email: stressEmail });
    agent = await createTestAgent(app);

    const reg = await agentPost(agent, "/api/auth/register").send({
      name: "Stress User",
      email: stressEmail,
      password,
    });

    token = reg.body.data.token;
    syncCsrfFromResponse(agent, reg);
  });

  afterAll(async () => {
    await User.deleteMany({ email: stressEmail });
  });

  it("should handle 10 concurrent authenticated API requests", async () => {
    const requests = Array.from({ length: 10 }, () =>
      agent.get("/api/auth/me").set("Authorization", `Bearer ${token}`)
    );

    const results = await Promise.all(requests);
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });
  });

  it("should handle concurrent login requests creating independent sessions", async () => {
    const logins = Array.from({ length: 5 }, () =>
      agentPost(agent, "/api/auth/login").send({ email: stressEmail, password })
    );

    const results = await Promise.all(logins);
    results.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    const user = await User.findOne({ email: stressEmail });
    const sessionCount = await Session.countDocuments({
      userId: user._id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
    expect(sessionCount).toBeGreaterThanOrEqual(5);
  });
});
