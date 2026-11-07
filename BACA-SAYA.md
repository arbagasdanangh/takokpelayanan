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

## Versi 6: Asisten Takok (chatbot)
Tombol melayang "Tanya Asisten" di kanan bawah (juga tombol di banner beranda). Semua jawaban dibuat di browser dari data loket yang sudah ada: tanpa AI luar, tanpa biaya, dan tidak ada data yang dikirim ke pihak ketiga. File: `public/bot.js` (+ gaya di `style.css`).
- **Cari loket dengan bahasa sehari-hari** ("mau bikin NIB", "SIP dokter", "bpjs"): kartu loket dengan tombol Buka loket, Booking (langsung terisi loketnya), dan Peta.
- **Daftar dokumen interaktif** (NIB, SIP, PBG/IMB/SLF, reklame, IPT, izin lingkungan, koperasi): centang, bilah progres, tersimpan di perangkat, alur loket yang disarankan, kirim daftar ke WhatsApp. Ini panduan umum, bukan daftar resmi: ubah/lengkapi `KB` di awal `bot.js` sesuai ketentuan resmi.
- **Cek status permohonan dan tiket antrean** langsung dari chat (perlu masuk).
- **Pengaduan terpandu**: pilih kategori, ceritakan kejadian, lihat draf, kirim ke Loket Pengaduan (memakai penjaga NIK dan batas kirim yang sudah ada).
- **Teruskan ke admin**: pertanyaan yang tidak terjawab dibawa ke Loket CS/Informasi dengan kolom pesan terisi.
- **Aksesibilitas**: input suara (mikrofon, id-ID), jawaban dibacakan (tombol Dengarkan / Suara otomatis), huruf besar (A+), dan mode bahasa Suroboyoan (Cak).
- Lencana angka di tombol bila ada balasan admin yang belum dibaca; bisa ditutup dengan Esc.
- Suara memerlukan browser yang mendukung Web Speech (Chrome/Edge/Safari); tombol mikrofon otomatis tersembunyi bila tidak didukung.
- **Instansi MPP di chatbot**: tanya "instansi MPP" atau "zona 4" untuk daftar 17 instansi per zona (tombol Buka dan Booking tiap instansi). Pertanyaan seperti SKCK, pajak, sertifikat tanah, cerai, kartu kuning, atau BPJS langsung diarahkan ke instansinya (daftar kata kunci: variabel `AL` di `bot.js`).
- **Kata cari chatbot (admin)**: tab admin "Kata cari chatbot". Admin menambah aturan: kata/frasa (pisahkan koma) lalu pilih loket tujuan; ada kolom "Coba kata" untuk menguji. Disimpan di Redis (field `kata`), tanpa deploy ulang; warga memakainya saat halaman dimuat. Aturan admin diprioritaskan di atas aturan bawaan. Maksimal 100 aturan, 10 kata per aturan.
- Aturan kata cari juga punya kolom **Jawaban untuk pengunjung** (cara mengurus, langkah, syarat, biaya; beberapa baris boleh). Jawaban tampil di chatbot sebelum kartu loket; loket tujuan bersifat pilihan. Bila topiknya punya daftar dokumen bawaan, muncul tombol "Daftar dokumen". Maksimal 1.500 karakter per jawaban.

## Versi 7: Kata cari chatbot lebih lengkap
Tab admin **Kata cari chatbot** kini punya:
- **Impor Excel/CSV**: tombol "Impor Excel/CSV" menerima .xlsx atau .csv (maksimal 600 KB). Kolom: Kata kunci, Jawaban untuk pengunjung, Loket tujuan (opsional; boleh kode, "Lokasi - Loket", atau nama loket). Baris judul boleh ada. Hasil dibaca di server (`openpyxl`), ditampilkan sebagai **pratinjau** dengan daftar baris yang dilewati, lalu admin memilih mode **Gabung** (perbarui aturan yang kata kuncinya sama, tambah yang baru), **Tambah**, atau **Ganti** seluruh daftar. Belum tersimpan sampai tombol Simpan ditekan.
- **Unduh templat** (Excel dengan petunjuk dan daftar tarik-turun loket) dan **Ekspor Excel** (seluruh aturan saat ini, bisa diedit lalu diimpor kembali).
- **Tempel dari spreadsheet**: salin sel dari Excel/Google Sheets lalu tempel, tanpa perlu menyimpan berkas.
- **Pertanyaan warga yang belum terjawab**: pertanyaan yang tidak bisa dijawab chatbot dicatat anonim di Redis (hash `miss`; angka 6 digit ke atas, nomor HP, dan email dibuang; maksimal 300 entri; 20 catatan per IP per jam). Tombol "Buat aturan" membuat aturan dengan kata kunci saran; pertanyaan yang sudah tertangani hilang otomatis saat Simpan.
- Aturan tampil sebagai kartu ringkas (kata kunci, loket, peringatan), dengan **pencarian**, penghitung karakter, **peringatan kata kunci ganda**, tombol naik/turun/gandakan, **urungkan hapus**, penanda "belum disimpan" (dengan konfirmasi saat pindah tab), dan tombol Simpan yang menempel di bawah.
- **Coba kata** menguji daftar yang sedang diedit dan menunjukkan aturan mana yang cocok beserta kata pemicunya; bila tidak cocok, ada tombol "Buat aturan dari kalimat ini".

### Versi 7 (lanjutan): tampilan dan statistik
- **Pusat kendali** di tab Kata cari chatbot: kartu gradien berisi jumlah aturan dan kata kunci, cincin persentase pertanyaan yang terjawab, dan grafik batang 7 hari (terjawab vs belum terjawab).
- **Aturan terpopuler**: statistik pemakaian tiap aturan dan umpan balik warga (👍/👎); aturan yang lebih banyak 👎 diberi peringatan. Data disimpan di Redis (hash `khit`, `kup`, `kdn`, `khd`, `kmd`), dikaitkan ke kata kunci pertama aturan. Tombol "Reset statistik" tersedia.
- **Editor jawaban**: tombol Tebal, Poin, Langkah, dan "Kerangka jawaban" (Syarat, Langkah, Biaya, Jam layanan, Catatan), plus **pratinjau langsung** persis seperti tampilan di chatbot. Format yang didukung: `**tebal**`, baris diawali `- ` (poin), baris diawali `1. ` (langkah), dan label `Syarat:`, `Biaya:`, dst. dibuat tebal.
- **Chatbot**: jawaban admin tampil sebagai kartu informasi berformat, dengan tombol Salin, Bagikan ke WhatsApp, dan pertanyaan "Jawaban ini membantu?" (bila 👎, ada tombol Teruskan ke admin).
- Pencatatan pemakaian dibatasi 60 per IP per jam; hanya kata kunci yang ada di aturan yang diterima.

## Versi 8: Takok Admin lebih canggih, analisis chat
Semua analisis dibuat di server dari kata kunci bahasa Indonesia (`api/_analisa.py`): tanpa AI luar, tanpa biaya, tanpa mengirim data ke pihak ketiga. Hasilnya perkiraan, bukan keputusan akhir. Ubah daftar kata di `_analisa.py` (TOPIK, NEG_RE, POS_RE, URG2_RE, TEMPLAT_TOPIK) sesuai kebiasaan warga Surabaya.

**Kotak masuk pintar (tab Kotak masuk)**
- Tiap percakapan otomatis diberi **topik**, **nada** (keluhan/netral/puas), **urgensi**, dan **skor prioritas 0-100** (urgensi + nada + lama menunggu + label Mendesak/Eskalasi). Lencana menunjukkan lama menunggu (merah bila > 24 jam).
- Urutkan: Prioritas / Terbaru / Menunggu terlama. Filter: perlu dijawab, prioritas tinggi, tindak lanjut jatuh tempo, topik, nada, lokasi, nama/HP/petugas.
- **Cari isi percakapan** di seluruh pesan (cuplikan kata disorot).
- **Aksi massal**: centang beberapa percakapan lalu "Tandai selesai".
- Pintasan: `J`/`K` pindah percakapan, `Ctrl+Enter` kirim jawaban.

**Panel percakapan**
- **Analisis otomatis**: pertanyaan awal, jumlah pesan, topik, nada, urgensi, lama menunggu.
- **Saran balasan**: jawaban dari aturan "Kata cari chatbot" yang cocok + templat per topik; tombol Pakai mengisi kotak balasan (variabel `{nama}` dan `{loket}` diisi otomatis, juga pada templat cepat).
- **Label** (Mendesak, Tindak lanjut, Eskalasi, Menunggu berkas, Kasus khusus), **petugas penanggung jawab**, dan **tanggal tindak lanjut**.
- **Kirim & selesai**, unduh percakapan (.txt), salin ringkasan.

**Tab Analitik Chat (baru)**
Insight otomatis (jam tersibuk, topik terbanyak, topik paling banyak keluhan, tren pekan ini); KPI (waktu balas median/P90, % dibalas dalam 1 jam dan 24 jam, belum dibalas, kepuasan); usia antrean belum dibalas dan daftar yang menunggu terlama (tombol Buka); grafik pesan per hari; **peta panas jam x hari**; topik dan nada pesan; **pertanyaan yang berulang** (tombol "Buat aturan chatbot" membuka tab Kata cari dengan kata kunci terisi); loket paling banyak ditanya; awan kata; sebaran penilaian; pemohon paling aktif. Rentang 7/14/30/90 hari. Tombol **Unduh laporan analisis chat (Excel)** (5 lembar). CSV rekap kini memuat topik, nada, urgensi, prioritas, label, petugas.
Cakupan: hingga 200 percakapan terbaru (agar muat di batas 10 detik fungsi Vercel).

**Sisi pemohon**: saat mengetik pertanyaan ke admin, bila cocok dengan aturan Kata cari chatbot, jawabannya muncul langsung ("Mungkin ini sudah menjawab pertanyaan Anda") sehingga mengurangi beban admin.

Data baru di Redis: hash `tmeta` (agregat analisis per percakapan) dan `ttag` (label/petugas/tindak lanjut). Percakapan lama tetap berfungsi: analisisnya dihitung ulang dari pesan yang ada.
