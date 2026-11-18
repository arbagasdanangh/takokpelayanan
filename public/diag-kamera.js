"use strict";
/* Diagnosis kamera. Mengumpulkan fakta dari perangkat (konteks aman, kebijakan izin situs, bingkai, peramban dalam aplikasi, status izin, jumlah kamera,
   galat nyata dari getUserMedia) lalu memutuskan satu penyebab paling mungkin beserta langkah perbaikannya. Dipakai oleh dialog Pindai tiket dan /cek-kamera.html.
   putuskan() adalah fungsi murni agar semua cabang bisa diuji. Tidak ada data yang dikirim ke mana pun. */
(function () {
var APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|WhatsApp|Telegram|TikTok|musical_ly|Snapchat|Twitter|GSA\/|; wv\)|\bwv\b/i;
function putuskan(i) {
  var K = function (kode, judul, langkah) { return {kode: kode, judul: judul, langkah: langkah}; };
  if (i.aman === false) return K("aman", "Halaman tidak dibuka lewat alamat aman (HTTPS), jadi peramban menolak kamera.", ["Buka situs dengan alamat yang diawali https://."]);
  if (i.bingkai) return K("bingkai", "Halaman dibuka di dalam bingkai (iframe) situs lain, sehingga kamera diblokir.", ["Buka alamat Takok langsung di peramban, bukan lewat halaman lain."]);
  if (i.kebijakan === false) return K("kebijakan", "Situs ini masih mengirim aturan keamanan yang melarang kamera (header Permissions-Policy).", ["Pastikan versi terbaru sudah di-deploy dan header memuat camera=(self).", "Muat ulang tanpa cache: di Chrome tekan Ctrl+Shift+R, atau hapus data situs lalu buka lagi.", "Di HP: Pengaturan peramban > Privasi > Hapus data penelusuran > Cookie dan data situs, lalu buka ulang."]);
  if (i.aplikasi) return K("aplikasi", "Halaman dibuka di dalam aplikasi lain (" + i.aplikasi + "), yang biasanya memblokir kamera.", ["Salin alamat Takok lalu buka di Chrome atau Safari.", "Di WhatsApp/Instagram: ketuk menu titik tiga, pilih Buka di peramban."]);
  if (i.izin === "denied") return K("izin", "Izin kamera untuk situs ini sedang DIBLOKIR di peramban Anda.", ["Chrome HP: ketuk ikon gembok atau pengaturan di sebelah alamat > Izin > Kamera > Izinkan (atau Setel ulang izin).", "Safari iPhone: ketuk aA di bilah alamat > Pengaturan Situs Web > Kamera > Izinkan.", "Chrome komputer: klik ikon gembok di kiri alamat > Kamera > Izinkan, lalu muat ulang."]);
  if (i.galat === "NotFoundError" || i.galat === "DevicesNotFoundError" || (i.kamera === 0 && !i.galat)) return K("tidakada", "Perangkat ini tidak punya kamera yang terdeteksi.", ["Gunakan HP atau perangkat yang memiliki kamera.", "Atau ketik nomor tiket secara manual."]);
  if (i.galat === "NotReadableError" || i.galat === "TrackStartError") return K("dipakai", "Kamera sedang dipakai aplikasi lain.", ["Tutup aplikasi yang memakai kamera (video call, kamera, dll), lalu coba lagi."]);
  if (i.galat === "NotAllowedError" || i.galat === "PermissionDeniedError") return K("ditolak", "Kamera ditolak walau pengaturan situs terlihat wajar.", ["Pastikan Anda menekan Izinkan saat peramban menanyakan izin kamera.", "Android: Pengaturan HP > Aplikasi > (nama peramban) > Izin > Kamera > Izinkan.", "iPhone: Pengaturan > Safari (atau Chrome) > Kamera > Tanya atau Izinkan.", "HP kantor atau sekolah bisa melarang kamera lewat kebijakan perangkat."]);
  if (i.galat) return K("lain", "Kamera tidak bisa dibuka (" + i.galat + ").", ["Muat ulang halaman lalu coba lagi.", "Coba peramban lain (Chrome atau Safari terbaru)."]);
  return K("normal", "Tidak ditemukan hambatan. Kamera seharusnya bisa dibuka.", i.barcode ? [] : ["Peramban ini belum bisa membaca barcode lewat kamera (tidak ada BarcodeDetector). Gunakan Chrome terbaru, atau ketik nomor tiket manual."]);
}
function kebijakanKamera() {
  try { var p = document.permissionsPolicy || document.featurePolicy; if (p && p.allowsFeature) return !!p.allowsFeature("camera"); } catch (e) {} return null;
}
async function kumpul(err) {
  var n = window.navigator || {}, ua = n.userAgent || "", i = {aman: window.isSecureContext !== false, kebijakan: kebijakanKamera(), bingkai: false, aplikasi: "", izin: null, kamera: null, galat: err && err.name ? err.name : "", barcode: "BarcodeDetector" in window, ua: ua};
  try { i.bingkai = window.top !== window.self; } catch (e) { i.bingkai = true; }
  var m = APP.exec(ua); if (m) i.aplikasi = (/Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV|FB_IAB/i.test(ua) ? "Facebook" : /WhatsApp/i.test(ua) ? "WhatsApp" : /Telegram/i.test(ua) ? "Telegram" : /Line\//i.test(ua) ? "LINE" : /TikTok|musical_ly/i.test(ua) ? "TikTok" : /MicroMessenger/i.test(ua) ? "WeChat" : "aplikasi lain");
  try { if (n.permissions && n.permissions.query) i.izin = (await n.permissions.query({name: "camera"})).state; } catch (e) {}
  try { if (n.mediaDevices && n.mediaDevices.enumerateDevices) i.kamera = (await n.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === "videoinput"; }).length; } catch (e) {}
  if (!n.mediaDevices || !n.mediaDevices.getUserMedia) i.aman = false;
  return i;
}
async function jalankan(err) { var i = await kumpul(err), d = putuskan(i); d.fakta = i; return d; }
function baris(i) {
  var y = function (v) { return v === true ? "ya" : v === false ? "TIDAK" : "tidak diketahui"; };
  return [["Alamat aman (HTTPS)", y(i.aman)], ["Kebijakan situs mengizinkan kamera", y(i.kebijakan)], ["Dibuka di dalam bingkai", i.bingkai ? "YA" : "tidak"], ["Dibuka dari aplikasi lain", i.aplikasi || "tidak"],
    ["Status izin kamera", i.izin || "tidak diketahui"], ["Jumlah kamera", i.kamera == null ? "tidak diketahui" : String(i.kamera)], ["Bisa baca barcode (BarcodeDetector)", y(i.barcode)], ["Galat saat membuka", i.galat || "tidak ada"]];
}
window.DiagKamera = {putuskan: putuskan, kumpul: kumpul, jalankan: jalankan, baris: baris};
})();
