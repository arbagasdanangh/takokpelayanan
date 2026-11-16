"use strict";
/* Versi 70: Halaman "Percakapan saya" yang rapi saat tiket dan percakapan banyak (sisi pemohon).
   - Tab Tiket / Percakapan (satu per satu, tidak menumpuk panjang)
   - Kartu tiket ringkas satu baris, ketuk untuk membuka detail; aktif dan bintang di atas; "Lihat lagi"
   - Daftar percakapan dibatasi per kelompok dengan tombol "Lihat lagi"
   - Bintang tiket penting (tersimpan di perangkat pemohon)
   - Chatbot: /menunggu, /balasan, /bintang */
(function () {
var $ = function (i) { return document.getElementById(i); };
var KS = "tk_rapi", TAB = "tiket", NT = 6, NC = {}, ST = {star: {}};
try { var z = JSON.parse(localStorage.getItem(KS) || "{}"); if (z && z.star) ST = z; } catch (e) {}
try { var t0 = sessionStorage.getItem("tk_rapi_tab"); if (t0) TAB = t0; } catch (e) {}
function simpan() { try { localStorage.setItem(KS, JSON.stringify(ST)); } catch (e) {} }
var busy = false, tm = 0;

function rapikan() {
  var host = $("v-my"); if (!host || window.S !== "user") return;
  busy = true;
  try {
    var box = host.querySelector(".tkbox"), tkt = window.TKT || [];
    var nAk = tkt.filter(function (t) { return t.status !== "Selesai"; }).length;
    var nChat = 0; try { nChat = Object.keys(lastBy()).length; } catch (e) {}
    var tabs = host.querySelector(".rp-tabs");
    if (!tabs) { tabs = document.createElement("div"); tabs.className = "rp-tabs"; tabs.setAttribute("role", "tablist"); host.insertBefore(tabs, host.firstChild); }
    var h = '<button type="button" role="tab" data-rp="tiket" aria-selected="' + (TAB === "tiket") + '">🎫 Tiket <i>' + tkt.length + '</i>' + (nAk ? '<em>' + nAk + ' aktif</em>' : '') + '</button>'
          + '<button type="button" role="tab" data-rp="chat" aria-selected="' + (TAB === "chat") + '">💬 Percakapan <i>' + nChat + '</i></button>';
    if (tabs.dataset.h !== h) { tabs.dataset.h = h; tabs.innerHTML = h; }
    host.dataset.rtab = TAB;
    if (box) tiket(box);
    chat(host);
  } finally { busy = false; }
}

function tiket(box) {
  var cards = [].slice.call(box.querySelectorAll(".tkcard"));
  if (!cards.length) return;
  var urut = cards.map(function (c, i) {
    var sel = /Selesai/.test((c.querySelector(".tkcard-h .pb") || {}).textContent || "");
    return {c: c, i: i, k: (ST.star[c.dataset.no] ? 0 : 2) + (sel ? 1 : 0)};
  });
  urut.sort(function (a, b) { return a.k - b.k || a.i - b.i; });
  var ref = box.querySelector(".rp-more"); if (ref) ref.remove();
  urut.forEach(function (u, n) {
    var c = u.c;
    if (c.parentNode === box && box.children[box.children.length - 1] !== c) box.appendChild(c);
    c.classList.add("rp-c");
    if (!c.querySelector(".rp-st")) {
      var b = document.createElement("button"); b.type = "button"; b.className = "rp-st"; b.dataset.no = c.dataset.no; c.querySelector(".tkcard-h").insertBefore(b, c.querySelector(".tkcard-h").firstChild);
    }
    var sb = c.querySelector(".rp-st"), on = !!ST.star[c.dataset.no]; sb.textContent = on ? "★" : "☆"; sb.className = "rp-st" + (on ? " on" : ""); sb.setAttribute("aria-label", on ? "Hapus bintang" : "Beri bintang");
    c.hidden = n >= NT;
  });
  var sisa = cards.length - NT;
  if (sisa > 0) { var m = document.createElement("div"); m.className = "rp-more"; m.innerHTML = '<button type="button" class="btn" data-rp="tmore">Lihat ' + Math.min(sisa, 10) + ' tiket lagi</button><span class="sys">' + NT + ' dari ' + cards.length + '</span>'; box.appendChild(m); }
}

function chat(host) {
  [].forEach.call(host.querySelectorAll("#ml .tl"), function (tl, si) {
    var key = (tl.previousElementSibling && tl.previousElementSibling.textContent || "s" + si).slice(0, 12);
    var n = NC[key] || 5, items = [].slice.call(tl.children).filter(function (x) { return x.classList.contains("ti"); });
    items.forEach(function (x, i) { x.hidden = i >= n; });
    var nx = tl.nextElementSibling; if (nx && nx.classList.contains("rp-more")) nx.remove();
    if (items.length > n) { var m = document.createElement("div"); m.className = "rp-more"; m.innerHTML = '<button type="button" class="btn" data-rp="cmore" data-k="' + key.replace(/"/g, "") + '">Lihat ' + Math.min(10, items.length - n) + ' lagi</button><span class="sys">' + n + ' dari ' + items.length + '</span>'; tl.insertAdjacentElement("afterend", m); }
  });
}

function jadwal() { if (busy) return; clearTimeout(tm); tm = setTimeout(rapikan, 40); }
function pasang() {
  var host = $("v-my"); if (!host) return;
  new MutationObserver(function () { if (!busy) jadwal(); }).observe(host, {childList: true, subtree: true});
  jadwal();
}

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-rp],.rp-st,.rp-c");
  if (!b) return;
  if (b.classList.contains("rp-st")) { e.stopImmediatePropagation(); e.preventDefault(); var no = b.dataset.no; if (ST.star[no]) delete ST.star[no]; else ST.star[no] = 1; simpan(); rapikan(); return; }
  var a = b.dataset.rp;
  if (a === "tiket" || a === "chat") { TAB = a; try { sessionStorage.setItem("tk_rapi_tab", a); } catch (x) {} var tb = $("v-my").querySelector(".rp-tabs"); if (tb) tb.dataset.h = ""; rapikan(); return; }
  if (a === "tmore") { NT += 10; rapikan(); return; }
  if (a === "cmore") { NC[b.dataset.k] = (NC[b.dataset.k] || 5) + 10; rapikan(); return; }
  // kartu tiket: ketuk badan kartu untuk buka/tutup detail
  if (b.classList.contains("rp-c")) { if (e.target.closest("button,a,input")) return; b.classList.toggle("open"); }
}, true);
document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-tkf]")) { NT = 6; } }, true);
document.addEventListener("input", function (e) { if (e.target && e.target.id === "tkq") NT = 6; });

/* Chatbot: /menunggu, /balasan, /bintang */
function pasangBot() {
  var I = window.BOTI; if (!I || !window.BOTX || window.BOTX.__rp) return false; window.BOTX.__rp = 1;
  var p0 = window.BOTX.pre, esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  function daftar(judul, L, kosong) {
    if (window.S !== "user") return I.needIn ? I.needIn("Masuk dulu untuk melihat tiket Anda.") : null;
    if (!L.length) return I.bot(kosong, "");
    return I.bot(judul + " (" + L.length + "):", '<ul class="bul">' + L.slice(0, 8).map(function (t) { return "<li><b>" + esc(t.no) + "</b> &middot; " + esc(label(t.kunci)) + " &middot; " + esc(t.status) + "</li>"; }).join("") + "</ul>" + (L.length > 8 ? '<p class="bnote">Dan ' + (L.length - 8) + ' lainnya. Lihat selengkapnya di Percakapan Saya.</p>' : ""));
  }
  window.BOTX.pre = function (t, s) {
    var T = window.TKT || [];
    if (/^\/menunggu\b/i.test(t)) return daftar("Tiket yang masih menunggu balasan", T.filter(function (x) { return x.status === "Diterima" || x.status === "Dibaca admin"; }), "Tidak ada tiket yang menunggu. Semua pertanyaan sudah dibalas.");
    if (/^\/balasan\b/i.test(t)) return daftar("Tiket yang sudah dibalas", T.filter(function (x) { return x.status === "Dibalas"; }), "Belum ada balasan baru.");
    if (/^\/bintang\b/i.test(t)) return daftar("Tiket berbintang", T.filter(function (x) { return ST.star[x.no]; }), "Belum ada tiket berbintang. Ketuk ☆ pada kartu tiket untuk menandai.");
    return p0 ? p0(t, s) : null;
  };
  return true;
}
var tries = 0, iv = setInterval(function () { if (pasangBot() || ++tries > 40) clearInterval(iv); }, 500);
var iv2 = setInterval(function () { if ($("v-my")) { clearInterval(iv2); pasang(); } }, 300);
})();
