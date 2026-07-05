/**
 * Probe all profile endpoints for a creatorId.
 * Usage: node scripts/probeProfile.js 6a48b13a7e18e29d1e95fdb7
 */
import "../config/preload.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Account from "../models/Account.js";
import User from "../models/User.js";

const BASE = "http://localhost:5000";
const creatorId = process.argv[2] || "6a48b13a7e18e29d1e95fdb7";

const endpoints = [
  `/api/profile/${creatorId}`,
  `/api/profile/${creatorId}/timeline`,
  `/api/profile/${creatorId}/news`,
  `/api/profile/${creatorId}/charts`,
  `/api/profile/${creatorId}/elections`,
  `/api/profile/${creatorId}/influence`,
  `/api/profile/${creatorId}/ai-insights`,
  `/api/profile/${creatorId}/similar`,
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });

  const account = await Account.findById(creatorId);
  if (!account) {
    console.error("Account not found:", creatorId);
    process.exit(1);
  }

  const user = await User.findById(account.userId);
  if (!user) {
    console.error("User not found for account");
    process.exit(1);
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  console.log(`Probing profile for account="${account.name}" user=${user.email}\n`);

  for (const path of endpoints) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.text();
      let preview = body.slice(0, 200);
      if (body.length > 200) preview += "...";
      console.log(`${res.status} ${path}`);
      if (res.status >= 500) {
        console.log("  BODY:", preview);
      }
    } catch (err) {
      console.log(`ERR  ${path} -> ${err.message}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
