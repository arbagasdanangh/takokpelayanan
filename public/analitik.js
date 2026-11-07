"use strict";
/* Analitik Chat (admin): dasbor, insight otomatis, pertanyaan berulang, dan aksi panel percakapan (label, saran, massal, cari isi). */
var ANH = 30;

/* ---------- Dasbor Analitik Chat ---------- */
function anDur(m) {
  if (m == null) return "-";
  m = Math.round(m);
  return m < 1 ? "<1 mnt" : m < 60 ? m + " mnt" : m < 1440 ? Math.floor(m / 60) + " j " + (m % 60 ? m % 60 + " m" : "") : Math.floor(m / 1440) + " h " + Math.floor((m % 1440) / 60) + " j";
}
function anBar(label, v, mx, extra, neg) {
  var w = mx ? Math.max(2, v / mx * 100) : 0, nw = neg && v ? neg / v * 100 : 0;
  return '<div class="anr"><span class="anl" title="' + esc(label) + '">' + esc(label) + '</span><div class="bar2 anb" role="img" aria-label="' + esc(label) + ': ' + v + '"><i style="width:' + w + '%;background:var(--acc)"><b style="width:' + nw + '%"></b></i></div><b class="anv">' + v + '</b>' + (extra ? '<small class="sys">' + extra + '</small>' : '') + '</div>';
}
function anDaily(h) {
  var W = 640, H = 150, pad = 22, mx = Math.max.apply(null, h.map(function (x) { return Math.max(x.u, x.a); }).concat([1])), n = h.length, bw = (W - pad) / n, o = "";
  h.forEach(function (x, i) {
    var hu = x.u / mx * (H - 24), ha = x.a / mx * (H - 24), x0 = pad + i * bw + bw * 0.12, w = bw * 0.38;
    o += '<g><title>' + esc(x.d) + ': ' + x.u + ' pesan pemohon, ' + x.a + ' balasan admin</title><rect x="' + x0 + '" y="' + (H - 16 - hu) + '" width="' + w + '" height="' + Math.max(hu, x.u ? 2 : 0) + '" rx="2" fill="var(--acc)"/><rect x="' + (x0 + w + 2) + '" y="' + (H - 16 - ha) + '" width="' + w + '" height="' + Math.max(ha, x.a ? 2 : 0) + '" rx="2" fill="var(--tick)"/></g>';
    if (n <= 14 || i % Math.ceil(n / 10) === 0) o += '<text x="' + (pad + i * bw + bw / 2) + '" y="' + (H - 3) + '" text-anchor="middle" font-size="9" fill="var(--mute)">' + esc(x.d) + '</text>';
  });
  o += '<text x="0" y="10" font-size="9" fill="var(--mute)">' + mx + '</text><line x1="' + pad + '" x2="' + W + '" y1="' + (H - 16) + '" y2="' + (H - 16) + '" stroke="var(--line)"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="anc" role="img" aria-label="Pesan per hari">' + o + '</svg>';
}
function anHeat(hm) {
  var mx = 1, d, h, hari = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"], o = '<div class="hm"><span></span>';
  hm.forEach(function (r) { r.forEach(function (v) { if (v > mx) mx = v; }); });
  for (h = 0; h < 24; h++) o += '<small>' + (h % 3 === 0 ? h : "") + '</small>';
  for (d = 0; d < 7; d++) {
    o += '<small class="hd">' + hari[d] + '</small>';
    for (h = 0; h < 24; h++) { var v = hm[d][h]; o += '<i title="' + hari[d] + ' pukul ' + (h < 10 ? "0" : "") + h + '.00: ' + v + ' pesan" style="opacity:' + (v ? (0.18 + 0.82 * v / mx).toFixed(2) : 0.07) + '"></i>'; }
  }
  return o + '</div><p class="sys" style="margin:6px 0 0">Jam WIB. Makin pekat makin banyak pesan pemohon (maksimum ' + mx + ' per jam).</p>';
}
async function aAn(el) {
  var j = await api("/api/admin/analitik?hari=" + ANH), k = j.kpi, tot = j.senti.neg + j.senti.net + j.senti.pos;
  var kp = function (v, t, s) { return '<div class="kpi" style="cursor:default"><span class="kv">' + v + '</span><span>' + t + '</span><small class="sys">' + s + '</small></div>'; };
  var rng = [7, 14, 30, 90].map(function (h) { return '<button type="button" class="chip" data-anh="' + h + '" aria-pressed="' + (h === ANH) + '">' + h + ' hari</button>'; }).join("");
  var mxT = Math.max.apply(null, j.topik.map(function (x) { return x.n; }).concat([1])), mxL = Math.max.apply(null, j.loket.map(function (x) { return x.pesan; }).concat([1])), mxK = Math.max.apply(null, j.kata.map(function (x) { return x.n; }).concat([1]));
  var ins = j.insight.length ? j.insight.map(function (i) { return '<div class="ins ' + (i.nada || "") + '"><span aria-hidden="true">' + i.ikon + '</span><p>' + esc(i.teks) + '</p></div>'; }).join("") : '<div class="empty">Belum cukup data untuk insight. Insight muncul setelah ada beberapa percakapan.</div>';
  var sn = function (v, c, t) { return v ? '<i style="width:' + (v / tot * 100) + '%;background:' + c + '" title="' + t + ': ' + v + '"></i>' : ""; };
  var umur = Object.keys(j.umur).map(function (u, i) { return '<div class="kpi" style="cursor:default;padding:8px 12px"><span class="kv" style="font-size:1.4rem;color:' + (i > 2 ? "#dc2626" : i > 1 ? "#d97706" : "var(--acc)") + '">' + j.umur[u] + '</span><small class="sys">menunggu ' + esc(u) + '</small></div>'; }).join("");
  el.innerHTML = '<h2 class="sec">Analitik Chat</h2><div class="hint" style="margin:0 0 8px">' + rng + '<button type="button" class="btn" id="anr">Muat ulang</button><a class="btn" href="/api/app?p=%2Fadmin%2Fanalisis.xlsx" download>Unduh laporan (Excel)</a></div>' +
    '<h2 class="sec">Insight otomatis</h2><div class="insg">' + ins + '</div>' +
    '<div class="kpis" style="margin-top:12px">' + kp(k.thread, "Percakapan aktif", k.selesai + " selesai") + kp(k.pesan_pemohon, "Pesan pemohon", k.pesan_admin + " balasan admin" + (k.trend_pct != null ? " &middot; " + (k.trend_pct > 0 ? "+" : "") + k.trend_pct + "% vs pekan lalu" : "")) +
    kp(anDur(k.median_menit), "Waktu balas (median)", "P90 " + anDur(k.p90_menit)) + kp(k.sla1 != null ? k.sla1 + "%" : "-", "Dibalas dalam 1 jam", (k.sla24 != null ? k.sla24 + "% dalam 24 jam" : "belum ada data")) +
    kp(k.menunggu, "Belum dibalas", "saat ini") + kp(k.csat != null ? k.csat.toFixed(1) : "-", "Kepuasan jawaban", k.n_nilai + " penilaian") + '</div>' +
    '<h2 class="sec">Antrean belum dibalas menurut usia</h2><div class="kpis">' + umur + '</div>' +
    (j.menunggu.length ? '<div class="card" style="margin-top:8px"><b>Menunggu paling lama</b>' + j.menunggu.map(function (x) { return '<div class="rc"><span><b>' + esc(x.nama) + '</b> &middot; ' + esc(x.loket) + '<br><small class="sys">' + esc(x.teks) + '</small></span><span style="text-align:right"><b>' + anDur(x.menit) + '</b><br><button type="button" class="btn" data-anopen="' + x.pid + '|' + esc(x.kunci) + '">Buka</button></span></div>'; }).join("") + '</div>' : '') +
    '<h2 class="sec">Pesan per hari</h2><div class="card">' + anDaily(j.harian) + '<div class="lgd"><span><i style="background:var(--acc)"></i>Pesan pemohon</span><span><i style="background:var(--tick)"></i>Balasan admin</span></div></div>' +
    '<h2 class="sec">Jam dan hari tersibuk</h2><div class="card" style="overflow-x:auto">' + anHeat(j.heat) + '</div>' +
    '<h2 class="sec">Topik yang ditanyakan</h2><div class="card">' + (j.topik.length ? j.topik.map(function (x) { return anBar(x.topik, x.n, mxT, x.neg ? Math.round(x.neg * 100 / x.n) + '% keluhan' : '', x.neg); }).join("") + '<div class="lgd"><span><i style="background:var(--acc)"></i>Jumlah pesan</span><span><i style="background:#dc2626"></i>Bagian bernada keluhan</span></div>' : '<span class="sys">Belum ada data.</span>') + '</div>' +
    '<h2 class="sec">Nada pesan pemohon</h2><div class="card">' + (tot ? '<div class="sbar" role="img" aria-label="Keluhan ' + j.senti.neg + ', netral ' + j.senti.net + ', puas ' + j.senti.pos + '">' + sn(j.senti.neg, "#dc2626", "Keluhan") + sn(j.senti.net, "#94a3b8", "Netral") + sn(j.senti.pos, "#16a34a", "Puas") + '</div><div class="lgd"><span><i style="background:#dc2626"></i>Keluhan ' + j.senti.neg + ' (' + Math.round(j.senti.neg * 100 / tot) + '%)</span><span><i style="background:#94a3b8"></i>Netral ' + j.senti.net + '</span><span><i style="background:#16a34a"></i>Puas ' + j.senti.pos + '</span></div>' : '<span class="sys">Belum ada data.</span>') + '</div>' +
    '<h2 class="sec">Pertanyaan yang berulang</h2>' + (j.faq.length ? j.faq.map(function (x) { return '<article class="card" style="margin:0 0 8px"><div><b>&ldquo;' + esc(x.contoh) + '&rdquo;</b></div><div class="sys">Muncul ' + x.n + ' kali &middot; ' + esc(x.topik) + ' &middot; kata: ' + esc(x.kata.join(", ")) + '</div><div class="btns"><button type="button" class="btn" data-anfaq="' + esc(x.kata.join(",")) + '">Buat aturan chatbot</button></div></article>'; }).join("") : '<div class="empty">Belum ada pertanyaan serupa yang berulang.</div>') +
    '<h2 class="sec">Loket paling banyak ditanya</h2><div class="card" style="overflow-x:auto">' + (j.loket.length ? '<table class="tb"><tr><th>Loket</th><th>Pesan</th><th>Belum dibalas</th><th>Keluhan</th><th>Balas (median)</th><th>Nilai</th></tr>' + j.loket.map(function (x) { return '<tr><td>' + esc(x.nama) + '</td><td><b>' + x.pesan + '</b></td><td>' + x.pend + '</td><td>' + x.neg_pct + '%</td><td>' + anDur(x.resp) + '</td><td>' + (x.nilai != null ? x.nilai.toFixed(1) : "-") + '</td></tr>'; }).join("") + '</table>' : '<span class="sys">Belum ada data.</span>') + '</div>' +
    '<h2 class="sec">Kata dan frasa yang sering muncul</h2><div class="card"><div class="cloud">' + (j.kata.length ? j.kata.map(function (x) { return '<span class="chip" style="font-size:' + (0.78 + 0.5 * x.n / mxK).toFixed(2) + 'rem" title="' + x.n + ' percakapan">' + esc(x.k) + ' <small>' + x.n + '</small></span>'; }).join("") : '<span class="sys">Belum ada data.</span>') + '</div>' +
    (j.frasa.length ? '<p class="sys" style="margin:8px 0 0">Frasa: ' + j.frasa.map(function (x) { return esc(x.k) + ' (' + x.n + ')'; }).join(" &middot; ") + '</p>' : '') + '</div>' +
    '<h2 class="sec">Penilaian jawaban admin</h2><div class="card">' + (k.n_nilai ? [5, 4, 3, 2, 1].map(function (i) { return anBar(i + " bintang", j.nilai[i], Math.max.apply(null, [1].concat(Object.keys(j.nilai).map(function (q) { return j.nilai[q]; })))); }).join("") : '<span class="sys">Belum ada penilaian.</span>') + '</div>' +
    (j.aktif.length ? '<h2 class="sec">Pemohon paling aktif</h2><div class="card">' + j.aktif.map(function (x) { return '<div class="rc"><span>' + esc(x.nama) + '</span><b>' + x.n + ' pesan</b></div>'; }).join("") + '</div>' : '') +
    '<p class="sys">Analisis dibuat otomatis di server dari kata kunci bahasa Indonesia (tanpa AI luar dan tanpa mengirim data ke pihak ketiga). Hasil berupa perkiraan: topik, nada, dan urgensi bisa meleset, jadi gunakan sebagai penuntun, bukan keputusan akhir. Mencakup hingga 200 percakapan terbaru.</p>';
}

/* ---------- Aksi panel admin & kotak masuk ---------- */
function anTxt() {
  var L = [label(SEL.kunci) + " - " + SEL.nama + " (" + (SEL.hp || "-") + ")", ""];
  SM.forEach(function (m) { L.push("[" + new Date(m.ts).toLocaleString("id-ID") + "] " + (m.by === "admin" ? "Admin" : "Pemohon") + ": " + m.text); });
  return L.join("\n");
}
function anUnduh(nama, isi) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + isi], {type: "text/plain;charset=utf-8"})); a.download = nama;
  document.body.appendChild(a); a.click(); a.remove();
}
function anPindah(arah) {
  var l = [].slice.call(document.querySelectorAll("#al .ti")), i = l.findIndex(function (b) { return b.getAttribute("aria-current") === "true"; }), n = l[Math.max(0, Math.min(l.length - 1, i + arah))];
  if (n) { n.click(); n.scrollIntoView({block: "nearest"}); }
}
async function anCari() {
  var q = $("gs").value.trim(), el = $("al");
  if (q.length < 2) { err("Ketik minimal 2 huruf untuk mencari."); return; }
  el.innerHTML = '<div class="empty">Mencari&hellip;</div>';
  var j = await api("/api/admin/cari?q=" + encodeURIComponent(q));
  el.innerHTML = '<div class="hint" style="margin:0 0 6px"><span class="sys">' + j.total + ' percakapan memuat &ldquo;' + esc(q) + '&rdquo;' + (j.total > j.daftar.length ? ' (menampilkan ' + j.daftar.length + ')' : '') + '</span><button type="button" class="btn" id="gsx">Tutup hasil</button></div>' +
    (j.daftar.length ? j.daftar.map(function (x, i) { var c = x.cuplikan, m = x.mulai; return '<div class="tiw"><button type="button" class="ti" data-gs="' + i + '"><b>' + esc(x.nama) + ' - ' + esc(x.loket) + '</b><span style="white-space:normal">' + esc(c.slice(0, m)) + '<mark>' + esc(c.slice(m, m + x.panjang)) + '</mark>' + esc(c.slice(m + x.panjang)) + '</span><small class="sys">' + (x.dari === "admin" ? "Admin" : "Pemohon") + ' &middot; ' + fmt(x.waktu) + '</small></button></div>'; }).join("") : '<div class="empty">Tidak ada pesan yang cocok.</div>');
  el._hasil = j.daftar;
}
$("v-adm").addEventListener("click", async function (e) {
  if (S !== "adm") return;
  var t = e.target.closest("button,a,input,select") || e.target, id = t.id, d = t.dataset;
  try {
    if (d.anh) { ANH = +d.anh; aX("an"); return; }
    if (id === "anr") { aX("an"); return; }
    if (d.anopen) { var p = d.anopen.split("|"), x = T.filter(function (z) { return String(z.pid) === p[0] && z.kunci === p[1]; })[0]; AF.st = "all"; admTab("inbox"); pick(x || {pid: +p[0], kunci: p[1], nama: "Pemohon", hp: "", email: ""}); $("ap").scrollIntoView({block: "start"}); return; }
    if (d.anfaq) { window.AN_KT = d.anfaq.split(","); admTab("kt"); return; }
    if (id === "gsb") { err(""); await anCari(); return; }
    if (id === "gsx") { admList(); return; }
    if (d.gs !== undefined) { var h = $("al")._hasil[+d.gs]; if (h) { var c = T.filter(function (z) { return z.pid === h.pid && z.kunci === h.kunci; })[0]; pick(c || {pid: h.pid, kunci: h.kunci, nama: h.nama, hp: h.hp, email: ""}); } return; }
    if (d.bk !== undefined) { return; }
    if (id === "bkall") { var on = t.checked; [].forEach.call(document.querySelectorAll("#al [data-bk]"), function (c) { if (on) BULK[c.dataset.bk] = 1; else delete BULK[c.dataset.bk]; }); admList(); return; }
    if (id === "bkclr") { BULK = {}; admList(); return; }
    if (id === "bkdone") {
      var items = Object.keys(BULK).map(function (k) { var q = k.split("|"); return {pid: +q[0], kunci: q[1]}; });
      await api("/api/admin/selesai-massal", {items: items}); toast(items.length + " percakapan ditandai selesai."); BULK = {}; ASIG = ""; tick(); return;
    }
    if (!SEL) return;
    if (d.tg) { var tg = SEL.tag = SEL.tag || {tags: [], pic: "", tl: ""}, i = tg.tags.indexOf(d.tg); if (i > -1) tg.tags.splice(i, 1); else tg.tags.push(d.tg); tg.pic = $("lpic") ? $("lpic").value : tg.pic; tg.tl = $("ltl") ? $("ltl").value : tg.tl; admPane(); return; }
    if (id === "lbs") { var r = await api("/api/admin/label", {pid: SEL.pid, kunci: SEL.kunci, tags: SEL.tag.tags, pic: $("lpic").value, tl: $("ltl").value}); SEL.tag = r.tag; toast("Label disimpan."); ASIG = ""; tick(); admPane(); return; }
    if (d.sg !== undefined) { var s = SEL.saran[+d.sg], ta = $("rt"); ta.value = fillT(s.teks).slice(0, 800); ta.focus(); return; }
    if (id === "dl") { anUnduh("percakapan-" + SEL.nama.replace(/\W+/g, "-") + ".txt", anTxt()); return; }
    if (id === "cps") { var tx = (SEL.an ? SEL.an.baris.join("\n") : ""); try { await navigator.clipboard.writeText(SEL.nama + " - " + label(SEL.kunci) + "\n" + tx); toast("Ringkasan disalin."); } catch (x2) { err("Browser menolak menyalin."); } return; }
    if (id === "rsx") {
      var tt = clean($("rt").value); if (!tt) return; t.disabled = true;
      await api("/api/admin/balas", {pid: SEL.pid, kunci: SEL.kunci, isi: tt}); await api("/api/admin/selesai", {pid: SEL.pid, kunci: SEL.kunci});
      $("rt").value = ""; toast("Jawaban terkirim dan percakapan ditandai selesai."); ASIG = ""; SM.sig = ""; await tick(); var bb = $("rsx"); if (bb) bb.disabled = false; return;
    }
  } catch (x) { err(x.message); var b3 = $("rsx"); if (b3) b3.disabled = false; }
});
$("v-adm").addEventListener("change", function (e) {
  var d = e.target.dataset;
  if (d && d.bk !== undefined) { if (e.target.checked) BULK[d.bk] = 1; else delete BULK[d.bk]; admList(); }
});
$("v-adm").addEventListener("input", function (e) {
  if (!SEL) return;
  if (e.target.id === "lpic") (SEL.tag = SEL.tag || {tags: [], pic: "", tl: ""}).pic = e.target.value;
  if (e.target.id === "ltl") (SEL.tag = SEL.tag || {tags: [], pic: "", tl: ""}).tl = e.target.value;
});
$("v-adm").addEventListener("keydown", function (e) {
  if (S !== "adm") return;
  if (e.target.id === "gs" && e.key === "Enter") { e.preventDefault(); anCari().catch(function (x) { err(x.message); }); return; }
  if (e.target.id === "rt" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); var b = $("rs"); if (b && !b.disabled) b.click(); }
});
document.addEventListener("keydown", function (e) {
  if (S !== "adm" || AT !== "inbox" || e.ctrlKey || e.metaKey || e.altKey) return;
  var tg = e.target && e.target.tagName;
  if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT" || (e.target && e.target.isContentEditable)) return;
  if (e.key === "j") anPindah(1); else if (e.key === "k") anPindah(-1);
});

/* ---------- Pemohon: jawaban instan saat mengetik pertanyaan ke admin ---------- */
(function () {
  var tm = null;
  function sarankan(ta) {
    var qa = ta.closest(".qa"), v = ta.value.toLowerCase().replace(/\s+/g, " ").trim(), old = qa.querySelector(".defl");
    if (old) old.remove();
    if (v.length < 6 || !window.kataHit || !window.fmtJawab) return;
    var h = window.kataHit(v), jw = h.j[0];
    if (!jw) return;
    var box = document.createElement("div");
    box.className = "defl";
    box.innerHTML = '<b>Mungkin ini sudah menjawab pertanyaan Anda</b><div class="bans-b">' + window.fmtJawab(jw) + '</div><div class="btns"><button type="button" class="btn" data-defl="x">Tutup</button></div><small class="sys">Jika belum membantu, lanjutkan dan kirim pertanyaan ke admin.</small>';
    qa.querySelector(".qf").parentNode.insertBefore(box, qa.querySelector(".qf"));
  }
  $("list").addEventListener("input", function (e) {
    var ta = e.target;
    if (!ta.matches || !ta.matches('textarea[data-k^="q:"]')) return;
    clearTimeout(tm); tm = setTimeout(function () { sarankan(ta); }, 450);
  });
  $("list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-defl]");
    if (b) b.closest(".defl").remove();
  });
})();
