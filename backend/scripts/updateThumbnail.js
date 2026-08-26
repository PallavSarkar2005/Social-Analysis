import "dotenv/config";
import mongoose from "mongoose";
import Account from "../models/Account.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const result = await Account.updateMany(
    { accountId: "mohan-charan-majhi" },
    { $set: { thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Shri_Mohan_Charan_Majhi.jpg/500px-Shri_Mohan_Charan_Majhi.jpg" } }
  );

  console.log("Update result:", result);
  await mongoose.disconnect();
}

run().catch(console.error);
