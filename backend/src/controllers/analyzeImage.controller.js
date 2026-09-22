/**
 * analyzeImage.controller.js
 * -----------------------------------------------------------------------
 * Handles POST /api/analyze-image
 *
 * Accepts EITHER:
 *   - multipart/form-data: field "image" (file upload, e.g., from Postman or frontend)
 *   - JSON body: { image_base64: string, mime_type?: string, user_profile?: object }
 * Returns: Same JSON schema as /api/analyze-meal
 * -----------------------------------------------------------------------
 */

const { analyzeImageMeal } = require('../services/imageService');
const { jsonSafeParse } = require('../utils/jsonSafeParse');

async function analyzeImageHandler(req, res, next) {
  try {
    // --- Resolve image_base64 from either a file upload OR a JSON body ---
    let imageBase64;
    let mimeType;

    if (req.file) {
      // multipart/form-data: field name "image"
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } else {
      // JSON body fallback
      imageBase64 = req.body?.image_base64;
      mimeType = req.body?.mime_type || 'image/jpeg';
    }

    const userProfile = req.body?.user_profile ?? {};
    const foodHint = req.body?.food_hint ?? '';

    // --- SECURITY CHECKS ---
    
    // 1. Strict MIME type validation
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ success: false, error: 'INVALID_FILE_TYPE: Only images (jpeg, png, webp, heic) are allowed.' });
    }

    // 2. Guard: image must be present
    if (!imageBase64 || imageBase64.length < 100) {
      return res.status(400).json({ success: false, error: 'MISSING_IMAGE: Send the image as form-data field "image", or provide image_base64 in the JSON body.' });
    }

    // 3. Reject if base64 payload is too large (>5MB base64 ≈ ~3.75MB raw image)
    const MAX_BASE64_LENGTH = 5 * 1024 * 1024;
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return res.status(400).json({ success: false, error: 'IMAGE_TOO_LARGE: max 5MB.' });
    }

    // 4. Base64 characters sanity check (preventing malicious payloads masking as base64)
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64.replace(/[\r\n]/g, ''))) {
      return res.status(400).json({ success: false, error: 'SECURITY_ALERT: Invalid base64 characters detected.' });
    }

    // 5. Prompt injection / input validation for foodHint
    if (typeof foodHint === 'string' && foodHint.length > 0) {
      if (foodHint.length > 500) {
        return res.status(400).json({ success: false, error: 'HINT_TOO_LONG: Hint must be under 500 characters.' });
      }
      const lowerHint = foodHint.toLowerCase();
      const suspiciousTerms = ['ignore previous', 'system prompt', 'you are now', 'bypass', 'forget instructions'];
      if (suspiciousTerms.some(term => lowerHint.includes(term))) {
        return res.status(403).json({ success: false, error: 'SECURITY_ALERT: Malicious prompt injection detected.' });
      }
    }
    // -----------------------

    // --- Fetch Image Transcript ---
    let rawCompletion;
    try {
      rawCompletion = await analyzeImageMeal({ userProfile, imageBase64, mimeType, foodHint });
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 429) return res.status(429).json({ success: false, error: 'Engine busy, retry shortly.' });
      if (status === 504) return res.status(504).json({ success: false, error: 'Gateway Timeout' });
      if (status === 503) return res.status(503).json({ success: false, error: 'No vision model is currently available. Please try again later.' });
      throw err;
    }

    return res.status(200).json({ success: true, transcript: rawCompletion });
  } catch (err) {
    console.error('INNER ERROR in analyzeImageHandler:', err);
    const wrappedError = new Error('Image meal analysis failed.');
    wrappedError.statusCode = 503;
    wrappedError.publicMessage = 'We could not analyze that image right now. Please try again.';
    return next(wrappedError);
  }
}

module.exports = { analyzeImageHandler };
