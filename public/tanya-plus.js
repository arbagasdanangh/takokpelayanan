"use strict";
/* Tanya Plus: (1) Jawaban Instan saat warga mengetik pertanyaan (dari aturan Kata cari + KBLI), sehingga banyak pertanyaan selesai
   tanpa menunggu pegawai; (2) "Ramai ditanyakan minggu ini" (anonim, dari pemakaian chatbot) di beranda dan chatbot;
   (3) "Mulai dari sini" per kebutuhan di chatbot. Semua jalan di browser. */
(function () {
var $ = function (i) { return document.getElementById(i); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var PERSONA = [["🏪 Mau buka usaha baru", "Saya mau buka usaha baru, urus NIB dan izinnya"], ["🏠 Bangun atau renovasi rumah", "Syarat PBG bangun atau renovasi rumah"], ["📄 Perpanjang atau ubah izin", "Cara perpanjang atau ubah izin usaha"], ["📣 Mau mengadu", "Saya mau mengadu"]];
var POP = [], SAV = 0, TMR = null;
try { SAV = +localStorage.getItem("tp_sav") || 0; } catch (e) {}
function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
function popItems() {
  var R = window.KATA || [], out = [], seen = {};
  POP.forEach(function (p) { if (!seen[p.k]) { seen[p.k] = 1; out.push({q: cap(p.k), n: p.n}); } });
  if (out.length < 4) R.forEach(function (r) { var k = (r.k || [])[0]; if (k && r.j && !seen[k] && out.length < 6) { seen[k] = 1; out.push({q: cap(k), n: 0}); } });
  return out.slice(0, 6);
}
function chipsHtml(items, mode) { return items.map(function (x) { return mode === "bot" ? '<button type="button" data-b="q:' + esc(x.q) + '">' + (x.n ? "🔥 " : "") + esc(x.q) + '</button>' : '<button type="button" class="chip" data-tpq="' + esc(x.q) + '">' + (x.n ? "🔥 " : "") + esc(x.q) + (x.n > 1 ? ' <small>' + x.n + 'x</small>' : "") + '</button>'; }).join(""); }
function home() {
  var ex = $("ex"); if (!ex) return; var it = popItems(); if (!it.length) return;
  var d = $("tp-pop"); if (!d) { d = document.createElement("div"); d.id = "tp-pop"; d.className = "hint tp-pop"; ex.parentNode.insertBefore(d, ex.nextSibling); }
  d.innerHTML = '<b>' + (POP.length ? "🔥 Ramai ditanyakan minggu ini" : "💬 Sering ditanyakan") + '</b>' + chipsHtml(it, "home") + '<button type="button" class="chip" data-tp="kbli">🔎 Cari kode KBLI</button>';
}
function load() {
  fetch("/api/populer", {credentials: "same-origin"}).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.populer) POP = j.populer; }).catch(function () {}).then(function () {
    var n = 0, t = setInterval(function () { n++; if ((window.KATA && window.KATA.length) || n > 40) { clearInterval(t); home(); } }, 500);
  });
}
function kanalLinks() {
  var K = (window.CFG && CFG.kanal) || {}, o = "";
  if (K.wa) o += '<a target="_blank" rel="noopener noreferrer" href="https://wa.me/' + esc(K.wa) + '?text=Halo">💬 Chat di WhatsApp</a>';
  if (K.tg) o += '<a target="_blank" rel="noopener noreferrer" href="https://t.me/' + esc(K.tg) + '">✈️ Chat di Telegram</a>';
  return o;
}
function welcome() {
  if (!window.BOTI) return; var it = popItems();
  BOTI.bot("Atau mulai dari sini:", '<div class="bch">' + PERSONA.map(function (p) { return '<button type="button" data-b="q:' + esc(p[1]) + '">' + esc(p[0]) + '</button>'; }).join("") + '<button type="button" data-tp="kbli">🔎 Cari kode KBLI usaha saya</button>' + kanalLinks() + '</div>' + (it.length ? '<div class="tp-h">' + (POP.length ? "🔥 Ramai ditanyakan minggu ini" : "💬 Sering ditanyakan") + '</div><div class="bch">' + chipsHtml(it, "bot") + '</div>' : ""), 300);
}
/* ---------- Jawaban Instan ---------- */
function box(ta) { var b = ta.parentNode.querySelector(".tp-ins"); if (!b) { b = document.createElement("div"); b.className = "tp-ins"; b.setAttribute("role", "status"); b.setAttribute("aria-live", "polite"); ta.parentNode.insertBefore(b, ta); } return b; }
function kbliBox(t) {
  var K = window.KBLI; if (!K || !K.has() || !/usaha|nib|kbli|izin|warung|toko|jual|bengkel|kedai|kafe|jasa|dagang|salon|laundry|kos|restoran/i.test(t)) return "";
  var r = K.search(t.replace(/\b(apa|syarat|bikin|buat|nib|mohon|info|tolong|untuk|izin|usaha|kbli|saya|mau|ingin|cara|bagaimana|dan|yang|di|ke|dari)\b/gi, " ").replace(/\s+/g, " ").trim(), 2); if (!r.length) return "";
  return '<div class="tp-k"><small>Kode KBLI yang mungkin cocok:</small>' + r.map(function (x) { return '<span class="chip">' + esc(x[0]) + ' ' + esc(x[1].length > 34 ? x[1].slice(0, 32) + "…" : x[1]) + '</span>'; }).join("") + '<button type="button" class="chip" data-tp="kbli" data-q="' + esc(t.slice(0, 80)) + '">Buka Pandu KBLI</button></div>';
}
function instan(ta) {
  var t = ta.value.trim(), b = box(ta); if (ta.dataset.tpSkip === t) { return; }
  if (t.length < 8 || !window.kataHit) { b.innerHTML = ""; return; }
  var h; try { h = window.kataHit(t); } catch (e) { return; }
  var kb = kbliBox(t);
  if (!(h.j && h.j.length) && !kb) { b.innerHTML = ""; return; }
  var ks = h.i.map(function (i) { return ((window.KATA || [])[i].k || [])[0]; }).filter(Boolean).slice(0, 2);
  b.innerHTML = (h.j.length ? '<div class="tp-c"><b>💡 Mungkin ini menjawab pertanyaan Anda</b><div class="tp-a">' + (window.fmtJawab ? window.fmtJawab(h.j[0]) : esc(h.j[0])) + '</div><div class="btns"><button type="button" class="send" data-tp="ok" data-ks="' + esc(ks.join("|")) + '">✓ Sudah terjawab</button><button type="button" class="btn" data-tp="skip">Tetap kirim ke pegawai</button></div>' + (SAV ? '<small class="sys">Anda sudah terbantu ' + SAV + ' kali tanpa menunggu 🎉</small>' : "") + '</div>' : "") + kb;
}
document.addEventListener("input", function (e) {
  var ta = e.target; if (!(ta && ta.matches && ta.matches('textarea[data-k^="q:"]'))) return;
  clearTimeout(TMR); TMR = setTimeout(function () { instan(ta); }, 450);
});
/* ---------- Klik ---------- */
document.addEventListener("click", function (e) {
  var x = e.target.closest && e.target.closest("[data-tp],[data-tpq]"); if (!x) return;
  if (x.dataset.tpq) { if (window.openAsisten) { openAsisten(); setTimeout(function () { askAsisten(x.dataset.tpq); }, 120); } return; }
  var a = x.dataset.tp;
  if (a === "kbli") { if (window.PanduKBLI) PanduKBLI.buka(x.dataset.q || ""); }
  else if (a === "skip") { var ta = x.closest(".qf").querySelector("textarea"); ta.dataset.tpSkip = ta.value.trim(); box(ta).innerHTML = ""; }
  else if (a === "ok") {
    var ta2 = x.closest(".qf").querySelector("textarea"), ks = (x.dataset.ks || "").split("|").filter(Boolean);
    if (ks.length) { try { fetch("/api/bot/hit", {method: "POST", headers: {"Content-Type": "application/json"}, credentials: "same-origin", body: JSON.stringify({ks: ks, v: 0})}).then(function () { return fetch("/api/bot/hit", {method: "POST", headers: {"Content-Type": "application/json"}, credentials: "same-origin", body: JSON.stringify({ks: ks, v: 1})}); }).catch(function () {}); } catch (z) {} }
    ta2.value = ""; ta2.dataset.tpSkip = ""; box(ta2).innerHTML = ""; SAV++; try { localStorage.setItem("tp_sav", SAV); } catch (z) {}
    if (window.toast) toast("Senang bisa membantu. Pertanyaan tidak perlu dikirim.");
  }
});
window.TP = {welcome: welcome, home: home};
load();
})();
