/**
 * transcribe.controller.js
 * -----------------------------------------------------------------------
 * Handles POST /api/transcribe
 * Converts an uploaded audio buffer (voice input) to Hinglish/English
 * text via Groq's whisper-large-v3 model. Stateless - nothing is
 * persisted server-side; the transcript is returned directly to the
 * client, which is responsible for using/storing it as it sees fit.
 * -----------------------------------------------------------------------
 */

const { transcribeAudioBuffer } = require('../services/whisperService');

async function transcribeHandler(req, res, next) {
  try {
    const { buffer, originalname } = req.file;
    const language = req.body?.language; // optional override, e.g. "en"

    const transcript = await transcribeAudioBuffer(buffer, originalname, language);

    return res.status(200).json({
      success: true,
      transcript,
    });
  } catch (err) {
    // Distinguish Groq rate-limit/upstream errors so the client gets a
    // friendly retry message instead of a raw SDK error leaking through.
    const status = err?.status || err?.response?.status;

    if (status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Engine busy, retry shortly.',
      });
    }

    if (status === 504) {
      return res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
      });
    }

    const wrappedError = new Error('Transcription failed.');
    wrappedError.statusCode = 503;
    wrappedError.publicMessage =
      'We could not transcribe that audio right now. Please try again in a moment.';
    return next(wrappedError);
  }
}

module.exports = { transcribeHandler };
