"use strict";
/* Empat game baru di Ruang Main (v53), memakai pintu TKGM milik main.js (poin, lencana, tantangan harian, hitungan pemakaian anonim):
   1. Susun Alur Izin  : urutkan langkah mengurus izin (OSS, SSW Alfa, kunjungan ke loket, konversi KBLI). Teka-teki urutan.
   2. Cocok Bidang SSW : 5 soal harian, layanan ini masuk bidang apa di SSW Alfa? (ikut memakai katalog admin bila ada).
   3. Menara Berkas    : arcade satu ketukan, tumpuk berkas setinggi mungkin; tepat di tengah = kombo dan blok melebar.
   4. Gabung Stempel   : teka-teki geser ala 2048 dengan tema berkas ke NIB, sertifikat, hingga Juara.
   Semua murni di browser. Isi langkah dan soal ringkasan umum, bukan petunjuk resmi. */
(function () {
var API = window.TKGM; if (!API) return;
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickN(a, n, R) { var c = a.slice(), o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]); return o; }
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
function G() { return API.G(); }
function vw(h, keep) { var r = $("gm"), st = r ? r.scrollTop : 0; API.view(h); if (keep && r) r.scrollTop = st; }
function bintang(n) { return "★".repeat(n) + "☆".repeat(3 - n); }

/* ============ 1. Susun Alur Izin ============ */
var ALUR = [
  {id: "oss", t: "Mendaftar usaha lewat OSS", d: "Dari akun sampai NIB dan izin lanjutan.", s: [
    ["Siapkan KTP-el, email, dan nomor HP aktif", "Data identitas dan kontak dipakai untuk membuat akun."],
    ["Buat akun dan masuk di oss.go.id", "Akun dibutuhkan sebelum mengisi data usaha."],
    ["Pilih KBLI 2025 sesuai kegiatan usaha", "Kode KBLI menentukan tingkat risiko dan izin yang diminta."],
    ["Isi data usaha, lokasi, dan modal", "Data ini diperlukan agar NIB bisa terbit."],
    ["Terbitkan NIB", "NIB terbit setelah data usaha lengkap."],
    ["Penuhi perizinan lanjutan bila diminta OSS", "Izin tambahan bergantung pada risiko kegiatan usaha."]]},
  {id: "ssw", t: "Mengajukan permohonan di SSW Alfa", d: "Dari pilih bidang sampai memantau berkas.", s: [
    ["Buka SSW Alfa dan masuk dengan akun pemohon", "Permohonan diajukan lewat akun."],
    ["Pilih bidang layanan yang sesuai", "SSW Alfa mengelompokkan layanan ke dalam 21 bidang."],
    ["Pilih jenis perizinan di bidang itu", "Tiap bidang memuat beberapa jenis perizinan."],
    ["Isi formulir dan unggah berkas persyaratan", "Berkas lengkap mempercepat pemeriksaan."],
    ["Kirim permohonan dan catat nomornya", "Nomor dipakai untuk melacak berkas."],
    ["Pantau lewat menu Cek Permohonan", "Status resmi hanya terlihat di SSW Alfa."]]},
  {id: "kun", t: "Kunjungan ke loket lewat Takok", d: "Dari baca syarat sampai isi survei.", s: [
    ["Cari layanan di Takok, baca dan siapkan persyaratannya", "Dokumen yang lengkap mencegah bolak-balik."],
    ["Buat Booking Kunjungan dan simpan tiketnya", "Tiket berisi kode, jam, dan barcode."],
    ["Datang, lalu tekan \"Saya sudah tiba\"", "Tombol aktif 60 menit sebelum jam booking."],
    ["Tunggu nomor Anda dipanggil", "Pemohon yang sudah check-in didahulukan."],
    ["Dilayani di loket", "Bawa dokumen asli dan fotokopi."],
    ["Isi Survei Kepuasan", "Penilaian dipakai untuk memperbaiki layanan."]]},
  {id: "kbli", t: "Menyesuaikan KBLI 2020 ke 2025", d: "Dari kode lama sampai data OSS diperbarui.", s: [
    ["Catat kode KBLI 2020 yang tertera di NIB", "Itulah titik awal pencarian padanan."],
    ["Buka alat konversi KBLI di OSS", "Alat resmi OSS menerima kata kunci atau kode."],
    ["Lihat padanan KBLI 2025 dan jenis perubahannya", "Bisa tetap, digabung, atau dipecah."],
    ["Baca uraian kode 2025 agar kegiatan tidak bergeser", "Uraian resmi menjelaskan cakupan dan yang tidak dicakup."],
    ["Periksa dan sesuaikan data usaha di OSS bila perlu", "Perizinan yang sudah terbit sebelumnya tetap berlaku."]]}
];
var AL = null;
function alMenu() {
  API.stopAll(); API.title("Susun Alur Izin"); var al = G().al || {};
  API.view(API.bar("Susun Alur Izin") + '<div class="tb-hero"><b>Susun Alur Izin</b><p>Ketuk langkah sesuai urutan yang benar. Tiap skenario punya 5 sampai 6 langkah. Makin sedikit salah, makin banyak bintang.</p></div><div class="al-sc">' +
    ALUR.map(function (s) { return '<button type="button" class="gc" data-al="mulai" data-id="' + s.id + '"><b>' + E(s.t) + '</b><small>' + E(s.d) + '</small><em>' + (al[s.id] ? bintang(al[s.id]) : "Belum dimainkan") + '</em></button>'; }).join("") + '</div>' +
    '<p class="sys">Ringkasan umum untuk belajar, bukan petunjuk resmi. Ikuti ketentuan terbaru di OSS dan SSW Alfa.</p>');
}
function alMulai(id) {
  var sk = ALUR.filter(function (x) { return x.id === id; })[0]; if (!sk) return; API.stopAll(); API.ping("alur");
  var n = sk.s.length, idx = sk.s.map(function (_, i) { return i; }), acak = idx.slice();
  for (var k = 0; k < 6; k++) { acak.sort(function () { return Math.random() - 0.5; }); if (acak.some(function (v, i) { return v !== i; })) break; }
  AL = {sk: sk, acak: acak, ok: 0, salah: 0, t0: Date.now(), kunci: false}; alLukis();
}
function alLukis(salahIdx) {
  var a = AL, sk = a.sk;
  API.title(sk.t);
  vw(API.bar("Susun Alur Izin", "Benar " + a.ok + "/" + sk.s.length + " &middot; Salah " + a.salah) + '<h3 style="margin:6px 0">' + E(sk.t) + '</h3>' +
    '<p class="sys">Langkah ke-<b>' + (a.ok + 1) + '</b> yang mana? Ketuk pilihan:</p><div class="al-st">' +
    a.acak.filter(function (v) { return v >= a.ok; }).map(function (v) { return '<button type="button" class="al-b' + (v === salahIdx ? " no" : "") + '" data-al="pilih" data-v="' + v + '">' + E(sk.s[v][0]) + '</button>'; }).join("") + '</div><div id="al-m" role="status" aria-live="polite" class="sys"></div>' +
    '<ol class="al-slots" aria-label="Urutan yang sudah benar">' + sk.s.map(function (s, i) { return '<li class="' + (i < a.ok ? "on" : "") + '"><span>' + (i + 1) + '</span><div>' + (i < a.ok ? E(s[0]) + '<small>' + E(s[1]) + '</small>' : '<span class="sys">Langkah ke-' + (i + 1) + '</span>') + '</div></li>'; }).join("") + '</ol>', a.ok > 0 || salahIdx !== undefined);
}
function alPilih(v) {
  var a = AL; if (!a || a.kunci) return;
  if (v === a.ok) {
    a.ok++; API.beep(880, 0.1);
    if (a.ok === a.sk.s.length) return alSelesai();
    alLukis();
  } else { a.salah++; API.beep(200, 0.15); alLukis(v); var m = $("al-m"); if (m) m.textContent = "Belum tepat. Pikirkan apa yang harus selesai lebih dulu."; }
}
function alSelesai() {
  var a = AL, st = a.salah === 0 ? 3 : a.salah <= 2 ? 2 : 1, g = G(), n = a.sk.s.length, detik = Math.round((Date.now() - a.t0) / 1000);
  g.al = g.al || {}; var lama = g.al[a.sk.id] || 0; if (st > lama) g.al[a.sk.id] = st;
  var tot = 0; ALUR.forEach(function (s) { tot += g.al[s.id] || 0; });
  var pts = n * 2 + st * 6 + (st > lama ? 5 : 0);
  API.fin("alur", {title: st === 3 ? "Urutan sempurna!" : st === 2 ? "Hampir sempurna" : "Alur selesai", stars: st, pts: pts, bk: "al", bv: tot, m: {alur: 1}, again: function () { alMulai(a.sk.id); },
    share: "Susun Alur Izin: " + a.sk.t + " " + bintang(st) + " (" + a.salah + " salah, " + detik + " dtk)\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin,
    sub: E(a.sk.t) + ": " + a.salah + " salah dalam " + detik + " detik." + (st > lama && lama ? " Rekor bintang baru!" : "")});
}

/* ============ 2. Cocok Bidang SSW ============ */
/* [layanan, id bidang]. Pasangan dipilih yang jelas dari nama bidangnya; tetap perkiraan, cek jenis izin pasti di SSW Alfa. */
var BANK = [
  ["Pajak reklame (papan nama, spanduk)", "pajak"], ["Pajak bumi dan bangunan (PBB)", "pajak"], ["Surat pengantar menikah", "kel"], ["Surat pernyataan belum memiliki rumah", "kel"],
  ["Surat izin pekerja migran", "kel"], ["Tera ulang timbangan pasar", "metro"], ["Tera alat ukur di SPBU", "metro"], ["Izin penelitian untuk skripsi", "riset"], ["Magang atau PKL siswa", "riset"],
  ["Kartu pencari kerja (kartu kuning)", "ind"], ["Izin praktik dokter (SIP)", "sehat"], ["Izin apotek", "sehat"], ["Izin klinik pratama", "sehat"], ["Izin lembaga kursus", "didik"], ["Izin PAUD", "didik"],
  ["Persetujuan lalu lintas (Andalalin)", "hub"], ["Izin penyelenggaraan parkir", "hub"], ["Izin trayek angkutan", "hub"], ["Pemeriksaan proteksi kebakaran gedung", "damkar"], ["Izin galian jalan untuk kabel", "sda"],
  ["Sewa atau pemakaian aset milik pemerintah kota", "aset"], ["Pendirian koperasi", "kop"], ["Izin usaha toko atau perdagangan", "kop"], ["Dokumen lingkungan (UKL-UPL atau SPPL)", "lh"], ["Izin pengelolaan limbah", "lh"],
  ["Rekomendasi peternakan atau kesehatan hewan", "tani"], ["Layanan arsip dan perpustakaan", "pustaka"], ["Surat pengantar dari RT/RW", "rtrw"], ["Izin lembaga atau panti sosial", "sosial"],
  ["Izin penyelenggaraan hiburan dan wisata", "bud"], ["Izin acara olahraga atau pemuda", "bud"], ["Penanganan bencana dan kesiapsiagaan", "bencana"]
];
var BD = null;
function bidList() { return window.Izin && Izin.bidang || []; }
function bank() {
  var o = BANK.map(function (b) { return {q: b[0], a: b[1]}; }), ada = {}; o.forEach(function (x) { ada[x.q.toLowerCase()] = 1; });
  try { Izin.rows().forEach(function (r) { var b = Izin.bidFor(r[1]); if (b && !r[8] && r[0].length < 70 && !ada[r[0].toLowerCase()]) { ada[r[0].toLowerCase()] = 1; o.push({q: r[0], a: b[0]}); } }); } catch (e) {}
  return o;
}
function bdMenu() {
  try { Izin.muat(); } catch (e) {}
  API.stopAll(); API.title("Cocok Bidang SSW"); var g = G(), td = API.today(), b = g.bd || {}, sudah = b.d === td;
  API.view(API.bar("Cocok Bidang SSW") + '<div class="tb-hero"><b>Cocok Bidang SSW Alfa</b><p>5 soal harian: layanan ini masuk bidang apa di SSW Alfa Surabaya? 15 detik per soal (bisa Mode santai). Soal hari ini sama untuk semua pengunjung.</p>' +
    (sudah ? '<p class="tb-done">Hari ini: <b>' + E(b.r) + '</b> (' + b.s + '/5)</p>' : '') + '<div class="btns" style="justify-content:center">' + (sudah ? '<button type="button" class="btn" data-cb="daily">Ulangi soal hari ini (poin kecil)</button>' : '<button type="button" class="send" data-cb="daily">Main soal hari ini</button>') + '<button type="button" class="btn" data-cb="rand">Latihan acak</button></div>' +
    '<p class="sys">Rekor: ' + (g.best.bd !== undefined ? g.best.bd + "/5" : "belum ada") + ' &middot; Hari beruntun: ' + (b.st || 0) + '</p></div><p class="sys">Pasangan soal adalah perkiraan dari nama bidang. Jenis izin yang pasti ada di Daftar Perizinan SSW Alfa.</p>');
}
function bdMulai(daily) {
  API.stopAll(); API.ping("bidang"); var B = bidList(); if (!B.length) { API.view(API.bar("Cocok Bidang SSW") + '<p class="sys">Data bidang belum tersedia.</p>'); return; }
  var R = rng(daily ? API.hash("bidang" + API.today()) : (Math.random() * 4e9) >>> 0), pool = bank(), qs = pickN(pool, 5, R).map(function (x) {
    var benar = B.filter(function (b) { return b[0] === x.a; })[0]; if (!benar) return null;
    var lain = pickN(B.filter(function (b) { return b[0] !== x.a; }), 3, R), opsi = pickN([benar].concat(lain), 4, R);
    return {q: x.q, o: opsi.map(function (b) { return b[1]; }), a: opsi.indexOf(benar), full: benar[2]};
  }).filter(Boolean);
  BD = {daily: daily, q: qs, i: 0, ok: 0, row: "", lock: false, bonus: 0, t0: Date.now()}; bdTanya();
}
function bdTanya() {
  var q = BD.q[BD.i]; API.title("Cocok Bidang " + (BD.i + 1) + "/" + BD.q.length);
  API.view(API.bar("Cocok Bidang SSW", (BD.i + 1) + "/" + BD.q.length + " &middot; benar " + BD.ok) + '<div id="bdw"></div><div class="cb-q"><small>Layanan ini masuk bidang apa di SSW Alfa?</small><p>' + E(q.q) + '</p></div><div class="cb-o">' +
    q.o.map(function (o, i) { return '<button type="button" class="btn tb-b" data-cb="ans" data-i="' + i + '"><span>' + "ABCD"[i] + '</span>' + E(o) + '</button>'; }).join("") + '</div><div id="bdx" role="status" aria-live="polite"></div>');
  BD.lock = false; if (window.WK) WK.start($("bdw"), 15, function () { bdJawab(-1); });
}
function bdJawab(i) {
  if (!BD || BD.lock) return; BD.lock = true; var q = BD.q[BD.i], ok = i === q.a, sisa = window.WK ? WK.stop() : 0, wkOn = window.WK && WK.on(), habis = i === -1, cepat = ok && wkOn && sisa >= 9;
  if (cepat) BD.bonus += 2; if (ok) BD.ok++; BD.row += ok ? "🟩" : habis ? "⏱️" : "🟥"; API.beep(ok ? 880 : 220, 0.15);
  [].forEach.call(D.querySelectorAll(".tb-b"), function (b, k) { b.disabled = true; if (k === q.a) b.classList.add("tb-ok"); else if (k === i) b.classList.add("tb-no"); });
  var last = BD.i === BD.q.length - 1;
  $("bdx").innerHTML = '<div class="cb-ex ' + (ok ? "y" : "n") + '"><b>' + (ok ? "Tepat!" : habis ? "Waktu habis." : "Belum tepat.") + '</b>' + (cepat ? ' <span class="tb-bn">⚡ Cepat +2 poin</span>' : '') + ' Bidangnya: <b>' + E(q.full) + '</b>.<br><small class="sys">Perkiraan dari nama bidang. Cek jenis izin pastinya di SSW Alfa.</small></div><div class="btns" style="justify-content:center"><button type="button" class="send" data-cb="next">' + (last ? "Lihat hasil" : "Soal berikutnya") + '</button></div>';
}
function bdSelesai() {
  var g = G(), td = API.today(), b = g.bd || {}, n = BD.q.length, st = BD.ok >= 5 ? 3 : BD.ok >= 3 ? 2 : 1, first = BD.daily && b.d !== td, pts = first ? BD.ok * 10 + 10 + BD.bonus : BD.ok * 3 + Math.floor(BD.bonus / 2);
  if (BD.daily && first) { var y = new Date(td + "T00:00:00"); y.setDate(y.getDate() - 1); g.bd = {d: td, r: BD.row, s: BD.ok, st: b.pd === y.toISOString().slice(0, 10) ? (b.st || 0) + 1 : 1, pd: td}; }
  API.fin("bidang", {title: BD.ok === n ? "Ahli bidang SSW!" : BD.ok >= 3 ? "Lumayan hafal bidang" : "Terus berlatih!", stars: st, pts: pts, bk: "bd", bv: BD.ok, m: {bidang: BD.ok}, again: bdMenu,
    share: "Cocok Bidang SSW " + (BD.daily ? td : "(latihan)") + " " + BD.ok + "/" + n + "\n" + BD.row + "\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin,
    sub: BD.row + "<br>" + BD.ok + " dari " + n + " benar." + (first ? "" : " <small class='sys'>Poin kecil karena bukan permainan harian pertama.</small>")});
}

/* ============ 3. Menara Berkas ============ */
var MN = null, MW = 320, MH = 460, BH = 24;
function mnMenu() {
  API.stopAll(); MN = null; API.title("Menara Berkas"); var g = G();
  API.view(API.bar("Menara Berkas") + '<div class="tb-hero"><b>🗂️ Menara Berkas</b><p>Ketuk (atau tekan Spasi) untuk menjatuhkan tumpukan berkas yang bergeser. Yang menggantung terpotong. Jatuh tepat di tengah = kombo, dan 3 kali beruntun melebarkan tumpukan.</p><div class="btns" style="justify-content:center"><button type="button" class="send" data-mn="play">Mulai menyusun</button></div>' +
    '<p class="sys">Rekor: ' + (g.best.mn ? g.best.mn + " lantai" : "belum ada") + '</p></div>');
}
function mnMulai() {
  API.stopAll(); API.ping("menara"); API.title("Menara Berkas");
  API.view(API.bar("Menara Berkas", 'Lantai <b id="mn-f">0</b> &middot; Kombo <b id="mn-k">0</b>') + '<div class="mn-w"><canvas id="mn-c" class="mn-c" width="' + MW + '" height="' + MH + '" role="img" aria-label="Menara berkas. Ketuk untuk menjatuhkan."></canvas></div><p class="sys" style="text-align:center">Ketuk layar atau tekan Spasi.</p>');
  var c = $("mn-c"), x = c.getContext("2d"), tumpuk = [{x: 60, w: 200, h: 0}], t0 = 0;
  MN = {c: c, x: x, st: tumpuk, cur: {x: 0, w: 200, d: 1}, lantai: 0, kombo: 0, sempurna: 0, cam: 0, chips: [], over: false, mulai: false, speed: 120, last: 0, base: 0};
  c.addEventListener("pointerdown", function (e) { e.preventDefault(); mnJatuh(); });
  requestAnimationFrame(mnLoop);
}
function warna(i) { return "hsl(" + ((i * 23 + 210) % 360) + ",70%," + (i % 2 ? 56 : 50) + "%)"; }
function mnJatuh() {
  var m = MN; if (!m || m.over) return; if (!m.mulai) { m.mulai = true; return; }
  var top = m.st[m.st.length - 1], cur = m.cur, kiri = Math.max(cur.x, top.x), kanan = Math.min(cur.x + cur.w, top.x + top.w), ov = kanan - kiri;
  if (ov <= 1) { m.chips.push({x: cur.x, w: cur.w, y: 0, v: 0, k: m.st.length}); m.over = true; API.beep(160, 0.3, "sawtooth"); return mnAkhir(); }
  var pas = Math.abs(cur.x - top.x) < 5, nx, nw;
  if (pas) { nx = top.x; nw = top.w; m.kombo++; m.sempurna++; API.beep(660 + Math.min(m.kombo, 8) * 60, 0.1); if (m.kombo % 3 === 0 && nw < 200) { nw = Math.min(200, nw + 14); nx = Math.max(0, Math.min(MW - nw, nx - 7)); } }
  else {
    nx = kiri; nw = ov; m.kombo = 0; API.beep(440, 0.06);
    if (cur.x < top.x) m.chips.push({x: cur.x, w: top.x - cur.x, y: 0, v: 0, k: m.st.length}); else m.chips.push({x: top.x + top.w, w: cur.x + cur.w - (top.x + top.w), y: 0, v: 0, k: m.st.length});
  }
  m.st.push({x: nx, w: nw, h: 0}); m.lantai++; m.speed = Math.min(330, 120 + m.lantai * 7); m.cur = {x: Math.random() < 0.5 ? 0 : MW - nw, w: nw, d: 1}; m.cur.d = m.cur.x === 0 ? 1 : -1;
  var f = $("mn-f"), k = $("mn-k"); if (f) f.textContent = m.lantai; if (k) k.textContent = m.kombo;
}
function mnLoop(ts) {
  var m = MN; if (!m || !m.c.isConnected) { MN = null; return; }
  var dt = Math.min(0.05, (ts - (m.last || ts)) / 1000); m.last = ts;
  if (m.mulai && !m.over) { var cur = m.cur; cur.x += cur.d * m.speed * dt; if (cur.x <= 0) { cur.x = 0; cur.d = 1; } if (cur.x + cur.w >= MW) { cur.x = MW - cur.w; cur.d = -1; } }
  var tinggi = m.st.length * BH, target = Math.max(0, tinggi - 300); m.cam += (target - m.cam) * Math.min(1, dt * 5);
  m.chips.forEach(function (ch) { ch.v += 900 * dt; ch.y += ch.v * dt; }); m.chips = m.chips.filter(function (ch) { return ch.y < 700; });
  var x = m.x, g = x.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, "#0b1f52"); g.addColorStop(1, "#1d4ed8"); x.fillStyle = g; x.fillRect(0, 0, MW, MH);
  x.fillStyle = "rgba(255,255,255,.08)"; for (var s = 0; s < 18; s++) x.fillRect((s * 71) % MW, ((s * 53) % MH + m.cam * 0.2) % MH, 2, 2);
  function y0(k) { return MH - 40 - (k + 1) * BH + m.cam; }
  x.fillStyle = "#12306f"; x.fillRect(0, MH - 40 + m.cam, MW, 80);
  m.st.forEach(function (b, k) { var yy = y0(k); x.fillStyle = warna(k); x.fillRect(b.x, yy, b.w, BH - 2); x.fillStyle = "rgba(255,255,255,.28)"; x.fillRect(b.x, yy, b.w, 5); x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(b.x + 6, yy + 10, Math.max(0, b.w - 12), 2); });
  m.chips.forEach(function (ch) { x.fillStyle = warna(ch.k); x.globalAlpha = Math.max(0, 1 - ch.y / 400); x.fillRect(ch.x, y0(ch.k) + ch.y, ch.w, BH - 2); x.globalAlpha = 1; });
  if (!m.over) { var ck = m.st.length; x.fillStyle = warna(ck); x.fillRect(m.cur.x, y0(ck) - (m.mulai ? 0 : 0), m.cur.w, BH - 2); x.fillStyle = "rgba(255,255,255,.28)"; x.fillRect(m.cur.x, y0(ck), m.cur.w, 5); }
  x.fillStyle = "#fff"; x.font = "800 26px system-ui,sans-serif"; x.textAlign = "center"; x.fillText(m.lantai, MW / 2, 40);
  if (!m.mulai) { x.font = "700 16px system-ui,sans-serif"; x.fillStyle = "rgba(255,255,255,.9)"; x.fillText("Ketuk untuk mulai", MW / 2, 80); }
  if (m.kombo >= 2) { x.fillStyle = "#ffd24a"; x.font = "900 16px system-ui,sans-serif"; x.fillText("KOMBO x" + m.kombo, MW / 2, 66); }
  if (!m.over || m.chips.length) requestAnimationFrame(mnLoop);
}
function mnAkhir() {
  var m = MN, f = m.lantai, st = f >= 20 ? 3 : f >= 10 ? 2 : 1, pts = Math.min(80, f * 2 + m.sempurna * 2);
  setTimeout(function () {
    if (!$("mn-c")) return;
    API.fin("menara", {title: f >= 20 ? "Menara pencakar langit!" : f >= 10 ? "Menara yang kokoh" : "Menara runtuh", stars: st, pts: pts, bk: "mn", bv: f, m: {menara: f}, again: mnMulai,
      share: "Menara Berkas: " + f + " lantai (" + m.sempurna + " tepat sasaran)\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin, sub: f + " lantai, " + m.sempurna + " kali tepat di tengah."});
  }, 900);
}

/* ============ 4. Gabung Stempel (2048) ============ */
var GB = null, NAMA = ["Berkas", "Map", "Formulir", "Paraf", "Stempel", "Verifikasi", "Izin", "NIB", "Sertifikat", "Legalitas", "Juara"];
function gbMenu() {
  API.stopAll(); GB = null; API.title("Gabung Stempel"); var g = G();
  API.view(API.bar("Gabung Stempel") + '<div class="tb-hero"><b>🧱 Gabung Stempel</b><p>Geser ubin ke segala arah. Dua ubin yang sama menyatu menjadi tingkat berikutnya: Berkas, Map, Formulir, Paraf, Stempel... sampai NIB, Sertifikat, dan Juara. Pakai geser jari, panah, atau W A S D.</p><div class="btns" style="justify-content:center"><button type="button" class="send" data-gb="play">Mulai</button></div>' +
    '<p class="sys">Ubin tertinggi: ' + (g.best.gb ? g.best.gb + " (" + NAMA[Math.log2(g.best.gb) - 1] + ")" : "belum ada") + '</p></div>');
}
function gbMulai() {
  API.stopAll(); API.ping("gabung"); API.title("Gabung Stempel");
  GB = {b: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], skor: 0, prev: null, selesai: false, baru: {}};
  gbTambah(); gbTambah(); gbLukis();
}
function gbTambah() { var k = []; GB.b.forEach(function (v, i) { if (!v) k.push(i); }); if (!k.length) return; var i = k[Math.floor(Math.random() * k.length)]; GB.b[i] = Math.random() < 0.9 ? 2 : 4; GB.baru[i] = 1; }
function gbWarna(v) { var l = Math.log2(v); return "hsl(" + (210 - l * 18) + "," + (55 + l * 3) + "%," + (62 - l * 2.5) + "%)"; }
function gbMax() { return Math.max.apply(null, GB.b); }
function gbLukis() {
  var g = GB, mx = gbMax();
  vw(API.bar("Gabung Stempel", "Skor <b id='gb-s'>" + g.skor + "</b>") + '<div class="gb-w" id="gb-w"><div class="gb-hd"><span class="sys">Tertinggi: <b>' + E(NAMA[Math.log2(mx) - 1] || "") + '</b></span><span><button type="button" class="btn" data-gb="undo"' + (g.prev ? "" : " disabled") + '>Urungkan</button> <button type="button" class="btn" data-gb="akhir">Selesai</button></span></div>' +
    '<div class="gb-g" id="gb-g" role="grid" aria-label="Papan 4 kali 4">' + g.b.map(function (v, i) { return '<div class="gb-t' + (g.baru[i] && !RM ? " pop" : "") + '" role="gridcell" style="' + (v ? "background:" + gbWarna(v) : "") + '">' + (v ? '<span>' + v + '<small>' + E(NAMA[Math.log2(v) - 1] || v) + '</small></span>' : "") + '</div>'; }).join("") + '</div>' +
    '<div class="gb-pad"><span></span><button type="button" class="btn" data-gb="u" aria-label="Geser ke atas">&uarr;</button><span></span><button type="button" class="btn" data-gb="l" aria-label="Geser ke kiri">&larr;</button><button type="button" class="btn" data-gb="d" aria-label="Geser ke bawah">&darr;</button><button type="button" class="btn" data-gb="r" aria-label="Geser ke kanan">&rarr;</button></div></div><p class="sys" style="text-align:center">Geser jari di papan, atau pakai tombol panah.</p>', g.skor > 0);
  g.baru = {}; var w = $("gb-w"), sx = 0, sy = 0, on = false;
  w.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) return; on = true; sx = e.clientX; sy = e.clientY; });
  w.addEventListener("pointerup", function (e) { if (!on) return; on = false; var dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; gbGeser(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u")); });
}
function gbGeser(arah) {
  var g = GB; if (!g || g.selesai) return; var b = g.b.slice(), skor = g.skor, gerak = false, i, j;
  function garis(idx) {
    var v = idx.map(function (k) { return b[k]; }).filter(Boolean), o = [];
    for (j = 0; j < v.length; j++) { if (v[j] === v[j + 1]) { o.push(v[j] * 2); skor += v[j] * 2; j++; } else o.push(v[j]); }
    while (o.length < 4) o.push(0);
    idx.forEach(function (k, n) { if (b[k] !== o[n]) gerak = true; b[k] = o[n]; });
  }
  for (i = 0; i < 4; i++) {
    var idx = [0, 1, 2, 3].map(function (n) { return arah === "l" ? i * 4 + n : arah === "r" ? i * 4 + 3 - n : arah === "u" ? n * 4 + i : (3 - n) * 4 + i; }); garis(idx);
  }
  if (!gerak) { API.beep(180, 0.05); return; }
  var lama = gbMax(); g.prev = {b: g.b.slice(), skor: g.skor}; g.b = b; g.skor = skor; gbTambah(); API.beep(500 + Math.log2(gbMax()) * 40, 0.05);
  if (gbMax() > lama && gbMax() >= 128) { API.beep(880, 0.15); }
  if (!gbAdaGerak()) { g.selesai = true; gbLukis(); setTimeout(gbAkhir, 700); return; }
  gbLukis();
}
function gbAdaGerak() { var b = GB.b; for (var i = 0; i < 16; i++) { if (!b[i]) return true; if (i % 4 < 3 && b[i] === b[i + 1]) return true; if (i < 12 && b[i] === b[i + 4]) return true; } return false; }
function gbAkhir() {
  var g = GB; if (!g || !$("gb-g")) return; var mx = gbMax(), st = mx >= 512 ? 3 : mx >= 256 ? 2 : 1, pts = Math.min(50, Math.round(g.skor / 60)) + (mx >= 512 ? 15 : mx >= 256 ? 8 : mx >= 128 ? 3 : 0);
  API.fin("gabung", {title: mx >= 512 ? "Stempel emas!" : mx >= 256 ? "Hampir jadi NIB" : "Papan penuh", stars: st, pts: pts, bk: "gb", bv: mx, m: {gabung: mx}, again: gbMulai,
    share: "Gabung Stempel: skor " + g.skor + ", ubin tertinggi " + mx + " (" + (NAMA[Math.log2(mx) - 1] || "") + ")\nCoba di Takok Pelayanan Suroboyo:\n" + location.origin, sub: "Skor " + g.skor + ". Ubin tertinggi: <b>" + mx + " (" + E(NAMA[Math.log2(mx) - 1] || "") + ")</b>."});
}

/* ============ Penghubung klik dan papan tombol ============ */
D.addEventListener("click", function (e) {
  var x = e.target.closest && e.target.closest("[data-g],[data-al],[data-cb],[data-mn],[data-gb]"); if (!x) return;
  var g = x.dataset.g;
  if (g === "alur") return alMenu(); if (g === "bidang") return bdMenu(); if (g === "menara") return mnMenu(); if (g === "gabung") return gbMenu();
  if (x.dataset.al) { if (x.dataset.al === "mulai") alMulai(x.dataset.id); else if (x.dataset.al === "pilih") alPilih(+x.dataset.v); }
  else if (x.dataset.cb) { var a = x.dataset.cb; if (a === "daily") bdMulai(true); else if (a === "rand") bdMulai(false); else if (a === "ans") bdJawab(+x.dataset.i); else if (a === "next") { if (BD.i === BD.q.length - 1) bdSelesai(); else { BD.i++; bdTanya(); } } }
  else if (x.dataset.mn === "play") mnMulai();
  else if (x.dataset.gb) { var k = x.dataset.gb; if (k === "play") gbMulai(); else if (k === "undo") { if (GB && GB.prev) { GB.b = GB.prev.b; GB.skor = GB.prev.skor; GB.prev = null; gbLukis(); } } else if (k === "akhir") { if (GB && !GB.selesai) { GB.selesai = true; gbAkhir(); } } else gbGeser(k); }
});
D.addEventListener("keydown", function (e) {
  if (MN && $("mn-c") && (e.key === " " || e.key === "Enter")) { e.preventDefault(); mnJatuh(); return; }
  if (GB && $("gb-g") && !GB.selesai) { var m = {ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", a: "l", d: "r", w: "u", s: "d"}[e.key]; if (m) { e.preventDefault(); gbGeser(m); } }
});
window.GameIzin = {alur: alMenu, bidang: bdMenu, menara: mnMenu, gabung: gbMenu};
})();
