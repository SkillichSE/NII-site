const { readNews } = require('../lib/store');
module.exports = async (req, res) => {
  try {
    const all = await readNews();
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    res.status(200).json(all);
  } catch (e) {
    res.status(200).json([]);
  }
};
