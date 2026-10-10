/* sw.js - timer.html用。更新日：2026-10-10
   timer.html、audio-fix.js、WAVと同じフォルダに配置してください。 */
const SHELL = 'bb-timer-shell-v20261010-2';
const AUDIO = 'bb-timer-audio-v20261010'; // audio-fix.jsと一致させる
const ROOT = new URL('./', self.registration.scope).href;
const TIMER = new URL('timer.html', ROOT).href;
const PATCH = new URL('audio-fix.js', ROOT).href;
const AUDIO_FILES = [
  ...Array.from({length:50}, (_, i) => `${i + 1}.wav`),
  'bubble.wav', 'fuwafuwa.wav', 'バブル.wav', 'ふわふわ.wav'
];

function completeAudio(response) {
  return response && response.ok && response.status !== 206
    && !/text\/html/i.test(response.headers.get('content-type') || '');
}

async function preserveAudio(file, cache, oldKeys) {
  const url = new URL(file, ROOT).href;
  // Retain old offline audio before trying to update it from the network.
  if (!await cache.match(url)) {
    for (const key of oldKeys) {
      const old = await (await caches.open(key)).match(url);
      if (completeAudio(old)) { await cache.put(url, old); break; }
    }
  }
  try {
    const response = await fetch(new Request(url, {cache:'reload'}));
    if (completeAudio(response)) await cache.put(url, response);
  } catch (_) { /* Missing optional audio must not cancel installation. */ }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // These two files are essential. Do not activate an incomplete update.
    await cache.addAll([new Request(TIMER, {cache:'reload'}), new Request(PATCH, {cache:'reload'})]);
    for (const file of ['./','manifest.json']) {
      try { await cache.add(new Request(new URL(file, ROOT).href, {cache:'reload'})); } catch (_) {}
    }
    const audioCache = await caches.open(AUDIO);
    const oldKeys = (await caches.keys()).filter(k => k.startsWith('fuwafuwa-timer-cache-'));
    // Four parallel downloads, rather than 54 simultaneous downloads.
    for (let i = 0; i < AUDIO_FILES.length; i += 4) {
      await Promise.all(AUDIO_FILES.slice(i, i + 4).map(file => preserveAudio(file, audioCache, oldKeys)));
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Delete only our own obsolete shell. Preserve audio and other apps' caches.
    await Promise.all(keys.filter(k => k.startsWith('bb-timer-shell-') && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(ROOT)) return;
  // The patched Web Audio player reads full files from AUDIO directly.
  // Leave partial media requests to the browser; never store a partial response.
  if (req.headers.has('range')) return;
  if (/\.wav$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(AUDIO);
      const saved = await cache.match(req);
      if (completeAudio(saved)) return saved;
      try {
        const response = await fetch(req);
        if (completeAudio(response)) await cache.put(req, response.clone()).catch(() => {});
        return response;
      } catch (_) { return new Response('', {status:503}); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    try {
      const response = await fetch(req);
      if (response.ok) await cache.put(req, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const saved = await cache.match(req);
      if (saved) return saved;
      if (req.mode === 'navigate') {
        const home = await cache.match(TIMER);
        if (home) return home;
      }
      throw error;
    }
  })());
});