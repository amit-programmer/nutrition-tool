/**
 * rateLimiter.js
 * -----------------------------------------------------------------------
 * Per-IP rate limiting to control Groq API spend. Applied to both
 * /api/transcribe and /api/analyze-meal since both routes call out to
 * paid Groq endpoints.
 * -----------------------------------------------------------------------
 */

const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again in a moment.',
  },
});

module.exports = { apiRateLimiter };
