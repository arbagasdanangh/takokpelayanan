"use strict";
/* Versi 52 (canggih): Saran Balasan Cerdas untuk admin. Di tampilan percakapan, Takok membaca pesan terakhir pemohon di perangkat admin lalu
   (1) mengenali maksudnya (syarat, biaya, jam layanan, booking), (2) menyusun draf jawaban dari data loket yang sudah ada (syarat, biaya, waktu, jam),
   (3) menyarankan 2 balasan cepat yang paling mirip. Klik = isi ke kolom jawaban, tetap bisa diedit sebelum dikirim. Tanpa perubahan server. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
var STOP = {}; "yang dan di ke dari untuk dengan ini itu saya anda kami kita bisa apa akan sudah belum mohon tolong terima kasih halo selamat pagi siang sore malam pak bu mas mbak".split(" ").forEach(function (w) { STOP[w] = 1; });
function tok(s) { return norm(s).split(" ").filter(function (w) { return w.length > 2 && !STOP[w]; }); }
var MAKSUD = [["syarat", /syarat|berkas|dokumen|persyaratan|bawa apa|perlu apa|lampiran/], ["biaya", /biaya|tarif|bayar|berapa|gratis|retribusi/], ["jam", /jam |buka|tutup|kapan (?:bisa|buka)|hari apa|libur/], ["booking", /booking|jadwal|daftar online|antre|antri|kuota/], ["status", /status|sampai mana|progres|sudah jadi|kapan jadi|lama proses/]];
function maksud(t) { var s = " " + norm(t) + " ", o = []; MAKSUD.forEach(function (m) { if (m[1].test(s)) o.push(m[0]); }); return o; }
function nama() { return window.SEL ? String(SEL.nama || "").split(" ")[0] : ""; }
function lab() { return window.SEL && window.label ? label(SEL.kunci) : ""; }
function draf(jenis) {
  var k = SEL.kunci, nm = nama(), sapa = "Halo" + (nm ? " " + nm : "") + ", ", pen = "\nSebaiknya cek ulang ke loket sebelum berangkat. Silakan balas bila ada yang kurang jelas.", L = [];
  if (jenis === "syarat") { if (!window.SY || !SY.ada(k)) return null; var t = SY.teks(k).map(function (l) { return String(l).replace(/^\[[ xv\u2713]?\]\s*/i, "- "); }); if (!t.length) return null; return sapa + "berikut persyaratan untuk " + lab() + ":\n" + t.join("\n") + pen; }
  var g = window.SY ? SY.grup(k) : [];
  if (jenis === "biaya") { g.forEach(function (x) { if (x.meta && x.meta.biaya) L.push((x.t ? x.t + ": " : "") + x.meta.biaya); }); return L.length ? sapa + "informasi biaya untuk " + lab() + ":\n" + L.join("\n") + pen : null; }
  if (jenis === "status") { g.forEach(function (x) { if (x.meta && x.meta.waktu) L.push((x.t ? x.t + ": " : "") + x.meta.waktu); }); return L.length ? sapa + "perkiraan waktu proses " + lab() + ":\n" + L.join("\n") + "\nWaktu dapat berbeda sesuai kelengkapan berkas." : null; }
  if (jenis === "jam") { var e = window.entryOf ? entryOf(k) : null, l = window.LOCS ? LOCS.filter(function (x) { return x.id === String(k).split("_")[0]; })[0] : null, j = (e && e[7]) || (l && l.jam) || (window.CFG && CFG.jam) || ""; return j ? sapa + "jam layanan " + lab() + ": " + j + "." + pen : null; }
  if (jenis === "booking") return sapa + "untuk " + lab() + ", Anda bisa memesan jam kunjungan lewat menu Booking Kunjungan di Takok, pilih tanggal dan jam yang tersedia. Bawa kode booking saat datang." + pen;
  return null;
}
var NAMA = {syarat: "Draf syarat loket ini", biaya: "Draf biaya", jam: "Draf jam layanan", booking: "Draf cara booking", status: "Draf perkiraan waktu proses"};
function mirip(t) {
  var q = tok(t); if (!q.length || !window.QR) return []; var df = {}, n = QR.length || 1;
  QR.forEach(function (r) { var u = {}; tok(r).forEach(function (w) { u[w] = 1; }); Object.keys(u).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
  return QR.map(function (r, i) { var tr = {}; tok(r).forEach(function (w) { tr[w] = 1; }); var s = 0; q.forEach(function (w) { if (tr[w]) s += Math.log(1 + n / (1 + (df[w] || 0))) + .3; else Object.keys(tr).forEach(function (x) { if (w.length > 3 && x.length > 3 && (x.indexOf(w) === 0 || w.indexOf(x) === 0)) s += .5; }); }); return {i: i, s: s}; }).filter(function (x) { return x.s > .8; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 2);
}
function bangun(box) {
  var t = String(SEL.teks || ""), m = maksud(t), h = "", ada = 0;
  m.forEach(function (j) { var d = draf(j); if (d) { ada++; h += '<button type="button" class="chip ac-d" data-ac="d:' + j + '">' + E(NAMA[j]) + '</button>'; } });
  mirip(t).forEach(function (x) { ada++; h += '<button type="button" class="chip" data-ac="q:' + x.i + '" title="' + E(QR[x.i]) + '">Mirip: ' + E(QR[x.i].length > 26 ? QR[x.i].slice(0, 26) + "\u2026" : QR[x.i]) + '</button>'; });
  box.innerHTML = '<small class="sys"><b>Saran cerdas</b>' + (m.length ? " &middot; terdeteksi: " + m.map(function (x) { return E(x); }).join(", ") : "") + '</small><div class="ac-r">' + (ada ? h : '<span class="sys">Belum ada saran untuk pesan ini.</span>') + '</div>';
}
function isi(teks) { var rt = $("rt"); if (!rt) return; rt.value = (rt.value.trim() ? rt.value.replace(/\s+$/, "") + "\n\n" : "") + teks; rt.dispatchEvent(new Event("input", {bubbles: true})); rt.focus(); }
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-ac]"); if (!b || !window.SEL) return; var a = b.dataset.ac, i = a.indexOf(":"), c = a.slice(0, i), v = a.slice(i + 1);
  if (c === "d") { var d = draf(v); if (d) isi(d); } else if (c === "q" && window.QR && QR[+v] != null) isi(typeof fillT === "function" ? fillT(QR[+v]) : QR[+v]);
});
function jalan() {
  try {
    var rt = $("rt"); if (!rt || !window.SEL || window.S !== "adm") { return; }
    var hint = rt.closest(".qf") && rt.closest(".qf").previousElementSibling, sig = String(SEL.pid || "") + "|" + SEL.kunci + "|" + (SEL.teks || "") + "|" + (window.QR ? QR.length : 0), box = $("ac-box");
    if (box && box.dataset.sig === sig && D.contains(box)) return;
    if (!box) { box = D.createElement("div"); box.id = "ac-box"; box.className = "ac-box"; if (hint && hint.parentNode) hint.parentNode.insertBefore(box, hint); else rt.closest(".qf").parentNode.insertBefore(box, rt.closest(".qf")); }
    else if (hint && box.nextElementSibling !== hint && hint.parentNode) hint.parentNode.insertBefore(box, hint);
    box.dataset.sig = sig; bangun(box);
  } catch (e) {}
}
setInterval(jalan, 1200);
window.AdminCerdas = {maksud: maksud, mirip: mirip, draf: draf};
})();
