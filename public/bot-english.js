"use strict";
/* Versi 103: Kamus layanan Indonesia-Inggris untuk investor dan warga asing.
   /english            -> istilah penting + frasa berguna di loket (bisa disalin/ditampilkan ke petugas).
   /english nib        -> cari istilah (Indonesia atau Inggris).
   Semua di browser, tanpa layanan terjemahan luar. Istilah berupa padanan umum, bukan terjemahan resmi. */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var ISTILAH = [
  ["NIB", "Nomor Induk Berusaha", "Business Identification Number (registration number issued via OSS)"],
  ["OSS", "Online Single Submission", "Integrated online business licensing system"],
  ["KBLI", "Klasifikasi Baku Lapangan Usaha Indonesia", "Indonesian Standard Industrial Classification of business activities"],
  ["NPWP", "Nomor Pokok Wajib Pajak", "Taxpayer Identification Number"],
  ["KTP", "Kartu Tanda Penduduk", "Resident identity card"],
  ["KK", "Kartu Keluarga", "Family card"],
  ["PBG", "Persetujuan Bangunan Gedung", "Building construction approval (replaced the IMB building permit)"],
  ["IMB", "Izin Mendirikan Bangunan", "Building permit (former name, now PBG)"],
  ["SLF", "Sertifikat Laik Fungsi", "Certificate of building functionality"],
  ["AMDAL", "Analisis Mengenai Dampak Lingkungan", "Environmental impact assessment"],
  ["UKL-UPL", "Upaya Pengelolaan dan Pemantauan Lingkungan", "Environmental management and monitoring effort statement"],
  ["SKRD", "Surat Ketetapan Retribusi Daerah", "Regional levy assessment letter"],
  ["Retribusi", "Retribusi daerah", "Regional service fee / levy"],
  ["Izin reklame", "Izin penyelenggaraan reklame", "Advertising (signage) permit"],
  ["SIP", "Surat Izin Praktik", "Practice license (for health workers)"],
  ["Pemohon", "Orang yang mengajukan izin", "Applicant"],
  ["Persyaratan", "Dokumen/berkas yang harus disiapkan", "Requirements / documents to prepare"],
  ["Berkas", "Dokumen permohonan", "Application documents"],
  ["Antrean", "Nomor urut layanan", "Queue / queue number"],
  ["Loket", "Meja layanan", "Service counter"],
  ["Penanaman modal", "Investasi", "Investment (capital investment)"],
  ["Perizinan", "Layanan izin", "Licensing"],
  ["Pengaduan", "Laporan keluhan layanan", "Complaint / grievance"],
  ["Pengambilan berkas", "Mengambil dokumen yang sudah jadi", "Document collection / pick-up"]
];
var FRASA = [
  ["I would like to apply for a business license.", "Saya ingin mengurus izin usaha."],
  ["Which documents do I need to bring?", "Dokumen apa saja yang perlu saya bawa?"],
  ["How long does the process take?", "Berapa lama prosesnya?"],
  ["Is there a fee for this service?", "Apakah ada biaya untuk layanan ini?"],
  ["Can you check the status of my application?", "Bisakah Anda cek status permohonan saya?"],
  ["Which counter should I go to?", "Saya harus ke loket yang mana?"],
  ["I have an appointment (booking) today.", "Saya ada janji (booking) hari ini."],
  ["Could you speak a little slower, please?", "Bisakah Anda bicara sedikit lebih pelan?"]
];
function cari(q) {
  q = q.toLowerCase(); return ISTILAH.filter(function (x) { return (x[0] + " " + x[1] + " " + x[2]).toLowerCase().indexOf(q) >= 0; });
}
function barisIstilah(a) { return a.map(function (x) { return '<p style="margin:5px 0"><b>' + E(x[0]) + '</b> – ' + E(x[1]) + '<br><small>' + E(x[2]) + '</small></p>'; }).join(""); }
function utama() {
  return B.bot("Indonesian–English service glossary. Istilah penting dan frasa untuk di loket:", '<div class="bc2"><b>Istilah</b>' + barisIstilah(ISTILAH.slice(0, 12)) +
    '<div class="bch"><button type="button" data-en="lagi">Istilah lainnya</button></div><b>Frasa berguna di loket</b>' +
    FRASA.map(function (f, i) { return '<p style="margin:6px 0">' + E(f[0]) + '<br><small>' + E(f[1]) + '</small> <button type="button" class="bsp" data-en="salin" data-i="' + i + '">Salin</button></p>'; }).join("") + '</div>', 400, true);
}
function pencarian(q) {
  var h = cari(q);
  return h.length ? B.bot('"' + q + '":', '<div class="bc2">' + barisIstilah(h.slice(0, 8)) + '</div>', 300, true) : B.bot("Istilah \"" + q + "\" belum ada di kamus. Coba /english untuk daftar lengkap, atau tanyakan langsung ke Asisten.");
}
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-en]"); if (!b || !D.getElementById("bm") || !D.getElementById("bm").contains(b)) return;
  if (b.dataset.en === "lagi") { b.remove(); B.bot("Istilah lainnya:", '<div class="bc2">' + barisIstilah(ISTILAH.slice(12)) + '</div>', 300, true); }
  else if (b.dataset.en === "salin") {
    var f = FRASA[+b.dataset.i]; if (!f) return; var t = f[0] + " (" + f[1] + ")";
    var ok = function () { if (window.toast) toast("Frasa disalin."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { if (window.toast) toast(t); }); else if (window.toast) toast(t);
  }
});
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  var m = /^\/(english|inggris|en)\b\s*(.*)$/i.exec(String(t).trim());
  if (m) return m[2].trim() ? pencarian(m[2].trim()) : utama();
  return pre0 ? pre0(t, s) : null;
};
window.TKEN = {cari: cari};
})();
