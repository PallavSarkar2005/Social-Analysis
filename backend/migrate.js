import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Account from "./models/Account.js";
import Snapshot from "./models/Snapshot.js";
import Content from "./models/Content.js";

dotenv.config();

const runMigration = async () => {
  try {
    console.log("==================================================");
    console.log("STARTING SOCIAL DASHBOARD DATABASE MIGRATION...");
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully!");

    // 1. Create default user if not exists
    const defaultEmail = "default@socialiq.com";
    let defaultUser = await User.findOne({ email: defaultEmail });

    if (!defaultUser) {
      console.log(`\nCreating default user: ${defaultEmail}...`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("password123", salt);

      defaultUser = await User.create({
        name: "Default User",
        email: defaultEmail,
        passwordHash,
        role: "user",
        plan: "pro",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Default",
      });
      console.log(`Default user created with ID: ${defaultUser._id}`);
    } else {
      console.log(`\nDefault user already exists (ID: ${defaultUser._id})`);
    }

    const defaultUserId = defaultUser._id;

    // 2. Migrate Accounts
    console.log("\nMigrating Accounts...");
    const accountsResult = await Account.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log(`Updated ${accountsResult.modifiedCount} accounts.`);

    // 3. Migrate Snapshots
    console.log("\nMigrating Snapshots...");
    const snapshotsResult = await Snapshot.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log(`Updated ${snapshotsResult.modifiedCount} snapshots.`);

    // 4. Migrate Contents
    console.log("\nMigrating Contents...");
    const contentsResult = await Content.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log(`Updated ${contentsResult.modifiedCount} content records.`);

    // 5. Drop old indexes to clear path for compound indexes
    console.log("\nAuditing and removing deprecated global unique indexes...");
    const db = mongoose.connection.db;

    try {
      await db.collection("accounts").dropIndex("accountId_1");
      console.log("  - Dropped index 'accountId_1' from accounts.");
    } catch (e) {
      console.log("  - Index 'accountId_1' not found on accounts (already dropped or not created).");
    }

    try {
      await db.collection("contents").dropIndex("contentId_1");
      console.log("  - Dropped index 'contentId_1' from contents.");
    } catch (e) {
      console.log("  - Index 'contentId_1' not found on contents (already dropped or not created).");
    }

    console.log("\n==================================================");
    console.log("DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("==================================================");

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\nCRITICAL MIGRATION ERROR:", error);
    process.exit(1);
  }
};

runMigration();
