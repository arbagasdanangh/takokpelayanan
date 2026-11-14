"use strict";
/* Versi 57: Paket Ramah, supaya warga betah dan kembali lagi. Semua di sisi peramban (tersimpan di perangkat), tanpa perubahan server.
   1. Sapaan personal + Tips hari ini + rangkaian hari berturut-turut (streak) dengan kejutan konfeti.
   2. Favorit layanan (bintang di tiap loket) dan Terakhir dibuka, tampil sebagai "Pintasan saya" di beranda.
   3. Pencarian suara (mikrofon) di kolom cari.
   4. Bagikan layanan ke WhatsApp / salin tautan; tautan ?layanan=KUNCI langsung membuka loket itu.
   5. Bukti sosial: "N warga online / memakai Takok hari ini".
   6. Sambutan 3 langkah untuk pengunjung baru (sekali saja). */
(function () {
var D = document, W = window, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var K = "tk_ramah", st = {fav: [], rec: [], streak: 0, best: 0, last: "", onb: 0};
try { var o = JSON.parse(localStorage.getItem(K) || "{}"); if (o && typeof o === "object") for (var k in st) if (o[k] !== undefined) st[k] = o[k]; } catch (e) {}
if (!Array.isArray(st.fav)) st.fav = []; if (!Array.isArray(st.rec)) st.rec = [];
var FIRST = !st.onb;
function simpan() { try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) {} }
function toast(m) { if (W.toast) W.toast(m); }
function getar() { try { if (W.Apk && Apk.hap() && navigator.vibrate) navigator.vibrate(10); } catch (e) {} }
function ujung(f) { try { return f(); } catch (e) { return undefined; } }
var KEYRE = /^[a-z0-9]+_\d+$/i;
function nama(k) { return ujung(function () { return W.label ? W.label(k) : k; }) || k; }
function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function situs() { return location.origin + "/"; }

/* ---------- 1. Rangkaian hari ---------- */
var BARU_STREAK = 0;
(function () {
  var t = new Date(), today = ymd(t); if (st.last === today) return;
  var y = new Date(t); y.setDate(y.getDate() - 1);
  st.streak = st.last === ymd(y) ? st.streak + 1 : 1; st.best = Math.max(st.best || 0, st.streak); st.last = today; BARU_STREAK = st.streak; simpan();
})();
function konfeti() {
  if (D.documentElement.classList.contains("apk-noanim")) return;
  var w = D.createElement("div"); w.className = "rm-cf"; w.setAttribute("aria-hidden", "true");
  var warna = ["#ffb800", "#1a46b5", "#2fa36b", "#e0457b", "#7aa8ff"];
  for (var i = 0; i < 28; i++) { var p = D.createElement("i"); p.style.cssText = "left:" + (10 + Math.random() * 80) + "%;background:" + warna[i % 5] + ";--dx:" + Math.round(Math.random() * 160 - 80) + "px;--r:" + Math.round(Math.random() * 720) + "deg;animation-delay:" + (Math.random() * 0.25).toFixed(2) + "s"; w.appendChild(p); }
  D.body.appendChild(w); setTimeout(function () { w.remove(); }, 2200);
}

/* ---------- 2. Sapaan + tips ---------- */
var TIPS = [
  "Siapkan dokumen asli dan fotokopinya sebelum berangkat, supaya urusan di loket cepat selesai.",
  "Booking kunjungan lewat Takok agar tidak antre lama. Anda mendapat kode tiket dan pengingat.",
  "Datang sekitar 15 menit sebelum jam booking, lalu tekan \"Saya sudah tiba\" di aplikasi.",
  "Bingung istilah seperti NIB atau KBLI? Tanyakan ke Asisten Takok, cukup ketik /arti.",
  "Banyak urusan sekaligus? Pakai Perencana Kunjungan untuk menyusun urutan loket dan jam.",
  "Demi keamanan, jangan kirim NIK lengkap, kata sandi, atau kode OTP lewat chat.",
  "Pilih jam yang ditandai sepi saat booking supaya lebih nyaman dan tidak berdesakan.",
  "Simpan loket yang sering dipakai dengan bintang, nanti muncul di Pintasan saya.",
  "Layanan punya jam sendiri. Cek jam dan persyaratan di tiap loket sebelum datang.",
  "Ada orang tua atau tetangga yang butuh layanan? Bagikan Takok lewat WhatsApp.",
  "Sambil menunggu antrean, coba Ruang Main untuk mengumpulkan poin dan lencana.",
  "Setelah selesai dilayani, isi Survei Kepuasan. Masukan Anda membantu layanan jadi lebih baik.",
  "Pakai tombol mikrofon di kolom cari bila malas mengetik."
];
function sapa() { var h = new Date().getHours(); return h < 4 ? "Selamat malam" : h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam"; }
function tipHari() { var t = new Date(), n = Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 864e5); return TIPS[n % TIPS.length]; }
var kartu = null, sigK = "";
function namaUser() { var n = W.ME && ME.nama ? String(ME.nama).trim().split(/\s+/)[0] : ""; return n || "Warga Surabaya"; }
function bangunKartu() {
  var hero = D.querySelector("section.hero"); if (!hero || $("rm-hi")) return;
  kartu = D.createElement("section"); kartu.className = "rm-card"; kartu.id = "rm-hi"; kartu.setAttribute("aria-label", "Sapaan dan tips");
  hero.parentNode.insertBefore(kartu, hero.nextSibling);
  kartu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm]"); if (!b) return; getar();
    if (b.dataset.rm === "wa") window.open("https://wa.me/?text=" + encodeURIComponent("Urus layanan publik Surabaya lebih mudah lewat Takok: booking kunjungan, tanya asisten, cari loket. " + situs()), "_blank", "noopener");
    else if (b.dataset.rm === "salin") salin(situs());
    else if (b.dataset.rm === "bagi" && W.Apk) Apk.bagikan();
  });
}
function salin(t) { try { navigator.clipboard.writeText(t).then(function () { toast("Tautan disalin. Silakan tempel ke teman."); }, function () { toast("Salin alamat: " + t); }); } catch (e) { toast("Salin alamat: " + t); } }
var SOS = null;
function gambarKartu() {
  if (!kartu) return; var s = sapa() + "|" + namaUser() + "|" + st.streak + "|" + (SOS || "");
  if (s === sigK) return; sigK = s;
  kartu.innerHTML = '<div class="rm-top"><div><small>' + E(sapa()) + '</small><b>' + E(namaUser()) + '</b></div>' +
    (st.streak > 1 ? '<span class="rm-streak" title="Terbaik: ' + st.best + ' hari">&#128293; ' + st.streak + ' hari berturut-turut</span>' : '<span class="rm-streak">&#128075; Senang bertemu lagi</span>') + '</div>' +
    '<p class="rm-tip"><b>Tips hari ini</b>' + E(tipHari()) + '</p>' +
    (SOS ? '<p class="rm-pill">' + SOS + '</p>' : '') +
    '<div class="rm-act"><button type="button" data-rm="wa">Ajak teman via WhatsApp</button><button type="button" data-rm="salin">Salin tautan</button></div>';
}
function bukti() {
  if (D.visibilityState === "hidden") return;
  fetch("/api/app?p=" + encodeURIComponent("/v/ringkas"), {credentials: "same-origin"}).then(function (x) { return x.ok ? x.json() : null; }).then(function (j) {
    if (!j) return; var n = Number(j.online || 0), h = Number(j.unik_hari_ini || 0), f = function (v) { return v.toLocaleString("id-ID"); };
    SOS = n > 1 ? '<i class="rm-dot"></i>' + f(n) + ' warga sedang memakai Takok' : h > 1 ? '&#128101; ' + f(h) + ' warga memakai Takok hari ini' : null;
    gambarKartu();
  }).catch(function () {});
}

/* ---------- 3. Favorit & terakhir ---------- */
function adaFav(k) { return st.fav.indexOf(k) > -1; }
function ubahFav(k) {
  var i = st.fav.indexOf(k);
  if (i > -1) { st.fav.splice(i, 1); toast("Dihapus dari favorit"); }
  else { st.fav.unshift(k); st.fav = st.fav.slice(0, 20); toast("Disimpan ke favorit"); }
  simpan(); hiasList(); gambarPintasan(); getar();
}
function hiasList() {
  [].forEach.call(D.querySelectorAll("#list details.row"), function (d) {
    var k = d.dataset.n, sm = d.querySelector("summary"); if (!k || !sm) return;
    var f = sm.querySelector(".rm-fav"), on = adaFav(k);
    if (!f) {
      f = D.createElement("button"); f.type = "button"; f.className = "rm-fav"; f.dataset.fav = k;
      var tag = sm.querySelector(".tag"); if (tag) sm.insertBefore(f, tag); else sm.appendChild(f);
    }
    if (f.getAttribute("aria-pressed") !== String(on)) { f.setAttribute("aria-pressed", String(on)); f.setAttribute("aria-label", on ? "Hapus dari favorit" : "Simpan ke favorit"); f.innerHTML = on ? "&#9733;" : "&#9734;"; }
    var b = d.querySelector(".body");
    if (b && !b.querySelector(".rm-share")) {
      var p = D.createElement("div"); p.className = "rm-share";
      p.innerHTML = '<button type="button" class="chip" data-rms="wa" data-k="' + E(k) + '">Bagikan ke WhatsApp</button><button type="button" class="chip" data-rms="salin" data-k="' + E(k) + '">Salin tautan</button>';
      b.appendChild(p);
    }
  });
}
function tautan(k) { return situs() + "?layanan=" + encodeURIComponent(k); }
D.addEventListener("click", function (e) {
  var f = e.target.closest && e.target.closest(".rm-fav");
  if (f) { e.preventDefault(); e.stopPropagation(); ubahFav(f.dataset.fav); return; }
  var s = e.target.closest && e.target.closest("[data-rms]");
  if (s) { e.preventDefault(); var k = s.dataset.k; getar();
    if (s.dataset.rms === "wa") window.open("https://wa.me/?text=" + encodeURIComponent("Layanan " + nama(k) + " di Takok Pelayanan Suroboyo: " + tautan(k)), "_blank", "noopener");
    else salin(tautan(k)); return; }
  var c = e.target.closest && e.target.closest("[data-rmk]");
  if (c) { getar(); var kk = c.dataset.rmk; if (W.openKey) openKey(kk); }
}, true);
D.addEventListener("toggle", function (e) {
  var d = e.target; if (!d || !d.classList || !d.classList.contains("row") || !d.open) return;
  var k = d.dataset.n; if (!KEYRE.test(k || "")) return;
  st.rec = [k].concat(st.rec.filter(function (x) { return x !== k; })).slice(0, 8); simpan(); gambarPintasan();
}, true);
var pint = null, sigP = "";
function gambarPintasan() {
  if (!pint) {
    var h = [].filter.call(D.querySelectorAll("#v-cari h2.sec"), function (x) { return /lokasi SPP/i.test(x.textContent); })[0]; if (!h) return;
    pint = D.createElement("section"); pint.id = "rm-pt"; pint.className = "rm-pt"; pint.setAttribute("aria-label", "Pintasan saya"); h.parentNode.insertBefore(pint, h);
  }
  var fav = st.fav.filter(function (k) { return nama(k) !== k; }).slice(0, 8), rec = st.rec.filter(function (k) { return fav.indexOf(k) < 0 && nama(k) !== k; }).slice(0, 5);
  var s = fav.join(",") + "|" + rec.join(","); if (s === sigP) return; sigP = s;
  if (!fav.length && !rec.length) { pint.hidden = true; pint.innerHTML = ""; return; }
  var ch = function (k) { return '<button type="button" class="chip" data-rmk="' + E(k) + '">' + E(nama(k)) + '</button>'; };
  pint.hidden = false;
  pint.innerHTML = '<h2 class="sec">Pintasan saya</h2>' + (fav.length ? '<p class="rm-lb">&#9733; Favorit</p><div class="rm-ch">' + fav.map(ch).join("") + '</div>' : '') + (rec.length ? '<p class="rm-lb">Terakhir dibuka</p><div class="rm-ch">' + rec.map(ch).join("") + '</div>' : '');
}

/* ---------- 4. Pencarian suara ---------- */
function pasangSuara() {
  var go = $("go"), q = $("q"); if (!go || !q || $("rm-mic")) return;
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition; if (!SR) return;
  var b = D.createElement("button"); b.type = "button"; b.id = "rm-mic"; b.className = "rm-mic"; b.setAttribute("aria-label", "Cari dengan suara");
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>';
  go.parentNode.insertBefore(b, go); var r = null;
  b.addEventListener("click", function () {
    if (r) { try { r.stop(); } catch (e) {} return; }
    try {
      r = new SR(); r.lang = "id-ID"; r.interimResults = false; r.maxAlternatives = 1; b.classList.add("on"); toast("Silakan bicara, misalnya \"bikin NIB\"");
      r.onresult = function (ev) { var t = ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : ""; if (t) { q.value = t; q.dispatchEvent(new Event("input", {bubbles: true})); go.click(); } };
      r.onerror = function (ev) { toast(ev.error === "not-allowed" ? "Izin mikrofon ditolak. Aktifkan di pengaturan peramban." : "Suara tidak terdengar, coba lagi."); };
      r.onend = function () { r = null; b.classList.remove("on"); };
      r.start();
    } catch (e) { r = null; b.classList.remove("on"); toast("Pencarian suara tidak tersedia di peramban ini."); }
  });
}

/* ---------- 5. Tautan ?layanan=KUNCI ---------- */
(function () {
  var k = ""; try { k = new URLSearchParams(location.search).get("layanan") || ""; } catch (e) {}
  if (!KEYRE.test(k)) return;
  var n = 0, t = setInterval(function () {
    n++; if (W.LD && LD[k.split("_")[0]] && LD[k.split("_")[0]].length && W.openKey && W.S) {
      clearInterval(t); try { history.replaceState(history.state, "", location.pathname); } catch (e) {} openKey(k);
    } else if (n > 40) clearInterval(t);
  }, 400);
})();

/* ---------- 6. Sambutan pengunjung baru ---------- */
var SL = [["&#128269;", "Cari layanan", "Ketik keperluan Anda, misalnya \"bikin NIB\". Takok langsung menunjukkan loket yang tepat."],
          ["&#128197;", "Booking tanpa antre lama", "Pesan jadwal kunjungan dari rumah. Anda mendapat tiket, pengingat, dan dipanggil saat giliran tiba."],
          ["&#128172;", "Tanya kapan saja", "Asisten Takok menjawab 24 jam. Untuk urusan pribadi, diskusi langsung dengan admin loket."]];
function sambutan() {
  if (st.onb || D.querySelector(".sh-ov,.ap-ov,.pn-ov")) return; st.onb = 1; simpan();
  var i = 0, ov = D.createElement("div"); ov.className = "sh-ov rm-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Selamat datang di Takok");
  function isi() {
    var s = SL[i]; ov.innerHTML = '<div class="sh-sheet rm-sheet" tabindex="-1"><div class="sh-gr"></div><div class="rm-slide" key="' + i + '"><div class="rm-ico">' + s[0] + '</div><h2>' + E(s[1]) + '</h2><p>' + E(s[2]) + '</p></div>' +
      '<div class="rm-dots">' + SL.map(function (_, j) { return '<i class="' + (j === i ? "on" : "") + '"></i>'; }).join("") + '</div>' +
      '<div class="rm-nav"><button type="button" class="btn" data-o="x">Lewati</button><button type="button" class="send" data-o="n">' + (i === SL.length - 1 ? "Mulai pakai Takok" : "Lanjut") + '</button></div></div>';
    var b = ov.querySelector('[data-o="n"]'); if (b) b.focus();
  }
  ov.addEventListener("click", function (e) {
    if (e.target === ov) { ov.remove(); return; } var b = e.target.closest("[data-o]"); if (!b) return;
    if (b.dataset.o === "x" || i === SL.length - 1) { ov.remove(); if (BARU_STREAK) konfeti(); return; } i++; isi();
  });
  isi(); D.body.appendChild(ov);
}

function milestone() {
  if (!BARU_STREAK) return; var m = {3: "3 hari berturut-turut", 7: "seminggu penuh", 14: "dua minggu", 30: "sebulan penuh"}[BARU_STREAK];
  if (m) setTimeout(function () { konfeti(); toast("Hebat! Anda memakai Takok " + m + "."); }, 3600);
}

function jalan() { ujung(bangunKartu); ujung(gambarKartu); ujung(hiasList); ujung(gambarPintasan); ujung(pasangSuara); }
jalan(); setInterval(jalan, 1500);
if (W.MutationObserver && $("list")) new MutationObserver(function () { ujung(hiasList); }).observe($("list"), {childList: true});
setTimeout(bukti, 2500); setInterval(bukti, 90000);
setTimeout(function () { ujung(sambutan); }, 3300);
ujung(milestone);
W.Ramah = {baruPertama: function () { return FIRST; }, fav: ubahFav, daftarFav: function () { return st.fav.slice(); }, konfeti: konfeti};
})();
