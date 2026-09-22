const express = require('express');
const { analyzeDailyScoreHandler } = require('../controllers/analyzeDailyScore.controller');
const { apiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', apiRateLimiter, analyzeDailyScoreHandler);

module.exports = router;
