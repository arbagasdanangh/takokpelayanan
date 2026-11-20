"use strict";
/* Versi 99: Jawaban panjang dilipat. Jawaban Asisten yang lebih tinggi dari ~15 baris hanya tampil sebagian dengan tombol
   "Baca selengkapnya" (dan "Lipat lagi"), supaya percakapan tidak terpotong gulir panjang di HP.
   Perintah /lipat mematikan atau menyalakan fitur ini (tersimpan di perangkat). Hanya mengubah tampilan, isi jawaban tidak berubah. */
(function () {
var D = document, B = window.BOTI;
if (!B || !window.BOTX) return;
var $b = function (i) { return D.getElementById(i); };
var KEY = "tk_lipat", TINGGI = 260;
function aktif() { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } }
function setAktif(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} }
function lipat(n) {
  if (!n || n.nodeType !== 1 || !n.classList.contains("bmsg") || !n.classList.contains("b") || n.dataset.lp) return;
  if (n.classList.contains("typ")) return;
  n.dataset.lp = "1";
  var kids = [].slice.call(n.children), grup = [];
  for (var i = 0; i < kids.length; i++) { if (/^(P|UL|OL|H3|H4)$/.test(kids[i].tagName)) grup.push(kids[i]); else break; }
  if (!grup.length) return;
  var h = 0; grup.forEach(function (e) { h += e.offsetHeight; });
  if (h <= TINGGI + 60) return;
  var w = D.createElement("div"); w.className = "bkr"; n.insertBefore(w, grup[0]); grup.forEach(function (e) { w.appendChild(e); });
  w.style.maxHeight = TINGGI + "px";
  var b = D.createElement("button"); b.type = "button"; b.className = "bsp bkb"; b.textContent = "Baca selengkapnya"; b.setAttribute("aria-expanded", "false");
  n.insertBefore(b, w.nextSibling);
  b.onclick = function () { var buka = w.classList.toggle("bko"); w.style.maxHeight = buka ? "none" : TINGGI + "px"; b.textContent = buka ? "Lipat lagi" : "Baca selengkapnya"; b.setAttribute("aria-expanded", buka ? "true" : "false"); };
}
function semua() { if (!aktif()) return; var m = $b("bm"); if (m) [].forEach.call(m.querySelectorAll(".bmsg.b:not([data-lp])"), lipat); }
function pasang() {
  var m = $b("bm"); if (!m) return false;
  new MutationObserver(function () { setTimeout(semua, 60); }).observe(m, {childList: true});
  return true;
}
if (!pasang()) D.addEventListener("DOMContentLoaded", pasang);
var pre0 = window.BOTX.pre;
window.BOTX.pre = function (t, s) {
  if (/^\/lipat\s*$/i.test(String(t).trim())) {
    var v = !aktif(); setAktif(v);
    return B.bot(v ? "Jawaban panjang sekarang dilipat dengan tombol Baca selengkapnya." : "Jawaban panjang sekarang ditampilkan penuh.");
  }
  return pre0 ? pre0(t, s) : null;
};
window.TKLIPAT = {semua: semua, aktif: aktif};
})();
