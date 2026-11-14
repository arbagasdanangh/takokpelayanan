"use strict";
/* Versi 55: penguat halaman masuk.
   1. Tampilkan/sembunyikan kata sandi dan PIN di semua kolom sandi (otomatis kembali tersembunyi setelah 20 detik atau saat masuk).
   2. Peringatan Caps Lock aktif.
   3. Peringatan lunak untuk PIN mudah ditebak saat daftar (hanya saran di layar; tidak memblokir).
   4. Tekan Enter untuk masuk/daftar.
   5. "Ingat nomor HP" (pilihan sendiri, hanya di perangkat ini) untuk login pemohon.
   6. reCAPTCHA v2 (kotak centang) untuk Masuk, Daftar, dan Masuk admin. Aktif OTOMATIS hanya bila RECAPTCHA_SITE_KEY dan RECAPTCHA_SECRET
      diisi di Vercel; bila tidak, tidak ada yang berubah. Token dikirim sebagai kolom "captcha" dan diperiksa server (api/app.py). */
(function () {
var D = document, HPK = "tk_hp_ingat", LOGIN = {"%2Fmasuk": "pemohon", "%2Fdaftar": "pemohon", "%2Fadmin%2Fmasuk": "admin"};
var CFG = null, CFGP = null, WID = new WeakMap(), siapRC = false, muatRC = false, toRev = null;
function rd(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
function wr(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

/* ---------- konfigurasi reCAPTCHA ---------- */
var f0 = window.fetch.bind(window);
function muatCfg() {
  if (!CFGP) CFGP = f0("/api/app?p=%2Fcaptcha", {credentials: "same-origin"}).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { CFG = j && j.aktif && j.site ? j : {aktif: false}; return CFG; }).catch(function () { CFG = {aktif: false}; return CFG; });
  return CFGP;
}
function muatSkrip() {
  if (muatRC || !CFG || !CFG.aktif) return; muatRC = true;
  window.__rcReady = function () { siapRC = true; pasangRC(); };
  var s = D.createElement("script"); s.src = "https://www.google.com/recaptcha/api.js?onload=__rcReady&render=explicit&hl=id"; s.async = true; s.defer = true; D.head.appendChild(s);
}
function pasangRC() {
  if (!siapRC || !window.grecaptcha || !grecaptcha.render) return;
  [].forEach.call(D.querySelectorAll(".lp-rc"), function (el) {
    if (WID.has(el)) return;
    try { WID.set(el, grecaptcha.render(el, {sitekey: CFG.site})); } catch (e) {}
  });
}
function slot(btnId, jenis) {
  var b = D.getElementById(btnId); if (!b || !b.parentNode || b.parentNode.querySelector(".lp-rc")) return;
  var d = D.createElement("div"); d.className = "lp-rc"; d.dataset.rc = jenis; d.setAttribute("aria-label", "reCAPTCHA"); b.parentNode.insertBefore(d, b);
}
function letakRC() {
  if (!CFG || !CFG.aktif) return;
  slot("lu", "pemohon"); slot("ld", "pemohon"); slot("la", "admin"); muatSkrip(); pasangRC();
}
/* Sisipkan token ke permintaan masuk/daftar/admin; batalkan bila belum dicentang. */
window.fetch = function (input, init) {
  var u = typeof input === "string" ? input : (input && input.url) || "", m = /[?&]p=([^&]*)/.exec(u), jenis = m && LOGIN[m[1]];
  if (!jenis || !init || typeof init.body !== "string") return f0(input, init);
  return muatCfg().then(function (c) {
    if (!c.aktif) return f0(input, init);
    var el = D.querySelector('.lp-rc[data-rc="' + jenis + '"]'), id = el && WID.get(el), tok = id !== undefined && window.grecaptcha ? grecaptcha.getResponse(id) : "";
    var galat = function (t) { return new Response(JSON.stringify({error: t}), {status: 400, headers: {"Content-Type": "application/json"}}); };
    if (!el || id === undefined) return galat("reCAPTCHA belum termuat. Periksa koneksi internet, lalu muat ulang halaman.");
    if (!tok) return galat("Centang kotak reCAPTCHA dulu.");
    var b; try { b = JSON.parse(init.body); } catch (e) { return f0(input, init); } b.captcha = tok;
    var i2 = Object.assign({}, init, {body: JSON.stringify(b)});
    return f0(input, i2).then(function (r) { try { grecaptcha.reset(id); } catch (e) {} return r; }, function (e) { try { grecaptcha.reset(id); } catch (x) {} throw e; });
  });
};

/* ---------- tampilkan sandi, Caps Lock, PIN lemah ---------- */
var LEMAH = /^(\d)\1{5}$/;
function lemah(p) { return LEMAH.test(p) || ["123456", "654321", "012345", "123123", "121212", "112233", "696969", "123321"].indexOf(p) > -1; }
function tambahToggle(inp) {
  inp.dataset.pw = "1";
  var b = D.createElement("button", {}); b.type = "button"; b.className = "chip lp-tg"; b.setAttribute("aria-pressed", "false"); b.textContent = "👁 Tampilkan"; b.setAttribute("aria-label", "Tampilkan kata sandi");
  var w = D.createElement("small"); w.className = "lp-w sys"; w.setAttribute("role", "status"); w.setAttribute("aria-live", "polite");
  inp.insertAdjacentElement("afterend", w); inp.insertAdjacentElement("afterend", b);
  b.addEventListener("click", function () {
    var tampil = inp.type === "password"; inp.type = tampil ? "text" : "password"; b.setAttribute("aria-pressed", String(tampil)); b.textContent = tampil ? "🙈 Sembunyikan" : "👁 Tampilkan"; b.setAttribute("aria-label", tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
    clearTimeout(toRev); if (tampil) toRev = setTimeout(function () { sembunyi(); }, 20000);
  });
  inp.addEventListener("keydown", caps); inp.addEventListener("keyup", caps); inp.addEventListener("blur", function () { w.textContent = ""; });
  if (inp.id === "lp") inp.addEventListener("input", function () { if (D.getElementById("ld")) w.textContent = inp.value.length === 6 && lemah(inp.value) ? "PIN ini mudah ditebak. Sebaiknya pilih 6 angka yang tidak berurutan atau berulang." : ""; });
}
function caps(e) { var w = e.target.parentNode && e.target.parentNode.querySelector(".lp-w"); if (!w || !e.getModifierState) return; if (e.getModifierState("CapsLock")) w.textContent = "⚠️ Caps Lock aktif."; else if (/Caps/.test(w.textContent)) w.textContent = ""; }
function sembunyi() { [].forEach.call(D.querySelectorAll('input[data-pw][type="text"]'), function (i) { i.type = "password"; var b = i.nextElementSibling; if (b && b.classList.contains("lp-tg")) { b.setAttribute("aria-pressed", "false"); b.textContent = "👁 Tampilkan"; b.setAttribute("aria-label", "Tampilkan kata sandi"); } }); }

/* ---------- ingat nomor HP ---------- */
function ingat() {
  var h = D.getElementById("lh"), lu = D.getElementById("lu"); if (!h || !lu || D.getElementById("lp-ing")) return;
  var tersimpan = rd(HPK), b = D.createElement("button"); b.type = "button"; b.id = "lp-ing"; b.className = "chip lp-tg"; b.setAttribute("aria-pressed", String(!!tersimpan)); b.textContent = "Ingat nomor HP di perangkat ini";
  if (tersimpan && !h.value) h.value = tersimpan;
  b.addEventListener("click", function () { var on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); if (!on) wr(HPK, ""); });
  h.insertAdjacentElement("afterend", b);
}
D.addEventListener("click", function (e) { var t = e.target; if (t && (t.id === "lu" || t.id === "ld" || t.id === "la")) { sembunyi(); var b = D.getElementById("lp-ing"), h = D.getElementById("lh"); if (t.id === "lu" && b && h && b.getAttribute("aria-pressed") === "true") wr(HPK, h.value.trim()); } }, true);

/* ---------- Enter untuk masuk ---------- */
D.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" || e.isComposing) return; var i = e.target; if (!i || !i.id || !i.closest || !i.closest("#lg")) return;
  var tujuan = {lh: "lu", lp: "lu", ln: "ld", le: "ld", lau: "la", lw: "la"}[i.id]; if (!tujuan) return;
  if (D.getElementById("ld") && (i.id === "lh" || i.id === "lp")) tujuan = "ld";
  var b = D.getElementById(tujuan); if (b) { e.preventDefault(); b.click(); }
});

/* ---------- pemindai (login dibangun ulang oleh app.js) ---------- */
var tunggu = false;
function proses() {
  tunggu = false;
  [].forEach.call(D.querySelectorAll('input[type="password"]:not([data-pw])'), tambahToggle);
  ingat(); if (CFG && CFG.aktif) letakRC();
}
new MutationObserver(function () { if (!tunggu) { tunggu = true; requestAnimationFrame(proses); } }).observe(D.documentElement, {childList: true, subtree: true});
muatCfg().then(function () { proses(); });
if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", proses); else proses();
window.LoginPlus = {sembunyi: sembunyi};
})();
