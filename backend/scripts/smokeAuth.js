/**
 * End-to-end smoke test for auth boot flow.
 * Run: node scripts/smokeAuth.js
 */
import "../config/preload.js";
import mongoose from "mongoose";
import User from "../models/User.js";

const BASE = "http://localhost:5000";

const parseCookies = (response) => {
  const raw = response.headers.getSetCookie?.() || [];
  const map = {};
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) map[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return map;
};

const cookieHeader = (cookies) =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

async function main() {
  console.log("=== Auth smoke test ===\n");

  // 1. CSRF
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfBody = await csrfRes.json();
  const cookies = parseCookies(csrfRes);
  console.log("1. GET /api/auth/csrf ->", csrfRes.status, csrfBody.success ? "OK" : csrfBody);

  // 2. Appearance (no auth)
  const appRes = await fetch(`${BASE}/api/settings/appearance`);
  const appBody = await appRes.json();
  console.log("2. GET /api/settings/appearance ->", appRes.status, appBody.success ? "OK" : appBody);

  // 3. Refresh (no session cookie — expect 401, not 500)
  const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader(cookies) },
  });
  const refreshBody = await refreshRes.json().catch(() => ({}));
  console.log("3. POST /api/auth/refresh (guest) ->", refreshRes.status, refreshBody.message || "OK");

  const refreshOk = refreshRes.status === 401 || refreshRes.status === 403;

  // 4. Login
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  const user = await User.findOne({ email: /thesocial/i }).lean();
  if (!user) {
    console.log("4. SKIP login — no test user in DB");
    await mongoose.disconnect();
    return;
  }

  // We don't have password — test login endpoint shape only with wrong password
  const badLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfBody.csrfToken,
      Cookie: cookieHeader(cookies),
    },
    body: JSON.stringify({ email: user.email, password: "wrong-password-test" }),
  });
  const badBody = await badLogin.json();
  console.log("4. POST /api/auth/login (bad pw) ->", badLogin.status, badBody.message);

  const loginOk = badLogin.status === 401 || badLogin.status === 423;
  console.log("\n=== RESULT ===");
  const pass =
    csrfRes.status === 200 &&
    appRes.status === 200 &&
    refreshOk &&
    loginOk;
  console.log(pass ? "PASS — backend auth boot flow is healthy" : "FAIL — see statuses above");
  await mongoose.disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
