import request from "supertest";

export const TEST_CSRF_TOKEN = "test-csrf-token";

export const withCsrf = (req, token = TEST_CSRF_TOKEN) =>
  req.set("X-XSRF-TOKEN", token).set("Cookie", `XSRF-TOKEN=${token}`);

export const withAuth = (req, token, csrfToken = TEST_CSRF_TOKEN) =>
  withCsrf(req.set("Authorization", `Bearer ${token}`), csrfToken);

export const createTestAgent = async (app) => {
  const agent = request.agent(app);
  const csrfRes = await agent.get("/api/auth/csrf");
  agent.csrfToken = csrfRes.body?.csrfToken || TEST_CSRF_TOKEN;
  return agent;
};

export const syncCsrfFromResponse = (agent, response) => {
  const rotated = response?.body?.data?.csrfToken;
  if (rotated) {
    agent.csrfToken = rotated;
  }
};

export const agentPost = (agent, url) =>
  agent.post(url).set("X-XSRF-TOKEN", agent.csrfToken);

export const agentPatch = (agent, url) =>
  agent.patch(url).set("X-XSRF-TOKEN", agent.csrfToken);

export const agentDelete = (agent, url) =>
  agent.delete(url).set("X-XSRF-TOKEN", agent.csrfToken);
