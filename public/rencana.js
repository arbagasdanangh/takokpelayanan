"use strict";
/* Versi 52 (canggih): Perencana Kunjungan Cerdas. Semua dihitung di perangkat dari data loket yang sudah dimuat (nama, uraian, zona, jam, syarat).
   1. Pencarian tahan salah ketik (TF-IDF + kemiripan trigram + sinonim) dan pengenalan banyak kebutuhan sekaligus ("bikin NIB dan KK").
   2. Urutan kunjungan otomatis: deteksi layanan yang menjadi syarat layanan lain (urut topologis), pengelompokan zona, bisa diatur manual.
   3. Jadwal per hari dengan batas jam tutup 14.00 (otomatis pindah ke hari kerja berikutnya), perkiraan kasar waktu di loket.
   4. Daftar dokumen gabungan tanpa duplikat (berapa layanan yang membutuhkannya), bisa dicentang; salin, WhatsApp, unduh kalender.
   Perintah /rencana di Asisten. Tanpa perubahan server. Semua angka waktu hanyalah perkiraan, bukan janji layanan. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var MENIT = 25, JALAN = 5, TUTUP = 14 * 60, BUKA = 8 * 60, MAKS = 6, PK = "tk_rcn_p", CK = "tk_rcn_ck";
var STOP = {}; "mau saya ingin urus mengurus bikin buat membuat untuk dan di yang ke dengan apa cara bagaimana tolong mohon info pengen pingin nak sekaligus serta atau juga sama dari pada itu ini bisa gak tidak".split(" ").forEach(function (w) { STOP[w] = 1; });
var SIN = {kk: "kartu keluarga", ktp: "ktp elektronik", ktpel: "ktp elektronik", imb: "pbg", siup: "nib", tdp: "nib", sim: "surat izin mengemudi", skck: "catatan kepolisian", npwp: "pajak", akta: "pencatatan sipil", pbb: "pajak bumi bangunan", reklame: "iklan", domisili: "pindah", kia: "identitas anak"};
var GEN = {}; "pelayanan layanan loket izin surat permohonan pembuatan penerbitan pendaftaran perpanjangan pengurusan nomor penduduk dinas kantor unit bidang".split(" ").forEach(function (w) { GEN[w] = 1; });
var HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/* ---------- Mesin pencari ---------- */
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function tokens(s, ekspansi) {
  var out = []; norm(s).split(" ").forEach(function (w) { if (w.length < 2 || STOP[w]) return; out.push(w); if (ekspansi && SIN[w]) SIN[w].split(" ").forEach(function (x) { out.push(x); }); }); return out;
}
function tri(w) { var s = "  " + w + " ", o = {}; for (var i = 0; i < s.length - 2; i++) o[s.substr(i, 3)] = 1; return o; }
function dice(a, b) { var ka = Object.keys(a), n = 0; ka.forEach(function (k) { if (b[k]) n++; }); return ka.length + Object.keys(b).length ? 2 * n / (ka.length + Object.keys(b).length) : 0; }
var IDX = null, SIGI = "";
function semua() {
  var out = []; if (!window.LOCS || !window.LD) return out;
  LOCS.forEach(function (l) { (LD[l.id] || []).forEach(function (e) { if (e && e[1]) out.push({k: l.id + "_" + e[0], lokasi: l.nm || l.id, nm: String(e[1]), ur: String(e[2] || ""), zona: String(e[4] || ""), jam: String(e[7] || l.jam || ""), book: !!e[6], sy: (e[9] || []).join(" ")}); }); }); return out;
}
function indeks() {
  var all = semua(), sig = all.length + ":" + all.map(function (x) { return x.k; }).join(",").length; if (IDX && sig === SIGI) return IDX; SIGI = sig;
  var df = {}; all.forEach(function (d) {
    d.tn = {}; tokens(d.nm, false).forEach(function (w) { d.tn[w] = 1; }); d.tu = {}; tokens(d.ur + " " + d.lokasi, false).forEach(function (w) { d.tu[w] = 1; }); d.ts = {}; tokens(d.sy, false).forEach(function (w) { d.ts[w] = 1; });
    d.tr = Object.keys(d.tn).map(function (w) { return [w, tri(w)]; });
    var u = {}; [d.tn, d.tu, d.ts].forEach(function (m) { Object.keys(m).forEach(function (w) { u[w] = 1; }); }); Object.keys(u).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
  });
  IDX = {all: all, df: df, n: all.length || 1, by: {}}; all.forEach(function (d) { IDX.by[d.k] = d; }); return IDX;
}
function idf(ix, w) { return Math.log(1 + ix.n / (1 + (ix.df[w] || 0))); }
function skor(ix, d, q) {
  var s = 0; q.forEach(function (w) {
    var i = idf(ix, w) + .3, ex = d.tn[w];
    if (ex) s += 3 * i; if (d.tu[w]) s += 1.2 * i; if (d.ts[w]) s += .6 * i;
    if (!ex && w.length >= 3) { var best = 0, pre = false, tw = tri(w); d.tr.forEach(function (t) { if (t[0].indexOf(w) === 0) pre = true; var v = dice(tw, t[1]); if (v > best) best = v; }); if (pre) s += 1.6 * i; else if (w.length >= 4 && best >= .55) s += 2 * best * i; }
  }); return s;
}
function cari(teks, n) {
  var ix = indeks(), q = tokens(teks, true); if (!q.length || !ix.all.length) return [];
  return ix.all.map(function (d) { return {d: d, s: skor(ix, d, q)}; }).filter(function (x) { return x.s > .5; }).sort(function (a, b) { return b.s - a.s; }).slice(0, n || 6);
}
function kenali(teks) {
  var out = [], seen = {}; String(teks || "").split(/\s*(?:,|;|&|\+|\bdan\b|\bserta\b|\bsekaligus\b|\bsama\b)\s*/i).forEach(function (p) { if (!tokens(p, false).length) return; var r = cari(p, 1)[0]; if (r && r.s >= 1.2 && !seen[r.d.k]) { seen[r.d.k] = 1; out.push({bagian: p.trim(), d: r.d}); } }); return out;
}

/* ---------- Perencanaan ---------- */
function kerja(iso0, n) { var d = new Date(iso0 + "T12:00:00Z"), c = 0; while (c < n) { d.setUTCDate(d.getUTCDate() + 1); var w = d.getUTCDay(); if (w !== 0 && w !== 6) c++; } return d.toISOString().slice(0, 10); }
function hariKerja(iso0) { var d = new Date(iso0 + "T12:00:00Z"), w = d.getUTCDay(); while (w === 0 || w === 6) { d.setUTCDate(d.getUTCDate() + 1); w = d.getUTCDay(); } return d.toISOString().slice(0, 10); }
function tglTxt(iso0) { var d = new Date(iso0 + "T12:00:00Z"); return HARI[d.getUTCDay()] + ", " + d.getUTCDate() + " " + BLN[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
function jamTxt(m) { return String(Math.floor(m / 60)).padStart(2, "0") + "." + String(m % 60).padStart(2, "0"); }
function menit(k) {
  if (!window.SY) return MENIT; var g = SY.grup(k), m = 0; g.forEach(function (x) { var t = x.meta && x.meta.waktu, r = t && /(\d+)\s*(menit|jam)/i.exec(t); if (r) { var v = +r[1] * (/jam/i.test(r[2]) ? 60 : 1); if (v > 0 && v <= 180) m = Math.max(m, v); } }); return m || MENIT;
}
function berat(d) { var t = norm(d.nm); if (/\b(nib|akta|kartu keluarga|kk|ktp|npwp|domisili)\b/.test(t)) return 0; if (/laporan|lkpm|pajak|pbb|bayar/.test(t)) return 2; return 1; }
function butuh(a, b) { /* a perlu b lebih dulu? */
  if (a.k === b.k) return false; var sa = " " + norm(a.sy) + " ", na = tokens(a.nm, false), kat = tokens(b.nm, false).filter(function (w) { return w.length >= 3 && !GEN[w] && na.indexOf(w) < 0; });
  return kat.some(function (w) { return sa.indexOf(" " + w + " ") > -1; });
}
function urut(keys) {
  var ix = indeks(), nodes = keys.map(function (k) { return ix.by[k]; }).filter(Boolean), sisa = nodes.slice(), out = [], last = null, why = {};
  while (sisa.length) {
    var av = sisa.filter(function (a) { return !sisa.some(function (b) { return b !== a && butuh(a, b); }); }); if (!av.length) av = sisa.slice();
    av.sort(function (a, b) { return ((last && a.zona && a.zona === last.zona ? 0 : 1) - (last && b.zona && b.zona === last.zona ? 0 : 1)) || berat(a) - berat(b) || nodes.indexOf(a) - nodes.indexOf(b); });
    var p = av[0]; sisa.splice(sisa.indexOf(p), 1); out.push(p); last = p;
  }
  return out.map(function (d) { return d.k; });
}
function alasan(keys) {
  var ix = indeks(), o = {}; keys.forEach(function (k, i) { var a = ix.by[k]; if (!a) return; var dep = keys.slice(i + 1).map(function (x) { return ix.by[x]; }).filter(function (b) { return b && butuh(b, a); });
    if (dep.length) o[k] = "Diurus lebih dulu karena syarat " + dep[0].nm + " memuat dokumen ini."; else if (i > 0 && ix.by[keys[i - 1]] && ix.by[keys[i - 1]].zona && ix.by[keys[i - 1]].zona === a.zona) o[k] = "Satu zona dengan loket sebelumnya (" + a.zona + "), tidak perlu berpindah jauh."; }); return o;
}
function jadwal(keys, mulai, tgl) {
  var ix = indeks(), cur = mulai, hari = 0, st = [], prev = null;
  keys.forEach(function (k) { var d = ix.by[k]; if (!d) return; var dur = menit(k), jl = prev && prev.zona !== d.zona ? JALAN : 0;
    if (st.length && cur + jl + dur > TUTUP) { hari++; cur = BUKA; jl = 0; } else cur += jl;
    var a = cur; cur += dur; st.push({d: d, hari: hari, a: a, b: cur, dur: dur}); prev = d; });
  return st;
}
function dasar(x) { return norm(x).replace(/\b(fotokopi|fotocopy|foto kopi|copy|kopi|asli|legalisir|lembar|rangkap|lampiran|salinan|scan|berwarna|hitam putih|1|2|3|4)\b/g, " ").replace(/\s+/g, " ").trim(); }
function dokumen(keys) {
  var map = {}, ord = []; keys.forEach(function (k) { if (!window.SY) return; SY.grup(k).forEach(function (g) { g.items.forEach(function (x) { var b = dasar(x) || norm(x); if (!b) return; if (!map[b]) { map[b] = {b: b, v: [x], n: {}, }; ord.push(b); } if (map[b].v.indexOf(x) < 0) map[b].v.push(x); map[b].n[k] = 1; }); }); });
  return ord.map(function (b) { var m = map[b]; return {b: b, t: m.v.join(" / "), n: Object.keys(m.n).length}; }).sort(function (a, b) { return b.n - a.n; });
}

/* ---------- Penyimpanan ---------- */
var P = {sel: [], jam: "09:00", tgl: ""};
try { var p0 = JSON.parse(localStorage.getItem(PK) || "{}"); if (p0 && Array.isArray(p0.sel)) P.sel = p0.sel.slice(0, MAKS); if (p0 && /^\d\d:\d\d$/.test(p0.jam || "")) P.jam = p0.jam; if (p0 && /^\d{4}-\d\d-\d\d$/.test(p0.tgl || "")) P.tgl = p0.tgl; } catch (e) {}
function simpan() { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) {} }
function cks() { try { return JSON.parse(localStorage.getItem(CK) || "{}") || {}; } catch (e) { return {}; } }
function tglAwal() { var n = new Date(Date.now() + 7 * 36e5), t = n.toISOString().slice(0, 10), h = n.getUTCHours(); if (h >= 12) t = kerja(t, 1); t = hariKerja(t); return P.tgl && P.tgl >= t ? P.tgl : t; }
function jamMenit() { var m = /^(\d\d):(\d\d)$/.exec(P.jam) || [0, "09", "00"]; return Math.min(TUTUP - 20, Math.max(BUKA, +m[1] * 60 + +m[2])); }

/* ---------- Teks keluaran ---------- */
function rencanaTeks() {
  var st = jadwal(P.sel, jamMenit(), tglAwal()), dk = dokumen(P.sel), L = ["Rencana kunjungan layanan"], h = -1;
  st.forEach(function (s) { if (s.hari !== h) { h = s.hari; L.push("", "Hari " + (h + 1) + ": " + tglTxt(kerja(tglAwal(), h) === tglAwal() ? tglAwal() : kerja(tglAwal(), h))); } L.push(jamTxt(s.a) + "-" + jamTxt(s.b) + " " + s.d.nm + " (" + s.d.lokasi + (s.d.zona ? ", " + s.d.zona : "") + ")"); });
  if (dk.length) { L.push("", "Dokumen yang dibawa (" + dk.length + "):"); dk.forEach(function (x) { L.push("- " + x.t); }); }
  L.push("", "Waktu hanya perkiraan kasar. Pastikan syarat dan jam layanan ke loket."); return L.join("\n");
}
function salin(t) { try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return 1; }, function () { return 0; }); } catch (e) {} var ta = D.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;opacity:0"; D.body.appendChild(ta); ta.select(); var ok = 0; try { ok = D.execCommand("copy") ? 1 : 0; } catch (e) {} ta.remove(); return Promise.resolve(ok); }
function icsUnduh() {
  var st = jadwal(P.sel, jamMenit(), tglAwal()), p = function (n) { return String(n).padStart(2, "0"); }, f = function (d) { return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "T" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + "00Z"; };
  var x = function (v) { return String(v).replace(/[\\,;]/g, function (m) { return "\\" + m; }).replace(/\n/g, "\\n"); }, days = {}; st.forEach(function (s) { (days[s.hari] = days[s.hari] || []).push(s); });
  var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Takok Pelayanan//ID", "CALSCALE:GREGORIAN"];
  Object.keys(days).forEach(function (h) { var a = days[h], t0 = kerja(tglAwal(), +h) === tglAwal() ? tglAwal() : kerja(tglAwal(), +h), s = new Date(t0 + "T" + jamTxt(a[0].a).replace(".", ":") + ":00+07:00"), e = new Date(t0 + "T" + jamTxt(a[a.length - 1].b).replace(".", ":") + ":00+07:00");
    L.push("BEGIN:VEVENT", "UID:rcn-" + t0 + "-" + h + "@takok", "DTSTAMP:" + f(new Date()), "DTSTART:" + f(s), "DTEND:" + f(e), "SUMMARY:" + x("Kunjungan layanan terpadu (hari " + (+h + 1) + ")"), "DESCRIPTION:" + x(a.map(function (z) { return jamTxt(z.a) + " " + z.d.nm + " (" + z.d.lokasi + ")"; }).join("\n") + "\nWaktu hanya perkiraan kasar."), "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Satu jam lagi kunjungan layanan", "END:VALARM", "END:VEVENT"); });
  L.push("END:VCALENDAR");
  try { var u = URL.createObjectURL(new Blob([L.join("\r\n")], {type: "text/calendar;charset=utf-8"})), a = D.createElement("a"); a.href = u; a.download = "rencana-kunjungan.ics"; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); if (window.toast) toast("Berkas kalender diunduh."); } catch (z) { if (window.toast) toast("Perangkat ini tidak mengizinkan unduhan."); }
}

/* ---------- Tampilan ---------- */
var ov = null;
function tutup() { if (ov) { ov.remove(); ov = null; try { if (opener0) opener0.focus(); } catch (e) {} } }
var opener0 = null;
function dalamPlan() {
  var ix = indeks(), keys = P.sel.filter(function (k) { return ix.by[k]; }); if (keys.length !== P.sel.length) { P.sel = keys; simpan(); }
  if (!keys.length) return '<p class="rc-kosong">Belum ada layanan. Cari di atas, lalu ketuk untuk menambahkan (maksimal ' + MAKS + ').</p>';
  var st = jadwal(keys, jamMenit(), tglAwal()), al = alasan(keys), dk = dokumen(keys), ck = cks(), total = st.reduce(function (m, s) { return m + s.dur; }, 0), harin = st.length ? st[st.length - 1].hari + 1 : 1, siap = dk.filter(function (x) { return ck[x.b]; }).length, h = -1, o = "";
  st.forEach(function (s, i) {
    if (s.hari !== h) { h = s.hari; o += '<h3 class="rc-hr">Hari ' + (h + 1) + ' &middot; ' + E(tglTxt(kerja(tglAwal(), h) === tglAwal() ? tglAwal() : kerja(tglAwal(), h))) + '</h3>'; }
    var d = s.d, peringatan = []; if (window.SY && !SY.ada(d.k)) peringatan.push("Syarat belum tersedia di Takok"); else if (window.SY && !SY.verif(d.k)) peringatan.push("Syarat belum diverifikasi loket"); if (/\bsenin|selasa|rabu|kamis|jumat|sabtu|hari\b/i.test(d.jam) && d.jam) peringatan.push("Jam khusus: " + d.jam);
    o += '<div class="rc-st"><div class="rc-t"><b>' + jamTxt(s.a) + '</b><small>' + jamTxt(s.b) + '</small></div><div class="rc-c"><b>' + E(d.nm) + '</b><small>' + E(d.lokasi) + (d.zona ? " &middot; " + E(d.zona) : "") + ' &middot; &plusmn;' + s.dur + ' mnt</small>' + (al[d.k] ? '<em>' + E(al[d.k]) + '</em>' : "") + peringatan.map(function (w) { return '<em class="w">' + E(w) + '</em>'; }).join("") +
      '<div class="rc-a"><button type="button" class="chip" data-rc="up:' + E(d.k) + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Naikkan urutan">&uarr;</button><button type="button" class="chip" data-rc="down:' + E(d.k) + '"' + (i === st.length - 1 ? " disabled" : "") + ' aria-label="Turunkan urutan">&darr;</button>' + (d.book ? '<button type="button" class="chip" data-rc="bk:' + E(d.k) + '">Booking</button>' : "") + '<button type="button" class="chip" data-rc="del:' + E(d.k) + '" aria-label="Hapus dari rencana">Hapus</button></div></div></div>';
  });
  return '<div class="rc-sum"><div><strong>' + keys.length + '</strong><small>layanan</small></div><div><strong>' + harin + '</strong><small>hari</small></div><div><strong>&plusmn;' + total + '</strong><small>menit di loket</small></div><div><strong>' + dk.length + '</strong><small>dokumen</small></div></div>' +
    '<div class="rc-bar"><button type="button" class="btn" data-rc="auto">Urutkan otomatis</button></div>' + o +
    (dk.length ? '<h3 class="rc-hr">Dokumen gabungan <small>' + siap + ' dari ' + dk.length + ' siap</small></h3><div class="tpi-m" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(siap / dk.length * 100) + '"><i style="width:' + Math.round(siap / dk.length * 100) + '%" class="' + (siap === dk.length ? "hi" : "") + '"></i></div><ul class="rc-dk">' + dk.map(function (x, i) { return '<li><label><input type="checkbox" data-rc-ck="' + E(x.b) + '"' + (ck[x.b] ? " checked" : "") + '><span>' + E(x.t) + (x.n > 1 ? ' <em>dipakai di ' + x.n + ' layanan</em>' : "") + '</span></label></li>'; }).join("") + '</ul>' : '<p class="rc-kosong">Syarat belum tersedia untuk layanan terpilih. Tanyakan ke loket.</p>') +
    '<div class="btns rc-ac"><button type="button" class="send" data-rc="salin">Salin rencana</button><button type="button" class="btn" data-rc="wa">Kirim ke WhatsApp</button><button type="button" class="btn" data-rc="ics">Tambah ke kalender</button><button type="button" class="btn" data-rc="reset">Kosongkan</button></div><small class="sys">Perkiraan waktu bersifat kasar dan belum memperhitungkan antrean atau hari libur. Pastikan syarat dan jam layanan ke loket.</small>';
}
function hasilCari(q) {
  var el = $("rc-hasil"); if (!el) return; q = String(q || "").trim(); if (!q) { el.innerHTML = ""; return; }
  var kn = kenali(q), r = cari(q, 6), sel = {}; P.sel.forEach(function (k) { sel[k] = 1; });
  if (!indeks().all.length) { el.innerHTML = '<p class="rc-kosong">Data loket belum dimuat. Coba lagi sebentar.</p>'; return; }
  var mx = r.length ? r[0].s : 1, h = "";
  if (kn.length > 1) h += '<div class="rc-kn"><b>Saya mengenali ' + kn.length + ' kebutuhan:</b> ' + kn.map(function (x) { return E(x.bagian) + ' &rarr; ' + E(x.d.nm); }).join("; ") + '<button type="button" class="send" data-rc="semua:' + E(kn.map(function (x) { return x.d.k; }).join(",")) + '">Tambahkan semuanya</button></div>';
  h += r.length ? '<ul class="rc-rs">' + r.map(function (x) { return '<li><button type="button" data-rc="add:' + E(x.d.k) + '"' + (sel[x.d.k] ? " disabled" : "") + '><span><b>' + E(x.d.nm) + '</b><small>' + E(x.d.lokasi) + (x.d.zona ? " &middot; " + E(x.d.zona) : "") + '</small></span><i style="--w:' + Math.round(x.s / mx * 100) + '%" aria-hidden="true"></i><em>' + (sel[x.d.k] ? "Ditambahkan" : "Tambah") + '</em></button></li>'; }).join("") + '</ul>' : '<p class="rc-kosong">Tidak ada yang cocok. Coba kata lain, mis. "KTP", "izin usaha", atau "pajak".</p>';
  el.innerHTML = h;
}
function gambar() { var el = $("rc-plan"); if (el) el.innerHTML = dalamPlan(); }
function buka(keys, teks) {
  if (ov) { tutup(); } opener0 = D.activeElement;
  if (Array.isArray(keys) && keys.length) { P.sel = keys.filter(function (k, i, a) { return indeks().by[k] && a.indexOf(k) === i; }).slice(0, MAKS); simpan(); }
  ov = D.createElement("div"); ov.className = "pn-ov rc-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Perencana kunjungan");
  ov.innerHTML = '<div class="pn-box rc-box"><div class="au-h"><b>Perencana Kunjungan</b><button type="button" class="au-x" data-rc="x" aria-label="Tutup">&times;</button></div><p class="sys">Urus beberapa layanan sekaligus. Takok menyusun urutan loket, jadwal, dan daftar dokumen gabungan.</p>' +
    '<label class="dn-f"><b>Apa yang ingin diurus?</b><input id="rc-q" type="search" autocomplete="off" placeholder="Mis. bikin NIB dan kartu keluarga" aria-label="Cari layanan"></label><div id="rc-hasil" aria-live="polite"></div>' +
    '<div class="dn-r"><label class="dn-f"><b>Tanggal</b><input id="rc-tgl" type="date" value="' + tglAwal() + '"></label><label class="dn-f"><b>Jam mulai</b><input id="rc-jam" type="time" value="' + P.jam + '" min="08:00" max="13:30"></label></div><div id="rc-plan"></div></div>';
  D.body.appendChild(ov); gambar(); var q = $("rc-q"); if (teks) { q.value = teks; hasilCari(teks); } q.focus();
  q.addEventListener("input", function () { hasilCari(q.value); });
  $("rc-tgl").addEventListener("change", function (e) { if (/^\d{4}-\d\d-\d\d$/.test(e.target.value)) { P.tgl = hariKerja(e.target.value); e.target.value = P.tgl; simpan(); gambar(); } });
  $("rc-jam").addEventListener("change", function (e) { if (/^\d\d:\d\d$/.test(e.target.value)) { P.jam = e.target.value; simpan(); gambar(); } });
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov) tutup(); });
D.addEventListener("change", function (e) { var c = e.target.closest && e.target.closest("[data-rc-ck]"); if (!c) return; var s = cks(); if (c.checked) s[c.dataset.rcCk] = 1; else delete s[c.dataset.rcCk]; try { localStorage.setItem(CK, JSON.stringify(s)); } catch (x) {} gambar(); });
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-rc]"); if (!b || b.disabled) return; var a = b.dataset.rc, i = a.indexOf(":"), c = i > -1 ? a.slice(0, i) : a, v = i > -1 ? a.slice(i + 1) : "";
  if (c === "buka") { buka(b.dataset.k ? b.dataset.k.split(",") : null, ""); return; }
  if (!ov) return;
  if (c === "x") tutup();
  else if (c === "add") { if (P.sel.indexOf(v) < 0) { if (P.sel.length >= MAKS) { if (window.toast) toast("Maksimal " + MAKS + " layanan per rencana."); return; } P.sel.push(v); simpan(); gambar(); hasilCari(($("rc-q") || {}).value); } }
  else if (c === "semua") { v.split(",").forEach(function (k) { if (P.sel.indexOf(k) < 0 && P.sel.length < MAKS) P.sel.push(k); }); P.sel = urut(P.sel); simpan(); gambar(); hasilCari(($("rc-q") || {}).value); }
  else if (c === "del") { P.sel = P.sel.filter(function (k) { return k !== v; }); simpan(); gambar(); hasilCari(($("rc-q") || {}).value); }
  else if (c === "up" || c === "down") { var j = P.sel.indexOf(v), t = c === "up" ? j - 1 : j + 1; if (j > -1 && t > -1 && t < P.sel.length) { var x = P.sel[j]; P.sel[j] = P.sel[t]; P.sel[t] = x; simpan(); gambar(); } }
  else if (c === "auto") { P.sel = urut(P.sel); simpan(); gambar(); if (window.toast) toast("Urutan disusun ulang."); }
  else if (c === "salin") salin(rencanaTeks()).then(function (ok) { if (window.toast) toast(ok ? "Rencana disalin." : "Tidak bisa menyalin di perangkat ini."); });
  else if (c === "wa") window.open("https://wa.me/?text=" + encodeURIComponent(rencanaTeks()), "_blank", "noopener,noreferrer");
  else if (c === "ics") icsUnduh();
  else if (c === "reset") { P.sel = []; simpan(); gambar(); hasilCari(($("rc-q") || {}).value); }
  else if (c === "bk") { tutup(); if (window.openKey) openKey(v); }
});

/* ---------- Asisten: /rencana ---------- */
function cmdRencana(arg) {
  var B = window.BOTI; if (!arg) return B.bot("Perencana Kunjungan menyusun urutan loket, jadwal, dan dokumen gabungan bila Anda mengurus beberapa layanan. Ketik mis. /rencana NIB dan kartu keluarga.", '<div class="bch"><button type="button" data-rc="buka">Buka perencana</button></div>');
  var kn = kenali(arg); if (!kn.length) return B.bot("Saya belum menemukan layanan yang cocok. Coba kata lain atau buka perencananya untuk mencari.", '<div class="bch"><button type="button" data-rc="buka">Buka perencana</button></div>');
  var keys = urut(kn.map(function (x) { return x.d.k; })), st = jadwal(keys, 9 * 60, tglAwal()), dk = dokumen(keys), tot = st.reduce(function (m, s) { return m + s.dur; }, 0), ix = indeks();
  return B.bot("Saya mengenali " + kn.length + " layanan. Urutan yang disarankan:", '<div class="bc2"><ol class="rc-ol">' + keys.map(function (k) { return '<li><b>' + E(ix.by[k].nm) + '</b><small>' + E(ix.by[k].lokasi) + '</small></li>'; }).join("") + '</ol><p class="sys">Perkiraan kasar &plusmn;' + tot + ' menit di loket' + (st.length && st[st.length - 1].hari > 0 ? ", terbagi " + (st[st.length - 1].hari + 1) + " hari" : "") + ', ' + dk.length + ' dokumen gabungan.</p><div class="ba"><button type="button" data-rc="buka" data-k="' + E(keys.join(",")) + '">Buka rencana lengkap</button></div></div>');
}
function pasangBot() {
  if (!window.BOTI || !window.BOTX || window.BOTX.__rc) return; window.BOTX.__rc = 1; var p0 = window.BOTX.pre;
  window.BOTX.pre = function (t, s) { var m = /^\/rencana\b\s*(.*)$/i.exec(t); if (m) return cmdRencana(m[1].trim()); return p0 ? p0(t, s) : null; };
}
setInterval(function () { try { pasangBot(); } catch (e) {} }, 1500); pasangBot();
window.Rencana = {cari: cari, kenali: kenali, urut: urut, jadwal: jadwal, dokumen: dokumen, buka: buka, _P: P};
})();
