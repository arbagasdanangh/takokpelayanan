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
