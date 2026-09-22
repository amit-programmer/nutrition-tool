/**
 * llamaService.js
 * -----------------------------------------------------------------------
 * Wraps AI models chat completion endpoint for meal analysis. Sends the
 * Somi system prompt + a stringified user_profile/meal_text payload,
 * and returns the raw string completion for the controller to parse.
 *
 * Implements fallback across Groq1, Groq2, and Gemini using executeWithFallback.
 * -----------------------------------------------------------------------
 */

const { executeWithFallback } = require('./aiClients');
const { SOMI_SYSTEM_PROMPT, JSON_RETRY_REMINDER } = require('../prompts/somiSystemPrompt');
const { DAILY_SCORE_PROMPT } = require('../prompts/dailyScorePrompt');

async function analyzeMeal({ userProfile, mealText, knownItems = [], isRetry = false }) {
  const userPayload = {
    user_profile: userProfile,
    meal_text: mealText,
    known_items: knownItems,
  };

  let userContent = JSON.stringify(userPayload);
  if (isRetry) {
    userContent = `${JSON_RETRY_REMINDER}\n\n${userContent}`;
  }

  const groqModelId = process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const result = await executeWithFallback(async (clientInfo) => {
      if (clientInfo.provider === 'groq') {
        const completion = await clientInfo.instance.chat.completions.create({
          model: groqModelId,
          temperature: 0.1,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SOMI_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
        }, { signal: controller.signal });
        return completion.choices?.[0]?.message?.content ?? '';
      } else if (clientInfo.provider === 'gemini') {
        const response = await clientInfo.instance.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userContent,
          config: {
            systemInstruction: SOMI_SYSTEM_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        }, { signal: controller.signal }); // note: Gemini SDK takes signal in the options or natively handles it
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

async function analyzeDailyScore({ userProfile, dailyTotals, mealCount, isRetry = false }) {
  const userPayload = {
    user_profile: userProfile,
    daily_totals: dailyTotals,
    meal_count: mealCount,
  };

  let userContent = JSON.stringify(userPayload);
  if (isRetry) {
    userContent = `${JSON_RETRY_REMINDER}\n\n${userContent}`;
  }

  const groqModelId = process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const result = await executeWithFallback(async (clientInfo) => {
      if (clientInfo.provider === 'groq') {
        const completion = await clientInfo.instance.chat.completions.create({
          model: groqModelId,
          temperature: 0.1,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: DAILY_SCORE_PROMPT },
            { role: 'user', content: userContent },
          ],
        }, { signal: controller.signal });
        return completion.choices?.[0]?.message?.content ?? '';
      } else if (clientInfo.provider === 'gemini') {
        const response = await clientInfo.instance.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userContent,
          config: {
            systemInstruction: DAILY_SCORE_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        }); 
        // gemini signal isn't fully supported in all sdk methods yet but we wrap with promise anyway
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

module.exports = { analyzeMeal, analyzeDailyScore };
