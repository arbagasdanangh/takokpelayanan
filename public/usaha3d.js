"use strict";
/* Versi 17: Bangun Usaha 3D, lebih detail (permainan di Ruang Main).
   Maket 3D dibuat murni dari CSS 3D (tanpa library, tanpa gambar, tanpa server). Dua mode:
   - Tonton animasi: seorang calon pengusaha memilih KBLI, mendaftar NIB, lalu usahanya berdiri tahap demi tahap (kamera ikut bergerak).
   - Main: 5 tantangan (KBLI, NIB, perizinan, tempat usaha, minta bantuan); soal diacak dari beberapa variasi; jawaban benar membangun maketnya.
   Tambahan v17: tekstur (bata, genteng, kaca, rumput), bayangan, fasad rinci per usaha, properti khas tiap usaha, kota di latar,
   tahap konstruksi (pagar proyek, perancah, pekerja), pembukaan (karangan bunga, balon, lampu hias), kendali kamera
   (miring, zoom, depan/samping/atas), siang/senja/malam manual, "Jelajahi maket" dengan pin, dan pilihan Detail Tinggi/Hemat.
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
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* Detail Tinggi/Hemat (disimpan di perangkat). Perangkat dengan prosesor kecil mulai dari Hemat. */
var DET = (navigator.hardwareConcurrency || 8) <= 4 ? 0 : 1;
try { var sv = localStorage.getItem("tk_u3det"); if (sv === "0" || sv === "1") DET = +sv; } catch (e) {}
var SKYO = null; /* null = ikut jam WIB; "" siang; "u3-dusk"; "u3-night" */

/* ---------- Contoh usaha ---------- */
var HAL = "Usaha makanan dan minuman umumnya juga terkait jaminan produk halal dan higiene sanitasi. Tanyakan syaratnya ke loket.";
var BIZ = [
  {k: "56102", n: "Warung Makan", e: "🍜", cat: "food", wall: "#f6c27a", roof: "#b9440f", acc: "#d9341f", pr: "table", tx: "plank", tip: HAL,
    fx: '<span class="u3-fx u3-cb" style="right:12px;bottom:14px">MENU<br>🍜 🥤</span><span class="u3-fx u3-hg" style="left:50%;margin-left:-46px;top:3px">🏮</span>'},
  {k: "56303", n: "Kafe", e: "☕", cat: "food", wall: "#dcc7a8", roof: "#5b3a29", acc: "#8a5233", pr: "table", tx: "brick", tip: HAL,
    fx: '<span class="u3-fx u3-hg" style="left:6px;top:3px">☕</span><span class="u3-fx u3-cb" style="right:10px;bottom:14px">OPEN<br>07–22</span>'},
  {k: "47911", n: "Toko Online", e: "📦", cat: "online", wall: "#cfe3ff", roof: "#1d4ed8", acc: "#2563eb", pr: "boxes", tx: "", tip: "Toko daring tetap perlu NIB. Periksa juga ketentuan perdagangan elektronik dan kewajiban pajak.",
    fx: '<span class="u3-fx u3-hg" style="right:10px;bottom:16px">📦</span><span class="u3-fx u3-cb" style="left:8px;bottom:12px;background:#1e3a8a;border-color:#93c5fd">KIRIM<br>CEPAT</span>'},
  {k: "96011", n: "Laundry", e: "🧺", cat: "waste", wall: "#c8f0ee", roof: "#0f766e", acc: "#0d9488", pr: "washer", tx: "", tip: "Usaha laundry perlu memperhatikan pengelolaan air limbah deterjen.",
    fx: '<span class="u3-fx u3-port" style="right:10px;top:12px"></span><span class="u3-fx u3-hg" style="left:8px;top:6px">🫧</span>'},
  {k: "56210", n: "Katering", e: "🍱", cat: "food", wall: "#fde3a7", roof: "#a16207", acc: "#ea580c", pr: "boxes", tx: "plank", tip: HAL, veh: "moto",
    fx: '<span class="u3-fx u3-hg" style="right:10px;bottom:16px">🍱</span><span class="u3-fx u3-cb" style="left:8px;bottom:12px">PESAN<br>ANTAR</span>'},
  {k: "14111", n: "Konveksi", e: "👕", cat: "general", wall: "#e4d4f4", roof: "#6d28d9", acc: "#7c3aed", pr: "boxes", tx: "", tip: "Usaha konveksi umumnya melibatkan tenaga kerja dan mesin. Tanyakan kebutuhan izin dan keselamatan kerjanya.",
    fx: '<span class="u3-fx u3-hg" style="right:10px;bottom:16px">🧵</span><span class="u3-fx u3-hg" style="left:8px;top:6px">👕</span>'},
  {k: "10710", n: "Roti & Kue", e: "🥐", cat: "food", wall: "#fbd5b5", roof: "#9a3412", acc: "#c2410c", pr: "boxes", tx: "brick", tip: HAL,
    fx: '<span class="u3-fx u3-hg" style="left:8px;top:6px">🥖</span><span class="u3-fx u3-cb" style="right:10px;bottom:14px">FRESH<br>🥐 🍞</span>'},
  {k: "45201", n: "Bengkel Mobil", e: "🔧", cat: "waste", wall: "#d1d5db", roof: "#374151", acc: "#dc2626", pr: "car", tx: "", garage: true, tip: "Oli bekas termasuk limbah B3. Simpan dan serahkan hanya ke pengelola resmi.",
    fx: '<span class="u3-fx u3-hg" style="left:8px;top:6px">🔧</span><span class="u3-fx u3-hg" style="right:8px;top:6px">🛞</span>'},
  {k: "18110", n: "Percetakan", e: "🖨️", cat: "waste", wall: "#e5e7eb", roof: "#0e7490", acc: "#0891b2", pr: "paper", tx: "", tip: "Tinta dan limbah cetak perlu dikelola dengan benar. Tanyakan kebutuhan izinnya.",
    fx: '<span class="u3-fx u3-ban" style="left:6px;bottom:14px"></span><span class="u3-fx u3-hg" style="right:8px;top:6px">🖨️</span>'},
  {k: "47711", n: "Toko Pakaian", e: "👗", cat: "general", wall: "#fbcfe8", roof: "#be185d", acc: "#db2777", pr: "boxes", tx: "", tip: "Toko pakaian umumnya berisiko rendah, tetapi tetap cek kewajiban perizinannya di OSS.",
    fx: '<span class="u3-fx u3-hg" style="left:8px;top:6px">👗</span><span class="u3-fx u3-cb" style="right:10px;bottom:14px;background:#831843;border-color:#f9a8d4">SALE</span>'}
,
  {k: "56101", n: "Restoran", e: "🍽️", cat: "food", wall: "#f3d9b1", roof: "#7f1d1d", acc: "#b91c1c", pr: "table", tx: "brick", tip: HAL},
  {k: "47111", n: "Minimarket", e: "🛒", cat: "general", wall: "#dbeafe", roof: "#1e40af", acc: "#dc2626", pr: "boxes", tx: "", tip: "Minimarket umumnya menjual makanan kemasan, jadi cek juga ketentuan produk dan perizinan sesuai tingkat risikonya."},
  {k: "96111", n: "Pangkas Rambut", e: "💈", cat: "general", wall: "#fee2e2", roof: "#334155", acc: "#2563eb", pr: "boxes", tx: "", tip: "Jasa perorangan seperti ini umumnya berisiko rendah, tetapi tetap cek kewajibannya di OSS."},
  {k: "96112", n: "Salon Kecantikan", e: "💅", cat: "general", wall: "#fce7f3", roof: "#9d174d", acc: "#db2777", pr: "boxes", tx: "", tip: "Produk kosmetik yang dipakai perlu terdaftar dan higiene alat perlu dijaga. Tanyakan syaratnya ke loket."},
  {k: "62011", n: "Jasa Aplikasi", e: "💻", cat: "online", wall: "#e0e7ff", roof: "#3730a3", acc: "#4f46e5", pr: "paper", tx: "glass", tip: "Usaha jasa digital tetap perlu NIB. Periksa juga kewajiban pajak dan perlindungan data pribadi."},
  {k: "73100", n: "Biro Iklan", e: "📣", cat: "general", wall: "#fef9c3", roof: "#a16207", acc: "#ca8a04", pr: "paper", tx: "", tip: "Cek ketentuan reklame bila memasang media luar ruang. Pemasangan reklame punya aturan perizinan sendiri."},
  {k: "74201", n: "Studio Foto", e: "📷", cat: "general", wall: "#e2e8f0", roof: "#0f172a", acc: "#475569", pr: "boxes", tx: "", tip: "Usaha jasa foto umumnya berisiko rendah. Pastikan lokasi usaha sesuai tata ruang."},
  {k: "31001", n: "Mebel Kayu", e: "🪑", cat: "waste", wall: "#e7d3b3", roof: "#78350f", acc: "#92400e", pr: "boxes", tx: "plank", tip: "Pastikan kayu berasal dari sumber legal dan kelola limbah serbuk kayu. Tanyakan kebutuhan izinnya."}
];
var STEP = ["Pilih KBLI", "Daftar NIB", "Cek perizinan", "Tempat usaha", "Siap buka!"];

/* ---------- Kotak 3D ---------- */
function cube(o) {
  var w = o.w, h = o.h, d = o.d, cy = -(o.y || 0) - h / 2;
  var st = "--x:" + o.x + "px;--y:" + cy + "px;--z:" + o.z + "px;--w:" + w + "px;--h:" + h + "px;--d:" + d + "px;--c:" + o.c + ";" + (o.tc ? "--tc:" + o.tc + ";" : "") + (o.dl ? "animation-delay:" + o.dl + "ms;" : "") + (o.st || "");
  return '<div class="u3c' + (o.an ? " " + o.an : "") + (o.cl ? " " + o.cl : "") + (o.tx ? " tx-" + o.tx : "") + '" style="' + st + '"><i class="f">' + (o.f || "") + '</i><i class="k">' + (o.b || "") + '</i><i class="r">' + (o.r || "") + '</i><i class="l">' + (o.l || "") + '</i><i class="t">' + (o.t || "") + '</i></div>';
}
function person(x0, z0, x1, z1, col, dur, dl, cl, hat) {
  var s = "--x0:" + x0 + "px;--z0:" + z0 + "px;--x1:" + x1 + "px;--z1:" + z1 + "px;--dur:" + dur + "s;--dl:" + dl + "s;";
  return '<div class="u3g ' + cl + '" style="' + s + '"><div class="u3b">' +
    cube({x: 0, y: 0, z: 0, w: 10, h: 13, d: 6, c: "#334155"}) + cube({x: 0, y: 13, z: 0, w: 14, h: 17, d: 8, c: col}) +
    cube({x: -9, y: 15, z: 0, w: 4, h: 13, d: 5, c: col}) + cube({x: 9, y: 15, z: 0, w: 4, h: 13, d: 5, c: col}) +
    cube({x: 0, y: 30, z: 0, w: 10, h: 10, d: 10, c: "#f3c9a0", tc: "#3b2a20"}) +
    (hat ? cube({x: 0, y: 40, z: 0, w: 12, h: 4, d: 12, c: "#facc15"}) : cube({x: 0, y: 39, z: 0, w: 11, h: 3, d: 11, c: "#1f2937"})) + '</div></div>';
}
function tree(x, z, an, dl, big) {
  var k = big ? 1.25 : 1;
  return cube({x: x, y: 0, z: z, w: 8 * k, h: 18 * k, d: 8 * k, c: "#7c4a21", an: an, dl: dl}) +
    cube({x: x, y: 18 * k, z: z, w: 34 * k, h: 26 * k, d: 34 * k, c: "#2f9e44", an: an, dl: dl + 60}) +
    cube({x: x, y: 44 * k, z: z, w: 22 * k, h: 18 * k, d: 22 * k, c: "#40c057", an: an, dl: dl + 120});
}
function car(x, z, col, cl, st) {
  var wh = function (a, b) { return cube({x: a, y: 0, z: b, w: 9, h: 9, d: 5, c: "#111827"}); };
  return '<div class="u3g ' + (cl || "") + '" style="' + (st || "") + '">' + cube({x: 0, y: 4, z: 0, w: 48, h: 10, d: 22, c: col}) + cube({x: -3, y: 14, z: 0, w: 24, h: 9, d: 20, c: "#e0f2fe", tc: col}) +
    cube({x: 24, y: 7, z: 7, w: 2, h: 3, d: 4, c: "#fef08a"}) + cube({x: 24, y: 7, z: -7, w: 2, h: 3, d: 4, c: "#fef08a"}) +
    wh(-15, 11) + wh(15, 11) + wh(-15, -11) + wh(15, -11) + '</div>';
}
function moto(col, cl) {
  var wh = function (x) { return cube({x: x, y: 0, z: 0, w: 9, h: 9, d: 3, c: "#111827"}); };
  return '<div class="u3g ' + cl + '">' + cube({x: 0, y: 7, z: 0, w: 24, h: 6, d: 7, c: col}) + cube({x: -4, y: 13, z: 0, w: 11, h: 3, d: 7, c: "#1f2937"}) + cube({x: 10, y: 13, z: 0, w: 3, h: 9, d: 9, c: "#64748b"}) +
    wh(-9) + wh(10) + cube({x: -3, y: 16, z: 0, w: 8, h: 13, d: 6, c: "#16a34a"}) + cube({x: -3, y: 29, z: 0, w: 8, h: 8, d: 8, c: "#f3c9a0", tc: "#111"}) + cube({x: -3, y: 36, z: 0, w: 9, h: 3, d: 9, c: "#16a34a"}) +
    cube({x: -14, y: 14, z: 0, w: 12, h: 11, d: 12, c: "#16a34a"}) + '</div>';
}

/* Properti khas tiap usaha (halaman depan) */
function props(b, A, dl, hi) {
  var h = "", p = function (o, i) { o.an = A; o.dl = dl + i * 70; return cube(o); };
  if (b.pr === "table") {
    [-82, 82].forEach(function (x, k) {
      h += p({x: x, y: 0, z: 46, w: 4, h: 12, d: 4, c: "#78350f"}, k) + p({x: x, y: 12, z: 46, w: 28, h: 3, d: 28, c: "#b45309"}, k) +
        p({x: x - 22, y: 0, z: 46, w: 9, h: 9, d: 9, c: b.acc}, k) + p({x: x + 22, y: 0, z: 46, w: 9, h: 9, d: 9, c: b.acc}, k) +
        p({x: x, y: 14, z: 46, w: 3, h: 34, d: 3, c: "#a8a29e"}, k) + p({x: x, y: 46, z: 46, w: 44, h: 3, d: 44, c: b.acc, tc: "#fff"}, k);
    });
  } else if (b.pr === "boxes") {
    [-82, 82].forEach(function (x, k) {
      h += p({x: x, y: 0, z: 46, w: 24, h: 16, d: 20, c: "#d6a15a", tx: "plank"}, k) + p({x: x + 4, y: 16, z: 46, w: 18, h: 13, d: 16, c: b.acc}, k) + p({x: x - 22, y: 0, z: 50, w: 16, h: 11, d: 14, c: "#f8fafc"}, k);
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
  if (!hi) return h;
  var X = function (o, i) { return p(o, 5 + (i || 0)); };
  if (b.k === "56102") { /* warung: papan menu, asap dapur */
    h += X({x: -46, y: 0, z: 30, w: 22, h: 30, d: 3, c: "#1f2937", f: '<b class="u3-tx" style="font-size:9px">MENU<br>🍜</b>', b: '<b class="u3-tx" style="font-size:9px">MENU</b>'}) + X({x: 46, y: 0, z: 30, w: 12, h: 16, d: 12, c: "#7c2d12", tx: "plank"}, 1);
  } else if (b.k === "56303") { /* kafe: pot tanaman di kiri-kanan pintu */
    [-34, 34].forEach(function (x, i) { h += X({x: x, y: 0, z: 8, w: 10, h: 9, d: 10, c: "#92400e"}, i) + X({x: x, y: 9, z: 8, w: 13, h: 13, d: 13, c: "#22c55e"}, i) + X({x: x + 3, y: 22, z: 8, w: 4, h: 4, d: 4, c: "#f472b6"}, i); });
  } else if (b.k === "47911") { /* toko online: tumpukan paket */
    h += X({x: -40, y: 0, z: 28, w: 20, h: 12, d: 16, c: "#d6a15a", tx: "plank"}) + X({x: -40, y: 12, z: 28, w: 15, h: 10, d: 12, c: "#e5b873", tx: "plank"}, 1) + X({x: 40, y: 0, z: 28, w: 14, h: 16, d: 14, c: "#d6a15a", tx: "plank"}, 2);
  } else if (b.k === "96011") { /* laundry: jemuran dan gelembung */
    h += X({x: 100, y: 0, z: 22, w: 2, h: 46, d: 2, c: "#9ca3af"}) + X({x: 136, y: 0, z: 22, w: 2, h: 46, d: 2, c: "#9ca3af"}) + X({x: 118, y: 44, z: 22, w: 38, h: 1.4, d: 1.4, c: "#e5e7eb"}, 1);
    ["#f87171", "#60a5fa", "#fde047", "#a78bfa"].forEach(function (c, i) { h += cube({x: 106 + i * 9, y: 30, z: 22, w: 7, h: 14, d: 1.5, c: c, cl: "u3-fl", dl: i * 220}); });
    for (var q = 0; q < 4; q++) h += cube({x: -76 + q * 9, y: 34, z: 40, w: 5, h: 5, d: 5, c: "rgba(255,255,255,.6)", cl: "u3-bub", dl: q * 900});
  } else if (b.k === "56210") { /* katering: kotak bekal dan panci besar */
    ["#ef4444", "#facc15", "#22c55e"].forEach(function (c, i) { h += X({x: -40, y: i * 6, z: 28, w: 16, h: 6, d: 12, c: c}, i); });
    h += X({x: 40, y: 0, z: 28, w: 18, h: 14, d: 18, c: "#9ca3af"}) + X({x: 40, y: 14, z: 28, w: 20, h: 3, d: 20, c: "#6b7280"}, 1);
  } else if (b.k === "14111") { /* konveksi: patung peraga dan gulungan kain */
    [-40, 40].forEach(function (x, i) { h += X({x: x, y: 0, z: 30, w: 14, h: 2, d: 14, c: "#374151"}, i) + X({x: x, y: 2, z: 30, w: 2, h: 18, d: 2, c: "#9ca3af"}, i) + X({x: x, y: 20, z: 30, w: 13, h: 22, d: 8, c: i ? "#f472b6" : "#38bdf8"}, i); });
    ["#ef4444", "#22c55e", "#facc15"].forEach(function (c, i) { h += X({x: 104 + (i % 2) * 8, y: Math.floor(i / 2) * 26, z: 26, w: 9, h: 26, d: 9, c: c}, i); });
  } else if (b.k === "10710") { /* roti: keranjang roti */
    h += X({x: -110, y: 0, z: 24, w: 22, h: 10, d: 14, c: "#a16207", tx: "plank"}) + [0, 1, 2].map(function (i) { return X({x: -118 + i * 8, y: 10, z: 24, w: 6, h: 4, d: 11, c: "#f5d08a"}, i); }).join("") +
      [0, 1, 2].map(function (i) { return X({x: 106 + i * 6, y: 0, z: 24, w: 5, h: 30, d: 5, c: "#e7c27d"}, i); }).join("");
  } else if (b.k === "45201") { /* bengkel: tumpukan ban dan drum oli */
    [110, 124].forEach(function (x, i) { h += X({x: x, y: 0, z: 28, w: 11, h: 5, d: 11, c: "#111827"}, i) + X({x: x, y: 5, z: 28, w: 11, h: 5, d: 11, c: "#1f2937"}, i); });
    h += X({x: 96, y: 0, z: 36, w: 12, h: 16, d: 12, c: "#2563eb"}, 2);
  } else if (b.k === "18110") { /* percetakan: X-banner dan gulungan kertas */
    [-40, 40].forEach(function (x, i) { h += X({x: x, y: 0, z: 30, w: 2, h: 8, d: 8, c: "#6b7280"}, i) + X({x: x, y: 8, z: 30, w: 16, h: 26, d: 1.5, c: i ? "#f59e0b" : b.acc}, i); });
    h += X({x: 112, y: 0, z: 26, w: 9, h: 26, d: 9, c: "#fff"}) + X({x: 124, y: 0, z: 26, w: 9, h: 22, d: 9, c: "#e5e7eb"}, 1);
  } else if (b.k === "47711") { /* toko pakaian: rak baju dan tas belanja */
    h += X({x: -40, y: 0, z: 30, w: 2, h: 34, d: 2, c: "#9ca3af"}) + X({x: -22, y: 0, z: 30, w: 2, h: 34, d: 2, c: "#9ca3af"}, 1) + X({x: -31, y: 33, z: 30, w: 22, h: 1.6, d: 1.6, c: "#6b7280"}, 2);
    ["#f43f5e", "#38bdf8", "#facc15", "#a78bfa"].forEach(function (c, i) { h += cube({x: -38 + i * 5, y: 14, z: 30, w: 4, h: 19, d: 1.5, c: c, an: A, dl: dl + 500 + i * 50}); });
    h += X({x: 40, y: 0, z: 30, w: 7, h: 10, d: 4, c: "#f9a8d4"}, 1) + X({x: 49, y: 0, z: 32, w: 7, h: 12, d: 4, c: "#fff"}, 2);
  }
  return h;
}

/* Fasad depan, kanan, kiri: jendela berkusen, pintu berkaca, lampu dinding, plint, dekor khas usaha */
function facade(b, night) {
  var on = night ? " on" : "", win = '<span class="u3-wn' + on + '" style="left:12px"></span><span class="u3-wn' + on + '" style="right:12px"></span>';
  var door = b.garage ? '<span class="u3-gd"></span>' : '<span class="u3-dr"></span><span class="u3-mat"></span><span class="u3-lp' + on + '"></span><span class="u3-op' + on + '">BUKA</span>';
  if (b.garage) win = '<span class="u3-wn' + on + '" style="left:5px;width:22px"></span><span class="u3-wn' + on + '" style="right:5px;width:22px"></span>';
  var sw = '<span class="u3-wn' + on + '" style="left:calc(50% - 17px)"></span><span class="u3-pl"></span>';
  return {f: win + door + '<span class="u3-pl"></span>' + (b.fx || ""), r: sw, l: sw};
}

/* Bagian tiap tahap. n=0 dasar, 1 papan KBLI, 2 fondasi (NIB), 3 dinding, 4 atap, 5 grand opening.
   o: night, lite (pratinjau kecil), hi (detail tinggi), final (langsung jadi: tanpa perancah), board, hero. */
function parts(b, n, an, o) {
  var h = "", A = an ? "u3-in" : "", D = function (i) { return an ? i * 110 : 0; }, hi = !!o.hi && !o.lite;
  function C(p, i) { p.an = A; p.dl = D(i || 0); return cube(p); }
  var night = o.night, i;
  if (n === 0) {
    h += cube({x: 0, y: -18, z: 0, w: 420, h: 18, d: 380, c: "#8a5a3b", tc: "#62c370", tx: "grass"}) +
      cube({x: 0, y: 0, z: 150, w: 420, h: 2, d: 70, c: "#4b5563", tx: "asp"}) +
      cube({x: 0, y: 0, z: 96, w: 420, h: 3, d: 40, c: "#cbd5e1", tx: "pave"}) +
      cube({x: 0, y: 0, z: -18, w: 300, h: 3, d: 184, c: "#e7dfcf", tx: "pave"});
    for (i = -3; i <= 3; i++) h += cube({x: i * 62, y: 2, z: 150, w: 30, h: 1, d: 5, c: "#fde68a"});
    h += tree(-176, -130, A, 0) + tree(176, -130, A, 90) + tree(178, 52, A, 180) + tree(-178, 30, A, 270);
    [[-76, 6], [76, 6], [-76, -106], [76, -106]].forEach(function (p, k) { h += C({x: p[0], y: 3, z: p[1], w: 5, h: 22, d: 5, c: k % 2 ? "#ef4444" : "#f8fafc"}, k); });
    if (hi) {
      /* kota di latar, pagar tanaman, zebra cross, semak */
      [[-190, 34, 96, 0], [-150, 44, 128, 1], [-104, 36, 84, 2], [-62, 40, 112, 3], [62, 38, 100, 4], [104, 46, 140, 1], [150, 36, 90, 0], [190, 32, 118, 2]].forEach(function (p) {
        h += cube({x: p[0], y: 0, z: -172, w: p[1], h: p[2], d: 30, c: ["#c7d2e0", "#b9c6d8", "#d3dbe6", "#aab8cc", "#c0cad8"][p[3]], tx: "glass"});
      });
      h += cube({x: -203, y: 0, z: -10, w: 10, h: 12, d: 290, c: "#2f9e44", tc: "#40c057"}) + cube({x: 203, y: 0, z: -10, w: 10, h: 12, d: 290, c: "#2f9e44", tc: "#40c057"});
      for (i = 0; i < 6; i++) h += cube({x: 100 + i * 12, y: 2, z: 150, w: 7, h: 1, d: 56, c: "#f8fafc", tx: "zebra"});
      h += cube({x: -150, y: 0, z: -118, w: 20, h: 12, d: 18, c: "#38a169"}) + cube({x: 150, y: 0, z: -118, w: 20, h: 12, d: 18, c: "#38a169"}) + tree(-120, -150, A, 40, true) + tree(120, -150, A, 140, true);
      h += cube({x: 0, y: 0, z: -49, w: 175, h: 1, d: 125, c: "rgba(0,0,0,.2)"});
    }
    if (o.board) h += C({x: -125, y: 0, z: 62, w: 5, h: 34, d: 5, c: "#78716c", cl: "u3-s0b"}, 3) + C({x: -125, y: 34, z: 62, w: 92, h: 26, d: 4, c: "#fef3c7", cl: "u3-s0b", f: '<b class="u3-tx" style="color:#92400e">Lahan kosong</b>', b: '<b class="u3-tx" style="color:#92400e">Lahan kosong</b>'}, 3);
    if (o.hero) h += person(-240, 80, -96, 78, "#facc15", 3, 0, "u3hero");
  } else if (n === 1) {
    var kb = '<span class="u3-kb"><small>KBLI</small><b>' + b.k + '</b></span>';
    h += C({x: -125, y: 0, z: 62, w: 6, h: 62, d: 6, c: "#78716c"}, 0) + C({x: -125, y: 60, z: 62, w: 112, h: 46, d: 5, c: "#1e3a8a", f: kb, b: kb}, 1) + C({x: -125, y: 106, z: 62, w: 118, h: 4, d: 7, c: "#fde047"}, 1);
  } else if (n === 2) {
    h += C({x: 0, y: 3, z: -50, w: 166, h: 7, d: 116, c: "#9ca3af", tx: "pave"}, 0) +
      C({x: 62, y: 10, z: 12, w: 34, h: 22, d: 3, c: "#fff", f: '<b class="u3-tx" style="color:#1d4ed8;font-size:11px">NIB ✓</b>'}, 2);
    if (hi && !o.final) {
      /* proyek: pagar, tumpukan bata dan pasir, molen, pekerja */
      for (i = 0; i < 6; i++) h += C({x: -65 + i * 26, y: 0, z: 36, w: 24, h: 18, d: 2, c: i % 2 ? "#f97316" : "#fff", cl: "u3-bld"}, i);
      h += C({x: 0, y: 18, z: 36, w: 70, h: 14, d: 2, c: "#facc15", cl: "u3-bld", f: '<b class="u3-tx" style="color:#1f2937;font-size:8px">DALAM PEMBANGUNAN</b>'}, 6) +
        C({x: -118, y: 0, z: -10, w: 20, h: 8, d: 14, c: "#b45309", tx: "brick", cl: "u3-bld"}, 3) + C({x: -118, y: 8, z: -10, w: 14, h: 7, d: 10, c: "#c2410c", tx: "brick", cl: "u3-bld"}, 3) +
        C({x: 118, y: 0, z: -20, w: 22, h: 10, d: 18, c: "#e9d5a1", cl: "u3-bld"}, 4) + C({x: 118, y: 0, z: 14, w: 14, h: 14, d: 14, c: "#f97316", cl: "u3-bld"}, 5) + C({x: 118, y: 14, z: 14, w: 10, h: 5, d: 10, c: "#9ca3af", cl: "u3-bld"}, 5) +
        '<div class="u3-bld">' + person(-100, 22, 100, 22, "#f97316", 11, 0, "u3walk", true) + '</div>';
    }
  } else if (n === 3) {
    var fc = facade(b, night);
    h += C({x: 0, y: 10, z: -50, w: 150, h: 78, d: 100, c: b.wall, f: fc.f, r: fc.r, l: fc.l, st: "--a:" + b.acc + ";", tx: b.tx || ""}, 0);
    if (hi && !o.final) { /* perancah */
      [-76, -38, 0, 38, 76].forEach(function (x, k) { h += C({x: x, y: 10, z: 8, w: 2.4, h: 84, d: 2.4, c: "#9ca3af", cl: "u3-bld"}, k); });
      h += C({x: 0, y: 44, z: 8, w: 160, h: 2, d: 12, c: "#b08d57", cl: "u3-bld"}, 5) + C({x: 0, y: 84, z: 8, w: 160, h: 2, d: 12, c: "#b08d57", cl: "u3-bld"}, 6) + C({x: 0, y: 60, z: 8, w: 160, h: 1.6, d: 1.6, c: "#9ca3af", cl: "u3-bld"}, 6);
    }
  } else if (n === 4) {
    h += C({x: 0, y: 88, z: -50, w: 166, h: 9, d: 116, c: b.roof, tx: b.cat === "waste" ? "seng" : "tile"}, 0) + C({x: 0, y: 97, z: -50, w: 170, h: 2, d: 120, c: "rgba(255,255,255,.35)"}, 1) + C({x: -50, y: 97, z: -70, w: 22, h: 12, d: 16, c: "#94a3b8", f: '<span class="u3-wd" style="width:10px;height:10px;border-width:2px"></span>'}, 2);
    if (hi) {
      h += C({x: 44, y: 99, z: -78, w: 22, h: 20, d: 22, c: "#2563eb"}, 3) + C({x: 44, y: 119, z: -78, w: 24, h: 3, d: 24, c: "#1e40af"}, 3) + C({x: 62, y: 99, z: -30, w: 3, h: 26, d: 3, c: "#9ca3af"}, 4) + C({x: 62, y: 120, z: -30, w: 18, h: 2, d: 2, c: "#9ca3af"}, 4);
      if (b.cat === "food") for (i = 0; i < 3; i++) h += cube({x: -50, y: 110 + i * 4, z: -70, w: 7, h: 7, d: 7, c: "rgba(255,255,255,.75)", cl: "u3-sm", dl: i * 1000});
    }
  } else if (n === 5) {
    var sg = '<b class="u3-tx">' + b.e + ' ' + esc(b.n) + '</b>';
    h += C({x: -48, y: 97, z: -4, w: 5, h: 22, d: 5, c: "#57534e"}, 0) + C({x: 48, y: 97, z: -4, w: 5, h: 22, d: 5, c: "#57534e"}, 0) +
      C({x: 0, y: 112, z: -4, w: 136, h: 36, d: 5, c: b.acc, f: sg, b: sg}, 1) +
      C({x: 0, y: 68, z: 2, w: 150, h: 14, d: 3, c: "#facc15", f: '<b class="u3-tx" style="color:#713f12;font-size:10px;letter-spacing:.08em">GRAND OPENING</b>'}, 2) +
      '<div class="u3a ' + A + '" style="--w:150px;--x:0px;--y:-48px;--z:16px;--b:' + b.acc + ';animation-delay:' + D(3) + 'ms"></div>' + props(b, A, D(4), hi);
    if (!o.lite) {
      h += C({x: -64, y: 0, z: 16, w: 1.6, h: 34, d: 1.6, c: "#e5e7eb", cl: "u3-fl"}, 5) + C({x: -64, y: 34, z: 16, w: 14, h: 18, d: 14, c: "#ef4444", cl: "u3-fl"}, 5) +
        C({x: 64, y: 0, z: 16, w: 1.6, h: 30, d: 1.6, c: "#e5e7eb", cl: "u3-fl"}, 6) + C({x: 64, y: 30, z: 16, w: 14, h: 18, d: 14, c: "#3b82f6", cl: "u3-fl"}, 6);
      [-138, 138].forEach(function (x, k) {
        h += C({x: x, y: 0, z: 80, w: 4, h: 54, d: 4, c: "#334155"}, 6 + k) + C({x: x, y: 54, z: 80, w: 11, h: 8, d: 11, c: "#fde047", cl: "u3-glow" + (night ? " on" : "")}, 7 + k);
      });
      h += person(-150, 98, 150, 98, "#2563eb", 15, 0, "u3walk") + person(150, 90, -150, 90, "#db2777", 19, -6, "u3walk") + person(-140, 98, 0, 12, "#16a34a", 13, -3, "u3door") +
        car(0, 0, "#f59e0b", "u3drive", "");
      if (hi) {
        /* karangan bunga, balon, lampu hias, pos Takok, antrean pelanggan, kendaraan lain */
        [-104, 104].forEach(function (x, k) {
          var fb = '<span class="u3-kbk"><span>🌸</span><b>SELAMAT<br>&amp; SUKSES</b><span>🌷</span></span>';
          h += C({x: x - 14, y: 0, z: 34, w: 2, h: 22, d: 2, c: "#78716c"}, 8) + C({x: x + 14, y: 0, z: 34, w: 2, h: 22, d: 2, c: "#78716c"}, 8) + C({x: x, y: 20, z: 34, w: 46, h: 44, d: 3, c: k ? "#fbcfe8" : "#bbf7d0", f: fb, b: fb}, 9);
        });
        ["#ef4444", "#facc15", "#3b82f6", "#22c55e", "#ec4899"].forEach(function (c, k) { h += C({x: -118 + k * 12 + (k > 2 ? 190 : 0), y: 74 + (k % 2) * 8, z: 24, w: 10, h: 12, d: 10, c: c, cl: "u3-bal"}, 10 + k); });
        for (i = 0; i < 9; i++) h += C({x: -68 + i * 17, y: 78, z: 17, w: 3, h: 3, d: 3, c: ["#fde047", "#f87171", "#60a5fa", "#4ade80"][i % 4], cl: "u3-glow" + (night ? " on" : "")}, 11);
        h += C({x: 150, y: 0, z: 40, w: 34, h: 30, d: 28, c: "#1d4ed8", f: '<b class="u3-tx" style="font-size:9px">TAKOK<br>Tanya &amp; Booking</b>'}, 12) + C({x: 150, y: 30, z: 40, w: 40, h: 4, d: 34, c: "#f8fafc"}, 12);
        h += person(0, 16, 0, 16, "#0ea5e9", 1, 0, "u3stand") + person(-12, 30, -12, 30, "#f43f5e", 1, 0, "u3stand") + person(10, 44, 10, 44, "#84cc16", 1, 0, "u3stand");
        h += car(0, 0, "#6366f1", "u3drive2", "") + moto(b.veh === "moto" ? "#f97316" : "#0ea5e9", "u3moto");
        h += C({x: -150, y: 0, z: 80, w: 14, h: 18, d: 14, c: "#15803d"}, 13) + C({x: -150, y: 18, z: 80, w: 16, h: 3, d: 16, c: "#166534"}, 13) + C({x: -176, y: 0, z: 84, w: 40, h: 5, d: 12, c: "#a16207", tx: "plank"}, 13) + C({x: -176, y: 5, z: 90, w: 40, h: 11, d: 3, c: "#a16207", tx: "plank"}, 13);
      }
    }
  }
  return h;
}

/* ---------- Pemandangan ---------- */
var SC = null, LID = 0, HOTI = -1, VIEWS = {
  front: {ry: 0, rx: -20, zm: 1.15}, side: {ry: -90, rx: -22, zm: 1.1}, top: {ry: -20, rx: -84, zm: 1.05}, free: {ry: -32, rx: -52, zm: 1}
};
function skyCls() {
  if (SKYO !== null) return SKYO;
  var h; try { h = wibDate(0).getHours(); } catch (e) { h = new Date().getHours(); }
  return h >= 19 || h < 5 ? "u3-night" : (h >= 17 ? "u3-dusk" : "");
}
function skyName() { var s = skyCls(); return (SKYO === null ? "Otomatis: " : "") + (s === "u3-night" ? "Malam" : s === "u3-dusk" ? "Senja" : "Siang"); }
function stageHtml(sky) {
  return '<div class="u3-st ' + sky + '" id="u3" tabindex="0" role="img" aria-label="Maket 3D tempat usaha. Seret atau tekan panah kiri dan kanan untuk memutar, panah atas dan bawah untuk memiringkan, tanda plus dan minus untuk zoom."><i class="u3-sun"></i><i class="u3-cl" style="top:12%;width:76px;animation-delay:-10s"></i><i class="u3-cl" style="top:24%;width:48px;animation-delay:-38s"></i><i class="u3-bd">🐦</i>' +
    '<div class="u3-w" id="u3w"></div><span class="u3-tag" id="u3t">Lahan kosong</span>' +
    '<div class="u3-rot"><button type="button" data-u3="rl" aria-label="Putar ke kiri">&#8634;</button><button type="button" data-u3="rr" aria-label="Putar ke kanan">&#8635;</button><button type="button" data-u3="auto" id="u3a" aria-pressed="' + (!RM) + '" aria-label="Putar otomatis">' + (RM ? "&#9654;" : "&#10074;&#10074;") + '</button></div>' +
    '<p class="u3-say" id="u3say" hidden></p></div>' + toolbar();
}
function toolbar() {
  return '<div class="u3-tb" role="toolbar" aria-label="Kendali kamera dan tampilan">' +
    '<button type="button" data-u3="view" data-v="front">Depan</button><button type="button" data-u3="view" data-v="side">Samping</button><button type="button" data-u3="view" data-v="top">Atas</button><button type="button" data-u3="view" data-v="free">Bebas</button><i></i>' +
    '<button type="button" data-u3="tu" aria-label="Miringkan kamera ke atas">&#9650;</button><button type="button" data-u3="td" aria-label="Miringkan kamera ke bawah">&#9660;</button><button type="button" data-u3="zo" aria-label="Perkecil">&#8722;</button><button type="button" data-u3="zi" aria-label="Perbesar">&#43;</button><i></i>' +
    '<button type="button" data-u3="sky" id="u3sky" title="Ganti waktu">' + skyEmoji() + ' ' + skyName() + '</button>' +
    '<button type="button" data-u3="det" id="u3det" aria-pressed="' + (!!DET) + '" title="Detail Tinggi menampilkan lebih banyak benda, Hemat lebih ringan untuk HP">Detail: ' + (DET ? "Tinggi" : "Hemat") + '</button></div>';
}
function skyEmoji() { var s = skyCls(); return s === "u3-night" ? "🌙" : s === "u3-dusk" ? "🌇" : "☀️"; }
function apply() {
  var w = $("u3w"); if (!w || !SC) return;
  w.style.setProperty("--ry", SC.ry.toFixed(1) + "deg"); w.style.setProperty("--rx", SC.rx.toFixed(1) + "deg"); w.style.setProperty("--zm", SC.zm.toFixed(3));
}
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
function mount(bi, upto, an, hero, keep) {
  var el = $("u3w"); if (!el) return;
  var sky = skyCls(), st = $("u3"); if (st) st.className = "u3-st " + sky;
  SC = {bi: bi, b: BIZ[bi], n: -1, ry: keep ? keep.ry : -32, rx: keep ? keep.rx : -52, zm: keep ? keep.zm : 1, auto: keep ? keep.auto : !RM, drag: false, hold: 0, lx: 0, ly: 0, id: ++LID, night: sky === "u3-night", upto: upto, final: upto >= 5};
  el.innerHTML = ""; fit(); HOTI = -1;
  var s = $("u3"), i;
  if (!s._u3) {
    s._u3 = 1;
    s.addEventListener("pointerdown", function (e) { if (!SC || e.target.closest("button")) return; SC.drag = true; SC.lx = e.clientX; SC.ly = e.clientY; try { s.setPointerCapture(e.pointerId); } catch (x) {} });
    s.addEventListener("pointermove", function (e) {
      if (!SC || !SC.drag) return; SC.ry += (e.clientX - SC.lx) * 0.5; SC.lx = e.clientX;
      if (e.pointerType === "mouse") { SC.rx = clamp(SC.rx + (e.clientY - SC.ly) * 0.3, -86, -8); SC.ly = e.clientY; }
      SC.hold = Date.now() + 3500; apply();
    });
    s.addEventListener("pointerup", function () { if (SC) SC.drag = false; }); s.addEventListener("pointercancel", function () { if (SC) SC.drag = false; });
    s.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowLeft") rot(-15); else if (k === "ArrowRight") rot(15); else if (k === "ArrowUp") tilt(6); else if (k === "ArrowDown") tilt(-6); else if (k === "+" || k === "=") zoom(0.1); else if (k === "-") zoom(-0.1); else return;
      e.preventDefault();
    });
    s.addEventListener("wheel", function (e) { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoom(e.deltaY < 0 ? 0.1 : -0.1); }, {passive: false});
  }
  for (i = 0; i <= upto; i++) add(i, false, {board: upto < 1, hero: hero && i === 0, final: upto >= 5});
  tag(upto); apply(); loop(SC.id);
}
function remount() { if (!SC) return; var c = {ry: SC.ry, rx: SC.rx, zm: SC.zm, auto: SC.auto}; mount(SC.bi, Math.max(SC.upto, SC.n), false, false, c); }
function rot(d) { if (!SC) return; SC.ry += d; SC.hold = Date.now() + 3500; apply(); }
function tilt(d) { if (!SC) return; SC.rx = clamp(SC.rx + d, -86, -8); SC.hold = Date.now() + 3500; apply(); }
function zoom(d) { if (!SC) return; SC.zm = clamp(SC.zm + d, 0.7, 2.2); apply(); }
function camTo(t, ms) {
  if (!SC) return; var id = SC.id, f = {ry: SC.ry, rx: SC.rx, zm: SC.zm}, t0 = performance.now(); ms = RM ? 0 : (ms == null ? 800 : ms);
  SC.hold = Date.now() + ms + 3000;
  var dr = t.ry == null ? 0 : ((t.ry - f.ry + 540) % 360) - 180;
  function set(p) { if (t.ry != null) SC.ry = f.ry + dr * p; if (t.rx != null) SC.rx = f.rx + (t.rx - f.rx) * p; if (t.zm != null) SC.zm = f.zm + (t.zm - f.zm) * p; apply(); }
  if (!ms) { set(1); return; }
  (function step(now) { if (!SC || SC.id !== id) return; var p = Math.min(1, (now - t0) / ms), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; set(e); if (p < 1) requestAnimationFrame(step); })(t0);
}
function add(n, an, o) {
  var el = $("u3w"); if (!el || !SC) return; o = o || {}; o.night = SC.night; o.hi = !!DET;
  el.insertAdjacentHTML("beforeend", parts(SC.b, n, an && !RM, o)); SC.n = n;
  var gone = n === 1 ? ".u3-s0b" : n === 5 ? ".u3-bld" : "";
  if (gone) [].slice.call(el.querySelectorAll(gone)).forEach(function (s) { if (an && !RM) { s.classList.add("u3-out"); setTimeout(function () { s.remove(); }, 800); } else s.remove(); });
  tag(n);
}
function tag(n) { var t = $("u3t"); if (t) t.textContent = n < 1 ? "Lahan kosong" : "Tahap " + n + "/5 · " + STEP[n - 1]; }
function say(txt) { var s = $("u3say"); if (!s) return; if (!txt) { s.hidden = true; return; } s.hidden = false; s.textContent = txt; s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); }
function steps(n) { return '<ol class="u3-steps" id="u3s" aria-label="Tahapan">' + STEP.map(function (t, i) { return '<li class="' + (i + 1 < n ? "done" : i + 1 === n ? "on" : "") + '"><b>' + (i + 1) + '</b><span>' + esc(t) + '</span></li>'; }).join("") + '</ol>'; }
function setSteps(n) { var s = $("u3s"); if (s) s.outerHTML = steps(n); }
function pin(p) {
  var w = $("u3w"); if (!w) return;
  [].forEach.call(w.querySelectorAll(".u3-pinw"), function (x) { x.remove(); });
  if (p) w.insertAdjacentHTML("beforeend", '<div class="u3-pinw">' + cube({x: p[0], y: p[1], z: p[2], w: 11, h: 11, d: 11, c: "#facc15", tc: "#fff7c2", cl: "u3-pin"}) + cube({x: p[0], y: p[1] - 9, z: p[2], w: 4, h: 9, d: 4, c: "#f59e0b", cl: "u3-pin"}) + '</div>');
}

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

/* ---------- Jelajahi maket (pin + penjelasan) ---------- */
var HOT = [
  {n: "Papan KBLI", e: "🪧", pin: [-125, 126, 62], v: {ry: -14, rx: -34, zm: 1.5}, t: function (b) { return "Papan KBLI " + b.k + ": kode jenis kegiatan usaha. Dipilih saat membuat NIB di OSS, dan menentukan tingkat risiko serta perizinan yang perlu dipenuhi."; }},
  {n: "Stiker NIB", e: "🆔", pin: [62, 46, 12], v: {ry: -10, rx: -36, zm: 1.5}, t: function () { return "NIB (Nomor Induk Berusaha) adalah identitas pelaku usaha. Dibuat sendiri lewat OSS (oss.go.id) tanpa biaya. Waspadai calo dan jangan kirim foto KTP ke orang tak dikenal."; }},
  {n: "Bangunan", e: "🏠", pin: [0, 132, -50], v: {ry: -28, rx: -30, zm: 1.25}, t: function () { return "Lokasi usaha perlu sesuai tata ruang (KKPR) dan bangunannya memiliki Persetujuan Bangunan Gedung (PBG) sebelum dipakai berusaha."; }},
  {n: "Papan nama", e: "✨", pin: [0, 160, -4], v: {ry: 0, rx: -26, zm: 1.4}, t: function (b) { return "Papan nama menandai usaha siap buka. " + b.tip; }},
  {n: "Pos Takok", e: "💬", pin: [150, 46, 40], v: {ry: -52, rx: -32, zm: 1.4}, t: function () { return "Bingung di tengah jalan? Booking kunjungan ke loket Takok, atau tanya Asisten untuk cek kesiapan berkas dan menyusun rencana kunjungan."; }, act: true}
];
function hotHtml() {
  return '<div class="u3-hs"><small>Jelajahi maket: ketuk bagian yang ingin dipelajari</small><div class="u3-hc" role="group" aria-label="Bagian maket">' + HOT.map(function (h, i) { return '<button type="button" data-u3="hot" data-h="' + i + '" aria-pressed="false">' + h.e + ' ' + esc(h.n) + '</button>'; }).join("") + '</div><div class="u3-hx" id="u3h" aria-live="polite"></div></div>';
}
function hot(i) {
  var h = HOT[i], b = BIZ[PICK], box = $("u3h"); if (!h || !box) return;
  var same = HOTI === i; HOTI = same ? -1 : i;
  [].forEach.call(document.querySelectorAll("[data-u3=hot]"), function (x) { x.setAttribute("aria-pressed", String(!same && +x.dataset.h === i)); });
  if (same) { pin(null); box.innerHTML = ""; camTo(VIEWS.free, 700); return; }
  pin(h.pin); camTo(h.v, 900);
  box.innerHTML = '<b>' + h.e + ' ' + esc(h.n) + '</b>' + esc(h.t(b)) + (h.act ? '<div class="btns" style="justify-content:flex-start"><button type="button" class="send" data-u3="ask">Tanya Asisten</button><button type="button" class="btn" data-u3="ready">Cek kesiapan berkas</button><button type="button" class="btn" data-u3="book">Booking</button></div>' : "");
}


/* Usaha dari KBLI mana pun (hasil pencarian atau ketikan sendiri): tampilan dipilih dari golongan pokok (2 digit awal). */
var DIV = {
  food: ["10", "11", "56", "55"], waste: ["13", "16", "17", "18", "19", "20", "22", "23", "24", "25", "27", "28", "29", "30", "33", "37", "38", "45", "49", "52"],
  online: ["58", "59", "60", "61", "62", "63", "47912", "73", "74", "82"], general: []
};
var PAL = [["#f6c27a", "#b9440f", "#d9341f"], ["#cfe3ff", "#1d4ed8", "#2563eb"], ["#c8f0ee", "#0f766e", "#0d9488"], ["#e4d4f4", "#6d28d9", "#7c3aed"], ["#fbd5b5", "#9a3412", "#c2410c"], ["#d1d5db", "#374151", "#dc2626"], ["#fbcfe8", "#be185d", "#db2777"], ["#dcfce7", "#166534", "#16a34a"]];
var EMO = {"01": "🌾", "02": "🌲", "03": "🐟", "10": "🍞", "11": "🥤", "13": "🧵", "14": "👕", "16": "🪵", "18": "🖨️", "25": "⚙️", "31": "🪑", "41": "🏗️", "43": "🏗️", "45": "🔧", "46": "📦", "47": "🛍️", "49": "🚚", "52": "📦", "55": "🏨", "56": "🍽️", "58": "📚", "62": "💻", "63": "💻", "68": "🏠", "69": "📑", "70": "💼", "73": "📣", "74": "📷", "79": "🧳", "85": "🎓", "86": "🩺", "93": "🏋️", "95": "🔧", "96": "🧺"};
function mkBiz(k, n) {
  var d = String(k).slice(0, 2), cat = "general", c; for (c in DIV) if (DIV[c].indexOf(d) > -1) cat = c;
  var pl = PAL[(+String(k).slice(0, 3) || 0) % PAL.length], nm = String(n || "").replace(/^\s+|\s+$/g, "");
  if (nm.length > 26) nm = nm.slice(0, 24) + "…";
  var pr = cat === "food" ? "table" : cat === "online" ? "paper" : d === "96" ? "washer" : d === "45" ? "car" : "boxes";
  var tip = cat === "food" ? HAL : cat === "waste" ? "Kegiatan seperti ini bisa menghasilkan limbah atau memerlukan izin lingkungan dan keselamatan kerja. Tanyakan kebutuhan izinnya ke loket." : cat === "online" ? "Usaha jasa dan digital tetap perlu NIB. Periksa juga kewajiban pajak dan perlindungan data pribadi." : "Cek tingkat risiko KBLI ini di OSS untuk mengetahui perizinan yang perlu dipenuhi. Bila ragu, tanyakan ke loket.";
  return {k: String(k), n: nm || ("KBLI " + k), e: EMO[d] || "🏪", cat: cat, wall: pl[0], roof: pl[1], acc: pl[2], pr: pr, tx: cat === "food" ? "brick" : "", tip: tip, fx: "", custom: 1};
}
function useBiz(k, n) {
  var i; for (i = 0; i < BIZ.length; i++) if (BIZ[i].k === String(k) && !BIZ[i].custom) { pick2(i); return; }
  for (i = 0; i < BIZ.length; i++) if (BIZ[i].custom && BIZ[i].k === String(k)) { pick2(i); return; }
  var cs = BIZ.filter(function (b) { return b.custom; }); if (cs.length >= 8) BIZ.splice(BIZ.indexOf(cs[0]), 1);
  BIZ.push(mkBiz(k, n)); pick2(BIZ.length - 1);
}
function pick2(i) { PICK = i; menu(); var c = document.querySelector('.u3-ch[data-i="' + i + '"]'); if (c && c.scrollIntoView) { try { c.scrollIntoView({block: "nearest", inline: "center"}); } catch (e) {} } }
function srch(q) {
  var o = $("u3sr"); if (!o) return; q = String(q || "").trim(); if (q.length < 2) { o.innerHTML = ""; return; }
  var R = [], m = q.match(/^(\d{5})\s*(.*)$/);
  try { if (window.KBLI && KBLI.has()) R = KBLI.search(q, 6); } catch (e) {}
  var h = R.map(function (r) { return '<button type="button" class="u3-sb" data-u3="kb" data-k="' + esc(r[0]) + '" data-n="' + esc(r[1]) + '"><b>' + esc(r[0]) + '</b> ' + esc(r[1]) + '</button>'; }).join("");
  if (!R.length && m) h = '<button type="button" class="u3-sb" data-u3="kb" data-k="' + m[1] + '" data-n="' + esc(m[2]) + '"><b>' + m[1] + '</b> ' + esc(m[2] || "Bangun usaha dengan kode ini") + '</button>';
  if (!h) h = '<small class="sys">' + (window.KBLI && KBLI.has() ? "Tidak ketemu. Coba kata lain atau ketik kode 5 digit." : "Data KBLI belum diimpor admin. Ketik kode 5 digit dan nama usaha, misalnya: 47711 Toko Sepatu.") + '</small>';
  o.innerHTML = h;
}
/* ---------- Menu ---------- */
var PICK = 0;
function menu() {
  API.stopAll(); API.title("Usaha 3D");
  API.view(API.bar("Bangun Usaha 3D") + '<p class="sys" style="margin:0 0 8px">Pilih usaha impian, lihat maketnya tumbuh dalam 3D, lalu uji pengetahuan soal KBLI, NIB, dan perizinan. Seret maket untuk memutarnya.</p>' +
    stageHtml(skyCls()) + hotHtml() +
    '<div class="u3-sq"><input class="si" id="u3sq" type="search" placeholder="Cari KBLI lain: bengkel motor, toko sepatu, 47711…" autocomplete="off" aria-label="Cari KBLI untuk dibangun"><div id="u3sr" class="u3-sr"></div></div>' +
    '<div class="u3-pick" role="group" aria-label="Pilih usaha (' + BIZ.length + ' contoh, atau cari KBLI lain)">' + BIZ.map(function (b, i) { return '<button type="button" class="u3-ch" data-u3="pick" data-i="' + i + '" aria-pressed="' + (i === PICK) + '"><span>' + b.e + '</span><b>' + esc(b.n) + '</b><small>KBLI ' + b.k + '</small></button>'; }).join("") + '</div>' +
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
  var h = $("u3h"); if (h) h.innerHTML = "";
  [].forEach.call(document.querySelectorAll("[data-u3=hot]"), function (x) { x.setAttribute("aria-pressed", "false"); });
  mount(i, 5, true, false, SC ? {ry: SC.ry, rx: SC.rx, zm: SC.zm, auto: SC.auto} : null); info();
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
var CAMS = [{ry: -14, rx: -36, zm: 1.4}, {ry: -10, rx: -38, zm: 1.4}, {ry: -34, rx: -34, zm: 1.15}, {ry: -48, rx: -30, zm: 1.1}, {ry: -32, rx: -52, zm: 1}];
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
      camTo(CAMS[i], 1400);
      if (i === 4) { API.konfeti(70); API.beep(988, 0.3); }
    }, T[i]);
  });
  API.later(function () { storyEnd(bi); }, 25400);
  SKIP = function () { API.stopAll(); var el = $("u3w"); if (!el) return; mount(bi, 5, false, true, SC ? {ry: SC.ry, rx: -52, zm: 1, auto: SC.auto} : null); setSteps(6); cap(4, caps[4]); say(""); storyEnd(bi); };
}
function storyEnd(bi) {
  var b = BIZ[bi], e = $("u3e"); if (!e) return; say("");
  e.innerHTML = '<div class="u3-end"><b>KBLI ' + b.k + ' &middot; ' + esc(b.n) + '</b><small class="sys">' + note(b) + '</small><div class="btns" style="justify-content:center"><button type="button" class="send" data-u3="play2">Main 5 tantangan</button>' +
    '<button type="button" class="btn" data-u3="ask">Tanya Asisten: KBLI ' + b.k + '</button><button type="button" class="btn" data-u3="ready">Cek kesiapan berkas</button><button type="button" class="btn" data-u3="book">Booking kunjungan</button><button type="button" class="btn" data-u3="replay">Ulangi animasi</button></div></div>';
}

/* ---------- Mode main (soal diacak dari beberapa variasi) ---------- */
function QS(b) {
  var others = shuffle(BIZ.filter(function (o) { return o.k !== b.k; })).slice(0, 2);
  var s1 = [
    {t: "Anda ingin membuka " + b.e + " " + b.n + ". KBLI mana yang paling cocok?", ok: b.k + " – " + b.n, no: others.map(function (o) { return o.k + " – " + o.n; }),
      hint: "Cocokkan nama usaha dengan kode yang memuat kegiatan yang sama.",
      ex: "Tepat! KBLI (Klasifikasi Baku Lapangan Usaha Indonesia) adalah kode jenis kegiatan usaha dan dicantumkan saat membuat NIB. Catatan: OSS memakai KBLI 2025, jadi cek ulang kodenya di OSS."},
    {t: "Papan di lahan menunjukkan KBLI " + b.k + ". Apa sebenarnya KBLI itu?", ok: "Kode klasifikasi jenis kegiatan usaha", no: ["Nomor plat kendaraan usaha", "Kode pos lokasi usaha"],
      hint: "Huruf awalnya berarti Klasifikasi Baku Lapangan Usaha.",
      ex: "Betul. KBLI mengelompokkan kegiatan usaha, dipilih saat membuat NIB, dan memengaruhi tingkat risiko serta perizinannya."}
  ];
  var s2 = [
    {t: "Papan KBLI sudah berdiri. Di mana Anda mendaftar NIB?", ok: "Lewat OSS (oss.go.id), gratis", no: ["Lewat calo supaya cepat selesai", "Kirim foto KTP dan selfie ke nomor WhatsApp tak dikenal"],
      hint: "NIB resmi dibuat sendiri, tanpa perantara.",
      ex: "Benar. NIB dibuat lewat OSS tanpa biaya. Waspada calo, dan jangan kirim foto KTP ke orang tak dikenal."},
    {t: "Apa fungsi NIB bagi pelaku usaha?", ok: "Identitas pelaku usaha yang diterbitkan lewat OSS", no: ["Kartu diskon belanja bahan baku", "Tanda lulus ujian kewirausahaan"],
      hint: "Kepanjangannya Nomor Induk Berusaha.",
      ex: "Tepat. NIB adalah identitas berusaha. Biaya pembuatannya tidak dipungut, jadi pesan yang meminta \"biaya admin NIB\" patut dicurigai."}
  ];
  var s3 = [
    {t: "NIB sudah terbit. Apa langkah berikutnya?", ok: "Cek kewajiban perizinan sesuai tingkat risiko KBLI saya", no: ["Langsung buka, NIB pasti cukup untuk semua usaha", "Ganti KBLI sembarang supaya izinnya lebih ringan"],
      hint: "Tidak semua usaha punya tingkat risiko yang sama.",
      ex: "Betul. Pada risiko rendah, NIB umumnya sudah cukup. Pada risiko lebih tinggi biasanya ada sertifikat standar atau izin tambahan. " + b.tip},
    {t: "Tingkat risiko usaha Anda terutama ditentukan oleh apa?", ok: "Kegiatan usaha (KBLI) yang dipilih", no: ["Warna cat bangunan", "Banyaknya pengikut media sosial"],
      hint: "Ingat papan yang Anda pasang di tahap pertama.",
      ex: "Tepat. Tingkat risiko mengikuti kegiatan usaha (KBLI), dan itulah yang menentukan perizinan yang perlu dipenuhi. " + b.tip}
  ];
  var cs = {
    food: {t: "NIB " + b.n + " sudah terbit. Selain itu, apa yang umumnya juga perlu diperhatikan?", ok: "Jaminan produk halal dan higiene sanitasi (tanyakan syaratnya ke loket)", no: ["Tidak ada, usaha makanan bebas aturan", "Cukup menempel stiker \"Sehat\" di dinding"], hint: "Makanan dan minuman dikonsumsi orang banyak.", ex: "Benar. " + HAL},
    waste: {t: "Usaha " + b.n + " menghasilkan limbah. Sikap yang tepat?", ok: "Kelola limbah dengan benar dan tanyakan kebutuhan izin lingkungannya", no: ["Buang ke selokan supaya cepat beres", "Bakar di belakang bangunan"], hint: "Limbah tertentu berbahaya bagi lingkungan sekitar.", ex: "Tepat. " + b.tip},
    online: {t: "Toko online Anda sudah ber-NIB. Hal apa lagi yang perlu dicek?", ok: "Ketentuan perdagangan elektronik, kewajiban pajak, dan perizinan sesuai KBLI", no: ["Tidak ada, toko online bebas aturan", "Cukup akun marketplace tanpa NIB"], hint: "Berjualan daring tetap kegiatan usaha.", ex: "Benar. " + b.tip}
  };
  if (cs[b.cat]) s3.push(cs[b.cat]);
  var s4 = [
    {t: "Dinding sudah berdiri. Soal tempat usaha, apa yang perlu dipastikan?", ok: "Lokasi sesuai tata ruang (KKPR) dan bangunan punya PBG", no: ["Cukup izin lisan dari tetangga", "Tidak perlu, asal lokasinya ramai"],
      hint: "Ada aturan tata ruang dan persetujuan bangunan.",
      ex: "Tepat. Kesesuaian lokasi dengan tata ruang (KKPR) dan Persetujuan Bangunan Gedung (PBG) dicek sebelum membangun atau mengubah tempat usaha."},
    {t: "PBG kepanjangan dari apa?", ok: "Persetujuan Bangunan Gedung", no: ["Pajak Bangunan Gudang", "Pemeriksaan Barang Gudang"],
      hint: "Berkaitan dengan izin mendirikan atau mengubah bangunan.",
      ex: "Betul. PBG adalah persetujuan untuk membangun atau mengubah bangunan gedung."}
  ];
  var s5 = [
    {t: "Atap terpasang, tinggal satu dokumen yang membingungkan. Langkah terbaik?", ok: "Booking ke loket Takok atau tanya Asisten/Admin", no: ["Bayar orang tak dikenal yang menjanjikan \"jalur kilat\"", "Kirim NIK dan kode OTP lewat chat supaya diproses"],
      hint: "Jangan pernah membagikan NIK lengkap atau OTP.",
      ex: "Pilihan terbaik. Booking memberi jadwal pasti di loket. Petugas tidak pernah meminta OTP, dan jalur kilat dari orang tak dikenal berisiko penipuan."},
    {t: "Ada pesan WhatsApp: \"Transfer biaya admin NIB sekarang agar cepat terbit.\" Sikap Anda?", ok: "Abaikan dan laporkan; NIB di OSS tidak dipungut biaya", no: ["Transfer saja supaya cepat selesai", "Balas dan kirim foto KTP sebagai bukti"],
      hint: "Ingat berapa biaya membuat NIB.",
      ex: "Benar. NIB lewat OSS tidak dipungut biaya. Tanyakan ke loket Takok bila ragu, dan jangan kirim data pribadi ke pengirim tak dikenal."}
  ];
  return [s1, s2, s3, s4, s5].map(function (v) { return v[rnd(v.length)]; });
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
  add(S.q + 1, true); setSteps(S.q + 2); camTo(CAMS[S.q], 1200);
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
  else if (a === "kb") useBiz(x.dataset.k, x.dataset.n);
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
  else if (a === "view") { camTo(VIEWS[x.dataset.v] || VIEWS.free, 800); [].forEach.call(document.querySelectorAll('[data-u3="view"]'), function (z) { z.setAttribute("aria-pressed", String(z === x)); }); }
  else if (a === "tu") tilt(8);
  else if (a === "td") tilt(-8);
  else if (a === "zi") zoom(0.15);
  else if (a === "zo") zoom(-0.15);
  else if (a === "sky") { var o = [null, "", "u3-dusk", "u3-night"]; SKYO = o[(o.indexOf(SKYO) + 1) % o.length]; x.textContent = skyEmoji() + " " + skyName(); remount(); }
  else if (a === "det") { DET = DET ? 0 : 1; try { localStorage.setItem("tk_u3det", String(DET)); } catch (er) {} x.setAttribute("aria-pressed", String(!!DET)); x.textContent = "Detail: " + (DET ? "Tinggi" : "Hemat"); remount(); }
  else if (a === "hot") hot(+x.dataset.h);
  else if (a === "ask") { var k = BIZ[PICK].k; API.close(); if (window.openAsisten) openAsisten(); if (window.askAsisten) askAsisten("kbli " + k); }
  else if (a === "ready") { API.close(); if (window.openAsisten) openAsisten(); if (window.askAsisten) askAsisten("cek kesiapan nib"); }
  else if (a === "book") { API.close(); var t8 = document.getElementById("t8"); if (t8) t8.click(); }
});

$("gmb").addEventListener("input", function (e) { if (e.target && e.target.id === "u3sq") srch(e.target.value); });

/* Pratinjau kecil untuk kartu di menu Ruang Main (berputar sendiri lewat CSS). */
function mini() {
  var b = BIZ[API.hash(API.today()) % 10], h = "", i;
  for (i = 0; i <= 5; i++) h += parts(b, i, false, {lite: true, night: false, hi: false, final: true});
  return '<div class="u3-mini" aria-hidden="true"><div class="u3-mw">' + h + '</div></div>';
}
window.Usaha3D = {menu: menu, mini: mini, count: BIZ.length};
})();
