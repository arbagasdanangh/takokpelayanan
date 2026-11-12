"use strict";
/* Arena Zona (Ruang Main): gim bergaya MOBA, tampak atas. Cak Takok memimpin Petugas Loket merebut tiga Menara Zona (Zona 2, 3, 4)
   lalu menghancurkan Antrean Raksasa milik Si Ruwet. Joystick (geser di layar), 3 skill, toko item, level, minimap.
   Kontrol keyboard: WASD/panah, 1-2-3 atau J-K-L untuk skill, 4-5-6 untuk item. Memakai pintu TKGM milik main.js. Tanpa data pribadi. */
(function () {
var API = window.TKGM; if (!API) return;
var VW = 360, VH = 500, WW = 720, WH = 1240, MID = 620;
var LANES = [{x: 150, n: "Zona 2", c: "#16a34a"}, {x: 360, n: "Zona 3", c: "#8b5cf6"}, {x: 570, n: "Zona 4", c: "#0ea5e9"}];
var BY = [1130, 110], TY = [900, 340], LIM = 360;
var CUR = null, LV = 1, KEYS = {}, KON = false;
var $ = function (i) { return document.getElementById(i); };
var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
var dist = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
var ITEM = [["Berkas Sakti", 150, "+25% serangan dan skill"], ["Sepatu Kilat", 130, "+14 kecepatan"], ["Zirah Stempel", 150, "-8% kerusakan diterima"]];
var SK = [["Stempel Kilat", 5], ["Tameng Syarat", 10], ["Jalur Cepat", 26]];

function mk(t, k, x, y, o) { return {t: t, k: k, x: x, y: y, hp: o.hp, mh: o.hp, r: o.r, sp: o.sp || 0, dm: o.dm || 0, rg: o.rg || 0, cd: 0, cm: o.cm || 1, al: true, nm: o.nm || "", lane: o.lane == null ? 1 : o.lane, path: o.path, pi: 0, sh: 0}; }

function baru(lv) {
  var S = {t: 0, u: [], fx: [], tx: [], feed: [], lv: lv, run: false, over: false, done: false, cd: 2.4, spawn: 1.5, wave: 0, tdown: [0, 0], joy: {x: 0, y: 0, on: false, ox: 0, oy: 0, kx: 0, ky: 0},
    gold: 0, xp: 0, lvl: 1, kills: 0, deaths: 0, towers: 0, mins: 0, it: {a: 0, b: 0, c: 0}, s: [0, 0, 0], fd: {x: 0, y: -1}, shake: 0, last: 0, res: ""};
  var h = mk(0, "h", 360, BY[0] - 50, {hp: 700, r: 15, sp: 118, dm: 34, rg: 125, cm: .75, nm: "Cak Takok"});
  var e = mk(1, "h", 360, BY[1] + 50, {hp: 800 * (lv === 1 ? .8 : 1.15), r: 15, sp: 106, dm: 30 * (lv === 1 ? .8 : 1.15), rg: 62, cm: .85, nm: "Si Ruwet"});
  e.rt = 0; e.lane = 1; e.ult = 6; h.rt = 0; S.h = h; S.e = e; S.u.push(h, e);
  var nxp = mk(0, "nx", 360, BY[0], {hp: 1800, r: 34, dm: 30, rg: 165, cm: 1.1, nm: "PTSP"}), nxe = mk(1, "nx", 360, BY[1], {hp: 1800, r: 34, dm: 30, rg: 165, cm: 1.1, nm: "Antrean Raksasa"});
  S.u.push(nxp, nxe); S.nx = [nxp, nxe];
  LANES.forEach(function (l, i) { S.u.push(mk(0, "tw", l.x, TY[0], {hp: 900, r: 22, dm: 36, rg: 150, cm: 1.1, nm: "Menara " + l.n, lane: i}), mk(1, "tw", l.x, TY[1] + 0, {hp: 900, r: 22, dm: 36, rg: 150, cm: 1.1, nm: "Menara " + l.n, lane: i})); });
  lvStat(S); return S;
}
function pw(S) { return 1 + .25 * S.it.a; }
function lvStat(S) {
  var h = S.h, r = h.hp / h.mh, L = S.lvl - 1;
  h.mh = 700 + 85 * L; h.dm = (34 + 6 * L) * pw(S); h.sp = 118 + 14 * S.it.b; h.hp = Math.min(h.mh, Math.max(1, r * h.mh + (L ? 85 : 0) * 0));
  var e = S.e, el = 1 + Math.floor(S.t / 50), f = S.lv === 1 ? .8 : 1; e.lvl = el; var er = e.hp / e.mh; e.mh = (800 + 80 * (el - 1)) * f; e.hp = Math.max(1, er * e.mh); e.dm = (30 + 5 * (el - 1)) * f;
}
function tx(S, x, y, t, c) { S.tx.push({x: x, y: y, t: String(t), c: c || "#fff", l: .8}); if (S.tx.length > 40) S.tx.shift(); }
function feed(S, m) { S.feed.push({m: m, l: 4.5}); if (S.feed.length > 4) S.feed.shift(); }
function ring(S, x, y, r, c) { S.fx.push({k: "r", x: x, y: y, r: r, c: c, l: .35, m: .35}); }
function line(S, a, b, c) { S.fx.push({k: "l", x: a.x, y: a.y, x2: b.x, y2: b.y, c: c, l: .12, m: .12}); }

function foes(S, u, d, pref) {
  var b = null, bd = d + 1e9, w = 1e9;
  S.u.forEach(function (o) {
    if (!o.al || o.t === u.t) return; var dd = dist(u, o) - o.r; if (dd > d) return;
    var pr = pref ? (o.k === "m" ? 0 : o.k === "h" ? 1 : 2) : 0, sc = pr * 1000 + dd; if (sc < w) { w = sc; b = o; }
  });
  return b;
}
function hurt(S, src, tg, a) {
  if (!tg.al || S.over) return;
  if (tg.k === "nx" && S.tdown[tg.t] < 2) { if (!tg.imm || tg.imm <= 0) { tx(S, tg.x, tg.y - 44, "Terlindungi", "#ffd24a"); tg.imm = 1.2; } return; }
  if (tg.sh > 0) a *= .3; if (tg === S.h) a *= Math.pow(.92, S.it.c);
  tg.hp -= a; if (tg.t === 1 || tg === S.h || tg.k === "h") tx(S, tg.x, tg.y - tg.r - 6, Math.round(a), tg.t === 0 ? "#ff8a80" : "#fff");
  if (tg.hp <= 0) mati(S, src, tg);
}
function mati(S, src, tg) {
  tg.al = false; tg.hp = 0;
  if (tg.k === "h") {
    tg.rt = 5 + (tg === S.h ? S.lvl : tg.lvl || 1) * .6;
    if (tg === S.h) { S.deaths++; feed(S, "Cak Takok tumbang! Kembali dalam " + Math.round(tg.rt) + " dtk."); S.shake = .4; API.beep(180, .2); }
    else { S.kills++; S.gold += 220; S.xp += 90; feed(S, "Si Ruwet dikalahkan! +220 emas"); API.beep(880, .12); }
  } else if (tg.k === "m") { if (tg.t === 1 && (src === S.h || dist(S.h, tg) < 260)) { S.gold += 14; S.xp += 16; S.mins++; tx(S, tg.x, tg.y - 10, "+14", "#ffd24a"); } }
  else if (tg.k === "tw") { S.tdown[tg.t]++; if (tg.t === 1) { S.towers++; S.gold += 180; S.xp += 60; feed(S, tg.nm + (S.tdown[1] >= 2 ? " hancur! Nexus terbuka." : " hancur! Satu lagi untuk buka Nexus.")); API.beep(660, .2); } else feed(S, tg.nm + " kita jatuh."); S.shake = .35; ring(S, tg.x, tg.y, 80, "#ffb800"); }
  else if (tg.k === "nx") { S.over = true; S.res = tg.t === 1 ? "win" : "lose"; S.shake = .8; }
  while (S.xp >= 60 * S.lvl && S.lvl < 8) { S.xp -= 60 * S.lvl; S.lvl++; lvStat(S); S.h.hp = Math.min(S.h.mh, S.h.hp + 120); feed(S, "Naik level " + S.lvl + "!"); tx(S, S.h.x, S.h.y - 30, "LEVEL " + S.lvl, "#7fe7ff"); }
}
function bergerak(u, tx2, ty2, dt, sp) { var dx = tx2 - u.x, dy = ty2 - u.y, d = Math.hypot(dx, dy); if (d < 2) return; var s = Math.min(d, sp * dt); u.x += dx / d * s; u.y += dy / d * s; }

function spawnWave(S) {
  S.wave++; var n = S.wave > 6 ? 3 : 2;
  [0, 1].forEach(function (t) {
    LANES.forEach(function (l, i) {
      for (var k = 0; k < n; k++) {
        var p = {hp: 150 + S.wave * 6, r: 8, sp: 44, dm: 11 + S.wave * .5, rg: 26, cm: 1, nm: "m", lane: i, path: [[l.x, MID], [360, BY[1 - t]]]};
        S.u.push(mk(t, "m", 360 + (i - 1) * 30 + (k - 1) * 8, BY[t] + (t ? 50 : -50) + k * (t ? 10 : -10), p));
      }
    });
  });
}
function aksiMinion(S, u, dt) {
  var tg = foes(S, u, 118, true);
  if (tg && tg.k === "nx" && S.tdown[tg.t] < 2) tg = null;
  if (tg) { var d = dist(u, tg) - tg.r; if (d > u.rg) bergerak(u, tg.x, tg.y, dt, u.sp); else if (u.cd <= 0) { hurt(S, u, tg, u.dm); u.cd = u.cm; } return; }
  var w = u.path[u.pi]; if (!w) return; if (Math.hypot(w[0] - u.x, w[1] - u.y) < 14 && u.pi < u.path.length - 1) u.pi++; w = u.path[u.pi]; bergerak(u, w[0], w[1], dt, u.sp);
}
function aksiBangunan(S, u) {
  if (u.cd > 0) return; var tg = foes(S, u, u.rg, true); if (!tg || (tg.k === "nx" && S.tdown[tg.t] < 2)) return;
  hurt(S, u, tg, u.dm * (tg.k === "h" ? 1 : 1.6)); u.cd = u.cm; line(S, u, tg, u.t ? "#ff8a80" : "#7fe7ff"); S.fx[S.fx.length - 1].w = 3;
}
function aksiPemain(S, dt) {
  var h = S.h; if (!h.al) { h.rt -= dt; if (h.rt <= 0) { h.al = true; h.hp = h.mh; h.x = 360; h.y = BY[0] - 50; feed(S, "Cak Takok kembali!"); } return; }
  var jx = S.joy.x, jy = S.joy.y;
  if (KEYS.a || KEYS.arrowleft) jx -= 1; if (KEYS.d || KEYS.arrowright) jx += 1; if (KEYS.w || KEYS.arrowup) jy -= 1; if (KEYS.s || KEYS.arrowdown) jy += 1;
  var m = Math.hypot(jx, jy); if (m > 1) { jx /= m; jy /= m; }
  if (m > .12) { S.fd = {x: jx / Math.max(m, 1), y: jy / Math.max(m, 1)}; var sp = h.sp * (h.sh > 0 ? 1.25 : 1); h.x = clamp(h.x + jx * sp * dt, 18, WW - 18); h.y = clamp(h.y + jy * sp * dt, 18, WH - 18); }
  if (h.cd <= 0) { var tg = foes(S, h, h.rg, true); if (tg && !(tg.k === "nx" && S.tdown[tg.t] < 2)) { hurt(S, h, tg, h.dm); h.cd = h.cm; line(S, h, tg, "#ffd24a"); } }
  var nb = dist(h, S.nx[0]) < 150; h.hp = Math.min(h.mh, h.hp + h.mh * (nb ? .08 : .004) * dt);
}
function skill(S, i) {
  var h = S.h; if (!S.run || S.over || !h.al || S.s[i] > 0) return;
  S.s[i] = SK[i][1]; var L = S.lvl, p = pw(S);
  if (i === 0) { var nx = clamp(h.x + S.fd.x * 140, 18, WW - 18), ny = clamp(h.y + S.fd.y * 140, 18, WH - 18); ring(S, h.x, h.y, 22, "#7fe7ff"); h.x = nx; h.y = ny; ring(S, h.x, h.y, 70, "#ffd24a"); S.u.forEach(function (o) { if (o.al && o.t === 1 && dist(o, h) <= 70 + o.r) hurt(S, h, o, (70 + 14 * L) * p); }); API.beep(740, .08); }
  else if (i === 1) { h.sh = 3; h.hp = Math.min(h.mh, h.hp + h.mh * .1); ring(S, h.x, h.y, 40, "#7ab6ff"); API.beep(420, .1); }
  else { ring(S, h.x, h.y, 130, "#ff5aa5"); S.shake = .25; S.u.forEach(function (o) { if (o.al && o.t === 1 && dist(o, h) <= 130 + o.r) hurt(S, h, o, (150 + 25 * L) * p); }); h.hp = Math.min(h.mh, h.hp + h.mh * .2); API.beep(300, .25); }
}
function beli(S, i) {
  var key = ["a", "b", "c"][i], c = ITEM[i][1]; if (S.over || S.it[key] >= 3 || S.gold < c) return false;
  S.gold -= c; S.it[key]++; lvStat(S); tx(S, S.h.x, S.h.y - 30, ITEM[i][0], "#ffd24a"); API.beep(620, .08); return true;
}
function aksiMusuh(S, dt) {
  var e = S.e, h = S.h; if (!e.al) { e.rt -= dt; if (e.rt <= 0) { e.al = true; e.hp = e.mh; e.x = 360; e.y = BY[1] + 50; e.lane = Math.floor(Math.random() * 3); e.back = false; } return; }
  e.ult -= dt; var sp = e.sp * (S.lv === 1 ? .92 : 1);
  if (e.hp < e.mh * .3) e.back = true; if (e.back && e.hp > e.mh * .75) e.back = false;
  if (dist(e, S.nx[1]) < 140) e.hp = Math.min(e.mh, e.hp + e.mh * .08 * dt);
  if (e.back) { bergerak(e, 360, BY[1] + 40, dt, sp * 1.1); return; }
  var tg = foes(S, e, 190, true), alliedNear = S.u.some(function (o) { return o.al && o.t === 1 && o.k === "m" && dist(o, e) < 170; });
  if (tg && tg.k === "tw" && !alliedNear) tg = null;
  if (tg && tg.k === "nx" && S.tdown[0] < 2) tg = null;
  if (h.al && dist(e, h) < 200 && dist(h, S.nx[0]) > 200 && (e.hp > h.hp * .7 || alliedNear)) tg = h;
  if (tg) {
    var d = dist(e, tg) - tg.r; if (d > e.rg) bergerak(e, tg.x, tg.y, dt, sp); else if (e.cd <= 0) { hurt(S, e, tg, e.dm); e.cd = e.cm; line(S, e, tg, "#ff8a80"); }
    if (tg === h && e.ult <= 0 && dist(e, h) < 85) { e.ult = 8; ring(S, e.x, e.y, 85, "#ff5a5a"); hurt(S, e, h, 55 + 10 * (e.lvl || 1)); }
    return;
  }
  var ln = LANES[e.lane], fr = S.u.filter(function (o) { return o.al && o.t === 1 && o.k === "m" && o.lane === e.lane; }), gx = ln.x, gy = e.y;
  if (fr.length) gy = fr.reduce(function (m, o) { return Math.max(m, o.y); }, 0) - 30; else gy = e.y + 60; if (S.tdown[0] < 3) gy = Math.min(gy, TY[0] - 200);
  bergerak(e, gx, clamp(gy, 160, WH - 160), dt, sp * .85);
}
function step(S, dt) {
  if (S.cd > 0) { S.cd -= dt; return; }
  S.t += dt; S.shake = Math.max(0, S.shake - dt);
  S.spawn -= dt; if (S.spawn <= 0) { spawnWave(S); S.spawn = 16; }
  for (var i = 0; i < 3; i++) if (S.s[i] > 0) S.s[i] = Math.max(0, S.s[i] - dt);
  if (S.h.sh > 0) S.h.sh -= dt; if (S.e.sh > 0) S.e.sh -= dt;
  if (Math.floor(S.t) % 50 === 0 && Math.floor(S.t) !== S.lt) { S.lt = Math.floor(S.t); lvStat(S); }
  S.gold += 3.2 * dt; S.xp += .8 * dt;
  S.u.forEach(function (u) { if (u.cd > 0) u.cd -= dt; if (u.imm > 0) u.imm -= dt; });
  aksiPemain(S, dt); aksiMusuh(S, dt);
  S.u.slice().forEach(function (u) { if (!u.al || S.over) return; if (u.k === "m") aksiMinion(S, u, dt); else if (u.k === "tw" || u.k === "nx") aksiBangunan(S, u); });
  S.u = S.u.filter(function (u) { return u.al || u.k === "h" || u.k === "tw" || u.k === "nx"; });
  S.fx.forEach(function (f) { f.l -= dt; }); S.fx = S.fx.filter(function (f) { return f.l > 0; });
  S.tx.forEach(function (f) { f.l -= dt; f.y -= 22 * dt; }); S.tx = S.tx.filter(function (f) { return f.l > 0; });
  S.feed.forEach(function (f) { f.l -= dt; }); S.feed = S.feed.filter(function (f) { return f.l > 0; });
  if (!S.over && S.t >= LIM) { var a = S.nx[0].hp / S.nx[0].mh + (S.tdown[0] >= 2 ? 0 : .5), b = S.nx[1].hp / S.nx[1].mh + (S.tdown[1] >= 2 ? 0 : .5); S.over = true; S.res = S.towers > S.tdown[0] || (S.towers === S.tdown[0] && b < a) ? "win" : "lose"; }
}

/* ---------- Gambar ---------- */
function rr(x, a, b, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); }
function bar(x, cx, y, w, p, c) { x.fillStyle = "rgba(6,18,60,.65)"; x.fillRect(cx - w / 2, y, w, 4); x.fillStyle = c; x.fillRect(cx - w / 2, y, w * clamp(p, 0, 1), 4); }
function draw(S) {
  var x = S.x, h = S.h, cx = clamp(h.x - VW / 2, 0, WW - VW), cy = clamp(h.y - VH / 2 + 40, 0, WH - VH), sh = S.shake > 0 ? (Math.random() - .5) * 8 * S.shake : 0;
  x.save(); x.clearRect(0, 0, VW, VH); x.translate(-cx + sh, -cy + sh);
  var g = x.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, "#5a2a3a"); g.addColorStop(.5, "#2d6a4f"); g.addColorStop(1, "#1d4ed8"); x.fillStyle = g; x.fillRect(0, 0, WW, WH);
  x.fillStyle = "rgba(255,255,255,.05)"; for (var gx = 0; gx < WW; gx += 60) for (var gy = (gx / 60) % 2 * 30; gy < WH; gy += 60) x.fillRect(gx, gy, 30, 30);
  LANES.forEach(function (l) { x.fillStyle = "rgba(255,255,255,.14)"; x.fillRect(l.x - 38, 80, 76, WH - 160); x.fillStyle = l.c; x.globalAlpha = .35; x.fillRect(l.x - 38, 80, 6, WH - 160); x.fillRect(l.x + 32, 80, 6, WH - 160); x.globalAlpha = 1; x.fillStyle = "rgba(255,255,255,.5)"; x.font = "800 13px system-ui"; x.textAlign = "center"; x.fillText(l.n, l.x, MID + 4); });
  x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(120, MID - 3, 480, 6);
  var list = S.u.filter(function (u) { return u.al || u.k === "tw" || u.k === "nx"; }).sort(function (a, b) { return a.y - b.y; });
  list.forEach(function (u) {
    var c = u.t ? "#e5484d" : "#2f6bff";
    if (u.k === "nx") {
      var shd = S.tdown[u.t] < 2; x.fillStyle = u.al ? c : "#444"; rr(x, u.x - 34, u.y - 30, 68, 60, 14); x.fill(); x.strokeStyle = shd ? "#ffd24a" : "#fff"; x.lineWidth = shd ? 4 : 2; x.stroke();
      x.fillStyle = "#fff"; x.font = "800 11px system-ui"; x.textAlign = "center"; x.fillText(u.nm, u.x, u.y + 4); if (u.al) bar(x, u.x, u.y - 40, 64, u.hp / u.mh, "#4ade80");
    } else if (u.k === "tw") {
      x.fillStyle = u.al ? c : "#555"; x.beginPath(); x.moveTo(u.x - 18, u.y + 20); x.lineTo(u.x - 12, u.y - 22); x.lineTo(u.x + 12, u.y - 22); x.lineTo(u.x + 18, u.y + 20); x.closePath(); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke();
      x.fillStyle = LANES[u.lane].c; x.beginPath(); x.arc(u.x, u.y - 26, 8, 0, 6.28); x.fill(); x.stroke(); if (u.al) bar(x, u.x, u.y - 42, 44, u.hp / u.mh, "#4ade80");
    } else if (u.k === "m") {
      x.fillStyle = c; if (u.t) { x.fillRect(u.x - 7, u.y - 7, 14, 14); } else { x.beginPath(); x.arc(u.x, u.y, 8, 0, 6.28); x.fill(); } x.strokeStyle = "#fff"; x.lineWidth = 1.5; x.strokeRect(u.x - 7, u.y - 7, 14, 14) && 0; bar(x, u.x, u.y - 14, 18, u.hp / u.mh, "#4ade80");
    } else {
      if (u.sh > 0) { x.strokeStyle = "rgba(122,182,255,.9)"; x.lineWidth = 3; x.beginPath(); x.arc(u.x, u.y, u.r + 7, 0, 6.28); x.stroke(); }
      x.fillStyle = u.t ? "#b91c1c" : "#1a46b5"; rr(x, u.x - 16, u.y - 16, 32, 28, 9); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 3; x.stroke();
      x.beginPath(); x.moveTo(u.x - 6, u.y + 12); x.lineTo(u.x - 10, u.y + 20); x.lineTo(u.x + 2, u.y + 12); x.fillStyle = u.t ? "#b91c1c" : "#1a46b5"; x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(u.x - 6, u.y - 3, 3.6, 0, 6.28); x.arc(u.x + 6, u.y - 3, 3.6, 0, 6.28); x.fill(); x.fillStyle = "#0d2a6b"; x.beginPath(); x.arc(u.x - 5, u.y - 2, 1.6, 0, 6.28); x.arc(u.x + 7, u.y - 2, 1.6, 0, 6.28); x.fill();
      if (u.t) { x.strokeStyle = "#fff"; x.lineWidth = 2; x.beginPath(); x.moveTo(u.x - 10, u.y - 9); x.lineTo(u.x - 2, u.y - 6); x.moveTo(u.x + 10, u.y - 9); x.lineTo(u.x + 2, u.y - 6); x.stroke(); } else { x.fillStyle = "#ffb800"; rr(x, u.x - 9, u.y - 22, 18, 7, 3); x.fill(); }
      bar(x, u.x, u.y - 28, 38, u.hp / u.mh, u.t ? "#f87171" : "#4ade80"); x.fillStyle = "#fff"; x.font = "800 10px system-ui"; x.textAlign = "center"; x.fillText((u === S.h ? S.lvl : u.lvl || 1) + " " + u.nm, u.x, u.y - 32);
    }
  });
  S.fx.forEach(function (f) { var a = f.l / f.m; if (f.k === "r") { x.strokeStyle = f.c; x.globalAlpha = a; x.lineWidth = 4; x.beginPath(); x.arc(f.x, f.y, f.r * (1.2 - a * .4), 0, 6.28); x.stroke(); x.globalAlpha = 1; } else { x.strokeStyle = f.c; x.lineWidth = f.w || 2; x.globalAlpha = a; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x2, f.y2); x.stroke(); x.globalAlpha = 1; } });
  x.font = "900 13px system-ui"; x.textAlign = "center"; S.tx.forEach(function (f) { x.globalAlpha = clamp(f.l * 2, 0, 1); x.fillStyle = "rgba(6,18,60,.8)"; x.strokeStyle = "rgba(6,18,60,.8)"; x.lineWidth = 3; x.strokeText(f.t, f.x, f.y); x.fillStyle = f.c; x.fillText(f.t, f.x, f.y); x.globalAlpha = 1; });
  x.restore(); hud(x, S);
}
function hud(x, S) {
  var m = Math.max(0, LIM - S.t), mm = Math.floor(m / 60), ss = Math.floor(m % 60);
  x.save(); x.fillStyle = "rgba(6,18,60,.62)"; rr(x, 8, 8, 128, 44, 12); x.fill(); x.fillStyle = "#fff"; x.font = "800 13px system-ui"; x.textAlign = "left"; x.fillText("Lv " + S.lvl + "  \u2022  " + Math.floor(S.gold) + " \u25CF", 16, 26);
  x.font = "600 10px system-ui"; x.fillStyle = "#b9ceff"; x.fillText("Bunuh " + S.kills + "  Mati " + S.deaths + "  Menara " + S.towers + "/3", 16, 44);
  x.fillStyle = "rgba(6,18,60,.62)"; rr(x, VW / 2 - 28, 8, 56, 24, 10); x.fill(); x.fillStyle = "#fff"; x.textAlign = "center"; x.font = "800 13px system-ui"; x.fillText(mm + ":" + String(ss).padStart(2, "0"), VW / 2, 25);
  var mx = VW - 68, my = 8, sx = 60 / WW, sy = 100 / WH; x.fillStyle = "rgba(6,18,60,.62)"; rr(x, mx - 4, my - 4, 68, 108, 10); x.fill(); x.fillStyle = "rgba(255,255,255,.12)"; LANES.forEach(function (l) { x.fillRect(mx + l.x * sx - 3, my, 6, 100); });
  S.u.forEach(function (u) { if (!u.al) return; x.fillStyle = u.t ? "#ff6b6b" : "#6ea8ff"; var r = u.k === "m" ? 1.4 : u.k === "h" ? 3.4 : 3; x.fillRect(mx + u.x * sx - r, my + u.y * sy - r, r * 2, r * 2); });
  x.strokeStyle = "#fff"; x.lineWidth = 1; x.strokeRect(mx + clamp(S.h.x - VW / 2, 0, WW - VW) * sx, my + clamp(S.h.y - VH / 2 + 40, 0, WH - VH) * sy, VW * sx, VH * sy);
  x.textAlign = "left"; x.font = "700 11px system-ui"; S.feed.forEach(function (f, i) { x.globalAlpha = clamp(f.l, 0, 1); x.fillStyle = "rgba(6,18,60,.7)"; var w = x.measureText(f.m).width + 14; rr(x, 8, 60 + i * 20, w, 18, 8); x.fill(); x.fillStyle = "#fff"; x.fillText(f.m, 15, 73 + i * 20); x.globalAlpha = 1; });
  if (!S.h.al) { x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, 0, VW, VH); x.fillStyle = "#fff"; x.textAlign = "center"; x.font = "900 22px system-ui"; x.fillText("Menunggu bangkit " + Math.ceil(S.h.rt) + " dtk", VW / 2, VH / 2); }
  if (S.cd > 0) { x.textAlign = "center"; x.fillStyle = "#fff"; x.strokeStyle = "rgba(6,18,60,.8)"; x.lineWidth = 6; x.font = "900 58px system-ui"; var n = Math.ceil(S.cd / .8), t = n >= 3 ? "3" : n === 2 ? "2" : n === 1 ? "1" : "Rebut!"; x.strokeText(t, VW / 2, VH / 2); x.fillText(t, VW / 2, VH / 2); }
  var j = S.joy; if (j.on) { x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 3; x.beginPath(); x.arc(j.ox, j.oy, 40, 0, 6.28); x.stroke(); x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.arc(j.kx, j.ky, 17, 0, 6.28); x.fill(); }
  x.restore();
}
function ui(S) {
  [0, 1, 2].forEach(function (i) { var b = $("ars" + i); if (!b) return; var cdv = S.s[i]; b.disabled = cdv > 0 || !S.h.al; b.style.setProperty("--p", cdv > 0 ? Math.round(cdv / SK[i][1] * 100) : 0); b.querySelector("i").textContent = cdv > 0 ? Math.ceil(cdv) : ""; var it = $("ari" + i); if (it) { it.disabled = S.gold < ITEM[i][1] || S.it[["a", "b", "c"][i]] >= 3; it.querySelector("em").textContent = S.it[["a", "b", "c"][i]] >= 3 ? "MAKS" : ITEM[i][1]; } });
}

/* ---------- Alur ---------- */
function menu() {
  API.stopAll(); CUR = null; API.title("Arena Zona"); var g = API.G(), best = g.best.ar || 0;
  API.view(API.bar("Arena Zona") + '<div class="rs-hero ar-hero"><small>BARU &middot; MOBA</small><b>Arena Zona</b><p>Pimpin Petugas Loket merebut <b>Menara Zona 2, 3, dan 4</b>, lalu hancurkan <b>Antrean Raksasa</b> milik Si Ruwet. Naik level, beli item, dan kalahkan Si Ruwet sebelum waktu 6 menit habis.</p>' +
    '<div class="ar-lv" role="group" aria-label="Tingkat kesulitan"><button type="button" data-ar="lv" data-v="1" aria-pressed="' + (LV === 1) + '">Santai</button><button type="button" data-ar="lv" data-v="2" aria-pressed="' + (LV === 2) + '">Tantangan</button></div>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-ar="go">Main sekarang</button></div><p class="sys" style="margin:8px auto 0">' + (best ? "Skor terbaik: <b>" + best + "</b>" : "Belum dimainkan") + '</p></div>' +
    '<h2>Skill Cak Takok</h2><div class="ar-leg">' + SK.map(function (s, i) { return '<div><b>' + s[0] + '</b><small>' + ["Loncat dan hantam sekitar tujuan", "Tameng 3 detik dan lari lebih cepat", "Ledakan besar dan pulihkan nyawa"][i] + ' &middot; ' + s[1] + ' dtk</small></div>'; }).join("") + '</div>' +
    '<h2>Toko item</h2><div class="ar-leg">' + ITEM.map(function (s) { return '<div><b>' + s[0] + ' <em>' + s[1] + '</em></b><small>' + s[2] + ' (maks. 3)</small></div>'; }).join("") + '</div>' +
    '<h2>Cara menang</h2><p class="sys">Serangan berjalan otomatis ke musuh terdekat. Geser jari di layar untuk bergerak, ketuk tombol skill dan item di bawah. Nexus musuh baru bisa diserang setelah satu menara mereka jatuh. Kontrol keyboard: WASD, tombol 1-2-3 untuk skill, 4-5-6 untuk item.</p>');
}
function play() {
  API.stopAll(); API.ping("arena"); API.title("Arena Zona");
  API.view(API.bar("Arena Zona", "Skor terbaik " + (API.G().best.ar || 0)) + '<div class="tg ar-w"><canvas id="arc" role="img" aria-label="Area permainan Arena Zona"></canvas><div class="tg-ov" id="aro"><b>Siap bertempur?</b><small>Geser di layar untuk bergerak</small><button type="button" class="send" data-ar="start">Mulai</button></div></div>' +
    '<div class="ar-ctl">' + SK.map(function (s, i) { return '<button type="button" class="ar-sk" id="ars' + i + '" data-ar="s' + i + '"><span>' + s[0] + '</span><i></i></button>'; }).join("") + '</div>' +
    '<div class="ar-ctl ar-it">' + ITEM.map(function (s, i) { return '<button type="button" id="ari' + i + '" data-ar="i' + i + '"><span>' + s[0] + '</span><em>' + s[1] + '</em></button>'; }).join("") + '</div>');
  var c = $("arc"), dpr = Math.min(2, window.devicePixelRatio || 1); c.width = VW * dpr; c.height = VH * dpr; var x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  var S = baru(LV); S.c = c; S.x = x; CUR = S; kunci();
  function pos(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height]; }
  var pid = null;
  c.addEventListener("pointerdown", function (e) { if (pid != null) return; pid = e.pointerId; try { c.setPointerCapture(pid); } catch (z) {} var p = pos(e), j = S.joy; j.on = true; j.ox = j.kx = p[0]; j.oy = j.ky = p[1]; j.x = j.y = 0; });
  c.addEventListener("pointermove", function (e) { if (e.pointerId !== pid) return; var p = pos(e), j = S.joy, dx = p[0] - j.ox, dy = p[1] - j.oy, d = Math.hypot(dx, dy), k = Math.min(1, d / 40); j.x = d ? dx / d * k : 0; j.y = d ? dy / d * k : 0; j.kx = j.ox + j.x * 40; j.ky = j.oy + j.y * 40; });
  function up(e) { if (e.pointerId !== pid) return; pid = null; S.joy.on = false; S.joy.x = S.joy.y = 0; }
  c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  S.begin = function () { if (S.run) return; var o = $("aro"); if (o) o.hidden = true; S.run = true; };
  requestAnimationFrame(function f(ts) { loop(S, ts, f); });
}
function loop(S, ts, f) {
  if (CUR !== S || $("arc") !== S.c) return;
  var dt = Math.min(.05, (ts - (S.last || ts)) / 1000); S.last = ts;
  if (S.run && !S.over) step(S, dt); draw(S); ui(S);
  if (S.over && !S.done) { S.done = true; setTimeout(function () { if (CUR === S) selesai(S); }, 1100); }
  requestAnimationFrame(function (t) { f(t); });
}
function selesai(S) {
  var win = S.res === "win", score = (win ? 700 : 0) + S.towers * 100 + S.kills * 60 + S.mins * 5, g = API.G(), baru2 = score > (g.best.ar || 0), st = win ? (S.deaths <= 1 ? 3 : 2) : 1;
  API.fin("arena", {title: win ? "Zona direbut! Menang!" : "Antrean Raksasa menang", stars: st, sub: (win ? "Antrean Raksasa runtuh. " : "PTSP kita jatuh. ") + "Skor <b>" + score + "</b> &middot; menara " + S.towers + "/3 &middot; kalahkan Si Ruwet " + S.kills + "x &middot; durasi " + Math.floor(S.t / 60) + ":" + String(Math.floor(S.t % 60)).padStart(2, "0") + (baru2 ? ". Rekor baru!" : "."),
    pts: Math.min(80, Math.round(score / 20) + 5), bk: "ar", bv: score, m: {arena: S.towers}, again: play,
    share: "Saya " + (win ? "menang" : "bertahan") + " di Arena Zona (skor " + score + ", " + S.towers + " menara), Ruang Main Takok Pelayanan Suroboyo. Berani menandingi?\n" + location.origin});
}
function kunci() {
  if (KON) return; KON = true;
  document.addEventListener("keydown", function (e) {
    if (!CUR || !$("arc") || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName)) return; var k = (e.key || "").toLowerCase();
    if ("wasd".indexOf(k) > -1 && k.length === 1 || k.indexOf("arrow") === 0) { KEYS[k] = 1; e.preventDefault(); return; }
    var m = {"1": 0, j: 0, "2": 1, k: 1, "3": 2, l: 2}; if (k in m) skill(CUR, m[k]); var it = {"4": 0, "5": 1, "6": 2}; if (k in it) beli(CUR, it[k]);
  });
  document.addEventListener("keyup", function (e) { delete KEYS[(e.key || "").toLowerCase()]; });
}
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-ar],[data-g=\"arena\"]"); if (!b) return;
  if (b.dataset.g === "arena") { menu(); return; }
  var a = b.dataset.ar;
  if (a === "go") play(); else if (a === "start" && CUR) CUR.begin();
  else if (a === "lv") { LV = +b.dataset.v === 2 ? 2 : 1; [].forEach.call(document.querySelectorAll("[data-ar=\"lv\"]"), function (n) { n.setAttribute("aria-pressed", String(+n.dataset.v === LV)); }); }
  else if (CUR && /^s\d$/.test(a)) skill(CUR, +a[1]); else if (CUR && /^i\d$/.test(a)) beli(CUR, +a[1]);
});
window.ArenaZona = {menu: menu, play: play, _new: baru, _step: step, _skill: skill, _beli: beli};
})();
