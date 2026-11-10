"use strict";
/* Waktu pengerjaan untuk permainan soal (Tebak KBLI, Bangun Usaha 3D): batang waktu + hitung mundur per soal.
   Pemain bisa memilih "Mode santai" (tanpa batas waktu); pilihan diingat di perangkat. */
(function () {
var K = "tk_wk", T = null, ST = null;
function on() { try { return localStorage.getItem(K) !== "0"; } catch (e) { return true; } }
function set(v) { try { localStorage.setItem(K, v ? "1" : "0"); } catch (e) {} }
function stop() { var left = ST ? Math.max(0, ST.end - Date.now()) / 1000 : 0; clearInterval(T); T = null; var h = ST && ST.el; ST = null; if (h) { var b = h.querySelector(".wk-b"); if (b) { b.style.transition = "none"; } } return left; }
/* host: elemen tempat batang waktu dipasang. sec: detik. fin(): dipanggil saat waktu habis. */
function start(host, sec, fin) {
  stop(); if (!host) return;
  var d = host.querySelector(".wk") || document.createElement("div"); d.className = "wk";
  d.innerHTML = on() ? '<div class="qt" aria-hidden="true"><i class="wk-b"></i></div><div class="wk-r"><span class="wk-n" role="timer" aria-label="Sisa waktu">' + sec + '</span><button type="button" class="chip" data-wk="tog">Mode santai</button></div>' : '<div class="wk-r"><span class="sys">Mode santai: tanpa batas waktu</span><button type="button" class="chip" data-wk="tog">Pakai waktu</button></div>';
  if (!d.parentNode) host.insertBefore(d, host.firstChild);
  if (!on()) return;
  var b = d.querySelector(".wk-b"), n = d.querySelector(".wk-n"); b.style.transform = "scaleX(1)"; void b.offsetWidth; b.style.transitionDuration = sec + "s"; b.style.transform = "scaleX(0)";
  ST = {end: Date.now() + sec * 1000, el: d, sec: sec};
  T = setInterval(function () {
    if (!ST || !document.body.contains(d)) { clearInterval(T); T = null; return; }
    var l = Math.ceil((ST.end - Date.now()) / 1000); n.textContent = Math.max(0, l); d.classList.toggle("wk-lo", l <= 5);
    if (l <= 0) { var f = fin; stop(); if (f) f(); }
  }, 250);
}
function used() { return ST ? ST.sec - Math.max(0, ST.end - Date.now()) / 1000 : 0; }
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest('[data-wk="tog"]'); if (!b) return;
  var host = b.closest(".wk").parentNode, was = on(); set(!was);
  if (was) { stop(); var d = host.querySelector(".wk"); d.innerHTML = '<div class="wk-r"><span class="sys">Mode santai: tanpa batas waktu</span><button type="button" class="chip" data-wk="tog">Pakai waktu</button></div>'; }
  else { var d2 = host.querySelector(".wk"); d2.innerHTML = '<div class="wk-r"><span class="sys">Waktu berlaku mulai soal berikutnya</span><button type="button" class="chip" data-wk="tog">Mode santai</button></div>'; }
});
window.WK = {start: start, stop: stop, on: on, used: used};
})();
