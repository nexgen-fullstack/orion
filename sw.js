/* ORION service worker — repeat visits load instantly.
   Pages: network first (a new version shows at once; the copy is only used offline).
   Static files (styles, scripts, images, fonts): served from the cache, refreshed in the background. */
const V = '1791981257';
const STATIC = 'orion-static-1';
const PAGES = 'orion-pages-1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  // drop styles/scripts of older builds (their URLs carry ?v=<build>)
  const c = await caches.open(STATIC);
  for (const req of await c.keys()) {
    const v = new URL(req.url).searchParams.get('v');
    if (v && v !== V) await c.delete(req);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(PAGES).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r)));
    return;
  }
  const own = u.origin === location.origin && !u.pathname.endsWith('/sw.js');
  const cdn = u.hostname === 'fonts.gstatic.com' || u.hostname === 'cdn.jsdelivr.net';
  if (!own && !cdn) return;
  e.respondWith(caches.open(STATIC).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => {
      if (res.ok && res.type !== 'opaque') c.put(r, res.clone());
      return res;
    }).catch(() => hit);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
