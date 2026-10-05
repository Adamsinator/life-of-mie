// Offline support. Network first: when online you always get the newest version of the game
// (GitHub Pages updates arrive as usual); the copy kept here is only used when there is no connection.
// This file never touches saved games, which live in localStorage.
const CACHE = 'life-of-mie';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/fonts.css', 'css/style.css',
  'js/i18n.js', 'js/lang-da.js', 'js/data.js', 'js/logic.js', 'js/stories.js', 'js/render.js', 'js/audio.js', 'js/profiles.js', 'js/minigames.js', 'js/ui.js',
  'fonts/fredoka.woff2', 'fonts/nunito.woff2', 'fonts/pacifico.woff2',
  'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
