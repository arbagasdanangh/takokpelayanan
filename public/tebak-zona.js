"use strict";
/* Tebak Zona (Ruang Main): hafalkan di zona mana instansi MPP Surabaya berada. 5 soal harian (sama untuk semua), 15 detik per soal,
   dua jenis soal: "instansi X ada di zona berapa?" dan "instansi mana yang ada di Zona N?". Data dari daftar loket yang sudah dimuat. */
(function () {
var API = window.TKGM, S = null, SEC = 15, $ = function (i) { return document.getElementById(i); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickN(a, n, R) { var c = a.slice(), o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]); return o; }
function data() { return ((window.LD || {}).mpp || []).filter(function (d) { return d[4] && /^Zona \d/.test(d[4]); }).map(function (d) { return {n: d[1], z: d[4]}; }); }
function zonas(D) { var z = []; D.forEach(function (x) { if (z.indexOf(x.z) < 0) z.push(x.z); }); return z.sort(); }
function bikin(R, D) {
  var Z = zonas(D), out = [], seen = {};
  var P = pickN(D, 5, R);
  P.forEach(function (x, i) {
    if (i % 2 === 0 || Z.length < 3) { var op = pickN(Z, Math.min(4, Z.length), R); if (op.indexOf(x.z) < 0) op[0] = x.z; op = pickN(op, op.length, R); out.push({q: "Instansi " + x.n + " ada di zona berapa?", o: op, a: op.indexOf(x.z), ex: x.n + " berada di " + x.z + " MPP Surabaya."}); }
    else {
      var lain = D.filter(function (y) { return y.z !== x.z; }), d = pickN(lain, 3, R), op2 = pickN([x].concat(d), 4, R);
      out.push({q: "Instansi mana yang ada di " + x.z + "?", o: op2.map(function (y) { return y.n; }), a: op2.indexOf(x), ex: x.n + " berada di " + x.z + ". Lainnya: " + d.map(function (y) { return y.n + " (" + y.z + ")"; }).join("; ") + "."});
    }
  });
  return out;
}
function menu() {
  API.stopAll(); API.title("Tebak Zona"); var g = API.G(), td = API.today(), tz = g.tz || {}, sudah = tz.d === td;
  API.view(API.bar("Tebak Zona") + '<div class="tb-hero"><b>🗺️ Tebak Zona MPP</b><p>5 soal: di zona berapa instansi MPP Surabaya berada? Tiap soal 15 detik (bisa Mode santai). Soal hari ini sama untuk semua pengunjung.</p>' + (sudah ? '<p class="tb-done">Hari ini: <b>' + esc(tz.r) + '</b> (' + tz.s + '/5)</p>' : "") +
    '<div class="btns" style="justify-content:center">' + (sudah ? '<button type="button" class="btn" data-tz="daily">Ulangi soal hari ini (poin kecil)</button>' : '<button type="button" class="send" data-tz="daily">Main soal hari ini</button>') + '<button type="button" class="btn" data-tz="rand">Latihan acak</button><button type="button" class="btn" data-tz="cari">Buka Pandu Zona</button></div><p class="sys">Rekor: ' + (g.best.tz ? g.best.tz + "/5" : "belum ada") + '</p></div>');
}
function start(daily) {
  var D = data(); if (D.length < 4) { API.view(API.bar("Tebak Zona") + '<p class="sys">Data zona belum termuat. Tutup lalu buka lagi sebentar lagi.</p>'); return; }
  API.stopAll(); API.ping("zona"); var seed = daily ? API.hash("zona" + API.today()) : (Math.random() * 4e9) >>> 0;
  S = {daily: daily, q: bikin(rng(seed), D), i: 0, ok: 0, row: "", lock: false, bonus: 0, t0: Date.now()}; ask();
}
function ask() {
  var q = S.q[S.i]; API.title("Tebak Zona " + (S.i + 1) + "/5");
  API.view(API.bar("Tebak Zona", (S.i + 1) + "/5 &middot; benar " + S.ok) + '<div id="tzw"></div><div class="tb-q"><small>Pilih jawaban yang tepat</small><p>' + esc(q.q) + '</p></div><div class="tb-o">' + q.o.map(function (o, i) { return '<button type="button" class="btn tb-b" data-tz="ans" data-i="' + i + '"><span>' + "ABCD"[i] + '</span>' + esc(o) + '</button>'; }).join("") + '</div><div id="tzx" role="status" aria-live="polite"></div>');
  S.lock = false; if (window.WK) WK.start($("tzw"), SEC, function () { ans(-1); });
}
function ans(i) {
  if (S.lock) return; S.lock = true; var q = S.q[S.i], ok = i === q.a, wkOn = window.WK && WK.on(), sisa = window.WK ? WK.stop() : 0, habis = i === -1, cepat = ok && wkOn && sisa >= 8;
  if (ok) S.ok++; if (cepat) S.bonus += 2; S.row += ok ? "🟩" : habis ? "⏱️" : "🟥"; API.beep(ok ? 880 : 220, 0.15);
  [].forEach.call(document.querySelectorAll(".tb-b"), function (b, k) { b.disabled = true; if (k === q.a) b.classList.add("tb-ok"); else if (k === i) b.classList.add("tb-no"); });
  $("tzx").innerHTML = '<div class="tb-ex ' + (ok ? "tb-yes" : "tb-nop") + '"><b>' + (ok ? "Tepat!" : habis ? "Waktu habis." : "Belum tepat.") + '</b>' + (cepat ? ' <span class="tb-bn">⚡ Cepat +2 poin</span>' : "") + " " + esc(q.ex) + '</div><div class="btns" style="justify-content:center"><button type="button" class="send" data-tz="next">' + (S.i === 4 ? "Lihat hasil" : "Soal berikutnya") + '</button></div>';
}
function selesai() {
  var g = API.G(), td = API.today(), tz = g.tz || {}, st = S.ok >= 5 ? 3 : S.ok >= 3 ? 2 : 1, first = S.daily && tz.d !== td, pts = first ? S.ok * 10 + 10 + S.bonus : S.ok * 3 + Math.floor(S.bonus / 2), tot = Math.round((Date.now() - S.t0) / 1000);
  if (first) g.tz = {d: td, r: S.row, s: S.ok};
  API.fin("zona", {title: S.ok === 5 ? "Hafal zona MPP!" : S.ok >= 3 ? "Lumayan hafal zona" : "Yuk, jelajahi zona lagi", stars: st, pts: pts, bk: "tz", bv: S.ok, again: menu,
    share: "Tebak Zona MPP " + (S.daily ? td : "(latihan)") + " " + S.ok + "/5 (" + tot + " dtk)\n" + S.row + "\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin,
    sub: S.row + "<br>" + S.ok + " dari 5 benar dalam " + tot + " detik." + (first ? "" : " <small class='sys'>Poin kecil karena bukan permainan harian pertama.</small>")});
}
document.addEventListener("click", function (e) {
  var x = e.target.closest && e.target.closest("[data-tz]"); if (!x) return; var a = x.dataset.tz;
  if (a === "daily") start(true); else if (a === "rand") start(false); else if (a === "ans") ans(+x.dataset.i);
  else if (a === "cari") { if (window.PanduZona) { API.close(); PanduZona.buka(); } }
  else if (a === "next") { if (S.i === 4) selesai(); else { S.i++; ask(); } }
});
window.TebakZona = {menu: menu};
})();
