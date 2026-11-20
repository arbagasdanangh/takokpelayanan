"use strict";
/* Versi 102: Status buka/tutup langsung dari teks "Jam layanan" tiap lokasi (zona WIB, Asia/Jakarta).
   Format teks yang dikenali: "Senin-Jumat 08.00-15.00", "Senin-Kamis 08.00-15.30; Jumat 08.00-11.30", "Sabtu 08:00 - 12:00", "Setiap hari 08.00-16.00".
   Dipakai di: (1) kartu info lokasi (lencana Buka/Tutup), (2) catatan di atas kolom pesan ke loket (waktu balasan),
   (3) perintah Asisten /buka (status semua lokasi). Teks yang tak terbaca ditampilkan apa adanya tanpa status. */
(function () {
var HARI = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"], NAMA = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
var ALIAS = {sen: 1, sel: 2, rab: 3, kam: 4, jum: 5, sab: 6, min: 0, ahad: 0};
function hariNo(s) { s = s.toLowerCase().replace(/['’]/g, ""); var i = HARI.indexOf(s); if (i >= 0) return i; return ALIAS.hasOwnProperty(s.slice(0, 3)) && s.length <= 6 ? ALIAS[s.slice(0, 3)] : -1; }
function mnt(h, m) { return (+h) * 60 + (+m || 0); }
/* -> [{hari:[0..6], dari:menit, sampai:menit}] atau [] */
function urai(teks) {
  var out = [];
  String(teks || "").split(/[;\n]|,(?=\s*[A-Za-z])/).forEach(function (seg) {
    var w = /(\d{1,2})[.:](\d{2})\s*(?:-|–|s\/d|sd|sampai|hingga)\s*(\d{1,2})[.:](\d{2})/i.exec(seg);
    if (!w) return;
    var dari = mnt(w[1], w[2]), sampai = mnt(w[3], w[4]); if (dari >= sampai || sampai > 24 * 60) return;
    var depan = seg.slice(0, w.index), hari = [];
    if (/setiap hari|tiap hari|every ?day|senin\s*(-|–|s\/d|sampai)\s*minggu/i.test(depan)) hari = [0, 1, 2, 3, 4, 5, 6];
    else {
      var r = /([a-z]+)\s*(?:-|–|s\/d|sd|sampai|hingga)\s*([a-z]+)/i.exec(depan);
      if (r && hariNo(r[1]) >= 0 && hariNo(r[2]) >= 0) { var a = hariNo(r[1]), b = hariNo(r[2]); for (var i = a; ; i = (i + 1) % 7) { hari.push(i); if (i === b || hari.length > 7) break; } }
      else (depan.match(/[a-z]+/gi) || []).forEach(function (x) { var n = hariNo(x); if (n >= 0 && hari.indexOf(n) < 0) hari.push(n); });
    }
    if (hari.length) out.push({hari: hari, dari: dari, sampai: sampai});
  });
  return out;
}
function wib(now) { var p = new Intl.DateTimeFormat("en-US", {timeZone: "Asia/Jakarta", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false}).formatToParts(now || new Date()), o = {}; p.forEach(function (x) { o[x.type] = x.value; });
  return {h: ({Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6})[o.weekday], m: (+o.hour % 24) * 60 + (+o.minute)}; }
function fmt(m) { var h = Math.floor(m / 60), n = m % 60; return (h < 10 ? "0" : "") + h + "." + (n < 10 ? "0" : "") + n; }
/* -> {ok:false} bila tak terbaca; {ok:true, buka, sampai?, berikut?:{hari,jam,hariIni,besok}} */
function status(teks, now) {
  var j = urai(teks); if (!j.length) return {ok: false};
  var t = wib(now), buka = null;
  j.forEach(function (x) { if (x.hari.indexOf(t.h) >= 0 && t.m >= x.dari && t.m < x.sampai) buka = x; });
  if (buka) return {ok: true, buka: true, sampai: fmt(buka.sampai)};
  for (var d = 0; d <= 7; d++) {
    var hari = (t.h + d) % 7, cand = j.filter(function (x) { return x.hari.indexOf(hari) >= 0 && (d > 0 || x.dari > t.m); }).sort(function (a, b) { return a.dari - b.dari; })[0];
    if (cand) return {ok: true, buka: false, berikut: {nama: d === 0 ? "hari ini" : d === 1 ? "besok" : NAMA[hari], jam: fmt(cand.dari)}};
  }
  return {ok: true, buka: false, berikut: null};
}
function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
function badge(teks) { var s = status(teks); if (!s.ok) return ""; return s.buka ? ' <span class="jl-b jl-on">Buka sampai ' + s.sampai + ' WIB</span>' : ' <span class="jl-b jl-off">Tutup' + (s.berikut ? ", buka " + s.berikut.nama + " " + s.berikut.jam : "") + '</span>'; }
function catatan(teks) {
  var s = status(teks); if (!s.ok || s.buka) return "";
  return '<p class="sys jl-n">Loket sedang tutup. Pertanyaan tetap bisa dikirim sekarang' + (s.berikut ? "; admin umumnya membalas saat layanan buka " + s.berikut.nama + " pukul " + s.berikut.jam + " WIB" : "") + '.</p>';
}
function lokasiAktif() { try { return (window.LOCS || []).filter(function (x) { return x.id === window.LOC; })[0]; } catch (e) { return null; } }
window.TKJAM = {urai: urai, status: status, badge: badge, catatan: catatan, aktif: lokasiAktif};
/* Perintah Asisten: /buka */
var B = window.BOTI;
if (B && window.BOTX) {
  var pre0 = window.BOTX.pre;
  window.BOTX.pre = function (t, s) {
    if (/^\/buka\s*$/i.test(String(t).trim()) || /^(apakah |apa )?(loket|layanan|spp|mpp)?\s*(sedang |sudah )?(buka|tutup)\s*(sekarang|nggak|tidak|ya)?\??$/i.test(String(t).trim())) {
      var L = window.LOCS || [];
      if (!L.length) return B.bot("Data lokasi belum termuat. Coba lagi sebentar.");
      return B.bot("Status layanan sekarang (WIB):", '<div class="bc2">' + L.map(function (l) {
        var s = status(l.jam), tx = !l.jam ? "jam belum tercatat" : !s.ok ? E(l.jam) : s.buka ? "<b>Buka</b> sampai " + s.sampai : "<b>Tutup</b>" + (s.berikut ? ", buka " + s.berikut.nama + " " + s.berikut.jam : "");
        return '<p style="margin:4px 0"><b>' + E(l.nm) + "</b>: " + tx + "</p>";
      }).join("") + '</div>', 400, true);
    }
    return pre0 ? pre0(t, s) : null;
  };
}
})();
