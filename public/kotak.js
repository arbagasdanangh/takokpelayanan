"use strict";
/* Versi 69: Kotak Masuk Pro untuk admin.
   Daftar percakapan berhalaman (muat lebih banyak), pencarian sampai isi pesan terakhir dan nomor tiket,
   kelompok hari, bintang, tunda (snooze), pilih semua halaman, pesan lama dilipat, ringkasan dan percakapan serupa.
   Bintang dan tunda hanya disimpan di peramban admin yang bersangkutan. */
(function () {
var KEY = "tk_kotak", UKUR = 30, tampil = UKUR, sigF = "";
var ST = {star: {}, snz: {}};
try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); if (s && s.star) ST = {star: s.star || {}, snz: s.snz || {}}; } catch (e) {}
function simpan() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var kk = function (x) { return x.pid + "|" + x.kunci; };
function ditunda(x) { var z = ST.snz[kk(x)]; return !!z && Date.now() < z.sd && x.lu <= z.at; }
function rapikanTunda() { var n = Date.now(), ubah = false; for (var k in ST.snz) if (n >= ST.snz[k].sd) { delete ST.snz[k]; ubah = true; } if (ubah) simpan(); }
function grup(ms) {
  var a = new Date(ms), b = new Date(), d = Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  return d <= 0 ? "Hari ini" : d === 1 ? "Kemarin" : d < 7 ? "Minggu ini" : "Lebih lama";
}

var asliOk = window.admOk;
window.admOk = function (x, hari) {
  var st = AF.st;
  if (st === "star") return !!ST.star[kk(x)];
  if (st === "snz") return ditunda(x);
  if (ditunda(x) && st !== "all") return false;
  if (st === "all" && ditunda(x) && !AF.q) return false;
  if (AF.q) {
    var q = AF.q, st0 = AF.st; AF.q = ""; AF.st = st0 === "all" ? "all" : st0;
    var ok = asliOk(x, hari); AF.q = q; AF.st = st0;
    if (!ok) return false;
    var h = (x.nama + " " + x.hp + " " + x.email + " " + (x.tk || "") + " " + (x.teks || "") + " " + ((x.tag && x.tag.pic) || "") + " " + ((x.tag && x.tag.tags) || []).join(" ") + " " + (x.meta.topik || []).join(" ")).toLowerCase();
    return q.split(/\s+/).every(function (w) { return !w || h.indexOf(w) > -1; });
  }
  return asliOk(x, hari);
};

var asliList = window.admList;
window.admList = function () {
  var el = $("al"); if (!el || S !== "adm") return;
  rapikanTunda();
  asliList();               // hitung statistik, filter, urutan, kotak massal
  var kids = [].slice.call(el.querySelectorAll(".tiw"));
  if (window.TKTGL) {
    if (!AF.tg) AF.tg = TKTGL.baru();
    var afx = $("af");
    if (afx && !$("tg-inbox")) {
      var wr = document.createElement("div"); wr.id = "tg-inbox"; wr.innerHTML = TKTGL.bar(AF.tg, "inbox"); afx.parentNode.insertBefore(wr, afx);
      TKTGL.pasang(wr, AF.tg, function () { window.admList(); });
    }
  }
  var sig = [AF.st, AF.loc, AF.q, AF.tp, AF.sn, AF.so, AF.tg && AF.tg.a, AF.tg && AF.tg.b].join("|");
  if (sig !== sigF) { sigF = sig; tampil = UKUR; }
  var total = kids.length, now = Date.now();
  // chip tambahan
  var af = $("af");
  if (af && !af.querySelector("[data-s=star]")) {
    var ns = Object.keys(ST.star).length, nz = T.filter(ditunda).length;
    af.insertAdjacentHTML("beforeend", '<button type="button" class="chip" data-s="star" aria-pressed="' + (AF.st === "star") + '">⭐ Bintang' + (ns ? " (" + ns + ")" : "") + '</button><button type="button" class="chip" data-s="snz" aria-pressed="' + (AF.st === "snz") + '">😴 Ditunda' + (nz ? " (" + nz + ")" : "") + '</button>');
  }
  if (!total) return;
  var byKey = {}; T.forEach(function (x) { byKey[kk(x)] = x; });
  var lastG = "";
  kids.forEach(function (w, i) {
    var cb = w.querySelector("[data-bk]"), x = cb ? byKey[cb.dataset.bk] : null;
    if (i >= tampil) { w.remove(); return; }
    if (!x) return;
    var g = grup(x.waktu);
    {
      if (g !== lastG && AF.so !== "prio") { w.insertAdjacentHTML("beforebegin", '<div class="kt-g">' + g + '</div>'); }
      lastG = g;
    }
    var bt = document.createElement("span"); bt.className = "kt-ac";
    bt.innerHTML = '<button type="button" class="kt-b' + (ST.star[kk(x)] ? " on" : "") + '" data-kt="star" data-k="' + esc2(kk(x)) + '" aria-label="Bintangi" title="Bintangi">' + (ST.star[kk(x)] ? "★" : "☆") + '</button>'
      + '<button type="button" class="kt-b" data-kt="snz" data-k="' + esc2(kk(x)) + '" aria-label="Tunda" title="Tunda sampai ada pesan baru atau waktu habis">💤</button>';
    w.appendChild(bt);
  });
  var info = document.createElement("div"); info.className = "kt-more";
  var sisa = total - Math.min(total, tampil);
  info.innerHTML = '<span class="sys">Menampilkan ' + Math.min(total, tampil) + ' dari ' + total + ' percakapan</span>'
    + (sisa ? ' <button type="button" class="btn" data-kt="more">Muat ' + Math.min(UKUR, sisa) + ' lagi</button><button type="button" class="btn" data-kt="all">Tampilkan semua (' + sisa + ' lagi)</button>' : "");
  el.appendChild(info);
  var bk = $("bulk");
  if (bk && !bk.querySelector("[data-kt=pall]") && total > 1) bk.insertAdjacentHTML("beforeend", '<button type="button" class="btn" data-kt="pall">Pilih semua ' + total + ' (semua halaman)</button>');
};

var asliPane = window.admPane;
window.admPane = function () {
  asliPane();
  var p = $("ap"); if (!p || !SEL) return;
  var th = $("th2");
  // lipat pesan lama
  if (th && SM.length > 16 && SEL.buka !== kk(SEL)) {
    var ch = [].slice.call(th.children), pot = 0, n = 0;
    // hitung elemen pesan paling bawah yang dipertahankan (16 pesan terakhir)
    var msgs = ch.filter(function (c) { return !c.classList.contains("dsep"); });
    var lipat = msgs.slice(0, Math.max(0, msgs.length - 16));
    if (lipat.length) {
      lipat.forEach(function (c) { c.hidden = true; });
      ch.forEach(function (c) { if (c.classList.contains("dsep")) { var nx = c.nextElementSibling; if (nx && nx.hidden) c.hidden = true; } });
      var b = document.createElement("button"); b.type = "button"; b.className = "btn kt-lm"; b.dataset.kt = "lama";
      b.textContent = "Tampilkan " + lipat.length + " pesan sebelumnya"; th.insertBefore(b, th.firstChild);
    }
  }
  // ringkasan + serupa + tunda
  if (!p.querySelector(".kt-rk")) {
    var tanya = SM.filter(function (m) { return m.by !== "admin" && !m.bot; }), jwb = SM.filter(function (m) { return m.by === "admin"; });
    var awal = tanya.length ? tanya[0].text || "" : "", akhir = tanya.length ? tanya[tanya.length - 1].text || "" : "";
    var srp = T.filter(function (x) { return x.pend && !(x.pid === SEL.pid && x.kunci === SEL.kunci) && SEL.meta && SEL.meta.topik && SEL.meta.topik[0] && (x.meta.topik || []).indexOf(SEL.meta.topik[0]) > -1; }).slice(0, 5);
    var h = '<div class="kt-rk"><b>Ringkasan</b> <small class="sys">' + SM.length + ' pesan &middot; ' + tanya.length + ' dari pemohon &middot; ' + jwb.length + ' dari admin</small>'
      + (awal ? '<p class="sys" style="margin:4px 0">Awal: ' + esc2(String(awal).slice(0, 140)) + '</p>' : "")
      + (tanya.length > 1 ? '<p class="sys" style="margin:4px 0">Terakhir: ' + esc2(String(akhir).slice(0, 140)) + '</p>' : "")
      + '<div class="hint"><button type="button" class="chip" data-kt="star1">' + (ST.star[kk(SEL)] ? "★ Bintang" : "☆ Bintangi") + '</button>'
      + '<button type="button" class="chip" data-kt="snz1" data-j="1">💤 Tunda 1 jam</button><button type="button" class="chip" data-kt="snz1" data-j="24">Tunda besok</button></div>'
      + (srp.length ? '<small class="sys">Pertanyaan serupa (topik ' + esc2(SEL.meta.topik[0]) + '):</small><div class="hint">' + srp.map(function (x) { return '<button type="button" class="chip" data-kt="go" data-k="' + esc2(kk(x)) + '">' + esc2(String(x.nama).split(" ")[0]) + " &middot; " + esc2(label(x.kunci)) + '</button>'; }).join("") + '</div>' : "")
      + '</div>';
    var hd = p.querySelector("h3"); var after = hd && hd.nextElementSibling; (after || hd || p.firstChild).insertAdjacentHTML("afterend", h);
  }
};

document.addEventListener("click", function (e) {
  if (window.S !== "adm") return;
  var b = e.target.closest("[data-kt]"); if (!b) return;
  var a = b.dataset.kt, k = b.dataset.k;
  if (a === "more") { tampil += UKUR; admList(); return; }
  if (a === "all") { tampil = 1e9; admList(); return; }
  if (a === "star" || a === "star1") { var kx = a === "star" ? k : kk(SEL); if (ST.star[kx]) delete ST.star[kx]; else ST.star[kx] = 1; simpan(); var al = $("al"), sc = al ? al.scrollTop : 0; admList(); if (a === "star1") { var rk = document.querySelector(".kt-rk"); if (rk) rk.remove(); admPane(); } return; }
  if (a === "snz" || a === "snz1") {
    var key = a === "snz" ? k : kk(SEL), x = T.filter(function (t) { return kk(t) === key; })[0], j = a === "snz" ? 24 : +b.dataset.j || 1;
    ST.snz[key] = {at: x ? x.lu : Date.now(), sd: Date.now() + j * 36e5}; simpan();
    if (SEL && kk(SEL) === key) { SEL = null; SM = []; admPane(); }
    admList(); toast("Ditunda " + (j >= 24 ? "sampai besok" : j + " jam") + " (kembali lebih awal jika ada pesan baru)."); return;
  }
  if (a === "lama") { SEL.buka = kk(SEL); admPane(); return; }
  if (a === "go") { var y = T.filter(function (t) { return kk(t) === k; })[0]; if (y) pick(y); return; }
  if (a === "pall") { var n = 0; T.forEach(function (x) { if (admOk(x, iso(wibDate(0)))) { BULK[kk(x)] = 1; n++; } }); admList(); toast(n + " percakapan dipilih."); return; }
}, true);
if (window.S === "adm") try { admList(); } catch (e) {}
})();
