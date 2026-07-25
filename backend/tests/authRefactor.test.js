import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import crypto from "crypto";

// Helper to hash tokens
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

describe("Production-Grade Auth & Session Management Refactor Integration Tests", () => {
  const testEmail = `auth_test_${Date.now()}@test.com`;
  const testUser = {
    name: "Refactor Tester",
    email: testEmail,
    password: "SuperSecurePass_2026!",
  };

  let cookies = [];
  let userToken = "";
  let userId = "";

  beforeAll(async () => {
    // Clean up any test records
    await User.deleteMany({ email: testEmail });
  });

  afterAll(async () => {
    const user = await User.findOne({ email: testEmail });
    if (user) {
      await Session.deleteMany({ userId: user._id });
    }
    await User.deleteMany({ email: testEmail });
  });

  describe("Password Complexity Constraints", () => {
    it("should reject passwords shorter than 8 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Short Pass",
          email: `short_${Date.now()}@test.com`,
          password: "Pass1!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject passwords missing uppercase letters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "No Upper",
          email: `noupper_${Date.now()}@test.com`,
          password: "password123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject passwords missing special characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "No Special",
          email: `nospecial_${Date.now()}@test.com`,
          password: "Password123",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject blacklisted/common passwords", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Common Pass",
          email: `common_${Date.now()}@test.com`,
          password: "password123!", // password123! is on the blacklist
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Google OAuth security", () => {
    it("should reject development bypass tokens and invalid Google ID tokens", async () => {
      const beforeCount = await User.countDocuments({
        email: "dev.user@socialiq.ai",
      });

      const res = await request(app).post("/api/auth/google").send({
        idToken: "dummy-developer-token",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      const errorText = [
        res.body.message,
        ...(res.body.errors || []).map((e) => e.message),
      ]
        .filter(Boolean)
        .join(" ");
      expect(errorText).toMatch(/failed|invalid/i);

      // Bypass must not create or refresh a session for the legacy dev identity
      const afterCount = await User.countDocuments({
        email: "dev.user@socialiq.ai",
      });
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("RTR & Cookie Flow", () => {
    it("should successfully register a valid user and return credentials and set cookies", async () => {
      const res = await request(app).post("/api/auth/register").send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      userToken = res.body.data.token;
      userId = res.body.data._id;

      // Extract set-cookie headers
      cookies = res.headers["set-cookie"] || [];
      expect(cookies.length).toBeGreaterThan(0);

      const hasRefreshToken = cookies.some((c) =>
        c.includes("socialiq_refresh_token"),
      );

      expect(hasRefreshToken).toBe(true);
      // Access token is now returned in JSON instead of a cookie
      expect(res.body.data.token).toEqual(expect.any(String));
    });

    it("should successfully refresh the access token and rotate the refresh token (RTR)", async () => {
      // Find the token value from cookies
      const refreshCookie = cookies.find((c) =>
        c.includes("socialiq_refresh_token"),
      );
      const refreshTokenValue = refreshCookie.split(";")[0];

      // Refresh endpoint call with the refresh cookie
      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [refreshTokenValue]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const newCookies = res.headers["set-cookie"] || [];
      expect(newCookies.length).toBeGreaterThan(0);

      // Ensure the old refresh token is marked as revoked in the user document
      const hashedOldToken = hashToken(refreshTokenValue.split("=")[1]);
      const oldSession = await Session.findOne({ tokenHash: hashedOldToken });

      expect(oldSession.revoked).toBe(true);
      expect(oldSession.replacedByToken).toBeDefined();
    });
  });

  describe("Profile & Session Management Endpoints", () => {
    it("should get active sessions for the logged in user", async () => {
      const res = await request(app)
        .get("/api/users/sessions")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should successfully update profile fields (name, bio, avatar)", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Updated Refactor Name",
          bio: "Automated QA Expert and full stack architect.",
          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=qa_tester",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Refactor Name");
      expect(res.body.data.bio).toBe(
        "Automated QA Expert and full stack architect.",
      );
    });

    it("should fail email change if verification password is wrong", async () => {
      const res = await request(app)
        .patch("/api/users/email")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          newEmail: `new_email_${Date.now()}@test.com`,
          password: "WrongPassword!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it(
      "should successfully change password using the change-password route",
      async () => {
        const res = await request(app)
          .post("/api/auth/change-password")
          .set("Authorization", `Bearer ${userToken}`)
          .send({
            oldPassword: testUser.password,
            newPassword: "NewSecretPassword123!",
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      },
      15000
    );

    it("should revoke all other devices using the logout-other route", async () => {
      const res = await request(app)
        .post("/api/auth/logout-other")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Account Deletion Danger Zone", () => {
    it("should reject account deletion with incorrect password validation", async () => {
      const res = await request(app)
        .delete("/api/users/account")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ password: "wrong_password" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should successfully delete the account when password validation matches", async () => {
      const res = await request(app)
        .delete("/api/users/account")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ password: "NewSecretPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkUser = await User.findById(userId);
      expect(checkUser).toBeNull();
    });
  });
});
