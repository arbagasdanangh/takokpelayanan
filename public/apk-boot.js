"use strict";
/* Berjalan sangat awal: tentukan apakah splash ikon ditampilkan (sekali per sesi, kecuali Kurangi gerakan). */
(function () {
  var H = document.documentElement;
  try {
    window.__apkT0 = Date.now();
    var r = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var off = localStorage.getItem("tk_anim") === "0";
    var seen = sessionStorage.getItem("tk_splash") === "1";
    if (!r && !off && !seen) { H.classList.add("apk-splash"); sessionStorage.setItem("tk_splash", "1"); }
    else H.classList.add("apk-ready");
    if (off || r) H.classList.add("apk-noanim");
    var st = window.matchMedia && (matchMedia("(display-mode: standalone)").matches || navigator.standalone === true);
    if (st) H.classList.add("apk-app");
  } catch (e) { H.classList.add("apk-ready"); }
})();
