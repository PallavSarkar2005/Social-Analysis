import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("Connecting...");

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected!");
    console.log(conn.connection.host);
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;