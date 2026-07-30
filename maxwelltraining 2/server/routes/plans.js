'use strict';
const express = require('express');
const planStore = require('../services/planStore');
const { apiLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../services/logger');

const router = express.Router();

/**
 * GET /api/plans/:planId
 * Returns the full plan text only if payment is confirmed server-side.
 * Never trusts frontend state or URL parameters.
 */
router.get('/:planId', apiLimiter, (req, res) => {
  const { planId } = req.params;

  if (!planId || !planId.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json({ error: 'Invalid plan ID.' });
  }

  const plan = planStore.get(planId);

  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or expired.' });
  }

  if (!plan.paid) {
    return res.status(402).json({ error: 'Payment required to access this plan.' });
  }

  logger.info('Plan retrieved', { planId, tier: plan.tier });

  return res.json({
    text: plan.text,
    tier: plan.tier,
    level: plan.level,
  });
});

module.exports = router;
