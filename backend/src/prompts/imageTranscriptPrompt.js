/**
 * imageTranscriptPrompt.js
 * -----------------------------------------------------------------------
 * System prompt to only return a transcript (list/description) of food items
 * in the provided image.
 * -----------------------------------------------------------------------
 */

const IMAGE_TRANSCRIPT_PROMPT = `You are an AI trained to identify food in images.
Your task is to simply list and describe the food items visible in the provided image.
Do not provide a complex nutritional breakdown. Just provide a clear, concise text transcript of what food is present.
If no food is present, reply with "inner image not have food".`;

module.exports = {
  IMAGE_TRANSCRIPT_PROMPT,
};
