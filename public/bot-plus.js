"use strict";
/* Versi 50: Asisten Takok Plus. Semua berjalan di browser.
   1. Perintah baru: /jam, /berangkat [menit], /main, /rush, /warna, /tema, /pantun.
   2. Di bawah jawaban: Salin dan WhatsApp (bagikan jawaban ke keluarga atau teman), di samping Dengarkan yang sudah ada.
   3. Cari di percakapan (menu ⋯), tombol gulir ke pesan terbaru, dan draf ketikan yang tersimpan sementara.
   4. Versi 51: Catatan saya (/catatan + tombol Simpan), /siapkan (persiapan kunjungan dari booking terdekat), /panduan (5 langkah kunjungan pertama),
      dan pengingat berangkat (selama aplikasi terbuka). */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var $b = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var p2 = function (n) { return String(n).padStart(2, "0"); };
var HARI = {Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7};
function wibNow() {
  var f = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short"}), o = {};
  f.formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
  return {h: +o.hour % 24, m: +o.minute, wd: HARI[o.weekday] || 1};
}
function fm(mnt) { mnt = ((mnt % 1440) + 1440) % 1440; return p2(Math.floor(mnt / 60)) + "." + p2(mnt % 60); }

/* ---------- Perintah ---------- */
var PANTUN = [
  "Pagi hari makan rujak cingur,\nDimakan bersama sambal petis.\nMau urus izin biar teratur,\nCek syarat dulu biar tak miris.",
  "Ke Tunjungan membeli talang,\nDibawa pulang ke Ketintang.\nDatanglah awal jangan petang,\nTiket antrean jadi tenang.",
  "Gado-gado di pinggir jalan,\nDimakan siang bersama kawan.\nCek syarat sebelum berjalan,\nUrusan beres tanpa ulangan."
], PI = -1;

function cmdJam() {
  var n = wibNow(), buka = n.wd <= 5 && n.h >= 8 && n.h < 14, cfg = window.CFG && CFG.jam ? '<p>' + E(CFG.jam) + '</p>' : "";
  return B.bot("Sekarang pukul " + p2(n.h) + "." + p2(n.m) + " WIB. " + (buka ? "Jam booking sedang berlangsung." : "Saat ini di luar jam booking."),
    '<div class="bc2"><b>Jam booking</b><p>Senin sampai Jumat, 08.00 sampai 14.00 WIB.</p>' + cfg + '<div class="ba">' + B.btn("Booking kunjungan", "q:booking kunjungan") + '</div></div>');
}

async function cmdBerangkat(arg) {
  if (window.S !== "user") return B.needIn("Masuk dulu supaya saya bisa melihat jadwal kunjungan Anda.");
  var j; try { j = await api("/api/booking"); } catch (e) { return B.bot("Jadwal belum bisa dimuat. Coba lagi sebentar."); }
  var hari = iso(wibDate(0)), up = (j.daftar || []).filter(function (o) { return o.tanggal >= hari && (o.status === "Terjadwal" || o.status === "Sudah tiba"); }).sort(function (a, b) { return (a.tanggal + a.jam) < (b.tanggal + b.jam) ? -1 : 1; })[0];
  if (!up) return B.bot("Belum ada jadwal kunjungan yang akan datang.", '<div class="bch">' + B.btn("Buat booking", "q:booking kunjungan") + '</div>');
  var tm = parseInt(arg, 10); if (!(tm >= 5 && tm <= 240)) tm = 30;
  var jp = up.jam.split(":"), mj = (+jp[0]) * 60 + (+jp[1]), dep = mj - tm - 15, n = wibNow(), sisa = up.tanggal === hari ? dep - (n.h * 60 + n.m) : null;
  var kata = sisa == null ? "" : sisa > 0 ? " Itu sekitar " + (sisa >= 60 ? Math.floor(sisa / 60) + " jam " + (sisa % 60) + " menit" : sisa + " menit") + " dari sekarang." : " Waktunya sudah dekat atau lewat, sebaiknya segera berangkat.";
  return B.bot("Kunjungan " + (up.tanggal === hari ? "hari ini" : up.tanggal) + " pukul " + up.jam + " WIB (" + (up.loket || "loket") + "). Dengan perjalanan " + tm + " menit dan cadangan 15 menit, berangkatlah paling lambat pukul " + fm(dep) + " WIB." + kata,
    '<div class="bc2"><b>Lama perjalanan Anda?</b><div class="bch">' + [15, 30, 45, 60, 90].map(function (m) { return '<button type="button" data-b="q:/berangkat ' + m + '"' + (m === tm ? ' class="bon"' : "") + '>' + m + ' menit</button>'; }).join("") + '</div>' + (sisa != null && sisa > 1 && sisa <= 720 ? '<div class="ba" style="margin-top:8px"><button type="button" data-bp="ingat" data-m="' + sisa + '" data-l="' + E(up.loket || "") + '">Ingatkan saya saat waktunya</button></div>' : '') + '<p class="sys" style="margin:6px 0 0">Check-in biasanya dibuka sekitar 60 menit sebelum jam booking.</p></div>');
}

function bukaMain(langsung) {
  return B.bot(langsung ? "Membuka Suroboyo Rush. Siap lari?" : "Membuka Ruang Main. Selamat bermain!").then(function () {
    B.closeB(); setTimeout(function () { var b = $b("mbgo"); if (b) b.click(); if (langsung && window.SuroboyoRush) setTimeout(function () { SuroboyoRush.menu(); }, 60); }, 80);
  });
}

function cmdWarna(arg) {
  var K = window.TKAKSEN; if (!K) return B.bot("Pengaturan warna belum tersedia di halaman ini.");
  arg = arg.toLowerCase().replace("biru (bawaan)", "biru");
  if (K.list.indexOf(arg) > -1) { K.set(arg); return B.bot("Warna tampilan diganti ke " + arg + "."); }
  return B.bot("Pilih warna tampilan:", B.chips(K.list.map(function (n) { return [n, "/warna " + n]; })));
}

/* ---------- Catatan saya (disimpan hanya di perangkat) ---------- */
var NK = "tkb_notes";
function nGet() { try { var a = JSON.parse(localStorage.getItem(NK) || "[]"); return Array.isArray(a) ? a.filter(function (x) { return x && typeof x.t === "string"; }) : []; } catch (e) { return []; } }
function nSet(a) { try { localStorage.setItem(NK, JSON.stringify(a.slice(0, 30))); return true; } catch (e) { return false; } }
function nKartu(x, i) {
  var ringkas = x.t.length > 170 ? x.t.slice(0, 170) + "\u2026" : x.t;
  return '<div class="bc2" data-ni="' + i + '"><p style="white-space:pre-line;margin:0 0 6px">' + E(ringkas) + '</p><small class="sys">' + E(new Date(x.d).toLocaleDateString("id-ID", {day: "numeric", month: "short"})) + '</small><div class="ba"><button type="button" data-bp="ncopy" data-i="' + i + '">Salin</button><button type="button" data-bp="ndel" data-i="' + i + '">Hapus</button></div></div>';
}
function cmdCatatan() {
  var a = nGet();
  if (!a.length) return B.bot("Belum ada catatan. Tekan Simpan di bawah jawaban yang ingin Anda simpan, mis. syarat atau biaya.");
  return B.bot("Catatan Anda (" + a.length + "). Tersimpan di perangkat ini saja.", a.map(nKartu).join("") + '<div class="bch"><button type="button" data-bp="nclr">Kosongkan semua</button></div>');
}

/* ---------- Persiapan kunjungan dan pengingat ---------- */
async function bookingNext() {
  var j = await api("/api/booking"), hari = iso(wibDate(0));
  return (j.daftar || []).filter(function (o) { return o.tanggal >= hari && (o.status === "Terjadwal" || o.status === "Sudah tiba"); }).sort(function (a, b) { return (a.tanggal + a.jam) < (b.tanggal + b.jam) ? -1 : 1; })[0];
}
async function cmdSiapkan() {
  if (window.S !== "user") return B.needIn("Masuk dulu supaya saya bisa menyiapkan daftar untuk kunjungan Anda.");
  var up; try { up = await bookingNext(); } catch (e) { return B.bot("Jadwal belum bisa dimuat. Coba lagi sebentar."); }
  if (!up) return B.bot("Belum ada jadwal kunjungan. Buat booking dulu, nanti saya bantu siapkan.", '<div class="bch">' + B.btn("Buat booking", "q:booking kunjungan") + '</div>');
  var k = up.kunci, ada = window.SY && k && SY.ada(k), hari = iso(wibDate(0));
  return B.bot("Persiapan kunjungan " + (up.tanggal === hari ? "hari ini" : up.tanggal) + " pukul " + up.jam + " WIB di " + (up.loket || "loket") + ":",
    '<div class="bc2"><b>Sebelum berangkat</b><ul class="bul"><li>Bawa KTP asli dan tunjukkan tiket booking (' + E(up.kode || "kode tiket") + ').</li><li>Siapkan berkas asli dan fotokopi sesuai persyaratan loket.</li><li>Datang sebelum jam booking, lalu tekan Saya sudah tiba.</li></ul><div class="ba">' +
    (ada ? '<button type="button" data-v="sy:' + E(k) + '">Persyaratan dan centang</button>' : '') + B.btn("Hitung jam berangkat", "q:/berangkat") + '</div>' + (ada ? '' : '<p class="sys" style="margin:6px 0 0">Persyaratan loket ini belum tersedia di aplikasi. Tanyakan langsung ke loket.</p>') + '</div>');
}

var LANGKAH = [
  ["Cari layanan atau izin", "Ketik keperluan Anda, mis. /izin perpanjang parkir, atau pakai tombol Cari izin di atas.", ["Cari izin", "q:/izin"]],
  ["Booking kunjungan", "Pilih loket, tanggal, dan jam. Kuota tiap jam dibatasi, jadi pesan lebih awal.", ["Buat booking", "q:booking kunjungan"]],
  ["Siapkan berkas", "Centang dokumen di Persyaratan loket. Bawa KTP asli dan fotokopi yang diminta.", ["Persiapan kunjungan", "q:/siapkan"]],
  ["Hari kunjungan", "Berangkat tepat waktu. Sesampai di lokasi tekan Saya sudah tiba, lalu tunggu nomor Anda di layar antrean.", ["Hitung jam berangkat", "q:/berangkat"]],
  ["Setelah dilayani", "Isi Survei Kepuasan dan simpan nomor tiket untuk memantau status permohonan.", ["Survei kepuasan", "q:survei kepuasan"]]
];
function cmdPanduan(arg) {
  var n = Math.min(LANGKAH.length, Math.max(1, parseInt(arg, 10) || 1)), L = LANGKAH[n - 1], dots = LANGKAH.map(function (x, i) { return '<i style="display:inline-block;width:' + (i + 1 === n ? 22 : 8) + 'px;height:8px;border-radius:99px;margin-right:4px;background:' + (i + 1 <= n ? "var(--acc)" : "var(--line)") + '"></i>'; }).join("");
  return B.bot("Langkah " + n + " dari " + LANGKAH.length + ": " + L[0],
    '<div class="bc2"><div aria-hidden="true" style="margin:0 0 8px">' + dots + '</div><p style="margin:0 0 8px">' + E(L[1]) + '</p><div class="ba">' + B.btn(L[2][0], L[2][1]) + (n > 1 ? B.btn("Sebelumnya", "q:/panduan " + (n - 1)) : "") + (n < LANGKAH.length ? B.btn("Berikutnya", "q:/panduan " + (n + 1)) : "") + '</div></div>', 350);
}
var ING = null;
function ingatkan(menit, label) {
  clearTimeout(ING); var ms = Math.max(1, Math.round(menit)) * 60000;
  if (window.Notification && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) {} }
  ING = setTimeout(function () {
    var t = "Saatnya berangkat" + (label ? " ke " + label : "") + ".";
    if (window.toast) toast(t);
    try { if (window.Notification && Notification.permission === "granted") new Notification("Takok Pelayanan Suroboyo", {body: t}); } catch (e) {}
  }, ms);
  if (window.toast) toast("Pengingat dipasang. Berlaku selama Takok terbuka di peramban ini.");
}

var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  var m = /^\/(\S+)\s*(.*)$/.exec(t);
  if (m) {
    var c = "/" + m[1].toLowerCase(), arg = m[2].trim();
    if (c === "/jam") return cmdJam();
    if (c === "/berangkat") return cmdBerangkat(arg);
    if (c === "/main") return bukaMain(false);
    if (c === "/rush") return bukaMain(true);
    if (c === "/warna") return cmdWarna(arg);
    if (c === "/catatan") return cmdCatatan();
    if (c === "/siapkan") return cmdSiapkan();
    if (c === "/panduan") return cmdPanduan(arg);
    if (c === "/tema") { var th = $b("th"); if (th) th.click(); return B.bot("Tema sudah diganti."); }
    if (c === "/pantun") { PI = (PI + 1 + Math.floor(Math.random() * 2)) % PANTUN.length; return B.bot(PANTUN[PI], '<div class="bch">' + B.btn("Satu lagi", "q:/pantun") + '</div>', 500, true); }
  }
  return pre0 ? pre0(t, s) : null;
};

/* ---------- Salin dan WhatsApp di bawah jawaban ---------- */
function pasangAksi(n) {
  if (!n || n.nodeType !== 1 || !n.classList.contains("bmsg") || !n.classList.contains("b") || !n.dataset.t || n.querySelector(".bsc")) return;
  var h = '<button type="button" class="bsp bsc" data-bp="salin">Salin</button><button type="button" class="bsp bsc" data-bp="simpan">Simpan</button><button type="button" class="bsp bsc" data-bp="wa">WhatsApp</button>', d = n.querySelector('.bsp[data-b="say"]');
  if (d) d.insertAdjacentHTML("afterend", h); else n.insertAdjacentHTML("beforeend", h);
}
function pasangSemua() { [].forEach.call($b("bm").querySelectorAll(".bmsg.b"), pasangAksi); }

/* ---------- Pasang UI setelah panel Asisten dibangun ---------- */
var done = false;
function pasang() {
  var bm = $b("bm"), bp = $b("bp"), bi = $b("bi"), more = $b("bmore");
  if (done || !bm || !bp || !bi || !more) return false; done = true;
  /* Salin / WhatsApp */
  new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, pasangAksi); }); sedia(); }).observe(bm, {childList: true});
  function salinTeks(t, ok) { try { navigator.clipboard.writeText(t).then(function () { if (window.toast) toast(ok); }); } catch (x) { if (window.toast) toast("Penyalinan tidak didukung di perangkat ini."); } }
  bm.addEventListener("click", function (e) {
    var b = e.target.closest("[data-bp]"); if (!b) return; var a = b.dataset.bp, msg = b.closest(".bmsg"), t = msg && msg.dataset.t;
    if (a === "ncopy") { var n = nGet()[+b.dataset.i]; if (n) salinTeks(n.t, "Catatan disalin."); return; }
    if (a === "ndel") { var L = nGet(); L.splice(+b.dataset.i, 1); nSet(L); var c = b.closest(".bc2"); if (c) c.remove(); if (window.toast) toast("Catatan dihapus."); return; }
    if (a === "nclr") { if (confirm("Hapus semua catatan?")) { nSet([]); [].forEach.call(bm.querySelectorAll("[data-ni]"), function (x) { x.remove(); }); if (window.toast) toast("Catatan dikosongkan."); } return; }
    if (a === "ingat") { ingatkan(+b.dataset.m, b.dataset.l); b.disabled = true; b.textContent = "Pengingat dipasang"; return; }
    if (!t) return;
    var isi = t + "\n\n(Dari Asisten Takok, Takok Pelayanan Suroboyo: " + location.origin + ")";
    if (a === "salin") salinTeks(isi, "Jawaban disalin.");
    else if (a === "simpan") { var N = nGet(); if (N.some(function (x) { return x.t === t; })) { if (window.toast) toast("Sudah ada di Catatan."); return; } N.unshift({t: t.slice(0, 1200), d: Date.now()}); if (nSet(N) && window.toast) toast("Disimpan. Ketik /catatan untuk melihatnya."); b.textContent = "Tersimpan"; }
    else if (a === "wa") window.open("https://wa.me/?text=" + encodeURIComponent(isi), "_blank", "noopener");
  });
  pasangSemua();
  /* Cari di percakapan */
  var bar = D.createElement("div"); bar.className = "bsr"; bar.hidden = true;
  bar.innerHTML = '<input type="search" id="bsr-i" placeholder="Cari di percakapan ini" aria-label="Cari di percakapan" autocomplete="off"><button type="button" id="bsr-x" aria-label="Tutup pencarian">&times;</button>';
  bm.parentNode.insertBefore(bar, bm);
  function saring() { var q = $b("bsr-i").value.trim().toLowerCase(); [].forEach.call(bm.querySelectorAll(".bmsg"), function (m) { m.classList.toggle("bsr-h", !!q && (m.textContent || "").toLowerCase().indexOf(q) < 0); }); }
  function tutupCari() { bar.hidden = true; $b("bsr-i").value = ""; saring(); }
  $b("bsr-i").oninput = saring; $b("bsr-x").onclick = tutupCari;
  $b("bsr-i").onkeydown = function (e) { if (e.key === "Escape") { e.stopPropagation(); tutupCari(); bi.focus(); } };
  var mb = D.createElement("button"); mb.type = "button"; mb.setAttribute("role", "menuitem"); mb.dataset.m = "cari"; mb.textContent = "Cari di percakapan";
  more.insertBefore(mb, more.children[2] || null);
  more.addEventListener("click", function (e) { if (e.target.closest("[data-m=cari]")) { bar.hidden = false; $b("bsr-i").focus(); } });
  /* Tombol gulir ke pesan terbaru */
  var dn = D.createElement("button"); dn.type = "button"; dn.className = "bdn"; dn.hidden = true; dn.innerHTML = "&darr; Pesan terbaru"; bp.appendChild(dn);
  function sedia() { var jauh = bm.scrollHeight - bm.scrollTop - bm.clientHeight > 140; dn.hidden = !jauh; }
  bm.addEventListener("scroll", sedia, {passive: true}); dn.onclick = function () { bm.scrollTop = bm.scrollHeight; dn.hidden = true; };
  /* Draf ketikan */
  var DK = "tkb_draft";
  function simpan() { try { if (bi.value) sessionStorage.setItem(DK, bi.value); else sessionStorage.removeItem(DK); } catch (x) {} }
  try { var d0 = sessionStorage.getItem(DK); if (d0 && !bi.value) bi.value = d0; } catch (x) {}
  bi.addEventListener("input", simpan); bi.addEventListener("keydown", function (e) { if (e.key === "Enter") setTimeout(simpan, 0); });
  var sb = $b("b-s"); if (sb) sb.addEventListener("click", function () { setTimeout(simpan, 0); });
  return true;
}
if (!pasang()) { var obs = new MutationObserver(function () { if (pasang()) obs.disconnect(); }); obs.observe(D.body, {childList: true, subtree: true}); }
})();
