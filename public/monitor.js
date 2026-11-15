"use strict";
/* Versi 62: Monitor layanan (grafik pemantauan langsung).
   Tab "Monitor" untuk admin dan superuser. Disegarkan otomatis tiap 30 detik selama tab terbuka (bisa dijeda).
   Admin loket hanya melihat data loketnya; superuser melihat tambahan chatbot, Ruang Main, berita, dan pengunjung online.
   Grafik digambar sebagai SVG tanpa library: area 24 jam, batang 14 hari, garis waktu balas, tolok SLA, dan donat chatbot. */
(function () {
var D = document;
function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
var C1 = "#2563eb", C2 = "#0d9488", C3 = "#d97706", C4 = "#c81e1e", GR = "rgba(120,130,160,.25)", TX = "#64748b";
var timer = 0, pause = false, host = null;

function nice(mx) { if (mx <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log(mx) / Math.LN10)), n = mx / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function frame(W, H, mx, labels, step) {
  var L = 30, R = 8, T = 8, B = 20, s = "", i, y;
  for (i = 0; i <= 4; i++) { y = T + (H - T - B) * (1 - i / 4); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="' + GR + '"/><text x="' + (L - 4) + '" y="' + (y + 3) + '" text-anchor="end" font-size="9" fill="' + TX + '">' + Math.round(mx * i / 4) + "</text>"; }
  var n = labels.length, iw = (W - L - R) / n;
  labels.forEach(function (l, k) { if (k % step === 0) s += '<text x="' + (L + iw * (k + 0.5)) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9" fill="' + TX + '">' + E(l) + "</text>"; });
  return {s: s, L: L, R: R, T: T, B: B, iw: iw};
}
function area(series, labels, W, H, step) {
  var mx = nice(Math.max.apply(null, [1].concat.apply([], series.map(function (s) { return s.v; })))), f = frame(W, H, mx, labels, step), n = labels.length, out = f.s;
  function X(k) { return f.L + f.iw * (k + 0.5); } function Y(v) { return f.T + (H - f.T - f.B) * (1 - v / mx); }
  series.forEach(function (s) {
    var pts = s.v.map(function (v, k) { return X(k).toFixed(1) + "," + Y(v || 0).toFixed(1); });
    out += '<path d="M' + X(0).toFixed(1) + "," + Y(0) + " L" + pts.join(" L") + " L" + X(n - 1).toFixed(1) + "," + Y(0) + ' Z" fill="' + s.c + '" opacity=".16"/><polyline points="' + pts.join(" ") + '" fill="none" stroke="' + s.c + '" stroke-width="2" stroke-linejoin="round"/>';
    s.v.forEach(function (v, k) { out += '<circle cx="' + X(k).toFixed(1) + '" cy="' + Y(v || 0).toFixed(1) + '" r="6" fill="transparent"><title>' + E(labels[k]) + " " + E(s.n) + ": " + (v || 0) + "</title></circle>"; });
  });
  return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Grafik area">' + out + "</svg>";
}
function bars(series, labels, W, H, step) {
  var mx = nice(Math.max.apply(null, [1].concat(labels.map(function (_, k) { return series.reduce(function (a, s) { return a + (s.v[k] || 0); }, 0); })))), f = frame(W, H, mx, labels, step), out = f.s, bw = Math.max(3, f.iw * 0.62);
  labels.forEach(function (l, k) {
    var y0 = H - f.B, x = f.L + f.iw * k + (f.iw - bw) / 2;
    series.forEach(function (s) { var v = s.v[k] || 0, h = (H - f.T - f.B) * v / mx; if (v) out += '<rect x="' + x.toFixed(1) + '" y="' + (y0 - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + s.c + '"><title>' + E(l) + " " + E(s.n) + ": " + v + "</title></rect>"; y0 -= h; });
  });
  return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Grafik batang">' + out + "</svg>";
}
function line(vals, labels, W, H, c, unit) {
  var ok = vals.filter(function (v) { return v != null; }); if (!ok.length) return '<p class="sys">Belum ada data waktu balas.</p>';
  var mx = nice(Math.max.apply(null, ok)), f = frame(W, H, mx, labels, 2), out = f.s, pts = [];
  function X(k) { return f.L + f.iw * (k + 0.5); } function Y(v) { return f.T + (H - f.T - f.B) * (1 - v / mx); }
  vals.forEach(function (v, k) { if (v != null) pts.push([X(k), Y(v), v, k]); });
  out += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>';
  pts.forEach(function (p) { out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" fill="' + c + '"><title>' + E(labels[p[3]]) + ": " + p[2] + " " + unit + "</title></circle>"; });
  return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Grafik garis">' + out + "</svg>";
}
function gauge(pct, label) {
  var p = Math.max(0, Math.min(100, pct || 0)), r = 52, cx = 70, cy = 66, a = Math.PI * (1 - p / 100), x = cx + r * Math.cos(a), y = cy - r * Math.sin(a), c = p >= 80 ? "#15803d" : p >= 60 ? C3 : C4;
  return '<svg viewBox="0 0 140 84" role="img" aria-label="' + E(label) + " " + p + ' persen"><path d="M18 66A52 52 0 0 1 122 66" fill="none" stroke="' + GR + '" stroke-width="12" stroke-linecap="round"/>' + (p > 0 ? '<path d="M18 66A52 52 0 0 1 ' + x.toFixed(1) + " " + y.toFixed(1) + '" fill="none" stroke="' + c + '" stroke-width="12" stroke-linecap="round"/>' : "") +
    '<text x="70" y="62" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">' + (pct == null ? "-" : p + "%") + '</text><text x="70" y="79" text-anchor="middle" font-size="9" fill="' + TX + '">' + E(label) + "</text></svg>";
}
function donut(a, b, la, lb) {
  var t = a + b, r = 40, c = 2 * Math.PI * r, f = t ? a / t : 0;
  return '<svg viewBox="0 0 140 100" role="img" aria-label="Donat"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + C3 + '" stroke-width="16" opacity=".85"/><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + C2 + '" stroke-width="16" stroke-dasharray="' + (c * f).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 50 50)"/>' +
    '<text x="50" y="55" text-anchor="middle" font-size="16" font-weight="800" fill="currentColor">' + (t ? Math.round(100 * f) + "%" : "-") + '</text><rect x="100" y="34" width="9" height="9" rx="2" fill="' + C2 + '"/><text x="113" y="42" font-size="9" fill="' + TX + '">' + E(la) + " " + a + '</text><rect x="100" y="54" width="9" height="9" rx="2" fill="' + C3 + '"/><text x="113" y="62" font-size="9" fill="' + TX + '">' + E(lb) + " " + b + "</text></svg>";
}
function leg(a) { return '<div class="mo-leg">' + a.map(function (x) { return '<span><i style="background:' + x[0] + '"></i>' + E(x[1]) + "</span>"; }).join("") + "</div>"; }
function dur(m) { return m == null ? "-" : m < 60 ? Math.round(m) + " mnt" : m < 1440 ? (m / 60).toFixed(1).replace(".0", "") + " jam" : (m / 1440).toFixed(1).replace(".0", "") + " hari"; }
function jam(t) { var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2); }
function kt(v, t, cls) { return '<div class="mo-k ' + (cls || "") + '"><b>' + E(v) + "</b><span>" + E(t) + "</span></div>"; }

function gambar(el, d) {
  var sj = d.jam.reduce(function (a, x) { return a + x.u; }, 0), sa = d.jam.reduce(function (a, x) { return a + x.a; }, 0), hr = d.harian[d.harian.length - 1] || {};
  var resp = d.harian.map(function (x) { return x.r; }), rv = resp.filter(function (v) { return v != null; });
  var sla = sj ? Math.min(100, Math.round(100 * sa / sj)) : null;
  var o = '<div class="mo-t noprint"><h2 class="sec" style="margin:0">Monitor layanan</h2><span class="sys"><span class="mo-live" aria-hidden="true"></span><span id="mo-ts">Diperbarui ' + jam(d.dibuat) + '</span></span><button type="button" class="chip" id="mo-p" aria-pressed="' + pause + '">' + (pause ? "Lanjutkan" : "Jeda") + '</button><button type="button" class="chip" id="mo-r">Segarkan</button></div>';
  o += '<div class="mo-al" role="status">' + d.alert.map(function (a) { return "<div><i style=\"background:" + (a.lv === "merah" ? C4 : a.lv === "kuning" ? C3 : "#16a34a") + '"></i><span>' + E(a.t) + "</span></div>"; }).join("") + "</div>";
  o += '<div class="mo-grid">' + kt(d.menunggu, "Menunggu balasan", d.menunggu > 5 ? "bad" : d.menunggu ? "warn" : "ok") + kt(dur(d.tertua_menit || null), "Antrean tertua", d.tertua_menit > 1440 ? "bad" : d.tertua_menit > 240 ? "warn" : "ok") + kt(d.aktif_1j, "Percakapan aktif 1 jam") + kt(sj, "Pesan warga 24 jam") + kt(sa, "Balasan admin 24 jam") + (d.super ? kt(d.online || 0, "Pengunjung online") : "") + "</div>";
  o += '<div class="mo-c"><h3>Pesan per jam (24 jam terakhir)</h3>' + area([{n: "Warga", v: d.jam.map(function (x) { return x.u; }), c: C1}, {n: "Admin", v: d.jam.map(function (x) { return x.a; }), c: C2}], d.jam.map(function (x) { return x.j; }), 560, 190, 3) + leg([[C1, "Pesan warga"], [C2, "Balasan admin"]]) + "</div>";
  o += '<div class="mo-g2"><div class="mo-c"><h3>Rasio balasan 24 jam</h3>' + gauge(sla, "balasan per pesan warga") + '<p class="sys" style="margin:4px 0 0">Mendekati 100% berarti admin mengimbangi pesan masuk.</p></div>' +
    '<div class="mo-c"><h3>Median waktu balas harian</h3>' + line(resp, d.harian.map(function (x) { return x.d; }), 360, 170, C4, "menit") + '<p class="sys" style="margin:4px 0 0">' + (rv.length ? "Terbaru " + rv[rv.length - 1] + " menit." : "") + "</p></div></div>";
  o += '<div class="mo-c"><h3>Pesan per hari (14 hari)</h3>' + bars([{n: "Warga", v: d.harian.map(function (x) { return x.u; }), c: C1}, {n: "Admin", v: d.harian.map(function (x) { return x.a; }), c: C2}], d.harian.map(function (x) { return x.d; }), 560, 190, 2) + leg([[C1, "Pesan warga"], [C2, "Balasan admin"]]) + "</div>";
  if (d.super && d.bot) {
    var h = d.bot.reduce(function (a, x) { return a + x.hit; }, 0), m = d.bot.reduce(function (a, x) { return a + x.miss; }, 0);
    o += '<div class="mo-g2"><div class="mo-c"><h3>Chatbot 14 hari</h3>' + donut(h, m, "Terjawab", "Tidak") + '</div><div class="mo-c"><h3>Chatbot per hari</h3>' + bars([{n: "Terjawab", v: d.bot.map(function (x) { return x.hit; }), c: C2}, {n: "Tidak terjawab", v: d.bot.map(function (x) { return x.miss; }), c: C3}], d.bot.map(function (x) { return x.d; }), 360, 170, 2) + leg([[C2, "Terjawab"], [C3, "Tidak terjawab"]]) + "</div></div>";
    o += '<div class="mo-g2"><div class="mo-c"><h3>Ruang Main per hari</h3>' + bars([{n: "Dimainkan", v: d.game.map(function (x) { return x.n; }), c: "#7c3aed"}], d.game.map(function (x) { return x.d; }), 360, 170, 2) + "</div>" +
      '<div class="mo-c"><h3>Berita paling banyak dibaca</h3>' + (d.berita && d.berita.length ? d.berita.map(function (b) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--line)"><span>' + E(b.judul) + "</span><b>" + b.n + "</b></div>"; }).join("") : '<p class="sys">Belum ada data baca.</p>') + "</div></div>";
  }
  o += '<p class="sys">Data dihitung dari percakapan yang dalam wewenang akun Anda. Waktu memakai zona WIB.</p>';
  el.innerHTML = o;
}
async function muat(el) {
  var d = await api("/api/admin/monitor");
  if (!el.isConnected) return;
  gambar(el, d);
}
function jadwal() {
  clearTimeout(timer);
  timer = setTimeout(async function () {
    if (!host || !host.isConnected || !host.querySelector("#mo-p")) return;
    if (!pause && !D.hidden) { try { await muat(host); } catch (e) {} }
    jadwal();
  }, 30000);
}
window.aMon = async function (el) {
  host = el; pause = false; await muat(el); jadwal();
  if (!el._mn) {
    el._mn = true;
    el.addEventListener("click", async function (e) {
      if (e.target.closest("#mo-p")) { pause = !pause; var b = $("mo-p"); b.setAttribute("aria-pressed", pause); b.textContent = pause ? "Lanjutkan" : "Jeda"; }
      else if (e.target.closest("#mo-r")) { try { await muat(el); } catch (x) {} }
    });
  }
  function $() { return D.getElementById.apply(D, arguments); }
};
})();
