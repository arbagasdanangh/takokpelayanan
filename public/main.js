"use strict";
/* Versi 9: Ruang Main (permainan bentuk), konfeti, maskot. Tanpa library, tanpa data pribadi.
   Poin, lencana, dan skor terbaik hanya tersimpan di perangkat (localStorage). Server hanya menghitung jumlah permainan secara anonim. */
(function () {
var G = {pts: 0, plays: 0, gp: {}, best: {}, days: [], badges: {}, sound: 0}, KEY = "tk_game9";
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
  {id: "pahlawan", n: "Pahlawan Layanan", d: "Capai Level 5", s: "bulan", ok: function () { return lvl() >= 5; }}
];

/* ---------- Overlay ---------- */
var root = document.createElement("div");
root.className = "gm"; root.id = "gm"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Ruang Main Takok");
root.innerHTML = '<div class="gm-top"><b id="gmt">Ruang Main</b><span class="gm-pts" id="gmp"></span><button class="btn" type="button" id="gms" aria-pressed="false">Suara: mati</button><button class="btn" type="button" id="gmx">Tutup</button></div><div class="gm-in" id="gmb"></div>';
document.body.appendChild(root);
var $g = function (i) { return document.getElementById(i); }, RUN = 0, TM = null, TO = [], opener = null, hist = false;
function stopAll() { RUN++; clearInterval(TM); TM = null; TO.forEach(clearTimeout); TO = []; }
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
  var lv = lvl(), pr = G.pts % 100, st = streak(), t = TITLES[Math.min(lv - 1, TITLES.length - 1)];
  var cards = [
    ["cocok", ["lingkaran", "bintang", "hati"], "Cocok Bentuk", "Buka kartu dan temukan pasangan bentuk yang sama.", (G.best.c1 || G.best.c2 || G.best.c3) ? "Terbaik: " + ["★", "★★", "★★★"][Math.max(G.best.c1 || 0, G.best.c2 || 0, G.best.c3 || 0) - 1] : "Belum dimainkan"],
    ["susun", ["segitiga", "persegi", "segienam"], "Susun Bentuk", "Seret setiap bentuk ke bayangannya yang pas.", G.best.s ? "Terbaik: " + "★★★".slice(0, G.best.s) : "Belum dimainkan"],
    ["urut", ["belah", "plus", "bulan"], "Ingat Urutan", "Ulangi urutan bentuk yang menyala. Makin panjang makin seru.", G.best.u ? "Rekor: " + G.best.u + " urutan" : "Belum dimainkan"],
    ["kuis", ["segilima", "bintang", "lingkaran"], "Kuis Kilat Loket", "Tebak loket yang tepat untuk setiap layanan.", G.best.k !== undefined ? "Terbaik: " + G.best.k + " dari 5" : "Belum dimainkan"]
  ];
  view('<div class="gm-lv"><div class="gm-ring" style="--p:' + pr + '"><span>' + lv + '</span></div><div><small>Level ' + lv + '</small><b>' + t + '</b><small>' + G.pts + ' poin &middot; ' + (100 - pr) + ' poin lagi ke level ' + (lv + 1) + (st >= 2 ? ' &middot; &#128293; ' + st + ' hari beruntun' : '') + '</small></div></div>' +
    '<h2>Pilih permainan</h2><div class="gm-games">' + cards.map(function (c) {
      return '<button type="button" class="gc" data-g="' + c[0] + '"><span class="gi">' + c[1].map(function (k) { return svg(k); }).join("") + '</span><b>' + c[2] + '</b><small>' + c[3] + '</small><em>' + c[4] + '</em></button>';
    }).join("") + '</div><h2>Lencana (' + Object.keys(G.badges).length + ' dari ' + BD.length + ')</h2><div class="gm-badges">' + BD.map(function (b) {
      var on = !!G.badges[b.id];
      return '<div class="bd' + (on ? "" : " off") + '" title="' + b.d + '">' + svg(b.s) + '<b>' + b.n + '</b><span>' + (on ? "Didapat" : b.d) + '</span></div>';
    }).join("") + '</div><p class="sys">Poin, lencana, dan skor terbaik tersimpan di perangkat ini saja dan tidak dikirim ke mana pun. Server hanya menghitung jumlah permainan tanpa identitas.</p>');
}

function fin(g, o) {
  stopAll();
  G.pts += o.pts; G.plays++; G.gp[g] = (G.gp[g] || 0) + 1;
  if (o.bk) G.best[o.bk] = Math.max(G.best[o.bk] || 0, o.bv);
  var d = today(); if (G.days.indexOf(d) < 0) { G.days.push(d); G.days = G.days.slice(-40); }
  var baru = BD.filter(function (b) { if (!G.badges[b.id] && b.ok()) { G.badges[b.id] = d; return true; } return false; });
  save(); top();
  if (o.stars >= 2 || baru.length) window.konfeti(o.stars >= 3 || baru.length ? 70 : 40);
  beep(784, 0.15); setTimeout(function () { beep(988, 0.25); }, 150);
  view('<div class="rs"><h2>' + o.title + '</h2><div class="st" aria-label="' + o.stars + ' dari 3 bintang">' + "★".repeat(o.stars) + '<s>' + "★".repeat(3 - o.stars) + '</s></div><p style="margin:0">' + o.sub + '</p><div class="pl">+' + o.pts + ' poin</div>' +
    (baru.length ? '<div class="gm-badges" style="width:100%">' + baru.map(function (b) { return '<div class="bd">' + svg(b.s) + '<b>Lencana baru!</b><span>' + b.n + '</span></div>'; }).join("") + '</div>' : '') +
    '<div class="btns" style="justify-content:center"><button type="button" class="send" data-m="again">Main lagi</button><button type="button" class="btn" data-m="home">Menu Ruang Main</button></div></div>');
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
    if (!seen[d[1]] && !seen["u:" + nu(d[2])]) { seen[d[1]] = 1; seen["u:" + nu(d[2])] = 1; pool.push({lid: lid, no: d[0], nama: d[1], ur: d[2]}); }  // satu soal per nama dan per uraian, agar jawabannya tidak ambigu
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

/* ---------- Klik di dalam overlay ---------- */
$g("gmb").addEventListener("click", function (e) {
  var b = e.target.closest("[data-g],[data-c],[data-m]"); if (!b) return;
  if (b.dataset.g) { var g = b.dataset.g; if (g === "cocok") cocokMenu(); else if (g === "susun") susunStart(); else if (g === "urut") urutStart(); else if (g === "kuis") kuisStart(); }
  else if (b.dataset.c) cocokStart(+b.dataset.c);
  else if (b.dataset.m === "home") home();
  else if (b.dataset.m === "again") { if (AGAIN) AGAIN(); else home(); }
  else if (b.dataset.m === "next") { if (NEXT) NEXT(); }
  else if (b.dataset.m === "open") { var k = b.dataset.k; closeGM(); if (window.openKey) openKey(k); }
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
