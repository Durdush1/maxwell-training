'use strict';
/**
 * Maxwell Training — Checkout & plan retrieval
 * All payment verification is server-side.
 * Never trusts URL params or localStorage as proof of payment.
 */

let checkoutInProgress = false;

// ── Show payment UI ─────────────────────────────────────────────────────
window.showPay = function() {
  const payBox = document.getElementById('pay-box');
  if (payBox) {
    payBox.hidden = false;
    payBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ── Tier selection ───────────────────────────────────────────────────────
window.selTier = function(el, t) {
  document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  window.tier = t;

  const priceEl = document.getElementById('pay-price-display');
  const nameEl  = document.getElementById('pay-tier-name');
  const price   = window.PRICES?.[t];
  if (price && priceEl) priceEl.textContent = `$${price.amount}`;
  if (price && nameEl)  nameEl.textContent  = price.desc;
};

// ── Initiate checkout — creates server-side Stripe session ───────────────
window.doCheckout = async function() {
  if (checkoutInProgress) return;

  const planId = window.currentPlanId;
  if (!planId) { announce('No plan found. Please take the quiz again.'); return; }

  const nmEl = document.getElementById('co-nm');
  const emEl = document.getElementById('co-em');
  const nm   = nmEl?.value.trim();
  const em   = emEl?.value.trim();

  // Validation
  let valid = true;
  if (!nm) { nmEl?.classList.add('error'); valid = false; }
  else nmEl?.classList.remove('error');
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { emEl?.classList.add('error'); valid = false; }
  else emEl?.classList.remove('error');
  if (!valid) { announce('Please enter your name and a valid email address'); return; }

  const t   = window.tier || 'intermediate';
  const btn = document.getElementById('dl-btn');

  checkoutInProgress = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting to checkout...'; }
  announce('Redirecting to secure checkout');

  try {
    const res = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, tier: t, name: nm, email: em }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Could not start checkout');

    if (data.alreadyPaid) {
      // Already paid — go straight to download
      await retrieveAndDownload(planId);
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('Invalid checkout response');
    }

  } catch (err) {
    announce(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Continue to checkout'; }
    checkoutInProgress = false;
  }
};

// ── Check return from Stripe ─────────────────────────────────────────────
export async function checkReturn() {
  const params  = new URLSearchParams(window.location.search);
  const planId  = params.get('planId');

  if (!planId) return;

  // Clean URL — remove query string without reload
  window.history.replaceState({}, '', window.location.pathname);

  window.currentPlanId = planId;
  showPg('confirm');

  document.getElementById('conf-status').textContent = 'Verifying payment...';

  // Poll for up to 30 seconds — webhook may arrive slightly after redirect
  let verified = false;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (res.ok) { verified = true; break; }
      if (res.status === 404) break; // plan expired
    } catch { /* network error — keep trying */ }
  }

  const statusEl = document.getElementById('conf-status');
  const dlBtn    = document.getElementById('conf-dl-btn');

  if (verified) {
    if (statusEl) statusEl.textContent = 'Payment confirmed. Your program is ready.';
    if (dlBtn)    dlBtn.hidden = false;
    announce('Payment confirmed — your program is ready to download');
  } else {
    if (statusEl) statusEl.textContent =
      'Payment confirmed by Stripe. If your download button does not appear within a minute, please contact Maxwell.ionita@gmail.com.';
    announce('Payment received. Download will be available shortly.');
  }
}

// ── Retrieve paid plan and trigger PDF download ───────────────────────────
window.dlPDF = async function() {
  const planId = window.currentPlanId;
  if (!planId) { announce('Plan ID not found. Please contact support.'); return; }

  const btn = document.getElementById('conf-dl-btn') || document.getElementById('dl-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Preparing download...'; }
  announce('Preparing your PDF download');

  try {
    // Fetch full plan from server (only succeeds if paid)
    const res = await fetch(`/api/plans/${planId}`);
    if (res.status === 402) throw new Error('Payment not yet confirmed. Please wait a moment and try again.');
    if (!res.ok) throw new Error('Could not retrieve your plan. Please contact Maxwell.ionita@gmail.com.');

    const data = await res.json();

    // Store plan text for PDF generation
    window.genPlanText = data.text;

    // Generate PDF (uses pdf.js)
    if (typeof window.makePDF === 'function') {
      window.makePDF();
    } else {
      // Fallback — open plan in new window for printing
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>Maxwell Training Program</title>
        <style>body{font-family:sans-serif;max-width:760px;margin:40px auto;padding:24px;line-height:1.7}
        table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#111;color:#fff;padding:10px}
        td{padding:8px;border-bottom:1px solid #eee}</style></head>
        <body>${window.mdToHtml?.(data.text) || data.text}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }

    announce('PDF download started');

  } catch (err) {
    announce(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Download PDF'; }
  }
};
