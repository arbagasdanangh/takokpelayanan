"use strict";
/* Versi 52 (penunjang): 1. "Yang baru" sekali tampil setelah pembaruan (isi menyesuaikan warga atau admin), bisa dibuka lagi lewat
   tautan di kaki halaman atau perintah /baru di Asisten, lengkap tombol Coba. 2. Cek Perangkat (suara, notifikasi, penyimpanan, koneksi)
   untuk membantu pemecahan masalah. 3. Banner koneksi saat perangkat offline. Tanpa perubahan server. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); }, VER0 = "54", KEY = "tk_baru";
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var WARGA = [
  ["Mau urus apa hari ini?", "Pilih situasi (buka usaha, anak lahir, menikah, bangun rumah, dll.) dan Takok mencarikan layanan yang cocok dari data loket, lengkap dengan syarat dan jadwal kunjungan.", "situasi", "Coba"],
  ["Perizinan Resmi", "Dua pintu perizinan dalam satu tempat: 21 bidang SSW Alfa Surabaya, pencarian KBLI 2025 yang tersambung ke OSS, rute izin usaha, dan tautan resmi.", "izin", "Buka"],
  ["Catatan izin pribadi", "Catat nomor permohonan SSW Alfa dan masa berlaku izin Anda. Pengingat kalender 30 dan 7 hari sebelum izin berakhir. Tersimpan hanya di perangkat.", "", ""],
  ["6 game baru di Ruang Main", "Susun Alur Izin, Cocok Bidang SSW, Menara Berkas, Gabung Stempel, Benar atau Mitos, dan Sandi Izin.", "alur", "Main"],
  ["Aa: kenyamanan membaca", "Huruf lebih besar, kontras tinggi, dan Mode Lansia dalam satu ketukan.", "aa", "Coba"],
  ["Tampilan ala aplikasi", "Bilah navigasi di bawah, Menu lengkap, pencarian cepat (Ctrl atau Cmd + K), dan bisa dipasang ke layar utama HP.", "cari", "Coba cari"],
  ["Booking lebih mudah", "Jam yang sudah lewat dan bentrok langsung ditandai, tanggal punya penanda ketersediaan, dan pembatalan kini minta konfirmasi.", "", ""],
  ["Perencana Kunjungan", "Urus beberapa layanan sekaligus: urutan loket, jadwal per hari, dan daftar dokumen gabungan disusun otomatis.", "rencana", "Coba"],
  ["Kartu Saya", "Di beranda: hitung mundur kunjungan, tahapan tiket, tambah ke kalender, dan pengingat 1 jam sebelumnya.", "", ""],
  ["Asisten lebih lengkap", "Ketik /tiket, /mulai, atau /arti NIB untuk istilah yang membingungkan.", "arti", "Coba /arti"],
  ["Tanya Admin lebih terbantu", "Ada kerangka pertanyaan, pemeriksa pesan, dan draf yang tersimpan otomatis.", "", ""],
  ["Cari dengan suara", "Tekan ikon mikrofon di kolom pencarian beranda, lalu ucapkan kebutuhan Anda.", "", ""],
  ["Arena Zona", "Gim ala MOBA di Ruang Main: rebut tiga Menara Zona dan kalahkan Si Ruwet.", "arena", "Main"]
];
var ADM = [
  ["Katalog Perizinan", "Tab baru untuk superuser: tempel daftar izin dari SSW Alfa atau OSS (Excel/CSV), periksa, simpan. Ada tombol uji koneksi server ke kedua situs.", "", ""],
  ["Saran Balasan Cerdas", "Di percakapan, Takok menyusun draf jawaban dari data loket (syarat, biaya, jam) dan menyarankan balasan cepat yang mirip.", "", ""],
  ["Fokus sekarang", "Tombol di bar atas: 6 percakapan paling mendesak, sekali klik langsung dibuka.", "", ""],
  ["Peta Kepadatan", "Peta panas booking 7 hari kerja ke depan, lengkap loket terpadat per hari.", "", ""],
  ["Layar penuh", "Pajang pantauan di monitor tanpa gangguan tampilan lain.", "", ""],
  ["Aa: kenyamanan membaca", "Ukuran huruf dan kontras bisa disesuaikan, tersimpan di perangkat Anda.", "aa", "Coba"]
];
var ov = null;
function ver() { return (window.DIN && DIN.baru && DIN.baru.v) || VER0; }
function daftar() {
  var b = (window.DIN && DIN.baru) || {}, w = peran() === "warga", d = w ? b.warga : b.admin;
  return Array.isArray(d) && d.length ? d.map(function (r) { return [r[0], r[1] || "", "", ""]; }) : (w ? WARGA : ADM);
}
function peran() { return window.S === "user" || window.S === "out" ? "warga" : "admin"; }
function cekPerangkat() {
  var ok = function (v) { return v ? "Siap" : "Tidak tersedia"; }, st = true;
  try { localStorage.setItem("tk_t", "1"); localStorage.removeItem("tk_t"); } catch (e) { st = false; }
  var no = window.Notification ? ({granted: "Diizinkan", denied: "Diblokir", "default": "Belum diminta"}[Notification.permission] || "-") : "Tidak tersedia";
  return [["Koneksi", navigator.onLine === false ? "Offline" : "Tersambung"], ["Cari dengan suara", ok(window.SpeechRecognition || window.webkitSpeechRecognition)], ["Notifikasi", no], ["Penyimpanan di perangkat", ok(st)], ["Layar", innerWidth + " x " + innerHeight]];
}
function tutup() { if (ov) { ov.remove(); ov = null; try { if (opener0) opener0.focus(); } catch (e) {} } }
var opener0 = null;
function buka(manual) {
  if (ov) return; opener0 = D.activeElement; var L = daftar();
  ov = D.createElement("div"); ov.className = "pn-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Yang baru");
  ov.innerHTML = '<div class="pn-box"><div class="au-h"><b>Yang baru di Takok</b><button type="button" class="au-x" data-pn="x" aria-label="Tutup">&times;</button></div>' +
    '<ul class="pn-ls">' + L.map(function (x) { return '<li><div><b>' + E(x[0]) + '</b><small>' + E(x[1]) + '</small></div>' + (x[2] ? '<button type="button" class="btn" data-pn="' + x[2] + '">' + E(x[3]) + '</button>' : "") + '</li>'; }).join("") + '</ul>' +
    '<details class="pn-dv"><summary>Cek perangkat</summary><ul>' + cekPerangkat().map(function (r) { return '<li><span>' + E(r[0]) + '</span><b>' + E(r[1]) + '</b></li>'; }).join("") + '</ul><small class="sys">Berguna bila ada fitur yang tidak berfungsi. Sebutkan hasilnya kepada petugas.</small></details>' +
    '<div class="btns" style="justify-content:flex-end"><button type="button" class="send" data-pn="x">Mengerti</button></div></div>';
  D.body.appendChild(ov); try { localStorage.setItem(KEY, ver()); } catch (e) {}
  var f = ov.querySelector(".pn-box button"); if (f) f.focus();
  ov.onclick = function (e) {
    if (e.target === ov) { tutup(); return; } var b = e.target.closest("[data-pn]"); if (!b) return; var a = b.dataset.pn;
    if (a === "x") { tutup(); return; }
    tutup();
    if (a === "aa") { var t = $("au-b"); if (t) t.click(); }
    else if (a === "arti") { var bf = $("bf"); if (bf) bf.click(); setTimeout(function () { if (window.BOTI && BOTI.ask) BOTI.ask("/arti"); }, 220); }
    else if (a === "cari") { if (window.Shell) Shell.cari(); }
    else if (a === "situasi") { var st = document.getElementById("sit"); if (st) st.scrollIntoView({behavior: "smooth", block: "center"}); }
    else if (a === "izin") { if (window.Izin) Izin.buka(); }
    else if (a === "alur") { var mg2 = $("mbgo"); if (mg2) mg2.click(); setTimeout(function () { if (window.GameIzin) GameIzin.alur(); }, 120); }
    else if (a === "rencana") { if (window.Rencana) Rencana.buka(); }
    else if (a === "arena") { var mg = $("mbgo"); if (mg) mg.click(); setTimeout(function () { if (window.ArenaZona) ArenaZona.menu(); }, 120); }
  };
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov) tutup(); });

/* Banner koneksi */
var bn = null, tOk = null;
function banner(on) {
  if (on) { clearTimeout(tOk); if (!bn) { bn = D.createElement("div"); bn.className = "pn-off"; bn.setAttribute("role", "status"); bn.setAttribute("aria-live", "polite"); D.body.appendChild(bn); } bn.className = "pn-off"; bn.textContent = "Anda sedang offline. Pesan baru terkirim setelah koneksi kembali."; }
  else if (bn) { bn.className = "pn-off ok"; bn.textContent = "Tersambung kembali."; clearTimeout(tOk); tOk = setTimeout(function () { if (bn) { bn.remove(); bn = null; } }, 2200); }
}
window.addEventListener("offline", function () { banner(true); });
window.addEventListener("online", function () { banner(false); });
if (navigator.onLine === false) banner(true);

/* Pemicu */
var shown = false;
function jalan() {
  try {
    if (!window.BOTX || !window.BOTI) { /* menunggu asisten */ } else if (!window.BOTX.__pn) {
      window.BOTX.__pn = 1; var p0 = window.BOTX.pre;
      window.BOTX.pre = function (t, s) { if (/^\/baru\b/i.test(t)) { setTimeout(function () { var b = $("bf"); buka(true); }, 0); return window.BOTI.bot("Saya tampilkan daftar fitur baru."); } return p0 ? p0(t, s) : null; };
    }
    if (!$("pn-lnk")) { var f = [].filter.call(D.querySelectorAll("small.sys"), function (n) { return /^Versi \d+/.test(n.textContent.trim()); })[0];
      if (f) { var a = D.createElement("button"); a.type = "button"; a.id = "pn-lnk"; a.className = "pn-lnk"; a.textContent = "Yang baru"; a.onclick = function () { buka(true); }; f.appendChild(D.createTextNode(" ")); f.appendChild(a); } }
    if (!shown && window.S && !ov) { shown = true; var v = ""; try { v = localStorage.getItem(KEY) || ""; } catch (e) {} if (v !== ver()) setTimeout(function () { if (!D.querySelector(".ap-ov,.tg-ov:not([hidden])")) buka(false); }, 1800); }
  } catch (e) {}
}
setInterval(jalan, 1500); jalan();
window.TakokBaru = {buka: function () { buka(true); }};
})();
