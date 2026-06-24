import mongoose from "mongoose";

const RETRY_DELAY_MS = 5000;
let retryTimer = null;

const describeMongoError = (error) => {
  const message = error?.message || "Unknown MongoDB connection error.";

  if (/IP.*whitelist|whitelist|not allowed/i.test(message)) {
    return `${message}
Add your current IP to the Atlas access list:
https://www.mongodb.com/docs/atlas/security/ip-access-list/`;
  }

  if (/ENOTFOUND|querySrv|ECONNREFUSED|timed out|ReplicaSetNoPrimary/i.test(message)) {
    return `${message}
Check that your Atlas cluster is running, your internet connection is stable, and your connection string is correct.`;
  }

  return message;
};

const scheduleReconnect = () => {
  if (retryTimer) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDB();
  }, RETRY_DELAY_MS);
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MongoDB connection skipped: MONGO_URI is not set in backend/.env");
    scheduleReconnect();
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error("MongoDB connection error:");
    console.error(describeMongoError(error));
    console.error(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000} seconds...`);
    scheduleReconnect();
    return false;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
  scheduleReconnect();
});

export default connectDB;
