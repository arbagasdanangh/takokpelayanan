"use strict";
/* Versi 52 (lanjutan): Tanya Pintar. Tanpa perubahan server; semua berjalan di peramban.
   1. Kamus Istilah: /arti di Asisten (mis. /arti NIB, atau "apa itu KBLI") dan chip "Arti istilah" di kolom Tanya Admin.
   2. Penyusun pertanyaan di kolom Tanya Admin: kerangka siap isi (syarat, biaya, status berkas, kendala, jadwal).
   3. Pemeriksa pesan: pengingat lembut (cukup detail, tanpa NIK/OTP/kata sandi, tidak huruf besar semua). Tidak memblokir pengiriman.
   4. Draf otomatis: tulisan di kolom Tanya Admin tersimpan sementara di perangkat dan dihapus saat terkirim atau keluar. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };

/* ---------- Kamus Istilah ---------- */
var K0 = [
  ["NIB", "Nomor Induk Berusaha", "Nomor identitas pelaku usaha yang diterbitkan lewat sistem OSS. Biasanya ini langkah pertama sebelum mengurus izin usaha lainnya.", "mau bikin NIB"],
  ["OSS", "Online Single Submission", "Sistem elektronik terintegrasi untuk perizinan berusaha. Pendaftaran NIB dan banyak izin usaha dilakukan lewat sistem ini.", "mau bikin NIB"],
  ["KBLI", "Klasifikasi Baku Lapangan Usaha Indonesia", "Daftar kode kegiatan usaha. Kode ini dipilih saat mendaftar NIB agar jenis usaha Anda tercatat dengan benar.", "/kbli"],
  ["PBG", "Persetujuan Bangunan Gedung", "Persetujuan untuk membangun atau mengubah bangunan. PBG menggantikan IMB.", "/izin pbg rumah"],
  ["IMB", "Izin Mendirikan Bangunan", "Nama izin bangunan yang lama. Kini digantikan oleh PBG.", "/izin pbg rumah"],
  ["SLF", "Sertifikat Laik Fungsi", "Keterangan bahwa bangunan layak dan aman dipakai sesuai fungsinya.", "sertifikat laik fungsi"],
  ["NPWP", "Nomor Pokok Wajib Pajak", "Nomor identitas wajib pajak yang dipakai untuk urusan perpajakan.", "NPWP"],
  ["NIK", "Nomor Induk Kependudukan", "Nomor identitas 16 digit di KTP. Jangan dikirim lengkap lewat chat; cukup tunjukkan di loket.", ""],
  ["KTP-el", "Kartu Tanda Penduduk elektronik", "Kartu identitas penduduk dengan cip elektronik.", "KTP elektronik"],
  ["KK", "Kartu Keluarga", "Dokumen yang memuat data anggota satu keluarga.", "kartu keluarga"],
  ["KIA", "Kartu Identitas Anak", "Kartu identitas untuk anak di bawah 17 tahun.", "KIA kartu identitas anak"],
  ["SKCK", "Surat Keterangan Catatan Kepolisian", "Surat dari kepolisian tentang catatan kepolisian seseorang, sering diminta untuk melamar kerja.", "SKCK"],
  ["PTSP", "Pelayanan Terpadu Satu Pintu", "Layanan yang menggabungkan pengurusan berbagai perizinan di satu tempat.", ""],
  ["MPP", "Mal Pelayanan Publik", "Satu lokasi yang menampung banyak instansi pelayanan publik, sehingga urusan bisa selesai dalam satu kunjungan.", "mpp"],
  ["SKM", "Survei Kepuasan Masyarakat", "Survei penilaian warga atas layanan. Hasilnya dihitung menjadi IKM (Indeks Kepuasan Masyarakat).", "survei kepuasan"],
  ["BPJS", "Badan Penyelenggara Jaminan Sosial", "Badan penyelenggara jaminan kesehatan dan ketenagakerjaan.", "BPJS kesehatan"],
  ["SIP", "Surat Izin Praktik", "Izin bagi tenaga kesehatan, misalnya dokter, untuk berpraktik.", "SIP dokter"],
  ["SIUP", "Surat Izin Usaha Perdagangan", "Istilah izin dagang yang lama. Kini umumnya dicakup oleh NIB.", "mau bikin NIB"],
  ["TDP", "Tanda Daftar Perusahaan", "Istilah pendaftaran perusahaan yang lama. Kini umumnya dicakup oleh NIB.", "mau bikin NIB"],
  ["UMKM", "Usaha Mikro, Kecil, dan Menengah", "Kelompok usaha berskala kecil sampai menengah. Persyaratan izinnya bisa berbeda dari usaha besar.", "izin usaha kecil"],
  ["AMDAL", "Analisis Mengenai Dampak Lingkungan", "Kajian dampak lingkungan untuk usaha atau kegiatan yang berdampak besar.", "amdal"],
  ["UKL-UPL", "Upaya Pengelolaan dan Pemantauan Lingkungan", "Dokumen lingkungan untuk kegiatan yang dampaknya lebih kecil dari yang wajib AMDAL.", "ukl upl"],
  ["SPPL", "Surat Pernyataan Kesanggupan Pengelolaan Lingkungan", "Pernyataan pengelolaan lingkungan untuk usaha yang dampaknya paling kecil.", "sppl"],
  ["PIRT", "Pangan Industri Rumah Tangga", "Izin edar bagi makanan atau minuman olahan yang diproduksi di rumah.", "izin usaha makanan"],
  ["OTP", "One Time Password", "Kode sekali pakai yang dikirim ke ponsel Anda. Jangan pernah dibagikan kepada siapa pun, termasuk petugas.", ""]
];
var K = K0.slice(), KM = {}, SIG = "";
function nk(x) { return String(x).replace(/[^A-Z]/gi, "").toUpperCase(); }
function sinkron() {
  var D0 = window.DIN || {}, sg = JSON.stringify([D0.kamus, D0.kerangka]); if (sg === SIG && K.length) return; SIG = sg;
  var map = {}, out = []; K0.forEach(function (x) { map[nk(x[0])] = x; });
  (Array.isArray(D0.kamus) ? D0.kamus : []).forEach(function (r) { if (r && r[0]) map[nk(r[0])] = [r[0], r[1] || "", r[2] || "", r[3] || ""]; });
  Object.keys(map).forEach(function (k) { out.push(map[k]); }); K = out; KM = {}; K.forEach(function (x) { KM[nk(x[0])] = x; });
  KER = Array.isArray(D0.kerangka) && D0.kerangka.length ? D0.kerangka : KER0;
}
function cari(t) {
  sinkron();
  var s = String(t || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); if (!s) return null;
  var w = s.split(" "), i; for (i = 0; i < w.length; i++) if (KM[w[i]]) return KM[w[i]]; var j = s.replace(/ /g, ""); if (KM[j]) return KM[j];
  for (i = 0; i < K.length; i++) if (K[i][1].toUpperCase().indexOf(s) > -1) return K[i]; return null;
}
function temukan(t) {
  sinkron();
  var out = [], s = " " + String(t || "").toUpperCase().replace(/[^A-Z0-9-]/g, " ") + " ";
  K.forEach(function (x) { if (s.indexOf(" " + x[0].toUpperCase() + " ") > -1 || s.indexOf(" " + x[0].replace(/[^A-Z]/gi, "").toUpperCase() + " ") > -1) out.push(x); }); return out.slice(0, 4);
}
function kartu(x) {
  var B = window.BOTI;
  return '<div class="bc2"><b>' + E(x[0]) + '</b> <span class="btag">' + E(x[1]) + '</span><p>' + E(x[2]) + '</p>' + (x[3] ? '<div class="ba">' + B.btn("Cari layanan terkait", "q:" + x[3]) + '</div>' : "") + '</div>';
}
function cmdArti(arg) {
  sinkron();
  var B = window.BOTI, x = cari(arg);
  if (x) return B.bot("Arti istilah " + x[0] + ":", kartu(x) + '<div class="bch">' + B.btn("Istilah lain", "q:/arti") + '</div>');
  return B.bot(arg ? "Saya belum punya istilah \"" + arg + "\". Pilih dari daftar ini:" : "Istilah apa yang ingin dijelaskan? Pilih atau ketik, mis. /arti NIB.",
    '<div class="bch">' + K.map(function (k) { return B.btn(k[0], "q:/arti " + k[0]); }).join("") + '</div>');
}
function pasangBot() {
  if (!window.BOTI || !window.BOTX || window.BOTX.__tp2) return; window.BOTX.__tp2 = 1; var pre0 = window.BOTX.pre;
  window.BOTX.pre = function (t, s) {
    var m = /^\/arti\s*(.*)$/i.exec(t); if (m) return cmdArti(m[1].trim());
    var n = /^(?:apa\s+(?:itu|arti|maksud(?:nya)?)|arti(?:nya)?|singkatan(?:\s+dari)?|kepanjangan(?:\s+dari)?)\s+([^?]{2,40})\??$/i.exec(String(t).trim());
    if (n) { var x = cari(n[1]); if (x && n[1].trim().split(/\s+/).length <= 4) return window.BOTI.bot("Arti istilah " + x[0] + ":", kartu(x)); }
    return pre0 ? pre0(t, s) : null;
  };
}

/* ---------- Tanya Admin: penyusun, pemeriksa, draf ---------- */
var DK = "tk_draf_", PUR = false;
var KER0 = [["Syarat", "Saya ingin mengurus ... (sebutkan layanan). Mohon info syarat dan berkas yang perlu dibawa."], ["Biaya dan lama", "Mohon info biaya dan lama proses untuk mengurus ... (sebutkan layanan)."], ["Status berkas", "Saya sudah mengajukan ... pada tanggal ... (nomor permohonan atau tiket: ...). Mohon info statusnya."], ["Kendala", "Saya mengalami kendala saat mengurus ... Kendalanya: ..."], ["Jadwal", "Saya ingin menanyakan jadwal dan kuota kunjungan untuk ... sekitar tanggal ..."]], KER = KER0;
sinkron();
function cek(t) {
  var r = [], p = t.trim();
  r.push([p.length >= 25, "Cukup rinci", "Tambahkan detail: layanan apa yang diurus?"]);
  var nik = /(?:^|\D)(\d[ .-]?){16}(?:\D|$)/.test(p), otp = /\b(otp|kode verifikasi|kata sandi|password|pin)\b[^0-9\n]{0,12}\d{3,}/i.test(p);
  r.push([!(nik || otp), "Aman dari data rahasia", nik ? "Ada angka seperti NIK 16 digit. Hapus, cukup tunjukkan di loket." : "Jangan tulis kode OTP, PIN, atau kata sandi."]);
  r.push([!(p.length > 12 && p === p.toUpperCase() && /[A-Z]/.test(p)), "Huruf nyaman dibaca", "Hindari HURUF KAPITAL semua."]);
  r.push([/\?|mohon|tolong|bagaimana|bagaimanakah|apa|berapa|kapan|bisa|info|ingin|minta/i.test(p), "Permintaan jelas", "Tulis apa yang Anda minta, mis. \"Mohon info syarat...\"."]);
  return r;
}
function sisip(ta) { var b = ta.parentNode.querySelector(".tpi"); if (!b) { b = D.createElement("div"); b.className = "tpi"; ta.insertAdjacentElement("afterend", b); } return b; }
function tiketChip(ta) {
  var o = window.AuraKS && AuraKS.tiket && AuraKS.tiket(); if (!o || ta.value.indexOf(o.kode) > -1) return "";
  return '<button type="button" class="chip" data-tpi="tk">Sertakan tiket saya</button>';
}
function gambar(ta) {
  sinkron();
  var b = sisip(ta), t = ta.value, dm = ta.dataset.tpiDr === "1";
  if (!t.trim()) {
    b.innerHTML = (dm ? "" : "") + '<small class="sys">Bingung mulai dari mana? Pilih kerangka lalu lengkapi:</small><div class="tpi-k">' + KER.map(function (k, i) { return '<button type="button" class="chip" data-tpi="k" data-i="' + i + '">' + E(k[0]) + '</button>'; }).join("") + tiketChip(ta) + '</div>'; return;
  }
  var r = cek(t), ist = temukan(t), open = ta.dataset.tpiAr || "", np = Math.round(r.filter(function (x) { return x[0]; }).length / r.length * 100), tc = tiketChip(ta);
  b.innerHTML = (dm ? '<div class="tpi-d">Draf sebelumnya dipulihkan. <button type="button" data-tpi="hd">Hapus draf</button></div>' : "") +
    '<div class="tpi-m" role="progressbar" aria-label="Kelengkapan pesan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + np + '"><i style="width:' + np + '%" class="' + (np >= 75 ? "hi" : "") + '"></i></div><small class="sys">Kelengkapan pesan ' + np + '%</small>' + (tc ? '<div class="tpi-k">' + tc + '</div>' : "") + '<ul class="tpi-c">' + r.map(function (x) { return '<li class="' + (x[0] ? "ok" : "no") + '"><i aria-hidden="true">' + (x[0] ? "&#10003;" : "!") + '</i>' + E(x[0] ? x[1] : x[2]) + '</li>'; }).join("") + '</ul>' +
    (ist.length ? '<div class="tpi-k"><small class="sys">Arti istilah:</small>' + ist.map(function (x) { return '<button type="button" class="chip' + (open === x[0] ? " on" : "") + '" data-tpi="a" data-t="' + E(x[0]) + '">' + E(x[0]) + '</button>'; }).join("") + '</div>' + (open && KM[open.replace(/[^A-Z]/gi, "").toUpperCase()] ? '<div class="tpi-a"><b>' + E(KM[open.replace(/[^A-Z]/gi, "").toUpperCase()][1]) + '</b>: ' + E(KM[open.replace(/[^A-Z]/gi, "").toUpperCase()][2]) + '</div>' : "") : "");
}
function simpan(ta) { try { var k = DK + (ta.dataset.k || ""), v = ta.value; if (v.trim().length > 3) { localStorage.setItem(k, v); PUR = true; } else localStorage.removeItem(k); } catch (e) {} }
function siap(ta) {
  if (ta.dataset.tpiOk) return; ta.dataset.tpiOk = "1";
  try { var d = localStorage.getItem(DK + (ta.dataset.k || "")); if (d && !ta.value.trim()) { ta.value = d; ta.dataset.tpiDr = "1"; ta.dispatchEvent(new Event("input", {bubbles: true})); delete ta.dataset.tpiTouch; } } catch (e) {}
  gambar(ta);
}
var tm = null;
D.addEventListener("input", function (e) {
  var ta = e.target; if (!(ta && ta.matches && ta.matches('textarea[data-k^="q:"]'))) return;
  clearTimeout(tm); tm = setTimeout(function () { if (ta.value !== "" && ta.dataset.tpiDr === "1" && ta.dataset.tpiTouch) ta.dataset.tpiDr = ""; simpan(ta); gambar(ta); }, 350);
  ta.dataset.tpiTouch = "1";
});
D.addEventListener("click", function (e) {
  var x = e.target.closest && e.target.closest("[data-tpi],[data-act=\"send\"]"); if (!x) return;
  if (x.dataset.act === "send") { setTimeout(function () { [].forEach.call(D.querySelectorAll('textarea[data-k^="q:"]'), function (ta) { if (!ta.value.trim()) { try { localStorage.removeItem(DK + (ta.dataset.k || "")); } catch (z) {} gambar(ta); } }); }, 1500); return; }
  var qf = x.closest(".qf") || x.parentNode, ta = qf.querySelector("textarea") || x.closest(".qf").querySelector("textarea"), a = x.dataset.tpi; if (!ta) return;
  if (a === "k") { var t = KER[+x.dataset.i][1], p = t.indexOf("..."); ta.value = t; ta.focus(); if (p > -1) ta.setSelectionRange(p, p + 3); ta.dispatchEvent(new Event("input", {bubbles: true})); }
  else if (a === "tk") { var o = window.AuraKS && AuraKS.tiket && AuraKS.tiket(); if (o) { ta.value = (ta.value.trim() ? ta.value.replace(/\s+$/, "") + "\n" : "") + "(Tiket " + o.kode + ", " + o.tanggal + " " + o.jam + " WIB)"; ta.focus(); ta.dispatchEvent(new Event("input", {bubbles: true})); } }
  else if (a === "a") { ta.dataset.tpiAr = ta.dataset.tpiAr === x.dataset.t ? "" : x.dataset.t; gambar(ta); }
  else if (a === "hd") { ta.value = ""; ta.dataset.tpiDr = ""; try { localStorage.removeItem(DK + (ta.dataset.k || "")); } catch (z) {} ta.dispatchEvent(new Event("input", {bubbles: true})); gambar(ta); }
});
function purge() { try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(DK) === 0) localStorage.removeItem(k); } } catch (e) {} PUR = false; }
function jalan() {
  try {
    pasangBot();
    if (window.S === "user") [].forEach.call(D.querySelectorAll('textarea[data-k^="q:"]'), siap); else if (PUR || window.S === "out") { if (window.S !== "user") purge(); }
  } catch (e) {}
}
setInterval(jalan, 800); jalan();
window.TanyaPintar = {cari: cari, temukan: temukan, cek: cek};
})();
