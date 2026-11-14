"use strict";
/* Dua game tambahan di Ruang Main (v53), memakai pintu TKGM milik main.js (poin, lencana, tantangan harian, hitungan pemakaian anonim):
   1. Benar atau Mitos : 8 pernyataan seputar perizinan dan keamanan berkas; jawab Benar/Mitos, ada penjelasan, runtun, dan bonus cepat.
   2. Sandi Izin       : tebak istilah perizinan huruf demi huruf (ala gantung), 3 kata per ronde, 6 kesempatan salah per kata.
   Semua murni di browser. Pernyataan dan istilah adalah ringkasan umum untuk belajar, bukan petunjuk resmi. */
(function () {
var API = window.TKGM; if (!API) return;
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function G() { return API.G(); }
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickN(a, n, R) { var c = a.slice(), o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]); return o; }

/* ============ 1. Benar atau Mitos ============ */
/* [pernyataan, benar?, penjelasan] */
var BM = [
  ["KBLI adalah singkatan dari Klasifikasi Baku Lapangan Usaha Indonesia.", 1, "Kode KBLI menggolongkan jenis kegiatan usaha, dan dipakai saat mendaftar di OSS."],
  ["Kode KBLI 2025 terdiri dari 5 digit.", 1, "Pencarian kode di Takok memakai 5 digit, misalnya 56102."],
  ["Kata sandi akun OSS boleh diberikan kepada petugas atau biro jasa supaya lebih cepat diurus.", 0, "Kata sandi, PIN, dan kode OTP bersifat pribadi. Petugas resmi tidak pernah memintanya."],
  ["Status resmi permohonan di SSW Alfa dicek lewat menu Cek Permohonan di situs resmi mereka.", 1, "Catatan status di Takok diisi sendiri oleh pengguna, jadi bukan status resmi."],
  ["SSW Alfa Surabaya mengelompokkan layanan mandiri/parsial ke dalam 21 bidang.", 1, "Contohnya Kesehatan, Pendidikan, Perhubungan, Kelurahan, serta Pajak dan Reklame."],
  ["Menulis nomor NIK 16 digit di kolom chat membuat pertanyaan dijawab lebih cepat.", 0, "Takok menolak pesan berisi NIK 16 digit demi keamanan data pribadi Anda."],
  ["Izin yang sudah terbit sebelum KBLI 2025 otomatis hangus.", 0, "Perizinan yang sudah terbit tetap berlaku. KBLI 2025 dipakai untuk pendaftaran baru."],
  ["Semua jenis izin hanya bisa diurus lewat OSS.", 0, "OSS untuk perizinan berusaha. Izin daerah non-berusaha dan layanan lain bisa lewat SSW Alfa atau loket."],
  ["Masuk ke akun OSS sebaiknya dilakukan di situs resmi oss.go.id, bukan lewat tautan kiriman orang asing.", 1, "Tautan palsu sering dipakai untuk mencuri akun. Ketik alamat resmi atau buka dari sumber tepercaya."],
  ["Pesan yang menawarkan izin \"jadi cepat asal transfer dulu\" kepada akun pribadi aman dipercaya.", 0, "Itu ciri penipuan atau calo. Biaya resmi dibayar lewat kanal resmi, dan Anda bisa melapor ke loket."],
  ["Tombol \"Saya sudah tiba\" di tiket Takok aktif 60 menit sebelum jam booking.", 1, "Pemohon yang sudah check-in didahulukan saat petugas memanggil berikutnya."],
  ["Persyaratan izin tidak pernah berubah, jadi daftar lama selalu cukup.", 0, "Ketentuan bisa diperbarui. Cocokkan dengan loket atau situs resmi sebelum datang."],
  ["Mencatat nomor permohonan membantu melacak berkas di SSW Alfa.", 1, "Nomor itu dipakai di Cek Permohonan. Simpan di Catatan Saya, tanpa mencatat NIK atau kata sandi."],
  ["Satu kegiatan usaha selalu hanya punya satu kemungkinan kode KBLI, tanpa perlu membaca uraiannya.", 0, "Uraian resmi memuat cakupan dan bagian \"tidak mencakup\". Membacanya mencegah salah kode."],
  ["Survei Kepuasan di loket dipakai untuk memperbaiki mutu layanan.", 1, "Penilaian warga diolah menjadi Indeks Kepuasan Masyarakat per loket."],
  ["Berkas asli tidak perlu dibawa karena petugas pasti menerima fotokopi saja.", 0, "Banyak layanan meminta dokumen asli untuk dicocokkan. Siapkan sesuai daftar syarat loket."]
];
var BS = null;
function bmMenu() {
  API.stopAll(); API.title("Benar atau Mitos"); var g = G();
  API.view(API.bar("Benar atau Mitos") + '<div class="tb-hero"><b>Benar atau Mitos?</b><p>8 pernyataan seputar perizinan, KBLI, dan keamanan berkas. Jawab Benar atau Mitos, lalu baca penjelasannya. Runtun jawaban benar memberi bonus.</p>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-bm="mulai">Mulai</button></div>' +
    '<p class="sys">Rekor: ' + (g.best.bm !== undefined ? g.best.bm + " dari 8" : "belum ada") + '</p></div><p class="sys">Ringkasan umum untuk belajar, bukan petunjuk resmi. Selalu cocokkan dengan loket atau situs resmi.</p>');
}
function bmMulai() {
  API.stopAll(); API.ping("benar");
  BS = {q: pickN(BM, 8, rng((Math.random() * 4e9) >>> 0)), i: 0, ok: 0, run: 0, best: 0, bonus: 0, row: "", lock: false}; bmTanya();
}
function bmTanya() {
  var q = BS.q[BS.i]; API.title("Benar atau Mitos " + (BS.i + 1) + "/8");
  API.view(API.bar("Benar atau Mitos", (BS.i + 1) + "/8 &middot; benar " + BS.ok + (BS.run >= 2 ? " &middot; &#128293;" + BS.run : "")) + '<div id="bmw"></div><div class="cb-q"><small>Pernyataan ini...</small><p>' + E(q[0]) + '</p></div>' +
    '<div class="cb-o"><button type="button" class="btn tb-b" data-bm="j" data-v="1"><span>&#10003;</span>Benar</button><button type="button" class="btn tb-b" data-bm="j" data-v="0"><span>&#10007;</span>Mitos</button></div><div id="bmx" role="status" aria-live="polite"></div>');
  BS.lock = false; BS.t0 = Date.now(); if (window.WK) WK.start($("bmw"), 12, function () { bmJawab(-1); });
}
function bmJawab(v) {
  if (!BS || BS.lock) return; BS.lock = true; var q = BS.q[BS.i], ok = v === q[1], habis = v === -1, sisa = window.WK ? WK.stop() : 0, cepat = ok && window.WK && WK.on() && sisa >= 7;
  if (ok) { BS.ok++; BS.run++; BS.best = Math.max(BS.best, BS.run); if (BS.run >= 3) BS.bonus += 1; if (cepat) BS.bonus += 1; } else BS.run = 0;
  BS.row += ok ? "🟩" : habis ? "⏱️" : "🟥"; API.beep(ok ? 880 : 220, 0.15);
  [].forEach.call(D.querySelectorAll("[data-bm=j]"), function (b) { b.disabled = true; if (+b.dataset.v === q[1]) b.classList.add("tb-ok"); else if (+b.dataset.v === v) b.classList.add("tb-no"); });
  var last = BS.i === BS.q.length - 1;
  $("bmx").innerHTML = '<div class="cb-ex ' + (ok ? "y" : "n") + '"><b>' + (ok ? "Tepat!" : habis ? "Waktu habis." : "Belum tepat.") + '</b> Pernyataan itu <b>' + (q[1] ? "benar" : "mitos") + '</b>.' + (cepat ? ' <span class="tb-bn">&#9889; Cepat +1</span>' : '') + (BS.run >= 3 && ok ? ' <span class="tb-bn">&#128293; Runtun +1</span>' : '') +
    '<br><small class="sys">' + E(q[2]) + '</small></div><div class="btns"><button type="button" class="send" data-bm="lanjut">' + (last ? "Lihat hasil" : "Lanjut") + '</button></div>';
  var l = $("bmx").querySelector("[data-bm=lanjut]"); if (l) l.focus();
}
function bmSelesai() {
  var s = BS, st = s.ok >= 7 ? 3 : s.ok >= 5 ? 2 : 1, pts = s.ok * 5 + s.bonus * 2 + (s.ok === 8 ? 10 : 0);
  API.fin("benar", {title: s.ok === 8 ? "Antihoaks sempurna!" : s.ok >= 5 ? "Cukup waspada" : "Yuk belajar lagi", stars: st, pts: pts, bk: "bm", bv: s.ok, m: {benar: s.ok}, again: bmMulai,
    share: "Benar atau Mitos (Takok): " + s.ok + "/8\n" + s.row + "\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin,
    sub: s.row + "<br>" + s.ok + " dari 8 benar. Runtun terpanjang: " + s.best + "."});
}

/* ============ 2. Sandi Izin ============ */
/* [kata (huruf saja), petunjuk] */
var KW = [
  ["PERIZINAN", "Persetujuan resmi untuk menjalankan kegiatan tertentu."], ["PERSYARATAN", "Daftar dokumen atau ketentuan yang harus dipenuhi."], ["BERKAS", "Kumpulan dokumen yang diajukan pemohon."],
  ["ANTREAN", "Urutan orang yang menunggu dilayani."], ["VERIFIKASI", "Pemeriksaan kebenaran dan kelengkapan data atau berkas."], ["PERPANJANGAN", "Memperpanjang masa berlaku izin yang akan habis."],
  ["KELURAHAN", "Kantor pelayanan terdekat untuk surat pengantar warga."], ["REKOMENDASI", "Surat pertimbangan dari instansi sebelum izin terbit."], ["DOMISILI", "Tempat tinggal atau kedudukan menurut data resmi."],
  ["PENDAFTARAN", "Langkah pertama mencatat diri atau usaha ke dalam sistem."], ["SERTIFIKAT", "Surat tanda bukti resmi, misalnya kelayakan atau standar."], ["PEMOHON", "Orang yang mengajukan permohonan."],
  ["RETRIBUSI", "Pungutan daerah atas jasa atau izin tertentu."], ["KOPERASI", "Badan usaha berbasis kekeluargaan yang beranggota."], ["REKLAME", "Papan atau media promosi yang butuh izin pemasangan."],
  ["LOKASI", "Tempat usaha yang harus sesuai tata ruang."], ["PEMERIKSAAN", "Pengecekan berkas atau lapangan sebelum keputusan."], ["PERSETUJUAN", "Keputusan setuju atas permohonan."],
  ["KEPUASAN", "Hal yang diukur lewat Survei Kepuasan Masyarakat."], ["BOOKING", "Memesan jadwal kunjungan ke loket."]
];
var SD = null, HURUF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function sdMenu() {
  API.stopAll(); API.title("Sandi Izin"); var g = G();
  API.view(API.bar("Sandi Izin") + '<div class="tb-hero"><b>Sandi Izin</b><p>Tebak istilah perizinan huruf demi huruf. 3 kata per ronde, 6 kesempatan salah untuk tiap kata. Petunjuk arti kata selalu tampil. Keyboard fisik juga bisa dipakai.</p>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-sd="mulai">Mulai</button></div><p class="sys">Rekor: ' + (g.best.sd !== undefined ? g.best.sd + " kata benar" : "belum ada") + '</p></div>');
}
function sdMulai() { API.stopAll(); API.ping("sandi"); SD = {w: pickN(KW, 3, rng((Math.random() * 4e9) >>> 0)), i: 0, ok: 0, salah: 0, tot: 0, pakai: {}, selesai: false}; sdLukis(); }
function sdSalah() { return Object.keys(SD.pakai).filter(function (h) { return SD.w[SD.i][0].indexOf(h) < 0; }).length; }
function sdMenang() { return SD.w[SD.i][0].split("").every(function (h) { return SD.pakai[h]; }); }
function sdLukis() {
  var k = SD.w[SD.i], s = sdSalah(), kata = k[0];
  API.title("Sandi Izin " + (SD.i + 1) + "/3");
  API.view(API.bar("Sandi Izin", (SD.i + 1) + "/3 &middot; benar " + SD.ok) + '<div class="cb-q"><small>Petunjuk</small><p>' + E(k[1]) + '</p></div>' +
    '<div class="sd-w" aria-label="Kata dengan ' + kata.length + ' huruf" role="img">' + kata.split("").map(function (h) { return '<span class="sd-h' + (SD.pakai[h] || SD.selesai ? " on" : "") + (SD.selesai && !SD.pakai[h] ? " no" : "") + '">' + ((SD.pakai[h] || SD.selesai) ? h : "") + '</span>'; }).join("") + '</div>' +
    '<p class="sys" style="text-align:center">Kesempatan salah tersisa: <b>' + (6 - s) + '</b> ' + "&#10084;".repeat(6 - s) + '</p>' +
    '<div class="sd-k" role="group" aria-label="Pilih huruf">' + HURUF.split("").map(function (h) { var p = SD.pakai[h], ben = kata.indexOf(h) > -1; return '<button type="button" class="btn sd-b' + (p ? (ben ? " tb-ok" : " tb-no") : "") + '" data-sd="h" data-h="' + h + '"' + (p || SD.selesai ? " disabled" : "") + ' aria-label="Huruf ' + h + '">' + h + '</button>'; }).join("") + '</div><div id="sdx" role="status" aria-live="polite"></div>');
}
function sdPilih(h) {
  if (!SD || SD.selesai || SD.pakai[h] || HURUF.indexOf(h) < 0) return; SD.pakai[h] = 1; var ben = SD.w[SD.i][0].indexOf(h) > -1; API.beep(ben ? 700 : 200, 0.08);
  if (!ben) SD.salah++;
  var kalah = sdSalah() >= 6, menang = sdMenang();
  if (menang || kalah) { SD.selesai = true; if (menang) SD.ok++; SD.tot += 6 - sdSalah(); sdLukis(); sdAkhirKata(menang); } else sdLukis();
}
function sdAkhirKata(menang) {
  var k = SD.w[SD.i], last = SD.i === SD.w.length - 1;
  $("sdx").innerHTML = '<div class="cb-ex ' + (menang ? "y" : "n") + '"><b>' + (menang ? "Tepat!" : "Belum berhasil.") + '</b> Kata: <b>' + E(k[0]) + '</b>.</div><div class="btns"><button type="button" class="send" data-sd="lanjut">' + (last ? "Lihat hasil" : "Kata berikutnya") + '</button></div>';
  var l = $("sdx").querySelector("[data-sd=lanjut]"); if (l) l.focus();
}
function sdSelesai() {
  var s = SD, st = s.ok === 3 ? 3 : s.ok === 2 ? 2 : 1, pts = s.ok * 10 + Math.min(15, s.tot);
  API.fin("sandi", {title: s.ok === 3 ? "Sandi terpecahkan!" : s.ok >= 1 ? "Lumayan, terus asah" : "Coba lagi ya", stars: st, pts: pts, bk: "sd", bv: s.ok, m: {sandi: s.ok}, again: sdMulai,
    share: "Sandi Izin (Takok): " + s.ok + "/3 kata\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin, sub: s.ok + " dari 3 kata tertebak. Sisa kesempatan menambah poin bonus."});
}

/* ============ Penghubung ============ */
D.addEventListener("click", function (e) {
  var x = e.target.closest && e.target.closest("[data-g],[data-bm],[data-sd]"); if (!x) return;
  if (x.dataset.g === "benar") return bmMenu(); if (x.dataset.g === "sandi") return sdMenu();
  var a = x.dataset.bm;
  if (a) { if (a === "mulai") bmMulai(); else if (a === "j") bmJawab(+x.dataset.v); else if (a === "lanjut") { if (BS.i === BS.q.length - 1) bmSelesai(); else { BS.i++; bmTanya(); } } return; }
  a = x.dataset.sd;
  if (a) { if (a === "mulai") sdMulai(); else if (a === "h") sdPilih(x.dataset.h); else if (a === "lanjut") { if (SD.i === SD.w.length - 1) sdSelesai(); else { SD.i++; SD.selesai = false; SD.pakai = {}; sdLukis(); } } }
});
D.addEventListener("keydown", function (e) {
  if (SD && $("sdx") && !e.ctrlKey && !e.metaKey && !e.altKey && /^[a-zA-Z]$/.test(e.key) && !/INPUT|TEXTAREA|SELECT/.test((D.activeElement || {}).tagName || "")) { sdPilih(e.key.toUpperCase()); }
});
window.GameBaru = {benar: bmMenu, sandi: sdMenu};
})();
