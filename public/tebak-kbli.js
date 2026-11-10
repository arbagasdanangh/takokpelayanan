"use strict";
/* Tebak KBLI Harian (Ruang Main): 5 soal per hari yang sama untuk semua orang, diambil dari seluruh KBLI 2025.
   Dua jenis soal: "uraian -> judul kegiatan" dan "judul -> kode". Hasil bisa dibagikan sebagai kotak hijau/merah ala tebak kata.
   Poin penuh untuk permainan harian pertama; latihan acak tetap boleh, poinnya lebih kecil. Murni di browser. */
(function () {
var API = window.TKGM, S = null, SEC = 20;
var $ = function (i) { return document.getElementById(i); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickN(a, n, R) { var c = a.slice(), o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]); return o; }
function rapi(t) { return t.replace(/\bYTDL\b/g, "yang tidak dapat diklasifikasikan di tempat lain").replace(/\s+/g, " ").trim(); }
function cantik(t) { t = rapi(t).toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); }
function potong(u, judul) {
  var s = rapi(u).replace(/^(kelompok|subgolongan|golongan) ini (juga )?mencakup\s*/i, ""); s = s.split(/(?<=[.;])\s/)[0] || s;
  try { s = s.replace(new RegExp(judul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"), "ig"), "…"); } catch (e) {}
  return s.length > 230 ? s.slice(0, 228) + "…" : s;
}
function bikin(R) {
  var A = KBLI.all().filter(function (r) { return r[2] && r[2].length > 70 && r[1].length < 80; }), all = KBLI.all().filter(function (r) { return r[1].length < 80; }), out = [], used = {};
  pickN(A, 5, R).forEach(function (r, i) {
    var sama = all.filter(function (x) { return x[0] !== r[0] && x[0].slice(0, 2) === r[0].slice(0, 2) && x[1] !== r[1]; }), lain = all.filter(function (x) { return x[0].slice(0, 2) !== r[0].slice(0, 2); });
    var d = pickN(sama, 3, R); if (d.length < 3) d = d.concat(pickN(lain, 3 - d.length, R));
    var tipe = i % 2;  // 0: uraian -> judul, 1: judul -> kode
    var opsi = pickN([r].concat(d), 4, R);
    out.push(tipe === 0 ? {t: 0, q: potong(r[2], r[1]), o: opsi.map(function (x) { return cantik(x[1]); }), a: opsi.indexOf(r), r: r} : {t: 1, q: cantik(r[1]), o: opsi.map(function (x) { return x[0]; }), a: opsi.indexOf(r), r: r});
  });
  return out;
}
function menu() {
  API.stopAll(); API.title("Tebak KBLI"); var g = API.G(), td = API.today(), tb = g.tb || {}, sudah = tb.d === td;
  API.view(API.bar("Tebak KBLI") + '<div class="tb-hero"><b>🎯 Tebak KBLI Harian</b><p>5 soal dari 1.559 KBLI 2025, tiap soal 20 detik (bisa Mode santai). Soal hari ini sama untuk semua pengunjung. Bandingkan skormu dengan teman!</p>' +
    (sudah ? '<p class="tb-done">Hari ini: <b>' + esc(tb.r) + '</b> (' + tb.s + '/5)</p>' : '') + '<div class="btns" style="justify-content:center">' + (sudah ? '<button type="button" class="btn" data-tb="daily">Ulangi soal hari ini (poin kecil)</button>' : '<button type="button" class="send" data-tb="daily">Main soal hari ini</button>') + '<button type="button" class="btn" data-tb="rand">Latihan acak</button></div>' +
    '<p class="sys">Rekor: ' + (g.best.tb ? g.best.tb + '/5' : 'belum ada') + ' &middot; Hari beruntun main: ' + (tb.st || 0) + '</p></div>');
}
function start(daily) {
  if (!window.KBLI) return; if (!KBLI.has()) { API.view(API.bar("Tebak KBLI") + '<p class="sys">Memuat data KBLI…</p>'); KBLI.ready().then(function () { if (KBLI.has()) start(daily); }); return; }
  API.stopAll(); API.ping("tebak"); var seed = daily ? API.hash("tebak" + API.today()) : (Math.random() * 4e9) >>> 0;
  S = {daily: daily, q: bikin(rng(seed)), i: 0, ok: 0, row: "", lock: false, bonus: 0, t0: Date.now(), lama: []}; ask();
}
function ask() {
  var q = S.q[S.i]; API.title("Tebak KBLI " + (S.i + 1) + "/5");
  API.view(API.bar("Tebak KBLI", (S.i + 1) + "/5 &middot; benar " + S.ok) + '<div id="tbw"></div><div class="tb-q"><small>' + (q.t === 0 ? "Kegiatan usaha ini masuk judul KBLI yang mana?" : "Berapa kode KBLI 2025 untuk judul ini?") + '</small><p>' + esc(q.q) + '</p></div><div class="tb-o">' +
    q.o.map(function (o, i) { return '<button type="button" class="btn tb-b" data-tb="ans" data-i="' + i + '"><span>' + "ABCD"[i] + '</span>' + esc(o) + '</button>'; }).join("") + '</div><div id="tbx" role="status" aria-live="polite"></div>');
  S.lock = false; if (window.WK) WK.start($("tbw"), SEC, function () { ans(-1); });
}
function ans(i) {
  if (S.lock) return; S.lock = true; var q = S.q[S.i], ok = i === q.a, bs = document.querySelectorAll(".tb-b"), wkOn = window.WK && WK.on(), sisa = window.WK ? WK.stop() : 0, habis = i === -1, cepat = ok && wkOn && sisa >= 12;
  S.lama.push(habis ? SEC : wkOn ? Math.round(SEC - sisa) : 0); if (cepat) S.bonus += 2;
  if (ok) S.ok++; S.row += ok ? "🟩" : habis ? "⏱️" : "🟥"; API.beep(ok ? 880 : 220, 0.15);
  [].forEach.call(bs, function (b, k) { b.disabled = true; if (k === q.a) b.classList.add("tb-ok"); else if (k === i) b.classList.add("tb-no"); });
  var last = S.i === 4;
  $("tbx").innerHTML = '<div class="tb-ex ' + (ok ? "tb-yes" : "tb-nop") + '"><b>' + (ok ? "Tepat!" : habis ? "Waktu habis." : "Belum tepat.") + '</b>' + (cepat ? ' <span class="tb-bn">⚡ Cepat +2 poin</span>' : '') + ' KBLI <b>' + esc(q.r[0]) + '</b> ' + esc(cantik(q.r[1])) + '.<br><small>' + esc(q.r[2].length > 220 ? q.r[2].slice(0, 218) + "…" : q.r[2]) + '</small></div><div class="btns" style="justify-content:center"><button type="button" class="send" data-tb="next">' + (last ? "Lihat hasil" : "Soal berikutnya") + '</button></div>';
}
function selesai() {
  var g = API.G(), td = API.today(), tb = g.tb || {}, st = S.ok >= 5 ? 3 : S.ok >= 3 ? 2 : 1, first = S.daily && tb.d !== td, pts = first ? S.ok * 10 + 10 + S.bonus : S.ok * 3 + Math.floor(S.bonus / 2), tot = Math.round((Date.now() - S.t0) / 1000), wkOn = window.WK && WK.on();
  if (S.daily && first) { var y = new Date(td + "T00:00:00"); y.setDate(y.getDate() - 1); var ys = y.toISOString().slice(0, 10); g.tb = {d: td, r: S.row, s: S.ok, st: tb.pd === ys ? (tb.st || 0) + 1 : 1, pd: td}; }
  var share = "Tebak KBLI Harian " + (S.daily ? td : "(latihan)") + " " + S.ok + "/5" + (wkOn ? " (" + tot + " dtk)" : "") + "\n" + S.row + "\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin;
  API.fin("tebak", {title: S.ok === 5 ? "Jagoan KBLI!" : S.ok >= 3 ? "Lumayan paham KBLI" : "Terus berlatih!", stars: st, pts: pts, bk: "tb", bv: S.ok, again: menu, share: share,
    sub: S.row + "<br>" + S.ok + " dari 5 benar" + (wkOn ? " dalam " + Math.floor(tot / 60) + " mnt " + (tot % 60) + " dtk." + (S.bonus ? " Bonus kecepatan +" + S.bonus + "." : "") : ".") + (first ? "" : " <small class='sys'>Poin kecil karena bukan permainan harian pertama.</small>")});
}
document.addEventListener("click", function (e) {
  var x = e.target.closest && e.target.closest("[data-tb]"); if (!x) return; var a = x.dataset.tb;
  if (a === "daily") start(true); else if (a === "rand") start(false); else if (a === "ans") ans(+x.dataset.i);
  else if (a === "next") { if (S.i === 4) selesai(); else { S.i++; ask(); } }
});
window.TebakKBLI = {menu: menu};
})();
