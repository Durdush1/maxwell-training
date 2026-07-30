'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { logger } = require('./services/logger');

const generateRoute = require('./routes/generate');
const checkoutRoute = require('./routes/checkout');
const webhookRoute  = require('./routes/webhook');
const reviewsRoute  = require('./routes/reviews');
const plansRoute    = require('./routes/plans');

const app = express();
const PORT = process.env.PORT || 3001;
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://cdn.emailjs.com',
        'https://cdn.jsdelivr.net/npm/@emailjs/',
        'https://js.stripe.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",          // required for inline critical CSS
        'https://fonts.googleapis.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://api.emailjs.com',
      ],
      frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin (no origin header) and the configured frontend
    if (!origin || origin === ORIGIN) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

// ── Stripe webhook needs raw body ─────────────────────────────────────────
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// ── JSON body for everything else ─────────────────────────────────────────
app.use(express.json({ limit: '32kb' }));

// ── Static frontend ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1h',
  etag: true,
}));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/generate',  generateRoute);
app.use('/api/checkout',  checkoutRoute);
app.use('/api/webhook',   webhookRoute);
app.use('/api/reviews',   reviewsRoute);
app.use('/api/plans',     plansRoute);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Catch-all → SPA ──────────────────────────────────────────────────────
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { url: req.url, message: err.message });
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
});

app.listen(PORT, () => {
  logger.info(`Maxwell Training server running on port ${PORT}`);
});

module.exports = app; // for tests
