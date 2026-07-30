'use strict';
/**
 * Maxwell Training — Quiz flow & plan generation
 * Calls /api/generate (no API keys in browser)
 */

// ── Quiz state (session-scoped only, not persisted) ─────────────────────
let A = {
  goals:[], fname:'', age:'', height_cm:'', weight:'', sex:'',
  level:'intermediate', duration:'12weeks', days:4, hours:60,
  gym:'Full commercial gym', style:'Athletic', playsport:'no', sport:'',
  position:'', season:'offseason', priority:[], avoid:'',
  injury:'', squat:'', bench:'', deadlift:'', pullups:'', note:'',
};
window.A = A; // expose for checkout.js

let genPlanText = '';
let currentPlanId = null;
let generating = false;
let tier = 'intermediate';

window.startQuiz = function(lvl) {
  if (lvl) { A.level = lvl; tier = lvl; }
  showPg('quiz');
  goQ(1);
  const cta = document.getElementById('sticky-cta');
  if (cta) cta.hidden = true;
};

// ── Quiz navigation ────────────────────────────────────────────────────
const TOTAL_Q = 12;
let currentQ = 1;

window.goQ = function(n) {
  currentQ = n;
  document.querySelectorAll('.q-step').forEach(el => {
    el.hidden = (el.dataset.q !== String(n));
  });
  const pct = ((n - 1) / TOTAL_Q) * 100;
  const bar = document.getElementById('quiz-progress-fill');
  if (bar) bar.style.width = pct + '%';
  const counter = document.getElementById('q-counter');
  if (counter) counter.textContent = `Question ${n} of ${TOTAL_Q}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.getCurrentQ = function() { return currentQ; };

// ── Multi-select helpers ─────────────────────────────────────────────
window.pick = function(el, arr, val) {
  const idx = arr.indexOf(val);
  if (idx >= 0) { arr.splice(idx, 1); el.classList.remove('sel'); }
  else          { arr.push(val);       el.classList.add('sel');    }
};

window.togMuscle = function(el, val) { pick(el, A.priority, val); };

window.togStyle = function(el, val) {
  A.style = val;
  document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
};

window.rng = function(id, key, display) {
  const el = document.getElementById(id);
  if (!el) return;
  A[key] = Number(el.value);
  const disp = document.getElementById(display);
  if (disp) {
    disp.textContent = key === 'hours'
      ? `${A[key]} min`
      : A[key];
  }
};

// ── Q6 body stats validation ─────────────────────────────────────────
window.chkQ6 = function() {
  const fields = [
    { id: 'q6-age',    key: 'age',       min: 13,  max: 80  },
    { id: 'q6-weight', key: 'weight',    min: 50,  max: 500 },
    { id: 'q6-height', key: 'height_cm', min: 100, max: 250 },
  ];
  let ok = true;
  for (const f of fields) {
    const el = document.getElementById(f.id);
    const errEl = document.getElementById(f.id + '-err');
    if (!el) continue;
    const v = Number(el.value);
    if (!el.value || isNaN(v) || v < f.min || v > f.max) {
      ok = false;
      el.classList.add('error');
      if (errEl) errEl.style.display = 'block';
    } else {
      A[f.key] = v;
      el.classList.remove('error');
      if (errEl) errEl.style.display = 'none';
    }
  }
  // Sex is optional
  const sexEl = document.getElementById('q6-sex');
  if (sexEl) A.sex = sexEl.value || 'prefer not to say';
  return ok;
};

// ── Plan generation — calls backend ─────────────────────────────────
window.genPlan = async function() {
  if (generating) return;
  generating = true;

  // Read final quiz answers
  A.fname = document.getElementById('q12-name')?.value.trim() || 'Athlete';
  A.note  = (document.getElementById('q12-note')?.value.trim() || '').slice(0, 300);

  // Read lifts
  ['squat','bench','deadlift','pullups'].forEach(k => {
    const el = document.getElementById('q11-' + k);
    if (el && el.value) A[k] = Number(el.value) || '';
  });

  // Read injury / avoid
  A.avoid  = (document.getElementById('q10-avoid')?.value.trim() || '').slice(0, 200);
  A.injury = (document.getElementById('q10-injury')?.value.trim() || '').slice(0, 200);

  // Show loading
  showPg('plan');
  document.getElementById('pl-load').hidden = false;
  document.getElementById('pl-body').hidden = true;
  const cta = document.getElementById('sticky-cta');
  if (cta) cta.hidden = true;

  // Animate loading steps
  const steps = Array.from(document.querySelectorAll('.load-step'));
  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === stepIdx);
      s.classList.toggle('done',   i < stepIdx);
    });
    stepIdx++;
    if (stepIdx >= steps.length) clearInterval(stepTimer);
  }, 1800);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...A, tier }),
    });

    clearInterval(stepTimer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Generation failed');
    }

    const data = await res.json();
    currentPlanId = data.planId;
    genPlanText   = data.teaser || '';
    window.currentPlanId = currentPlanId;

    // Show teaser
    showPlanContent(genPlanText, true);

  } catch (err) {
    clearInterval(stepTimer);
    document.getElementById('pl-load').hidden = true;
    const body = document.getElementById('pl-body');
    if (body) {
      body.hidden = false;
      body.innerHTML = `<div style="text-align:center;padding:60px 20px">
        <p style="color:var(--mid);margin-bottom:20px">${escText(err.message)}</p>
        <button class="hero-btn" onclick="showPg('home')">← Back to home</button>
      </div>`;
    }
    announce(err.message);
  } finally {
    generating = false;
  }
};

function escText(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function showPlanContent(text, isTeaser) {
  document.getElementById('pl-load').hidden = true;
  const body = document.getElementById('pl-body');
  body.hidden = false;

  const out = document.getElementById('pl-out');
  if (out) {
    // Use mdToHtml which escapes before inserting
    out.innerHTML = mdToHtml(text);
    if (isTeaser) {
      // Add blur overlay
      const wrap = out.closest('.plan-blur-wrap') || out;
      wrap.classList.add('blurred');
    }
  }
}

window.showPlanContent = showPlanContent;

// ── Markdown → safe HTML ─────────────────────────────────────────────
window.mdToHtml = function(t) {
  // Escape first, then apply markdown patterns on escaped text
  let h = t
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^#### (.+)$/gm,'<h4>$1</h4>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^---+$/gm,'<hr>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>');

  // Table rendering
  h = h.replace(/(\|.+\|\n)+/g, match => {
    const rows = match.trim().split('\n');
    let table = '<div style="overflow-x:auto"><table>';
    rows.forEach((row, i) => {
      if (row.match(/^\|[-| :]+\|$/)) return; // separator row
      const cells = row.split('|').slice(1,-1);
      if (i === 0) {
        table += '<thead><tr>' + cells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>';
      } else {
        table += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      }
    });
    table += '</tbody></table></div>';
    return table;
  });

  h = h.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  return `<p>${h}</p>`;
};

// ── Adjust feature ───────────────────────────────────────────────────
let adjSel = '';
window.quickAdj = function(el, topic) {
  document.querySelectorAll('.adj-chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  adjSel = topic;
  const inp = document.getElementById('adj-inp');
  if (inp) {
    inp.placeholder = `Change ${topic.toLowerCase()}...`;
    inp.focus();
  }
};

window.doAdj = async function() {
  if (generating || !currentPlanId) return;
  const inp = document.getElementById('adj-inp');
  const val = inp?.value.trim();
  if (!val) return;

  generating = true;
  const btn = document.getElementById('adj-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

  // Build modified request
  const modified = { ...A, tier };
  if (adjSel === 'Duration') modified.duration = val;
  else modified.note = `${A.note} User adjustment: change ${adjSel} — ${val}`.slice(0, 400);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modified),
    });
    if (!res.ok) throw new Error('Could not update program');
    const data = await res.json();
    currentPlanId = data.planId;
    window.currentPlanId = currentPlanId;
    genPlanText = data.teaser;
    showPlanContent(data.teaser, true);
    announce('Program updated');
  } catch (err) {
    announce(err.message);
  } finally {
    generating = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Update'; }
    if (inp) inp.value = '';
  }
};
