"use strict";
/* Versi 61: penyempurnaan Asisten Takok.
   - Penilaian untuk SETIAP jawaban (👍/👎) dengan alasan; dikirim anonim ke /bot/rating dan muncul di Laporan admin.
   - Pertanyaan lanjutan (chip) yang relevan dengan topik jawaban.
   - Riwayat obrolan dipulihkan saat Asisten dibuka lagi (disimpan hanya di perangkat; ada tombol hapus).
   - Ke admin: pertanyaan yang dinilai "belum membantu" bisa langsung diteruskan lewat alur Teruskan ke admin yang sudah ada. */
(function () {
var D = document, KEY = "tk_chat", MAXN = 40, MAXB = 60000;
var ALASAN = [["tidak_jelas", "Tidak jelas"], ["salah", "Kurang tepat"], ["kurang_lengkap", "Kurang lengkap"], ["ingin_petugas", "Mau tanya petugas"]];
var LANJUT = [
  [/nib|oss|usaha|izin usaha|kbli/i, [["Syarat NIB", "syarat nib"], ["Cari KBLI", "kbli usaha saya"], ["Booking loket", "booking"]]],
  [/ktp|kk\b|kartu keluarga|akta|dukcapil|pindah|domisili/i, [["Syarat KTP / KK", "syarat ktp"], ["Booking loket", "booking"], ["Loket terdekat", "loket terdekat"]]],
  [/bpjs|kesehatan|puskesmas|rumah sakit/i, [["Syarat BPJS", "syarat bpjs"], ["Loket BPJS", "loket bpjs"]]],
  [/pajak|pbb|bphtb|retribusi/i, [["Cek pajak", "cara bayar pajak"], ["Loket pajak", "loket pajak"]]],
  [/sktm|bansos|sosial|disabilitas/i, [["Syarat SKTM", "syarat sktm"], ["Loket sosial", "loket dinas sosial"]]],
  [/skck|polisi|sim\b|stnk/i, [["Syarat SKCK", "syarat skck"], ["Booking loket", "booking"]]]
];
var UMUM = [["Loket terdekat", "loket terdekat"], ["Cek status", "cek status"], ["Tanya admin", "tanya admin"]];

function $b(i) { return D.getElementById(i); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
function api(u, b) { try { if (window.api) return window.api(u, b).catch(function () {}); } catch (e) {} return Promise.resolve(); }

function soalTerakhir(msg) {
  var p = msg.previousElementSibling;
  while (p && !p.classList.contains("u")) p = p.previousElementSibling;
  return p ? p.textContent.trim().slice(0, 150) : "";
}
function layak(m) {
  if (!m.classList.contains("b") || m.classList.contains("typ") || m.dataset.rx) return false;
  if (m.querySelector(".bfb,.brt")) return false;
  var u = m.previousElementSibling; // hanya jawaban atas pertanyaan warga
  if (!u || !u.classList.contains("u")) return false;
  return m.querySelector(".bc2") || (m.textContent || "").length > 60;
}
function lanjutan(q, teks) {
  var s = q + " " + teks, out = [];
  LANJUT.forEach(function (r) { if (!out.length && r[0].test(s)) out = r[1]; });
  if (!out.length) out = UMUM;
  return out.filter(function (x) { return x[1].toLowerCase() !== q.toLowerCase(); }).slice(0, 3);
}
function hias(m) {
  if (!layak(m)) return;
  m.dataset.rx = "1";
  var q = soalTerakhir(m), t = (m.textContent || "").slice(0, 300);
  var h = '<div class="brt" data-q="' + esc(q) + '"><span>Membantu?</span><button type="button" data-bx="1" aria-label="Membantu">👍</button><button type="button" data-bx="-1" aria-label="Belum membantu">👎</button></div>';
  if (!m.querySelector(".bch")) h += '<div class="bch bfl">' + lanjutan(q, t).map(function (x) { return '<button type="button" data-b="q:' + esc(x[1]) + '">' + esc(x[0]) + '</button>'; }).join("") + "</div>";
  m.insertAdjacentHTML("beforeend", h);
}

/* ---- Penyimpanan riwayat ---- */
var tS = 0;
function simpan() {
  clearTimeout(tS);
  tS = setTimeout(function () {
    try {
      var m = $b("bm"); if (!m) return;
      var k = m.cloneNode(true);
      [].forEach.call(k.querySelectorAll(".typ"), function (x) { x.remove(); });
      while (k.children.length > MAXN) k.removeChild(k.firstChild);
      var h = k.innerHTML;
      if (!k.children.length) localStorage.removeItem(KEY);
      else if (h.length < MAXB) localStorage.setItem(KEY, JSON.stringify({t: Date.now(), h: h}));
    } catch (e) {}
  }, 500);
}
function pulihkan() {
  try {
    var m = $b("bm"); if (!m || m.children.length) return;
    var o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!o || !o.h || Date.now() - o.t > 3 * 86400000) { localStorage.removeItem(KEY); return; }
    m.innerHTML = o.h;
    [].forEach.call(m.querySelectorAll(".typ"), function (x) { x.remove(); });
    m.insertAdjacentHTML("beforeend", '<div class="bmsg b" data-rx="1"><p>Percakapan sebelumnya dipulihkan.</p><div class="bch"><button type="button" data-bx="baru">Mulai percakapan baru</button></div></div>');
    m.scrollTop = m.scrollHeight;
  } catch (e) {}
}

function mulai() {
  var m = $b("bm"), p = $b("bp"); if (!m || !p) return false;
  pulihkan();
  new MutationObserver(function (ml) {
    ml.forEach(function (r) { [].forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1 && n.classList.contains("bmsg")) hias(n); }); });
    simpan();
  }).observe(m, {childList: true});
  p.addEventListener("click", function (e) {
    var b = e.target.closest("[data-bx]"); if (!b) return;
    var v = b.dataset.bx, w = b.closest(".brt") || b.closest(".bmsg");
    if (v === "baru") { m.innerHTML = ""; try { localStorage.removeItem(KEY); } catch (x) {} if (window.openAsisten) { $b("bp").hidden = true; window.openAsisten(); } return; }
    if (v === "1") { api("/api/bot/rating", {v: 1}); w.innerHTML = "<span>Terima kasih! Senang bisa membantu.</span>"; return; }
    if (v === "-1") {
      var q = w.dataset.q || "";
      w.dataset.q = q;
      w.innerHTML = "<span>Apa yang kurang?</span>" + ALASAN.map(function (a) { return '<button type="button" data-bx="a:' + a[0] + '">' + a[1] + "</button>"; }).join("");
      return;
    }
    if (v.indexOf("a:") === 0) {
      var a = v.slice(2), q2 = w.dataset.q || "";
      api("/api/bot/rating", {v: -1, a: a});
      w.innerHTML = "<span>Terima kasih masukannya.</span>" + (q2 ? '<button type="button" data-b="fw:' + esc(q2) + '">Teruskan ke admin</button>' : "");
    }
  });
  return true;
}
function tunggu(n) { if (mulai()) return; if (n < 40) setTimeout(function () { tunggu(n + 1); }, 150); }
if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", function () { tunggu(0); }); else tunggu(0);
window.BotEkstra = {hapus: function () { try { localStorage.removeItem(KEY); } catch (e) {} }};
})();
