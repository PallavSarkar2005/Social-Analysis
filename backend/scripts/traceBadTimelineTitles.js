import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  sanitizeTimelineForResponse,
  polishTimelineEventsForDisplay,
} from "../services/politicalTimelineService.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const PoliticalProfile = mongoose.connection.collection("politicalprofiles");

const bad = await PoliticalProfile.find({
  $or: [
    { "timeline.title": { $regex: "Won Won", $options: "i" } },
    { "timeline.title": { $regex: "Won Re", $options: "i" } },
    { "timeline.election.type": { $regex: "Won Won", $options: "i" } },
    { "timeline.title": { $regex: "^Won Re$", $options: "i" } },
  ],
})
  .project({ accountId: 1, "biography.fullName": 1, timeline: 1, elections: 1 })
  .limit(10)
  .toArray();

console.log("=== DB profiles with suspicious titles:", bad.length);

for (const p of bad) {
  const hits = (p.timeline || []).filter(
    (t) =>
      /won\s+won|won\s+re/i.test(t.title || "") ||
      /won\s+won|won\s+re/i.test(t.election?.type || "")
  );
  console.log("\n--- DB name:", p.biography?.fullName || p.accountId);
  for (const h of hits) {
    console.log(
      "DB raw:",
      JSON.stringify({
        year: h.year,
        title: h.title,
        electionType: h.election?.type,
        description: h.description,
        category: h.category,
      })
    );
  }

  const polished = polishTimelineEventsForDisplay(p.timeline || []);
  const api = sanitizeTimelineForResponse(p.timeline || [], { elections: p.elections || [] });
  const badPolished = polished.filter((t) => /won\s+won|^won\s+re$/i.test(t.title || ""));
  const badApi = api.filter((t) => /won\s+won|^won\s+re$/i.test(t.title || ""));
  console.log("After polishTimelineEventsForDisplay bad count:", badPolished.length, badPolished.map((t) => t.title));
  console.log("After sanitizeTimelineForResponse bad count:", badApi.length, badApi.map((t) => t.title));
  const y2014 = api.filter((t) => String(t.year) === "2014");
  console.log("API 2014 titles:", y2014.map((t) => ({ title: t.title, type: t.election?.type })));
}

// Broader scan: any title with triple Won or ending in " Re"
const broader = await PoliticalProfile.aggregate([
  { $unwind: "$timeline" },
  {
    $match: {
      $or: [
        { "timeline.title": { $regex: "(Won\\s+){2,}", $options: "i" } },
        { "timeline.title": { $regex: "Won\\s+Re$", $options: "i" } },
        { "timeline.election.type": { $regex: "(Won\\s+){2,}", $options: "i" } },
      ],
    },
  },
  {
    $project: {
      name: "$biography.fullName",
      year: "$timeline.year",
      title: "$timeline.title",
      type: "$timeline.election.type",
      description: "$timeline.description",
    },
  },
  { $limit: 30 },
]).toArray();

console.log("\n=== Aggregate hits:", broader.length);
for (const row of broader) console.log(JSON.stringify(row));

await mongoose.disconnect();
