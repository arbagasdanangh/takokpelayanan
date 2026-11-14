"use strict";
/* Tab admin "Pengunjung" (superuser): dasbor statistik ala Histats.
   Data dari /api/admin/visitor. Penyegaran otomatis tiap 20 detik hanya memakai endpoint ringan (?live=1). */
(function () {
var D = document;
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var N = function (n) { return Number(n || 0).toLocaleString("id-ID"); };
var $v = function (i) { return D.getElementById(i); };
var H = 30, DATA = null, TMR = null;
var PAL = ["#1a46b5", "#ffb800", "#ef4444", "#16a34a", "#8b5cf6", "#0ea5e9"];
var BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
var DN = null; try { DN = new Intl.DisplayNames(["id"], {type: "region"}); } catch (e) { DN = null; }

function bendera(cc) { return /^[A-Z]{2}$/.test(cc) && cc !== "??" ? String.fromCodePoint(127397 + cc.charCodeAt(0), 127397 + cc.charCodeAt(1)) : "\uD83C\uDF10"; }
function negara(cc) { if (!/^[A-Z]{2}$/.test(cc) || cc === "??") return "Tidak diketahui"; try { return (DN && DN.of(cc)) || cc; } catch (e) { return cc; } }
function lalu(t) {
  var s = Math.max(0, Math.round(Date.now() / 1000 - t));
  return s < 60 ? s + " dtk lalu" : s < 3600 ? Math.floor(s / 60) + " mnt lalu" : s < 86400 ? Math.floor(s / 3600) + " jam lalu" : Math.floor(s / 86400) + " hari lalu";
}
function tglPanjang(k) { return k && k.length === 8 ? +k.slice(6) + " " + BLN[+k.slice(4, 6) - 1] + " " + k.slice(0, 4) : "-"; }
function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }
function namaSumber(k) { return k === "Langsung" ? "Langsung" : k.indexOf("utm:") === 0 ? "Kampanye: " + k.slice(4) : k; }

function bar(label, v, mx, sub) {
  var w = mx ? Math.max(2, v / mx * 100) : 0;
  return '<div class="anr"><span class="anl" title="' + E(label) + '">' + E(label) + '</span><div class="bar2 anb" role="img" aria-label="' + E(label) + ': ' + v + '"><i style="width:' + w + '%"></i></div><b class="anv">' + N(v) + '</b>' + (sub ? '<small class="sys">' + sub + '</small>' : '') + '</div>';
}
function daftar(arr, fmt, tot) {
  if (!arr || !arr.length) return '<span class="sys">Belum ada data pada periode ini.</span>';
  var mx = arr[0].n;
  return arr.map(function (x) { return bar(fmt ? fmt(x.k) : x.k, x.n, mx, tot ? pct(x.n, tot) + "% dari kunjungan" : ""); }).join("");
}
function seg(arr, fmt) {
  var tot = arr.reduce(function (a, x) { return a + x.n; }, 0);
  if (!tot) return '<span class="sys">Belum ada data pada periode ini.</span>';
  return '<div class="vs-seg" role="img" aria-label="' + E(arr.map(function (x) { return (fmt ? fmt(x.k) : x.k) + " " + pct(x.n, tot) + "%"; }).join(", ")) + '">' +
    arr.map(function (x, i) { return '<i style="width:' + (x.n / tot * 100) + '%;background:' + PAL[i % PAL.length] + '" title="' + E(fmt ? fmt(x.k) : x.k) + ': ' + x.n + '"></i>'; }).join("") + '</div>' +
    '<div class="vs-leg">' + arr.map(function (x, i) { return '<span><i style="background:' + PAL[i % PAL.length] + '"></i>' + E(fmt ? fmt(x.k) : x.k) + ' <b>' + N(x.n) + '</b> (' + pct(x.n, tot) + '%)</span>'; }).join("") + '</div>';
}
function grafikHarian(h) {
  var W = 640, T = 170, pad = 28, mx = Math.max.apply(null, h.map(function (x) { return Math.max(x.pv, x.uv); }).concat([1])), n = h.length, bw = (W - pad) / n, o = "";
  if (h.every(function (x) { return !x.pv; })) return '<div class="empty">Belum ada kunjungan pada periode ini. Data mulai terkumpul sejak fitur ini dipasang.</div>';
  h.forEach(function (x, i) {
    var a = x.pv / mx * (T - 26), c = x.uv / mx * (T - 26), x0 = pad + i * bw + bw * 0.1, w = bw * 0.4;
    o += '<g><title>' + E(x.l) + ': ' + x.pv + ' tampilan halaman, ' + x.uv + ' pengunjung unik, ' + x.vis + ' kunjungan</title>' +
      '<rect x="' + x0 + '" y="' + (T - 18 - a) + '" width="' + w + '" height="' + Math.max(a, x.pv ? 2 : 0) + '" rx="2" fill="var(--acc)"/>' +
      '<rect x="' + (x0 + w + 1) + '" y="' + (T - 18 - c) + '" width="' + w + '" height="' + Math.max(c, x.uv ? 2 : 0) + '" rx="2" fill="var(--tick)"/></g>';
    if (n <= 14 || (n - 1 - i) % Math.ceil(n / 8) === 0) o += '<text x="' + (i === n - 1 ? W : pad + i * bw + bw / 2) + '" y="' + (T - 4) + '" text-anchor="' + (i === n - 1 ? "end" : "middle") + '" font-size="9" fill="var(--mute)">' + E(x.l) + '</text>';
  });
  o += '<text x="0" y="10" font-size="9" fill="var(--mute)">' + N(mx) + '</text><line x1="' + pad + '" x2="' + W + '" y1="' + (T - 18) + '" y2="' + (T - 18) + '" stroke="var(--line)"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + T + '" class="vs-chart" role="img" aria-label="Tampilan halaman dan pengunjung unik per hari">' + o + '</svg>' +
    '<div class="lgd"><span><i style="background:var(--acc)"></i>Tampilan halaman</span><span><i style="background:var(--tick)"></i>Pengunjung unik</span></div>';
}
function grafikJam(j) {
  var W = 640, T = 110, mx = Math.max.apply(null, j.concat([1])), bw = W / 24, o = "";
  if (!j.some(function (v) { return v; })) return '<span class="sys">Belum ada data pada periode ini.</span>';
  var top = j.indexOf(mx);
  j.forEach(function (v, i) {
    var hh = v / mx * (T - 24), p = (i < 10 ? "0" : "") + i;
    o += '<g><title>Pukul ' + p + '.00-' + p + '.59 WIB: ' + v + ' tampilan</title><rect x="' + (i * bw + 3) + '" y="' + (T - 16 - hh) + '" width="' + (bw - 6) + '" height="' + Math.max(hh, v ? 2 : 0) + '" rx="3" fill="' + (i === top ? "var(--tick)" : "var(--acc)") + '"/></g>';
    if (i % 3 === 0) o += '<text x="' + (i * bw + bw / 2) + '" y="' + (T - 3) + '" text-anchor="middle" font-size="9" fill="var(--mute)">' + p + '</text>';
  });
  o += '<line x1="0" x2="' + W + '" y1="' + (T - 16) + '" y2="' + (T - 16) + '" stroke="var(--line)"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + T + '" class="vs-hour" role="img" aria-label="Tampilan halaman per jam">' + o + '</svg>' +
    '<p class="sys" style="margin:4px 0 0">Jam WIB. Tersibuk pukul ' + (top < 10 ? "0" : "") + top + '.00 (' + N(mx) + ' tampilan dalam periode ini).</p>';
}
function kpi(v, t, s, idv, ids) {
  return '<div class="kpi" style="cursor:default"><span class="kv"' + (idv ? ' id="' + idv + '"' : "") + '>' + v + '</span><span>' + E(t) + '</span><small class="sys"' + (ids ? ' id="' + ids + '"' : "") + '>' + s + '</small></div>';
}
function subHari(x) { return N(x.pv) + " tampilan &middot; " + N(x.vis) + " kunjungan"; }
function umpan(list) {
  if (!list || !list.length) return '<div class="empty">Belum ada kunjungan tercatat.</div>';
  return list.map(function (x) {
    return '<div class="rc"><span class="vs-fl" aria-hidden="true">' + bendera(x.c) + '</span><span class="vs-bd"><b>' + E(x.k || negara(x.c)) + '</b>' + (x.k ? ' <small style="display:inline">' + E(negara(x.c)) + '</small>' : "") +
      '<small>' + E(x.v) + ' &middot; ' + E(x.b) + ' &middot; ' + E(x.o) + ' &middot; dari ' + E(namaSumber(x.r || "Langsung")) + '</small></span>' +
      '<span class="vs-rt"><span class="vs-pill' + (x.n ? "" : " k") + '">' + (x.n ? "baru" : "kembali") + '</span><br>' + E(lalu(x.t)) + '</span></div>';
  }).join("");
}

function render(el, j) {
  var k = j.kpi, p = k.periode, tot = p.vis;
  var rng = [7, 14, 30, 90].map(function (h) { return '<button type="button" class="chip" data-vsh="' + h + '" aria-pressed="' + (h === H) + '">' + h + ' hari</button>'; }).join("");
  el.innerHTML = '<div id="vs-root"><h2 class="sec">Statistik Pengunjung</h2>' +
    '<div class="hint" style="margin:0 0 10px">' + rng + '<button type="button" class="btn" id="vs-r">Muat ulang</button><button type="button" class="btn" id="vs-c">Unduh CSV</button></div>' +
    '<div class="vs-hero"><div class="vs-on" role="status"><i class="vs-dot" aria-hidden="true"></i><div><strong id="vs-on">' + N(j.online) + '</strong><small>online sekarang (5 menit terakhir)</small></div></div><span class="vs-ts" id="vs-ts"></span></div>' +
    '<div class="kpis">' + kpi(N(k.hari_ini.uv), "Pengunjung hari ini", subHari(k.hari_ini), "vs-k-uv", "vs-k-sub") + kpi(N(k.kemarin.uv), "Pengunjung kemarin", subHari(k.kemarin)) +
    kpi(N(p.uv), "Pengunjung " + p.hari + " hari", N(p.pv) + " tampilan &middot; " + N(p.vis) + " kunjungan") +
    kpi(N(k.total.uv), "Total pengunjung", N(k.total.pv) + " tampilan" + (k.total.sejak ? " sejak " + E(tglPanjang(k.total.sejak)) : "")) + '</div>' +
    '<h2 class="sec">Per hari</h2><div class="card">' + grafikHarian(j.harian) + '</div>' +
    '<h2 class="sec">Jam tersibuk</h2><div class="card">' + grafikJam(j.jam) + '</div>' +
    '<h2 class="sec">Dari mana dan siapa</h2><div class="vs-g2">' +
    '<div class="card"><h3>Sumber kunjungan</h3>' + daftar(j.sumber, namaSumber, tot) + '</div>' +
    '<div class="card"><h3>Negara</h3>' + daftar(j.negara, function (c) { return bendera(c) + " " + negara(c); }, tot) + '</div>' +
    '<div class="card"><h3>Kota</h3>' + daftar(j.kota, null, tot) + '</div>' +
    '<div class="card"><h3>Pengunjung baru dan kembali</h3>' + seg([{k: "Baru", n: p.baru}, {k: "Kembali", n: p.kembali}].filter(function (x) { return x.n; })) + '</div>' +
    '<div class="card"><h3>Perangkat</h3>' + seg(j.perangkat) + '</div>' +
    '<div class="card"><h3>Browser</h3>' + daftar(j.browser, null, tot) + '</div>' +
    '<div class="card"><h3>Sistem operasi</h3>' + daftar(j.os, null, tot) + '</div>' +
    '<div class="card"><h3>Fitur yang dibuka</h3>' + daftar(j.fitur) + '<span class="sys">Jumlah ketukan pada menu utama, Ruang Main, dan maskot.</span></div></div>' +
    '<h2 class="sec">Pengunjung terbaru</h2><div class="card vs-feed" id="vs-feed" aria-live="off">' + umpan(j.terbaru) + '</div>' +
    '<p class="vs-note">Statistik anonim: alamat IP tidak disimpan, ID pengunjung di-hash, admin yang sedang masuk dan bot tidak dihitung, dan pengunjung dengan Do Not Track aktif tidak dicatat. ' +
    '"Pengunjung" adalah perangkat/browser unik (perkiraan HyperLogLog, selisih sekitar 1%); satu orang dengan dua perangkat terhitung dua. "Kunjungan" adalah sesi tab baru. ' +
    'Lokasi berasal dari jaringan (negara dan kota perkiraan). Sumber "Langsung" juga mencakup WhatsApp dan aplikasi lain yang tidak mengirim perujuk. Hari dihitung menurut WIB.</p></div>';
  $v("vs-ts").textContent = "Diperbarui " + new Date().toLocaleTimeString("id-ID");
}

function tempel(l) {
  if (!$v("vs-root") || !l) return;
  $v("vs-on").textContent = N(l.online);
  $v("vs-k-uv").textContent = N(l.hari_ini.uv);
  $v("vs-k-sub").innerHTML = subHari(l.hari_ini);
  $v("vs-feed").innerHTML = umpan(l.terbaru);
  $v("vs-ts").textContent = "Diperbarui " + new Date().toLocaleTimeString("id-ID");
}
function denyut() {
  if (!$v("vs-root")) { clearInterval(TMR); TMR = null; return; }
  if (D.visibilityState !== "visible") return;
  api("/api/admin/visitor?live=1").then(tempel).catch(function () {});
}
function csvCel(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
function unduh() {
  if (!DATA) return;
  var rows = [["Tanggal", "Tampilan halaman", "Pengunjung unik", "Kunjungan"]].concat(DATA.harian.map(function (x) { return [x.d.slice(0, 4) + "-" + x.d.slice(4, 6) + "-" + x.d.slice(6), x.pv, x.uv, x.vis]; }));
  var a = D.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(function (r) { return r.map(csvCel).join(","); }).join("\r\n")], {type: "text/csv;charset=utf-8"}));
  a.download = "pengunjung-" + DATA.harian[0].d + "-" + DATA.harian[DATA.harian.length - 1].d + ".csv";
  D.body.appendChild(a); a.click(); a.remove();
}

window.aVs = async function (el) {
  DATA = await api("/api/admin/visitor?hari=" + H);
  render(el, DATA);
  el.onclick = function (e) {
    var b = e.target.closest && e.target.closest("[data-vsh],#vs-r,#vs-c"); if (!b) return;
    if (b.id === "vs-c") return unduh();
    if (b.dataset.vsh) H = +b.dataset.vsh;
    window.aX("vs");
  };
  clearInterval(TMR); TMR = setInterval(denyut, 20000);
};
})();
