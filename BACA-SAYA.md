# Takok Pelayanan Suroboyo - versi Vercel

Catatan penting: Vercel tidak menyimpan file secara permanen, jadi file Excel tidak bisa dipakai sebagai database langsung di sana.
Karena itu data disimpan di Upstash Redis (gratis, dipasang dari Vercel), dan **Excel tersedia sebagai unduhan** dari panel admin (tombol "Unduh database (Excel)").

## Langkah pasang
1. Unggah folder ini ke GitHub (atau jalankan `vercel` dari folder ini).
2. Di vercel.com: Add New > Project > pilih repo tersebut > Deploy.
3. Di proyek tersebut: tab **Storage** > Create/Connect **Upstash for Redis** (Marketplace) > hubungkan ke proyek.
   Ini otomatis menambah variabel `KV_REST_API_URL` dan `KV_REST_API_TOKEN`.
4. Tab **Settings > Environment Variables**, tambahkan:
   - `SESSION_SECRET` : teks acak panjang (minimal 32 karakter). Contoh buat di komputer: `python -c "import secrets;print(secrets.token_urlsafe(48))"`
   - `ADMIN_PASSWORD`  : kata sandi admin awal (minimal 8 karakter).
5. **Redeploy** (Deployments > titik tiga > Redeploy).
6. Buka alamat situs > "Masuk admin" > pakai `ADMIN_PASSWORD` > Pengaturan > ganti kata sandi. Setelah diganti, yang dipakai adalah kata sandi baru (disimpan sebagai hash), bukan variabel lagi.

## Mengubah isi loket
Edit `api/_data.py` (nama, uraian, sistem tiap loket; ada uraian yang masih "Belum diisi"), lalu commit dan deploy ulang.

## Keamanan
Kata sandi dan PIN di-hash (PBKDF2), cookie sesi bertanda tangan, HttpOnly, Secure, SameSite=Strict; batas percobaan masuk disimpan di Redis; perlindungan CSRF; header keamanan (CSP, HSTS); pemohon hanya bisa membaca percakapannya sendiri; pesan berisi NIK 16 digit ditolak.

## Batasan
- Notifikasi muncul saat halaman terbuka; halaman memeriksa balasan tiap 10-20 detik (lebih jarang saat tab tidak aktif) agar hemat kuota Redis.
- WhatsApp/email otomatis belum ada; admin memakai tombol WhatsApp/Email yang sudah terisi pesan.
- Paket gratis Vercel (Hobby) ditujukan untuk pemakaian pribadi/non-komersial. Untuk layanan instansi, periksa ketentuan dan pertimbangkan paket Pro.
- Nomor HP belum diverifikasi dengan OTP.

## Lokasi MPP Surabaya
Lokasi keenam, **MPP Surabaya**, berisi 17 instansi di Zona 2 sampai Zona 5. Daftar dikelompokkan per zona dan bisa disaring lewat tombol zona.
Instansi yang sudah ada di SPP (PTSP, Dispenduk Capil, DPRKPP, DLH, Dishub) tidak diulang di MPP. Fasilitas non-layanan (Musholla, Ruang Laktasi, dst.) juga tidak dimasukkan.
Rincian layanan tiap instansi belum diisi; lengkapi di `api/_data.py` (kolom `uraian`), lalu deploy ulang.

## Fitur
**Pemohon:** daftar/masuk (HP + PIN), diskusi pribadi per loket, Status Permohonan (linimasa), Booking Kunjungan, Survei Kepuasan (SKM), Percakapan Saya, notifikasi (balasan, perubahan status, giliran dipanggil), Berita & Informasi.
**Admin:** Ringkasan (KPI, grafik booking 7 hari, permohonan per status, IKM), kotak masuk, permohonan, booking + panggil antrean, berita, rekap SKM, unduh CSV/Excel, pengaturan.

### Booking per loket/instansi
Setiap loket (di MPP: setiap instansi seperti BPJS, Pajak, Pengadilan) punya jadwal dan kuota sendiri. Pemohon menyusun **rencana kunjungan** berisi beberapa tujuan di tanggal yang sama (maksimal 6, jam tidak boleh bentrok), lalu membuat semua booking sekaligus. Bila salah satu slot penuh, tidak ada booking yang dibuat (semua dibatalkan otomatis).
Loket telepon, WhatsApp/hotline, dan pengisian SKM tidak menerima booking.
Kode tiket contoh: `MPP08-2011-001` (loket nomor 08, tanggal 20 November, antrean ke-1). Tiket bisa dicetak.
Jam: 08.00 sampai 14.00 (jeda 12.00), hari kerja, sampai 14 hari ke depan; kuota bawaan 10 per jam per loket (ubah di tab Booking).

### Layar antrean
Buka `https://<alamat-situs>/?layar=1` di TV/layar ruang tunggu (tambahkan `&lokasi=mpp` untuk satu lokasi). Admin menekan **Panggil** di tab Booking: nomor tampil besar di layar, pemohon mendapat notifikasi, dan layar bisa mengucapkan nomor (klik "Aktifkan suara" sekali; butuh browser dengan suara bahasa Indonesia).
Layar hanya menampilkan kode dan nama loket, tanpa data pribadi.

Catatan:
- Status permohonan diisi manual oleh petugas (bukan otomatis dari OSS/SSW).
- IKM = rata-rata 9 unsur (skala 1-4) x 25. Mutu: A 88,31-100, B 76,61-88,30, C 65,00-76,60, D 25,00-64,99.

## Tiket antrean (versi 4)
- **Satu tiket per loket.** Booking beberapa instansi menghasilkan beberapa tiket terpisah, masing-masing dengan kode, jam, dan barcode Code 39 sendiri.
- **Check-in "Saya sudah tiba"** (dibuka 60 menit sebelum jam booking, hanya pada hari kunjungan). Pemohon yang sudah tiba didahulukan oleh "Panggil berikutnya".
- **Posisi antrean:** tiket hari ini menampilkan jumlah antrean di depan (diperbarui tiap 15 detik saat halaman booking dibuka).
- **Tambah ke kalender** (file .ics dengan pengingat 1 jam sebelumnya) dan **Cetak / simpan PDF** per tiket.
- **Penanda jam sepi/ramai** dan rekomendasi jam paling lengang saat memilih jam.
- **Admin:** booking dikelompokkan per loket dengan tombol **Panggil berikutnya**; kolom **scan/ketik kode tiket** lalu Enter untuk memanggil (cocok dengan alat pemindai barcode USB yang mengetik kode ke kolom).
- Barcode memakai standar Code 39 yang dibuat sendiri; belum diuji dengan alat pemindai fisik. Kode juga bisa diketik manual.

## Versi 5
**Berita:** admin menulis dengan editor teks kaya (tebal, miring, garis bawah, judul bagian, daftar poin/nomor, kutipan, tautan), memilih kategori (Berita, Pengumuman, Tips Layanan), menyematkan di atas, mengubah, dan menghapus. Isi disaring dua kali (server dan browser) dengan daftar-putih tag; script, gambar, dan atribut berbahaya dibuang.
**SKM per zona dan instansi:** pemohon memilih lokasi lalu unit yang dinilai. Untuk MPP Surabaya tersedia seluruh zona dan instansi (Zona 1 sampai 5 dan non-zona/fasilitas lain, 25 unit), dengan ringkasan zona yang bisa dibuka. Untuk SPP, unit adalah seluruh pelayanan atau satu loket. Admin melihat IKM per lokasi, per zona MPP, dan per instansi/loket.
**Tanya admin:**
- Pemohon: tanda "Terkirim" lalu "Dibaca admin", pemisah tanggal, pertanyaan cepat (chip) saat percakapan kosong, penghitung karakter, Enter untuk kirim (Shift+Enter baris baru), dan perkiraan waktu balas admin (median dari balasan sebelumnya, tampil setelah minimal 3 data).
- Admin: balasan cepat yang bisa diatur sendiri (Pengaturan > Templat balasan, maksimal 12) dan catatan internal per percakapan yang tidak terlihat pemohon.
