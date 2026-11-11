"use strict";
/* Versi 36: Persyaratan per loket.
   Data: kolom "Persyaratan" tiap loket (diisi admin di Admin > Loket; Dishub, BPJS, SKCK punya isi awal yang ditandai belum diverifikasi).
   Format baris: "# Judul layanan" membuka kelompok baru; baris lain = dokumen/syarat. Centang disimpan di perangkat pemohon (localStorage "pk_sy"). */
(function () {
var $ = function (i) { return document.getElementById(i); };
function ent(k) { return window.entryOf ? entryOf(k) : null; }
function grup(k) {
  var e = ent(k), L = (e && e[9]) || [], G = [], cur = null;
  L.forEach(function (x) {
    if (/^#\s*/.test(x)) { cur = {t: x.replace(/^#\s*/, "").trim(), items: []}; G.push(cur); }
    else if (x.trim()) { if (!cur) { cur = {t: "", items: []}; G.push(cur); } cur.items.push(x.trim()); }
  });
  return G.filter(function (g) { return g.items.length; });
}
function ada(k) { return grup(k).length > 0; }
function verif(k) { var e = ent(k); return !!(e && e[10]); }
function ck() { try { return JSON.parse(localStorage.getItem("pk_sy") || "{}") || {}; } catch (x) { return {}; } }
function simpan(o) { try { localStorage.setItem("pk_sy", JSON.stringify(o)); } catch (x) {} }
function gk(g, x) { return (g.t ? g.t + "|" : "") + x; }
function hitung(k) { var c = ck()[k] || {}, n = 0, m = 0; grup(k).forEach(function (g) { g.items.forEach(function (x) { m++; if (c[gk(g, x)]) n++; }); }); return {n: n, m: m}; }
/* Daftar bertanda untuk cetak/salin: [{t, items:[{x, ok}]}] */
function daftar(k) { var c = ck()[k] || {}; return grup(k).map(function (g) { return {t: g.t, items: g.items.map(function (x) { return {x: x, ok: !!c[gk(g, x)]}; })}; }); }
function lbl(k) { return window.label ? label(k) : k; }
function html(k, o) {
  o = o || {};
  var K = esc(k);
  if (!ada(k)) return '<div class="sy sy-kosong" data-sy-k="' + K + '"><b>Persyaratan belum diisi</b><small>Admin loket ini belum menuliskan daftar persyaratan. Tanyakan dulu agar tidak bolak-balik.</small>' + (window.openKey ? '<button type="button" class="btn" data-sy="tanya:' + K + '">Tanya admin loket</button>' : "") + '</div>';
  var G = grup(k), c = ck()[k] || {}, f = (o.fokus || []).map(function (w) { return String(w).toLowerCase(); }), t = hitung(k);
  var cocok = function (g) { return f.length && f.some(function (w) { return g.t.toLowerCase().indexOf(w) > -1; }); };
  var utama = G.filter(cocok), lain = G.filter(function (g) { return !cocok(g); });
  if (!utama.length) { utama = G; lain = []; }
  var blok = function (g) {
    return '<div class="sy-grp" data-gi="' + G.indexOf(g) + '">' + (g.t ? '<b class="sy-g">' + esc(g.t) + '</b>' : '') + g.items.map(function (x) {
      return '<label class="sy-i"><input type="checkbox" data-sy="ck:' + K + '" data-i="' + esc(gk(g, x)) + '"' + (c[gk(g, x)] ? " checked" : "") + '><span>' + esc(x) + '</span></label>';
    }).join("") + '</div>';
  };
  return '<div class="sy" data-sy-k="' + K + '"><div class="sy-h"><small class="sy-v' + (verif(k) ? '' : ' sy-no') + '">' + (verif(k) ? "✓ Terverifikasi admin loket" : "Panduan umum, belum diverifikasi loket. Pastikan ke loket sebelum berangkat.") + '</small><small class="sy-n" data-sy-n="' + K + '">' + t.n + ' dari ' + t.m + ' siap</small></div>' +
    (G.length > 1 && !f.length ? '<div class="sy-tab" role="group" aria-label="Pilih jenis izin"><span class="sys">Pilih jenis izin:</span><button type="button" class="chip" aria-pressed="true" data-sy="tab:-1">Semua (' + G.length + ')</button>' + G.map(function (g, i) { return '<button type="button" class="chip" aria-pressed="false" data-sy="tab:' + i + '">' + esc(g.t || "Umum") + ' (' + g.items.length + ')</button>'; }).join("") + '</div>' : "") +
    utama.map(blok).join("") + (lain.length ? '<details class="sy-lain"><summary>Layanan lain di loket ini (' + lain.length + ')</summary>' + lain.map(blok).join("") + '</details>' : "") + '</div>';
}
function teks(k) {
  var out = [];
  daftar(k).forEach(function (g) { if (g.t) out.push(g.t + ":"); g.items.forEach(function (x) { out.push((x.ok ? "[v] " : "[ ] ") + x.x); }); });
  return out;
}
document.addEventListener("change", function (e) {
  var b = e.target.closest && e.target.closest('input[data-sy^="ck:"]'); if (!b) return;
  var k = b.dataset.sy.slice(3), s = ck(); s[k] = s[k] || {};
  if (b.checked) s[k][b.dataset.i] = 1; else delete s[k][b.dataset.i];
  simpan(s); var t = hitung(k);
  [].forEach.call(document.querySelectorAll('[data-sy-n="' + k.replace(/"/g, "") + '"]'), function (n) { n.textContent = t.n + " dari " + t.m + " siap"; });
  [].forEach.call(document.querySelectorAll('input[data-sy="ck:' + k.replace(/"/g, "") + '"]'), function (i) { if (i.dataset.i === b.dataset.i) i.checked = b.checked; });
});
document.addEventListener("click", function (e) {
  var tb = e.target.closest && e.target.closest('[data-sy^="tab:"]');
  if (tb) {
    var w = tb.closest(".sy"), n = +tb.dataset.sy.slice(4); if (!w) return;
    [].forEach.call(w.querySelectorAll(".sy-tab .chip"), function (c) { c.setAttribute("aria-pressed", c === tb ? "true" : "false"); });
    [].forEach.call(w.querySelectorAll(".sy-grp"), function (g) { g.hidden = n >= 0 && +g.dataset.gi !== n; });
    return;
  }
  var b = e.target.closest && e.target.closest('[data-sy^="tanya:"]'); if (!b) return;
  var k = b.dataset.sy.slice(6); if (window.BOTI && BOTI.closeB) { try { BOTI.closeB(); } catch (x) {} } if (window.openKey) openKey(k);
});
window.SY = {grup: grup, ada: ada, verif: verif, html: html, daftar: daftar, teks: teks, hitung: hitung};
})();
