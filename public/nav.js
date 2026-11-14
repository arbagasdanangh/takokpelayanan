"use strict";
/* Versi 56: Navigasi Back ala aplikasi mobile.
   Masalah lama: aplikasi ini satu halaman (SPA) tanpa riwayat, jadi tombol Back langsung menutup aplikasi seperti webview.
   Sekarang setiap "lapisan" (halaman Booking/Status/dst, Percakapan Saya, Asisten, Ruang Main, lembar Menu, dialog) mendapat
   satu entri riwayat. Back menutup lapisan paling atas, bukan keluar. Di beranda, Back pertama menampilkan "Tekan sekali lagi
   untuk keluar", Back kedua benar-benar keluar. Lapisan yang ditutup lewat tombol (X, Tutup) ikut merapikan riwayat. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var pushed = 0, hasGuard = false, busy = false, busyT = 0, settle = false, timer = 0, rearm = 0, off = false;
var OV = ".sh-ov,.pn-ov,.ap-ov,.kr-ov,.ug-ov";

function arah(a) { try { D.documentElement.setAttribute("data-navdir", a); } catch (e) {} }
function klik(id) { var b = $(id); if (b) { b.click(); return true; } return false; }
function nampak(el) { return !!el && !el.hidden && el.isConnected; }

/* Daftar lapisan terbuka, dari bawah ke atas. */
function layers() {
  var L = [], adm = window.S === "adm";
  if (!adm) {
    if (window.PN) L.push({k: "pn", close: function () { if (window.setPN) window.setPN(""); else { window.PN = ""; if (window.ui) window.ui(); } }});
    else if (window.S === "user" && window.MYV) L.push({k: "my", close: function () { klik("my"); }});
  }
  if (nampak($("bp"))) L.push({k: "bot", close: function () { klik("b-x"); }});
  if (nampak($("gm"))) {
    L.push({k: "gm", close: function () { klik("gmx"); }});
    var t = $("gmt"), h = D.querySelector('#gmb [data-m="home"]');
    if (t && h && t.textContent.trim() !== "Ruang Main") L.push({k: "gmsub", close: function () { h.click(); }});
  }
  [].forEach.call(D.querySelectorAll(OV), function (el) { if (!nampak(el)) return; L.push({k: "ov", el: el, close: function () { tutupOv(el); }}); });
  return L;
}
/* Tutup dialog apa pun dengan cara yang paling ramah: klik latar, tombol tutup, lalu Escape, terakhir cabut. */
function gone(el) { return !el.isConnected || el.hidden; }
function tutupOv(el) {
  try { el.click(); } catch (e) {} if (gone(el)) return;
  var x = el.querySelector('[data-x],[data-c="x"],[data-m="x"],[data-k="x"],[data-f="x"],[data-pn="x"],[data-rc="x"],[data-sit="x"],[data-dn="x"],[data-ug="tutup"],.au-x,[aria-label="Tutup"]');
  if (x) { try { x.click(); } catch (e) {} if (gone(el)) return; }
  try { D.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true})); } catch (e) {} if (gone(el)) return;
  if (el.classList.contains("ug-ov")) el.hidden = true; else el.remove();
}
function closeTop() { var L = layers(), t = L[L.length - 1]; if (t) { try { t.close(); } catch (e) {} return true; } return false; }

/* Selaraskan jumlah entri riwayat dengan jumlah lapisan. */
function sync() {
  if (off || busy || settle) return;
  var n = layers().length;
  try {
    if (n > pushed) {
      if (!hasGuard) { history.pushState({tk: "guard"}, "", location.href); hasGuard = true; }
      arah("fwd");
      while (pushed < n) { pushed++; history.pushState({tk: pushed}, "", location.href); }
    } else if (n < pushed) {
      var d = pushed - n; pushed = n; busy = true; arah("back");
      clearTimeout(busyT); busyT = setTimeout(function () { busy = false; }, 700);
      history.go(-d);
    }
  } catch (e) { off = true; }
}
var tunda = 0;
function jadwal() { if (tunda) return; tunda = setTimeout(function () { tunda = 0; sync(); }, 40); }

window.addEventListener("popstate", function (e) {
  if (off) return;
  if (busy) { busy = false; clearTimeout(busyT); setTimeout(sync, 30); return; }
  var t = e.state && e.state.tk, target = typeof t === "number" ? t : (t === "guard" ? 0 : -1);
  if (target === 0 && !hasGuard) target = -1;
  settle = true; arah("back");
  var guardN = 30; while (pushed > Math.max(target, 0) && guardN-- > 0) { closeTop(); pushed--; }
  if (target > pushed) pushed = target;
  if (target < 0) { // sampai dasar riwayat: ini percobaan keluar
    pushed = 0; hasGuard = false;
    if (window.toast) window.toast("Tekan sekali lagi untuk keluar"); try { if (navigator.vibrate) navigator.vibrate(10); } catch (z) {}
    clearTimeout(rearm); rearm = setTimeout(function () { if (!hasGuard && pushed === 0) { try { history.pushState({tk: "guard"}, "", location.href); hasGuard = true; } catch (z) { off = true; } } }, 2600);
  }
  setTimeout(function () { settle = false; sync(); }, 70);
});

function mulai() {
  try {
    history.replaceState({tk: "base"}, "", location.href);
    history.pushState({tk: "guard"}, "", location.href); hasGuard = true;
  } catch (e) { off = true; return; }
  if (window.MutationObserver) new MutationObserver(jadwal).observe(D.body, {childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"]});
  D.addEventListener("click", function () { setTimeout(sync, 80); setTimeout(sync, 350); }, true);
  setInterval(sync, 600);
}
window.Nav = {
  back: function () { if (layers().length) { try { history.back(); } catch (e) {} return true; } return false; },
  depth: function () { return layers().length; },
  close: closeTop
};
mulai();
})();
