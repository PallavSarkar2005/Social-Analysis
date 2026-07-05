import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("Connecting...");

    const uri = process.env.MONGO_URI;
    const conn = await mongoose.connect(uri, {
      // Prefer IPv4 — avoids intermittent Atlas ENOTFOUND on some Windows networks.
      family: 4,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[MongoDB] Disconnected");
    });
    mongoose.connection.on("error", (err) => {
      console.error("[MongoDB] Connection error:", err.message);
    });

    console.log("Connected!");
    console.log(conn.connection.host);
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;