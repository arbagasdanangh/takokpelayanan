/* Service worker Takok (v52). Sengaja sederhana dan aman:
   - Tidak pernah mengintersep /api/ atau permintaan lintas-origin, dan tidak menyentuh metode selain GET.
   - Jaringan lebih dulu: pengguna selalu mendapat versi terbaru; cache hanya dipakai bila jaringan gagal (offline).
   - Saat offline dan membuka halaman, tampil cangkang terakhir yang tersimpan atau /offline.html. */
const V = "takok-v53";
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(["/offline.html"]); }).catch(function () {}));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin || u.pathname.indexOf("/api/") === 0 || r.headers.has("range")) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok && res.type === "basic") { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }).catch(function () {}); }
    return res;
  }).catch(function () {
    return caches.match(r).then(function (m) {
      if (m) return m;
      if (r.mode === "navigate") return caches.match("/").then(function (h) { return h || caches.match("/offline.html"); });
      return Response.error();
    });
  }));
});
