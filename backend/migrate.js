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

    // 1. Resolve migration owner user (never create weak hardcoded credentials)
    const defaultEmail = process.env.MIGRATION_DEFAULT_EMAIL;
    const defaultPassword = process.env.MIGRATION_DEFAULT_PASSWORD;
    let defaultUser = defaultEmail
      ? await User.findOne({ email: defaultEmail.toLowerCase() })
      : null;

    if (!defaultUser && defaultEmail && defaultPassword) {
      if (defaultPassword.length < 12) {
        throw new Error(
          "MIGRATION_DEFAULT_PASSWORD must be at least 12 characters.",
        );
      }
      console.log(`\nCreating migration user: ${defaultEmail}...`);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      defaultUser = await User.create({
        name: process.env.MIGRATION_DEFAULT_NAME || "Migration User",
        email: defaultEmail.toLowerCase(),
        passwordHash,
        role: "user",
        plan: "free",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Migration",
      });
      console.log(`Migration user created with ID: ${defaultUser._id}`);
    } else if (defaultUser) {
      console.log(`\nMigration user already exists (ID: ${defaultUser._id})`);
    } else {
      throw new Error(
        "Set MIGRATION_DEFAULT_EMAIL (and MIGRATION_DEFAULT_PASSWORD if creating) before running migrate.js. Hardcoded default credentials are not allowed.",
      );
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
