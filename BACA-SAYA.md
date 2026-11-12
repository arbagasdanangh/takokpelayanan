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

## Versi 8.1: Kata cari chatbot skala besar (ribuan aturan)
Batas 100 aturan dihapus. Kini sampai **5.000 aturan** (ubah lewat variabel lingkungan `KATA_MAX`, maksimum 20.000; makin besar makin berat bagi Vercel/Upstash gratis).
- **Penyimpanan berpecahan** (hash `kata2`, 100 aturan per pecahan) dan **penyimpanan bertahap**: admin menyimpan per bagian (maks. 300 aturan atau 420 KB), lalu daftar diganti secara atomik (`RENAME`) sehingga warga tidak pernah melihat daftar setengah jadi. Data lama (`cfg.kata`) tetap terbaca otomatis.
- **Pengunjung ringan**: aturan tidak lagi ikut `/api/info`. Browser mengambilnya dari `/api/kata?v=<versi>` (cache CDN 1 tahun per versi) dan menyimpannya di localStorage. Redis hanya dibaca saat ada versi baru.
- **Pencarian terindeks** (browser dan server), tetap instan walau ribuan aturan.
- **Editor admin berhalaman** (30 aturan per halaman), dengan pencarian, filter (Perlu diperbaiki / Belum pernah dipakai / Baru), lompat ke nomor aturan, dan tombol **Gabungkan aturan kembar** (dapat diurungkan).
- **Impor** sampai 5.000 baris dan berkas 3 MB (Excel/CSV/tempel). Setelah impor, aturan baru langsung ditampilkan.
- Tidak ada lagi pembacaan seluruh daftar tiap kali admin membuka percakapan (saran balasan memakai cache per versi).

## Versi 9: Ruang Main dan tampilan baru
**Ruang Main** (banner ungu di beranda, terbuka untuk siapa saja tanpa login; file `public/main.js`):
- **Cocok Bentuk**: permainan kartu pasangan, 3 level (6/8/10 pasang), bintang berdasarkan jumlah langkah.
- **Susun Bentuk**: seret bentuk ke bayangannya (mouse/sentuh) atau ketuk bentuk lalu ketuk bayangan; 3 ronde (3, 4, 6 bentuk).
- **Ingat Urutan**: ulangi urutan pad bentuk yang menyala, makin panjang makin sulit.
- **Kuis Kilat Loket**: 5 soal "layanan ini di loket mana?" dibuat otomatis dari data loket (soal dengan uraian "Belum diisi" atau uraian kembar dilewati agar jawaban tidak ambigu). Tersedia tombol "Lihat loketnya".
- **Poin, level (4 judul), runtun hari, 8 lencana**. Semuanya tersimpan di perangkat (localStorage), tidak dikirim ke server. Suara bawaan mati (tombol di atas). Tombol Esc / Kembali menutup.
- **Admin**: kartu "Ruang Main (pemakaian anonim)" di tab Ringkasan: jumlah permainan per jenis dan per hari (hash Redis `gm:n`, `gm:d`; tanpa IP/identitas; batas 40 per IP per jam).
**Tampilan**: bentuk geometris melayang di hero dan latar, maskot "Cak Takok" dengan orbit chip (ketuk untuk membuka Asisten; sapaan berganti, termasuk hitung mundur Hari Pahlawan 1-10 November), ubin menu beranimasi, bagian "Mudah, cukup 3 langkah", dan **konfeti** saat booking berhasil dan survei terkirim. Animasi dimatikan otomatis bila perangkat memakai "kurangi gerakan". Mode gelap didukung.

## Versi 10: fitur wow (file baru `public/wow.js`)
Semua berjalan di browser, tanpa server baru dan tanpa AI luar.
**Seluruh situs**
- **Pencarian cepat (Ctrl+K / tombol "Cari cepat")**: ketik nama layanan untuk langsung membuka loketnya, atau lompat ke Booking, Tanya Admin, Status, Pengaduan, Survei, Ruang Main, dan Tema. Navigasi dengan panah dan Enter.
**Asisten Takok**
- **Efek mengetik** pada jawaban teks (mati otomatis bila perangkat memakai "kurangi gerakan").
- **Saran "Lanjut:"** di bawah tiap jawaban, menyesuaikan topik pertanyaan (NIB, SIP, PBG, status, MPP).
- **Perintah garis miring**: ketik `/` untuk menu cepat (/status, /antrean, /dokumen, /adu, /mpp, /jam, /berita).
- **Konfeti + ajakan booking** saat semua dokumen di daftar berkas tercentang.
- Tombol **Simpan** di header untuk mengunduh percakapan (.txt).
**Chat pemohon ke admin**
- **Draf otomatis** per loket (tersimpan di perangkat, dipulihkan bila halaman dimuat ulang).
- **Dikte suara** (id-ID), **templat** (Syarat, Biaya, Nomor), **emoji cepat**, **Unduh chat** (.txt).
- **Ketuk gelembung pesan untuk menyalin** teksnya.
Catatan: belum diuji di browser sungguhan; cek di perangkat sebelum deploy. Dikte suara butuh Chrome/Edge/Safari.

### Versi 10 (lanjutan): ubah/hapus pesan dan kenyamanan chat
**Tanya loket (pemohon)**
- **Ubah pesan**: tombol "Ubah" di pesan sendiri (lihat bagian CRUD di bawah; batas 15 menit sudah dicabut).
- **Hapus pesan**: kapan saja, dengan konfirmasi dua ketukan ("Yakin hapus?"). Penghapusan bersifat lunak: isi dikosongkan di server, pemohon melihat "Pesan ini dihapus", admin melihat "Pesan dihapus oleh pemohon".
- **Cari dalam percakapan** (tombol Cari), selain draf otomatis, dikte suara, templat, emoji, dan unduh chat dari versi 10.
- Server: `POST /api/pesan/ubah` dan `POST /api/pesan/hapus` (`api/app.py`; batas 8 per menit; hanya pesan milik sendiri; pemeriksaan NIK tetap berlaku). Konstanta `EDIT_MS` mengatur batas waktu ubah.
- Batasan: label topik/nada percakapan yang sudah terhitung dari teks lama tidak dihitung ulang setelah ubah/hapus. Bila satu-satunya pesan dihapus, percakapan masih tampak "belum dibalas" di admin.
**Chatbot**
- **Riwayat tersimpan** 12 jam di perangkat (hanya bila belum masuk akun, agar data status/tiket tidak tertinggal di komputer bersama), tombol "Hapus riwayat" di bilah cepat.
- **Ketuk pertanyaan sendiri** untuk menaruhnya kembali di kotak input (ubah lalu kirim ulang).

### Versi 10 (lanjutan): Editor loket (ubah konten tanpa menyunting kode)
Tab admin baru **Editor loket** (`public/loket-admin.js`). Admin bisa, langsung dari browser:
- **Ubah** nama, uraian layanan, sistem/cara layanan, zona (MPP), dan pengaturan "terima pertanyaan" tiap loket atau instansi.
- **Tambah loket baru** di lokasi mana pun (nomor otomatis berikutnya).
- **Sembunyikan / tampilkan** loket. Loket tersembunyi tidak tampil, tidak menerima booking dan pertanyaan baru, tetapi riwayat pesan dan tiket lamanya tetap aman.
- **Kembalikan bawaan** untuk loket yang pernah diubah (isi bawaan tetap ada di `api/_data.py`).
- Ada pencarian dan filter per lokasi. Setelah Simpan, perubahan langsung tampil di beranda dan chatbot tanpa deploy ulang.
Cara kerja: hasil edit disimpan di Redis (hash `loketx`) dan digabung dengan data bawaan di server (`refresh_loket` di `api/app.py`, dipakai ulang maksimal 10 detik antar-permintaan). Pengunjung memuat data terbaru tiap membuka halaman. Endpoint: `GET /api/admin/loket`, `POST /api/admin/loket/simpan`, `POST /api/admin/loket/reset`.
Batasan: nama lokasi (SPP Pusat, MPP Surabaya, dst.) dan nomor urut loket belum bisa diubah dari panel; loket tambahan tidak bisa dihapus permanen, hanya disembunyikan. Instance server lain bisa memakai data lama sampai 10 detik setelah penyimpanan. Aturan kata cari dan jawaban chatbot yang sudah ada tidak ikut berubah otomatis bila nama loket diganti; periksa tab Kata cari chatbot.

### Versi 10 (lanjutan 2): CRUD pesan penuh dan fitur chat baru
**Cache browser:** semua berkas memakai `?v=11`. Setelah deploy, bila tampilan masih lama, muat ulang keras (Ctrl+Shift+R / Cmd+Shift+R).
**CRUD pesan (pemohon dan admin)**
- **Create/Read:** kirim dan baca seperti biasa.
- **Update:** pemohon dan admin dapat **mengubah pesan sendiri kapan saja** (tanpa batas 15 menit dan tanpa syarat belum dibalas). Setiap perubahan menyimpan versi sebelumnya (maks. 5): admin melihat "Diedit pemohon, lihat versi sebelumnya" agar percakapan tetap jujur dan tidak membingungkan.
- **Delete:** hapus lunak dengan konfirmasi dua ketukan. Isi dan riwayat revisi dikosongkan di server; lawan bicara melihat "Pesan dihapus oleh ...".
- **Admin** kini juga bisa mengubah/menghapus balasannya sendiri (`POST /api/admin/pesan/ubah` dan `/hapus`); pemohon: `/api/pesan/ubah` dan `/hapus`.
**Fitur chat lain**
- **Reaksi emoji** pemohon pada balasan admin (👍 ❤️ 🙏 😊 😮, satu per pesan, ketuk lagi untuk melepas); admin melihat reaksinya (`POST /api/pesan/reaksi`).
- **Sematkan pesan penting** (maks. 5 per loket, tersimpan di perangkat) tampil sebagai kotak kuning di atas percakapan.
- **Balasan cepat** ("Terima kasih", "Sudah jelas", "Masih bingung") muncul bila pesan terakhir dari admin.
- **Tautan otomatis bisa diketuk** dan format `*tebal*` di pesan.
Batasan: bila admin menghapus balasannya, percakapan tetap dianggap sudah dijawab; label analisis topik/nada tidak dihitung ulang setelah ubah/hapus.


## Versi 11: Editor tempat pelayanan, uraian berformat, Ruang Main baru
**Perbaikan penting:** di versi 10, endpoint `GET /api/admin/loket` berada setelah penjaga "hanya POST", sehingga Editor loket selalu gagal memuat data (404). Sekarang sudah dipindah ke tempat yang benar.

**Editor loket (tab admin) kini punya dua bagian**
- **Tempat pelayanan**: ubah nama, uraian, alamat, jam layanan, telepon, tautan peta; tambah tempat baru (maks. 30); urutkan dengan tombol naik/turun; sembunyikan/tampilkan; kembalikan ke bawaan. Ada ringkasan kelengkapan uraian per tempat. Data disimpan di Redis (hash `lokx`), langsung tampil tanpa deploy. Tempat yang disembunyikan tidak tampil, tidak menerima booking/pertanyaan baru, riwayat tetap aman.
- **Loket & uraian**: pilih tempat pelayanan lalu ubah per loket. Uraian bisa berformat (tombol Tebal, Poin, Langkah, Kerangka; `**tebal**`, `- ` poin, `1. ` langkah, label `Syarat:`/`Biaya:`) dengan **pratinjau langsung**, batas 2.000 karakter. Kolom baru: jam layanan loket dan tautan informasi resmi. Filter **Uraian belum diisi**, tombol **Simpan & loket berikutnya** untuk mengisi uraian MPP satu per satu.
- **Isi massal**: unduh templat CSV per tempat, isi di Excel/Google Sheets, lalu tempel atau pilih berkas CSV (UTF-8). Ada pratinjau (diubah / sama / dilewati) sebelum diterapkan (`POST /api/admin/loket/massal`, maks. 400 baris).
- Endpoint baru: `POST /api/admin/lokasi/simpan`, `/lokasi/urutan`, `/lokasi/reset`, `/loket/massal`.

**Sisi pengunjung**: kartu "Tentang <tempat pelayanan>" di beranda (uraian, alamat, jam, telepon, Buka peta, Salin alamat); uraian loket tampil berformat beserta jam dan tautan resmi; chatbot memakai alamat/peta yang diisi admin dan punya tombol "Lihat loket" per tempat.

**Ruang Main (file `public/main.js`)**: 8 permainan, 4 baru:
- **Tebak Kata**: kata 5 huruf harian (sama untuk semua orang), 6 kesempatan, keyboard layar dan fisik, hasil bisa dibagikan sebagai kotak warna; ada mode latihan acak. Tebakan tidak dicek ke kamus.
- **Tangkap Berkas**: arcade 45 detik di kanvas. Geser dengan jari/mouse/panah, kombo hingga x4, stempel emas, jam pasir (waktu +4 dan melambat), berkas merah mengurangi nyawa.
- **Kuis Suroboyo**: 5 dari 14 soal tentang Kota Pahlawan, dengan penjelasan, bonus kecepatan dan runtun.
- **Roda Takok**: putar gratis sekali sehari, poin 10 sampai 100 plus tips layanan.
- **Tantangan Harian**: 3 tantangan acak per hari (+20 poin tiap tantangan), statistik pribadi, 7 lencana baru (total 15), judul level sampai "Legenda Suroboyo", getar bila Suara dinyalakan. Semua tetap di perangkat; server hanya menghitung jumlah main anonim (`kata`, `tangkap`, `suro`, `roda` ditambahkan).
Daftar kata Tebak Kata ada di `KW`, soal kuis di `SQ`, hadiah roda di `WH` (`main.js`). Cache browser: berkas kini `?v=12`.
Catatan: belum diuji di perangkat sentuh sungguhan; diuji otomatis di Chromium (desktop) untuk alur utama.


## Versi 12: Data KBLI, pencarian cepat, Asisten, dan Tanya Admin
**Perbaikan bug dari v11:** batas ukuran POST per jalur hanya 10 KB, sehingga "Isi massal uraian loket" akan ditolak server (`413`). Sekarang `/admin/loket/massal` dan `/admin/kbli/impor` boleh sampai 1,5 MB.

**KBLI (penting, baca dulu).** OSS memakai **KBLI 2025** (Peraturan BPS 7/2025, sekitar 1.559 kode 5 digit) sejak 15 Juni 2026; KBLI 2020 sudah tidak dipakai untuk pendaftaran baru. Takok **tidak membawa daftar KBLI sendiri** supaya tidak ada kode yang keliru. Cara mengisi:
1. Admin > tab **Data KBLI** > unduh templat CSV (atau tempel dari Excel resmi OSS/BPS). Kolom: Kode (5 angka), Judul, Uraian, Risiko, Perizinan, KBLI 2020. Judul kolom dikenali otomatis.
2. Klik **Periksa**, lalu **Terapkan**. Data disimpan di Redis (hash `kbli`, per 500 baris, diganti atomik dengan `RENAME`), pengunjung mengunduhnya sekali dan menyimpannya di browser (URL berversi, cache CDN setahun).
3. Sebelum data diimpor, pengunjung hanya melihat tautan ke oss.go.id.

**Pencarian Cepat (Ctrl+K)**: ketik `kbli warung kopi`, atau langsung kata/kode; hasil KBLI tampil dengan rincian (risiko berwarna, perizinan, padanan 2020), tombol Salin kode, Simpan ke daftar, Tanya admin, Tanya Asisten. Bahasa sehari-hari (warung, toko online, laundry, konveksi, dll.) diperluas otomatis ke istilah KBLI (`SYN` di `kbli.js`). Juga ada riwayat 5 pencarian terakhir.

**Asisten Takok**: ketik `kbli <kegiatan>` atau kode 5 angka; kartu KBLI dengan Salin/Rincian/Simpan/Tanya admin. **Daftar KBLI saya** (maks. 20): salin semua, kirim ke WhatsApp atau ke admin. Perintah baru: `/kbli`, `/tersimpan`, `/ringkas` (merangkum percakapan lalu mengirim ke admin dengan satu ketuk). Aturan "Kata cari" admin tetap diprioritaskan bila data KBLI belum ada.

**Tanya Admin**: panel **Kejelasan pertanyaan** (apa yang diurus, nomor permohonan/NIB, kendala; ketuk yang belum ada untuk menyisipkan templatnya) dan tombol **Sisipkan KBLI** (cari lalu sisip "KBLI 56xxx (judul)" ke pesan).

Catatan: sinonim pencarian hanya memperluas kata kunci, bukan data resmi. Tes otomatis memakai data KBLI **fiktif**; belum diuji dengan daftar resmi lengkap (1.559 baris) maupun di HP.

## Versi 13: perbaikan Kata cari (HP) dan fitur pintar untuk chatbot dan pertanyaan warga
**Bug yang diperbaiki (penting).** Game Tebak Kata (v11) memakai kelas CSS `.kt` untuk kotak hurufnya, padahal admin Kata cari chatbot juga memakai `.kt` untuk kartu aturan. Akibatnya semua kartu aturan tinggi 52 px, hurufnya besar dan kapital, dan form edit terpotong sehingga aturan tidak bisa dibuka atau diedit. Kotak game kini memakai kelas `.kwt` (`style.css`, `main.js`). Juga: kata kunci di ringkasan aturan sebelumnya disembunyikan di layar kecil (`.tag{display:none}`); sekarang aturan itu hanya berlaku untuk baris loket publik.

**Tampilan HP (halaman Kata cari)**
- Tab admin menjadi satu baris yang bisa digeser, tab aktif otomatis tergulir ke tengah.
- Kartu aksi (Tambah aturan, Impor, Tempel, Ekspor, Templat) bisa digeser ke samping.
- Aturan: kata kunci tampil sebagai chip, ada panah buka-tutup, form edit lebih lega (huruf 16 px agar iOS tidak memperbesar layar, tombol format bisa digeser, tombol aksi dua kolom).
- Pencarian dan filter bertumpuk penuh, pager dirapikan (teks halaman di atas, tombol sebaris, lompat ke nomor selebar layar).
- Bilah Simpan memakai teks pendek ("Tersimpan" / "Belum disimpan") dan tombol Tanya Asisten naik di atasnya sehingga tidak bertabrakan.

**Fitur baru (file `public/kata-plus.js`, tanpa perubahan server)**
1. **Pertanyaan belum terjawab dikelompokkan**: varian serupa digabung per topik (kemiripan kata), diurutkan dari yang paling sering, label **Prioritas** untuk 3x atau lebih, daftar varian, dan peringatan **"Mungkin sudah tercakup aturan #n"** dengan tombol Lihat. "Buat aturan" memakai kata kunci dari semua varian; "Abaikan" menghapus seluruh varian topik itu.
2. **Saran kata kunci otomatis** di tiap aturan: diambil dari isi jawaban (singkatan seperti KTP/SIM dan nama diri diberi bobot) dan nama loket; ketuk chip untuk menambahkannya.
3. **Cek kualitas aturan** langsung saat mengetik: kata kunci kurang dari 2, jawaban terlalu singkat atau terlalu panjang tanpa poin, belum ada loket tujuan; hijau bila lengkap.
4. **Jadikan aturan chatbot**: di Kotak masuk, tombol di balasan admin membuat aturan baru dari pertanyaan warga (kata kunci) dan jawaban admin (isi), lengkap dengan loket percakapan, lalu membuka tab Kata cari. Periksa dan hapus data pribadi sebelum Simpan.
5. **Chatbot: "Maksud Anda...?"**: bila pertanyaan tidak ditemukan dan ada salah ketik (mis. "skckk", "mengemudy"), muncul saran kata yang benar dari kata kunci aturan dan nama loket; ketuk untuk langsung bertanya.

Cache browser: semua berkas kini `?v=14`. Bila tampilan lama masih muncul setelah deploy, muat ulang keras.
Diuji otomatis di Chromium (ukuran HP 390 px dan desktop 1100 px, dengan data tiruan); belum diuji di perangkat sentuh sungguhan maupun dengan data produksi.

## Versi 14: Bangun Usaha 3D (permainan ke-9 di Ruang Main)
File baru `public/usaha3d.js` (+ gaya di akhir `style.css`). Maket 3D dibuat **murni dari CSS 3D**: tanpa library, tanpa gambar, tanpa server baru, jadi aman terhadap CSP yang ada. Langit mengikuti jam WIB (siang, senja, malam dengan jendela menyala).
- **Tonton animasi**: Dani ingin membuka usaha, memilih KBLI, mendaftar NIB di OSS, mengecek perizinan sesuai risiko, memastikan lokasi (KKPR dan PBG), lalu usahanya berdiri tahap demi tahap (papan KBLI, fondasi, dinding, atap, grand opening dengan pelanggan berjalan, mobil lewat, balon). Maket bisa diputar dengan geser jari/mouse, tombol putar, atau panah kiri/kanan.
- **Main 5 tantangan**: tiap jawaban benar membangun maketnya (poin 10 bila langsung benar, 4 bila setelah salah, bonus 20; bintang menurut jumlah salah). Soal: KBLI mana yang cocok, di mana mendaftar NIB, langkah setelah NIB, tempat usaha, dan cara minta bantuan tanpa calo/OTP.
- 10 contoh usaha: Warung Makan 56102, Kafe 56303, Toko Online 47911, Laundry 96011, Katering 56210, Konveksi 14111, Roti & Kue 10710, Bengkel Mobil 45201, Percetakan 18110, Toko Pakaian 47711. Ubah di `BIZ` (`usaha3d.js`).
- **Penting soal KBLI**: kode di atas hanya **contoh belajar** (urutan KBLI 2020) dan wajib diperiksa ulang. Layar selalu menampilkan catatan ini. Bila admin sudah mengimpor data KBLI 2025 (tab Data KBLI), kode contoh dicocokkan otomatis dengan data itu dan judul resminya ditampilkan; bila tidak ada, pemain diarahkan mencari kode yang tepat. Isi tips tiap usaha bersifat umum; periksa ke loket.
- Kartu besar "Bangun Usaha 3D" (dengan maket kecil yang berputar) di menu Ruang Main, tombol baru **Animasi usaha 3D** di banner beranda, dan entri di Pencarian Cepat (Ctrl+K).
- 2 lencana baru (Juragan Muda, Calon Wirausaha; total 17), tantangan harian baru, hasil bisa dibagikan, tombol "Tanya Asisten: KBLI xxxxx" dan "Booking kunjungan" di akhir animasi. `Maniak Main` kini butuh 9 permainan.
- Server: `usaha` ditambahkan ke daftar `GAMES` (`api/app.py`) dan label admin (`fitur.js`) untuk hitung pemakaian anonim.
- Aksesibilitas: mode "kurangi gerakan" mematikan animasi (maket tetap bisa diputar manual); langkah ditulis sebagai teks, bukan hanya gambar.
Diuji otomatis di Chromium (HP 400 px terang, desktop 1100 px gelap): menu, animasi, 5 tantangan, hasil, penyimpanan lencana, tanpa galat skrip. Belum diuji di HP sungguhan; maket memuat sekitar 400 elemen CSS sehingga HP lama bisa terasa berat. Cache browser: berkas kini `?v=15` (muat ulang keras bila tampilan lama).

## Versi 15: Asisten lebih pintar dan kartu per loket (file baru `public/plus.js`)
Semua berjalan di browser dari data loket dan aturan "Kata cari" yang sudah ada: tanpa AI luar, tanpa server baru. Cache browser: berkas kini `?v=16`.

**Asisten Takok**
- **Ingat topik, jawab pertanyaan lanjutan**: setelah bertanya soal NIB, cukup ketik "biayanya?", "berapa lama?", "syaratnya?", "jam bukanya?", "di mana?", atau "booking". Jawaban diambil dari baris berlabel (Biaya:, Lama proses:, Syarat:) pada jawaban admin atau uraian loket. Bila datanya tidak ada, Asisten tidak menebak, tetapi menawarkan menanyakannya ke loket.
- **Pemandu Kesiapan** (`/pandu`, "cek kesiapan"): kuis ya/belum per dokumen, hasil berupa persentase kesiapan, daftar yang sudah siap dan yang kurang, kirim kekurangan ke WhatsApp, atau tanya loket. Jawaban "ya" otomatis mencentang daftar dokumen.
- **Rencana Kunjungan** (`/rencana`): centang beberapa urusan; Asisten menyusun urutan loket (Pengambilan di akhir) dan menggabungkan dokumen tanpa duplikat (KTP/NPWP), bisa disalin atau dikirim ke WhatsApp.
- **Progres dokumen** (`/progres`): ringkasan semua daftar dokumen.
- **Tanya loket dari chat** (`/tanya`, atau `tanya loket cs: isi pertanyaan`): pilih loket, tulis pertanyaan, Asisten memeriksa dulu apakah sudah ada jawabannya (aturan Kata cari), lalu mengirim langsung ke loket. Memakai penjaga NIK dan batas kirim yang sama.
- **Jam sepi** (`/sepi`): membaca kuota booking nyata (`/api/slot`) untuk 3 hari kerja terdekat dan menyorot jam paling lengang. Perlu masuk.

**Pertanyaan per loket (daftar loket)**
- **Aksi cepat** di tiap loket: Booking loket ini, Tanya Asisten (konteks loket terisi), Cek jam sepi, Salin info, Bagikan ke WhatsApp.
- **FAQ per loket** otomatis dari aturan Kata cari yang tujuannya loket itu (Salin, 👍/👎 yang ikut statistik aturan, Tanya admin dengan kutipan topik).
- **Jenis pertanyaan** (Syarat, Biaya, Lama proses, Status berkas, Jadwal, Keluhan): menambahkan penanda seperti `[Biaya]` dan kalimat awal ke kolom pesan, sehingga admin lebih cepat memilah.
- **Lampirkan data saya**: satu ketuk menyisipkan nomor permohonan atau tiket booking aktif untuk loket itu.
- **Meter tunggu balasan**: lama menunggu dibanding median balasan admin; bila jauh lebih lama dari biasanya muncul tombol "Ingatkan admin via WhatsApp".

Perubahan di berkas lama (kecil): `bot.js` (menu, fungsi `goBook`, pengait `BOTX.pre`, objek `BOTI`), `wow.js` (daftar perintah), `style.css` (akhir berkas), `index.html`.
Diuji otomatis di Chromium (HP 390 px dan desktop) dengan API tiruan dari data loket asli: semua alur lolos tanpa galat skrip. Belum diuji dengan Redis/produksi dan di perangkat sentuh sungguhan. Batasan: panel loket (hasil jam sepi, FAQ terbuka) menutup bila daftar dirender ulang saat ada pesan baru.

## Versi 16: Nomor tiket di setiap komentar (server + klien)
- **Aturan tiket**: satu tiket = satu rangkaian pertanyaan di satu loket. Setiap pesan (pemohon maupun admin) membawa nomor tiketnya, format `TKT-YYMM-NNNNN`. Pesan baru setelah admin menekan "Tandai selesai" otomatis membuka tiket baru. Pesan lama (sebelum versi ini) tidak bernomor dan tetap tampil normal.
- **Server (`api/app.py`)**: `tiket_aktif()` memberi nomor; `add_msg` menyimpan `tk` di tiap pesan; `/pesan` kini mengembalikan `tiket` (status Diterima, Dibaca admin, Dibalas, Selesai; waktu balasan pertama; jumlah pesan); `POST /pesan` dan balasan admin mengembalikan `tk`; `GET /admin/tiket?no=` mencari percakapan dari nomor tiket (termasuk tiket lama). Kunci Redis baru: `tkt`, `tktidx`, `seq:tiket`.
- **Pemohon**: nomor tiket muncul di setiap gelembung chat (ketuk untuk menyalin), notifikasi "Nomor tiket Anda: ..." setelah mengirim, notifikasi saat tiket selesai, bagian **Tiket saya** di Percakapan Saya (cari, filter Aktif/Selesai, garis waktu status, salin/bagikan ringkasan), pencarian nomor di palet Ctrl+K, dan di Asisten: `/tiket`, "cek tiket", atau langsung ketik nomornya.
- **Admin**: lencana nomor tiket di daftar inbox, nomor di kepala percakapan, kolom cari inbox bisa memakai nomor tiket (tiket lama dibuka lewat server), dan pesan WhatsApp pemberitahuan menyertakan nomor tiket.
- Diuji: logika server dengan Redis tiruan (nomor sama dalam satu rangkaian, tiket baru setelah selesai, status Dibalas/Selesai) dan alur pemohon di Chromium. Tampilan admin hanya diperiksa sintaksnya, belum dijalankan di browser. Cache browser: `?v=17`.

## Versi 17: Usaha 3D lebih detail

`public/usaha3d.js` ditulis ulang, `public/style.css` ditambah blok v17. Tetap CSS 3D murni (tanpa library, tanpa gambar, aman untuk CSP).

- Tekstur: bata, papan kayu, genteng, seng, kaca gedung, rumput, paving, aspal, zebra cross, plus bayangan dan kota di latar.
- Fasad rinci per usaha: jendela berkusen, pintu kaca, lampu dinding, tanda BUKA, pintu rolling bengkel, dekor khas tiap usaha.
- Properti khas tiap usaha (10 usaha): meja payung, papan menu, pot tanaman, jemuran, rak baju, ban dan drum oli, X-banner, dll.
- Tahap konstruksi: pagar proyek, perancah, tumpukan bata, molen, pekerja berhelm. Hilang saat grand opening.
- Grand opening: karangan bunga, balon, lampu hias, pos Takok, antrean pelanggan, mobil dan motor lewat.
- Kamera: tombol Depan/Samping/Atas/Bebas, miring, zoom, seret (mouse juga vertikal), panah dan +/- di keyboard, Ctrl+roda. Kamera bergerak sendiri saat animasi dan saat jawaban benar.
- Siang/Senja/Malam bisa dipilih manual (jendela dan lampu menyala saat malam).
- Detail Tinggi/Hemat, tersimpan di perangkat (HP berprosesor kecil mulai dari Hemat).
- "Jelajahi maket": 5 pin (papan KBLI, NIB, bangunan, papan nama, pos Takok) dengan penjelasan dan tombol ke Asisten/booking.
- Soal diacak dari 2 variasi per tahap, plus soal khusus (halal, limbah, toko online) sesuai jenis usaha.
- Cache `?v=19`. Contoh usaha ditambah jadi 18, ditambah kotak "Cari KBLI lain": bila data KBLI sudah diimpor admin, hasil pencarian bisa langsung dibangun; bila belum, ketik kode 5 digit + nama usaha. Tampilan dipilih otomatis dari golongan pokok KBLI.

## Data KBLI bawaan (v20)
Seluruh KBLI 2025 (1.559 kode, sumber Peraturan BPS 7/2025) sudah dibawa di `public/kbli-2025.json` dan otomatis dipakai pencarian, Ctrl+K, penyisip KBLI Tanya Admin, serta game Bangun Usaha 3D (cari, atau jelajahi per golongan). Bila admin mengimpor data KBLI sendiri di tab "Data KBLI", data impor itu yang didahulukan; menghapusnya mengembalikan ke data bawaan.

## Pandu KBLI (v21-22)
Tile baru "Pandu KBLI": cari kode dari kata sehari-hari, lihat peringatan "bukan ini?" (diambil dari kalimat "tidak mencakup ... lihat kode ..." di uraian resmi), pilih beberapa KBLI, centang dokumen, lalu cetak/salin "Paket Siap Datang" atau kirim ke Tanya Admin/Asisten. File: `public/kbli-pandu.js`. Contoh usaha di game sudah diperbarui ke kode KBLI 2025.

## Tebak KBLI Harian (v23)
Permainan ke-10 di Ruang Main (`public/tebak-kbli.js`): 5 soal harian yang sama untuk semua orang dari 1.559 KBLI 2025 (uraian -> judul, judul -> kode), penjelasan tiap jawaban, hasil bisa dibagikan sebagai kotak hijau/merah, poin penuh hanya untuk permainan harian pertama, plus latihan acak. Pemakaian dihitung anonim di statistik admin seperti permainan lain.

## Asisten Piket + percakapan lebih rapi (v26)
- **Asisten Piket** (pengganti pegawai sementara): admin buka tab "Asisten Piket" lalu pilih mode: Mati / Pegawai tidak di tempat (langsung menjawab) / Cadangan (menjawab bila pegawai belum membalas dalam N menit). Jawaban dibuat dari aturan "Kata cari chatbot" + templat topik (tanpa AI luar), diberi label "jawaban otomatis", maksimal 3 beruntun, percakapan tetap tercatat "belum dijawab" untuk ditinjau pegawai. Pengaduan/pesan mendesak hanya dijawab dengan pernyataan diteruskan ke pegawai. Warga bisa menekan "Minta dijawab pegawai" (tag Eskalasi). Mode Cadangan dipicu saat warga membuka percakapan (Vercel tidak punya proses latar).
- **Percakapan rapi**: kartu status + nomor tiket, pemisah hari (Hari ini/Kemarin), pesan beruntun dikelompokkan, gelembung khusus Asisten Piket, daftar "Percakapan saya" dikelompokkan (Perlu Anda lihat / Menunggu balasan) dengan saringan dan pencarian tiket, dan tombol "Cari kode KBLI" ke Pandu KBLI.

## Tanya Plus (v28)
- **Jawaban Instan**: saat warga mengetik pertanyaan di loket, muncul jawaban dari aturan Kata cari (plus saran kode KBLI bila menyangkut usaha). "Sudah terjawab" membatalkan pengiriman dan dihitung sebagai pertanyaan yang selesai tanpa pegawai; "Tetap kirim ke pegawai" menyembunyikan saran.
- **Ramai ditanyakan minggu ini**: kata kunci aturan yang paling sering dipakai 7 hari terakhir (anonim, endpoint publik `/api/populer`, cache 5 menit), tampil di beranda dan di chatbot. Jika belum ada data, tampil "Sering ditanyakan".
- **Mulai dari sini** di chatbot: jalur cepat untuk buka usaha, PBG, perpanjang izin, mengadu, dan Pandu KBLI.
File: `public/tanya-plus.js`.

## Waktu pengerjaan (v30)
Tebak KBLI: 20 detik per soal; Bangun Usaha 3D: 30 detik per tahap. Batang waktu + hitung mundur (`public/waktu.js`), waktu habis dihitung salah dan jawaban benar ditampilkan, bonus kecepatan (+2 poin Tebak KBLI, +3 poin 3D), total waktu tampil di hasil dan di teks bagikan. Tombol "Mode santai" mematikan batas waktu (diingat di perangkat, ramah untuk pemula/lansia).

## Pandu Zona + Tebak Zona (v31)
- **Pandu Zona & Instansi** (tile baru, `public/pandu-zona.js`): pencarian seperti KBLI untuk semua loket/instansi di 6 lokasi dan Zona MPP. Ketik kebutuhan ("pajak", "bpjs", "cerai", "sertifikat tanah", "skck") atau "zona 4"; ada kata padanan, dukungan aturan Kata cari, saringan per zona/lokasi, dan tombol Buka loket / Tanya Asisten.
- **Tebak Zona MPP** (permainan ke-11, `public/tebak-zona.js`): 5 soal harian, 15 detik per soal (Mode santai tersedia), soal "instansi X di zona berapa?" dan "instansi mana di Zona N?". Memakai data loket yang sudah ada, jadi otomatis ikut bila admin mengubah zona di Editor loket.

## Kanal WhatsApp & Telegram (v32)
Asisten Takok menjawab langsung di WhatsApp (Cloud API) dan Telegram: sapaan/menu, `KBLI <usaha>` atau kode 5 angka, `loket <kebutuhan>` / `zona 4`, `jam`/kontak, aturan Kata cari, dan jawaban NIB. Pertanyaan yang tak terjawab otomatis masuk daftar "Pertanyaan belum terjawab". Admin: tab **Kanal WA & Telegram** (status, saklar, simulator tanpa akun WA, panduan, log). Kode: `api/_bot.py`, `public/kanal-admin.js`.

Variabel lingkungan di Vercel (semua rahasia, jangan dimasukkan ke kode):
- Telegram: `TG_TOKEN`, `TG_SECRET`, `TG_USER` (nama bot tanpa @). Webhook: `https://DOMAIN/api/tg` (set lewat setWebhook dengan `secret_token=TG_SECRET`).
- WhatsApp: `WA_TOKEN`, `WA_PHONE_ID`, `WA_SECRET` (App Secret), `WA_VERIFY`, opsional `WA_BOT_NUM`. Callback: `https://DOMAIN/api/wa`, subscribe ke `messages`.
Keamanan: tanda tangan `X-Hub-Signature-256` (WA) dan header rahasia (Telegram) wajib; tanpa variabel itu webhook menolak (503/403). Duplikat pesan dibuang, batas 30 pesan/jam/pengirim, nomor tidak disimpan (hanya 3 digit terakhir di log). `vercel.json` sudah memuat rewrite `/api/wa` dan `/api/tg` serta menyertakan `public/kbli-2025.json` ke fungsi.

## Tur Demo (v33)
Tombol "▶ Tur Demo" (kiri bawah), alamat `/?demo=1`, atau tombol Alt+D menjalankan tur otomatis ±90 detik: pencarian, Pandu KBLI, Paket Siap Datang, Pandu Zona, chatbot, Ruang Main, Tebak KBLI, lalu ringkasan fitur admin. Ada jeda/mundur/maju/berhenti (Esc). Cocok untuk presentasi lomba: bagikan tautan `/?demo=1`. File: `public/demo.js`. Tidak mengirim data apa pun ke server.

## Akun admin per loket dan superuser (v34)
Ada dua jenis peran admin:
- **Superuser**: akses penuh. Masuk dengan **nama pengguna dikosongkan** (atau `superuser`) dan kata sandi utama (`ADMIN_PASSWORD`, lalu diganti lewat Pengaturan). Superuser juga bisa membuat superuser tambahan.
- **Admin loket**: akun dengan satu atau beberapa loket (`kunci` seperti `mpp_08`). Hanya melihat dan mengelola untuk loket itu: percakapan (balas, catatan, label, selesai, hapus), pencarian isi pesan, tiket, booking dan panggil antrean, permohonan, analitik chat, rekap SKM, dan laporan CSV/Excel chat (semuanya hanya data loketnya). Ringkasan hanya menghitung loketnya; jumlah pemohon terdaftar dan statistik Ruang Main disembunyikan.

Tab **Akun admin** (hanya superuser): tambah, ubah, nonaktifkan, dan hapus akun; pilih loket per lokasi (ada tombol "Pilih semua" per lokasi); setel ulang kata sandi dengan mengisi kolom kata sandi saat mengubah. Perubahan berlaku pada permintaan berikutnya: akun yang dinonaktifkan, dihapus, atau diganti kata sandinya langsung keluar, dan perubahan loket langsung berlaku tanpa masuk ulang.

Hanya superuser yang dapat: Pengaturan (WA, jam, pengumuman, kuota booking, templat balasan), Berita, Kata cari chatbot, Editor loket, Asisten Piket, Kanal WA & Telegram, Data KBLI, unduh database (Excel), dan mengelola akun. Admin loket yang memanggil rute ini mendapat 403 dari server (bukan hanya disembunyikan di tampilan).

Catatan:
- Pembatasan ada di server (`api/app.py`: `ADM_SUPER`, `boleh`, `izin`); wewenang dibaca ulang dari Redis pada setiap permintaan, bukan dari cookie.
- Permohonan kini punya kolom `kunci` (loket). Admin loket wajib memilih loketnya saat mencatat permohonan. **Permohonan lama (tanpa loket) hanya terlihat oleh superuser.**
- Survei SKM dihubungkan ke loket lewat `unit`. Penilaian per instansi MPP (id `mpp_s1` dst.) bukan kunci loket, jadi hanya terlihat oleh superuser; penilaian seluruh lokasi (tanpa unit) juga hanya superuser.
- Batas percobaan masuk: 6 kali per nama pengguna per 15 menit dan 15 kali per IP per 10 menit (dinaikkan dari 5 karena petugas satu kantor sering berbagi IP). Kata sandi akun minimal 8 karakter, disimpan sebagai hash PBKDF2. Maksimal 200 akun.
- Data akun ada di Redis hash `adm` (dan `admlog` untuk waktu masuk terakhir). Tidak ada variabel lingkungan baru.

## Versi 35: Pendamping Kunjungan dan Asisten lebih cerdas (file baru `public/pendamping.js`)
Semua berjalan di browser dari data yang sudah ada (booking, permohonan, tiket, daftar dokumen, loket): tanpa AI luar, tanpa server baru, tanpa variabel lingkungan baru. Cache browser: berkas kini `?v=35`.

**Pita Tiket Aktif (semua halaman, pemohon yang masuk)**
- Muncul di bawah bilah atas bila punya booking aktif hari ini: kode tiket, loket, jam, **jumlah antrean di depan** (diperbarui tiap 30 detik selama halaman terbuka), hitung mundur, tombol **Saya sudah tiba** (aktif 60 menit sebelum jam booking, sama dengan aturan server), **Rute** (Google Maps) dan **Pendamping**.
- Saat petugas menekan Panggil, pita berubah kuning berdenyut "Giliran Anda!".
- Pengingat lokal (notifikasi/toast, hanya saat halaman terbuka): "Antrean hampir tiba" (3 antrean lagi), "Giliran Anda berikutnya", dan "Saatnya berangkat".
- Hemat kuota Redis: data booking ikut polling yang sudah ada; hanya bila ada tiket aktif hari ini, tambah satu `GET /api/booking` tiap sekitar 30 detik (hanya saat tab terlihat).

**Pendamping Hari Kunjungan (chat: `/harini`, "kunjungan hari ini", atau tombol Pendamping)**
Kartu per tiket: garis waktu (Terjadwal, Sudah tiba, Dipanggil), antrean di depan, hitung mundur, **jam berangkat paling lambat** (pilih lama perjalanan 15 sampai 90 menit, diingat di perangkat; tiba 15 menit sebelum jam booking), check-in, rute, telepon loket, dan progres daftar dokumen yang cocok.

**Urusan Saya (kartu di beranda dan chat: `/urusan`, "urusan saya", "apa yang harus saya lakukan")**
Daftar langkah berikutnya, urut paling mendesak: giliran dipanggil, kunjungan hari ini/mendatang, permohonan "Perlu perbaikan berkas" / "Siap diambil" / "Ditolak", balasan admin, dan daftar dokumen yang belum lengkap. Setiap baris punya tombol aksi.

**Lembar Pengantar (chat: `/pengantar`)**
Satu halaman berisi nama dan HP akun, keperluan singkat (opsional, NIK 16 digit ditolak), tiket antrean + barcode Code 39, permohonan aktif, daftar dokumen (centang sesuai progres), dan KBLI pilihan. Bisa **Cetak / simpan PDF**, **Salin teks**, atau kirim ke WhatsApp. Tidak memuat NIK dan diberi catatan "bukan dokumen resmi".

**Asisten lebih cerdas**
- **Rencana Gabungan**: kalimat seperti "mau buka usaha dan renovasi rumah" dikenali sebagai 2 urusan; Asisten menyusun urutan loket per urusan dan **menggabungkan daftar dokumen** (KTP/NPWP kembar jadi satu, diberi tanda "dipakai di 2 urusan"), lengkap dengan tombol Booking dan Cetak lembar pengantar.
- **Klarifikasi "Pilih salah satu"** untuk kata yang terlalu umum (izin, bayar, usaha, tanah, kesehatan, KTP/KK). Daftar ada di variabel `AMB` (`pendamping.js`).
- **Bantu pilih bidang** (`/bantu`, "bingung"): 8 bidang (usaha, bangunan dan tanah, kesehatan, pajak dan pembayaran, kependudukan, hukum dan ketenagakerjaan, lansia dan difabel, pengaduan) dengan pilihan layanan yang paling sering dicari (variabel `BID`). Muncul juga otomatis saat pertanyaan tidak ditemukan.
- **Saran ketikan** di kolom chat: ketik 2 huruf, muncul sampai 5 saran dari kata kunci aturan "Kata cari", nama loket, daftar dokumen, dan frasa umum; panah atas/bawah + Enter atau ketuk.
- **"Apakah loket buka sekarang?"**: menjawab menurut jam booking (hari kerja 08.00 sampai 14.00 WIB) dan jam yang diumumkan di Pengaturan. Hari libur nasional tidak dihitung otomatis.
- Tombol cepat baru di bilah chat: Kunjungan hari ini, Urusan saya, Lembar pengantar, Bantu pilih bidang; perintah `/harini`, `/urusan`, `/pengantar`, `/bantu` di menu garis miring.

**Perbaikan dari versi sebelumnya**
- **Cetak "Paket Siap Datang" KBLI sebelumnya bisa tercetak kosong**: aturan cetak lama `body *{visibility:hidden}` ikut menyembunyikannya. Sudah diperbaiki di `style.css`.

**File yang berubah**: `public/pendamping.js` (baru), `public/style.css` (akhir berkas), `public/index.html` (skrip baru, `?v=35`), `public/wow.js` (4 perintah menu garis miring). Server (`api/`) tidak diubah.

**Pengujian**: diuji otomatis di Chromium (HP 390 px terang dan gelap, desktop 1100 px) dengan API tiruan dari data loket asli: pita (Terjadwal, check-in, jauh dari jam, Dipanggil), kartu pendamping, Urusan Saya, cetak lembar (media cetak), Rencana Gabungan, semua tombol klarifikasi/bidang menemukan loket, saran ketikan dengan keyboard. Belum diuji dengan Redis/produksi, di HP sungguhan, maupun dengan printer. Antrean "di depan" memakai data server apa adanya (tiket aktif di loket yang sama dengan jam lebih awal); petugas tetap menentukan urutan panggilan.

## Versi 36: Persyaratan per loket dan halaman Booking yang rapi
**Persyaratan per loket (tidak lagi satu daftar umum)**
- Tiap loket punya kolom baru **Persyaratan** (`syarat`). Admin mengisinya di **Admin > Loket > Ubah > "Persyaratan yang harus dibawa"**: satu syarat per baris; baris berawalan `# ` adalah judul layanan (mis. `# Izin penyelenggaraan parkir`), sehingga satu loket bisa punya beberapa layanan dengan syarat berbeda.
- **Isi awal bawaan** (`api/_syarat.py`) hanya untuk Loket Dishub (parkir, Andalalin), BPJS Kesehatan, BPJS Ketenagakerjaan, dan Polrestabes (SKCK). Ini **panduan umum yang belum diverifikasi loket**; tampil dengan label "belum diverifikasi" sampai admin menyimpannya sendiri (lalu berlabel "Terverifikasi admin loket"). Loket lain tampil "Persyaratan belum diisi" dengan tombol Tanya admin.
- Tampil di: daftar loket di beranda, kartu loket di chat (tombol **Persyaratan**), **Booking** (di bawah pilihan loket, di rencana kunjungan "Yang perlu dibawa", dan di tiap tiket), **Pendamping Hari Kunjungan**, dan **Lembar Pengantar** (per tiket sesuai loketnya, bukan daftar umum). Pemohon bisa mencentang; centangan tersimpan di perangkatnya.
- Chat: "dishub parkir syaratnya apa aja" menampilkan syarat parkir lebih dulu (layanan lain dilipat); "syarat bpjs" menanyakan BPJS Kesehatan atau Ketenagakerjaan; "syarat skck" dikenali sebagai Polrestabes. Pertanyaan seperti "syarat PBG" tetap dijawab panduan umum yang lama.
- Server: `api/app.py` menyimpan dan memvalidasi `syarat` (maks 40 baris x 160 huruf); `/api/info` menambah dua kolom di tiap baris loket (daftar syarat, penanda terverifikasi). Isi massal uraian tidak menghapus syarat yang sudah dikonfirmasi admin. Isi massal syarat lewat CSV belum ada.

**Booking Kunjungan untuk pemohon dengan banyak kunjungan** (`public/booking-rapi.js`)
- Ringkasan angka (Hari ini, Mendatang, Riwayat) dan dua tab **Aktif** dan **Riwayat**.
- Tiap kunjungan berupa baris ringkas (tanggal, jam, loket, status); ketuk untuk membuka tiket lengkap (barcode, check-in, batal, kalender, cetak) dan persyaratan loketnya. Kunjungan terdekat otomatis terbuka; keadaan buka/tutup tidak hilang saat data diperbarui tiap 15 detik.
- Dikelompokkan per tanggal (Hari ini, Besok, ...), pencarian (kode, loket, tanggal, keperluan), dan "Tampilkan 10 lagi".
- Formulir **Buat booking baru** dilipat bila pemohon sudah punya booking, supaya daftar kunjungan langsung terlihat.

**File berubah**: `public/syarat.js`, `public/booking-rapi.js`, `api/_syarat.py` (baru); `api/app.py`, `public/app.js`, `public/bot.js`, `public/loket-admin.js`, `public/pendamping.js`, `public/style.css`, `public/index.html` (`?v=36`).
**Diuji** di Chromium (HP 390 px) dengan 35 booking tiruan: tab, buka/tutup, cari, muat lebih banyak, centang, panel syarat di formulir, chat Dishub/BPJS/SKCK, lembar cetak. Logika server diuji dengan Redis tiruan; belum diuji di produksi.

## Pembaruan versi 46
- **Perbaikan "Cari izin" di desktop**: tombol melayang tertutup tombol "Tur Demo" di layar lebar (di HP posisinya sudah bergeser, jadi hanya terlihat di mobile). Kini tombol berada di atas "Tur Demo" dan ada tombol "Cari izin" di bilah atas. `Ctrl+K` membuka Cari izin; pencarian cepat berpindah ke `Alt+K` (sebelumnya keduanya bentrok di `Ctrl+K`).
- **Asisten Takok Pro** (`public/bot-pro.js`): ingat konteks loket (tanya "biayanya?", "berapa lama?", "syaratnya?", "jam bukanya?"), tombol "Tanya lanjut", cari izin lewat chat (`/izin perpanjang parkir`), koreksi salah ketik ("Maksud Anda..."), menu perintah `/`, riwayat pesan (panah atas), efek mengetik, tombol Membantu/Belum (jawaban "Belum" dicatat anonim ke daftar pertanyaan tak terjawab), menu ⋯ (bersihkan, unduh, salin, cetak, mode lebar untuk desktop).
- **Admin baru** (`public/admin-plus.js`): tab **Laporan** (cetak/PDF + CSV), **Direktori pemohon**, **Log aktivitas** (siapa mengubah apa; tanpa isi pesan), **Kesehatan sistem** (cek SESSION_SECRET, Redis, kanal, kata sandi bawaan, KBLI, loket tanpa syarat). Tiga tab terakhir hanya untuk superuser dan dibatasi di server.

## Pembaruan versi 47 (tampilan)
- **Admin**: navigasi samping berkelompok dengan ikon dan lencana jumlah pesan di Kotak masuk (di HP tetap deretan tab yang bisa digeser), kartu, tabel, dan formulir dirapikan, terang dan gelap. File: `public/percantik.css`, `public/percantik.js`.
- **Asisten Takok**: judul tidak lagi sesak (pengaturan Suara, Huruf besar, Suroboyoan, Salin, Simpan pindah ke menu ⋯), gelembung dan kartu lebih bersih, kartu sambutan enam pintasan, tombol melayang disembunyikan saat chat terbuka.

## Pembaruan versi 48
- **Perbaikan "Cari izin" ganda di desktop**: tombol melayang kiri-bawah kini disembunyikan di layar 820 px ke atas karena tombol yang sama sudah ada di bilah atas. Di HP tombol melayang tetap ada. Aturan ada di `public/keren.css`.
- **Game baru Suroboyo Rush** (`public/rush.js`): runner 3 jalur bergaya pseudo-3D. Cak Takok berlari di jalan Surabaya (ada Tugu Pahlawan), langit berganti siang, senja, malam. Ambil berkas (+10) dan stempel emas (+40), Jalur Cepat (kebal dan menerobos 5 detik), hati (+1 nyawa); hindari antrean dan formulir salah. Kombo hingga x4, kecepatan naik bertahap. Kontrol: geser, ketuk sisi layar, panah, A/D. Terhubung ke poin, lencana baru **Pelari Kota Pahlawan**, dan tantangan harian. `api/app.py`: "rush" ditambahkan ke daftar permainan yang dihitung.
- **Tampilan beranda interaktif** (`public/keren.js`, `public/keren.css`): bilah kemajuan gulir dan tombol ke atas bercincin; jam WIB hidup di hero dengan keterangan jam booking; pita tips berjalan; ubin menu bercahaya mengikuti kursor dan miring halus; konten muncul saat digulir; lembar pintasan (tekan `?`), tombol `G` membuka Ruang Main; kode rahasia ↑↑↓↓←→←→ untuk Mode Pahlawan. Semua menghormati pengaturan "kurangi gerakan".
- **Diuji** di Chromium (desktop 1224 px dan HP 390 px) dengan API tiruan: tombol ganda hilang di desktop, game dimainkan sampai selesai tanpa galat JS. Belum diuji di produksi.

## Pembaruan versi 49
- **Jam WIB dirapikan**: kini baris sendiri di bawah tombol "Ngobrol dengan Asisten Takok", tidak lagi menimpa ilustrasi kota dan gelembung maskot. Keterangannya lebih berguna: "Jam booking berlangsung" atau "Booking tutup, buka lagi hari ini/besok/Senin 08.00". Di HP jadi dua baris.
- **Sapaan personal**: setelah pemohon masuk, baris kecil di hero menjadi "Selamat pagi, Danang!" (menyesuaikan waktu WIB).
- **Warna tampilan**: tombol palet di bilah atas membuka pilihan 6 warna (biru, hijau, ungu, tosca, oranye, merah). Berlaku untuk tema terang dan gelap, tersimpan di perangkat. Ada juga tombol "Bagikan Takok ke teman" (lembar bagikan bawaan HP, atau salin tautan di desktop).
- **Peringkat lokal Suroboyo Rush**: 5 skor terbaik di perangkat tampil di menu game, dan hasil akhir menyebut peringkatnya.
- File: `public/keren.js`, `public/keren.css`, `public/rush.js`, `public/index.html` (`?v=49`).
- Diuji di Chromium desktop dan HP 390 px dengan API tiruan; belum diuji di produksi.

## Pembaruan versi 50
- **Chip jam di hero**: teks status ("Jam booking berlangsung") dihapus; kini hanya titik status (hijau = jam booking, kuning = di luar jam), jam WIB, dan tooltip jam booking.
- **Asisten Takok Plus** (`public/bot-plus.js`, gaya di `public/pro.css`):
  - Perintah baru di menu "/": `/jam` (status jam booking), `/berangkat 45` (hitung jam berangkat dari booking terdekat + lama perjalanan + cadangan 15 menit, ada tombol 15/30/45/60/90 menit), `/main`, `/rush` (langsung ke Suroboyo Rush), `/warna hijau`, `/tema`, `/pantun`.
  - Di bawah tiap jawaban: **Salin** dan **WhatsApp** (bagikan jawaban) di samping Dengarkan.
  - Menu ⋯ -> **Cari di percakapan**; tombol **Pesan terbaru** saat gulir ke atas; **draf ketikan** tersimpan sementara bila panel tertutup.
- **Takok Admin Pro** (`public/admin-pro.js`):
  - **Palet perintah** (Ctrl+K saat masuk admin): lompat ke tab, saring kotak masuk, cari percakapan (nama, HP, tiket), aksi cepat (muat ulang, layar antrean, unduh Excel, bunyi, tema, keluar). Tombol "Perintah" juga ada di bar atas.
  - **Pintasan kotak masuk**: `J`/`K` pindah percakapan, `R` fokus kolom balas, `/` cari, `?` lembar pintasan.
  - **Peringatan pesan baru**: bunyi dua nada dan judul tab berkedip saat jumlah "perlu dijawab" bertambah; bisa dimatikan (tersimpan).
  - **Tab baru "Hari ini (live)"** (juga untuk admin loket): kartu menunggu/dipanggil/selesai/tingkat hadir, komposisi status, antrean per loket (berikutnya siapa), grafik jam sibuk, tekanan kotak masuk, dan **catatan serah-terima shift** (tersimpan di peramban). Memperbarui diri tiap 20 detik.
- `fitur.js` (tab + router), `percantik.js` (sidebar + ikon), `bot-pro.js` (daftar perintah), `keren.js` (lembar pintasan kontekstual admin, `window.TKAKSEN`), `index.html` (`?v=50`).
- Tanpa perubahan API/server. Diuji di Chromium dengan API tiruan; belum diuji dengan data produksi.

## Pembaruan versi 51
- **Asisten Takok** (`public/bot-plus.js`, daftar perintah di `bot-pro.js`):
  - **Catatan saya**: tombol **Simpan** di bawah jawaban + perintah `/catatan` (salin, hapus, kosongkan). Maks. 30 catatan, tersimpan hanya di perangkat.
  - **/siapkan**: persiapan kunjungan dari booking terdekat (daftar bawaan, tombol Persyaratan dan centang loket, hitung jam berangkat).
  - **/panduan**: 5 langkah kunjungan pertama dengan tombol Sebelumnya/Berikutnya dan pintasan ke tiap aksi.
  - **Pengingat berangkat**: tombol "Ingatkan saya saat waktunya" di kartu `/berangkat` (toast dan notifikasi peramban bila diizinkan). Hanya berlaku selama Takok terbuka di peramban.
- **Takok Admin** (`public/admin-pro.js`, `public/pro.css`):
  - **Menu "/" di kolom balas**: ketik `/` (atau `/terima`) untuk memilih balasan cepat; variabel {nama} dan {loket} terisi otomatis. Panah, Enter/Tab, Esc.
  - **Palet perintah** (Ctrl+K) kini juga mencari **booking hari ini** (kode, nama, HP); memilihnya membuka tab Booking dan mengisi kolom scan (tanpa memanggil otomatis).
  - **Tab Hari ini (live)**: **target harian** (bisa diubah, tersimpan) dengan bar progres, **hitung mundur jam tutup booking**, **perkiraan antrean habis** dari laju layanan hari ini, serta **laporan harian** siap **salin** atau **kirim ke WhatsApp** (termasuk catatan shift).
  - **Pintasan tab Booking**: `Shift+N` panggil berikutnya, `S` fokus kolom scan tiket.
  - **Mode Padat** (tombol di bar atas): daftar kotak masuk lebih rapat untuk antrean pesan banyak.
- `keren.js` (lembar pintasan admin diperbarui), `index.html` (`?v=51`). Tanpa perubahan API/server.
- Diuji di Chromium dengan API tiruan; belum diuji dengan data produksi.
