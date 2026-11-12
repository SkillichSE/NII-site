module.exports = async (req, res) => {
  try {
    const raw = String((req.query && req.query.u) || '');
    let u;
    try { u = new URL(raw); } catch { return res.status(400).send('bad url'); }

    const okHost = u.protocol === 'https:' && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(u.hostname);
    const okPath = /^\/news\/img-[a-f0-9]+\.(png|jpg|webp|gif)$/i.test(u.pathname);
    if (!okHost || !okPath) return res.status(400).send('forbidden');

    const r = await fetch(u.href);
    if (!r.ok) return res.status(404).send('not found');

    const type = r.headers.get('content-type') || '';
    if (!/^image\//i.test(type)) return res.status(415).send('not an image');

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).send('upstream error');
  }
};
