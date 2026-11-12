/* Админ-API: /api/admin?action=me|login|logout|add|edit|del */
const crypto = require('crypto');
const { translateNews } = require('../lib/translate');
const { readNews, writeNews, saveImage, removeImage } = require('../lib/store');

const PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('nii:' + PASSWORD).digest('hex');

const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const makeToken = () => { const exp = Date.now() + 12 * 3600e3; return exp + '.' + sign(String(exp)); };
function okToken(t) {
  const [exp, sig] = String(t || '').split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const isAdmin = (req) => { const m = /(?:^|;\s*)adm=([^;]+)/.exec(req.headers.cookie || ''); return !!(PASSWORD && m && okToken(decodeURIComponent(m[1]))); };
const hash = (s) => crypto.createHash('sha256').update(s).digest();
const eq = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
const cookie = (req, v, age) => `adm=${v}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}` + (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');

const fails = new Map(); // грубая защита от перебора (в пределах одного инстанса)
function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8) return ['jpg', 'image/jpeg'];
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ['png', 'image/png'];
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return ['webp', 'image/webp'];
  if (b.slice(0, 3).toString() === 'GIF') return ['gif', 'image/gif'];
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const act = req.query.action;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  try {
    if (act === 'me') return res.json({ admin: isAdmin(req), enabled: !!PASSWORD });
    if (act === 'logout') { res.setHeader('Set-Cookie', cookie(req, '', 0)); return res.json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (act === 'login') {
      if (!PASSWORD) return res.status(503).json({ error: 'Не задана переменная ADMIN_PASSWORD в настройках Vercel' });
      const f = fails.get(ip);
      if (f && f.n >= 8 && Date.now() - f.t < 15 * 60e3) return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже.' });
      if (!eq(String((req.body || {}).password || ''), PASSWORD)) {
        fails.set(ip, { n: (f ? f.n : 0) + 1, t: Date.now() });
        return res.status(401).json({ error: 'Неверный пароль' });
      }
      fails.delete(ip);
      res.setHeader('Set-Cookie', cookie(req, encodeURIComponent(makeToken()), 43200));
      return res.json({ ok: true });
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'Нужен вход' });
    const d = req.body || {};

    if (act === 'add') {
      const title = String(d.title || '').trim().slice(0, 140);
      const text = String(d.text || '').trim().slice(0, 4000);
      if (!text && !d.image) return res.status(400).json({ error: 'Добавьте текст или картинку' });
      let image = '';
      if (d.image) {
        const m = /^data:image\/[\w+.-]+;base64,(.+)$/s.exec(String(d.image));
        if (!m) return res.status(400).json({ error: 'Некорректная картинка' });
        const buf = Buffer.from(m[1], 'base64');
        const t = sniff(buf);
        if (!t) return res.status(400).json({ error: 'Допустимы JPG, PNG, WEBP, GIF' });
        image = await saveImage(buf, t[0], t[1]);
      }
      const item = { id: crypto.randomBytes(6).toString('hex'), title, text, image, date: new Date().toISOString() };
      const tr = await translateNews(title, text); if (Object.keys(tr).length) item.tr = tr;
      const all = await readNews();
      all.unshift(item);
      await writeNews(all);
      return res.json(item);
    }

    if (act === 'edit') {
      const all = await readNews();
      const it = all.find((x) => x.id === String(d.id));
      if (!it) return res.status(404).json({ error: 'Не найдено' });
      const title = String(d.title || '').trim().slice(0, 140);
      const text = String(d.text || '').trim().slice(0, 4000);
      let image = it.image, old = '';
      if (d.image) {
        const m = /^data:image\/[\w+.-]+;base64,(.+)$/s.exec(String(d.image));
        if (!m) return res.status(400).json({ error: 'Некорректная картинка' });
        const buf = Buffer.from(m[1], 'base64');
        const t = sniff(buf);
        if (!t) return res.status(400).json({ error: 'Допустимы JPG, PNG, WEBP, GIF' });
        old = it.image; image = await saveImage(buf, t[0], t[1]);
      } else if (d.removeImage) { old = it.image; image = ''; }
      if (!text && !image) return res.status(400).json({ error: 'Добавьте текст или картинку' });
      const changed = title !== it.title || text !== it.text || !it.tr;
      Object.assign(it, { title, text, image });
      if (changed) { const tr = await translateNews(title, text); if (Object.keys(tr).length) it.tr = tr; else delete it.tr; }
      await writeNews(all);
      await removeImage(old);
      return res.json(it);
    }

    if (act === 'del') {
      const all = await readNews();
      const it = all.find((x) => x.id === String(d.id));
      if (!it) return res.status(404).json({ error: 'Не найдено' });
      await writeNews(all.filter((x) => x.id !== it.id));
      await removeImage(it.image);
      return res.json({ ok: true });
    }
    res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера: ' + (e.message || e) + (/token/i.test(String(e.message)) ? ' (подключён ли Blob-store к проекту?)' : '') });
  }
};
