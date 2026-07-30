'use strict';
const express = require('express');
const Stripe = require('stripe');
const planStore = require('../services/planStore');
const { logger } = require('../services/logger');

const router = express.Router();

// Track processed sessions to ensure idempotency
const processedSessions = new Set();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.warn('Webhook signature verification failed', { message: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Acknowledge receipt immediately
  res.json({ received: true });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sessionId = session.id;

    // Idempotency check
    if (processedSessions.has(sessionId)) {
      logger.info('Duplicate webhook ignored', { sessionId });
      return;
    }
    processedSessions.add(sessionId);

    // Clean up set periodically (keep last 10k)
    if (processedSessions.size > 10000) {
      const arr = [...processedSessions];
      arr.slice(0, 5000).forEach(id => processedSessions.delete(id));
    }

    const { planId, tier } = session.metadata || {};

    if (!planId) {
      logger.error('Webhook: no planId in metadata', { sessionId });
      return;
    }

    const marked = planStore.markPaid(planId, sessionId);

    if (marked) {
      logger.info('Plan marked as paid', { planId, tier, sessionId });
    } else {
      logger.warn('Webhook: planId not found in store', { planId, sessionId });
    }
  }
});

module.exports = router;
