/**
 * server.js
 * -----------------------------------------------------------------------
 * Entry point for the Somi Nutrition Assistant backend.
 *
 * STATELESS BY DESIGN:
 *   - No database, no ORM, no session store, no auth middleware.
 *   - All user state (profile, meal logs, nutrition cache) lives in the
 *     client's localStorage/sessionStorage.
 *   - This server only proxies to Groq (Whisper + LLaMA) and returns
 *     structured JSON.
 * -----------------------------------------------------------------------
 */

require('dotenv').config();

const { GROQ_API_KEY, GROQ_API_KEY_2, GEMINI_API_KEY } = process.env;

if (!GROQ_API_KEY && !GROQ_API_KEY_2 && !GEMINI_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('\n[FATAL] No AI API keys are set in the environment variables.');
  // eslint-disable-next-line no-console
  console.error('Please configure at least one of GROQ_API_KEY, GROQ_API_KEY_2, or GEMINI_API_KEY in your .env file before starting the server.\n');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const transcribeRoute = require('./routes/transcribe.route');
const analyzeMealRoute = require('./routes/analyzeMeal.route');
const analyzeImageRoute = require('./routes/analyzeImage.route');
const dailyScoreRoute = require('./routes/dailyScore.route');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  'http://localhost:3000',
  process.env.NEXT_URL,
  process.env.NEXT_URL_2,
  process.env.ALLOWED_ORIGIN  
].filter(Boolean);

// --- Security & core middleware ---
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // origin check (agar Postman/server-to-server call ho toh origin undefined hota hai)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Something Error 221'));
    }
  },
  credentials: true
}));

// JSON body parsing for /api/analyze-meal. Multipart parsing for
// /api/transcribe is handled separately by multer within its own route.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// --- Health check ---
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'somi-nutrition-backend' });
});

// --- Routes ---
app.use('/api/transcribe', transcribeRoute);
app.use('/api/analyze-meal', analyzeMealRoute);
app.use('/api/analyze-image', analyzeImageRoute);
app.use('/api/analyze-daily-score', dailyScoreRoute);

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// --- Global error handler (must be last) ---
app.use(errorHandler);

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Somi backend listening on port ${PORT} (allowed origin: ${ALLOWED_ORIGIN})`);
});

// --- Graceful Shutdown ---
function gracefulShutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;
