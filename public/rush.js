"use strict";
/* Suroboyo Rush (Ruang Main): runner 3 jalur bergaya pseudo-3D. Cak Takok berlari di jalan Surabaya, mengambil berkas dan stempel,
   menghindari antrean panjang dan formulir salah. Langit berganti siang, senja, malam. Kontrol: geser, ketuk kiri/kanan, panah, A/D.
   Memakai pintu TKGM milik main.js (poin, lencana, tantangan harian). Tanpa library, tanpa data pribadi. */
(function () {
var API = window.TKGM; if (!API) return;
var W = 360, H = 480, CX = 180, HY = 150, PY = 410, LW = 112, SPAN = PY - HY;
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
var CUR = null, KEYS_ON = false;
var $ = function (i) { return document.getElementById(i); };
var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
var rnd = function (a, b) { return a + Math.random() * (b - a); };
function seeded(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hx(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mix(a, b, t) { var A = typeof a === "string" ? hx(a) : a, B = typeof b === "string" ? hx(b) : b; return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; }
function css(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a == null ? 1 : a) + ")"; }
function sm(t) { return t * t * (3 - 2 * t); }

/* Langit: siang -> senja -> malam -> (kembali siang) */
var SKY = [{t: "#3d9bff", b: "#bfe6ff"}, {t: "#5b3a8c", b: "#ff9a5a"}, {t: "#07122e", b: "#1b2f6e"}];
function sky(time) {
  var c = (time / 28) % 3, i = Math.floor(c), f = sm(c - i), a = SKY[i], b = SKY[(i + 1) % 3];
  var night = i === 2 ? 1 - f : i === 1 ? f : 0;
  return {t: mix(a.t, b.t, f), b: mix(a.b, b.b, f), night: night, dusk: i === 1 ? 1 - Math.abs(f - 0.5) * 2 : 0};
}

/* Kota: dua lapis gedung + Tugu Pahlawan (dibuat sekali, diulang tiap 720 px) */
var TW = 720, FAR = [], NEAR = [], STARS = [];
(function () {
  var R = seeded(47), x = 0;
  while (x < TW) { var w = 22 + R() * 30, h = 22 + R() * 50; FAR.push({x: x, w: w, h: h}); x += w + R() * 6; }
  x = 0; while (x < TW) { var w2 = 26 + R() * 34, h2 = 30 + R() * 62; NEAR.push({x: x, w: w2, h: h2, r: R()}); x += w2 + R() * 8; }
  for (var i = 0; i < 46; i++) STARS.push({x: R() * W, y: R() * (HY - 20), r: 0.5 + R() * 1.1, p: R() * 6});
})();
var TUGU_X = 330;
function tugu(ctx, x, col) {
  ctx.save(); ctx.translate(x, HY); ctx.scale(1.35, 1.35); ctx.translate(-x, -HY);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - 22, HY); ctx.lineTo(x - 22, HY - 7); ctx.lineTo(x - 12, HY - 9); ctx.lineTo(x - 7, HY - 18);
  ctx.lineTo(x - 5, HY - 62); ctx.lineTo(x - 2, HY - 96); ctx.lineTo(x, HY - 104); ctx.lineTo(x + 2, HY - 96);
  ctx.lineTo(x + 5, HY - 62); ctx.lineTo(x + 7, HY - 18); ctx.lineTo(x + 12, HY - 9); ctx.lineTo(x + 22, HY - 7); ctx.lineTo(x + 22, HY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
  for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 2.2, HY - 17); ctx.lineTo(x + k * 0.5, HY - 92); ctx.stroke(); }
  ctx.restore();
}

/* Proyeksi: jarak d (1 = posisi pemain) -> koordinat layar */
function py(d) { return HY + SPAN / d; }
function px(lane, d) { return CX + lane * LW / d; }

/* Bentuk */
var P_BUBBLE = typeof Path2D === "function" ? new Path2D("M12 8h56a10 10 0 0110 10v32a10 10 0 01-10 10H38l-14 14V60H12A10 10 0 012 50V18A10 10 0 0112 8z") : null;
var P_HEART = typeof Path2D === "function" ? new Path2D("M50 88C23 67 9 50 9 34a20 20 0 0 1 41-7 20 20 0 0 1 41 7c0 16-14 33-41 54z") : null;

/* ---------- Peringkat lokal (5 terbaik, hanya di perangkat ini) ---------- */
var TOPK = "tk_rush_top";
function topList() { try { var a = JSON.parse(localStorage.getItem(TOPK) || "[]"); return Array.isArray(a) ? a.filter(function (z) { return z && typeof z.s === "number"; }).slice(0, 5) : []; } catch (e) { return []; } }
function topAdd(sc, jarak) {
  var a = topList(), e = {s: sc, j: jarak, d: Date.now()}; a.push(e); a.sort(function (p, q) { return q.s - p.s; }); a = a.slice(0, 5);
  try { localStorage.setItem(TOPK, JSON.stringify(a)); } catch (x) {} return a.indexOf(e) + 1;
}
function tgl(ms) { try { return new Date(ms).toLocaleDateString("id-ID", {day: "numeric", month: "short"}); } catch (e) { return ""; } }

/* ---------- Menu ---------- */
function menu() {
  API.stopAll(); CUR = null; API.title("Suroboyo Rush");
  var g = API.G(), best = g.best.rs || 0;
  var leg = [["rs-i b", "Berkas", "+10 poin"], ["rs-i s", "Stempel emas", "+40 poin"], ["rs-i z", "Jalur Cepat", "kebal 5 detik"], ["rs-i h", "Hati", "+1 nyawa"], ["rs-i x", "Antrean / formulir salah", "kurangi nyawa"]];
  API.view(API.bar("Suroboyo Rush") +
    '<div class="rs-hero"><div class="rs-sky" aria-hidden="true"><i></i><i></i><i></i></div><small>BARU &middot; ARCADE</small><b>Suroboyo Rush</b><p>Lari bersama Cak Takok menyusuri jalan Surabaya. Ambil berkas, hindari antrean panjang, dan kejar kombo hingga x4. Siang berganti malam, kecepatan makin tinggi.</p>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-rs="go">Main sekarang</button></div><p class="sys" style="margin:8px auto 0">' + (best ? "Rekor Anda: <b>" + best + "</b> poin" : "Belum dimainkan") + '</p></div>' +
    '<h2>Isi jalan</h2><div class="rs-leg">' + leg.map(function (l) { return '<div><span class="' + l[0] + '" aria-hidden="true"></span><b>' + l[1] + '</b><small>' + l[2] + '</small></div>'; }).join("") + '</div>' +
    (topList().length ? '<h2>Peringkat di perangkat ini</h2><div class="rs-top">' + topList().map(function (z, i) { return '<div><span>' + (i + 1) + '</span><b>' + z.s + ' poin <small>&middot; ' + z.j + ' m</small></b><small>' + tgl(z.d) + '</small></div>'; }).join("") + '</div>' : "") +
    '<h2>Kontrol</h2><p class="sys">Geser jari ke kiri atau kanan, ketuk sisi layar, tombol panah, atau tombol A dan D. Dapat dimainkan tanpa suara; nyalakan Suara di bagian atas bila mau.</p>');
}

/* ---------- Permainan ---------- */
function play() {
  API.stopAll(); API.ping("rush"); API.title("Suroboyo Rush");
  API.view(API.bar("Suroboyo Rush", "Rekor " + (API.G().best.rs || 0)) +
    '<div class="tg rs-w"><canvas id="rsc" role="img" aria-label="Area permainan Suroboyo Rush"></canvas><div class="tg-ov" id="rso"><b>Siap lari?</b><small>Geser, ketuk sisi layar, atau pakai panah</small><button type="button" class="send" data-rs="start">Mulai</button></div></div>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="btn rs-b" data-d="-1" aria-label="Pindah ke kiri">&larr; Kiri</button><button type="button" class="btn rs-b" data-d="1" aria-label="Pindah ke kanan">Kanan &rarr;</button></div>');
  var c = $("rsc"), x = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  var S = {run: false, over: false, overT: 0, done: false, t: 0, pos: 0, v: 1.2, sc: 0, life: 3, combo: 0, maxC: 0, mult: 1, tl: 1, lx: 1, items: [], fx: [], tx: [], shake: 0, flash: 0, inv: 0, boost: 0, cd: 0, gap: 3.5, got: 0, last: 0, side: 0, c: c, x: x};
  CUR = S; installKeys();
  function move(d) { if (!S.run || S.over) return; var n = clamp(S.tl + d, 0, 2); if (n !== S.tl) { S.tl = n; API.beep(520 + n * 80, 0.05); } }
  S.move = move;
  var sx = null, sy = null;
  c.addEventListener("pointerdown", function (e) { try { c.setPointerCapture(e.pointerId); } catch (z) {} sx = e.clientX; sy = e.clientY; });
  c.addEventListener("pointerup", function (e) {
    if (sx == null) return; var dx = e.clientX - sx, r = c.getBoundingClientRect(); sx = null;
    if (Math.abs(dx) > 22) move(dx > 0 ? 1 : -1); else move((e.clientX - r.left) < r.width / 2 ? -1 : 1);
  });
  c.addEventListener("pointercancel", function () { sx = null; });
  [].forEach.call(document.querySelectorAll(".rs-b"), function (b) { b.onclick = function () { move(+b.dataset.d); }; });
  S.begin = function () { if (S.run) return; var o = $("rso"); if (o) o.hidden = true; S.run = true; S.cd = 2.4; S.last = 0; };
  requestAnimationFrame(function f(ts) { loop(S, ts, f); });
}

function installKeys() {
  if (KEYS_ON) return; KEYS_ON = true;
  document.addEventListener("keydown", function (e) {
    var S = CUR; if (!S || !document.body.contains(S.c)) return;
    var k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") { if (S.run) { S.move(-1); e.preventDefault(); } }
    else if (k === "ArrowRight" || k === "d" || k === "D") { if (S.run) { S.move(1); e.preventDefault(); } }
    else if ((k === " " || k === "Enter") && !S.run && !S.over && document.activeElement && document.activeElement.tagName !== "BUTTON") { S.begin(); e.preventDefault(); }
  });
}

/* ---------- Isi jalan ---------- */
function spawn(S) {
  var d0 = 7.2, tm = S.t, n = Math.random();
  var nob = n < 0.28 ? 0 : n < (tm > 25 ? 0.62 : 0.78) ? 1 : 2, lanes = [0, 1, 2], bad = [];
  while (bad.length < nob) bad.push(lanes.splice(Math.floor(Math.random() * lanes.length), 1)[0]);
  var free = [0, 1, 2].filter(function (l) { return bad.indexOf(l) < 0; });
  bad.forEach(function (l) { S.items.push({k: Math.random() < 0.55 ? "antre" : "salah", l: l, d: d0, ph: Math.random() * 6}); });
  free.forEach(function (l) {
    if (Math.random() > 0.62) return;
    var r = Math.random();
    if (r < 0.05) { S.items.push({k: "bolt", l: l, d: d0, ph: 0}); return; }
    if (r < 0.09 && S.life < 3) { S.items.push({k: "hati", l: l, d: d0, ph: 0}); return; }
    if (r < 0.2) { S.items.push({k: "stempel", l: l, d: d0, ph: 0}); return; }
    for (var i = 0; i < 3; i++) S.items.push({k: "berkas", l: l, d: d0 + i * 0.5, ph: i});
  });
}
function pop(S, x, y, col, n) { if (RM) n = Math.ceil(n / 3); for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, s = rnd(30, 150); S.fx.push({x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, l: rnd(0.35, 0.7), m: 0.7, c: col, r: rnd(1.5, 3.4)}); } }
function say(S, t, x, y, col) { S.tx.push({t: t, x: x, y: y, l: 0.9, c: col}); }

function loop(S, ts, f) {
  if (S !== CUR || !document.body.contains(S.c)) return;
  var dt = S.last ? Math.min(0.05, (ts - S.last) / 1000) : 0.016; S.last = ts; if (document.hidden) dt = 0;
  step(S, dt); draw(S);
  if (S.done) return;
  requestAnimationFrame(function (t2) { f(t2); });
}

function step(S, dt) {
  S.t += dt;
  var base = S.run ? (S.cd > 0 ? 1.4 : Math.min(4.4, 1.6 + (S.t - 2.4) * 0.045)) : 0.9;
  if (S.over) base = Math.max(0, base * (1 - S.overT * 1.2));
  var v = base * (S.boost > 0 ? 1.35 : 1);
  S.v = v; S.pos += v * dt; S.lx += (S.tl - S.lx) * Math.min(1, dt * 14);
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 30);
  if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.2);
  if (S.inv > 0) S.inv -= dt; if (S.boost > 0) S.boost -= dt;
  for (var i = S.fx.length - 1; i >= 0; i--) { var p = S.fx[i]; p.l -= dt; if (p.l <= 0) { S.fx.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
  for (var j = S.tx.length - 1; j >= 0; j--) { var q = S.tx[j]; q.l -= dt; q.y -= 40 * dt; if (q.l <= 0) S.tx.splice(j, 1); }
  if (S.over) { S.overT += dt; if (S.overT > 1.1 && !S.done) { S.done = true; finish(S); } return; }
  if (!S.run) return;
  if (S.cd > 0) { S.cd -= dt; return; }
  S.sc += v * dt * 2;
  S.gap -= v * dt; if (S.gap <= 0) { spawn(S); S.gap = rnd(2.3, 3.3) - Math.min(0.9, (S.t - 2.4) / 90); }
  for (var k = S.items.length - 1; k >= 0; k--) {
    var it = S.items[k]; it.d -= v * dt;
    if (S.boost > 0 && it.d < 3.2 && it.k !== "antre" && it.k !== "salah") it.l += (S.tl - it.l) * Math.min(1, dt * 6);
    if (it.d < 1.15 && it.d > 0.8 && Math.abs(it.l - S.lx) < 0.55) { hit(S, it); S.items.splice(k, 1); continue; }
    if (it.d < 0.5) S.items.splice(k, 1);
  }
}

function hit(S, it) {
  var xx = px(S.lx, 1), yy = PY - 30;
  if (it.k === "antre" || it.k === "salah") {
    if (S.boost > 0) { S.sc += 15; say(S, "Terobos! +15", xx, yy - 20, "#ffd24a"); pop(S, xx, yy, "#ffb800", 18); API.beep(660, 0.06); return; }
    if (S.inv > 0) return;
    S.life--; S.combo = 0; S.mult = 1; S.shake = 9; S.flash = 1; S.inv = 1.3;
    pop(S, xx, yy, "#ff5a4f", 20); say(S, it.k === "antre" ? "Antre panjang!" : "Formulir salah!", xx, yy - 30, "#ff8a80"); API.beep(160, 0.22);
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    if (S.life <= 0) { S.over = true; S.overT = 0; }
    return;
  }
  var pts = 0;
  if (it.k === "berkas") pts = 10; else if (it.k === "stempel") pts = 40;
  else if (it.k === "bolt") { S.boost = 5; S.inv = Math.max(S.inv, 5); say(S, "Jalur Cepat!", xx, yy - 30, "#7fe7ff"); pop(S, xx, yy, "#7fe7ff", 22); API.beep(980, 0.18); }
  else if (it.k === "hati") { if (S.life < 3) { S.life++; say(S, "+1 nyawa", xx, yy - 30, "#ff9ac8"); } else { pts = 50; } pop(S, xx, yy, "#ff6fae", 16); API.beep(740, 0.14); }
  S.combo++; S.maxC = Math.max(S.maxC, S.combo); S.got++;
  var m = Math.min(4, 1 + Math.floor(S.combo / 8)); if (m > S.mult) say(S, "Kombo x" + m + "!", CX, 120, "#ffd24a"); S.mult = m;
  if (pts) { var add = pts * S.mult; S.sc += add; say(S, "+" + add, xx, yy - 18, it.k === "stempel" ? "#ffd24a" : "#cfe6ff"); pop(S, xx, yy, it.k === "stempel" ? "#ffd24a" : "#7ab6ff", it.k === "stempel" ? 14 : 8); API.beep(it.k === "stempel" ? 880 : 520 + Math.min(S.combo, 20) * 22, 0.07); }
}

function finish(S) {
  var sc = Math.round(S.sc), st = sc >= 900 ? 3 : sc >= 450 ? 2 : 1, g = API.G(), best = Math.max(g.best.rs || 0, sc), jarak = Math.round(S.pos * 5), baru = sc > (g.best.rs || 0) && sc > 0, rank = sc > 0 ? topAdd(sc, jarak) : 0;
  API.fin("rush", {title: baru ? "Rekor baru!" : st === 3 ? "Pelari Kota Pahlawan!" : st === 2 ? "Larimu kencang!" : "Tabrakan antrean!", stars: st,
    sub: "Skor <b>" + sc + "</b> &middot; " + jarak + " m &middot; kombo terbaik " + S.maxC + ". Rekor Anda: " + best + "." + (rank ? " Peringkat #" + rank + " di perangkat ini." : ""),
    pts: Math.round(sc / 15) + 5, bk: "rs", bv: sc, m: {rush: sc}, again: play,
    share: "Saya mencetak " + sc + " poin (" + jarak + " m) di Suroboyo Rush, Ruang Main Takok Pelayanan Suroboyo. Berani menandingi?\n" + location.origin});
}

/* ---------- Gambar ---------- */
function draw(S) {
  var x = S.x, t = S.t, K = sky(t), pos = S.pos, sh = S.shake > 0 && !RM ? (Math.random() - 0.5) * S.shake : 0, sv = S.shake > 0 && !RM ? (Math.random() - 0.5) * S.shake : 0;
  x.save(); x.translate(sh, sv);
  /* langit */
  var gr = x.createLinearGradient(0, 0, 0, HY); gr.addColorStop(0, css(K.t)); gr.addColorStop(1, css(K.b)); x.fillStyle = gr; x.fillRect(-12, -12, W + 24, HY + 12);
  if (K.night > 0.05) { x.fillStyle = "#fff"; STARS.forEach(function (s) { x.globalAlpha = K.night * (0.45 + 0.4 * Math.sin(t * 2 + s.p)); x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.28); x.fill(); }); x.globalAlpha = 1; }
  var cyc = (t / 28) % 3, ang = (cyc / 3) * Math.PI, bx = 40 + (cyc / 3) * (W - 80), by = HY - 8 - Math.sin(ang) * 92;
  if (cyc < 2) { x.fillStyle = css(mix("#fff3b0", "#ff9a5a", sm(clamp(cyc - 0.8, 0, 1)))); x.beginPath(); x.arc(bx, by, 17, 0, 6.28); x.fill(); x.fillStyle = "rgba(255,240,160,.22)"; x.beginPath(); x.arc(bx, by, 30, 0, 6.28); x.fill(); }
  else { var mx = 60 + (cyc - 2) * (W - 120); x.fillStyle = "#f4f6ff"; x.beginPath(); x.arc(mx, 50 + Math.sin((cyc - 2) * 3.14) * -20 + 20, 13, 0, 6.28); x.fill(); x.fillStyle = css(K.t); x.beginPath(); x.arc(mx + 6, 46 + Math.sin((cyc - 2) * 3.14) * -20 + 20, 12, 0, 6.28); x.fill(); }
  /* kota: dua lapis */
  var cF = mix(K.b, "#0a2272", 0.28), cN = mix(K.b, "#071a5c", 0.55 + 0.2 * K.night), o1 = (pos * 3) % TW, o2 = (pos * 7) % TW;
  for (var rep = -1; rep <= 1; rep++) {
    FAR.forEach(function (b) { var bx2 = b.x - o1 + rep * TW; if (bx2 > W + 50 || bx2 + b.w < -50) return; x.fillStyle = css(cF); x.fillRect(bx2, HY - b.h, b.w, b.h); });
    var tx = TUGU_X - o1 + rep * TW; if (tx > -40 && tx < W + 40) tugu(x, tx, css(mix(cF, "#ffffff", 0.3)));
    NEAR.forEach(function (b) {
      var bx3 = b.x - o2 + rep * TW; if (bx3 > W + 50 || bx3 + b.w < -50) return; x.fillStyle = css(cN); x.fillRect(bx3, HY - b.h, b.w, b.h);
      if (K.night > 0.1) { x.fillStyle = "rgba(255,214,102," + (K.night * 0.75).toFixed(2) + ")"; for (var wy = HY - b.h + 6, n = 0; wy < HY - 6; wy += 9, n++) for (var wx = bx3 + 4, m = 0; wx < bx3 + b.w - 5; wx += 8, m++) if (((n * 7 + m * 13 + Math.floor(b.r * 50)) % 5) < 2) x.fillRect(wx, wy, 3, 4); }
    });
  }
  /* tanah dan jalan */
  var gg = x.createLinearGradient(0, HY, 0, H); gg.addColorStop(0, css(mix(K.b, "#2f7a52", 0.55))); gg.addColorStop(1, css(mix("#1f5a3a", K.t, 0.25 + K.night * 0.35)));
  x.fillStyle = gg; x.fillRect(-12, HY, W + 24, H - HY + 12);
  var dB = SPAN / (H - HY), hw = 1.5 * LW / dB;
  var rg = x.createLinearGradient(0, HY, 0, H); rg.addColorStop(0, css(mix("#4b5878", K.b, 0.35))); rg.addColorStop(1, "#27304d");
  x.fillStyle = rg; x.beginPath(); x.moveTo(CX, HY); x.lineTo(CX + hw, H); x.lineTo(CX - hw, H); x.closePath(); x.fill();
  /* garis tepi dan pembatas jalur */
  var N = 9, seg = 0.8;
  for (var kk = 0; kk < N; kk++) {
    var d1 = 0.6 + (((kk * seg - pos) % (N * seg)) + N * seg) % (N * seg), d2 = d1 + seg * 0.5; if (d1 > 14) continue;
    [-1.5, 1.5].forEach(function (e) { x.strokeStyle = (kk % 2) ? "#ffb800" : "#fff"; x.lineWidth = 6 / d1; x.beginPath(); x.moveTo(px(e, d1), py(d1)); x.lineTo(px(e, d2), py(d2)); x.stroke(); });
    [-0.5, 0.5].forEach(function (e) { x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 3 / d1; x.beginPath(); x.moveTo(px(e, d1), py(d1)); x.lineTo(px(e, d2), py(d2)); x.stroke(); });
  }
  /* tiang lampu di tepi jalan */
  var NL = 7, sp = 1.15;
  for (var li = NL - 1; li >= 0; li--) {
    var dl = 0.7 + (((li * sp - pos) % (NL * sp)) + NL * sp) % (NL * sp), side = li % 2 ? 1 : -1, lxp = px(side * 1.95, dl), lyp = py(dl), hh = 74 / dl;
    x.strokeStyle = "#1b2547"; x.lineWidth = Math.max(1, 4 / dl); x.beginPath(); x.moveTo(lxp, lyp); x.lineTo(lxp, lyp - hh); x.lineTo(lxp - side * 10 / dl, lyp - hh - 3 / dl); x.stroke();
    x.fillStyle = K.night > 0.3 ? "rgba(255,226,140," + (0.5 + K.night * 0.5).toFixed(2) + ")" : "#c9d4e6"; x.beginPath(); x.arc(lxp - side * 10 / dl, lyp - hh - 3 / dl, Math.max(1.4, 4.5 / dl), 0, 6.28); x.fill();
    if (K.night > 0.3) { x.fillStyle = "rgba(255,226,140," + (K.night * 0.14).toFixed(2) + ")"; x.beginPath(); x.arc(lxp - side * 10 / dl, lyp - hh - 3 / dl, 18 / dl, 0, 6.28); x.fill(); }
  }
  /* kabut tipis di cakrawala */
  var fg = x.createLinearGradient(0, HY - 6, 0, HY + 60); fg.addColorStop(0, css(K.b, 0.55)); fg.addColorStop(1, css(K.b, 0)); x.fillStyle = fg; x.fillRect(0, HY - 6, W, 66);
  /* benda: jauh ke dekat */
  S.items.slice().sort(function (a, b) { return b.d - a.d; }).forEach(function (it) { drawItem(x, it, t, K); });
  /* efek kecepatan saat boost */
  if (S.boost > 0) { x.strokeStyle = "rgba(160,235,255,.35)"; x.lineWidth = 2; for (var sl = 0; sl < 14; sl++) { var a2 = (sl * 1.7 + t * 9) % 6.28, rr = 140 + ((t * 600 + sl * 97) % 140); x.beginPath(); x.moveTo(CX + Math.cos(a2) * rr * 0.75, 330 + Math.sin(a2) * rr * 0.55); x.lineTo(CX + Math.cos(a2) * (rr + 34) * 0.75, 330 + Math.sin(a2) * (rr + 34) * 0.55); x.stroke(); } }
  drawPlayer(x, S, t);
  /* partikel dan teks */
  S.fx.forEach(function (p) { x.globalAlpha = clamp(p.l / p.m, 0, 1); x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fill(); }); x.globalAlpha = 1;
  x.textAlign = "center"; x.font = "800 15px system-ui,sans-serif";
  S.tx.forEach(function (q) { x.globalAlpha = clamp(q.l / 0.5, 0, 1); x.lineWidth = 4; x.strokeStyle = "rgba(6,18,60,.8)"; x.strokeText(q.t, q.x, q.y); x.fillStyle = q.c; x.fillText(q.t, q.x, q.y); }); x.globalAlpha = 1;
  if (S.flash > 0) { x.fillStyle = "rgba(255,60,50," + (S.flash * 0.32).toFixed(2) + ")"; x.fillRect(-12, -12, W + 24, H + 24); }
  x.restore();
  hud(x, S);
}

function drawItem(x, it, t, K) {
  var d = it.d, s = 1 / d, X = px(it.l, d), Y = py(d), bob = (it.k === "antre" || it.k === "salah") ? 0 : Math.sin(t * 5 + it.ph) * 4 * s;
  if (d > 7.4) return; x.globalAlpha = d > 6.4 ? clamp((7.4 - d), 0, 1) : 1;
  x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.ellipse(X, Y, 26 * s, 7 * s, 0, 0, 6.28); x.fill();
  x.save(); x.translate(X, Y); x.scale(s * 1.2, s * 1.2);
  if (it.k === "berkas") {
    x.translate(0, -34 + bob / s); x.rotate(Math.sin(t * 3 + it.ph) * 0.12);
    x.fillStyle = "#fff"; rr(x, -14, -18, 28, 36, 4); x.fill(); x.strokeStyle = "#1a46b5"; x.lineWidth = 2.5; rr(x, -14, -18, 28, 36, 4); x.stroke();
    x.fillStyle = "#1a46b5"; x.fillRect(-8, -9, 16, 3); x.fillRect(-8, -2, 16, 3); x.fillRect(-8, 5, 10, 3);
  } else if (it.k === "stempel") {
    x.translate(0, -36 + bob / s); x.rotate(t * 2);
    x.fillStyle = "rgba(255,200,40,.28)"; x.beginPath(); x.arc(0, 0, 27, 0, 6.28); x.fill();
    x.fillStyle = "#ffb800"; x.beginPath(); x.arc(0, 0, 18, 0, 6.28); x.fill(); x.strokeStyle = "#a86b00"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#fff3b0"; x.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 ? 4.5 : 10, a = i * Math.PI / 5 - Math.PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill();
  } else if (it.k === "bolt") {
    x.translate(0, -38 + bob / s); x.fillStyle = "rgba(120,230,255,.3)"; x.beginPath(); x.arc(0, 0, 28, 0, 6.28); x.fill();
    x.fillStyle = "#0e63d6"; x.beginPath(); x.arc(0, 0, 19, 0, 6.28); x.fill(); x.strokeStyle = "#9eeaff"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#ffe14a"; x.beginPath(); x.moveTo(3, -13); x.lineTo(-8, 3); x.lineTo(-1, 3); x.lineTo(-4, 13); x.lineTo(8, -4); x.lineTo(1, -4); x.closePath(); x.fill();
  } else if (it.k === "hati" && P_HEART) {
    x.translate(0, -36 + bob / s); x.scale(0.5 + Math.sin(t * 6) * 0.04, 0.5 + Math.sin(t * 6) * 0.04); x.translate(-50, -50); x.fillStyle = "#ff5aa5"; x.fill(P_HEART); x.strokeStyle = "#fff"; x.lineWidth = 6; x.stroke(P_HEART);
  } else if (it.k === "antre") {
    x.fillStyle = "#1b2547"; x.fillRect(-46, -44, 6, 44); x.fillRect(40, -44, 6, 44);
    x.fillStyle = "#fff"; rr(x, -50, -44, 100, 20, 5); x.fill(); x.fillStyle = "#e5482f"; for (var b = -50; b < 46; b += 22) { x.beginPath(); x.moveTo(b, -24); x.lineTo(b + 10, -24); x.lineTo(b + 22, -44); x.lineTo(b + 12, -44); x.closePath(); x.fill(); }
    x.fillStyle = "#ffb800"; x.beginPath(); x.arc(-43, -48, 6, 0, 6.28); x.arc(43, -48, 6, 0, 6.28); x.fill();
  } else {
    x.translate(0, -34); x.rotate(-0.08); x.fillStyle = "#fff"; rr(x, -22, -28, 44, 56, 5); x.fill(); x.strokeStyle = "#d6342c"; x.lineWidth = 4; rr(x, -22, -28, 44, 56, 5); x.stroke();
    x.strokeStyle = "#d6342c"; x.lineWidth = 7; x.lineCap = "round"; x.beginPath(); x.moveTo(-11, -13); x.lineTo(11, 9); x.moveTo(11, -13); x.lineTo(-11, 9); x.stroke();
    x.fillStyle = "#d6342c"; x.fillRect(-13, 16, 26, 3);
  }
  x.restore(); x.globalAlpha = 1;
}
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

function drawPlayer(x, S, t) {
  var X = px(S.lx, 1), Y = PY, run = S.run && !S.over ? Math.abs(Math.sin(t * 11)) : 0, lean = clamp((S.tl - S.lx) * 0.22, -0.3, 0.3);
  if (S.inv > 0 && S.boost <= 0 && Math.floor(t * 14) % 2 === 0) return;
  x.fillStyle = "rgba(0,0,0,.3)"; x.beginPath(); x.ellipse(X, Y + 2, 30 - run * 4, 8, 0, 0, 6.28); x.fill();
  if (S.boost > 0) { var gl = x.createRadialGradient(X, Y - 36, 8, X, Y - 36, 62); gl.addColorStop(0, "rgba(140,235,255,.55)"); gl.addColorStop(1, "rgba(140,235,255,0)"); x.fillStyle = gl; x.beginPath(); x.arc(X, Y - 36, 62, 0, 6.28); x.fill(); }
  x.save(); x.translate(X, Y - run * 9); x.rotate(lean); x.scale(1.02, 1.02 - run * 0.05); x.translate(-40, -84);
  if (P_BUBBLE) {
    x.fillStyle = "#1a46b5"; x.fill(P_BUBBLE); x.strokeStyle = "#fff"; x.lineWidth = 3.5; x.stroke(P_BUBBLE);
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(28, 32, 5, 6.5, 0, 0, 6.28); x.ellipse(52, 32, 5, 6.5, 0, 0, 6.28); x.fill();
    x.fillStyle = "#0d2a6b"; x.beginPath(); x.arc(29.5, 33.5, 2.4, 0, 6.28); x.arc(53.5, 33.5, 2.4, 0, 6.28); x.fill();
    x.strokeStyle = "#fff"; x.lineWidth = 3; x.lineCap = "round"; x.beginPath(); x.moveTo(28, 45); x.quadraticCurveTo(40, S.over ? 42 : 55, 52, 45); x.stroke();
    x.fillStyle = "rgba(255,120,150,.6)"; x.beginPath(); x.arc(19, 42, 4, 0, 6.28); x.arc(61, 42, 4, 0, 6.28); x.fill();
    x.fillStyle = "#ffb800"; rr(x, 22, -4, 36, 11, 5); x.fill(); x.fillStyle = "#c98a00"; x.fillRect(22, 3, 36, 3);
  }
  x.restore();
}

function hud(x, S) {
  x.save(); x.textBaseline = "alphabetic";
  x.fillStyle = "rgba(6,18,60,.55)"; rr(x, 8, 8, 118, 34, 12); x.fill();
  x.fillStyle = "#fff"; x.font = "800 18px system-ui,sans-serif"; x.textAlign = "left"; x.fillText(Math.round(S.sc), 18, 32);
  x.font = "600 10px system-ui,sans-serif"; x.fillStyle = "#b9ceff"; x.fillText("SKOR", 74, 31);
  for (var i = 0; i < 3; i++) { x.save(); x.translate(W - 28 - i * 26, 12); x.scale(0.24, 0.24); x.globalAlpha = i < S.life ? 1 : 0.28; if (P_HEART) { x.fillStyle = i < S.life ? "#ff5aa5" : "#9db2dc"; x.fill(P_HEART); x.strokeStyle = "#fff"; x.lineWidth = 7; x.stroke(P_HEART); } x.restore(); }
  if (S.mult > 1) { x.textAlign = "center"; x.fillStyle = "#ffd24a"; x.font = "900 16px system-ui,sans-serif"; x.fillText("KOMBO x" + S.mult, CX, 28); }
  if (S.boost > 0) { x.fillStyle = "rgba(6,18,60,.55)"; rr(x, CX - 50, 38, 100, 10, 5); x.fill(); x.fillStyle = "#7fe7ff"; rr(x, CX - 50, 38, 100 * clamp(S.boost / 5, 0, 1), 10, 5); x.fill(); }
  if (S.run && S.cd > 0) { x.textAlign = "center"; x.fillStyle = "#fff"; x.strokeStyle = "rgba(6,18,60,.8)"; x.lineWidth = 6; x.font = "900 64px system-ui,sans-serif"; var n = Math.ceil(S.cd / 0.8), tx = n >= 3 ? "3" : n === 2 ? "2" : n === 1 ? "1" : "Gas!"; x.strokeText(tx, CX, 240); x.fillText(tx, CX, 240); }
  x.restore();
}

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-rs],[data-g=\"rush\"]"); if (!b) return;
  if (b.dataset.g === "rush") menu();
  else if (b.dataset.rs === "go") play();
  else if (b.dataset.rs === "start" && CUR) CUR.begin();
});
window.SuroboyoRush = {menu: menu, play: play};
})();
