"use strict";
/* Versi 100: Bagikan jawaban Asisten sebagai kartu gambar (PNG) berlogo Takok Pelayanan Suroboyo.
   Tombol "Gambar" muncul di bawah setiap jawaban. Dibuat di perangkat dengan canvas (tanpa mengirim data ke server).
   Dibagikan lewat menu bagikan HP (WhatsApp dsb.) bila didukung; jika tidak, gambar diunduh. */
(function () {
var D = document;
if (!window.BOTI) return;
var $b = function (i) { return D.getElementById(i); };
var W = 1080, PAD = 72, FS = 40, LH = 60, MAXL = 16;
function bungkus(c, teks, lebar) {
  var out = [];
  String(teks).split(/\n+/).forEach(function (para) {
    var kata = para.trim().split(/\s+/), baris = "";
    kata.forEach(function (k) {
      var t = baris ? baris + " " + k : k;
      if (c.measureText(t).width > lebar && baris) { out.push(baris); baris = k; } else baris = t;
    });
    if (baris) out.push(baris);
  });
  return out;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function kartu(teks) {
  var cv = D.createElement("canvas"), c = cv.getContext("2d");
  c.font = "500 " + FS + "px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  var baris = bungkus(c, teks.replace(/\s*\n\s*/g, "\n"), W - PAD * 2), potong = baris.length > MAXL;
  if (potong) { baris = baris.slice(0, MAXL); baris[MAXL - 1] = baris[MAXL - 1].replace(/\s*\S*$/, "") + " …"; }
  var HEAD = 190, FOOT = 150, H = HEAD + 50 + baris.length * LH + 60 + FOOT;
  cv.width = W; cv.height = H;
  var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#d6e9ff"); g.addColorStop(1, "#eef5ff"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = "#1a46b5"; c.fillRect(0, 0, W, HEAD);
  c.fillStyle = "#fbbf24"; c.fillRect(0, HEAD - 10, W, 10);
  c.fillStyle = "#fff"; c.font = "700 54px system-ui,-apple-system,Segoe UI,Roboto,sans-serif"; c.textBaseline = "middle";
  c.fillText("Takok Pelayanan", PAD, 78); c.fillStyle = "#fbbf24"; c.fillText("Suroboyo", PAD, 140);
  c.fillStyle = "#fff"; rr(c, PAD - 20, HEAD + 40, W - PAD * 2 + 40, baris.length * LH + 70, 36); c.fill();
  c.fillStyle = "#0d2a6b"; c.font = "500 " + FS + "px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  baris.forEach(function (b, i) { c.fillText(b, PAD, HEAD + 40 + 55 + i * LH); });
  var y = H - FOOT + 40;
  c.fillStyle = "#5b6f94"; c.font = "500 32px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  c.fillText("Jawaban Asisten Takok" + (potong ? " (diringkas)" : ""), PAD, y);
  c.fillText(new Date().toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) + " · takokpelayanan.vercel.app", PAD, y + 50);
  return cv;
}
function bagikan(teks) {
  var cv = kartu(teks);
  cv.toBlob(function (bl) {
    if (!bl) { if (window.toast) toast("Gambar gagal dibuat."); return; }
    var f; try { f = new File([bl], "jawaban-takok.png", {type: "image/png"}); } catch (e) { f = null; }
    if (f && navigator.canShare && navigator.canShare({files: [f]})) {
      navigator.share({files: [f], title: "Takok Pelayanan Suroboyo"}).catch(function () {});
    } else {
      var a = D.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "jawaban-takok.png"; D.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      if (window.toast) toast("Gambar diunduh.");
    }
  }, "image/png");
  return cv;
}
function pasangTombol(n) {
  if (!n || n.nodeType !== 1 || !n.classList.contains("bmsg") || !n.classList.contains("b") || !n.dataset.t || n.querySelector(".bgm")) return;
  var wa = n.querySelector('[data-bp="wa"]'), h = '<button type="button" class="bsp bsc bgm">Gambar</button>';
  if (wa) wa.insertAdjacentHTML("afterend", h); else n.insertAdjacentHTML("beforeend", h);
}
function semua() { var m = $b("bm"); if (m) [].forEach.call(m.querySelectorAll(".bmsg.b[data-t]:not(:has(.bgm))"), pasangTombol); }
function pasang() { var m = $b("bm"); if (!m) return false; new MutationObserver(function () { setTimeout(semua, 150); }).observe(m, {childList: true}); semua(); return true; }
if (!pasang()) D.addEventListener("DOMContentLoaded", pasang);
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest(".bgm"); if (!b) return;
  var n = b.closest(".bmsg"); if (n && n.dataset.t) bagikan(n.dataset.t);
});
window.TKGAMBAR = {kartu: kartu, bagikan: bagikan};
})();
