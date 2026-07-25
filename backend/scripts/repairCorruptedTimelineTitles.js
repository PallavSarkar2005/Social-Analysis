/**
 * One-shot repair: timeline titles/types that were corrupted by repeatedly
 * prefixing "Won " onto types that already started with "Won"
 * (e.g. "Won Won Re", "Won Won Parliamentary").
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  sanitizeTimelineForResponse,
  normalizeElectionTypeLabel,
  polishTimelineEventsForDisplay,
} from "../services/politicalTimelineService.js";

dotenv.config();

const isCorrupted = (text = "") => /^(won\s+){2,}/i.test(String(text || "").trim());

await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.collection("politicalprofiles");

const cursor = col.find({
  $or: [
    { "timeline.title": { $regex: "^(Won\\s+){2,}", $options: "i" } },
    { "timeline.election.type": { $regex: "^(Won\\s+){2,}", $options: "i" } },
  ],
});

let profiles = 0;
let entries = 0;

while (await cursor.hasNext()) {
  const doc = await cursor.next();
  const timeline = Array.isArray(doc.timeline) ? doc.timeline : [];
  if (!timeline.some((e) => isCorrupted(e?.title) || isCorrupted(e?.election?.type))) continue;

  // Re-polish from stored + elections so titles/types are rewritten cleanly
  const repaired = sanitizeTimelineForResponse(timeline, { elections: doc.elections || [] });
  // Also keep non-election entries from polished display pass
  const polishedAll = polishTimelineEventsForDisplay(timeline).map((e) => {
    const match = repaired.find((r) => r.id === e.id) || repaired.find(
      (r) => String(r.year) === String(e.year) && r.title === e.title
    );
    if (match) return { ...e, ...match, election: match.election || e.election };
    if (e.election) {
      return {
        ...e,
        election: {
          ...e.election,
          type: normalizeElectionTypeLabel(e.election.type || e.title || "Election"),
        },
      };
    }
    return e;
  });

  // Prefer the API-shaped repaired election list when available
  const nextTimeline = repaired.length ? repaired : polishedAll;

  await col.updateOne(
    { _id: doc._id },
    { $set: { timeline: nextTimeline, updatedAt: new Date() } }
  );

  profiles += 1;
  entries += timeline.filter((e) => isCorrupted(e?.title) || isCorrupted(e?.election?.type)).length;
  console.log(
    `Repaired ${doc.biography?.fullName || doc.accountId}: ${timeline.length} → ${nextTimeline.length} events`
  );
}

console.log(`Done. Profiles updated: ${profiles}. Corrupted entries touched: ${entries}.`);
await mongoose.disconnect();
