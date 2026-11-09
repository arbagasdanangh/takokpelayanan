"use strict";
/* Versi 9: Ruang Main (permainan bentuk), konfeti, maskot. Tanpa library, tanpa data pribadi.
   Poin, lencana, dan skor terbaik hanya tersimpan di perangkat (localStorage). Server hanya menghitung jumlah permainan secara anonim. */
(function () {
var G = {pts: 0, plays: 0, gp: {}, best: {}, days: [], badges: {}, sound: 0, kata: {}, qd: "", qp: {}, qdone: {}, roda: ""}, KEY = "tk_game9";
try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") for (var k in G) if (o[k] !== undefined) G[k] = o[k]; } } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function today() { try { return iso(wibDate(0)); } catch (e) { return new Date().toISOString().slice(0, 10); } }

/* ---------- Bentuk ---------- */
var SH = {
  lingkaran: {n: "Lingkaran", c: "#1a46b5", g: '<circle cx="50" cy="50" r="40"/>'},
  persegi: {n: "Persegi", c: "#f59e0b", g: '<rect x="13" y="13" width="74" height="74" rx="9"/>'},
  segitiga: {n: "Segitiga", c: "#ef4444", g: '<polygon points="50,11 91,85 9,85"/>'},
  bintang: {n: "Bintang", c: "#16a34a", g: '<polygon points="50,8 61,37 93,39 68,59 77,90 50,72 23,90 32,59 7,39 39,37"/>'},
  hati: {n: "Hati", c: "#ec4899", g: '<path d="M50 88C23 67 9 50 9 34a20 20 0 0 1 41-7 20 20 0 0 1 41 7c0 16-14 33-41 54z"/>'},
  segienam: {n: "Segi enam", c: "#8b5cf6", g: '<polygon points="50,8 88,29 88,71 50,92 12,71 12,29"/>'},
  belah: {n: "Belah ketupat", c: "#0ea5e9", g: '<polygon points="50,7 91,50 50,93 9,50"/>'},
  plus: {n: "Tambah", c: "#14b8a6", g: '<path d="M39 11h22v28h28v22H61v28H39V61H11V39h28z"/>'},
  segilima: {n: "Segi lima", c: "#f97316", g: '<polygon points="50,8 92,38 76,88 24,88 8,38"/>'},
  bulan: {n: "Bulan sabit", c: "#eab308", g: '<path d="M60 9A41 41 0 0 0 60 91A50 50 0 0 1 60 9z"/>'}
};
var SK = Object.keys(SH);
function svg(k, outline, col) {
  var s = SH[k], c = col || s.c;
  return '<svg viewBox="0 0 100 100" aria-hidden="true" style="color:' + c + '">' + (outline
    ? '<g fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 5" stroke-linejoin="round" opacity=".75" style="color:var(--mute)">' + s.g + '</g>'
    : '<g fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round">' + s.g + '</g>') + '</svg>';
}

/* ---------- Suara (opsional, bawaan mati) ---------- */
var AC = null;
function beep(f, d, t) {
  if (!G.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    var o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
    o.type = t || "sine"; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(0.08, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d); o.start(n); o.stop(n + d + 0.02);
  } catch (e) {}
}

/* ---------- Konfeti (dipakai juga oleh booking dan survei) ---------- */
window.konfeti = function (n) {
  if (RM) return;
  var box = document.createElement("div"), cols = ["#ffb800", "#ef4444", "#16a34a", "#1a46b5", "#8b5cf6", "#ec4899", "#0ea5e9"], i;
  box.className = "cf"; box.setAttribute("aria-hidden", "true");
  for (i = 0; i < (n || 40); i++) {
    var p = document.createElement("i"), t = rnd(4);
    p.style.left = rnd(100) + "%"; p.style.background = cols[rnd(cols.length)];
    p.style.setProperty("--dx", (rnd(160) - 80) + "px"); p.style.setProperty("--r", (rnd(900) - 300) + "deg"); p.style.setProperty("--d", (1.6 + Math.random() * 1.4).toFixed(2) + "s");
    p.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
    if (t === 0) p.style.borderRadius = "50%"; else if (t === 1) p.style.clipPath = "polygon(50% 0,100% 100%,0 100%)"; else if (t === 2) { p.style.width = "6px"; p.style.height = "14px"; }
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(function () { box.remove(); }, 3600);
};

/* ---------- Poin, level, lencana ---------- */
var TITLES = ["Warga Baru", "Arek Suroboyo", "Jagoan Layanan", "Pendekar Antrean", "Pahlawan Layanan"];
function titleOf(lv) { return lv >= 12 ? "Legenda Suroboyo" : lv >= 9 ? "Sesepuh Antrean" : lv >= 7 ? "Duta Layanan" : TITLES[Math.min(lv - 1, TITLES.length - 1)]; }
function lvl() { return Math.floor(G.pts / 100) + 1; }
function streak() {
  var seen = {}, n = 0, t = new Date(today() + "T00:00:00");
  G.days.forEach(function (d) { seen[d] = 1; });
  if (!seen[iso(t)]) t.setDate(t.getDate() - 1);  // hari ini belum main: runtun masih dihitung sampai kemarin
  while (seen[iso(t)]) { n++; t.setDate(t.getDate() - 1); }
  return n;
}
var BD = [
  {id: "pemula", n: "Pemula", d: "Selesaikan 1 permainan", s: "lingkaran", ok: function () { return G.plays >= 1; }},
  {id: "kolektor", n: "Kolektor", d: "Coba keempat permainan", s: "bintang", ok: function () { return ["cocok", "susun", "urut", "kuis"].every(function (g) { return G.gp[g] > 0; }); }},
  {id: "ingatan", n: "Ingatan Baja", d: "Menang Cocok Bentuk level Sulit dengan 2 bintang", s: "hati", ok: function () { return (G.best.c3 || 0) >= 2; }},
  {id: "cekatan", n: "Tangan Cekatan", d: "Susun Bentuk dengan 3 bintang", s: "segienam", ok: function () { return (G.best.s || 0) >= 3; }},
  {id: "telinga", n: "Jago Urutan", d: "Ingat 7 urutan atau lebih", s: "belah", ok: function () { return (G.best.u || 0) >= 7; }},
  {id: "tahu", n: "Si Paling Tahu", d: "Kuis Kilat nilai 5 dari 5", s: "plus", ok: function () { return (G.best.k || 0) >= 5; }},
  {id: "rajin", n: "Rajin Banget", d: "Main 3 hari berturut-turut", s: "segilima", ok: function () { return streak() >= 3; }},
  {id: "pahlawan", n: "Pahlawan Layanan", d: "Capai Level 5", s: "bulan", ok: function () { return lvl() >= 5; }},
  {id: "kata", n: "Jago Kata", d: "Menang Tebak Kata", s: "persegi", ok: function () { return (G.best.w || 0) >= 1; }},
  {id: "tangkas", n: "Tangkas", d: "Skor 300 atau lebih di Tangkap Berkas", s: "segitiga", ok: function () { return (G.best.t || 0) >= 300; }},
  {id: "arek", n: "Arek Suroboyo Asli", d: "Kuis Suroboyo 5 dari 5", s: "segilima", ok: function () { return (G.best.su || 0) >= 5; }},
  {id: "hoki", n: "Si Hoki", d: "Putar Roda Takok", s: "bintang", ok: function () { return (G.gp.roda || 0) >= 1; }},
  {id: "misi", n: "Misi Tuntas", d: "Selesaikan 3 tantangan dalam sehari", s: "plus", ok: function () { return Object.keys(G.qdone || {}).length >= 3; }},
  {id: "sepuluh", n: "Sepuluh Kali", d: "Main 10 kali", s: "segienam", ok: function () { return G.plays >= 10; }},
  {id: "maniak", n: "Maniak Main", d: "Coba semua 8 permainan", s: "belah", ok: function () { return ["cocok", "susun", "urut", "kuis", "kata", "tangkap", "suro", "roda"].every(function (g) { return G.gp[g] > 0; }); }}
];

/* ---------- Overlay ---------- */
var root = document.createElement("div");
root.className = "gm"; root.id = "gm"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Ruang Main Takok");
root.innerHTML = '<div class="gm-top"><b id="gmt">Ruang Main</b><span class="gm-pts" id="gmp"></span><button class="btn" type="button" id="gms" aria-pressed="false">Suara: mati</button><button class="btn" type="button" id="gmx">Tutup</button></div><div class="gm-in" id="gmb"></div>';
document.body.appendChild(root);
var $g = function (i) { return document.getElementById(i); }, RUN = 0, TM = null, TO = [], opener = null, hist = false;
function stopAll() { RUN++; clearInterval(TM); TM = null; TO.forEach(clearTimeout); TO = []; KS = null; TG = null; TGGO = null; }
function later(fn, ms) { var r = RUN, t = setTimeout(function () { if (r === RUN) fn(); }, ms); TO.push(t); return t; }
function view(h) { $g("gmb").innerHTML = h; root.scrollTop = 0; }
function top() { $g("gmp").textContent = "Lv " + lvl() + " · " + G.pts + " poin"; $g("gms").textContent = "Suara: " + (G.sound ? "nyala" : "mati"); $g("gms").setAttribute("aria-pressed", String(!!G.sound)); if ($g("mbpts")) $g("mbpts").textContent = G.pts ? "Lv " + lvl() + " · " + G.pts + " poin" : "Belum ada poin. Yuk mulai!"; }
function ping(g) { try { api("/api/game/main", {g: g}).catch(function () {}); } catch (e) {} }
function openGM() {
  opener = document.activeElement; root.hidden = false; document.body.style.overflow = "hidden"; home(); $g("gmx").focus();
  if (!hist) { try { history.pushState({gm: 1}, ""); hist = true; } catch (e) {} }
}
function closeGM(fromPop) {
  if (root.hidden) return;
  stopAll(); root.hidden = true; document.body.style.overflow = "";
  if (hist && !fromPop) { hist = false; try { history.back(); } catch (e) {} } else hist = false;
  top(); if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
}
window.addEventListener("popstate", function () { if (!root.hidden) closeGM(true); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !root.hidden) closeGM(); });
$g("gmx").onclick = function () { closeGM(); };
$g("gms").onclick = function () { G.sound = G.sound ? 0 : 1; save(); top(); if (G.sound) beep(660, 0.12); };
function bar(t, mid) { return '<div class="gm-bar"><button type="button" class="btn" data-m="home">&larr; Menu</button><b>' + t + '</b><span class="sys">' + (mid || "") + '</span></div>'; }

function home() {
  stopAll(); $g("gmt").textContent = "Ruang Main"; top();
  var lv = lvl(), pr = G.pts % 100, st = streak(), t = titleOf(lv), td = today(), kd = G.kata[td], rd = G.roda === td;
  var cards = [
    ["kata", ["persegi", "bintang", "persegi"], "Tebak Kata", "Satu kata baru tiap hari, 6 kesempatan. Bagikan hasilnya!", kd ? (kd.w ? "Hari ini: " + kd.t + "/6" : "Hari ini: gagal") : "Kata harian menunggu", !kd],
    ["tangkap", ["segitiga", "bintang", "belah"], "Tangkap Berkas", "Tangkap berkas, hindari yang merah, kejar kombo x4.", G.best.t ? "Rekor: " + G.best.t + " poin" : "Belum dimainkan"],
    ["suro", ["bulan", "segilima", "hati"], "Kuis Suroboyo", "Seberapa kenal Anda dengan Kota Pahlawan?", G.best.su !== undefined ? "Terbaik: " + G.best.su + " dari 5" : "Belum dimainkan"],
    ["roda", ["bintang", "lingkaran", "plus"], "Roda Takok", "Putar sekali sehari untuk poin dan tips layanan.", rd ? "Sudah diputar hari ini" : "Gratis hari ini!", !rd],
    ["cocok", ["lingkaran", "bintang", "hati"], "Cocok Bentuk", "Buka kartu dan temukan pasangan bentuk yang sama.", (G.best.c1 || G.best.c2 || G.best.c3) ? "Terbaik: " + ["\u2605", "\u2605\u2605", "\u2605\u2605\u2605"][Math.max(G.best.c1 || 0, G.best.c2 || 0, G.best.c3 || 0) - 1] : "Belum dimainkan"],
    ["susun", ["segitiga", "persegi", "segienam"], "Susun Bentuk", "Seret setiap bentuk ke bayangannya yang pas.", G.best.s ? "Terbaik: " + "\u2605\u2605\u2605".slice(0, G.best.s) : "Belum dimainkan"],
    ["urut", ["belah", "plus", "bulan"], "Ingat Urutan", "Ulangi urutan bentuk yang menyala. Makin panjang makin seru.", G.best.u ? "Rekor: " + G.best.u + " urutan" : "Belum dimainkan"],
    ["kuis", ["segilima", "bintang", "lingkaran"], "Kuis Kilat Loket", "Tebak loket yang tepat untuk setiap layanan.", G.best.k !== undefined ? "Terbaik: " + G.best.k + " dari 5" : "Belum dimainkan"]
  ];
  view('<div class="gm-lv"><div class="gm-ring" style="--p:' + pr + '"><span>' + lv + '</span></div><div><small>Level ' + lv + '</small><b>' + t + '</b><small>' + G.pts + ' poin &middot; ' + (100 - pr) + ' poin lagi ke level ' + (lv + 1) + (st >= 2 ? ' &middot; &#128293; ' + st + ' hari beruntun' : '') + '</small></div></div>' +
    questHtml() +
    '<h2>Pilih permainan</h2><div class="gm-games">' + cards.map(function (c) {
      return '<button type="button" class="gc' + (c[5] ? " hot" : "") + '" data-g="' + c[0] + '"><span class="gi">' + c[1].map(function (k) { return svg(k); }).join("") + '</span><b>' + c[2] + '</b><small>' + c[3] + '</small><em>' + c[4] + '</em></button>';
    }).join("") + '</div>' +
    '<h2>Statistik Anda</h2><div class="gm-st"><div><b>' + G.plays + '</b><small>permainan</small></div><div><b>' + G.pts + '</b><small>poin</small></div><div><b>' + Object.keys(G.badges).length + '/' + BD.length + '</b><small>lencana</small></div><div><b>' + Math.max(st, 0) + '</b><small>hari beruntun</small></div></div>' +
    '<h2>Lencana (' + Object.keys(G.badges).length + ' dari ' + BD.length + ')</h2><div class="gm-badges">' + BD.map(function (b) {
      var on = !!G.badges[b.id];
      return '<div class="bd' + (on ? "" : " off") + '" title="' + b.d + '">' + svg(b.s) + '<b>' + b.n + '</b><span>' + (on ? "Didapat" : b.d) + '</span></div>';
    }).join("") + '</div><p class="sys">Poin, lencana, dan skor terbaik tersimpan di perangkat ini saja dan tidak dikirim ke mana pun. Server hanya menghitung jumlah permainan tanpa identitas.</p>');
}

function fin(g, o) {
  stopAll();
  G.pts += o.pts; G.plays++; G.gp[g] = (G.gp[g] || 0) + 1;
  if (o.bk) G.best[o.bk] = Math.max(G.best[o.bk] || 0, o.bv);
  var d = today(); if (G.days.indexOf(d) < 0) { G.days.push(d); G.days = G.days.slice(-40); }
  var sel = track(g, o);
  var baru = BD.filter(function (b) { if (!G.badges[b.id] && b.ok()) { G.badges[b.id] = d; return true; } return false; });
  save(); top();
  if (o.stars >= 2 || baru.length) window.konfeti(o.stars >= 3 || baru.length ? 70 : 40);
  beep(784, 0.15); setTimeout(function () { beep(988, 0.25); }, 150);
  SHARE = o.share || "";
  view('<div class="rs"><h2>' + o.title + '</h2><div class="st" aria-label="' + o.stars + ' dari 3 bintang">' + "\u2605".repeat(o.stars) + '<s>' + "\u2605".repeat(3 - o.stars) + '</s></div><p style="margin:0">' + o.sub + '</p><div class="pl">+' + o.pts + ' poin</div>' +
    sel.map(function (q) { return '<div class="gm-q ok" style="width:100%"><span class="qc" aria-hidden="true">\u2713</span><div><b>Tantangan selesai</b><div class="sys">' + q + '</div></div><small>+20</small></div>'; }).join("") +
    (baru.length ? '<div class="gm-badges" style="width:100%">' + baru.map(function (b) { return '<div class="bd">' + svg(b.s) + '<b>Lencana baru!</b><span>' + b.n + '</span></div>'; }).join("") + '</div>' : '') +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-m="again">' + (o.again ? "Main lagi" : "Menu") + '</button>' + (SHARE ? '<button type="button" class="btn" data-m="share">Bagikan</button>' : '') + '<button type="button" class="btn" data-m="home">Menu Ruang Main</button></div></div>');
  AGAIN = o.again;
}
var AGAIN = null;

/* ---------- 1. Cocok Bentuk ---------- */
function cocokMenu() {
  $g("gmt").textContent = "Cocok Bentuk";
  view(bar("Cocok Bentuk", "") + '<p class="sys">Buka dua kartu. Bila bentuknya sama, pasangan itu tetap terbuka. Temukan semua pasangan dengan langkah sesedikit mungkin.</p><div class="gm-games">' +
    [["Mudah", "6 pasang", 1], ["Sedang", "8 pasang", 2], ["Sulit", "10 pasang", 3]].map(function (l) {
      var b = G.best["c" + l[2]]; return '<button type="button" class="gc" data-c="' + l[2] + '"><b>' + l[0] + '</b><small>' + l[1] + '</small><em>' + (b ? "Terbaik: " + "★★★".slice(0, b) : "Belum dimainkan") + '</em></button>';
    }).join("") + '</div>');
}
function cocokStart(lv) {
  stopAll(); ping("cocok");
  var cfg = [null, {p: 6, c: 4}, {p: 8, c: 4}, {p: 10, c: 5}][lv], keys = shuffle(SK).slice(0, cfg.p), cards = shuffle(keys.concat(keys)), s = {a: -1, lock: false, ok: 0, mv: 0, t0: 0, run: RUN};
  $g("gmt").textContent = "Cocok Bentuk";
  view(bar("Cocok Bentuk", 'Langkah <b id="mv">0</b> &middot; Waktu <b id="tm">0</b> dtk') + '<div class="mg" id="mg" style="--c:' + cfg.c + '">' + cards.map(function (k, i) {
    return '<button type="button" class="mc" data-i="' + i + '" aria-label="Kartu ' + (i + 1) + ', tertutup"><span class="mi"><span class="mk2" aria-hidden="true">?</span><span class="mf">' + svg(k) + '</span></span></button>';
  }).join("") + '</div>');
  $g("mg").onclick = function (e) {
    var b = e.target.closest(".mc"); if (!b || s.lock || b.classList.contains("on") || s.run !== RUN) return;
    var i = +b.dataset.i;
    if (!s.t0) { s.t0 = Date.now(); TM = setInterval(function () { var t = $g("tm"); if (t) t.textContent = Math.round((Date.now() - s.t0) / 1000); }, 500); }
    b.classList.add("on"); b.setAttribute("aria-label", "Kartu " + (i + 1) + ", " + SH[cards[i]].n); beep(440 + rnd(3) * 60, 0.07);
    if (s.a < 0) { s.a = i; return; }
    var a = s.a; s.a = -1; s.mv++; $g("mv").textContent = s.mv;
    var A = document.querySelector('.mc[data-i="' + a + '"]');
    if (cards[a] === cards[i]) {
      A.classList.add("ok"); b.classList.add("ok"); s.ok++; beep(660, 0.12);
      if (s.ok === cfg.p) {
        clearInterval(TM); var st = s.mv <= cfg.p * 1.9 ? 3 : s.mv <= cfg.p * 2.8 ? 2 : 1, sec = Math.round((Date.now() - s.t0) / 1000);
        later(function () { fin("cocok", {title: "Semua pasangan ketemu!", stars: st, sub: s.mv + " langkah dalam " + sec + " detik.", pts: st * 10 + cfg.p * 2 + (lv - 1) * 5, bk: "c" + lv, bv: st, again: function () { cocokStart(lv); }}); }, 650);
      }
    } else {
      s.lock = true; beep(200, 0.15, "triangle");
      later(function () { [A, b].forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-label", "Kartu " + (+x.dataset.i + 1) + ", tertutup"); }); s.lock = false; }, 750);
    }
  };
}

/* ---------- 2. Susun Bentuk (seret ke bayangan, atau ketuk-ketuk) ---------- */
function susunStart() {
  stopAll(); ping("susun");
  var rd = 0, mist = 0, sizes = [3, 4, 6], sel = null, left = 0;
  $g("gmt").textContent = "Susun Bentuk";
  function round() {
    var n = sizes[rd], keys = shuffle(SK).slice(0, n); left = n; sel = null;
    view(bar("Susun Bentuk", 'Ronde <b>' + (rd + 1) + '</b> dari 3 &middot; Salah <b id="ms">' + mist + '</b>') + '<div class="sb" id="sb">' + shuffle(keys).map(function (k) { return '<button type="button" class="sl" data-slot="' + k + '" aria-label="Bayangan ' + SH[k].n + '">' + svg(k, true) + '</button>'; }).join("") + '</div>' +
      '<div class="sr" id="sr">' + shuffle(keys).map(function (k) { return '<button type="button" class="sp" data-s="' + k + '" aria-label="Bentuk ' + SH[k].n + '">' + svg(k) + '</button>'; }).join("") + '</div><p class="sys" style="text-align:center">Seret bentuk ke bayangannya. Atau ketuk bentuk, lalu ketuk bayangannya.</p>');
    bind();
  }
  function place(p, slot) {
    if (p.dataset.s === slot.dataset.slot) {
      slot.innerHTML = svg(p.dataset.s); slot.classList.add("fill"); slot.classList.remove("hot"); slot.setAttribute("aria-label", SH[p.dataset.s].n + ", sudah pas");
      p.classList.add("gone"); p.disabled = true; p.classList.remove("sel", "drag"); p.style.transform = ""; sel = null; beep(660, 0.12);
      if (--left === 0) later(function () {
        if (++rd < 3) round();
        else { var st = mist <= 1 ? 3 : mist <= 3 ? 2 : 1; fin("susun", {title: "Semua bentuk pas!", stars: st, sub: mist ? mist + " kali salah tempat." : "Tanpa salah sama sekali!", pts: st * 10 + 15, bk: "s", bv: st, again: susunStart}); }
      }, 500);
    } else {
      mist++; $g("ms").textContent = mist; beep(180, 0.18, "square");
      p.classList.remove("drag"); p.style.transform = ""; [p, slot].forEach(function (x) { x.classList.add("shk"); setTimeout(function () { x.classList.remove("shk"); }, 320); });
    }
  }
  function bind() {
    var sr = $g("sr"), sb = $g("sb"), drag = null, moved = false;
    function slotAt(x, y) { var l = document.elementsFromPoint(x, y), i; for (i = 0; i < l.length; i++) if (l[i].classList && l[i].classList.contains("sl") && !l[i].classList.contains("fill")) return l[i]; return null; }
    sr.addEventListener("pointerdown", function (e) {
      var p = e.target.closest(".sp"); if (!p || p.disabled || e.button > 0) return;
      var r = p.getBoundingClientRect(); drag = {p: p, sx: e.clientX, sy: e.clientY}; moved = false;
      try { p.setPointerCapture(e.pointerId); } catch (x) {}
    });
    sr.addEventListener("pointermove", function (e) {
      if (!drag) return; var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!moved && Math.hypot(dx, dy) < 7) return;
      moved = true; drag.p.classList.add("drag"); drag.p.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.12)";
      var h = slotAt(e.clientX, e.clientY); [].forEach.call(sb.children, function (c) { c.classList.toggle("hot", c === h); });
    });
    function end(e) {
      if (!drag) return; var d = drag; drag = null;
      [].forEach.call(sb.children, function (c) { c.classList.remove("hot"); });
      if (moved) { var s = slotAt(e.clientX, e.clientY); if (s) place(d.p, s); else { d.p.classList.remove("drag"); d.p.style.transform = ""; } setTimeout(function () { moved = false; }, 0); }
    }
    sr.addEventListener("pointerup", end); sr.addEventListener("pointercancel", function (e) { if (drag) { drag.p.classList.remove("drag"); drag.p.style.transform = ""; drag = null; moved = false; } });
    sr.addEventListener("click", function (e) {
      var p = e.target.closest(".sp"); if (!p || p.disabled || moved) return;
      if (sel) sel.classList.remove("sel"); if (sel === p) { sel = null; return; } sel = p; p.classList.add("sel"); beep(520, 0.05);
    });
    sb.addEventListener("click", function (e) { var s = e.target.closest(".sl"); if (s && sel && !s.classList.contains("fill")) place(sel, s); });
  }
  round();
}

/* ---------- 3. Ingat Urutan ---------- */
function urutStart() {
  stopAll(); ping("urut");
  var keys = ["lingkaran", "persegi", "segitiga", "bintang"], freq = [262, 330, 392, 523], seq = [], pos = 0, ready = false;
  $g("gmt").textContent = "Ingat Urutan";
  view(bar("Ingat Urutan", 'Panjang <b id="ln">0</b>') + '<div class="up" id="up">' + keys.map(function (k, i) { return '<button type="button" class="pad" data-p="' + i + '" disabled aria-label="' + SH[k].n + '" style="background:' + SH[k].c + '">' + svg(k, false, "#fff") + '</button>'; }).join("") + '</div><p class="sys" id="us" style="text-align:center" aria-live="polite">Bersiap&hellip;</p>');
  var pads = [].slice.call(document.querySelectorAll("#up .pad"));
  function lit(i, ms) { pads[i].classList.add("lit"); beep(freq[i], ms / 1000); later(function () { pads[i].classList.remove("lit"); }, ms); }
  function enable(on) { pads.forEach(function (p) { p.disabled = !on; }); ready = on; }
  function show() {
    enable(false); pos = 0; seq.push(rnd(4)); $g("ln").textContent = seq.length; $g("us").textContent = "Perhatikan urutannya…";
    var i = 0, gap = Math.max(300, 620 - seq.length * 22);
    (function step() { if (i >= seq.length) { enable(true); $g("us").textContent = "Giliran Anda! Ulangi urutannya."; return; } lit(seq[i], Math.min(380, gap - 80)); i++; later(step, gap); })();
  }
  $g("up").onclick = function (e) {
    var b = e.target.closest(".pad"); if (!b || !ready) return; var i = +b.dataset.p;
    lit(i, 200);
    if (i !== seq[pos]) {
      enable(false); beep(150, 0.4, "sawtooth"); var len = seq.length - 1, st = len >= 9 ? 3 : len >= 6 ? 2 : 1;
      later(function () { fin("urut", {title: len ? "Hebat, " + len + " urutan!" : "Coba lagi ya!", stars: st, sub: len >= 7 ? "Ingatan Anda tajam sekali." : "Terus berlatih, rekor bisa dipecahkan.", pts: len * 4 + 5, bk: "u", bv: len, again: urutStart}); }, 600);
      return;
    }
    if (++pos === seq.length) { enable(false); $g("us").textContent = "Benar!"; later(show, 800); }
  };
  later(show, 700);
}

/* ---------- 4. Kuis Kilat Loket (dibuat dari data loket yang ada) ---------- */
function kuisStart() {
  var pool = [], seen = {}, names = {}, nu = function (t) { return String(t).replace(/\s+/g, " ").trim().toLowerCase(); };
  Object.keys(LD || {}).forEach(function (lid) { (LD[lid] || []).forEach(function (d) {
    if (!d[2] || d[2].length <= 35 || /belum diisi/i.test(d[2])) return;
    (names[d[1]] = names[d[1]] || {})[nu(d[2])] = 1;
    if (!seen[d[1]] && !seen["u:" + nu(d[2])]) { seen[d[1]] = 1; seen["u:" + nu(d[2])] = 1; pool.push({lid: lid, no: d[0], nama: d[1], ur: String(d[2]).replace(/\*\*/g, "")}); }  // satu soal per nama dan per uraian, agar jawabannya tidak ambigu
  }); });
  if (pool.length < 5 || Object.keys(names).length < 4) { view(bar("Kuis Kilat Loket", "") + '<div class="empty">Data loket belum siap. Coba lagi sebentar lagi.</div>'); return; }
  stopAll(); ping("kuis");
  $g("gmt").textContent = "Kuis Kilat Loket";
  var Q = shuffle(pool).slice(0, 5), i = 0, skor = 0, benar = 0, SEC = 15;
  function cut(t) { t = String(t).replace(/\s+/g, " "); return t.length > 130 ? t.slice(0, 130).replace(/\s+\S*$/, "") + "…" : t; }
  function ask() {
    var q = Q[i], opts = shuffle([q.nama].concat(shuffle(Object.keys(names).filter(function (n) { return n !== q.nama && !names[n][nu(q.ur)]; })).slice(0, 3))), done = false, t0 = Date.now();
    view(bar("Kuis Kilat Loket", 'Soal <b>' + (i + 1) + '</b> dari 5 &middot; Benar <b>' + benar + '</b>') + '<div class="qq"><div class="qt" aria-hidden="true"><i id="qb"></i></div><p>Layanan ini diurus di loket mana?<br><span style="font-weight:400;color:var(--mute)">&ldquo;' + cut(q.ur).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }) + '&rdquo;</span></p><div id="qo" style="display:grid;gap:8px">' + opts.map(function (o, n) { return '<button type="button" class="qo" data-o="' + esc(o) + '"><i>' + "ABCD"[n] + '</i>' + esc(o) + '</button>'; }).join("") + '</div><div id="qf" aria-live="polite"></div></div>');
    var bar2 = $g("qb"); bar2.style.transform = "scaleX(1)"; void bar2.offsetWidth; bar2.style.transitionDuration = SEC + "s"; bar2.style.transform = "scaleX(0)";
    function answer(pick) {
      if (done) return; done = true; var ok = pick === q.nama, left = Math.max(0, SEC - (Date.now() - t0) / 1000);
      bar2.style.transition = "none"; bar2.style.transform = "scaleX(" + (left / SEC) + ")";
      [].forEach.call(document.querySelectorAll("#qo .qo"), function (b) { b.disabled = true; if (b.dataset.o === q.nama) b.classList.add("good"); else if (b.dataset.o === pick) b.classList.add("bad"); });
      if (ok) { benar++; skor += 4 + (left > 8 ? 2 : left > 4 ? 1 : 0); beep(660, 0.12); } else beep(180, 0.2, "square");
      $g("qf").innerHTML = '<p style="margin:6px 0">' + (ok ? "Tepat!" : pick ? "Kurang tepat." : "Waktu habis.") + ' <b>' + esc(q.nama) + '</b> ada di ' + esc(lokNama(q.lid)) + '.</p><div class="btns"><button type="button" class="send" data-m="next">' + (i === 4 ? "Lihat hasil" : "Soal berikutnya") + '</button><button type="button" class="btn" data-m="open" data-k="' + q.lid + "_" + q.no + '">Lihat loketnya</button></div>';
      NEXT = function () { if (++i < 5) ask(); else { var st = benar === 5 ? 3 : benar >= 3 ? 2 : 1; fin("kuis", {title: benar + " dari 5 benar", stars: st, sub: benar === 5 ? "Sempurna! Anda hafal loket-loket kami." : "Terus jelajahi daftar loket untuk jadi lebih jago.", pts: skor + 5, bk: "k", bv: benar, again: kuisStart}); } };
    }
    $g("qo").onclick = function (e) { var b = e.target.closest(".qo"); if (b) answer(b.dataset.o); };
    later(function () { answer(""); }, SEC * 1000);
  }
  ask();
}
var NEXT = null;

/* ====================================================================
   Versi 11: permainan baru, Tantangan Harian, Roda Takok, statistik.
   ==================================================================== */
var SHARE = "", KS = null, TG = null, TGGO = null;
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function buzz(ms) { if (G.sound && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
function shareTxt(t) {
  try { if (navigator.share) { navigator.share({text: t}).catch(function () {}); return; } } catch (e) {}
  window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener");
}
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- Tantangan harian ---------- */
var QP = [
  {id: "main3", t: "Main 3 permainan", n: 3, v: function (p) { return p.plays || 0; }},
  {id: "jenis", t: "Coba 2 jenis permainan berbeda", n: 2, v: function (p) { return Object.keys(p.kinds || {}).length; }},
  {id: "bintang", t: "Raih 2 bintang atau lebih", n: 1, v: function (p) { return p.s2 || 0; }},
  {id: "kata", t: "Mainkan Tebak Kata", n: 1, v: function (p) { return (p.kinds || {}).kata ? 1 : 0; }},
  {id: "tangkap", t: "Capai skor 150 di Tangkap Berkas", n: 150, v: function (p) { return p.tmax || 0; }},
  {id: "suro", t: "Jawab 4 benar di Kuis Suroboyo", n: 4, v: function (p) { return p.suro || 0; }},
  {id: "roda", t: "Putar Roda Takok", n: 1, v: function (p) { return p.roda || 0; }},
  {id: "urut", t: "Ingat 5 urutan di Ingat Urutan", n: 5, v: function (p) { return p.urut || 0; }}
];
function hariIni() {
  var d = today(); if (G.qd !== d) { G.qd = d; G.qp = {}; G.qdone = {}; save(); }
  var h = hash(d), ids = QP.slice(), out = [];
  while (out.length < 3) { var i = h % ids.length; out.push(ids.splice(i, 1)[0]); h = Math.imul(h ^ (h >>> 7), 2654435761) >>> 0; }
  return out;
}
function track(g, o) {
  var p = (hariIni(), G.qp); p.plays = (p.plays || 0) + 1; p.kinds = p.kinds || {}; p.kinds[g] = 1; if (o.stars >= 2) p.s2 = 1;
  if (o.m) for (var k in o.m) p[k] = Math.max(p[k] || 0, o.m[k]);
  var selesai = [];
  hariIni().forEach(function (q) { if (!G.qdone[q.id] && q.v(p) >= q.n) { G.qdone[q.id] = 1; G.pts += 20; selesai.push(q.t); } });
  return selesai;
}
function questHtml() {
  var Q = hariIni(), done = Q.filter(function (q) { return G.qdone[q.id]; }).length;
  return '<h2>Tantangan hari ini <small class="sys">(' + done + ' dari 3 selesai &middot; +20 poin tiap tantangan)</small></h2><div class="gm-qs">' + Q.map(function (q) {
    var v = Math.min(q.v(G.qp), q.n), ok = !!G.qdone[q.id];
    return '<div class="gm-q' + (ok ? " ok" : "") + '"><span class="qc" aria-hidden="true">' + (ok ? "\u2713" : "") + '</span><div><b>' + q.t + '</b><div class="lk-bar"><i style="width:' + Math.round(v * 100 / q.n) + '%"></i></div></div><small>' + (ok ? "Selesai" : v + "/" + q.n) + '</small></div>';
  }).join("") + '</div>';
}

/* ---------- Roda Takok (sekali sehari) ---------- */
var TIPS = [
  "Pesan jadwal lewat Booking Kunjungan supaya tidak antre lama. Tiketnya bisa ditambahkan ke kalender.",
  "Tekan \"Saya sudah tiba\" saat sudah di lokasi (dibuka 60 menit sebelum jam booking) agar Anda didahulukan.",
  "Tekan Ctrl+K untuk mencari layanan dengan cepat dari mana saja.",
  "Siapkan dokumen asli dan fotokopi sebelum berangkat. Asisten Takok punya daftar dokumen yang bisa dicentang.",
  "Jangan kirim NIK lengkap, kata sandi, atau kode OTP lewat chat. Petugas tidak pernah memintanya.",
  "Setelah dilayani, isi Survei Kepuasan. Penilaian Anda dipakai untuk memperbaiki layanan.",
  "Tanya Asisten Takok dengan bahasa sehari-hari, misalnya \"mau bikin NIB\" atau \"SIP dokter\".",
  "Booking tersedia pada hari kerja pukul 08.00 sampai 14.00 dengan jeda pukul 12.00."
];
var WH = [{p: 10, c: "#1a46b5", w: 20}, {p: 25, c: "#f59e0b", w: 12}, {p: 15, c: "#16a34a", w: 12}, {p: 50, c: "#ef4444", w: 6}, {p: 20, c: "#8b5cf6", w: 18}, {p: 30, c: "#0ea5e9", w: 10}, {p: 15, c: "#ec4899", w: 20}, {p: 100, c: "#eab308", w: 2}];
function rodaSvg() {
  var o = "";
  WH.forEach(function (s, i) {
    var a0 = (i * 45 - 90) * Math.PI / 180, a1 = ((i + 1) * 45 - 90) * Math.PI / 180, am = (i * 45 + 22.5);
    o += '<path d="M100 100L' + (100 + 96 * Math.cos(a0)).toFixed(2) + " " + (100 + 96 * Math.sin(a0)).toFixed(2) + "A96 96 0 0 1 " + (100 + 96 * Math.cos(a1)).toFixed(2) + " " + (100 + 96 * Math.sin(a1)).toFixed(2) + 'Z" fill="' + s.c + '" stroke="#fff" stroke-width="2"/>' +
      '<text transform="rotate(' + am + ' 100 100) translate(100 28)" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width=".6">+' + s.p + '</text>';
  });
  return '<svg viewBox="0 0 200 200" aria-hidden="true"><g id="rw" class="rw">' + o + '<circle cx="100" cy="100" r="14" fill="#fff" stroke="#1a46b5" stroke-width="3"/></g></svg>';
}
function rodaStart() {
  stopAll(); $g("gmt").textContent = "Roda Takok";
  var sudah = G.roda === today();
  view(bar("Roda Takok", sudah ? "Sudah diputar hari ini" : "Gratis 1x sehari") + '<div class="wh"><i class="wp" aria-hidden="true"></i>' + rodaSvg() + '</div>' +
    (sudah ? '<p class="rs-t">Putaran hari ini sudah dipakai. Kembali lagi besok untuk hadiah baru!</p><div class="gm-tip"><b>Tips layanan hari ini</b><p>' + esc(TIPS[hash(today()) % TIPS.length]) + '</p></div><div class="btns" style="justify-content:center"><button type="button" class="btn" data-m="home">Menu Ruang Main</button></div>'
      : '<div class="btns" style="justify-content:center"><button type="button" class="send" id="rsp" data-m="spin">Putar sekarang</button></div><p class="sys" style="text-align:center">Hadiah poin 10 sampai 100, plus satu tips layanan.</p>'));
}
function rodaSpin() {
  var b = $g("rsp"); if (!b || b.disabled || G.roda === today()) return; b.disabled = true; ping("roda");
  var tot = WH.reduce(function (a, s) { return a + s.w; }, 0), r = Math.random() * tot, idx = 0, i;
  for (i = 0; i < WH.length; i++) { r -= WH[i].w; if (r <= 0) { idx = i; break; } }
  var target = 360 * 5 + (360 - (idx * 45 + 22.5)) + (Math.random() * 24 - 12), w = $g("rw"), dur = RM ? 600 : 4200;
  w.style.transition = "transform " + dur + "ms cubic-bezier(.12,.7,.12,1)"; w.style.transformOrigin = "100px 100px"; w.style.transform = "rotate(" + target + "deg)";
  var n = 0, tk = setInterval(function () { if (n++ < dur / 220) beep(300 + (n % 5) * 60, 0.05, "square"); }, 220); TO.push(tk);
  later(function () {
    clearInterval(tk); var p = WH[idx].p; buzz(40); G.roda = today();
    fin("roda", {title: "Anda mendapat +" + p + " poin!", stars: p >= 50 ? 3 : p >= 25 ? 2 : 1, sub: "<b>Tips layanan:</b> " + esc(TIPS[hash(today()) % TIPS.length]), pts: p, m: {roda: 1}, again: rodaStart});
  }, dur + 200);
}

/* ---------- Tebak Kata ---------- */
var KW = ["LOKET", "ANTRE", "PAJAK", "SURAT", "TIKET", "BAYAR", "KARTU", "TUGAS", "WARGA", "BUKTI", "MERAH", "JUARA", "MURAH", "CEPAT", "RAMAH", "SIGAP", "JUJUR", "SEHAT", "KERJA", "HARGA", "PASAR", "TAMAN", "JALAN", "KAPAL", "BUNGA", "SAWAH", "DAMAI", "PINTU", "KOTAK", "BERAS", "SAKTI", "TUKAR", "UNGGUL", "TERTIB", "SIMAK", "CATAT", "ISIAN", "LAPOR", "TANYA", "JAWAB", "PUSAT", "WAKTU", "TEPAT", "LANCAR", "MUDAH", "SELESAI", "BERKAS"].filter(function (w) { return w.length === 5; });
function kataIdx() { var p = today().split("-"), days = Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5), m = [7, 11, 13, 17].filter(function (x) { return KW.length % x; })[0]; return (days * m + 3) % KW.length; }
function evalW(g, w) {
  var r = [0, 0, 0, 0, 0].map(function () { return "x"; }), cnt = {}, i;
  for (i = 0; i < 5; i++) { if (g[i] === w[i]) r[i] = "g"; else cnt[w[i]] = (cnt[w[i]] || 0) + 1; }
  for (i = 0; i < 5; i++) { if (r[i] !== "g" && cnt[g[i]] > 0) { r[i] = "y"; cnt[g[i]]--; } }
  return r;
}
function kataShareTxt(gs, w, daily) {
  var n = gs.length, win = gs[n - 1] === w, em = {g: "\uD83D\uDFE9", y: "\uD83D\uDFE8", x: "\u2B1B"};
  return "Tebak Kata Takok Pelayanan Suroboyo " + (daily ? today() : "(latihan)") + " " + (win ? n : "X") + "/6\n" + gs.map(function (g) { return evalW(g, w).map(function (c) { return em[c]; }).join(""); }).join("\n") + "\n" + location.origin;
}
function kataPaint(flip) {
  var rows = "", r, c, st = {}, KB = ["QWERTYUIOP", "ASDFGHJKL", "#ZXCVBNM<"];
  for (r = 0; r < 6; r++) {
    var g = KS.g[r], t = "";
    if (g !== undefined) { var ev = evalW(g, KS.w); for (c = 0; c < 5; c++) t += '<i class="kwt ' + ev[c] + (flip && r === KS.g.length - 1 ? " fl" : "") + '" style="--i:' + c + '">' + g[c] + "</i>"; }
    else for (c = 0; c < 5; c++) t += '<i class="kwt' + (r === KS.g.length && KS.cur[c] ? " on" : "") + '">' + (r === KS.g.length ? (KS.cur[c] || "") : "") + "</i>";
    rows += '<div class="kr" id="kr' + r + '">' + t + "</div>";
  }
  KS.g.forEach(function (g) { var ev = evalW(g, KS.w); for (var i = 0; i < 5; i++) { var o = st[g[i]], n = ev[i]; if (o === "g" || (o === "y" && n !== "g")) continue; st[g[i]] = n; } });
  var kb = KB.map(function (row) { return '<div class="kkr">' + row.split("").map(function (k) { return '<button type="button" class="kk ' + (st[k] || "") + (k === "#" || k === "<" ? " w" : "") + '" data-kk="' + k + '" aria-label="' + (k === "#" ? "Kirim tebakan" : k === "<" ? "Hapus huruf" : k) + '">' + (k === "#" ? "OK" : k === "<" ? "\u232B" : k) + "</button>"; }).join("") + "</div>"; }).join("");
  $g("ktw").innerHTML = rows; $g("kkw").innerHTML = KS.over ? "" : kb; if ($g("ktn")) $g("ktn").textContent = KS.g.length;
}
function kataStart(daily) {
  var d = today();
  if (daily && G.kata[d]) { var e = G.kata[d]; stopAll(); $g("gmt").textContent = "Tebak Kata"; KS = {w: KW[kataIdx()], g: e.g.slice(), cur: "", daily: true, over: true};
    view(bar("Tebak Kata", "Kata harian selesai") + '<div class="kb" id="ktw"></div><div id="kkw"></div><p class="rs-t">' + (e.w ? "Selamat! Anda menebak dalam " + e.t + " kali." : "Kata hari ini: <b>" + KW[kataIdx()] + "</b>. Besok coba lagi!") + '</p><div class="btns" style="justify-content:center"><button type="button" class="send" data-m="kshare">Bagikan hasil</button><button type="button" class="btn" data-m="kfree">Latihan kata acak</button><button type="button" class="btn" data-m="home">Menu</button></div>');
    SHARE = kataShareTxt(e.g, KW[kataIdx()], true); kataPaint(); return; }
  stopAll(); ping("kata"); $g("gmt").textContent = "Tebak Kata";
  KS = {w: daily ? KW[kataIdx()] : KW[rnd(KW.length)], g: [], cur: "", daily: !!daily, over: false};
  view(bar("Tebak Kata", (daily ? "Kata harian" : "Latihan") + ' &middot; Tebakan <b id="ktn">0</b>/6') + '<p class="sys">Tebak kata 5 huruf bertema layanan publik. <b class="kg">Hijau</b> = tepat, <b class="ky">kuning</b> = ada tetapi salah tempat, abu-abu = tidak ada. Ketik di keyboard atau ketuk tombol.</p><div class="kb" id="ktw"></div><div id="kmsg" class="sys" role="status" aria-live="polite" style="text-align:center;min-height:1.4em"></div><div id="kkw"></div>');
  kataPaint();
}
function kataKey(k) {
  if (!KS || KS.over) return;
  if (k === "<") KS.cur = KS.cur.slice(0, -1);
  else if (k === "#") {
    if (KS.cur.length < 5) { var row = $g("kr" + KS.g.length); if (row) { row.classList.remove("shk"); void row.offsetWidth; row.classList.add("shk"); } $g("kmsg").textContent = "Kurang huruf. Perlu 5 huruf."; buzz(30); return; }
    $g("kmsg").textContent = ""; KS.g.push(KS.cur); KS.cur = ""; kataPaint(true); beep(520, 0.08); var last = KS.g[KS.g.length - 1], win = last === KS.w;
    if (win || KS.g.length >= 6) { KS.over = true; later(function () { kataEnd(win); }, 1300); }
    return;
  } else if (KS.cur.length < 5 && /^[A-Z]$/.test(k)) KS.cur += k;
  kataPaint();
}
function kataEnd(win) {
  var n = KS.g.length, w = KS.w, daily = KS.daily, gs = KS.g.slice();
  if (daily) { G.kata[today()] = {t: n, w: win ? 1 : 0, g: gs}; var ks = Object.keys(G.kata).sort(); while (ks.length > 30) delete G.kata[ks.shift()]; }
  var pts = win ? (7 - n) * 5 + (daily ? 10 : 0) : 3;
  fin("kata", {title: win ? (n === 1 ? "Luar biasa, sekali tebak!" : "Betul! Dalam " + n + " tebakan") : "Belum berhasil", stars: win ? (n <= 2 ? 3 : n <= 4 ? 2 : 1) : 0,
    sub: win ? "Kata: <b>" + w + "</b>." : "Katanya: <b>" + w + "</b>. " + (daily ? "Besok ada kata baru." : "Coba lagi!"), pts: pts, bk: "w", bv: win ? 1 : 0, share: kataShareTxt(gs, w, daily), again: function () { kataStart(false); }});
}

/* ---------- Tangkap Berkas (arcade) ---------- */
function tangkapStart() {
  stopAll(); ping("tangkap"); $g("gmt").textContent = "Tangkap Berkas";
  view(bar("Tangkap Berkas", 'Skor <b id="ts">0</b> &middot; Nyawa <b id="tn">3</b> &middot; Waktu <b id="tt">45</b>') +
    '<p class="sys">Geser map biru (jari, mouse, atau tombol panah) untuk menangkap berkas. Hindari berkas merah. Stempel emas bernilai besar, jam pasir menambah waktu. Tangkap beruntun untuk kombo hingga x4.</p>' +
    '<div class="tg"><canvas id="tgc" role="img" aria-label="Area permainan Tangkap Berkas"></canvas><div class="tg-ov" id="tgo"><b>Siap?</b><button type="button" class="send" data-m="tgstart">Mulai</button></div></div>' +
    '<div class="btns" style="justify-content:center"><button type="button" class="btn tg-b" data-d="-1" aria-label="Geser kiri">&larr; Kiri</button><button type="button" class="btn tg-b" data-d="1" aria-label="Geser kanan">Kanan &rarr;</button></div>');
  var c = $g("tgc"), x = c.getContext("2d"), W = 360, H = 480, dpr = Math.min(2, window.devicePixelRatio || 1), PY = H - 58;
  c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  var S = {run: false, t: 45, sc: 0, life: 3, combo: 0, maxC: 0, mult: 1, px: W / 2, tx: W / 2, items: [], fx: [], slow: 0, sp: 0.4, el: 0, shake: 0, key: 0, last: 0, hud: {}}; TG = S;
  function setTx(e) { var r = c.getBoundingClientRect(); S.tx = clamp((e.clientX - r.left) * W / r.width, 40, W - 40); }
  c.addEventListener("pointerdown", function (e) { try { c.setPointerCapture(e.pointerId); } catch (x2) {} setTx(e); });
  c.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || e.buttons) setTx(e); });
  [].forEach.call(document.querySelectorAll(".tg-b"), function (b) {
    b.onpointerdown = function () { S.key = +b.dataset.d; }; b.onpointerup = b.onpointerleave = b.onpointercancel = function () { S.key = 0; };
  });
  function rr(a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function pop(px, py, col, txt) { S.fx.push({x: px, y: py, vy: -50, l: 0.8, t: txt, c: col}); if (!RM) for (var i = 0; i < 6; i++) S.fx.push({x: px, y: py, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, l: 0.5, c: col, g: 1}); }
  function spawn() {
    var r = Math.random(), bad = Math.min(0.3, 0.16 + S.el * 0.003), t = r < bad ? "bad" : r < bad + 0.07 ? "stamp" : r < bad + 0.12 ? "sand" : "doc";
    S.items.push({t: t, x: 26 + Math.random() * (W - 52), y: -24, v: 120 + S.el * 3.2 + Math.random() * 70, a: Math.random() * 0.6 - 0.3});
  }
  function update(dt) {
    S.el += dt; S.t -= dt; if (S.slow > 0) S.slow -= dt; var k = S.slow > 0 ? 0.6 : 1;
    if (S.key) S.tx = clamp(S.tx + S.key * 380 * dt, 40, W - 40);
    S.px += (S.tx - S.px) * Math.min(1, dt * 14); if (S.shake > 0) S.shake -= dt;
    S.sp -= dt; if (S.sp <= 0) { S.sp = Math.max(0.34, 0.85 - S.el * 0.011); spawn(); }
    for (var i = S.items.length - 1; i >= 0; i--) {
      var it = S.items[i]; it.y += it.v * k * dt;
      if (it.y > PY - 12 && it.y < PY + 18 && Math.abs(it.x - S.px) < 44) {
        S.items.splice(i, 1);
        if (it.t === "doc" || it.t === "stamp") { S.combo++; S.maxC = Math.max(S.maxC, S.combo); S.mult = Math.min(4, 1 + Math.floor(S.combo / 5)); var g = (it.t === "stamp" ? 30 : 10) * S.mult; S.sc += g; pop(it.x, PY - 10, it.t === "stamp" ? "#ffd75e" : "#9fd0ff", "+" + g); beep(480 + Math.min(S.combo, 12) * 30, 0.07); if (it.t === "stamp") buzz(15); }
        else if (it.t === "sand") { S.t = Math.min(60, S.t + 4); S.slow = 4; pop(it.x, PY - 10, "#5eead4", "+4 dtk"); beep(700, 0.12); }
        else { S.life--; S.combo = 0; S.mult = 1; S.shake = 0.3; pop(it.x, PY - 10, "#ff8a80", "-1 nyawa"); beep(160, 0.2, "square"); buzz(90); }
      } else if (it.y > H + 24) { if (it.t === "doc" || it.t === "stamp") { S.combo = 0; S.mult = 1; } S.items.splice(i, 1); }
    }
    for (i = S.fx.length - 1; i >= 0; i--) { var f = S.fx[i]; f.l -= dt; f.x += (f.vx || 0) * dt; f.y += f.vy * dt; if (f.g) f.vy += 400 * dt; if (f.l <= 0) S.fx.splice(i, 1); }
  }
  function item(it) {
    x.save(); x.translate(it.x, it.y); x.rotate(it.a);
    if (it.t === "doc") { x.fillStyle = "#fff"; rr(-14, -17, 28, 34, 4); x.fill(); x.fillStyle = "#1a46b5"; rr(-14, -17, 28, 8, 4); x.fill(); x.fillStyle = "#b8c7e6"; x.fillRect(-9, -4, 18, 3); x.fillRect(-9, 3, 18, 3); x.fillRect(-9, 10, 11, 3); }
    else if (it.t === "stamp") { x.fillStyle = "#ffb800"; x.beginPath(); x.arc(0, 0, 16, 0, 6.3); x.fill(); x.strokeStyle = "#fff4c2"; x.lineWidth = 2.5; x.stroke(); x.fillStyle = "#7a4b00"; x.font = "bold 20px system-ui,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("\u2605", 0, 1); }
    else if (it.t === "sand") { x.fillStyle = "#14b8a6"; x.beginPath(); x.moveTo(-12, -15); x.lineTo(12, -15); x.lineTo(0, 0); x.closePath(); x.fill(); x.beginPath(); x.moveTo(-12, 15); x.lineTo(12, 15); x.lineTo(0, 0); x.closePath(); x.fill(); x.fillStyle = "#fff"; x.fillRect(-14, -18, 28, 4); x.fillRect(-14, 14, 28, 4); }
    else { x.fillStyle = "#ef4444"; rr(-14, -17, 28, 34, 4); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 3.5; x.lineCap = "round"; x.beginPath(); x.moveTo(-7, -7); x.lineTo(7, 7); x.moveTo(7, -7); x.lineTo(-7, 7); x.stroke(); }
    x.restore();
  }
  function draw() {
    x.save(); if (S.shake > 0) x.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, S.slow > 0 ? "#0b4a5c" : "#0f2a63"); gr.addColorStop(1, "#1a46b5"); x.fillStyle = gr; x.fillRect(-10, -10, W + 20, H + 20);
    x.fillStyle = "rgba(255,255,255,.08)"; [[10, 330, 40, 150], [60, 280, 34, 200], [105, 350, 46, 130], [160, 300, 30, 180], [200, 340, 50, 140], [260, 290, 36, 190], [305, 330, 44, 150]].forEach(function (b) { x.fillRect(b[0], b[1], b[2], b[3]); });
    S.items.forEach(item);
    x.fillStyle = "#ffb800"; x.beginPath(); x.moveTo(S.px - 44, PY); x.lineTo(S.px + 44, PY); x.lineTo(S.px + 34, PY + 20); x.lineTo(S.px - 34, PY + 20); x.closePath(); x.fill(); x.fillStyle = "#fff4c2"; x.fillRect(S.px - 44, PY - 3, 88, 5);
    S.fx.forEach(function (f) { x.globalAlpha = Math.max(0, Math.min(1, f.l * 1.6)); if (f.t) { x.fillStyle = f.c; x.font = "bold 15px system-ui,sans-serif"; x.textAlign = "center"; x.fillText(f.t, f.x, f.y); } else { x.fillStyle = f.c; x.fillRect(f.x, f.y, 4, 4); } }); x.globalAlpha = 1;
    if (S.mult > 1) { x.fillStyle = "#ffd75e"; x.font = "bold 22px system-ui,sans-serif"; x.textAlign = "left"; x.fillText("x" + S.mult + " kombo " + S.combo, 12, 30); }
    if (S.slow > 0) { x.fillStyle = "#5eead4"; x.font = "bold 13px system-ui,sans-serif"; x.textAlign = "right"; x.fillText("Waktu melambat", W - 12, 28); }
    x.restore();
    var h = S.hud, v = {ts: S.sc, tn: S.life, tt: Math.max(0, Math.ceil(S.t))};
    for (var k in v) if (h[k] !== v[k]) { h[k] = v[k]; var el = $g(k); if (el) el.textContent = v[k]; }
  }
  function endG() {
    var sc = S.sc, st = sc >= 350 ? 3 : sc >= 180 ? 2 : 1; TG = null;
    fin("tangkap", {title: S.life <= 0 ? "Nyawa habis!" : "Waktu habis!", stars: st, sub: "Skor <b>" + sc + "</b> &middot; kombo terbaik " + S.maxC + ". Rekor Anda: " + Math.max(G.best.t || 0, sc) + ".", pts: Math.round(sc / 12) + 5, bk: "t", bv: sc, m: {tmax: sc},
      share: "Saya mencetak skor " + sc + " di Tangkap Berkas, Ruang Main Takok Pelayanan Suroboyo. Berani menandingi?\n" + location.origin, again: tangkapStart});
  }
  TGGO = function () {
    if (S.run) return; S.run = true; $g("tgo").hidden = true; S.last = performance.now(); var r = RUN;
    (function loop(ts) { if (r !== RUN || root.hidden) return; var dt = Math.min(0.05, Math.max(0, (ts - S.last) / 1000)); S.last = ts; update(dt); draw(); if (S.t <= 0 || S.life <= 0) { endG(); return; } requestAnimationFrame(loop); })(S.last);
  };
  draw();
}

/* ---------- Kuis Suroboyo ---------- */
var SQ = [
  {q: "Hari Pahlawan diperingati setiap tanggal berapa?", o: ["10 November", "17 Agustus", "28 Oktober", "2 Mei"], a: 0, e: "Hari Pahlawan, 10 November, mengenang Pertempuran Surabaya tahun 1945."},
  {q: "Surabaya dijuluki sebagai kota apa?", o: ["Kota Pahlawan", "Kota Kembang", "Kota Gudeg", "Kota Hujan"], a: 0, e: "Surabaya dijuluki Kota Pahlawan karena peristiwa 10 November 1945."},
  {q: "Bersama ikan sura, hewan apa yang menjadi lambang Kota Surabaya?", o: ["Buaya", "Harimau", "Gajah", "Elang"], a: 0, e: "Lambang Surabaya menampilkan ikan sura dan buaya (boyo), dari legenda asal nama kota."},
  {q: "Siapa tokoh yang pidato radionya mengobarkan semangat pejuang Surabaya pada November 1945?", o: ["Bung Tomo", "Ki Hajar Dewantara", "Cut Nyak Dien", "Pattimura"], a: 0, e: "Sutomo, dikenal sebagai Bung Tomo, berpidato lewat radio untuk membangkitkan semangat rakyat."},
  {q: "Jembatan yang menghubungkan Surabaya dengan Pulau Madura bernama?", o: ["Suramadu", "Ampera", "Barelang", "Mahakam"], a: 0, e: "Jembatan Nasional Suramadu membentang di atas Selat Madura."},
  {q: "Pelabuhan besar di utara Surabaya bernama?", o: ["Tanjung Perak", "Tanjung Priok", "Merak", "Belawan"], a: 0, e: "Pelabuhan Tanjung Perak adalah pelabuhan utama Surabaya."},
  {q: "Bandara Juanda yang melayani Surabaya secara administratif berada di kabupaten mana?", o: ["Sidoarjo", "Gresik", "Mojokerto", "Lamongan"], a: 0, e: "Bandara Internasional Juanda berada di Kabupaten Sidoarjo, berbatasan dengan Surabaya."},
  {q: "Pada rujak cingur, \"cingur\" berasal dari bagian apa?", o: ["Moncong sapi", "Kaki ayam", "Telinga kambing", "Ekor ikan"], a: 0, e: "Cingur berarti moncong (hidung dan mulut) sapi yang direbus lalu diiris."},
  {q: "Sapaan akrab untuk lelaki di Surabaya, seperti pada \"Cak Takok\", adalah?", o: ["Cak", "Kang", "Bang", "Daeng"], a: 0, e: "\"Cak\" lazim dipakai di Jawa Timur. Untuk perempuan muda biasanya \"Ning\"."},
  {q: "Tugu Pahlawan dibangun untuk mengenang pertempuran pada tahun?", o: ["1945", "1928", "1908", "1965"], a: 0, e: "Tugu Pahlawan mengenang Pertempuran Surabaya, 10 November 1945."},
  {q: "Selat apa yang memisahkan Surabaya dari Pulau Madura?", o: ["Selat Madura", "Selat Sunda", "Selat Bali", "Selat Makassar"], a: 0, e: "Selat Madura ada di antara Pulau Jawa bagian timur dan Pulau Madura."},
  {q: "Surabaya adalah ibu kota provinsi apa?", o: ["Jawa Timur", "Jawa Barat", "Jawa Tengah", "Banten"], a: 0, e: "Surabaya adalah ibu kota Provinsi Jawa Timur."},
  {q: "Lontong dengan kerang kecil dan kuah petis, khas Surabaya, disebut?", o: ["Lontong kupang", "Gudeg", "Papeda", "Soto Betawi"], a: 0, e: "Lontong kupang memakai kupang, kerang kecil yang banyak ditemukan di pesisir timur Jawa."},
  {q: "Kapal selam yang dijadikan monumen di Surabaya (Monkasel) bernama?", o: ["KRI Pasopati", "KRI Dewaruci", "KRI Nanggala", "KRI Bima Suci"], a: 0, e: "Monumen Kapal Selam memakai KRI Pasopati yang sudah purna tugas."}
];
function suroStart() {
  stopAll(); ping("suro"); $g("gmt").textContent = "Kuis Suroboyo";
  var Q = shuffle(SQ).slice(0, 5), i = 0, skor = 0, benar = 0, run = 0, SEC = 18;
  function ask() {
    var q = Q[i], opts = shuffle(q.o.map(function (t, n) { return {t: t, ok: n === q.a}; })), done = false, t0 = Date.now();
    view(bar("Kuis Suroboyo", 'Soal <b>' + (i + 1) + '</b> dari 5 &middot; Benar <b>' + benar + '</b>' + (run >= 2 ? ' &middot; &#128293; ' + run + ' beruntun' : '')) + '<div class="qq"><div class="qt" aria-hidden="true"><i id="qb"></i></div><p>' + esc(q.q) + '</p><div id="qo" style="display:grid;gap:8px">' +
      opts.map(function (o, n) { return '<button type="button" class="qo" data-o="' + n + '"><i>' + "ABCD"[n] + '</i>' + esc(o.t) + '</button>'; }).join("") + '</div><div id="qf" aria-live="polite"></div></div>');
    var b2 = $g("qb"); b2.style.transform = "scaleX(1)"; void b2.offsetWidth; b2.style.transitionDuration = SEC + "s"; b2.style.transform = "scaleX(0)";
    function answer(pick) {
      if (done) return; done = true; var p = opts[pick], ok = !!(p && p.ok), left = Math.max(0, SEC - (Date.now() - t0) / 1000);
      b2.style.transition = "none"; b2.style.transform = "scaleX(" + (left / SEC) + ")";
      [].forEach.call(document.querySelectorAll("#qo .qo"), function (b) { b.disabled = true; var o = opts[+b.dataset.o]; if (o.ok) b.classList.add("good"); else if (+b.dataset.o === pick) b.classList.add("bad"); });
      if (ok) { benar++; run++; skor += 4 + (left > 12 ? 2 : left > 6 ? 1 : 0) + (run >= 3 ? 2 : 0); beep(660, 0.12); buzz(20); } else { run = 0; beep(180, 0.2, "square"); buzz(70); }
      $g("qf").innerHTML = '<p style="margin:6px 0"><b>' + (ok ? "Tepat!" : p ? "Kurang tepat." : "Waktu habis.") + '</b> ' + esc(q.e) + '</p><div class="btns"><button type="button" class="send" data-m="next">' + (i === 4 ? "Lihat hasil" : "Soal berikutnya") + '</button></div>';
      NEXT = function () { if (++i < 5) ask(); else { var st = benar === 5 ? 3 : benar >= 3 ? 2 : 1; fin("suro", {title: benar + " dari 5 benar", stars: st, sub: benar === 5 ? "Arek Suroboyo asli! Pengetahuan Anda tentang Kota Pahlawan luar biasa." : "Makin sering main, makin kenal Kota Pahlawan.", pts: skor + 5, bk: "su", bv: benar, m: {suro: benar}, again: suroStart}); } };
    }
    $g("qo").onclick = function (e) { var b = e.target.closest(".qo"); if (b) answer(+b.dataset.o); };
    later(function () { answer(-1); }, SEC * 1000);
  }
  ask();
}

document.addEventListener("keydown", function (e) {
  if (root.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (KS && !KS.over) { var k = e.key; if (/^[a-zA-Z]$/.test(k)) { kataKey(k.toUpperCase()); e.preventDefault(); } else if (k === "Enter") { kataKey("#"); e.preventDefault(); } else if (k === "Backspace") { kataKey("<"); e.preventDefault(); } }
  else if (TG && TG.run) { if (e.key === "ArrowLeft") { TG.key = -1; e.preventDefault(); } else if (e.key === "ArrowRight") { TG.key = 1; e.preventDefault(); } }
});
document.addEventListener("keyup", function (e) { if (TG && (e.key === "ArrowLeft" || e.key === "ArrowRight")) TG.key = 0; });

/* ---------- Klik di dalam overlay ---------- */
$g("gmb").addEventListener("click", function (e) {
  var b = e.target.closest("[data-g],[data-c],[data-m],[data-kk]"); if (!b) return;
  if (b.dataset.kk) { kataKey(b.dataset.kk); b.blur(); return; }
  if (b.dataset.g) { var g = b.dataset.g; if (g === "cocok") cocokMenu(); else if (g === "susun") susunStart(); else if (g === "urut") urutStart(); else if (g === "kuis") kuisStart(); else if (g === "kata") kataStart(true); else if (g === "tangkap") tangkapStart(); else if (g === "suro") suroStart(); else if (g === "roda") rodaStart(); }
  else if (b.dataset.c) cocokStart(+b.dataset.c);
  else if (b.dataset.m === "home") home();
  else if (b.dataset.m === "again") { if (AGAIN) AGAIN(); else home(); }
  else if (b.dataset.m === "next") { if (NEXT) NEXT(); }
  else if (b.dataset.m === "open") { var k = b.dataset.k; closeGM(); if (window.openKey) openKey(k); }
  else if (b.dataset.m === "share" || b.dataset.m === "kshare") { if (SHARE) shareTxt(SHARE); }
  else if (b.dataset.m === "kfree") kataStart(false);
  else if (b.dataset.m === "spin") rodaSpin();
  else if (b.dataset.m === "tgstart") { if (TGGO) TGGO(); }
});

/* ---------- Banner + maskot ---------- */
if ($g("mbgo")) $g("mbgo").onclick = openGM;
top();
var MS = $g("mas"), MB = $g("masb");
if (MS) MS.onclick = function () { if (window.openAsisten) window.openAsisten(); };
if (MB) {
  var msgs = [], h = new Date().getHours();
  try { h = wibDate(0).getHours(); } catch (e) {}
  msgs.push("Selamat " + (h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam") + "! Mau urus apa hari ini?");
  try {
    var d = wibDate(0), m = d.getMonth(), dd = d.getDate();
    if (m === 10 && dd <= 10) msgs.unshift(dd === 10 ? "Selamat Hari Pahlawan! Mari melayani dengan semangat arek Suroboyo." : (10 - dd) + " hari lagi Hari Pahlawan, 10 November. Semangat melayani!");
  } catch (e) {}
  msgs.push("Pesan jadwal lewat Booking Kunjungan supaya tidak antre lama.", "Ketuk saya untuk ngobrol dengan Asisten Takok.", "Bosan menunggu? Coba Ruang Main di bawah!", "Status permohonan bisa dicek kapan saja.");
  var mi = 0; MB.textContent = msgs[0];
  setInterval(function () { if (document.hidden) return; mi = (mi + 1) % msgs.length; MB.textContent = msgs[mi]; }, 7000);
}
})();
