# Maxwell Training

Custom personalised training programs for athletes. Built by Maxwell Ionita — D1 Soccer, Loyola University Chicago.

---

## Architecture

```
Frontend (Netlify)  →  Backend (Railway/Render)  →  Stripe + Anthropic
```

- **Frontend**: Static HTML/CSS/JS served from `/public` via Netlify
- **Backend**: Node.js/Express server in `/server` deployed to Railway or Render
- **Payments**: Stripe Checkout Sessions (server-side only)
- **Programs**: Anthropic API called server-side only — key never exposed to browser

---

## Environment Variables

Required in your server's environment (never committed to git):

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | From console.anthropic.com — server-side only |
| `STRIPE_SECRET_KEY` | From dashboard.stripe.com — server-side only |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard > Webhooks |
| `ALLOWED_ORIGIN` | Your Netlify URL e.g. `https://maxwelltraining.netlify.app` |
| `PORT` | Server port (Railway sets this automatically) |
| `NODE_ENV` | Set to `production` |
| `ADMIN_KEY` | Random string for approving reviews via API |
| `LOG_LEVEL` | `info` for production |

Copy `.env.example` to `.env` for local development.

---

## Installation

```bash
# Clone or download the project
cd maxwell-training

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your real keys
```

---

## Local Development

```bash
npm run dev
# Server runs at http://localhost:3001
# Open http://localhost:3001 in browser
```

The frontend is served statically from `/public` by the Express server.

---

## Running Tests

```bash
npm test
```

---

## Deployment

### Step 1 — Deploy backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select this repo
3. Set **all environment variables** in the Railway dashboard:
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ALLOWED_ORIGIN` = your Netlify URL
   - `NODE_ENV` = `production`
   - `ADMIN_KEY` = any random 32-char string
4. Railway auto-detects `package.json` and runs `npm start`
5. Note your Railway URL: `https://your-app.railway.app`

### Step 2 — Update frontend API URL

In `public/js/quiz.js` and `public/js/checkout.js`, the fetch calls use relative URLs (`/api/generate`, `/api/checkout/create-session`). 

**If frontend and backend are on the same domain** (Railway serving everything): no change needed.

**If frontend is on Netlify and backend is on Railway**: update all `fetch('/api/...')` calls to `fetch('https://your-app.railway.app/api/...')` and set `ALLOWED_ORIGIN` to your Netlify URL.

### Step 3 — Deploy frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → New site → Deploy from GitHub
2. Set **Publish directory** to `public`
3. No build command needed (static HTML)
4. Add a `netlify.toml` if you need redirects

### Step 4 — Configure Stripe Webhooks

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → Webhooks
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app.railway.app/api/webhook`
4. Events to listen for: `checkout.session.completed`
5. Copy the **Signing secret** → paste as `STRIPE_WEBHOOK_SECRET` in Railway
6. Redeploy Railway after adding the secret

### Step 5 — Verify end-to-end

1. Take the quiz on your live site
2. Go through checkout with a [Stripe test card](https://stripe.com/docs/testing): `4242 4242 4242 4242`
3. Confirm the PDF downloads after payment
4. Check Railway logs for any errors

---

## Approving Reviews

Reviews go into a moderation queue before appearing publicly.

To approve a review:

```bash
curl -X POST https://your-app.railway.app/api/reviews/approve/REVIEW_ID \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

---

## Security Notes

- The Anthropic API key is **never** in frontend code
- Stripe payment is verified server-side via webhook signature — URL parameters are never trusted
- All quiz free-text fields are sanitized and treated as data, not instructions
- Injury information is never logged
- Rate limiting: 5 plan generations per 15 min per IP

---

## Manual Launch Checklist

- [ ] Revoke old exposed Anthropic API key at console.anthropic.com
- [ ] Generate new Anthropic API key
- [ ] Add all environment variables to Railway
- [ ] Stripe webhook configured and `STRIPE_WEBHOOK_SECRET` set
- [ ] Test full purchase flow with Stripe test card `4242 4242 4242 4242`
- [ ] Confirm PDF downloads after payment
- [ ] Replace `/public/images/favicon.ico` with real favicon
- [ ] Update canonical URL in `public/index.html`
- [ ] Update `ALLOWED_ORIGIN` to match your real Netlify domain
- [ ] Run `npm test` — all tests pass
- [ ] Check Railway logs after first real purchase

---

## Email

All contact forms and confirmations go to: **Maxwell.ionita@gmail.com**
