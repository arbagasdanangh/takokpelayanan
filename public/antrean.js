"use strict";
/* Versi 75: Check-in / check-out antrean lewat QR nomor tiket antrean (booking).
   Pemohon menunjukkan QR di tiket antrean; petugas memindai (kamera, pemindai USB, atau ketik nomor):
   Terjadwal -> Check-in -> Dipanggil -> Mulai layanan -> Check-out, lengkap dengan lama tunggu dan lama layanan. */
(function () {
var $ = function (i) { return document.getElementById(i); };
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var AKSI = {masuk: "Check-in", panggil: "Panggil", mulai: "Mulai layanan", keluar: "Check-out", tidak_hadir: "Tidak hadir"};
var WARNA = {"Terjadwal": "#64748b", "Sudah tiba": "#d97706", "Dipanggil": "#2563eb", "Hadir": "#15803d", "Tidak hadir": "#b91c1c"};
function jam(ms) { return ms ? new Date(ms).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(".", ":") : ""; }
function mnt(a, b) { return a && b ? Math.max(0, Math.round((b - a) / 60000)) + " mnt" : ""; }
function stat(a) { return a.keluar ? "Selesai" : a.status; }
var ov = null, boxEl = null, tmr = 0;

function tutup() { if (ov) { ov.remove(); ov = null; } }
var NT = {ok: "Pemohon sudah dikabari lewat Telegram/WhatsApp.", gagal: "Pemberitahuan ke pemohon gagal terkirim. Panggil langsung di loket.", tanpa: "Pemohon belum mengaktifkan pemberitahuan. Panggil lewat layar antrean.", dibatasi: "Pemberitahuan baru saja dikirim.", nonaktif: ""};
function tampil(a, pesan, galat, notif) {
  tutup(); ov = document.createElement("div"); ov.className = "an-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
  var tl = [["Check-in", a && a.tiba], ["Dipanggil", a && a.panggil], ["Dilayani", a && a.mulai], ["Check-out", a && a.keluar]].filter(function (x) { return x[1]; }).map(function (x) { return "<span>" + x[0] + " <b>" + jam(x[1]) + "</b></span>"; }).join("");
  var tbl = a ? (a.aksi || []).map(function (k, i) { return '<button type="button" class="btn' + (i === 0 ? " send" : "") + '" data-an="' + k + '" data-kode="' + esc2(a.kode) + '">' + AKSI[k] + '</button>'; }).join("") : "";
  ov.innerHTML = '<div class="an-box"><div class="an-ic ' + (galat ? "x" : "ok") + '">' + (galat ? "!" : "✓") + '</div><p class="an-ps">' + esc2(pesan) + '</p>' + (notif && NT[notif] ? '<p class="an-nt an-nt-' + notif + '">' + esc2(NT[notif]) + '</p>' : "")
    + (a ? '<div class="an-no">' + esc2(a.kode) + '</div><p class="an-nm"><b>' + esc2(a.nama) + '</b><br>' + esc2(a.loket) + ' &middot; jam ' + esc2(a.jam) + '</p><p class="an-st" style="background:' + (a.keluar ? "#0f766e" : WARNA[a.status] || "#64748b") + '">' + esc2(stat(a)) + '</p>' + (a.keperluan ? '<p class="sys">' + esc2(a.keperluan) + '</p>' : "")
      + (tl ? '<div class="an-tl">' + tl + '</div>' : "") + (a.mulai && a.keluar ? '<p class="sys">Lama tunggu ' + mnt(a.tiba, a.mulai) + ' &middot; lama layanan ' + mnt(a.mulai, a.keluar) + '</p>' : "")
      + (tbl ? '<div class="an-bt">' + tbl + '</div>' : "") : "") + '<button type="button" class="btn" data-an="tutup">Tutup</button></div>';
  document.body.appendChild(ov);
  var f = ov.querySelector(".send") || ov.querySelector("button"); if (f) f.focus();
}
async function scan(kode, aksi) {
  try { var j = await api("/api/admin/cek/antrean", {kode: kode, aksi: aksi || "auto"}); tampil(j.antrean, j.pesan, false, j.notif); refresh(); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} return j; }
  catch (x) { tampil(null, x.message || "Gagal memproses antrean.", true); }
}

/* kartu "Antrean hari ini" di tab Check-in tamu */
async function render(box) {
  if (!box) return; boxEl = box; clearInterval(tmr);
  var j = await api("/api/admin/cek/antrean"), r = j.ringkas, now = j.sekarang;
  var rows = j.daftar.map(function (a) {
    var w = a.tiba && !a.mulai ? mnt(a.tiba, now) : "";
    return '<tr><td><b>' + esc2(a.kode) + '</b></td><td>' + esc2(a.nama) + '</td><td>' + esc2(a.loket) + '<br><small>jam ' + esc2(a.jam) + '</small></td><td><span class="an-chip" style="background:' + (a.keluar ? "#0f766e" : WARNA[a.status] || "#64748b") + '">' + esc2(stat(a)) + '</span></td>'
      + '<td>' + (a.tiba ? jam(a.tiba) : "-") + (w ? '<br><small>tunggu ' + w + '</small>' : "") + '</td><td>' + (a.mulai ? jam(a.mulai) : "-") + '</td><td>' + (a.keluar ? jam(a.keluar) + '<br><small>layanan ' + mnt(a.mulai, a.keluar) + '</small>' : "-") + '</td>'
      + '<td>' + a.aksi.map(function (k, i) { return '<button type="button" class="btn' + (i === 0 ? " send" : "") + '" data-an="' + k + '" data-kode="' + esc2(a.kode) + '" data-q="1">' + AKSI[k] + '</button>'; }).join(" ") + '</td></tr>';
  }).join("");
  box.innerHTML = '<div class="card"><b>Antrean hari ini (QR tiket antrean)</b><p class="sys">Pemohon yang booking menunjukkan QR pada tiket antreannya. Pindai dengan kamera, pemindai USB, atau ketik nomor antrean.</p>'
    + '<div class="kpis"><div class="kpi"><b>' + r.total + '</b><span>antrean</span></div><div class="kpi"><b>' + r.menunggu + '</b><span>menunggu dipanggil</span></div><div class="kpi"><b>' + r.di_dalam + '</b><span>di dalam</span></div><div class="kpi"><b>' + r.selesai + '</b><span>selesai</span></div><div class="kpi"><b>' + (r.rata_tunggu ? r.rata_tunggu + " mnt" : "-") + '</b><span>rata-rata tunggu</span></div><div class="kpi"><b>' + (r.rata_layanan ? r.rata_layanan + " mnt" : "-") + '</b><span>rata-rata layanan</span></div></div>'
    + '<div class="an-in"><input id="an-i" placeholder="Nomor antrean, mis. PUS08-1711-003" autocomplete="off" aria-label="Nomor antrean"><button type="button" class="btn send" data-an="cari">Proses</button><button type="button" class="btn" data-pd="scan">📷 Pindai kamera</button></div>'
    + (rows ? '<div class="ck-tw"><table class="tb"><tr><th>Nomor</th><th>Pemohon</th><th>Loket</th><th>Status</th><th>Check-in</th><th>Dilayani</th><th>Check-out</th><th></th></tr>' + rows + '</table></div>' : '<p class="sys">Belum ada antrean hari ini.</p>') + '</div>';
  var inp = box.querySelector("#an-i"); if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.stopPropagation(); box.querySelector("[data-an=cari]").click(); } });
  tmr = setInterval(function () { if (!document.body.contains(box)) { clearInterval(tmr); return; } if (!ov && !document.hidden) render(box).catch(function () {}); }, 20000);
}
function refresh() { if (boxEl && document.body.contains(boxEl)) render(boxEl).catch(function () {}); }

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-an]"); if (!b) return; var a = b.dataset.an;
  if (a === "tutup") tutup();
  else if (a === "cari") { var v = String(($("an-i") || {}).value || "").trim().toUpperCase(); if (v) scan(v, "auto"); }
  else if (AKSI[a]) scan(b.dataset.kode, a);
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov) tutup(); });
window.TKANT = {scan: scan, render: render};
})();
