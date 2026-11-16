"use strict";
/* Arena Suroboyo 3D (Ruang Main): arena tempur bergaya MOBA, 3 lawan 3 melawan bot, tanpa library (WebGL mentah memakai mesin Arus Kalimas).
   Peta 3 jalur dengan Kali Mas di tengah, 2 menara per jalur, pasukan yang keluar tiap gelombang, monster hutan, markas (Tugu vs Sarang Boyo).
   Hero: Cak Takok (petarung), Ning Suroboyo (penyihir), Pak Bhabin (penjaga), masing-masing 3 jurus. Level, emas, toko item, pulang ke markas,
   minimap, bot dengan perilaku lini. Kontrol: joystick melayang, tombol serang dan jurus; di komputer WASD/klik tanah, J/Spasi, Q/E/R, B, Tab. */
(function () {
var G = window.TKGL, API = window.TKGM; if (!G || !API) return;
var $ = function (i) { return document.getElementById(i); };
var clamp = G.clamp, lerp = G.lerp, model = G.model, mul = G.mul;
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
var QK = "tk_mb_q", HK = "tk_mb_hero", DK = "tk_mb_diff", TOPK = "tk_mb_top";
var CUR = null, KEY_ON = false, UID = 0;
var LX = [-28, 0, 28], BZ = 50;
var TC = [[0.25, 0.5, 1], [0.95, 0.28, 0.22]];
var TN = ["Biru", "Merah"];

/* ---------- Data hero dan item ---------- */
var HD = {
  cak: {id: "cak", nm: "Cak Takok", role: "Petarung", rng: 2.7, hp: 1000, atk: 58, as: 0.85, spd: 6.3, ranged: false, col: [0.88, 0.2, 0.2], c2: [0.2, 0.2, 0.3], st: [4, 3, 3],
    sk: [{nm: "Tebas Kilat", cd: 6, rng: 8}, {nm: "Pusaran Dayung", cd: 9, rng: 4.5}, {nm: "Amukan Arek", cd: 40, rng: 6}], ds: "Menembus lawan, memutar dayung, lalu mengamuk."},
  ning: {id: "ning", nm: "Ning Suroboyo", role: "Penyihir", rng: 9, hp: 760, atk: 52, as: 0.95, spd: 5.9, ranged: true, col: [0.55, 0.3, 0.9], c2: [0.95, 0.5, 0.8], st: [3, 2, 5],
    sk: [{nm: "Bola Api", cd: 4.5, rng: 13}, {nm: "Hujan Bintang", cd: 9, rng: 12}, {nm: "Banjir Kalimas", cd: 40, rng: 15}], ds: "Menembak jauh dan menyapu lawan dengan banjir."},
  pak: {id: "pak", nm: "Pak Bhabin", role: "Penjaga", rng: 2.7, hp: 1350, atk: 44, as: 1.0, spd: 5.7, ranged: false, col: [0.15, 0.5, 0.3], c2: [0.2, 0.3, 0.6], st: [2, 5, 3],
    sk: [{nm: "Pukulan Perisai", cd: 8, rng: 4}, {nm: "Benteng Arek", cd: 14, rng: 0}, {nm: "Gempa Pasar", cd: 45, rng: 7}], ds: "Menahan serangan dan membuat lawan terpaku."}
};
var BOTN = {cak: "Suro Perkasa", ning: "Boyo Penyihir", pak: "Karang Raksasa"};
var ITEMS = [
  {id: "pedang", nm: "Pedang Surabaya", ket: "Serangan +14%", harga: 350}, {id: "zirah", nm: "Zirah Kerapu", ket: "Nyawa +22%", harga: 400},
  {id: "sepatu", nm: "Sepatu Boyo", ket: "Kecepatan +10%", harga: 300}, {id: "jimat", nm: "Jimat Arek", ket: "Cooldown -12%", harga: 450}
];
var DIFF = {mudah: {a: 0.82, t: 0.5, n: "Mudah"}, normal: {a: 1, t: 0.3, n: "Normal"}, sulit: {a: 1.18, t: 0.18, n: "Sulit"}};
function getHero() { try { var h = localStorage.getItem(HK); return HD[h] ? h : "cak"; } catch (e) { return "cak"; } }
function getDiff() { try { var d = localStorage.getItem(DK); return DIFF[d] ? d : "normal"; } catch (e) { return "normal"; } }
function getQ() { try { var q = localStorage.getItem(QK); return q === "0" || q === "1" || q === "2" ? +q : -1; } catch (e) { return -1; } }
function topList() { try { var a = JSON.parse(localStorage.getItem(TOPK) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function topAdd(s, w) { var e = {s: s, w: w, d: Date.now()}, a = topList(); a.push(e); a.sort(function (x, y) { return y.s - x.s; }); a = a.slice(0, 5); try { localStorage.setItem(TOPK, JSON.stringify(a)); } catch (x) {} return a.indexOf(e) + 1; }

/* ---------- Shader tanah ---------- */
var VS_G = "attribute vec3 aP;uniform mat4 uVP;varying vec3 vWP;void main(){vWP=aP;gl_Position=uVP*vec4(aP,1.);}";
var FS_G = G.PRE + "varying vec3 vWP;uniform vec3 uCam,uSunCol,uAmbT,uAmbB,uFog;uniform float uFogD,uTime;" +
  "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}" +
  "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}" +
  "void main(){vec2 p=vWP.xz;float n=vn(p*.3)*.55+vn(p*1.1)*.3+vn(p*4.)*.15;vec3 col=mix(vec3(.2,.45,.18),vec3(.34,.6,.24),n);float az=abs(p.y);" +
  "col=mix(col,p.y>0.?vec3(.25,.45,.52):vec3(.52,.42,.2),.16*smoothstep(20.,46.,az));" +
  "float dl=min(min(abs(p.x+28.),abs(p.x)),abs(p.x-28.));float rv=(1.-smoothstep(3.3,4.3,dl))*(1.-step(41.,az));" +
  "float rh=(1.-smoothstep(2.3,3.1,abs(az-40.)))*(1.-step(29.,abs(p.x)));float road=max(rv,rh);" +
  "vec3 dirt=mix(vec3(.66,.56,.4),vec3(.55,.46,.33),n);dirt+=(vn(p*8.)-.5)*.06;col=mix(col,dirt,road);" +
  "float bd=length(vec2(p.x,az-50.));float pl=1.-smoothstep(12.,13.2,bd);vec3 st=p.y>0.?vec3(.5,.62,.84):vec3(.84,.5,.45);st*=.85+.15*vn(p*2.);col=mix(col,st,pl);" +
  "col=mix(col,vec3(1.,.95,.8),smoothstep(.7,0.,abs(bd-12.2))*.5);" +
  "float rr=1.-smoothstep(3.2,4.4,abs(p.y));vec2 q=vec2(p.x*.5+uTime*.3,p.y*.9);float w=vn(q*2.)+vn(q*5.+uTime*.4)*.5;" +
  "vec3 wc=mix(vec3(.05,.3,.32),vec3(.2,.55,.55),w*.7);wc+=vec3(.5,.7,.7)*pow(vn(p*3.+uTime*.8),6.)*.8;float eg=smoothstep(3.4,4.1,abs(p.y))*(1.-smoothstep(4.1,4.6,abs(p.y)));wc=mix(wc,vec3(.85,.95,.95),eg*.5);col=mix(col,wc,rr);" +
  "vec3 lit=col*(uAmbT*.9+uSunCol*.62);float dist=length(uCam-vWP);float f=1.-exp(-pow(uFogD*dist,2.));lit=mix(lit,uFog,clamp(f,0.,1.));gl_FragColor=vec4(lit,1.);}";

/* ---------- Mesin ---------- */
function engine(c) {
  var gl = c.getContext("webgl", {antialias: false, alpha: false, powerPreference: "high-performance"}) || c.getContext("experimental-webgl", {antialias: false, alpha: false});
  if (!gl) throw new Error("no webgl");
  var R = {gl: gl, P: {}, M: {}, T: {}, W: 0, H: 0, post: true};
  R.P.mesh = G.prog(gl, G.VS_MESH, G.FS_MESH); R.P.pt = G.prog(gl, G.VS_PT, G.FS_PT); R.P.g = G.prog(gl, VS_G, FS_G);
  R.P.bright = G.prog(gl, G.VS_Q, G.FS_BRIGHT); R.P.blur = G.prog(gl, G.VS_Q, G.FS_BLUR); R.P.comp = G.prog(gl, G.VS_Q, G.FS_COMP);
  function mk(v) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW); return {b: b, n: v.length / 6}; }
  R.M = {box: mk(G.mBox()), cyl: mk(G.mCyl(14)), cone: mk(G.mCone(12)), pyr: mk(G.mPyr()), sph: mk(G.mSphere(9, 14))};
  R.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, R.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  R.gb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, R.gb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-90, 0, -90, 90, 0, -90, -90, 0, 90, 90, 0, 90]), gl.STATIC_DRAW);
  R.pbuf = gl.createBuffer(); R.pdat = new Float32Array(900 * 11);
  function tex(w, h) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  function fbo(w, h, depth) {
    var t = tex(w, h), f = gl.createFramebuffer(), d = null; gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (depth) { d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d); }
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER, null); return {t: t, f: f, d: d, ok: ok, w: w, h: h};
  }
  function free(o) { if (!o) return; gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); if (o.d) gl.deleteRenderbuffer(o.d); }
  R.resize = function (w, h) {
    if (w === R.W && h === R.H) return; R.W = w; R.H = h; c.width = w; c.height = h; free(R.T.s); free(R.T.a); free(R.T.b);
    R.T.s = fbo(w, h, true); var bw = Math.max(4, w >> 2), bh = Math.max(4, h >> 2); R.T.a = fbo(bw, bh, false); R.T.b = fbo(bw, bh, false); R.post = R.T.s.ok && R.T.a.ok && R.T.b.ok;
  };
  return R;
}

/* ---------- Dunia statis ---------- */
var OB = [];   // rintangan bulat: {x,z,r}
var STATIC = [];
function sitem(mesh, x, y, z, sx, sy, sz, col, o) { var M = model(x, y, z, sx, sy, sz, (o && o.ry) || 0, (o && o.rz) || 0); STATIC.push({mesh: mesh, m: M.m, nm: M.nm, col: col, o: o || {}, x: x, z: z}); }
function buildWorld() {
  STATIC = []; OB = []; var Rn = G.seeded(11), i, k;
  LX.forEach(function (x) {
    sitem("box", x, 0, 0, 8.6, 0.16, 9.6, [0.58, 0.45, 0.32], {});
    sitem("box", x - 4.2, 0.1, 0, 0.35, 0.7, 9.6, [0.42, 0.32, 0.22], {}); sitem("box", x + 4.2, 0.1, 0, 0.35, 0.7, 9.6, [0.42, 0.32, 0.22], {});
    for (i = -1; i <= 1; i += 2) { sitem("cyl", x - 4.2, 0.1, i * 4.6, 0.7, 1.3, 0.7, [0.7, 0.62, 0.5], {}); sitem("cyl", x + 4.2, 0.1, i * 4.6, 0.7, 1.3, 0.7, [0.7, 0.62, 0.5], {}); }
  });
  function nearLane(x, z) { var d = Math.min(Math.abs(x + 28), Math.abs(x), Math.abs(x - 28)); if (d < 7 && Math.abs(z) < 43) return true; if (Math.abs(Math.abs(z) - 40) < 5.5 && Math.abs(x) < 33) return true; return false; }
  var n = 0, tries = 0;
  while (n < 80 && tries++ < 700) {
    var x = (Rn() * 2 - 1) * 56, z = (Rn() * 2 - 1) * 56;
    if (nearLane(x, z) || Math.abs(z) < 6.5 || Math.hypot(x, Math.abs(z) - 50) < 16) continue;
    if ((Math.abs(Math.abs(x) - 14) < 5 && Math.abs(Math.abs(z) - 20) < 5)) continue;
    var h = 2.4 + Rn() * 1.6; sitem("cyl", x, 0, z, 0.55, h, 0.55, [0.34, 0.22, 0.12], {});
    sitem(Rn() < 0.5 ? "cone" : "sph", x, h - 0.4, z, 3.2 + Rn(), 3 + Rn() * 1.6, 3.2 + Rn(), [0.12 + Rn() * 0.1, 0.42 + Rn() * 0.18, 0.16 + Rn() * 0.06], {}); OB.push({x: x, z: z, r: 0.9}); n++;
  }
  for (i = 0; i < 18; i++) { var rx = (Rn() * 2 - 1) * 56, rz = (Rn() * 2 - 1) * 54; if (nearLane(rx, rz) || Math.abs(rz) < 6) continue; sitem("sph", rx, 0, rz, 1.5 + Rn(), 1.1 + Rn() * 0.6, 1.4 + Rn(), [0.5, 0.5, 0.52], {}); OB.push({x: rx, z: rz, r: 1.0}); }
  /* ring kota di luar peta */
  var BC = [[0.93, 0.86, 0.72], [0.82, 0.45, 0.35], [0.55, 0.72, 0.7], [0.88, 0.78, 0.5], [0.72, 0.75, 0.82]];
  for (i = -8; i <= 8; i++) {
    [[-68, i * 8.5], [68, i * 8.5]].forEach(function (p) { var hh = 6 + Rn() * 14; sitem("box", p[0] + (Rn() - 0.5) * 3, 0, p[1], 9 + Rn() * 3, hh, 7.5, BC[Math.floor(Rn() * 5)], {win: 1, seed: Rn() * 90}); });
  }
  for (i = -6; i <= 6; i++) [[i * 10, -76], [i * 10, 76]].forEach(function (p) { var hh = 8 + Rn() * 16; sitem("box", p[0], 0, p[1], 9, hh, 8, BC[Math.floor(Rn() * 5)], {win: 1, seed: Rn() * 90}); });
  /* air mancur dan panggung markas */
  [1, -1].forEach(function (s) {
    var fc = s > 0 ? [0.5, 0.75, 1] : [1, 0.55, 0.45];
    sitem("cyl", 0, 0, s * 44, 7.4, 0.5, 7.4, [0.78, 0.76, 0.7], {}); sitem("cyl", 0, 0.4, s * 44, 6, 0.3, 6, [0.2, 0.5, 0.65], {em: [0.05, 0.15, 0.2]});
    sitem("cyl", 0, 0.5, s * 44, 0.9, 2, 0.9, [0.8, 0.78, 0.72], {}); sitem("sph", 0, 2.7, s * 44, 1.1, 1.1, 1.1, fc, {em: [fc[0] * 0.9, fc[1] * 0.9, fc[2] * 0.9]});
    for (var q = 0; q < 8; q++) { var a = q / 8 * 6.2832; sitem("cyl", Math.cos(a) * 11, 0, s * 50 + Math.sin(a) * 11, 0.5, 2.6, 0.5, [0.8, 0.78, 0.7], {}); sitem("sph", Math.cos(a) * 11, 2.4, s * 50 + Math.sin(a) * 11, 0.6, 0.6, 0.6, fc, {em: [fc[0], fc[1], fc[2]]}); }
  });
}

/* ---------- Unit ---------- */
function mk(S, o) {
  var u = {id: ++UID, dead: false, ang: 0, cdA: 0, swing: 0, hurtT: 0, st: {stun: 0, slow: 0, shield: 0, buff: 0, aM: 1, sM: 1, steal: 0}, tgt: null, wp: 0, rad: 0.8, cd: [0, 0, 0], gold: 0, lvl: 1, xp: 0, items: {}, rm: 0, spawnT: 0, bob: Math.random() * 6, mv: 0};
  for (var k in o) u[k] = o[k];
  u.hp = u.maxhp; S.U.push(u); return u;
}
function recompute(u) {
  if (u.type !== "hero") return; var d = u.def, L = u.lvl - 1, it = u.items, old = u.maxhp || 0;
  u.maxhp = d.hp * (1 + 0.13 * L) * (1 + 0.22 * (it.zirah || 0)); u.atk = d.atk * (1 + 0.1 * L) * (1 + 0.14 * (it.pedang || 0)) * (u.am || 1);
  u.spd = d.spd * (1 + 0.1 * (it.sepatu || 0)); u.cdr = Math.min(0.5, 0.12 * (it.jimat || 0)); if (old) u.hp += Math.max(0, u.maxhp - old);
}
function path(team, lane) {
  var s = team === 0 ? 1 : -1, x = LX[lane];
  return [[0, s * 44], [x, s * 38], [x, -s * 38], [0, -s * 44]];
}
function spawnHero(S, def, team, o) {
  var idx = o.idx, u = mk(S, {type: "hero", team: team, def: def, name: o.name, player: !!o.player, lane: o.lane, maxhp: def.hp, atk: def.atk, as: def.as, spd: def.spd, rng: def.rng, rad: 0.9, gold: 300, kills: 0, deaths: 0, am: o.am || 1, base: [(idx - 2) * 7, (team === 0 ? 1 : -1) * 46], need: 0, dead: false, deadT: 0, think: Math.random() * 0.3});
  u.x = u.base[0]; u.z = u.base[1]; u.ang = team === 0 ? Math.PI : 0; recompute(u); u.hp = u.maxhp; return u;
}
function spawnMinion(S, team, lane, kind) {
  var s = team === 0 ? 1 : -1, ranged = kind === "r", u = mk(S, {type: "minion", team: team, lane: lane, kind: kind, maxhp: ranged ? 170 : 260, atk: ranged ? 22 : 16, as: ranged ? 1.1 : 1.0, spd: 4.2, rng: ranged ? 6.5 : 1.9, rad: 0.6, wp: 1, think: 0});
  u.x = (Math.random() - 0.5) * 5; u.z = s * 45 + (Math.random() - 0.5) * 3; u.hp = u.maxhp; u.path = path(team, lane); return u;
}
function spawnWave(S) {
  var kinds = ["m", "m", "r"]; S.waveN++;
  for (var t = 0; t < 2; t++) for (var l = 0; l < 3; l++) kinds.forEach(function (k, i) { S.later.push({t: S.t + i * 0.9, f: (function (t, l, k) { return function () { spawnMinion(S, t, l, k); }; })(t, l, k)}); });
}
function mkTower(S, team, lane, inner) {
  var s = team === 0 ? 1 : -1, u = mk(S, {type: "tower", team: team, lane: lane, inner: inner, maxhp: inner ? 1900 : 1500, atk: 72, as: 1.3, rng: 11.5, rad: 1.9, x: LX[lane], z: s * (inner ? 28 : 14), think: 0});
  u.hp = u.maxhp; OB.push({x: u.x, z: u.z, r: 2.4, tw: u}); return u;
}
function mkNexus(S, team) {
  var s = team === 0 ? 1 : -1, u = mk(S, {type: "nexus", team: team, maxhp: 2600, atk: 0, as: 1, rng: 0, rad: 4.4, x: 0, z: s * 52, inv: true}); u.hp = u.maxhp; OB.push({x: 0, z: s * 52, r: 5, tw: u}); return u;
}
function mkCamp(S, x, z) { var u = mk(S, {type: "neutral", team: 2, maxhp: 750, atk: 34, as: 1.1, spd: 4.4, rng: 2.4, rad: 1.1, x: x, z: z, home: [x, z], agro: null, think: 0, resp: 0}); u.hp = u.maxhp; return u; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function hostile(a, b) { return !b.dead && b.team !== a.team && !(b.inv); }
function find(S, u, range, pri) {
  var best = null, bs = 1e9, d, sc, i, o;
  for (i = 0; i < S.U.length; i++) {
    o = S.U[i]; if (!hostile(u, o) || (o.type === "neutral" && u.team === 2)) continue; d = dist(u, o) - o.rad; if (d > range) continue;
    sc = d + (pri ? pri(o) : 0); if (sc < bs) { bs = sc; best = o; }
  }
  return best;
}

/* ---------- Efek, popup, banner ---------- */
function emit(S, o) { if (S.parts.length < 700) S.parts.push(o); }
function burst(S, x, y, z, n, spd, col, sz, life, g) { for (var i = 0; i < n; i++) emit(S, {x: x, y: y, z: z, vx: (Math.random() - 0.5) * spd, vy: Math.random() * spd * 0.9, vz: (Math.random() - 0.5) * spd, l: life * (0.6 + Math.random() * 0.6), m: life, s: sz, c: col, g: g == null ? 8 : g}); }
function ring(S, x, z, r, col, t) { S.fx.push({x: x, z: z, r: r, t: t || 0.5, m: t || 0.5, c: col}); }
function dmgPop(S, u, txt, col) { if (S.pops.length < 40) S.pops.push({x: u.x + (Math.random() - 0.5), y: 2.6, z: u.z, tx: String(txt), c: col || "#fff", t: 0.9}); }
function feed(S, txt, team) { S.feed.unshift({t: 6, tx: txt, tm: team}); if (S.feed.length > 5) S.feed.pop(); S.feedDirty = true; }
function banner(S, txt, cls) { S.ban = {t: 2.2, tx: txt, cl: cls || ""}; S.banDirty = true; }

/* ---------- Pertempuran ---------- */
function hurt(S, tgt, amt, src, o) {
  if (tgt.dead || tgt.inv) return 0; o = o || {};
  if (src && src.type === "hero") amt *= src.st.aM; if (src && src.diff) amt *= src.diff;
  if (tgt.st.shield > 0) { var ab = Math.min(tgt.sh || 0, amt); tgt.sh -= ab; amt -= ab; if (tgt.sh <= 0) tgt.st.shield = 0; }
  if (tgt.type === "tower" && src && src.type === "minion") amt *= 0.55;
  if (amt <= 0) { return 0; } tgt.hp -= amt; tgt.hurtT = 0.18;
  if (src && src.st && src.st.steal > 0) src.hp = Math.min(src.maxhp, src.hp + amt * src.st.steal);
  if (src && src.type === "hero" && src.player || tgt.player) dmgPop(S, tgt, Math.round(amt), tgt.player ? "#ff7777" : "#ffe27a");
  if (tgt.player) { S.hitK = 1; S.shake = Math.max(S.shake, 0.3); S.recall = 0; }
  if (tgt.type === "neutral" && src) tgt.agro = src;
  if (tgt.type === "hero" && src && src.type === "hero") tgt.lastHit = {id: src.id, t: S.t};
  if (tgt.hp <= 0) die(S, tgt, src); return amt;
}
function reward(S, dead, killer, gold, xp, near) {
  S.U.forEach(function (h) {
    if (h.type !== "hero" || h.dead || h.team === dead.team) return;
    var d = dist(h, dead), got = false;
    if (killer && killer.id === h.id) { h.gold += gold; got = true; } else if (near && d < near) { h.gold += Math.round(gold * 0.35); got = true; }
    if (d < 20 || (killer && killer.id === h.id)) { h.xp += xp; while (h.lvl < 9 && h.xp >= 90 + h.lvl * 60) { h.xp -= 90 + h.lvl * 60; h.lvl++; recompute(h); h.hp = Math.min(h.maxhp, h.hp + h.maxhp * 0.2); burst(S, h.x, 1.5, h.z, 16, 6, [1, 0.9, 0.4], 22, 0.8, -2); if (h.player) { banner(S, "NAIK LEVEL " + h.lvl + "!", "lv"); API.beep(880, 0.15); } } }
    if (h.player && got && killer && killer.id === h.id && gold >= 15) dmgPop(S, dead, "+" + gold, "#ffd24a");
  });
}
function die(S, u, src) {
  u.dead = true; u.hp = 0; var kt = src ? src.team : -1;
  if (u.type === "minion") { reward(S, u, src && src.type === "hero" ? src : null, 22, 28, 14); u.rm = 0.8; burst(S, u.x, 0.8, u.z, 8, 4, TC[u.team], 14, 0.5, 6); }
  else if (u.type === "neutral") { reward(S, u, src && src.type === "hero" ? src : null, 75, 85, 0); u.resp = 45; u.rm = 0.8; burst(S, u.x, 1, u.z, 16, 6, [0.4, 1, 0.4], 20, 0.7, 6); if (src && src.type === "hero" && src.player) banner(S, "Boyo Penjaga dikalahkan!", "k"); }
  else if (u.type === "hero") {
    u.deaths++; u.deadT = 5 + u.lvl * 1.6; u.rm = 0; burst(S, u.x, 1.2, u.z, 26, 8, TC[u.team], 24, 0.9, 7);
    var sr = src && src.type === "hero" ? src : null; if (sr) sr.kills++; if (kt === 0 || kt === 1) S.kills[kt]++;
    reward(S, u, sr, 200 + u.lvl * 20, 120 + u.lvl * 25, 18);
    var nm = (sr ? sr.name : (src && src.type === "tower" ? "Menara" : "Pasukan")), fb = !S.fb && kt >= 0; S.fb = S.fb || fb;
    feed(S, nm + " mengalahkan " + u.name, kt); if (fb) banner(S, "FIRST BLOOD!", "k5"); else if (u.player) banner(S, "Anda dikalahkan", "d"); else if (sr && sr.player) banner(S, "Kamu mengalahkan " + u.name + "!", "k");
    if (u.player) { S.recall = 0; }
  }
  else if (u.type === "tower") {
    S.U.forEach(function (h) { if (h.type === "hero" && h.team !== u.team && !h.dead) { h.gold += 120; h.xp += 60; } });
    burst(S, u.x, 2, u.z, 40, 12, [1, 0.7, 0.3], 30, 1.1, 8); S.shake = Math.max(S.shake, 1); API.beep(140, 0.3); S.towersDown[u.team]++;
    var ln = ["kiri", "tengah", "kanan"][u.lane]; feed(S, "Menara " + TN[u.team] + " " + ln + " hancur", 1 - u.team); banner(S, "Menara " + TN[u.team] + " hancur!", u.team === 0 ? "d" : "k");
    if (u.inner) { var nx = S.nexus[u.team]; if (nx && nx.inv) { nx.inv = false; banner(S, "Markas " + TN[u.team] + " terbuka!", "k5"); } }
  } else if (u.type === "nexus") { S.win = 1 - u.team; S.over = true; S.shake = 2; burst(S, u.x, 4, u.z, 90, 18, TC[u.team], 36, 1.6, 6); API.beep(100, 0.6); }
}
function attack(S, u, t) {
  u.cdA = u.as / (u.st.aM > 1 && u.type === "hero" ? 1.0 + (u.st.aM - 1) * 0.5 : 1); u.swing = 0.28; u.ang = Math.atan2(t.x - u.x, t.z - u.z);
  if (u.type === "hero" && u.player) S.afk = 0;
  if (u.rng <= 3.2) { hurt(S, t, u.atk, u); burst(S, t.x, 1.2, t.z, 4, 4, [1, 0.9, 0.7], 12, 0.3, 4); if (u.player) API.beep(200 + Math.random() * 60, 0.03); }
  else S.P.push({x: u.x, y: u.type === "tower" ? 5 : 1.6, z: u.z, tgt: t, spd: u.type === "tower" ? 22 : 17, dmg: u.atk, team: u.team, src: u, col: u.type === "hero" ? u.def.c2 : TC[u.team], r: u.type === "tower" ? 0.55 : 0.32, life: 3});
}
function aoe(S, x, z, r, team, src, dmg, o) {
  o = o || {}; var n = 0;
  S.U.forEach(function (e) {
    if (e.dead || e.team === team || e.inv || e.type === "tower" || e.type === "nexus") return; if (Math.hypot(e.x - x, e.z - z) > r + e.rad) return;
    if (e.type === "neutral" && team === 2) return; hurt(S, e, dmg, src); n++;
    if (o.stun) e.st.stun = Math.max(e.st.stun, o.stun); if (o.slow) { e.st.slow = Math.max(e.st.slow, o.slow); }
  });
  return n;
}
function aimDir(S, u, rng) {
  var t = find(S, u, rng, function (o) { return o.type === "hero" ? -3 : (o.type === "neutral" ? 0 : (o.type === "minion" ? 0 : 8)); });
  if (t && t.type !== "tower" && t.type !== "nexus") { var d = Math.hypot(t.x - u.x, t.z - u.z) || 1; return {dx: (t.x - u.x) / d, dz: (t.z - u.z) / d, t: t}; }
  return {dx: Math.sin(u.ang), dz: Math.cos(u.ang), t: null};
}
function skill(S, u, i) {
  if (u.dead || u.st.stun > 0 || u.cd[i] > 0 || !u.def) return false; var d = u.def, k = d.sk[i], a = aimDir(S, u, k.rng + 2), id = d.id, ok = true;
  if (id === "cak") {
    if (i === 0) { u.dash = {t: 0.22, vx: a.dx * 7 / 0.22, vz: a.dz * 7 / 0.22, hit: {}}; u.ang = Math.atan2(a.dx, a.dz); burst(S, u.x, 1, u.z, 14, 5, [1, 0.4, 0.3], 20, 0.4, 2); }
    else if (i === 1) { aoe(S, u.x, u.z, 4.4, u.team, u, 100 + u.atk * 0.8); ring(S, u.x, u.z, 4.4, [1, 0.5, 0.3], 0.4); u.swing = 0.5; u.spin = 0.5; burst(S, u.x, 1, u.z, 22, 9, [1, 0.8, 0.5], 22, 0.5, 3); }
    else { u.st.buff = 8; u.st.aM = 1.45; u.st.sM = 1.25; u.st.steal = 0.25; ring(S, u.x, u.z, 3, [1, 0.3, 0.2], 0.8); burst(S, u.x, 1.5, u.z, 30, 7, [1, 0.3, 0.2], 26, 0.9, -1); }
  } else if (id === "ning") {
    if (i === 0) { u.ang = Math.atan2(a.dx, a.dz); S.P.push({x: u.x, y: 1.6, z: u.z, vx: a.dx * 19, vz: a.dz * 19, spd: 19, dmg: 120 + u.atk * 1.0, team: u.team, src: u, col: [1, 0.5, 0.2], r: 0.7, life: 0.85, sk: true, area: 1.8}); }
    else if (i === 1) { var tx = a.t ? a.t.x : u.x + a.dx * 8, tz = a.t ? a.t.z : u.z + a.dz * 8; S.Z.push({x: tx, z: tz, r: 4, t: 0.7, m: 0.7, dmg: 140 + u.atk * 1.1, team: u.team, src: u, slow: 1.8, col: [0.8, 0.6, 1]}); }
    else { u.ang = Math.atan2(a.dx, a.dz); S.P.push({x: u.x, y: 0.8, z: u.z, vx: a.dx * 26, vz: a.dz * 26, spd: 26, dmg: 300 + u.atk * 1.4, team: u.team, src: u, col: [0.3, 0.8, 1], r: 2.4, life: 0.72, sk: true, wave: true, hit: {}}); API.beep(180, 0.3); }
  } else {
    if (i === 0) { var fx = u.x + a.dx * 2.3, fz = u.z + a.dz * 2.3; aoe(S, fx, fz, 3.1, u.team, u, 80 + u.atk * 0.8, {stun: 1.0}); ring(S, fx, fz, 3.1, [0.4, 0.9, 0.6], 0.35); u.swing = 0.4; u.ang = Math.atan2(a.dx, a.dz); burst(S, fx, 1, fz, 16, 7, [0.5, 1, 0.7], 20, 0.4, 3); }
    else if (i === 1) { u.st.shield = 3.5; u.sh = 280 + u.maxhp * 0.12; ring(S, u.x, u.z, 2.6, [0.4, 0.8, 1], 0.5); }
    else { aoe(S, u.x, u.z, 7, u.team, u, 170 + u.atk * 1.2, {stun: 1.4}); ring(S, u.x, u.z, 7, [1, 0.8, 0.4], 0.6); S.shake = Math.max(S.shake, u.player ? 1.1 : 0.4); burst(S, u.x, 0.5, u.z, 34, 12, [1, 0.8, 0.5], 26, 0.7, 4); API.beep(120, 0.35); }
  }
  u.cd[i] = k.cd; u.cdMax = u.cdMax || [0, 0, 0]; u.cdMax[i] = k.cd * (1 - u.cdr); u.cd[i] = u.cdMax[i];
  if (u.player) { S.afk = 0; API.beep(520 + i * 120, 0.08); } return ok;
}

/* ---------- Gerak ---------- */
function speedOf(u) { var s = (u.type === "hero" ? u.spd : u.spd) * (u.st.buff > 0 ? u.st.sM : 1); if (u.st.slow > 0) s *= 0.55; return s; }
function walkTo(S, u, tx, tz, dt, stop) {
  var dx = tx - u.x, dz = tz - u.z, d = Math.hypot(dx, dz); if (d <= (stop || 0.05)) return d; if (u.st.stun > 0) return d;
  var s = speedOf(u) * dt, st = Math.min(s, d - (stop || 0)); u.x += dx / d * st; u.z += dz / d * st; u.ang = Math.atan2(dx, dz); u.mv = 1; return d - st;
}
function collide(u) {
  var i, o, dx, dz, d, m; if (u.type === "tower" || u.type === "nexus") return;
  for (i = 0; i < OB.length; i++) { o = OB[i]; if (o.tw && o.tw.dead && o.tw.type === "tower") continue; dx = u.x - o.x; dz = u.z - o.z; d = Math.hypot(dx, dz); m = o.r + u.rad * 0.7; if (d < m && d > 0.001) { u.x = o.x + dx / d * m; u.z = o.z + dz / d * m; } }
  u.x = clamp(u.x, -59, 59); u.z = clamp(u.z, -63, 63);
}
function separate(S, dt) {
  var U = S.U, i, j, a, b, dx, dz, d, m, p;
  for (i = 0; i < U.length; i++) { a = U[i]; if (a.dead || a.type === "tower" || a.type === "nexus") continue;
    for (j = i + 1; j < U.length; j++) { b = U[j]; if (b.dead || b.type === "tower" || b.type === "nexus") continue; dx = a.x - b.x; dz = a.z - b.z; if (dx > 2.5 || dx < -2.5 || dz > 2.5 || dz < -2.5) continue; d = Math.hypot(dx, dz); m = (a.rad + b.rad) * 0.8;
      if (d < m && d > 0.001) { p = (m - d) * 0.5 * Math.min(1, dt * 12); var wa = a.type === "hero" ? 0.3 : 1, wb = b.type === "hero" ? 0.3 : 1, sw = wa + wb; a.x += dx / d * p * 2 * wb / sw; a.z += dz / d * p * 2 * wb / sw; b.x -= dx / d * p * 2 * wa / sw; b.z -= dz / d * p * 2 * wa / sw; } } }
}

/* ---------- Pikiran unit ---------- */
function minionThink(S, u, dt) {
  var t = find(S, u, 7, function (o) { return o.type === "minion" ? 0 : o.type === "hero" ? 2 : o.type === "neutral" ? 20 : 4; });
  if (t && u.team === 2) t = null;
  if (t) { var d = dist(u, t) - t.rad; if (d <= u.rng) { u.ang = Math.atan2(t.x - u.x, t.z - u.z); if (u.cdA <= 0 && u.st.stun <= 0) attack(S, u, t); } else walkTo(S, u, t.x, t.z, dt, u.rng + t.rad * 0.6); }
  else { var P = u.path, w = P[Math.min(u.wp, P.length - 1)]; if (walkTo(S, u, w[0], w[1], dt, 1.5) < 2 && u.wp < P.length - 1) u.wp++; else if (u.wp >= P.length - 1) { var nx = S.nexus[1 - u.team]; if (nx && dist(u, nx) < nx.rad + u.rng + 1) { if (u.cdA <= 0) attack(S, u, nx); } } }
}
function towerThink(S, u, dt) {
  if (u.cdA > 0) return; var t = find(S, u, u.rng, function (o) { return o.type === "minion" ? 0 : o.type === "hero" ? (o.lastHit && S.t - o.lastHit.t < 3 ? -6 : 4) : 20; });
  if (t) attack(S, u, t);
}
function neutralThink(S, u, dt) {
  if (u.agro && (u.agro.dead || dist(u, u.agro) > 16 || dist(u, {x: u.home[0], z: u.home[1]}) > 14)) u.agro = null;
  if (u.agro) { var d = dist(u, u.agro) - u.agro.rad; if (d <= u.rng) { u.ang = Math.atan2(u.agro.x - u.x, u.agro.z - u.z); if (u.cdA <= 0 && u.st.stun <= 0) attack(S, u, u.agro); } else walkTo(S, u, u.agro.x, u.agro.z, dt, u.rng); }
  else { if (u.hp < u.maxhp) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * 0.15 * dt); walkTo(S, u, u.home[0], u.home[1], dt, 0.5); }
}
function botBuy(S, u) { if (!u.atHome) return; var tries = 4; while (tries-- > 0) { var it = ITEMS[Math.floor(Math.random() * ITEMS.length)]; if (u.gold >= it.harga && (u.items[it.id] || 0) < 3) { u.gold -= it.harga; u.items[it.id] = (u.items[it.id] || 0) + 1; recompute(u); } } }
function botThink(S, u, dt) {
  u.think -= dt; var D = S.diff, P = path(u.team, u.lane), home = u.base, atHome = Math.hypot(u.x - home[0], u.z - home[1]) < 9; u.atHome = atHome;
  if (u.st.stun > 0) return;
  if (u.retreat && (u.hp > u.maxhp * 0.7)) u.retreat = false; if (!u.retreat && u.hp < u.maxhp * 0.27) u.retreat = true;
  if (atHome) { u.hp = Math.min(u.maxhp, u.hp + u.maxhp * 0.12 * dt); botBuy(S, u); }
  if (u.retreat) { var e0 = find(S, u, 6); if (e0 && u.cdA <= 0 && u.def.ranged) attack(S, u, e0); walkTo(S, u, home[0], home[1], dt, 2); return; }
  var rng = u.rng + 0.5, foe = find(S, u, Math.max(rng, 8), function (o) { return o.type === "hero" ? (o.hp < o.maxhp * 0.4 ? -8 : -2) : o.type === "minion" ? 0 : o.type === "neutral" ? 6 : 10; });
  /* menara musuh: jangan menyerbu tanpa pasukan */
  var tw = find(S, u, 14, function (o) { return o.type === "tower" || o.type === "nexus" ? 0 : 999; });
  if (tw && (tw.type === "tower" || tw.type === "nexus")) {
    var cm = 0; S.U.forEach(function (m) { if (m.type === "minion" && !m.dead && m.team === u.team && dist(m, tw) < 11) cm++; });
    if (cm < 2 && dist(u, tw) < 12.6) { var bx = P[1][0], bz = P[0][1] * 0.45 + (tw.z > 0 ? 0 : 0); walkTo(S, u, u.x + (u.x - tw.x) * 0.2, u.z + (u.z - tw.z), dt, 0.5); return; }
    if (cm >= 2 && !foe) foe = tw;
  }
  if (foe) {
    var d = dist(u, foe) - foe.rad;
    for (var i = 0; i < 3; i++) { if (u.cd[i] <= 0 && u.think <= 0 && foe.type !== "tower" && foe.type !== "nexus") { var k = u.def.sk[i]; if (k.rng > 0 && d <= k.rng && (i < 2 || (foe.type === "hero" && foe.hp < foe.maxhp * 0.75)) && Math.random() < 0.5) { skill(S, u, i); break; } if (k.rng === 0 && i === 1 && u.hp < u.maxhp * 0.6 && S.U.some(function (o) { return o.team !== u.team && !o.dead && o.type === "hero" && dist(o, u) < 9; })) { skill(S, u, i); break; } } }
    if (d <= u.rng) { u.ang = Math.atan2(foe.x - u.x, foe.z - u.z); if (u.cdA <= 0) attack(S, u, foe); }
    else walkTo(S, u, foe.x, foe.z, dt, u.rng * 0.85 + foe.rad);
    if (u.think <= 0) u.think = D.t;
  } else {
    var w = P[Math.min(u.wp, P.length - 1)]; if (walkTo(S, u, w[0], w[1], dt, 2) < 2.6 && u.wp < P.length - 1) u.wp++;
    if (u.wp === 1 && Math.hypot(u.x - w[0], u.z - w[1]) < 2.6) u.wp = 2;
  }
}

/* ---------- State dan langkah simulasi ---------- */
function newState(hero, diffId, fast) {
  var S = {U: [], P: [], Z: [], parts: [], fx: [], pops: [], feed: [], later: [], t: 0, waveN: 0, nextWave: 3, kills: [0, 0], towersDown: [0, 0], fb: false, over: false, win: -1, shake: 0, hitK: 0, diff: DIFF[diffId], diffId: diffId, nexus: [], afk: 0, recall: 0, rt: 0, started: false, sim: !!fast};
  UID = 0; buildWorld();
  S.nexus = [mkNexus(S, 0), mkNexus(S, 1)];
  for (var t = 0; t < 2; t++) for (var l = 0; l < 3; l++) { mkTower(S, t, l, false); mkTower(S, t, l, true); }
  S.camps = [[-14, -20], [14, -20], [-14, 20], [14, 20]].map(function (p) { return mkCamp(S, p[0], p[1]); });
  var ids = ["cak", "ning", "pak"], me = null;
  /* tim biru: pemain + 2 bot; tim merah: 3 bot */
  var blue = [hero], i;
  ids.forEach(function (x) { if (x !== hero && blue.length < 3) blue.push(x); });
  blue.forEach(function (h, k) { var u = spawnHero(S, HD[h], 0, {idx: k + 1, lane: k, name: k === 0 ? "Anda" : BOTN[h], player: k === 0, am: 1}); if (k === 0) { me = u; u.lane = 1; } else u.lane = k === 1 ? 0 : 2; });
  ids.forEach(function (h, k) { spawnHero(S, HD[h], 1, {idx: k + 1, lane: k, name: BOTN[h] + " M", am: S.diff.a}); });
  S.me = me; S.cam = {x: me.x, z: me.z}; S.sel = null;
  return S;
}
function removeDead(S) { var a = S.U; for (var i = a.length - 1; i >= 0; i--) { var u = a[i]; if (u.dead && u.type !== "hero" && u.type !== "tower" && u.type !== "nexus" && u.type !== "neutral" && u.rm <= 0) a.splice(i, 1); } }
function step(S, dt) {
  if (!S.started || S.over) { S.t += 0; return; }
  S.t += dt; S.shake = Math.max(0, S.shake - dt * 2.2); S.hitK = Math.max(0, S.hitK - dt * 3);
  var i, u, j, p;
  /* jadwal tunda */
  for (i = S.later.length - 1; i >= 0; i--) if (S.later[i].t <= S.t) { S.later[i].f(); S.later.splice(i, 1); }
  if (S.t >= S.nextWave) { spawnWave(S); S.nextWave += 28; if (S.waveN === 1) feed(S, "Gelombang pasukan pertama datang", -1); }
  for (i = 0; i < S.U.length; i++) {
    u = S.U[i];
    if (u.rm > 0) u.rm -= dt;
    if (u.dead) {
      if (u.type === "hero") { u.deadT -= dt; if (u.deadT <= 0) { u.dead = false; u.x = u.base[0]; u.z = u.base[1]; u.hp = u.maxhp; u.retreat = false; u.st.stun = 0; u.st.slow = 0; u.st.shield = 0; u.cd = [0, 0, 0]; u.wp = 1; if (u.player) { S.cam.x = u.x; S.cam.z = u.z; banner(S, "Kamu bangkit!", "lv"); } } }
      else if (u.type === "neutral") { u.resp -= dt; if (u.resp <= 0) { u.dead = false; u.hp = u.maxhp; u.x = u.home[0]; u.z = u.home[1]; u.agro = null; } }
      continue;
    }
    u.mv = 0; u.cdA = Math.max(0, u.cdA - dt); u.swing = Math.max(0, u.swing - dt); u.hurtT = Math.max(0, u.hurtT - dt); if (u.spin > 0) u.spin -= dt;
    var s = u.st; if (s.stun > 0) s.stun -= dt; if (s.slow > 0) s.slow -= dt;
    if (s.shield > 0) { s.shield -= dt; if (s.shield <= 0) u.sh = 0; }
    if (s.buff > 0) { s.buff -= dt; if (s.buff <= 0) { s.aM = 1; s.sM = 1; s.steal = 0; } }
    for (j = 0; j < 3; j++) if (u.cd[j] > 0) u.cd[j] = Math.max(0, u.cd[j] - dt);
    if (u.type === "hero") {
      /* pemulihan dasar */
      u.hp = Math.min(u.maxhp, u.hp + u.maxhp * 0.004 * dt);
      var inB = Math.hypot(u.x - u.base[0], u.z - u.base[1]) < 9; if (inB) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * 0.12 * dt);
      /* dash */
      if (u.dash) { u.dash.t -= dt; u.x += u.dash.vx * dt; u.z += u.dash.vz * dt; S.U.forEach(function (e) { if (!e.dead && e.team !== u.team && !e.inv && e.type !== "tower" && e.type !== "nexus" && !u.dash.hit[e.id] && Math.hypot(e.x - u.x, e.z - u.z) < 1.9 + e.rad) { u.dash.hit[e.id] = 1; hurt(S, e, 90 + u.atk * 1.0, u); e.st.slow = 1.2; } }); emit(S, {x: u.x, y: 1, z: u.z, vx: 0, vy: 1, vz: 0, l: 0.3, m: 0.3, s: 24, c: [1, 0.5, 0.35], g: 0}); if (u.dash.t <= 0) u.dash = null; collide(u); continue; }
      if (u.player) playerThink(S, u, dt); else botThink(S, u, dt);
    } else if (u.type === "minion") minionThink(S, u, dt);
    else if (u.type === "tower") towerThink(S, u, dt);
    else if (u.type === "neutral") neutralThink(S, u, dt);
    if (u.type !== "tower" && u.type !== "nexus") collide(u);
  }
  separate(S, dt);
  /* proyektil */
  for (i = S.P.length - 1; i >= 0; i--) {
    p = S.P[i]; p.life -= dt; var gone = p.life <= 0;
    if (p.tgt) { if (p.tgt.dead) gone = true; else { var dx = p.tgt.x - p.x, dz = p.tgt.z - p.z, dy = 1.1 - p.y, d = Math.hypot(dx, dz) || 0.01, st = p.spd * dt; if (d <= st + p.tgt.rad * 0.6) { hurt(S, p.tgt, p.dmg, p.src); burst(S, p.x, p.y, p.z, 5, 4, p.col, 14, 0.3, 2); gone = true; } else { p.x += dx / d * st; p.z += dz / d * st; p.y += dy * Math.min(1, dt * 8); } } }
    else { p.x += p.vx * dt; p.z += p.vz * dt;
      for (j = 0; j < S.U.length && !gone; j++) { var e = S.U[j]; if (e.dead || e.team === p.team || e.inv || e.type === "tower" || e.type === "nexus") continue; if (Math.hypot(e.x - p.x, e.z - p.z) < p.r + e.rad) {
        if (p.wave) { if (!p.hit[e.id]) { p.hit[e.id] = 1; hurt(S, e, p.dmg, p.src); e.st.stun = Math.max(e.st.stun, 0.5); } }
        else { hurt(S, e, p.dmg, p.src); if (p.area) aoe(S, p.x, p.z, p.area, p.team, p.src, p.dmg * 0.4); burst(S, p.x, p.y, p.z, 12, 6, p.col, 18, 0.4, 2); ring(S, p.x, p.z, p.area || 1.5, p.col, 0.3); gone = true; } } }
    }
    if (Math.random() < 0.7) emit(S, {x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, l: 0.25, m: 0.25, s: p.r * 34 + 6, c: p.col, g: 0});
    if (gone) S.P.splice(i, 1);
  }
  /* zona tertunda */
  for (i = S.Z.length - 1; i >= 0; i--) { var z = S.Z[i]; z.t -= dt; if (z.t <= 0) { aoe(S, z.x, z.z, z.r, z.team, z.src, z.dmg, {slow: z.slow}); burst(S, z.x, 1, z.z, 26, 10, z.col, 24, 0.7, 6); ring(S, z.x, z.z, z.r, z.col, 0.45); S.shake = Math.max(S.shake, 0.25); S.Z.splice(i, 1); } }
  /* efek visual */
  for (i = S.fx.length - 1; i >= 0; i--) { S.fx[i].t -= dt; if (S.fx[i].t <= 0) S.fx.splice(i, 1); }
  for (i = S.parts.length - 1; i >= 0; i--) { p = S.parts[i]; p.l -= dt; if (p.l <= 0) { S.parts.splice(i, 1); continue; } p.vy -= p.g * dt; p.x += p.vx * dt; p.y = Math.max(0.05, p.y + p.vy * dt); p.z += p.vz * dt; }
  for (i = S.pops.length - 1; i >= 0; i--) { S.pops[i].t -= dt; S.pops[i].y += dt * 1.6; if (S.pops[i].t <= 0) S.pops.splice(i, 1); }
  for (i = S.feed.length - 1; i >= 0; i--) { S.feed[i].t -= dt; if (S.feed[i].t <= 0) { S.feed.splice(i, 1); S.feedDirty = true; } }
  if (S.ban) { S.ban.t -= dt; if (S.ban.t <= 0) { S.ban = null; S.banDirty = true; } }
  removeDead(S);
  /* kamera mengikuti pemain */
  if (S.me) { var tx = S.me.x, tz = S.me.z; S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 7); S.cam.z += (tz - S.cam.z) * Math.min(1, dt * 7); }
  /* batas waktu: skor menara dan pembunuhan */
  if (S.t > 900 && !S.over) { S.over = true; var a = S.towersDown[1] * 3 + S.kills[0], b = S.towersDown[0] * 3 + S.kills[1]; S.win = a >= b ? 0 : 1; S.timeout = true; }
}
/* pemain: gerak lewat S.mv (vektor -1..1) atau titik tujuan S.goto; serang otomatis target terdekat */
function playerThink(S, u, dt) {
  if (u.st.stun > 0) return;
  var mx = S.mv ? S.mv.x : 0, mz = S.mv ? S.mv.z : 0, moved = false;
  if (S.recall > 0) { S.recall -= dt; if (S.recall <= 0) { u.x = u.base[0]; u.z = u.base[1]; burst(S, u.x, 1, u.z, 20, 6, [0.6, 0.9, 1], 22, 0.7, -1); banner(S, "Kembali ke markas", "lv"); S.rt = 0; } if (mx || mz) S.recall = 0; if (S.recall > 0) { if (Math.random() < 0.4) emit(S, {x: u.x + (Math.random() - 0.5) * 1.4, y: 0.2, z: u.z + (Math.random() - 0.5) * 1.4, vx: 0, vy: 3, vz: 0, l: 0.6, m: 0.6, s: 16, c: [0.5, 0.8, 1], g: 0}); return; } }
  var mg = Math.hypot(mx, mz);
  if (mg > 0.12) { var k = Math.min(1, mg), sp = speedOf(u) * dt * k; u.x += mx / mg * sp; u.z += mz / mg * sp; u.ang = Math.atan2(mx, mz); u.mv = 1; moved = true; S.goto = null; }
  else if (S.goto) { var dd = walkTo(S, u, S.goto.x, S.goto.z, dt, 0.2); moved = true; if (dd < 0.3) S.goto = null; }
  if (!moved && S.sel && !S.sel.dead && dist(u, S.sel) - S.sel.rad > u.rng) { walkTo(S, u, S.sel.x, S.sel.z, dt, u.rng * 0.9); moved = true; }
  /* serang otomatis */
  var tgt = null;
  if (S.sel && !S.sel.dead && dist(u, S.sel) - S.sel.rad <= u.rng + 0.4) tgt = S.sel; else { S.sel = null; tgt = find(S, u, u.rng + 0.3, function (o) { return o.type === "hero" ? -3 : o.type === "minion" ? 0 : o.type === "neutral" ? 1 : 3; }); }
  if (S.atk && !tgt) tgt = find(S, u, u.rng + 1, function (o) { return o.type === "hero" ? -3 : 0; });
  if (tgt && u.cdA <= 0 && (!moved || S.atk || u.rng > 3.2 && !S.mv)) { attack(S, u, tgt); }
  S.atkTgt = tgt;
}

/* ---------- Render ---------- */
var KY = {sd: [-0.42, 0.82, 0.38], sc: [1, 0.93, 0.8], at: [0.55, 0.62, 0.74], ab: [0.34, 0.3, 0.26], fog: [0.66, 0.8, 0.93], fd: 0.0125};
(function () { var d = KY.sd, l = Math.hypot(d[0], d[1], d[2]); KY.sd = [d[0] / l, d[1] / l, d[2] / l]; })();
var SK = [0.95, 0.76, 0.6];
function rot(u, ox, oz) { var c = Math.cos(u.ang), s = Math.sin(u.ang); return [u.x + ox * c + oz * s, u.z - ox * s + oz * c]; }
function mix3(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
function drawUnit(S, u, draw) {
  var t = S.t, fl = u.hurtT > 0 ? Math.min(1, u.hurtT * 5) : 0, tc = TC[u.team] || [0.4, 0.8, 0.4], p, y, c, W = function (col) { return fl ? mix3(col, [1, 1, 1], fl * 0.8) : col; };
  function part(mesh, ox, oy, oz, sx, sy, sz, col, o, ry, rz) { p = rot(u, ox, oz); draw(mesh, model(p[0], oy, p[1], sx, sy, sz, u.ang + (ry || 0), rz || 0), W(col), o); }
  if (u.type === "hero") {
    var d = u.def, w = u.mv ? Math.sin(t * 13 + u.bob) : 0, bob = u.mv ? Math.abs(Math.sin(t * 13 + u.bob)) * 0.1 : Math.sin(t * 2 + u.bob) * 0.03, sw = u.swing > 0 ? Math.sin(u.swing / 0.28 * 3.14) : 0;
    y = bob; var sc = 1 + (u.lvl - 1) * 0.015;
    part("box", -0.28, 0, w * 0.4, 0.3 * sc, 0.8 * sc, 0.34 * sc, [0.16, 0.16, 0.22]); part("box", 0.28, 0, -w * 0.4, 0.3 * sc, 0.8 * sc, 0.34 * sc, [0.16, 0.16, 0.22]);
    part("cyl", 0, 0.75 + y, 0, 0.95 * sc, 1.05 * sc, 0.7 * sc, d.col, {spec: 0.2}); part("box", 0, 1.15 + y, 0.02, 1.0 * sc, 0.22 * sc, 0.74 * sc, d.c2);
    part("sph", 0, 1.9 + y, 0.05, 0.62 * sc, 0.62 * sc, 0.62 * sc, SK);
    if (d.id === "cak") { part("cyl", 0, 2.2 + y, 0, 0.72 * sc, 0.2, 0.72 * sc, [0.1, 0.1, 0.12]); part("cyl", 0, 2.3 + y, 0, 0.5 * sc, 0.28, 0.5 * sc, [0.9, 0.2, 0.2]); }
    else if (d.id === "ning") { part("sph", 0, 2.1 + y, -0.1, 0.78 * sc, 0.5 * sc, 0.8 * sc, [0.12, 0.06, 0.2]); part("box", 0.35, 1.4 + y, -0.35, 0.3, 0.9, 0.22, [0.12, 0.06, 0.2]); }
    else { part("cyl", 0, 2.28 + y, 0, 0.7 * sc, 0.26, 0.7 * sc, [0.15, 0.35, 0.2]); part("box", 0, 2.12 + y, 0.4, 0.62 * sc, 0.07, 0.4, [0.12, 0.28, 0.16]); }
    /* senjata */
    var ar = (u.spin > 0 ? u.spin * 12 : 0) + (sw ? sw * 1.4 : 0);
    if (d.id === "cak") { var aa = u.ang + ar; var q = [u.x + Math.sin(u.ang + 1.2) * 0.75, u.z + Math.cos(u.ang + 1.2) * 0.75]; draw("box", model(q[0] + Math.sin(aa) * 0.9, 1.2 + y, q[1] + Math.cos(aa) * 0.9, 0.12, 0.12, 2.5, aa, 0), W([0.5, 0.33, 0.15])); draw("box", model(q[0] + Math.sin(aa) * 2.0, 1.2 + y, q[1] + Math.cos(aa) * 2.0, 0.34, 0.14, 0.8, aa, 0), W([0.9, 0.9, 0.95]), {spec: 0.5}); }
    else if (d.id === "ning") { part("box", 0.7, 1.0 + y, 0.3 + sw * 0.5, 0.1, 2.4, 0.1, [0.5, 0.3, 0.15]); part("sph", 0.7, 2.3 + y, 0.3 + sw * 0.5, 0.42, 0.42, 0.42, [1, 0.6, 0.9], {em: [0.9, 0.4, 0.8]}); }
    else { part("box", -0.85, 0.7 + y, 0.4, 0.15, 1.5, 1.2, [0.2, 0.3, 0.6], {spec: 0.3}); part("box", -0.92, 0.7 + y, 0.4, 0.06, 1.2, 0.9, [0.9, 0.75, 0.2], {}); part("box", 0.7, 1.0 + y, 0.5 + sw * 1.0, 0.12, 0.12, 1.5, [0.35, 0.22, 0.1]); }
    if (u.st.shield > 0) draw("sph", model(u.x, 1.2, u.z, 3.0, 2.8, 3.0, 0, 0), [0.4, 0.85, 1], {em: [0.1, 0.5, 0.7], a: 0.25});
    if (u.st.buff > 0) draw("cyl", model(u.x, 0.05, u.z, 2.6, 0.06, 2.6, 0, 0), [1, 0.3, 0.2], {em: [1, 0.3, 0.2], a: 0.5});
    if (u.st.stun > 0) { var sa = t * 8; draw("sph", model(u.x + Math.cos(sa) * 0.8, 2.9, u.z + Math.sin(sa) * 0.8, 0.3, 0.3, 0.3, 0, 0), [1, 0.95, 0.4], {em: [1, 0.9, 0.3]}); draw("sph", model(u.x - Math.cos(sa) * 0.8, 2.9, u.z - Math.sin(sa) * 0.8, 0.3, 0.3, 0.3, 0, 0), [1, 0.95, 0.4], {em: [1, 0.9, 0.3]}); }
    /* cincin tim */
    draw("cyl", model(u.x, 0.04, u.z, 1.9, 0.05, 1.9, 0, 0), tc, {em: [tc[0] * 0.8, tc[1] * 0.8, tc[2] * 0.8], a: u.player ? 0.8 : 0.5});
  } else if (u.type === "minion") {
    var ww = Math.sin(t * 11 + u.bob), sw2 = u.swing > 0 ? 1 : 0, r = u.kind === "r";
    part("box", -0.17, 0, ww * 0.25, 0.2, 0.5, 0.22, [0.2, 0.2, 0.25]); part("box", 0.17, 0, -ww * 0.25, 0.2, 0.5, 0.22, [0.2, 0.2, 0.25]);
    part("cyl", 0, 0.45, 0, 0.62, 0.7, 0.5, r ? mix3(tc, [1, 1, 1], 0.25) : tc); part("sph", 0, 1.3, 0, 0.42, 0.42, 0.42, SK);
    if (r) part("box", 0.4, 0.9, 0.3 + sw2 * 0.2, 0.08, 1.0, 0.08, [0.55, 0.38, 0.2]); else part("box", 0.4, 0.9, 0.3 + sw2 * 0.5, 0.1, 0.1, 1.0, [0.85, 0.85, 0.9], {spec: 0.5});
    draw("cyl", model(u.x, 0.04, u.z, 1.1, 0.04, 1.1, 0, 0), tc, {em: [tc[0] * 0.6, tc[1] * 0.6, tc[2] * 0.6], a: 0.4});
  } else if (u.type === "neutral") {
    var sc3 = 1.25, sw3 = u.swing > 0 ? 0.5 : 0, g = [0.22, 0.45, 0.2], br = Math.sin(t * 2 + u.bob) * 0.05;
    part("box", 0, 0.55 + br, 0, 1.5 * sc3, 0.8 * sc3, 2.6 * sc3, g); part("box", 0, 0.6, 2.0 * sc3 * 0.9, 1.1 * sc3, 0.55 * sc3, 1.6 * sc3, mix3(g, [0.3, 0.5, 0.25], 0.5)); part("box", 0, 0.55 - sw3 * 0.3, 2.8 * sc3, 0.9 * sc3, 0.3, 1.2 * sc3, [0.95, 0.9, 0.8]);
    part("box", 0, 0.45, -2.2 * sc3 * 0.9, 0.7, 0.4, 2.0 * sc3, g, {}, Math.sin(t * 2) * 0.3); part("sph", -0.45, 1.15, 2.2 * sc3 * 0.9, 0.3, 0.3, 0.3, [1, 0.85, 0.2], {em: [1, 0.7, 0.1]}); part("sph", 0.45, 1.15, 2.2 * sc3 * 0.9, 0.3, 0.3, 0.3, [1, 0.85, 0.2], {em: [1, 0.7, 0.1]});
    for (var k = -2; k <= 2; k++) part("cone", 0, 1.0, k * 0.8, 0.3, 0.45, 0.3, [0.15, 0.3, 0.14]);
  } else if (u.type === "tower") {
    var up = !u.dead;
    if (!up) { draw("cyl", model(u.x, 0, u.z, 3.6, 0.5, 3.6, 0, 0), [0.3, 0.28, 0.26]); for (var rb = 0; rb < 5; rb++) draw("box", model(u.x + Math.cos(rb * 1.3) * 1.2, 0.3, u.z + Math.sin(rb * 1.3) * 1.2, 0.9, 0.8, 0.9, rb, 0), [0.35, 0.32, 0.3]); return; }
    var lf = u.hp / u.maxhp;
    draw("cyl", model(u.x, 0, u.z, 4, 0.7, 4, 0, 0), [0.7, 0.68, 0.62]); draw("cyl", model(u.x, 0.6, u.z, 2.8, 4.8, 2.8, 0, 0), mix3([0.82, 0.8, 0.74], [0.5, 0.45, 0.4], 1 - lf), {spec: 0.2});
    draw("cyl", model(u.x, 5.2, u.z, 3.5, 0.5, 3.5, 0, 0), tc, {em: [tc[0] * 0.2, tc[1] * 0.2, tc[2] * 0.2]}); draw("cone", model(u.x, 5.7, u.z, 3.0, 1.9, 3.0, 0, 0), tc);
    var gp = 1 + Math.sin(t * 3 + u.id) * 0.1; draw("sph", model(u.x, 7.6, u.z, 0.9 * gp, 0.9 * gp, 0.9 * gp, 0, 0), mix3(tc, [1, 1, 1], 0.4), {em: [tc[0] * 1.2, tc[1] * 1.2, tc[2] * 1.2]});
    if (u.inner) draw("cyl", model(u.x, 2.8, u.z, 3.1, 0.25, 3.1, 0, 0), tc, {em: [tc[0] * 0.6, tc[1] * 0.6, tc[2] * 0.6]});
    draw("cyl", model(u.x, 0.05, u.z, 4.4, 0.05, 4.4, 0, 0), tc, {em: [tc[0] * 0.8, tc[1] * 0.8, tc[2] * 0.8], a: 0.4});
  } else if (u.type === "nexus") {
    var bl = u.team === 0, lf2 = u.hp / u.maxhp;
    if (u.dead) { draw("cyl", model(u.x, 0, u.z, 8, 1.2, 8, 0, 0), [0.28, 0.26, 0.25]); return; }
    draw("cyl", model(u.x, 0, u.z, 9, 1.3, 9, 0, 0), [0.74, 0.72, 0.66]); draw("cyl", model(u.x, 1.2, u.z, 6.4, 0.9, 6.4, 0, 0), [0.8, 0.78, 0.72]);
    if (bl) { /* Tugu Pahlawan */ draw("cyl", model(u.x, 2, u.z, 3.4, 9, 3.4, 0, 0), [0.86, 0.84, 0.78]); draw("cyl", model(u.x, 11, u.z, 2.2, 5, 2.2, 0, 0), [0.9, 0.88, 0.82]); draw("cone", model(u.x, 16, u.z, 2.4, 5, 2.4, 0, 0), [0.8, 0.78, 0.72]); draw("sph", model(u.x, 21.6, u.z, 1.3, 1.3, 1.3, 0, 0), [0.5, 0.8, 1], {em: [0.4, 0.8, 1.2]}); }
    else { /* Sarang Boyo */ draw("box", model(u.x, 2, u.z, 7, 4, 6, 0, 0), [0.35, 0.18, 0.14]); draw("cone", model(u.x - 2.2, 6, u.z, 1.6, 6, 1.6, 0, 0.2), [0.5, 0.2, 0.16]); draw("cone", model(u.x + 2.2, 6, u.z, 1.6, 6, 1.6, 0, -0.2), [0.5, 0.2, 0.16]); draw("cone", model(u.x, 6, u.z - 1.5, 1.8, 8, 1.8, 0, 0), [0.55, 0.2, 0.16]); draw("sph", model(u.x, 11.8, u.z - 1.5, 1.6, 1.6, 1.6, 0, 0), [1, 0.4, 0.3], {em: [1.4, 0.4, 0.2]}); draw("sph", model(u.x - 2, 4.4, u.z + 3.1, 0.6, 0.6, 0.6, 0, 0), [1, 0.85, 0.2], {em: [1.2, 0.8, 0.1]}); draw("sph", model(u.x + 2, 4.4, u.z + 3.1, 0.6, 0.6, 0.6, 0, 0), [1, 0.85, 0.2], {em: [1.2, 0.8, 0.1]}); }
    if (u.inv) draw("sph", model(u.x, 4, u.z, 11, 9, 11, 0, 0), tc, {em: [tc[0] * 0.35, tc[1] * 0.35, tc[2] * 0.35], a: 0.14});
    draw("cyl", model(u.x, 0.05, u.z, 10, 0.05, 10, 0, 0), tc, {em: [tc[0] * 0.8, tc[1] * 0.8, tc[2] * 0.8], a: 0.35});
  }
}
function render(S, qk) {
  var R = S.R, gl = R.gl, P = R.P, W = R.W, H = R.H, asp = W / H, fov = 46 * Math.PI / 180, sh = S.shake > 0 && !RM ? S.shake : 0;
  var cx = S.cam.x + (sh ? (Math.random() - 0.5) * sh * 0.6 : 0), cz = S.cam.z + (sh ? (Math.random() - 0.5) * sh * 0.6 : 0), eye = [cx, 22, cz + 15.5];
  var V = G.look(eye, [cx, 0.6, cz - 1.6]), PM = G.persp(fov, asp, 1, 400), VP = mul(PM, V.m); S.cv = {e: eye, f: V.f, r: V.r, u: V.u, th: Math.tan(fov / 2), asp: asp}; S.VP = VP;
  var fog = KY.fog;
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.post ? R.T.s.f : null); gl.viewport(0, 0, W, H);
  gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
  /* tanah */
  var p = P.g; gl.useProgram(p.p); gl.uniformMatrix4fv(p.u.uVP, false, VP);
  G.setU(gl, p, "uCam", eye); G.setU(gl, p, "uSunCol", KY.sc); G.setU(gl, p, "uAmbT", KY.at); G.setU(gl, p, "uAmbB", KY.ab); G.setU(gl, p, "uFog", fog); G.setU(gl, p, "uFogD", KY.fd); G.setU(gl, p, "uTime", S.t);
  gl.bindBuffer(gl.ARRAY_BUFFER, R.gb); var aG = gl.getAttribLocation(p.p, "aP"); G.attr(gl, aG, 3, 12, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(aG);
  /* mesh */
  p = P.mesh; gl.useProgram(p.p);
  var aPm = gl.getAttribLocation(p.p, "aP"), aNm = gl.getAttribLocation(p.p, "aN"), cur = null;
  gl.uniformMatrix4fv(p.u.uVP, false, VP);
  G.setU(gl, p, "uCam", eye); G.setU(gl, p, "uSunDir", KY.sd); G.setU(gl, p, "uSunCol", KY.sc); G.setU(gl, p, "uAmbT", KY.at); G.setU(gl, p, "uAmbB", KY.ab); G.setU(gl, p, "uFog", fog); G.setU(gl, p, "uFogD", KY.fd); G.setU(gl, p, "uNight", 0);
  function draw(mesh, M, col, o) {
    if (cur !== mesh) { var m = R.M[mesh]; gl.bindBuffer(gl.ARRAY_BUFFER, m.b); G.attr(gl, aPm, 3, 24, 0); G.attr(gl, aNm, 3, 24, 12); cur = mesh; }
    gl.uniformMatrix4fv(p.u.uM, false, M.m); gl.uniformMatrix3fv(p.u.uNM, false, M.nm); gl.uniform3fv(p.u.uCol, col);
    var e = o && o.em; gl.uniform3f(p.u.uEm, e ? e[0] : 0, e ? e[1] : 0, e ? e[2] : 0);
    gl.uniform1f(p.u.uWin, (o && o.win) || 0); gl.uniform1f(p.u.uSeed, (o && o.seed) || 0); gl.uniform1f(p.u.uSpec, (o && o.spec) || 0); gl.uniform1f(p.u.uAlpha, (o && o.a) || 1); gl.uniform1f(p.u.uFogK, (o && o.fk) || 1);
    gl.drawArrays(gl.TRIANGLES, 0, R.M[mesh].n);
  }
  var i, o, dx, dz;
  for (i = 0; i < STATIC.length; i++) { o = STATIC[i]; dx = o.x - S.cam.x; dz = o.z - S.cam.z; if (dx * dx + dz * dz > 3600) continue; draw(o.mesh, o, o.col, o.o); }
  /* bayangan bulat */
  gl.depthMask(false);
  for (i = 0; i < S.U.length; i++) { var u = S.U[i]; if (u.dead || u.type === "tower" || u.type === "nexus") continue; dx = u.x - S.cam.x; dz = u.z - S.cam.z; if (dx * dx + dz * dz > 1600) continue; draw("cyl", model(u.x + 0.25, 0.02, u.z + 0.2, u.rad * 1.9, 0.02, u.rad * 1.9, 0, 0), [0, 0, 0], {a: 0.32}); }
  gl.depthMask(true);
  for (i = 0; i < S.U.length; i++) { u = S.U[i]; dx = u.x - S.cam.x; dz = u.z - S.cam.z; if (dx * dx + dz * dz > 2800) continue; if (u.dead && u.type !== "tower" && u.type !== "nexus") continue; drawUnit(S, u, draw); }
  /* zona, cincin, proyektil */
  gl.depthMask(false);
  S.Z.forEach(function (z) { var f = 1 - z.t / z.m; draw("cyl", model(z.x, 0.06, z.z, z.r * 2, 0.04, z.r * 2, 0, 0), z.col, {em: [z.col[0] * 0.7, z.col[1] * 0.7, z.col[2] * 0.7], a: 0.18 + 0.3 * f}); draw("cyl", model(z.x, 0.08, z.z, z.r * 2 * f, 0.04, z.r * 2 * f, 0, 0), z.col, {em: z.col, a: 0.4}); });
  S.fx.forEach(function (f) { var k = f.t / f.m, rr = f.r * (1.25 - k * 0.5); draw("cyl", model(f.x, 0.1, f.z, rr * 2, 0.05, rr * 2, 0, 0), f.c, {em: [f.c[0] * 1.2, f.c[1] * 1.2, f.c[2] * 1.2], a: 0.5 * k}); });
  gl.depthMask(true);
  S.P.forEach(function (q) { var s = q.r * 2; draw("sph", model(q.x, q.y, q.z, s, s, s, 0, 0), q.col, {em: [q.col[0] * 1.5, q.col[1] * 1.5, q.col[2] * 1.5]}); });
  /* partikel */
  var a = R.pdat, n = 0, pp, f2;
  for (i = 0; i < S.parts.length && n < 780; i++) { pp = S.parts[i]; f2 = clamp(pp.l / pp.m, 0, 1); a.set([pp.x, pp.y, pp.z, pp.s * (0.4 + f2 * 0.8) * 0.5, 0, 0, 0, pp.c[0], pp.c[1], pp.c[2], f2], n * 11); n++; }
  if (n) {
    var PT = P.pt; gl.useProgram(PT.p); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    gl.bindBuffer(gl.ARRAY_BUFFER, R.pbuf); gl.bufferData(gl.ARRAY_BUFFER, a.subarray(0, n * 11), gl.DYNAMIC_DRAW);
    var l0 = gl.getAttribLocation(PT.p, "aP"), l1 = gl.getAttribLocation(PT.p, "aS"), l2 = gl.getAttribLocation(PT.p, "aC"); G.attr(gl, l0, 3, 44, 0); G.attr(gl, l1, 4, 44, 12); G.attr(gl, l2, 4, 44, 28);
    gl.uniformMatrix4fv(PT.u.uVP, false, VP); gl.uniform1f(PT.u.uPx, H / (2 * Math.tan(fov / 2))); gl.drawArrays(gl.POINTS, 0, n);
    gl.disableVertexAttribArray(l0); gl.disableVertexAttribArray(l1); gl.disableVertexAttribArray(l2); gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  /* pasca-proses */
  gl.disable(gl.DEPTH_TEST);
  var aQ; function quadDraw(pg) { gl.useProgram(pg.p); gl.bindBuffer(gl.ARRAY_BUFFER, R.quad); aQ = gl.getAttribLocation(pg.p, "aP"); G.attr(gl, aQ, 2, 0, 0); }
  if (R.post) {
    gl.blendFunc(gl.ONE, gl.ZERO); var bl = qk >= 1 ? 1 : 0;
    if (bl) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, R.T.a.f); gl.viewport(0, 0, R.T.a.w, R.T.a.h); quadDraw(P.bright); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.T.s.t); gl.uniform1i(P.bright.u.uT, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      for (var n2 = 0; n2 < 2; n2++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.T.b.f); quadDraw(P.blur); gl.bindTexture(gl.TEXTURE_2D, R.T.a.t); gl.uniform1i(P.blur.u.uT, 0); gl.uniform2f(P.blur.u.uD, 1 / R.T.a.w, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.T.a.f); gl.bindTexture(gl.TEXTURE_2D, R.T.b.t); gl.uniform2f(P.blur.u.uD, 0, 1 / R.T.a.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); quadDraw(P.comp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.T.s.t); gl.uniform1i(P.comp.u.uS, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.T.a.t); gl.uniform1i(P.comp.u.uB, 1);
    gl.uniform1f(P.comp.u.uBloom, bl ? 0.4 : 0); gl.uniform1f(P.comp.u.uHit, S.hitK); gl.uniform1f(P.comp.u.uBoost, 0); gl.uniform1f(P.comp.u.uFlash, 0); gl.uniform1f(P.comp.u.uTime, S.t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0); gl.disableVertexAttribArray(aQ); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}

/* ---------- Overlay 2D: bar nyawa, angka, minimap ---------- */
function proj(S, x, y, z, cw, ch) {
  var m = S.VP, cxx = m[0] * x + m[4] * y + m[8] * z + m[12], cyy = m[1] * x + m[5] * y + m[9] * z + m[13], cww = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cww <= 0.01) return null; return [(cxx / cww * 0.5 + 0.5) * cw, (1 - (cyy / cww * 0.5 + 0.5)) * ch];
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function hpBar(g, x, y, w, h, f, col) { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y, Math.max(0, w * clamp(f, 0, 1)), h); }
function css(c) { return "rgb(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + ")"; }
function overlay(S) {
  var o = S.ov, g = S.og, cw = S.ow, ch = S.oh; if (!g) return; g.setTransform(S.od, 0, 0, S.od, 0, 0); g.clearRect(0, 0, cw, ch);
  var i, u, p, w, hh, f, sc = cw / 380;
  g.textAlign = "center"; g.textBaseline = "middle";
  for (i = 0; i < S.U.length; i++) {
    u = S.U[i]; if (u.dead || (u.type === "minion" && u.hp >= u.maxhp * 0.999 && !u.recent)) { if (u.dead || u.type === "minion") continue; }
    if (u.type === "nexus" && u.inv && u.hp >= u.maxhp) { }
    p = proj(S, u.x, u.type === "hero" ? 3.2 : u.type === "tower" ? 8.8 : u.type === "nexus" ? 13 : u.type === "neutral" ? 2.5 : 2.0, u.z, cw, ch); if (!p || p[0] < -60 || p[0] > cw + 60 || p[1] < -30 || p[1] > ch + 30) continue;
    if (u.type === "neutral" && u.hp >= u.maxhp) continue;
    w = (u.type === "hero" ? 56 : u.type === "tower" ? 62 : u.type === "nexus" ? 90 : u.type === "neutral" ? 50 : 26) * Math.min(1.15, sc);
    hh = u.type === "minion" ? 3.5 : 5.5; f = u.hp / u.maxhp; var col = u.team === 2 ? "#e8c44a" : u.team === 0 ? (u.player ? "#4dffa0" : "#4a90ff") : "#ff5a4a";
    hpBar(g, p[0] - w / 2, p[1], w, hh, f, col);
    if (u.type === "hero") {
      if (u.st.shield > 0 && u.sh > 0) { g.fillStyle = "rgba(180,235,255,.9)"; g.fillRect(p[0] - w / 2, p[1] - 3, w * clamp(u.sh / u.maxhp, 0, 1), 2.5); }
      g.fillStyle = "rgba(0,0,0,.7)"; g.beginPath(); g.arc(p[0] - w / 2 - 8, p[1] + 3, 8, 0, 6.3); g.fill(); g.fillStyle = "#fff"; g.font = "800 10px system-ui,sans-serif"; g.fillText(String(u.lvl), p[0] - w / 2 - 8, p[1] + 3.5);
      g.font = "800 " + Math.round(10.5 * Math.min(1.15, sc)) + "px system-ui,sans-serif"; g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.75)"; g.strokeText(u.name, p[0], p[1] - 9); g.fillStyle = u.team === 0 ? "#bcd6ff" : "#ffc2b8"; g.fillText(u.name, p[0], p[1] - 9);
    }
  }
  /* angka melayang */
  g.font = "900 16px system-ui,sans-serif"; g.lineWidth = 3.5;
  S.pops.forEach(function (q) { var pp = proj(S, q.x, q.y, q.z, cw, ch); if (!pp) return; g.globalAlpha = clamp(q.t / 0.4, 0, 1); g.strokeStyle = "rgba(0,0,0,.85)"; g.strokeText(q.tx, pp[0], pp[1]); g.fillStyle = q.c; g.fillText(q.tx, pp[0], pp[1]); });
  g.globalAlpha = 1;
  /* penunjuk pemain saat mati / lingkar jangkauan target */
  if (S.sel && !S.sel.dead) { var sp = proj(S, S.sel.x, 0.1, S.sel.z, cw, ch); if (sp) { g.strokeStyle = "#ffd24a"; g.lineWidth = 2; g.beginPath(); g.ellipse(sp[0], sp[1], 22 * sc, 10 * sc, 0, 0, 6.3); g.stroke(); } }
  minimap(S, g, cw, ch);
}
var MMW = 104;
function minimap(S, g, cw, ch) {
  var mw = MMW, mh = Math.round(MMW * 124 / 120), x0 = 8, y0 = 38, sx = mw / 120, sz = mh / 124; function X(x) { return x0 + (x + 60) * sx; } function Z(z) { return y0 + (z + 62) * sz; }
  g.save(); rrect(g, x0 - 2, y0 - 2, mw + 4, mh + 4, 8); g.fillStyle = "rgba(8,24,18,.72)"; g.fill(); g.clip();
  g.fillStyle = "rgba(60,120,60,.55)"; g.fillRect(x0, y0, mw, mh);
  g.fillStyle = "rgba(60,150,170,.9)"; g.fillRect(x0, Z(-3.5), mw, 7 * sz);
  g.strokeStyle = "rgba(220,200,150,.8)"; g.lineWidth = 3; LX.forEach(function (x) { g.beginPath(); g.moveTo(X(x), Z(-44)); g.lineTo(X(x), Z(44)); g.stroke(); });
  g.beginPath(); g.moveTo(X(-28), Z(40)); g.lineTo(X(28), Z(40)); g.moveTo(X(-28), Z(-40)); g.lineTo(X(28), Z(-40)); g.stroke();
  S.U.forEach(function (u) {
    if (u.dead && u.type !== "tower" && u.type !== "nexus") return;
    var c = u.team === 2 ? "#e8c44a" : u.team === 0 ? "#5aa0ff" : "#ff5a4a", r = u.type === "nexus" ? 5 : u.type === "tower" ? 3.4 : u.type === "hero" ? 3.6 : u.type === "neutral" ? 2.4 : 1.5;
    if (u.dead) { c = "#555"; r = 2; }
    g.fillStyle = c; if (u.type === "tower" || u.type === "nexus") g.fillRect(X(u.x) - r, Z(u.z) - r, r * 2, r * 2); else { g.beginPath(); g.arc(X(u.x), Z(u.z), r, 0, 6.3); g.fill(); }
    if (u.player) { g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(X(u.x), Z(u.z), 5.2, 0, 6.3); g.stroke(); }
  });
  var cv = S.cv; if (cv) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.strokeRect(X(S.cam.x - 22), Z(S.cam.z - 28), 44 * sx, 42 * sz); }
  g.restore();
}

/* ---------- HUD (DOM) ---------- */
function fmt(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ":" + (s < 10 ? "0" : "") + s; }
function hud(S) {
  var e = S.el, me = S.me; if (!e) return;
  e.k0.textContent = S.kills[0]; e.k1.textContent = S.kills[1]; e.tm.textContent = fmt(S.t);
  e.tw.textContent = "Menara " + (6 - S.towersDown[1]) + " / " + (6 - S.towersDown[0]);
  var f = me.dead ? 0 : me.hp / me.maxhp; e.hp.style.width = (f * 100).toFixed(1) + "%"; e.hpt.textContent = me.dead ? "Bangkit " + Math.ceil(me.deadT) + " d" : Math.ceil(me.hp) + " / " + Math.ceil(me.maxhp);
  var need = 90 + me.lvl * 60; e.xp.style.width = (me.lvl >= 9 ? 100 : clamp(me.xp / need, 0, 1) * 100).toFixed(1) + "%";
  e.lv.textContent = "Lv " + me.lvl + " · " + Math.floor(me.gold) + " emas · K/D " + me.kills + "/" + me.deaths;
  for (var i = 0; i < 3; i++) { var b = e.sk[i], cd = me.cd[i], mx = (me.cdMax && me.cdMax[i]) || me.def.sk[i].cd; b.style.setProperty("--p", clamp(cd / mx, 0, 1).toFixed(3)); b.firstElementChild && 0; var em = b.querySelector("em"); em.textContent = cd > 0 ? Math.ceil(cd) : ""; b.classList.toggle("rd", cd <= 0 && !me.dead); }
  e.rc.classList.toggle("on", S.recall > 0);
  if (S.feedDirty) { S.feedDirty = false; e.feed.innerHTML = S.feed.map(function (z) { return '<div class="' + (z.tm === 0 ? "b" : z.tm === 1 ? "r" : "") + '">' + z.tx + "</div>"; }).join(""); }
  if (S.banDirty) { S.banDirty = false; e.bn.className = "mb-bn"; if (S.ban) { void e.bn.offsetWidth; e.bn.textContent = S.ban.tx; e.bn.className = "mb-bn on " + S.ban.cl; } else e.bn.textContent = ""; }
  e.dead.hidden = !me.dead;
  if (S.shopOpen) shopRefresh(S);
}
function shopRefresh(S) {
  var me = S.me, home = Math.hypot(me.x - me.base[0], me.z - me.base[1]) < 9 || me.dead, el = S.el.shop;
  el.querySelectorAll("[data-buy]").forEach(function (b) { var it = ITEMS.filter(function (z) { return z.id === b.dataset.buy; })[0], n = me.items[it.id] || 0; b.disabled = !home || me.gold < it.harga || n >= 3; b.querySelector("small").textContent = it.ket + " · dimiliki " + n + "/3"; });
  el.querySelector(".mb-sh-n").textContent = home ? "Emas Anda: " + Math.floor(me.gold) : "Belanja hanya di markas atau saat tumbang.";
}
function buy(S, id) {
  var me = S.me, it = ITEMS.filter(function (z) { return z.id === id; })[0], home = Math.hypot(me.x - me.base[0], me.z - me.base[1]) < 9 || me.dead;
  if (!it || !home || me.gold < it.harga || (me.items[id] || 0) >= 3) return; me.gold -= it.harga; me.items[id] = (me.items[id] || 0) + 1; recompute(me); API.beep(660, 0.1); if (window.toast) window.toast(it.nm + " dibeli");
}

/* ---------- Selesai ---------- */
function loseGL(S) { try { var x = S.R && S.R.gl && S.R.gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch (e) {} }
function finish(S) {
  if (S.done) return; S.done = true; var me = S.me, win = S.win === 0, g = API.G();
  var sc = Math.max(0, Math.round((win ? 1000 : 250) + me.kills * 60 + S.towersDown[1] * 120 - me.deaths * 25 + Math.max(0, 600 - S.t) * (win ? 1.2 : 0.2))), st = win ? (me.deaths <= 3 && S.t < 600 ? 3 : 2) : (S.towersDown[1] >= 2 || me.kills >= 5 ? 1 : 1);
  var best = Math.max(g.best.mb || 0, sc), baru = sc > (g.best.mb || 0), rank = topAdd(sc, win);
  API.fin("moba3d", {title: S.timeout ? (win ? "Menang angka!" : "Kalah angka") : win ? "Tugu Pahlawan menang!" : "Markas Biru jebol", stars: st,
    sub: "Skor <b>" + sc + "</b> &middot; " + fmt(S.t) + " &middot; K/D/A tim " + S.kills[0] + "–" + S.kills[1] + " &middot; Anda " + me.kills + "/" + me.deaths + " &middot; " + S.towersDown[1] + " menara musuh hancur. Rekor Anda: " + best + (baru ? " (baru!)" : "") + ". Peringkat #" + rank + " di perangkat ini.",
    pts: Math.round(sc / 25) + (win ? 12 : 4), bk: "mb", bv: sc, m: {moba3d: sc}, again: play,
    share: (win ? "Saya menang" : "Saya bertarung") + " di Arena Suroboyo 3D (" + fmt(S.t) + ", skor " + sc + ") di Ruang Main Takok Pelayanan Suroboyo. Berani tanding?\n" + location.origin});
}
function webgl() { return G.webgl(); }
function menuGagal() { API.view(API.bar("Arena Suroboyo 3D") + '<div class="empty">Grafis 3D tidak bisa dijalankan di perangkat ini. Coba Arus Kalimas atau Suroboyo Rush.</div><div class="btns" style="justify-content:center"><button type="button" class="send" data-g="rush">Main Suroboyo Rush</button></div>'); }
function bar5(n) { var s = ""; for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? "on" : "") + '"></i>'; return s; }
function tgl(d) { try { return new Date(d).toLocaleDateString("id-ID", {day: "numeric", month: "short"}); } catch (e) { return ""; } }
function menu() {
  API.stopAll(); CUR = null; API.title("Arena Suroboyo 3D");
  if (!webgl()) { menuGagal(); return; }
  var g = API.G(), best = g.best.mb || 0, q = getQ(), hid = getHero(), df = getDiff(), tl = topList();
  API.view(API.bar("Arena Suroboyo 3D") +
    '<div class="kl-hero mb-hero"><small>MOBA 3D &middot; 3 LAWAN 3</small><b>Arena Suroboyo</b><p>Pimpin tim Biru melawan tiga bot Merah. Dorong tiga jalur bersama pasukan, hancurkan menara, kalahkan monster Boyo di hutan, naik level, beli item, dan jebol Sarang Boyo sebelum Tugu Pahlawan kalian runtuh.</p>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-mb="go">Masuk arena</button></div><p class="sys" style="margin:8px auto 0">' + (best ? "Rekor Anda: <b>" + best + "</b> poin" : "Belum dimainkan") + '</p></div>' +
    '<h2>Pilih hero</h2><div class="kl-hs">' + Object.keys(HD).map(function (k) {
      var h = HD[k], c = css(h.col);
      return '<button type="button" class="kl-h' + (k === hid ? " on" : "") + '" data-mbh="' + k + '" aria-pressed="' + (k === hid) + '"><span class="kl-hb" style="background:' + c + '"></span><b>' + h.nm + ' <small>' + h.role + '</small></b><small>' + h.ds + '</small>' +
        '<div class="kl-st"><span>Serangan</span>' + bar5(h.st[0]) + '</div><div class="kl-st"><span>Tangguh</span>' + bar5(h.st[1]) + '</div><div class="kl-st"><span>Jurus</span>' + bar5(h.st[2]) + '</div>' +
        '<small>' + h.sk.map(function (s) { return s.nm; }).join(" &middot; ") + '</small></button>';
    }).join("") + '</div>' +
    '<h2>Tingkat bot</h2><div class="hint">' + Object.keys(DIFF).map(function (k) { return '<button type="button" class="chip" data-mbd="' + k + '" aria-pressed="' + (k === df) + '">' + DIFF[k].n + '</button>'; }).join("") + '</div>' +
    '<h2>Kontrol</h2><div class="kl-ctl"><div><b>HP / tablet</b><span>Geser di sisi kiri layar untuk joystick. Tombol besar menyerang, tiga tombol bulat memakai jurus. Tombol rumah untuk pulang ke markas (diam 4 detik) dan tombol toko untuk beli item.</span></div><div><b>Komputer</b><span>Klik tanah untuk berjalan, klik musuh untuk menyerangnya, atau WASD. Jurus Q, E, R. Serang J atau Spasi. Pulang B. Toko P.</span></div></div>' +
    '<h2>Tips</h2><div class="hint" style="display:block"><p class="sys">Ikuti pasukan di jalurmu agar menara tidak menembakmu. Menara hanya bisa diserang bila pasukan sekutu ada di dekatnya. Markas musuh baru terbuka setelah menara dalam sebuah jalur runtuh. Monster Boyo di hutan memberi emas besar.</p></div>' +
    '<h2>Grafis</h2><div class="hint"><button type="button" class="chip" data-mbq="-1" aria-pressed="' + (q < 0) + '">Otomatis</button><button type="button" class="chip" data-mbq="2" aria-pressed="' + (q === 2) + '">Tinggi</button><button type="button" class="chip" data-mbq="1" aria-pressed="' + (q === 1) + '">Sedang</button><button type="button" class="chip" data-mbq="0" aria-pressed="' + (q === 0) + '">Hemat</button></div>' +
    (tl.length ? '<h2>Peringkat di perangkat ini</h2><div class="kl-top">' + tl.map(function (z, i) { return '<div><span>' + (i + 1) + '</span><b>' + z.s + ' poin <small>&middot; ' + (z.w ? "menang" : "kalah") + '</small></b><small>' + tgl(z.d) + '</small></div>'; }).join("") + '</div>' : ""));
}

/* ---------- Main ---------- */
var IC = {
  atk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l9-9m0 0l3-7 4 4-7 3zm-5 4l-2-2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  s1: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h9M9 7l5 5-5 5M14 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  s2: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  s3: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.2L21 9l-5 4.2L17.5 20 12 16.5 6.5 20 8 13.2 3 9l6.4-.8z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-1.5 12h-13zM8 8a4 4 0 018 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>'
};
function play() {
  API.stopAll(); API.ping("moba3d"); API.title("Arena Suroboyo 3D");
  var hid = getHero(), H = HD[hid], df = getDiff();
  API.view(API.bar("Arena Suroboyo 3D", H.nm) +
    '<div class="kl-w mb-w" id="mbw"><canvas id="mbc" role="img" aria-label="Medan tempur Arena Suroboyo 3D"></canvas><canvas id="mbo" class="mb-o" aria-hidden="true"></canvas>' +
    '<div class="mb-top" aria-live="off"><span class="b" id="mbk0">0</span><span class="mb-tm" id="mbtm">0:00</span><span class="r" id="mbk1">0</span></div><div class="mb-tw" id="mbtw"></div>' +
    '<div class="mb-feed" id="mbfd"></div><div class="mb-bn" id="mbbn" aria-live="polite"></div>' +
    '<div class="mb-me"><div class="mb-hp"><i id="mbhp"></i><b id="mbhpt"></b></div><div class="mb-xp"><i id="mbxp"></i></div><small id="mblv"></small></div>' +
    '<div class="kl-jb" id="mbjb" aria-hidden="true"><div class="kl-jk" id="mbjk"></div></div>' +
    '<div class="mb-sk"><button type="button" class="mb-a" data-mba="atk" aria-label="Serang (J)">' + IC.atk + '</button>' +
    '<button type="button" class="kl-s mb-s1 rd" data-mbs="0" aria-label="Jurus 1: ' + H.sk[0].nm + ' (Q)">' + IC.s1 + '<small>' + H.sk[0].nm.split(" ")[0] + '</small><em></em></button>' +
    '<button type="button" class="kl-s mb-s2 rd" data-mbs="1" aria-label="Jurus 2: ' + H.sk[1].nm + ' (E)">' + IC.s2 + '<small>' + H.sk[1].nm.split(" ")[0] + '</small><em></em></button>' +
    '<button type="button" class="kl-s mb-s3 rd" data-mbs="2" aria-label="Jurus pamungkas: ' + H.sk[2].nm + ' (R)">' + IC.s3 + '<small>' + H.sk[2].nm.split(" ")[0] + '</small><em></em></button>' +
    '<button type="button" class="mb-sm mb-rc" data-mba="recall" aria-label="Pulang ke markas (B)">' + IC.home + '</button><button type="button" class="mb-sm mb-sp" data-mba="shop" aria-label="Toko item (P)">' + IC.shop + '</button></div>' +
    '<div class="mb-dead" id="mbdd" hidden>Menunggu bangkit&hellip;</div>' +
    '<div class="mb-shop" id="mbsh" hidden><b>Toko Arek</b><p class="mb-sh-n"></p>' + ITEMS.map(function (z) { return '<button type="button" data-buy="' + z.id + '"><b>' + z.nm + '</b><span>' + z.harga + '</span><small></small></button>'; }).join("") + '<button type="button" class="send" data-mba="shop">Tutup</button></div>' +
    '<div class="tg-ov kl-ov" id="mbo2"><b>' + H.nm + ' siap bertempur</b><small>Hancurkan Sarang Boyo di seberang peta. Ikuti pasukan, kumpulkan emas, jaga Tugu Pahlawan.</small><button type="button" class="send" data-mb="start">Mulai</button></div></div>');
  var c = $("mbc"), w = $("mbw"), S;
  try {
    S = newState(hid, df); S.c = c; S.R = engine(c); var q = getQ(); S.auto = q < 0; S.q = q < 0 ? 2 : q; S.qmax = 2; S.fps = [];
  } catch (e) { console.error("Arena", e); menuGagal(); return; }
  S.ov = $("mbo"); S.og = S.ov.getContext("2d"); S.w = w;
  S.el = {k0: $("mbk0"), k1: $("mbk1"), tm: $("mbtm"), tw: $("mbtw"), feed: $("mbfd"), bn: $("mbbn"), hp: $("mbhp"), hpt: $("mbhpt"), xp: $("mbxp"), lv: $("mblv"), dead: $("mbdd"), shop: $("mbsh"), rc: w.querySelector(".mb-rc"), sk: [].slice.call(w.querySelectorAll("[data-mbs]"))};
  S.begin = function () { var o = $("mbo2"); if (o) o.remove(); S.started = true; S.t = 0.001; banner(S, "Pertempuran dimulai!", "k"); API.beep(440, 0.15); };
  c.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); S.done = true; if (window.toast) window.toast("Grafis terhenti. Buka lagi gimnya."); });
  CUR = S; installKeys(); bindInput(S, w);
  S.hudT = 0; requestAnimationFrame(function (ts) { loop(S, ts); });
}
function loop(S, ts) {
  if (S !== CUR || !document.body.contains(S.c)) { loseGL(S); return; }
  var dt = S.last ? Math.min(0.05, (ts - S.last) / 1000) : 0.016; S.last = ts; if (document.hidden) dt = 0;
  if (dt > 0 && S.started) { S.fps.push(dt); if (S.fps.length >= 60) { var avg = S.fps.reduce(function (a, b) { return a + b; }, 0) / S.fps.length; S.fps = []; if (S.auto) { if (avg > 0.034 && S.q > 0) S.q--; else if (avg < 0.019 && S.q < S.qmax && S.t > 20) S.q++; } } }
  var cw = S.c.clientWidth || 360, ch = S.c.clientHeight || 520, dpr = Math.min(2, window.devicePixelRatio || 1), sc = S.q === 2 ? 1 : S.q === 1 ? 0.75 : 0.55;
  var base = Math.max(1.2, dpr) * sc, w = Math.max(160, Math.min(1000, Math.round(cw * base))), h = Math.max(220, Math.round(w * ch / cw));
  try {
    S.R.resize(w, h); var od = Math.min(2, dpr); if (S.ow !== cw || S.oh !== ch || S.od !== od) { S.ow = cw; S.oh = ch; S.od = od; S.ov.width = Math.round(cw * od); S.ov.height = Math.round(ch * od); }
    step(S, dt); render(S, S.q); overlay(S); S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.1; hud(S); }
    if (S.over && !S.done) { S.endT = (S.endT || 0) + dt; if (S.endT > 1.6) finish(S); }
  } catch (e) { console.error("Arena", e); S.done = true; loseGL(S); menuGagal(); return; }
  if (S.done) return; requestAnimationFrame(function (t2) { loop(S, t2); });
}

/* ---------- Input ---------- */
function groundAt(S, px, py) {
  var cv = S.cv; if (!cv) return null; var rect = S.c.getBoundingClientRect(), nx = ((px - rect.left) / rect.width) * 2 - 1, ny = 1 - ((py - rect.top) / rect.height) * 2;
  var dx = cv.f[0] + cv.r[0] * nx * cv.th * cv.asp + cv.u[0] * ny * cv.th, dy = cv.f[1] + cv.r[1] * nx * cv.th * cv.asp + cv.u[1] * ny * cv.th, dz = cv.f[2] + cv.r[2] * nx * cv.th * cv.asp + cv.u[2] * ny * cv.th;
  if (dy > -0.01) return null; var t = -cv.e[1] / dy; return {x: cv.e[0] + dx * t, z: cv.e[2] + dz * t};
}
function bindInput(S, w) {
  var jb = $("mbjb"), jk = $("mbjk"), jp = null, jx = 0, jy = 0, R0 = 46;
  function tapGround(e) {
    var g = groundAt(S, e.clientX, e.clientY); if (!g || !S.started) return; var best = null, bd = 2.2;
    S.U.forEach(function (u) { if (u.dead || u.team === S.me.team || u.inv) return; var d = Math.hypot(u.x - g.x, u.z - g.z) - u.rad; if (d < bd) { bd = d; best = u; } });
    if (best) { S.sel = best; S.goto = null; } else { S.sel = null; S.goto = {x: clamp(g.x, -58, 58), z: clamp(g.z, -62, 62)}; }
  }
  w.addEventListener("pointerdown", function (e) {
    if (!S.started || e.target.closest("button, .mb-shop")) return;
    var rect = w.getBoundingClientRect();
    if (e.pointerType === "mouse") { if (e.button !== 0) return; S.mdown = e.pointerId; tapGround(e); try { w.setPointerCapture(e.pointerId); } catch (x) {} return; }
    if (e.clientX - rect.left < rect.width * 0.55 && jp == null) {
      jp = e.pointerId; try { w.setPointerCapture(e.pointerId); } catch (x) {}
      var x = e.clientX - rect.left, y = e.clientY - rect.top; jb.style.left = clamp(x - 48, 4, rect.width - 100) + "px"; jb.style.bottom = "auto"; jb.style.top = clamp(y - 48, 4, rect.height - 100) + "px"; jb.classList.add("on"); jb.dataset.cx = e.clientX; jb.dataset.cy = e.clientY; jx = e.clientX; jy = e.clientY; jk.style.transform = "";
    } else tapGround(e);
  });
  w.addEventListener("pointermove", function (e) {
    if (e.pointerType === "mouse") { if (S.mdown === e.pointerId) tapGround(e); return; }
    if (e.pointerId !== jp) return; var dx = e.clientX - jx, dy = e.clientY - jy, d = Math.hypot(dx, dy), k = d > R0 ? R0 / d : 1; jk.style.transform = "translate(" + dx * k + "px," + dy * k + "px)";
    S.mv = d < 6 ? null : {x: dx / Math.max(d, R0), z: dy / Math.max(d, R0)}; if (d > R0) S.mv = {x: dx / d, z: dy / d};
  });
  function up(e) { if (e.pointerId === S.mdown) S.mdown = null; if (e.pointerId !== jp) return; jp = null; S.mv = null; jb.classList.remove("on"); jk.style.transform = ""; jb.style.left = ""; jb.style.top = ""; jb.style.bottom = ""; }
  w.addEventListener("pointerup", up); w.addEventListener("pointercancel", up);
  w.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  /* tombol */
  w.addEventListener("pointerdown", function (e) {
    var b = e.target.closest && e.target.closest("[data-mbs],[data-mba]"); if (!b || !S.started) return; e.preventDefault();
    if (b.dataset.mbs != null) doSkill(S, +b.dataset.mbs);
    else if (b.dataset.mba === "atk") { S.atk = true; b.classList.add("down"); var rel = function () { S.atk = false; b.classList.remove("down"); window.removeEventListener("pointerup", rel); window.removeEventListener("pointercancel", rel); }; window.addEventListener("pointerup", rel); window.addEventListener("pointercancel", rel); }
    else if (b.dataset.mba === "recall") doRecall(S);
    else if (b.dataset.mba === "shop") toggleShop(S);
  });
  w.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-buy]"); if (b) buy(S, b.dataset.buy); });
}
function doSkill(S, i) { var me = S.me; if (!me || me.dead || !S.started || S.over) return; if (skill(S, me, i)) S.sel = null; }
function doRecall(S) { var me = S.me; if (!me || me.dead || S.recall > 0) { if (S.recall > 0) S.recall = 0; return; } if (Math.hypot(me.x - me.base[0], me.z - me.base[1]) < 9) return; S.recall = 4; S.mv = null; S.goto = null; banner(S, "Pulang... diam 4 detik", ""); }
function toggleShop(S) { S.shopOpen = !S.shopOpen; S.el.shop.hidden = !S.shopOpen; if (S.shopOpen) shopRefresh(S); }
var KM = {};
function installKeys() {
  if (KEY_ON) return; KEY_ON = true;
  function upd() { var S = CUR; if (!S) return; var x = (KM.d || KM.arrowright ? 1 : 0) - (KM.a || KM.arrowleft ? 1 : 0), z = (KM.s || KM.arrowdown ? 1 : 0) - (KM.w || KM.arrowup ? 1 : 0); if (x || z) { var l = Math.hypot(x, z); S.mv = {x: x / l, z: z / l}; S.goto = null; } else if (S.mv && S.kb) S.mv = null; S.kb = !!(x || z); S.atk = !!(KM.j || KM[" "]); }
  document.addEventListener("keydown", function (e) {
    var S = CUR; if (!S || !document.body.contains(S.c) || e.ctrlKey || e.metaKey || e.altKey) return; var k = e.key.toLowerCase();
    if (/^(input|textarea|select)$/i.test((e.target.tagName || ""))) return;
    if (!S.started) { if (k === "enter" || k === " ") { S.begin(); e.preventDefault(); } return; }
    if ("wasdjp qer1 23b".indexOf(k) >= 0 || k.indexOf("arrow") === 0 || k === " ") e.preventDefault();
    if (e.repeat) { KM[k] = true; upd(); return; } KM[k] = true;
    if (k === "q" || k === "1") doSkill(S, 0); else if (k === "e" || k === "2") doSkill(S, 1); else if (k === "r" || k === "3") doSkill(S, 2); else if (k === "b") doRecall(S); else if (k === "p") toggleShop(S);
    upd();
  });
  document.addEventListener("keyup", function (e) { KM[e.key.toLowerCase()] = false; upd(); });
  window.addEventListener("blur", function () { KM = {}; upd(); });
}

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-mb],[data-mbh],[data-mbq],[data-mbd],[data-g=\"moba3d\"]"); if (!b) return;
  if (b.dataset.g === "moba3d") menu();
  else if (b.dataset.mb === "go") play();
  else if (b.dataset.mb === "start" && CUR) CUR.begin();
  else if (b.dataset.mbh) { try { localStorage.setItem(HK, b.dataset.mbh); } catch (x) {} menu(); }
  else if (b.dataset.mbd) { try { localStorage.setItem(DK, b.dataset.mbd); } catch (x) {} menu(); }
  else if (b.dataset.mbq != null) { try { localStorage.setItem(QK, b.dataset.mbq); } catch (x) {} menu(); }
});

/* Simulasi tanpa grafis untuk uji keseimbangan: semua hero dikendalikan bot. */
function sim(hero, diff, seed) {
  var S = newState(hero || "cak", diff || "normal", true); S.started = true; S.me.player = false; S.me.name = "Bot Biru"; var lane = 1; S.me.lane = lane; var n = 0;
  while (!S.over && S.t < 1100 && n++ < 40000) step(S, 0.05);
  return {win: S.win, t: Math.round(S.t), kills: S.kills.slice(), towers: S.towersDown.slice(), lv: S.U.filter(function (u) { return u.type === "hero"; }).map(function (u) { return u.team + u.def.id + u.lvl; }).join(",")};
}
window.ArenaMoba = {menu: menu, play: play, sim: sim, cur: function () { return CUR; }};
})();
