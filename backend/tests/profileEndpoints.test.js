import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import User from "../models/User.js";
import Account from "../models/Account.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import Subscription from "../models/Subscription.js";
import { buildProfile } from "../services/profileBuilderService.js";

const expectNot500 = (status) => {
  expect(status).not.toBe(500);
  expect([200, 404, 400]).toContain(status);
};

describe("Political Profile Endpoint Integration", () => {
  let token = "";
  let userId = null;
  let accountId = "";
  let bareAccountId = "";

  const testUser = {
    name: "Profile QA User",
    email: `profile_qa_${Date.now()}@test.com`,
    password: "SuperSecurePass_2026!",
  };

  const authGet = (path) =>
    request(app).get(path).set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    await User.deleteMany({ email: /@test.com$/ });

    const registerRes = await request(app).post("/api/auth/register").send(testUser);
    token = registerRes.body.data.token;
    const user = await User.findOne({ email: testUser.email });
    userId = user._id;

    await Subscription.create({
      userId,
      plan: "professional",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const accountRes = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Profile Test Leader",
        platform: "youtube",
        accountId: `UC_PROFILE_TEST_${Date.now()}`,
        profileUrl: "https://www.youtube.com/channel/UC_PROFILE_TEST",
        state: "Delhi",
        party: "Independent",
      });
    accountId = accountRes.body.data._id;

    const bareAccountRes = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bare Profile Leader",
        platform: "youtube",
        accountId: `UC_BARE_${Date.now()}`,
        profileUrl: "https://www.youtube.com/channel/UC_BARE",
        state: "Maharashtra",
        party: "Independent",
      });
    bareAccountId = bareAccountRes.body.data._id;
  }, 60000);

  afterAll(async () => {
    if (accountId) {
      await PoliticalProfile.deleteMany({ accountId: { $in: [accountId, bareAccountId] } });
      await Account.deleteMany({ _id: { $in: [accountId, bareAccountId] } });
    }
    await User.deleteMany({ email: testUser.email });
  });

  const seedProfile = async (targetAccountId, overrides = {}) =>
    PoliticalProfile.findOneAndUpdate(
      { accountId: targetAccountId },
      {
        $set: {
          accountId: targetAccountId,
          biography: { fullName: "Test Leader", party: "BJP", state: "Delhi" },
          timeline: [],
          elections: [],
          electionIntelligence: [],
          verifiedFacts: [],
          sources: [],
          news: [],
          relationships: { nodes: [], edges: [] },
          intelligenceOverview: [],
          politicalStatistics: [],
          aiInsights: [],
          aiSummary: {},
          influence: {},
          geographicReach: [],
          builderVersion: 3,
          overviewVersion: 3,
          timelineVersion: 3,
          factsVersion: 2,
          electionVersion: 2,
          relationshipVersion: 2,
          aiVersion: 3,
          influenceVersion: 1,
          reachVersion: 1,
          newsVersion: 1,
          profileSchemaVersion: 1,
          profileEngineVersion: 2,
          moduleVersion: 1,
          lastSynced: new Date(),
          ...overrides,
        },
      },
      { upsert: true, new: true }
    );

  describe("Seeded profile responses", () => {
    beforeAll(async () => {
      await seedProfile(accountId);
    });

    it("GET /api/profile/:creatorId returns 200 with safe defaults", async () => {
      const res = await authGet(`/api/profile/${accountId}`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.biography).toBeDefined();
      expect(res.body.data.modules).toBeDefined();
      expect(res.body.data.syncStatus).toBeDefined();
      expect(Array.isArray(res.body.data.timeline)).toBe(true);
      expect(Array.isArray(res.body.data.verifiedFacts)).toBe(true);
      expect(res.body.data.relationships).toEqual(
        expect.objectContaining({ nodes: expect.any(Array), edges: expect.any(Array) })
      );
    });

    it("GET timeline returns array even when empty", async () => {
      const res = await authGet(`/api/profile/${accountId}/timeline`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("GET elections returns array when data missing", async () => {
      await seedProfile(accountId, { elections: null, electionIntelligence: null });
      const res = await authGet(`/api/profile/${accountId}/elections`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("GET news returns safe fallback arrays", async () => {
      await seedProfile(accountId, { news: null, newsSentiment: null });
      const res = await authGet(`/api/profile/${accountId}/news`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.news)).toBe(true);
    });

    it("GET charts returns 200", async () => {
      const res = await authGet(`/api/profile/${accountId}/charts`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(res.body.data.timeSeries).toBeDefined();
    });

    it("GET influence returns safe defaults", async () => {
      await seedProfile(accountId, { influence: null, geographicReach: null });
      const res = await authGet(`/api/profile/${accountId}/influence`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(res.body.data.influence).toEqual(expect.any(Object));
      expect(Array.isArray(res.body.data.geographicReach)).toBe(true);
    });

    it("GET ai-insights returns safe defaults", async () => {
      await seedProfile(accountId, { aiInsights: null, aiSummary: null });
      const res = await authGet(`/api/profile/${accountId}/ai-insights`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.insights)).toBe(true);
      expect(res.body.data.summary).toEqual(expect.any(Object));
    });

    it("GET similar returns 200", async () => {
      const res = await authGet(`/api/profile/${accountId}/similar`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("Missing profile and invalid inputs", () => {
    it("returns 404 for unknown creator", async () => {
      const res = await authGet("/api/profile/UCtotallyunknownchannel999");
      expectNot500(res.status);
      expect(res.status).toBe(404);
    });

    it("returns 404 for nonexistent ObjectId account", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await authGet(`/api/profile/${fakeId}`);
      expectNot500(res.status);
      expect(res.status).toBe(404);
    });

    it("handles missing biography without 500", async () => {
      await seedProfile(accountId, { biography: null });
      const res = await authGet(`/api/profile/${accountId}`);
      expectNot500(res.status);
      expect(res.status).toBe(200);
      expect(res.body.data.biography).toEqual(expect.any(Object));
    });
  });

  describe("First-time profile build (null stored profile)", () => {
    it(
      "buildProfile succeeds when no PoliticalProfile document exists yet",
      async () => {
        await PoliticalProfile.deleteOne({ accountId: bareAccountId });
        const result = await buildProfile(bareAccountId, { logPrefix: "[TEST BUILD]" });
        expect(result.profile).toBeTruthy();
        expect(result.action).not.toBe("failed");
        const statsError = (result.sectionErrors || []).find(
          (e) => e.section === "buildPoliticalStatistics"
        );
        expect(statsError).toBeUndefined();
      },
      120000
    );

    it(
      "GET profile returns 200 building shell on first access without stored profile",
      async () => {
        await PoliticalProfile.deleteOne({ accountId: bareAccountId });
        const res = await authGet(`/api/profile/${bareAccountId}`);
        expectNot500(res.status);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.building).toBe(true);
        expect(res.body.data.syncStatus).toBe("building");
      },
      30000
    );
  });
});
