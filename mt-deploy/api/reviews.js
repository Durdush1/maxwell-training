module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ reviews: [] });
  if (req.method === 'POST') {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const text = String(b.text || '').slice(0, 1000);
    if (!text) return res.status(400).json({ error: 'Review text required' });
    console.log('REVIEW', JSON.stringify({ name: String(b.name || '').slice(0, 60), rating: Number(b.rating) || 0, text }));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
