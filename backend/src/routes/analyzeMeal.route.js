/**
 * analyzeMeal.route.js
 * -----------------------------------------------------------------------
 * POST /api/analyze-meal
 *
 * See analyzeMeal.controller.js for the full client-side cache contract
 * this route is designed around.
 * -----------------------------------------------------------------------
 */

const express = require('express');

const { analyzeMealHandler } = require('../controllers/analyzeMeal.controller');
const { validateAnalyzeMealRequest } = require('../middleware/validateRequest');
const { apiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', apiRateLimiter, validateAnalyzeMealRequest, analyzeMealHandler);

module.exports = router;
