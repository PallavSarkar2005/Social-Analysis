import request from "supertest";
import app from "../server.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import crypto from "crypto";
import {
  withCsrf,
  withAuth,
  createTestAgent,
  syncCsrfFromResponse,
  agentPost,
  agentPatch,
  agentDelete,
} from "./helpers.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

describe("Production-Grade Auth & Session Management Refactor Integration Tests", () => {
  const testEmail = `auth_test_${Date.now()}@test.com`;
  const testUser = {
    name: "Refactor Tester",
    email: testEmail,
    password: "SuperSecurePass_2026!",
  };

  let agent;
  let cookies = [];
  let userToken = "";
  let userId = "";

  beforeAll(async () => {
    await User.deleteMany({ email: testEmail });
    await Session.deleteMany({});
    agent = await createTestAgent(app);
  });

  afterAll(async () => {
    await User.deleteMany({ email: testEmail });
    await Session.deleteMany({});
  });

  describe("Password Complexity Constraints", () => {
    it("should reject passwords shorter than 8 characters", async () => {
      const res = await agentPost(agent, "/api/auth/register").send({
        name: "Short Pass",
        email: `short_${Date.now()}@test.com`,
        password: "Pass1!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject passwords missing uppercase letters", async () => {
      const res = await agentPost(agent, "/api/auth/register").send({
        name: "No Upper",
        email: `noupper_${Date.now()}@test.com`,
        password: "password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject passwords missing special characters", async () => {
      const res = await agentPost(agent, "/api/auth/register").send({
        name: "No Special",
        email: `nospecial_${Date.now()}@test.com`,
        password: "Password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject blacklisted/common passwords", async () => {
      const res = await agentPost(agent, "/api/auth/register").send({
        name: "Common Pass",
        email: `common_${Date.now()}@test.com`,
        password: "password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("SaaS Provider Merging (Google OAuth)", () => {
    it("should create a new google user if email does not exist", async () => {
      const res = await agentPost(agent, "/api/auth/google").send({
        idToken: "dummy-developer-token",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      syncCsrfFromResponse(agent, res);

      const devUser = await User.findOne({ email: "dev.user@socialiq.ai" });
      expect(devUser).toBeDefined();
      expect(devUser.provider).toBe("google");
      expect(devUser.isEmailVerified).toBe(true);

      await User.deleteOne({ email: "dev.user@socialiq.ai" });
    });
  });

  describe("RTR & Cookie Flow", () => {
    it("should successfully register a valid user and return credentials and set cookies", async () => {
      const res = await agentPost(agent, "/api/auth/register").send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      userToken = res.body.data.token;
      userId = res.body.data._id;
      syncCsrfFromResponse(agent, res);

      cookies = res.headers["set-cookie"] || [];
      expect(cookies.length).toBeGreaterThan(0);

      const hasAccessToken = cookies.some((c) => c.includes("socialiq_access_token"));
      const hasRefreshToken = cookies.some((c) => c.includes("socialiq_refresh_token"));

      expect(hasAccessToken).toBe(true);
      expect(hasRefreshToken).toBe(true);
    });

    it("should successfully refresh the access token and rotate the refresh token (RTR)", async () => {
      const refreshCookie = cookies.find((c) => c.includes("socialiq_refresh_token"));
      const refreshTokenValue = refreshCookie.split(";")[0].split("=")[1];

      const res = await agentPost(agent, "/api/auth/refresh");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const newCookies = res.headers["set-cookie"] || [];
      expect(newCookies.length).toBeGreaterThan(0);

      const hashedOldToken = hashToken(refreshTokenValue);
      const oldSession = await Session.findOne({ oldTokenHashes: hashedOldToken });

      expect(oldSession).toBeDefined();
      expect(oldSession.isRevoked).toBe(false);
      expect(oldSession.tokenHash).not.toBe(hashedOldToken);
    });
  });

  describe("Profile & Session Management Endpoints", () => {
    it("should get active sessions for the logged in user", async () => {
      const res = await agent
        .get("/api/users/sessions")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should successfully update profile fields (name, bio, avatar)", async () => {
      const res = await agentPatch(agent, "/api/users/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Updated Refactor Name",
          bio: "Automated QA Expert and full stack architect.",
          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=qa_tester",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Refactor Name");
    });

    it("should fail email change if verification password is wrong", async () => {
      const res = await agentPatch(agent, "/api/users/email")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          newEmail: `new_email_${Date.now()}@test.com`,
          password: "WrongPassword!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should successfully change password using the change-password route", async () => {
      const res = await agentPost(agent, "/api/auth/change-password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          oldPassword: testUser.password,
          newPassword: "NewSecretPassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const loginRes = await agentPost(agent, "/api/auth/login").send({
        email: testUser.email,
        password: "NewSecretPassword123!",
      });

      expect(loginRes.status).toBe(200);
      userToken = loginRes.body.data.token;
      cookies = loginRes.headers["set-cookie"] || [];
      syncCsrfFromResponse(agent, loginRes);
    }, 45000);

    it("should revoke all other devices using the logout-other route", async () => {
      const res = await agentPost(agent, "/api/auth/logout-other").set(
        "Authorization",
        `Bearer ${userToken}`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Account Deletion Danger Zone", () => {
    it("should reject account deletion with incorrect password validation", async () => {
      const res = await agentDelete(agent, "/api/users/account")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ password: "wrong_password" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should successfully delete the account when password validation matches", async () => {
      const res = await agentDelete(agent, "/api/users/account")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ password: "NewSecretPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkUser = await User.findById(userId);
      expect(checkUser).toBeNull();
    });
  });
});
