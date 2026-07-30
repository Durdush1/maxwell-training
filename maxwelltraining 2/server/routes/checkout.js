'use strict';
const express = require('express');
const Stripe = require('stripe');
const planStore = require('../services/planStore');
const { checkoutLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../services/logger');

const router = express.Router();

// Centralised pricing — single source of truth
const PRICES = {
  beginner:     { amount: 2400, label: 'Starter'      }, // $24
  intermediate: { amount: 3900, label: 'Performance'  }, // $39
  advanced:     { amount: 5900, label: 'Elite'        }, // $59
};

const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

router.post('/create-session', checkoutLimiter, async (req, res) => {
  const { planId, tier } = req.body;

  if (!planId || typeof planId !== 'string' || !planId.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json({ error: 'Invalid plan ID.' });
  }

  const price = PRICES[tier];
  if (!price) {
    return res.status(400).json({ error: 'Invalid tier.' });
  }

  const plan = planStore.get(planId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or expired. Please regenerate.' });
  }

  if (plan.paid) {
    // Already paid — redirect straight to download
    return res.json({ alreadyPaid: true, planId });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: price.amount,
          product_data: {
            name: `Maxwell Training — ${price.label} Program`,
            description: 'Custom personalised training program. Instant PDF download.',
          },
        },
        quantity: 1,
      }],
      metadata: { planId, tier },
      customer_email: plan.email || undefined,
      success_url: `${ORIGIN}/success?planId=${planId}`,
      cancel_url:  `${ORIGIN}/?cancelled=1`,
      expires_at:  Math.floor(Date.now() / 1000) + 1800, // 30 min
    });

    logger.info('Checkout session created', { planId, tier, sessionId: session.id });
    return res.json({ url: session.url });

  } catch (err) {
    logger.error('Stripe session creation failed', { message: err.message, planId });
    return res.status(500).json({ error: 'Unable to start checkout. Please try again.' });
  }
});

module.exports = router;
