"use strict";
/* Versi 35: Pendamping Kunjungan + Asisten lebih cerdas.
   Semua berjalan di browser dari data yang sudah ada (booking, permohonan, tiket, daftar dokumen, loket); tanpa AI luar, tanpa server baru.
   A. Pita Tiket Aktif (semua halaman): kode, jam, antrean di depan (diperbarui tiap 30 dtk), hitung mundur, tombol "Saya sudah tiba", Rute.
   B. Pendamping Hari Kunjungan (chat): garis waktu status, jam berangkat, dokumen, rute, pengingat saat halaman terbuka.
   C. Urusan Saya: langkah berikutnya yang paling penting (beranda dan chat).
   D. Lembar Pengantar: satu lembar cetak/salin berisi tiket, permohonan, dokumen, dan KBLI, supaya serah terima di loket lebih cepat.
   E. Chat: Rencana Gabungan (beberapa urusan sekaligus), klarifikasi "maksud Anda yang mana?", pemilih bidang (/bantu), saran ketikan, status jam booking. */
(function () {
var I = window.BOTI; if (!I) return;
var $ = function (i) { return document.getElementById(i); };
var bot = I.bot, KB = I.KB, NS = '<i class="nosg" hidden></i>';
var AK = ["Terjadwal", "Sudah tiba", "Dipanggil"], TL = ["Terjadwal", "Sudah tiba", "Dipanggil"];
var ST = {bk: [], pm: []}, TRV = 30, NOTI = {}, LASTPOLL = 0, PLAN = null, LASTU = null;
try { TRV = +localStorage.getItem("pk_trv") || 30; } catch (x) {}

function bx(label, code, cls) { return '<button type="button"' + (cls ? ' class="' + cls + '"' : '') + ' data-v="' + esc(code) + '">' + esc(label) + '</button>'; }
function row(h) { return '<div class="bch">' + h + '</div>'; }
function tg(m) { if (window.toast) toast(m); }
function nowMin() { var d = wibDate(0); return d.getHours() * 60 + d.getMinutes(); }
function jm(o) { var p = String(o.jam || "0:0").split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
function hm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
function dur(m) { m = Math.max(0, Math.round(m)); if (m < 60) return m + " menit"; var h = Math.floor(m / 60), r = m % 60; return h + " jam" + (r ? " " + r + " menit" : ""); }
function today() { return iso(wibDate(0)); }
function tglPendek(ymd) { return new Date(ymd + "T00:00:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"}); }
function byJam(a, b) { return a.tanggal !== b.tanggal ? (a.tanggal < b.tanggal ? -1 : 1) : a.jam !== b.jam ? (a.jam < b.jam ? -1 : 1) : (a.kode < b.kode ? -1 : 1); }
function aktifHari() { var h = today(); return ST.bk.filter(function (o) { return o.tanggal === h && AK.indexOf(o.status) > -1; }).sort(byJam); }
function akanDatang() { var h = today(); return ST.bk.filter(function (o) { return o.tanggal > h && o.status === "Terjadwal"; }).sort(byJam); }
function canIn(o) { return o.status === "Terjadwal" && o.tanggal === today() && nowMin() >= jm(o) - 60; }
function locOf(o) { var id = o.lokasi || String(o.kunci).split("_")[0]; return LOCS.filter(function (l) { return l.id === id; })[0] || {id: id, nm: id}; }
function nmLoket(o) { var e = entryOf(o.kunci); return e ? e[1] : label(o.kunci); }
function rute(o) { var l = locOf(o); return l.mp || ("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(l.al || ((l.nm || "") + " Surabaya"))); }
function SYA(o) { return !!(window.SY && SY.ada(o.kunci)); }
function kbOf(o) { var tx = (label(o.kunci) + " " + (o.keperluan || "")).toLowerCase(); return KB.filter(function (k) { return k.re.test(tx); })[0] || null; }
function cdText(o) {
  if (o.status === "Dipanggil") return "Sekarang";
  var d = jm(o) - nowMin();
  return d > 0 ? dur(d) + " lagi" : "Sudah masuk jam";
}
function leaveBy(o) { return jm(o) - 15 - TRV; }
function waOpen(t) { window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener"); }
function copyTxt(t, msg) { try { navigator.clipboard.writeText(t).then(function () { tg(msg || "Disalin."); }, function () { tg("Tidak bisa menyalin."); }); } catch (x) { tg("Tidak bisa menyalin."); } }
function chatKosong() { return !$("bm").children.length; }
/* Buka Asisten lalu jalankan fn dengan jeda yang cukup bila sapaan awal masih tampil */
function viaChat(userText, fn) {
  var kosong = chatKosong(); if (window.openAsisten) openAsisten();
  if (userText) I.add("u", esc(userText));
  return fn(kosong ? 950 : 380);
}

/* ============================================================
   Data: ikut polling yang sudah ada (tanpa permintaan tambahan), ditambah pembaruan antrean tiap 30 dtk bila ada tiket aktif hari ini
   ============================================================ */
function afterBk() { pita(); urusan(); liveUpdate(); cekNotif(); if (aktifHari().length && Date.now() - LASTPOLL > 25000) pollDepan(); }
var _bk = window.bkCheck, _pm = window.pmhCheck;
window.bkCheck = function (arr) {
  try {
    var prev = {}; ST.bk.forEach(function (o) { prev[o.id] = o; });
    ST.bk = (arr || []).map(function (o) { var p = prev[o.id]; if (p && p.depan != null && o.depan == null && p.status === o.status) o.depan = p.depan; return o; });
    afterBk();
  } catch (x) {}
  if (_bk) return _bk.apply(this, arguments);
};
window.pmhCheck = function (arr) {
  try { ST.pm = (arr || []).slice(); urusan(); } catch (x) {}
  if (_pm) return _pm.apply(this, arguments);
};
async function pollDepan(force) {
  if (S !== "user" || (document.hidden && !force)) return;
  if (!force && !aktifHari().length) return;
  LASTPOLL = Date.now();
  try { var j = await api("/api/booking"); ST.bk = j.daftar || []; pita(); urusan(); liveUpdate(); cekNotif(); } catch (x) {}
}

/* Notifikasi lokal (hanya saat halaman terbuka): antrean hampir tiba dan waktu berangkat */
function cekNotif() {
  if (S !== "user") return;
  var nm = nowMin();
  aktifHari().forEach(function (o) {
    var n = NOTI[o.id] = NOTI[o.id] || {}, dekat = nm >= jm(o) - 60 || o.status === "Sudah tiba";
    if (o.status === "Dipanggil") return;
    if (o.depan === 0 && dekat && !n.d0) { n.d0 = 1; notify("Giliran Anda berikutnya", o.kode + " - " + label(o.kunci) + ". Bersiaplah di depan loket.", function () { viaChat("Kunjungan hari ini", harini); }); }
    else if (o.depan != null && o.depan > 0 && o.depan <= 3 && dekat && !n.d3) { n.d3 = 1; notify("Antrean hampir tiba", "Tinggal " + o.depan + " antrean di depan Anda (" + o.kode + "). Silakan menuju loket.", function () { viaChat("Kunjungan hari ini", harini); }); }
    if (o.status === "Terjadwal" && !n.go && nm >= leaveBy(o) && nm < jm(o)) { n.go = 1; notify("Saatnya berangkat", "Kunjungan " + label(o.kunci) + " pukul " + o.jam + ". Berangkat sekarang agar tiba 15 menit sebelumnya.", function () { viaChat("Kunjungan hari ini", harini); }); }
  });
}

/* ============================================================
   A. Pita Tiket Aktif
   ============================================================ */
function pitaBuild() {
  if ($("pkr")) return;
  var el = document.createElement("div"); el.id = "pkr"; el.className = "pkr"; el.hidden = true; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Tiket antrean hari ini");
  var top = document.querySelector(".top"); if (top) top.insertAdjacentElement("afterend", el); else document.body.insertBefore(el, document.body.firstChild);
}
function pita() {
  pitaBuild(); var el = $("pkr"); if (!el) return;
  var L = S === "user" ? aktifHari() : [];
  if (!L.length) { el.hidden = true; return; }
  var o = L.filter(function (x) { return x.status === "Dipanggil"; })[0] || L[0], lain = L.length - 1, call = o.status === "Dipanggil";
  var info = [esc(nmLoket(o)), esc(o.jam) + " WIB"];
  if (!call && o.depan != null) info.push('<b>' + o.depan + '</b> antrean di depan');
  if (!call && o.status === "Terjadwal") info.push(esc(cdText(o)));
  el.className = "pkr" + (call ? " call" : "");
  el.innerHTML = '<div class="pkr-m"><span class="pkr-i" aria-hidden="true">' + (call ? "📣" : "🎫") + '</span><span class="pkr-k">' + esc(o.kode) + '</span><span class="pkr-s">' + (call ? "Giliran Anda!" : esc(o.status)) + '</span></div>' +
    '<div class="pkr-d">' + info.join(" &middot; ") + (lain > 0 ? ' &middot; <small>+' + lain + ' tiket lain</small>' : "") + '</div>' +
    '<div class="pkr-b">' + (o.status === "Terjadwal" ? '<button type="button" class="pk-go" data-v="tiba:' + esc(o.id) + '"' + (canIn(o) ? "" : " disabled") + '>Saya sudah tiba</button>' : "") +
    '<a href="' + esc(rute(o)) + '" target="_blank" rel="noopener noreferrer">Rute</a><button type="button" data-v="harini">Pendamping</button></div>' +
    (o.status === "Terjadwal" && !canIn(o) ? '<small class="pkr-h">Check-in dibuka pukul ' + hm(jm(o) - 60) + ' WIB</small>' : "");
  el.hidden = false;
}

/* ============================================================
   B. Pendamping Hari Kunjungan (chat)
   ============================================================ */
function tlHtml(o) {
  var i = AK.indexOf(o.status);
  return '<ol class="pk-tl" data-pk-tl="' + esc(o.id) + '">' + TL.map(function (s, k) { return '<li class="' + (k < i ? "done" : k === i ? "now" : "") + '">' + s + '</li>'; }).join("") + '</ol>';
}
function goHtml(o) {
  return '<div class="pk-trv"><b>Berangkat paling lambat <span data-pk-go="' + esc(o.id) + '">' + hm(leaveBy(o)) + '</span> WIB</b><small>Lama perjalanan Anda (tiba 15 menit sebelum jam booking):</small>' +
    '<div class="bch">' + [15, 30, 45, 60, 90].map(function (m) { return '<button type="button" data-v="trv:' + m + '" aria-pressed="' + (m === TRV) + '">' + m + ' mnt</button>'; }).join("") + '</div></div>';
}
function kartuTiket(o) {
  var kb = kbOf(o), l = locOf(o), tel = typeof telHref === "function" ? telHref(l.tl) : "", id = esc(o.id);
  var h = '<div class="bc2 pkc" data-pk="' + id + '"><div class="pk-h"><b class="pk-k">' + esc(o.kode) + '</b><span class="btag" data-pk-st="' + id + '">' + esc(o.status) + '</span></div>' +
    '<p><b>' + esc(nmLoket(o)) + '</b><small>' + esc(l.nm) + (l.al ? " &middot; " + esc(l.al) : "") + '</small></p>' + tlHtml(o) +
    '<div class="pk-m"><div><small>Di depan Anda</small><b data-pk-depan="' + id + '">' + (o.depan != null ? o.depan : "-") + '</b></div><div><small>Jam booking</small><b>' + esc(o.jam) + '</b></div><div><small>Mulai</small><b data-pk-cd="' + id + '">' + esc(cdText(o)) + '</b></div></div>';
  if (o.status === "Terjadwal") h += goHtml(o);
  if (o.status === "Dipanggil") h += '<div class="tk-call">Giliran Anda! Silakan menuju loket sekarang.</div>';
  h += '<div class="ba pk-act">' + (o.status === "Terjadwal" ? '<button type="button" class="pk-go" data-v="tiba:' + id + '"' + (canIn(o) ? "" : " disabled") + '>Saya sudah tiba</button>' : "") +
    '<a href="' + esc(rute(o)) + '" target="_blank" rel="noopener noreferrer">Rute</a>' + (tel ? '<a href="' + esc(tel) + '">Telepon</a>' : "") + (kb && !SYA(o) ? bx("Daftar dokumen", "ck:" + kb.id) : "") + '</div>';
  if (o.status === "Terjadwal" && !canIn(o)) h += '<small class="bnote" data-pk-hint="' + id + '">Check-in dibuka pukul ' + hm(jm(o) - 60) + ' WIB (60 menit sebelum jam booking).</small>';
  if (SYA(o)) h += '<details class="bkr-sy" open><summary>Persyaratan ' + esc(nmLoket(o)) + '</summary>' + SY.html(o.kunci) + '</details>';
  else if (kb) h += I.ckp(kb) + '<small class="bnote">Daftar umum; persyaratan loket ini belum diisi admin.</small>';
  else if (window.SY) h += SY.html(o.kunci);
  return h + '</div>';
}
async function harini(dl) {
  if (S !== "user") return I.needIn("Masuk dulu supaya saya bisa menampilkan tiket antrean Anda hari ini.");
  await pollDepan(true);
  var L = aktifHari(), nx = akanDatang();
  if (!L.length) {
    return bot(nx.length ? "Tidak ada kunjungan hari ini. Kunjungan terdekat Anda:" : "Anda belum punya booking aktif untuk hari ini.",
      NS + nx.slice(0, 2).map(function (o) { return '<div class="bc2"><b>' + esc(o.kode) + '</b> <span class="btag">' + esc(o.jam) + ' WIB</span><p>' + esc(label(o.kunci)) + '</p><small>' + esc(tglPendek(o.tanggal)) + '</small></div>'; }).join("") +
      row(bx("Buat booking", "pn:bk") + bx("Cek jam sepi", "q:jam sepi") + bx("Cek kesiapan berkas", "q:cek kesiapan") + (nx.length ? bx("Lembar pengantar", "pengantar") : "")), dl);
  }
  return bot("Pendamping kunjungan Anda hari ini (" + L.length + " tiket). Angka antrean diperbarui otomatis selama halaman terbuka.",
    NS + L.map(kartuTiket).join("") + '<p class="bnote">Antrean dihitung dari tiket aktif di loket yang sama; petugas yang menentukan urutan panggilan.</p>' + row(bx("Lembar pengantar", "pengantar") + bx("Urusan saya", "urusan")), dl);
}
/* Perbarui angka pada kartu yang sedang tampil (tanpa menggambar ulang pesan) */
function liveUpdate() {
  [].forEach.call(document.querySelectorAll(".pkc[data-pk]"), function (c) {
    var o = ST.bk.filter(function (x) { return String(x.id) === c.dataset.pk; })[0]; if (!o) return;
    var q = function (a) { return c.querySelector("[" + a + '="' + c.dataset.pk + '"]'); }, e;
    if ((e = q("data-pk-st"))) e.textContent = o.status;
    if ((e = q("data-pk-depan"))) e.textContent = o.depan != null ? o.depan : "-";
    if ((e = q("data-pk-cd"))) e.textContent = cdText(o);
    if ((e = q("data-pk-go"))) e.textContent = hm(leaveBy(o));
    if ((e = q("data-pk-tl"))) e.outerHTML = tlHtml(o);
    [].forEach.call(c.querySelectorAll('button[data-v^="trv:"]'), function (b) { b.setAttribute("aria-pressed", String("trv:" + TRV === b.dataset.v)); });
    [].forEach.call(c.querySelectorAll('button[data-v^="tiba:"]'), function (b) { if (o.status !== "Terjadwal") b.remove(); else b.disabled = !canIn(o); });
    if ((e = q("data-pk-hint")) && (canIn(o) || o.status !== "Terjadwal")) e.remove();
    var tr = c.querySelector(".pk-trv"); if (tr && o.status !== "Terjadwal") tr.remove();
    var tc = c.querySelector(".tk-call"); if (o.status === "Dipanggil" && !tc) c.querySelector(".pk-act").insertAdjacentHTML("beforebegin", '<div class="tk-call">Giliran Anda! Silakan menuju loket sekarang.</div>');
  });
}
async function checkIn(id, b) {
  if (b) b.disabled = true;
  try { await api("/api/booking/tiba", {id: id}); tg("Check-in berhasil. Petugas akan memanggil Anda sesuai urutan."); await pollDepan(true); }
  catch (x) { tg(x.message); if (b) b.disabled = false; }
}

/* ============================================================
   C. Urusan Saya: langkah berikutnya
   ============================================================ */
function aksi() {
  var A = [], ck = I.ck();
  aktifHari().forEach(function (o) {
    var call = o.status === "Dipanggil";
    A.push({p: call ? 120 : 100, i: call ? "📣" : "🎫", t: call ? "Giliran Anda dipanggil: " + o.kode : "Kunjungan hari ini pukul " + o.jam,
      d: label(o.kunci) + (o.depan != null && !call ? " · " + o.depan + " antrean di depan" : "") + " · " + o.status, b: [["Buka pendamping", "harini"]]});
  });
  akanDatang().slice(0, 2).forEach(function (o) { A.push({p: 60, i: "📅", t: "Kunjungan " + tglPendek(o.tanggal) + ", pukul " + o.jam, d: label(o.kunci) + " · " + o.kode, b: [["Lembar pengantar", "pengantar"]]}); });
  (ST.pm || []).forEach(function (o) {
    var s = o.status, k = o.kunci && entryOf(o.kunci) ? o.kunci : "", nm = (o.jenis || "Permohonan") + (o.nomor ? " (No. " + o.nomor + ")" : "");
    if (s === "Perlu perbaikan berkas") A.push({p: 90, i: "📝", t: "Lengkapi berkas: " + (o.jenis || "permohonan"), d: nm + " · perlu perbaikan berkas", b: k ? [["Tanya loket", "buka:" + k], ["Booking", "bk:" + k]] : [["Lihat status", "pn:pmh"]]});
    else if (s === "Siap diambil") A.push({p: 85, i: "📦", t: "Siap diambil: " + (o.jenis || "permohonan"), d: nm + " · ambil di loket pengambilan, bawa KTP asli", b: k ? [["Booking pengambilan", "bk:" + k]] : [["Lihat status", "pn:pmh"]]});
    else if (s === "Ditolak") A.push({p: 70, i: "⚠️", t: "Permohonan ditolak: " + (o.jenis || ""), d: nm + " · tanyakan alasan dan langkah berikutnya", b: k ? [["Tanya loket", "buka:" + k]] : [["Lihat status", "pn:pmh"]]});
    else if (s === "Diterima" || s === "Sedang diverifikasi" || s === "Disetujui") A.push({p: s === "Disetujui" ? 50 : 30, i: "⏳", t: (o.jenis || "Permohonan") + ": " + s.toLowerCase(), d: nm, b: [["Lihat status", "pn:pmh"]]});
  });
  (window.TKT || []).forEach(function (t) {
    if (t.status === "Dibalas") A.push({p: 55, i: "💬", t: "Admin sudah membalas pertanyaan Anda", d: t.no + " · " + label(t.kunci), b: [["Buka percakapan", "buka:" + t.kunci]]});
    else if (t.status === "Diterima" || t.status === "Dibaca admin") A.push({p: 20, i: "⌛", t: "Pertanyaan menunggu balasan", d: t.no + " · " + label(t.kunci) + " · " + t.status.toLowerCase(), b: [["Buka percakapan", "buka:" + t.kunci]]});
  });
  KB.forEach(function (kb) {
    var c = ck[kb.id] || {}, n = 0; kb.d.forEach(function (_, i) { if (c[i]) n++; });
    if (n > 0 && n < kb.d.length) A.push({p: 45, i: "☑️", t: "Dokumen " + kb.t + ": " + n + " dari " + kb.d.length + " siap", d: "Lengkapi daftar sebelum berangkat.", b: [["Buka daftar", "ck:" + kb.id]]});
    else if (n === kb.d.length && !aktifHari().length && !akanDatang().length) A.push({p: 58, i: "✅", t: "Dokumen " + kb.t + " sudah lengkap", d: "Saatnya booking jadwal kunjungan.", b: [["Booking sekarang", "pn:bk"]]});
  });
  return A.sort(function (a, b) { return b.p - a.p; });
}
function aksiHtml(a, penuh) {
  return '<li class="pku-i"><span class="pku-ic" aria-hidden="true">' + a.i + '</span><div><b>' + esc(a.t) + '</b><small>' + esc(a.d) + '</small>' + (penuh ? '<div class="bch">' + a.b.map(function (x) { return bx(x[0], x[1]); }).join("") + '</div>' : '') + '</div>' +
    (!penuh && a.b[0] ? '<button type="button" class="pku-go" data-v="' + esc(a.b[0][1]) + '">' + esc(a.b[0][0]) + '</button>' : "") + '</li>';
}
function urusan() {
  var nav = document.querySelector("nav.menu"); if (!nav) return;
  var el = $("pk-ur"); if (!el) { el = document.createElement("section"); el.id = "pk-ur"; el.className = "pku"; el.setAttribute("aria-label", "Urusan saya"); el.hidden = true; nav.parentNode.insertBefore(el, nav); }
  var A = S === "user" ? aksi() : [];
  if (!A.length) { el.hidden = true; el.innerHTML = ""; return; }
  el.innerHTML = '<div class="pku-h"><div><b>Urusan saya</b><small>Langkah berikutnya untuk Anda</small></div>' + (A.length > 3 ? '<button type="button" class="pku-all" data-v="urusan">Lihat semua (' + A.length + ')</button>' : '<button type="button" class="pku-all" data-v="urusan">Buka di Asisten</button>') + '</div><ul>' + A.slice(0, 3).map(function (a) { return aksiHtml(a, false); }).join("") + '</ul>';
  el.hidden = false;
}
async function urusanChat(dl) {
  if (S !== "user") return I.needIn("Masuk dulu supaya saya bisa menampilkan urusan Anda.");
  await pollDepan(true);
  var A = aksi();
  if (!A.length) return bot("Belum ada urusan yang berjalan. Mulai dari mencari layanan, booking jadwal, atau menyiapkan daftar dokumen.", NS + row(bx("Mau bikin NIB", "q:mau bikin NIB") + bx("Booking kunjungan", "pn:bk") + bx("Bantu pilih bidang", "bid")), dl);
  return bot("Ini yang sebaiknya Anda lakukan, diurutkan dari yang paling mendesak:", NS + '<ul class="pku-l">' + A.slice(0, 6).map(function (a) { return aksiHtml(a, true); }).join("") + '</ul>' + row(bx("Lembar pengantar", "pengantar")), dl);
}

/* ============================================================
   D. Lembar Pengantar (cetak / salin / WhatsApp)
   ============================================================ */
function dataPengantar() {
  var ck = I.ck(), kep = ($("pk-kep") || {}).value || "", d = {nama: (window.ME && ME.nama) || "", hp: (window.ME && ME.hp) || "", kep: clean(kep).slice(0, 200)};
  d.tiket = aktifHari().concat(akanDatang()).slice(0, 4).map(function (t) { return Object.assign({}, t, {sy: window.SY ? SY.daftar(t.kunci) : [], syv: window.SY ? SY.verif(t.kunci) : false}); });
  d.pm = (ST.pm || []).filter(function (o) { return o.status && o.status !== "Selesai"; }).slice(0, 3);
  d.dok = [];
  KB.forEach(function (kb) { var c = ck[kb.id] || {}, n = 0; kb.d.forEach(function (_, i) { if (c[i]) n++; }); if (n > 0 && !(PLAN && PLAN.ids.indexOf(kb.id) > -1) && !d.tiket.some(function (t) { return t.sy.length; })) d.dok.push({t: kb.t, n: n, items: kb.d.map(function (x, i) { return {x: x, ok: !!c[i]}; })}); });
  d.plan = PLAN ? PLAN.docs.map(function (x) { return {t: x.t, ok: KB.some(function (kb) { var c = ck[kb.id] || {}; return PLAN.ids.indexOf(kb.id) > -1 && kb.d.some(function (y, i) { return c[i] && dk(y) === x.k; }); })}; }) : null;
  d.kbli = []; try { if (window.KBLI) KBLI.favs().slice(0, 10).forEach(function (k) { var r = KBLI.byKode(k); if (r) d.kbli.push(r[0] + " - " + r[1]); }); } catch (x) {}
  return d;
}
function teksPengantar(d) {
  var o = ["LEMBAR PENGANTAR KUNJUNGAN", "Takok Pelayanan Suroboyo - " + tglId(Date.now()), "", "Nama: " + (d.nama || "-") + (d.hp ? "   HP: " + d.hp : "")];
  if (d.kep) o.push("Keperluan: " + d.kep);
  if (d.tiket.length) { o.push("", "TIKET ANTREAN"); d.tiket.forEach(function (t) { o.push("- " + t.kode + " | " + label(t.kunci) + " | " + tglPendek(t.tanggal) + " " + t.jam + " WIB"); if (t.sy.length) { o.push("  Persyaratan loket" + (t.syv ? "" : " (panduan umum, belum diverifikasi)") + ":"); t.sy.forEach(function (g) { if (g.t) o.push("  " + g.t + ":"); g.items.forEach(function (x) { o.push("  " + (x.ok ? "[v] " : "[ ] ") + x.x); }); }); } else o.push("  Persyaratan: belum diisi loket, tanyakan dulu."); }); }
  if (d.pm.length) { o.push("", "PERMOHONAN"); d.pm.forEach(function (p) { o.push("- " + (p.jenis || "-") + (p.nomor ? " (No. " + p.nomor + ")" : "") + " | " + p.status); }); }
  if (d.plan && d.plan.length) { o.push("", "DOKUMEN UNTUK RENCANA INI"); d.plan.forEach(function (x) { o.push((x.ok ? "[v] " : "[ ] ") + x.t); }); }
  d.dok.forEach(function (k) { o.push("", "DOKUMEN: " + k.t + " (" + k.n + "/" + k.items.length + " siap)"); k.items.forEach(function (x) { o.push((x.ok ? "[v] " : "[ ] ") + x.x); }); });
  if (d.kbli.length) { o.push("", "KBLI YANG SAYA PILIH"); d.kbli.forEach(function (k) { o.push("- " + k); }); }
  o.push("", "Lembar ini dibuat sendiri oleh pemohon, bukan dokumen resmi, dan tidak memuat NIK.");
  return o.join("\n");
}
function pengantarChat(dl) {
  if (S !== "user") return I.needIn("Masuk dulu supaya lembar pengantar bisa memuat tiket dan permohonan Anda.");
  var d = dataPengantar(), kosong = !d.tiket.length && !d.pm.length && !d.dok.length && !d.kbli.length && !(d.plan && d.plan.length);
  return bot("Lembar pengantar merangkum tiket, permohonan, dokumen, dan KBLI Anda dalam satu halaman. Tunjukkan di loket agar petugas langsung paham keperluan Anda.",
    NS + '<div class="bc2 pkp"><b>Isi lembar</b><ul class="bul">' + (d.tiket.length ? '<li>' + d.tiket.length + ' tiket antrean, dengan persyaratan sesuai loketnya' + (d.tiket.some(function (t) { return !t.sy.length; }) ? ' (ada loket yang persyaratannya belum diisi)' : '') + '</li>' : '') + (d.pm.length ? '<li>' + d.pm.length + ' permohonan aktif</li>' : '') + d.dok.map(function (k) { return '<li>Dokumen ' + esc(k.t) + ' (' + k.n + '/' + k.items.length + ' siap)</li>'; }).join("") +
    (d.plan && d.plan.length ? '<li>Dokumen untuk rencana gabungan (' + d.plan.length + ')</li>' : '') + (d.kbli.length ? '<li>' + d.kbli.length + ' KBLI pilihan</li>' : '') + (kosong ? '<li>Belum ada data. Booking, centang dokumen, atau simpan KBLI dulu agar lembar ini berisi.</li>' : '') + '</ul>' +
    '<label class="pk-lb" for="pk-kep">Keperluan singkat (opsional)</label><input class="pk-in" id="pk-kep" maxlength="200" placeholder="Contoh: perpanjang SIP dokter" autocomplete="off"><small class="bnote">Jangan menulis NIK, kata sandi, atau OTP.</small></div>' +
    row(bx("Cetak / simpan PDF", "cetak", "pk-main") + bx("Salin teks", "salin") + bx("Kirim ke WhatsApp", "wa")), dl);
}
function cetak() {
  var d = dataPengantar(); if (/\b\d{16}\b/.test(d.kep)) { tg("Jangan menulis NIK 16 digit di lembar pengantar."); return; }
  var old = $("pk-print"); if (old) old.remove();
  var el = document.createElement("div"); el.id = "pk-print";
  var sec = function (t, h) { return h ? '<h2>' + esc(t) + '</h2>' + h : ""; };
  el.innerHTML = '<div class="pkp-top"><h1>Lembar Pengantar Kunjungan</h1><p>Takok Pelayanan Suroboyo &middot; ' + esc(tglId(Date.now())) + '</p></div>' +
    '<table class="pkp-id"><tr><th>Nama</th><td>' + esc(d.nama || "-") + '</td></tr>' + (d.hp ? '<tr><th>HP</th><td>' + esc(d.hp) + '</td></tr>' : '') + (d.kep ? '<tr><th>Keperluan</th><td>' + esc(d.kep) + '</td></tr>' : '') + '</table>' +
    sec("Tiket antrean", d.tiket.map(function (t) { return '<div class="pkp-t"><div><b>' + esc(t.kode) + '</b><br>' + esc(label(t.kunci)) + '<br>' + esc(tglPendek(t.tanggal)) + ', pukul ' + esc(t.jam) + ' WIB</div><div class="pkp-bc">' + (typeof barcode === "function" ? barcode(t.kode) : "") + '</div></div>' + (t.sy.length ? '<div class="pkp-sy"><b>Bawa untuk loket ini</b>' + (t.syv ? '' : ' <small>(panduan umum, belum diverifikasi loket)</small>') + t.sy.map(function (g) { return (g.t ? '<p class="pkp-gt">' + esc(g.t) + '</p>' : '') + '<ul class="pkp-c">' + g.items.map(function (x) { return '<li><span>' + (x.ok ? "&#9745;" : "&#9744;") + '</span> ' + esc(x.x) + '</li>'; }).join("") + '</ul>'; }).join("") + '</div>' : '<p class="pkp-sy"><small>Persyaratan loket ini belum diisi; tanyakan ke petugas.</small></p>'); }).join("")) +
    sec("Permohonan", d.pm.length ? '<ul>' + d.pm.map(function (p) { return '<li>' + esc(p.jenis || "-") + (p.nomor ? ' (No. ' + esc(p.nomor) + ')' : '') + ' &mdash; <b>' + esc(p.status) + '</b></li>'; }).join("") + '</ul>' : "") +
    sec("Dokumen untuk rencana kunjungan", d.plan && d.plan.length ? '<ul class="pkp-c">' + d.plan.map(function (x) { return '<li><span>' + (x.ok ? "&#9745;" : "&#9744;") + '</span> ' + esc(x.t) + '</li>'; }).join("") + '</ul>' : "") +
    d.dok.map(function (k) { return '<h2>Dokumen: ' + esc(k.t) + ' (' + k.n + '/' + k.items.length + ' siap)</h2><ul class="pkp-c">' + k.items.map(function (x) { return '<li><span>' + (x.ok ? "&#9745;" : "&#9744;") + '</span> ' + esc(x.x) + '</li>'; }).join("") + '</ul>'; }).join("") +
    sec("KBLI yang dipilih", d.kbli.length ? '<ul>' + d.kbli.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join("") + '</ul>' : "") +
    '<p class="pkp-f">Lembar ini dibuat sendiri oleh pemohon lewat Takok, bukan dokumen resmi, dan tidak memuat NIK. Persyaratan resmi mengikuti ketentuan loket.</p>';
  document.body.appendChild(el); document.body.classList.add("pk-printing");
  var done = function () { document.body.classList.remove("pk-printing"); if (el.parentNode) el.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done); setTimeout(function () { window.print(); }, 60); setTimeout(done, 60000);
}

/* ============================================================
   E1. Rencana Gabungan: beberapa urusan dalam satu kalimat
   ============================================================ */
function dk(x) { x = String(x).toLowerCase(); if (/\bktp\b/.test(x)) return "ktp"; if (/\bnpwp\b/.test(x)) return "npwp"; if (/email|nomor hp|\bhp\b/.test(x)) return "kontak"; return x.replace(/[^a-z0-9]+/g, " ").trim(); }
function gabung(kbs, dl) {
  var m = {}, docs = [], flows = [];
  kbs.forEach(function (kb) {
    var f = []; kb.a.forEach(function (rx) { var k = findK(rx, "pusat"); if (k && entryOf(k) && f.indexOf(k) < 0) f.push(k); }); flows.push(f);
    kb.d.forEach(function (x) { var key = dk(x); if (!m[key]) { m[key] = {t: x, n: 0}; docs.push(m[key]); } m[key].n++; if (x.length < m[key].t.length) m[key].t = x; });
  });
  PLAN = {ids: kbs.map(function (k) { return k.id; }), docs: Object.keys(m).map(function (key) { return {t: m[key].t, k: key}; })};
  var h = kbs.map(function (kb, i) {
    return '<div class="bc2"><b>' + esc(kb.t) + '</b>' + (flows[i].length ? '<ol class="tlx">' + flows[i].map(function (k) { return '<li>' + esc(entryOf(k)[1]) + ' ' + (entryOf(k)[6] !== false ? bx("Booking", "bk:" + k) : "") + '</li>'; }).join("") + '</ol>' : '<small>Tanyakan ke Loket CS atau Informasi.</small>') + row(bx("Daftar dokumen", "ck:" + kb.id)) + '</div>';
  }).join("");
  var tot = kbs.reduce(function (n, k) { return n + k.d.length; }, 0);
  h += '<div class="bc2"><b>Dokumen gabungan (' + docs.length + ' item)</b>' + (tot > docs.length ? '<small>' + (tot - docs.length) + ' dokumen kembar sudah digabung</small>' : '') + '<ul class="bul">' + docs.map(function (x) { return '<li>' + esc(x.t) + (x.n > 1 ? ' <small class="btag">dipakai di ' + x.n + ' urusan</small>' : '') + '</li>'; }).join("") + '</ul></div>' +
    '<p class="bnote">Panduan umum, bukan daftar resmi. Syarat sebenarnya bisa berbeda; pastikan ke Loket CS atau Analisa Kesesuaian Berkas.</p>' + row(bx("Cetak lembar pengantar", "pengantar", "pk-main") + bx("Kirim ke WhatsApp", "wag"));
  return bot("Anda punya " + kbs.length + " urusan sekaligus: " + kbs.map(function (k) { return k.t; }).join(" dan ") + ". Saya gabungkan urutan loket dan daftar dokumennya supaya cukup satu kali datang.", NS + h, dl);
}
function wagTeks() { return !PLAN ? "" : "Rencana kunjungan saya:\n" + PLAN.ids.map(function (id) { var k = KB.filter(function (z) { return z.id === id; })[0]; return "- " + (k ? k.t : id); }).join("\n") + "\n\nDokumen yang perlu disiapkan:\n" + PLAN.docs.map(function (x) { return "[ ] " + x.t; }).join("\n") + "\n\nTakok Pelayanan Suroboyo: " + location.origin; }

/* ============================================================
   E2. Klarifikasi dan pemilih bidang
   ============================================================ */
var AMB = [
  [/^(izin|perizinan|izinnya|urus izin|bikin izin|buat izin|mau (urus|bikin|buat|ngurus) izin( apa)?)\??$/, "Izin apa yang ingin Anda urus?", [["Izin usaha / NIB", "mau bikin NIB"], ["SIP dokter, bidan, perawat", "SIP dokter"], ["PBG / izin bangunan", "syarat PBG"], ["Reklame", "izin reklame"], ["Lingkungan (AMDAL, UKL-UPL)", "izin lingkungan"], ["Koperasi", "koperasi"]]],
  [/^(bayar|pembayaran|bayaran|tagihan|mau bayar)\??$/, "Mau bayar apa?", [["Retribusi IPT", "bayar retribusi IPT"], ["Pajak (PBB, BPHTB)", "pajak pbb"], ["PDAM", "pdam"], ["Lewat loket bank", "loket layanan bank"]]],
  [/^(usaha|bisnis|mau usaha|buka usaha|bikin usaha|mulai usaha|dagang|jualan)\??$/, "Soal usaha, Anda butuh yang mana?", [["Daftar NIB (izin usaha)", "mau bikin NIB"], ["Cari kode KBLI", "kbli"], ["Cek kesiapan berkas NIB", "cek kesiapan nib"], ["Izin reklame", "izin reklame"], ["Izin lingkungan", "izin lingkungan"]]],
  [/^(tanah|sertifikat|lahan)\??$/, "Soal tanah, Anda butuh yang mana?", [["Sertifikat tanah (BPN)", "sertifikat tanah"], ["Retribusi IPT", "bayar retribusi IPT"], ["Sewa aset daerah", "aset daerah"], ["PBG bangunan", "syarat PBG"]]],
  [/^(kesehatan|sehat|berobat)\??$/, "Soal kesehatan, Anda butuh yang mana?", [["SIP dokter, bidan, perawat", "SIP dokter"], ["BPJS Kesehatan", "bpjs kesehatan"], ["Izin klinik / praktik", "izin klinik"]]],
  [/^(ktp|kk|kartu keluarga|akta|akte|kependudukan|pindah( domisili)?|domisili)\??$/, "Urusan kependudukan dilayani Dispenduk. Pilih lokasi yang dekat:", [["Cari loket Dispenduk", "dispenduk"], ["Lokasi dan jam buka", "lokasi dan jam buka"], ["Booking kunjungan", "booking kunjungan"]]]
];
var BID = [
  ["🏪", "Usaha dan perizinan", [["Daftar NIB", "mau bikin NIB"], ["Cari kode KBLI", "kbli"], ["Izin reklame", "izin reklame"], ["Izin lingkungan", "izin lingkungan"], ["Koperasi", "koperasi"], ["Hotel, restoran, wisata", "disbudporapar"]]],
  ["🏠", "Bangunan dan tanah", [["PBG / IMB / SLF", "syarat PBG"], ["Retribusi IPT", "bayar retribusi IPT"], ["Andalalin (lalu lintas)", "andalalin"], ["Sertifikat tanah", "sertifikat tanah"], ["Sewa aset daerah", "aset daerah"]]],
  ["🩺", "Kesehatan", [["SIP dokter, bidan, perawat", "SIP dokter"], ["BPJS Kesehatan", "bpjs kesehatan"], ["Izin klinik", "izin klinik"]]],
  ["💳", "Pajak dan pembayaran", [["Pajak PBB / BPHTB", "pajak pbb"], ["Bayar retribusi IPT", "bayar retribusi IPT"], ["Loket bank", "loket layanan bank"], ["PDAM", "pdam"]]],
  ["🪪", "Kependudukan", [["Loket Dispenduk", "dispenduk"], ["Lokasi dan jam buka", "lokasi dan jam buka"]]],
  ["⚖️", "Hukum dan ketenagakerjaan", [["Pengadilan", "pengadilan"], ["Perceraian", "cerai"], ["Kartu kuning", "kartu kuning"], ["BPJS Ketenagakerjaan", "bpjs ketenagakerjaan"], ["SKCK", "skck"]]],
  ["🦽", "Lansia dan difabel", [["Pendampingan lansia / difabel", "loket lansia difabel"]]],
  ["📣", "Pengaduan", [["Buat pengaduan terpandu", "buat pengaduan"]]]
];
function klarifikasi(q, opsi, dl) { return bot(q + " Pilih salah satu, atau ketik dengan kata Anda sendiri.", NS + I.chips(opsi) + row(bx("Bantu pilih bidang", "bid")), dl); }
function bidang(dl) {
  return bot("Urusan Anda termasuk bidang apa? Pilih satu, nanti saya tunjukkan layanan yang paling sering dicari.", NS + '<div class="pk-bid">' + BID.map(function (b, i) { return '<button type="button" data-v="bid:' + i + '"><span aria-hidden="true">' + b[0] + '</span>' + esc(b[1]) + '</button>'; }).join("") + '</div>', dl);
}
function bidangPilih(i) {
  var b = BID[+i]; if (!b) return;
  I.add("u", esc(b[1])); return bot(b[1] + ". Layanan yang paling sering dicari:", NS + I.chips(b[2]) + row(bx("Bidang lain", "bid")));
}
function statusBuka(dl) {
  var d = wibDate(0), w = d.getDay(), m = d.getHours() * 60 + d.getMinutes(), t, ok = false;
  if (w === 0 || w === 6) t = "Hari ini akhir pekan. Booking dan layanan tatap muka umumnya hari kerja; buka lagi Senin pukul 08.00.";
  else if (m < 480) t = "Belum jam booking. Booking dibuka hari kerja mulai 08.00 WIB (sekarang " + hm(m) + ").";
  else if (m >= 840) t = "Jam booking hari ini sudah lewat (08.00 sampai 14.00 WIB). Anda bisa booking untuk hari kerja berikutnya.";
  else { ok = true; t = "Sekarang " + hm(m) + " WIB: masih dalam jam booking (08.00 sampai 14.00 WIB, hari kerja). Sisa " + dur(840 - m) + "."; }
  return bot(t + (CFG.jam ? " Jam layanan yang diumumkan: " + clean(CFG.jam) + "." : "") + " Hari libur nasional tidak dihitung otomatis; cek pengumuman bila hari ini libur.", NS + row(bx("Lokasi dan jam", "q:lokasi dan jam buka") + (ok ? bx("Booking sekarang", "pn:bk") : bx("Booking untuk hari lain", "pn:bk"))), dl);
}

/* ============================================================
   Pintu masuk dari ask()
   ============================================================ */
var R_HARI = /^\/?harini$|kunjungan hari ini|tiket (antrean )?hari ini|antrean hari ini|pendamping (kunjungan|hari)|saya (mau|akan|sudah) berangkat|giliran saya|sisa antrean|berapa (orang )?(di )?depan saya|antrean (di )?depan saya/;
var R_URUS = /^\/?urusan\b|urusan saya|langkah (berikutnya|selanjutnya)|apa (yang )?(harus|perlu|sebaiknya) saya (lakukan|kerjakan)|selanjutnya (apa|ngapain)|next step/;
var R_PENG = /^\/?pengantar\b|lembar pengantar|kartu pengantar|surat pengantar kunjungan|cetak (ringkasan|paket) (kunjungan|berkas)/;
var R_BANTU = /^\/?bantu(an)?$|^bantu (saya )?(pilih|cari)|^(saya )?(lagi )?bingung( mau| harus)?( urus| apa| ke ?mana)?\??$|(tidak|gak|nggak|ga) tahu (harus|mau) (ke ?mana|urus apa|mulai)|pilih bidang/;
var R_BUKA = /(sekarang|saat ini|hari ini).{0,18}(buka|tutup)|(buka|tutup) (sekarang|saat ini)|apakah (sudah |masih )?(buka|tutup)|masih (buka|tutup)|loket (sudah |masih )?buka\b/;
var R_SY = /syarat|persyaratan|bawa apa|dibawa|dokumen apa|berkas apa|perlu apa|harus (saya )?(bawa|siapkan)/;
var STOPW = /^(syarat|syaratnya|persyaratan|apa|saja|aja|untuk|buat|dan|yang|di|ke|dari|mengurus|ngurus|urus|pengurusan|bikin|membuat|loket|bawa|dibawa|harus|perlu|dokumen|berkas|cara|mau|saya|itu|nya|ya|dong|sih|izin|perizinan|surat|apakah|ada|kalau|kalo|jika|bagaimana|gimana|siapkan|disiapkan)$/;
var JENIS_SYN = {perpanjang: "perpanjang", memperpanjang: "perpanjang", habis: "perpanjang", expired: "perpanjang", kadaluarsa: "perpanjang", pertama: "baru", hilang: "pengganti", rusak: "pengganti", ganti: "pengganti", penggantian: "pengganti", ubah: "perubahan", revisi: "perubahan", bersyarat: "bersyarat", sementara: "bersyarat"};
var ALIAS = {skck: "polrestabes", polisi: "polrestabes", perhubungan: "dishub", jkn: "bpjs", kis: "bpjs", bpjstk: "ketenagakerjaan", jht: "ketenagakerjaan", andalalin: "dishub"};
function cariSyarat(s) {
  var toks = s.split(/[^a-z0-9]+/).filter(function (w) { return w.length > 1 && !STOPW.test(w); }).map(function (w) { return JENIS_SYN[w] || ALIAS[w] || w; });
  if (!toks.length || !window.SY) return null;
  var C = [], max = 0;
  LOCS.forEach(function (l) { (LD[l.id] || []).forEach(function (d) {
    var k = l.id + "_" + d[0], nm = String(d[1]).toLowerCase(), hd = SY.grup(k).map(function (g) { return g.t.toLowerCase(); }).join(" | "), hit = 0, f = [];
    toks.forEach(function (w) { if (nm.indexOf(w) > -1) hit++; else if (hd.indexOf(w) > -1) { hit++; f.push(w); } });
    if (hit) { C.push({k: k, d: d, l: l, hit: hit, f: f}); if (hit > max) max = hit; }
  }); });
  C = C.filter(function (c) { return c.hit === max; });
  return C.length ? {C: C, toks: toks} : null;
}
function syaratChat(c, dl) {
  var k = c.k, e = c.d, ada = SY.ada(k);
  var nj = ada ? SY.grup(k).length : 0;
  return bot(ada ? "Persyaratan " + e[1] + (c.f && c.f.length ? " (fokus: " + c.f.join(", ") + ")" : nj > 1 ? ": ada " + nj + " jenis izin, pilih yang Anda butuhkan" : "") + ". Centang yang sudah siap; centangan tersimpan di perangkat ini." : "Persyaratan " + e[1] + " belum diisi oleh admin loket.",
    NS + '<div class="bc2"><b>' + esc(e[1]) + '</b> <span class="btag">' + esc(c.l.nm) + '</span>' + SY.html(k, {fokus: c.f}) + '<div class="ba">' + (e[6] !== false ? bx("Booking", "bk:" + k) : "") + bx("Tanya admin loket", "buka:" + k) + (ada ? bx("Lembar pengantar", "pengantar") : "") + '</div></div>' +
    '<p class="bnote">Persyaratan resmi mengikuti ketentuan loket dan bisa berubah. Pastikan lagi sebelum berangkat.</p>', dl);
}
function syaratCmd(s) {
  if (!R_SY.test(s) || s.length > 90) return null;
  var r = cariSyarat(s); if (!r) return null;
  var ada = r.C.filter(function (c) { return SY.ada(c.k); }), kbm = KB.some(function (z) { return z.re.test(s); });
  if (ada.length === 1) return syaratChat(ada[0]);
  if (ada.length > 1 || (!ada.length && r.C.length > 1 && !kbm)) {
    var L = (ada.length ? ada : r.C).slice(0, 6);
    return bot("Ada beberapa loket yang cocok. Persyaratan loket mana yang Anda maksud?", NS + I.chips(L.map(function (c) { return [c.d[1] + " (" + c.l.nm + ")", "syarat " + c.d[1] + " " + c.l.nm]; })));
  }
  if (!ada.length && r.C.length === 1 && !kbm) return syaratChat(r.C[0]);
  return null;
}
function cmd(t, s) {
  var rs = syaratCmd(s); if (rs) return rs;
  if (R_HARI.test(s)) return harini();
  if (R_URUS.test(s)) return urusanChat();
  if (R_PENG.test(s)) return pengantarChat();
  if (R_BANTU.test(s) && s.length < 50) return bidang();
  if (R_BUKA.test(s) && s.length < 60) return statusBuka();
  return null;
}
function smart(t, s) {
  var k;
  if (s.length <= 46) for (k = 0; k < AMB.length; k++) if (AMB[k][0].test(s)) return klarifikasi(AMB[k][1], AMB[k][2]);
  if (s.length >= 14 && /\b(dan|serta|sekaligus|juga|plus|sama)\b|,|&/.test(s) && !/\b(biaya|berapa|tarif|lama|jam|dimana|alamat)\b/.test(s)) {
    var kbs = KB.filter(function (z) { return z.re.test(s); });
    if (kbs.length >= 2) return gabung(kbs.slice(0, 3));
  }
  return null;
}
var _pre = window.BOTX && window.BOTX.pre;
window.BOTX = window.BOTX || {};
window.BOTX.pre = function (t, s) {
  var r = cmd(t, s); if (r) return r;
  r = _pre ? _pre(t, s) : null; if (r) return r;
  return smart(t, s);
};

/* ============================================================
   Tindakan (tombol data-v di chat, pita, dan beranda)
   ============================================================ */
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-v]"); if (!b || b.disabled) return;
  var s = b.dataset.v, i = s.indexOf(":"), c = i < 0 ? s : s.slice(0, i), a = i < 0 ? "" : s.slice(i + 1);
  if (c === "harini") viaChat("Kunjungan hari ini", harini);
  else if (c === "urusan") viaChat("Urusan saya", urusanChat);
  else if (c === "pengantar") { if (b.closest("#bp")) { I.add("u", "Lembar pengantar"); pengantarChat(); } else viaChat("Lembar pengantar", pengantarChat); }
  else if (c === "tiba") checkIn(a, b);
  else if (c === "trv") { TRV = +a || 30; try { localStorage.setItem("pk_trv", String(TRV)); } catch (x) {} NOTI = {}; liveUpdate(); }
  else if (c === "buka") { I.closeB(); openKey(a); }
  else if (c === "bk") I.goBook(a);
  else if (c === "sy") { var en = entryOf(a); if (en && window.SY) viaChat("Persyaratan " + en[1], function (dl) { return syaratChat({k: a, d: en, l: LOCS.filter(function (z) { return z.id === a.split("_")[0]; })[0] || {nm: ""}, f: []}, dl); }); }
  else if (c === "pn") { if (needLogin()) { I.closeB(); return; } I.closeB(); setPN(a); }
  else if (c === "ck") { var kb = KB.filter(function (z) { return z.id === a; })[0]; if (kb) viaChat(kb.t, function (dl) { return I.ckShow(kb); }); }
  else if (c === "q") { if (!b.closest("#bp") && window.openAsisten) openAsisten(); I.ask(a); }
  else if (c === "bid") { if (/^\d+$/.test(a)) bidangPilih(a); else if (b.closest("#bp")) { I.add("u", "Bantu pilih bidang"); bidang(); } else viaChat("Bantu pilih bidang", bidang); }
  else if (c === "cetak") cetak();
  else if (c === "salin") { var d = dataPengantar(); copyTxt(teksPengantar(d), "Lembar pengantar disalin."); }
  else if (c === "wa") waOpen(teksPengantar(dataPengantar()));
  else if (c === "wag") waOpen(wagTeks());
});

/* ============================================================
   E3. Saran ketikan di kolom Asisten
   ============================================================ */
var FRASA = ["Mau bikin NIB", "Syarat PBG bangun atau renovasi rumah", "Syarat SIP dokter", "Izin reklame", "Bayar retribusi IPT", "Izin lingkungan AMDAL UKL-UPL", "Koperasi", "Booking kunjungan", "Cek status permohonan saya", "Tiket antrean saya",
  "Kunjungan hari ini", "Urusan saya", "Lembar pengantar", "Jam sepi", "Cek kesiapan berkas", "Rencana kunjungan", "Lokasi dan jam buka", "Daftar instansi MPP", "SKCK", "Pajak PBB", "BPJS Kesehatan", "Sertifikat tanah", "Cerai", "Kartu kuning",
  "Buat pengaduan", "KBLI warung kopi", "KBLI toko online", "KBLI jasa laundry", "Apakah loket buka sekarang", "Bantu pilih bidang", "Perpanjang izin", "Andalalin", "Sewa aset daerah", "Pendampingan lansia difabel"];
var AC = {i: -1, l: []}, ACX = null;
function acIndeks() {
  var v = (window.KATA || []).length + ":" + LOCS.length; if (ACX && ACX.v === v) return ACX.l;
  var seen = {}, l = [];
  function add(x) { x = String(x || "").trim(); if (x.length < 3) return; var k = x.toLowerCase(); if (seen[k]) return; seen[k] = 1; l.push(x); }
  FRASA.forEach(add); KB.forEach(function (k) { add(k.t); });
  (window.KATA || []).slice(0, 3000).forEach(function (r) { var k = (r.k || [])[0]; if (k && r.j) add(k.charAt(0).toUpperCase() + k.slice(1)); });
  Object.keys(LD).forEach(function (id) { (LD[id] || []).forEach(function (d) { if (d[6] !== false || d[5] !== false) add(d[1]); }); });
  ACX = {v: v, l: l}; return l;
}
function acCari(q) {
  q = q.toLowerCase().replace(/\s+/g, " ").trim(); if (q.length < 2) return [];
  var tk = q.split(" "), R = [];
  acIndeks().forEach(function (x) {
    var lx = x.toLowerCase(), sc = 0;
    if (lx === q) return;
    if (lx.indexOf(q) === 0) sc = 100 - Math.min(lx.length, 60) / 10;
    else if (lx.indexOf(" " + q) > -1) sc = 70;
    else if (tk.length > 1 && tk.every(function (w) { return lx.indexOf(w) > -1; })) sc = 55;
    else if (lx.indexOf(q) > -1) sc = 40;
    else if (tk.length === 1 && lx.split(/\s+/).some(function (w) { return q.length >= 3 && w.indexOf(q.slice(0, 3)) === 0 && w.length >= q.length - 1 && w.length <= q.length + 1 && sim(w, q) >= .75; })) sc = 25;
    if (sc) R.push([sc, x]);
  });
  R.sort(function (a, b) { return b[0] - a[0] || a[1].length - b[1].length; });
  return R.slice(0, 5).map(function (r) { return r[1]; });
}
function sim(a, b) { var n = Math.max(a.length, b.length), m = 0; for (var i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) m++; return m / n; }
function acUI() {
  var inp = $("bi"); if (!inp || $("pk-ac")) return;
  var box = document.createElement("div"); box.id = "pk-ac"; box.className = "wcmd pk-ac"; box.hidden = true; box.setAttribute("role", "listbox"); box.setAttribute("aria-label", "Saran pertanyaan");
  inp.parentNode.parentNode.insertBefore(box, inp.parentNode);
  function tutup() { box.hidden = true; AC.i = -1; AC.l = []; }
  function tampil() {
    var v = inp.value; if (v.charAt(0) === "/" || v.trim().length < 2) { tutup(); return; }
    AC.l = acCari(v); AC.i = -1;
    if (!AC.l.length) { tutup(); return; }
    box.innerHTML = AC.l.map(function (x, k) { return '<button type="button" role="option" data-ac="' + k + '">' + hl(x, v) + '</button>'; }).join(""); box.hidden = false;
  }
  function hl(x, v) { var q = v.trim().toLowerCase(), p = x.toLowerCase().indexOf(q); return p < 0 ? esc(x) : esc(x.slice(0, p)) + '<b>' + esc(x.slice(p, p + q.length)) + '</b>' + esc(x.slice(p + q.length)); }
  function pilih(k) { var x = AC.l[k]; if (x == null) return; inp.value = x; tutup(); $("b-s").click(); }
  function tandai() { [].forEach.call(box.children, function (c, k) { c.classList.toggle("on", k === AC.i); c.setAttribute("aria-selected", String(k === AC.i)); }); }
  inp.addEventListener("input", tampil);
  inp.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); AC.i = (AC.i + (e.key === "ArrowDown" ? 1 : -1) + AC.l.length) % AC.l.length; tandai(); }
    else if (e.key === "Enter" && AC.i > -1) { e.preventDefault(); e.stopImmediatePropagation(); pilih(AC.i); }
    else if (e.key === "Enter" || e.key === "Escape") { if (e.key === "Escape") e.stopPropagation(); tutup(); }
  }, true);
  box.addEventListener("click", function (e) { var b = e.target.closest("[data-ac]"); if (b) pilih(+b.dataset.ac); });
  $("b-s").addEventListener("click", tutup, true);
  document.addEventListener("click", function (e) { if (!box.hidden && !e.target.closest("#pk-ac") && e.target !== inp) tutup(); });
}

/* Saat pertanyaan tidak ditemukan, tawarkan pemilih bidang */
function obsInit() {
  var m = $("bm"); if (!m || !window.MutationObserver) return;
  new MutationObserver(function (L) {
    L.forEach(function (r) { [].forEach.call(r.addedNodes, function (n) {
      if (n.nodeType !== 1 || !n.classList.contains("bmsg") || !n.classList.contains("b") || n.dataset.pk) return;
      if (/^Maaf, saya belum menemukan layanan yang cocok/.test(n.dataset.t || "")) { n.dataset.pk = "1"; n.insertAdjacentHTML("beforeend", '<div class="bch pk-nf"><span>Atau:</span>' + bx("Bantu pilih bidang", "bid") + bx("Susun pertanyaan ke loket", "q:/tanya") + '</div>'); m.scrollTop = m.scrollHeight; }
    }); });
  }).observe(m, {childList: true});
}

/* ============================================================
   Mulai
   ============================================================ */
function init() {
  pitaBuild(); urusan(); acUI(); obsInit();
  var bq = $("bq"); if (bq) { bq.insertAdjacentHTML("afterbegin", '<button type="button" data-b="q:kunjungan hari ini">Kunjungan hari ini</button><button type="button" data-b="q:urusan saya">Urusan saya</button>'); bq.insertAdjacentHTML("beforeend", '<button type="button" data-b="q:lembar pengantar">Lembar pengantar</button><button type="button" data-b="q:bantu pilih bidang">Bantu pilih bidang</button>'); }
  setInterval(function () { var u = S === "user"; if (u !== LASTU) { LASTU = u; if (!u) { ST.bk = []; ST.pm = []; NOTI = {}; } pita(); urusan(); } }, 1500);
  setInterval(function () { if (S === "user" && !document.hidden) { pita(); liveUpdate(); cekNotif(); if (aktifHari().length) pollDepan(); } }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && S === "user") { pita(); liveUpdate(); if (aktifHari().length) pollDepan(); } });
  window.PK = {harini: harini, urusan: urusanChat, pengantar: pengantarChat, aksi: aksi, state: ST, gabung: gabung, acCari: acCari};
}
init();
})();
