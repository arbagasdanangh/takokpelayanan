"use strict";
/* Versi 61: Laporan terpadu untuk admin dan superuser.
   Admin loket: hanya data loketnya (percakapan, waktu balas, topik, antrean, daftar percakapan yang namanya disamarkan).
   Superuser: ditambah chatbot (akurasi, tak terjawab, penilaian warga), Ruang Main, kanal, dan pengunjung.
   Pembatasan dilakukan server (/admin/laporan). Cetak/PDF lewat dialog cetak, CSV multi-bagian, salin ringkasan, dan kirim WhatsApp. */
(function () {
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var H = 30, D = null;
function tgl(ts) { return new Date(ts).toLocaleString("id-ID", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"}); }
function dur(m) { return window.anDur ? window.anDur(m) : (m == null ? "-" : Math.round(m) + " mnt"); }
function csvCel(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
function unduh(nama, baris) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + baris.map(function (r) { return r.map(csvCel).join(","); }).join("\r\n")], {type: "text/csv;charset=utf-8"}));
  a.download = nama; document.body.appendChild(a); a.click(); a.remove();
}
var ALASAN = {tidak_jelas: "Jawaban tidak jelas", salah: "Jawaban salah", kurang_lengkap: "Kurang lengkap", ingin_petugas: "Ingin bicara dengan petugas", lainnya: "Lainnya"};
var NAMA_GAME = {kalimas: "Arus Kalimas", rush: "Rush", cocok: "Cocokkan", susun: "Susun", urut: "Urut", kuis: "Kuis", kata: "Kata", tangkap: "Tangkap", suro: "Suro", roda: "Roda", usaha: "Usaha", tebak: "Tebak", zona: "Zona", arena: "Arena", alur: "Alur", bidang: "Bidang", menara: "Menara", gabung: "Gabung", benar: "Benar", sandi: "Sandi"};

/* Ringkasan eksekutif: kalimat otomatis dari angka. */
function ringkas(d) {
  var k = d.chat.kpi, o = [];
  o.push("Selama " + d.hari + " hari terakhir tercatat " + k.thread + " percakapan aktif dengan " + k.pesan_pemohon + " pesan pemohon dan " + k.pesan_admin + " balasan admin; " + k.selesai + " percakapan ditandai selesai.");
  if (k.median_menit != null) o.push("Waktu balas median " + dur(k.median_menit) + (k.sla1 != null ? ", " + k.sla1 + "% pertanyaan dibalas dalam 1 jam" : "") + (k.sla24 != null ? " dan " + k.sla24 + "% dalam 24 jam." : "."));
  if (k.menunggu) o.push(k.menunggu + " percakapan masih menunggu balasan.");
  if (k.csat != null) o.push("Kepuasan jawaban admin " + k.csat.toFixed(1) + " dari 5 (" + k.n_nilai + " penilaian).");
  if (d.chat.topik.length) o.push("Topik terbanyak: " + d.chat.topik.slice(0, 3).map(function (x) { return x.topik; }).join(", ") + ".");
  if (d.bot) o.push("Chatbot menjawab " + d.bot.akurasi + "% pertanyaan (" + d.bot.hit + " terjawab, " + d.bot.miss + " tidak terjawab).");
  if (d.visitor) { var p = d.visitor.kpi.periode; o.push("Aplikasi dikunjungi " + p.vis + " sesi oleh " + p.uv + " pengunjung unik (" + p.pv + " tampilan halaman)."); }
  return o;
}
function tbl(kepala, baris, kosong) {
  if (!baris.length) return '<p class="sys">' + (kosong || "Belum ada data.") + '</p>';
  return '<div style="overflow-x:auto"><table class="tb"><tr>' + kepala.map(function (h) { return "<th>" + E(h) + "</th>"; }).join("") + "</tr>" +
    baris.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + E(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></div>";
}
function kp(v, t, s) { return '<div class="kpi" style="cursor:default"><span class="kv">' + E(v) + "</span><span>" + E(t) + "</span>" + (s ? '<small class="sys">' + E(s) + "</small>" : "") + "</div>"; }
function bars(arr, lab, val, mx) { mx = mx || Math.max.apply(null, arr.map(val).concat([1])); return arr.map(function (x) { return window.anBar ? window.anBar(lab(x), val(x), mx, "") : ""; }).join(""); }
function hrg(h) { return '<h3 class="lap-h">' + h + "</h3>"; }

function teks(d) {
  var t = ["LAPORAN LAYANAN TAKOK PELAYANAN SUROBOYO", "Periode " + d.hari + " hari terakhir, dibuat " + tgl(d.dibuat), ""];
  ringkas(d).forEach(function (s) { t.push("- " + s); });
  t.push("", "Rekomendasi:"); d.rek.forEach(function (s, i) { t.push((i + 1) + ". " + s); });
  return t.join("\n");
}
function csv(d) {
  var k = d.chat.kpi, B = [["Laporan Takok", "Periode " + d.hari + " hari", tgl(d.dibuat)], [], ["RINGKASAN"]];
  ringkas(d).forEach(function (s) { B.push([s]); });
  B.push([], ["UKURAN CHAT", "Nilai"], ["Percakapan aktif", k.thread], ["Selesai", k.selesai], ["Pesan pemohon", k.pesan_pemohon], ["Balasan admin", k.pesan_admin], ["Waktu balas median (menit)", k.median_menit], ["P90 (menit)", k.p90_menit],
    ["Dibalas <1 jam (%)", k.sla1], ["Dibalas <24 jam (%)", k.sla24], ["Belum dibalas", k.menunggu], ["Kepuasan (1-5)", k.csat]);
  B.push([], ["TOPIK", "Jumlah", "Keluhan"]); d.chat.topik.forEach(function (x) { B.push([x.topik, x.n, x.neg || 0]); });
  B.push([], ["LOKET", "Pesan", "Belum dibalas", "Keluhan (%)", "Balas median (menit)", "Nilai"]); d.chat.loket.forEach(function (x) { B.push([x.nama, x.pesan, x.pend, x.neg_pct, x.resp, x.nilai]); });
  B.push([], ["PESAN PER HARI", "Pemohon", "Admin"]); d.chat.harian.forEach(function (x) { B.push([x.tgl, x.u, x.a]); });
  if (d.bot) {
    B.push([], ["CHATBOT", "Nilai"], ["Terjawab", d.bot.hit], ["Tak terjawab", d.bot.miss], ["Akurasi (%)", d.bot.akurasi], ["Penilaian membantu", d.bot.rating_up], ["Penilaian belum membantu", d.bot.rating_dn]);
    B.push([], ["PERTANYAAN TAK TERJAWAB", "Jumlah"]); d.bot.tak_terjawab.forEach(function (x) { B.push([x.q, x.n]); });
    B.push([], ["ATURAN TERPAKAI", "Jumlah"]); d.bot.top.forEach(function (x) { B.push([x.k, x.n]); });
  }
  if (d.game) { B.push([], ["RUANG MAIN", "Dimainkan"]); Object.keys(d.game.per).forEach(function (g) { B.push([NAMA_GAME[g] || g, d.game.per[g]]); }); }
  if (d.visitor) { var p = d.visitor.kpi.periode; B.push([], ["PENGUNJUNG", "Nilai"], ["Sesi", p.vis], ["Unik", p.uv], ["Tampilan halaman", p.pv], ["Baru", p.baru], ["Kembali", p.kembali]); }
  B.push([], ["DAFTAR PERCAKAPAN (nama disamarkan)"], ["Tanggal", "Loket", "Pemohon", "Topik", "Pesan", "Status", "Respons (mnt)", "Nada", "Nilai"]);
  d.daftar.forEach(function (x) { B.push([x.tgl, x.loket, x.nama, x.topik, x.pesan, x.status, x.respons, x.senti < 0 ? "Keluhan" : x.senti > 0 ? "Puas" : "Netral", x.nilai]); });
  B.push([], ["REKOMENDASI"]); d.rek.forEach(function (s) { B.push([s]); });
  return B;
}

function gambar(el) {
  var d = D, k = d.chat.kpi, sup = d.super, o = "";
  var rng = [7, 14, 30, 90].map(function (h) { return '<button type="button" class="chip" data-lh="' + h + '" aria-pressed="' + (h === H) + '">' + h + " hari</button>"; }).join("");
  var mxT = Math.max.apply(null, d.chat.topik.map(function (x) { return x.n; }).concat([1]));
  o += '<div class="noprint"><h2 class="sec">Laporan</h2><p class="sys">' + (sup ? "Laporan lengkap seluruh instansi: chat, chatbot, Ruang Main, kanal, dan pengunjung." : "Laporan untuk loket Anda.") + ' Cetak atau simpan sebagai PDF lewat dialog cetak, atau unduh CSV.</p>' +
    '<div class="hint">' + rng + '<button type="button" class="send" id="lp-p">Cetak / simpan PDF</button><button type="button" class="btn" id="lp-c">Unduh CSV</button><button type="button" class="btn" id="lp-s">Salin ringkasan</button><button type="button" class="btn" id="lp-w">Kirim WhatsApp</button></div></div>';
  o += '<div class="print-area" id="lap-a" style="padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface)">';
  o += '<h2 style="margin:0">Laporan Layanan Takok Pelayanan Suroboyo</h2><p class="sys">Periode ' + d.hari + " hari terakhir &middot; dibuat " + E(tgl(d.dibuat)) + (window.ME && window.ME.nama ? " &middot; oleh " + E(window.ME.nama) : "") + (sup ? " &middot; cakupan: seluruh instansi" : " &middot; cakupan: loket Anda") + "</p>";
  o += hrg("Ringkasan eksekutif") + "<ul>" + ringkas(d).map(function (s) { return "<li>" + E(s) + "</li>"; }).join("") + "</ul>";
  o += hrg("Rekomendasi tindak lanjut") + "<ol>" + d.rek.map(function (s) { return "<li>" + E(s) + "</li>"; }).join("") + "</ol>";
  o += '<div class="kpis">' + kp(k.thread, "Percakapan aktif", k.selesai + " selesai") + kp(k.pesan_pemohon, "Pesan pemohon", k.pesan_admin + " balasan admin") + kp(dur(k.median_menit), "Waktu balas median", "P90 " + dur(k.p90_menit)) +
    kp(k.sla1 != null ? k.sla1 + "%" : "-", "Dibalas dalam 1 jam", k.sla24 != null ? k.sla24 + "% dalam 24 jam" : "") + kp(k.menunggu, "Belum dibalas") + kp(k.csat != null ? k.csat.toFixed(1) : "-", "Kepuasan", k.n_nilai + " penilaian") + "</div>";
  if (window.anDaily) o += hrg("Pesan per hari") + '<div class="card">' + window.anDaily(d.chat.harian) + "</div>";
  if (window.anHeat) o += '<div class="noprint">' + hrg("Jam dan hari tersibuk") + '<div class="card" style="overflow-x:auto">' + window.anHeat(d.chat.heat) + "</div></div>";
  o += hrg("Topik yang ditanyakan") + '<div class="card">' + (d.chat.topik.length ? bars(d.chat.topik.slice(0, 10), function (x) { return x.topik; }, function (x) { return x.n; }, mxT) : '<p class="sys">Belum ada data.</p>') + "</div>";
  o += hrg("Kinerja per loket") + tbl(["Loket", "Pesan", "Percakapan", "Belum dibalas", "Keluhan", "Balas (median)", "Nilai"], d.chat.loket.map(function (x) { return [x.nama, x.pesan, x.thread, x.pend, (x.neg_pct || 0) + "%", dur(x.resp), x.nilai != null ? Number(x.nilai).toFixed(1) : "-"]; }));
  if (d.chat.faq.length) o += hrg("Pertanyaan berulang") + "<ul>" + d.chat.faq.slice(0, 8).map(function (x) { return "<li>" + E(x.contoh) + " <small>(" + x.n + "x)</small></li>"; }).join("") + "</ul>";
  if (d.chat.menunggu.length) o += hrg("Antrean terlama") + tbl(["Pemohon", "Loket", "Menunggu", "Pesan terakhir"], d.chat.menunggu.map(function (x) { return [x.nama, x.loket, dur(x.menit), x.teks]; }));
  if (sup && d.bot) {
    var b = d.bot, tot = b.rating_up + b.rating_dn;
    o += hrg("Chatbot") + '<div class="kpis">' + kp(b.akurasi + "%", "Pertanyaan terjawab", b.hit + " terjawab, " + b.miss + " tidak") + kp(tot ? Math.round(100 * b.rating_up / tot) + "%" : "-", "Jawaban membantu", tot + " penilaian") + kp(b.up + "/" + b.dn, "Umpan balik aturan", "membantu / belum") + "</div>";
    o += hrg("Pertanyaan yang belum terjawab") + tbl(["Pertanyaan", "Jumlah"], b.tak_terjawab.map(function (x) { return [x.q, x.n]; }), "Tidak ada.");
    o += hrg("Aturan kata cari terpakai") + tbl(["Aturan", "Dipakai"], b.top.map(function (x) { return [x.k, x.n]; }));
    var al = Object.keys(b.alasan); if (al.length) o += hrg("Alasan jawaban belum membantu") + tbl(["Alasan", "Jumlah"], al.map(function (a) { return [ALASAN[a] || a, b.alasan[a]]; }));
  }
  if (sup && d.game) {
    var gk = Object.keys(d.game.per).sort(function (a, b) { return d.game.per[b] - d.game.per[a]; });
    o += hrg("Ruang Main") + "<p class=\"sys\">Total dimainkan: <b>" + d.game.total + "</b></p>" + (gk.length ? bars(gk, function (g) { return NAMA_GAME[g] || g; }, function (g) { return d.game.per[g]; }) : '<p class="sys">Belum ada data.</p>');
  }
  if (sup && d.kanal && Object.keys(d.kanal).length) o += hrg("Kanal") + tbl(["Kanal", "Pesan"], Object.keys(d.kanal).map(function (a) { return [a.replace(":total", ""), d.kanal[a]]; }));
  if (sup && d.visitor) {
    var v = d.visitor, p = v.kpi.periode;
    o += hrg("Pengunjung") + '<div class="kpis">' + kp(p.vis, "Sesi", "periode ini") + kp(p.uv, "Pengunjung unik") + kp(p.pv, "Tampilan halaman") + kp(p.baru + " / " + p.kembali, "Baru / kembali") + "</div>";
    if (v.sumber.length) o += hrg("Sumber kunjungan") + tbl(["Sumber", "Jumlah"], v.sumber.slice(0, 8).map(function (x) { return [x.k, x.n]; }));
    if (v.fitur && v.fitur.length) o += hrg("Fitur paling dipakai") + tbl(["Fitur", "Jumlah"], v.fitur.slice(0, 10).map(function (x) { return [x.k, x.n]; }));
  }
  o += hrg("Daftar percakapan") + '<p class="sys">Nama pemohon disamarkan, nomor HP dan isi pesan tidak dicantumkan. Menampilkan ' + Math.min(d.daftar.length, 40) + " dari " + d.total_daftar + " (daftar lengkap ada di CSV).</p>" +
    tbl(["Tanggal", "Loket", "Pemohon", "Topik", "Pesan", "Status", "Respons"], d.daftar.slice(0, 40).map(function (x) { return [x.tgl, x.loket, x.nama, x.topik, x.pesan, x.status, x.respons != null ? dur(x.respons) : "-"]; }), "Belum ada percakapan.");
  o += '<p class="sys">Dihitung otomatis dari kata kunci bahasa Indonesia; topik, nada, dan urgensi adalah perkiraan.</p></div>';
  el.innerHTML = o;
  el.querySelector("[data-lh]").parentNode.onclick = function (e) { var b = e.target.closest("[data-lh]"); if (b) { H = +b.dataset.lh; window.aX("lap"); } };
  document.getElementById("lp-p").onclick = function () { document.body.classList.add("lap-printing"); window.print(); setTimeout(function () { document.body.classList.remove("lap-printing"); }, 500); };
  document.getElementById("lp-c").onclick = function () { unduh("laporan-takok-" + d.hari + "hari.csv", csv(d)); };
  document.getElementById("lp-s").onclick = function () {
    var t = teks(d);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { if (window.toast) window.toast("Ringkasan disalin."); }, function () { if (window.toast) window.toast("Tidak bisa menyalin."); });
    else if (window.toast) window.toast("Browser tidak mendukung salin otomatis.");
  };
  document.getElementById("lp-w").onclick = function () { window.open("https://wa.me/?text=" + encodeURIComponent(teks(d)), "_blank", "noopener,noreferrer"); };
}

window.aLap = async function (el) { D = await api("/api/admin/laporan?hari=" + H); gambar(el); };
window.Laporan = {data: function () { return D; }, teks: function () { return D ? teks(D) : ""; }, csv: function () { return D ? csv(D) : []; }};
})();
