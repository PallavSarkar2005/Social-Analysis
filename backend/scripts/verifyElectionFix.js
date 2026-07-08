/**
 * Delete profile and force fresh sync for verification.
 * Usage: node scripts/verifyElectionFix.js <accountId>
 */
import "../config/preload.js";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import { syncProfileAccount } from "../services/profileBuilderService.js";

const accountId = process.argv[2] || "6a4a702b9535bab0750fcbc2";

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });

  const account = await Account.findById(accountId).lean();
  if (!account) {
    console.error("Account not found");
    process.exit(1);
  }

  console.log("BEFORE account.state:", account.state);

  const before = await PoliticalProfile.findOne({ accountId }).lean();
  console.log("BEFORE profile elections:", before?.elections?.length ?? 0);
  console.log("BEFORE profile electionIntelligence:", before?.electionIntelligence?.length ?? 0);

  await PoliticalProfile.deleteOne({ accountId });
  console.log("Deleted PoliticalProfile");

  const result = await syncProfileAccount(accountId, { force: true, logPrefix: "[VERIFY]" });
  console.log("Sync result:", result.action, result.sectionsBuilt);

  const afterAccount = await Account.findById(accountId).lean();
  const after = await PoliticalProfile.findOne({ accountId }).lean();

  console.log("\nAFTER account.state:", afterAccount.state);
  console.log("AFTER syncStatus:", after?.syncStatus);
  console.log("AFTER moduleMeta.elections:", JSON.stringify(after?.moduleMeta?.elections, null, 2));
  console.log("AFTER elections count:", after?.elections?.length ?? 0);
  console.log("AFTER electionIntelligence count:", after?.electionIntelligence?.length ?? 0);
  console.log("AFTER elections:", JSON.stringify(after?.elections, null, 2));
  console.log("AFTER wikipediaLink:", after?.biography?.wikipediaLink);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
