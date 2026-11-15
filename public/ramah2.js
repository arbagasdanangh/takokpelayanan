"use strict";
/* Versi 59: Paket Nyaman (lanjutan Paket Ramah). Semua tersimpan di perangkat warga.
   1. Misi harian (3 misi per hari, poin, tingkat, konfeti) supaya ada alasan kembali tiap hari.
   2. Pencarian terakhir (chip di bawah kolom cari).
   3. Catatan pribadi per loket (hanya di HP ini).
   4. Geser kiri/kanan di daftar loket untuk pindah lokasi SPP.
   5. Kerangka memuat (skeleton) saat daftar loket belum siap, lewat CSS.
   6. Pemberitahuan "Versi baru siap, muat ulang" saat aplikasi diperbarui. */
(function () {
var D = document, W = window, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function ujung(f) { try { return f(); } catch (e) { return undefined; } }
function toast(m, l, f) { if (W.toast) W.toast(m, l, f); }
function getar(n) { try { if (W.Apk && Apk.hap() && navigator.vibrate) navigator.vibrate(n || 10); } catch (e) {} }
function muat(k, d) { try { var o = JSON.parse(localStorage.getItem(k) || "null"); return o == null ? d : o; } catch (e) { return d; } }
function simpan(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function hari() { var t = new Date(); return t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2); }

/* ---------- 1. Misi harian ---------- */
var MISI = [
  {id: "cari", t: "Cari layanan di kolom cari"},
  {id: "buka", t: "Buka satu loket dan baca persyaratannya"},
  {id: "fav", t: "Simpan satu loket ke favorit (bintang)"},
  {id: "bot", t: "Tanya Asisten Takok"},
  {id: "main", t: "Mampir ke Ruang Main"},
  {id: "bagi", t: "Bagikan Takok ke satu teman"},
  {id: "lok", t: "Lihat loket di lokasi SPP lain"}
];
var TINGKAT = [[0, "Warga Baru"], [50, "Warga Aktif"], [150, "Duta Layanan"], [400, "Pahlawan Pelayanan"]];
var MS = muat("tk_misi", {}); if (!MS || typeof MS !== "object") MS = {};
if (typeof MS.poin !== "number") MS.poin = 0;
function hariKeN() { var t = new Date(); return Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 864e5); }
function misiHariIni() { var n = hariKeN(); return [MISI[n % 7], MISI[(n + 2) % 7], MISI[(n + 4) % 7]]; }
if (MS.d !== hari()) { MS.d = hari(); MS.done = {}; MS.bonus = false; simpan("tk_misi", MS); }
function tingkat() { var t = TINGKAT[0][1], nx = null; TINGKAT.forEach(function (x, i) { if (MS.poin >= x[0]) { t = x[1]; nx = TINGKAT[i + 1] || null; } }); return {nama: t, next: nx}; }
function selesai(id) {
  var list = misiHariIni(); if (!list.some(function (m) { return m.id === id; }) || MS.done[id]) return;
  MS.done[id] = 1; MS.poin += 10; var n = list.filter(function (m) { return MS.done[m.id]; }).length, semua = n === list.length;
  if (semua && !MS.bonus) { MS.bonus = true; MS.poin += 20; }
  simpan("tk_misi", MS); getar(15); gambarMisi();
  var m = list.filter(function (x) { return x.id === id; })[0];
  if (semua) { toast("Semua misi hari ini selesai! +30 poin"); if (W.Ramah) Ramah.konfeti(); }
  else toast("Misi selesai: " + m.t + " (+10 poin)");
}
var kM = null, sigM = "";
function gambarMisi() {
  var hi = $("rm-hi"); if (!hi) return;
  if (!kM || !kM.isConnected) { kM = D.createElement("section"); kM.className = "rm-card rm-misi"; kM.id = "rm-ms"; kM.setAttribute("aria-label", "Misi hari ini"); hi.parentNode.insertBefore(kM, hi.nextSibling); sigM = ""; }
  var list = misiHariIni(), n = list.filter(function (m) { return MS.done[m.id]; }).length, tg = tingkat();
  var sig = n + "|" + MS.poin + "|" + MS.d; if (sig === sigM) return; sigM = sig;
  kM.innerHTML = '<div class="rm-top"><div><small>Misi hari ini</small><b>' + n + ' dari ' + list.length + ' selesai</b></div><span class="rm-streak" title="Poin misi">&#127941; ' + E(tg.nama) + ' &middot; ' + MS.poin + ' poin</span></div>' +
    '<div class="rm-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + list.length + '" aria-valuenow="' + n + '"><i style="width:' + Math.round(n / list.length * 100) + '%"></i></div>' +
    '<ul class="rm-ml">' + list.map(function (m) { var d = !!MS.done[m.id]; return '<li class="' + (d ? "ok" : "") + '"><span class="rm-ck" aria-hidden="true">' + (d ? "&#10003;" : "") + '</span><span>' + E(m.t) + '</span></li>'; }).join("") + '</ul>' +
    (tg.next ? '<p class="rm-nx">' + (tg.next[0] - MS.poin) + ' poin lagi menuju <b>' + E(tg.next[1]) + '</b>. Selesaikan 3 misi untuk bonus +20 poin.</p>' : '<p class="rm-nx">Tingkat tertinggi tercapai. Terima kasih sudah setia memakai Takok!</p>');
}

/* pencatat kejadian untuk misi */
D.addEventListener("click", function (e) {
  var t = e.target; if (!t.closest) return;
  if (t.closest("#go")) { var q = $("q"); if (q && q.value.trim().length > 1) { riwayatCari(q.value.trim()); selesai("cari"); } }
  else if (t.closest("#mbgo")) selesai("main");
  else if (t.closest("#lc .chip")) selesai("lok");
  else if (t.closest("[data-rm='wa'],[data-rm='salin'],[data-rm='bagi'],[data-rms]")) selesai("bagi");
}, true);
D.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "q") { var v = e.target.value.trim(); if (v.length > 1) { riwayatCari(v); selesai("cari"); } } }, true);
D.addEventListener("toggle", function (e) { var d = e.target; if (d && d.classList && d.classList.contains("row") && d.open) selesai("buka"); }, true);
D.addEventListener("rm:fav", function () { selesai("fav"); });
setInterval(function () { var bp = $("bp"), gm = $("gm"); if (bp && !bp.hidden) selesai("bot"); if (gm && !gm.hidden) selesai("main"); }, 1000);

/* ---------- 2. Pencarian terakhir ---------- */
var RC = muat("tk_cari", []); if (!Array.isArray(RC)) RC = [];
function riwayatCari(v) { v = v.slice(0, 60); RC = [v].concat(RC.filter(function (x) { return x.toLowerCase() !== v.toLowerCase(); })).slice(0, 6); simpan("tk_cari", RC); gambarRC(); }
var kR = null, sigR = "";
function gambarRC() {
  var ask = D.querySelector(".ask"); if (!ask) return;
  if (!kR || !kR.isConnected) { kR = D.createElement("div"); kR.id = "rm-rc"; kR.className = "rm-rc"; ask.parentNode.insertBefore(kR, ask.nextSibling); sigR = ""; }
  var s = RC.join("|"); if (s === sigR) return; sigR = s;
  if (!RC.length) { kR.hidden = true; kR.innerHTML = ""; return; } kR.hidden = false;
  kR.innerHTML = '<span class="rm-lb">Pencarian terakhir</span>' + RC.map(function (x) { return '<button type="button" class="chip" data-rc="' + E(x) + '">' + E(x) + '</button>'; }).join("") + '<button type="button" class="rm-clr" data-rcx="1" aria-label="Hapus riwayat pencarian">Hapus</button>';
}
D.addEventListener("click", function (e) {
  var c = e.target.closest && e.target.closest("[data-rc]"), x = e.target.closest && e.target.closest("[data-rcx]");
  if (x) { RC = []; simpan("tk_cari", RC); gambarRC(); getar(8); return; }
  if (!c) return; var q = $("q"), go = $("go"); if (!q || !go) return; getar(8);
  q.value = c.dataset.rc; q.dispatchEvent(new Event("input", {bubbles: true})); go.click();
});

/* ---------- 3. Catatan pribadi per loket ---------- */
var NT = muat("tk_note", {}); if (!NT || typeof NT !== "object" || Array.isArray(NT)) NT = {};
var ntT = 0;
function hiasCatatan() {
  [].forEach.call(D.querySelectorAll("#list details.row .body"), function (b) {
    if (b.querySelector(".rm-note")) return; var d = b.closest("details.row"), k = d && d.dataset.n; if (!k) return;
    var w = D.createElement("div"); w.className = "rm-note";
    w.innerHTML = '<label>Catatan saya <small>(tersimpan di HP ini saja)</small></label><textarea rows="2" maxlength="300" placeholder="Contoh: bawa fotokopi KTP 2 lembar, datang sebelum jam 10"></textarea><small class="rm-sv" aria-live="polite"></small>';
    var ta = w.querySelector("textarea"), sv = w.querySelector(".rm-sv"); ta.value = NT[k] || "";
    ta.addEventListener("input", function () {
      clearTimeout(ntT); ntT = setTimeout(function () {
        var v = ta.value.trim(); if (v) NT[k] = v; else delete NT[k];
        var ks = Object.keys(NT); if (ks.length > 60) delete NT[ks[0]];
        simpan("tk_note", NT); sv.textContent = v ? "Tersimpan" : "Catatan dihapus"; setTimeout(function () { sv.textContent = ""; }, 1500);
      }, 500);
    });
    ta.addEventListener("click", function (e) { e.stopPropagation(); });
    b.appendChild(w);
  });
}
if (W.MutationObserver && $("list")) new MutationObserver(function () { ujung(hiasCatatan); }).observe($("list"), {childList: true});

/* ---------- 4. Geser untuk pindah lokasi SPP ---------- */
var sx = 0, sy = 0, st0 = 0, sOn = false;
D.addEventListener("touchstart", function (e) {
  sOn = false; var t = e.touches[0]; if (e.touches.length !== 1 || t.clientX < 26 || t.clientX > innerWidth - 26) return;
  var el = e.target; if (!el.closest || !el.closest("#list") || el.closest("textarea,input,select,table,.rm-ch,.hscroll,.ldr")) return;
  if (D.querySelector(".sh-ov,.pn-ov,.ap-ov,#gm:not([hidden]),#bp:not([hidden])")) return;
  sx = t.clientX; sy = t.clientY; st0 = Date.now(); sOn = true;
}, {passive: true});
D.addEventListener("touchend", function (e) {
  if (!sOn) return; sOn = false; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  if (Math.abs(dx) < 90 || Math.abs(dy) > 45 || Date.now() - st0 > 650) return;
  try { if (String(window.getSelection())) return; } catch (x) {}
  var chips = [].slice.call(D.querySelectorAll("#lc .chip[data-l]")), i = -1; chips.forEach(function (c, j) { if (c.getAttribute("aria-pressed") === "true") i = j; });
  var j2 = i + (dx < 0 ? 1 : -1); if (i < 0 || j2 < 0 || j2 >= chips.length) return;
  var L = $("list"); if (L) { L.classList.remove("rm-sw-l", "rm-sw-r"); void L.offsetWidth; L.classList.add(dx < 0 ? "rm-sw-l" : "rm-sw-r"); }
  getar(10); chips[j2].click(); toast("Lokasi: " + chips[j2].textContent);
  try { chips[j2].scrollIntoView({inline: "center", block: "nearest", behavior: "smooth"}); } catch (x) {}
}, {passive: true});

/* ---------- 6. Pemberitahuan versi baru ---------- */
if ("serviceWorker" in navigator) {
  var punya = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!punya) { punya = true; return; }
    toast("Versi baru Takok sudah siap.", "Muat ulang", function () { location.reload(); });
  });
}

function jalan() { ujung(gambarMisi); ujung(gambarRC); ujung(hiasCatatan); }
jalan(); setInterval(jalan, 1500);
W.Misi = {selesai: selesai, poin: function () { return MS.poin; }};
})();
