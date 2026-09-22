/**
 * imageService.js
 * -----------------------------------------------------------------------
 * Analyzes food images by trying vision-capable models in order.
 * Falls back gracefully across groq1 -> groq2 -> gemini.
 * -----------------------------------------------------------------------
 */

const { executeWithFallback } = require('./aiClients');
const { IMAGE_TRANSCRIPT_PROMPT } = require('../prompts/imageTranscriptPrompt');

const VISION_MODELS = [
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3.8-27b',
];

const SKIP_STATUSES = new Set([400, 404, 415, 422]);

async function analyzeImageMeal({ userProfile, imageBase64, mimeType = 'image/jpeg', foodHint = '' }) {
  const userPayload = foodHint
    ? `Image of food provided. User hint: "${foodHint}". What food is in this image?`
    : 'What food is visible in this image? Provide a text transcript.';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const result = await executeWithFallback(async (clientInfo) => {
      if (clientInfo.provider === 'groq') {
        let lastError = null;
        for (const visionModel of VISION_MODELS) {
          try {
            console.log(`[imageService] Trying vision model on ${clientInfo.id}: ${visionModel}`);
            const completion = await clientInfo.instance.chat.completions.create(
              {
                model: visionModel,
                temperature: 0.1,
                messages: [
                  { role: 'system', content: IMAGE_TRANSCRIPT_PROMPT },
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: userPayload },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:${mimeType};base64,${imageBase64}`,
                        },
                      },
                    ],
                  },
                ],
              },
              { signal: controller.signal }
            );
            console.log(`[imageService] ✓ Vision model succeeded on ${clientInfo.id}: ${visionModel}`);
            return completion.choices?.[0]?.message?.content ?? '';
          } catch (err) {
            const status = err?.status ?? err?.response?.status;
            if (SKIP_STATUSES.has(status)) {
              lastError = err;
              continue;
            }
            throw err;
          }
        }
        const noVisionErr = new Error(`All Groq vision models failed on ${clientInfo.id}`);
        noVisionErr.status = 503;
        noVisionErr.cause = lastError;
        throw noVisionErr;
      } else if (clientInfo.provider === 'gemini') {
        console.log(`[imageService] Trying vision model on gemini: gemini-2.5-flash`);
        const response = await clientInfo.instance.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            userPayload,
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType
              }
            }
          ],
          config: {
            systemInstruction: IMAGE_TRANSCRIPT_PROMPT,
            temperature: 0.1,
          }
        });
        console.log(`[imageService] ✓ Vision model succeeded on gemini`);
        return response.text ?? '';
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

module.exports = { analyzeImageMeal };
