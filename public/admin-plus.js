"use strict";
/* Versi 46: fitur admin tambahan.
   - Laporan: ringkasan periode yang bisa dicetak / disimpan PDF dan diunduh CSV (dari data Analitik Chat).
   - Direktori pemohon: cari pemohon terdaftar, salin kontak, buka WhatsApp, unduh CSV (superuser).
   - Log aktivitas: siapa mengubah apa dan kapan (tanpa isi pesan atau data pribadi) (superuser).
   - Kesehatan sistem: pemeriksaan konfigurasi Vercel/Redis/kanal/data (superuser).
   Semua pembatasan akses dilakukan di server (api/app.py: ADM_SUPER). */
(function () {
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var $a = function (i) { return document.getElementById(i); };
function tgl(ts) { return ts ? new Date(ts).toLocaleString("id-ID", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) : "-"; }
function csvCel(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
function unduh(nama, baris) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + baris.map(function (r) { return r.map(csvCel).join(","); }).join("\r\n")], {type: "text/csv;charset=utf-8"}));
  a.download = nama; document.body.appendChild(a); a.click(); a.remove();
}
function dur(m) { if (m == null) return "-"; m = Math.round(m); return m < 1 ? "<1 mnt" : m < 60 ? m + " mnt" : Math.floor(m / 60) + " j " + (m % 60) + " m"; }

/* ---------- Laporan ---------- */
var LAPH = 7, LAPD = null;
window.aLap = async function (el) {
  var j = await api("/api/admin/analitik?hari=" + LAPH), r = await api("/api/admin/ringkasan"), k = j.kpi;
  LAPD = {j: j, r: r};
  var rng = [7, 14, 30, 90].map(function (h) { return '<button type="button" class="chip" data-lh="' + h + '" aria-pressed="' + (h === LAPH) + '">' + h + ' hari</button>'; }).join("");
  var kp = function (v, t) { return '<div class="kpi" style="cursor:default"><span class="kv">' + E(v) + '</span><span>' + E(t) + '</span></div>'; };
  var top = j.topik.slice(0, 8).map(function (x) { return '<tr><td>' + E(x.topik) + '</td><td>' + x.n + '</td><td>' + (x.neg || 0) + '</td></tr>'; }).join("");
  var lok = j.loket.slice(0, 10).map(function (x) { return '<tr><td>' + E(x.nama || "") + '</td><td>' + x.pesan + '</td><td>' + x.pend + '</td></tr>'; }).join("");
  var faq = j.faq.slice(0, 6).map(function (x) { return '<li>' + E(x.contoh) + ' <small>(' + x.n + 'x)</small></li>'; }).join("");
  el.innerHTML = '<div class="noprint"><h2 class="sec">Laporan periode</h2><p class="sys">Pilih periode, lalu cetak atau simpan sebagai PDF lewat dialog cetak browser. CSV berisi angka utama untuk diolah di Excel.</p>' +
    '<div class="hint">' + rng + '<button type="button" class="send" id="lap-p">Cetak / simpan PDF</button><button type="button" class="btn" id="lap-c">Unduh CSV</button></div></div>' +
    '<div class="print-area" id="lap-a" style="padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface)">' +
    '<h2 style="margin:0">Laporan Layanan Takok Pelayanan Suroboyo</h2><p class="sys">Periode ' + LAPH + ' hari terakhir &middot; dibuat ' + E(tgl(Date.now())) + (ME && ME.nama ? ' &middot; oleh ' + E(ME.nama) : '') + '</p>' +
    '<div class="kpis">' + kp(k.thread, "Percakapan aktif") + kp(k.selesai, "Selesai") + kp(k.pesan_pemohon, "Pesan pemohon") + kp(k.pesan_admin, "Balasan admin") + kp(dur(k.median_menit), "Waktu balas (median)") + kp(k.sla1 != null ? k.sla1 + "%" : "-", "Dibalas dalam 1 jam") + kp(k.menunggu, "Belum dibalas") + kp(k.csat != null ? k.csat.toFixed(1) : "-", "Kepuasan (" + k.n_nilai + " nilai)") + '</div>' +
    '<h3>Hari ini</h3><p class="sys">Perlu dijawab: <b>' + r.pend + '</b> &middot; Percakapan: <b>' + r.percakapan + '</b> &middot; Booking hari ini: <b>' + (r.booking_hari_ini ? (r.booking_hari_ini.total != null ? r.booking_hari_ini.total : "-") : "-") + '</b></p>' +
    '<h3>Topik paling banyak ditanyakan</h3>' + (top ? '<table class="tb"><tr><th>Topik</th><th>Jumlah</th><th>Keluhan</th></tr>' + top + '</table>' : '<p class="sys">Belum ada data.</p>') +
    '<h3>Loket paling banyak ditanya</h3>' + (lok ? '<table class="tb"><tr><th>Loket</th><th>Pesan</th><th>Belum dibalas</th></tr>' + lok + '</table>' : '<p class="sys">Belum ada data.</p>') +
    '<h3>Pertanyaan berulang</h3>' + (faq ? '<ul>' + faq + '</ul>' : '<p class="sys">Belum ada.</p>') +
    '<p class="sys">Dihitung otomatis dari kata kunci bahasa Indonesia; topik dan nada adalah perkiraan.</p></div>';
  el.querySelector("[data-lh]").parentNode.onclick = function (e) { var b = e.target.closest("[data-lh]"); if (b) { LAPH = +b.dataset.lh; window.aX("lap"); } };
  $a("lap-p").onclick = function () { document.body.classList.add("lap-printing"); window.print(); setTimeout(function () { document.body.classList.remove("lap-printing"); }, 500); };
  $a("lap-c").onclick = function () {
    var d = LAPD, kk = d.j.kpi, B = [["Laporan Takok", "Periode " + LAPH + " hari", tgl(Date.now())], [], ["Ukuran", "Nilai"],
      ["Percakapan aktif", kk.thread], ["Selesai", kk.selesai], ["Pesan pemohon", kk.pesan_pemohon], ["Balasan admin", kk.pesan_admin], ["Waktu balas median (menit)", kk.median_menit], ["Dibalas dalam 1 jam (%)", kk.sla1], ["Belum dibalas", kk.menunggu], ["Kepuasan", kk.csat], [], ["Topik", "Jumlah", "Keluhan"]];
    d.j.topik.forEach(function (x) { B.push([x.topik, x.n, x.neg || 0]); }); B.push([], ["Loket", "Pesan", "Belum dibalas"]); d.j.loket.forEach(function (x) { B.push([x.nama || "", x.pesan, x.pend]); });
    unduh("laporan-takok-" + LAPH + "hari.csv", B);
  };
};

/* ---------- Direktori pemohon ---------- */
var PEM = [], PQ = "", PN = 40;
function pemDraw(el) {
  var q = PQ.toLowerCase(), d = PEM.filter(function (x) { return !q || (x.nama + " " + x.hp + " " + x.email).toLowerCase().indexOf(q) > -1; }), box = el.querySelector("#pem-l");
  el.querySelector("#pem-n").textContent = d.length + " dari " + PEM.length + " pemohon";
  box.innerHTML = d.slice(0, PN).map(function (x) {
    var wa = x.hp ? "https://wa.me/62" + String(x.hp).slice(1) : "";
    return '<article class="card" style="margin:0 0 8px"><b>' + E(x.nama) + '</b><div class="sys">' + E(x.hp) + ' &middot; ' + E(x.email) + ' &middot; daftar ' + E(tgl(x.dibuat)) + '</div><div class="btns">' +
      (wa ? '<a class="btn" href="' + E(wa) + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' : '') + (x.email ? '<a class="btn" href="mailto:' + E(x.email) + '">Email</a>' : '') + '<button type="button" class="btn" data-pc="' + E(x.hp) + '">Salin HP</button></div></article>';
  }).join("") + (d.length > PN ? '<button type="button" class="btn" id="pem-m">Tampilkan lebih banyak (' + (d.length - PN) + ')</button>' : "") + (d.length ? "" : '<div class="empty">Tidak ada pemohon yang cocok.</div>');
  var m = el.querySelector("#pem-m"); if (m) m.onclick = function () { PN += 40; pemDraw(el); };
}
window.aPem = async function (el) {
  var j = await api("/api/admin/pemohon"); PEM = j.daftar; PQ = ""; PN = 40;
  el.innerHTML = '<h2 class="sec">Direktori pemohon</h2><p class="sys">Pemohon yang terdaftar di aplikasi. Data pribadi: pakai hanya untuk keperluan layanan. PIN tidak pernah ditampilkan.</p>' +
    '<div class="hint"><input class="si" id="pem-q" type="search" placeholder="Cari nama, nomor HP, atau email..." maxlength="60" style="flex:1;margin:0"><button type="button" class="btn" id="pem-x">Unduh CSV</button></div><p class="sys" id="pem-n"></p><div id="pem-l"></div>';
  $a("pem-q").oninput = function () { PQ = this.value; PN = 40; pemDraw(el); };
  $a("pem-x").onclick = function () { unduh("pemohon-takok.csv", [["ID", "Nama", "HP", "Email", "Terdaftar"]].concat(PEM.map(function (x) { return [x.id, x.nama, x.hp, x.email, tgl(x.dibuat)]; }))); };
  el.querySelector("#pem-l").onclick = function (e) { var b = e.target.closest("[data-pc]"); if (b) { try { navigator.clipboard.writeText(b.dataset.pc).then(function () { toast("Nomor disalin."); }); } catch (x) {} } };
  pemDraw(el);
};

/* ---------- Log aktivitas ---------- */
var LABEL = {"pengaturan": "Mengubah pengaturan", "password": "Mengganti kata sandi", "balas": "Membalas pemohon", "selesai": "Menandai selesai", "hapus": "Menghapus percakapan", "catatan": "Menyimpan catatan", "templat": "Menyimpan templat jawaban",
  "akun/simpan": "Menyimpan akun admin", "akun/hapus": "Menghapus akun admin", "loket/simpan": "Menyimpan loket", "loket/massal": "Impor/ubah loket massal", "loket/reset": "Mengatur ulang loket", "loket/hapus": "Menghapus loket", "lokasi/simpan": "Menyimpan lokasi", "lokasi/hapus": "Menghapus lokasi", "lokasi/urutan": "Mengubah urutan lokasi",
  "kata": "Menyimpan aturan Kata cari", "kata/impor": "Impor aturan Kata cari", "kbli/impor": "Impor data KBLI", "kbli/hapus": "Menghapus data KBLI", "izin/simpan": "Menyimpan Katalog Perizinan", "berita": "Menyimpan berita", "berita/hapus": "Menghapus berita", "bj/tandai": "Menandai pemohon (keamanan)", "permohonan": "Mencatat permohonan", "permohonan/ubah": "Memperbarui permohonan", "permohonan/hapus": "Menghapus permohonan", "booking/ubah": "Mengubah booking"};
var LOGF = "";
window.aLog = async function (el) {
  var j = await api("/api/admin/audit"), D = j.daftar;
  var us = {}; D.forEach(function (x) { us[x.u] = 1; });
  el.innerHTML = '<h2 class="sec">Log aktivitas admin</h2><p class="sys">Mencatat 300 aksi terakhir (siapa, apa, kapan). Isi pesan dan data pribadi tidak dicatat.</p>' +
    '<div class="hint"><select class="si" id="log-u" aria-label="Saring pengguna" style="margin:0;width:auto"><option value="">Semua pengguna</option>' + Object.keys(us).map(function (u) { return '<option value="' + E(u) + '"' + (u === LOGF ? " selected" : "") + '>' + E(u) + '</option>'; }).join("") + '</select><button type="button" class="btn" id="log-x">Unduh CSV</button></div><div id="log-l"></div>';
  function gambar() {
    var d = D.filter(function (x) { return !LOGF || x.u === LOGF; });
    $a("log-l").innerHTML = d.length ? '<div style="overflow-x:auto"><table class="tb"><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Sasaran</th></tr>' + d.map(function (x) { return '<tr><td>' + E(tgl(x.t)) + '</td><td>' + E(x.nm || x.u) + ' <small class="sys">@' + E(x.u) + '</small></td><td>' + E(LABEL[x.r] || x.r) + '</td><td><small>' + E(x.x || "") + '</small></td></tr>'; }).join("") + '</table></div>' : '<div class="empty">Belum ada aktivitas tercatat.</div>';
  }
  $a("log-u").onchange = function () { LOGF = this.value; gambar(); };
  $a("log-x").onclick = function () { unduh("log-aktivitas.csv", [["Waktu", "Pengguna", "Nama", "Aksi", "Rute", "Sasaran"]].concat(D.map(function (x) { return [tgl(x.t), x.u, x.nm, LABEL[x.r] || x.r, x.r, x.x]; }))); };
  gambar();
};

/* ---------- Kesehatan sistem ---------- */
window.aSh = async function (el) {
  var j = await api("/api/admin/kesehatan"), bad = j.cek.filter(function (c) { return !c.ok && !c.opsi; }).length, warn = j.cek.filter(function (c) { return !c.ok && c.opsi; }).length;
  el.innerHTML = '<h2 class="sec">Kesehatan sistem</h2><div class="card"><b>' + (bad ? "Perlu perhatian: " + bad + " hal penting belum beres" : warn ? "Sistem berjalan. " + warn + " hal opsional bisa dilengkapi" : "Semua pemeriksaan lolos") + '</b><div class="sys">Diperiksa ' + E(tgl(j.waktu)) + ' &middot; versi ' + E(j.versi) + '</div></div>' +
    j.cek.map(function (c) {
      var t = c.ok ? "OK" : c.opsi ? "Opsional" : "Perbaiki", col = c.ok ? "#16a34a" : c.opsi ? "#d97706" : "#dc2626";
      return '<article class="card" style="margin:0 0 8px;border-left:5px solid ' + col + '"><b>' + E(c.n) + '</b> <span class="btag" style="color:' + col + '">' + t + '</span><div class="sys">' + E(c.d) + '</div></article>';
    }).join("") + '<div class="btns"><button type="button" class="btn" id="sh-r">Periksa ulang</button></div>';
  $a("sh-r").onclick = function () { window.aX("sh"); };
};
})();
