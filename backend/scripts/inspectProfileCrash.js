import "../config/preload.js";
import connectDB from "../config/db.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import Account from "../models/Account.js";

await connectDB();
const accounts = await Account.find({
  name: { $regex: "Yogi|Himanta|Fadnavis|Mohan|Rekha", $options: "i" },
})
  .select("_id name party state thumbnails thumbnail")
  .limit(10)
  .lean();

console.log(
  "accounts",
  accounts.map((a) => ({ id: String(a._id), name: a.name }))
);

for (const a of accounts.slice(0, 5)) {
  const p = await PoliticalProfile.findOne({ accountId: a._id })
    .select(
      "aiSummary aiInsights confidenceBreakdown relationships biography sectionMeta moduleMeta verifiedFacts"
    )
    .lean();
  console.log("\n===", a.name, "profile?", Boolean(p));
  if (!p) continue;

  console.log("aiSummary keys", p.aiSummary ? Object.keys(p.aiSummary) : null);
  if (p.aiSummary) {
    for (const [k, v] of Object.entries(p.aiSummary)) {
      const t = Array.isArray(v) ? `array[${v.length}]` : typeof v;
      const preview =
        v && typeof v === "object"
          ? JSON.stringify(v).slice(0, 120)
          : String(v).slice(0, 80);
      console.log(`  ${k}: ${t} => ${preview}`);
    }
  }

  const insights = p.aiInsights;
  console.log(
    "aiInsights",
    Array.isArray(insights) ? `array[${insights.length}]` : typeof insights,
    JSON.stringify(insights?.[0] ?? insights).slice(0, 180)
  );

  console.log("confidenceBreakdown", JSON.stringify(p.confidenceBreakdown).slice(0, 200));
  console.log(
    "relationships",
    p.relationships
      ? {
          type: typeof p.relationships,
          nodes: p.relationships.nodes?.length,
          edges: p.relationships.edges?.length,
          keys: Object.keys(p.relationships || {}),
        }
      : null
  );

  const fact0 = p.verifiedFacts?.[0];
  console.log("verifiedFact0", JSON.stringify(fact0).slice(0, 200));
}

process.exit(0);
