"use strict";
/* Fitur tambahan: Status Permohonan, Booking Kunjungan, Survei Kepuasan (SKM), Berita, dan tab admin. */
window.PN = "";
var PSEEN = null, AT = "inbox", BJ = "";
var PMH_WARNA = {"Diterima": "#64748b", "Sedang diverifikasi": "#2563eb", "Perlu perbaikan berkas": "#d97706", "Disetujui": "#16a34a", "Siap diambil": "#0d9488", "Selesai": "#15803d", "Ditolak": "#dc2626"};
var SKM_Q = ["Persyaratan pelayanan", "Sistem, mekanisme, dan prosedur", "Waktu penyelesaian", "Biaya/tarif", "Produk spesifikasi jenis pelayanan", "Kompetensi pelaksana", "Perilaku pelaksana", "Penanganan pengaduan, saran, dan masukan", "Sarana dan prasarana"];
function bdg(st) { return '<span class="bdg" style="background:' + (PMH_WARNA[st] || "#64748b") + '">' + esc(st) + '</span>'; }
function back() { return '<button type="button" class="btn" data-pn="">&larr; Kembali ke beranda</button>'; }
function tglId(ms) { return new Date(ms).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}); }
function wibDate(add) { return new Date(Date.now() + (420 + new Date().getTimezoneOffset()) * 60000 + add * 86400000); }
function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function lokNama(id) { var l = LOCS.filter(function (x) { return x.id === id; })[0]; return l ? l.nm : id; }
function setPN(p) { window.PN = p; MYV = false; ui(); window.scrollTo(0, 0); }

/* ---------- Tampilan umum ---------- */
function fiturUI() {
  if (S !== "user") { window.PN = ""; PSEEN = null; }
  var on = S === "user" && !!window.PN;
  $("v-pn").hidden = !on;
  if (on) panel(window.PN);
  var b = window.BERITA || [];
  $("bt").hidden = !b.length;
  $("bt").innerHTML = b.length ? '<h2 class="sec">Berita &amp; Informasi</h2>' + b.map(function (x) {
    return '<article class="card" style="margin:0 0 8px"><b>' + esc(x.judul) + '</b><small class="sys">' + tglId(x.waktu) + '</small><p style="margin:0">' + esc(x.isi) + '</p></article>';
  }).join("") : "";
}
async function panel(p) {
  var el = $("v-pn");
  el.innerHTML = back() + '<div class="empty">Memuat&hellip;</div>';
  try {
    if (p === "pmh") await pPmh(el); else if (p === "bk") await pBk(el); else if (p === "skm") pSkm(el);
  } catch (x) { el.innerHTML = back() + '<div class="empty">' + esc(x.message) + '</div>'; }
}
$("v-pn").addEventListener("click", function (e) {
  var b = e.target.closest("[data-pn]");
  if (b) { setPN(b.dataset.pn); return; }
  pnClick(e);
});
$("v-pn").addEventListener("change", function (e) { if (e.target.id === "bl" || e.target.id === "bt2") slots(); });
$("t7").onclick = function () { if (!needLogin()) setPN("pmh"); };
$("t8").onclick = function () { if (!needLogin()) setPN("bk"); };
$("t9").onclick = function () { if (!needLogin()) setPN("skm"); };

/* Dipanggil dari polling pemohon: notifikasi bila status permohonan berubah */
function pmhCheck(arr) {
  var cur = {}, ch = false;
  arr.forEach(function (o) { cur[o.id] = o.ubah; });
  if (PSEEN) arr.forEach(function (o) {
    if (PSEEN[o.id] !== o.ubah) { ch = true; notify("Status permohonan", o.jenis + ": " + o.status, function () { setPN("pmh"); }); }
  });
  PSEEN = cur;
  if (ch && window.PN === "pmh" && S === "user") panel("pmh");
}

/* ---------- Pemohon: Status Permohonan ---------- */
async function pPmh(el) {
  var j = await api("/api/permohonan");
  el.innerHTML = back() + '<h2 class="sec">Status Permohonan</h2>' + (j.daftar.length ? j.daftar.map(function (o) {
    return '<article class="card" style="margin:0 0 10px"><b>' + esc(o.jenis) + '</b><div class="sys">No. ' + esc(o.nomor || "-") + ' &middot; diperbarui ' + fmt(o.ubah) + '</div><div>' + bdg(o.status) + '</div><ol class="tlx">' +
      o.riwayat.slice().reverse().map(function (r) { return '<li><b>' + esc(r.status) + '</b> <small class="sys">' + fmt(r.waktu) + '</small>' + (r.catatan ? '<br>' + esc(r.catatan) : '') + '</li>'; }).join("") + '</ol></article>';
  }).join("") : '<div class="empty">Belum ada permohonan yang dicatat. Admin mencatat permohonan Anda setelah diajukan di loket.</div>') +
    '<p class="sys">Status diperbarui manual oleh petugas PTSP, bukan otomatis dari OSS atau SSW.</p>';
}

/* ---------- Pemohon: Booking Kunjungan ---------- */
function tglOpts() {
  var o = "";
  for (var i = 0; i <= 14; i++) {
    var d = wibDate(i);
    if (d.getDay() >= 1 && d.getDay() <= 5) o += '<option value="' + iso(d) + '">' + d.toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"}) + '</option>';
  }
  return o;
}
async function pBk(el) {
  el.innerHTML = back() + '<h2 class="sec">Booking Kunjungan</h2><div class="card"><select class="si" id="bl" aria-label="Lokasi">' +
    LOCS.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.nm) + '</option>'; }).join("") +
    '</select><select class="si" id="bt2" aria-label="Tanggal">' + tglOpts() + '</select><div class="hint" id="bj" role="group" aria-label="Jam"></div>' +
    '<textarea class="si" id="bk2" rows="2" maxlength="200" placeholder="Keperluan (mis. mengurus IPT)" aria-label="Keperluan"></textarea>' +
    '<button type="button" class="send" id="bgo">Buat booking</button><p class="sys" style="margin:0">Layanan hari kerja. Datanglah 10 menit sebelum jam booking dan tunjukkan kode booking Anda.</p></div>' +
    '<h2 class="sec">Booking saya</h2><div id="bsaya"></div>';
  if ($("bl").querySelector('option[value="' + LOC + '"]')) $("bl").value = LOC;
  BJ = "";
  await slots();
  await bSaya();
}
async function slots() {
  var box = $("bj");
  if (!box) return;
  try {
    var j = await api("/api/slot?lokasi=" + encodeURIComponent($("bl").value) + "&tanggal=" + encodeURIComponent($("bt2").value));
    box.innerHTML = j.slot.map(function (s) {
      return '<button type="button" class="chip" data-j="' + s.jam + '" aria-pressed="' + (BJ === s.jam) + '"' + (s.sisa ? '' : ' disabled') + '>' + s.jam + ' (' + (s.sisa ? 'sisa ' + s.sisa : 'penuh') + ')</button>';
    }).join("");
  } catch (x) { box.textContent = x.message; }
}
async function bSaya() {
  var el = $("bsaya");
  if (!el) return;
  var j = await api("/api/booking"), hari = iso(wibDate(0));
  el.innerHTML = j.daftar.length ? j.daftar.map(function (o) {
    var aktif = o.status === "Terjadwal" && o.tanggal >= hari;
    return '<article class="card" style="margin:0 0 8px"><div class="kode">' + esc(o.kode) + '</div><div>' + esc(lokNama(o.lokasi)) + '</div><div class="sys">' + esc(o.tanggal) + ' &middot; ' + esc(o.jam) + ' WIB &middot; ' + esc(o.keperluan) + '</div><div>' +
      '<span class="bdg" style="background:' + ({"Terjadwal": "#2563eb", "Hadir": "#15803d", "Tidak hadir": "#dc2626"}[o.status] || "#64748b") + '">' + esc(o.status) + '</span></div>' +
      (aktif ? '<button type="button" class="btn" data-bc="' + o.id + '">Batalkan</button>' : '') + '</article>';
  }).join("") : '<div class="empty">Belum ada booking.</div>';
}

/* ---------- Pemohon: Survei Kepuasan ---------- */
function pSkm(el) {
  var lab = ["Tidak baik", "Kurang baik", "Baik", "Sangat baik"];
  el.innerHTML = back() + '<h2 class="sec">Survei Kepuasan Masyarakat</h2><div class="card"><p class="sys" style="margin:0">Nilai pelayanan yang Anda terima. Jawaban dipakai untuk menghitung Indeks Kepuasan Masyarakat (IKM).</p>' +
    '<select class="si" id="sl" aria-label="Lokasi pelayanan">' + LOCS.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.nm) + '</option>'; }).join("") + '</select>' +
    SKM_Q.map(function (q, i) {
      return '<fieldset class="fs"><legend>' + (i + 1) + '. ' + esc(q) + '</legend>' + lab.map(function (t, k) {
        return '<label><input type="radio" name="q' + i + '" value="' + (k + 1) + '"> ' + t + '</label>';
      }).join("") + '</fieldset>';
    }).join("") + '<textarea class="si" id="ss" rows="2" maxlength="300" placeholder="Saran dan masukan (opsional)" aria-label="Saran"></textarea><button type="button" class="send" id="skmgo">Kirim survei</button></div>';
  if ($("sl").querySelector('option[value="' + LOC + '"]')) $("sl").value = LOC;
}

async function pnClick(e) {
  var t = e.target, id = t.id;
  err("");
  try {
    if (t.dataset.j) { BJ = t.dataset.j; slots(); return; }
    if (id === "bgo") {
      if (!BJ) { err("Pilih jam kunjungan dulu."); return; }
      t.disabled = true;
      var r = await api("/api/booking", {lokasi: $("bl").value, tanggal: $("bt2").value, jam: BJ, keperluan: clean($("bk2").value)});
      toast("Booking berhasil. Kode Anda: " + r.booking.kode);
      BJ = ""; $("bk2").value = ""; await slots(); await bSaya(); t.disabled = false; return;
    }
    if (t.dataset.bc) { await api("/api/booking/batal", {id: t.dataset.bc}); toast("Booking dibatalkan."); await slots(); await bSaya(); return; }
    if (id === "skmgo") {
      var j = [];
      for (var i = 0; i < 9; i++) {
        var c = document.querySelector('input[name="q' + i + '"]:checked');
        if (!c) { err("Jawab semua 9 pertanyaan dulu (belum: nomor " + (i + 1) + ")."); return; }
        j.push(+c.value);
      }
      t.disabled = true;
      await api("/api/skm", {lokasi: $("sl").value, j: j, saran: clean($("ss").value)});
      $("v-pn").innerHTML = back() + '<div class="empty"><b>Terima kasih.</b><br>Penilaian Anda sangat membantu kami meningkatkan pelayanan.</div>';
    }
  } catch (x) { err(x.message); if (t.disabled) t.disabled = false; }
}

/* ---------- Admin: tab tambahan ---------- */
function admTabs() {
  $("atabs").innerHTML = [["inbox", "Kotak masuk"], ["pmh", "Permohonan"], ["bk", "Booking"], ["bt", "Berita"], ["skm", "Rekap SKM"]].map(function (t) {
    return '<button type="button" class="chip" data-at="' + t[0] + '" aria-pressed="' + (t[0] === AT) + '">' + t[1] + '</button>';
  }).join("");
  $("atabs").onclick = function (e) { var b = e.target.closest("[data-at]"); if (b) admTab(b.dataset.at); };
  admTab(AT);
}
function admTab(t) {
  AT = t;
  [].forEach.call($("atabs").children, function (c) { c.setAttribute("aria-pressed", c.dataset.at === t); });
  $("a-inbox").hidden = t !== "inbox";
  $("a-x").hidden = t === "inbox";
  if (t !== "inbox") aX(t);
}
async function aX(t) {
  var el = $("a-x");
  el.innerHTML = '<div class="empty">Memuat&hellip;</div>';
  try {
    if (t === "pmh") await aPmh(el); else if (t === "bk") await aBk(el); else if (t === "bt") await aBt(el); else if (t === "skm") await aSkm(el);
  } catch (x) { el.innerHTML = '<div class="empty">' + esc(x.message) + '</div>'; }
}
async function aPmh(el) {
  var j = await api("/api/admin/permohonan"), opt = function (s) { return j.status.map(function (x) { return '<option' + (x === s ? ' selected' : '') + '>' + x + '</option>'; }).join(""); };
  el.innerHTML = '<h2 class="sec">Catat permohonan pemohon</h2><div class="card"><input class="si" id="ph" placeholder="Nomor HP pemohon (terdaftar di aplikasi)" inputmode="tel" maxlength="16"><input class="si" id="pj" placeholder="Jenis permohonan (mis. Pengajuan NIB)" maxlength="100"><input class="si" id="pn2" placeholder="Nomor permohonan / registrasi (opsional)" maxlength="40"><select class="si" id="ps">' + opt("Diterima") + '</select><input class="si" id="pc" placeholder="Catatan untuk pemohon (opsional)" maxlength="200"><button type="button" class="send" id="pbaru">Catat</button></div>' +
    '<h2 class="sec">Permohonan terbaru</h2>' + (j.daftar.length ? j.daftar.map(function (o) {
      return '<article class="card" style="margin:0 0 8px"><b>' + esc(o.jenis) + '</b><div class="sys">' + esc(o.nama) + ' &middot; ' + esc(o.hp) + ' &middot; No. ' + esc(o.nomor || "-") + '</div><div>' + bdg(o.status) + '</div>' +
        '<select class="si" data-ps="' + o.id + '">' + opt(o.status) + '</select><input class="si" data-pc="' + o.id + '" placeholder="Catatan perubahan" maxlength="200"><div class="btns"><button type="button" class="send" data-pu="' + o.id + '">Perbarui</button><button type="button" class="btn" data-pd="' + o.id + '">Hapus</button></div></article>';
    }).join("") : '<div class="empty">Belum ada permohonan.</div>');
}
async function aBk(el, tgl) {
  tgl = tgl || iso(wibDate(0));
  var j = await api("/api/admin/booking?tanggal=" + tgl);
  el.innerHTML = '<h2 class="sec">Booking kunjungan</h2><div class="card"><input class="si" type="date" id="bd" value="' + tgl + '" aria-label="Tanggal"><div class="btns"><input class="si" id="bq" type="number" min="1" max="200" value="' + j.kuota + '" style="max-width:120px" aria-label="Kuota per jam"><button type="button" class="btn" id="bqs">Simpan kuota per jam</button></div></div>' +
    '<p class="stat">' + j.daftar.length + ' booking pada ' + esc(tgl) + '</p>' + (j.daftar.length ? j.daftar.map(function (o) {
      return '<article class="card" style="margin:0 0 8px"><div class="kode">' + esc(o.kode) + '</div><div>' + esc(o.jam) + ' WIB &middot; ' + esc(o.lokasi_nama) + '</div><div class="sys">' + esc(o.nama) + ' &middot; ' + esc(o.hp) + ' &middot; ' + esc(o.keperluan) + '</div><div><b>' + esc(o.status) + '</b></div>' +
        '<div class="btns"><button type="button" class="btn" data-bs="' + o.id + '|Hadir">Hadir</button><button type="button" class="btn" data-bs="' + o.id + '|Tidak hadir">Tidak hadir</button><button type="button" class="btn" data-bs="' + o.id + '|Terjadwal">Reset</button></div></article>';
    }).join("") : '<div class="empty">Belum ada booking di tanggal ini.</div>');
}
async function aBt(el) {
  var j = await api("/api/info"), L = j.berita || [];
  window.BERITA = L;
  el.innerHTML = '<h2 class="sec">Berita &amp; Informasi</h2><div class="card"><input class="si" id="bj2" placeholder="Judul" maxlength="100"><textarea class="si" id="bi" rows="3" maxlength="600" placeholder="Isi berita atau informasi"></textarea><button type="button" class="send" id="bpub">Terbitkan</button></div>' +
    (L.length ? L.map(function (x) { return '<article class="card" style="margin:0 0 8px"><b>' + esc(x.judul) + '</b><small class="sys">' + tglId(x.waktu) + '</small><p style="margin:0">' + esc(x.isi) + '</p><button type="button" class="btn" data-bd="' + x.id + '">Hapus</button></article>'; }).join("") : '<div class="empty">Belum ada berita.</div>');
}
async function aSkm(el) {
  var j = await api("/api/admin/skm");
  if (!j.total) { el.innerHTML = '<div class="empty">Belum ada pengisian survei.</div>'; return; }
  var tab = Object.keys(j.per).map(function (k) { var p = j.per[k]; return '<tr><td>' + esc(p.nama) + '</td><td>' + p.n + '</td><td><b>' + p.ikm.toFixed(2) + '</b></td><td>' + esc(p.mutu) + '</td></tr>'; }).join("");
  el.innerHTML = '<h2 class="sec">Rekap Survei Kepuasan (IKM)</h2><div class="card"><div class="kode">' + j.total.ikm.toFixed(2) + ' <small>/ 100</small></div><div>Mutu pelayanan: <b>' + esc(j.total.mutu) + '</b> &middot; ' + j.total.n + ' responden</div></div>' +
    '<h2 class="sec">Per lokasi</h2><div class="card" style="overflow-x:auto"><table class="tb"><tr><th>Lokasi</th><th>Responden</th><th>IKM</th><th>Mutu</th></tr>' + tab + '</table></div>' +
    '<h2 class="sec">Nilai per unsur (skala 1 sampai 4)</h2><div class="card">' + j.unsur.map(function (u, i) { var v = j.total.unsur[i]; return '<div style="margin:0 0 8px"><div style="display:flex;justify-content:space-between"><span>' + esc(u) + '</span><b>' + v.toFixed(2) + '</b></div><div class="bar2"><i style="width:' + (v / 4 * 100) + '%"></i></div></div>'; }).join("") + '</div>' +
    '<h2 class="sec">Saran terbaru</h2>' + (j.saran.length ? j.saran.map(function (s) { return '<article class="card" style="margin:0 0 8px"><div>' + esc(s.saran) + '</div><small class="sys">' + esc(s.lokasi) + ' &middot; ' + esc(s.waktu) + '</small></article>'; }).join("") : '<div class="empty">Belum ada saran.</div>') +
    '<p class="sys">IKM = rata-rata nilai 9 unsur x 25. Mutu: A (88,31 sampai 100), B (76,61 sampai 88,30), C (65,00 sampai 76,60), D (25,00 sampai 64,99).</p>';
}
$("v-adm").addEventListener("click", async function (e) {
  if (S !== "adm" || !$("a-x") || $("a-x").hidden) return;
  var t = e.target, id = t.id, d = t.dataset;
  err("");
  try {
    if (id === "pbaru") { await api("/api/admin/permohonan/baru", {hp: $("ph").value, jenis: $("pj").value, nomor: $("pn2").value, status: $("ps").value, catatan: $("pc").value}); toast("Permohonan dicatat."); aX("pmh"); return; }
    if (d.pu) { await api("/api/admin/permohonan/ubah", {id: d.pu, status: document.querySelector('[data-ps="' + d.pu + '"]').value, catatan: document.querySelector('[data-pc="' + d.pu + '"]').value}); toast("Status diperbarui. Pemohon akan diberi tahu."); aX("pmh"); return; }
    if (d.pd) { if (d.sure !== "1") { d.sure = "1"; t.textContent = "Yakin hapus?"; return; } await api("/api/admin/permohonan/hapus", {id: d.pd}); aX("pmh"); return; }
    if (id === "bqs") { await api("/api/admin/pengaturan", {kuota: +$("bq").value}); CFG.kuota = $("bq").value; toast("Kuota disimpan."); return; }
    if (d.bs) { var p = d.bs.split("|"); await api("/api/admin/booking/status", {id: p[0], status: p[1]}); aBk($("a-x"), $("bd").value); return; }
    if (id === "bpub") { await api("/api/admin/berita", {judul: $("bj2").value, isi: $("bi").value}); toast("Berita terbit."); aX("bt"); return; }
    if (d.bd) { await api("/api/admin/berita/hapus", {id: d.bd}); aX("bt"); return; }
  } catch (x) { err(x.message); }
});
$("v-adm").addEventListener("change", function (e) { if (e.target.id === "bd") aBk($("a-x"), e.target.value); });
