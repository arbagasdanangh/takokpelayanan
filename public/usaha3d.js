"use strict";
/* Versi 14: Bangun Usaha 3D (permainan di Ruang Main).
   Maket 3D dibuat murni dari CSS 3D (tanpa library, tanpa gambar, tanpa server). Dua mode:
   - Tonton animasi: seorang calon pengusaha memilih KBLI, mendaftar NIB, lalu usahanya berdiri tahap demi tahap.
   - Main: 5 tantangan (KBLI, NIB, perizinan, tempat usaha, minta bantuan); jawaban benar membangun maketnya.
   Kode KBLI di sini hanya CONTOH belajar (urutan KBLI 2020). OSS memakai KBLI 2025, jadi kode selalu harus dicek di OSS
   atau ditanyakan ke admin. Bila admin sudah mengimpor data KBLI, kode contoh dicocokkan dengan data itu. */
(function () {
var API = window.TKGM;
if (!API) return;
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
function $(i) { return document.getElementById(i); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* ---------- Contoh usaha ---------- */
var HAL = "Usaha makanan dan minuman umumnya juga terkait jaminan produk halal dan higiene sanitasi. Tanyakan syaratnya ke loket.";
var BIZ = [
  {k: "56102", n: "Warung Makan", e: "🍜", wall: "#f6c27a", roof: "#b9440f", acc: "#d9341f", pr: "table", tip: HAL},
  {k: "56303", n: "Kafe", e: "☕", wall: "#dcc7a8", roof: "#5b3a29", acc: "#8a5233", pr: "table", tip: HAL},
  {k: "47911", n: "Toko Online", e: "📦", wall: "#cfe3ff", roof: "#1d4ed8", acc: "#2563eb", pr: "boxes", tip: "Toko daring tetap perlu NIB. Periksa juga ketentuan perdagangan elektronik dan kewajiban pajak."},
  {k: "96011", n: "Laundry", e: "🧺", wall: "#c8f0ee", roof: "#0f766e", acc: "#0d9488", pr: "washer", tip: "Usaha laundry perlu memperhatikan pengelolaan air limbah deterjen."},
  {k: "56210", n: "Katering", e: "🍱", wall: "#fde3a7", roof: "#a16207", acc: "#ea580c", pr: "boxes", tip: HAL},
  {k: "14111", n: "Konveksi", e: "👕", wall: "#e4d4f4", roof: "#6d28d9", acc: "#7c3aed", pr: "boxes", tip: "Usaha konveksi umumnya melibatkan tenaga kerja dan mesin. Tanyakan kebutuhan izin dan keselamatan kerjanya."},
  {k: "10710", n: "Roti & Kue", e: "🥐", wall: "#fbd5b5", roof: "#9a3412", acc: "#c2410c", pr: "boxes", tip: HAL},
  {k: "45201", n: "Bengkel Mobil", e: "🔧", wall: "#d1d5db", roof: "#374151", acc: "#dc2626", pr: "car", tip: "Oli bekas termasuk limbah B3. Simpan dan serahkan hanya ke pengelola resmi."},
  {k: "18110", n: "Percetakan", e: "🖨️", wall: "#e5e7eb", roof: "#0e7490", acc: "#0891b2", pr: "paper", tip: "Tinta dan limbah cetak perlu dikelola dengan benar. Tanyakan kebutuhan izinnya."},
  {k: "47711", n: "Toko Pakaian", e: "👗", wall: "#fbcfe8", roof: "#be185d", acc: "#db2777", pr: "boxes", tip: "Toko pakaian umumnya berisiko rendah, tetapi tetap cek kewajiban perizinannya di OSS."}
];
var STEP = ["Pilih KBLI", "Daftar NIB", "Cek perizinan", "Tempat usaha", "Siap buka!"];

/* ---------- Kotak 3D ---------- */
function cube(o) {
  var w = o.w, h = o.h, d = o.d, cy = -(o.y || 0) - h / 2;
  var st = "--x:" + o.x + "px;--y:" + cy + "px;--z:" + o.z + "px;--w:" + w + "px;--h:" + h + "px;--d:" + d + "px;--c:" + o.c + ";" + (o.tc ? "--tc:" + o.tc + ";" : "") + (o.dl ? "animation-delay:" + o.dl + "ms;" : "") + (o.st || "");
  return '<div class="u3c' + (o.an ? " " + o.an : "") + (o.cl ? " " + o.cl : "") + '" style="' + st + '"><i class="f">' + (o.f || "") + '</i><i class="k">' + (o.b || "") + '</i><i class="r">' + (o.r || "") + '</i><i class="l">' + (o.l || "") + '</i><i class="t">' + (o.t || "") + '</i></div>';
}
function person(x0, z0, x1, z1, col, dur, dl, cl) {
  var s = "--x0:" + x0 + "px;--z0:" + z0 + "px;--x1:" + x1 + "px;--z1:" + z1 + "px;--dur:" + dur + "s;--dl:" + dl + "s;";
  return '<div class="u3g ' + cl + '" style="' + s + '"><div class="u3b">' +
    cube({x: 0, y: 0, z: 0, w: 10, h: 13, d: 6, c: "#334155"}) + cube({x: 0, y: 13, z: 0, w: 14, h: 17, d: 8, c: col}) +
    cube({x: 0, y: 30, z: 0, w: 10, h: 10, d: 10, c: "#f3c9a0", tc: "#3b2a20"}) + '</div></div>';
}
function tree(x, z, an, dl) {
  return cube({x: x, y: 0, z: z, w: 8, h: 18, d: 8, c: "#7c4a21", an: an, dl: dl}) +
    cube({x: x, y: 18, z: z, w: 34, h: 26, d: 34, c: "#2f9e44", an: an, dl: dl + 60}) +
    cube({x: x, y: 44, z: z, w: 22, h: 18, d: 22, c: "#40c057", an: an, dl: dl + 120});
}
function car(x, z, col, cl, st) {
  var wh = function (a, b) { return cube({x: a, y: 0, z: b, w: 9, h: 9, d: 5, c: "#111827"}); };
  return '<div class="u3g ' + (cl || "") + '" style="' + (st || "") + '">' + cube({x: 0, y: 4, z: 0, w: 48, h: 10, d: 22, c: col}) + cube({x: -3, y: 14, z: 0, w: 24, h: 9, d: 20, c: "#e0f2fe", tc: col}) +
    wh(-15, 11) + wh(15, 11) + wh(-15, -11) + wh(15, -11) + '</div>';
}
function props(b, A, dl) {
  var h = "", p = function (o, i) { o.an = A; o.dl = dl + i * 70; return cube(o); };
  if (b.pr === "table") {
    [-82, 82].forEach(function (x, k) {
      h += p({x: x, y: 0, z: 46, w: 4, h: 12, d: 4, c: "#78350f"}, k) + p({x: x, y: 12, z: 46, w: 28, h: 3, d: 28, c: "#b45309"}, k) +
        p({x: x - 22, y: 0, z: 46, w: 9, h: 9, d: 9, c: b.acc}, k) + p({x: x + 22, y: 0, z: 46, w: 9, h: 9, d: 9, c: b.acc}, k) +
        p({x: x, y: 14, z: 46, w: 3, h: 34, d: 3, c: "#a8a29e"}, k) + p({x: x, y: 46, z: 46, w: 44, h: 3, d: 44, c: b.acc, tc: "#fff"}, k);
    });
  } else if (b.pr === "boxes") {
    [-82, 82].forEach(function (x, k) {
      h += p({x: x, y: 0, z: 46, w: 24, h: 16, d: 20, c: "#d6a15a"}, k) + p({x: x + 4, y: 16, z: 46, w: 18, h: 13, d: 16, c: b.acc}, k) + p({x: x - 22, y: 0, z: 50, w: 16, h: 11, d: 14, c: "#f8fafc"}, k);
    });
  } else if (b.pr === "washer") {
    [-86, -56, 70, 100].forEach(function (x, k) {
      h += p({x: x, y: 0, z: 40, w: 26, h: 32, d: 22, c: "#e5e7eb", f: '<span class="u3-wd"></span>'}, k);
    });
  } else if (b.pr === "car") {
    h += car(0, 0, "#ef4444", "u3park " + A, "--x:-86px;--y:0px;--z:50px;animation-delay:" + dl + "ms;") +
      p({x: 84, y: 0, z: 46, w: 22, h: 20, d: 14, c: "#dc2626"}, 3) + p({x: 84, y: 20, z: 46, w: 24, h: 3, d: 16, c: "#475569"}, 4);
  } else if (b.pr === "paper") {
    h += p({x: -84, y: 0, z: 46, w: 36, h: 22, d: 24, c: "#94a3b8"}, 0) + p({x: -84, y: 22, z: 46, w: 26, h: 6, d: 18, c: "#fff"}, 1) +
      p({x: 84, y: 0, z: 46, w: 22, h: 8, d: 30, c: "#fff"}, 2) + p({x: 84, y: 8, z: 46, w: 22, h: 8, d: 30, c: "#fde68a"}, 3) + p({x: 84, y: 16, z: 46, w: 22, h: 8, d: 30, c: b.acc}, 4);
  }
  return h;
}

/* Bagian tiap tahap. n=0 dasar, 1 papan KBLI, 2 fondasi (NIB), 3 dinding, 4 atap, 5 grand opening. */
function parts(b, n, an, o) {
  var h = "", A = an ? "u3-in" : "", D = function (i) { return an ? i * 110 : 0; };
  function C(p, i) { p.an = A; p.dl = D(i || 0); return cube(p); }
  var night = o.night;
  if (n === 0) {
    h += cube({x: 0, y: -18, z: 0, w: 420, h: 18, d: 380, c: "#8a5a3b", tc: "#62c370"}) +
      cube({x: 0, y: 0, z: 150, w: 420, h: 2, d: 70, c: "#4b5563"}) +
      cube({x: 0, y: 0, z: 96, w: 420, h: 3, d: 40, c: "#cbd5e1"}) +
      cube({x: 0, y: 0, z: -18, w: 300, h: 3, d: 184, c: "#e7dfcf"});
    for (var i = -3; i <= 3; i++) h += cube({x: i * 62, y: 2, z: 150, w: 30, h: 1, d: 5, c: "#fde68a"});
    h += tree(-176, -130, A, 0) + tree(176, -130, A, 90) + tree(178, 52, A, 180) + tree(-178, 30, A, 270);
    [[-76, 6], [76, 6], [-76, -106], [76, -106]].forEach(function (p, k) { h += C({x: p[0], y: 3, z: p[1], w: 5, h: 22, d: 5, c: k % 2 ? "#ef4444" : "#f8fafc"}, k); });
    if (o.board) h += C({x: -125, y: 0, z: 62, w: 5, h: 34, d: 5, c: "#78716c", cl: "u3-s0b"}, 3) + C({x: -125, y: 34, z: 62, w: 92, h: 26, d: 4, c: "#fef3c7", cl: "u3-s0b", f: '<b class="u3-tx" style="color:#92400e">Lahan kosong</b>', b: '<b class="u3-tx" style="color:#92400e">Lahan kosong</b>'}, 3);
    if (o.hero) h += person(-240, 80, -96, 78, "#facc15", 3, 0, "u3hero");
  } else if (n === 1) {
    var kb = '<span class="u3-kb"><small>KBLI</small><b>' + b.k + '</b></span>';
    h += C({x: -125, y: 0, z: 62, w: 6, h: 62, d: 6, c: "#78716c"}, 0) + C({x: -125, y: 60, z: 62, w: 112, h: 46, d: 5, c: "#1e3a8a", f: kb, b: kb}, 1);
  } else if (n === 2) {
    h += C({x: 0, y: 3, z: -50, w: 166, h: 7, d: 116, c: "#9ca3af"}, 0) +
      C({x: 62, y: 10, z: 12, w: 34, h: 22, d: 3, c: "#fff", f: '<b class="u3-tx" style="color:#1d4ed8;font-size:11px">NIB ✓</b>'}, 2);
  } else if (n === 3) {
    var win = '<span class="u3-wn' + (night ? " on" : "") + '" style="left:12px"></span><span class="u3-wn' + (night ? " on" : "") + '" style="right:12px"></span><span class="u3-dr"></span>';
    var sw = '<span class="u3-wn' + (night ? " on" : "") + '" style="left:calc(50% - 17px)"></span>';
    h += C({x: 0, y: 10, z: -50, w: 150, h: 78, d: 100, c: b.wall, f: win, r: sw, l: sw, st: "--a:" + b.acc + ";"}, 0);
  } else if (n === 4) {
    h += C({x: 0, y: 88, z: -50, w: 166, h: 9, d: 116, c: b.roof}, 0) + C({x: -50, y: 97, z: -70, w: 22, h: 12, d: 16, c: "#94a3b8"}, 2);
  } else if (n === 5) {
    var sg = '<b class="u3-tx">' + b.e + ' ' + esc(b.n) + '</b>';
    h += C({x: -48, y: 97, z: -4, w: 5, h: 22, d: 5, c: "#57534e"}, 0) + C({x: 48, y: 97, z: -4, w: 5, h: 22, d: 5, c: "#57534e"}, 0) +
      C({x: 0, y: 112, z: -4, w: 136, h: 36, d: 5, c: b.acc, f: sg, b: sg}, 1) +
      C({x: 0, y: 68, z: 2, w: 150, h: 14, d: 3, c: "#facc15", f: '<b class="u3-tx" style="color:#713f12;font-size:10px;letter-spacing:.08em">GRAND OPENING</b>'}, 2) +
      '<div class="u3a ' + A + '" style="--w:150px;--x:0px;--y:-48px;--z:16px;--b:' + b.acc + ';animation-delay:' + D(3) + 'ms"></div>' + props(b, A, D(4));
    if (!o.lite) {
      h += C({x: -64, y: 0, z: 16, w: 1.6, h: 34, d: 1.6, c: "#e5e7eb", cl: "u3-fl"}, 5) + C({x: -64, y: 34, z: 16, w: 14, h: 18, d: 14, c: "#ef4444", cl: "u3-fl"}, 5) +
        C({x: 64, y: 0, z: 16, w: 1.6, h: 30, d: 1.6, c: "#e5e7eb", cl: "u3-fl"}, 6) + C({x: 64, y: 30, z: 16, w: 14, h: 18, d: 14, c: "#3b82f6", cl: "u3-fl"}, 6);
      [-138, 138].forEach(function (x, k) {
        h += C({x: x, y: 0, z: 80, w: 4, h: 54, d: 4, c: "#334155"}, 6 + k) + C({x: x, y: 54, z: 80, w: 11, h: 8, d: 11, c: "#fde047", cl: "u3-glow" + (night ? " on" : "")}, 7 + k);
      });
      h += person(-150, 98, 150, 98, "#2563eb", 15, 0, "u3walk") + person(150, 90, -150, 90, "#db2777", 19, -6, "u3walk") + person(-140, 98, 0, 12, "#16a34a", 13, -3, "u3door") +
        car(0, 0, "#f59e0b", "u3drive", "");
    }
  }
  return h;
}

/* ---------- Pemandangan ---------- */
var SC = null, LID = 0;
function skyCls() { var h; try { h = wibDate(0).getHours(); } catch (e) { h = new Date().getHours(); } return h >= 19 || h < 5 ? "u3-night" : (h >= 17 ? "u3-dusk" : ""); }
function stageHtml(sky) {
  return '<div class="u3-st ' + sky + '" id="u3" tabindex="0" role="img" aria-label="Maket 3D tempat usaha. Seret atau tekan panah kiri dan kanan untuk memutar."><i class="u3-sun"></i><i class="u3-cl" style="top:12%;width:76px;animation-delay:-10s"></i><i class="u3-cl" style="top:24%;width:48px;animation-delay:-38s"></i>' +
    '<div class="u3-w" id="u3w"></div><span class="u3-tag" id="u3t">Lahan kosong</span>' +
    '<div class="u3-rot"><button type="button" data-u3="rl" aria-label="Putar ke kiri">&#8634;</button><button type="button" data-u3="rr" aria-label="Putar ke kanan">&#8635;</button><button type="button" data-u3="auto" id="u3a" aria-pressed="' + (!RM) + '" aria-label="Putar otomatis">' + (RM ? "&#9654;" : "&#10074;&#10074;") + '</button></div>' +
    '<p class="u3-say" id="u3say" hidden></p></div>';
}
function apply() { var w = $("u3w"); if (w && SC) w.style.setProperty("--ry", SC.ry.toFixed(1) + "deg"); }
function fit() { var s = $("u3"), w = $("u3w"); if (s && w) w.style.setProperty("--sc", Math.max(0.5, Math.min(1.15, s.clientWidth / 470)).toFixed(3)); }
window.addEventListener("resize", fit);
function loop(id) {
  var last = 0;
  (function f(t) {
    if (!SC || id !== SC.id || !$("u3w")) return;
    if (last && SC.auto && !SC.drag && !RM && Date.now() > SC.hold && !document.hidden) { SC.ry += (t - last) * 0.008; apply(); }
    last = t; requestAnimationFrame(f);
  })(0);
}
function mount(bi, upto, an, hero) {
  var el = $("u3w"); if (!el) return;
  SC = {bi: bi, b: BIZ[bi], n: -1, ry: -32, auto: !RM, drag: false, hold: 0, lx: 0, id: ++LID, night: skyCls() !== ""};
  el.innerHTML = ""; fit();
  var s = $("u3"), i;
  s.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) return; SC.drag = true; SC.lx = e.clientX; try { s.setPointerCapture(e.pointerId); } catch (x) {} });
  s.addEventListener("pointermove", function (e) { if (!SC.drag) return; SC.ry += (e.clientX - SC.lx) * 0.5; SC.lx = e.clientX; SC.hold = Date.now() + 3500; apply(); });
  s.addEventListener("pointerup", function () { SC.drag = false; }); s.addEventListener("pointercancel", function () { SC.drag = false; });
  s.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { rot(-15); e.preventDefault(); } else if (e.key === "ArrowRight") { rot(15); e.preventDefault(); } });
  for (i = 0; i <= upto; i++) add(i, false, {board: upto < 1, hero: hero && i === 0});
  tag(upto); apply(); loop(SC.id);
}
function rot(d) { if (!SC) return; SC.ry += d; SC.hold = Date.now() + 3500; apply(); }
function add(n, an, o) {
  var el = $("u3w"); if (!el || !SC) return; o = o || {}; o.night = SC.night;
  el.insertAdjacentHTML("beforeend", parts(SC.b, n, an && !RM, o)); SC.n = n;
  if (n === 1) { var old = [].slice.call(el.querySelectorAll(".u3-s0b")); old.forEach(function (s) { if (an && !RM) { s.classList.add("u3-out"); setTimeout(function () { s.remove(); }, 800); } else s.remove(); }); }
  tag(n);
}
function tag(n) { var t = $("u3t"); if (t) t.textContent = n < 1 ? "Lahan kosong" : "Tahap " + n + "/5 · " + STEP[n - 1]; }
function say(txt) { var s = $("u3say"); if (!s) return; if (!txt) { s.hidden = true; return; } s.hidden = false; s.textContent = txt; s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); }
function steps(n) { return '<ol class="u3-steps" id="u3s" aria-label="Tahapan">' + STEP.map(function (t, i) { return '<li class="' + (i + 1 < n ? "done" : i + 1 === n ? "on" : "") + '"><b>' + (i + 1) + '</b><span>' + esc(t) + '</span></li>'; }).join("") + '</ol>'; }
function setSteps(n) { var s = $("u3s"); if (s) s.outerHTML = steps(n); }

/* ---------- Catatan KBLI ---------- */
function note(b) {
  try {
    if (window.KBLI && KBLI.has()) {
      var r = KBLI.byKode(b.k);
      return r ? 'Di data KBLI Takok: <b>' + esc(r[0]) + '</b> ' + esc(r[1]) + '. Cocokkan dengan kegiatan Anda.' : 'Kode ' + b.k + ' tidak ada di data KBLI Takok, mungkin berubah di KBLI 2025. Cari kode yang tepat lewat Ctrl+K atau tanya Asisten.';
    }
  } catch (e) {}
  return 'Kode ini contoh belajar (urutan KBLI 2020). OSS memakai KBLI 2025, jadi pastikan kodenya di OSS atau tanya admin.';
}

/* ---------- Menu ---------- */
var PICK = 0;
function menu() {
  API.stopAll(); API.title("Usaha 3D");
  API.view(API.bar("Bangun Usaha 3D") + '<p class="sys" style="margin:0 0 8px">Pilih usaha impian, lihat maketnya tumbuh dalam 3D, lalu uji pengetahuan soal KBLI, NIB, dan perizinan. Seret maket untuk memutarnya.</p>' +
    stageHtml(skyCls()) +
    '<div class="u3-pick" role="group" aria-label="Pilih usaha">' + BIZ.map(function (b, i) { return '<button type="button" class="u3-ch" data-u3="pick" data-i="' + i + '" aria-pressed="' + (i === PICK) + '"><span>' + b.e + '</span><b>' + esc(b.n) + '</b><small>KBLI ' + b.k + '</small></button>'; }).join("") + '</div>' +
    '<div class="u3-inf" id="u3i"></div>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-u3="story">&#9654; Tonton animasi</button><button type="button" class="btn" data-u3="play">&#127918; Main 5 tantangan</button></div>' +
    '<p class="sys">Kode KBLI di sini hanya contoh belajar, bukan nasihat perizinan. Pastikan kode dan syarat terbaru lewat OSS atau loket.</p>');
  mount(PICK, 5, false, false); info();
}
function info() {
  var b = BIZ[PICK], i = $("u3i"); if (!i) return;
  i.innerHTML = '<div class="u3-kbx"><small>KBLI</small><b>' + b.k + '</b></div><div><b>' + b.e + ' ' + esc(b.n) + '</b><p>' + esc(b.tip) + '</p><small class="sys">' + note(b) + '</small></div>';
}
function pick(i) {
  PICK = i; [].forEach.call(document.querySelectorAll(".u3-ch"), function (c) { c.setAttribute("aria-pressed", String(+c.dataset.i === i)); });
  mount(i, 5, true, false); info();
}

/* ---------- Animasi cerita ---------- */
var CAP = function (b) {
  return [
    'Dani ingin membuka <b>' + esc(b.n) + '</b>. Langkah pertama: tentukan kode KBLI, yaitu kode jenis kegiatan usaha. Contoh: <b>KBLI ' + b.k + '</b>.',
    'Daftarkan Nomor Induk Berusaha (NIB) lewat OSS (oss.go.id). Gratis, dan menjadi identitas usaha Dani.',
    'Setelah NIB terbit, cek kewajiban perizinan berusaha sesuai tingkat risiko KBLI-nya. ' + esc(b.tip),
    'Pastikan lokasi sesuai tata ruang (KKPR) dan bangunan memiliki PBG sebelum membuka.',
    esc(b.n) + ' Dani resmi buka! Bingung di tengah jalan? Booking kunjungan ke loket Takok atau tanya Asisten.'
  ];
};
var INTRO = "Halo, Takok! Aku mau buka %n. Kode KBLI-nya berapa ya?";
var SAYS = ["Ketemu! KBLI %k. Sekarang daftar NIB.", "NIB terbit! Cek izin sesuai risiko usaha.", "Izin beres. Dindingnya mulai berdiri!", "Lokasi aman, atap pun terpasang.", "Alhamdulillah, %n sudah buka!"];
var SKIP = null;
function story(bi) {
  API.stopAll(); API.ping("usaha"); PICK = bi; var b = BIZ[bi]; API.title("Usaha 3D");
  API.view(API.bar("Animasi usaha", esc(b.n)) + stageHtml(skyCls()) + steps(0) +
    '<div class="u3-cap" id="u3c" aria-live="polite"></div><div id="u3e"></div>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="btn" data-u3="skip">Lewati ke akhir</button></div>');
  mount(bi, 0, false, true);
  var caps = CAP(b), T = [3200, 7800, 12400, 17000, 21600];
  function cap(i, c) { var el = $("u3c"); if (el) el.innerHTML = '<b>' + (i + 1) + '. ' + STEP[i] + '</b><p>' + c + '</p>'; }
  say(INTRO.replace("%n", b.n)); API.later(function () { say(""); }, 3000);
  [0, 1, 2, 3, 4].forEach(function (i) {
    API.later(function () {
      if (!$("u3w")) return;
      add(i + 1, true); setSteps(i + 1); cap(i, caps[i]); say(SAYS[i].replace("%n", b.n).replace("%k", b.k)); API.beep(520 + i * 90, 0.12);
      if (i === 4) { API.konfeti(70); API.beep(988, 0.3); }
    }, T[i]);
  });
  API.later(function () { storyEnd(bi); }, 25400);
  SKIP = function () { API.stopAll(); var el = $("u3w"); if (!el) return; mount(bi, 5, false, true); setSteps(6); cap(4, caps[4]); say(""); storyEnd(bi); };
}
function storyEnd(bi) {
  var b = BIZ[bi], e = $("u3e"); if (!e) return; say("");
  e.innerHTML = '<div class="u3-end"><b>KBLI ' + b.k + ' &middot; ' + esc(b.n) + '</b><small class="sys">' + note(b) + '</small><div class="btns" style="justify-content:center"><button type="button" class="send" data-u3="play2">Main 5 tantangan</button>' +
    '<button type="button" class="btn" data-u3="ask">Tanya Asisten: KBLI ' + b.k + '</button><button type="button" class="btn" data-u3="book">Booking kunjungan</button><button type="button" class="btn" data-u3="replay">Ulangi animasi</button></div></div>';
}

/* ---------- Mode main ---------- */
function QS(b, S) {
  var others = shuffle(BIZ.filter(function (o) { return o.k !== b.k; })).slice(0, 2);
  return [
    {t: "Anda ingin membuka " + b.e + " " + b.n + ". KBLI mana yang paling cocok?", ok: b.k + " – " + b.n, no: others.map(function (o) { return o.k + " – " + o.n; }),
      hint: "Cocokkan nama usaha dengan kode yang memuat kegiatan yang sama.",
      ex: "Tepat! KBLI (Klasifikasi Baku Lapangan Usaha Indonesia) adalah kode jenis kegiatan usaha dan dicantumkan saat membuat NIB. Catatan: OSS memakai KBLI 2025, jadi cek ulang kodenya di OSS."},
    {t: "Papan KBLI sudah berdiri. Di mana Anda mendaftar NIB?", ok: "Lewat OSS (oss.go.id), gratis", no: ["Lewat calo supaya cepat selesai", "Kirim foto KTP dan selfie ke nomor WhatsApp tak dikenal"],
      hint: "NIB resmi dibuat sendiri, tanpa perantara.",
      ex: "Benar. NIB dibuat lewat OSS tanpa biaya. Waspada calo, dan jangan kirim foto KTP ke orang tak dikenal."},
    {t: "NIB sudah terbit. Apa langkah berikutnya?", ok: "Cek kewajiban perizinan sesuai tingkat risiko KBLI saya", no: ["Langsung buka, NIB pasti cukup untuk semua usaha", "Ganti KBLI sembarang supaya izinnya lebih ringan"],
      hint: "Tidak semua usaha punya tingkat risiko yang sama.",
      ex: "Betul. Pada risiko rendah, NIB umumnya sudah cukup. Pada risiko lebih tinggi biasanya ada sertifikat standar atau izin tambahan. " + b.tip},
    {t: "Dinding sudah berdiri. Soal tempat usaha, apa yang perlu dipastikan?", ok: "Lokasi sesuai tata ruang (KKPR) dan bangunan punya PBG", no: ["Cukup izin lisan dari tetangga", "Tidak perlu, asal lokasinya ramai"],
      hint: "Ada aturan tata ruang dan persetujuan bangunan.",
      ex: "Tepat. Kesesuaian lokasi dengan tata ruang (KKPR) dan Persetujuan Bangunan Gedung (PBG) dicek sebelum membangun atau mengubah tempat usaha."},
    {t: "Atap terpasang, tinggal satu dokumen yang membingungkan. Langkah terbaik?", ok: "Booking ke loket Takok atau tanya Asisten/Admin", no: ["Bayar orang tak dikenal yang menjanjikan \"jalur kilat\"", "Kirim NIK dan kode OTP lewat chat supaya diproses"],
      hint: "Jangan pernah membagikan NIK lengkap atau OTP.",
      ex: "Pilihan terbaik. Booking memberi jadwal pasti di loket. Petugas tidak pernah meminta OTP, dan jalur kilat dari orang tak dikenal berisiko penipuan."}
  ];
}
var S = null;
function play(bi) {
  API.stopAll(); API.ping("usaha"); PICK = bi; var b = BIZ[bi]; API.title("Usaha 3D");
  S = {bi: bi, q: 0, mist: 0, pts: 0, Q: QS(b)};
  API.view(API.bar("Bangun " + esc(b.n), 'KBLI ' + b.k) + stageHtml(skyCls()) + steps(1) + '<div id="u3q"></div>');
  mount(bi, 0, false, true); say("Aku mau buka " + b.n + ". Bantu aku ya!"); API.later(function () { say(""); }, 3200); ask();
}
function ask() {
  var q = S.Q[S.q], el = $("u3q"); if (!el) return;
  S.opts = shuffle([q.ok].concat(q.no)); S.wrong = {};
  el.innerHTML = '<div class="u3-q"><small>Tahap ' + (S.q + 1) + ' dari 5 &middot; ' + STEP[S.q] + '</small><b>' + esc(q.t) + '</b><div class="u3-os" id="u3o">' +
    S.opts.map(function (o, i) { return '<button type="button" class="u3-o" data-u3="ans" data-o="' + i + '">' + esc(o) + '</button>'; }).join("") + '</div><p class="u3-fb" id="u3f" role="status" aria-live="polite"></p></div>';
}
function answer(i) {
  var q = S.Q[S.q], btn = document.querySelector('.u3-o[data-o="' + i + '"]'), f = $("u3f"), b = BIZ[S.bi]; if (!btn || btn.disabled) return;
  if (S.opts[i] !== q.ok) {
    S.mist++; S.wrong[i] = 1; btn.disabled = true; btn.classList.add("bad"); API.beep(150, 0.3, "sawtooth");
    if (f) f.innerHTML = '<b>Belum tepat.</b> ' + esc(q.hint); return;
  }
  var first = !Object.keys(S.wrong).length; S.pts += first ? 10 : 4; API.beep(660, 0.12); setTimeout(function () { API.beep(880, 0.15); }, 120);
  [].forEach.call(document.querySelectorAll(".u3-o"), function (o) { o.disabled = true; }); btn.classList.add("ok");
  var st = $("u3"); if (st && st.scrollIntoView) { try { st.scrollIntoView({block: "nearest", behavior: RM ? "auto" : "smooth"}); } catch (e) {} }
  add(S.q + 1, true); setSteps(S.q + 2);
  var last = S.q === 4;
  if (last) { API.later(function () { API.konfeti(80); API.beep(988, 0.3); say("Grand opening! Terima kasih Takok!"); }, 1000); }
  if (f) f.innerHTML = '<b>' + (first ? "Benar! +10 poin." : "Benar. +4 poin.") + '</b> ' + q.ex;
  var nx = document.createElement("div"); nx.className = "btns"; nx.style.justifyContent = "center";
  nx.innerHTML = last ? '<button type="button" class="send" data-u3="done">Lihat hasil &amp; poin</button><button type="button" class="btn" data-u3="ask">Tanya Asisten: KBLI ' + b.k + '</button>' : '<button type="button" class="send" data-u3="next">Lanjut ke tahap ' + (S.q + 2) + '</button>';
  f.parentNode.appendChild(nx);
}
function done() {
  var b = BIZ[S.bi], st = S.mist === 0 ? 3 : S.mist <= 2 ? 2 : 1, g = API.G();
  g.ub = g.ub || {}; g.ub[b.k] = Math.max(g.ub[b.k] || 0, st);
  API.fin("usaha", {title: "Grand Opening " + b.n + "!", stars: st, pts: S.pts + 20, m: {usaha: 1}, again: function () { play(S.bi); },
    sub: b.e + ' Usaha <b>' + esc(b.n) + '</b> (KBLI ' + b.k + ') sudah berdiri dengan ' + S.mist + ' kali salah jawab.<br><small class="sys">' + note(b) + '</small>',
    share: "Saya baru membangun usaha " + b.n + " (KBLI " + b.k + ") di Bangun Usaha 3D, Ruang Main Takok Pelayanan Suroboyo. " + "★".repeat(st) + "\n" + location.origin});
}

/* ---------- Klik ---------- */
$("gmb").addEventListener("click", function (e) {
  var x = e.target.closest("[data-u3]"); if (!x) return; var a = x.dataset.u3;
  if (a === "pick") pick(+x.dataset.i);
  else if (a === "story") story(PICK);
  else if (a === "play" || a === "play2") play(PICK);
  else if (a === "replay") story(PICK);
  else if (a === "skip") { if (SKIP) SKIP(); }
  else if (a === "ans") answer(+x.dataset.o);
  else if (a === "next") { S.q++; ask(); }
  else if (a === "done") done();
  else if (a === "rl") rot(-30);
  else if (a === "rr") rot(30);
  else if (a === "auto") { if (SC) { SC.auto = !SC.auto; x.setAttribute("aria-pressed", String(SC.auto)); x.innerHTML = SC.auto ? "&#10074;&#10074;" : "&#9654;"; } }
  else if (a === "ask") { var k = BIZ[PICK].k; API.close(); if (window.openAsisten) openAsisten(); if (window.askAsisten) askAsisten("kbli " + k); }
  else if (a === "book") { API.close(); var t8 = document.getElementById("t8"); if (t8) t8.click(); }
});

/* Pratinjau kecil untuk kartu di menu Ruang Main (berputar sendiri lewat CSS). */
function mini() {
  var b = BIZ[API.hash(API.today()) % BIZ.length], h = "", i;
  for (i = 0; i <= 5; i++) h += parts(b, i, false, {lite: true, night: false});
  return '<div class="u3-mini" aria-hidden="true"><div class="u3-mw">' + h + '</div></div>';
}
window.Usaha3D = {menu: menu, mini: mini, count: BIZ.length};
})();
