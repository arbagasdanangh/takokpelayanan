"use strict";
/* Versi 10: fitur "wow" untuk Asisten Takok dan chat pemohon. Murni di browser, tanpa server/AI luar. */
(function () {
var $w = function (i) { return document.getElementById(i); };
var RM = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
var SRc = window.SpeechRecognition || window.webkitSpeechRecognition;
function dl(name, txt) { try { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], {type: "text/plain;charset=utf-8"})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (x) {} }
function tg(m) { if (window.toast) toast(m); }

/* ===== Palet pencarian cepat (Ctrl+K) ===== */
var ACT = [["Tanya Asisten Takok", "bf"], ["Booking kunjungan", "t8"], ["Tanya admin", "t5"], ["Status permohonan", "t7"], ["Buat pengaduan", "t6"], ["Survei kepuasan", "t9"], ["Ruang Main (permainan)", "mbgo"], ["Ganti tema", "th"]];
var PI = 0, PR = [];
function palClose() { var o = $w("wk"); if (o) o.remove(); }
function palList(q) {
  q = (q || "").trim(); PR = [];
  if (q.length > 1 && window.LOCS) {
    var tk = toks(q), R = [];
    LOCS.forEach(function (l) { (LD[l.id] || []).forEach(function (d) { var s = score(d, tk); if (s > 0) R.push({s: s, t: d[1], sub: l.nm, k: l.id + "_" + d[0]}); }); });
    R.sort(function (a, b) { return b.s - a.s; });
    R.slice(0, 6).forEach(function (r) { PR.push({t: r.t, sub: r.sub, ic: "\uD83D\uDCCD", run: function () { openKey(r.k); }}); });
  }
  ACT.forEach(function (a) { if (!q || a[0].toLowerCase().indexOf(q.toLowerCase()) > -1) PR.push({t: a[0], sub: "Menu", ic: "\u26A1", run: function () { var e = $w(a[1]); if (e) e.click(); }}); });
  if (PI >= PR.length) PI = 0;
  $w("wkl").innerHTML = PR.length ? PR.map(function (r, i) { return '<li role="option" data-i="' + i + '"' + (i === PI ? ' class="on" aria-selected="true"' : "") + '><span>' + r.ic + '</span><b>' + esc(r.t) + '</b><small>' + esc(r.sub) + '</small></li>'; }).join("") : '<li class="no">Tidak ada yang cocok. Coba kata lain, atau tanya Asisten.</li>';
}
function palGo(i) { var r = PR[i]; if (r) { palClose(); r.run(); } }
function pal() {
  if ($w("wk")) { palClose(); return; }
  var o = document.createElement("div"); o.id = "wk"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Pencarian cepat");
  o.innerHTML = '<div class="wkb"><input id="wki" placeholder="Cari loket atau menu... (Esc untuk tutup)" autocomplete="off" aria-label="Cari cepat"><ul id="wkl" role="listbox"></ul><small>\u2191\u2193 pilih &middot; Enter buka &middot; Ctrl+K</small></div>';
  document.body.appendChild(o); PI = 0; palList("");
  var i = $w("wki"); i.focus();
  i.addEventListener("input", function () { PI = 0; palList(i.value); });
  i.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); PI = (PI + 1) % Math.max(PR.length, 1); palList(i.value); }
    else if (e.key === "ArrowUp") { e.preventDefault(); PI = (PI - 1 + PR.length) % Math.max(PR.length, 1); palList(i.value); }
    else if (e.key === "Enter") { e.preventDefault(); palGo(PI); }
  });
  o.addEventListener("click", function (e) { var li = e.target.closest("li[data-i]"); if (li) palGo(+li.dataset.i); else if (e.target === o) palClose(); });
}
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal(); }
  else if (e.key === "Escape" && $w("wk")) palClose();
});

/* ===== Asisten: efek mengetik, saran lanjutan, perintah /, simpan chat, konfeti ===== */
var SG = [
  [/nib|usaha|oss|umkm|kbli/, [["Daftar dokumen NIB", "syarat dokumen nib"], ["Booking kunjungan", "booking kunjungan"], ["Lokasi & jam", "lokasi dan jam buka"]]],
  [/sip|dokter|bidan|klinik|apoteker/, [["Daftar dokumen SIP", "syarat dokumen sip"], ["Booking kunjungan", "booking kunjungan"]]],
  [/pbg|imb|slf|bangunan|rumah/, [["Daftar dokumen PBG", "syarat dokumen pbg"], ["Booking kunjungan", "booking kunjungan"]]],
  [/status|progres/, [["Tiket antrean saya", "tiket saya"], ["Booking kunjungan", "booking kunjungan"]]],
  [/mpp|zona|instansi/, [["Lokasi & jam", "lokasi dan jam buka"], ["Booking kunjungan", "booking kunjungan"]]]
], SGD = [["Cek status permohonan", "status permohonan saya"], ["Booking kunjungan", "booking kunjungan"], ["Berita terbaru", "berita terbaru"]];
var CMD = [["/status", "Cek status permohonan", "status permohonan saya"], ["/antrean", "Tiket antrean saya", "tiket saya"], ["/dokumen", "Daftar dokumen", "syarat dokumen"], ["/adu", "Buat pengaduan", "buat pengaduan"], ["/mpp", "Instansi di MPP", "daftar instansi mpp"], ["/jam", "Lokasi dan jam buka", "lokasi dan jam buka"], ["/berita", "Berita terbaru", "berita terbaru"]];
var lastQ = "";
function typeIt(p) {
  var t = p.textContent; if (RM || t.length < 12 || t.length > 420) return;
  var i = 0, m = $w("bm"); p.textContent = ""; p.classList.add("wtw");
  (function step() { i = Math.min(t.length, i + 3); p.textContent = t.slice(0, i); m.scrollTop = m.scrollHeight; if (i < t.length) setTimeout(step, 16); else p.classList.remove("wtw"); })();
}
function onMsg(n) {
  if (n.nodeType !== 1 || !n.classList.contains("bmsg") || n.classList.contains("typ") || n.dataset.w) return;
  n.dataset.w = "1";
  if (n.classList.contains("u")) { lastQ = n.textContent.toLowerCase(); return; }
  var p = n.querySelector(":scope > p"); if (p) typeIt(p);
  if (!lastQ || n.querySelector(".bfb,.ckl")) return;
  var s = SGD; SG.forEach(function (g) { if (s === SGD && g[0].test(lastQ)) s = g[1]; });
  n.insertAdjacentHTML("beforeend", '<div class="bch sg"><span>Lanjut:</span>' + s.map(function (x) { return '<button type="button" data-b="q:' + esc(x[1]) + '">' + esc(x[0]) + '</button>'; }).join("") + '</div>');
}
function cmdUI() {
  var i = $w("bi"), bin = i.parentNode, box = document.createElement("div"); box.className = "wcmd"; box.hidden = true; bin.parentNode.insertBefore(box, bin);
  i.addEventListener("input", function () {
    var v = i.value.toLowerCase(); if (v.charAt(0) !== "/") { box.hidden = true; return; }
    var L = CMD.filter(function (c) { return c[0].indexOf(v) === 0 || v === "/"; }); box.hidden = !L.length;
    box.innerHTML = L.map(function (c) { return '<button type="button" data-q="' + esc(c[2]) + '"><b>' + c[0] + '</b> ' + esc(c[1]) + '</button>'; }).join("");
  });
  box.addEventListener("click", function (e) { var b = e.target.closest("button[data-q]"); if (!b) return; i.value = b.dataset.q; box.hidden = true; $w("b-s").click(); });
}
function saveChat() {
  var m = $w("bm"), o = ["Percakapan dengan Asisten Takok", new Date().toLocaleString("id-ID"), ""];
  [].forEach.call(m.querySelectorAll(".bmsg:not(.typ)"), function (d) { var c = d.cloneNode(true); [].forEach.call(c.querySelectorAll("button,.bch,.bfb"), function (x) { x.remove(); }); var t = c.textContent.trim(); if (t) o.push((d.classList.contains("u") ? "Saya: " : "Asisten: ") + t); });
  dl("percakapan-asisten-takok.txt", o.join("\n\n"));
}
function botInit() {
  var m = $w("bm"); if (!m || m.dataset.w) return false; m.dataset.w = "1";
  new MutationObserver(function (ml) { ml.forEach(function (r) { [].forEach.call(r.addedNodes, onMsg); }); }).observe(m, {childList: true});
  cmdUI();
  var h = document.querySelector(".bhb"), x = $w("b-x");
  if (h && x) { var b = document.createElement("button"); b.type = "button"; b.title = "Simpan percakapan (.txt)"; b.textContent = "Simpan"; b.onclick = saveChat; h.insertBefore(b, x); }
  $w("bp").addEventListener("change", function (e) {
    var c = e.target; if (!c.matches || !c.matches("input[data-c]")) return;
    var w = c.closest(".bc2"); if (!w) return;
    var a = w.querySelectorAll("input[data-c]"), all = a.length > 0 && [].every.call(a, function (z) { return z.checked; });
    if (all && !w.dataset.done) { w.dataset.done = "1"; try { if (window.konfeti) konfeti(); } catch (z) {} m.insertAdjacentHTML("beforeend", '<div class="bmsg b" data-w="1"><p>Lengkap! \uD83C\uDF89 Semua berkas sudah siap. Tinggal booking jadwalnya.</p><div class="bch"><button type="button" data-b="q:booking kunjungan">Booking sekarang</button></div></div>'); m.scrollTop = m.scrollHeight; }
    if (!all) delete w.dataset.done;
  });
  return true;
}

/* ===== Chat pemohon: draf otomatis, dikte suara, templat, emoji, unduh, salin ===== */
var TPL = [["Syarat", "Mohon info syarat dan dokumen yang harus dibawa untuk "], ["Biaya", "Berapa biaya dan berapa lama proses untuk "], ["Nomor", "Nomor permohonan saya: "]], EM = ["\uD83D\uDE4F", "\uD83D\uDC4D", "\u2705"];
var REC2 = null;
function ins(ta, s) { var a = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, a) + s + ta.value.slice(ta.selectionEnd || a); ta.focus(); ta.dispatchEvent(new Event("input", {bubbles: true})); }
function enh(ta) {
  ta.dataset.w = "1"; var key = "tkw_d:" + ta.dataset.k, tb = document.createElement("div"); tb.className = "wtb";
  try { var d = localStorage.getItem(key); if (d && !ta.value) { ta.value = d; ta.dispatchEvent(new Event("input", {bubbles: true})); tb.dataset.r = "1"; } } catch (x) {}
  ta.addEventListener("input", function () { try { if (ta.value) localStorage.setItem(key, ta.value); else localStorage.removeItem(key); } catch (x) {} });
  tb.innerHTML = (tb.dataset.r ? '<span class="wdr">Draf dipulihkan</span>' : "") + TPL.map(function (t, i) { return '<button type="button" data-t="' + i + '">' + t[0] + '</button>'; }).join("") + EM.map(function (e) { return '<button type="button" class="em" data-e="' + e + '" aria-label="Sisipkan ' + e + '">' + e + '</button>'; }).join("") + (SRc ? '<button type="button" data-mic="1" aria-label="Dikte suara">\uD83C\uDFA4 Dikte</button>' : "") + '<button type="button" data-dl="1">Unduh chat</button>';
  ta.insertAdjacentElement("afterend", tb);
  tb.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.t) ins(ta, TPL[+b.dataset.t][1]);
    else if (b.dataset.e) ins(ta, b.dataset.e);
    else if (b.dataset.dl) { var th = ta.closest(".qa"), o = ["Percakapan dengan admin Takok", ""]; [].forEach.call(th ? th.querySelectorAll(".thread .m") : [], function (m) { var c = m.cloneNode(true), s = c.querySelector("small"), w = s ? s.textContent : ""; if (s) s.remove(); o.push("[" + w + "] " + c.textContent.trim()); }); dl("percakapan-admin-takok.txt", o.join("\n\n")); }
    else if (b.dataset.mic) {
      if (REC2) { REC2.stop(); return; }
      try { REC2 = new SRc(); REC2.lang = "id-ID"; b.classList.add("on"); REC2.onresult = function (ev) { ins(ta, ev.results[0][0].transcript + " "); }; REC2.onend = REC2.onerror = function () { REC2 = null; b.classList.remove("on"); }; REC2.start(); } catch (x) { REC2 = null; b.classList.remove("on"); }
    }
  });
}
document.addEventListener("click", function (e) {
  var s = e.target.closest && e.target.closest('[data-act="send"]');
  if (s) { var ta = s.closest(".qf"); ta = ta && ta.querySelector("textarea"); if (ta) setTimeout(function () { if (!ta.value) { try { localStorage.removeItem("tkw_d:" + ta.dataset.k); } catch (x) {} } }, 400); return; }
  var m = e.target.closest && e.target.closest(".thread .m");
  if (m && !window.getSelection().toString()) { var c = m.cloneNode(true), sm = c.querySelector("small"); if (sm) sm.remove(); try { navigator.clipboard.writeText(c.textContent.trim()); tg("Pesan disalin."); } catch (x) {} }
});
var raf = 0;
function scan() { raf = 0; botInit(); [].forEach.call(document.querySelectorAll('.qf textarea[data-k^="q:"]:not([data-w])'), enh); }
new MutationObserver(function () { if (!raf) raf = requestAnimationFrame(scan); }).observe(document.body, {childList: true, subtree: true});

/* tombol pencarian cepat di bilah atas */
var tl = document.querySelector(".tools");
if (tl) { var kb = document.createElement("button"); kb.className = "btn"; kb.type = "button"; kb.textContent = "Cari cepat"; kb.title = "Ctrl+K"; kb.onclick = pal; tl.insertBefore(kb, tl.firstChild.nextSibling); }
scan();
})();
