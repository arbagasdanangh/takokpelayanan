"use strict";
/* Versi 56: rasa aplikasi mobile.
   Splash ikon beranimasi, animasi "buka ikon" saat menu diketuk, tarik-untuk-segarkan, geser dari tepi kiri untuk kembali,
   tarik lembar ke bawah untuk menutup, bilah offline, tombol ke atas, bagikan aplikasi, getar halus, sinkron warna bilah status. */
(function () {
var D = document, H = D.documentElement, $ = function (i) { return D.getElementById(i); };
var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function pref(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v === "1"; } catch (e) { return d; } }
function setPref(k, v) { try { localStorage.setItem(k, v ? "1" : "0"); } catch (e) {} }
var anim = pref("tk_anim", true), hap = pref("tk_hap", true);
var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function gerak() { return anim && !REDUCE; }
function getar(n) { try { if (hap && navigator.vibrate) navigator.vibrate(n || 8); } catch (e) {} }
function toast(m) { if (window.toast) window.toast(m); }
function adaLapisan() { return !!D.querySelector(".sh-ov,.pn-ov,.ap-ov,.kr-ov,.ug-ov:not([hidden]),#gm:not([hidden]),#bp:not([hidden])"); }

/* ---------- 1. Splash ---------- */
var sp = $("apk-splash");
function lepas() {
  if (!sp) return; var s = sp; sp = null; s.classList.add("out");
  setTimeout(function () { s.remove(); H.classList.remove("apk-splash"); H.classList.add("apk-ready"); }, 560);
}
if (sp && !H.classList.contains("apk-splash")) { sp.remove(); sp = null; }
function siap() { var t0 = window.__apkT0 || Date.now(); setTimeout(lepas, Math.max(0, 1700 - (Date.now() - t0))); }
if (D.readyState === "complete") siap(); else window.addEventListener("load", siap);
setTimeout(lepas, 3200);

/* ---------- 2. Animasi buka ikon (tile menu) ---------- */
D.addEventListener("click", function (e) {
  var t = e.target.closest && e.target.closest(".tile,.mb-go"); if (!t) return;
  getar(10); if (!gerak()) return;
  var ic = t.querySelector(".ic") || t, r = ic.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  var R = Math.ceil(Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)));
  var c = D.createElement("i"); c.className = "apk-launch" + (ic.classList.contains("y") ? " y" : ""); c.setAttribute("aria-hidden", "true");
  c.style.cssText = "left:" + cx + "px;top:" + cy + "px;width:" + (2 * R) + "px;height:" + (2 * R) + "px;margin:" + (-R) + "px 0 0 " + (-R) + "px";
  D.body.appendChild(c); setTimeout(function () { c.remove(); }, 700);
  ic.classList.remove("apk-pop"); void ic.offsetWidth; ic.classList.add("apk-pop");
}, true);
D.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".sh-i")) getar(8); }, true);

/* ---------- 3. Tarik untuk segarkan ---------- */
var ptr = D.createElement("div"); ptr.className = "apk-ptr"; ptr.setAttribute("aria-hidden", "true");
ptr.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v9M8 11l4 4 4-4"/></svg>'; D.body.appendChild(ptr);
var py = 0, pd = 0, pon = false, prun = false;
function bolehTarik(e) {
  if (prun || window.scrollY > 0 || window.S === "adm" || adaLapisan()) return false;
  var t = e.target; return !(t.closest && t.closest("textarea,input,select,[contenteditable],.hscroll,[data-nopull]"));
}
D.addEventListener("touchstart", function (e) { if (e.touches.length !== 1) { pon = false; return; } pon = bolehTarik(e); py = e.touches[0].clientY; pd = 0; }, {passive: true});
D.addEventListener("touchmove", function (e) {
  if (!pon) return; pd = e.touches[0].clientY - py;
  if (pd <= 6 || window.scrollY > 0) { ptr.classList.remove("on"); ptr.style.transform = ""; return; }
  var y = Math.min(pd * 0.5, 84); ptr.classList.add("on"); ptr.style.transform = "translate(-50%," + (y - 44) + "px)";
  ptr.classList.toggle("go", pd > 120); ptr.firstChild.style.transform = "rotate(" + Math.min(180, pd * 1.5) + "deg)";
}, {passive: true});
D.addEventListener("touchend", function () {
  if (!pon) return; pon = false;
  if (pd > 120) { prun = true; getar(15); ptr.classList.add("spin"); ptr.style.transform = "translate(-50%,28px)"; setTimeout(function () { location.reload(); }, 450); }
  else { ptr.classList.remove("on", "go"); ptr.style.transform = ""; }
}, {passive: true});

/* ---------- 4. Geser dari tepi kiri untuk kembali ---------- */
var edge = D.createElement("div"); edge.className = "apk-edge"; edge.setAttribute("aria-hidden", "true");
edge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>'; D.body.appendChild(edge);
var ex = 0, ey = 0, eon = false, edx = 0;
if (!IOS) {
  D.addEventListener("touchstart", function (e) { var t = e.touches[0]; eon = e.touches.length === 1 && t.clientX < 22 && window.Nav && Nav.depth() > 0; ex = t.clientX; ey = t.clientY; edx = 0; }, {passive: true});
  D.addEventListener("touchmove", function (e) {
    if (!eon) return; var t = e.touches[0]; edx = t.clientX - ex; var dy = Math.abs(t.clientY - ey);
    if (dy > Math.abs(edx) * 1.2 && edx < 30) { eon = false; edge.classList.remove("on"); return; }
    if (edx > 8) { edge.classList.add("on"); edge.style.transform = "translate(" + (Math.min(edx, 90) - 44) + "px,-50%)"; edge.classList.toggle("go", edx > 70); }
  }, {passive: true});
  D.addEventListener("touchend", function () {
    if (!eon) return; eon = false; var go = edx > 70; edge.classList.remove("on", "go"); edge.style.transform = "";
    if (go && window.Nav) { getar(10); Nav.back(); }
  }, {passive: true});
}

/* ---------- 5. Tarik lembar (Menu) ke bawah untuk menutup ---------- */
var sh = null, sy0 = 0, sdy = 0;
D.addEventListener("touchstart", function (e) {
  var g = e.target.closest && e.target.closest(".sh-gr,.sh-h,.sh-cb"); sh = null; if (!g || e.touches.length !== 1) return;
  var s = g.closest(".sh-sheet"); if (!s || s.closest(".sh-pal")) return; sh = s; sy0 = e.touches[0].clientY; sdy = 0; s.style.transition = "none";
}, {passive: true});
D.addEventListener("touchmove", function (e) { if (!sh) return; sdy = Math.max(0, e.touches[0].clientY - sy0); sh.style.transform = "translateY(" + sdy + "px)"; }, {passive: true});
D.addEventListener("touchend", function () {
  if (!sh) return; var s = sh; sh = null; s.style.transition = "transform .22s cubic-bezier(.2,.8,.2,1)";
  if (sdy > 110) { s.style.transform = "translateY(100%)"; var ov = s.parentNode; setTimeout(function () { if (ov && ov.isConnected) ov.click(); }, 160); }
  else { s.style.transform = ""; setTimeout(function () { s.style.transition = ""; }, 240); }
}, {passive: true});

/* ---------- 6. Bilah offline ---------- */
var ob = D.createElement("div"); ob.className = "apk-off"; ob.setAttribute("role", "status"); ob.setAttribute("aria-live", "polite"); D.body.appendChild(ob);
var obT = 0;
function status(on, awal) {
  clearTimeout(obT); ob.classList.toggle("bad", !on);
  if (!on) { ob.textContent = "Anda sedang offline. Beberapa fitur butuh internet."; ob.classList.add("on"); }
  else if (!awal) { ob.textContent = "Kembali online"; ob.classList.add("on"); obT = setTimeout(function () { ob.classList.remove("on"); }, 2200); }
}
window.addEventListener("offline", function () { status(false); });
window.addEventListener("online", function () { status(true); });
if (navigator.onLine === false) status(false, true);

/* ---------- 7. Tombol ke atas ---------- */
var up = D.createElement("button"); up.type = "button"; up.className = "apk-up"; up.setAttribute("aria-label", "Kembali ke atas");
up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>'; D.body.appendChild(up);
up.onclick = function () { getar(8); window.scrollTo({top: 0, behavior: gerak() ? "smooth" : "auto"}); };
var upT = 0;
window.addEventListener("scroll", function () {
  if (upT) return; upT = setTimeout(function () { upT = 0; up.classList.toggle("on", window.scrollY > 700 && !adaLapisan()); }, 120);
}, {passive: true});

/* ---------- 8. Warna bilah status mengikuti tema ---------- */
function warna() {
  var m = D.querySelector('meta[name="theme-color"]'); if (!m) return;
  var t = H.getAttribute("data-theme"), gelap = t === "dark" || (t !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  var w = gelap ? "#0a1a3d" : "#1a46b5"; if (m.getAttribute("content") !== w) m.setAttribute("content", w);
}
if (window.MutationObserver) new MutationObserver(warna).observe(H, {attributes: true, attributeFilter: ["data-theme"]});
if (window.matchMedia) { var mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", warna); }
warna();

/* ---------- 9. API untuk Menu ---------- */
function bagikan() {
  var d = {title: "Takok Pelayanan Suroboyo", text: "Tanya, cari, dan urus layanan publik Surabaya lewat Takok.", url: location.origin + "/"};
  if (navigator.share) { navigator.share(d).catch(function () {}); return; }
  try { navigator.clipboard.writeText(d.url).then(function () { toast("Tautan Takok disalin. Silakan tempel ke teman."); }, function () { toast("Salin alamat: " + d.url); }); } catch (e) { toast("Salin alamat: " + d.url); }
}
window.Apk = {
  bagikan: bagikan,
  anim: function () { return anim; }, hap: function () { return hap; },
  toggleAnim: function () { anim = !anim; setPref("tk_anim", anim); H.classList.toggle("apk-noanim", !gerak()); toast("Animasi aplikasi " + (anim ? "dinyalakan" : "dimatikan")); },
  toggleHap: function () { hap = !hap; setPref("tk_hap", hap); toast("Getar " + (hap ? "dinyalakan" : "dimatikan")); if (hap) getar(20); },
  segarkan: function () { location.reload(); }
};
})();
