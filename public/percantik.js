"use strict";
/* Versi 47: memoles tampilan admin dan Asisten Takok (navigasi admin berkelompok dengan ikon dan lencana kotak masuk,
   pengaturan chatbot dirapikan ke menu ⋯, kartu sambutan). Tidak mengubah data atau perilaku fitur. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var P = {
  ring: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5", pmh: "M9 4h6v3H9zM7 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-1M9 14l2 2 4-4",
  bk: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4", an: "M4 20h16M7 20v-7M12 20V5M17 20v-10", skm: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", lap: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  bt: "M4 5h13v14H6a2 2 0 01-2-2zM17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5", kt: "M4 5h16v11H9l-5 4zM8.5 10.5h7", pk: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z", kn: "M4 12h5M15 6h5M15 18h5M9 12l6-6M9 12l6 6",
  kb: "M4 6h16M4 12h8M4 18h6M16 16a3 3 0 106 0 3 3 0 00-6 0zM21 21l-2-2", lk: "M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11zM10 10a2 2 0 104 0 2 2 0 00-4 0", kam: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  hr: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  vs: "M5 20V11M12 20V4M19 20v-6",
  pem: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a2.5 2.5 0 100-5M21 19a5 5 0 00-4-4.9", log: "M4 12a8 8 0 108-8M4 4v4h4M12 8v4l3 2", sh: "M3 12h4l2-6 4 12 2-6h6", ak: "M14 9a4 4 0 11-1 3l-9 6v-3h3v-3h3l1-1"
};
var GRUP = [["Layanan harian", ["ring", "hr", "inbox", "pmh", "bk"]], ["Wawasan", ["an", "vs", "skm", "lap"]], ["Konten dan chatbot", ["bt", "kt", "pk", "kn", "kb", "lk"]], ["Keamanan dan sistem", ["kam", "pem", "log", "sh", "ak"]]];
function ikon(d) { return '<svg class="ni" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }

/* ---------- navigasi admin ---------- */
var sibuk = false;
function rapikanTab() {
  var at = $("atabs"); if (!at || sibuk) return;
  var btn = {}; [].forEach.call(at.querySelectorAll("[data-at]"), function (b) { btn[b.dataset.at] = b; });
  if (!Object.keys(btn).length) return;
  /* urutan yang diinginkan: judul kelompok lalu tombolnya */
  var want = [];
  GRUP.forEach(function (g) { var ada = g[1].filter(function (k) { return btn[k]; }); if (ada.length) { want.push(g[0]); ada.forEach(function (k) { want.push(btn[k]); }); } });
  Object.keys(btn).forEach(function (k) { if (want.indexOf(btn[k]) < 0) want.push(btn[k]); });
  var kini = [].slice.call(at.children), sama = kini.length === want.length && kini.every(function (n, i) { return typeof want[i] === "string" ? (n.classList.contains("ng") && n.textContent === want[i]) : n === want[i]; });
  if (!sama) {
    sibuk = true;
    try {
      [].forEach.call(at.querySelectorAll(".ng"), function (n) { n.remove(); });
      want.forEach(function (w) {
        if (typeof w === "string") { var h = D.createElement("span"); h.className = "ng"; h.textContent = w; at.appendChild(h); return; }
        var k = w.dataset.at;
        if (!w.querySelector(".ni") && P[k]) w.insertAdjacentHTML("afterbegin", ikon(P[k]));
        if (!w.querySelector(".nb") && k === "inbox") w.insertAdjacentHTML("beforeend", '<span class="nb" hidden></span>');
        at.appendChild(w);
      });
      at.classList.add("ng-on");
    } finally { setTimeout(function () { sibuk = false; }, 0); }
  }
  lencana();
}
function lencana() {
  var b = D.querySelector('#atabs [data-at="inbox"] .nb'); if (!b) return;
  var m = D.title.match(/^\((\d+)\)/); b.hidden = !m; b.textContent = m ? m[1] : "";
}
function pantauAdmin() {
  var v = $("v-adm"); if (!v) return;
  function cek() { D.body.classList.toggle("adm-on", !v.hidden && v.dataset.on === "1"); }
  new MutationObserver(function () { cek(); var at = $("atabs"); if (at && !at.__pt) { at.__pt = 1; new MutationObserver(function () { if (!sibuk) rapikanTab(); }).observe(at, {childList: true}); rapikanTab(); } }).observe(v, {attributes: true, childList: true, subtree: false});
  cek(); setInterval(lencana, 3000);
}

/* ---------- Asisten Takok ---------- */
var TILE = [["M4 6h16M4 12h10M4 18h7M17 16a3 3 0 106 0 3 3 0 00-6 0z", "Urus NIB dan izin usaha", "Syarat, KBLI, loket", "q:mau bikin NIB"], ["M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l5 5", "Cari izin", "Biaya dan lama proses", "x:izin"],
  ["M9 4h6v3H9zM7 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-1M9 14l2 2 4-4", "Dokumen yang dibawa", "Daftar centang siap bawa", "q:syarat dokumen"], ["M5 5h14v15H5zM5 10h14M9 3v4M15 3v4", "Booking kunjungan", "Pilih hari dan jam", "q:booking kunjungan"],
  ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", "Status permohonan", "Lihat perkembangan berkas", "q:status permohonan saya"], ["M4 14v-2a8 8 0 0116 0v2M4 14h3v5H4zM17 14h3v5h-3z", "Buat pengaduan", "Disusun langkah demi langkah", "q:buat pengaduan"]];
function sambutan() {
  var m = $("bm"); if (!m || m.querySelector(".bw")) return;
  var d = D.createElement("div"); d.className = "bw";
  d.innerHTML = TILE.map(function (t) {
    var attr = t[3].indexOf("x:") === 0 ? 'data-x="' + t[3].slice(2) + '"' : 'data-b="' + t[3] + '"';
    return '<button type="button" ' + attr + '><span class="bwi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + t[0] + '"/></svg></span><b>' + t[1] + '</b><small>' + t[2] + '</small></button>';
  }).join("");
  m.appendChild(d); m.scrollTop = 0;
}
function rapikanHeader() {
  var hb = D.querySelector("#bp .bhb"), menu = $("bmore"); if (!hb || !menu) return;
  var tools = menu.querySelector(".bmt");
  if (!tools) { tools = D.createElement("div"); tools.className = "bmt"; tools.setAttribute("role", "group"); tools.setAttribute("aria-label", "Pengaturan Asisten"); menu.insertBefore(tools, menu.firstChild); }
  var nama = {"b-v": "Bacakan jawaban", "b-a": "Huruf besar", "b-c": "Gaya Suroboyoan"};
  [].slice.call(hb.children).forEach(function (b) {
    if (b.id === "b-x" || b.id === "b-o") return;
    if (nama[b.id]) b.textContent = nama[b.id]; else if (b.title && b.title.length <= 30 && b.textContent.trim().length <= 8) b.textContent = b.title;
    tools.appendChild(b);
  });
}
function pantauBot() {
  var m = $("bm"), hb = D.querySelector("#bp .bhb"); if (!m || !hb) return;
  rapikanHeader();
  new MutationObserver(rapikanHeader).observe(hb, {childList: true});
  new MutationObserver(function () {
    if (m.children.length === 1 && m.firstChild.classList.contains("b") && !m.firstChild.classList.contains("typ")) sambutan();
  }).observe(m, {childList: true});
  if (m.children.length === 1 && !m.firstChild.classList.contains("typ")) sambutan();
}
pantauAdmin(); pantauBot();
})();
