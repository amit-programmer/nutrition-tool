/**
 * whisperService.js
 * -----------------------------------------------------------------------
 * Wraps transcription endpoint with fallback. 
 * Accepts an in-memory audio buffer.
 * -----------------------------------------------------------------------
 */

const { toFile } = require('groq-sdk');
const { executeWithFallback } = require('./aiClients');

async function transcribeAudioBuffer(buffer, originalName, language) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const result = await executeWithFallback(async (clientInfo) => {
      if (clientInfo.provider === 'groq') {
        const file = await toFile(buffer, originalName || 'audio.webm');
        const params = {
          file,
          model: 'whisper-large-v3',
          temperature: 0,
        };
        
        if (language) {
          params.language = language;
        } else {
          params.language = 'hi';
        }

        const transcription = await clientInfo.instance.audio.transcriptions.create(params, { signal: controller.signal });
        return transcription.text ? transcription.text.trim() : '';
      } else if (clientInfo.provider === 'gemini') {
        // Gemini supports audio natively through generateContent
        const response = await clientInfo.instance.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            "Please transcribe the following audio accurately in the original language. If language is spoken, detect it. Just return the transcription text without any additional commentary.",
            {
              inlineData: {
                data: buffer.toString('base64'),
                mimeType: 'audio/webm' // Assuming webm from the original toFile hint
              }
            }
          ]
        });
        return response.text ? response.text.trim() : '';
      }
    });

    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Gateway Timeout');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

module.exports = { transcribeAudioBuffer };
