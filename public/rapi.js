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
var RTG = window.TKTGL ? TKTGL.baru() : {}, BO = false, busy = false, tm = 0, OB = null;

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
  } finally { busy = false; if (OB) OB.takeRecords(); }
}

/* Perbarui blok "Lihat lagi" hanya bila isinya berubah, supaya tombol tidak diganti saat diklik. */
function ubahMore(box, tl, html) {
  var cur = box ? box.querySelector(":scope > .rp-more") : (tl.nextElementSibling && tl.nextElementSibling.classList.contains("rp-more") ? tl.nextElementSibling : null);
  if (!html) { if (cur) cur.remove(); return; }
  if (cur) { if (cur.dataset.h !== html) { cur.dataset.h = html; cur.innerHTML = html; } return; }
  var m = document.createElement("div"); m.className = "rp-more"; m.dataset.h = html; m.innerHTML = html;
  if (box) box.appendChild(m); else tl.insertAdjacentElement("afterend", m);
}
function tiket(box) {
  var cards = [].slice.call(box.querySelectorAll(".tkcard"));
  if (!cards.length) return;
  var urut = cards.map(function (c, i) {
    var sel = /Selesai/.test((c.querySelector(".tkcard-h .pb") || {}).textContent || "");
    return {c: c, i: i, k: (ST.star[c.dataset.no] ? 0 : 2) + (sel ? 1 : 0)};
  });
  urut.sort(function (a, b) { return a.k - b.k || a.i - b.i; });
  var tl0 = box.querySelector(".rp-tools"), th = '<button type="button" class="chip" data-rp="bo" aria-pressed="' + BO + '">\u2B50 Hanya berbintang</button><button type="button" class="chip" data-rp="csv">\u2B07 Unduh tiket (CSV)</button>';
  if (!tl0) { tl0 = document.createElement("div"); tl0.className = "rp-tools"; var tf = box.querySelector(".tkf"); if (tf) tf.insertAdjacentElement("afterend", tl0); else box.insertBefore(tl0, box.firstChild); }
  if (tl0.dataset.h !== th) { tl0.dataset.h = th; tl0.innerHTML = th; }
  if (BO) urut = urut.filter(function (u) { if (ST.star[u.c.dataset.no]) return true; if (!u.c.hidden) u.c.hidden = true; return false; });
  var tgb = box.querySelector(".rp-tg");
  if (window.TKTGL) {
    if (!tgb) {
      tgb = document.createElement("div"); tgb.className = "rp-tg"; tgb.innerHTML = TKTGL.bar(RTG, "rp") + '<p class="sys" id="rp-tn"></p>';
      tl0.insertAdjacentElement("afterend", tgb); TKTGL.pasang(tgb, RTG, function () { NT = 6; rapikan(); });
    }
    if (TKTGL.aktif(RTG)) {
      var tm0 = {}; (window.TKT || []).forEach(function (t) { tm0[t.no] = t.buka; });
      var tot = urut.length;
      urut = urut.filter(function (u) { if (TKTGL.ok(RTG, tm0[u.c.dataset.no])) return true; if (!u.c.hidden) u.c.hidden = true; return false; });
      tgb.querySelector("#rp-tn").textContent = "Menampilkan " + urut.length + " dari " + tot + " tiket (" + TKTGL.ket(RTG) + ")";
    } else tgb.querySelector("#rp-tn").textContent = "";
  }
  urut.forEach(function (u, n) {
    var c = u.c;
    if (c.parentNode === box) { var kids = [].slice.call(box.querySelectorAll(".tkcard")); if (kids[n] !== c) { var mo = box.querySelector(".rp-more"); box.insertBefore(c, kids[n] || mo || null); } }
    c.classList.add("rp-c");
    if (!c.querySelector(".rp-st")) {
      var b = document.createElement("button"); b.type = "button"; b.className = "rp-st"; b.dataset.no = c.dataset.no; c.querySelector(".tkcard-h").insertBefore(b, c.querySelector(".tkcard-h").firstChild);
    }
    var sb = c.querySelector(".rp-st"), on = !!ST.star[c.dataset.no]; sb.textContent = on ? "★" : "☆"; sb.className = "rp-st" + (on ? " on" : ""); sb.setAttribute("aria-label", on ? "Hapus bintang" : "Beri bintang");
    decor(c);
    var hid = n >= NT; if (c.hidden !== hid) c.hidden = hid;
  });
  var sisa = urut.length - NT;
  ubahMore(box, null, sisa > 0 ? '<button type="button" class="btn" data-rp="tmore">Lihat ' + Math.min(sisa, 10) + ' tiket lagi</button><button type="button" class="btn" data-rp="tall">Lihat semua (' + sisa + ')</button><span class="sys">' + NT + ' dari ' + urut.length + '</span>' : "");
}

function decor(c) {
  var no = c.dataset.no, t = (window.TKT || []).filter(function (z) { return z.no === no; })[0]; if (!t) return;
  var act = c.querySelector(".tkact"); if (!act) return;
  var h = '<button type="button" class="chip" data-rp="cat" data-no="' + no + '">\uD83D\uDCDD Catatan</button>';
  var tunggu = (t.status === "Diterima" || t.status === "Dibaca admin") && Date.now() - t.buka > 864e5;
  if (tunggu) h += '<button type="button" class="chip" data-rp="ing" data-key="' + String(t.kunci).replace(/"/g, "") + '">\uD83D\uDD14 Ingatkan pegawai</button>';
  var sig = h + "|" + (ST.note && ST.note[no] || "");
  if (act.dataset.rp === sig) return; act.dataset.rp = sig;
  [].forEach.call(act.querySelectorAll("[data-rp]"), function (x) { x.remove(); });
  act.insertAdjacentHTML("beforeend", h);
  var nt = c.querySelector(".rp-note"); if (nt) nt.remove();
  if (ST.note && ST.note[no]) act.insertAdjacentHTML("beforebegin", '<p class="rp-note">\uD83D\uDCDD ' + String(ST.note[no]).replace(/[&<>"']/g, function (m) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[m]; }) + '</p>');
}
function catat(no) {
  var v = prompt("Catatan pribadi untuk tiket " + no + " (hanya tersimpan di perangkat ini, tidak dikirim ke admin):", (ST.note && ST.note[no]) || "");
  if (v === null) return; ST.note = ST.note || {}; v = v.trim().slice(0, 200); if (v) ST.note[no] = v; else delete ST.note[no]; simpan(); rapikan();
}
async function ingatkan(b) {
  b.disabled = true;
  try { await api("/api/pesan/eskalasi", {kunci: b.dataset.key}); toast("Permintaan diteruskan. Pegawai akan menjawab langsung."); }
  catch (x) { toast(x.message || "Gagal meneruskan permintaan."); b.disabled = false; }
}
function ekspor() {
  var L = window.TKT || []; if (!L.length) { toast("Belum ada tiket."); return; }
  var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
  var csv = "Nomor tiket,Loket,Status,Dibuat,Jumlah pesan,Catatan\n" + L.map(function (t) { return [t.no, label(t.kunci), t.status, new Date(t.buka).toLocaleString("id-ID"), t.n, (ST.note && ST.note[t.no]) || ""].map(q).join(","); }).join("\n");
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], {type: "text/csv"})); a.download = "tiket-saya.csv"; document.body.appendChild(a); a.click(); a.remove();
}
function chat(host) {
  [].forEach.call(host.querySelectorAll("#ml .tl"), function (tl, si) {
    var key = (tl.previousElementSibling && tl.previousElementSibling.textContent || "s" + si).slice(0, 12);
    var n = NC[key] || 5, items = [].slice.call(tl.children).filter(function (x) { return x.classList.contains("ti"); });
    items.forEach(function (x, i) { var hd = i >= n; if (x.hidden !== hd) x.hidden = hd; });
    ubahMore(null, tl, items.length > n ? '<button type="button" class="btn" data-rp="cmore" data-k="' + key.replace(/"/g, "") + '">Lihat ' + Math.min(10, items.length - n) + ' lagi</button><button type="button" class="btn" data-rp="call" data-k="' + key.replace(/"/g, "") + '">Lihat semua</button><span class="sys">' + n + ' dari ' + items.length + '</span>' : "");
  });
}

function jadwal() { if (busy) return; clearTimeout(tm); tm = setTimeout(rapikan, 40); }
function pasang() {
  var host = $("v-my"); if (!host) return;
  OB = new MutationObserver(function () { if (!busy) jadwal(); }); OB.observe(host, {childList: true, subtree: true});
  jadwal();
}

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-rp],.rp-st,.rp-c");
  if (!b) return;
  if (b.classList.contains("rp-st")) { e.stopImmediatePropagation(); e.preventDefault(); var no = b.dataset.no; if (ST.star[no]) delete ST.star[no]; else ST.star[no] = 1; simpan(); rapikan(); return; }
  var a = b.dataset.rp;
  if (a === "tiket" || a === "chat") { TAB = a; try { sessionStorage.setItem("tk_rapi_tab", a); } catch (x) {} var tb = $("v-my").querySelector(".rp-tabs"); if (tb) tb.dataset.h = ""; rapikan(); return; }
  if (a === "bo") { BO = !BO; NT = 6; rapikan(); return; }
  if (a === "tmore") { NT += 10; rapikan(); return; }
  if (a === "tall") { NT = 1e9; rapikan(); return; }
  if (a === "call") { NC[b.dataset.k] = 1e9; rapikan(); return; }
  if (a === "ing") { ingatkan(b); return; }
  if (a === "cat") { catat(b.dataset.no); return; }
  if (a === "csv") { ekspor(); return; }
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
