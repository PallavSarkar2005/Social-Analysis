/**
 * cleanMaliciousAccounts.js
 *
 * One-shot script to identify and remove any Account records whose `name`
 * field contains XSS / injection patterns (e.g. <script>alert('xss')</script>).
 *
 * Safe-run procedure:
 *   1. Preview: node scripts/cleanMaliciousAccounts.js --dry-run
 *   2. Apply:   node scripts/cleanMaliciousAccounts.js
 *
 * Only removes records whose name matches XSS patterns.
 * Does NOT delete legitimate user data.
 */

import "dotenv/config";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import AnalyticsSnapshot from "../models/AnalyticsSnapshot.js";
import Snapshot from "../models/Snapshot.js";

const isDryRun = process.argv.includes("--dry-run");

// XSS / injection patterns to detect invalid/malicious records
const MALICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /alert\s*\(/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /document\.cookie/i,
  /eval\s*\(/i,
  /innerHTML/i,
];

const isMalicious = (name) => {
  if (!name || typeof name !== "string") return false;
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(name));
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI or MONGODB_URI not set in .env");
  await mongoose.connect(uri);
  console.log("[CleanMalicious] Connected to MongoDB.");
};

export const cleanMaliciousAccounts = async ({ dryRun = false } = {}) => {
  const accounts = await Account.find({}).select("_id name platform userId").lean();

  const malicious = accounts.filter((a) => isMalicious(a.name));

  if (malicious.length === 0) {
    console.log("[CleanMalicious] No malicious account records found. Database is clean.");
    return { found: 0, removed: 0, dryRun };
  }

  console.log(`[CleanMalicious] Found ${malicious.length} malicious record(s):`);
  for (const acc of malicious) {
    console.log(`  - _id=${acc._id} name="${acc.name}" platform=${acc.platform}`);
  }

  if (dryRun) {
    console.log("[CleanMalicious] DRY RUN — no records were deleted. Re-run without --dry-run to apply.");
    return { found: malicious.length, removed: 0, dryRun: true };
  }

  let removed = 0;
  for (const acc of malicious) {
    const accountId = acc._id;

    // Remove cascade
    const [profileDel, snapshotDel, analyticsDel] = await Promise.all([
      PoliticalProfile.deleteMany({ accountId }),
      Snapshot.deleteMany({ account: accountId }),
      AnalyticsSnapshot.deleteMany({ accountId }),
    ]);
    await Account.deleteOne({ _id: accountId });

    console.log(
      `[CleanMalicious] Removed account _id=${accountId} name="${acc.name}" ` +
      `+ ${profileDel.deletedCount} profile(s) + ${snapshotDel.deletedCount} snapshot(s) ` +
      `+ ${analyticsDel.deletedCount} analytics snapshot(s).`
    );
    removed += 1;
  }

  console.log(`[CleanMalicious] Done. Removed ${removed} malicious account(s).`);
  return { found: malicious.length, removed, dryRun: false };
};

// Run when called directly
if (process.argv[1].includes("cleanMaliciousAccounts")) {
  (async () => {
    try {
      await connectDB();
      await cleanMaliciousAccounts({ dryRun: isDryRun });
    } catch (err) {
      console.error("[CleanMalicious] Error:", err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  })();
}

export default cleanMaliciousAccounts;
