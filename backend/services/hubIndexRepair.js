/**
 * Repair SavedReport.shareToken unique sparse index.
 *
 * MongoDB sparse unique indexes still index explicit `null` values.
 * Schema previously defaulted shareToken to null, so only ONE hub card
 * could be created — all further creates failed with E11000.
 */
import SavedReport from "../models/SavedReport.js";

export async function repairShareTokenNulls() {
  const unsetResult = await SavedReport.updateMany(
    { $or: [{ shareToken: null }, { shareToken: "" }] },
    { $unset: { shareToken: "" } }
  );

  // Ensure the unique sparse index exists (idempotent)
  try {
    await SavedReport.collection.createIndex(
      { shareToken: 1 },
      { unique: true, sparse: true, name: "shareToken_1", background: true }
    );
  } catch (err) {
    // Index may already exist with same options
    if (!/already exists|IndexOptionsConflict|IndexKeySpecsConflict/i.test(err.message)) {
      console.warn("[HubIndex] shareToken index ensure:", err.message);
    }
  }

  const modified = unsetResult.modifiedCount || unsetResult.nModified || 0;
  if (modified > 0) {
    console.log(`[HubIndex] Cleared null shareToken on ${modified} report(s)`);
  }
  return { cleared: modified };
}
