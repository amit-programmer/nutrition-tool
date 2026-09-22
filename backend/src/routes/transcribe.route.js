/**
 * transcribe.route.js
 * -----------------------------------------------------------------------
 * POST /api/transcribe
 *
 * Accepts multipart/form-data with field "audio" (max 10MB).
 * Uses multer.memoryStorage() - the file is never written to disk.
 * -----------------------------------------------------------------------
 */

const express = require('express');
const multer = require('multer');

const { transcribeHandler } = require('../controllers/transcribe.controller');
const { validateTranscribeRequest } = require('../middleware/validateRequest');
const { apiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB hard cap at the multer layer
});

router.post(
  '/',
  apiRateLimiter,
  upload.single('audio'),
  validateTranscribeRequest,
  transcribeHandler
);

module.exports = router;
