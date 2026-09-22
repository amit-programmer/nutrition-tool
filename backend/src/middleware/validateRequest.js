/**
 * validateRequest.js
 * -----------------------------------------------------------------------
 * Lightweight request validation middleware. No external validation
 * library is used since the schema surface is small - keeping this
 * dependency-free and easy to audit.
 * -----------------------------------------------------------------------
 */

const { MAX_MEAL_TEXT_LENGTH } = require('../utils/sanitizeInput');

/**
 * Validates the multipart audio upload for POST /api/transcribe.
 * Expects multer to have already run and attached req.file.
 */
function validateTranscribeRequest(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Missing "audio" file field in multipart/form-data request.',
    });
  }

  const ALLOWED_MIME_PREFIXES = ['audio/', 'video/webm']; // some browsers tag webm audio as video/webm
  const mimetype = req.file.mimetype || '';
  const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) => mimetype.startsWith(prefix));

  if (!isAllowedType) {
    return res.status(400).json({
      success: false,
      error: `Unsupported file type "${mimetype}". Please upload an audio file.`,
    });
  }

  const MAX_BYTES = 10 * 1024 * 1024; // 10MB
  if (req.file.size > MAX_BYTES) {
    return res.status(400).json({
      success: false,
      error: 'Audio file exceeds the 10MB limit.',
    });
  }

  return next();
}

/**
 * Validates the JSON body for POST /api/analyze-meal.
 */
function validateAnalyzeMealRequest(req, res, next) {
  const { meal_text: mealText, user_profile: userProfile } = req.body || {};

  if (typeof mealText !== 'string' || mealText.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: '"meal_text" is required and must be a non-empty string.',
    });
  }

  if (mealText.length > MAX_MEAL_TEXT_LENGTH * 4) {
    // Generous pre-sanitize ceiling to reject obviously abusive payloads
    // before we even bother sanitizing/truncating.
    return res.status(400).json({
      success: false,
      error: `"meal_text" is too long. Please keep it under ${MAX_MEAL_TEXT_LENGTH} characters.`,
    });
  }

  if (userProfile !== undefined && (typeof userProfile !== 'object' || Array.isArray(userProfile))) {
    return res.status(400).json({
      success: false,
      error: '"user_profile" must be an object if provided.',
    });
  }

  if (req.body.known_items !== undefined && !Array.isArray(req.body.known_items)) {
    return res.status(400).json({
      success: false,
      error: '"known_items" must be an array of strings if provided.',
    });
  }

  return next();
}

module.exports = {
  validateTranscribeRequest,
  validateAnalyzeMealRequest,
};
