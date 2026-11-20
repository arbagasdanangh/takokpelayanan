"use strict";
/* Versi 97: Kuis Cak Takok. Ketik /kuis di Asisten: 5 pertanyaan acak tentang cara memakai layanan dan aplikasi ini,
   dengan penjelasan di setiap jawaban, skor akhir, dan rekor terbaik (tersimpan di perangkat). Semua berjalan di browser. */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var $b = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
/* [pertanyaan, jawaban benar, [pengecoh...], penjelasan] */
var BANK = [
  ["Check-in booking kunjungan dibuka berapa menit sebelum jam booking?", "60 menit", ["5 menit", "15 menit", "3 jam"], "Check-in dibuka 60 menit sebelum jam booking. Tekan \"Saya sudah tiba\" saat sampai."],
  ["QR check-in tamu di loket berasal dari apa?", "Nomor tiket antrean", ["Nomor KTP", "Nomor HP", "Nama loket"], "QR dibuat dari nomor tiket antrean Anda, jadi petugas cukup memindainya."],
  ["Bolehkah PIN atau kode OTP dibagikan ke petugas lewat chat?", "Tidak boleh, bersifat rahasia", ["Boleh bila diminta petugas", "Boleh jika lewat WhatsApp", "Boleh asal sebagian saja"], "PIN dan OTP rahasia. Petugas resmi tidak pernah memintanya."],
  ["Berapa huruf minimal pertanyaan di Tanya Jawab Publik?", "10 huruf", ["3 huruf", "50 huruf", "Tidak ada batas"], "Pertanyaan minimal 10 huruf, maksimal 5 pertanyaan per hari, dan dikirim tanpa nama."],
  ["Pertanyaan di Tanya Jawab Publik diterbitkan setelah...", "Admin menjawab dan menerbitkannya", ["Langsung terbit saat dikirim", "Dua orang menyukainya", "Satu jam berlalu"], "Admin memeriksa dulu, jadi data pribadi tidak ikut tampil di publik."],
  ["Nomor tiket pertanyaan ke loket diawali...", "TKT-", ["NIB-", "BKG-", "OSS-"], "Contoh: TKT-2611-00001. Sebutkan nomor ini bila menghubungi admin."],
  ["Urusan sudah selesai dijawab. Tombol apa yang menutup tiket?", "Sudah beres", ["Hapus akun", "Ingatkan pegawai", "Booking ulang"], "Tombol Sudah beres menutup tiket. Pertanyaan baru di loket yang sama akan membuka tiket baru."],
  ["Jawaban Asisten otomatis kurang tepat. Langkah terbaik?", "Minta dijawab pegawai langsung", ["Mengulang pertanyaan sepuluh kali", "Menutup aplikasi", "Menunggu saja tanpa berbuat apa pun"], "Gunakan tombol untuk meneruskan ke pegawai. Pegawai akan menjawab langsung."],
  ["Notifikasi Telegram atau WhatsApp dari aplikasi ini berisi...", "Pemberitahuan bahwa jawaban sudah ada", ["Seluruh isi jawaban admin", "Salinan PIN Anda", "Iklan layanan lain"], "Isi jawaban tetap dibaca di aplikasi, sehingga data Anda lebih aman."],
  ["Mencoba booking di tanggal libur atau loket tutup, hasilnya?", "Ditolak, pilih tanggal lain", ["Tetap diterima", "Diterima tapi tanpa antrean", "Otomatis dipindah ke Minggu"], "Tanggal libur dan loket tutup ditandai dan tidak bisa dipilih."]
];
var KEY = "tk_kuis_rekor", ST = null;
function rekor() { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }
function simpanRekor(n) { try { localStorage.setItem(KEY, String(n)); } catch (e) {} }
function acak(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function mulai() {
  ST = {q: acak(BANK).slice(0, 5), i: 0, s: 0};
  return B.bot("Kuis Cak Takok dimulai! 5 pertanyaan tentang cara memakai layanan. Rekor Anda: " + rekor() + "/5.").then(tanya);
}
function tanya() {
  if (!ST) return;
  var q = ST.q[ST.i], opsi = acak([q[1]].concat(q[2]));
  ST.cur = q;
  return B.bot("Pertanyaan " + (ST.i + 1) + " dari 5", '<div class="bc2" data-kzq="' + ST.i + '"><b>' + E(q[0]) + '</b><div class="bch">' +
    opsi.map(function (o) { return '<button type="button" data-kz="' + E(o) + '">' + E(o) + '</button>'; }).join("") + '</div></div>', 300, true);
}
function jawab(btn) {
  var box = btn.closest("[data-kzq]"); if (!ST || !box || box.dataset.done || +box.dataset.kzq !== ST.i) return;
  box.dataset.done = "1"; var q = ST.cur, ok = btn.dataset.kz === q[1];
  [].forEach.call(box.querySelectorAll("button"), function (b) { b.disabled = true; if (b.dataset.kz === q[1]) b.classList.add("on"); });
  if (ok) ST.s++;
  var akhir = ST.i === 4, tot = ST.s, ada = ST.i;
  B.bot((ok ? "Benar! " : "Belum tepat. Jawabannya: " + q[1] + ". ") + q[3], "", 350, true).then(function () {
    if (!akhir) { ST.i++; return tanya(); }
    var r = rekor(), baru = tot > r; if (baru) simpanRekor(tot);
    var puji = tot === 5 ? "Sempurna! Anda siap mengurus layanan sendiri." : tot >= 3 ? "Bagus! Tinggal sedikit lagi." : "Tidak apa-apa, coba lagi supaya makin paham.";
    ST = null;
    return B.bot("Skor akhir: " + tot + " dari 5. " + puji + (baru ? " Rekor baru!" : ""), '<div class="bch">' + B.btn("Main lagi", "q:/kuis") + B.btn("Persiapan kunjungan", "q:/siapkan") + '</div>', 400, true);
  });
}
D.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-kz]"); if (b && $b("bm") && $b("bm").contains(b)) jawab(b); });
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  if (/^\/kuis\s*$/i.test(String(t).trim())) return mulai();
  return pre0 ? pre0(t, s) : null;
};
})();
