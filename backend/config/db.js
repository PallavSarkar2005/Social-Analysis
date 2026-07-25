import mongoose from "mongoose";

let reconnectTimer = null;
let reconnectAttempts = 0;

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleReconnect = () => {
  if (reconnectTimer) return;
  if (mongoose.connection.readyState === 1) return;

  const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempts, 5));
  reconnectAttempts += 1;
  console.warn(
    `[MongoDB] Scheduling reconnect attempt #${reconnectAttempts} in ${delay}ms…`
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (mongoose.connection.readyState === 1) {
      reconnectAttempts = 0;
      return;
    }
    try {
      const uri = process.env.MONGO_URI;
      if (!uri) throw new Error("MONGO_URI is not set");
      await mongoose.connect(uri, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
      });
      reconnectAttempts = 0;
      console.log("[MongoDB] Reconnected successfully");
    } catch (err) {
      console.error("[MongoDB] Reconnect failed:", err.message);
      scheduleReconnect();
    }
  }, delay);
};

const connectDB = async () => {
  try {
    console.log("Connecting...");

    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set");
    }

    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(uri, {
      // Prefer IPv4 — avoids intermittent Atlas ENOTFOUND on some Windows networks.
      family: 4,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[MongoDB] Disconnected");
      scheduleReconnect();
    });
    mongoose.connection.on("connected", () => {
      clearReconnectTimer();
      reconnectAttempts = 0;
    });
    mongoose.connection.on("error", (err) => {
      console.error("[MongoDB] Connection error:", err.message);
      scheduleReconnect();
    });

    console.log("Connected!");
    console.log(conn.connection.host);
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    // Keep process alive and retry — temporary Atlas DNS/network blips are common on Windows
    scheduleReconnect();
  }
};

export default connectDB;
