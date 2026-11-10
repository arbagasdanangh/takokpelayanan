"use strict";
/* v13: fitur pintar untuk Kata cari chatbot dan pertanyaan warga.
   1) Pertanyaan belum terjawab dikelompokkan (varian serupa digabung, diurut prioritas, ditandai bila sudah tercakup aturan lain)
   2) Saran kata kunci otomatis + cek kualitas tiap aturan
   3) Jadikan jawaban admin di Kotak masuk sebagai aturan chatbot (satu ketuk)
   4) Chatbot: "Maksud Anda...?" untuk salah ketik */
(function () {
var $k = function (i) { return document.getElementById(i); };
function toks(s) { return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && !(window.KSTOP && KSTOP[w]) && !/\d{5,}/.test(w); }); }
function sim(a, b) {
  if (!a.length || !b.length) return false;
  var inter = a.filter(function (x) { return b.indexOf(x) > -1; }).length;
  return inter / Math.min(a.length, b.length) >= 0.8 && inter / (a.length + b.length - inter) >= 0.5;
}

/* ===== 1. Pertanyaan belum terjawab: dikelompokkan ===== */
var GRP = [];
function group(list) {
  var G = [];
  list.forEach(function (m, idx) {
    var t = toks(m.q), g = null;
    for (var i = 0; i < G.length; i++) if (sim(G[i].tk, t)) { g = G[i]; break; }
    if (!g) { g = {tk: t, n: 0, items: []}; G.push(g); }
    g.items.push({m: m, idx: idx}); g.n += m.n || 1;
    if (t.length > g.tk.length) g.tk = t;
  });
  G.forEach(function (g) { g.items.sort(function (a, b) { return (b.m.n || 0) - (a.m.n || 0); }); });
  return G.sort(function (a, b) { return b.n - a.n; });
}
function missHtml() {
  var h = '<div class="card ktm-card"><b>Pertanyaan warga yang belum terjawab</b><p class="sys" style="margin:0">Dicatat tanpa identitas (angka panjang, nomor HP, dan email dibuang). Pertanyaan yang mirip digabung dan diurutkan dari yang paling sering ditanyakan. Ubah menjadi aturan agar warga berikutnya langsung dapat jawaban.</p>';
  if (!KMISS.length) return h + '<div class="sys">Belum ada pertanyaan yang tercatat.</div></div>';
  GRP = group(KMISS);
  var tot = KMISS.reduce(function (s, m) { return s + (m.n || 1); }, 0);
  return h + '<p class="ktm-sum"><b>' + tot + '</b> pertanyaan &middot; <b>' + GRP.length + '</b> topik</p>' + GRP.slice(0, 12).map(function (g, gi) {
    var rep = g.items[0].m, hit = window.kataHit ? kataHit(rep.q, KR) : null, ix = hit && hit.i && hit.i.length ? hit.i[0] : -1;
    return '<div class="ktm2' + (g.n >= 3 ? ' hot' : '') + '"><div class="ktm2-t"><span class="ktq">&ldquo;' + esc(rep.q) + '&rdquo;</span><span class="tag ktn">' + g.n + '&times;</span>' + (g.n >= 3 ? '<span class="ktpri">Prioritas</span>' : '') + '</div>' +
      (g.items.length > 1 ? '<small class="sys">Varian: ' + g.items.slice(1, 4).map(function (x) { return esc(x.m.q); }).join(" &middot; ") + (g.items.length > 4 ? " &middot; +" + (g.items.length - 4) : "") + '</small>' : '') +
      (ix > -1 ? '<small class="ktm2-w">Mungkin sudah tercakup aturan #' + (ix + 1) + '. <button type="button" class="ktlink" data-kgo="' + ix + '">Lihat</button></small>' : '') +
      '<div class="ktm2-a"><button type="button" class="btn pri" data-kmg="' + gi + '">Buat aturan</button><button type="button" class="btn" data-kxg="' + gi + '">Abaikan</button></div></div>';
  }).join("") + '<div class="btns" style="margin-top:8px">' + (GRP.length > 12 ? '<span class="sys">Menampilkan 12 topik teratas dari ' + GRP.length + '.</span>' : "") + '<button type="button" class="btn" id="kt-xa">Abaikan semua</button></div></div>';
}
if (typeof ktMissHtml === "function") window.ktMissHtml = missHtml;

/* ===== 2. Saran kata kunci + cek kualitas ===== */
var SGS = {silakan: 1, membawa: 1, datang: 1, ketentuan: 1, sesuai: 1, untuk: 1, dapat: 1, akan: 1, harus: 1, dengan: 1, kemudian: 1, melalui: 1, setelah: 1, sebelum: 1, pada: 1, yang: 1, tidak: 1, adalah: 1, atau: 1, serta: 1, lama: 1, baru: 1, bawa: 1, mohon: 1, proses: 1, lalu: 1, juga: 1, bisa: 1, jika: 1, apabila: 1, petugas: 1, biaya: 1, layanan: 1, loket: 1, mengurus: 1, pengurusan: 1};
function suggest(c) {
  var sel = c.querySelector("[data-kt]"), raw = c.querySelector("[data-kj]").value, nm = sel && sel.value && window.ktName ? ktName(sel.value) : "", f = {}, m, re;
  toks(raw + " " + nm).forEach(function (w) { if (w.length >= 4 && !SGS[w]) f[w] = (f[w] || 0) + 1; });
  re = /\b[A-Z]{3,6}\b/g; while ((m = re.exec(raw))) { var a = m[0].toLowerCase(); if (!SGS[a]) f[a] = (f[a] || 0) + 3; }
  re = /[a-z,;] ([A-Z][a-z]{3,})/g; while ((m = re.exec(raw))) { var b = m[1].toLowerCase(); if (!SGS[b]) f[b] = (f[b] || 0) + 2; }
  var have = {}; c.querySelector("[data-kw]").value.toLowerCase().split(/[,;\n]/).forEach(function (w) { have[w.trim()] = 1; });
  return Object.keys(f).filter(function (w) { return !have[w]; }).sort(function (x, y) { return f[y] - f[x] || y.length - x.length; }).slice(0, 6);
}
function quality(c) {
  var kw = c.querySelector("[data-kw]").value.split(/[,;\n]/).filter(function (w) { return w.trim().length >= 2; }).length, jw = c.querySelector("[data-kj]").value.trim(), lk = c.querySelector("[data-kt]").value, w = [];
  if (kw < 2) w.push("Tambah kata kunci (minimal 2 variasi)");
  if (jw.length < 40) w.push("Jawaban masih sangat singkat");
  else if (!/\n/.test(jw) && jw.length > 220) w.push("Jawaban panjang, pecah jadi poin atau langkah");
  if (!lk) w.push("Belum ada loket tujuan (opsional)");
  return w;
}
function decorate(c) {
  var body = c.querySelector(".kt-body"); if (!body) return;
  if (!body.querySelector(".kt-q")) {
    body.insertAdjacentHTML("afterbegin", '<div class="kt-q"></div>');
    var lab = body.querySelector('label[for^="kw"]');
    if (lab) lab.insertAdjacentHTML("afterend", '<div class="kt-sg"><button type="button" class="btn" data-ksg="1">&#10024; Saran kata kunci</button><span class="kt-sgl"></span></div>');
  }
  var w = quality(c), q = body.querySelector(".kt-q");
  q.className = "kt-q " + (w.length ? "warn" : "ok"); q.innerHTML = w.length ? w.map(function (x) { return '<span>&#9888; ' + esc(x) + '</span>'; }).join("") : '<span>&#10003; Aturan lengkap dan siap dipakai</span>';
}
var rafL = 0;
function decAll() { rafL = 0; [].forEach.call(document.querySelectorAll("#ktl .kt"), decorate); }
document.addEventListener("input", function (e) { if (e.target.closest && e.target.closest("#ktl .kt")) { var c = e.target.closest(".kt"); clearTimeout(c._qt); c._qt = setTimeout(function () { decorate(c); }, 250); } });
document.addEventListener("change", function (e) { var c = e.target.closest && e.target.closest("#ktl .kt"); if (c) decorate(c); });
new MutationObserver(function () { if (!rafL && $k("ktl")) rafL = requestAnimationFrame(decAll); }).observe(document.body, {childList: true, subtree: true});

/* ===== 3. Jadikan jawaban admin sebagai aturan chatbot ===== */
function plain(m) { var c = m.cloneNode(true); [].forEach.call(c.querySelectorAll("small,.macts,.mrx,.mrv"), function (z) { z.remove(); }); return c.textContent.trim(); }
function fromReply(q, reply, kunci) {
  var tries = 0, t = setInterval(function () {
    if (++tries > 30) { clearInterval(t); return; }
    if (!$k("ktl") || typeof KR === "undefined") return;
    clearInterval(t);
    ktRead(); var kw = toks(q).slice(0, 4);
    KR.push({k: kw, t: kunci && window.entryOf && entryOf(kunci) ? [kunci] : [], j: String(reply).slice(0, 1500), _o: true, _n: true});
    ktDirty(true); ktGoto(KR.length - 1, true); ktSumAll();
    toast("Aturan dibuat dari jawaban Anda. Periksa kata kunci dan hapus data pribadi, lalu tekan Simpan.");
  }, 150);
}
window.kpFromReply = fromReply;
function addBtns() {
  [].forEach.call(document.querySelectorAll("#v-adm .thread .m.me:not(.dl) .macts"), function (a) {
    if (!a.querySelector("[data-kjadi]")) a.insertAdjacentHTML("beforeend", '<button type="button" data-kjadi="1" title="Simpan jawaban ini sebagai aturan Kata cari chatbot">&#10024; Jadikan aturan chatbot</button>');
  });
}
var rafA = 0;
new MutationObserver(function () { if (!rafA) rafA = requestAnimationFrame(function () { rafA = 0; addBtns(); }); }).observe(document.body, {childList: true, subtree: true});

/* ===== klik ===== */
document.addEventListener("click", async function (e) {
  var t = e.target; if (!t.closest) return;
  var j = t.closest("[data-kjadi]");
  if (j) {
    var m = j.closest(".m"), p = m.previousElementSibling;
    while (p && !(p.classList.contains("m") && !p.classList.contains("me") && !p.classList.contains("dl"))) p = p.previousElementSibling;
    var q = p ? plain(p) : "", kunci = window.SEL ? SEL.kunci : "";
    var b = document.querySelector('#atabs [data-at="kt"]'); if (b) b.click();
    fromReply(q, plain(m), kunci); return;
  }
  var sg = t.closest("[data-ksg]");
  if (sg) {
    var c = sg.closest(".kt"), s = suggest(c), l = c.querySelector(".kt-sgl");
    l.innerHTML = s.length ? s.map(function (w) { return '<button type="button" class="tag ktadd" data-kadd="' + esc(w) + '">+ ' + esc(w) + '</button>'; }).join("") : '<small class="sys">Tidak ada saran baru. Tulis jawaban dulu agar saran muncul.</small>'; return;
  }
  var ad = t.closest("[data-kadd]");
  if (ad) { var c2 = ad.closest(".kt"), i = c2.querySelector("[data-kw]"); i.value = (i.value.trim() ? i.value.trim().replace(/,\s*$/, "") + ", " : "") + ad.dataset.kadd; ad.remove(); i.dispatchEvent(new Event("input", {bubbles: true})); decorate(c2); return; }
  if (typeof AT === "undefined" || AT !== "kt") return;
  var go = t.closest("[data-kgo]"); if (go) { ktGoto(+go.dataset.kgo, true); return; }
  var mk = t.closest("[data-kmg]");
  if (mk) { var g = GRP[+mk.dataset.kmg]; if (!g) return; var kw = [], seen = {}; g.items.slice(0, 3).forEach(function (x) { ktSaran(x.m.q).forEach(function (w) { if (!seen[w] && !/\d{5,}/.test(w)) { seen[w] = 1; kw.push(w); } }); }); ktAdd(kw.slice(0, 6)); return; }
  var xg = t.closest("[data-kxg]");
  if (xg) {
    var g2 = GRP[+xg.dataset.kxg]; if (!g2) return; xg.disabled = true;
    try { var qs = g2.items.map(function (x) { return x.m.q; }); await api("/api/admin/miss/hapus", {qs: qs}); ktRead(); KMISS = KMISS.filter(function (m) { return qs.indexOf(m.q) < 0; }); ktDraw(); } catch (z) { err(z.message); xg.disabled = false; }
  }
});

/* ===== Tab admin: gulir otomatis ke tab aktif di HP ===== */
document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#atabs")) setTimeout(function () { var a = document.querySelector('#atabs [aria-pressed="true"]'); if (a && a.scrollIntoView) a.scrollIntoView({inline: "center", block: "nearest", behavior: "smooth"}); }, 60); });

/* ===== 4. Chatbot: "Maksud Anda...?" ===== */
function lev(a, b) { var m = a.length, n = b.length, d = [], i, j; for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) d[0][j] = j; for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)); return d[m][n]; }
var VC = null, VN = -1;
function vocab() {
  var K = window.KATA || [], n = K.length + Object.keys(window.LD || {}).length; if (VC && VN === n) return VC; VN = n; VC = {};
  K.forEach(function (r) { (r.k || []).forEach(function (k) { String(k).toLowerCase().split(/[^a-z0-9]+/).forEach(function (w) { if (w.length >= 4 && !VC[w]) VC[w] = String(k).toLowerCase(); }); }); });
  Object.keys(window.LD || {}).forEach(function (l) { LD[l].forEach(function (d) { String(d[1]).toLowerCase().split(/[^a-z0-9]+/).forEach(function (w) { if (w.length >= 4 && !VC[w]) VC[w] = String(d[1]).toLowerCase(); }); }); });
  return VC;
}
function dym(q) {
  var V = vocab(), W = Object.keys(V), out = [], seen = {};
  String(q).toLowerCase().split(/[^a-z0-9]+/).forEach(function (t) {
    if (t.length < 4 || V[t]) return; var best = null, bd = 9, lim = t.length <= 5 ? 1 : 2;
    W.forEach(function (w) { if (Math.abs(w.length - t.length) > lim) return; var d = lev(t, w); if (d <= lim && d < bd) { bd = d; best = w; } });
    if (best && !seen[V[best]]) { seen[V[best]] = 1; out.push(V[best]); }
  });
  return out.slice(0, 3);
}
window.kpDym = dym;
function fullTxt(n) { var p = n.querySelector(":scope > p"); return (p && p.dataset.full) || n.textContent; }
function botWatch() {
  var m = $k("bm"); if (!m || m.dataset.kp) return false; m.dataset.kp = "1"; var lastU = "";
  new MutationObserver(function (ml) { ml.forEach(function (r) { [].forEach.call(r.addedNodes, function (n) {
    if (n.nodeType !== 1 || !n.classList.contains("bmsg")) return;
    if (n.classList.contains("u")) { lastU = n.textContent; return; }
    if (!lastU || n.dataset.dym || !/belum menemukan/i.test(fullTxt(n))) return; n.dataset.dym = "1";
    var s = dym(lastU); if (s.length) { var row = '<div class="bch sg dym"><span>Maksud Anda:</span>' + s.map(function (x) { return '<button type="button" data-b="q:' + esc(x) + '">' + esc(x) + '</button>'; }).join("") + '</div>', ex = n.querySelector(".bch.sg"); if (ex) ex.insertAdjacentHTML("beforebegin", row); else n.insertAdjacentHTML("beforeend", row); }
  }); }); }).observe(m, {childList: true});
  return true;
}
var bt = setInterval(function () { if (botWatch()) clearInterval(bt); }, 500); setTimeout(function () { clearInterval(bt); }, 20000);
})();
