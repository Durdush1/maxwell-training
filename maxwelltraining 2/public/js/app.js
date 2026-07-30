'use strict';
/**
 * Maxwell Training — App Entry Point
 * Initialises routing, navigation, modals, sticky CTA, and reviews.
 */

// ── Pricing — single source of truth ──────────────────────────────────────
window.PRICES = {
  beginner:     { amount: 24, label: 'Starter',      desc: 'Starter Plan'      },
  intermediate: { amount: 39, label: 'Performance',  desc: 'Performance Plan'  },
  advanced:     { amount: 59, label: 'Elite',        desc: 'Elite Plan'        },
};

// ── Page routing ──────────────────────────────────────────────────────────
const pages = ['home','quiz','plan','confirm'];

window.showPg = function(id) {
  pages.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.hidden = (p !== id);
  });
  if (id === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const cta = document.getElementById('sticky-cta');
    if (cta) cta.hidden = false;
  }
};

window.goTo = function(sectionId) {
  showPg('home');
  setTimeout(() => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
};

// ── Contact modal ─────────────────────────────────────────────────────────
window.openModal = function() {
  const m = document.getElementById('contact-modal');
  if (!m) return;
  m.hidden = false;
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = m.querySelector('input, textarea, button');
  if (first) first.focus();
};

window.closeModal = function() {
  const m = document.getElementById('contact-modal');
  if (!m) return;
  m.hidden = true;
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

// ── Legal modals ──────────────────────────────────────────────────────────
window.openLegal = function(type) {
  const m = document.getElementById('legal-modal');
  const title = document.getElementById('legal-title');
  const body  = document.getElementById('legal-body');
  if (!m || !title || !body) return;

  const content = LEGAL[type] || LEGAL.privacy;
  title.textContent = content.title;
  body.innerHTML = content.html;  // legal content is hardcoded, not user-generated
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  m.querySelector('button').focus();
};

window.closeLegal = function() {
  const m = document.getElementById('legal-modal');
  if (!m) return;
  m.hidden = true;
  document.body.style.overflow = '';
};

// ── Aria status helper ────────────────────────────────────────────────────
window.announce = function(msg) {
  const el = document.getElementById('aria-status');
  if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 100); }
};

// ── Sticky CTA — hide after user scrolls past hero ─────────────────────
function initStickyCTA() {
  const cta = document.getElementById('sticky-cta');
  if (!cta) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const obs = new IntersectionObserver(([e]) => {
    cta.hidden = e.isIntersecting;
  }, { threshold: 0.1 });
  obs.observe(hero);
}

// ── Reviews ───────────────────────────────────────────────────────────────
let rvRating = 0;

window.setRvRating = function(n) {
  rvRating = n;
  document.querySelectorAll('.star-rating button').forEach((btn, i) => {
    btn.classList.toggle('active', i < n);
    btn.setAttribute('aria-pressed', String(i < n));
  });
};

window.submitRv = async function(e) {
  if (e) e.preventDefault();
  const nameEl = document.getElementById('rv-n');
  const textEl = document.getElementById('rv-t');
  if (!nameEl || !textEl) return;

  const name = nameEl.value.trim();
  const text = textEl.value.trim();

  if (!name) { nameEl.focus(); return; }
  if (!text) { textEl.focus(); return; }
  if (!rvRating) { announce('Please select a star rating'); return; }

  const btn = document.getElementById('rv-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rating: rvRating, text }),
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('rv-form-wrap').innerHTML =
        '<p style="color:var(--mid);text-align:center;padding:24px">Thank you! Your review will appear after moderation.</p>';
      announce('Review submitted successfully');
    } else {
      announce(data.error || 'Could not submit review. Please try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Review'; }
    }
  } catch {
    announce('Network error. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Review'; }
  }
};

async function loadReviews() {
  try {
    const res = await fetch('/api/reviews');
    const data = await res.json();
    const grid  = document.getElementById('rv-grid');
    const empty = document.getElementById('rv-empty');
    if (!grid) return;

    if (!data.reviews || data.reviews.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    grid.hidden = false;
    if (empty) empty.hidden = true;

    data.reviews.forEach(rv => {
      const card = document.createElement('div');
      card.className = 'review-card';
      const stars = '★'.repeat(rv.rating) + '☆'.repeat(5 - rv.rating);
      const nameEl = document.createElement('div');
      nameEl.className = 'review-author';
      nameEl.textContent = rv.name;
      const starsEl = document.createElement('div');
      starsEl.className = 'review-stars';
      starsEl.textContent = stars;
      const textEl = document.createElement('div');
      textEl.className = 'review-text';
      textEl.textContent = rv.text; // textContent — no XSS risk
      card.appendChild(starsEl);
      card.appendChild(textEl);
      card.appendChild(nameEl);
      grid.appendChild(card);
    });
  } catch {
    // Fail silently — reviews are non-critical
  }
}

// ── Contact form ──────────────────────────────────────────────────────────
window.sendMsg = function() {
  const n = document.getElementById('ct-n')?.value.trim();
  const e = document.getElementById('ct-e')?.value.trim();
  const m = document.getElementById('ct-m')?.value.trim();

  if (!n || !e || !m) { announce('Please fill in all fields'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { announce('Please enter a valid email'); return; }

  const btn = document.getElementById('ct-send');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

  emailjs.send('service_n5840dn', 'template_qp1lxh9', { name: n, email: e, message: m })
    .then(() => {
      closeModal();
      announce('Message sent! I\'ll get back to you within 24 hours.');
      if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
    })
    .catch(() => {
      announce('Message could not be sent. Please email Maxwell.ionita@gmail.com directly.');
      if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
    });
};

// ── Keyboard accessibility ────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeLegal();
  }
});

// ── Legal content ─────────────────────────────────────────────────────────
const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    html: `
      <h3>What we collect</h3>
      <p>Name, email, and fitness information you provide during the quiz (age, weight, goals, sport, injuries, training history). No payment card data is ever stored — payments are handled by Stripe.</p>
      <h3>Why we collect it</h3>
      <p>To generate a personalised training program specific to your situation.</p>
      <h3>How long we keep it</h3>
      <p>Quiz data is held in memory for up to 24 hours to allow plan download after payment. It is not permanently stored. Email addresses may be used to send your program confirmation.</p>
      <h3>Who receives your data</h3>
      <ul>
        <li><strong>Anthropic</strong> — processes your quiz answers to generate your program (subject to their privacy policy)</li>
        <li><strong>Stripe</strong> — processes your payment securely</li>
        <li><strong>EmailJS</strong> — used for contact form and confirmation emails</li>
      </ul>
      <h3>Your rights</h3>
      <p>To request deletion of any data associated with your email, contact Maxwell.ionita@gmail.com.</p>
    `,
  },
  terms: {
    title: 'Terms of Service',
    html: `
      <h3>The service</h3>
      <p>Maxwell Training provides personalised digital training programs delivered as PDF downloads. Programs are educational fitness guidance and are not a substitute for professional coaching or medical advice.</p>
      <h3>Your program</h3>
      <p>Your program is generated specifically for you based on your quiz answers. Results will vary depending on individual effort, adherence, and other factors. Results are not guaranteed.</p>
      <h3>Disclaimer</h3>
      <p>Stop any exercise that causes pain. Consult a qualified healthcare professional before starting any new exercise program, particularly if you have existing injuries or medical conditions.</p>
      <h3>Payments</h3>
      <p>All payments are processed by Stripe. Programs are delivered as instant PDF downloads upon confirmed payment.</p>
    `,
  },
  refund: {
    title: 'Refund Policy',
    html: `
      <h3>7-Day Guarantee</h3>
      <p>If your program is not personalised to your quiz answers, or you are not satisfied for any reason, contact Maxwell.ionita@gmail.com within 7 days of purchase and we will make it right.</p>
      <h3>How to request a refund</h3>
      <p>Email Maxwell.ionita@gmail.com with your order details. Refunds are processed within 5–10 business days to the original payment method.</p>
      <h3>Note</h3>
      <p>Because programs are digital downloads generated specifically for you, refunds are handled on a case-by-case basis at our discretion after 7 days.</p>
    `,
  },
  disclaimer: {
    title: 'Training Disclaimer',
    html: `
      <h3>Educational fitness guidance only</h3>
      <p>Programs provided by Maxwell Training are educational fitness guidance only. They are not medical diagnosis, treatment, physical therapy, or professional coaching.</p>
      <ul>
        <li>Stop any exercise that causes pain or discomfort</li>
        <li>Consult a qualified healthcare professional if you have existing injuries or medical conditions</li>
        <li>The starting weights and recommendations are estimates based on the information you provided — adjust based on how your body responds</li>
        <li>Results are not guaranteed and will vary by individual</li>
        <li>If you are concerned about an injury, seek professional medical clearance before starting</li>
      </ul>
    `,
  },
};

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPg('home');
  initStickyCTA();
  loadReviews();

  // Check for return from Stripe checkout
  if (window.location.pathname === '/success' || window.location.search.includes('planId=')) {
    import('./checkout.js').then(m => m.checkReturn());
  }

  // Trap focus in modal
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Sticky CTA hide on quiz
  const stickyCTA = document.getElementById('sticky-cta-btn');
  if (stickyCTA) stickyCTA.addEventListener('click', () => window.startQuiz?.());
});
