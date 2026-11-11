// Reviews are delivered to the owner through the existing EmailJS contact template.
// No public review is displayed before the owner has approved it.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ reviews: [] });
  if (req.method === 'POST') return res.status(503).json({ error: 'Please use the review form on the website to send your review.' });
  res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: 'Method not allowed' });
};
