/**
 * sanitizeInput.js
 * -----------------------------------------------------------------------
 * Small, dependency-free sanitizer for free-text fields (meal_text, etc.)
 * before they are interpolated into an LLM prompt. This is defense in
 * depth against prompt injection and malformed input - not a full HTML
 * sanitizer library, but sufficient for a plain-text food description
 * field.
 * -----------------------------------------------------------------------
 */

const MAX_MEAL_TEXT_LENGTH = 500;

/**
 * Strips HTML/script tags, collapses whitespace, and trims the string.
 * @param {string} input
 * @returns {string}
 */
function stripTags(input) {
  return String(input)
    // Remove full script/style blocks including their contents
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove any remaining tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Collapse repeated whitespace/newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes and caps meal_text (or similar free-text fields) for safe
 * inclusion in the LLM prompt.
 * @param {string} rawText
 * @param {number} [maxLength]
 * @returns {string}
 */
function sanitizeMealText(rawText, maxLength = MAX_MEAL_TEXT_LENGTH) {
  if (typeof rawText !== 'string') return '';
  const cleaned = stripTags(rawText);
  return cleaned.slice(0, maxLength);
}

module.exports = {
  sanitizeMealText,
  stripTags,
  MAX_MEAL_TEXT_LENGTH,
};
