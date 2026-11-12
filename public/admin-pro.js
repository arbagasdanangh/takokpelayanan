"use strict";
/* Versi 50: Takok Admin Pro. Semua pembatasan akses tetap di server; berkas ini hanya mengolah tampilan dari data yang sudah boleh dilihat admin.
   1. Palet perintah (Ctrl+K saat masuk sebagai admin): lompat ke tab, saring kotak masuk, cari percakapan, aksi cepat.
   2. Pintasan kotak masuk: J/K pindah percakapan, R fokus kolom balas, / cari.
   3. Peringatan pesan baru: bunyi dan judul tab berkedip saat jumlah "perlu dijawab" bertambah (bisa dimatikan).
   4. Tab "Hari ini (live)": antrean per loket, jam sibuk, tingkat hadir, tekanan kotak masuk, dan catatan serah-terima shift. Memperbarui diri tiap 20 detik.
   5. Versi 51: menu "/" balasan cepat di kolom balas, cari booking dari palet, target harian + perkiraan antrean habis + hitung mundur jam tutup,
      laporan harian siap salin/WhatsApp, Shift+N panggil berikutnya, dan mode tampilan padat. */
(function () {
var D = document;
var $a = function (i) { return D.getElementById(i); };
var Q = function (s, r) { return (r || D).querySelector(s); };
var H = function (s) { return typeof esc === "function" ? esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var p2 = function (n) { return String(n).padStart(2, "0"); };
function isAdm() { return window.S === "adm"; }
function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
function inboxOpen() { var a = $a("a-inbox"); return isAdm() && a && !a.hidden; }
function gotoTab(t) { var b = Q('#atabs [data-at="' + t + '"]'); if (b) b.click(); }
var BUNYI = (function () { try { return localStorage.getItem("tk_adm_bunyi") !== "0"; } catch (e) { return true; } })();

/* ---------- 1. Palet perintah ---------- */
var pal = null;
function aksi() {
  var A = [], sup = !(window.ME && ME.level === "loket");
  [].forEach.call(D.querySelectorAll("#atabs [data-at]"), function (b) { A.push({g: "Buka tab", t: b.textContent, run: function () { b.click(); }}); });
  [["pend", "Perlu dijawab"], ["hi", "Prioritas tinggi"], ["fu", "Tindak lanjut jatuh tempo"], ["all", "Semua percakapan"]].forEach(function (f) {
    A.push({g: "Saring kotak masuk", t: f[1], run: function () { gotoTab("inbox"); var b = Q('#af [data-s="' + f[0] + '"]'); if (b) b.click(); }});
  });
  A.push({g: "Aksi", t: "Muat ulang data sekarang", run: function () { if (typeof tick === "function") tick(); if (window.toast) toast("Data dimuat ulang."); }});
  A.push({g: "Aksi", t: "Buka layar antrean (TV)", run: function () { window.open("/?layar=1", "_blank", "noopener"); }});
  if (sup) A.push({g: "Aksi", t: "Unduh database (Excel)", run: function () { location.href = "/api/app?p=%2Fadmin%2Fdata.xlsx"; }});
  A.push({g: "Aksi", t: "Bunyi peringatan pesan baru: " + (BUNYI ? "matikan" : "nyalakan"), run: function () { setBunyi(!BUNYI); }});
  A.push({g: "Aksi", t: "Ganti tema terang atau gelap", run: function () { var b = $a("th"); if (b) b.click(); }});
  A.push({g: "Aksi", t: "Keluar", run: function () { var b = $a("lo"); if (b) b.click(); }});
  return A;
}
function percakapan(q) {
  if (!q || typeof T === "undefined" || !T.length) return [];
  var qs = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
  T.slice().sort(function (a, b) { return (b.pend - a.pend) || ((b.skor || 0) - (a.skor || 0)); }).forEach(function (x) {
    var lb = typeof label === "function" ? label(x.kunci) : x.kunci, hs = (x.nama + " " + x.hp + " " + (x.tk || "") + " " + lb + " " + (x.teks || "")).toLowerCase();
    if (qs.every(function (w) { return hs.indexOf(w) > -1; }) && out.length < 8) out.push({g: "Percakapan", t: x.nama + " \u00b7 " + lb, s: (x.pend ? "Perlu dijawab \u00b7 " : "") + String(x.teks || "").slice(0, 70), run: function () { gotoTab("inbox"); if (typeof pick === "function") pick(x); }});
  });
  return out;
}
var BKC = {t: 0, l: []}, palRedraw = null;
function prefetchBk() {
  if (Date.now() - BKC.t < 30000) return; BKC.t = Date.now();
  api("/api/admin/booking?tanggal=" + iso(wibDate(0))).then(function (j) { BKC.l = j.daftar || []; if (palRedraw) palRedraw(); }).catch(function () {});
}
function tungguEl(id, cb, n) { var e = $a(id); if (e) return cb(e); if ((n || 0) < 30) setTimeout(function () { tungguEl(id, cb, (n || 0) + 1); }, 150); }
function bookingCari(q) {
  if (!q || q.length < 2) return []; var qs = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
  BKC.l.forEach(function (o) {
    var hs = (o.kode + " " + o.nama + " " + o.hp + " " + (o.keperluan || "") + " " + (o.loket || "") + " " + o.status).toLowerCase();
    if (out.length < 6 && qs.every(function (w) { return hs.indexOf(w) > -1; })) out.push({g: "Booking hari ini", t: o.kode + " \u00b7 " + o.nama, s: o.jam + " WIB \u00b7 " + (o.loket || "") + " \u00b7 " + o.status, run: function () { gotoTab("bk"); tungguEl("bscan", function (e) { e.value = o.kode; e.focus(); e.select(); }); }});
  });
  return out;
}
function bukaPalet() {
  if (pal) { Q(".ap-in", pal).focus(); return; }
  var all = aksi(), sel = 0, cur = [];
  pal = D.createElement("div"); pal.className = "ap-ov"; pal.setAttribute("role", "dialog"); pal.setAttribute("aria-modal", "true"); pal.setAttribute("aria-label", "Palet perintah admin");
  pal.innerHTML = '<div class="ap-box"><input class="ap-in" placeholder="Ketik perintah, tab, nama pemohon, atau kode booking" autocomplete="off" aria-label="Cari perintah" role="combobox" aria-expanded="true" aria-controls="ap-ls"><ul class="ap-ls" id="ap-ls" role="listbox"></ul><div class="ap-ft"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd> pilih</span><span><kbd>Enter</kbd> jalankan</span><span><kbd>Esc</kbd> tutup</span></div></div>';
  var inp = Q(".ap-in", pal), ls = Q(".ap-ls", pal);
  function draw() {
    var q = inp.value.trim().toLowerCase(), qs = q.split(/\s+/).filter(Boolean);
    var m = all.filter(function (a) { var h = (a.g + " " + a.t).toLowerCase(); return qs.every(function (w) { return h.indexOf(w) > -1; }); });
    cur = (q ? m.slice(0, 8).concat(percakapan(q)).concat(bookingCari(q)) : m.slice(0, 14)); if (sel >= cur.length) sel = Math.max(0, cur.length - 1);
    var lastG = "";
    ls.innerHTML = cur.length ? cur.map(function (a, i) {
      var h = a.g !== lastG ? '<li class="ap-g" role="presentation">' + H(a.g) + '</li>' : ""; lastG = a.g;
      return h + '<li role="option" id="ap-o' + i + '" class="ap-o' + (i === sel ? " on" : "") + '" data-i="' + i + '" aria-selected="' + (i === sel) + '"><b>' + H(a.t) + '</b>' + (a.s ? '<small>' + H(a.s) + '</small>' : "") + '</li>';
    }).join("") : '<li class="ap-g" role="presentation">Tidak ada hasil</li>';
    var on = Q(".ap-o.on", ls); if (on) { inp.setAttribute("aria-activedescendant", on.id); on.scrollIntoView({block: "nearest"}); }
  }
  function tutup() { if (!pal) return; pal.remove(); pal = null; palRedraw = null; D.removeEventListener("keydown", kd, true); }
  function jalan(i) { var a = cur[i]; if (!a) return; tutup(); setTimeout(a.run, 30); }
  function kd(e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); tutup(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(cur.length - 1, sel + 1); draw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
    else if (e.key === "Enter" && pal && pal.contains(e.target)) { e.preventDefault(); jalan(sel); }
  }
  inp.oninput = function () { sel = 0; draw(); };
  ls.onclick = function (e) { var o = e.target.closest("[data-i]"); if (o) jalan(+o.dataset.i); };
  pal.onclick = function (e) { if (e.target === pal) tutup(); };
  D.addEventListener("keydown", kd, true); D.body.appendChild(pal); palRedraw = draw; prefetchBk(); draw(); inp.focus();
}
D.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key && e.key.toLowerCase() === "k" && isAdm()) { e.preventDefault(); e.stopImmediatePropagation(); bukaPalet(); }
}, true);

/* ---------- 2. Pintasan kotak masuk ---------- */
D.addEventListener("keydown", function (e) {
  if (!inboxOpen() || typing(e) || e.ctrlKey || e.metaKey || e.altKey || pal || Q(".kr-ov")) return;
  var k = e.key;
  if (k === "j" || k === "k") {
    var L = [].slice.call(D.querySelectorAll("#al .ti")); if (!L.length) return;
    var i = L.findIndex(function (b) { return b.getAttribute("aria-current") === "true"; }); i = k === "j" ? Math.min(L.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
    e.preventDefault(); L[i].click(); var n = [].slice.call(D.querySelectorAll("#al .ti"))[i]; if (n) n.scrollIntoView({block: "nearest"});
  } else if (k === "r") { var ed = Q("#ap textarea, #ap .ed, #ap [contenteditable=true]"); if (ed) { e.preventDefault(); ed.focus(); } }
  else if (k === "/") { var s = $a("as"); if (s) { e.preventDefault(); s.focus(); } }
});

/* ---------- 3. Peringatan pesan baru ---------- */
var AC = null;
function bip() {
  if (!BUNYI) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
    [[880, 0], [1175, 0.16]].forEach(function (n) { var o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.value = n[0]; o.connect(g); g.connect(AC.destination); var t = AC.currentTime + n[1]; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.start(t); o.stop(t + 0.2); });
  } catch (e) {}
}
var flashT = null;
function kedip(n) {
  clearInterval(flashT); var i = 0, asli = D.title;
  flashT = setInterval(function () { i++; D.title = i % 2 ? "\u25CF " + n + " pesan baru" : asli; if (i >= 9) { clearInterval(flashT); if (typeof title === "function") title(); } }, 800);
}
function setBunyi(on) {
  BUNYI = !!on; try { localStorage.setItem("tk_adm_bunyi", on ? "1" : "0"); } catch (e) {}
  var b = $a("ap-b"); if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = "Bunyi: " + (on ? "nyala" : "mati"); }
  if (on) bip(); if (window.toast) toast("Bunyi peringatan " + (on ? "dinyalakan." : "dimatikan."));
}
var PREV = null;
function pantau() {
  var st = $a("st"); if (!st || st.dataset.pr) return; st.dataset.pr = "1";
  function baca() { var m = /^(\d+)\s+perlu dijawab/.exec(st.textContent || ""); if (!m) return; var n = +m[1]; if (PREV != null && n > PREV && !D.hasFocus()) { kedip(n - PREV); } if (PREV != null && n > PREV) { bip(); if (window.toast) toast((n - PREV) + " pesan baru masuk.", "Lihat", function () { gotoTab("inbox"); }); } PREV = n; }
  new MutationObserver(baca).observe(st, {childList: true, characterData: true, subtree: true}); baca();
}

/* ---------- Mode tampilan padat ---------- */
var PADAT = (function () { try { return localStorage.getItem("tk_adm_padat") === "1"; } catch (e) { return false; } })();
D.body.classList.toggle("ap-pd", PADAT);
function setPadat(on) {
  PADAT = !!on; D.body.classList.toggle("ap-pd", PADAT); try { localStorage.setItem("tk_adm_padat", PADAT ? "1" : "0"); } catch (e) {}
  var b = $a("ap-p"); if (b) { b.setAttribute("aria-pressed", String(PADAT)); b.textContent = "Padat: " + (PADAT ? "nyala" : "mati"); }
}

/* ---------- Bar di atas panel admin ---------- */
function bar() {
  var v = $a("v-adm"), tabs = $a("atabs"); if (!v || !tabs || $a("ap-bar")) { pantau(); return; }
  var b = D.createElement("div"); b.id = "ap-bar"; b.className = "ap-bar";
  b.innerHTML = '<button type="button" class="btn" id="ap-k" aria-haspopup="dialog">Perintah <kbd>Ctrl K</kbd></button><button type="button" class="btn" id="ap-b" aria-pressed="' + BUNYI + '">Bunyi: ' + (BUNYI ? "nyala" : "mati") + '</button><button type="button" class="btn" id="ap-p" aria-pressed="' + PADAT + '">Padat: ' + (PADAT ? "nyala" : "mati") + '</button><button type="button" class="btn" id="ap-h">Pintasan <kbd>?</kbd></button>';
  tabs.parentNode.insertBefore(b, tabs);
  $a("ap-p").onclick = function () { setPadat(!PADAT); };
  $a("ap-k").onclick = bukaPalet; $a("ap-b").onclick = function () { setBunyi(!BUNYI); };
  $a("ap-h").onclick = function () { D.dispatchEvent(new KeyboardEvent("keydown", {key: "?", bubbles: true})); };
  pantau();
}
if (window.MutationObserver) { var vm = $a("v-adm"); if (vm) new MutationObserver(bar).observe(vm, {childList: true, subtree: false}); }
bar();

/* ---------- 5. Menu "/" balasan cepat di kolom balas ---------- */
var SL = {el: null, i: 0, list: [], ta: null, tk: null};
function tokenSl(ta) { var v = ta.value.slice(0, ta.selectionStart), m = /(^|\s)\/([^\s\/]*)$/.exec(v); return m ? {q: m[2].toLowerCase(), start: v.length - m[2].length - 1} : null; }
function tutupSl() { if (SL.el) { SL.el.remove(); SL.el = null; } SL.list = []; SL.tk = null; }
function tampilSl(ta) {
  var tk = tokenSl(ta), qr = typeof QR !== "undefined" ? QR : [];
  if (!tk || !qr.length) { tutupSl(); return; }
  SL.ta = ta; SL.tk = tk; SL.list = qr.filter(function (q) { return !tk.q || q.toLowerCase().indexOf(tk.q) > -1; }).slice(0, 6);
  if (!SL.list.length) { tutupSl(); return; }
  if (SL.i >= SL.list.length) SL.i = 0;
  if (!SL.el || !SL.el.isConnected) { SL.el = D.createElement("div"); SL.el.className = "ap-sl"; SL.el.setAttribute("role", "listbox"); SL.el.setAttribute("aria-label", "Balasan cepat"); ta.parentNode.insertBefore(SL.el, ta); SL.el.onmousedown = function (e) { e.preventDefault(); var o = e.target.closest("[data-si]"); if (o) pilihSl(+o.dataset.si); }; }
  SL.el.innerHTML = '<small class="sys">Balasan cepat: &uarr;&darr; pilih, Enter atau Tab sisipkan, Esc tutup</small>' + SL.list.map(function (q, i) { return '<div role="option" data-si="' + i + '" class="ap-si' + (i === SL.i ? " on" : "") + '" aria-selected="' + (i === SL.i) + '">' + H(q.length > 110 ? q.slice(0, 110) + "\u2026" : q) + '</div>'; }).join("");
}
function pilihSl(i) {
  var ta = SL.ta, tk = SL.tk, q = SL.list[i]; if (!ta || !tk || q == null) return;
  var isi = typeof fillT === "function" ? fillT(q) : q, v = ta.value, fin = ta.selectionStart;
  ta.value = v.slice(0, tk.start) + isi + v.slice(fin); var pos = tk.start + isi.length; ta.focus(); ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event("input", {bubbles: true})); tutupSl();
}
D.addEventListener("input", function (e) { if (e.target && e.target.id === "rt") { SL.i = 0; tampilSl(e.target); } });
D.addEventListener("keydown", function (e) {
  if (!SL.el || !e.target || e.target.id !== "rt" || e.ctrlKey || e.metaKey) return;
  if (e.key === "ArrowDown") { e.preventDefault(); SL.i = (SL.i + 1) % SL.list.length; tampilSl(e.target); }
  else if (e.key === "ArrowUp") { e.preventDefault(); SL.i = (SL.i - 1 + SL.list.length) % SL.list.length; tampilSl(e.target); }
  else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); pilihSl(SL.i); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); tutupSl(); }
}, true);
D.addEventListener("focusout", function (e) { if (e.target && e.target.id === "rt") setTimeout(tutupSl, 150); });

/* ---------- Pintasan tab Booking: Shift+N panggil berikutnya, S fokus scan ---------- */
D.addEventListener("keydown", function (e) {
  if (!isAdm() || typing(e) || e.ctrlKey || e.metaKey || e.altKey || pal || Q(".kr-ov")) return;
  var sc = $a("bscan"); if (!sc || !sc.offsetParent) return;
  if (e.key === "N") { var b = Q("[data-nx]:not([disabled])"); if (b) { e.preventDefault(); b.click(); if (window.toast) toast("Memanggil nomor berikutnya\u2026"); } else if (window.toast) toast("Tidak ada antrean menunggu."); }
  else if (e.key === "s" || e.key === "S") { e.preventDefault(); sc.focus(); }
});

/* ---------- 4. Tab "Hari ini (live)" ---------- */
var WARNA = {"Terjadwal": "#64748b", "Sudah tiba": "#d97706", "Dipanggil": "#2563eb", "Hadir": "#15803d", "Tidak hadir": "#b91c1c"}, URUT = ["Sudah tiba", "Terjadwal", "Dipanggil", "Hadir", "Tidak hadir"];
var HARI = {Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7}, HRD = null, TGK = "tk_target_hr";
function wibNow() {
  var f = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short"}), o = {};
  f.formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
  return {h: +o.hour % 24, m: +o.minute, wd: HARI[o.weekday] || 1};
}
function fm(mnt) { mnt = Math.round(((mnt % 1440) + 1440) % 1440); return p2(Math.floor(mnt / 60)) + "." + p2(mnt % 60); }
function fSisa(mnt) { mnt = Math.max(0, Math.round(mnt)); return mnt >= 60 ? Math.floor(mnt / 60) + " jam " + (mnt % 60) + " menit" : mnt + " menit"; }
function target() { var v = 30; try { v = parseInt(localStorage.getItem(TGK), 10) || 30; } catch (e) {} return Math.min(999, Math.max(1, v)); }
function hitung() {
  var L = (HRD && HRD.bk && HRD.bk.daftar) || [], c = {}; L.forEach(function (o) { c[o.status] = (c[o.status] || 0) + 1; });
  return {L: L, c: c, hadir: c["Hadir"] || 0, tdk: c["Tidak hadir"] || 0, sisa: (c["Terjadwal"] || 0) + (c["Sudah tiba"] || 0) + (c["Dipanggil"] || 0)};
}
function drawTarget() {
  var tb = $a("hr-tb"), tp = $a("hr-tp"); if (!tb || !tp || !HRD) return;
  var x = hitung(), tg = target(), n = wibNow(), nowH = n.h + n.m / 60, kerja = n.wd <= 5, ex = [];
  tb.style.width = Math.min(100, x.hadir / tg * 100) + "%";
  if (kerja && nowH >= 8 && nowH < 14) ex.push("Booking tutup pukul 14.00, sisa " + fSisa((14 - nowH) * 60) + ".");
  if (x.sisa > 0) {
    var el = Math.max(0.25, Math.min(nowH, 14) - 8);
    if (x.hadir > 0 && nowH >= 8) { var rate = x.hadir / el, eta = nowH + x.sisa / rate; ex.push("Perkiraan antrean habis pukul " + fm(eta * 60) + (eta > 14 ? " (melewati jam tutup bila laju tetap)" : "") + ", laju " + rate.toFixed(1) + " dilayani per jam."); }
    else ex.push(x.sisa + " antrean tersisa. Perkiraan muncul setelah ada yang dilayani.");
  } else if (x.L.length) ex.push("Tidak ada antrean tersisa.");
  tp.innerHTML = '<b>' + x.hadir + '</b> dari target ' + tg + ' dilayani (' + Math.round(x.hadir / tg * 100) + '%)' + (x.hadir >= tg ? ' \u00b7 target tercapai' : '') + (ex.length ? '<br>' + ex.map(H).join('<br>') : '');
}
function laporanText() {
  var x = hitung(), per = {}, tgl = new Date().toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric"}), ta = $a("hr-note"), rate = x.hadir + x.tdk ? Math.round(x.hadir / (x.hadir + x.tdk) * 100) + "%" : "-";
  x.L.forEach(function (o) { var k = o.loket || o.kunci; per[k] = per[k] || {n: 0, w: 0, h: 0}; per[k].n++; if (o.status === "Hadir") per[k].h++; if (o.status === "Terjadwal" || o.status === "Sudah tiba") per[k].w++; });
  var t = "Laporan harian Takok Pelayanan Suroboyo\n" + tgl + "\n\nBooking: " + x.L.length + "\nDilayani: " + x.hadir + "\nTidak hadir: " + x.tdk + "\nMasih menunggu: " + x.sisa + "\nTingkat hadir: " + rate + "\nTarget: " + x.hadir + " dari " + target() + "\n";
  var ks = Object.keys(per).sort(); if (ks.length) t += "\nPer loket:\n" + ks.map(function (k) { return "- " + k + ": " + per[k].n + " booking, " + per[k].h + " dilayani, " + per[k].w + " menunggu"; }).join("\n") + "\n";
  var pend = HRD && HRD.rg && HRD.rg.pend != null ? HRD.rg.pend : null; if (pend != null) t += "\nKotak masuk: " + pend + " percakapan perlu dijawab\n";
  if (ta && ta.value.trim()) t += "\nCatatan:\n" + ta.value.trim() + "\n";
  return t;
}
var HRT = null;
function seg(c, total) { return URUT.map(function (s) { return c[s] ? '<i style="width:' + (c[s] / total * 100).toFixed(1) + '%;background:' + WARNA[s] + '" title="' + H(s) + ': ' + c[s] + '"></i>' : ""; }).join(""); }
function drawHr(bk, rg) {
  HRD = {bk: bk, rg: rg};
  var L = bk.daftar || [], c = {}, per = {}, jam = {};
  L.forEach(function (o) {
    c[o.status] = (c[o.status] || 0) + 1; var k = o.kunci || o.loket; (per[k] = per[k] || {nm: o.loket || k, c: {}, q: []}); per[k].c[o.status] = (per[k].c[o.status] || 0) + 1;
    if (o.status === "Sudah tiba" || o.status === "Terjadwal") per[k].q.push(o); var h = parseInt(String(o.jam).slice(0, 2), 10); if (h >= 0) jam[h] = (jam[h] || 0) + 1;
  });
  var tot = L.length, tunggu = (c["Sudah tiba"] || 0) + (c["Terjadwal"] || 0), hadir = c["Hadir"] || 0, tdk = c["Tidak hadir"] || 0, rate = hadir + tdk ? Math.round(hadir / (hadir + tdk) * 100) + "%" : "-";
  var kpi = function (v, t, s) { return '<div class="kpi"><span class="kv">' + v + '</span><span>' + t + '</span><small class="sys">' + s + '</small></div>'; };
  var pend = rg && rg.pend != null ? rg.pend : (typeof T !== "undefined" ? T.filter(function (x) { return x.pend; }).length : "-");
  var tua = "-"; if (typeof T !== "undefined") { var ps = T.filter(function (x) { return x.pend; }); if (ps.length) { var lu = Math.min.apply(null, ps.map(function (x) { return x.lu; })); tua = typeof waitTxt === "function" ? waitTxt(Date.now() - lu) : "ada"; } else tua = "tidak ada"; }
  var mx = Math.max.apply(null, [1].concat(Object.keys(jam).map(function (k) { return jam[k]; }))), jn = new Date().toLocaleString("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false}) % 24;
  var hrs = []; for (var h = 8; h <= 14; h++) hrs.push(h);
  var html = '<div class="kpis">' + kpi(tunggu, "Menunggu", "belum dilayani") + kpi(c["Dipanggil"] || 0, "Dipanggil", "sedang di loket") + kpi(hadir, "Selesai", "dilayani") + kpi(rate, "Tingkat hadir", tdk + " tidak hadir") + '</div>' +
    '<h2 class="sec">Komposisi hari ini</h2><div class="card"><div class="hr-bar" role="img" aria-label="Komposisi status booking hari ini">' + (tot ? seg(c, tot) : '<i style="width:100%;background:var(--line)"></i>') + '</div><div class="hr-leg">' + URUT.map(function (s) { return '<span><i style="background:' + WARNA[s] + '"></i>' + s + ' ' + (c[s] || 0) + '</span>'; }).join("") + '</div></div>' +
    '<h2 class="sec">Antrean per loket</h2>' + (Object.keys(per).length ? Object.keys(per).sort().map(function (k) {
      var x = per[k], n = URUT.reduce(function (a, s) { return a + (x.c[s] || 0); }, 0), q = x.q.sort(function (a, b) { return ((a.status === "Sudah tiba" ? 0 : 1) - (b.status === "Sudah tiba" ? 0 : 1)) || (a.jam < b.jam ? -1 : 1); }), nx = q[0];
      return '<div class="card hr-lk"><b>' + H(x.nm) + '</b><div class="hr-bar">' + seg(x.c, n) + '</div><div class="sys">' + q.length + ' menunggu \u00b7 ' + n + ' booking' + (nx ? ' \u00b7 Berikutnya <b>' + H(nx.kode) + '</b> (' + H(nx.jam) + ' WIB' + (nx.status === "Sudah tiba" ? ', sudah tiba' : '') + ')' : '') + '</div></div>';
    }).join("") : '<div class="empty">Belum ada booking hari ini.</div>') +
    '<h2 class="sec">Jam sibuk</h2><div class="card"><div class="hr-jam">' + hrs.map(function (h) { var v = jam[h] || 0; return '<div class="' + (h === jn ? "now" : "") + '"><span style="height:' + Math.max(4, v / mx * 72) + 'px" title="' + v + ' booking"></span><small>' + p2(h) + '</small><b>' + v + '</b></div>'; }).join("") + '</div></div>' +
    '<h2 class="sec">Kotak masuk</h2><div class="card"><div class="sys" style="margin:0">' + pend + ' percakapan perlu dijawab \u00b7 yang paling lama menunggu: <b>' + H(tua) + '</b></div><div class="btns"><button type="button" class="btn" data-hr="inbox">Buka kotak masuk</button><button type="button" class="btn" data-hr="bk">Buka booking</button></div></div>';
  var d = $a("hr-dyn"); if (d) d.innerHTML = html;
  drawTarget();
  var u = $a("hr-upd"); if (u) u.textContent = "Diperbarui " + new Date().toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit"}).replace(/\./g, ":") + " WIB";
}
async function muatHr() {
  var hari = iso(wibDate(0)), r = await Promise.all([api("/api/admin/booking?tanggal=" + hari), api("/api/admin/ringkasan").catch(function () { return null; })]);
  drawHr(r[0], r[1]);
}
window.aHr = async function (el) {
  clearInterval(HRT);
  var NK = "tk_shift_note", note = ""; try { note = localStorage.getItem(NK) || ""; } catch (e) {}
  el.innerHTML = '<h2 class="sec">Hari ini <small id="hr-upd" class="sys"></small></h2><div id="hr-live"></div><div class="btns" style="margin:0 0 10px"><button type="button" class="btn" id="hr-r">Muat ulang</button><button type="button" class="btn" id="hr-lp">Salin laporan hari ini</button><button type="button" class="btn" id="hr-wa">Kirim laporan ke WhatsApp</button><span class="sys">Otomatis tiap 20 detik saat tab ini terbuka</span></div><div class="card" id="hr-tc"><label class="sys" for="hr-tg" style="display:block;margin:0 0 6px">Target dilayani hari ini</label><input class="si" id="hr-tg" type="number" min="1" max="999" value="' + target() + '" style="max-width:120px"><div class="hr-bar"><i id="hr-tb" style="width:0;background:var(--acc)"></i></div><div class="sys" id="hr-tp" style="margin:0"></div></div><div id="hr-dyn"><div class="empty">Memuat&hellip;</div></div>' +
    '<h2 class="sec">Catatan serah-terima shift</h2><div class="card"><textarea class="si" id="hr-note" rows="4" maxlength="1200" placeholder="Catatan untuk petugas shift berikutnya (hal yang perlu ditindaklanjuti, pemohon yang menunggu, kendala loket)">' + H(note) + '</textarea><div class="btns"><button type="button" class="btn" id="hr-cp">Salin catatan</button><button type="button" class="btn" id="hr-cl">Kosongkan</button></div><p class="sys" style="margin:6px 0 0" id="hr-ns">Tersimpan di peramban ini saja. Jangan menulis PIN, kata sandi, atau data pribadi yang tidak perlu.</p></div>';
  var tm = null, ta = $a("hr-note");
  ta.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { try { localStorage.setItem(NK, ta.value); $a("hr-ns").textContent = "Tersimpan di peramban ini pukul " + new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(".", ":") + "."; } catch (e) {} }, 500); };
  $a("hr-cp").onclick = function () { try { navigator.clipboard.writeText(ta.value).then(function () { if (window.toast) toast("Catatan disalin."); }); } catch (e) {} };
  $a("hr-cl").onclick = function () { if (!ta.value || confirm("Kosongkan catatan serah-terima?")) { ta.value = ""; ta.oninput(); } };
  $a("hr-tg").oninput = function () { var v = Math.min(999, Math.max(1, parseInt(this.value, 10) || 0)); if (v) { try { localStorage.setItem(TGK, String(v)); } catch (e) {} drawTarget(); } };
  $a("hr-lp").onclick = function () { if (!HRD) return; try { navigator.clipboard.writeText(laporanText()).then(function () { if (window.toast) toast("Laporan hari ini disalin."); }); } catch (e) { if (window.toast) toast("Penyalinan tidak didukung di perangkat ini."); } };
  $a("hr-wa").onclick = function () { if (HRD) window.open("https://wa.me/?text=" + encodeURIComponent(laporanText()), "_blank", "noopener"); };
  $a("hr-r").onclick = function () { muatHr().catch(function (x) { if (window.toast) toast(x.message); }); };
  el.onclick = function (e) { var b = e.target.closest("[data-hr]"); if (b) gotoTab(b.dataset.hr); };
  await muatHr();
  HRT = setInterval(function () { if (!$a("hr-live")) { clearInterval(HRT); return; } if (D.hidden) return; muatHr().catch(function () {}); }, 20000);
};
})();
