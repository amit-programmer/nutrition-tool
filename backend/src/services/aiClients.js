const Groq = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');

const clients = [];

if (process.env.GROQ_API_KEY) {
  clients.push({
    id: 'groq1',
    provider: 'groq',
    instance: new Groq({ apiKey: process.env.GROQ_API_KEY })
  });
}

if (process.env.GROQ_API_KEY_2) {
  clients.push({
    id: 'groq2',
    provider: 'groq',
    instance: new Groq({ apiKey: process.env.GROQ_API_KEY_2 })
  });
}

if (process.env.GEMINI_API_KEY) {
  clients.push({
    id: 'gemini',
    provider: 'gemini',
    instance: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  });
}

/**
 * Executes a callback with fallback logic.
 * It iterates through available clients in priority order: Groq 1 -> Groq 2 -> Gemini.
 * The callback function must take a single `clientInfo` object containing:
 * - id
 * - provider ('groq' or 'gemini')
 * - instance (the initialized SDK client)
 */
async function executeWithFallback(callback) {
  if (clients.length === 0) {
    throw new Error('No AI clients are configured (missing GROQ_API_KEY, GROQ_API_KEY_2, GEMINI_API_KEY)');
  }

  let lastError;
  for (const clientInfo of clients) {
    try {
      // Provide the clientInfo to the callback so the caller knows which provider format to use
      const result = await callback(clientInfo);
      return result;
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      // We log the warning but don't stop the fallback iteration
      console.warn(`[executeWithFallback] ${clientInfo.id} failed — status=${status}, message="${err.message || String(err)}"`);
      lastError = err;
    }
  }

  // All clients failed
  console.error('[executeWithFallback] All configured AI clients failed.');
  throw lastError;
}

module.exports = { clients, executeWithFallback };
