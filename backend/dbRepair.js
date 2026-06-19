import mongoose from "mongoose";
import dotenv from "dotenv";
import Account from "./models/Account.js";
import Snapshot from "./models/Snapshot.js";
import Content from "./models/Content.js";

dotenv.config();

const runRepair = async () => {
  try {
    console.log("==================================================");
    console.log("STARTING DATABASE PRODUCTION REPAIR AUDIT...");
    console.log("Connecting to MongoDB Atlas...");
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log("Connected successfully!");

    /*
      1. CLEAN UP MALFORMED URLS
    */
    console.log("\n[Step 1] Auditing profile URLs for malformations...");
    const accounts = await Account.find();
    let malformedCount = 0;

    for (const account of accounts) {
      let url = account.profileUrl || "";
      let modified = false;

      // Check for markdown syntax like "https://url](https://url)"
      if (url.includes("](") || url.includes(")")) {
        console.log(`  - Found malformed URL: "${url}" for Account: ${account.name}`);
        
        // Extract the first valid URL
        const match = url.match(/(https?:\/\/[^\]\)\s]+)/);
        if (match && match[1]) {
          url = match[1];
          modified = true;
        }
      }

      // Check for double links or trailing brackets
      if (url.endsWith("]") || url.endsWith(")")) {
        url = url.replace(/[\]\)]+$/, "");
        modified = true;
      }

      if (modified) {
        account.profileUrl = url;
        await account.save();
        malformedCount++;
        console.log(`    → Cleaned URL to: "${url}"`);
      }
    }
    console.log(`[Step 1 Complete] Cleaned ${malformedCount} malformed profile URLs.`);

    /*
      2. REMOVE DUPLICATE ACCOUNTS
    */
    console.log("\n[Step 2] Scanning for duplicate accounts...");
    const allAccounts = await Account.find();
    const seen = new Set();
    let duplicatesDeleted = 0;

    for (const acc of allAccounts) {
      const key = `${acc.platform}-${acc.accountId.toLowerCase().trim()}`;
      if (seen.has(key)) {
        console.log(`  - Duplicate account found: @${acc.accountId} on ${acc.platform}. Deleting duplicate ID: ${acc._id}`);
        // Delete orphaned snapshots for this duplicate
        await Snapshot.deleteMany({ account: acc._id });
        await Content.deleteMany({ account: acc._id });
        await Account.findByIdAndDelete(acc._id);
        duplicatesDeleted++;
      } else {
        seen.add(key);
      }
    }
    console.log(`[Step 2 Complete] Removed ${duplicatesDeleted} duplicate accounts.`);

    /*
      3. ORPHANED SNAPSHOTS & CONTENT INTEGRITY CHECK
    */
    console.log("\n[Step 3] Verification of Orphaned Snapshots & Contents...");
    const snapshots = await Snapshot.find();
    let orphanedSnapshots = 0;

    for (const snap of snapshots) {
      const parentExists = await Account.exists({ _id: snap.account });
      if (!parentExists) {
        console.log(`  - Orphaned Snapshot found (ID: ${snap._id}). Deleting...`);
        await Snapshot.findByIdAndDelete(snap._id);
        orphanedSnapshots++;
      }
    }

    const contents = await Content.find();
    let orphanedContents = 0;

    for (const item of contents) {
      const parentExists = await Account.exists({ _id: item.account });
      if (!parentExists) {
        console.log(`  - Orphaned Content found (ID: ${item._id}). Deleting...`);
        await Content.findByIdAndDelete(item._id);
        orphanedContents++;
      }
    }
    console.log(`[Step 3 Complete] Cleared ${orphanedSnapshots} orphaned snapshots and ${orphanedContents} orphaned content posts.`);

    console.log("\n==================================================");
    console.log("DATABASE AUDIT & REPAIR SUCCESSFULLY COMPLETED!");
    console.log("==================================================");
    
    mongoose.connection.close();
  } catch (error) {
    console.error("CRITICAL AUDIT ERROR:", error.message);
    process.exit(1);
  }
};

runRepair();
