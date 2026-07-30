'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validate } = require('../services/validator');
const { generatePlan } = require('../services/anthropic');
const planStore = require('../services/planStore');
const { generateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../services/logger');

const router = express.Router();
const TIMEOUT_MS = 90_000; // 90 seconds

router.post('/', generateLimiter, async (req, res) => {
  // Validate inputs
  const result = validate(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: 'Invalid input', details: result.errors });
  }

  const A = result.data;
  const planId = uuidv4();

  // Timeout wrapper
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Plan generation timed out. Please try again.' });
    }
  }, TIMEOUT_MS);

  try {
    const planText = await generatePlan(A);

    // Store plan server-side (unpaid by default)
    planStore.set(planId, {
      text: planText,
      paid: false,
      tier: A.tier,
      email: A.email,
      level: A.level,
    });

    clearTimeout(timeout);

    // Return only a teaser (first ~1200 chars) to the client
    // Full plan only accessible after payment via /api/plans/:planId
    const lines = planText.split('\n');
    let teaser = '';
    let sectionCount = 0;
    for (const line of lines) {
      if (line.startsWith('## ')) sectionCount++;
      if (sectionCount >= 3) break;
      teaser += line + '\n';
    }

    logger.info('Plan stored', { planId, tier: A.tier, level: A.level });

    return res.json({ planId, teaser: teaser.trim() });

  } catch (err) {
    clearTimeout(timeout);
    logger.error('Plan generation failed', { message: err.message, planId });
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Unable to generate your program right now. Please try again in a moment.',
      });
    }
  }
});

module.exports = router;
