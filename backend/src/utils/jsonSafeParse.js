/**
 * jsonSafeParse.js
 * -----------------------------------------------------------------------
 * Defensive JSON parsing for LLM completions. Even with
 * `response_format: { type: "json_object" }`, models occasionally wrap
 * output in markdown fences or add stray whitespace/prose - this helper
 * strips the common offenders before attempting JSON.parse.
 * -----------------------------------------------------------------------
 */

/**
 * Attempts to parse a raw LLM string response as JSON, stripping common
 * markdown code-fence wrappers first.
 * @param {string} raw
 * @returns {{ ok: true, data: object } | { ok: false, error: Error }}
 */
function jsonSafeParse(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: new Error('Input to jsonSafeParse must be a string') };
  }

  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  // If there's leading/trailing prose around a JSON object, try to
  // isolate the outermost { ... } block as a last resort.
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return { ok: true, data: JSON.parse(candidate) };
    } catch (err) {
      // fall through to try the full cleaned string below
    }
  }

  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

module.exports = { jsonSafeParse };
