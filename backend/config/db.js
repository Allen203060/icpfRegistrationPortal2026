/**
 * @file db.js
 * @description Mongoose MongoDB connection manager with resilient event listeners,
 * graceful degradation, and clean teardown handlers.
 */

const mongoose = require('mongoose');

// Configure Mongoose options
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
  socketTimeoutMS: 45000,
  autoIndex: true // Build indexes in development
};

/**
 * Connect to MongoDB database
 * @param {string} [uri] - MongoDB connection URI. Defaults to MONGO_URI env var.
 * @returns {Promise<typeof mongoose | null>}
 */
async function connectDB(uri) {
  const connectionURI = uri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/icpf_camp_2026';

  try {
    const conn = await mongoose.connect(connectionURI, MONGO_OPTIONS);
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] MongoDB Connection Warning: Unable to connect to ${connectionURI}. (${error.message})`);
    console.warn('[Database] Operating in degraded/offline mode. Server will remain responsive to health checks.');
    return null;
  }
}

/**
 * Disconnect from MongoDB database (used in clean shutdown and testing teardown)
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed gracefully.');
  }
}

// Connection lifecycle event hooks
mongoose.connection.on('connected', () => {
  console.log('[Database] Mongoose event: Connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] Mongoose event: Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose event: Connection disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] Mongoose event: Reconnected to MongoDB');
});

// Process signal handling for graceful exit
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB
};
