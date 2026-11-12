"use strict";
/* Versi 52 (lanjutan): Aura Plus. Tanpa perubahan server.
   1. Kartu Saya (beranda warga yang sudah masuk): kunjungan berikutnya dengan hitung mundur, tahapan tiket, dan tombol cepat.
   2. Cari dengan suara di kolom pencarian beranda (bila peramban mendukung; bahasa Indonesia).
   3. Admin: Peta Kepadatan booking 7 hari kerja ke depan (hari x jam), ketuk hari untuk melihat loket terpadat. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var LANG = ["Terjadwal", "Sudah tiba", "Dipanggil", "Selesai"], LL = ["Booking", "Tiba", "Dipanggil", "Selesai"];

/* ---------- 1. Kartu Saya ---------- */
var KS = {d: null, t: 0, busy: false, ok: false};
function sisa(o) {
  var t = new Date(o.tanggal + "T" + o.jam + ":00+07:00").getTime(), m = Math.round((t - Date.now()) / 60000);
  if (isNaN(m)) return ""; if (m <= -60) return "Jam booking sudah lewat"; if (m <= 0) return "Sekarang"; if (m < 60) return m + " menit lagi";
  if (m < 1440) return Math.floor(m / 60) + " jam " + (m % 60) + " menit lagi"; return Math.floor(m / 1440) + " hari lagi";
}
function stp(st) {
  var i = Math.max(0, LANG.indexOf(st));
  return '<ol class="au-st" aria-label="Tahapan tiket">' + LL.map(function (l, n) { return '<li class="' + (n < i ? "ok" : n === i ? "now" : "") + '"><i>' + (n < i ? "&#10003;" : n + 1) + '</i><span>' + l + '</span></li>'; }).join("") + '</ol>';
}
function gambarKs() {
  var host = $("au-ks"), menu = D.querySelector("#v-cari .menu");
  if (window.S !== "user") { if (host) host.remove(); KS.t = 0; KS.d = null; return; }
  if (!menu) return;
  if (!host) { host = D.createElement("section"); host.id = "au-ks"; host.className = "au-ks"; host.setAttribute("aria-label", "Kartu Saya"); menu.parentNode.insertBefore(host, menu);
    host.onclick = function (e) {
      var b = e.target.closest("[data-ks]"); if (!b) return; var a = b.dataset.ks;
      if (a === "bk") { var t8 = $("t8"); if (t8) t8.click(); }
      else if (a === "bot") { var bf = $("bf"); if (bf) bf.click(); setTimeout(function () { if (window.BOTI && BOTI.ask) BOTI.ask("/tiket"); }, 200); }
      else if (a === "jam") { var bf2 = $("bf"); if (bf2) bf2.click(); setTimeout(function () { if (window.BOTI && BOTI.ask) BOTI.ask("/berangkat"); }, 200); }
    };
  }
  var o = KS.d, nm = window.ME && ME.nama ? String(ME.nama).split(" ")[0] : "";
  if (!KS.ok) { host.innerHTML = '<div class="au-kh"><b>Kartu Saya</b></div><p class="au-kp">Memuat jadwal Anda&hellip;</p>'; return; }
  if (!o) { host.innerHTML = '<div class="au-kh"><b>Kartu Saya</b><small>' + E(nm) + '</small></div><p class="au-kp">Belum ada kunjungan terjadwal. Pesan jam dulu supaya tidak antre lama.</p><div class="au-kb"><button type="button" class="send" data-ks="bk">Buat booking</button></div>'; return; }
  var lb = typeof label === "function" ? label(o.kunci) : (o.loket || ""), hi = typeof iso === "function" && o.tanggal === iso(wibDate(0));
  host.innerHTML = '<div class="au-kh"><b>Kunjungan berikutnya</b><span class="au-kc">' + E(o.kode) + '</span></div><div class="au-kt"><strong>' + E(sisa(o)) + '</strong><span>' + (hi ? "Hari ini" : E(o.tanggal)) + ' &middot; ' + E(o.jam) + ' WIB</span></div><p class="au-kp">' + E(lb) + '</p>' + stp(o.status) +
    '<div class="au-kb"><button type="button" class="btn" data-ks="bot">Lihat tiket</button><button type="button" class="btn" data-ks="jam">Kapan berangkat?</button><button type="button" class="btn" data-ks="bk">Tambah booking</button></div>';
}
function muatKs() {
  if (KS.busy || window.S !== "user" || D.hidden || Date.now() - KS.t < 90000 || typeof api !== "function") return; KS.busy = true;
  api("/api/booking").then(function (j) {
    KS.t = Date.now(); var h = iso(wibDate(0));
    KS.d = (j.daftar || []).filter(function (o) { return o.tanggal >= h && (o.status === "Terjadwal" || o.status === "Sudah tiba" || o.status === "Dipanggil"); }).sort(function (a, b) { return (a.tanggal + a.jam) < (b.tanggal + b.jam) ? -1 : 1; })[0] || null; KS.ok = true; gambarKs();
  }).catch(function () { KS.t = Date.now() - 60000; }).then(function () { KS.busy = false; });
}

/* ---------- 2. Cari dengan suara ---------- */
function pasangMic() {
  if ($("au-mic")) return; var SR = window.SpeechRecognition || window.webkitSpeechRecognition, go = $("go"), q = $("q"); if (!SR || !go || !q) return;
  var b = D.createElement("button"), r = null; b.type = "button"; b.id = "au-mic"; b.className = "au-mic"; b.setAttribute("aria-label", "Cari dengan suara");
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>'; go.parentNode.insertBefore(b, go);
  function selesai() { r = null; b.classList.remove("on"); }
  b.onclick = function () {
    if (r) { try { r.stop(); } catch (e) {} return; }
    r = new SR(); r.lang = "id-ID"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = function (e) { var t = e.results[0] && e.results[0][0] ? e.results[0][0].transcript : ""; if (t) { q.value = t; q.dispatchEvent(new Event("input", {bubbles: true})); go.click(); } };
    r.onerror = function () { if (window.toast) toast("Suara tidak terbaca. Coba lagi atau ketik saja."); }; r.onend = selesai;
    b.classList.add("on"); try { r.start(); if (window.toast) toast("Silakan bicara\u2026"); } catch (e) { selesai(); }
  };
}

/* ---------- 3. Admin: Peta Kepadatan ---------- */
var SL = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"], kp = null;
function tutupKp() { if (kp) { kp.remove(); kp = null; } }
function hariKerja(n) {
  var out = [], i = 0; while (out.length < n && i < 21) { var d = wibDate(i++), w = new Date(iso(d) + "T12:00:00+07:00").getUTCDay(); if (w !== 0 && w !== 6) out.push(iso(d)); } return out;
}
function nmHari(s) { return new Date(s + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta"}); }
async function bukaKp() {
  if (kp) { tutupKp(); return; }
  kp = D.createElement("div"); kp.className = "ap-ov"; kp.setAttribute("role", "dialog"); kp.setAttribute("aria-modal", "true"); kp.setAttribute("aria-label", "Peta kepadatan booking");
  kp.innerHTML = '<div class="ap-box au-fk"><div class="au-h"><b>Peta Kepadatan Booking</b><button type="button" class="au-x" data-k="x" aria-label="Tutup">&times;</button></div><p class="au-t" id="kp-s">Memuat 7 hari kerja&hellip;</p><div id="kp-g"></div><div id="kp-d"></div></div>';
  D.body.appendChild(kp);
  var gt = [], dat = {};
  kp.onclick = function (e) { if (e.target === kp) { tutupKp(); return; } var b = e.target.closest("[data-k]"); if (!b) return; if (b.dataset.k === "x") { tutupKp(); return; } detail(b.dataset.k); };
  function detail(t) {
    var L = dat[t] || [], g = {}; L.forEach(function (o) { g[o.kunci] = (g[o.kunci] || 0) + 1; });
    var top = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; }).slice(0, 5), el = $("kp-d"); if (!el) return;
    el.innerHTML = '<p class="au-t" style="margin-top:12px">' + E(nmHari(t)) + ': ' + L.length + ' booking. Loket terpadat:</p>' + (top.length ? '<ul class="kp-top">' + top.map(function (k) { return '<li><span>' + E(typeof label === "function" ? label(k) : k) + '</span><b>' + g[k] + '</b></li>'; }).join("") + '</ul>' : '<p class="au-ok">Belum ada booking.</p>');
  }
  try {
    var hr = hariKerja(7), rs = await Promise.all(hr.map(function (t) { return api("/api/admin/booking?tanggal=" + t).then(function (j) { return (j.daftar || []).filter(function (o) { return !/batal/i.test(o.status || ""); }); }).catch(function () { return []; }); }));
    if (!kp) return; var mx = 1, tot = 0, best = null;
    hr.forEach(function (t, i) { dat[t] = rs[i]; var c = {}; rs[i].forEach(function (o) { c[o.jam] = (c[o.jam] || 0) + 1; }); gt[i] = c; SL.forEach(function (s) { mx = Math.max(mx, c[s] || 0); }); tot += rs[i].length; if (!best || rs[i].length < best[1]) best = [t, rs[i].length]; });
    $("kp-s").innerHTML = tot + ' booking dalam 7 hari kerja. Hari paling lengang: <b>' + E(best ? nmHari(best[0]) : "-") + '</b>. Ketuk hari untuk rincian.';
    $("kp-g").innerHTML = '<div class="kp-g" style="--n:' + SL.length + '"><span></span>' + SL.map(function (s) { return '<small>' + s.slice(0, 2) + '</small>'; }).join("") + '<span></span>' +
      hr.map(function (t, i) { return '<button type="button" class="kp-h" data-k="' + t + '">' + E(nmHari(t)) + '</button>' + SL.map(function (s) { var n = gt[i][s] || 0; return '<i class="kp-c' + (n / mx >= .55 ? ' hi' : '') + '" style="--a:' + (n / mx).toFixed(2) + '" title="' + n + ' booking pukul ' + s + '">' + (n || "") + '</i>'; }).join("") + '<b class="kp-t">' + rs[i].length + '</b>'; }).join("") + '</div>';
    detail(hr[0]);
  } catch (e) { if ($("kp-s")) $("kp-s").textContent = "Data belum bisa dimuat. Coba lagi sebentar."; }
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && kp) tutupKp(); });
function pasangKp() {
  var bar = $("ap-bar"); if (!bar || $("au-kp")) return;
  var b = D.createElement("button"); b.type = "button"; b.className = "btn"; b.id = "au-kp"; b.textContent = "Kepadatan"; b.onclick = bukaKp; bar.appendChild(b);
}

function jalan() { try { gambarKs(); muatKs(); pasangMic(); pasangKp(); } catch (e) {} }
setInterval(jalan, 2000); setInterval(function () { if (window.S === "user" && KS.ok) gambarKs(); }, 30000); jalan();
})();
