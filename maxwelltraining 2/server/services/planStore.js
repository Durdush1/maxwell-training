'use strict';
/**
 * In-memory plan store with TTL.
 * For production with multiple instances, swap this for Redis.
 * Plans are keyed by planId (UUID). Paid flag is set by webhook.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const store = new Map();

function set(planId, data) {
  store.set(planId, { ...data, createdAt: Date.now() });
}

function get(planId) {
  const entry = store.get(planId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(planId);
    return null;
  }
  return entry;
}

function markPaid(planId, stripeSessionId) {
  const entry = store.get(planId);
  if (!entry) return false;
  store.set(planId, { ...entry, paid: true, stripeSessionId });
  return true;
}

function isPaid(planId) {
  const entry = get(planId);
  return !!(entry && entry.paid);
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}, 60 * 60 * 1000);

module.exports = { set, get, markPaid, isPaid };
