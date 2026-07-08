import "../config/preload.js";
import mongoose from "mongoose";
import { validateAllProfileIdentities } from "../services/profileIdentityValidationService.js";

const repair = !process.argv.includes("--dry-run");

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });

  const report = await validateAllProfileIdentities({
    repair,
    logPrefix: "[VALIDATE PROFILES]",
  });

  console.log("\n========== IDENTITY VALIDATION REPORT ==========");
  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
  process.exit(report.profilesFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
