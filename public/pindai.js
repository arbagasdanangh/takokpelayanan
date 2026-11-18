"use strict";
/* Versi 73: Pindai tiket untuk admin dan petugas loket.
   1) Pemindai barcode USB/Bluetooth (mode keyboard) bekerja dari mana saja di halaman admin: tembak kartu tiket, percakapan langsung terbuka.
   2) Tombol Pindai kamera (BarcodeDetector: Chrome/Edge Android dan desktop terbaru) dengan isian manual sebagai cadangan.
   3) Riwayat 6 tiket terakhir yang dibuka (hanya di peramban ini). Memakai rute /admin/tiket yang sudah ada (hormati wewenang loket). */
(function () {
var $ = function (i) { return document.getElementById(i); }, RX = /^TKT-\d{4}-\d{3,}$/, RXA = /^[A-Z]{3}\d{2}-\d{4}-\d{3}$/, KS = "tk_pindai";
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var RIW = []; try { RIW = JSON.parse(localStorage.getItem(KS) || "[]") || []; } catch (e) {}
function simpanRiw(no) { RIW = [no].concat(RIW.filter(function (x) { return x !== no; })).slice(0, 6); try { localStorage.setItem(KS, JSON.stringify(RIW)); } catch (e) {} }
function norm(v) { return String(v || "").trim().toUpperCase().replace(/^\*|\*$/g, "").replace(/\s+/g, ""); }

async function buka(no) {
  no = norm(no);
  if (RXA.test(no)) { if (window.TKANT) TKANT.scan(no); else toast("Modul antrean belum dimuat."); return true; }
  if (!RX.test(no)) { toast("Format nomor tidak dikenali (tiket pertanyaan atau nomor antrean)."); return false; }
  try {
    var r = await api("/api/admin/tiket?no=" + encodeURIComponent(no)); if (!r || !r.pid) throw new Error("Tiket tidak ditemukan.");
    AF.st = "all"; AF.q = ""; var as = $("as"); if (as) as.value = "";
    var cu = T.filter(function (z) { return z.pid === r.pid && z.kunci === r.kunci; })[0]; pick(cu || r);
    simpanRiw(no); toast("Tiket " + no + " dibuka."); riwayat(); return true;
  } catch (x) { toast(x.message || "Tiket tidak ditemukan."); return false; }
}

/* 1) pemindai mode keyboard: karakter sangat cepat lalu Enter */
var buf = "", last = 0;
document.addEventListener("keydown", function (e) {
  if (window.S !== "adm" || e.ctrlKey || e.metaKey || e.altKey) return;
  var now = Date.now(), tg = e.target, ed = tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || (tg && tg.isContentEditable);
  if (now - last > 80) buf = ""; last = now;
  if (e.key === "Enter") {
    var v = norm(buf); buf = "";
    if (RX.test(v) || RXA.test(v)) { e.preventDefault(); e.stopPropagation(); if (ed && "value" in tg) tg.value = tg.value.replace(/\s*\*?TKT-[\d-]*\*?$/i, ""); buka(v); }
    return;
  }
  if (e.key.length === 1) buf += e.key;
}, true);

/* 2) kamera */
var kam = null;
function pesanKam(x) {
  var n = x && x.name;
  if (n === "NotAllowedError" || n === "PermissionDeniedError") return "Izin kamera ditolak atau diblokir. Ketuk ikon gembok di peramban, izinkan Kamera untuk situs ini, lalu coba lagi.";
  if (n === "NotFoundError" || n === "DevicesNotFoundError") return "Perangkat ini tidak punya kamera yang bisa dipakai.";
  if (n === "NotReadableError" || n === "TrackStartError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
  if (n === "SecurityError") return "Kamera diblokir oleh kebijakan keamanan halaman.";
  return "Kamera tidak bisa dibuka (" + (n || "galat tidak dikenal") + ").";
}
async function ambilKamera() {
  var md = navigator.mediaDevices;
  try { return await md.getUserMedia({video: {facingMode: {ideal: "environment"}}, audio: false}); }
  catch (x) { if (x && (x.name === "OverconstrainedError" || x.name === "NotFoundError" || x.name === "AbortError")) return await md.getUserMedia({video: true, audio: false}); throw x; }
}
function tutupKam() { if (!kam) return; kam.stop = true; try { kam.stream && kam.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} kam.el.remove(); kam = null; }
async function pindai() {
  if (kam) return;
  var el = document.createElement("div"); el.className = "pd-ov"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Pindai tiket");
  var ok = "BarcodeDetector" in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  el.innerHTML = '<div class="pd-box"><b>Pindai kartu tiket</b>' + (ok ? '<video class="pd-v" playsinline muted></video><p class="sys" id="pd-s">Arahkan kamera ke barcode pada kartu tiket.</p>' : '<p class="sys">Peramban ini belum mendukung pindai lewat kamera. Gunakan pemindai barcode USB/Bluetooth, atau ketik nomor tiket di bawah.</p>')
    + '<div class="pd-m"><input id="pd-i" placeholder="TKT-2611-00001 atau PUS08-1711-003" autocomplete="off" inputmode="text" aria-label="Nomor tiket"><button type="button" class="btn send" data-pd="go">Buka</button></div><button type="button" class="btn" data-pd="x">Tutup</button></div>';
  document.body.appendChild(el); kam = {el: el, stop: false, stream: null};
  var inp = el.querySelector("#pd-i"); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.stopPropagation(); el.querySelector("[data-pd=go]").click(); } });
  if (!ok) { inp.focus(); return; }
  try {
    var det = new window.BarcodeDetector({formats: ["code_39", "qr_code"]}), v = el.querySelector("video");
    kam.stream = await ambilKamera(); v.srcObject = kam.stream; await v.play();
    var cur = kam, loop = async function () {
      if (!kam || kam !== cur || cur.stop) return;
      try { var h = await det.detect(v); for (var i = 0; i < h.length; i++) { var n = norm(h[i].rawValue); if (RX.test(n) || RXA.test(n)) { tutupKam(); buka(n); return; } } } catch (e) {}
      setTimeout(loop, 250);
    };
    loop();
  } catch (x) { var s = el.querySelector("#pd-s"); if (s) s.textContent = pesanKam(x) + " Atau ketik nomor tiket di bawah."; inp.focus();
    if (window.DiagKamera && s) DiagKamera.jalankan(x).then(function (d) { if (s.isConnected) s.innerHTML = "<b>" + esc2(d.judul) + "</b><br>" + d.langkah.map(esc2).join("<br>") + '<br><a href="/cek-kamera.html" target="_blank" rel="noopener">Cek kamera lengkap</a> atau ketik nomor tiket di bawah.'; }).catch(function () {}); }
}
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-pd]"); if (!b) return;
  var a = b.dataset.pd;
  if (a === "scan") pindai();
  else if (a === "x") tutupKam();
  else if (a === "go") { var v = kam && kam.el.querySelector("#pd-i").value; if (norm(v)) { tutupKam(); buka(v); } }
  else if (a === "riw") buka(b.dataset.no);
}, true);

/* tombol dan riwayat di kotak masuk */
function riwayat() {
  var rw = $("pd-riw"); if (!rw) return;
  var h = RIW.map(function (n) { return '<button type="button" class="chip" data-pd="riw" data-no="' + esc2(n) + '">' + esc2(n.replace("TKT-", "")) + '</button>'; }).join("");
  var s = (h ? '<small class="sys">Terakhir dibuka:</small>' : "") + h; if (rw.dataset.h !== s) { rw.dataset.h = s; rw.innerHTML = s; }
}
function pasang() {
  if (window.S !== "adm") return; var as = $("as"); if (!as || $("pd-bar")) return;
  var bar = document.createElement("div"); bar.id = "pd-bar"; bar.className = "pd-bar";
  bar.innerHTML = '<button type="button" class="chip" data-pd="scan">📷 Pindai tiket</button><span id="pd-riw" class="pd-riw"></span>';
  as.insertAdjacentElement("afterend", bar); riwayat();
}
setInterval(pasang, 800);
window.TKPINDAI = {buka: buka, norm: norm};
})();
