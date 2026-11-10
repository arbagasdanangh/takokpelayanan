"use strict";
/* Pandu Zona: pencarian instansi/loket di semua lokasi (SPP Pusat, Nambangan, Pakal, Menur, Joyoboyo, MPP Surabaya) dan Zona MPP,
   dengan pola yang sama seperti pencarian KBLI. Ketik kebutuhan (mis. "pajak", "bpjs", "cerai", "sertifikat tanah") atau "zona 4".
   Memakai data loket yang sudah dimuat aplikasi dan aturan Kata cari; berjalan di browser. */
(function () {
var O = null, Q = "", FL = "", $ = function (i) { return document.getElementById(i); };
var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var ZC = {"Zona 1": "#0e9aa7", "Zona 2": "#c026d3", "Zona 3": "#84cc16", "Zona 4": "#ef4444", "Zona 5": "#22c55e"};
var SYN = {pajak: "pajak bapenda", pbb: "pajak bapenda", tanah: "pertanahan", sertifikat: "pertanahan", skck: "polrestabes polisi", polisi: "polrestabes", narkoba: "bnn", paket: "pos", surat: "pos", air: "pdam", ledeng: "pdam", lowongan: "tenaga kerja bursa", kerja: "tenaga kerja bursa ketenagakerjaan", phk: "ketenagakerjaan", cerai: "pengadilan agama", nikah: "pengadilan agama", gugatan: "pengadilan negeri", sidang: "pengadilan kejaksaan", tilang: "kejaksaan", jaksa: "kejaksaan", sehat: "bpjs kesehatan", berobat: "bpjs kesehatan", pensiun: "bpjs ketenagakerjaan", jht: "bpjs ketenagakerjaan", npwp: "pajak", bandara: "bandara otoritas", tender: "bpbjap pengadaan", lelang: "bpbjap pengadaan", nib: "oss", imb: "simbg pbg", pbg: "simbg", slf: "simbg"};
function tk(s) { return String(s).toLowerCase().match(/[a-z0-9]+/g) || []; }
function semua() {
  var o = []; (window.LOCS || []).forEach(function (l) { ((window.LD || {})[l.id] || []).forEach(function (d) { o.push({k: l.id + "_" + d[0], l: l, d: d, z: d[4] && /^Zona/.test(d[4]) ? d[4] : ""}); }); });
  return o;
}
function cari(q) {
  var A = semua(), m = String(q).toLowerCase().match(/zona\s*(\d)/), t = tk(q).filter(function (w) { return w !== "zona" && !/^\d$/.test(w) || !m; });
  if (m) A = A.filter(function (x) { return x.z === "Zona " + m[1]; });
  if (!t.length) return {r: A, zona: m ? "Zona " + m[1] : ""};
  var ex = t.slice(); t.forEach(function (w) { if (SYN[w]) ex = ex.concat(tk(SYN[w])); });
  var rule = {}; try { if (window.kataHit) window.kataHit(q).k.forEach(function (k, i) { rule[k] = 10 - i; }); } catch (x) {}
  var R = A.map(function (x) {
    var nm = x.d[1].toLowerCase(), hay = (x.d[1] + " " + x.d[2] + " " + x.d[3] + " " + x.l.nm).toLowerCase(), s = rule[x.k] || 0;
    t.forEach(function (w) { if (nm.indexOf(w) > -1) s += 6; else if (hay.indexOf(w) > -1) s += 2; });
    ex.slice(t.length).forEach(function (w) { if (nm.indexOf(w) > -1) s += 4; });
    return {x: x, s: s};
  }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).map(function (r) { return r.x; });
  return {r: R, zona: m ? "Zona " + m[1] : ""};
}
function badge(x) { return '<span class="kz-b" style="' + (x.z && ZC[x.z] ? "background:" + ZC[x.z] + ";color:#fff" : "") + '">' + e(x.z ? x.l.nm + " · " + x.z : x.l.nm) + '</span>'; }
function kartu(x) {
  var u = String(x.d[2] || "").replace(/\s+/g, " "); u = u.length > 150 ? u.slice(0, 148) + "…" : u;
  return '<div class="kp-c"><div class="kp-h"><b class="kp-k">No. ' + e(x.d[0]) + '</b><span>' + e(x.d[1]) + '</span></div><div style="margin:4px 0">' + badge(x) + '</div><p class="kp-u">' + e(u) + '</p><small class="sys">Sistem: ' + e(x.d[3] || "-") + (x.d[7] ? " · Jam: " + e(x.d[7]) : "") + '</small>' +
    '<div class="btns"><button type="button" class="send" data-kz="buka" data-k="' + e(x.k) + '">Buka loket</button><button type="button" class="btn" data-kz="tanya" data-n="' + e(x.d[1]) + '">Tanya Asisten</button></div></div>';
}
function ringkasan() {
  var A = semua(), z = {}, l = {}; A.forEach(function (x) { l[x.l.id] = (l[x.l.id] || 0) + 1; if (x.z) z[x.z] = (z[x.z] || 0) + 1; });
  var zs = Object.keys(z).sort();
  return '<div class="kz-g"><small class="sys">Telusuri per zona MPP</small><div class="kz-row">' + zs.map(function (k) { return '<button type="button" class="chip" style="border-left:5px solid ' + (ZC[k] || "#1a46b5") + '" data-kz="zona" data-z="' + e(k) + '">' + e(k) + ' <small>' + z[k] + ' instansi</small></button>'; }).join("") + '</div>' +
    '<small class="sys">Atau per lokasi layanan</small><div class="kz-row">' + (window.LOCS || []).map(function (L) { return '<button type="button" class="chip" data-kz="lok" data-l="' + e(L.id) + '">' + e(L.nm) + ' <small>' + (l[L.id] || 0) + '</small></button>'; }).join("") + '</div></div>';
}
function hasil() {
  var A = semua(); if (!A.length) return '<small class="sys">Data loket sedang dimuat…</small>';
  var t = Q.trim(), R;
  if (FL) { R = A.filter(function (x) { return x.l.id === FL || x.z === FL; }); if (t) { var c = cari(t).r.map(function (x) { return x.k; }); R = R.filter(function (x) { return c.indexOf(x.k) > -1; }); } }
  else if (!t) return '<small class="sys">Ketik kebutuhan Anda: <i>pajak</i>, <i>BPJS</i>, <i>cerai</i>, <i>sertifikat tanah</i>, <i>SKCK</i>, atau <i>zona 4</i>.</small>' + ringkasan();
  else R = cari(t).r;
  var head = FL ? '<div class="kz-f"><b>' + e(FL.indexOf("Zona") === 0 ? FL : ((window.LOCS || []).filter(function (L) { return L.id === FL; })[0] || {nm: FL}).nm) + '</b> · ' + R.length + ' instansi <button type="button" class="chip" data-kz="lepas">Hapus saringan</button></div>' : "";
  return head + (R.length ? R.slice(0, 20).map(kartu).join("") + (R.length > 20 ? '<small class="sys">Menampilkan 20 teratas. Persempit kata kunci.</small>' : "") : '<small class="sys">Belum ketemu. Coba kata lain atau nama instansi.</small>' + ringkasan());
}
function paint() { var r = $("kzr"); if (r) r.innerHTML = hasil(); }
function buka(q0) {
  if (O) return; Q = typeof q0 === "string" ? q0 : ""; FL = "";
  O = document.createElement("div"); O.id = "kz"; O.setAttribute("role", "dialog"); O.setAttribute("aria-modal", "true"); O.setAttribute("aria-label", "Pandu Zona");
  O.innerHTML = '<div class="kp-w"><div class="kp-top"><div><small>Takok</small><h2>Pandu Zona &amp; Instansi</h2></div><button type="button" class="btn" data-kz="tutup">Tutup</button></div><p class="sys">Cari instansi atau loket di semua lokasi layanan dan Zona MPP Surabaya. Contoh: "bayar pajak", "BPJS", "gugat cerai".</p>' +
    '<input class="si" id="kzq" type="search" placeholder="Anda perlu urus apa? atau ketik: zona 4" autocomplete="off" aria-label="Cari instansi atau zona"><div id="kzr" class="kp-r"></div></div>';
  document.body.appendChild(O); document.body.style.overflow = "hidden"; var i = $("kzq"); i.value = Q; i.focus(); paint();
  i.addEventListener("input", function () { Q = i.value; paint(); });
  O.addEventListener("click", klik); O.addEventListener("keydown", function (ev) { if (ev.key === "Escape") tutup(); });
}
function tutup() { if (!O) return; O.remove(); O = null; document.body.style.overflow = ""; }
function klik(ev) {
  var b = ev.target.closest && ev.target.closest("[data-kz]"); if (!b) return; var a = b.dataset.kz;
  if (a === "tutup") tutup();
  else if (a === "zona") { FL = b.dataset.z; Q = ""; $("kzq").value = ""; paint(); }
  else if (a === "lok") { FL = b.dataset.l; Q = ""; $("kzq").value = ""; paint(); }
  else if (a === "lepas") { FL = ""; paint(); }
  else if (a === "buka") { var k = b.dataset.k; tutup(); if (window.openKey) openKey(k); }
  else if (a === "tanya") { var n = b.dataset.n; tutup(); if (window.openAsisten) { openAsisten(); setTimeout(function () { if (window.askAsisten) askAsisten("Dokumen dan syarat layanan " + n); }, 150); } }
}
document.addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("#t11")) buka(); });
window.PanduZona = {buka: buka, cari: cari};
})();
