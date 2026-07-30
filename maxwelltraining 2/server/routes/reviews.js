'use strict';
const express = require('express');
const { reviewLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../services/logger');

const router = express.Router();

// In-memory review store with moderation queue.
// Swap for a real DB (Supabase/PlanetScale) in production.
const approved  = []; // publicly visible after moderation
const pending   = []; // awaiting approval

function sanitizeText(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLen)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .trim();
}

// GET /api/reviews — only approved reviews
router.get('/', apiLimiter, (_, res) => {
  res.json({ reviews: approved });
});

// POST /api/reviews — submit a review
router.post('/', reviewLimiter, (req, res) => {
  const { name, rating, text, orderRef } = req.body;

  // Validation
  const ratingNum = parseInt(rating, 10);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  const safeName = sanitizeText(name, 60);
  if (!safeName || safeName.length < 2) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }

  const safeText = sanitizeText(text, 600);
  if (!safeText || safeText.length < 10) {
    return res.status(400).json({ error: 'Review must be at least 10 characters.' });
  }

  // Optional: verify order reference is a valid planId format
  const safeOrder = typeof orderRef === 'string' && orderRef.match(/^[0-9a-f-]{36}$/i)
    ? orderRef : null;

  const review = {
    id: Date.now(),
    name: safeName,
    rating: ratingNum,
    text: safeText,
    orderRef: safeOrder,
    createdAt: new Date().toISOString(),
    approved: false,
  };

  pending.push(review);

  logger.info('Review submitted (pending moderation)', {
    name: safeName,
    rating: ratingNum,
    chars: safeText.length,
  });

  return res.json({
    message: 'Thank you! Your review will appear after moderation.',
  });
});

// POST /api/reviews/approve/:id — internal moderation endpoint
// Protect this with a secret header in production
router.post('/approve/:id', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const id = parseInt(req.params.id, 10);
  const idx = pending.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Review not found' });

  const [review] = pending.splice(idx, 1);
  review.approved = true;
  approved.push(review);

  logger.info('Review approved', { id });
  return res.json({ ok: true, review });
});

module.exports = router;
