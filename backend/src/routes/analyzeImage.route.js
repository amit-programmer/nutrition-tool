/**
 * analyzeImage.route.js
 * -----------------------------------------------------------------------
 * POST /api/analyze-image
 *
 * Accepts EITHER:
 *   1. multipart/form-data with field "image" (file upload from Postman / frontend)
 *   2. JSON body: { image_base64: string, mime_type?: string, user_profile?: object }
 * -----------------------------------------------------------------------
 */

const express = require('express');
const multer = require('multer');
const { analyzeImageHandler } = require('../controllers/analyzeImage.controller');
const { apiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// In-memory storage: file buffer is available as req.file.buffer (never written to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
});

router.post('/', apiRateLimiter, upload.single('image'), analyzeImageHandler);

module.exports = router;
