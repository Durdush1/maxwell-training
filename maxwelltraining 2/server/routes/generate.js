'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validate } = require('../services/validator');
const { generatePlan } = require('../services/anthropic');
const planStore = require('../services/planStore');
const { generateLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../services/logger');

const router = express.Router();

// Netlify's proxy to this backend times out at 26 seconds (documented,
// fixed limit -- not something we can raise). Writing a full program can
// take longer than that. So this endpoint responds immediately with just
// a planId, generates in the background, and the frontend polls
// GET /api/generate/:planId every couple seconds until it's ready. No
// single request in that flow is ever slow, so the 26s limit never
// applies to any of them.

router.post('/', generateLimiter, async (req, res) => {
  const result = validate(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: 'Invalid input', details: result.errors });
  }

  const A = result.data;
  const planId = uuidv4();

  planStore.set(planId, {
    status: 'pending',
    paid: false,
    tier: A.tier,
    level: A.level,
    email: A.email,
  });

  // Respond right away -- everything below runs after the response is sent.
  res.json({ planId });

  try {
    const planText = await generatePlan(A);

    // Same teaser logic as before: stop after the 3rd "## " phase header.
    const lines = planText.split('\n');
    let teaser = '';
    let sectionCount = 0;
    for (const line of lines) {
      if (line.startsWith('## ')) sectionCount++;
      if (sectionCount >= 3) break;
      teaser += line + '\n';
    }

    planStore.set(planId, {
      status: 'ready',
      text: planText,
      teaser: teaser.trim(),
      paid: false,
      tier: A.tier,
      level: A.level,
      email: A.email,
    });

    logger.info('Plan stored', { planId, tier: A.tier, level: A.level });
  } catch (err) {
    logger.error('Plan generation failed', { message: err.message, planId });
    planStore.set(planId, {
      status: 'error',
      error: 'Unable to generate your program right now. Please try again in a moment.',
      paid: false,
      tier: A.tier,
    });
  }
});

// Polled by the frontend after POST above returns a planId.
router.get('/:planId', apiLimiter, (req, res) => {
  const { planId } = req.params;
  if (!planId || !planId.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json({ error: 'Invalid plan ID.' });
  }

  const plan = planStore.get(planId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or expired.' });
  }

  if (plan.status === 'pending') {
    return res.json({ status: 'pending' });
  }
  if (plan.status === 'error') {
    return res.status(500).json({ status: 'error', error: plan.error });
  }
  return res.json({ status: 'ready', teaser: plan.teaser });
});

module.exports = router;
