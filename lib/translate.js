/* Бесплатный автоперевод: Google (gtx, без ключа) -> запасной MyMemory. Ошибка = просто нет перевода */
const LANGS = ['en', 'uk', 'kk'];

function chunks(s, max) {
  const out = []; let cur = '';
  for (const part of s.split(/(?<=[\n.!?])/)) {
    if ((cur + part).length > max && cur) { out.push(cur); cur = ''; }
    while (part.length > max && !cur) { out.push(part.slice(0, max)); return out.concat(chunks(part.slice(max), max)); }
    cur += part;
  }
  if (cur) out.push(cur);
  return out;
}
async function gtx(q, tl) {
  const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'q=' + encodeURIComponent(q), signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error('gtx ' + r.status);
  return (await r.json())[0].map((x) => x[0]).join('');
}
async function mymemory(q, tl) {
  const r = await fetch('https://api.mymemory.translated.net/get?langpair=ru|' + tl + '&q=' + encodeURIComponent(q) +
    (process.env.TRANSLATE_EMAIL ? '&de=' + encodeURIComponent(process.env.TRANSLATE_EMAIL) : ''), { signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  if (j.responseStatus != 200) throw new Error('mm ' + j.responseStatus);
  return j.responseData.translatedText;
}
async function tr(text, tl) {
  if (!text) return '';
  try { return (await Promise.all(chunks(text, 1500).map((c) => gtx(c, tl)))).join(''); } catch {}
  return (await Promise.all(chunks(text, 450).map((c) => mymemory(c, tl)))).join('');
}
/* -> { en:{title,text}, uk:{...}, kk:{...} } (языки, где перевод не удался, пропускаются) */
async function translateNews(title, text) {
  const res = {};
  await Promise.all(LANGS.map(async (l) => {
    try {
      const [t, x] = await Promise.all([tr(title, l), tr(text, l)]);
      if (t || x) res[l] = { title: t, text: x };
    } catch (e) { console.error('translate', l, e.message); }
  }));
  return res;
}
module.exports = { translateNews };
