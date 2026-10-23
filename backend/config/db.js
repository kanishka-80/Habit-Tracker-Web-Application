const mongoose = require("mongoose");
const dns = require("dns");

// Set Google Public DNS as fallback for SRV lookup issues on Windows local networks
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Fallback to default system DNS if custom servers cannot be set
}

/**
 * Establishes connection to MongoDB using Mongoose.
 * Exits the process if the connection fails, since the API
 * cannot function without a database connection.
 */
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ Cannot connect to MongoDB: MONGO_URI environment variable is missing.");
      console.error("👉 Please add MONGO_URI in Railway Dashboard -> Service -> Variables.");
      process.exit(1);
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
