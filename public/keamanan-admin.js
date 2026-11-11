"use strict";
/* Tab admin "Keamanan & biro jasa" (khusus superuser): (1) akun dengan indikasi biro jasa/calo untuk ditinjau, (2) log percobaan XSS/injeksi yang diblokir. */
(function () {
function $(i) { return document.getElementById(i); }
function tgl(ms) { var d = new Date(ms); return isNaN(d) ? "" : d.toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}); }
var WARNA = {tinggi: "#b91c1c", pantau: "#b45309", aman: "#15803d"}, NAMA = {tinggi: "Indikasi tinggi", pantau: "Perlu dipantau", aman: "Aman"};
var STT = {bj: "Ditandai biro jasa (booking diblokir)", pantau: "Dipantau", bukan: "Dinyatakan bukan biro jasa"};
function baris(x) {
  return '<div class="card kam-r"><div class="kam-h"><b>' + esc(x.nama) + '</b> <small class="sys">HP ' + esc(x.hp) + " | " + esc(x.email) + '</small>' +
    '<i class="pb" style="background:' + WARNA[x.tingkat] + '">' + NAMA[x.tingkat] + ' (skor ' + x.skor + ')</i>' + (x.status ? '<i class="pb" style="background:#475569">' + esc(STT[x.status] || x.status) + '</i>' : '') + '</div>' +
    '<ul class="bul">' + x.alasan.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join("") + '</ul>' +
    (x.contoh.length ? '<details class="set"><summary>Cuplikan chat yang memicu</summary>' + x.contoh.map(function (c) { return '<p class="sys">&ldquo;' + esc(c) + '&rdquo;</p>'; }).join("") + '</details>' : '') +
    (x.status ? '<p class="sys">Ditandai oleh ' + esc(x.oleh || "-") + ' pada ' + esc(tgl(x.tanda)) + (x.catatan ? ': ' + esc(x.catatan) : '') + '</p>' : '') +
    '<div class="btns"><button type="button" class="btn" data-kam="pantau" data-p="' + x.pid + '">Pantau</button><button type="button" class="btn" data-kam="bj" data-p="' + x.pid + '">Tandai biro jasa (blokir booking)</button><button type="button" class="btn" data-kam="bukan" data-p="' + x.pid + '">Bukan biro jasa</button>' + (x.status ? '<button type="button" class="btn" data-kam="" data-p="' + x.pid + '">Hapus tanda</button>' : '') + '</div></div>';
}
window.aKam = async function (el) {
  var j = await api("/api/admin/keamanan"), n = j.n || {}, tot = Object.keys(n).reduce(function (a, k) { return a + n[k]; }, 0);
  el.innerHTML = '<div class="card"><h3>Keamanan dan pencegahan penyalahgunaan</h3>' +
    '<p class="sys">Aplikasi menyaring teks berpola kode (XSS, SQL/NoSQL/Redis injection, perintah, path traversal) pada pendaftaran, chat, booking, dan permohonan. Jaringan yang 4 kali mencoba dalam 10 menit diblokir 30 menit. Tampilan sudah di-escape, CSP ketat, dan ekspor Excel/CSV aman dari injeksi rumus.</p>' +
    '<div class="hint">' + (tot ? Object.keys(n).map(function (k) { return '<span class="chip">' + esc(k) + ': ' + n[k] + '</span>'; }).join("") : '<span class="sys">Belum ada percobaan serangan tercatat.</span>') + '</div></div>' +
    '<div class="card"><h3>Indikasi biro jasa / calo (' + j.bj.length + ')</h3>' +
    '<p class="sys">Skor dihitung dari pola pemakaian (banyak booking dan permohonan, banyak akun dari jaringan sama, ajakan bayaran atau menyebut jasa berbayar di chat). <b>Ini indikasi untuk ditinjau, bukan putusan.</b> Periksa dulu sebelum menandai; yang ditandai "biro jasa" tidak bisa membuat booking baru dan dapat menghubungi admin bila keliru. Pemohon wajib mencentang pernyataan tidak menerima bayaran saat booking.</p></div>' +
    (j.bj.length ? j.bj.map(baris).join("") : '<div class="empty">Belum ada akun dengan indikasi biro jasa.</div>') +
    '<div class="card"><h3>Log percobaan serangan (100 terakhir)</h3>' + (j.log.length ? '<div class="kam-t"><table><thead><tr><th>Waktu</th><th>Jenis</th><th>Bagian</th><th>Pemohon</th><th>Jaringan</th><th>Cuplikan</th></tr></thead><tbody>' +
      j.log.map(function (x) { return '<tr><td>' + esc(tgl(x.t)) + '</td><td>' + esc(x.jenis) + '</td><td>' + esc(x.rute) + '</td><td>' + esc(x.pid || "-") + '</td><td>' + esc(x.ip) + '</td><td>' + esc(x.cup) + '</td></tr>'; }).join("") + '</tbody></table></div>' : '<p class="sys">Kosong.</p>') + '</div>';
  el.onclick = async function (e) {
    var b = e.target.closest("[data-kam]"); if (!b) return;
    var st = b.dataset.kam, cat = "";
    if (st === "bj" && !confirm("Tandai akun ini sebagai biro jasa? Booking barunya akan diblokir.")) return;
    if (st === "bj" || st === "bukan") cat = prompt("Catatan singkat (alasan, opsional):") || "";
    b.disabled = true;
    try { await api("/api/admin/bj/tandai", {pid: b.dataset.p, s: st, cat: cat}); toast("Tersimpan."); await window.aKam(el); } catch (x) { toast(x.message); b.disabled = false; }
  };
};
})();
