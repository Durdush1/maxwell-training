// Confirms with Stripe that a Checkout Session was really paid.
// Needs env var STRIPE_SECRET_KEY (a restricted key with read-only access to Checkout Sessions).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const id = String((req.query && req.query.session_id) || '');
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(id)) return res.status(400).json({ paid: false, error: 'Invalid session' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ paid: false, error: 'Server configuration error' });
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + id, {
      headers: { Authorization: 'Bearer ' + key },
    });
    const s = await r.json();
    if (!r.ok) return res.status(200).json({ paid: false });
    const paid = s.status === 'complete' && s.payment_status === 'paid';
    return res.status(200).json({ paid, amount: paid ? s.amount_total : 0 });
  } catch (e) {
    console.error('verify error', e.message);
    return res.status(500).json({ paid: false, error: 'Could not verify payment' });
  }
};
