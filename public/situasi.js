"use strict";
/* Versi 54: "Mau urus apa?" - penunjuk layanan berdasarkan SITUASI hidup/usaha (bukan nama izin).
   Pengunjung sering tidak tahu nama izinnya. Mereka memilih situasi (memulai usaha, anak lahir, menikah, bangun rumah, ...), lalu Takok menampilkan
   layanan yang COCOK dari data loket yang sudah dimuat (pencarian UG.cari), lengkap dengan loket, zona, biaya/proses bila ada, dan status verifikasi.
   Layanan bisa dicentang lalu disusun jadwalnya lewat Perencana Kunjungan. Tanpa perubahan server; tidak ada data yang dikirim.
   Isi di sini hanya KATA KUNCI pencarian per situasi. Layanan yang tampil sepenuhnya dari data loket (tidak ada daftar izin karangan);
   topik tanpa hasil disembunyikan, dan bila tak ada hasil sama sekali, layar jujur mengatakannya. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var LAST = "tk_sit_last", MAKS = 6;
/* [id, ikon, judul, pengantar, [[label topik, kata kunci], ...]] */
var S = [
  ["usaha", "\uD83C\uDFEA", "Memulai usaha", "Dari mendaftarkan usaha sampai izin lokasi dan reklame.", [["Pendaftaran usaha / NIB", "NIB|nomor induk berusaha|tanda daftar usaha"], ["Izin lokasi dan lingkungan", "izin lokasi|izin lingkungan"], ["Reklame dan papan nama", "reklame|papan nama"], ["Sertifikat standar dan izin usaha", "sertifikat standar|izin usaha"]]],
  ["makan", "\uD83C\uDF5C", "Buka kafe atau rumah makan", "Izin usaha makanan, kebersihan, halal, dan parkir.", [["Izin usaha makanan", "restoran|kafe|rumah makan|katering"], ["Higiene dan sanitasi", "higiene|sanitasi|laik sehat"], ["Sertifikat halal", "halal"], ["Lahan parkir", "parkir"]]],
  ["bangun", "\uD83C\uDFE0", "Bangun atau renovasi", "Persetujuan bangunan, kelaikan, dan kesesuaian tata ruang.", [["Persetujuan bangunan", "persetujuan bangunan|PBG|IMB|mendirikan bangunan"], ["Kelaikan fungsi", "laik fungsi|SLF"], ["Tata ruang dan lahan", "tata ruang|kesesuaian ruang|KKPR"]]],
  ["duduk", "\uD83E\uDEAA", "KTP, KK, dan pindah", "Dokumen kependudukan dan administrasi pindah datang.", [["KTP", "KTP|kartu tanda penduduk"], ["Kartu Keluarga", "kartu keluarga"], ["Pindah atau datang", "pindah|datang|perpindahan"]]],
  ["lahir", "\uD83D\uDC76", "Anak lahir", "Akta kelahiran, identitas anak, dan pembaruan KK.", [["Akta kelahiran", "akta kelahiran|kelahiran"], ["Kartu Identitas Anak", "kartu identitas anak|KIA"], ["Kartu Keluarga", "kartu keluarga"]]],
  ["nikah", "\uD83D\uDC8D", "Menikah", "Pengantar nikah, akta perkawinan, dan perubahan data KK.", [["Nikah dan perkawinan", "nikah|pernikahan|perkawinan"], ["Perubahan Kartu Keluarga", "kartu keluarga"]]],
  ["jalan", "\uD83D\uDE97", "Kendaraan dan transportasi", "Parkir, angkutan, dan urusan kendaraan.", [["Parkir", "parkir"], ["Angkutan dan trayek", "angkutan|trayek|taksi|ojek"], ["Kendaraan", "kendaraan|uji kir"]]],
  ["sehat", "\uD83C\uDFE5", "Kesehatan dan praktik", "Apotek, klinik, praktik tenaga kesehatan.", [["Apotek, klinik, dan laboratorium", "apotek|klinik|rumah sakit|laboratorium"], ["Praktik tenaga kesehatan", "praktik|tenaga kesehatan"], ["Laik sehat", "laik sehat|higiene"]]],
  ["acara", "\uD83C\uDF89", "Acara dan keramaian", "Izin acara, reklame sementara, dan pemakaian fasilitas.", [["Keramaian dan acara", "keramaian|acara|pertunjukan"], ["Spanduk dan reklame", "reklame|spanduk|baliho"], ["Pemakaian fasilitas", "sewa|pemakaian|pakai lahan"]]],
  ["hilang", "\uD83D\uDCC4", "Dokumen hilang atau rusak", "Penggantian dokumen dan surat keterangan.", [["Penggantian dokumen", "hilang|pengganti|duplikat|rusak"], ["Surat keterangan", "surat keterangan"]]]
];
var OV = null, OPEN = null, PILIH = {}, HASIL = [];
function simpanLast(id) { try { localStorage.setItem(LAST, id); } catch (e) {} }
function last() { try { return localStorage.getItem(LAST) || ""; } catch (e) { return ""; } }
function urut() { var l = last(); return S.slice().sort(function (a, b) { return (b[0] === l) - (a[0] === l); }); }
function siap() { return !!(window.UG && UG.cari && window.LOCS && LOCS.length); }

/* ---------- kartu di beranda ---------- */
function lukisBeranda() {
  var o = $("sit"); if (o) o.remove();
  var t1 = $("t1"), nav = t1 && t1.parentNode; if (!nav || !nav.parentNode) return;
  var c = D.createElement("section"); c.id = "sit"; c.setAttribute("aria-label", "Mau urus apa");
  c.innerHTML = '<div class="sit-h"><b>Mau urus apa hari ini?</b><small>Pilih situasi Anda, Takok carikan layanannya.</small></div><div class="sit-bar" role="list">' +
    urut().map(function (s) { return '<button type="button" role="listitem" class="sit-chip" data-sit="' + s[0] + '"><span aria-hidden="true">' + s[1] + '</span>' + E(s[2]) + '</button>'; }).join("") + '</div>';
  nav.parentNode.insertBefore(c, nav);
}

/* ---------- hasil per situasi ---------- */
function norm(t) { return " " + String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
/* Kecocokan ketat: kata kunci harus ada (awal kata) di NAMA layanan, nama loket, atau uraian; isi daftar syarat tidak dihitung
   (kata seperti "KTP pemohon" ada di syarat hampir semua izin, sehingga akan menampilkan layanan yang tidak relevan). */
function cocok(x, alt) { return (norm(x.jenis) + norm(x.loket) + norm(x.uraian)).indexOf(norm(alt)) > -1; }
function kumpul(s) {
  var seen = {}, out = [];
  s[4].forEach(function (t) {
    var r = [];
    t[1].split("|").forEach(function (alt) {
      UG.cari(alt).forEach(function (x) { var id = x.k + "|" + (x.jenis || ""); if (!seen[id] && r.length < 3 && cocok(x, alt)) { seen[id] = 1; r.push(x); } });
    });
    if (r.length) out.push({t: t[0], r: r});
  });
  return out;
}
function kartu(x) {
  var m = [];
  if (x.biaya) m.push("Biaya: <b>" + E(x.biaya) + "</b>"); if (x.waktu) m.push("Proses: <b>" + E(x.waktu) + "</b>");
  var v = x.ver ? (x.umur > 180 ? '<span class="ug-v ug-w">Sudah lama dicek</span>' : '<span class="ug-v">Terverifikasi</span>') : '<span class="ug-v ug-n">Panduan umum</span>', ck = PILIH[x.k] ? " checked" : "";
  return '<li class="sit-r"><div class="ug-rt"><b>' + E(x.jenis || x.loket) + '</b> ' + v + '</div><small class="sys">' + E(x.lokasi) + " &middot; " + E(x.loket) + (x.zona ? " &middot; " + E(x.zona) : "") + "</small>" + (m.length ? '<div class="sy-meta">' + m.map(function (z) { return '<span class="sy-m">' + z + "</span>"; }).join("") + "</div>" : "") +
    '<div class="btns"><button type="button" class="send" data-sit="buka" data-k="' + E(x.k) + '">Lihat loket &amp; syarat</button><label class="sit-pl"><input type="checkbox" data-sit="pil" data-k="' + E(x.k) + '"' + ck + '> Masukkan ke jadwal</label></div></li>';
}
function jumlah() { return Object.keys(PILIH).length; }
function lukisIsi() {
  var s = OPEN, box = $("sit-isi"); if (!box) return;
  if (!siap()) { box.innerHTML = '<p class="sys">Data layanan belum selesai dimuat. Tunggu sebentar lalu coba lagi.</p><div class="btns"><button type="button" class="send" data-sit="ulang">Coba lagi</button></div>'; return; }
  HASIL = kumpul(s);
  if (!HASIL.length) { box.innerHTML = '<p class="sys">Belum ada layanan yang cocok untuk situasi ini di data loket Takok. Bukan berarti layanannya tidak ada. Coba pencarian bebas atau tanya Asisten.</p><div class="btns"><button type="button" class="send" data-sit="cari">Cari izin</button></div>'; return; }
  box.innerHTML = HASIL.map(function (g) { return '<h3 class="sit-t">' + E(g.t) + '</h3><ul class="ug-l">' + g.r.map(kartu).join("") + "</ul>"; }).join("") +
    '<p class="sys">Daftar ini dicocokkan otomatis dari data loket, jadi bukan daftar wajib. Cek status verifikasi di tiap layanan dan cocokkan ke loket resmi sebelum datang.</p>';
  sinkron();
}
function sinkron() {
  var n = jumlah(), b = $("sit-rc"); if (!b) return;
  b.disabled = !n; b.textContent = n ? "Susun jadwal kunjungan (" + n + ")" : "Pilih layanan untuk disusun jadwalnya";
}
function buka(id) {
  var s = S.filter(function (z) { return z[0] === id; })[0]; if (!s) return; tutup(); OPEN = s; PILIH = {}; simpanLast(id);
  OV = D.createElement("div"); OV.className = "pn-ov sit-ov"; OV.setAttribute("role", "dialog"); OV.setAttribute("aria-modal", "true"); OV.setAttribute("aria-label", s[2]);
  OV.innerHTML = '<div class="pn-box sit-box"><div class="au-h"><b>' + s[1] + " " + E(s[2]) + '</b><button type="button" class="au-x" data-sit="x" aria-label="Tutup">&times;</button></div><p class="sys">' + E(s[3]) + '</p><div id="sit-isi" aria-live="polite"></div>' +
    '<div class="btns sit-ft"><button type="button" class="send" id="sit-rc" data-sit="rencana" disabled>Pilih layanan untuk disusun jadwalnya</button><button type="button" class="btn" data-sit="booking">Booking Kunjungan</button></div></div>';
  D.body.appendChild(OV); lukisIsi(); var x = OV.querySelector("[data-sit=x]"); if (x) x.focus(); lukisBeranda();
}
function tutup() { if (OV) { OV.remove(); OV = null; } }
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && OV) { e.stopPropagation(); tutup(); } }, true);
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-sit]"); if (!b) return; var a = b.dataset.sit;
  if (S.some(function (z) { return z[0] === a; })) return buka(a);
  if (a === "x") tutup();
  else if (a === "ulang") lukisIsi();
  else if (a === "cari") { tutup(); if (window.UG) UG.buka(); }
  else if (a === "buka") { var k = b.dataset.k; tutup(); if (window.openKey) openKey(k); }
  else if (a === "booking") { tutup(); var t = $("t8"); if (t) t.click(); }
  else if (a === "rencana") { var ks = Object.keys(PILIH); if (ks.length && window.Rencana) { tutup(); Rencana.buka(ks); } }
});
D.addEventListener("change", function (e) {
  var c = e.target.closest && e.target.closest("[data-sit=pil]"); if (!c) return;
  if (c.checked) { if (jumlah() >= MAKS) { c.checked = false; if (window.toast) toast("Maksimal " + MAKS + " layanan per jadwal."); return; } PILIH[c.dataset.k] = 1; } else delete PILIH[c.dataset.k];
  sinkron();
});
function mulai() { lukisBeranda(); if (!$("sit")) setTimeout(lukisBeranda, 800); }
if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", function () { setTimeout(mulai, 350); }); else setTimeout(mulai, 350);
window.Situasi = {buka: buka, daftar: function () { return S.map(function (s) { return s[0]; }); }, _kumpul: function (id) { var s = S.filter(function (z) { return z[0] === id; })[0]; return s && siap() ? kumpul(s) : []; }};
})();
