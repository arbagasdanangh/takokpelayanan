"use strict";
/* Versi 98: Pengingat pribadi di Asisten.
   /ingatkan 30 bawa fotokopi KTP   -> 30 menit lagi        /ingatkan 2 jam cek status
   /ingatkan 1 hari ambil berkas    -> 1 hari lagi          /ingatkan 14:30 berangkat ke SPP (jam hari ini, atau besok bila sudah lewat)
   /pengingat                       -> daftar + hapus.
   Disimpan di perangkat (localStorage), diperiksa tiap 15 detik selama aplikasi terbuka; pengingat yang terlewat saat
   aplikasi tertutup muncul begitu aplikasi dibuka lagi. Notifikasi sistem dipakai bila izin sudah diberikan. */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var $b = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var KEY = "tk_ingat", MAKS = 10, MAXMS = 7 * 86400000;
function muat() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter(function (x) { return x && x.t && x.s; }) : []; } catch (e) { return []; } }
function simpan(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
function jam(t) { var d = new Date(t), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getHours()) + ":" + p(d.getMinutes()); }
function tgl(t) { var d = new Date(t), n = new Date(), b = new Date(n.getTime() + 86400000); return d.toDateString() === n.toDateString() ? "hari ini" : d.toDateString() === b.toDateString() ? "besok" : d.toLocaleDateString("id-ID", {day: "numeric", month: "short"}); }
function sisa(ms) { var m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? m + " menit" : m < 1440 ? Math.floor(m / 60) + " jam" + (m % 60 ? " " + (m % 60) + " menit" : "") : Math.floor(m / 1440) + " hari"; }
/* kembalikan {t, teks} atau string galat */
function urai(arg) {
  arg = arg.trim(); if (!arg) return "Contoh: /ingatkan 30 bawa fotokopi KTP, atau /ingatkan 14:30 berangkat ke SPP.";
  var m, t, teks, n = Date.now();
  if ((m = /^(\d{1,2})[:.](\d{2})\s+(.+)$/.exec(arg))) {
    var h = +m[1], mn = +m[2]; if (h > 23 || mn > 59) return "Jam tidak valid. Gunakan format 14:30.";
    var d = new Date(); d.setHours(h, mn, 0, 0); if (d.getTime() <= n + 30000) d.setDate(d.getDate() + 1);
    t = d.getTime(); teks = m[3];
  } else if ((m = /^(\d{1,4})\s*(menit|mnt|m|jam|j|hari|h)?\s+(.+)$/i.exec(arg))) {
    var u = (m[2] || "menit").toLowerCase(), k = +m[1];
    t = n + k * (u[0] === "j" ? 3600000 : u[0] === "h" ? 86400000 : 60000); teks = m[3];
  } else return "Saya belum paham waktunya. Contoh: /ingatkan 30 bawa KTP, /ingatkan 2 jam cek status, /ingatkan 14:30 berangkat.";
  if (t - n < 60000) return "Waktunya terlalu dekat. Minimal 1 menit dari sekarang.";
  if (t - n > MAXMS) return "Maksimal 7 hari ke depan.";
  teks = teks.trim().slice(0, 120); if (teks.length < 2) return "Tulis isi pengingatnya, mis. /ingatkan 30 bawa KTP.";
  return {t: t, s: teks};
}
function tambah(arg) {
  var r = urai(arg); if (typeof r === "string") return B.bot(r);
  var a = muat().filter(function (x) { return x.t > Date.now() - 86400000; });
  if (a.length >= MAKS) return B.bot("Pengingat sudah " + MAKS + ". Hapus satu dulu lewat /pengingat.");
  r.id = Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36); r.ok = 0; a.push(r);
  if (!simpan(a)) return B.bot("Penyimpanan peramban tidak tersedia, pengingat tidak bisa dipasang di mode ini.");
  izin();
  return B.bot("Siap! Saya ingatkan " + tgl(r.t) + " pukul " + jam(r.t) + " (" + sisa(r.t - Date.now()) + " lagi): " + r.s + ". Pengingat berjalan selama aplikasi terbuka; bila tertutup, muncul saat Anda membukanya lagi.",
    '<div class="bch">' + B.btn("Lihat pengingat", "q:/pengingat") + '</div>', 400, true);
}
function daftar() {
  var a = muat().sort(function (x, y) { return x.t - y.t; });
  if (!a.length) return B.bot("Belum ada pengingat. Coba: /ingatkan 30 bawa fotokopi KTP");
  return B.bot("Pengingat Anda (" + a.length + "):", '<div class="bc2">' + a.map(function (x) {
    var lewat = x.t <= Date.now();
    return '<div class="bch"><span>' + (lewat ? "Terlewat " : tgl(x.t) + " " + jam(x.t) + " ") + "&middot; " + E(x.s) + '</span><button type="button" data-ing="' + E(x.id) + '">Hapus</button></div>';
  }).join("") + '</div>', 400, true);
}
function izin() { try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {} }
function bunyi(x, terlewat) {
  var pesan = (terlewat ? "Pengingat terlewat: " : "Pengingat: ") + x.s;
  if (window.toast) toast(pesan);
  B.bot(pesan, "", 150, true);
  try { if (window.Notification && Notification.permission === "granted") new Notification("Takok Pelayanan Suroboyo", {body: pesan, tag: x.id}); } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) {}
}
function periksa() {
  var a = muat(), n = Date.now(), ada = false;
  a.forEach(function (x) { if (!x.ok && x.t <= n) { x.ok = 1; ada = true; bunyi(x, n - x.t > 120000); } });
  var b = a.filter(function (x) { return x.t > n - 86400000; });
  if (ada || b.length !== a.length) simpan(b);
}
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-ing]"); if (!b || !$b("bm") || !$b("bm").contains(b)) return;
  simpan(muat().filter(function (x) { return x.id !== b.dataset.ing; })); var r = b.closest(".bch"); if (r) r.remove();
  if (window.toast) toast("Pengingat dihapus.");
});
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  var m = /^\/(ingatkan|pengingat)\b\s*(.*)$/i.exec(String(t).trim());
  if (m) return m[1].toLowerCase() === "pengingat" ? daftar() : tambah(m[2]);
  return pre0 ? pre0(t, s) : null;
};
setTimeout(periksa, 2500); setInterval(periksa, 15000);
window.TKING = {urai: urai, muat: muat, periksa: periksa};
})();
