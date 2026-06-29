import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const runMigration = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully!");

    console.log("Updating existing users to verified status...");
    const result = await User.updateMany(
      { $or: [{ isVerified: { $ne: true } }, { isEmailVerified: { $ne: true } }] },
      { $set: { isVerified: true, isEmailVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} user documents.`);
    console.log("Database migration completed successfully!");
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
};

runMigration();
