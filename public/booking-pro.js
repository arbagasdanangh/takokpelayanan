"use strict";
/* Versi 52 (booking pro): penyempurnaan Booking Kunjungan untuk pengunjung. Dimuat setelah fitur.js dan booking-rapi.js; server tidak diubah.
   PERBAIKAN FUNGSI
   - Jam yang sudah lewat (aturan server: harus lebih dari 30 menit dari sekarang) kini dinonaktifkan sejak awal, bukan baru ditolak setelah dikirim.
   - Bentrok dengan booking sendiri (jam yang sama, atau loket yang sama pada tanggal itu) terdeteksi sebelum kirim, lengkap kodenya.
   - Ganti tanggal saat rencana berisi tidak lagi mengosongkan diam-diam: ada konfirmasi. Pembatalan booking juga meminta konfirmasi.
   - Tombol "Saya sudah tiba" dinonaktifkan sampai check-in dibuka (60 menit sebelum jam booking) dan menampilkan jam bukanya.
   - Balapan permintaan (ganti tanggal cepat-cepat) tidak lagi menimpa tampilan dengan data lama; ada status memuat dan tombol Coba lagi.
   TAMPILAN BARU
   - Strip tanggal bergulir dengan titik ketersediaan (sepi, sedang, ramai, penuh) per tanggal, pencarian layanan lintas loket, langkah 1-2-3,
     meter Booking aktif x/6, slot jam dengan batang sisa kuota dan tombol Pilih jam terbaik, tanggal rencana yang mudah dibaca,
     keperluan terisi otomatis dari tujuan, serta kartu keberhasilan (kalender, lihat tiket). */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var AKT = ["Terjadwal", "Sudah tiba", "Dipanggil"], TTL = 40000, CACHE = {}, TOK = 0, PRE = "", LEAD = 30;
function nowW() { var n = window.wibDate(0); return {t: window.iso(n), m: n.getHours() * 60 + n.getMinutes()}; }
function mn(j) { var p = String(j).split(":"); return +p[0] * 60 + +p[1]; }
function lewat(t, j) { var n = nowW(); return t === n.t && mn(j) <= n.m + LEAD; }
function aktif() { var h = nowW().t; return (window.BKL || []).filter(function (o) { return AKT.indexOf(o.status) > -1 && o.tanggal >= h; }); }
function bentrok(k, t, j) {
  var a = aktif(), x = a.filter(function (o) { return o.tanggal === t && o.kunci === k; })[0]; if (x) return {jenis: "loket", o: x};
  x = a.filter(function (o) { return o.tanggal === t && o.jam === j; })[0]; return x ? {jenis: "jam", o: x} : null;
}
function ambil(k, t) {
  var key = k + "|" + t, c = CACHE[key]; if (c && Date.now() - c.at < TTL) return Promise.resolve(c.j);
  return api("/api/slot?kunci=" + encodeURIComponent(k) + "&tanggal=" + encodeURIComponent(t)).then(function (j) { CACHE[key] = {at: Date.now(), j: j}; return j; });
}
function tglPendek(t) { var d = new Date(t + "T00:00:00"); return {w: d.toLocaleDateString("id-ID", {weekday: "short"}), n: d.getDate(), b: d.toLocaleDateString("id-ID", {month: "short"}), p: d.toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric"})}; }
function layak(j, k, t) { return j.slot.filter(function (s) { return s.sisa > 0 && !lewat(t, s.jam) && !bentrok(k, t, s.jam); }); }

/* ---------- Slot jam ---------- */
async function slotsBaru() {
  var box = $("bj"); if (!box || !$("bk3") || !$("bt2")) return;
  var k = $("bk3").value, t = $("bt2").value, my = ++TOK, rek = $("brek");
  if (!k) { box.innerHTML = ""; return; }
  box.innerHTML = '<div class="bp-sk" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>'; box.setAttribute("aria-busy", "true");
  try {
    var j = await ambil(k, t); if (my !== TOK) return; box.removeAttribute("aria-busy");
    var bk = aktif().filter(function (o) { return o.tanggal === t && o.kunci === k; })[0], ok = layak(j, k, t), best = ok.slice().sort(function (a, b) { return b.sisa - a.sisa || (a.jam < b.jam ? -1 : 1); })[0];
    if (window.BJ && !ok.some(function (s) { return s.jam === window.BJ; })) window.BJ = "";
    box.innerHTML = j.slot.map(function (s) {
      var r = s.sisa / j.kuota, st = "", tx = "Sisa " + s.sisa + " dari " + j.kuota, dis = false, cl = "";
      if (lewat(t, s.jam)) { st = "lewat"; tx = "Sudah lewat"; dis = true; } else if (!s.sisa) { st = "penuh"; tx = "Penuh"; dis = true; }
      else if (bk) { st = "bentrok"; tx = "Sudah ada booking"; dis = true; } else if (bentrok(k, t, s.jam)) { st = "bentrok"; tx = "Jam dipakai booking lain"; dis = true; }
      else cl = r >= .7 ? " sepi" : r <= .3 ? " ramai" : "";
      return '<button type="button" class="chip bp-slot ' + st + cl + (best && best.jam === s.jam && !dis ? " terbaik" : "") + '" data-j="' + s.jam + '" aria-pressed="' + (window.BJ === s.jam) + '"' + (dis ? " disabled" : "") + '><b>' + s.jam + '</b><small>' + tx + '</small><i style="--w:' + (dis ? 0 : Math.round(r * 100)) + '%" aria-hidden="true"></i></button>';
    }).join("");
    var msg;
    if (bk) msg = '<span class="bp-w">Anda sudah punya booking di loket ini pada ' + E(tglPendek(t).p) + ' (kode ' + E(bk.kode) + ', jam ' + E(bk.jam) + '). Pilih tanggal lain.</span>';
    else if (best) msg = 'Jam paling lengang: <b>' + best.jam + '</b> (sisa ' + best.sisa + ' dari ' + j.kuota + '). <button type="button" class="chip bp-best" data-bp="best:' + best.jam + '">Pilih jam ini</button>';
    else msg = '<span class="bp-w">' + (j.slot.some(function (s) { return !lewat(t, s.jam); }) ? "Semua jam pada tanggal ini sudah penuh." : "Tidak ada jam yang tersisa hari ini. Pilih tanggal berikutnya.") + '</span>';
    if (rek) rek.innerHTML = msg; langkah(); perbaruiTitik(k);
  } catch (x) { if (my !== TOK) return; box.removeAttribute("aria-busy"); box.innerHTML = '<div class="bp-err">' + E(x.message || "Gagal memuat jam.") + ' <button type="button" class="chip" data-bp="retry">Coba lagi</button></div>'; }
}

/* ---------- Strip tanggal + titik ketersediaan ---------- */
function stripTanggal() {
  var sel = $("bt2"); if (!sel) return; var st = $("bp-days"), h = nowW().t;
  if (!st) { st = D.createElement("div"); st.id = "bp-days"; st.className = "bp-days"; st.setAttribute("role", "radiogroup"); st.setAttribute("aria-label", "Pilih tanggal"); sel.parentNode.insertBefore(st, sel); sel.classList.add("bp-hide"); }
  var o = [].map.call(sel.options, function (x) { return x.value; });
  st.innerHTML = o.map(function (t) { var d = tglPendek(t), b = Math.round((new Date(t + "T00:00:00") - new Date(h + "T00:00:00")) / 864e5);
    return '<button type="button" class="bp-d" role="radio" aria-checked="' + (sel.value === t) + '" data-bpd="' + t + '" aria-label="' + E(d.p) + '"><small>' + (b === 0 ? "Hari ini" : b === 1 ? "Besok" : d.w) + '</small><b>' + d.n + '</b><small>' + d.b + '</small><i class="bp-dot" aria-hidden="true"></i></button>'; }).join("");
  var a = st.querySelector('[aria-checked="true"]'); if (a && a.scrollIntoView) { try { st.scrollTo({left: a.offsetLeft - 20}); } catch (e) {} }
}
function titik(k, t) {
  var c = CACHE[k + "|" + t]; if (!c) return ""; var ok = layak(c.j, k, t); if (!ok.length) return "pen"; var r = Math.max.apply(null, ok.map(function (s) { return s.sisa / c.j.kuota; })); return r >= .7 ? "sep" : r <= .3 ? "ram" : "sed";
}
var TXT = {pen: "penuh atau tidak ada jam tersisa", sep: "masih lengang", sed: "kuota sedang", ram: "hampir penuh"};
function perbaruiTitik(k) {
  [].forEach.call(D.querySelectorAll("#bp-days .bp-d"), function (b) { var s = titik(k, b.dataset.bpd), dot = b.querySelector(".bp-dot"); if (dot) { dot.className = "bp-dot " + s; } b.title = s ? TXT[s] : ""; });
}
async function prefetch(k) {
  if (!k || PRE === k) return; PRE = k; var sel = $("bt2"); if (!sel) return; var o = [].map.call(sel.options, function (x) { return x.value; }), i = 0;
  async function w() { while (i < o.length) { var t = o[i++]; if (PRE !== k || window.PN !== "bk") return; try { await ambil(k, t); } catch (e) {} perbaruiTitik(k); } }
  await Promise.all([w(), w(), w()]);
}

/* ---------- Langkah dan meter ---------- */
function langkah() {
  var top = $("bp-top"); if (!top) return; var n = aktif().length, c = (window.CART || []).length, a = !!($("bk3") && $("bk3").value), b = !!window.BJ || c > 0;
  top.innerHTML = '<ol class="bp-st"><li class="' + (a ? "ok" : "now") + '"><i>' + (a ? "&#10003;" : 1) + '</i>Pilih layanan</li><li class="' + (b ? "ok" : a ? "now" : "") + '"><i>' + (b ? "&#10003;" : 2) + '</i>Tanggal dan jam</li><li class="' + (c ? "now" : "") + '"><i>3</i>Konfirmasi</li></ol>' +
    '<div class="bp-mt" title="Maksimal 6 booking aktif"><span>Booking aktif</span><div role="progressbar" aria-valuemin="0" aria-valuemax="6" aria-valuenow="' + n + '"><i style="width:' + Math.round(n / 6 * 100) + '%" class="' + (n >= 5 ? "hi" : "") + '"></i></div><b>' + n + '/6</b></div>';
}

/* ---------- Pencarian layanan lintas loket ---------- */
function cariBox() {
  if ($("bp-cari") || !$("bk3")) return; var w = D.createElement("div"); w.className = "bp-cari";
  w.innerHTML = '<input class="si" id="bp-cari" type="search" autocomplete="off" placeholder="Cari layanan, mis. BPJS, SKCK, NIB" aria-label="Cari layanan untuk dibooking"><div id="bp-hs" aria-live="polite"></div>';
  var bl = $("bl"); bl.parentNode.insertBefore(w, bl);
  $("bp-cari").addEventListener("input", function () {
    var q = this.value.trim(), el = $("bp-hs"); if (!q || !window.Rencana) { el.innerHTML = ""; return; }
    var r = Rencana.cari(q, 8).filter(function (x) { var e = window.entryOf ? entryOf(x.d.k) : null; return e && e[6] !== false; }).slice(0, 5);
    el.innerHTML = r.length ? r.map(function (x) { return '<button type="button" class="bp-h" data-bpk="' + E(x.d.k) + '"><b>' + E(x.d.nm) + '</b><small>' + E(x.d.lokasi) + (x.d.zona ? " &middot; " + E(x.d.zona) : "") + '</small></button>'; }).join("") : '<small class="sys">Tidak ada loket yang cocok yang menerima booking.</small>';
  });
}
function pilihLoket(k) {
  var lok = String(k).split("_")[0]; if (!$("bl") || !$("bl").querySelector('option[value="' + lok + '"]')) return; $("bl").value = lok; $("bk3").innerHTML = window.loketOpts($("bl").value); $("bk3").value = k; window.BJ = ""; PRE = "";
  $("bp-cari").value = ""; $("bp-hs").innerHTML = ""; window.slots(); prefetch(k);
}

/* ---------- Rencana (keranjang) ---------- */
var busyC = false;
function nmLoket(k) { return String(window.label ? label(k) : k).split(" - ").slice(1).join(" - ") || String(k); }
function perbaikiCart() {
  var el = $("brenc"); if (!el || busyC || !(window.CART || []).length) return; busyC = true;
  try {
    var b = el.querySelector("b"); if (b && /^Rencana kunjungan\s+\d{4}-/.test(b.textContent)) { b.textContent = "Rencana kunjungan \u00b7 " + tglPendek(window.CART_TGL).p; b.className = "bp-rt"; }
    var ta = $("bk2"); if (ta && !ta.value.trim() && !window.KEP) { var t = "Mengurus " + window.CART.map(function (c) { return nmLoket(c.kunci); }).join(", "); ta.value = t.slice(0, 200); }
  } finally { busyC = false; }
}
function pasangObserver() {
  var el = $("brenc"); if (!el || el.dataset.bpo) return; el.dataset.bpo = "1"; new MutationObserver(function () { if (!busyC) { perbaikiCart(); langkah(); } }).observe(el, {childList: true});
}

/* ---------- Konfirmasi ---------- */
var cf = null;
function tanya(judul, isi, oke, fn) {
  if (cf) cf.remove(); cf = D.createElement("div"); cf.className = "pn-ov"; cf.setAttribute("role", "alertdialog"); cf.setAttribute("aria-modal", "true"); cf.setAttribute("aria-label", judul);
  cf.innerHTML = '<div class="pn-box bp-cf"><b>' + E(judul) + '</b><p>' + isi + '</p><div class="btns" style="justify-content:flex-end"><button type="button" class="btn" data-cf="n">Tidak</button><button type="button" class="send" data-cf="y">' + E(oke) + '</button></div></div>';
  D.body.appendChild(cf); cf.querySelector('[data-cf="n"]').focus();
  cf.onclick = function (e) { var b = e.target.closest("[data-cf]"); if (!b && e.target !== cf) return; var y = b && b.dataset.cf === "y"; cf.remove(); cf = null; if (y) fn(); };
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && cf) { cf.remove(); cf = null; } });
var OKB = false;
/* Fase capture: harus berjalan sebelum pendengar asli di #v-pn, kalau tidak pembatalan sudah terkirim sebelum konfirmasi. */
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-bc]"); if (b && !OKB) {
    e.preventDefault(); e.stopImmediatePropagation(); var o = (window.BKL || []).filter(function (x) { return String(x.id) === b.dataset.bc; })[0];
    tanya("Batalkan booking ini?", o ? "<b>" + E(o.kode) + "</b><br>" + E(label(o.kunci)) + "<br>" + E(tglPendek(o.tanggal).p) + ", " + E(o.jam) + " WIB<br><small>Slot akan dibuka kembali untuk pengunjung lain.</small>" : "Slot akan dibuka kembali untuk pengunjung lain.", "Ya, batalkan", function () { var nb = D.querySelector('[data-bc="' + b.dataset.bc + '"]') || b; OKB = true; nb.click(); OKB = false; }); return;
  }
}, true);
D.addEventListener("click", function (e) {
  var d = e.target.closest && e.target.closest("[data-bpd]"); if (d) {
    var sel = $("bt2"), t = d.dataset.bpd; if (!sel || sel.value === t) return;
    var go = function () { sel.value = t; sel.dispatchEvent(new Event("change", {bubbles: true})); stripTanggal(); };
    if ((window.CART || []).length && window.CART_TGL !== t) tanya("Ganti tanggal?", "Semua tujuan dalam satu rencana harus di tanggal yang sama. Rencana saat ini (" + window.CART.length + " tujuan) akan dikosongkan.", "Ya, ganti tanggal", go); else go(); return;
  }
  var h = e.target.closest && e.target.closest("[data-bpk]"); if (h) { pilihLoket(h.dataset.bpk); return; }
  var x = e.target.closest && e.target.closest("[data-bp]"); if (!x) return; var a = x.dataset.bp;
  if (a === "retry") { CACHE = {}; window.slots(); } else if (a.indexOf("best:") === 0) { window.BJ = a.slice(5); window.slots(); }
  else if (a === "tutup") { var ok = $("bp-ok"); if (ok) ok.remove(); }
  else if (a === "tiket") { var s = $("bsaya"); if (s && s.scrollIntoView) s.scrollIntoView({behavior: "smooth", block: "start"}); }
  else if (a.indexOf("ics:") === 0) { var o2 = (window.__bpSukses || []).filter(function (z) { return String(z.id) === a.slice(4); })[0]; if (o2 && window.unduhIcs) unduhIcs(o2); }
});
D.addEventListener("change", function (e) { if (e.target && e.target.id === "bt2") { stripTanggal(); } });
D.addEventListener("change", function (e) { if (e.target && (e.target.id === "bk3" || e.target.id === "bl")) { PRE = ""; setTimeout(function () { var k = $("bk3") && $("bk3").value; if (k) prefetch(k); }, 50); } });

/* ---------- Check-in, keberhasilan ---------- */
function perbaikiTiba() {
  [].forEach.call(D.querySelectorAll("[data-tiba]"), function (b) {
    var o = (window.BKL || []).filter(function (x) { return String(x.id) === b.dataset.tiba; })[0]; if (!o) return; var n = nowW(), buka = mn(o.jam) - 60;
    if (o.tanggal === n.t && n.m < buka) { var tx = "Check-in mulai " + String(Math.floor(buka / 60)).padStart(2, "0") + "." + String(buka % 60).padStart(2, "0"); if (b.textContent !== tx) { b.textContent = tx; } b.disabled = true; b.title = "Check-in dibuka 60 menit sebelum jam booking"; b.classList.add("bp-wait"); }
    else if (b.classList.contains("bp-wait")) { b.textContent = "Saya sudah tiba"; b.disabled = false; b.classList.remove("bp-wait"); b.title = ""; }
  });
}
function sukses(arr) {
  window.__bpSukses = arr; var v = $("bt2") ? $("bt2").closest(".card") : null, host = v ? v.parentNode : null; if (!host) return; var ex = $("bp-ok"); if (ex) ex.remove();
  var el = D.createElement("section"); el.id = "bp-ok"; el.className = "bp-ok"; el.setAttribute("role", "status");
  el.innerHTML = '<div class="bp-okh"><i aria-hidden="true">&#10003;</i><div><b>Booking berhasil</b><small>' + E(tglPendek(arr[0].tanggal).p) + '</small></div><button type="button" class="au-x" data-bp="tutup" aria-label="Tutup">&times;</button></div>' +
    '<ul>' + arr.map(function (o) { return '<li><span><b>' + E(o.jam) + ' WIB</b> &middot; ' + E(label(o.kunci)) + '<small>Kode ' + E(o.kode) + '</small></span><button type="button" class="chip" data-bp="ics:' + o.id + '">Kalender</button></li>'; }).join("") + '</ul>' +
    '<p class="sys">Tekan "Saya sudah tiba" saat sampai. Check-in dibuka 60 menit sebelum jam booking. Bawa KTP dan berkas persyaratan.</p><div class="btns"><button type="button" class="send" data-bp="tiket">Lihat tiket</button></div>';
  host.insertBefore(el, v); try { el.scrollIntoView({behavior: "smooth", block: "start"}); } catch (e) {}
}
var a0 = window.api; if (a0 && !a0.__bp) { window.api = function (p, b) { return a0.apply(this, arguments).then(function (r) { try { if (p === "/api/booking" && b && b.item && r && r.booking) { CACHE = {}; sukses(r.booking); setTimeout(langkah, 400); } else if (/^\/api\/booking\/(batal|tiba)/.test(p)) { CACHE = {}; setTimeout(langkah, 400); } } catch (e) {} return r; }); }; window.api.__bp = 1; }

/* ---------- Pasang ---------- */
window.slots = slotsBaru;
var _p = window.pBk;
window.pBk = async function (el) {
  var r = await _p.apply(this, arguments);
  try {
    if (!$("bp-top")) { var c = $("bl") && $("bl").closest(".card"); if (c) { var t = D.createElement("div"); t.id = "bp-top"; t.className = "bp-top"; c.parentNode.insertBefore(t, c); } }
    cariBox(); stripTanggal(); pasangObserver(); langkah(); var k = $("bk3") && $("bk3").value; if (k) { prefetch(k); } window.slots();
  } catch (e) {}
  return r;
};
setInterval(function () { try { perbaikiTiba(); if (window.PN === "bk" && $("bp-top")) langkah(); } catch (e) {} }, 2000);
window.BookingPro = {lewat: lewat, bentrok: bentrok, layak: layak, _cache: CACHE};
})();
