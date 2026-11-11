"use strict";
/* Versi 45: pusat fitur unggulan Takok Pelayanan Suroboyo.
   1. Cari izin: satu kotak pencarian lintas semua loket, mencocokkan nama jenis izin, loket, zona, syarat (Ctrl+K).
   2. Takok dalam angka: kelengkapan dan kesegaran data layanan, dihitung langsung dari data aplikasi (tanpa angka karangan).
   3. Aksesibilitas: huruf besar, kontras tinggi, kurangi animasi, jarak baca lega, tautan bergaris bawah (tersimpan di perangkat). */
(function () {
var D = document, R = D.documentElement, KEY = "takok-aks";
var STOP = /^(izin|syarat|persyaratan|loket|urus|mengurus|cara|buat|membuat|bikin|mau|saya|apa|saja|dan|untuk|di|yang|ke|dengan|berapa|biaya|lama|proses|dokumen|berkas|tolong|info|dong)$/;
var SIN = {perpanjang: "perpanjang", perpanjangan: "perpanjang", memperpanjang: "perpanjang", habis: "perpanjang", kadaluarsa: "perpanjang", expired: "perpanjang", hilang: "pengganti", rusak: "pengganti", ganti: "pengganti", penggantian: "pengganti", pertama: "baru", ubah: "perubahan", pindah: "perubahan", imb: "pbg", slf: "slf", tdr: "pariwisata", ktp: "ktp", kk: "kk"};
function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function toks(q) { return norm(q).split(" ").filter(function (w) { return w && !STOP.test(w); }).map(function (w) { return SIN[w] || w; }); }

/* ---------- aksesibilitas ---------- */
var AKS = {f: 0, hc: 0, nm: 0, sp: 0, ul: 0};
function simpanAks() { try { localStorage.setItem(KEY, JSON.stringify(AKS)); } catch (x) {} }
function terapAks() {
  R.classList.toggle("ug-f1", AKS.f === 1); R.classList.toggle("ug-f2", AKS.f === 2);
  R.classList.toggle("ug-hc", !!AKS.hc); R.classList.toggle("ug-nm", !!AKS.nm); R.classList.toggle("ug-sp", !!AKS.sp); R.classList.toggle("ug-ul", !!AKS.ul);
}
try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); if (o && typeof o === "object") ["f", "hc", "nm", "sp", "ul"].forEach(function (k) { AKS[k] = +o[k] || 0; }); } catch (x) {}
terapAks();

/* ---------- indeks jenis izin ---------- */
function indeks() {
  var out = [];
  (window.LOCS || []).forEach(function (l) {
    (window.LD && LD[l.id] || []).forEach(function (e) {
      var k = l.id + "_" + e[0], G = window.SY ? SY.grup(k) : [], IN = window.SY ? SY.info(k) : [], base = {k: k, loket: e[1], lokasi: l.nm, zona: e[4] || "", uraian: e[2] || "", bk: e[6] !== false, ver: window.SY ? SY.verif(k) : false, umur: window.SY ? SY.umur(k) : -1};
      if (!G.length) { out.push(Object.assign({jenis: "", biaya: "", waktu: "", syarat: ""}, base)); return; }
      G.forEach(function (g, i) { out.push(Object.assign({jenis: g.t || "", biaya: (IN[i] || {}).biaya || "", waktu: (IN[i] || {}).waktu || "", syarat: g.items.join(" ")}, base)); });
    });
  });
  return out;
}
function cari(q) {
  var T = toks(q); if (!T.length) return [];
  var res = [];
  indeks().forEach(function (x) {
    var j = norm(x.jenis), n = norm(x.loket), z = norm(x.zona + " " + x.lokasi), s = norm(x.syarat), u = norm(x.uraian), sc = 0, hit = 0;
    T.forEach(function (w) {
      var h = 0;
      if (j.indexOf(w) > -1) h += 5; if (n.indexOf(w) > -1) h += 3; if (z.indexOf(w) > -1) h += 1; if (s.indexOf(w) > -1) h += 1; if (u.indexOf(w) > -1) h += 1;
      if (h) hit++; sc += h;
    });
    if (hit && hit >= Math.ceil(T.length / 2)) res.push({x: x, s: sc + hit * 10});
  });
  res.sort(function (a, b) { return b.s - a.s; });
  return res.slice(0, 15).map(function (r) { return r.x; });
}
function kartu(x) {
  var m = [];
  if (x.biaya) m.push('<span class="sy-m">Biaya: <b>' + esc(x.biaya) + '</b></span>');
  if (x.waktu) m.push('<span class="sy-m">Proses: <b>' + esc(x.waktu) + '</b></span>');
  var v = x.ver ? (x.umur > 180 ? '<span class="ug-v ug-w">Sudah lama dicek</span>' : '<span class="ug-v">Terverifikasi</span>') : '<span class="ug-v ug-n">Panduan umum</span>';
  return '<li class="ug-r"><div class="ug-rt"><b>' + esc(x.jenis || x.loket) + '</b> ' + v + '</div><small class="sys">' + esc(x.lokasi) + ' &middot; ' + esc(x.loket) + (x.zona ? ' &middot; ' + esc(x.zona) : '') + '</small>' +
    (m.length ? '<div class="sy-meta">' + m.join("") + '</div>' : '') +
    '<div class="btns"><button type="button" class="send" data-ug="buka" data-k="' + esc(x.k) + '">Lihat loket &amp; syarat</button>' +
    (x.syarat && window.SY ? '<button type="button" class="btn" data-ug="salin" data-k="' + esc(x.k) + '">Salin syarat</button>' : '') + '</div></li>';
}

/* ---------- Takok dalam angka ---------- */
function angka() {
  var L = [], g = 0, ver = 0, segar = 0, biaya = 0, jenis = 0, bk = 0;
  (window.LOCS || []).forEach(function (l) { (window.LD && LD[l.id] || []).forEach(function (e) { L.push([l.id + "_" + e[0], e]); }); });
  L.forEach(function (p) {
    var G = window.SY ? SY.grup(p[0]) : [];
    if (G.length) { g++; jenis += G.length; if (SY.verif(p[0])) { ver++; if (SY.umur(p[0]) >= 0 && SY.umur(p[0]) <= 180) segar++; } if (SY.info(p[0]).some(function (i) { return i.biaya || i.waktu; })) biaya++; }
    if (p[1][6] !== false) bk++;
  });
  var pc = function (a, b) { return b ? Math.round(a * 100 / b) : 0; };
  var bar = function (n, tot, lab) { var p = pc(n, tot); return '<div class="ug-b"><div class="ug-bh"><span>' + esc(lab) + '</span><b>' + n + ' dari ' + tot + ' (' + p + '%)</b></div><div class="ug-bt" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(lab) + '"><i style="width:' + p + '%"></i></div></div>'; };
  var tile = function (n, l) { return '<div class="ug-k"><b>' + esc(n) + '</b><small>' + esc(l) + '</small></div>'; };
  var bl = window.BALAS ? (BALAS < 60 ? BALAS + " menit" : Math.round(BALAS / 60) + " jam") : "-";
  return '<div class="ug-kk">' + tile((window.LOCS || []).length, "tempat pelayanan") + tile(L.length, "loket terdaftar") + tile(jenis, "jenis izin terdokumentasi") + tile(bl, "median waktu balas admin") + '</div>' +
    bar(g, L.length, "Loket dengan persyaratan terisi") + bar(ver, L.length, "Persyaratan terverifikasi admin loket") + bar(segar, L.length, "Dicek dalam 6 bulan terakhir") + bar(biaya, L.length, "Loket dengan info biaya/lama proses") + bar(bk, L.length, "Loket yang bisa dibooking online") +
    '<p class="sys">Angka dihitung langsung dari data aplikasi saat ini, bukan data contoh. Semakin tinggi persentase, semakin pasti informasi yang diterima pemohon.</p>';
}

/* ---------- panel ---------- */
var P = null, TAB = "cari", OPENER = null;
function aksHtml() {
  var sw = function (k, t, d) { return '<label class="ug-sw"><input type="checkbox" data-ug="aks" data-a="' + k + '"' + (AKS[k] ? " checked" : "") + '><span><b>' + t + '</b><small>' + d + '</small></span></label>'; };
  return '<div class="ug-fs" role="group" aria-label="Ukuran huruf"><b>Ukuran huruf</b>' + [[0, "Normal"], [1, "Besar"], [2, "Sangat besar"]].map(function (f) { return '<button type="button" class="chip" data-ug="fz" data-f="' + f[0] + '" aria-pressed="' + (AKS.f === f[0]) + '">' + f[1] + '</button>'; }).join("") + '</div>' +
    sw("hc", "Kontras tinggi", "Warna hitam-putih tegas, mudah dibaca di bawah matahari") + sw("sp", "Jarak baca lega", "Spasi baris dan huruf lebih renggang") + sw("ul", "Tautan selalu bergaris bawah", "Tautan mudah dikenali tanpa bergantung warna") + sw("nm", "Kurangi animasi", "Matikan gerak dan efek animasi") +
    '<p class="sys">Pengaturan tersimpan di perangkat ini saja.</p>';
}
function isi() {
  var b = P.querySelector(".ug-body");
  P.querySelectorAll("[data-ug=tab]").forEach(function (t) { t.setAttribute("aria-pressed", t.dataset.t === TAB); });
  if (TAB === "cari") { b.innerHTML = '<label for="ug-q" class="sys">Ketik izin atau layanan yang Anda cari, mis. "perpanjang parkir", "PBG rumah", "NPWP"</label><input class="si" id="ug-q" type="search" autocomplete="off" maxlength="80" placeholder="Cari izin, layanan, atau loket..."><ul class="ug-l" id="ug-l" aria-live="polite"></ul>'; $("ug-q").oninput = hasil; hasil(); }
  else if (TAB === "angka") b.innerHTML = angka();
  else b.innerHTML = aksHtml();
}
function $(i) { return D.getElementById(i); }
function hasil() {
  var q = $("ug-q").value, l = $("ug-l"); if (!l) return;
  if (!q.trim()) { l.innerHTML = '<li class="sys">Contoh: <button type="button" class="chip" data-ug="cth">perpanjang parkir</button> <button type="button" class="chip" data-ug="cth">PBG rumah tinggal</button> <button type="button" class="chip" data-ug="cth">BPJS</button></li>'; return; }
  var r = cari(q); l.innerHTML = r.length ? r.map(kartu).join("") : '<li class="sys">Tidak ada yang cocok untuk &ldquo;' + esc(q) + '&rdquo;. Coba kata lain, atau tanyakan ke Asisten Takok.</li>';
}
function buka(tab) {
  if (!P) {
    P = D.createElement("div"); P.className = "ug-ov"; P.hidden = true;
    P.innerHTML = '<div class="ug-dlg" role="dialog" aria-modal="true" aria-label="Pusat bantuan Takok"><div class="ug-h"><div class="ug-tabs"><button type="button" class="chip" data-ug="tab" data-t="cari">Cari izin</button><button type="button" class="chip" data-ug="tab" data-t="angka">Takok dalam angka</button><button type="button" class="chip" data-ug="tab" data-t="aks">Aksesibilitas</button></div><button type="button" class="ug-x" data-ug="tutup" aria-label="Tutup">&times;</button></div><div class="ug-body"></div></div>';
    D.body.appendChild(P);
    P.addEventListener("click", function (e) {
      if (e.target === P) { tutup(); return; }
      var b = e.target.closest("[data-ug]"); if (!b) return; var a = b.dataset.ug;
      if (a === "tutup") tutup();
      else if (a === "tab") { TAB = b.dataset.t; isi(); }
      else if (a === "cth") { $("ug-q").value = b.textContent; hasil(); $("ug-q").focus(); }
      else if (a === "buka") { var k = b.dataset.k; tutup(); if (window.openKey) openKey(k); }
      else if (a === "salin") { try { navigator.clipboard.writeText(SY.teks(b.dataset.k)).then(function () { if (window.toast) toast("Syarat disalin."); }); } catch (x) {} }
      else if (a === "fz") { AKS.f = +b.dataset.f; terapAks(); simpanAks(); isi(); }
    });
    P.addEventListener("change", function (e) { var b = e.target.closest("[data-ug=aks]"); if (!b) return; AKS[b.dataset.a] = b.checked ? 1 : 0; terapAks(); simpanAks(); });
    P.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { tutup(); return; }
      if (e.key === "Tab") { var f = [].filter.call(P.querySelectorAll("button,input,[href]"), function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && D.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && D.activeElement === z) { a.focus(); e.preventDefault(); } }
    });
  }
  TAB = tab || TAB; OPENER = D.activeElement; P.hidden = false; D.body.classList.add("ug-lock"); isi();
  var f = $("ug-q") || P.querySelector(".chip"); if (f) f.focus();
}
function tutup() { if (!P) return; P.hidden = true; D.body.classList.remove("ug-lock"); if (OPENER && OPENER.focus) try { OPENER.focus(); } catch (x) {} }
var fab = D.createElement("button"); fab.type = "button"; fab.className = "ug-fab"; fab.setAttribute("aria-label", "Cari izin, Takok dalam angka, dan aksesibilitas (Ctrl+K)"); fab.innerHTML = '<span aria-hidden="true">&#128269;</span> Cari izin';
fab.onclick = function () { buka("cari"); }; D.body.appendChild(fab);
D.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); buka("cari"); } });
window.UG = {buka: buka, cari: cari, angka: angka};
})();
