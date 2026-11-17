"use strict";
/* Pembuat kode QR mandiri (mode byte, koreksi galat M, versi 1-10). Tanpa pustaka luar.
   TKQR.matrix(teks) -> array 2D boolean; TKQR.svg(teks,{skala,margin}) -> string SVG; TKQR.canvas(teks,{skala,margin}) -> canvas */
(function (G) {
/* [total kodeword, ec per blok, blok grup1, data grup1, blok grup2, data grup2] untuk ECC M */
var VER = [null, [26, 10, 1, 16, 0, 0], [44, 16, 1, 28, 0, 0], [70, 26, 1, 44, 0, 0], [100, 18, 2, 32, 0, 0], [134, 24, 2, 43, 0, 0], [172, 16, 4, 27, 0, 0], [196, 18, 4, 31, 0, 0], [242, 22, 2, 38, 2, 39], [292, 22, 3, 36, 2, 37], [346, 26, 4, 43, 1, 44]];
var ALN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
var EXP = new Array(512), LOG = new Array(256);
(function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
function gmul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
function rsGen(n) { var p = [1]; for (var i = 0; i < n; i++) { var q = new Array(p.length + 1).fill(0); for (var j = 0; j < p.length; j++) { q[j] ^= p[j]; q[j + 1] ^= gmul(p[j], EXP[i]); } p = q; } return p; }
function rsRem(data, n) { var g = rsGen(n), r = new Array(n).fill(0); data.forEach(function (d) { var f = d ^ r.shift(); r.push(0); for (var i = 0; i < n; i++) r[i] ^= gmul(g[i + 1], f); }); return r; }
function utf8(s) { return Array.prototype.slice.call(unescape(encodeURIComponent(s))).map(function (c) { return c.charCodeAt(0); }); }

function bitsData(bytes, v) {
  var info = VER[v], cap = info[2] * info[3] + info[4] * info[5], bits = [];
  var put = function (val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
  put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  var out = []; for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = x << 1 | bits[i + j]; out.push(x); }
  for (var pad = 0xEC; out.length < cap; pad ^= 0xEC ^ 0x11) out.push(pad);
  return out;
}
function interleave(data, v) {
  var info = VER[v], ecn = info[1], blocks = [], pos = 0, i;
  for (i = 0; i < info[2]; i++) { blocks.push(data.slice(pos, pos + info[3])); pos += info[3]; }
  for (i = 0; i < info[4]; i++) { blocks.push(data.slice(pos, pos + info[5])); pos += info[5]; }
  var ecs = blocks.map(function (b) { return rsRem(b, ecn); }), out = [], max = Math.max(info[3], info[5]);
  for (i = 0; i < max; i++) blocks.forEach(function (b) { if (i < b.length) out.push(b[i]); });
  for (i = 0; i < ecn; i++) ecs.forEach(function (e) { out.push(e[i]); });
  return out;
}
function bch(val, poly, nbits, gbits) { var r = val; for (var i = 0; i < gbits; i++) r = (r << 1) ^ ((r >>> (nbits - 1)) * poly); return r; }
function build(bytes, force) {
  var v = 1; while (v <= 10) { var inf = VER[v], cap = inf[2] * inf[3] + inf[4] * inf[5]; if (bytes.length + 2 + (v < 10 ? 0 : 1) <= cap) break; v++; }
  if (v > 10) throw new Error("Teks terlalu panjang untuk kode QR (maks sekitar 210 karakter).");
  var cw = interleave(bitsData(bytes, v), v), n = 17 + 4 * v;
  var M = [], F = [], i, j; for (i = 0; i < n; i++) { M.push(new Array(n).fill(false)); F.push(new Array(n).fill(false)); }
  function set(x, y, d) { M[y][x] = d; F[y][x] = true; }
  function finder(cx, cy) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var xx = cx + dx, yy = cy + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; var d = Math.max(Math.abs(dx), Math.abs(dy)); set(xx, yy, d !== 2 && d !== 4); } }
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
  for (i = 0; i < n; i++) { if (!F[6][i]) set(i, 6, i % 2 === 0); if (!F[i][6]) set(6, i, i % 2 === 0); }
  var al = ALN[v]; al.forEach(function (cy, a) { al.forEach(function (cx, b) { if ((a === 0 && b === 0) || (a === 0 && b === al.length - 1) || (a === al.length - 1 && b === 0)) return; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }); });
  /* area format/versi dipesan dulu */
  function fmt(mask) {
    var d = mask, bits = ((d << 10) | bch(d, 0x537, 10, 10)) ^ 0x5412, k; /* ECC M = 00 */
    var b = function (t) { return ((bits >>> t) & 1) === 1; };
    for (k = 0; k <= 5; k++) set(8, k, b(k)); set(8, 7, b(6)); set(8, 8, b(7)); set(7, 8, b(8)); for (k = 9; k < 15; k++) set(14 - k, 8, b(k));
    for (k = 0; k < 8; k++) set(n - 1 - k, 8, b(k)); for (k = 8; k < 15; k++) set(8, n - 15 + k, b(k)); set(8, n - 8, true);
  }
  fmt(0);
  if (v >= 7) { var vb = (v << 12) | bch(v, 0x1F25, 12, 12); for (i = 0; i < 18; i++) { var bit = ((vb >>> i) & 1) === 1, a = n - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); } }
  /* tempatkan kodeword zigzag */
  var bi = 0, total = cw.length * 8;
  for (var right = n - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (var vert = 0; vert < n; vert++) for (j = 0; j < 2; j++) { var x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert; if (!F[y][x] && bi < total) { M[y][x] = ((cw[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; } } }
  var best = null, bestS = 1e9;
  for (var mk = force == null ? 0 : force; mk < (force == null ? 8 : force + 1); mk++) {
    var C = M.map(function (r) { return r.slice(); });
    for (var y2 = 0; y2 < n; y2++) for (var x2 = 0; x2 < n; x2++) { if (F[y2][x2]) continue; var inv; switch (mk) { case 0: inv = (x2 + y2) % 2 === 0; break; case 1: inv = y2 % 2 === 0; break; case 2: inv = x2 % 3 === 0; break; case 3: inv = (x2 + y2) % 3 === 0; break; case 4: inv = (Math.floor(x2 / 3) + Math.floor(y2 / 2)) % 2 === 0; break; case 5: inv = x2 * y2 % 2 + x2 * y2 % 3 === 0; break; case 6: inv = (x2 * y2 % 2 + x2 * y2 % 3) % 2 === 0; break; default: inv = ((x2 + y2) % 2 + x2 * y2 % 3) % 2 === 0; } if (inv) C[y2][x2] = !C[y2][x2]; }
    var sv = M; M = C; fmt(mk); var s = nilai(C, n); if (s < bestS) { bestS = s; best = C.map(function (r) { return r.slice(); }); } M = sv;
  }
  return best;
}
function nilai(C, n) {
  var s = 0, x, y, run, i;
  for (var pass = 0; pass < 2; pass++) for (y = 0; y < n; y++) { run = 1; for (x = 1; x < n; x++) { var a = pass ? C[x][y] : C[y][x], b = pass ? C[x - 1][y] : C[y][x - 1]; if (a === b) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
  for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) if (C[y][x] === C[y][x + 1] && C[y][x] === C[y + 1][x] && C[y][x] === C[y + 1][x + 1]) s += 3;
  var dark = 0; for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (C[y][x]) dark++; s += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return s;
}
var API = {
  matrix: function (t, mask) { return build(utf8(String(t)), mask); },
  svg: function (t, o) { o = o || {}; var m = API.matrix(t), n = m.length, q = o.margin == null ? 4 : o.margin, sz = n + 2 * q, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + sz + " " + sz + '" width="' + (o.skala ? sz * o.skala : "100%") + '" shape-rendering="crispEdges" role="img" aria-label="' + (o.label || "Kode QR") + '"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>'; },
  canvas: function (t, o) { o = o || {}; var m = API.matrix(t), n = m.length, q = o.margin == null ? 4 : o.margin, k = o.skala || 8, cv = document.createElement("canvas"); cv.width = cv.height = (n + 2 * q) * k; var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = "#000"; for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) c.fillRect((x + q) * k, (y + q) * k, k, k); return cv; }
};
G.TKQR = API;
})(typeof window !== "undefined" ? window : globalThis);
