// Offline cache. When any file changes, bump V here AND the ?v= numbers in
// index.html, so a phone can never mix an old script with a new page.
var V = '5';
var CACHE = 'ringsizer-v' + V;
var FILES = ['./', 'index.html', 'style.css?v=' + V, 'sizes.js?v=' + V, 'app.js?v=' + V,
  'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // 'reload' skips the browser's own HTTP cache so the copy stored is fresh.
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Network first, but only wait 2.5 s for it. On a weak mobile signal a request
// can hang instead of failing, so after the wait the saved copy is used.
var WAIT_MS = 2500;

function fromCache(req) {
  return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  var network = fetch(e.request, { cache: 'no-cache' }).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return res;
  });
  var slow = new Promise(function (resolve) {
    setTimeout(function () { fromCache(e.request).then(function (hit) { if (hit) resolve(hit); }); }, WAIT_MS);
  });
  e.respondWith(Promise.race([network, slow]).catch(function () { return fromCache(e.request); }));
});
