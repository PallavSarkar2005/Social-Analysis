#!/usr/bin/env node
/**
 * Production migration: ensure every Account has AnalyticsSnapshot history.
 *
 * Idempotent & resumable:
 *   node scripts/migrateAnalyticsSnapshots.js
 *   node scripts/migrateAnalyticsSnapshots.js --batch=50 --resume-from=<accountObjectId>
 *
 * Steps per account:
 *  1. backfillFromLegacySnapshots (telemetry from legacy Snapshot)
 *  2. captureSnapshot(force) to stamp current Account + PoliticalProfile metrics
 *  3. Skip if already has AnalyticsSnapshot AND --skip-existing (default true for capture
 *     when history already exists after backfill — still runs capture once if zero rows
 *     after backfill)
 *
 * Progress is logged; failures are recorded and do not abort the run.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import Account from "../models/Account.js";
import AnalyticsSnapshot from "../models/AnalyticsSnapshot.js";
import {
  backfillFromLegacySnapshots,
  captureSnapshot,
} from "../services/analyticsEngine.js";
import connectDB from "../config/db.js";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = { batch: 50, resumeFrom: null, skipCaptureIfExists: false };
  for (const a of args) {
    if (a.startsWith("--batch=")) opts.batch = Math.max(1, Number(a.split("=")[1]) || 50);
    if (a.startsWith("--resume-from=")) opts.resumeFrom = a.split("=")[1];
    if (a === "--force-capture") opts.skipCaptureIfExists = false;
  }
  return opts;
};

const migrate = async () => {
  const opts = parseArgs();
  await connectDB();

  const filter = {};
  if (opts.resumeFrom && mongoose.Types.ObjectId.isValid(opts.resumeFrom)) {
    filter._id = { $gte: new mongoose.Types.ObjectId(opts.resumeFrom) };
  }

  const total = await Account.countDocuments(filter);
  console.log(
    `[Migrate Analytics] Starting. total=${total} batch=${opts.batch} resumeFrom=${opts.resumeFrom || "start"}`
  );

  let processed = 0;
  let backfilled = 0;
  let captured = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  let lastId = null;

  while (processed < total) {
    const query = { ...filter };
    if (lastId) query._id = { ...(query._id || {}), $gt: lastId };

    const batch = await Account.find(query)
      .sort({ _id: 1 })
      .limit(opts.batch)
      .select("_id userId name platform subscribers views videos engagement")
      .lean();

    if (!batch.length) break;

    for (const account of batch) {
      lastId = account._id;
      processed += 1;
      const label = `${account.name || account._id} (${account._id})`;

      try {
        const before = await AnalyticsSnapshot.countDocuments({
          accountId: account._id,
        });

        const bf = await backfillFromLegacySnapshots(account._id, {
          userId: account.userId,
        });
        backfilled += bf.imported;

        const afterBackfill = await AnalyticsSnapshot.countDocuments({
          accountId: account._id,
        });

        // Always capture current verified metrics once if none exist OR force-capture
        const needsCapture = afterBackfill === 0 || !opts.skipCaptureIfExists;
        if (needsCapture) {
          // Avoid duplicate identical rows: captureSnapshot skips when telemetryEqual unless force
          // Use force only when zero history so we stamp at least one row
          const result = await captureSnapshot({
            userId: account.userId,
            accountId: account._id,
            source: "backfill",
            force: afterBackfill === 0,
            account,
          });
          if (result.created) captured += 1;
          else skipped += 1;
        } else {
          skipped += 1;
        }

        if (processed % 10 === 0 || processed === total) {
          console.log(
            `[Migrate Analytics] progress ${processed}/${total} last=${label} before=${before} imported=${bf.imported}`
          );
        }
      } catch (err) {
        failed += 1;
        errors.push({ accountId: String(account._id), error: err.message });
        console.error(`[Migrate Analytics] FAIL ${label}:`, err.message);
      }
    }
  }

  console.log("[Migrate Analytics] Complete.");
  console.log(
    JSON.stringify(
      {
        processed,
        backfilledRows: backfilled,
        captured,
        skipped,
        failed,
        errors: errors.slice(0, 50),
        resumeHint: lastId
          ? `node scripts/migrateAnalyticsSnapshots.js --resume-from=${lastId}`
          : null,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

migrate().catch((err) => {
  console.error("[Migrate Analytics] Critical:", err);
  process.exit(1);
});
