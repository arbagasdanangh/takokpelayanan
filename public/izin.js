"use strict";
/* Versi 53: Perizinan Resmi (penghubung ke OSS dan SSW Alfa Surabaya).
   Yang dilakukan (jujur soal batasnya):
   - Takok TIDAK menarik data otomatis dari oss.go.id maupun sswalfa.surabaya.go.id. Kedua situs tidak menyediakan API publik, daftar perizinan
     SSW Alfa dimuat lewat skrip, dan CSP aplikasi ini (connect-src 'self') memang melarang browser memanggil situs lain.
   - Yang tersedia: 21 bidang layanan SSW Alfa (dibaca dari halaman resmi), tautan resmi kedua situs, katalog jenis izin yang diisi superadmin
     (tab admin "Katalog Perizinan"), pencarian KBLI 2025 bawaan yang tersambung ke OSS, rute izin usaha, serta catatan pribadi
     (Permohonan saya dan Dompet Izin) yang hanya tersimpan di perangkat pengguna.
   Semua berjalan di browser; tidak ada login OSS/SSW yang diminta atau disimpan oleh Takok. */
(function () {
var D = document, O = null, TAB = "bid", KAT = null, KATGAGAL = false, Q = "", QB = "", FB = "", opener = null;
var $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var p2 = function (n) { return String(n).padStart(2, "0"); };
function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
function toast(m) { if (window.toast) window.toast(m); }
function salin(t, m) { try { navigator.clipboard.writeText(t).then(function () { toast(m || "Tersalin."); }, function () { toast(t); }); } catch (e) { toast(t); } }
function hariIni() { var n = new Date(Date.now() + 7 * 36e5); return n.toISOString().slice(0, 10); }
function selisih(tgl) { var a = new Date(hariIni() + "T00:00:00Z"), b = new Date(tgl + "T00:00:00Z"); return Math.round((b - a) / 864e5); }

/* ---------- Data: 21 bidang layanan mandiri/parsial di SSW Alfa (dibaca dari halaman Daftar Perizinan) ---------- */
/* [id, nama pendek, nama di SSW Alfa, kata bantu pencarian buatan Takok (bukan data resmi)] */
var BID = [
  ["lh", "Lingkungan Hidup", "Layanan Perizinan Lingkungan Hidup", "lingkungan amdal ukl upl sppl limbah dlh"],
  ["bud", "Kebudayaan, Pemuda, Olahraga, Pariwisata", "Layanan Kebudayaan, Kepemudaan Olah Raga dan Pariwisata", "budaya pemuda olahraga wisata hiburan hotel restoran acara"],
  ["didik", "Pendidikan", "Layanan Pendidikan", "sekolah paud kursus pelatihan pendidikan"],
  ["sehat", "Kesehatan", "Layanan Kesehatan", "klinik apotek sip dokter perawat bidan laboratorium rumah sakit praktik"],
  ["hub", "Perhubungan, Angkutan, Lalu Lintas", "Layanan Perhubungan Angkutan dan Lalu Lintas", "parkir andalalin angkutan terminal trayek dishub kendaraan"],
  ["sda", "Sumber Daya Air dan Bina Marga", "Layanan Sumber Daya Air dan Bina Marga", "saluran air jalan galian drainase kabel utilitas"],
  ["aset", "Aset Daerah", "Layanan Pemakaian dan Pengelolaan Aset Daerah", "sewa aset tanah pemkot bmd pemakaian"],
  ["bencana", "Penanggulangan Bencana", "Layanan Penanggulangan Bencana", "bencana bpbd"],
  ["damkar", "Pemadam Kebakaran dan Penyelamatan", "Layanan Pemadam Kebakaran dan Penyelamatan", "kebakaran damkar apar proteksi gedung"],
  ["rumah", "Perumahan, Permukiman, Pertanahan", "Layanan Perumahan Rakyat, Kawasan Permukiman & Pertanahan", "rumah permukiman tanah perumahan sertifikat"],
  ["sosial", "Sosial Kemasyarakatan", "Layanan Sosial Kemasyarakatan", "sosial panti yayasan bantuan lembaga"],
  ["kop", "Koperasi, UKM, Perdagangan", "Layanan Koperasi Usaha Kecil dan Menengah dan Perdagangan", "koperasi umkm ukm perdagangan pasar toko dagang"],
  ["ind", "Perindustrian dan Ketenagakerjaan", "Layanan Perindustrian Ketenagakerjaan", "industri kerja pencari kerja kartu kuning tenaga kerja"],
  ["tani", "Pertanian dan Ketahanan Pangan", "Layanan Pertanian dan Ketahanan Pangan", "pertanian pangan ternak hewan pertanian"],
  ["pustaka", "Perpustakaan dan Kearsipan", "Layanan Perpustakaan dan Kearsipan", "perpustakaan arsip buku"],
  ["riset", "Penelitian / Magang PKL", "Layanan Penelitian / Magang PKL", "penelitian magang pkl riset skripsi"],
  ["metro", "Metrologi Legal", "Layanan Metrologi Legal", "tera timbangan alat ukur metrologi"],
  ["kel", "Kelurahan", "Layanan Kelurahan", "kelurahan surat pengantar keterangan domisili"],
  ["rtrw", "RT / RW", "Layanan RT / RW", "rt rw pengantar lingkungan warga"],
  ["pajak", "Pajak dan Reklame", "Layanan Pajak dan Reklame", "pajak reklame pbb papan nama spanduk"],
  ["mppd", "MPPD", "Layanan MPPD", "mppd"]
];
var URL_SSW = "https://sswalfa.surabaya.go.id/", URL_OSS = "https://oss.go.id/";
var LINK = {
  oss: [
    ["KBLI di OSS (pencarian resmi)", "https://oss.go.id/id/kbli", "Cari kode KBLI 2025 di sumber resmi."],
    ["Konversi KBLI 2020 ke 2025", "https://oss.go.id/id/kbli/konversi", "Alat resmi OSS untuk mencari padanan kode lama."],
    ["Panduan konversi KBLI", "https://oss.go.id/en/kbli/konversi/panduan", "Penjelasan lima jenis perubahan dari KBLI 2020 ke 2025."],
    ["Beranda OSS", "https://oss.go.id", "Informasi umum perizinan berusaha."],
    ["Masuk OSS", "https://ui-login.oss.go.id/login/v1?as=pelapor", "Login dilakukan di situs resmi OSS, bukan di Takok."],
    ["Konsultasi tatap muka OSS", "https://tatapmuka.oss.go.id/token/", "Janji konsultasi dengan petugas OSS."]
  ],
  ssw: [
    ["Daftar Perizinan (Buat Permohonan)", "https://sswalfa.surabaya.go.id/info/daftar-perizinan", "21 bidang layanan dan jenis perizinannya."],
    ["Cek Permohonan", "https://sswalfa.surabaya.go.id/cek/lacak", "Lacak status berkas yang sudah diajukan."],
    ["Cek Kelas Catin", "https://sswalfa.surabaya.go.id/cek/kelas-catin", "Informasi kelas calon pengantin."],
    ["Investasi Surabaya", "https://sswalfa.surabaya.go.id/info/investasi_surabaya", "Informasi peluang dan layanan investasi."],
    ["Masuk SSW Alfa", "https://sswalfa.surabaya.go.id/login", "Login dilakukan di situs resmi SSW Alfa."],
    ["Media Center (pengaduan)", "https://mediacenter.surabaya.go.id", "Kanal pengaduan resmi Pemkot Surabaya."]
  ]
};
var SEED = [  /* contoh dari publikasi kajian (UNESA) tentang layanan kelurahan di SSW Alfa; bukan daftar lengkap */
  ["Surat pengantar menikah", "Kelurahan", "Kelurahan", "", "", "", "", 0, 1],
  ["Surat pernyataan belum memiliki rumah", "Kelurahan", "Kelurahan", "", "", "", "", 0, 1],
  ["Surat izin pekerja migran", "Kelurahan", "Kelurahan", "", "", "", "", 0, 1]
];
var RUTE = [
  ["Siapkan identitas dan kontak aktif", "KTP-el pemilik/pengurus, NPWP bila ada, serta email dan nomor HP yang aktif untuk verifikasi.", "kamu"],
  ["Buat akun dan masuk di OSS", "Pendaftaran dan login dilakukan di oss.go.id. Takok tidak meminta atau menyimpan kata sandi OSS.", "oss"],
  ["Pilih KBLI 2025 yang tepat", "Cari kode 5 digit di tab KBLI & OSS. Baca uraian dan peringatan \"tidak mencakup\" agar tidak salah kode.", "kbli"],
  ["Isi data usaha dan lokasi, terbitkan NIB", "Alamat, modal, dan kegiatan usaha diisi di OSS. NIB terbit setelah data lengkap.", "oss"],
  ["Cek tingkat risiko dan perizinan lanjutan", "OSS menunjukkan izin atau sertifikat yang masih diperlukan sesuai risiko kegiatan usaha.", "oss"],
  ["Urus persyaratan dasar atau izin daerah di SSW Alfa", "Menurut DPMPTSP Surabaya, SSW Alfa dipakai untuk persyaratan dasar, perizinan non-berusaha, dan layanan non-perizinan.", "ssw"],
  ["Pantau berkas dan siapkan kunjungan", "Pakai Cek Permohonan di SSW Alfa. Bila perlu datang, buat Booking Kunjungan di Takok.", "ssw"]
];

/* ---------- Katalog (isi superadmin) ---------- */
function muatKatalog() {
  if (KAT) return Promise.resolve(KAT);
  if (!window.api) return Promise.resolve([]);
  return window.api("/api/izin").then(function (j) { KAT = Array.isArray(j.rows) ? j.rows : []; KAT.tgl = j.tgl || 0; KAT.sumber = j.sumber || ""; KATGAGAL = false; return KAT; }, function () { KATGAGAL = true; KAT = []; return KAT; });
}
function bidFor(t) {
  var n = norm(t); if (!n) return null;
  for (var i = 0; i < BID.length; i++) { var b = BID[i]; if (b[0] === n || norm(b[1]) === n || norm(b[2]) === n || norm(b[2]).replace(/^layanan /, "") === n) return b; }
  for (i = 0; i < BID.length; i++) { var s = norm(BID[i][1]); if (n.length > 3 && (s.indexOf(n) > -1 || n.indexOf(s) > -1)) return BID[i]; }
  return null;
}
function semuaIzin() {
  var out = (KAT || []).map(function (r) { return r.slice(0, 8); }), ada = {};
  out.forEach(function (r) { ada[norm(r[0])] = 1; });
  SEED.forEach(function (r) { if (!ada[norm(r[0])]) out.push(r.slice()); });
  return out;
}
function cariIzin(q, bf) {
  var A = semuaIzin(), t = norm(q).split(" ").filter(function (w) { return w.length > 1; });
  if (bf) A = A.filter(function (r) { var b = bidFor(r[1]); return b && b[0] === bf; });
  if (!t.length) return A;
  return A.map(function (r) {
    var nm = norm(r[0]), h = norm(r.slice(0, 4).join(" ")), s = 0;
    t.forEach(function (w) { if (nm.indexOf(w) > -1) s += 5; else if (h.indexOf(w) > -1) s += 1; });
    return {r: r, s: s};
  }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.r; });
}
function cariBidang(q) {
  var t = norm(q).split(" ").filter(function (w) { return w.length > 1; });
  if (!t.length) return BID.slice();
  return BID.map(function (b) {
    var h = norm(b[1] + " " + b[2] + " " + b[3]), s = 0; t.forEach(function (w) { if (h.indexOf(w) > -1) s += (norm(b[1]).indexOf(w) > -1 ? 3 : 1); });
    return {b: b, s: s};
  }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.b; });
}
function hitungBid() { var c = {}; semuaIzin().forEach(function (r) { var b = bidFor(r[1]); if (b) c[b[0]] = (c[b[0]] || 0) + 1; }); return c; }

/* ---------- Tampilan ---------- */
function ext(url, t, cls) { return '<a class="' + (cls || "iz-a") + '" href="' + E(url) + '" target="_blank" rel="noopener noreferrer">' + t + ' <span aria-hidden="true">&#8599;</span><span class="iz-sr"> (situs resmi, tab baru)</span></a>'; }
function catatanSumber() {
  var t = KAT && KAT.tgl ? new Date(KAT.tgl).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}) : "";
  return '<p class="iz-note">' + (KAT && KAT.length ? 'Katalog izin diisi admin Takok' + (KAT.sumber ? " (sumber: " + E(KAT.sumber) + ")" : "") + (t ? ", diperbarui " + E(t) : "") + '. Selalu cocokkan syarat dan biaya dengan SSW Alfa atau OSS sebelum mengurus.' :
    KATGAGAL ? 'Katalog admin tidak bisa dimuat sekarang. Bidang dan tautan resmi tetap bisa dipakai.' : 'Katalog izin belum diisi admin. Daftar lengkap jenis perizinan ada di SSW Alfa; Takok menyediakan bidang dan tautan resminya.') + '</p>';
}
function tabBid() {
  var R = cariBidang(QB), c = hitungBid();
  return '<div class="iz-hero"><div><b>Dua pintu perizinan resmi</b><p>OSS untuk perizinan berusaha (NIB, KBLI). SSW Alfa Surabaya untuk persyaratan dasar, perizinan non-berusaha, dan layanan non-perizinan di Kota Surabaya.</p></div>' +
    '<div class="iz-cta">' + ext(LINK.ssw[0][1], "Buka SSW Alfa", "iz-a iz-pri") + ext(LINK.oss[0][1], "Buka KBLI di OSS", "iz-a iz-pri2") + '</div></div>' +
    '<input class="si iz-in" id="iz-qb" type="search" value="' + E(QB) + '" placeholder="Cari bidang: pajak, kesehatan, parkir, kelurahan..." aria-label="Cari bidang layanan SSW Alfa" autocomplete="off">' +
    '<p class="iz-sub">' + R.length + ' dari 21 bidang layanan mandiri/parsial di SSW Alfa</p><div class="iz-grid">' + (R.length ? R.map(function (b) {
      var n = c[b[0]] || 0;
      return '<div class="iz-bd"><span class="iz-ic" aria-hidden="true">' + E(b[1].charAt(0)) + '</span><div><b>' + E(b[1]) + '</b><small>' + E(b[2]) + '</small></div><div class="iz-bt"><button type="button" class="btn" data-iz="lihat" data-b="' + E(b[0]) + '">' + (n ? "Lihat " + n + " izin" : "Cari izin") + '</button>' + ext(LINK.ssw[0][1], "SSW Alfa", "iz-a iz-sm") + '</div></div>';
    }).join("") : '<p class="sys">Tidak ada bidang yang cocok. Coba kata lain, atau buka daftar lengkap di SSW Alfa.</p>') + '</div>' +
    '<p class="iz-note">Nama bidang diambil dari halaman Daftar Perizinan SSW Alfa. Kata pencarian bantu (mis. "parkir" ke Perhubungan) dibuat Takok sebagai perkiraan, bukan data resmi.</p>' + catatanSumber();
}
function syaratHtml(s) {
  var L = String(s || "").split(/\s*;\s*|\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  return L.length ? '<ul class="iz-sy">' + L.map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul>" : "";
}
function kartuIzin(r, i) {
  var b = bidFor(r[1]), seed = r[8];
  return '<div class="iz-c"><div class="iz-ch"><b>' + E(r[0]) + '</b>' + (r[7] ? '<span class="iz-ok">Diverifikasi admin</span>' : '<span class="iz-no">' + (seed ? "Contoh dari publikasi" : "Belum diverifikasi") + '</span>') + '</div>' +
    '<div class="iz-meta">' + (b ? '<span class="iz-chip">' + E(b[1]) + '</span>' : r[1] ? '<span class="iz-chip">' + E(r[1]) + '</span>' : "") + (r[2] ? '<span class="iz-chip">' + E(r[2]) + '</span>' : "") + (r[5] ? '<span class="iz-chip">Waktu: ' + E(r[5]) + '</span>' : "") + (r[4] ? '<span class="iz-chip">Biaya: ' + E(r[4]) + '</span>' : "") + '</div>' +
    syaratHtml(r[3]) + (seed && !r[3] ? '<p class="sys">Syarat belum dicatat. Buka SSW Alfa untuk melihat persyaratan terbaru.</p>' : "") +
    '<div class="btns">' + ext(r[6] || LINK.ssw[0][1], r[6] ? "Buka halaman izin" : "Ajukan di SSW Alfa", "iz-a iz-pri") +
    '<button type="button" class="btn" data-iz="salinizin" data-i="' + i + '">Salin ringkasan</button><button type="button" class="btn" data-iz="tanya" data-i="' + i + '">Tanya Asisten</button></div></div>';
}
var HASIL = [];
function tabCari() {
  var bf = FB ? BID.filter(function (b) { return b[0] === FB; })[0] : null;
  HASIL = cariIzin(Q, FB);
  var kb = Q.trim() && window.KBLI && KBLI.has() ? KBLI.search(Q, 3) : [], br = Q.trim() ? cariBidang(Q).slice(0, 3) : [];
  return '<input class="si iz-in" id="iz-q" type="search" value="' + E(Q) + '" placeholder="Cari izin: nama, instansi, atau kata di syarat" aria-label="Cari jenis izin" autocomplete="off">' +
    (bf ? '<div class="iz-f"><b>' + E(bf[1]) + '</b><button type="button" class="chip" data-iz="lepas">Hapus saringan</button></div>' : "") +
    (br.length && !bf ? '<div class="iz-row"><small class="sys">Mungkin bidangnya:</small>' + br.map(function (b) { return '<button type="button" class="chip" data-iz="lihat" data-b="' + E(b[0]) + '">' + E(b[1]) + '</button>'; }).join("") + '</div>' : "") +
    '<p class="iz-sub">' + HASIL.length + ' izin ditemukan</p>' + (HASIL.length ? HASIL.slice(0, 25).map(kartuIzin).join("") + (HASIL.length > 25 ? '<p class="sys">Menampilkan 25 teratas. Persempit kata kunci.</p>' : "") :
      '<p class="sys">' + (KAT && KAT.length ? "Belum ketemu di katalog." : "Katalog belum diisi admin, jadi hanya contoh yang tampil.") + ' Daftar lengkap ada di SSW Alfa.</p><div class="btns">' + ext(LINK.ssw[0][1], "Buka Daftar Perizinan SSW Alfa", "iz-a iz-pri") + '</div>') +
    (kb.length ? '<h3 class="iz-h">Kode KBLI terkait</h3>' + kb.map(kartuKbli).join("") + '<div class="btns"><button type="button" class="btn" data-iz="tabkbli">Cari KBLI lebih lengkap</button></div>' : "") + catatanSumber();
}
function kartuKbli(r) {
  var rk = window.KBLI && KBLI.risk ? KBLI.risk(r) : "", RN = {r: "Risiko rendah", mr: "Risiko menengah rendah", mt: "Risiko menengah tinggi", t: "Risiko tinggi"}, u = String(r[2] || "").replace(/\s+/g, " ");
  return '<div class="iz-c"><div class="iz-ch"><b class="iz-kode">' + E(r[0]) + '</b><span>' + E(r[1]) + '</span>' + (rk ? '<span class="iz-rk iz-rk-' + rk + '">' + RN[rk] + '</span>' : "") + '</div>' +
    '<p class="sys">' + E(u.length > 170 ? u.slice(0, 168) + "…" : u) + '</p><div class="btns"><button type="button" class="send" data-iz="osskode" data-k="' + E(r[0]) + '">Salin kode &amp; buka OSS</button><button type="button" class="btn" data-iz="salinkode" data-k="' + E(r[0]) + '">Salin kode</button><button type="button" class="btn" data-iz="tanyakbli" data-k="' + E(r[0]) + '">Tanya Asisten</button></div></div>';
}
var KQ = "";
function tabKbli() {
  var ada = window.KBLI && KBLI.has(), R = ada && KQ.trim() ? KBLI.search(KQ, 8) : [], rute = rd("tk_rute", {}), n = RUTE.filter(function (x, i) { return rute[i]; }).length;
  return '<div class="iz-hero"><div><b>KBLI 2025 sudah berlaku di OSS</b><p>Pendaftaran baru memakai KBLI 2025. Perizinan yang terbit sebelumnya tetap berlaku. Untuk padanan kode lama, pakai alat konversi resmi OSS.</p></div>' +
    '<div class="iz-cta">' + ext(LINK.oss[1][1], "Konversi 2020 ke 2025", "iz-a iz-pri") + ext(LINK.oss[2][1], "Panduan konversi", "iz-a iz-pri2") + '</div></div>' +
    '<input class="si iz-in" id="iz-kq" type="search" value="' + E(KQ) + '" placeholder="Kegiatan usaha atau kode 5 digit (warung kopi, laundry, 56102)" aria-label="Cari KBLI" autocomplete="off">' +
    (!ada ? '<p class="sys">Memuat data KBLI…</p>' : KQ.trim() ? (R.length ? R.map(kartuKbli).join("") : '<p class="sys">Belum ketemu. Coba kata sehari-hari lain atau kode angka.</p>') : '<p class="sys">Ketik kegiatan usaha Anda. Tingkat risiko dan perizinan ditentukan OSS; cek hasil akhirnya di OSS.</p>') +
    '<h3 class="iz-h">Rute izin usaha <small>(' + n + ' dari ' + RUTE.length + ' langkah)</small></h3><div class="lk-bar"><i style="width:' + Math.round(n * 100 / RUTE.length) + '%"></i></div><ol class="iz-rt">' +
    RUTE.map(function (s, i) {
      var on = !!rute[i], a = s[2] === "oss" ? ext(LINK.oss[4][1], "Buka OSS", "iz-a iz-sm") : s[2] === "ssw" ? ext(LINK.ssw[0][1], "Buka SSW Alfa", "iz-a iz-sm") : s[2] === "kbli" ? '<button type="button" class="chip" data-iz="fokuskbli">Cari KBLI</button>' : "";
      return '<li class="' + (on ? "on" : "") + '"><label><input type="checkbox" data-iz="rute" data-i="' + i + '"' + (on ? " checked" : "") + '><span><b>' + E(s[0]) + '</b><small>' + E(s[1]) + '</small></span></label>' + a + '</li>';
    }).join("") + '</ol><div class="btns"><button type="button" class="btn" data-iz="ruteulang">Ulangi dari awal</button></div>' +
    '<p class="iz-note">Rute ini ringkasan umum. Urutan dan dokumen bisa berbeda menurut jenis usaha dan lokasi; ikuti petunjuk di OSS dan SSW Alfa.</p>';
}

/* Permohonan saya + Dompet Izin (hanya di perangkat) */
var STS = ["Diajukan", "Diproses", "Perlu perbaikan", "Selesai", "Ditolak"];
function ada16(o) { return Object.keys(o).some(function (k) { return /\d{16}/.test(String(o[k]).replace(/[\s.-]/g, "")); }); }
function selisihTeks(t) {
  if (!t) return "belum pernah dicek"; var d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? "dicek hari ini" : "dicek " + d + " hari lalu";
}
function tabSaya() {
  var P = rd("tk_ssw", []), W0 = rd("tk_dompet", []), W = W0.map(function (w, i) { return {w: w, i: i}; });
  W.sort(function (a, b) { return String(a.w.tgl || "9999").localeCompare(String(b.w.tgl || "9999")); });
  return '<div class="iz-hero"><div><b>Catatan pribadi Anda</b><p>Disimpan hanya di perangkat ini, tidak dikirim ke server. Jangan mencatat NIK, kata sandi, atau kode OTP.</p></div></div>' +
    '<h3 class="iz-h">Permohonan saya di SSW Alfa <small>(' + P.length + ')</small></h3>' +
    '<details class="iz-fm"' + (P.length ? "" : " open") + '><summary>Catat permohonan baru</summary><div class="iz-fg"><label>Nomor permohonan<input class="si" id="ps-no" maxlength="40" autocomplete="off"></label><label>Jenis izin / layanan<input class="si" id="ps-jn" maxlength="80" autocomplete="off"></label>' +
    '<label>Bidang<select class="si" id="ps-bd"><option value="">(pilih)</option>' + BID.map(function (b) { return '<option>' + E(b[1]) + '</option>'; }).join("") + '</select></label><label>Tanggal diajukan<input class="si" type="date" id="ps-tg" value="' + hariIni() + '"></label>' +
    '<label class="iz-w2">Catatan<input class="si" id="ps-ct" maxlength="140" autocomplete="off"></label></div><div class="btns"><button type="button" class="send" data-iz="psadd">Simpan catatan</button></div></details>' +
    (P.length ? P.map(function (p, i) {
      return '<div class="iz-c"><div class="iz-ch"><b>' + E(p.jn || "(tanpa jenis)") + '</b><span class="iz-st iz-st' + STS.indexOf(p.st) + '">' + E(p.st) + '</span></div><div class="iz-meta">' + (p.no ? '<span class="iz-chip">No. ' + E(p.no) + '</span>' : "") + (p.bd ? '<span class="iz-chip">' + E(p.bd) + '</span>' : "") + '<span class="iz-chip">Diajukan ' + E(p.tg) + '</span><span class="iz-chip">' + selisihTeks(p.cek) + '</span></div>' + (p.ct ? '<p class="sys">' + E(p.ct) + '</p>' : "") +
        '<div class="btns"><select class="si iz-sel" data-iz="psst" data-i="' + i + '" aria-label="Ubah status">' + STS.map(function (s) { return '<option' + (s === p.st ? " selected" : "") + '>' + s + '</option>'; }).join("") + '</select>' +
        ext(LINK.ssw[1][1], "Cek di SSW Alfa", "iz-a iz-pri") + (p.no ? '<button type="button" class="btn" data-iz="psno" data-i="' + i + '">Salin nomor</button>' : "") + '<button type="button" class="btn" data-iz="pscek" data-i="' + i + '">Sudah saya cek</button><button type="button" class="btn" data-iz="psdel" data-i="' + i + '">Hapus</button></div></div>';
    }).join("") + '<p class="iz-note">Status di sini Anda isi sendiri. Status resmi hanya ada di SSW Alfa lewat Cek Permohonan.</p>' : '<p class="sys">Belum ada catatan. Setelah mengajukan di SSW Alfa, catat nomornya di sini agar mudah dicek.</p>') +
    '<h3 class="iz-h">Dompet Izin <small>(' + W.length + ')</small></h3><details class="iz-fm"' + (W.length ? "" : " open") + '><summary>Catat izin yang sudah dimiliki</summary><div class="iz-fg"><label>Nama izin<input class="si" id="dw-nm" maxlength="80" autocomplete="off"></label><label>Nomor izin / NIB<input class="si" id="dw-no" maxlength="40" autocomplete="off"></label>' +
    '<label>Berlaku sampai<input class="si" type="date" id="dw-tg"></label><label>Catatan<input class="si" id="dw-ct" maxlength="140" autocomplete="off"></label></div><div class="btns"><button type="button" class="send" data-iz="dwadd">Simpan izin</button></div></details>' +
    (W.length ? W.map(function (x) {
      var w = x.w, i = x.i, d = w.tgl ? selisih(w.tgl) : null;
      var cls = d == null ? "" : d < 0 ? "x" : d <= 30 ? "k" : d <= 90 ? "w" : "g", tx = d == null ? "Tanpa batas waktu" : d < 0 ? "Sudah berakhir " + (-d) + " hari lalu" : d === 0 ? "Berakhir hari ini" : d + " hari lagi";
      return '<div class="iz-c"><div class="iz-ch"><b>' + E(w.nm) + '</b><span class="iz-dd iz-dd-' + cls + '">' + tx + '</span></div><div class="iz-meta">' + (w.no ? '<span class="iz-chip">No. ' + E(w.no) + '</span>' : "") + (w.tgl ? '<span class="iz-chip">Berlaku s.d. ' + E(w.tgl) + '</span>' : "") + '</div>' + (w.ct ? '<p class="sys">' + E(w.ct) + '</p>' : "") +
        '<div class="btns">' + (w.tgl ? '<button type="button" class="btn" data-iz="dwics" data-i="' + i + '">Pengingat kalender (.ics)</button>' : "") + '<button type="button" class="btn" data-iz="dwdel" data-i="' + i + '">Hapus</button></div></div>';
    }).join("") + '<p class="iz-note">Pengingat kalender memasang tanda 30 hari dan 7 hari sebelum izin berakhir. Cek aturan perpanjangan di SSW Alfa atau OSS.</p>' : '<p class="sys">Belum ada izin dicatat. Catat tanggal berakhirnya agar tidak lupa memperpanjang.</p>');
}
function tabLink() {
  function grup(t, L) { return '<h3 class="iz-h">' + t + '</h3><div class="iz-lk">' + L.map(function (l) { return '<a class="iz-l" href="' + E(l[1]) + '" target="_blank" rel="noopener noreferrer"><b>' + E(l[0]) + ' <span aria-hidden="true">&#8599;</span></b><small>' + E(l[2]) + '</small><span class="iz-sr">Situs resmi, tab baru</span></a>'; }).join("") + '</div>'; }
  return '<div class="iz-hero"><div><b>Tautan resmi</b><p>Semua tautan membuka situs resmi di tab baru. Takok tidak ikut masuk ke akun Anda dan tidak melihat apa yang Anda isi di sana. Tautan diperiksa pada 14 November 2026; bila ada yang berubah, kabari admin.</p></div></div>' +
    grup("OSS (perizinan berusaha)", LINK.oss) + grup("SSW Alfa Surabaya", LINK.ssw) +
    '<p class="iz-note">Mengapa tidak tersambung otomatis? OSS dan SSW Alfa tidak membuka API untuk aplikasi lain, dan daftar perizinan SSW Alfa dimuat lewat skrip di halaman mereka. Karena itu Takok menaut ke situs resmi dan menyimpan katalog yang dirawat admin, bukan salinan otomatis yang bisa usang.</p>';
}
var TABS = [["bid", "Bidang SSW"], ["cari", "Cari izin"], ["kbli", "KBLI & OSS"], ["saya", "Catatan saya"], ["link", "Tautan resmi"]];
function badan() { return TAB === "bid" ? tabBid() : TAB === "cari" ? tabCari() : TAB === "kbli" ? tabKbli() : TAB === "saya" ? tabSaya() : tabLink(); }
function lukis(fokus) {
  if (!O) return; $("iz-b").innerHTML = badan();
  [].forEach.call(O.querySelectorAll("[data-tab]"), function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === TAB)); b.classList.toggle("on", b.dataset.tab === TAB); });
  if (fokus) { var i = $(fokus); if (i) { i.focus(); try { var l = i.value.length; i.setSelectionRange(l, l); } catch (e) {} } }
}
function buka(tab, q) {
  if (O) { if (tab) { TAB = tab; lukis(); } return; }
  opener = D.activeElement; if (tab && TABS.some(function (t) { return t[0] === tab; })) TAB = tab; if (typeof q === "string") { if (TAB === "kbli") KQ = q; else Q = q; }
  O = D.createElement("div"); O.id = "iz"; O.setAttribute("role", "dialog"); O.setAttribute("aria-modal", "true"); O.setAttribute("aria-label", "Perizinan Resmi");
  O.innerHTML = '<div class="iz-w"><div class="iz-top"><div><small>Takok &middot; OSS &middot; SSW Alfa</small><h2>Perizinan Resmi</h2></div><button type="button" class="btn" data-iz="tutup">Tutup</button></div>' +
    '<div class="iz-tabs" role="tablist" aria-label="Bagian perizinan">' + TABS.map(function (t) { return '<button type="button" role="tab" class="chip" data-tab="' + t[0] + '" aria-selected="false">' + t[1] + '</button>'; }).join("") + '</div><div id="iz-b" aria-live="polite"></div></div>';
  D.body.appendChild(O); D.body.style.overflow = "hidden"; lukis();
  muatKatalog().then(function () { if (O) { var a = D.activeElement; var id = a && a.id; lukis(id && /^iz-/.test(id) ? id : ""); } });
  if (window.KBLI && !KBLI.has()) KBLI.ready().then(function () { if (O && (TAB === "kbli" || TAB === "cari")) { var a = D.activeElement; lukis(a && /^iz-/.test(a.id) ? a.id : ""); } });
  O.addEventListener("click", klik); O.addEventListener("change", ubah); O.addEventListener("input", ketik); O.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); tutup(); } });
  var f = O.querySelector("[data-iz=tutup]"); if (f) f.focus();
}
function tutup() { if (!O) return; O.remove(); O = null; D.body.style.overflow = ""; try { if (opener && D.contains(opener)) opener.focus(); } catch (e) {} }
var T0 = null;
function ketik(e) {
  var t = e.target; if (!t || !t.id) return;
  if (t.id !== "iz-q" && t.id !== "iz-qb" && t.id !== "iz-kq") return;
  if (t.id === "iz-q") Q = t.value; else if (t.id === "iz-qb") QB = t.value; else KQ = t.value;
  clearTimeout(T0); T0 = setTimeout(function () { lukis(t.id); }, 180);
}
function ringkas(r) { var b = bidFor(r[1]); return r[0] + (b ? "\nBidang: " + b[2] : "") + (r[2] ? "\nInstansi: " + r[2] : "") + (r[3] ? "\nSyarat: " + r[3].replace(/\s*;\s*/g, "; ") : "") + (r[4] ? "\nBiaya: " + r[4] : "") + (r[5] ? "\nWaktu: " + r[5] : "") + "\nSumber: SSW Alfa Surabaya (cek ulang di situs resmi)"; }
function ics(w) {
  var d = w.tgl.replace(/-/g, ""), uid = "izin-" + w.id + "@takok", now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  function ev(tgl, ju, k) { var x = new Date(tgl + "T00:00:00Z"), y = new Date(x.getTime() + 864e5); return ["BEGIN:VEVENT", "UID:" + k + uid, "DTSTAMP:" + now, "DTSTART;VALUE=DATE:" + tgl.replace(/-/g, ""), "DTEND;VALUE=DATE:" + y.toISOString().slice(0, 10).replace(/-/g, ""), "SUMMARY:" + ju.replace(/[,;\n]/g, " "), "DESCRIPTION:Cek aturan perpanjangan di SSW Alfa atau OSS.", "END:VEVENT"]; }
  function kurang(n) { return new Date(new Date(w.tgl + "T00:00:00Z").getTime() - n * 864e5).toISOString().slice(0, 10); }
  var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Takok//Dompet Izin//ID", "CALSCALE:GREGORIAN"].concat(ev(w.tgl, "Izin berakhir: " + w.nm, "a"), ev(kurang(30), "30 hari lagi: " + w.nm + " berakhir", "b"), ev(kurang(7), "7 hari lagi: " + w.nm + " berakhir", "c"), ["END:VCALENDAR"]);
  var a = D.createElement("a"); a.href = URL.createObjectURL(new Blob([L.join("\r\n")], {type: "text/calendar;charset=utf-8"})); a.download = "pengingat-izin.ics"; D.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function tanyaBot(t) { tutup(); if (window.openAsisten) { openAsisten(); setTimeout(function () { if (window.askAsisten) askAsisten(t); }, 160); } }
function ubah(e) {
  var t = e.target; if (t.dataset.iz === "rute") { var r = rd("tk_rute", {}); if (t.checked) r[t.dataset.i] = 1; else delete r[t.dataset.i]; wr("tk_rute", r); lukis(); }
  else if (t.dataset.iz === "psst") { var P = rd("tk_ssw", []), p = P[+t.dataset.i]; if (p && STS.indexOf(t.value) > -1) { p.st = t.value; wr("tk_ssw", P); lukis(); } }
}
function klik(e) {
  var b = e.target.closest && e.target.closest("[data-tab],[data-iz]"); if (!b) return;
  if (b.dataset.tab) { TAB = b.dataset.tab; lukis(); return; }
  var a = b.dataset.iz, i = +b.dataset.i;
  if (a === "tutup") tutup();
  else if (a === "lihat") { FB = b.dataset.b; TAB = "cari"; Q = ""; lukis("iz-q"); }
  else if (a === "lepas") { FB = ""; lukis("iz-q"); }
  else if (a === "tabkbli") { KQ = Q; TAB = "kbli"; lukis("iz-kq"); }
  else if (a === "fokuskbli") { var k = $("iz-kq"); if (k) k.focus(); }
  else if (a === "salinizin") salin(ringkas(HASIL[i]), "Ringkasan izin tersalin.");
  else if (a === "tanya") tanyaBot("Syarat dan cara mengurus " + HASIL[i][0]);
  else if (a === "salinkode") salin(b.dataset.k, "Kode KBLI " + b.dataset.k + " tersalin.");
  else if (a === "tanyakbli") { var r = window.KBLI && KBLI.byKode(b.dataset.k); tanyaBot("Apa perizinan untuk KBLI " + b.dataset.k + (r ? " " + r[1] : "") + "?"); }
  else if (a === "osskode") { salin(b.dataset.k, "Kode " + b.dataset.k + " tersalin. Tempel di kolom pencarian KBLI OSS."); window.open(LINK.oss[0][1], "_blank", "noopener,noreferrer"); }
  else if (a === "ruteulang") { if (confirm("Ulangi dari awal? Centang rute dihapus.")) { wr("tk_rute", {}); lukis(); } }
  else if (a === "psadd") {
    var o = {no: $("ps-no").value.trim(), jn: $("ps-jn").value.trim(), bd: $("ps-bd").value, tg: $("ps-tg").value || hariIni(), ct: $("ps-ct").value.trim(), st: "Diajukan", cek: 0, id: Date.now()};
    if (!o.no && !o.jn) { toast("Isi nomor permohonan atau jenis izin."); return; }
    if (ada16(o)) { toast("Jangan mencatat NIK (16 digit). Hapus angka tersebut."); return; }
    var P = rd("tk_ssw", []); if (P.length >= 30) { toast("Maksimal 30 catatan. Hapus yang lama dulu."); return; } P.unshift(o); wr("tk_ssw", P); lukis(); toast("Catatan permohonan disimpan di perangkat ini.");
  }
  else if (a === "psno") { var Pp = rd("tk_ssw", []); if (Pp[i]) salin(Pp[i].no, "Nomor permohonan tersalin."); }
  else if (a === "pscek") { var Pc = rd("tk_ssw", []); if (Pc[i]) { Pc[i].cek = Date.now(); wr("tk_ssw", Pc); lukis(); } }
  else if (a === "psdel") { if (confirm("Hapus catatan ini?")) { var Pd = rd("tk_ssw", []); Pd.splice(i, 1); wr("tk_ssw", Pd); lukis(); } }
  else if (a === "dwadd") {
    var w = {nm: $("dw-nm").value.trim(), no: $("dw-no").value.trim(), tgl: $("dw-tg").value, ct: $("dw-ct").value.trim(), id: Date.now()};
    if (!w.nm) { toast("Isi nama izin."); return; } if (ada16(w)) { toast("Jangan mencatat NIK (16 digit)."); return; }
    var W = rd("tk_dompet", []); if (W.length >= 30) { toast("Maksimal 30 izin."); return; } W.push(w); wr("tk_dompet", W); lukis(); toast("Izin dicatat di perangkat ini.");
  }
  else if (a === "dwdel") { if (confirm("Hapus izin ini dari catatan?")) { var Wd = rd("tk_dompet", []); Wd.splice(i, 1); wr("tk_dompet", Wd); lukis(); } }
  else if (a === "dwics") { var Wi = rd("tk_dompet", [])[i]; if (Wi && Wi.tgl) ics(Wi); }
}
D.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#t12")) buka(); });
window.Izin = {buka: buka, tutup: tutup, bidang: BID, rows: function () { return semuaIzin(); }, muat: muatKatalog, reset: function () { KAT = null; }, bidFor: bidFor, links: LINK};
})();
