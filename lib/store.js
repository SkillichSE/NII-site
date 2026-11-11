/* Хранилище новостей в Vercel Blob: news/data.json + картинки news/img-*.ext */
const { put, list, del } = require('@vercel/blob');
const DATA = 'news/data.json';

async function readNews() {
  const { blobs } = await list({ prefix: DATA });
  const b = blobs.find((x) => x.pathname === DATA);
  if (!b) return [];
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) return [];
  try { return await r.json(); } catch { return []; }
}
async function writeNews(arr) {
  await put(DATA, JSON.stringify(arr), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false,
    allowOverwrite: true, cacheControlMaxAge: 0,
  });
}
async function saveImage(buf, ext, type) {
  const name = 'news/img-' + require('crypto').randomBytes(8).toString('hex') + '.' + ext;
  const r = await put(name, buf, { access: 'public', contentType: type, addRandomSuffix: false });
  return r.url;
}
async function removeImage(url) { if (url) { try { await del(url); } catch {} } }

module.exports = { readNews, writeNews, saveImage, removeImage };
