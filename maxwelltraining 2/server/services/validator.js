'use strict';
/**
 * Validates and sanitises all quiz inputs server-side.
 * Treats free-text fields as athlete data — never as instructions.
 */

const GOALS_ALLOW = [
  'Build Muscle','Get Stronger','Lose Fat',
  'Athletic Performance','Improve Endurance','General Fitness',
];
const STYLE_ALLOW = [
  'Strength','Hypertrophy','Athletic / Power',
  'Endurance','Calisthenics','Hybrid',
];
const GYM_ALLOW = [
  'No equipment / Bodyweight only',
  'Home gym (dumbbells, pull-up bar)',
  'Full commercial gym',
];
const LEVEL_ALLOW = ['beginner','intermediate','advanced'];
const TIER_ALLOW  = ['beginner','intermediate','advanced'];
const DUR_ALLOW   = ['4weeks','8weeks','12weeks','16weeks'];
const SPORT_ALLOW = [
  'Soccer','Basketball','Football','Baseball','Tennis',
  'MMA / Martial Arts','Track & Field','Swimming',
  'Volleyball','Hockey','Rugby','Other','None',
];
const SEX_ALLOW = ['male','female','prefer not to say'];

function clamp(val, min, max) {
  const n = Number(val);
  return isNaN(n) ? null : Math.min(max, Math.max(min, n));
}

function safeText(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  // Strip anything that looks like a template injection or prompt injection
  return val
    .slice(0, maxLen)
    .replace(/[`<>]/g, '')           // remove backtick and angle brackets
    .replace(/\b(ignore|forget|system|assistant|user|prompt|instruction)\b/gi, '[x]')
    .trim();
}

// Style is now multi-select on the frontend, sent as a comma-joined string
// (e.g. "Strength, Athletic / Power"). Every individual piece must still be
// one of the known styles.
function isValidStyle(val) {
  if (typeof val !== 'string' || !val) return false;
  return val.split(',').map(s => s.trim()).every(s => STYLE_ALLOW.includes(s));
}

function validate(body) {
  const errors = [];

  // tier
  if (!TIER_ALLOW.includes(body.tier)) errors.push('Invalid tier');
  // level
  if (!LEVEL_ALLOW.includes(body.level)) errors.push('Invalid level');
  // goals
  if (!Array.isArray(body.goals) || body.goals.length === 0) errors.push('Goals required');
  const badGoals = (body.goals || []).filter(g => !GOALS_ALLOW.includes(g));
  if (badGoals.length) errors.push('Invalid goal value');
  // style
  if (body.style && !isValidStyle(body.style)) errors.push('Invalid style');
  // duration
  if (!DUR_ALLOW.includes(body.duration)) errors.push('Invalid duration');
  // sex
  if (body.sex && !SEX_ALLOW.includes(body.sex)) errors.push('Invalid sex value');

  // numerics
  const ageRaw  = Number(body.age);
  const age    = (!isNaN(ageRaw) && ageRaw >= 13 && ageRaw <= 80) ? ageRaw : null;
  const weight = clamp(body.weight, 50, 500);
  const height_cm = clamp(body.height_cm, 100, 250);
  const days   = clamp(body.days, 2, 6);
  const hours  = clamp(body.hours, 20, 120);
  const squat  = clamp(body.squat, 0, 1000);
  const bench  = clamp(body.bench, 0, 700);
  const deadlift = clamp(body.deadlift, 0, 1200);
  const pullups  = clamp(body.pullups, 0, 50);

  if (age === null) errors.push('Invalid age (must be 13-80)');
  if (days === null) errors.push('Invalid days');

  // free text — sanitised, never trusted
  const fname   = safeText(body.fname, 40);
  const note    = safeText(body.note, 300);
  const avoid   = safeText(body.avoid, 200);
  const injury  = safeText(body.injury, 200);
  const sport   = SPORT_ALLOW.includes(body.sport) ? body.sport : (safeText(body.sport, 40) || 'None');
  const gym     = GYM_ALLOW.includes(body.gym) ? body.gym : (safeText(body.gym, 150) || 'Full commercial gym');
  const position= safeText(body.position, 40);
  const season  = safeText(body.season, 40);
  const priority= Array.isArray(body.priority)
    ? body.priority.filter(p => typeof p === 'string').map(p => safeText(p, 30)).slice(0, 6)
    : [];

  // Email — basic format check, not stored in plan content
  const emailRaw = typeof body.email === 'string' ? body.email.slice(0, 120) : '';
  const emailOk  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      tier: body.tier, level: body.level, goals: body.goals, style: body.style,
      gym, duration: body.duration,
      fname, age, weight, height_cm, days, hours, sex: body.sex || 'prefer not to say',
      squat, bench, deadlift, pullups,
      sport, position, season, priority,
      note, avoid, injury,
      email: emailOk ? emailRaw : '',
      playsport: body.playsport === 'yes' && sport !== 'None' ? 'yes' : 'no',
    },
  };
}

module.exports = { validate };
