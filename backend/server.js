/**
 * @file server.js
 * @description ICPF Camp Registration & Management System (2026 MERN Edition)
 * Main Express server, middleware pipeline, health check, and database auto-seeding.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { CampConfig } = require('./models');
const participantRoutes = require('./routes/participantRoutes');
const configRoutes = require('./routes/configRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ==========================================
// Middleware Pipeline
// ==========================================

// CORS Configuration (supports single origin or comma-delimited origins)
const allowedOrigins = CLIENT_URL.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      // Automatically permit any Vercel preview or production deployment domain
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for custom domain or local testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lightweight Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// ==========================================
// Base Routes & Health Check
// ==========================================

/**
 * @route   GET /api/health
 * @desc    Health check & uptime monitor
 * @access  Public
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    system: 'ICPF Camp Registration Management System (2026 Edition)'
  });
});

/**
 * Root Welcome Route
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ICPF Camp Registration & Management API (2026 Edition)',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Participant registration, roster, and camp configuration APIs
app.use('/api/participants', participantRoutes);
app.use('/api/config', configRoutes);
app.use('/api/export', exportRoutes);

// ==========================================
// Error Handling Middleware
// ==========================================

// 404 Handler for unregistered endpoints
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND'
    }
  });
});

// Centralized Error Middleware (Strictly adheres to agentrules.md Section 5.1)
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// ==========================================
// Server Initialization & Database Seeding
// ==========================================

let server = null;

async function startServer(port = PORT) {
  // Connect to Database
  const dbConnection = await connectDB();

  if (dbConnection) {
    try {
      // Check and seed default 2026 camp configuration
      const activeConfig = await CampConfig.getActiveConfig();
      console.log(`[Init] Active Camp Config loaded: "${activeConfig.campTitle}" (Year: ${activeConfig.year}) with ${activeConfig.teams.length} teams and ${activeConfig.rooms.length} rooms.`);
    } catch (seedError) {
      console.error('[Init] Error verifying/seeding CampConfig:', seedError.message);
    }
  } else {
    console.warn('[Init] Running in DB-offline mode. Database features will be unavailable until MongoDB is connected.');
  }

  // Start HTTP Listener
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`[Server] ICPF Backend running on port ${port} in ${process.env.NODE_ENV || 'development'} mode.`);
      console.log(`[Server] Health check available at http://localhost:${port}/api/health`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${port} is already in use by another process.`);
        console.error(`[Tip] Identify conflicting processes with 'lsof -i :${port}' or specify a different PORT in backend/.env.`);
      } else {
        console.error('[Server Error] Unhandled listener error:', err.message);
      }
      reject(err);
    });
  });
}

// Graceful Shutdown
async function stopServer() {
  if (server) {
    return new Promise((resolve) => {
      server.close(() => {
        console.log('[Server] HTTP server stopped.');
        resolve();
      });
    });
  }
}

// Auto-run if executed directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[Fatal] Server failed to start:', err);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  stopServer
};
