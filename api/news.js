const { readNews } = require('../lib/store');
module.exports = async (req, res) => {
  try {
    const all = (await readNews()).map((n) => n.image && /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(n.image) ? { ...n, image: '/api/img?u=' + encodeURIComponent(n.image) } : n);
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    res.status(200).json(all);
  } catch (e) {
    res.status(200).json([]);
  }
};