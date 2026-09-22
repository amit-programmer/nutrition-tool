/**
 * analyzeMeal.controller.js
 * -----------------------------------------------------------------------
 * Handles POST /api/analyze-meal
 *
 * CLIENT-SIDE CACHE CONTRACT (read this before modifying):
 * ---------------------------------------------------------------------
 * This backend is stateless and has NO knowledge of previous requests.
 * The client is expected to maintain a `nutrition_master_catalog` in
 * localStorage - a dictionary of previously resolved foods, keyed by a
 * normalized `key_identifier` (see `catalog_additions` in the response
 * schema).
 *
 * Expected client flow:
 *   1. Before calling this route, the client lowercases/trims/singularizes
 *      tokens in the raw meal text and string-matches them against the
 *      aliases already in `nutrition_master_catalog`.
 *   2. Matched items are resolved ENTIRELY on the client via simple
 *      multiplier math (quantity x base values) - these should NOT be
 *      sent to this API for re-analysis.
 *   3. Only the remaining unmatched tokens are sent here as `meal_text`
 *      (or `known_items` is populated with the keys the client already
 *      resolved, if the client prefers to send the full text with hints).
 *   4. This route responds with `catalog_additions` for any newly-seen
 *      food items. The client appends these to its local
 *      `nutrition_master_catalog` for zero-cost lookups on future meals.
 *
 * Breaking this contract (e.g. always sending full meal_text regardless
 * of cache state) doesn't break correctness, but it defeats the caching
 * strategy this API was designed around and will increase Groq spend
 * unnecessarily. Please preserve it in any future changes.
 * ---------------------------------------------------------------------
 */

const { analyzeMeal } = require('../services/llamaService');
const { sanitizeMealText } = require('../utils/sanitizeInput');
const { jsonSafeParse } = require('../utils/jsonSafeParse');
const { saveFoodNutrition, findFoodNutrition } = require('../services/dbService');

async function analyzeMealHandler(req, res, next) {
  try {
    const { user_profile: userProfile = {}, known_items: knownItems = [] } = req.body;
    const rawMealText = req.body.meal_text;

    // Sanitize to prevent prompt injection (strip tags, trim, cap length).
    const mealText = sanitizeMealText(rawMealText);

    if (!mealText || typeof mealText !== 'string' || mealText.trim() === '' || mealText.length > 1500) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT_LENGTH',
      });
    }

    // --- SECURITY CHECKS for Text ---
    const lowerMealText = mealText.toLowerCase();
    const suspiciousTerms = ['ignore previous', 'system prompt', 'you are now', 'bypass', 'forget instructions'];
    if (suspiciousTerms.some(term => lowerMealText.includes(term))) {
      return res.status(403).json({ success: false, error: 'SECURITY_ALERT: Malicious prompt injection detected.' });
    }
    // --------------------------------

    // --- Check Database first for simple queries ---
    // If the meal text is short, it might just be "roti" or "dal"
    if (mealText.length < 50) {
      // Clean up numbers and common words for simple matching
      const searchWord = mealText.replace(/[0-9]|plate|bowl|cup|glass|piece|of|and/gi, '').trim().toLowerCase();
      const dbMatch = searchWord ? findFoodNutrition(searchWord) : null;
      
      if (dbMatch) {
        // Construct a synthetic AI response using DB data
        return res.status(200).json({
          parsed_items: [{
            food_name: dbMatch.food_name,
            matched_category: "Database Match",
            entered_quantity: mealText,
            estimated_weight_g: 100, // approximation
            calories: dbMatch.calories,
            macros: { 
              protein_g: dbMatch.protein_g, 
              carbs_g: dbMatch.carbs_g, 
              fats_g: dbMatch.fat_g, 
              fiber_g: dbMatch.fiber_g 
            },
            micros: { 
              sodium_mg: dbMatch.sodium_mg, 
              sugar_g: 0,
              iron_mg: dbMatch.iron_mg,
              zinc_mg: dbMatch.zinc_mg,
              magnesium_mg: dbMatch.magnesium_mg,
              calcium_mg: dbMatch.calcium_mg,
              potassium_mg: dbMatch.potassium_mg,
              VitaminD3_mg: dbMatch.VitaminD3_mg,
              VitaminB12_mg: dbMatch.VitaminB12_mg
            },
            glycemic_index_estimate: "MEDIUM"
          }],
          meal_totals: {
            total_calories: dbMatch.calories,
            total_protein_g: dbMatch.protein_g,
            total_carbs_g: dbMatch.carbs_g,
            total_fats_g: dbMatch.fat_g,
            total_fiber_g: dbMatch.fiber_g,
            total_sodium_mg: dbMatch.sodium_mg,
            total_sugar_g: 0,
            total_iron_mg: dbMatch.iron_mg,
            total_zinc_mg: dbMatch.zinc_mg,
            total_magnesium_mg: dbMatch.magnesium_mg,
            total_calcium_mg: dbMatch.calcium_mg,
            total_potassium_mg: dbMatch.potassium_mg,
            total_VitaminD3_mg: dbMatch.VitaminD3_mg,
            total_VitaminB12_mg: dbMatch.VitaminB12_mg
          },
          catalog_additions: [],
          medical_flags: [],
          commerce_and_goal_insights: {
            bio_score: 80,
            goal_verdict: "Matched from database cache.",
            smart_swaps: [],
            macro_gap_filler: ""
          }
        });
      }
    }

    // --- First attempt ---
    let rawCompletion;
    try {
      rawCompletion = await analyzeMeal({ userProfile, mealText, knownItems, isRetry: false });
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 429) {
        return res.status(429).json({ success: false, error: 'Engine busy, retry shortly.' });
      }
      if (status === 504) {
        return res.status(504).json({ success: false, error: 'Gateway Timeout' });
      }
      throw err;
    }

    let parsed = jsonSafeParse(rawCompletion);

    // --- Retry once with a stricter reminder if parsing failed ---
    if (!parsed.ok) {
      let retryCompletion;
      try {
        retryCompletion = await analyzeMeal({ userProfile, mealText, knownItems, isRetry: true });
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 429) {
          return res.status(429).json({ success: false, error: 'Engine busy, retry shortly.' });
        }
        if (status === 504) {
          return res.status(504).json({ success: false, error: 'Gateway Timeout' });
        }
        throw err;
      }
      parsed = jsonSafeParse(retryCompletion);
    }

    if (!parsed.ok) {
      return res.status(502).json({
        success: false,
        error: 'AI_PARSING_FAILED',
      });
    }
    
    // Save new items to backend database
    if (parsed.data.catalog_additions && Array.isArray(parsed.data.catalog_additions)) {
      parsed.data.catalog_additions.forEach(item => {
        try {
          saveFoodNutrition(item);
        } catch (e) {
          console.error("Failed to save item to DB:", e);
        }
      });
    }

    // Return the parsed JSON directly to the client.
    return res.status(200).json(parsed.data);
  } catch (err) {
    console.error('INNER ERROR in analyzeMealHandler:', err);
    const wrappedError = new Error('Meal analysis failed.');
    wrappedError.statusCode = 503;
    wrappedError.publicMessage =
      'We could not analyze that meal right now. Please try again in a moment.';
    return next(wrappedError);
  }
}

module.exports = { analyzeMealHandler };
