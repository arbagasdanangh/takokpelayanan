"use strict";
/* Versi 74: Cek-in / cek-out pengunjung dengan kode QR.
   Pengunjung: pindai QR di loket -> isi nama -> tercatat masuk; pindai lagi (atau buka halaman yang sama) -> Check-out.
   Admin: tab "Check-in tamu" (yang sedang di dalam, ringkasan, grafik per jam, riwayat, CSV, QR per lokasi + cetak poster). */
(function () {
var $ = function (i) { return document.getElementById(i); };
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function jam(ms) { try { return new Date(ms).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(".", ":"); } catch (e) { return ""; } }
function lama(ms) { var m = Math.max(0, Math.round(ms / 60000)); return m < 60 ? m + " mnt" : Math.floor(m / 60) + " j " + (m % 60) + " mnt"; }
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function urlQr(k) { return location.origin + "/?cek=" + encodeURIComponent(k); }

/* ================= sisi pengunjung ================= */
var ov = null, tick = 0;
function tutup() { clearInterval(tick); if (ov) { ov.remove(); ov = null; } try { var u = new URL(location.href); u.searchParams.delete("cek"); history.replaceState(null, "", u.pathname + (u.search || "") + u.hash); } catch (e) {} }
function kerangka(isi) { ov.innerHTML = '<div class="ck-box" role="document">' + isi + '</div>'; }
async function mulai(k) {
  ov = document.createElement("div"); ov.className = "ck-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Check-in pengunjung"); document.body.appendChild(ov);
  kerangka('<p class="sys">Memuat&hellip;</p>');
  var info, sv = lsGet("tk_cek");
  try { info = await api("/api/cek/info?k=" + encodeURIComponent(k)); } catch (e) { kerangka('<h2>Kode tidak berlaku</h2><p class="sys">' + esc2(e.message) + '</p><button type="button" class="btn send" data-ck="tutup">Buka aplikasi</button>'); return; }
  if (sv && sv.tok) {
    try { var st = await api("/api/cek/status?tok=" + encodeURIComponent(sv.tok)); if (st.ada && st.rec && !st.rec.keluar) { di_dalam(st.rec, sv.tok); return; } } catch (e) {}
    lsSet("tk_cek", null);
  }
  form(info, k);
}
function form(info, k) {
  var pf = lsGet("tk_cek_profil") || {}, tj = info.loket.map(function (l) { return '<option value="' + esc2(l.kunci) + '">' + esc2(l.nama) + '</option>'; }).join("");
  kerangka('<div class="ck-h"><span class="ck-ic">🚪</span><div><h2>Check-in pengunjung</h2><p class="sys">' + esc2(info.lokasi) + '</p></div></div>'
    + (info.aktif ? '<label>Nama<input id="ck-n" autocomplete="name" maxlength="60" value="' + esc2(pf.nama || "") + '" placeholder="Nama lengkap"></label>'
    + '<label>Nomor HP <small>(opsional)</small><input id="ck-h" inputmode="tel" autocomplete="tel" maxlength="16" value="' + esc2(pf.hp || "") + '" placeholder="08xxxxxxxxxx"></label>'
    + '<label>Tujuan loket <small>(opsional)</small><select id="ck-t"><option value="">Belum tahu / lainnya</option>' + tj + '</select></label>'
    + '<div class="ck-r"><span>Jumlah orang</span><span class="ck-s"><button type="button" data-ck="min" aria-label="Kurangi">−</button><b id="ck-c">1</b><button type="button" data-ck="plus" aria-label="Tambah">+</button></span></div>'
    + '<p class="sys">Data dipakai untuk pencatatan kunjungan dan keselamatan gedung, disimpan 100 hari lalu dihapus otomatis.</p><div id="ck-e" class="err" hidden></div>'
    + '<button type="button" class="btn send ck-go" data-ck="masuk">Check-in sekarang</button>'
    : '<div class="err">Check-in sedang dinonaktifkan petugas. Silakan lapor ke petugas.</div>')
    + '<button type="button" class="btn" data-ck="tutup">Nanti saja</button>');
  ov.dataset.k = k;
}
function di_dalam(rec, tok) {
  var el0 = rec.masuk;
  kerangka('<div class="ck-ok">✓</div><h2>Anda tercatat masuk</h2><p class="sys">' + esc2(rec.nama) + (rec.n > 1 ? " (" + rec.n + " orang)" : "") + ' &middot; ' + esc2(rec.lokasi) + (rec.tujuan_nama ? " &middot; " + esc2(rec.tujuan_nama) : "") + '</p>'
    + '<p class="ck-t">Masuk pukul <b>' + jam(rec.masuk) + '</b> &middot; sudah <b id="ck-l">' + lama(Date.now() - el0) + '</b></p>'
    + '<p class="sys">Saat pulang, pindai kode QR yang sama atau tekan tombol ini.</p><div id="ck-e" class="err" hidden></div>'
    + '<button type="button" class="btn send ck-go" data-ck="keluar">Check-out sekarang</button><button type="button" class="btn" data-ck="tutup">Tutup</button>');
  ov.dataset.tok = tok; clearInterval(tick); tick = setInterval(function () { var l = $("ck-l"); if (l) l.textContent = lama(Date.now() - el0); }, 20000);
}
function selesai(rec) {
  clearInterval(tick); lsSet("tk_cek", null);
  kerangka('<div class="ck-ok">✓</div><h2>Terima kasih</h2><p class="sys">Anda tercatat keluar pukul ' + jam(rec.keluar) + ' (lama kunjungan ' + lama(rec.keluar - rec.masuk) + ').</p><p class="sys">Hati-hati di jalan.</p><button type="button" class="btn send" data-ck="tutup">Tutup</button>');
}
function galat(m) { var e = $("ck-e"); if (e) { e.hidden = false; e.textContent = m; } }
document.addEventListener("click", async function (e) {
  var b = e.target.closest && e.target.closest("[data-ck]"); if (!b || !ov) return; var a = b.dataset.ck;
  if (a === "tutup") tutup();
  else if (a === "plus" || a === "min") { var c = $("ck-c"); c.textContent = Math.max(1, Math.min(20, (+c.textContent || 1) + (a === "plus" ? 1 : -1))); }
  else if (a === "masuk") {
    var nama = $("ck-n").value.trim(), hp = $("ck-h").value.trim(); if (nama.length < 2) { galat("Isi nama Anda."); return; }
    b.disabled = true;
    try { var j = await api("/api/cek/masuk", {k: ov.dataset.k, nama: nama, hp: hp, tujuan: $("ck-t").value, n: +$("ck-c").textContent || 1}); lsSet("tk_cek", {tok: j.tok}); lsSet("tk_cek_profil", {nama: nama, hp: hp}); di_dalam(j.rec, j.tok); }
    catch (x) { b.disabled = false; galat(x.message); }
  } else if (a === "keluar") {
    b.disabled = true;
    try { var r = await api("/api/cek/keluar", {tok: ov.dataset.tok}); selesai(r.rec); } catch (x) { b.disabled = false; galat(x.message); if (/tidak ditemukan|tidak valid/i.test(x.message)) lsSet("tk_cek", null); }
  }
});
function awal() { var k = null; try { k = new URLSearchParams(location.search).get("cek"); } catch (e) {} if (k) mulai(k); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", awal); else awal();

/* ================= sisi admin ================= */
var tmr = 0;
function hariIni() { var d = new Date(Date.now() + 7 * 36e5); return d.toISOString().slice(0, 10); }
window.aCek = async function (el) {
  clearInterval(tmr);
  var tgl = el.dataset.tgl || hariIni(), lok = el.dataset.lok || "", tampilSemua = false;
  async function muat() {
    var j = await api("/api/admin/cek?d=" + tgl.replace(/-/g, "") + (lok ? "&lok=" + encodeURIComponent(lok) : "")); gambar(j);
  }
  function gambar(j) {
    var r = j.ringkas, mx = Math.max.apply(null, r.per_jam.concat([1])), now = j.sekarang, sup = j.sup;
    var opt = '<option value="">Semua lokasi</option>' + j.kode.map(function (k) { return '<option value="' + esc2(k.lok) + '"' + (k.lok === lok ? " selected" : "") + '>' + esc2(k.nama) + '</option>'; }).join("");
    var dalam = j.dalam.length ? '<div class="ck-tw"><table class="tb"><tr><th>Nama</th><th>HP</th><th>Lokasi / tujuan</th><th>Orang</th><th>Masuk</th><th>Lama</th><th></th></tr>' + j.dalam.map(function (x) {
      return '<tr><td>' + esc2(x.nama) + '</td><td>' + esc2(x.hp) + '</td><td>' + esc2(x.lokasi) + (x.tujuan_nama ? '<br><small>' + esc2(x.tujuan_nama) + '</small>' : "") + '</td><td>' + x.n + '</td><td>' + jam(x.masuk) + '</td><td class="ck-lm" data-m="' + x.masuk + '">' + lama(now - x.masuk) + '</td><td><button type="button" class="btn" data-ca="kel" data-id="' + x.id + '">Keluarkan</button></td></tr>';
    }).join("") + '</table></div>' : '<p class="sys">Tidak ada pengunjung di dalam saat ini.</p>';
    var rows = tampilSemua ? j.rows : j.rows.slice(0, 100);
    var riw = j.rows.length ? '<div class="ck-tw"><table class="tb"><tr><th>Masuk</th><th>Keluar</th><th>Nama</th><th>Lokasi</th><th>Orang</th><th>Durasi</th><th>Oleh</th></tr>' + rows.map(function (x) {
      return '<tr><td>' + jam(x.masuk) + '</td><td>' + (x.keluar ? jam(x.keluar) : "<i>di dalam</i>") + '</td><td>' + esc2(x.nama) + '</td><td>' + esc2(x.lokasi) + '</td><td>' + x.n + '</td><td>' + (x.keluar ? lama(x.keluar - x.masuk) : "") + '</td><td>' + esc2(x.oleh) + '</td></tr>';
    }).join("") + '</table></div>' + (j.rows.length > 100 && !tampilSemua ? '<button type="button" class="btn" data-ca="semua">Tampilkan semua ' + j.rows.length + '</button>' : "") : '<p class="sys">Belum ada catatan pada tanggal ini.</p>';
    var qr = j.kode.length ? j.kode.map(function (k) { return '<div class="ck-q"><div class="ck-qs">' + TKQR.svg(urlQr(k.k), {label: "QR " + k.nama}) + '</div><b>' + esc2(k.nama) + '</b><div class="ck-qb"><button type="button" class="chip" data-ca="png" data-k="' + esc2(k.k) + '" data-n="' + esc2(k.nama) + '">Unduh PNG</button><button type="button" class="chip" data-ca="cetak" data-k="' + esc2(k.k) + '" data-n="' + esc2(k.nama) + '">Cetak poster</button></div></div>'; }).join("") : '<p class="err">SESSION_SECRET belum diisi, kode QR belum bisa dibuat.</p>';
    var peng = sup ? '<div class="card"><b>Pengaturan</b><label class="ck-r2"><input type="checkbox" id="ck-ak"' + (j.cfg.aktif ? " checked" : "") + '> Check-in dibuka</label><label class="ck-r2">Keluar otomatis setelah <input id="ck-jm" type="number" min="1" max="24" value="' + j.cfg.jam + '" style="width:64px"> jam</label><div><button type="button" class="btn send" data-ca="simpan">Simpan</button> <button type="button" class="btn" data-ca="ganti">Ganti semua kode QR</button></div><small class="sys">Mengganti kode membuat QR yang sudah dicetak tidak berlaku. Cetak ulang setelahnya.</small></div>' : "";
    el.innerHTML = '<h2 class="sec">Check-in tamu (QR)</h2><div id="ant-box"></div><h3 class="sec" style="margin-top:14px">Tamu tanpa antrean (walk-in)</h3><div class="kpis"><div class="kpi"><b>' + r.di_dalam + '</b><span>di dalam sekarang</span></div><div class="kpi"><b>' + r.kunjungan + '</b><span>kunjungan</span></div><div class="kpi"><b>' + r.orang + '</b><span>orang masuk</span></div><div class="kpi"><b>' + (r.rata_menit ? lama(r.rata_menit * 60000) : "-") + '</b><span>rata-rata lama</span></div></div>'
      + '<div class="card ck-f"><label>Tanggal <input type="date" id="ck-d" value="' + tgl + '"></label><label>Lokasi <select id="ck-lk">' + opt + '</select></label><button type="button" class="btn" data-ca="muat">Muat</button><button type="button" class="btn" data-ca="csv">Unduh CSV</button></div>'
      + '<div class="card"><b>Sedang di dalam (' + r.di_dalam + ' orang)</b>' + dalam + '</div>'
      + '<div class="card"><b>Pengunjung per jam</b><div class="ck-g">' + r.per_jam.map(function (v, h) { return '<div class="ck-gb" title="' + h + ':00 – ' + v + ' orang"><i style="height:' + Math.round(v / mx * 100) + '%"></i><span>' + (h % 3 === 0 ? h : "") + '</span></div>'; }).join("") + '</div></div>'
      + '<div class="card"><b>Riwayat (' + j.rows.length + ')</b>' + riw + '</div>'
      + '<div class="card"><b>Kode QR per lokasi</b><p class="sys">Untuk tamu <b>tanpa booking</b> (walk-in): tempel di pintu masuk; pengunjung memindai dengan kamera HP. Pemohon yang sudah booking cukup menunjukkan QR pada tiket antreannya.</p><div class="ck-qg">' + qr + '</div></div>' + peng
      + '<p class="sys">' + (sup ? "Nomor HP tampil penuh untuk superadmin." : "Nomor HP disamarkan; superadmin dapat melihat penuh.") + ' Catatan terhapus otomatis setelah 100 hari.</p>';
    el.dataset.tgl = tgl; el.dataset.lok = lok;
    if (window.TKANT) TKANT.render(el.querySelector("#ant-box")).catch(function () {});
  }
  el.onclick = async function (e) {
    var b = e.target.closest("[data-ca]"); if (!b) return; var a = b.dataset.ca;
    try {
      if (a === "muat") { tgl = $("ck-d").value || tgl; lok = $("ck-lk").value; tampilSemua = false; await muat(); }
      else if (a === "semua") { tampilSemua = true; await muat(); }
      else if (a === "kel") { await api("/api/admin/cek/keluar", {id: b.dataset.id}); toast("Pengunjung dikeluarkan."); await muat(); }
      else if (a === "csv") { var d = ($("ck-d").value || tgl).replace(/-/g, ""); location.href = "/api/app?p=%2Fadmin%2Fcek.csv&d1=" + d + "&d2=" + d; }
      else if (a === "png") { var cv = TKQR.canvas(urlQr(b.dataset.k), {skala: 12}); cv.toBlob(function (bl) { var l = document.createElement("a"); l.href = URL.createObjectURL(bl); l.download = "qr-checkin-" + b.dataset.n.replace(/\W+/g, "-") + ".png"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(l.href); }, 3000); }); }
      else if (a === "cetak") poster(b.dataset.k, b.dataset.n);
      else if (a === "simpan") { await api("/api/admin/cek/cfg", {aktif: $("ck-ak").checked, jam: +$("ck-jm").value || 10}); toast("Pengaturan disimpan."); await muat(); }
      else if (a === "ganti") { if (!confirm("Ganti semua kode QR? QR yang sudah dicetak tidak akan berlaku lagi.")) return; await api("/api/admin/cek/cfg", {aktif: $("ck-ak").checked, jam: +$("ck-jm").value || 10, ganti_kode: true}); toast("Kode QR diganti. Cetak ulang poster."); await muat(); }
    } catch (x) { toast(x.message); }
  };
  await muat();
  tmr = setInterval(function () { if (!document.body.contains(el) || !el.querySelector(".ck-lm")) { if (!document.body.contains(el)) clearInterval(tmr); return; } [].forEach.call(el.querySelectorAll(".ck-lm"), function (c) { c.textContent = lama(Date.now() - (+c.dataset.m)); }); }, 30000);
};
function poster(k, nama) {
  var f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; document.body.appendChild(f);
  var d = f.contentWindow.document; d.open();
  d.write('<!doctype html><meta charset="utf-8"><title>Poster check-in</title><style>@page{size:A4;margin:14mm}body{font-family:system-ui,sans-serif;text-align:center;color:#0f172a}h1{font-size:40px;margin:0 0 4px}h2{font-size:26px;margin:0 0 18px;color:#0e7490}.q{width:420px;margin:12px auto}ol{display:inline-block;text-align:left;font-size:22px;line-height:1.6}p{font-size:16px;color:#475569}</style>'
    + '<h1>Check-in Pengunjung</h1><h2>' + esc2(nama) + '</h2><div class="q">' + TKQR.svg(urlQr(k), {}) + '</div><ol><li>Buka kamera HP, arahkan ke kode QR</li><li>Ketuk tautan yang muncul, isi nama, tekan <b>Check-in</b></li><li>Saat pulang, pindai lagi lalu tekan <b>Check-out</b></li></ol><p>Takok Pelayanan Suroboyo &middot; Data hanya untuk pencatatan kunjungan</p>');
  d.close(); setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(function () { f.remove(); }, 4000); }, 300);
}
})();
