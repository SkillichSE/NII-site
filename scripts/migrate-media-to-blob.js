#!/usr/bin/env node
/*
 * Переносит все картинки и видео из img/ и video/ в Vercel Blob
 * и заменяет ссылки на них в html/js/css на абсолютные blob-URL.
 *
 * Запуск (из корня проекта):
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... node scripts/migrate-media-to-blob.js
 *   (токен: Vercel → Project → Storage → Blob store → .env.local, либо `vercel env pull`)
 *
 * Флаги:
 *   --dry-run       ничего не загружать, подставить фейковый URL (проверка замен)
 *   --delete-local  после успешной загрузки удалить локальные img/ и video/
 *
 * Пути в Blob сохраняются как есть (img/logo.png, video/drive.mp4), без случайного
 * суффикса, поэтому URL стабильны и скрипт можно запускать повторно.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const DELETE_LOCAL = process.argv.includes('--delete-local');
const MEDIA_DIRS = ['img', 'video'];
const MEDIA_EXT = /\.(webp|png|jpe?g|gif|svg|ico|mp4|webm|mov)$/i;
const CODE_EXT = /\.(html|js|css)$/i;
const SKIP_CODE = new Set(['node_modules', '.git', '.vercel', 'scripts', 'api', 'lib']);
const TYPES = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  svg: 'image/svg+xml', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
};

function walk(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_CODE.has(e.name) || dir !== ROOT) walk(p, filter, out); }
    else if (filter(p)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

async function main() {
  const files = [];
  for (const d of MEDIA_DIRS) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs)) files.push(...walk(abs, (p) => MEDIA_EXT.test(p)));
  }
  if (!files.length) { console.log('Медиафайлов в img/ и video/ не найдено.'); return; }

  // 1. Загрузка
  const map = {}; // 'img/logo.png' -> https://<store>.public.blob.vercel-storage.com/img/logo.png
  let put;
  if (!DRY) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error('Нет BLOB_READ_WRITE_TOKEN'); process.exit(1); }
    ({ put } = require('@vercel/blob'));
  }
  let i = 0;
  for (const f of files) {
    const key = rel(f);
    i++;
    if (DRY) { map[key] = 'https://DRYRUN.public.blob.vercel-storage.com/' + key; continue; }
    const ext = key.split('.').pop().toLowerCase();
    const r = await put(key, fs.readFileSync(f), {
      access: 'public',
      contentType: TYPES[ext],
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
    map[key] = r.url;
    console.log(`[${i}/${files.length}] ${key} -> ${r.url}`);
  }
  fs.writeFileSync(path.join(ROOT, 'blob-map.json'), JSON.stringify(map, null, 2));
  const base = map[Object.keys(map)[0]].replace(/\/[^/]*$/, '').replace(/\/(img|video)(\/.*)?$/, '');

  // 2. Замена ссылок в коде
  const re = /(?<![A-Za-z0-9_.\/:-])((?:img|video)\/[A-Za-z0-9_\-.\/]+\.(?:webp|png|jpe?g|gif|svg|ico|mp4|webm|mov))/g;
  const codeFiles = walk(ROOT, (p) => CODE_EXT.test(p) && path.basename(p) !== 'lib.js');
  let total = 0;
  for (const f of codeFiles) {
    const src = fs.readFileSync(f, 'utf8');
    let n = 0;
    let out = src.replace(re, (m, p1) => (map[p1] ? (n++, map[p1]) : m));
    // динамический путь в app.js: 'img/'+dir+'/bot_'+i+'.webp'
    out = out.replace(/(['"])img\/\1\s*\+\s*dir/g, (m, q) => (n++, `${q}${base}/img/${q}+dir`));
    if (n) { fs.writeFileSync(f, out); total += n; console.log(`  ${rel(f)}: ${n} замен`); }
  }
  console.log(`\nГотово: загружено ${files.length} файлов, заменено ссылок: ${total}. Карта: blob-map.json`);

  // 3. Удаление локальных копий
  if (DELETE_LOCAL && !DRY) {
    for (const d of MEDIA_DIRS) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
    console.log('Локальные img/ и video/ удалены.');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });