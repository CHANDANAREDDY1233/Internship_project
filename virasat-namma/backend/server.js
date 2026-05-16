// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('./routes/index');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ───────────────────────────────────────────────────
app.use('/api', routes);

// ── Catch-all: serve frontend ────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Error Handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ── Start ────────────────────────────────────────────────────────
async function startServer() {
  try {
    await getDb(); // Initialize DB on startup
    app.listen(PORT, () => {
      console.log(`
  ╔════════════════════════════════════════╗
  ║   🛕 Virasat-Namma API Server         ║
  ║   Running on http://localhost:${PORT}   ║
  ║   Heritage Guide for Karnataka        ║
  ╚════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();

module.exports = app;
