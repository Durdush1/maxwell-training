'use strict';
const { createLogger, format, transports } = require('winston');

// Fields we NEVER log — health/injury data is sensitive
const SCRUB_KEYS = ['injury', 'avoid', 'note', 'email', 'fname'];

function scrub(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const key of SCRUB_KEYS) {
    if (key in out) out[key] = '[redacted]';
  }
  return out;
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? format.json()
        : format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// Wrap to auto-scrub metadata
const safeLogger = {
  info:  (msg, meta = {}) => logger.info(msg,  scrub(meta)),
  warn:  (msg, meta = {}) => logger.warn(msg,  scrub(meta)),
  error: (msg, meta = {}) => logger.error(msg, scrub(meta)),
  debug: (msg, meta = {}) => logger.debug(msg, scrub(meta)),
};

module.exports = { logger: safeLogger };
