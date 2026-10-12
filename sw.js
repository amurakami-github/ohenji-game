const CACHE_NAME = 'ohenji-v1.18.0';
const BASE = new URL('./', self.location.href);
const urls = [
  './', './index.html', './styles.css', './app.js', './data.js', './audio.js', './sequence.js', './session.js', './reply-motion.js', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/audio/manifest.json',
  ...['water', 'yogurt', 'ipad', 'plarail'].flatMap(id => [`./assets/cards/${id}.png`, `./assets/scenes/${id}.png`]),
  './assets/cues/mom-eyes.png',
  ...['yes-front', 'yes-nod', 'no-left', 'no-right', 'biima-yes-front', 'biima-yes-nod', 'biima-no-left', 'biima-no-right'].map(id => `./assets/replies/${id}.png`),
  './assets/gestures/ninja-park.png', './assets/responses/ninja-park-yes.png',
  ...['ice-cream-taste', 'yogurt-taste'].map(id => `./assets/scenes/${id}.png`),
  ...['toilet', 'diaper', 'sleep', 'meal', 'bath', 'pajamas', 'biima', 'chocolate'].map(id => `./assets/scenes/${id}.png`),
  ...['ice-cream', 'water', 'yogurt', 'ipad', 'plarail', 'toilet', 'diaper', 'sleep', 'meal', 'bath', 'pajamas', 'biima', 'chocolate', 'ice-cream-taste', 'yogurt-taste'].map(id => `./assets/gestures/${id}.png`),
  ...['milk-no-offer', 'water-no-offer', 'yogurt-no-offer', 'ipad-no-offer', 'plarail-no-offer', 'chocolate-no-offer', 'ipad-yes-handover', 'ice-cream-yes-handover'].map(id => `./assets/responses/${id}.png`),
  ...['milk', 'water', 'ice-cream', 'yogurt', 'ipad', 'plarail', 'toilet', 'diaper', 'diaper-yes', 'sleep', 'sleep-yes', 'toilet-yes', 'bath', 'pajamas', 'biima', 'biima-yes', 'chocolate', 'bath-yes-doorway', 'bath-no-living', 'pajamas-yes'].map(id => `./assets/responses/${id}.png`),
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Refresh wording, photos and landscape crop settings in the HTTP cache too,
    // so an updated offline release cannot retain earlier scene content.
    await cache.addAll(urls.map(url => new Request(url, { cache: 'reload' })));
    const manifest = await (await cache.match(new URL('./assets/audio/manifest.json', BASE).href)).json();
    // The iPad and Plarail answers share recordings; cache each file only once.
    const recordings = [...new Set(Object.values(manifest.clips ?? {}).map(clip => new URL(typeof clip === 'string' ? clip : clip.file, new URL('./assets/audio/', BASE)).href))];
    if (recordings.length) await cache.addAll(recordings.map(url => new Request(url, { cache: 'reload' })));
    await cache.put(new URL('./offline-ready', BASE), new Response('ready'));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Only this app's caches: never remove another app's offline files.
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('ohenji-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function audioRange(request, response) {
  const bytes = await response.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range'));
  let start, end;
  if (match && (match[1] || match[2])) {
    start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
    end = match[1] && match[2] ? Number(match[2]) : bytes.byteLength - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= bytes.byteLength || end < start) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
  }
  end = Math.min(end, bytes.byteLength - 1);
  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE.origin || !url.href.startsWith(BASE.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Exact URLs only; an unrelated navigation must never receive our app shell.
    const cached = await cache.match(event.request);
    if (cached) {
      // Safari requests byte ranges for media even when the full file is saved.
      if (event.request.headers.has('Range') && url.pathname.endsWith('.m4a')) return audioRange(event.request, cached);
      return cached;
    }
    return fetch(event.request);
  })());
});
