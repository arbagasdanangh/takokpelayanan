"use strict";
/* Versi 105: /terdekat - urutkan lokasi layanan dari yang terdekat dengan posisi pemohon.
   Posisi diminta lewat izin lokasi peramban dan hanya dipakai di perangkat (tidak dikirim ke server).
   Koordinat lokasi dibaca dari tautan peta yang diisi admin: @-7.25,112.75 | q=-7.25,112.75 | ll= | !3d-7.25!4d112.75 | atau teks "-7.25, 112.75".
   Tautan pendek (maps.app.goo.gl) tidak berisi koordinat, jadi lokasinya ditandai "koordinat belum tercatat". */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function koordinat(t) {
  t = String(t || ""); try { t = decodeURIComponent(t); } catch (e) {}
  var m = /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/.exec(t) || /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(t) || /[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(t) || /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/.exec(t);
  if (!m) return null; var a = +m[1], b = +m[2]; return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? {lat: a, lng: b} : null;
}
function jarak(a, b) { var R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r, h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
function km(x) { return x < 1 ? Math.round(x * 1000) + " m" : x.toFixed(1).replace(".", ",") + " km"; }
function urut(pos, lokasi) {
  var ada = [], tidak = [];
  lokasi.forEach(function (l) { var k = koordinat(l.mp); if (k) ada.push({l: l, d: jarak(pos, k)}); else tidak.push(l); });
  ada.sort(function (a, b) { return a.d - b.d; });
  return {ada: ada, tidak: tidak};
}
function tampil(pos) {
  var r = urut(pos, window.LOCS || []);
  if (!r.ada.length) return B.bot("Belum ada lokasi yang koordinatnya tercatat. Admin perlu mengisi tautan peta lengkap (bukan tautan pendek) pada data lokasi.");
  var tj = function (x) { return window.TKJAM ? TKJAM.badge(x.l.jam) : ""; };
  return B.bot("Lokasi layanan dari yang terdekat dari posisi Anda:", '<div class="bc2">' + r.ada.slice(0, 6).map(function (x, i) {
    var tp = /^https?:\/\//.test(x.l.mp) ? x.l.mp : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(x.l.nm);
    return '<p style="margin:6px 0"><b>' + (i + 1) + ". " + E(x.l.nm) + "</b> – " + km(x.d) + tj(x) + (x.l.al ? "<br><small>" + E(x.l.al) + "</small>" : "") + '<br><a href="' + E(tp) + '" target="_blank" rel="noopener">Buka peta</a></p>';
  }).join("") + (r.tidak.length ? '<small>Koordinat belum tercatat: ' + r.tidak.map(function (l) { return E(l.nm); }).join(", ") + '.</small>' : "") + '<br><small>Jarak garis lurus, bukan jarak tempuh. Posisi Anda tidak dikirim ke server.</small></div>', 400, true);
}
function jalankan() {
  if (!navigator.geolocation) return B.bot("Peramban ini tidak mendukung lokasi. Pilih lokasi lewat menu \"Pilih lokasi SPP\" di beranda.");
  return B.bot("Meminta izin lokasi... Izinkan agar saya bisa mengurutkan lokasi terdekat.").then(function () {
    return new Promise(function (ok) {
      navigator.geolocation.getCurrentPosition(function (p) { ok(tampil({lat: p.coords.latitude, lng: p.coords.longitude})); }, function (e) {
        ok(B.bot(e && e.code === 1 ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan peramban lalu coba /terdekat lagi." : "Posisi Anda belum bisa ditentukan. Coba lagi di tempat terbuka atau periksa GPS."));
      }, {enableHighAccuracy: false, timeout: 12000, maximumAge: 300000});
    });
  });
}
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  var x = String(t).trim();
  if (/^\/terdekat\s*$/i.test(x) || /^(loket|spp|mpp|lokasi)\s+(yang\s+)?(paling\s+)?(terdekat|dekat)\b.*$/i.test(x) || /^(dimana|di mana)\s+(spp|mpp|loket)\s+terdekat\??$/i.test(x)) return jalankan();
  return pre0 ? pre0(t, s) : null;
};
window.TKDEKAT = {koordinat: koordinat, urut: urut, jarak: jarak};
})();
