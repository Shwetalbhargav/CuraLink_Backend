const mongoose = require("mongoose");

const { env } = require("./env");
const { logger } = require("./logger");

async function connectToDatabase() {
  if (!env.mongoUri) {
    logger.warn("MONGODB_URI is not configured. Starting without database connection.");
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: env.requestTimeoutMs,
  });
  logger.info("Connected to MongoDB");
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectToDatabase, isDatabaseConnected };
