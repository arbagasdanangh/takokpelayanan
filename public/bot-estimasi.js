"use strict";
/* Versi 104: Hitung perkiraan tanggal selesai layanan.
   /estimasi 14                  -> 14 hari kerja dari hari ini
   /estimasi 5 hari kerja besok  -> mulai diajukan besok
   /estimasi 30 hari             -> 30 hari kalender
   /estimasi 3 minggu dari 2026-12-01   (juga 01/12 atau 1/12/2026)
   Hari kerja = Senin-Jumat dikurangi tanggal libur umum (*) yang dicatat admin di tab "Libur & tutup". Hari pengajuan tidak dihitung.
   Hanya perkiraan; lama layanan sebenarnya tergantung jenis izin dan kelengkapan berkas. Zona WIB. */
(function () {
var B = window.BOTI;
if (!B || !window.BOTX) return;
var HR = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], BL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
var LIB = null;
function p2(n) { return (n < 10 ? "0" : "") + n; }
function iso(d) { return d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate()); }
function dari(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }
function hariIniWib() { var p = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date()); return dari(p); }
function fmt(d) { return HR[d.getUTCDay()] + " " + d.getUTCDate() + " " + BL[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
function tgl(s) { /* 2026-12-01 | 01/12 | 1/12/2026 | besok | hari ini */
  s = s.toLowerCase().trim(); var t = hariIniWib(), m;
  if (s === "besok") { t.setUTCDate(t.getUTCDate() + 1); return t; }
  if (s === "hari ini" || s === "sekarang") return t;
  if (dari(s)) return dari(s);
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{4}))?$/.exec(s))) { var y = m[3] ? +m[3] : t.getUTCFullYear(), d = new Date(Date.UTC(y, +m[2] - 1, +m[1])); if (d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[1]) return d; }
  return null;
}
function hitung(n, kerja, mulai, libur) {
  var d = new Date(mulai.getTime()), sisa = n, lewat = [];
  while (sisa > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!kerja) { sisa--; continue; }
    var w = d.getUTCDay(), k = iso(d);
    if (w === 0 || w === 6) continue;
    if (libur[k] !== undefined) { lewat.push(fmt(d) + (libur[k] ? " (" + libur[k] + ")" : "")); continue; }
    sisa--;
  }
  return {akhir: d, lewat: lewat};
}
function urai(arg) {
  var m = /^(\d{1,3})\s*(hari kerja|hk|hari|minggu|bulan)?\s*(?:(?:dari|mulai|diajukan)?\s*(.+))?$/i.exec(arg.trim());
  if (!m) return null;
  var n = +m[1], u = (m[2] || "hari kerja").toLowerCase(), kerja = u === "hari kerja" || u === "hk";
  if (u === "minggu") { n *= 7; kerja = false; } else if (u === "bulan") { n *= 30; kerja = false; }
  var mulai = m[3] ? tgl(m[3].replace(/^(dari|mulai|diajukan)\s+/i, "")) : hariIniWib();
  return {n: n, kerja: kerja, mulai: mulai, bad: !!m[3] && !mulai, teks: u};
}
async function muatLibur() {
  if (LIB) return LIB; LIB = {};
  try { var j = await window.api("/api/libur"); (j.daftar || []).forEach(function (x) { if (x.kunci === "*") LIB[x.tgl] = x.ket || ""; }); } catch (e) {}
  return LIB;
}
async function jalankan(arg) {
  var r = urai(arg);
  if (!r) return B.bot("Contoh: /estimasi 14 (14 hari kerja dari hari ini), /estimasi 5 hari kerja besok, /estimasi 30 hari, atau /estimasi 3 minggu dari 2026-12-01.");
  if (r.bad) return B.bot("Tanggal mulai belum terbaca. Pakai format 2026-12-01, 01/12, atau kata \"besok\".");
  if (r.n < 1 || r.n > 365) return B.bot("Jumlah hari harus antara 1 dan 365.");
  var lib = r.kerja ? await muatLibur() : {}, h = hitung(r.n, r.kerja, r.mulai, lib);
  var kal = Math.round((h.akhir - r.mulai) / 86400000);
  var teks = "Jika berkas lengkap diajukan " + fmt(r.mulai) + ", " + r.n + (r.kerja ? " hari kerja" : " hari") + " selesai sekitar " + fmt(h.akhir) + " (" + kal + " hari kalender).";
  if (r.kerja && h.lewat.length) teks += " Melewati hari libur: " + h.lewat.slice(0, 6).join(", ") + (h.lewat.length > 6 ? ", dan " + (h.lewat.length - 6) + " lainnya" : "") + ".";
  teks += " Ini perkiraan, bukan jaminan. Hari pengajuan tidak dihitung, akhir pekan dan libur yang tercatat dilewati.";
  return B.bot(teks, '<div class="bch">' + B.btn("Pasang pengingat", "q:/ingatkan 1 hari cek status permohonan") + '</div>', 400, true);
}
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  var m = /^\/(estimasi|hitung)\b\s*(.*)$/i.exec(String(t).trim());
  if (m) return jalankan(m[2]);
  return pre0 ? pre0(t, s) : null;
};
window.TKEST = {urai: urai, hitung: hitung, tgl: tgl};
})();
