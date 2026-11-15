"use strict";
/* Arus Kalimas (Ruang Main): gim perahu 3D grafis tinggi, ditulis dengan WebGL mentah tanpa library.
   Dayung perahu Cak Takok menyusuri Kali Mas Surabaya: kumpulkan berkas dan stempel emas, hindari Boyo, kayu hanyut, enceng gondok
   dan antrean pelampung. Siang berganti senja dan malam. Efek: air bergelombang berpantul langit, kabut, jendela menyala di malam hari,
   bloom, percikan, jejak air, getar layar, resolusi adaptif. Kontrol ala game mobile: joystick melayang (sentuh), kursor mouse mengikuti, panah/WASD, dan 3 tombol jurus dengan cooldown (Ngebut, Ombak, Perisai); 3 hero.
   Memakai pintu TKGM milik main.js. Tanpa data pribadi. Bila WebGL tidak ada, dialihkan ke Suroboyo Rush. */
(function () {
var API = window.TKGM; if (!API) return;
var $ = function (i) { return document.getElementById(i); };
var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
var TOPK = "tk_kl_top", QK = "tk_kl_q";
var CUR = null, KEYS_ON = false;
function seeded(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function lerp(a, b, t) { return a + (b - a) * t; }
function sm(t) { return t * t * (3 - 2 * t); }
function mixv(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function nrm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

/* ---------- Skor lokal ---------- */
function topList() { try { var a = JSON.parse(localStorage.getItem(TOPK) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function topAdd(s, j) {
  var e = {s: s, j: j, d: Date.now()}, a = topList(); a.push(e); a.sort(function (x, y) { return y.s - x.s; }); a = a.slice(0, 5);
  try { localStorage.setItem(TOPK, JSON.stringify(a)); } catch (x) {} return a.indexOf(e) + 1;
}
function tgl(ms) { try { return new Date(ms).toLocaleDateString("id-ID", {day: "numeric", month: "short"}); } catch (e) { return ""; } }
function getQ() { try { var q = localStorage.getItem(QK); return q === "0" || q === "1" || q === "2" ? +q : -1; } catch (e) { return -1; } }
function qName(q) { return q === 2 ? "Tinggi" : q === 1 ? "Sedang" : "Hemat"; }

/* ---------- Matematika ---------- */
function mul(a, b) {
  var o = new Float32Array(16), i, j;
  for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
  return o;
}
function persp(f, a, n, fa) { var t = 1 / Math.tan(f / 2), m = new Float32Array(16); m[0] = t / a; m[5] = t; m[10] = (fa + n) / (n - fa); m[11] = -1; m[14] = 2 * fa * n / (n - fa); return m; }
function look(e, c) {
  var f = nrm([c[0] - e[0], c[1] - e[1], c[2] - e[2]]), r = nrm([-f[2], 0, f[0]]), u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  var m = new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0,
    -(r[0] * e[0] + r[1] * e[1] + r[2] * e[2]), -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]), f[0] * e[0] + f[1] * e[1] + f[2] * e[2], 1]);
  return {m: m, f: f, r: r, u: u};
}
/* Model = T * Ry * Rz * S. Kembalian: matriks 4x4 dan matriks normal 3x3 (R / skala). */
function model(tx, ty, tz, sx, sy, sz, ry, rz) {
  var cy = Math.cos(ry), sY = Math.sin(ry), cz = Math.cos(rz), sZ = Math.sin(rz);
  var c0 = [cy * cz, sZ, -sY * cz], c1 = [-cy * sZ, cz, sY * sZ], c2 = [sY, 0, cy];
  return {m: new Float32Array([c0[0] * sx, c0[1] * sx, c0[2] * sx, 0, c1[0] * sy, c1[1] * sy, c1[2] * sy, 0, c2[0] * sz, c2[1] * sz, c2[2] * sz, 0, tx, ty, tz, 1]),
    nm: new Float32Array([c0[0] / sx, c0[1] / sx, c0[2] / sx, c1[0] / sy, c1[1] / sy, c1[2] / sy, c2[0] / sz, c2[1] / sz, c2[2] / sz])};
}

/* ---------- Mesh ---------- */
function pv(v, p, n) { v.push(p[0], p[1], p[2], n[0], n[1], n[2]); }
function quad(v, n, a, b, c, d) { pv(v, a, n); pv(v, b, n); pv(v, c, n); pv(v, a, n); pv(v, c, n); pv(v, d, n); }
function triFlat(v, a, b, c, ctr) {
  var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  var n = nrm([u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]);
  var m = [(a[0] + b[0] + c[0]) / 3 - ctr[0], (a[1] + b[1] + c[1]) / 3 - ctr[1], (a[2] + b[2] + c[2]) / 3 - ctr[2]];
  if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) n = [-n[0], -n[1], -n[2]];
  pv(v, a, n); pv(v, b, n); pv(v, c, n);
}
function mBox() {
  var v = [], x0 = -0.5, x1 = 0.5, y0 = 0, y1 = 1, z0 = -0.5, z1 = 0.5;
  quad(v, [0, 0, 1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); quad(v, [0, 0, -1], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  quad(v, [1, 0, 0], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); quad(v, [-1, 0, 0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  quad(v, [0, 1, 0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); quad(v, [0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  return v;
}
function mCyl(n) {
  var v = [], i, a0, a1, c0, s0, c1, s1;
  for (i = 0; i < n; i++) {
    a0 = i / n * 6.2832; a1 = (i + 1) / n * 6.2832; c0 = Math.cos(a0); s0 = Math.sin(a0); c1 = Math.cos(a1); s1 = Math.sin(a1);
    pv(v, [c0 * 0.5, 0, s0 * 0.5], [c0, 0, s0]); pv(v, [c1 * 0.5, 0, s1 * 0.5], [c1, 0, s1]); pv(v, [c1 * 0.5, 1, s1 * 0.5], [c1, 0, s1]);
    pv(v, [c0 * 0.5, 0, s0 * 0.5], [c0, 0, s0]); pv(v, [c1 * 0.5, 1, s1 * 0.5], [c1, 0, s1]); pv(v, [c0 * 0.5, 1, s0 * 0.5], [c0, 0, s0]);
    pv(v, [0, 1, 0], [0, 1, 0]); pv(v, [c1 * 0.5, 1, s1 * 0.5], [0, 1, 0]); pv(v, [c0 * 0.5, 1, s0 * 0.5], [0, 1, 0]);
    pv(v, [0, 0, 0], [0, -1, 0]); pv(v, [c0 * 0.5, 0, s0 * 0.5], [0, -1, 0]); pv(v, [c1 * 0.5, 0, s1 * 0.5], [0, -1, 0]);
  }
  return v;
}
function mCone(n) {
  var v = [], i, a0, a1, c0, s0, c1, s1, am;
  for (i = 0; i < n; i++) {
    a0 = i / n * 6.2832; a1 = (i + 1) / n * 6.2832; am = (a0 + a1) / 2; c0 = Math.cos(a0); s0 = Math.sin(a0); c1 = Math.cos(a1); s1 = Math.sin(a1);
    pv(v, [c0 * 0.5, 0, s0 * 0.5], [c0 * 0.894, 0.447, s0 * 0.894]); pv(v, [c1 * 0.5, 0, s1 * 0.5], [c1 * 0.894, 0.447, s1 * 0.894]); pv(v, [0, 1, 0], [Math.cos(am) * 0.894, 0.447, Math.sin(am) * 0.894]);
    pv(v, [0, 0, 0], [0, -1, 0]); pv(v, [c1 * 0.5, 0, s1 * 0.5], [0, -1, 0]); pv(v, [c0 * 0.5, 0, s0 * 0.5], [0, -1, 0]);
  }
  return v;
}
function mPyr() {
  var v = [], ap = [0, 1, 0], p = [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5]], i, a, b, n;
  for (i = 0; i < 4; i++) {
    a = p[i]; b = p[(i + 1) % 4];
    n = nrm([(a[0] + b[0]) / 2, 0.5, (a[2] + b[2]) / 2]); pv(v, a, n); pv(v, b, n); pv(v, ap, n);
  }
  quad(v, [0, -1, 0], p[3], p[2], p[1], p[0]);
  return v;
}
function mSphere(la, lo) {
  var v = [], i, j;
  function P(i, j) { var th = i / la * Math.PI, ph = j / lo * 6.2832, x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph); return [[x * 0.5, y * 0.5, z * 0.5], [x, y, z]]; }
  for (i = 0; i < la; i++) for (j = 0; j < lo; j++) {
    var a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    pv(v, a[0], a[1]); pv(v, b[0], b[1]); pv(v, c[0], c[1]); pv(v, a[0], a[1]); pv(v, c[0], c[1]); pv(v, d[0], d[1]);
  }
  return v;
}
function mHull() {
  var v = [], ctr = [0, 0.35, 0.2], zs = [-1.6, -1.3, -0.2, 0.8, 1.5, 2.0], hw = [0.62, 0.7, 0.7, 0.58, 0.3, 0.02], gy = [0.62, 0.58, 0.55, 0.6, 0.78, 0.98], ky = [0.06, 0, 0, 0.05, 0.38, 0.92], S = [], i, j, k;
  for (i = 0; i < zs.length; i++) {
    var cy = ky[i] + (gy[i] - ky[i]) * 0.35;
    S.push([[-hw[i], gy[i], zs[i]], [-hw[i] * 0.82, cy, zs[i]], [0, ky[i], zs[i]], [hw[i] * 0.82, cy, zs[i]], [hw[i], gy[i], zs[i]]]);
  }
  for (i = 0; i < zs.length - 1; i++) for (j = 0; j < 4; j++) { triFlat(v, S[i][j], S[i][j + 1], S[i + 1][j], ctr); triFlat(v, S[i][j + 1], S[i + 1][j + 1], S[i + 1][j], ctr); }
  var e = S[0]; for (k = 1; k < 4; k++) triFlat(v, e[0], e[k], e[k + 1], ctr);
  return v;
}

/* ---------- Shader ---------- */
var PRE = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
var GLSL_SKY = "uniform vec3 uZen,uHor,uSunDir,uSunCol;uniform float uNight,uTime;" +
  "float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}" +
  "float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}" +
  "float fbm(vec2 p){return vnoise(p)*.55+vnoise(p*2.03)*.3+vnoise(p*4.1)*.15;}" +
  "vec3 skyCol(vec3 d){float h=clamp(d.y,0.,1.);vec3 c=mix(uHor,uZen,pow(h,.5));float sd=max(dot(d,uSunDir),0.);" +
  "c+=uSunCol*(pow(sd,700.)*3.+pow(sd,14.)*.4+pow(sd,3.)*.14);" +
  "if(d.y>0.){vec2 sp=d.xz/(d.y+.35)*46.;float s=hash21(floor(sp));float tw=.6+.4*sin(uTime*3.+s*60.);c+=vec3(step(.986,s))*tw*uNight*smoothstep(0.,.25,d.y);" +
  "vec2 cp=d.xz/(d.y+.18)*1.5+vec2(uTime*.012,0.);float cl=smoothstep(.5,.92,fbm(cp))*smoothstep(.02,.3,d.y);vec3 cc=mix(vec3(1.),uHor*1.15,.45)*(.45+.55*(1.-uNight));c=mix(c,cc,cl*.62);}" +
  "return c;}";
var VS_SKY = "attribute vec2 aP;varying vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,.9999,1.);}";
var FS_SKY = PRE + GLSL_SKY + "varying vec2 vP;uniform vec3 uF,uR,uU;uniform vec2 uT;void main(){vec3 d=normalize(uF+uR*vP.x*uT.x+uU*vP.y*uT.y);gl_FragColor=vec4(skyCol(d),1.);}";
var VS_MESH = "attribute vec3 aP,aN;uniform mat4 uVP,uM;uniform mat3 uNM;varying vec3 vN,vWP;void main(){vec4 w=uM*vec4(aP,1.);vWP=w.xyz;vN=uNM*aN;gl_Position=uVP*w;}";
var FS_MESH = PRE + "varying vec3 vN,vWP;uniform vec3 uCol,uEm,uCam,uSunDir,uSunCol,uAmbT,uAmbB,uFog;uniform float uFogD,uFogK,uWin,uSeed,uSpec,uAlpha,uNight;" +
  "float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}" +
  "void main(){vec3 N=normalize(vN),V=normalize(uCam-vWP);vec3 col=uCol,em=uEm;" +
  "if(uWin>.5&&abs(N.y)<.5&&vWP.y>1.5){vec2 uv=abs(N.x)>.5?vWP.zy:vWP.xy;vec2 sc=uv*vec2(.5,.4);vec2 c=floor(sc),f=fract(sc);" +
  "float w=step(.22,f.x)*step(f.x,.78)*step(.28,f.y)*step(f.y,.78);float on=step(.42,hash21(c+uSeed));" +
  "col=mix(col,vec3(.1,.15,.22),w*(1.-uNight*on)*.85);em+=vec3(1.,.72,.38)*w*on*uNight*1.3;}" +
  "float nd=max(dot(N,uSunDir),0.);vec3 amb=mix(uAmbB,uAmbT,N.y*.5+.5);vec3 lit=col*(amb+uSunCol*nd);" +
  "vec3 H=normalize(uSunDir+V);lit+=uSunCol*pow(max(dot(N,H),0.),40.)*uSpec;" +
  "lit+=pow(1.-max(dot(N,V),0.),3.)*uAmbT*.3;lit+=em;" +
  "float dist=length(uCam-vWP);float f2=1.-exp(-pow(uFogD*uFogK*dist,2.));lit=mix(lit,uFog,clamp(f2,0.,1.));gl_FragColor=vec4(lit,uAlpha);}";
var VS_WATER = "attribute vec3 aP;uniform mat4 uVP;varying vec3 vWP;void main(){vWP=aP;gl_Position=uVP*vec4(aP,1.);}";
var FS_WATER = PRE + GLSL_SKY + "varying vec3 vWP;uniform vec3 uCam,uDeep,uFog;uniform float uFogD;uniform vec4 uBoat;" +
  "void main(){vec3 V=normalize(uCam-vWP);vec2 p=vWP.xz;float t=uTime;vec2 g=vec2(0.);" +
  "vec2 d1=vec2(.8,.6),d2=vec2(-.6,.8),d3=vec2(.1,1.),d4=vec2(-.9,.3);" +
  "g+=d1*cos(dot(d1,p)*1.3+t*1.2)*.16;g+=d2*cos(dot(d2,p)*2.1+t*1.7)*.11;g+=d3*cos(dot(d3,p)*3.7-t*2.3)*.07;g+=d4*cos(dot(d4,p)*5.9+t*2.9)*.04;" +
  "g+=(vec2(vnoise(p*3.+t*.5),vnoise(p*3.+17.-t*.4))-.5)*.12;vec3 N=normalize(vec3(-g.x,1.,-g.y));" +
  "float dist=length(uCam-vWP);N=normalize(mix(N,vec3(0.,1.,0.),clamp(dist/150.,0.,.85)));" +
  "float F=.03+.97*pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);R.y=abs(R.y)+.02;vec3 refl=skyCol(normalize(R));" +
  "vec3 col=mix(uDeep,refl,clamp(F*1.1+.08,0.,1.));col+=uSunCol*pow(max(dot(normalize(R),uSunDir),0.),260.)*2.2;" +
  "float bank=smoothstep(2.,6.2,abs(vWP.x));float st=pow(vnoise(vec2(vWP.x*.9,vWP.z*.25+t*.6)),3.)*bank;col+=vec3(1.,.62,.28)*st*uNight*1.7;" +
  "float fb=smoothstep(5.5,6.4,abs(vWP.x))*(.4+.6*vnoise(vWP.xz*2.+t*.5));col=mix(col,vec3(.85,.95,1.),fb*.5);" +
  "float dz=vWP.z-uBoat.y;float ax=abs(vWP.x-uBoat.x);float behind=step(dz,0.)*smoothstep(-42.,-1.,dz);" +
  "float vl=1.-smoothstep(0.,.55,abs(ax-(-dz)*.32-.5));float core=(1.-smoothstep(0.,.9,ax))*smoothstep(-22.,-1.5,dz);" +
  "float wk=(vl*.9+core*.6)*behind*(.5+.5*vnoise(vWP.xz*3.-t*2.));col=mix(col,vec3(.9,.97,1.),clamp(wk,0.,1.)*.7*uBoat.z);" +
  "float fg=1.-exp(-pow(uFogD*dist,2.));col=mix(col,uFog,clamp(fg,0.,1.));gl_FragColor=vec4(col,1.);}";
var VS_PT = "attribute vec3 aP;attribute vec4 aS;attribute vec4 aC;uniform mat4 uVP;uniform float uPx;varying vec4 vC;void main(){vC=aC;vec4 c=uVP*vec4(aP,1.);gl_Position=c;gl_PointSize=clamp(aS.x*uPx/max(c.w,.1),1.,96.);}";
var FS_PT = PRE + "varying vec4 vC;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;gl_FragColor=vec4(vC.rgb*a*vC.a,a);}";
var VS_Q = "attribute vec2 aP;varying vec2 vU;void main(){vU=aP*.5+.5;gl_Position=vec4(aP,0.,1.);}";
var FS_BRIGHT = PRE + "varying vec2 vU;uniform sampler2D uT;void main(){vec3 c=texture2D(uT,vU).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.62,1.,l),1.);}";
var FS_BLUR = PRE + "varying vec2 vU;uniform sampler2D uT;uniform vec2 uD;void main(){vec3 c=texture2D(uT,vU).rgb*.2270;c+=(texture2D(uT,vU+uD*1.3846).rgb+texture2D(uT,vU-uD*1.3846).rgb)*.3162;c+=(texture2D(uT,vU+uD*3.2308).rgb+texture2D(uT,vU-uD*3.2308).rgb)*.0703;gl_FragColor=vec4(c,1.);}";
var FS_COMP = PRE + "varying vec2 vU;uniform sampler2D uS,uB;uniform float uBloom,uHit,uBoost,uFlash,uTime;" +
  "void main(){vec2 c=vU-.5;vec3 s=vec3(0.);if(uBoost>.01){for(int i=0;i<5;i++){s+=texture2D(uS,.5+c*(1.-uBoost*.045*float(i))).rgb;}s/=5.;}else s=texture2D(uS,vU).rgb;" +
  "vec3 col=s+texture2D(uB,vU).rgb*uBloom;col*=1.-dot(c,c)*1.25;float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,1.12);" +
  "col*=.88;col=clamp((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14),0.,1.);col=mix(col,vec3(1.,.15,.12),uHit*.38*(.4+dot(c,c)*2.));col+=vec3(1.,.9,.6)*uFlash*.16;gl_FragColor=vec4(col,1.);}";

function compile(gl, t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s)); return s; }
function prog(gl, vs, fs) {
  var p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(p));
  var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, a;
  for (i = 0; i < n; i++) { a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, a.name); }
  return {p: p, u: u};
}

/* ---------- Palet siang / senja / malam ---------- */
var PAL = [
  {zen: [0.18, 0.46, 0.9], hor: [0.74, 0.88, 0.98], sc: [1.0, 0.93, 0.78], sd: [0.35, 0.62, 0.7], at: [0.62, 0.72, 0.9], ab: [0.36, 0.33, 0.28], dp: [0.05, 0.2, 0.17], n: 0},
  {zen: [0.28, 0.16, 0.45], hor: [1.0, 0.56, 0.28], sc: [1.0, 0.55, 0.28], sd: [0.05, 0.16, 0.99], at: [0.5, 0.36, 0.5], ab: [0.28, 0.17, 0.14], dp: [0.08, 0.1, 0.14], n: 0.45},
  {zen: [0.01, 0.03, 0.12], hor: [0.07, 0.12, 0.3], sc: [0.5, 0.62, 1.0], sd: [-0.3, 0.5, 0.8], at: [0.2, 0.25, 0.46], ab: [0.07, 0.07, 0.12], dp: [0.01, 0.04, 0.07], n: 1}
];
var CYC = 32;
function pal(t) {
  var c = (t / CYC) % 3, i = Math.floor(c), f = sm(c - i), a = PAL[i], b = PAL[(i + 1) % 3];
  return {zen: mixv(a.zen, b.zen, f), hor: mixv(a.hor, b.hor, f), sc: mixv(a.sc, b.sc, f), sd: nrm(mixv(a.sd, b.sd, f)), at: mixv(a.at, b.at, f), ab: mixv(a.ab, b.ab, f), dp: mixv(a.dp, b.dp, f), n: lerp(a.n, b.n, f)};
}

/* ---------- Dunia ---------- */
var SEG = 36, SC = {}, LX = [-4.6, -2.3, 0, 2.3, 4.6];
var BC = [[0.93, 0.86, 0.72], [0.82, 0.45, 0.35], [0.55, 0.72, 0.7], [0.88, 0.78, 0.5], [0.72, 0.75, 0.82], [0.78, 0.55, 0.45], [0.95, 0.93, 0.88]];
var ROOF = [[0.62, 0.27, 0.2], [0.35, 0.37, 0.4], [0.5, 0.25, 0.18]];
var SKY_B = [];
(function () { var R = seeded(91), i; for (i = 0; i < 16; i++) SKY_B.push({x: (R() < 0.5 ? -1 : 1) * (16 + R() * 60), z: 165 + R() * 70, w: 8 + R() * 8, d: 8 + R() * 8, h: 14 + R() * 36, c: BC[Math.floor(R() * BC.length)], s: R() * 50}); })();
function it(mesh, x, y, z, sx, sy, sz, col, o) {
  var M = model(x, y, z, sx, sy, sz, (o && o.ry) || 0, (o && o.rz) || 0);
  return {mesh: mesh, m: M.m, nm: M.nm, col: col, em: (o && o.em) || null, nt: !!(o && o.nt), win: (o && o.win) || 0, seed: (o && o.seed) || 0, spec: (o && o.spec) || 0, z: z};
}
function seg(i) {
  if (SC[i]) return SC[i];
  var R = seeded(i * 7919 + 13), L = [], z0 = i * SEG, s, z, z1 = z0 + SEG, k;
  [-1, 1].forEach(function (sd) {
    L.push(it("box", sd * 6.9, -0.3, z0 + SEG / 2, 0.8, 1.6, SEG + 0.2, [0.33, 0.31, 0.28], {}));
    L.push(it("box", sd * 8.6, -0.3, z0 + SEG / 2, 3.0, 1.6, SEG + 0.2, [0.62, 0.6, 0.56], {}));
    z = z0 + R() * 2;
    while (z < z1 - 4) {
      var d = 5 + R() * 4, w = 6 + R() * 5, h = 5 + R() * 14, x = sd * (9.9 + d / 2 + R() * 1.2), c = BC[Math.floor(R() * BC.length)], rc = ROOF[Math.floor(R() * ROOF.length)], zz = z + w / 2;
      L.push(it("box", x, 0, zz, d, h, w, c, {win: 1, seed: R() * 90}));
      if (R() < 0.62) L.push(it("pyr", x, h, zz, d * 1.08, 2 + R() * 2.6, w * 1.08, rc, {}));
      else L.push(it("box", x, h, zz, d * 0.9, 0.5, w * 0.9, [0.28, 0.28, 0.3], {}));
      z += w + 0.4 + R() * 2;
    }
    for (k = 0; k < 3; k++) {
      var tz = z0 + 4 + k * 12 + R() * 4, tx = sd * (9.2 + R() * 0.6), th = 2 + R() * 1.2;
      L.push(it("cyl", tx, 1.3, tz, 0.4, th, 0.4, [0.32, 0.2, 0.12], {}));
      L.push(it("sph", tx, 1.3 + th - 0.2, tz, 3.4 + R(), 2.6, 3.4 + R(), [0.14 + R() * 0.08, 0.42 + R() * 0.15, 0.16], {}));
      L.push(it("sph", tx + (R() - 0.5), 1.3 + th + 1.3, tz + (R() - 0.5), 2.4, 2, 2.4, [0.2, 0.5 + R() * 0.12, 0.2], {}));
    }
    for (k = 0; k < 3; k++) {
      var lz = z0 + 2 + k * 12;
      L.push(it("cyl", sd * 7.7, 1.3, lz, 0.14, 3.2, 0.14, [0.14, 0.15, 0.17], {}));
      L.push(it("sph", sd * 7.7, 4.5, lz, 0.5, 0.5, 0.5, [1, 0.85, 0.55], {em: [1.4, 1.0, 0.55], nt: true}));
    }
  });
  if (((i % 5) + 5) % 5 === 3) {
    var bz = z0 + SEG / 2, rc2 = [0.62, 0.16, 0.12];
    L.push(it("box", 0, 5.0, bz, 18.6, 0.6, 6.4, rc2, {spec: 0.2}));
    L.push(it("box", 0, 5.6, bz - 3, 18.6, 0.8, 0.3, [0.9, 0.88, 0.82], {}));
    L.push(it("box", 0, 5.6, bz + 3, 18.6, 0.8, 0.3, [0.9, 0.88, 0.82], {}));
    [-7.6, 7.6].forEach(function (px) { L.push(it("cyl", px, -0.3, bz - 2, 1.1, 5.4, 1.1, [0.55, 0.5, 0.45], {})); L.push(it("cyl", px, -0.3, bz + 2, 1.1, 5.4, 1.1, [0.55, 0.5, 0.45], {})); });
    for (k = -6; k <= 6; k++) { L.push(it("sph", k * 1.3, 4.7, bz - 2.4, 0.4, 0.4, 0.4, [1, 0.9, 0.6], {em: [1.5, 1.1, 0.6], nt: true})); L.push(it("sph", k * 1.3, 4.7, bz + 2.4, 0.4, 0.4, 0.4, [1, 0.9, 0.6], {em: [1.5, 1.1, 0.6], nt: true})); }
  }
  SC[i] = L; return L;
}

/* ---------- Mesin ---------- */
function start(S) {
  var c = S.c, gl = c.getContext("webgl", {antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false}) || c.getContext("experimental-webgl", {antialias: false, alpha: false});
  if (!gl) throw new Error("no webgl");
  var R = {gl: gl}, P = {};
  P.sky = prog(gl, VS_SKY, FS_SKY); P.mesh = prog(gl, VS_MESH, FS_MESH); P.water = prog(gl, VS_WATER, FS_WATER); P.pt = prog(gl, VS_PT, FS_PT);
  P.bright = prog(gl, VS_Q, FS_BRIGHT); P.blur = prog(gl, VS_Q, FS_BLUR); P.comp = prog(gl, VS_Q, FS_COMP);
  function mk(v) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW); return {b: b, n: v.length / 6}; }
  R.M = {box: mk(mBox()), cyl: mk(mCyl(12)), cone: mk(mCone(12)), pyr: mk(mPyr()), sph: mk(mSphere(9, 14)), hull: mk(mHull())};
  R.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, R.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  R.wat = gl.createBuffer(); R.pbuf = gl.createBuffer(); R.pdat = new Float32Array(560 * 11);
  R.T = {}; R.W = 0; R.H = 0; R.post = true;
  function tex(w, h) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  function fbo(w, h, depth) {
    var t = tex(w, h), f = gl.createFramebuffer(), d = null; gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (depth) { d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d); }
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER, null); return {t: t, f: f, d: d, ok: ok, w: w, h: h};
  }
  function free(o) { if (!o) return; gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); if (o.d) gl.deleteRenderbuffer(o.d); }
  R.resize = function (w, h) {
    if (w === R.W && h === R.H) return; R.W = w; R.H = h; c.width = w; c.height = h;
    free(R.T.s); free(R.T.a); free(R.T.b);
    R.T.s = fbo(w, h, true); var bw = Math.max(4, w >> 2), bh = Math.max(4, h >> 2); R.T.a = fbo(bw, bh, false); R.T.b = fbo(bw, bh, false);
    R.post = R.T.s.ok && R.T.a.ok && R.T.b.ok;
  };
  S.R = R; S.P = P; return R;
}
function setU(gl, P, n, v) { var l = P.u[n]; if (l == null) return; if (typeof v === "number") gl.uniform1f(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); }
function attr(gl, loc, size, stride, off) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); }

function render(S) {
  var R = S.R, gl = R.gl, P = S.P, K = S.K, W = R.W, H = R.H, asp = W / H, fov = (60 + S.boostK * 16) * Math.PI / 180, pz = S.pz;
  var sh = S.shake > 0 && !RM ? S.shake : 0, ex = S.x * 0.55 + (sh ? (Math.random() - 0.5) * sh * 0.5 : 0), ey = 3.45 + Math.sin(S.t * 1.7) * 0.05 + (sh ? (Math.random() - 0.5) * sh * 0.4 : 0), ez = pz - 7.4;
  var V = look([ex, ey, ez], [S.x * 0.8, 1.1, pz + 16]), PM = persp(fov, asp, 0.5, 520), VP = mul(PM, V.m), cam = [ex, ey, ez]; S.VP = VP;
  var fog = [K.hor[0] * 0.92, K.hor[1] * 0.92, K.hor[2] * 0.95], fogD = 0.0135;
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.post ? R.T.s.f : null); gl.viewport(0, 0, W, H);
  gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  /* langit */
  var p = P.sky; gl.useProgram(p.p); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  setU(gl, p, "uZen", K.zen); setU(gl, p, "uHor", K.hor); setU(gl, p, "uSunDir", K.sd); setU(gl, p, "uSunCol", K.sc); setU(gl, p, "uNight", K.n); setU(gl, p, "uTime", S.t);
  setU(gl, p, "uF", V.f); setU(gl, p, "uR", V.r); setU(gl, p, "uU", V.u); setU(gl, p, "uT", [Math.tan(fov / 2) * asp, Math.tan(fov / 2)]);
  gl.bindBuffer(gl.ARRAY_BUFFER, R.quad); attr(gl, gl.getAttribLocation(p.p, "aP"), 2, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disableVertexAttribArray(gl.getAttribLocation(p.p, "aP"));
  /* mesh */
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
  p = P.mesh; gl.useProgram(p.p);
  var aPm = gl.getAttribLocation(p.p, "aP"), aNm = gl.getAttribLocation(p.p, "aN"), cur = null, night = clamp(K.n, 0, 1);
  gl.uniformMatrix4fv(p.u.uVP, false, VP);
  setU(gl, p, "uCam", cam); setU(gl, p, "uSunDir", K.sd); setU(gl, p, "uSunCol", K.sc); setU(gl, p, "uAmbT", K.at); setU(gl, p, "uAmbB", K.ab); setU(gl, p, "uFog", fog); setU(gl, p, "uFogD", fogD); setU(gl, p, "uNight", night);
  function draw(mesh, M, col, o) {
    if (cur !== mesh) { var m = R.M[mesh]; gl.bindBuffer(gl.ARRAY_BUFFER, m.b); attr(gl, aPm, 3, 24, 0); attr(gl, aNm, 3, 24, 12); cur = mesh; }
    gl.uniformMatrix4fv(p.u.uM, false, M.m); gl.uniformMatrix3fv(p.u.uNM, false, M.nm);
    gl.uniform3fv(p.u.uCol, col); var e = o && o.em; gl.uniform3f(p.u.uEm, e ? e[0] * (o.nt ? 0.15 + night : 1) : 0, e ? e[1] * (o.nt ? 0.15 + night : 1) : 0, e ? e[2] * (o.nt ? 0.15 + night : 1) : 0);
    gl.uniform1f(p.u.uWin, (o && o.win) || 0); gl.uniform1f(p.u.uSeed, (o && o.seed) || 0); gl.uniform1f(p.u.uSpec, (o && o.spec) || 0); gl.uniform1f(p.u.uAlpha, (o && o.a) || 1); gl.uniform1f(p.u.uFogK, (o && o.fk) || 1);
    gl.drawArrays(gl.TRIANGLES, 0, R.M[mesh].n);
  }
  S.draw = draw;
  var s0 = Math.floor((pz - 40) / SEG), s1 = Math.floor((pz + 215) / SEG), i, j, L;
  for (i = s0; i <= s1; i++) { L = seg(i); for (j = 0; j < L.length; j++) { var q = L[j]; draw(q.mesh, q, q.col, q); } }
  for (var kk in SC) if (+kk < s0 - 3) delete SC[kk];
  /* kota jauh dan Tugu Pahlawan (kabut lebih tipis) */
  SKY_B.forEach(function (b) { var M = model(b.x, 0, pz + b.z, b.w, b.h, b.d, 0, 0); draw("box", M, b.c, {win: 1, seed: b.s, fk: 0.38}); });
  (function () {
    var z = pz + 215, x = 26, fk = 0.3, st = [0.82, 0.8, 0.74], o = {fk: fk, spec: 0.1};
    draw("box", model(x, 0, z, 12, 3, 12, 0, 0), st, o); draw("cyl", model(x, 3, z, 9, 5, 9, 0, 0), st, o);
    draw("cyl", model(x, 8, z, 6, 18, 6, 0, 0), st, o); draw("cyl", model(x, 26, z, 4.6, 16, 4.6, 0, 0), [0.86, 0.84, 0.78], o);
    draw("cyl", model(x, 42, z, 3.4, 10, 3.4, 0, 0), st, o); draw("cone", model(x, 52, z, 3.2, 10, 3.2, 0, 0), [0.78, 0.76, 0.7], o);
  })();
  /* entitas */
  S.ents.forEach(function (e) { drawEnt(S, e, draw); });
  drawBoat(S, draw);
  /* air */
  p = P.water; gl.useProgram(p.p);
  var wz0 = pz - 30, wz1 = pz + 420; gl.bindBuffer(gl.ARRAY_BUFFER, R.wat);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-60, 0, wz0, 60, 0, wz0, -60, 0, wz1, 60, 0, wz1]), gl.DYNAMIC_DRAW);
  var aW = gl.getAttribLocation(p.p, "aP"); attr(gl, aW, 3, 12, 0);
  gl.uniformMatrix4fv(p.u.uVP, false, VP);
  setU(gl, p, "uCam", cam); setU(gl, p, "uDeep", K.dp); setU(gl, p, "uFog", fog); setU(gl, p, "uFogD", fogD); setU(gl, p, "uBoat", [S.x, pz, clamp(S.speed / 20, 0.3, 1.6), 0]);
  setU(gl, p, "uZen", K.zen); setU(gl, p, "uHor", K.hor); setU(gl, p, "uSunDir", K.sd); setU(gl, p, "uSunCol", K.sc); setU(gl, p, "uNight", K.n); setU(gl, p, "uTime", S.t);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(aW);
  /* perisai transparan */
  p = P.mesh; gl.useProgram(p.p);
  if (S.shield > 0) {
    var pulse = 1 + Math.sin(S.t * 8) * 0.04, fl = S.shield < 2 && Math.floor(S.t * 8) % 2 ? 0.4 : 1;
    cur = null; draw("sph", model(S.x, 0.8, pz, 3.2 * pulse, 2.6 * pulse, 3.8 * pulse, 0, 0), [0.4, 0.85, 1], {em: [0.1, 0.5, 0.7], a: 0.28 * fl});
  }
  /* partikel */
  drawParticles(S, VP, H, fov);
  /* pasca-proses */
  gl.disable(gl.DEPTH_TEST);
  var aQ;
  function quadDraw(pg) { gl.useProgram(pg.p); gl.bindBuffer(gl.ARRAY_BUFFER, R.quad); aQ = gl.getAttribLocation(pg.p, "aP"); attr(gl, aQ, 2, 0, 0); }
  if (R.post) {
    gl.blendFunc(gl.ONE, gl.ZERO);
    var bl = S.q >= 1 ? 1 : 0;
    if (bl) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, R.T.a.f); gl.viewport(0, 0, R.T.a.w, R.T.a.h); quadDraw(P.bright); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.T.s.t); gl.uniform1i(P.bright.u.uT, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      var n2;
      for (n2 = 0; n2 < 2; n2++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.T.b.f); quadDraw(P.blur); gl.bindTexture(gl.TEXTURE_2D, R.T.a.t); gl.uniform1i(P.blur.u.uT, 0); gl.uniform2f(P.blur.u.uD, 1 / R.T.a.w, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.T.a.f); gl.bindTexture(gl.TEXTURE_2D, R.T.b.t); gl.uniform2f(P.blur.u.uD, 0, 1 / R.T.a.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); quadDraw(P.comp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.T.s.t); gl.uniform1i(P.comp.u.uS, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.T.a.t); gl.uniform1i(P.comp.u.uB, 1);
    gl.uniform1f(P.comp.u.uBloom, bl ? 0.35 + night * 0.65 : 0); gl.uniform1f(P.comp.u.uHit, S.hitK); gl.uniform1f(P.comp.u.uBoost, RM ? 0 : S.boostK); gl.uniform1f(P.comp.u.uFlash, S.flash); gl.uniform1f(P.comp.u.uTime, S.t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
    gl.disableVertexAttribArray(aQ); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}

/* ---------- Model benda ---------- */
var C_WOOD = [0.36, 0.22, 0.12];
function drawBoat(S, draw) {
  var t = S.t, bob = Math.sin(t * 2.6) * 0.05, lean = clamp(-S.vx * 0.035, -0.4, 0.4), y = -0.16 + bob, inv = S.inv > 0 && Math.floor(S.t * 14) % 2 === 0;
  if (S.dead && S.deadT > 0.2) y -= (S.deadT - 0.2) * 0.9;
  if (inv) return;
  var x = S.x, z = S.pz, tilt = lean;
  draw("hull", model(x, y, z, 1, 1, 1, 0, tilt), S.hero.hull, {spec: 0.5});
  draw("box", model(x, y + 0.26, z - 0.1, 1.0, 0.06, 2.5, 0, tilt), C_WOOD, {});
  draw("box", model(x, y + 0.3, z - 0.1, 1.1, 0.08, 0.08, 0, tilt), [0.97, 0.97, 0.97], {});
  draw("box", model(x, y + 0.32, z - 1.4, 1.2, 0.06, 0.14, 0, tilt), [0.97, 0.97, 0.97], {});
  /* kanopi */
  draw("box", model(x - 0.5, y + 0.3, z - 0.9, 0.06, 0.9, 0.06, 0, tilt), C_WOOD, {}); draw("box", model(x + 0.5, y + 0.3, z - 0.9, 0.06, 0.9, 0.06, 0, tilt), C_WOOD, {});
  draw("box", model(x - 0.5, y + 0.3, z + 0.3, 0.06, 0.9, 0.06, 0, tilt), C_WOOD, {}); draw("box", model(x + 0.5, y + 0.3, z + 0.3, 0.06, 0.9, 0.06, 0, tilt), C_WOOD, {});
  draw("box", model(x, y + 1.17, z - 0.3, 1.35, 0.1, 1.6, 0, tilt), S.hero.canopy, {spec: 0.2});
  /* Cak Takok */
  draw("cyl", model(x, y + 0.32, z - 0.3, 0.46, 0.62, 0.4, 0, tilt), S.hero.shirt, {});
  draw("sph", model(x, y + 0.98, z - 0.3, 0.38, 0.38, 0.38, 0, tilt), [0.9, 0.66, 0.46], {});
  draw("cone", model(x, y + 1.1, z - 0.3, 0.52, 0.22, 0.52, 0, tilt), S.hero.hat, {});
  draw("box", model(x + 0.34, y + 0.5, z - 0.15, 0.07, 1.5, 0.07, 0.2, 0.8 + Math.sin(t * 7) * 0.25 + tilt), [0.5, 0.33, 0.18], {});
  /* lentera dan bendera */
  draw("sph", model(x, y + 0.74, z + 1.75, 0.22, 0.22, 0.22, 0, tilt), [1, 0.8, 0.4], {em: [1.6, 1.1, 0.5]});
  draw("box", model(x, y + 0.5, z - 1.5, 0.05, 1.2, 0.05, 0, tilt), C_WOOD, {});
  draw("box", model(x + 0.16, y + 1.45, z - 1.5, 0.3, 0.1, 0.02, 0, tilt), [0.9, 0.1, 0.1], {}); draw("box", model(x + 0.16, y + 1.35, z - 1.5, 0.3, 0.1, 0.02, 0, tilt), [1, 1, 1], {});
  if (S.turbo > 0) draw("sph", model(x, y + 0.6, z - 2.1, 0.9, 0.5, 2.4, 0, 0), [0.4, 0.8, 1], {em: [0.4, 1.0, 1.6], a: 0.45});
}
function drawEnt(S, e, draw) {
  var t = S.t, k = e.k, x = e.x, z = e.z, b = Math.sin(t * 2 + e.ph) * 0.05;
  if (k === "log") { draw("cyl", model(x, -0.1 + b, z, 0.7, e.len, 0.7, e.yaw, 1.5708 + Math.sin(t + e.ph) * 0.05), C_WOOD, {}); draw("box", model(x + 0.2, 0.15 + b, z, 0.12, 0.5, 0.12, 0, 0.7), [0.3, 0.19, 0.1], {}); }
  else if (k === "hya") { var g = [0.2, 0.55, 0.2]; draw("sph", model(x, -0.05 + b, z, 1.8, 0.7, 1.8, 0, 0), g, {}); draw("sph", model(x + 0.4, 0.1 + b, z + 0.3, 1.1, 0.6, 1.1, 0, 0), [0.28, 0.62, 0.24], {}); draw("sph", model(x - 0.1, 0.4 + b, z, 0.3, 0.3, 0.3, 0, 0), [0.7, 0.4, 0.9], {em: [0.3, 0.12, 0.4]}); }
  else if (k === "buoy") { draw("cone", model(x, -0.2 + b, z, 0.9, 1.3, 0.9, 0, Math.sin(t * 1.5 + e.ph) * 0.06), [0.88, 0.14, 0.12], {spec: 0.3}); draw("cyl", model(x, 0.45 + b, z, 0.62, 0.18, 0.62, 0, 0), [1, 1, 1], {}); draw("sph", model(x, 1.15 + b, z, 0.26, 0.26, 0.26, 0, 0), [1, 0.3, 0.2], {em: [1.6, 0.3, 0.2]}); }
  else if (k === "boyo") {
    var yw = Math.atan2(e.vx, S.speed * 0.4 + 1), c = [0.16, 0.34, 0.2];
    draw("box", model(x, -0.15 + b, z, 0.9, 0.4, 2.6, yw, 0), c, {spec: 0.2}); draw("box", model(x + Math.sin(yw) * 1.7, -0.12 + b, z + Math.cos(yw) * 1.7, 0.6, 0.26, 1.1, yw, 0), [0.2, 0.4, 0.24], {});
    draw("box", model(x - Math.sin(yw) * 1.7, -0.12 + b, z - Math.cos(yw) * 1.7, 0.4, 0.2, 1.2, yw + Math.sin(t * 5) * 0.4, 0), c, {});
    draw("sph", model(x + Math.sin(yw) * 1.9 + 0.2, 0.2 + b, z + Math.cos(yw) * 1.9, 0.2, 0.2, 0.2, 0, 0), [1, 0.9, 0.2], {em: [1.6, 1.2, 0.2]}); draw("sph", model(x + Math.sin(yw) * 1.9 - 0.2, 0.2 + b, z + Math.cos(yw) * 1.9, 0.2, 0.2, 0.2, 0, 0), [1, 0.9, 0.2], {em: [1.6, 1.2, 0.2]});
    for (var q = -1; q <= 1; q++) draw("pyr", model(x + Math.sin(yw) * q * 0.7, 0.05 + b, z + Math.cos(yw) * q * 0.7, 0.3, 0.3, 0.4, yw, 0), [0.1, 0.22, 0.14], {});
  }
  else if (k === "rival") { draw("hull", model(x, -0.16 + b, z, 0.95, 0.95, 0.95, 0, 0), [0.15, 0.4, 0.85], {spec: 0.4}); draw("box", model(x, 0.9, z - 0.3, 1.2, 0.1, 1.5, 0, 0), [0.95, 0.95, 0.95], {}); draw("sph", model(x, 0.5, z + 1.7, 0.22, 0.22, 0.22, 0, 0), [1, 0.8, 0.4], {em: [1.6, 1.1, 0.5]}); draw("cyl", model(x, 0.1, z - 0.3, 0.4, 0.7, 0.4, 0, 0), [0.9, 0.9, 0.2], {}); }
  else if (k === "berkas") { var yy = 0.95 + Math.sin(t * 3 + e.ph) * 0.15; draw("box", model(x, yy, z, 0.6, 0.12, 0.8, t * 2 + e.ph, 0), [0.98, 0.98, 0.95], {em: [0.5, 0.5, 0.4]}); draw("box", model(x, yy + 0.08, z, 0.3, 0.05, 0.4, t * 2 + e.ph, 0), [1, 0.6, 0.15], {em: [1.2, 0.6, 0.1]}); }
  else if (k === "stempel") { var y2 = 1.0 + Math.sin(t * 3 + e.ph) * 0.15; draw("cyl", model(x, y2, z, 0.62, 0.26, 0.62, t * 3, 0), [1, 0.8, 0.2], {em: [1.4, 0.95, 0.15], spec: 0.8}); draw("cyl", model(x, y2 + 0.26, z, 0.2, 0.32, 0.2, t * 3, 0), [1, 0.85, 0.3], {em: [1.2, 0.9, 0.2]}); }
  else if (k === "perisai") { var y3 = 1.05 + Math.sin(t * 3 + e.ph) * 0.15; draw("sph", model(x, y3, z, 0.8, 0.8, 0.8, 0, 0), [0.4, 0.9, 1], {em: [0.3, 1.0, 1.5], a: 0.8}); draw("sph", model(x, y3, z, 0.4, 0.4, 0.4, 0, 0), [1, 1, 1], {em: [1.5, 1.5, 1.5]}); }
  else if (k === "turbo") { var y4 = 1.0 + Math.sin(t * 3 + e.ph) * 0.15; draw("sph", model(x, y4, z, 0.4, 0.4, 1.1, Math.sin(t) * 0.4, 0), [0.3, 0.7, 1], {em: [0.3, 1.0, 1.7]}); draw("cone", model(x, y4 - 0.1, z - 0.7, 0.5, 0.5, 0.5, 0, 0), [1, 0.8, 0.2], {em: [1.5, 1.0, 0.1]}); }
  else if (k === "heart") { var y5 = 1.0 + Math.sin(t * 3 + e.ph) * 0.15, hc = [1, 0.3, 0.55], ho = {em: [1.5, 0.3, 0.6]}; draw("sph", model(x - 0.17, y5 + 0.18, z, 0.4, 0.4, 0.3, 0, 0), hc, ho); draw("sph", model(x + 0.17, y5 + 0.18, z, 0.4, 0.4, 0.3, 0, 0), hc, ho); draw("box", model(x, y5 - 0.1, z, 0.32, 0.32, 0.26, 0, 0.7854), hc, ho); }
}

/* ---------- Partikel ---------- */
function emit(S, o) { if (S.parts.length < 520) S.parts.push(o); }
function spray(S, n, x, y, z, spd, col, sz, life, g) { for (var i = 0; i < n; i++) emit(S, {x: x, y: y, z: z, vx: (Math.random() - 0.5) * spd, vy: Math.random() * spd * 0.8, vz: (Math.random() - 0.5) * spd, l: life * (0.6 + Math.random() * 0.6), m: life, s: sz, c: col, g: g == null ? 6 : g}); }
function drawParticles(S, VP, Hpx, fov) {
  var R = S.R, gl = R.gl, P = S.P.pt, a = R.pdat, n = 0, i, o, f, gl2 = S.glows;
  for (i = 0; i < S.parts.length && n < 540; i++) { o = S.parts[i]; f = clamp(o.l / o.m, 0, 1); a.set([o.x, o.y, o.z, o.s * (0.4 + f * 0.8), 0, 0, 0, o.c[0], o.c[1], o.c[2], f], n * 11); n++; }
  for (i = 0; i < gl2.length && n < 559; i++) { o = gl2[i]; a.set([o.x, o.y, o.z, o.s, 0, 0, 0, o.c[0], o.c[1], o.c[2], o.a], n * 11); n++; }
  if (!n) return;
  gl.useProgram(P.p); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); gl.enable(gl.DEPTH_TEST);
  gl.bindBuffer(gl.ARRAY_BUFFER, R.pbuf); gl.bufferData(gl.ARRAY_BUFFER, a.subarray(0, n * 11), gl.DYNAMIC_DRAW);
  var l0 = gl.getAttribLocation(P.p, "aP"), l1 = gl.getAttribLocation(P.p, "aS"), l2 = gl.getAttribLocation(P.p, "aC");
  attr(gl, l0, 3, 44, 0); attr(gl, l1, 4, 44, 12); attr(gl, l2, 4, 44, 28);
  gl.uniformMatrix4fv(P.u.uVP, false, VP); gl.uniform1f(P.u.uPx, Hpx / (2 * Math.tan(fov / 2)));
  gl.drawArrays(gl.POINTS, 0, n);
  gl.disableVertexAttribArray(l0); gl.disableVertexAttribArray(l1); gl.disableVertexAttribArray(l2);
  gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

/* ---------- Permainan ---------- */
function ent(k, x, z, o) {
  var e = {k: k, x: x, z: z, vx: 0, vz: 0, hw: 0.8, hd: 0.8, ph: Math.random() * 6, bad: true, yaw: 0, len: 2, dead: false};
  if (k === "log") { e.len = 2 + Math.random() * 1.4; e.hw = e.len / 2 + 0.1; e.hd = 0.55; e.yaw = (Math.random() - 0.5) * 0.5; }
  else if (k === "hya") { e.hw = 1.0; e.hd = 1.0; }
  else if (k === "buoy") { e.hw = 0.5; e.hd = 0.5; }
  else if (k === "boyo") { e.hw = 0.75; e.hd = 1.6; e.vz = 1; }
  else if (k === "rival") { e.hw = 0.8; e.hd = 1.8; e.vz = 6; }
  else { e.bad = false; e.hw = 0.9; e.hd = 1.2; }
  if (o) for (var q in o) e[q] = o[q];
  return e;
}
var LANES = 5;
function spawnRow(S) {
  var R = Math.random, z = S.nextZ, free = clamp(S.free + Math.floor(R() * 3) - 1 - (R() < 0.3 ? 1 : 0) + (R() < 0.3 ? 1 : 0), 0, LANES - 1), diff = clamp(S.t / 90, 0, 1), r = R(), i;
  S.free = free;
  if (r < 0.34 + diff * 0.1) { /* barisan penghalang dengan satu celah */
    var kinds = ["log", "hya", "buoy"], cnt = 0;
    for (i = 0; i < LANES; i++) { if (i === free) continue; if (R() < 0.55 + diff * 0.35) { S.ents.push(ent(kinds[Math.floor(R() * 3)], LX[i], z + R() * 4)); cnt++; } }
    if (!cnt) S.ents.push(ent("buoy", LX[(free + 2) % LANES], z));
    S.ents.push(ent("berkas", LX[free], z + 2)); S.nextZ += 30;
  } else if (r < 0.5) { /* Boyo menyeberang */
    var from = R() < 0.5 ? 0 : LANES - 1, dir = from === 0 ? 1 : -1;
    S.ents.push(ent("boyo", LX[from], z, {vx: dir * (2.4 + diff * 1.4)}));
    for (i = 0; i < 4; i++) S.ents.push(ent("berkas", LX[free], z + i * 3.2));
    S.nextZ += 34;
  } else if (r < 0.62) { /* perahu lain yang lambat */
    var ln = Math.floor(R() * LANES); S.ents.push(ent("rival", LX[ln], z)); S.ents.push(ent("berkas", LX[(ln + (ln < 2 ? 1 : -1))], z + 1)); S.free = ln < 2 ? ln + 2 : ln - 2; S.nextZ += 30;
  } else if (r < 0.9) { /* jejak berkas berkelok */
    var ph = R() * 6, l0 = free;
    for (i = 0; i < 7; i++) { var li = clamp(Math.round(l0 + Math.sin(ph + i * 0.7) * 1.6), 0, LANES - 1); S.ents.push(ent(i === 3 && R() < 0.35 ? "stempel" : "berkas", LX[li], z + i * 3.4)); }
    if (R() < 0.35) S.ents.push(ent("buoy", LX[(free + 2) % LANES], z + 10));
    S.nextZ += 28;
  } else { /* hadiah khusus */
    var pk = R(), kk = pk < 0.3 ? "perisai" : pk < 0.6 ? "turbo" : (S.life < 3 ? "heart" : "stempel");
    S.ents.push(ent(kk, LX[free], z)); for (i = 1; i < 4; i++) S.ents.push(ent("berkas", LX[free], z + i * 3));
    S.nextZ += 26;
  }
}
var HEROES = [
  {id: "cak", nama: "Cak Takok", ket: "Seimbang", hull: [0.8, 0.14, 0.12], shirt: [0.9, 0.15, 0.15], hat: [0.2, 0.2, 0.24], canopy: [1, 0.78, 0.2], vmax: 9.5, life: 3, cd: [9, 14, 18], st: [3, 3, 3]},
  {id: "ning", nama: "Ning Suroboyo", ket: "Lincah", hull: [0.38, 0.2, 0.78], shirt: [0.92, 0.35, 0.7], hat: [0.95, 0.8, 0.2], canopy: [0.85, 0.4, 0.9], vmax: 11.5, life: 3, cd: [8, 16, 18], st: [5, 3, 2]},
  {id: "pak", nama: "Pak Bhabin", ket: "Tangguh", hull: [0.12, 0.45, 0.25], shirt: [0.15, 0.35, 0.7], hat: [0.15, 0.3, 0.15], canopy: [0.3, 0.75, 0.45], vmax: 8, life: 4, cd: [11, 12, 14], st: [2, 5, 4]}
];
var ZN = [[0, "Kali Mas"], [400, "Jembatan Merah"], [900, "Pasar Pabean"], [1500, "Taman Prestasi"], [2200, "Tugu Pahlawan"], [3000, "Surabaya Gemilang"]];
function heroOf(id) { for (var i = 0; i < HEROES.length; i++) if (HEROES[i].id === id) return HEROES[i]; return HEROES[0]; }
function getHero() { try { return localStorage.getItem("tk_kl_hero") || "cak"; } catch (e) { return "cak"; } }
function newState(c) {
  return {c: c, run: false, over: false, done: false, dead: false, deadT: 0, t: 0, pz: 0, x: 0, tx: 0, lane: 2, speed: 14, score: 0, dist: 0, bonus: 0, life: 3, combo: 0, maxC: 0, mult: 1, inv: 0, shield: 0, turbo: 0,
    ents: [], parts: [], glows: [], shake: 0, hitK: 0, boostK: 0, flash: 0, cd: 0, last: 0, nextZ: 90, free: 2, got: 0, q: 2, fps: [], hud: {}, wake: 0,
    vx: 0, keys: {}, joy: {on: false, x: 0, y: 0}, mouseX: null, cds: {dash: 0, wave: 0, shield: 0}, hero: HEROES[0], kills: 0, ck: 0, killT: 0, spdMul: 1, zone: 0};
}
function banner(S, id, txt, cls) { var n = S.el && S.el[id]; if (!n) return; n.textContent = txt; n.className = "kl-bn " + (id === "kb" ? "kl-kb " : "") + (cls || ""); void n.offsetWidth; n.classList.add("on"); }
function proj(S, x, y, z) {
  var m = S.VP; if (!m) return null; var cw = m[3] * x + m[7] * y + m[11] * z + m[15]; if (cw <= 0.1) return null;
  return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / cw * 0.5 + 0.5, 1 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / cw * 0.5 + 0.5)];
}
function pop(S, txt, x, y, z, cls) {
  var h = S.el && S.el.pop, p = proj(S, x, y, z); if (!h || !p || p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1) return;
  while (h.children.length > 9) h.removeChild(h.firstChild);
  var n = document.createElement("span"); n.className = "kl-pp " + (cls || ""); n.textContent = txt; n.style.left = (p[0] * 100).toFixed(1) + "%"; n.style.top = (p[1] * 100).toFixed(1) + "%"; h.appendChild(n);
  setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 1000);
}
var KP = {boyo: 60, rival: 40, log: 15, hya: 15, buoy: 15};
function kill(S, e) {
  e.dead = true; var pts = (KP[e.k] || 15);
  S.ck = S.killT > 0 ? S.ck + 1 : 1; S.killT = 3.2; S.kills++; pts *= Math.min(S.ck, 5); S.bonus += pts;
  spray(S, e.k === "boyo" ? 26 : 16, e.x, 0.6, e.z, 8, e.k === "boyo" ? [0.5, 1, 0.5] : [0.8, 0.9, 1], 22, 0.7, 8);
  pop(S, "+" + pts, e.x, 1.4, e.z, e.k === "boyo" ? "k" : "");
  S.shake = RM ? 0 : Math.max(S.shake, 0.45); API.beep(300 + S.ck * 60, 0.1);
  if (S.ck >= 2) banner(S, "kb", ["", "", "DOUBLE KILL!", "TRIPLE KILL!", "MEGA KILL!", "LEGENDARY!"][Math.min(S.ck, 5)], "k" + Math.min(S.ck, 5));
  else if (e.k === "boyo") banner(S, "kb", "Boyo dikalahkan!", "k1");
}
function skill(S, k) {
  if (!S.run || S.over || S.dead || S.cd > 0 || S.cds[k] > 0) return;
  var H = S.hero, i;
  if (k === "dash") { S.cds.dash = H.cd[0]; S.turbo = Math.max(S.turbo, 1.5); spray(S, 18, S.x, 0.6, S.pz - 1.5, 9, [0.5, 0.9, 1], 24, 0.6, 2); API.beep(780, 0.12); banner(S, "z", "NGEBUT!", "sk"); }
  else if (k === "wave") {
    S.cds.wave = H.cd[1]; S.flash = 0.9; S.shake = RM ? 0 : 0.9; API.beep(200, 0.25); banner(S, "z", "OMBAK KALI MAS!", "sk");
    for (i = 0; i < 56; i++) { var a = i / 56 * 6.2832, sp = 16 + (i % 3) * 3; emit(S, {x: S.x, y: 0.4, z: S.pz, vx: Math.cos(a) * sp, vy: 0.6, vz: Math.sin(a) * sp * 1.3, l: 0.75, m: 0.75, s: 30, c: [0.45, 0.85, 1], g: 0}); }
    S.ents.forEach(function (e) { if (e.bad && !e.dead && e.z > S.pz - 3 && e.z < S.pz + 26) kill(S, e); });
  } else if (k === "shield") { S.cds.shield = H.cd[2]; S.shield = Math.max(S.shield, 4.5); spray(S, 22, S.x, 1, S.pz, 6, [0.4, 0.9, 1], 24, 0.7, -2); API.beep(660, 0.14); banner(S, "z", "PERISAI!", "sk"); }
}
function hurt(S, e) {
  S.life--; S.ck = 0; S.killT = 0; S.combo = 0; S.mult = 1; S.inv = 1.6; S.shake = RM ? 0 : 1.4; S.hitK = 1; S.speed = Math.max(12, S.speed * 0.75);
  spray(S, 26, S.x, 0.8, S.pz + 1, 7, [1, 0.55, 0.2], 26, 0.8, 9); API.beep(150, 0.18); try { if (navigator.vibrate) navigator.vibrate(60); } catch (x) {}
  if (S.life <= 0) { S.dead = true; S.deadT = 0; S.run = true; }
}
function collect(S, e) {
  e.dead = true; var k = e.k, x = e.x, z = e.z;
  if (k === "berkas" || k === "stempel") {
    S.combo++; S.maxC = Math.max(S.maxC, S.combo); S.mult = Math.min(4, 1 + Math.floor(S.combo / 6)); var p = (k === "stempel" ? 40 : 10) * S.mult; S.bonus += p; S.got++;
    spray(S, k === "stempel" ? 18 : 9, x, 1, z, 4, k === "stempel" ? [1, 0.85, 0.3] : [1, 1, 0.8], k === "stempel" ? 24 : 16, 0.6, -2); API.beep(k === "stempel" ? 880 : 520 + Math.min(S.combo, 20) * 22, 0.07); S.flash = 0.5;
  } else if (k === "perisai") { S.shield = 8; spray(S, 20, x, 1, z, 5, [0.4, 0.9, 1], 24, 0.7, -2); API.beep(660, 0.12); S.bonus += 20; }
  else if (k === "turbo") { S.turbo = 5; spray(S, 20, x, 1, z, 5, [0.5, 0.9, 1], 24, 0.7, -2); API.beep(740, 0.12); S.bonus += 20; }
  else if (k === "heart") { S.life = Math.min(4, S.life + 1); spray(S, 20, x, 1, z, 5, [1, 0.4, 0.6], 24, 0.7, -2); API.beep(700, 0.14); }
}
function step(S, dt) {
  var i, e;
  S.t += dt;
  S.killT = Math.max(0, S.killT - dt); if (S.run && S.cd <= 0) { S.cds.dash = Math.max(0, S.cds.dash - dt); S.cds.wave = Math.max(0, S.cds.wave - dt); S.cds.shield = Math.max(0, S.cds.shield - dt); }
  S.hitK = Math.max(0, S.hitK - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3); S.flash = Math.max(0, S.flash - dt * 4);
  S.boostK = lerp(S.boostK, S.turbo > 0 ? 1 : 0, Math.min(1, dt * 4));
  if (S.run && S.cd > 0) { S.cd -= dt; if (S.cd <= 0) S.cd = 0; }
  var go = S.run && S.cd <= 0 && !S.over;
  if (go && !S.dead) {
    S.speed = Math.min(36, S.speed + dt * 0.55 + (S.speed < 17 ? dt * 3 : 0));
    S.inv = Math.max(0, S.inv - dt); S.shield = Math.max(0, S.shield - dt); S.turbo = Math.max(0, S.turbo - dt);
  }
  var Ky = S.keys, sm0 = S.joy.on ? 1 - S.joy.y * 0.22 : 1 + ((Ky.u ? 0.2 : 0) - (Ky.d ? 0.28 : 0));
  S.spdMul = lerp(S.spdMul, clamp(sm0, 0.72, 1.22), Math.min(1, dt * 5));
  var v = S.dead ? Math.max(0, 6 - S.deadT * 8) : go ? (S.speed + (S.turbo > 0 ? 11 : 0)) * S.spdMul : 3.2;
  if (S.dead) { S.deadT += dt; if (S.deadT > 1.4 && !S.over) { S.over = true; } }
  S.pz += v * dt;
  var HV = S.hero.vmax, mv = 0;
  if (!S.dead) {
    if (S.joy.on) mv = S.joy.x * HV; else if (Ky.l || Ky.r) mv = ((Ky.r ? 1 : 0) - (Ky.l ? 1 : 0)) * HV; else if (S.mouseX != null) mv = clamp((S.mouseX - S.x) * 7, -HV, HV);
  }
  S.vx += (mv - S.vx) * Math.min(1, dt * (mv === 0 ? 7 : 11));
  S.x = clamp(S.x + S.vx * dt, -5.3, 5.3); if (S.x === 5.3 || S.x === -5.3) S.vx *= 0.4;
  S.tx = S.x;
  if (go && !S.dead && S.zone + 1 < ZN.length && S.dist >= ZN[S.zone + 1][0]) { S.zone++; S.bonus += 100; banner(S, "z", ZN[S.zone][1], "zn"); API.beep(880, 0.15); }
  if (go && !S.dead) { S.dist += v * dt; S.score = Math.floor(S.dist * 0.35 + S.bonus); }
  /* spawn */
  if (go) { while (S.nextZ < S.pz + 150) spawnRow(S); }
  for (i = 0; i < S.ents.length; i++) {
    e = S.ents[i]; e.z += e.vz * dt * (e.k === "boyo" ? 0.5 : 1); e.x += e.vx * dt;
    if (e.k === "boyo" && (e.x < LX[0] - 0.5 || e.x > LX[4] + 0.5)) e.vx = -e.vx;
    if (e.k === "rival" || e.k === "boyo") e.z += 0;
    if (go && !S.dead && !e.dead) {
      var dx = Math.abs(e.x - S.x), dz = Math.abs(e.z - S.pz);
      if (e.bad) {
        if (dx < e.hw + 0.55 && dz < e.hd + 1.4) {
          if (S.turbo > 0 || S.shield > 0) kill(S, e);
          else if (S.inv <= 0) { hurt(S, e); e.dead = true; }
        }
      } else if (dx < e.hw + 0.4 && dz < e.hd + 1.2) collect(S, e);
    }
  }
  S.ents = S.ents.filter(function (q) { return !q.dead && q.z > S.pz - 14; });
  /* partikel */
  for (i = S.parts.length - 1; i >= 0; i--) { var o = S.parts[i]; o.l -= dt; if (o.l <= 0) { S.parts.splice(i, 1); continue; } o.vy -= o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; if (o.y < 0.02 && o.g > 0) { o.y = 0.02; o.vy *= -0.2; } }
  S.wake += dt;
  if (!S.dead && S.wake > (S.turbo > 0 ? 0.015 : 0.04)) { S.wake = 0; var sp = S.turbo > 0 ? 6 : 2.4; spray(S, 1, S.x + (Math.random() - 0.5) * 0.8, 0.05, S.pz - 1.7, sp, [0.85, 0.95, 1], 9, 0.55, 5); spray(S, 1, S.x + (Math.random() < 0.5 ? -0.8 : 0.8), 0.08, S.pz + 0.8, sp * 0.7, [0.9, 1, 1], 8, 0.45, 5); }
  /* kilau pada benda hadiah */
  S.glows.length = 0;
  for (i = 0; i < S.ents.length; i++) { e = S.ents[i]; if (e.bad) continue; if (e.z - S.pz > 150) continue; var gc = e.k === "stempel" ? [1, 0.8, 0.25] : e.k === "perisai" || e.k === "turbo" ? [0.35, 0.8, 1] : e.k === "heart" ? [1, 0.35, 0.6] : [1, 0.95, 0.75]; S.glows.push({x: e.x, y: 1.0, z: e.z, s: e.k === "berkas" ? 70 : 110, c: gc, a: 0.45}); }
  /* lampu perahu */
  S.glows.push({x: S.x, y: 0.6, z: S.pz + 1.8, s: 80, c: [1, 0.8, 0.45], a: 0.35 + clamp(S.K ? S.K.n : 0, 0, 1) * 0.5});
  if (S.turbo > 0) S.glows.push({x: S.x, y: 0.7, z: S.pz - 2, s: 220, c: [0.3, 0.7, 1], a: 0.4});
}

/* ---------- HUD ---------- */
function hud(S) {
  var h = S.hud, el = S.el, H = S.hero;
  function set(k, id, v) { if (h[k] !== v) { h[k] = v; var n = el[id]; if (n) n.textContent = v; } }
  set("s", "sc", String(S.score)); set("c", "cb", S.mult > 1 ? "KOMBO x" + S.mult : (S.combo > 2 ? S.combo + " beruntun" : ""));
  var hs = ""; for (var i = 0; i < Math.max(3, S.life); i++) hs += i < S.life ? "♥" : "♡"; set("l", "lv", hs);
  var pw = (S.shield > 0 ? "Perisai " + Math.ceil(S.shield) + "d" : "") + (S.shield > 0 && S.turbo > 0 ? " · " : "") + (S.turbo > 0 ? "Turbo " + Math.ceil(S.turbo) + "d" : ""); set("p", "pw", pw);
  set("m", "mt", Math.round(S.dist) + " m · " + ZN[S.zone][1]);
  var n = S.cd > 0 ? String(Math.ceil(S.cd / 0.8)) : ""; set("n", "cd", S.run && S.cd > 0 ? (n === "0" ? "" : n) : "");
  ["dash", "wave", "shield"].forEach(function (k, j) {
    var b = el["sk_" + k]; if (!b) return; var c = S.cds[k], p = c > 0 ? c / H.cd[j] : 0, sig = Math.round(p * 60) + ":" + Math.ceil(c);
    if (h["k" + k] !== sig) { h["k" + k] = sig; b.style.setProperty("--p", p.toFixed(3)); b.classList.toggle("rd", c <= 0); var t = b.querySelector("em"); if (t) t.textContent = c > 0 ? String(Math.ceil(c)) : ""; }
  });
  if (el.pg) { var a0 = ZN[S.zone][0], a1 = S.zone + 1 < ZN.length ? ZN[S.zone + 1][0] : a0 + 1000, pr = Math.round(clamp((S.dist - a0) / (a1 - a0), 0, 1) * 100); if (h.pg !== pr) { h.pg = pr; el.pg.style.width = pr + "%"; } }
  if (el.ed) { var ev = Math.max(S.hitK * 0.9, S.life <= 1 && !S.dead ? 0.35 + 0.25 * Math.sin(S.t * 6) : 0); ev = Math.round(ev * 20) / 20; if (h.ed !== ev) { h.ed = ev; el.ed.style.opacity = ev; } }
}

function finish(S) {
  if (S.done) return; S.done = true;
  var sc = S.score, st = sc >= 2600 ? 3 : sc >= 1200 ? 2 : 1, g = API.G(), best = Math.max(g.best.kl || 0, sc), jarak = Math.round(S.dist), baru = sc > (g.best.kl || 0) && sc > 0, rank = sc > 0 ? topAdd(sc, jarak) : 0;
  API.fin("kalimas", {title: baru ? "Rekor baru di Kali Mas!" : st === 3 ? "Juragan Kali Mas!" : st === 2 ? "Dayungmu mantap!" : "Perahu tertahan antrean!", stars: st,
    sub: "Skor <b>" + sc + "</b> &middot; " + jarak + " m &middot; " + S.got + " berkas &middot; " + S.kills + " dikalahkan &middot; kombo terbaik " + S.maxC + ". Rekor Anda: " + best + "." + (rank ? " Peringkat #" + rank + " di perangkat ini." : ""),
    pts: Math.round(sc / 25) + 5, bk: "kl", bv: sc, m: {kalimas: sc}, again: play,
    share: "Saya mencetak " + sc + " poin (" + jarak + " m) di Arus Kalimas 3D, Ruang Main Takok Pelayanan Suroboyo. Berani menandingi?\n" + location.origin});
}

function loseGL(S) { try { var x = S.R && S.R.gl && S.R.gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch (e) {} }
function loop(S, ts, f) {
  if (S !== CUR || !document.body.contains(S.c)) { loseGL(S); return; }
  var dt = S.last ? Math.min(0.05, (ts - S.last) / 1000) : 0.016; S.last = ts; if (document.hidden) dt = 0;
  /* kualitas adaptif */
  if (dt > 0) { S.fps.push(dt); if (S.fps.length >= 60) { var avg = S.fps.reduce(function (a, b) { return a + b; }, 0) / S.fps.length; S.fps = []; if (S.auto) { if (avg > 0.034 && S.q > 0) { S.q--; S.rs = null; } else if (avg < 0.019 && S.q < S.qmax && S.t > 20) { S.q++; S.rs = null; } } S.avg = avg; } }
  var cw = S.c.clientWidth || 360, ch = S.c.clientHeight || 520, dpr = Math.min(2, window.devicePixelRatio || 1), sc = S.q === 2 ? 1 : S.q === 1 ? 0.75 : 0.55;
  var base = Math.max(1.3, dpr) * sc, w = Math.max(160, Math.min(1000, Math.round(cw * base))), h = Math.max(220, Math.round(w * ch / cw));
  try {
    S.R.resize(w, h); S.K = pal(S.t + 2); step(S, dt); render(S); hud(S);
    if (S.over && !S.done) { finish(S); }
  } catch (e) { console.error("Kalimas", e); S.done = true; loseGL(S); API.view(API.bar("Arus Kalimas") + '<div class="empty">Grafis 3D tidak bisa dijalankan di perangkat ini. Coba Suroboyo Rush.</div><div class="btns" style="justify-content:center"><button type="button" class="send" data-g="rush">Main Suroboyo Rush</button></div>'); return; }
  if (S.done) return;
  requestAnimationFrame(function (t2) { f(t2); });
}
function webgl() { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } }

var KEY_ON = false;
function installKeys() {
  if (KEY_ON) return; KEY_ON = true;
  function kk(e, down) {
    var S = CUR; if (!S || !document.body.contains(S.c)) return; var k = e.key, h = true, ae = document.activeElement, btn = ae && ae.tagName === "BUTTON";
    if (k === "ArrowLeft" || k === "a" || k === "A") S.keys.l = down;
    else if (k === "ArrowRight" || k === "d" || k === "D") S.keys.r = down;
    else if (k === "ArrowUp" || k === "w" || k === "W") S.keys.u = down;
    else if (k === "ArrowDown" || k === "s" || k === "S") S.keys.d = down;
    else if (down && (k === " " || k === "j" || k === "J" || k === "1")) { if (S.run) skill(S, "dash"); else if (k === " " && !S.over && !btn) begin(S); else h = false; }
    else if (down && (k === "k" || k === "K" || k === "2")) skill(S, "wave");
    else if (down && (k === "l" || k === "L" || k === "3")) skill(S, "shield");
    else if (down && k === "Enter" && !S.run && !S.over && !btn) begin(S);
    else h = false;
    if (h && S.run) e.preventDefault();
  }
  document.addEventListener("keydown", function (e) { kk(e, true); }); document.addEventListener("keyup", function (e) { kk(e, false); });
}
function begin(S) { if (S.run) return; var o = $("klo"); if (o) o.hidden = true; S.run = true; S.cd = 2.4; S.last = 0; }

function bar5(n) { var s = ""; for (var i = 0; i < 5; i++) s += '<i class="' + (i < n ? "on" : "") + '"></i>'; return s; }
function menu() {
  API.stopAll(); CUR = null; API.title("Arus Kalimas");
  if (!webgl()) { menuGagal(); return; }
  var g = API.G(), best = g.best.kl || 0, q = getQ(), hid = getHero(), leg = [["kl-i b", "Berkas", "+10 poin"], ["kl-i s", "Stempel emas", "+40 poin"], ["kl-i p", "Perisai", "kebal 8 detik"], ["kl-i t", "Turbo", "ngebut dan kebal"], ["kl-i h", "Hati", "+1 nyawa"], ["kl-i x", "Boyo, kayu, enceng gondok, pelampung", "kurangi nyawa, bisa dihancurkan"]];
  API.view(API.bar("Arus Kalimas") +
    '<div class="kl-hero"><small>GRAFIS 3D &middot; KONTROL JOYSTICK</small><b>Arus Kalimas</b><p>Pilih hero, kemudi bebas dengan joystick, lalu keluarkan jurus: Ngebut, Ombak Kali Mas, dan Perisai. Hancurkan Boyo beruntun untuk DOUBLE, TRIPLE, hingga LEGENDARY KILL. Lewati Jembatan Merah, Pasar Pabean, sampai Tugu Pahlawan.</p>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-kl="go">Berlayar sekarang</button></div><p class="sys" style="margin:8px auto 0">' + (best ? "Rekor Anda: <b>" + best + "</b> poin" : "Belum dimainkan") + '</p></div>' +
    '<h2>Pilih hero</h2><div class="kl-hs">' + HEROES.map(function (h) {
      var c = "rgb(" + h.hull.map(function (v) { return Math.round(v * 255); }).join(",") + ")";
      return '<button type="button" class="kl-h' + (h.id === hid ? " on" : "") + '" data-klh="' + h.id + '" aria-pressed="' + (h.id === hid) + '"><span class="kl-hb" style="background:' + c + '"></span><b>' + h.nama + '</b><small>' + h.ket + '</small>' +
        '<div class="kl-st"><span>Lincah</span>' + bar5(h.st[0]) + '</div><div class="kl-st"><span>Tangguh</span>' + bar5(h.st[1]) + '</div><div class="kl-st"><span>Jurus</span>' + bar5(h.st[2]) + '</div></button>';
    }).join("") + '</div>' +
    '<h2>Kontrol</h2><div class="kl-ctl"><div><b>HP / tablet</b><span>Sentuh dan geser di mana saja pada layar: joystick muncul di jari Anda. Geser ke atas untuk ngebut, ke bawah untuk mengerem. Tombol bulat di kanan bawah untuk jurus.</span></div><div><b>Komputer</b><span>Gerakkan kursor, panah atau WASD untuk mengemudi. Jurus: J atau 1 (Ngebut), K atau 2 (Ombak), L atau 3 (Perisai).</span></div></div>' +
    '<h2>Isi sungai</h2><div class="kl-leg">' + leg.map(function (l) { return '<div><span class="' + l[0] + '" aria-hidden="true"></span><b>' + l[1] + '</b><small>' + l[2] + '</small></div>'; }).join("") + '</div>' +
    '<h2>Grafis</h2><div class="hint"><button type="button" class="chip" data-klq="-1" aria-pressed="' + (q < 0) + '">Otomatis</button><button type="button" class="chip" data-klq="2" aria-pressed="' + (q === 2) + '">Tinggi</button><button type="button" class="chip" data-klq="1" aria-pressed="' + (q === 1) + '">Sedang</button><button type="button" class="chip" data-klq="0" aria-pressed="' + (q === 0) + '">Hemat</button></div>' +
    '<p class="sys">Otomatis menyesuaikan kualitas dengan kemampuan perangkat. Pilih Hemat bila terasa patah-patah atau ingin hemat baterai.</p>' +
    (topList().length ? '<h2>Peringkat di perangkat ini</h2><div class="kl-top">' + topList().map(function (z, i) { return '<div><span>' + (i + 1) + '</span><b>' + z.s + ' poin <small>&middot; ' + z.j + ' m</small></b><small>' + tgl(z.d) + '</small></div>'; }).join("") + '</div>' : ""));
}
var IC = {
  dash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h9M9 7l5 5-5 5M14 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 14c3-5 5-5 8 0s5 5 8 0M2 19c3-5 5-5 8 0s5 5 8 0M5 9c2-3 3-3 5 0s3 3 5 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>'
};
function play() {
  API.stopAll(); API.ping("kalimas"); API.title("Arus Kalimas");
  var H = heroOf(getHero());
  API.view(API.bar("Arus Kalimas", H.nama) +
    '<div class="kl-w" id="klw"><canvas id="klc" role="img" aria-label="Area permainan Arus Kalimas 3D"></canvas>' +
    '<div class="kl-hud" aria-live="off"><div class="kl-t"><span class="kl-sc" id="klsc">0</span><span class="kl-lv" id="kllv" aria-label="Nyawa">♥♥♥</span></div><div class="kl-pgw"><i id="klpg"></i></div><div class="kl-m" id="klmt">0 m</div><div class="kl-cb" id="klcb"></div><div class="kl-pw" id="klpw"></div><div class="kl-cd" id="klcd"></div>' +
    '<div class="kl-bn" id="klz"></div><div class="kl-bn kl-kb" id="klkb"></div><div class="kl-pop" id="klpop"></div><div class="kl-edge" id="kled"></div></div>' +
    '<div class="kl-jb" id="kljb" aria-hidden="true"><div class="kl-jk" id="kljk"></div></div>' +
    '<div class="kl-sk"><button type="button" class="kl-s kl-s1 rd" data-sk="dash" aria-label="Jurus Ngebut (J)">' + IC.dash + '<small>Ngebut</small><em></em></button><button type="button" class="kl-s kl-s2 rd" data-sk="wave" aria-label="Jurus Ombak (K)">' + IC.wave + '<small>Ombak</small><em></em></button><button type="button" class="kl-s kl-s3 rd" data-sk="shield" aria-label="Jurus Perisai (L)">' + IC.shield + '<small>Perisai</small><em></em></button></div>' +
    '<div class="tg-ov kl-ov" id="klo"><b>' + H.nama + ' siap berlayar</b><small>Sentuh dan geser untuk mengemudi &middot; tombol kanan untuk jurus</small><button type="button" class="send" data-kl="start">Mulai</button></div></div>');
  var c = $("klc"), S = newState(c), q = getQ(), w = $("klw");
  S.hero = H; S.life = H.life; S.auto = q < 0; S.q = q < 0 ? 2 : q; S.qmax = 2;
  S.el = {sc: $("klsc"), lv: $("kllv"), mt: $("klmt"), cb: $("klcb"), pw: $("klpw"), cd: $("klcd"), z: $("klz"), kb: $("klkb"), pop: $("klpop"), ed: $("kled"), pg: $("klpg"),
    sk_dash: w.querySelector('[data-sk="dash"]'), sk_wave: w.querySelector('[data-sk="wave"]'), sk_shield: w.querySelector('[data-sk="shield"]')};
  try { start(S); } catch (e) { console.error("Kalimas", e); menuGagal(); return; }
  c.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); S.done = true; if (window.toast) window.toast("Grafis terhenti. Buka lagi gimnya."); });
  CUR = S; installKeys();
  /* Joystick melayang untuk sentuhan; kursor mengikuti untuk mouse */
  var jid = null, ox = 0, oy = 0, R = 54, jb = $("kljb"), jk = $("kljk");
  function rect() { return c.getBoundingClientRect(); }
  function cur(e) { var r = rect(); return [e.clientX - r.left, e.clientY - r.top, r]; }
  c.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") { var m = cur(e); S.mouseX = (m[0] / m[2].width - 0.5) * 2 * 5.3; return; }
    if (jid != null) return; jid = e.pointerId; try { c.setPointerCapture(e.pointerId); } catch (z) {}
    var p = cur(e); ox = e.clientX; oy = e.clientY; S.joy.on = true; S.joy.x = 0; S.joy.y = 0;
    jb.style.left = (p[0] - 48) + "px"; jb.style.top = (p[1] - 48) + "px"; jb.style.bottom = "auto"; jb.classList.add("on"); jk.style.transform = "translate(0,0)";
  });
  c.addEventListener("pointermove", function (e) {
    if (e.pointerType === "mouse") { var m = cur(e); S.mouseX = (m[0] / m[2].width - 0.5) * 2 * 5.3; return; }
    if (e.pointerId !== jid) return;
    var dx = (e.clientX - ox) / R, dy = (e.clientY - oy) / R, l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; l = 1; var sh = (l - 1); ox += (e.clientX - ox) * 0.0; }
    jk.style.transform = "translate(" + (dx * R * 0.8).toFixed(1) + "px," + (dy * R * 0.8).toFixed(1) + "px)";
    var dz = 0.1, ax = Math.abs(dx) < dz ? 0 : (Math.abs(dx) - dz) / (1 - dz), ay = Math.abs(dy) < dz ? 0 : (Math.abs(dy) - dz) / (1 - dz);
    S.joy.x = Math.sign(dx) * Math.pow(ax, 1.15); S.joy.y = Math.sign(dy) * Math.pow(ay, 1.15);
  });
  function up(e) { if (e.pointerType === "mouse" || e.pointerId !== jid) return; jid = null; S.joy.on = false; S.joy.x = 0; S.joy.y = 0; jb.classList.remove("on"); jb.style.left = ""; jb.style.top = ""; jb.style.bottom = ""; jk.style.transform = "translate(0,0)"; }
  c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  c.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") S.mouseX = null; });
  [].forEach.call(w.querySelectorAll("[data-sk]"), function (b) {
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); skill(S, b.dataset.sk); });
    b.addEventListener("click", function (e) { if (e.detail === 0) skill(S, b.dataset.sk); });
  });
  S.begin = function () { begin(S); };
  window.__kl = S;
  requestAnimationFrame(function f(ts) { loop(S, ts, f); });
}
function menuGagal() { API.view(API.bar("Arus Kalimas") + '<div class="empty">Grafis 3D tidak bisa dijalankan di perangkat ini. Coba Suroboyo Rush.</div><div class="btns" style="justify-content:center"><button type="button" class="send" data-g="rush">Main Suroboyo Rush</button></div>'); }

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-kl],[data-klh],[data-klq],[data-g=\"kalimas\"]"); if (!b) return;
  if (b.dataset.g === "kalimas") menu();
  else if (b.dataset.kl === "go") play();
  else if (b.dataset.kl === "start" && CUR) CUR.begin();
  else if (b.dataset.klh) { try { localStorage.setItem("tk_kl_hero", b.dataset.klh); } catch (x) {} menu(); }
  else if (b.dataset.klq != null) { try { localStorage.setItem(QK, b.dataset.klq); } catch (x) {} menu(); }
});
window.ArusKalimas = {menu: menu, play: play};
})();
