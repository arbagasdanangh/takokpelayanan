"use strict";
/* Fitur tambahan: Status Permohonan, Booking Kunjungan, Survei Kepuasan (SKM), Berita, dan tab admin. */
window.PN = "";
var PSEEN = null, AT = "ring", BJ = "", BF = "all";
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
var OKT = {P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, UL: 1, OL: 1, LI: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, A: 1, HR: 1};
function safeHtml(h) {
  var doc = new DOMParser().parseFromString("<body>" + h + "</body>", "text/html");
  function w(n) {
    var o = "";
    n.childNodes.forEach(function (c) {
      if (c.nodeType === 3) o += esc(c.nodeValue);
      else if (c.nodeType === 1) {
        var t = c.tagName;
        if (t === "SCRIPT" || t === "STYLE") return;
        if (t === "DIV") t = "P";
        var inner = w(c), tg = t.toLowerCase();
        if (!OKT[t]) o += inner;
        else if (t === "BR" || t === "HR") o += "<" + tg + ">";
        else if (t === "A") { var hr = c.getAttribute("href") || ""; o += /^(https?:|mailto:)/i.test(hr) ? '<a href="' + esc(hr) + '" target="_blank" rel="noopener noreferrer nofollow">' + inner + '</a>' : inner; }
        else o += "<" + tg + ">" + inner + "</" + tg + ">";
      }
    });
    return o;
  }
  return w(doc.body);
}
function beritaKartu(x, buka) {
  return '<details class="card news"' + (buka ? ' open' : '') + '><summary><span class="nh"><b>' + esc(x.judul) + '</b> ' + (x.sematkan ? '<span class="bdg" style="background:#d97706">Disematkan</span> ' : '') + '<span class="bdg" style="background:#1a46b5">' + esc(x.kategori || "Berita") + '</span></span><small class="sys">' + tglId(x.waktu) + '</small></summary><div class="rich">' + safeHtml(x.isi || "") + '</div></details>';
}
function fiturUI() {
  if (S !== "user") { window.PN = ""; PSEEN = null; }
  var on = S === "user" && !!window.PN;
  $("v-pn").hidden = !on;
  if (on) panel(window.PN);
  var b = window.BERITA || [];
  $("bt").hidden = !b.length;
  $("bt").innerHTML = b.length ? '<h2 class="sec">Berita &amp; Informasi</h2>' + b.map(function (x, i) { return beritaKartu(x, i === 0); }).join("") : "";
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
$("v-pn").addEventListener("change", function (e) {
  var id = e.target.id;
  if (id === "bl") { $("bk3").innerHTML = loketOpts($("bl").value); BJ = ""; slots(); }
  else if (id === "bk3") { BJ = ""; slots(); }
  else if (id === "bt2") { if (CART.length && CART_TGL !== $("bt2").value) { CART = []; rencana(); toast("Tanggal diganti, rencana kunjungan dikosongkan."); } BJ = ""; slots(); }
  else if (id === "bk2") KEP = e.target.value;
  else if (id === "sl") skmIsi();
  else if (e.target.name && e.target.name.indexOf("q") === 0) skmProg();
});
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

/* ---------- Pemohon: Booking Kunjungan (per loket / instansi) ---------- */
var CART = [], CART_TGL = "", KEP = "", BSEEN = null;
var BK_WARNA = {"Terjadwal": "#2563eb", "Sudah tiba": "#0d9488", "Dipanggil": "#d97706", "Hadir": "#15803d", "Tidak hadir": "#dc2626", "Batal": "#64748b"};
function bkBdg(st) { return '<span class="bdg" style="background:' + (BK_WARNA[st] || "#64748b") + '">' + esc(st) + '</span>'; }
function tglOpts() {
  var o = "";
  for (var i = 0; i <= 14; i++) {
    var d = wibDate(i);
    if (d.getDay() >= 1 && d.getDay() <= 5) o += '<option value="' + iso(d) + '">' + d.toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"}) + '</option>';
  }
  return o;
}
function loketOpts(lok) {
  var out = "", pz = null;
  (LD[lok] || []).forEach(function (d) {
    if (d[6] === false) return;
    if (d[4] && d[4] !== pz) { if (pz !== null) out += "</optgroup>"; out += '<optgroup label="' + esc(d[4]) + '">'; pz = d[4]; }
    out += '<option value="' + lok + "_" + d[0] + '">' + esc(d[1]) + '</option>';
  });
  return out + (pz !== null ? "</optgroup>" : "");
}
async function pBk(el) {
  CART = []; BJ = ""; KEP = "";
  el.innerHTML = back() + '<h2 class="sec">Booking Kunjungan</h2><p class="sys" style="margin:0 0 8px">Setiap loket atau instansi punya jadwal dan kuota sendiri. Anda bisa menyusun beberapa tujuan dalam satu kunjungan.</p><div class="card"><select class="si" id="bl" aria-label="Lokasi">' +
    LOCS.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.nm) + '</option>'; }).join("") +
    '</select><select class="si" id="bk3" aria-label="Loket atau instansi tujuan"></select><select class="si" id="bt2" aria-label="Tanggal">' + tglOpts() + '</select><div class="hint" id="bj" role="group" aria-label="Jam"></div><p class="sys" id="brek" style="margin:0"></p>' +
    '<button type="button" class="btn" id="badd">+ Tambah ke rencana kunjungan</button></div><div class="card" id="brenc" style="margin-top:10px"></div><h2 class="sec">Booking saya</h2><div id="bsaya"></div>';
  if ($("bl").querySelector('option[value="' + LOC + '"]')) $("bl").value = LOC;
  $("bk3").innerHTML = loketOpts($("bl").value);
  await slots(); rencana(); await bSaya();
}
function rencana() {
  var el = $("brenc");
  if (!el) return;
  if (!CART.length) { el.innerHTML = '<p class="sys" style="margin:0">Rencana kunjungan masih kosong. Pilih loket dan jam, lalu tambahkan.</p>'; return; }
  el.innerHTML = '<b>Rencana kunjungan ' + esc(CART_TGL) + '</b>' + CART.slice().sort(function (a, b) { return a.jam < b.jam ? -1 : 1; }).map(function (c) {
    return '<div class="rc"><span><b>' + c.jam + '</b> &middot; ' + esc(label(c.kunci)) + '</span><button type="button" class="btn" data-rm="' + CART.indexOf(c) + '" aria-label="Hapus">Hapus</button></div>';
  }).join("") + '<textarea class="si" id="bk2" rows="2" maxlength="200" placeholder="Keperluan kunjungan (mis. mengurus BPJS dan pajak)" aria-label="Keperluan">' + esc(KEP) + '</textarea><button type="button" class="send" id="bgo">Buat ' + CART.length + ' booking</button>';
}
async function slots() {
  var box = $("bj");
  if (!box) return;
  try {
    var j = await api("/api/slot?kunci=" + encodeURIComponent($("bk3").value) + "&tanggal=" + encodeURIComponent($("bt2").value)), best = null;
    box.innerHTML = j.slot.map(function (s) {
      var r = s.sisa / j.kuota, c = !s.sisa ? "" : r >= 0.7 ? " sepi" : r <= 0.3 ? " ramai" : "", t = !s.sisa ? "penuh" : r >= 0.7 ? "sepi" : r <= 0.3 ? "ramai" : "sisa " + s.sisa;
      if (s.sisa && (!best || s.sisa > best.sisa)) best = s;
      return '<button type="button" class="chip' + c + '" data-j="' + s.jam + '" aria-pressed="' + (BJ === s.jam) + '"' + (s.sisa ? '' : ' disabled') + '>' + s.jam + ' &middot; ' + t + '</button>';
    }).join("");
    $("brek").textContent = best ? "Jam paling lengang: " + best.jam + " (sisa " + best.sisa + " dari " + j.kuota + ")." : "Semua jam pada tanggal ini sudah penuh.";
  } catch (x) { box.textContent = x.message; }
}
var C39 = {"0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  "A": "wnnnnwnnw", "B": "nnwnnwnnw", "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn", "F": "nnwnwwnnn", "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn",
  "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww", "O": "wnnnwnnwn", "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn",
  "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn", "-": "nwnnnnwnw", "*": "nwnnwnwnn"};
function barcode(t) {
  var s = "*" + String(t).toUpperCase().replace(/[^0-9A-Z\-]/g, "") + "*", x = 10, h = 46, r = "";
  for (var i = 0; i < s.length; i++) {
    var p = C39[s[i]];
    for (var k = 0; k < 9; k++) { var w = p[k] === "w" ? 5 : 2; if (k % 2 === 0) r += '<rect x="' + x + '" y="0" width="' + w + '" height="' + h + '"/>'; x += w; }
    x += 2;
  }
  return '<svg class="bc" viewBox="0 0 ' + (x + 8) + ' ' + h + '" role="img" aria-label="Barcode ' + esc(t) + '"><g fill="#000">' + r + '</g></svg>';
}
function icsTxt(t) { return String(t).replace(/[\\;,]/g, function (m) { return "\\" + m; }).replace(/\n/g, " "); }
function unduhIcs(o) {
  var p = o.tanggal.split("-"), h = o.jam.split(":"), st = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], +h[0] - 7, +h[1])), en = new Date(st.getTime() + 30 * 60000);
  var f = function (d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""); };
  var txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Takok Pelayanan Suroboyo//ID", "BEGIN:VEVENT", "UID:" + o.kode + "@takok", "DTSTAMP:" + f(new Date()), "DTSTART:" + f(st), "DTEND:" + f(en),
    "SUMMARY:" + icsTxt(label(o.kunci)) + " (" + o.kode + ")", "DESCRIPTION:Kode antrean " + o.kode + ". Keperluan: " + icsTxt(o.keperluan), "BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", "DESCRIPTION:Kunjungan pelayanan 1 jam lagi", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], {type: "text/calendar"})); a.download = o.kode + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
}
var BKL = [];
function namaLoket(o) { return label(o.kunci).split(" - ").slice(1).join(" - ") || lokNama(o.lokasi); }
function tiketHtml(o, hari) {
  var aktif = ["Terjadwal", "Sudah tiba", "Dipanggil"].indexOf(o.status) > -1, today = o.tanggal === hari, btn = "", info = "";
  var d = new Date(o.tanggal + "T00:00:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric"});
  if (o.status === "Terjadwal" && today) btn += '<button type="button" class="send" data-tiba="' + o.id + '">Saya sudah tiba</button>';
  if (o.status === "Terjadwal" && o.tanggal >= hari) btn += '<button type="button" class="btn" data-bc="' + o.id + '">Batalkan</button>';
  if (aktif) btn += '<button type="button" class="btn" data-ics="' + o.id + '">Tambah ke kalender</button>';
  btn += '<button type="button" class="btn" data-print="1">Cetak / simpan PDF</button>';
  if (o.status === "Dipanggil") info = '<div class="tk-call">Giliran Anda! Silakan menuju loket.</div>';
  else if (today && aktif && o.depan != null) info = '<div class="tk-depan">Di depan Anda: <b>' + o.depan + '</b> antrean</div>';
  return '<article class="tkt tiket' + (aktif ? '' : ' tk-off') + '"><div class="tk-head"><span>TIKET ANTREAN</span><span>' + esc(lokNama(o.lokasi)) + '</span></div><div class="tk-no">' + esc(o.kode) + '</div><div class="tk-loket">' + esc(namaLoket(o)) + '</div>' +
    '<div class="tk-row"><span>Tanggal</span><b>' + esc(d) + '</b></div><div class="tk-row"><span>Jam</span><b>' + esc(o.jam) + ' WIB</b></div><div class="tk-row"><span>Keperluan</span><b>' + esc(o.keperluan) + '</b></div>' +
    '<div class="tk-sep"></div><div class="tk-bc">' + barcode(o.kode) + '</div><div class="tk-st">' + bkBdg(o.status) + info + '</div><div class="btns noprint">' + btn + '</div></article>';
}
async function bSaya() {
  var el = $("bsaya");
  if (!el) return;
  var j = await api("/api/booking"), hari = iso(wibDate(0)), g = {};
  BKL = j.daftar;
  j.daftar.forEach(function (o) { (g[o.tanggal] = g[o.tanggal] || []).push(o); });
  var ks = Object.keys(g).sort().reverse();
  el.innerHTML = ks.length ? ks.map(function (t) {
    return '<h3 class="dh">' + esc(new Date(t + "T00:00:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric"})) + '</h3><div class="tkgrid">' +
      g[t].sort(function (a, b) { return a.jam < b.jam ? -1 : 1; }).map(function (o) { return tiketHtml(o, hari); }).join("") + '</div>';
  }).join("") : '<div class="empty">Belum ada booking.</div>';
}
setInterval(function () { if (S === "user" && window.PN === "bk" && !document.hidden && $("bsaya")) bSaya().catch(function () {}); }, 15000);
/* Dipanggil dari polling pemohon: notifikasi saat giliran dipanggil */
function bkCheck(arr) {
  var cur = {}, ch = false;
  arr.forEach(function (o) { cur[o.id] = o.status; });
  if (BSEEN) arr.forEach(function (o) {
    if (BSEEN[o.id] !== o.status) {
      ch = true;
      if (o.status === "Dipanggil") notify("Giliran Anda dipanggil", o.kode + " - " + label(o.kunci) + ". Silakan menuju loket.", function () { setPN("bk"); });
    }
  });
  BSEEN = cur;
  if (ch && window.PN === "bk" && S === "user") bSaya();
}

/* ---------- Pemohon: Survei Kepuasan ---------- */
function skmUnits(lok) {
  if (lok === "mpp") {
    var R = window.MPPR || [], out = '<option value="">Seluruh MPP Surabaya</option>', pz = null;
    R.forEach(function (r) {
      if (r.zona !== pz) { if (pz !== null) out += "</optgroup>"; out += '<optgroup label="' + esc(r.zona) + '">'; pz = r.zona; }
      out += '<option value="' + esc(r.id) + '">' + esc(r.nama) + '</option>';
    });
    return out + (pz !== null ? "</optgroup>" : "");
  }
  var o = '<option value="">Seluruh pelayanan di ' + esc(lokNama(lok)) + '</option>';
  (LD[lok] || []).forEach(function (d) { o += '<option value="' + lok + "_" + d[0] + '">' + esc(d[1]) + '</option>'; });
  return o;
}
function skmZonaInfo() {
  var g = {}, R = window.MPPR || [];
  R.forEach(function (r) { (g[r.zona] = g[r.zona] || []).push(r.nama); });
  return '<details class="mppz"><summary>Lihat semua zona dan instansi MPP Surabaya</summary>' + Object.keys(g).map(function (z) {
    return '<p style="margin:6px 0"><b>' + esc(z) + '</b> (' + g[z].length + '): ' + g[z].map(esc).join(", ") + '</p>';
  }).join("") + '</details>';
}
function skmProg() {
  var n = 0;
  for (var i = 0; i < 9; i++) if (document.querySelector('input[name="q' + i + '"]:checked')) n++;
  if ($("sprog")) { $("sprog").textContent = "Terjawab " + n + " dari 9"; $("sbar").style.width = (n / 9 * 100) + "%"; }
}
function pSkm(el) {
  var lab = ["Tidak baik", "Kurang baik", "Baik", "Sangat baik"];
  el.innerHTML = back() + '<h2 class="sec">Survei Kepuasan Masyarakat</h2><div class="card"><p class="sys" style="margin:0">Nilai pelayanan yang Anda terima. Pilih lokasi dan unit yang dinilai. Jawaban dipakai untuk menghitung Indeks Kepuasan Masyarakat (IKM).</p>' +
    '<select class="si" id="sl" aria-label="Lokasi pelayanan">' + LOCS.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.nm) + '</option>'; }).join("") + '</select>' +
    '<select class="si" id="su" aria-label="Unit atau instansi yang dinilai"></select><div id="szi"></div>' +
    '<div class="sp"><span id="sprog">Terjawab 0 dari 9</span><div class="bar2"><i id="sbar" style="width:0"></i></div></div>' +
    SKM_Q.map(function (q, i) {
      return '<fieldset class="fs"><legend>' + (i + 1) + '. ' + esc(q) + '</legend><div class="opts">' + lab.map(function (t, k) {
        return '<label class="opt"><input type="radio" name="q' + i + '" value="' + (k + 1) + '"><span>' + t + '</span></label>';
      }).join("") + '</div></fieldset>';
    }).join("") + '<textarea class="si" id="ss" rows="2" maxlength="300" placeholder="Saran dan masukan (opsional)" aria-label="Saran"></textarea><button type="button" class="send" id="skmgo">Kirim survei</button></div>';
  if ($("sl").querySelector('option[value="' + LOC + '"]')) $("sl").value = LOC;
  skmIsi();
}
function skmIsi() { $("su").innerHTML = skmUnits($("sl").value); $("szi").innerHTML = $("sl").value === "mpp" ? skmZonaInfo() : ""; }

async function pnClick(e) {
  var t = e.target, id = t.id;
  err("");
  try {
    if (t.dataset.j) { BJ = t.dataset.j; slots(); return; }
    if (id === "badd") {
      var k = $("bk3").value, tg = $("bt2").value;
      if (!k) { err("Pilih loket tujuan."); return; }
      if (!BJ) { err("Pilih jam kunjungan dulu."); return; }
      if (CART.length && CART_TGL !== tg) { err("Semua tujuan dalam satu rencana harus di tanggal yang sama."); return; }
      if (CART.some(function (c) { return c.kunci === k; })) { err("Loket ini sudah ada di rencana."); return; }
      if (CART.some(function (c) { return c.jam === BJ; })) { err("Sudah ada tujuan lain di jam " + BJ + ". Pilih jam berbeda."); return; }
      if (CART.length >= 6) { err("Maksimal 6 tujuan per kunjungan."); return; }
      CART.push({kunci: k, jam: BJ}); CART_TGL = tg; BJ = ""; slots(); rencana(); return;
    }
    if (t.dataset.rm) { CART.splice(+t.dataset.rm, 1); rencana(); return; }
    if (id === "bgo") {
      KEP = $("bk2").value;
      t.disabled = true;
      var r = await api("/api/booking", {tanggal: CART_TGL, keperluan: clean(KEP), item: CART});
      toast("Booking berhasil: " + r.booking.map(function (o) { return o.kode; }).join(", "));
      CART = []; KEP = ""; BJ = ""; rencana(); await slots(); await bSaya(); return;
    }
    if (t.dataset.tiba) { await api("/api/booking/tiba", {id: t.dataset.tiba}); toast("Check-in berhasil. Petugas akan memanggil Anda sesuai urutan."); await bSaya(); return; }
    if (t.dataset.ics) { var bo = BKL.filter(function (x) { return String(x.id) === t.dataset.ics; })[0]; if (bo) unduhIcs(bo); return; }
    if (t.dataset.bc) { await api("/api/booking/batal", {id: t.dataset.bc}); toast("Booking dibatalkan."); await slots(); await bSaya(); return; }
    if (t.dataset.print) { var a = t.closest(".tiket"); a.classList.add("print-area"); window.print(); a.classList.remove("print-area"); return; }
    if (id === "skmgo") {
      var j = [];
      for (var i = 0; i < 9; i++) {
        var c = document.querySelector('input[name="q' + i + '"]:checked');
        if (!c) { err("Jawab semua 9 pertanyaan dulu (belum: nomor " + (i + 1) + ")."); return; }
        j.push(+c.value);
      }
      t.disabled = true;
      await api("/api/skm", {lokasi: $("sl").value, unit: $("su").value, j: j, saran: clean($("ss").value)});
      $("v-pn").innerHTML = back() + '<div class="empty"><b>Terima kasih.</b><br>Penilaian Anda sangat membantu kami meningkatkan pelayanan.</div>';
    }
  } catch (x) { err(x.message); if (t.disabled) t.disabled = false; }
}

/* ---------- Admin: tab tambahan ---------- */
function admTabs() {
  $("atabs").innerHTML = [["ring", "Ringkasan"], ["inbox", "Kotak masuk"], ["pmh", "Permohonan"], ["bk", "Booking"], ["an", "Analitik Chat"], ["bt", "Berita"], ["skm", "Rekap SKM"], ["kt", "Kata cari chatbot"]].map(function (t) {
    return '<button type="button" class="chip" data-at="' + t[0] + '" aria-pressed="' + (t[0] === AT) + '">' + t[1] + '</button>';
  }).join("");
  $("atabs").onclick = function (e) { var b = e.target.closest("[data-at]"); if (b) admTab(b.dataset.at); };
  admTab(AT);
}
function admTab(t) {
  if (KDIRTY && AT === "kt" && t !== "kt") { if (!confirm("Perubahan di Kata cari chatbot belum disimpan. Tinggalkan tab ini?")) return; KDIRTY = false; }
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
    if (t === "ring") await aRing(el); else if (t === "pmh") await aPmh(el); else if (t === "bk") await aBk(el); else if (t === "bt") await aBt(el); else if (t === "skm") await aSkm(el); else if (t === "kt") { await aKt(el); if (window.AN_KT) { var w = window.AN_KT; window.AN_KT = null; ktAdd(w); } } else if (t === "an") await aAn(el);
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
async function aRing(el) {
  var j = await api("/api/admin/ringkasan"), mx = Math.max.apply(null, j.booking_7hari.map(function (x) { return x.n; }).concat([1])), bs = j.booking_hari_ini.status;
  var kpi = function (v, t, s, at) { return '<button type="button" class="kpi" data-goat="' + at + '"><span class="kv">' + v + '</span><span>' + t + '</span><small class="sys">' + s + '</small></button>'; };
  el.innerHTML = '<h2 class="sec">Ringkasan</h2><div class="kpis">' +
    kpi(j.pend, "Perlu dijawab", "dari " + j.percakapan + " percakapan", "inbox") +
    kpi(j.booking_hari_ini.total, "Booking hari ini", "Hadir " + (bs["Hadir"] || 0) + " &middot; Dipanggil " + (bs["Dipanggil"] || 0), "bk") +
    kpi(j.pemohon, "Pemohon terdaftar", "akun aktif", "inbox") +
    kpi(j.skm ? j.skm.ikm.toFixed(1) : "-", "IKM", j.skm ? esc(j.skm.mutu) + " &middot; " + j.skm.n + " responden" : "belum ada survei", "skm") + '</div>' +
    '<h2 class="sec">Booking 7 hari ke depan</h2><div class="card">' + j.booking_7hari.map(function (x) {
      var d = new Date(x.tanggal + "T00:00:00");
      return '<div style="display:flex;align-items:center;gap:8px;margin:0 0 6px"><span style="width:96px">' + d.toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"}) + '</span><div class="bar2" style="flex:1"><i style="width:' + (x.n / mx * 100) + '%"></i></div><b style="width:28px;text-align:right">' + x.n + '</b></div>';
    }).join("") + '</div><h2 class="sec">Permohonan per status</h2><div class="card">' + (Object.keys(j.pmh).length ? Object.keys(j.pmh).map(function (k) { return '<div style="display:flex;justify-content:space-between;margin:0 0 4px">' + bdg(k) + '<b>' + j.pmh[k] + '</b></div>'; }).join("") : '<span class="sys">Belum ada permohonan tercatat.</span>') + '</div>' +
    '<h2 class="sec">Layar antrean</h2><div class="card"><p class="sys" style="margin:0">Tampilkan nomor yang dipanggil di TV atau layar ruang tunggu. Layar mengumumkan dengan suara bila diaktifkan.</p><div class="btns"><a class="btn" href="/?layar=1" target="_blank" rel="noopener">Buka layar antrean</a></div></div>';
}
var BKA = [];
async function aBk(el, tgl) {
  tgl = tgl || iso(wibDate(0));
  var j = await api("/api/admin/booking?tanggal=" + tgl), L = j.daftar.filter(function (o) { return BF === "all" || o.lokasi === BF; }), g = {};
  BKA = j.daftar;
  L.forEach(function (o) { (g[o.kunci] = g[o.kunci] || []).push(o); });
  var urut = {"Sudah tiba": 0, "Terjadwal": 1, "Dipanggil": 2, "Hadir": 3, "Tidak hadir": 4};
  el.innerHTML = '<h2 class="sec">Booking kunjungan</h2><div class="card"><input class="si" type="date" id="bd" value="' + tgl + '" aria-label="Tanggal"><select class="si" id="bf" aria-label="Filter lokasi"><option value="all">Semua lokasi</option>' + LOCS.map(function (l) { return '<option value="' + esc(l.id) + '"' + (BF === l.id ? ' selected' : '') + '>' + esc(l.nm) + '</option>'; }).join("") + '</select>' +
    '<input class="si" id="bscan" placeholder="Scan barcode atau ketik kode tiket, lalu Enter untuk memanggil" autocomplete="off" aria-label="Scan kode tiket"><div class="btns"><input class="si" id="bq" type="number" min="1" max="200" value="' + j.kuota + '" style="max-width:120px" aria-label="Kuota per jam per loket"><button type="button" class="btn" id="bqs">Simpan kuota per jam per loket</button><a class="btn" href="/?layar=1' + (BF !== "all" ? "&lokasi=" + encodeURIComponent(BF) : "") + '" target="_blank" rel="noopener">Buka layar antrean</a></div></div>' +
    '<p class="stat">' + L.length + ' booking pada ' + esc(tgl) + '</p>' +
    (Object.keys(g).length ? Object.keys(g).sort().map(function (k) {
      var G = g[k].sort(function (a, b) { return (urut[a.status] - urut[b.status]) || (a.jam < b.jam ? -1 : 1) || (a.kode < b.kode ? -1 : 1); }), tunggu = G.filter(function (o) { return o.status === "Terjadwal" || o.status === "Sudah tiba"; }).length;
      return '<div class="zh" style="--zc:var(--acc)"><span class="zd"></span>' + esc(G[0].loket) + ' <small>' + tunggu + ' menunggu</small></div>' +
        '<div class="btns" style="margin:0 0 8px"><button type="button" class="send" data-nx="' + esc(k) + '"' + (tunggu ? '' : ' disabled') + '>Panggil berikutnya</button></div>' +
        G.map(function (o) {
          return '<article class="card" style="margin:0 0 8px"><div class="kode">' + esc(o.kode) + '</div><div>' + esc(o.jam) + ' WIB</div><div class="sys">' + esc(o.nama) + ' &middot; ' + esc(o.hp) + ' &middot; ' + esc(o.keperluan) + '</div><div>' + bkBdg(o.status) + '</div>' +
            '<div class="btns"><button type="button" class="send" data-bs="' + o.id + '|Dipanggil">Panggil</button><button type="button" class="btn" data-bs="' + o.id + '|Hadir">Selesai dilayani</button><button type="button" class="btn" data-bs="' + o.id + '|Tidak hadir">Tidak hadir</button><button type="button" class="btn" data-bs="' + o.id + '|Terjadwal">Reset</button></div></article>';
        }).join("");
    }).join("") : '<div class="empty">Belum ada booking di tanggal ini.</div>');
}
var BE = null;
async function aBt(el) {
  var j = await api("/api/info"), L = j.berita || [];
  window.BERITA = L; BE = null;
  var tb = [["bold", "<b>B</b>", "Tebal"], ["italic", "<i>I</i>", "Miring"], ["underline", "<u>U</u>", "Garis bawah"], ["h3", "H", "Judul bagian"], ["insertUnorderedList", "&bull; Daftar", "Daftar poin"], ["insertOrderedList", "1. Daftar", "Daftar nomor"], ["blockquote", "&ldquo; Kutipan", "Kutipan"], ["link", "Tautan", "Sisipkan tautan"], ["p", "Teks biasa", "Paragraf biasa"], ["removeFormat", "Bersihkan", "Hapus format"]];
  el.innerHTML = '<h2 class="sec" id="bjud">Tulis berita atau informasi</h2><div class="card"><input class="si" id="bj2" placeholder="Judul" maxlength="100" aria-label="Judul"><div class="btns"><select class="si" id="bkat" style="max-width:200px" aria-label="Kategori"><option>Berita</option><option>Pengumuman</option><option>Tips Layanan</option></select><label class="sys" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="bpin"> Sematkan di atas</label></div>' +
    '<div class="tbar" role="toolbar" aria-label="Format teks">' + tb.map(function (t) { return '<button type="button" class="btn" data-cmd="' + t[0] + '" title="' + t[2] + '">' + t[1] + '</button>'; }).join("") + '</div>' +
    '<div class="ed rich" id="bed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Isi berita" data-ph="Tulis isi berita di sini. Gunakan tombol di atas untuk format teks."></div>' +
    '<div class="btns"><button type="button" class="send" id="bpub">Terbitkan</button><button type="button" class="btn" id="bbatal" hidden>Batal ubah</button></div></div>' +
    '<h2 class="sec">Berita terbit</h2>' + (L.length ? L.map(function (x) {
      return beritaKartu(x, false) + '<div class="btns" style="margin:-4px 0 14px"><button type="button" class="btn" data-be="' + x.id + '">Ubah</button><button type="button" class="btn" data-bp="' + x.id + '">' + (x.sematkan ? 'Lepas sematan' : 'Sematkan') + '</button><button type="button" class="btn" data-bd="' + x.id + '">Hapus</button></div>';
    }).join("") : '<div class="empty">Belum ada berita.</div>');
}
async function aSkm(el) {
  var j = await api("/api/admin/skm");
  if (!j.total) { el.innerHTML = '<div class="empty">Belum ada pengisian survei.</div>'; return; }
  var baris = function (a, b, c, d) { return '<tr><td>' + a + '</td><td>' + b + '</td><td><b>' + c + '</b></td><td>' + d + '</td></tr>'; };
  var tab = Object.keys(j.per).map(function (k) { var p = j.per[k]; return baris(esc(p.nama), p.n, p.ikm.toFixed(2), esc(p.mutu)); }).join("");
  var zon = Object.keys(j.per_zona || {}).sort().map(function (k) { var p = j.per_zona[k]; return baris(esc(k), p.n, p.ikm.toFixed(2), esc(p.mutu)); }).join("");
  var un = (j.per_unit || []).map(function (p) { return baris(esc(p.nama) + '<br><small class="sys">' + esc(p.lokasi) + (p.zona ? ' &middot; ' + esc(p.zona) : '') + '</small>', p.n, p.ikm.toFixed(2), esc(p.mutu)); }).join("");
  el.innerHTML = '<h2 class="sec">Rekap Survei Kepuasan (IKM)</h2><div class="card"><div class="kode">' + j.total.ikm.toFixed(2) + ' <small>/ 100</small></div><div>Mutu pelayanan: <b>' + esc(j.total.mutu) + '</b> &middot; ' + j.total.n + ' responden</div></div>' +
    '<h2 class="sec">Per lokasi</h2><div class="card" style="overflow-x:auto"><table class="tb"><tr><th>Lokasi</th><th>Responden</th><th>IKM</th><th>Mutu</th></tr>' + tab + '</table></div>' +
    (zon ? '<h2 class="sec">Per zona MPP Surabaya</h2><div class="card" style="overflow-x:auto"><table class="tb"><tr><th>Zona</th><th>Responden</th><th>IKM</th><th>Mutu</th></tr>' + zon + '</table></div>' : '') +
    (un ? '<h2 class="sec">Per instansi / loket</h2><div class="card" style="overflow-x:auto"><table class="tb"><tr><th>Unit</th><th>Responden</th><th>IKM</th><th>Mutu</th></tr>' + un + '</table></div>' : '') +
    '<h2 class="sec">Nilai per unsur (skala 1 sampai 4)</h2><div class="card">' + j.unsur.map(function (u, i) { var v = j.total.unsur[i]; return '<div style="margin:0 0 8px"><div style="display:flex;justify-content:space-between"><span>' + esc(u) + '</span><b>' + v.toFixed(2) + '</b></div><div class="bar2"><i style="width:' + (v / 4 * 100) + '%"></i></div></div>'; }).join("") + '</div>' +
    '<h2 class="sec">Saran terbaru</h2>' + (j.saran.length ? j.saran.map(function (s) { return '<article class="card" style="margin:0 0 8px"><div>' + esc(s.saran) + '</div><small class="sys">' + esc(s.lokasi) + ' &middot; ' + esc(s.waktu) + '</small></article>'; }).join("") : '<div class="empty">Belum ada saran.</div>') +
    '<p class="sys">IKM = rata-rata nilai 9 unsur x 25. Mutu: A (88,31 sampai 100), B (76,61 sampai 88,30), C (65,00 sampai 76,60), D (25,00 sampai 64,99).</p>';
}
$("v-adm").addEventListener("click", async function (e) {
  if (S !== "adm" || !$("a-x") || $("a-x").hidden) return;
  var t = e.target.closest("button,a,input,select") || e.target, id = t.id, d = t.dataset;
  if (d.goat) { admTab(d.goat); return; }
  err("");
  try {
    if (id === "pbaru") { await api("/api/admin/permohonan/baru", {hp: $("ph").value, jenis: $("pj").value, nomor: $("pn2").value, status: $("ps").value, catatan: $("pc").value}); toast("Permohonan dicatat."); aX("pmh"); return; }
    if (d.pu) { await api("/api/admin/permohonan/ubah", {id: d.pu, status: document.querySelector('[data-ps="' + d.pu + '"]').value, catatan: document.querySelector('[data-pc="' + d.pu + '"]').value}); toast("Status diperbarui. Pemohon akan diberi tahu."); aX("pmh"); return; }
    if (d.pd) { if (d.sure !== "1") { d.sure = "1"; t.textContent = "Yakin hapus?"; return; } await api("/api/admin/permohonan/hapus", {id: d.pd}); aX("pmh"); return; }
    if (d.nx) { var r = await api("/api/admin/booking/berikut", {tanggal: $("bd").value, kunci: d.nx}); toast("Memanggil " + r.kode + " (" + r.nama + ")."); aBk($("a-x"), $("bd").value); return; }
    if (id === "bqs") { await api("/api/admin/pengaturan", {kuota: +$("bq").value}); CFG.kuota = $("bq").value; toast("Kuota disimpan."); return; }
    if (d.bs) { var p = d.bs.split("|"); await api("/api/admin/booking/status", {id: p[0], status: p[1]}); if (p[1] === "Dipanggil") toast("Nomor dipanggil dan tampil di layar antrean."); aBk($("a-x"), $("bd").value); return; }
    if (id === "bpub") {
      var isi = safeHtml($("bed").innerHTML);
      await api("/api/admin/berita", {id: BE, judul: $("bj2").value, isi: isi, kategori: $("bkat").value, sematkan: $("bpin").checked});
      toast(BE ? "Berita diperbarui." : "Berita terbit."); aX("bt"); return;
    }
    if (id === "bbatal") { aX("bt"); return; }
    if (d.be) {
      var x = (window.BERITA || []).filter(function (n) { return String(n.id) === d.be; })[0];
      if (x) { BE = x.id; $("bj2").value = x.judul; $("bkat").value = x.kategori || "Berita"; $("bpin").checked = !!x.sematkan; $("bed").innerHTML = safeHtml(x.isi || ""); $("bpub").textContent = "Perbarui"; $("bbatal").hidden = false; $("bjud").textContent = "Ubah berita"; $("bjud").scrollIntoView({block: "start"}); }
      return;
    }
    if (d.bp) {
      var y = (window.BERITA || []).filter(function (n) { return String(n.id) === d.bp; })[0];
      if (y) { await api("/api/admin/berita", {id: y.id, judul: y.judul, isi: y.isi, kategori: y.kategori || "Berita", sematkan: !y.sematkan}); aX("bt"); }
      return;
    }
    if (d.bd) { if (d.sure !== "1") { d.sure = "1"; t.textContent = "Yakin hapus?"; return; } await api("/api/admin/berita/hapus", {id: d.bd}); aX("bt"); return; }
  } catch (x) { err(x.message); }
});
$("v-adm").addEventListener("change", function (e) { if (e.target.id === "bd") aBk($("a-x"), e.target.value); else if (e.target.id === "bf") { BF = e.target.value; aBk($("a-x"), $("bd").value); } });

/* ---------- Layar antrean (buka dengan /?layar=1) ---------- */
(function () {
  var qs = new URLSearchParams(location.search);
  if (!qs.has("layar")) return;
  document.querySelector("main").hidden = true;
  var ft = document.querySelector(".foot"); if (ft) ft.hidden = true;
  var sec = document.createElement("section");
  sec.id = "layar"; sec.className = "board";
  sec.innerHTML = '<div class="bhead"><b>Antrean Pelayanan</b><span><select id="bsel" aria-label="Lokasi"><option value="">Semua lokasi</option></select> <button type="button" class="btn" id="bsuara">Aktifkan suara</button></span></div><div class="bnow" id="bnow" aria-live="assertive">Menunggu panggilan&hellip;</div><div class="bloket" id="bloket"></div><ol class="blist" id="blist"></ol>';
  document.body.appendChild(sec);
  var suara = false, lastKey = "", lok = qs.get("lokasi") || "";
  document.title = "Layar Antrean";
  api("/api/info").then(function (j) {
    $("bsel").innerHTML = '<option value="">Semua lokasi</option>' + j.lokasi.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.nama) + '</option>'; }).join("");
    $("bsel").value = lok;
  }).catch(function () {});
  $("bsel").onchange = function () { lok = this.value; lastKey = ""; muat(); };
  $("bsuara").onclick = function () { suara = !suara; this.textContent = suara ? "Suara aktif" : "Aktifkan suara"; if (suara) ucap("Suara antrean diaktifkan"); };
  function ucap(t) {
    try { if (!window.speechSynthesis) return; var u = new SpeechSynthesisUtterance(t); u.lang = "id-ID"; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (x) {}
  }
  async function muat() {
    try {
      var j = await api("/api/layar" + (lok ? "?lokasi=" + encodeURIComponent(lok) : "")), d = j.daftar;
      if (!d.length) { $("bnow").textContent = "Menunggu panggilan…"; $("bloket").textContent = ""; $("blist").innerHTML = ""; return; }
      var n = d[0], key = n.kode + "|" + n.waktu;
      $("bnow").textContent = n.kode;
      $("bloket").textContent = n.loket;
      $("blist").innerHTML = d.slice(1, 9).map(function (x) { return '<li><b>' + esc(x.kode) + '</b> <span>' + esc(x.loket) + '</span></li>'; }).join("");
      if (lastKey && key !== lastKey && suara) ucap("Nomor antrean " + n.kode.replace(/-/g, " ").split("").join(" ") + ", silakan menuju " + n.loket);
      lastKey = key;
    } catch (x) {}
  }
  muat(); setInterval(muat, 5000);
})();

$("v-adm").addEventListener("keydown", async function (e) {
  if (e.key !== "Enter" || e.target.id !== "bscan") return;
  var kode = e.target.value.trim().toUpperCase(), o = BKA.filter(function (x) { return x.kode.toUpperCase() === kode; })[0];
  e.target.value = "";
  if (!o) { toast("Kode " + kode + " tidak ditemukan pada tanggal ini."); return; }
  if (o.status !== "Terjadwal" && o.status !== "Sudah tiba") { toast(o.kode + " berstatus " + o.status + "."); return; }
  try { await api("/api/admin/booking/status", {id: o.id, status: "Dipanggil"}); toast("Memanggil " + o.kode + " (" + o.nama + ")."); aBk($("a-x"), $("bd").value); } catch (x) { err(x.message); }
});

$("v-adm").addEventListener("mousedown", function (e) {
  var b = e.target.closest("[data-cmd]");
  if (!b) return;
  e.preventDefault();
  var c = b.dataset.cmd;
  if (c === "link") { var u = window.prompt("Alamat tautan (diawali https://)"); if (u) document.execCommand("createLink", false, u); }
  else if (c === "h3" || c === "blockquote" || c === "p") document.execCommand("formatBlock", false, c);
  else document.execCommand(c, false, null);
});
$("v-adm").addEventListener("paste", function (e) {
  if (!e.target.closest || !e.target.closest("#bed")) return;
  e.preventDefault();
  document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
});

/* ---------- Admin: kata cari chatbot ---------- */
var KR = [], KDIRTY = false, KMISS = [], KIMP = null, KF = "", KMAX = 100, KST = null;
var KTPL = "**Syarat:**\n- \n- \n\n**Langkah:**\n1. \n2. \n\n**Biaya:** \n**Jam layanan:** \n**Catatan:** ";
var KSTOP = {yang: 1, dan: 1, di: 1, ke: 1, dari: 1, untuk: 1, saya: 1, aku: 1, mau: 1, ingin: 1, bagaimana: 1, gimana: 1, cara: 1, apa: 1, apakah: 1, bisa: 1, boleh: 1, dong: 1, tidak: 1, nggak: 1, atau: 1, dengan: 1, pada: 1, ada: 1, dimana: 1, tolong: 1, minta: 1, mohon: 1, tanya: 1, info: 1, itu: 1, ini: 1, sudah: 1, belum: 1, kalau: 1, kalo: 1, bikin: 1, buat: 1};
function ktWords(v) { return String(v).split(/[,;\n]/).map(function (w) { return clean(w).toLowerCase().slice(0, 40); }).filter(function (w) { return w.length >= 2; }).slice(0, 10); }
function ktSaran(q) {
  var seen = {}, t = String(q).toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { if (w.length < 3 || KSTOP[w] || seen[w]) return false; seen[w] = 1; return true; }).slice(0, 3);
  return t.length ? t : [String(q).slice(0, 40)];
}
function ktName(k) { var e = entryOf(k); return e ? e[1] : label(k); }
function ktOptsBase() {
  return '<option value="">(tanpa kartu loket, hanya jawaban)</option>' + LOCS.map(function (l) {
    return '<optgroup label="' + esc(l.nm) + '">' + (LD[l.id] || []).map(function (d) { return '<option value="' + l.id + "_" + d[0] + '">' + esc(d[1]) + '</option>'; }).join("") + '</optgroup>';
  }).join("");
}
function ktDirty(v) {
  KDIRTY = v;
  var st = $("kt-st");
  if (st) { st.textContent = v ? "Ada perubahan yang belum disimpan" : "Semua perubahan sudah tersimpan"; st.className = "sys" + (v ? " kt-dirty" : ""); }
}
function ktRead() {
  var o = [];
  [].forEach.call(document.querySelectorAll("#ktl .kt"), function (c) {
    var tv = c.querySelector("[data-kt]").value;
    o.push({k: ktWords(c.querySelector("[data-kw]").value), t: tv ? [tv] : [], j: clean(c.querySelector("[data-kj]").value), _o: c.open, _n: !!c.dataset.n});
  });
  KR = o;
}
function ktCard(r, i) {
  return '<details class="row kt' + (r._n ? " kn" : "") + '"' + (r._o ? " open" : "") + (r._n ? ' data-n="1"' : "") + '><summary></summary><div class="kt-body">' +
    '<label class="kt-l" for="kw' + i + '">Kata kunci <small>(pisahkan dengan koma)</small></label><input class="si" id="kw' + i + '" data-kw maxlength="400" placeholder="mis. skck, surat kelakuan baik" value="' + esc((r.k || []).join(", ")) + '">' +
    '<label class="kt-l" for="kj' + i + '">Jawaban untuk pengunjung <small data-cn></small></label><div class="ktfmt"><button type="button" class="btn" data-kf="b" data-i="' + i + '" title="Tebalkan teks terpilih"><b>B</b></button><button type="button" class="btn" data-kf="ul" data-i="' + i + '">&bull; Poin</button><button type="button" class="btn" data-kf="ol" data-i="' + i + '">1. Langkah</button><button type="button" class="btn" data-kf="tpl" data-i="' + i + '">&#10024; Kerangka jawaban</button></div><textarea class="si" id="kj' + i + '" data-kj rows="6" maxlength="1500" placeholder="Cara mengurus, langkah-langkah, syarat, biaya, jam, dll. Gunakan tombol di atas untuk poin, langkah, dan huruf tebal.">' + esc(r.j || "") + '</textarea>' +
    '<div class="ktprev"><small class="sys">Pratinjau di chatbot</small><div class="bans"><div class="bans-h"><span class="bans-i">i</span>Informasi layanan</div><div class="bans-b" data-pv></div></div></div>' +
    '<label class="kt-l" for="kt' + i + '">Loket tujuan <small>(opsional)</small></label><select class="si" id="kt' + i + '" data-kt></select>' +
    (r.cat ? '<p class="em" style="margin:0">' + esc(r.cat) + ' (aturan tetap diimpor tanpa loket)</p>' : "") +
    '<div class="btns"><button type="button" class="btn" data-ka="up" data-i="' + i + '">&uarr; Naik</button><button type="button" class="btn" data-ka="down" data-i="' + i + '">&darr; Turun</button><button type="button" class="btn" data-ka="dup" data-i="' + i + '">Gandakan</button><button type="button" class="btn" data-ka="del" data-i="' + i + '">Hapus aturan</button></div></div></details>';
}
function ktMissHtml() {
  var h = '<div class="card" style="margin:0 0 12px"><b>Pertanyaan warga yang belum terjawab</b><p class="sys" style="margin:0">Pertanyaan yang tidak bisa dijawab chatbot dicatat tanpa identitas (angka panjang, nomor HP, dan email dibuang). Ubah menjadi aturan agar warga berikutnya langsung mendapat jawaban.</p>';
  if (!KMISS.length) return h + '<div class="sys">Belum ada pertanyaan yang tercatat.</div></div>';
  return h + KMISS.slice(0, 10).map(function (m, i) {
    return '<div class="ktm"><span class="ktq">&ldquo;' + esc(m.q) + '&rdquo;</span><span class="tag">' + m.n + '&times;</span><button type="button" class="btn" data-km="' + i + '">Buat aturan</button><button type="button" class="btn" data-kx="' + i + '">Abaikan</button></div>';
  }).join("") + '<div class="btns" style="margin-top:6px">' + (KMISS.length > 10 ? '<span class="sys">Menampilkan 10 teratas dari ' + KMISS.length + '.</span>' : "") + '<button type="button" class="btn" id="kt-xa">Abaikan semua</button></div></div>';
}
function ktStat(ks) { var x = KST || {}, o = {h: 0, u: 0, n: 0}; (ks || []).forEach(function (k) { o.h += (x.hit || {})[k] || 0; o.u += (x.up || {})[k] || 0; o.n += (x.dn || {})[k] || 0; }); return o; }
function ktHero() {
  var d = (KST && KST.days) || [], th = 0, tm = 0, nk = 0, mx = 1;
  d.forEach(function (x) { th += x.hit; tm += x.miss; mx = Math.max(mx, x.hit + x.miss); });
  KR.forEach(function (r) { nk += (r.k || []).length; });
  var rate = th + tm ? Math.round(th * 100 / (th + tm)) : null;
  return '<div class="kth"><div class="kth-t"><div><div class="kth-k">Pusat kendali</div><h2>Kata cari chatbot</h2><p>Ajari chatbot menjawab pertanyaan warga dengan jawaban lengkap dan loket tujuan. Aturan di sini didahulukan dari aturan bawaan.</p></div><div class="kth-ring" style="--p:' + (rate === null ? 0 : rate) + '" title="Persentase pertanyaan warga yang terjawab (7 hari)"><span><b>' + (rate === null ? "\u2013" : rate + "%") + '</b><small>terjawab</small></span></div></div>' +
    '<div class="kth-g"><div class="kth-s"><b id="kth-n">' + KR.length + '</b><span>aturan</span></div><div class="kth-s"><b id="kth-k">' + nk + '</b><span>kata kunci</span></div><div class="kth-s"><b>' + th + '</b><span>terjawab 7 hari</span></div><div class="kth-s w"><b>' + tm + '</b><span>belum terjawab 7 hari</span></div></div>' +
    (d.length ? '<div class="kth-c" role="img" aria-label="Grafik pemakaian 7 hari">' + d.map(function (x) {
      return '<div class="kth-d" title="' + esc(x.d) + ': ' + x.hit + ' terjawab, ' + x.miss + ' belum terjawab"><div class="kth-b"><i class="r" style="height:' + Math.round(x.miss * 100 / mx) + '%"></i><i class="y" style="height:' + Math.round(x.hit * 100 / mx) + '%"></i></div><small>' + esc(x.d) + '</small></div>';
    }).join("") + '</div><div class="kth-lg"><span><i class="y"></i>Terjawab aturan Anda</span><span><i class="r"></i>Belum terjawab</span></div>' : "") + '</div>';
}
function ktInsight() {
  var rows = KR.map(function (r, i) { var s = ktStat(r.k); return {i: i, k: (r.k || [])[0], h: s.h, u: s.u, n: s.n}; }).filter(function (x) { return x.k; });
  var top = rows.filter(function (x) { return x.h > 0; }).sort(function (a, b) { return b.h - a.h; }).slice(0, 5), mx = top.length ? top[0].h : 1;
  var unused = rows.filter(function (x) { return x.h === 0; }).length, bad = rows.filter(function (x) { return x.n > x.u && x.n >= 2; });
  var h = '<div class="card" style="margin:0 0 12px"><b>Aturan terpopuler</b>';
  if (!top.length) h += '<p class="sys" style="margin:0">Belum ada data pemakaian. Statistik muncul setelah warga memakai chatbot.</p>';
  else h += top.map(function (x) { return '<div class="kti"><span class="kti-n">#' + (x.i + 1) + ' ' + esc(x.k) + '</span><div class="kti-b"><i style="width:' + Math.max(6, Math.round(x.h * 100 / mx)) + '%"></i></div><b>' + x.h + '&times;</b>' + (x.u + x.n ? '<small>\uD83D\uDC4D ' + x.u + ' \uD83D\uDC4E ' + x.n + '</small>' : "") + '</div>'; }).join("");
  if (rows.length) h += '<p class="sys" style="margin:4px 0 0">' + unused + ' dari ' + rows.length + ' aturan belum pernah dipakai.' + (bad.length ? ' <span class="kt-w">&#9888; Perlu diperbaiki: aturan #' + bad.map(function (x) { return x.i + 1; }).slice(0, 5).join(", #") + ' (lebih banyak \uD83D\uDC4E).</span>' : "") + '</p>';
  if (top.length) h += '<div class="btns"><button type="button" class="btn" id="kt-rst">Reset statistik</button></div>';
  return h + '</div>';
}
function ktDraw() {
  var el = $("a-x");
  el.innerHTML = ktHero() +
    '<div class="kt-act"><button type="button" class="kta" id="kt-add"><span class="kta-i">&#10133;</span><b>Tambah aturan</b><small>tulis manual</small></button><label class="kta" for="kt-file"><span class="kta-i">&#128229;</span><b>Impor Excel/CSV</b><small>unggah berkas</small></label><input type="file" id="kt-file" accept=".xlsx,.csv,.tsv,.txt" hidden><button type="button" class="kta" id="kt-pastebtn"><span class="kta-i">&#128203;</span><b>Tempel tabel</b><small>dari Excel/Sheets</small></button><a class="kta" href="/api/app?p=%2Fadmin%2Fkata.xlsx" download><span class="kta-i">&#128228;</span><b>Ekspor Excel</b><small>cadangan & edit</small></a><a class="kta" href="/api/app?p=%2Fadmin%2Fkata-templat.xlsx" download><span class="kta-i">&#128196;</span><b>Unduh templat</b><small>format siap isi</small></a></div>' +
    '<div class="card" id="kt-paste" hidden style="margin:0 0 12px"><p class="sys" style="margin:0">Salin sel dari Excel atau Google Sheets (kolom: Kata kunci, Jawaban, Loket tujuan; baris judul boleh ada), lalu tempel di sini.</p><textarea class="si" id="kt-pt" rows="5" placeholder="Tempel di sini"></textarea><div class="btns"><button type="button" class="send" id="kt-pgo">Baca tabel</button><button type="button" class="btn" id="kt-pclose">Tutup</button></div></div>' +
    '<div id="kt-imp"></div>' + ktInsight() + ktMissHtml() +
    '<div class="kt-filter"><input class="si" id="kt-f" placeholder="Cari aturan (kata kunci atau jawaban)" aria-label="Cari aturan" value="' + esc(KF) + '"><span class="sys" id="kt-cnt"></span></div>' +
    '<div id="ktl">' + (KR.length ? KR.map(ktCard).join("") : '<div class="empty">Belum ada aturan khusus. Tekan "Tambah aturan" atau impor dari Excel.</div>') + '</div><div class="empty" id="kt-fc" hidden>Tidak ada aturan yang cocok dengan pencarian.</div>' +
    '<div class="card" style="margin-top:12px"><b>Coba kata</b><p class="sys" style="margin:0">Menguji daftar yang sedang Anda edit, termasuk yang belum disimpan.</p><input class="si" id="kt-q" maxlength="100" placeholder="Ketik pertanyaan warga untuk menguji" aria-label="Uji pertanyaan"><button type="button" class="btn" id="kt-try">Uji</button><div id="kt-r"></div></div>' +
    '<div class="ktbar"><button type="button" class="send" id="kt-save">Simpan</button><span id="kt-st" class="sys"></span></div>';
  var base = ktOptsBase();
  [].forEach.call(el.querySelectorAll("#ktl .kt"), function (c, i) {
    var s = c.querySelector("[data-kt]"); s.innerHTML = base; s.value = (KR[i].t || [])[0] || "";
  });
  ktSumAll(); ktDirty(KDIRTY); ktImpDraw();
}
function ktSumAll() {
  var cs = document.querySelectorAll("#ktl .kt"), idx = {}, dt = [], nk = 0, q = KF.toLowerCase().trim(), shown = 0;
  [].forEach.call(cs, function (c, i) {
    var ks = ktWords(c.querySelector("[data-kw]").value), j = c.querySelector("[data-kj]").value.trim(), t = c.querySelector("[data-kt]").value;
    dt.push({ks: ks, j: j, t: t});
    ks.forEach(function (w) { (idx[w] = idx[w] || []).push(i); });
  });
  [].forEach.call(cs, function (c, i) {
    var d = dt[i], w = [], dup = {}, chips;
    nk += d.ks.length;
    if (!d.ks.length) w.push("Belum ada kata kunci");
    if (!d.j && !d.t) w.push("Isi jawaban atau pilih loket");
    d.ks.forEach(function (k) { idx[k].forEach(function (o) { if (o !== i) dup[o + 1] = 1; }); });
    var dn = Object.keys(dup); if (dn.length) w.push("Kata kunci sama dengan aturan #" + dn.slice(0, 3).join(", #"));
    chips = d.ks.slice(0, 4).map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join("") + (d.ks.length > 4 ? '<span class="tag">+' + (d.ks.length - 4) + '</span>' : "");
    c.querySelector("summary").innerHTML = '<span class="no">' + (i + 1) + '</span><span class="kt-s"><span class="kt-chips">' + (chips || '<i class="sys">(kosong)</i>') + '</span><span class="kt-m">' + (d.t ? esc(ktName(d.t)) : "Hanya jawaban") + (function () { var st = ktStat(d.ks); return st.h ? " &middot; " + st.h + "\u00d7 dipakai" + (st.u + st.n ? " (\uD83D\uDC4D" + st.u + " \uD83D\uDC4E" + st.n + ")" : "") : ""; })() + (c.dataset.n ? " &middot; <b>Baru</b>" : "") + '</span>' + (w.length ? '<span class="kt-w">&#9888; ' + esc(w.join(" \u00b7 ")) + '</span>' : "") + '</span><span class="sys kt-cv">&#9662;</span>';
    c.querySelector("[data-cn]").textContent = d.j.length + "/1500";
    c.querySelector("[data-pv]").innerHTML = d.j ? (window.fmtJawab ? window.fmtJawab(d.j) : esc(d.j)) : '<p class="sys">(jawaban masih kosong)</p>';
    var hit = !q || (d.ks.join(" ") + " " + d.j).toLowerCase().indexOf(q) >= 0;
    c.hidden = !hit; if (hit) shown++;
  });
  if ($("kth-n")) $("kth-n").textContent = cs.length; if ($("kth-k")) $("kth-k").textContent = nk;
  if ($("kt-cnt")) $("kt-cnt").textContent = cs.length + " aturan \u00b7 " + nk + " kata kunci";
  if ($("kt-fc")) $("kt-fc").hidden = !(cs.length && !shown);
}
function ktB64(buf) { var b = new Uint8Array(buf), s = "", i; for (i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); }
async function ktUpload(nama, b64) {
  var r = await api("/api/admin/kata/impor", {nama: nama, data: b64});
  KIMP = {r: r, nama: nama}; ktImpDraw();
  var e = $("kt-imp"); if (e) e.scrollIntoView({block: "nearest", behavior: "smooth"});
}
function ktImpDraw() {
  var el = $("kt-imp"), x = KIMP; if (!el) return;
  if (!x) { el.innerHTML = ""; return; }
  var r = x.r, n = r.aturan.length;
  el.innerHTML = '<div class="card kt-imp" style="margin:0 0 12px"><b>Pratinjau impor: ' + esc(x.nama) + '</b><p class="sys" style="margin:0">' + n + ' aturan siap diimpor' + (r.total_lewat ? ", " + r.total_lewat + " baris dilewati" : "") + '.</p>' +
    (r.lewat.length ? '<details class="ktskip"><summary>Lihat baris yang dilewati</summary><ul>' + r.lewat.map(function (l) { return '<li>Baris ' + l.baris + ': ' + esc(l.alasan) + '</li>'; }).join("") + '</ul></details>' : "") +
    (n ? '<div>' + r.aturan.slice(0, 5).map(function (a) {
      return '<div class="ktp"><b>' + esc(a.k.join(", ")) + '</b><span>' + esc((a.j || "(tanpa jawaban)").slice(0, 110)) + (a.j.length > 110 ? "\u2026" : "") + '</span><small class="sys">' + (a.t[0] ? "Loket: " + esc(label(a.t[0])) : "Hanya jawaban") + (a.cat ? ' &middot; <span class="kt-w">' + esc(a.cat) + '</span>' : "") + '</small></div>';
    }).join("") + (n > 5 ? '<small class="sys">&hellip; dan ' + (n - 5) + ' aturan lainnya</small>' : "") + '</div>' +
    '<div class="kt-mode"><label><input type="radio" name="kt-mode" value="gabung" checked><span><b>Gabung</b> (disarankan): perbarui aturan yang kata kuncinya sama, tambahkan yang baru</span></label><label><input type="radio" name="kt-mode" value="tambah"><span><b>Tambah</b> semuanya sebagai aturan baru</span></label><label><input type="radio" name="kt-mode" value="ganti"><span><b>Ganti</b> seluruh daftar dengan isi berkas ini</span></label></div>' +
    '<div class="btns"><button type="button" class="send" id="kt-apply">Terapkan ke daftar</button><button type="button" class="btn" id="kt-cancel">Batal</button></div><small class="sys">Belum tersimpan sampai Anda menekan Simpan.</small>'
    : '<p class="em" style="margin:0">Tidak ada baris yang bisa diimpor. Periksa kolom dan isinya, atau pakai templat.</p><div class="btns"><button type="button" class="btn" id="kt-cancel">Tutup</button></div>') + '</div>';
}
function ktApply() {
  var m = (document.querySelector('input[name="kt-mode"]:checked') || {}).value || "gabung", imp = KIMP.r.aturan, add = 0, upd = 0, drop = 0;
  ktRead();
  if (m === "ganti") KR = [];
  imp.forEach(function (a) {
    var hit = -1;
    if (m === "gabung") KR.forEach(function (r, i) { if (hit < 0 && r.k.some(function (w) { return a.k.indexOf(w) >= 0; })) hit = i; });
    if (hit >= 0) {
      var r = KR[hit]; r.k = r.k.concat(a.k.filter(function (w) { return r.k.indexOf(w) < 0; })).slice(0, 10);
      if (a.j) r.j = a.j; if (a.t.length) r.t = a.t; r._o = false; upd++;
    } else if (KR.length < KMAX) { KR.push({k: a.k, t: a.t, j: a.j, cat: a.cat, _n: true}); add++; }
    else drop++;
  });
  KIMP = null; ktDirty(true); ktDraw();
  toast("Impor: " + add + " ditambah, " + upd + " diperbarui" + (drop ? ", " + drop + " tidak muat (maksimal " + KMAX + ")" : "") + ". Tekan Simpan untuk menerapkan.");
}
function ktAdd(k) {
  if (KR.length >= KMAX) { err("Maksimal " + KMAX + " aturan."); return; }
  ktRead(); KR.push({k: k || [], t: [], j: "", _o: true, _n: true}); ktDirty(true); ktDraw();
  var cs = document.querySelectorAll("#ktl .kt"), c = cs[cs.length - 1];
  if (c) { c.scrollIntoView({block: "center", behavior: "smooth"}); c.querySelector("[data-kw]").focus({preventScroll: true}); }
}
async function ktSave() {
  ktRead();
  for (var i = 0; i < KR.length; i++) {
    var bad = !KR[i].k.length ? "belum punya kata kunci" : (!KR[i].j && !KR[i].t[0] ? "belum punya jawaban atau loket tujuan" : "");
    if (bad) {
      err("Aturan #" + (i + 1) + " " + bad + ".");
      var c = document.querySelectorAll("#ktl .kt")[i]; if (c) { c.hidden = false; c.open = true; c.scrollIntoView({block: "center", behavior: "smooth"}); }
      return;
    }
  }
  err("");
  var old = KR, r = await api("/api/admin/kata", {daftar: KR.map(function (x) { return {k: x.k, t: x.t, j: x.j}; })});
  window.KATA = r.daftar; KR = JSON.parse(JSON.stringify(r.daftar));
  KR.forEach(function (x, i) { x._o = !!(old[i] && old[i]._o); });
  var gone = KMISS.filter(function (m) { var h = window.kataHit ? window.kataHit(m.q, KR) : null; return h && (h.k.length || h.j.length); }).map(function (m) { return m.q; });
  if (gone.length) { try { await api("/api/admin/miss/hapus", {qs: gone}); KMISS = KMISS.filter(function (m) { return gone.indexOf(m.q) < 0; }); } catch (x) {} }
  ktDirty(false); ktDraw();
  var bar = document.querySelector(".ktbar"); if (bar) { bar.classList.add("ok"); setTimeout(function () { bar.classList.remove("ok"); }, 1600); }
  toast("Tersimpan (" + r.daftar.length + " aturan)" + (gone.length ? "; " + gone.length + " pertanyaan belum terjawab sudah tertangani" : "") + ". Warga memakainya saat halaman dimuat ulang.");
}
function ktTry() {
  ktRead();
  var q = clean($("kt-q").value).toLowerCase(), el = $("kt-r");
  if (!q) { el.innerHTML = ""; return; }
  var h = window.kataHit ? window.kataHit(q, KR) : {i: [], w: []};
  if (!h.i.length) { el.innerHTML = '<p class="sys">Tidak ada aturan khusus yang cocok. Chatbot akan memakai aturan bawaan dan pencarian biasa.</p><button type="button" class="btn" id="kt-mk2">Buat aturan dari kalimat ini</button>'; return; }
  el.innerHTML = h.i.map(function (ix, n) {
    var r = KR[ix];
    return '<div class="bc2"><b>Aturan #' + (ix + 1) + '</b> <span class="tag">cocok: ' + esc(h.w[n]) + '</span>' + (r.j ? '<p class="ktans">' + esc(r.j) + '</p>' : "") + (r.t[0] ? '<small>Loket: ' + esc(label(r.t[0])) + '</small>' : "") + '</div>';
  }).join("");
}
async function aKt() {
  var j = await api("/api/info");
  window.KATA = j.kata || [];
  KR = JSON.parse(JSON.stringify(window.KATA)); KDIRTY = false; KIMP = null;
  try { KMISS = (await api("/api/admin/miss")).daftar || []; } catch (x) { KMISS = []; }
  try { KST = await api("/api/admin/kstat"); } catch (x) { KST = null; }
  ktDraw();
}
$("v-adm").addEventListener("click", async function (e) {
  if (S !== "adm" || AT !== "kt" || !$("ktl")) return;
  var t = e.target, a = t.closest("[data-ka]"), m = t.closest("[data-km]"), x = t.closest("[data-kx]"), id = (t.closest("[id]") || {}).id;
  try {
    if (a) {
      ktRead(); var i = +a.dataset.i, k = a.dataset.ka;
      if (k === "up" && i > 0) KR.splice(i - 1, 0, KR.splice(i, 1)[0]);
      else if (k === "down" && i < KR.length - 1) KR.splice(i + 1, 0, KR.splice(i, 1)[0]);
      else if (k === "dup") { if (KR.length >= KMAX) { err("Maksimal " + KMAX + " aturan."); return; } var cp = JSON.parse(JSON.stringify(KR[i])); cp._n = true; cp._o = true; KR.splice(i + 1, 0, cp); }
      else if (k === "del") { var rm = KR.splice(i, 1)[0]; toast("Aturan #" + (i + 1) + " dihapus.", "Urungkan", function () { ktRead(); KR.splice(i, 0, rm); ktDirty(true); ktDraw(); }); }
      ktDirty(true); ktDraw();
    }
    else if (t.closest("[data-kf]")) {
      var fb = t.closest("[data-kf]"), cd = fb.closest(".kt"), ta = cd.querySelector("[data-kj]"), v = ta.value, a0 = ta.selectionStart, a1 = ta.selectionEnd, sel = v.slice(a0, a1), k2 = fb.dataset.kf, ins;
      if (k2 === "tpl") { ta.value = v.trim() ? v.replace(/\s+$/, "") + "\n\n" + KTPL : KTPL; a0 = a1 = ta.value.length; }
      else if (k2 === "b") { ins = "**" + (sel || "teks tebal") + "**"; ta.value = v.slice(0, a0) + ins + v.slice(a1); a0 = a0 + 2; a1 = a0 + (sel || "teks tebal").length; }
      else { var lines = (sel || "").split("\n"); ins = (sel ? lines : [""]).map(function (l, n) { return (k2 === "ol" ? (n + 1) + ". " : "- ") + l.replace(/^\s*(?:[-\u2022*]|\d+[.)])\s+/, ""); }).join("\n"); var pre = a0 > 0 && v[a0 - 1] !== "\n" ? "\n" : ""; ta.value = v.slice(0, a0) + pre + ins + v.slice(a1); a0 = a1 = a0 + pre.length + ins.length; }
      ta.focus(); try { ta.setSelectionRange(a0, a1); } catch (y) {}
      ta.dispatchEvent(new Event("input", {bubbles: true}));
    }
    else if (id === "kt-rst") { if (confirm("Hapus semua statistik pemakaian chatbot?")) { await api("/api/admin/kstat/reset", {}); KST = null; ktRead(); ktDraw(); try { KST = await api("/api/admin/kstat"); ktDraw(); } catch (y) {} } }
    else if (m) { var q = KMISS[+m.dataset.km]; if (q) ktAdd(ktSaran(q.q)); }
    else if (x) { var z = KMISS[+x.dataset.kx]; if (z) { await api("/api/admin/miss/hapus", {qs: [z.q]}); ktRead(); KMISS.splice(+x.dataset.kx, 1); ktDraw(); } }
    else if (id === "kt-xa") { if (confirm("Abaikan semua pertanyaan yang tercatat?")) { await api("/api/admin/miss/hapus", {semua: true}); ktRead(); KMISS = []; ktDraw(); } }
    else if (id === "kt-add") ktAdd();
    else if (id === "kt-save") await ktSave();
    else if (id === "kt-try") ktTry();
    else if (id === "kt-mk2") { var qq = clean($("kt-q").value).toLowerCase(); ktAdd(ktSaran(qq)); }
    else if (id === "kt-pastebtn") { var pp = $("kt-paste"); pp.hidden = !pp.hidden; if (!pp.hidden) $("kt-pt").focus(); }
    else if (id === "kt-pclose") $("kt-paste").hidden = true;
    else if (id === "kt-pgo") {
      var tx = $("kt-pt").value; if (!clean(tx)) { err("Tempel dulu isi tabelnya."); return; }
      err(""); await ktUpload("tempelan", btoa(unescape(encodeURIComponent(tx)))); $("kt-paste").hidden = true;
    }
    else if (id === "kt-apply") ktApply();
    else if (id === "kt-cancel") { KIMP = null; ktImpDraw(); }
  } catch (y) { err(y.message); }
});
$("v-adm").addEventListener("input", function (e) {
  if (S !== "adm" || AT !== "kt") return;
  var t = e.target;
  if (t.id === "kt-f") { KF = t.value; ktSumAll(); }
  else if (t.closest && t.closest("#ktl")) { ktDirty(true); ktSumAll(); }
});
$("v-adm").addEventListener("change", async function (e) {
  if (S !== "adm" || AT !== "kt") return;
  var t = e.target;
  if (t.id === "kt-file") {
    var f = t.files && t.files[0]; t.value = "";
    if (!f) return;
    if (f.size > 600000) { err("Berkas lebih dari 600 KB."); return; }
    try { err(""); toast("Membaca berkas\u2026"); await ktUpload(f.name, ktB64(await f.arrayBuffer())); } catch (y) { err(y.message); }
  } else if (t.closest && t.closest("#ktl")) { ktDirty(true); ktSumAll(); }
});
$("v-adm").addEventListener("keydown", function (e) {
  if (S === "adm" && AT === "kt" && e.target.id === "kt-q" && e.key === "Enter") { e.preventDefault(); ktTry(); }
});
window.addEventListener("beforeunload", function (e) { if (KDIRTY && S === "adm") { e.preventDefault(); e.returnValue = ""; } });
