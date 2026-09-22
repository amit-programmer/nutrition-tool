const { analyzeDailyScore } = require('../services/llamaService');
const { jsonSafeParse } = require('../utils/jsonSafeParse');

async function analyzeDailyScoreHandler(req, res, next) {
  try {
    const { user_profile: userProfile = {}, daily_totals: dailyTotals = {}, meal_count: mealCount = 0 } = req.body;

    // --- First attempt ---
    let rawCompletion;
    try {
      rawCompletion = await analyzeDailyScore({ userProfile, dailyTotals, mealCount, isRetry: false });
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
        retryCompletion = await analyzeDailyScore({ userProfile, dailyTotals, mealCount, isRetry: true });
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

    // Return the parsed JSON directly to the client.
    return res.status(200).json(parsed.data);
  } catch (err) {
    console.error('INNER ERROR in analyzeDailyScoreHandler:', err);
    const wrappedError = new Error('Daily score analysis failed.');
    wrappedError.statusCode = 503;
    wrappedError.publicMessage = 'We could not analyze the daily score right now. Please try again in a moment.';
    return next(wrappedError);
  }
}

module.exports = { analyzeDailyScoreHandler };
