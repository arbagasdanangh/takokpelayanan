"use strict";
/* Versi 107: /bandingkan - bandingkan dua jenis izin/layanan berdampingan (instansi, persyaratan, biaya, waktu) dari katalog izin.
   Contoh: /bandingkan nib vs siup      /bandingkan izin reklame dan izin parkir
   Memakai katalog yang sama dengan menu Cari izin (/api/izin). Pencocokan nama berdasarkan kata; bila ragu, pilihan terdekat ditampilkan
   beserta alternatifnya. Informasi mengikuti isi katalog, selalu cek ulang ke loket untuk ketentuan terbaru. */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var KAT = null;
async function muat() {
  if (KAT) return KAT;
  try { var j = await window.api("/api/izin"); KAT = Array.isArray(j.rows) ? j.rows : []; } catch (e) { KAT = []; }
  return KAT;
}
function kata(s) { return (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (w) { return w.length > 1 && ["izin", "dan", "atau", "yang", "untuk", "surat"].indexOf(w) < 0; }); }
function skor(q, r) {
  var qk = kata(q); if (!qk.length) return 0;
  var h = (r[0] + " " + (r[1] || "")).toLowerCase(), nama = String(r[0]).toLowerCase(), s = 0;
  if (nama === String(q).toLowerCase().trim()) s += 5;
  qk.forEach(function (w) { if (nama.indexOf(w) >= 0) s += 2; else if (h.indexOf(w) >= 0) s += 1; });
  return s / qk.length;
}
function cari(q, rows) {
  return rows.map(function (r) { return {r: r, s: skor(q, r)}; }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
}
function potong(t, n) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n).replace(/\s*\S*$/, "") + "…" : (t || "-"); }
function kartu(r) {
  return '<div class="cmp-c"><b>' + E(r[0]) + '</b><dl><dt>Instansi</dt><dd>' + E(potong(r[2], 80)) + '</dd><dt>Persyaratan</dt><dd>' + E(potong(r[3], 260)) + '</dd><dt>Biaya</dt><dd>' + E(potong(r[4], 80)) + '</dd><dt>Waktu</dt><dd>' + E(potong(r[5], 80)) + '</dd></dl></div>';
}
function pecah(arg) {
  var m = arg.split(/\s+(?:vs|versus|dengan|dan|atau|banding)\s+|\s*[,;|]\s*/i).map(function (x) { return x.trim(); }).filter(Boolean);
  return m.length >= 2 ? [m[0], m[1]] : null;
}
async function jalankan(arg) {
  var dua = pecah(arg);
  if (!dua) return B.bot("Tulis dua hal yang dibandingkan, mis. /bandingkan nib vs siup, atau /bandingkan izin reklame dan izin parkir.");
  var rows = await muat();
  if (!rows.length) return B.bot("Katalog izin belum tersedia, jadi saya belum bisa membandingkan. Coba tanyakan langsung ke Asisten atau gunakan menu Cari izin.");
  var a = cari(dua[0], rows), b = cari(dua[1], rows);
  if (!a.length || !b.length) return B.bot("Saya belum menemukan " + (!a.length ? '"' + dua[0] + '"' : '"' + dua[1] + '"') + " di katalog izin. Coba kata kunci lain atau lihat menu Cari izin.");
  if (a[0].r === b[0].r) return B.bot("Kedua kata kunci mengarah ke izin yang sama (" + a[0].r[0] + "). Coba nama yang lebih spesifik.");
  var alt = function (x, y) { var l = x.slice(1).filter(function (z) { return z.r !== y[0].r; }); return l.length ? '<small>Mungkin juga: ' + l.map(function (z) { return E(z.r[0]); }).join("; ") + '</small>' : ""; };
  return B.bot("Perbandingan dari katalog izin:", '<div class="cmp">' + kartu(a[0].r) + kartu(b[0].r) + '</div>' + alt(a, b) + (alt(b, a) ? "<br>" + alt(b, a) : "") + '<br><small>Cek ulang ke loket untuk ketentuan terbaru.</small>', 400, true);
}
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  var m = /^\/(bandingkan|banding)\b\s*(.*)$/i.exec(String(t).trim());
  if (m) return jalankan(m[2]);
  return pre0 ? pre0(t, s) : null;
};
window.TKBANDING = {cari: cari, pecah: pecah};
})();
