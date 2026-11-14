"use strict";
/* Versi 52 (frontend): Cangkang Aplikasi. Semua di sisi peramban, tanpa perubahan server.
   1. Bilah navigasi bawah ala aplikasi (HP): Beranda, Booking, Asisten, Tanya, Menu. Menyembunyikan diri saat keyboard muncul atau Asisten terbuka.
   2. Menu lengkap (lembar dari bawah): semua fitur, pengaturan tampilan, pasang aplikasi.
   3. Pencarian cepat (Ctrl/Cmd+K atau tombol Cari): lompat ke fitur, jalankan perintah Asisten, atau cari layanan dan buka loketnya.
   4. Transisi halus saat berpindah tampilan (mengikuti pengaturan Kurangi gerakan).
   5. Aplikasi yang bisa dipasang (PWA): ajakan pasang, petunjuk iPhone, pintasan #booking #asisten #cari, cadangan offline. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var MQ = window.matchMedia ? matchMedia("(max-width: 820px)") : {matches: false};
var IC = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z"/>',
  bk: '<path d="M5 5h14v15H5zM5 10h14M9 3v4M15 3v4"/>',
  bot: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h6M9 13h3"/>',
  tanya: '<path d="M21 12a8 8 0 01-11.7 7L4 20l1.1-4.6A8 8 0 1121 12z"/>',
  menu: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  cari: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>'
};
function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>'; }
function ujung(fn) { try { fn(); } catch (e) {} }
function klik(id) { var b = $(id); if (b) b.click(); }
function getar() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
function bukaBot(cmd) { klik("bf"); if (cmd) setTimeout(function () { ujung(function () { if (window.BOTI && BOTI.ask) BOTI.ask(cmd); }); }, 280); }
function tampil() { return window.S === "out" || window.S === "user"; }

/* ---------- 1. Bilah bawah ---------- */
var bar = null, kb = false, lay = 0;
function bangunBar() {
  bar = D.createElement("nav"); bar.className = "sh-bar"; bar.setAttribute("aria-label", "Navigasi utama"); bar.hidden = true;
  var it = [["home", "Beranda"], ["bk", "Booking"], ["bot", "Asisten"], ["tanya", "Tanya"], ["menu", "Menu"]];
  bar.innerHTML = it.map(function (x) { return '<button type="button" class="sh-i' + (x[0] === "bot" ? " sh-c" : "") + '" data-sh="' + x[0] + '"><span class="sh-ic">' + svg(x[0]) + '</span><span class="sh-t">' + x[1] + '</span></button>'; }).join("");
  D.body.appendChild(bar);
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sh]"); if (!b) return; getar(); var a = b.dataset.sh;
    if (a === "home") { if (window.setPN) setPN(""); else window.scrollTo({top: 0, behavior: "smooth"}); }
    else if (a === "bk") klik("t8"); else if (a === "bot") bukaBot(); else if (a === "tanya") klik("t4"); else if (a === "menu") bukaMenu();
    setTimeout(aktifkan, 120);
  });
}
function aktif() {
  if (!tampil()) return ""; if (window.PN === "bk") return "bk"; if (window.MYV) return "tanya"; if (window.PN) return "menu"; return "home";
}
function aktifkan() {
  if (!bar) return; var a = aktif();
  [].forEach.call(bar.querySelectorAll(".sh-i"), function (b) { var on = b.dataset.sh === a; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
}
function atur() {
  if (!bar) return; var bp = $("bp"), buka = bp && !bp.hidden, lembar = !!D.querySelector(".sh-ov"), nampak = MQ.matches && tampil() && !buka && !lembar && !kb;
  bar.hidden = !nampak; D.documentElement.classList.toggle("sh-on", MQ.matches && tampil()); aktifkan();
}
function pantauKeyboard() {
  var vv = window.visualViewport; if (vv) vv.addEventListener("resize", function () { var k = window.innerHeight - vv.height > 140; if (k !== kb) { kb = k; atur(); } });
  D.addEventListener("focusin", function (e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && MQ.matches && !vv) { kb = true; atur(); } });
  D.addEventListener("focusout", function () { if (!vv) setTimeout(function () { kb = false; atur(); }, 150); });
}

/* ---------- Lembar (Menu) ---------- */
var ov = null, DEF = null, opener = null;
function tutupOv() { if (ov) { ov.remove(); ov = null; D.removeEventListener("keydown", escOv, true); atur(); try { if (opener && D.contains(opener)) opener.focus(); } catch (e) {} } }
function escOv(e) { if (e.key === "Escape") { e.stopPropagation(); tutupOv(); } }
function pasang() { return !!DEF || /iphone|ipad|ipod/i.test(navigator.userAgent); }
function standalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
var FITUR = [["t1", "Layanan Publik"], ["t2", "Informasi Pelayanan"], ["t3", "Lokasi Pelayanan"], ["t4", "Percakapan Saya"], ["t5", "Tanya Admin"], ["t6", "Pengaduan"], ["t7", "Status Permohonan"], ["t8", "Booking Kunjungan"], ["t9", "Survei Kepuasan"], ["t10", "Pandu KBLI"], ["t11", "Pandu Zona"], ["t12", "Perizinan Resmi"]];
function daftarAksi() {
  var a = FITUR.map(function (f) { var b = $(f[0]); return {id: f[0], t: b ? b.textContent.trim() : f[1], fn: function () { klik(f[0]); }, g: "Fitur"}; }).filter(function (x) { return $(x.id); });
  a.push({id: "main", t: "Ruang Main (permainan)", fn: function () { klik("mbgo"); }, g: "Fitur", k: "game arena rush tebak"});
  if (window.Rencana) a.push({id: "rcn", t: "Perencana Kunjungan", fn: function () { Rencana.buka(); }, g: "Fitur", k: "beberapa layanan urutan loket dokumen"});
  if (window.ArenaZona) a.push({id: "arena", t: "Arena Zona (gim MOBA)", fn: function () { klik("mbgo"); setTimeout(function () { ArenaZona.menu(); }, 120); }, g: "Fitur", k: "main game"});
  a.push({id: "aa", t: "Kenyamanan membaca (Aa)", fn: function () { klik("au-b"); }, g: "Pengaturan", k: "huruf besar kontras lansia"});
  a.push({id: "tema", t: "Ganti tema terang atau gelap", fn: function () { klik("th"); }, g: "Pengaturan", k: "gelap malam"});
  if (window.TakokBaru) a.push({id: "baru", t: "Yang baru di Takok", fn: function () { TakokBaru.buka(); }, g: "Pengaturan", k: "fitur terbaru cek perangkat"});
  if (!standalone() && pasang()) a.push({id: "pasang", t: "Pasang aplikasi di layar utama", fn: pasangApp, g: "Pengaturan", k: "install pwa"});
  return a;
}
var PERINTAH = [["/tiket", "Tiket aktif dengan tahapan"], ["/rencana", "Susun urutan loket beberapa layanan"], ["/mulai", "Pemandu pilih layanan"], ["/arti", "Arti istilah, mis. NIB"], ["/saran", "Saran untuk Anda"], ["/antre", "Tiket dan antrean saya"], ["/berangkat", "Kapan harus berangkat"], ["/panduan", "Panduan kunjungan 5 langkah"], ["/bantuan", "Semua yang bisa dilakukan Asisten"]];
function lembar(judul, isi, cls) {
  tutupOv(); opener = D.activeElement; ov = D.createElement("div"); ov.className = "sh-ov " + (cls || ""); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", judul);
  ov.innerHTML = '<div class="sh-sheet" tabindex="-1">' + isi + '</div>'; D.body.appendChild(ov); D.addEventListener("keydown", escOv, true); atur();
  ov.addEventListener("click", function (e) { if (e.target === ov) tutupOv(); }); return ov;
}
function bukaMenu() {
  var a = daftarAksi(), fit = a.filter(function (x) { return x.g === "Fitur"; }), set = a.filter(function (x) { return x.g === "Pengaturan"; }), iosTip = !DEF && /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone();
  var o = lembar("Menu", '<div class="sh-gr"></div><div class="sh-h"><b>Menu</b><button type="button" class="au-x" data-m="x" aria-label="Tutup">&times;</button></div>' +
    '<button type="button" class="sh-cr" data-m="cari">' + svg("cari") + '<span>Cari fitur, perintah, atau layanan</span><kbd>Ctrl K</kbd></button>' +
    '<p class="sh-lb">Fitur</p><div class="sh-g">' + fit.map(function (x) { return '<button type="button" data-m="a:' + x.id + '">' + E(x.t) + '</button>'; }).join("") + '</div>' +
    '<p class="sh-lb">Pengaturan</p><div class="sh-g">' + set.map(function (x) { return '<button type="button" data-m="a:' + x.id + '">' + E(x.t) + '</button>'; }).join("") + '</div>' +
    (iosTip ? '<p class="sh-tip">Di iPhone: ketuk ikon Bagikan, lalu <b>Tambah ke Layar Utama</b> untuk memasang Takok.</p>' : "") +
    '<small class="sys">Takok Pelayanan Suroboyo &middot; Versi 52</small>', "sh-menu");
  o.addEventListener("click", function (e) {
    var b = e.target.closest("[data-m]"); if (!b) return; var m = b.dataset.m; if (m === "x") { tutupOv(); return; }
    if (m === "cari") { tutupOv(); bukaCari(); return; }
    if (m.indexOf("a:") === 0) { var x = a.filter(function (z) { return z.id === m.slice(2); })[0]; tutupOv(); if (x) setTimeout(function () { ujung(x.fn); }, 60); }
  });
}

/* ---------- 3. Pencarian cepat ---------- */
var REC = "tk_pal";
function recent() { try { return JSON.parse(localStorage.getItem(REC) || "[]") || []; } catch (e) { return []; } }
function ingat(t) { try { var r = recent().filter(function (x) { return x !== t; }); r.unshift(t); localStorage.setItem(REC, JSON.stringify(r.slice(0, 4))); } catch (e) {} }
function cocok(q, x) { var s = (x.t + " " + (x.k || "")).toLowerCase(), w = q.toLowerCase().split(/\s+/).filter(Boolean); return w.every(function (t) { return s.indexOf(t) > -1; }); }
function bukaCari() {
  var a = daftarAksi(), sel = 0, items = [];
  var o = lembar("Pencarian cepat", '<div class="sh-cb">' + svg("cari") + '<input id="sh-q" type="search" autocomplete="off" placeholder="Cari fitur, perintah /, atau layanan" role="combobox" aria-expanded="true" aria-controls="sh-rs" aria-label="Pencarian cepat"><button type="button" class="au-x" data-c="x" aria-label="Tutup">&times;</button></div><div id="sh-rs" role="listbox" aria-label="Hasil"></div><small class="sys sh-ft">&uarr;&darr; pilih &middot; Enter buka &middot; Esc tutup</small>', "sh-pal");
  var q = $("sh-q"), rs = $("sh-rs");
  function isi() {
    var t = q.value.trim(), L = [];
    if (!t) { recent().forEach(function (r) { var x = a.filter(function (z) { return z.t === r; })[0]; if (x) L.push(Object.assign({g: "Terakhir"}, x)); }); a.filter(function (x) { return x.g === "Fitur"; }).slice(0, 6).forEach(function (x) { if (!L.some(function (z) { return z.id === x.id; })) L.push(x); }); }
    else {
      a.filter(function (x) { return cocok(t, x); }).slice(0, 6).forEach(function (x) { L.push(x); });
      PERINTAH.filter(function (p) { return (p[0] + " " + p[1]).toLowerCase().indexOf(t.toLowerCase().replace(/^\//, "")) > -1 || t === "/"; }).slice(0, 4).forEach(function (p) { L.push({id: "c" + p[0], t: p[0], d: p[1], g: "Perintah Asisten", fn: function () { bukaBot(p[0]); }}); });
      if (window.Rencana && t.length > 1) Rencana.cari(t.replace(/^\//, ""), 4).forEach(function (r) { L.push({id: "l" + r.d.k, t: r.d.nm, d: r.d.lokasi + (r.d.zona ? " \u00b7 " + r.d.zona : ""), g: "Layanan", fn: function () { if (window.openKey) openKey(r.d.k); window.scrollTo({top: 0, behavior: "smooth"}); }}); });
    }
    items = L; sel = 0; var g = "";
    rs.innerHTML = L.length ? L.map(function (x, i) { var h = x.g !== g ? '<p class="sh-lb">' + E(x.g) + '</p>' : ""; g = x.g; return h + '<button type="button" class="sh-r' + (i === 0 ? " on" : "") + '" role="option" id="shr' + i + '" aria-selected="' + (i === 0) + '" data-r="' + i + '"><b>' + E(x.t) + '</b>' + (x.d ? '<small>' + E(x.d) + '</small>' : "") + '</button>'; }).join("") : '<p class="sh-kosong">Tidak ada hasil. Coba kata lain, mis. "booking", "NIB", atau "/tiket".</p>';
    q.setAttribute("aria-activedescendant", L.length ? "shr0" : "");
  }
  function pilih(n) { var r = rs.querySelectorAll(".sh-r"); if (!r.length) return; sel = (n + r.length) % r.length; [].forEach.call(r, function (b, i) { b.classList.toggle("on", i === sel); b.setAttribute("aria-selected", String(i === sel)); }); r[sel].scrollIntoView({block: "nearest"}); q.setAttribute("aria-activedescendant", "shr" + sel); }
  function jalan(i) { var x = items[i]; if (!x) return; if (x.g !== "Perintah Asisten" && x.g !== "Layanan") ingat(x.t); tutupOv(); setTimeout(function () { ujung(x.fn); }, 60); }
  q.addEventListener("input", isi);
  q.addEventListener("keydown", function (e) { if (e.key === "ArrowDown") { e.preventDefault(); pilih(sel + 1); } else if (e.key === "ArrowUp") { e.preventDefault(); pilih(sel - 1); } else if (e.key === "Enter") { e.preventDefault(); jalan(sel); } });
  o.addEventListener("click", function (e) { var c = e.target.closest("[data-c]"); if (c) { tutupOv(); return; } var r = e.target.closest("[data-r]"); if (r) jalan(+r.dataset.r); });
  isi(); q.focus();
}
D.addEventListener("keydown", function (e) {
  if (window.S === "adm") return; var k = (e.key || "").toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); if (!ov) bukaCari(); return; }
  if (k === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !ov && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName) && !(e.target && e.target.isContentEditable)) { e.preventDefault(); bukaCari(); }
});

/* ---------- 4. Transisi tampilan ---------- */
function transisi() {
  if (!window.MutationObserver) return;
  var mo = new MutationObserver(function (ms) { ms.forEach(function (m) { var el = m.target; if (m.attributeName === "hidden" && !el.hidden) { el.classList.remove("sh-in"); void el.offsetWidth; el.classList.add("sh-in"); setTimeout(function () { el.classList.remove("sh-in"); }, 400); } }); });
  ["v-cari", "v-pn", "v-my", "v-adm"].forEach(function (id) { var el = $(id); if (el) mo.observe(el, {attributes: true, attributeFilter: ["hidden"]}); });
}

/* ---------- 5. PWA ---------- */
function pasangApp() {
  if (DEF) { DEF.prompt(); DEF.userChoice.then(function () { DEF = null; banner(false); }, function () {}); return; }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { lembar("Pasang di iPhone", '<div class="sh-gr"></div><div class="sh-h"><b>Pasang di iPhone</b><button type="button" class="au-x" data-m="x" aria-label="Tutup">&times;</button></div><ol class="sh-ol"><li>Ketuk ikon <b>Bagikan</b> di Safari.</li><li>Pilih <b>Tambah ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>.</li></ol>', "sh-menu").addEventListener("click", function (e) { if (e.target.closest("[data-m]")) tutupOv(); }); }
  else if (window.toast) toast("Gunakan menu peramban: Pasang aplikasi atau Tambahkan ke layar utama.");
}
var ban = null;
function banner(on) {
  if (!on) { if (ban) { ban.remove(); ban = null; } return; }
  if (ban || standalone()) return; var t = 0; try { t = +localStorage.getItem("tk_pwa_x") || 0; } catch (e) {} if (Date.now() - t < 14 * 864e5) return;
  ban = D.createElement("div"); ban.className = "sh-ban"; ban.setAttribute("role", "region"); ban.setAttribute("aria-label", "Pasang aplikasi");
  ban.innerHTML = '<img src="/icon-192.png" alt="" width="44" height="44"><div><b>Pasang Takok di layar utama</b><small>Buka lebih cepat, tanpa mengetik alamat.</small></div><button type="button" class="send" data-b="y">Pasang</button><button type="button" class="au-x" data-b="x" aria-label="Nanti saja">&times;</button>';
  D.body.appendChild(ban);
  ban.onclick = function (e) { var b = e.target.closest("[data-b]"); if (!b) return; if (b.dataset.b === "y") pasangApp(); else { try { localStorage.setItem("tk_pwa_x", String(Date.now())); } catch (z) {} banner(false); } };
}
window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); DEF = e; setTimeout(function () { if (DEF && tampil()) banner(true); }, 25000); });
window.addEventListener("appinstalled", function () { DEF = null; banner(false); if (window.toast) toast("Takok terpasang di layar utama."); });
function daftarSW() { try { if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("/sw.js").catch(function () {}); } catch (e) {} }
function pintasan() {
  var h = (location.hash || "").toLowerCase(); if (!/^#(booking|asisten|cari)$/.test(h)) return; var n = 0, t = setInterval(function () {
    n++; var r = $("role"); if ((r && r.textContent !== "Memuat\u2026") || n > 20) { clearInterval(t); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} if (h === "#booking") klik("t8"); else if (h === "#asisten") bukaBot(); else { var q = $("q"); if (q) { q.scrollIntoView({block: "center"}); q.focus(); } } }
  }, 400);
}

function jalan() { try { if (!bar) bangunBar(); atur(); } catch (e) {} }
bangunBar(); pantauKeyboard(); transisi(); daftarSW(); pintasan(); jalan();
setInterval(jalan, 700); if (MQ.addEventListener) MQ.addEventListener("change", atur);
window.Shell = {menu: bukaMenu, cari: bukaCari, pasang: pasangApp};
})();
