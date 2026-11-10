"use strict";
/* Versi 36: Halaman Booking Kunjungan yang rapi untuk pemohon dengan banyak kunjungan.
   - "Booking saya" jadi dua tab: Aktif (hari ini dan mendatang, terdekat dulu) dan Riwayat.
   - Tiap kunjungan berupa baris ringkas; ketuk untuk membuka tiket lengkap (barcode, check-in, batal, kalender, cetak) dan persyaratan loketnya.
   - Kunjungan terdekat otomatis terbuka. Pencarian, kelompok per tanggal (Hari ini, Besok, ...), dan "Tampilkan lebih banyak" (10 per halaman).
   - Formulir booking baru dilipat bila sudah punya booking; persyaratan loket tampil di bawah pilihan loket dan di rencana kunjungan. */
(function () {
var $ = function (i) { return document.getElementById(i); };
var AKT = ["Terjadwal", "Sudah tiba", "Dipanggil"], BX = {tab: "aktif", q: "", n: 10, open: {}, awal: true}, SAFE = 8;
function hari() { return iso(wibDate(0)); }
function tgl(t) { return new Date(t + "T00:00:00"); }
function tglLabel(t) {
  var h = hari(), d = Math.round((tgl(t) - tgl(h)) / 864e5);
  if (d === 0) return "Hari ini"; if (d === 1) return "Besok"; if (d === -1) return "Kemarin";
  return tgl(t).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: d < -200 || d > 200 ? "numeric" : undefined});
}
function urut(a, b) { return a.tanggal !== b.tanggal ? (a.tanggal < b.tanggal ? -1 : 1) : a.jam !== b.jam ? (a.jam < b.jam ? -1 : 1) : (a.kode < b.kode ? -1 : 1); }
function kelompok() {
  var h = hari(), L = (window.BKL || []).slice();
  var akt = L.filter(function (o) { return AKT.indexOf(o.status) > -1 && o.tanggal >= h; }).sort(urut);
  var rw = L.filter(function (o) { return akt.indexOf(o) < 0; }).sort(function (a, b) { return -urut(a, b); });
  return {akt: akt, rw: rw, ini: akt.filter(function (o) { return o.tanggal === h; }), depan: akt.filter(function (o) { return o.tanggal > h; })};
}
function cocok(o, q) {
  if (!q) return true;
  var tx = (o.kode + " " + label(o.kunci) + " " + (o.keperluan || "") + " " + o.status + " " + o.tanggal + " " + o.jam + " " + tglLabel(o.tanggal)).toLowerCase();
  return q.toLowerCase().split(/\s+/).every(function (w) { return tx.indexOf(w) > -1; });
}
function baris(o, buka) {
  var d = tgl(o.tanggal), h = hari();
  var syn = window.SY && SY.ada(o.kunci) ? SY.hitung(o.kunci) : null;
  var isi = "";
  if (buka) {
    isi = '<div class="bkr-b">' + tiketHtml(o, h) + (window.SY && AKT.indexOf(o.status) > -1 ? '<details class="bkr-sy"' + (o.tanggal === h ? " open" : "") + '><summary>Persyaratan yang harus dibawa' + (syn ? ' (' + syn.n + '/' + syn.m + ' siap)' : '') + '</summary>' + SY.html(o.kunci) + '</details>' : '') + '</div>';
  }
  return '<div class="bkr st-' + o.status.toLowerCase().replace(/\s+/g, "-") + (buka ? " on" : "") + '"><button type="button" class="bkr-h" data-bx="' + esc(o.id) + '" aria-expanded="' + !!buka + '">' +
    '<span class="bkr-d"><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString("id-ID", {month: "short"}) + '</small></span>' +
    '<span class="bkr-m"><b>' + esc(o.jam) + ' &middot; ' + esc(namaLoket(o)) + '</b><small>' + esc(lokNama(o.lokasi)) + ' &middot; ' + esc(o.kode) + '</small></span>' + bkBdg(o.status) + '<span class="bkr-c" aria-hidden="true">▾</span></button>' + isi + '</div>';
}
function daftarHtml() {
  var G = kelompok(), src = BX.tab === "aktif" ? G.akt : G.rw, f = src.filter(function (o) { return cocok(o, BX.q); }), tampil = f.slice(0, BX.n), g = {}, urutT = [];
  if (BX.awal && BX.tab === "aktif" && G.akt.length) { BX.open[G.akt[0].id] = true; }
  BX.awal = false;
  if (!f.length) return '<div class="empty">' + (BX.q ? 'Tidak ada kunjungan yang cocok dengan "' + esc(BX.q) + '".' : BX.tab === "aktif" ? "Tidak ada kunjungan aktif. Buat booking baru di atas." : "Belum ada riwayat kunjungan.") + '</div>';
  tampil.forEach(function (o) { if (!g[o.tanggal]) { g[o.tanggal] = []; urutT.push(o.tanggal); } g[o.tanggal].push(o); });
  return urutT.map(function (t) {
    return '<h3 class="dh bkx-dh' + (t === hari() ? " ini" : "") + '">' + esc(tglLabel(t)) + ' <small>' + g[t].length + ' kunjungan</small></h3>' + g[t].map(function (o) { return baris(o, !!BX.open[o.id]); }).join("");
  }).join("") + (f.length > tampil.length ? '<button type="button" class="btn bkx-more" data-bxm="1">Tampilkan ' + Math.min(10, f.length - tampil.length) + ' lagi (sisa ' + (f.length - tampil.length) + ')</button>' : '') +
    (f.length > SAFE ? '<small class="sys bkx-tot">Menampilkan ' + tampil.length + ' dari ' + f.length + ' kunjungan.</small>' : '');
}
function ringkas() {
  var G = kelompok();
  return '<div class="bkx-sum"><div class="' + (G.ini.length ? "hot" : "") + '"><b>' + G.ini.length + '</b><small>Hari ini</small></div><div><b>' + G.depan.length + '</b><small>Mendatang</small></div><div><b>' + G.rw.length + '</b><small>Riwayat</small></div></div>' +
    '<div class="bkx-tabs" role="tablist"><button type="button" role="tab" data-bxt="aktif" aria-selected="' + (BX.tab === "aktif") + '">Aktif (' + G.akt.length + ')</button><button type="button" role="tab" data-bxt="riwayat" aria-selected="' + (BX.tab === "riwayat") + '">Riwayat (' + G.rw.length + ')</button></div>';
}
function gambar(penuh) {
  var el = $("bsaya"); if (!el) return;
  if (penuh || !$("bkx-l")) {
    el.innerHTML = '<div id="bkx-s"></div><input class="si bkx-q" id="bkx-q" type="search" placeholder="Cari kode, loket, tanggal, atau keperluan" aria-label="Cari kunjungan" value="' + esc(BX.q) + '"><div id="bkx-l"></div>';
    if (!el.dataset.bxon) {
      el.dataset.bxon = "1";
      el.addEventListener("click", function (e) {
        var t = e.target.closest("[data-bxt],[data-bx],[data-bxm]"); if (!t) return;
        if (t.dataset.bxt) { BX.tab = t.dataset.bxt; BX.n = 10; gambar(); }
        else if (t.dataset.bx) { BX.open[t.dataset.bx] = !BX.open[t.dataset.bx]; gambar(); }
        else if (t.dataset.bxm) { BX.n += 10; gambar(); }
      });
      el.addEventListener("input", function (e) { if (e.target.id === "bkx-q") { BX.q = e.target.value.trim(); BX.n = 10; $("bkx-l").innerHTML = daftarHtml(); } });
    }
  }
  $("bkx-s").innerHTML = ringkas();
  $("bkx-q").hidden = !(window.BKL && BKL.length > SAFE) && !BX.q;
  $("bkx-l").innerHTML = daftarHtml();
}
window.bSaya = async function () {
  var el = $("bsaya"); if (!el) return;
  var j = await api("/api/booking"); window.BKL = j.daftar;
  gambar(!$("bkx-l"));
};

/* Formulir booking baru dilipat; persyaratan loket di bawah pilihan loket dan di rencana */
var _pBk = window.pBk;
window.pBk = async function (el) {
  BX.tab = "aktif"; BX.q = ""; BX.n = 10; BX.open = {}; BX.awal = true;
  await _pBk(el);
  var card = el.querySelector(".card"), brenc = $("brenc"), sec = el.querySelectorAll("h2.sec");
  if (card && brenc && sec[1] && !$("bkx-new")) {
    var d = document.createElement("details"); d.id = "bkx-new"; d.className = "bkx-new";
    d.innerHTML = '<summary><span aria-hidden="true">＋</span> Buat booking baru</summary>';
    var w = document.createElement("div"); w.className = "bkx-form"; w.appendChild(card); w.appendChild(brenc); d.appendChild(w);
    sec[0].parentNode.insertBefore(d, sec[1]);
    d.open = !kelompok().akt.length;
  }
  var s3 = $("bk3");
  if (s3 && !$("bsy")) { var p = document.createElement("details"); p.id = "bsy"; p.className = "bkx-sy"; s3.insertAdjacentElement("afterend", p); }
  panelSyarat();
};
function panelSyarat() {
  var p = $("bsy"), s3 = $("bk3"); if (!p || !s3 || !window.SY) return;
  var k = s3.value; if (!k) { p.hidden = true; return; }
  p.hidden = false; var n = SY.ada(k) ? SY.hitung(k) : null;
  p.innerHTML = '<summary>Persyaratan loket ini' + (n ? ' (' + n.m + ' item)' : ' (belum diisi)') + '</summary>' + SY.html(k);
}
document.addEventListener("change", function (e) { if (e.target.id === "bk3") panelSyarat(); else if (e.target.id === "bl") setTimeout(panelSyarat, 0); });
var _rc = window.rencana;
window.rencana = function () {
  if (_rc) _rc.apply(this, arguments);
  var el = $("brenc"), ta = $("bk2"); if (!el || !ta || !window.SY || !window.CART || !CART.length) return;
  var h = CART.slice().sort(function (a, b) { return a.jam < b.jam ? -1 : 1; }).map(function (c) {
    var n = SY.ada(c.kunci) ? SY.hitung(c.kunci) : null;
    return '<details class="bkx-sy"><summary>Bawa untuk ' + esc(label(c.kunci).split(" - ").slice(1).join(" - ") || label(c.kunci)) + (n ? ' (' + n.m + ' item)' : ' (belum diisi)') + '</summary>' + SY.html(c.kunci) + '</details>';
  }).join("");
  ta.insertAdjacentHTML("beforebegin", '<div class="bkx-bawa"><b>Yang perlu dibawa</b>' + h + '</div>');
};
})();
