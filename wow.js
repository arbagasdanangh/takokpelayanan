"use strict";
/* Versi 10: fitur "wow" untuk Asisten Takok dan chat pemohon. Murni di browser, tanpa server/AI luar. */
(function () {
var $w = function (i) { return document.getElementById(i); };
var RM = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
var SRc = window.SpeechRecognition || window.webkitSpeechRecognition;
function dl(name, txt) { try { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], {type: "text/plain;charset=utf-8"})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (x) {} }
function tg(m) { if (window.toast) toast(m); }

/* ===== Palet pencarian cepat (Ctrl+K) ===== */
var ACT = [["Tanya Asisten Takok", "bf"], ["Booking kunjungan", "t8"], ["Tanya admin", "t5"], ["Status permohonan", "t7"], ["Buat pengaduan", "t6"], ["Survei kepuasan", "t9"], ["Ruang Main (permainan)", "mbgo"], ["Bangun Usaha 3D (animasi KBLI)", "mbusaha"], ["Ganti tema", "th"]];
var PI = 0, PR = [];
function recents() { try { var a = JSON.parse(localStorage.getItem("tk_rs") || "[]"); return Array.isArray(a) ? a.slice(0, 5) : []; } catch (x) { return []; } }
function rec(q) { q = (q || "").trim(); if (q.length < 3) return; try { var a = recents().filter(function (x) { return x !== q; }); a.unshift(q); localStorage.setItem("tk_rs", JSON.stringify(a.slice(0, 5))); } catch (x) {} }
function palDetail(r) {
  rec(($w("wki") || {}).value); PR = []; $w("wkl").innerHTML = '<li class="kd" role="presentation"><button type="button" class="btn" data-pd="back">&larr; Kembali</button>' + KBLI.detailHtml(r) + '</li>';
}
function palClose() { var o = $w("wk"); if (o) o.remove(); }
function palList(q) {
  q = (q || "").trim(); PR = [];
  var kO = /^kbli\b/i.test(q), kq = q.replace(/^kbli\s*/i, "").trim(), K = window.KBLI;
  if (K && (kO || /^\d{5}$/.test(q) || q.length > 2)) {
    if (K.has()) { if (kq.length > 1 || kO && kq) K.search(kq, kO ? 10 : 3).forEach(function (r) { PR.push({t: r[0] + " \u00B7 " + r[1], sub: "KBLI" + (r[3] ? " \u00B7 risiko " + r[3].toLowerCase() : ""), ic: "\uD83D\uDCBC", keep: true, run: function () { palDetail(r); }}); }); }
    else if (kO || /^\d{5}$/.test(q)) PR.push({t: "Cari KBLI di OSS", sub: "Data KBLI belum dimuat di Takok", ic: "\uD83D\uDCBC", run: function () { window.open("https://oss.go.id", "_blank", "noopener"); }});
  }
  if (/^tkt-?\d/i.test(q) && window.TKT) window.TKT.filter(function (t) { return t.no.toLowerCase().indexOf(q.toLowerCase()) >= 0; }).slice(0, 5).forEach(function (t) { PR.push({t: t.no, sub: label(t.kunci) + " \u00B7 " + t.status, ic: "\uD83C\uDFAB", run: function () { openKey(t.kunci); }}); });
  if (!q) recents().forEach(function (x) { PR.push({t: x, sub: "Pencarian terakhir", ic: "\uD83D\uDD58", keep: true, run: function () { var i = $w("wki"); i.value = x; PI = 0; palList(x); i.focus(); }}); });
  if (kO && PR.length) { if (PI >= PR.length) PI = 0; return palDraw(); }
  if (q.length > 1 && window.LOCS) {
    var tk = toks(q), R = [];
    LOCS.forEach(function (l) { (LD[l.id] || []).forEach(function (d) { var s = score(d, tk); if (s > 0) R.push({s: s, t: d[1], sub: l.nm, k: l.id + "_" + d[0]}); }); });
    R.sort(function (a, b) { return b.s - a.s; });
    R.slice(0, 6).forEach(function (r) { PR.push({t: r.t, sub: r.sub, ic: "\uD83D\uDCCD", run: function () { openKey(r.k); }}); });
  }
  ACT.forEach(function (a) { if (!q || a[0].toLowerCase().indexOf(q.toLowerCase()) > -1) PR.push({t: a[0], sub: "Menu", ic: "\u26A1", run: function () { var e = $w(a[1]); if (e) e.click(); }}); });
  if (PI >= PR.length) PI = 0; palDraw();
}
function palDraw() {
  var q = ($w("wki") || {}).value || "";
  $w("wkl").innerHTML = PR.length ? PR.map(function (r, i) { return '<li role="option" data-i="' + i + '"' + (i === PI ? ' class="on" aria-selected="true"' : "") + '><span>' + r.ic + '</span><b>' + esc(r.t) + '</b><small>' + esc(r.sub) + '</small></li>'; }).join("") : '<li class="no">Tidak ada yang cocok. Coba kata lain, atau tanya Asisten.</li>';
}
function palGo(i) { var r = PR[i]; if (r) { if (r.keep) { r.run(); return; } rec($w("wki") ? $w("wki").value : ""); palClose(); r.run(); } }
function pal() {
  if ($w("wk")) { palClose(); return; }
  var o = document.createElement("div"); o.id = "wk"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Pencarian cepat");
  o.innerHTML = '<div class="wkb"><input id="wki" placeholder="Cari loket, menu, atau KBLI (mis. kbli warung kopi)..." autocomplete="off" aria-label="Cari cepat"><ul id="wkl" role="listbox"></ul><small>\u2191\u2193 pilih &middot; Enter buka &middot; Ctrl+K</small></div>';
  document.body.appendChild(o); PI = 0; palList("");
  var i = $w("wki"); i.focus();
  i.addEventListener("input", function () { PI = 0; palList(i.value); });
  i.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); PI = (PI + 1) % Math.max(PR.length, 1); palList(i.value); }
    else if (e.key === "ArrowUp") { e.preventDefault(); PI = (PI - 1 + PR.length) % Math.max(PR.length, 1); palList(i.value); }
    else if (e.key === "Enter") { e.preventDefault(); palGo(PI); }
  });
  o.addEventListener("click", function (e) { if (e.target.closest("[data-pd=back]")) { palList(i.value); i.focus(); return; } var li = e.target.closest("li[data-i]"); if (li) palGo(+li.dataset.i); else if (e.target === o) palClose(); });
}
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal(); }
  else if (e.key === "Escape" && $w("wk")) palClose();
});

/* ===== Asisten: efek mengetik, saran lanjutan, perintah /, simpan chat, konfeti ===== */
var SG = [
  [/nib|usaha|oss|umkm|kbli/, [["Cari kode KBLI", "kbli"], ["Daftar dokumen NIB", "syarat dokumen nib"], ["Booking kunjungan", "booking kunjungan"], ["Lokasi & jam", "lokasi dan jam buka"]]],
  [/sip|dokter|bidan|klinik|apoteker/, [["Daftar dokumen SIP", "syarat dokumen sip"], ["Booking kunjungan", "booking kunjungan"]]],
  [/pbg|imb|slf|bangunan|rumah/, [["Daftar dokumen PBG", "syarat dokumen pbg"], ["Booking kunjungan", "booking kunjungan"]]],
  [/status|progres/, [["Tiket antrean saya", "tiket saya"], ["Booking kunjungan", "booking kunjungan"]]],
  [/mpp|zona|instansi/, [["Lokasi & jam", "lokasi dan jam buka"], ["Booking kunjungan", "booking kunjungan"]]]
], SGD = [["Cek status permohonan", "status permohonan saya"], ["Booking kunjungan", "booking kunjungan"], ["Berita terbaru", "berita terbaru"]];
var CMD = [["/tiket", "Cek status tiket pertanyaan saya", "tiket saya"], ["/pandu", "Cek kesiapan berkas (kuis singkat)", "cek kesiapan"], ["/rencana", "Susun rencana kunjungan", "rencana kunjungan"], ["/progres", "Progres daftar dokumen saya", "progres dokumen"], ["/tanya", "Kirim pertanyaan ke loket dari chat", "/tanya"], ["/sepi", "Cek jam paling sepi", "jam sepi"], ["/kbli", "Cari kode KBLI", "kbli"], ["/tersimpan", "Daftar KBLI saya", "kbli tersimpan"], ["/ringkas", "Kirim ringkasan chat ke admin", "ringkas percakapan"], ["/status", "Cek status permohonan", "status permohonan saya"], ["/antrean", "Tiket antrean saya", "tiket saya"], ["/dokumen", "Daftar dokumen", "syarat dokumen"], ["/adu", "Buat pengaduan", "buat pengaduan"], ["/mpp", "Instansi di MPP", "daftar instansi mpp"], ["/jam", "Lokasi dan jam buka", "lokasi dan jam buka"], ["/berita", "Berita terbaru", "berita terbaru"]];
var lastQ = "";
function typeIt(p) {
  var t = p.textContent; if (RM || t.length < 12 || t.length > 420) return;
  var i = 0, m = $w("bm"); p.dataset.full = t; p.textContent = ""; p.classList.add("wtw");
  (function step() { i = Math.min(t.length, i + 3); p.textContent = t.slice(0, i); m.scrollTop = m.scrollHeight; if (i < t.length) setTimeout(step, 16); else p.classList.remove("wtw"); })();
}
function onMsg(n) {
  if (n.nodeType !== 1 || !n.classList.contains("bmsg") || n.classList.contains("typ") || n.dataset.w) return;
  n.dataset.w = "1";
  if (n.classList.contains("u")) { n.title = "Ketuk untuk mengubah dan kirim ulang"; lastQ = n.textContent.toLowerCase(); return; }
  var p = n.querySelector(":scope > p"); if (p) typeIt(p);
  if (!lastQ || n.querySelector(".bfb,.ckl,.nosg")) return;
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
  cmdUI(); hRestore(m);
  new MutationObserver(hLater).observe(m, {childList: true, subtree: false});
  var bq = $w("bq"); if (bq) bq.insertAdjacentHTML("beforeend", '<button type="button" data-wb="clr">Hapus riwayat</button>');
  $w("bp").addEventListener("click", function (e) {
    var c = e.target.closest("[data-wb]"); if (c) { hClear(); return; }
    var u = e.target.closest(".bmsg.u"); if (u && !window.getSelection().toString()) { var i = $w("bi"); i.value = u.textContent; i.focus(); }
  });
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
var TPL = [["Syarat", "Mohon info syarat dan dokumen yang harus dibawa untuk "], ["Biaya", "Berapa biaya dan berapa lama proses untuk "], ["Nomor", "Nomor permohonan saya: "]], QR2 = [["Terima kasih \uD83D\uDE4F", "Terima kasih atas balasannya. \uD83D\uDE4F"], ["Sudah jelas \u2705", "Baik, sudah jelas. Terima kasih. \u2705"], ["Masih bingung", "Maaf, saya masih kurang paham. Mohon dijelaskan dengan lebih sederhana."]], EM = ["\uD83D\uDE4F", "\uD83D\uDC4D", "\u2705"];
var REC2 = null;
function ins(ta, s) { var a = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, a) + s + ta.value.slice(ta.selectionEnd || a); ta.focus(); ta.dispatchEvent(new Event("input", {bubbles: true})); }
function enh(ta) {
  ta.dataset.w = "1"; var key = "tkw_d:" + ta.dataset.k, tb = document.createElement("div"); tb.className = "wtb";
  try { var d = localStorage.getItem(key); if (d && !ta.value) { ta.value = d; ta.dispatchEvent(new Event("input", {bubbles: true})); tb.dataset.r = "1"; } } catch (x) {}
  ta.addEventListener("input", function () { try { if (ta.value) localStorage.setItem(key, ta.value); else localStorage.removeItem(key); } catch (x) {} });
  tb.innerHTML = (tb.dataset.r ? '<span class="wdr">Draf dipulihkan</span>' : "") + TPL.map(function (t, i) { return '<button type="button" data-t="' + i + '">' + t[0] + '</button>'; }).join("") + EM.map(function (e) { return '<button type="button" class="em" data-e="' + e + '" aria-label="Sisipkan ' + e + '">' + e + '</button>'; }).join("") + (SRc ? '<button type="button" data-mic="1" aria-label="Dikte suara">\uD83C\uDFA4 Dikte</button>' : "") + '<button type="button" data-dl="1">Unduh chat</button><button type="button" data-sr="1">Cari</button>';
  ta.insertAdjacentElement("afterend", tb); if (window.askPlus) askPlus(ta, tb); edApply(ta); pinDraw(ta.closest(".qa"), ta.dataset.k.slice(2));
  var ms = ta.closest(".qa") ? ta.closest(".qa").querySelectorAll(".thread .m") : [], lm = ms[ms.length - 1];
  if (lm && !lm.classList.contains("me") && !lm.classList.contains("dl")) tb.insertAdjacentHTML("afterbegin", QR2.map(function (q, i) { return '<button type="button" class="qr" data-q2="' + i + '">' + q[0] + '</button>'; }).join(""));
  tb.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.sr) { var q = prompt("Cari kata dalam percakapan ini (kosongkan untuk menampilkan semua):"); var th2 = ta.closest(".qa"); if (q === null || !th2) return; q = q.toLowerCase(); [].forEach.call(th2.querySelectorAll(".thread .m"), function (m) { m.hidden = !!q && m.textContent.toLowerCase().indexOf(q) < 0; }); if (q) tg("Menampilkan pesan yang memuat \u201C" + q + "\u201D."); return; }
    if (b.dataset.q2) ins(ta, QR2[+b.dataset.q2][1]);
    else if (b.dataset.t) ins(ta, TPL[+b.dataset.t][1]);
    else if (b.dataset.e) ins(ta, b.dataset.e);
    else if (b.dataset.dl) { var th = ta.closest(".qa"), o = ["Percakapan dengan admin Takok", ""]; [].forEach.call(th ? th.querySelectorAll(".thread .m") : [], function (m) { var c = m.cloneNode(true), s = c.querySelector("small"), w = s ? s.textContent : ""; [].forEach.call(c.querySelectorAll("small,.macts,.mrx,.mrv"), function (x) { x.remove(); }); o.push("[" + w + "] " + c.textContent.trim()); }); dl("percakapan-admin-takok.txt", o.join("\n\n")); }
    else if (b.dataset.mic) {
      if (REC2) { REC2.stop(); return; }
      try { REC2 = new SRc(); REC2.lang = "id-ID"; b.classList.add("on"); REC2.onresult = function (ev) { ins(ta, ev.results[0][0].transcript + " "); }; REC2.onend = REC2.onerror = function () { REC2 = null; b.classList.remove("on"); }; REC2.start(); } catch (x) { REC2 = null; b.classList.remove("on"); }
    }
  });
}
document.addEventListener("click", function (e) {
  var s = e.target.closest && e.target.closest('[data-act="send"]');
  if (s) { var ta = s.closest(".qf"); ta = ta && ta.querySelector("textarea"); if (ta) setTimeout(function () { if (!ta.value) { try { localStorage.removeItem("tkw_d:" + ta.dataset.k); } catch (x) {} } }, 400); return; }
  var m = e.target.closest && e.target.closest(".thread .m:not(.dl)");
  if (m && !e.target.closest("button") && !window.getSelection().toString()) { var c = m.cloneNode(true); [].forEach.call(c.querySelectorAll("small,.macts,.mrx,.mrv"), function (x) { x.remove(); }); try { navigator.clipboard.writeText(c.textContent.trim()); tg("Pesan disalin."); } catch (x) {} }
});
var raf = 0;
function scan() { raf = 0; botInit(); [].forEach.call(document.querySelectorAll('.qf textarea[data-k^="q:"]:not([data-w])'), enh); }
new MutationObserver(function () { if (!raf) raf = requestAnimationFrame(scan); }).observe(document.body, {childList: true, subtree: true});

/* ===== CRUD pesan: ubah, hapus, reaksi, sematkan ===== */
var ED = null, STRIP = "small,.macts,.mrx,.mrv";
function plain(m) { var c = m.cloneNode(true); [].forEach.call(c.querySelectorAll(STRIP), function (z) { z.remove(); }); return c.textContent.trim(); }
function edApply(ta) {
  var qf = ta && ta.closest(".qf"); if (!qf) return;
  var old = qf.querySelector(".wed"); if (old) old.remove();
  var sb = qf.querySelector('[data-act="send"],#rs'), on = ED && (ED.adm ? ta.id === "rt" : ta.dataset.k === "q:" + ED.k);
  if (sb) sb.textContent = on ? "Simpan perubahan" : (ta.id === "rt" ? "Kirim jawaban" : "Kirim");
  if (on) ta.insertAdjacentHTML("beforebegin", '<div class="wed">Mengubah pesan. Versi sebelumnya tetap terlihat oleh lawan bicara sebagai riwayat revisi. <button type="button" data-wed="x">Batal</button></div>');
}
function edStop(ta) { var p = ED ? ED.prev : ""; ED = null; if (ta) { ta.value = p || ""; ta.dispatchEvent(new Event("input", {bubbles: true})); edApply(ta); } }
function pins(k) { try { return JSON.parse(localStorage.getItem("tkw_pin:" + k) || "[]"); } catch (x) { return []; } }
function pinDraw(qa, k) {
  if (!qa) return; var o = qa.querySelector(".wpin"); if (o) o.remove();
  var L = pins(k), th = qa.querySelector(".thread"); if (!L.length || !th) return;
  th.insertAdjacentHTML("beforebegin", '<div class="wpin"><b>\uD83D\uDCCC Pesan penting</b>' + L.map(function (p) { return '<div>' + esc(p.t.length > 200 ? p.t.slice(0, 200) + "..." : p.t) + ' <button type="button" data-act="munpin" data-id="' + p.id + '" data-n="' + esc(k) + '" aria-label="Lepas sematan">\u00D7</button></div>'; }).join("") + '</div>');
}
document.addEventListener("click", async function (e) {
  var t = e.target; if (!t.closest) return;
  var x = t.closest("[data-wed]");
  if (x) { edStop(ED && ED.adm ? $("rt") : x.closest(".qa").querySelector("textarea")); return; }
  var b = t.closest('[data-act="medit"],[data-act="mdel"],[data-act="mre"],[data-act="mpin"],[data-act="munpin"]');
  if (b) {
    var act = b.dataset.act, adm = !!b.dataset.adm, qa = b.closest(".qa"), ta = adm ? $("rt") : (qa && qa.querySelector("textarea"));
    try {
      if (act === "mre") { await api("/api/pesan/reaksi", {kunci: b.dataset.n, id: +b.dataset.id, e: b.classList.contains("on") ? "" : b.dataset.e}); SIG = ""; await tick(); return; }
      if (act === "mpin" || act === "munpin") {
        var k = b.dataset.n, L = pins(k), id = +b.dataset.id, has = L.some(function (p) { return p.id === id; });
        if (act === "munpin" || has) L = L.filter(function (p) { return p.id !== id; }); else if (L.length >= 5) { tg("Maksimal 5 pesan penting."); return; } else L.push({id: id, t: plain(b.closest(".m"))});
        try { localStorage.setItem("tkw_pin:" + k, JSON.stringify(L)); } catch (z) {}
        pinDraw(qa, k); tg(has || act === "munpin" ? "Sematan dilepas." : "Pesan disematkan di atas percakapan."); return;
      }
      if (!ta) return;
      if (act === "medit") { ED = {k: b.dataset.n, id: +b.dataset.id, adm: adm, pid: adm && window.SEL ? SEL.pid : 0, prev: ED ? ED.prev : ta.value}; ta.value = plain(b.closest(".m")); ta.dispatchEvent(new Event("input", {bubbles: true})); edApply(ta); ta.focus(); ta.scrollIntoView({block: "center"}); }
      else if (!b.dataset.c) { b.dataset.c = "1"; b.textContent = "Yakin hapus?"; b.classList.add("warn"); setTimeout(function () { b.dataset.c = ""; b.textContent = "Hapus"; b.classList.remove("warn"); }, 3500); }
      else {
        b.disabled = true;
        await api(adm ? "/api/admin/pesan/hapus" : "/api/pesan/hapus", adm ? {pid: SEL.pid, kunci: b.dataset.n, id: +b.dataset.id} : {kunci: b.dataset.n, id: +b.dataset.id});
        if (ED && ED.id === +b.dataset.id) edStop(ta);
        if (adm) { ASIG = ""; SM.sig = ""; } SIG = ""; await tick(); tg("Pesan dihapus.");
      }
    } catch (z) { err(z.message); tg(z.message); if (b) b.disabled = false; }
    return;
  }
  var sb = t.closest('[data-act="send"],#rs'); if (!sb || !ED) return;
  if (ED.adm ? sb.id !== "rs" : sb.dataset.n !== ED.k) return;
  e.stopImmediatePropagation(); e.preventDefault();
  var ta2 = sb.closest(".qf").querySelector("textarea"), v = clean(ta2.value); if (!v) return;
  if (!ED.adm) { var g = guard(v, ED.k); if (g) { err(g); return; } }
  sb.disabled = true;
  try {
    await api(ED.adm ? "/api/admin/pesan/ubah" : "/api/pesan/ubah", ED.adm ? {pid: ED.pid, kunci: ED.k, id: ED.id, isi: v} : {kunci: ED.k, id: ED.id, isi: v});
    var adm2 = ED.adm; edStop(ta2); if (adm2) { ASIG = ""; SM.sig = ""; } SIG = ""; await tick(); tg("Pesan diubah.");
  } catch (z) { err(z.message); tg(z.message); }
  sb.disabled = false;
}, true);

/* ===== Riwayat chatbot (hanya bila belum masuk akun) ===== */
var HK = "tkw_h";
function hSave() {
  try {
    var m = $w("bm"); if (!m) return;
    if (window.S === "user" || window.S === "adm") { localStorage.removeItem(HK); return; }
    var n = [].filter.call(m.children, function (d) { return d.classList.contains("bmsg") && !d.classList.contains("typ") && !d.querySelector(".wtw"); }).slice(-40);
    if (n.length > 1) localStorage.setItem(HK, JSON.stringify({t: Date.now(), h: n.map(function (d) { return d.outerHTML; }).join("")}));
  } catch (x) {}
}
function hRestore(m) {
  try {
    var o = JSON.parse(localStorage.getItem(HK) || "null"); if (!o || Date.now() - o.t > 43200000 || m.children.length) return;
    m.innerHTML = o.h; [].forEach.call(m.children, function (d) { d.dataset.w = "1"; });
    var ck = JSON.parse(localStorage.getItem("tkb_ck") || "{}");
    [].forEach.call(m.querySelectorAll("input[data-c]"), function (i) { var a = i.dataset.c.split(":"); i.checked = !!(ck[a[0]] && ck[a[0]][a[1]]); });
    m.insertAdjacentHTML("afterbegin", '<div class="bmsg b" data-w="1"><p class="sys">Percakapan sebelumnya dipulihkan.</p></div>'); m.scrollTop = m.scrollHeight;
  } catch (x) {}
}
var ht = 0;
function hLater() { clearTimeout(ht); ht = setTimeout(hSave, 1500); }
function hClear() { try { localStorage.removeItem(HK); } catch (x) {} var m = $w("bm"); if (m) m.innerHTML = ""; }

/* tombol pencarian cepat di bilah atas */
var tl = document.querySelector(".tools");
if (tl) { var kb = document.createElement("button"); kb.className = "btn"; kb.type = "button"; kb.textContent = "Cari cepat"; kb.title = "Ctrl+K"; kb.onclick = pal; tl.insertBefore(kb, tl.firstChild.nextSibling); }
scan();
})();
