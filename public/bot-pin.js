"use strict";
/* Versi 101: Sematkan jawaban. Tombol "Sematkan" di bawah jawaban Asisten menaruh ringkasannya di bilah tetap di atas percakapan
   (mis. daftar syarat) supaya tetap terlihat saat Anda bertanya hal lain. Satu sematan; "Lihat" menggulir ke jawaban aslinya,
   "x" melepas. Isi ringkas tersimpan di perangkat (localStorage tk_pin, kedaluwarsa 3 hari). */
(function () {
var D = document;
if (!window.BOTI) return;
var $b = function (i) { return D.getElementById(i); };
var KEY = "tk_pin";
function muat() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.s && Date.now() - o.t < 3 * 86400000) return o; localStorage.removeItem(KEY); } catch (e) {} return null; }
function simpan(o) { try { if (o) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch (e) {} }
function bilah() {
  var bm = $b("bm"); if (!bm) return null;
  var b = $b("bpin");
  if (!b) { b = D.createElement("div"); b.id = "bpin"; b.className = "bpin"; b.hidden = true; bm.parentNode.insertBefore(b, bm); }
  return b;
}
function tampil() {
  var b = bilah(); if (!b) return; var o = muat();
  if (!o) { b.hidden = true; b.innerHTML = ""; return; }
  b.hidden = false;
  var tx = o.s.length > 140 ? o.s.slice(0, 140).replace(/\s*\S*$/, "") + "…" : o.s;
  b.innerHTML = '<span class="bpi" aria-hidden="true">&#128204;</span><span class="bpt"></span><button type="button" class="bsp" data-pin="lihat">Lihat</button><button type="button" class="bsp" data-pin="lepas" aria-label="Lepas sematan">&times;</button>';
  b.querySelector(".bpt").textContent = tx;
}
function pasangTombol(n) {
  if (!n || n.nodeType !== 1 || !n.classList.contains("bmsg") || !n.classList.contains("b") || !n.dataset.t || n.querySelector(".bpn")) return;
  var h = '<button type="button" class="bsp bsc bpn" data-pin="semat">Sematkan</button>', a = n.querySelector(".bgm,[data-bp=wa]");
  if (a) a.insertAdjacentHTML("afterend", h); else n.insertAdjacentHTML("beforeend", h);
}
function semua() { var m = $b("bm"); if (m) [].forEach.call(m.querySelectorAll(".bmsg.b[data-t]:not(:has(.bpn))"), pasangTombol); }
function pasang() { var m = $b("bm"); if (!m) return false; new MutationObserver(function () { setTimeout(semua, 220); }).observe(m, {childList: true}); semua(); tampil(); return true; }
if (!pasang()) D.addEventListener("DOMContentLoaded", pasang);
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-pin]"); if (!b) return;
  var a = b.dataset.pin;
  if (a === "semat") {
    var n = b.closest(".bmsg"); if (!n || !n.dataset.t) return;
    [].forEach.call(D.querySelectorAll(".bmsg.bsm"), function (x) { x.classList.remove("bsm"); });
    n.classList.add("bsm"); simpan({s: n.dataset.t.replace(/\s+/g, " ").trim().slice(0, 400), t: Date.now()}); tampil();
    if (window.toast) toast("Jawaban disematkan di atas percakapan.");
  } else if (a === "lepas") { simpan(null); [].forEach.call(D.querySelectorAll(".bmsg.bsm"), function (x) { x.classList.remove("bsm"); }); tampil(); }
  else if (a === "lihat") { var m = D.querySelector(".bmsg.bsm"); if (m) m.scrollIntoView({behavior: "smooth", block: "center"}); else if (window.toast) toast("Jawaban asli sudah tidak ada di layar. Ringkasannya tetap tersemat."); }
});
window.TKPIN = {muat: muat};
})();
