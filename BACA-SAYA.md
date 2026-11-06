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
**Pemohon:** daftar/masuk (HP + PIN), diskusi pribadi per loket, Status Permohonan (linimasa), Booking Kunjungan (kode antrean, kuota per jam), Survei Kepuasan (SKM), Percakapan Saya, notifikasi balasan dan perubahan status, Berita & Informasi.
**Admin:** kotak masuk, catat dan perbarui status permohonan, daftar booking per tanggal (tandai hadir) + atur kuota per jam, terbitkan berita, rekap SKM (IKM per lokasi dan per unsur, saran), unduh CSV/Excel, pengaturan WA/jam layanan/pengumuman.

Catatan:
- Status permohonan diisi manual oleh petugas (bukan otomatis dari OSS/SSW). Pemohon harus sudah terdaftar di aplikasi (nomor HP) agar permohonannya bisa dicatat.
- Booking: hari kerja, jam 08.00 sampai 14.00 (jeda 12.00), sampai 14 hari ke depan, maksimal 3 booking aktif per pemohon, kuota bawaan 10 per jam per lokasi.
- IKM dihitung dari 9 unsur (skala 1 sampai 4): rata-rata unsur x 25. Mutu: A 88,31-100, B 76,61-88,30, C 65,00-76,60, D 25,00-64,99.
