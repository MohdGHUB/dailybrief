// Daily Brief service worker.
// App shell: network first, cached copy only when offline, so a new version shows without a hard refresh.
// Briefing data (/briefs/): always the network, never cached, so an old briefing is never served as the latest.
var CACHE = 'dailybrief-shell-v1.0';
var SHELL = ['./', 'dailybrief-manifest.json', 'dailybrief-icon-192.png', 'dailybrief-icon-512.png', 'dailybrief-apple-touch-icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/briefs/') !== -1) return;   // straight to the network

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./'); });
    })
  );
});
