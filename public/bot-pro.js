"use strict";
/* Versi 46: Asisten Takok Pro. Semua berjalan di browser (tanpa AI luar, tanpa mengirim data ke pihak ketiga).
   1. Mengingat konteks: setelah loket ditampilkan, "biayanya?", "berapa lama?", "syaratnya?", "jam bukanya?", "lokasinya?" dijawab dari data loket itu.
   2. Tombol tindak lanjut di bawah kartu loket (Biaya, Lama proses, Syarat, Jam, Lokasi).
   3. Cari izin dari chat: /izin perpanjang parkir, atau kalimat bernada izin, memakai indeks jenis izin (UG.cari).
   4. Toleran salah ketik: "Maksud Anda ...?" dari kosakata loket, aturan Kata cari, dan sinonim.
   5. Menu perintah "/" dengan pelengkapan otomatis, riwayat pesan (panah atas), "/" memfokuskan kolom ketik.
   6. Efek mengetik, tombol Membantu / Belum (jawaban "Belum" dicatat anonim sebagai pertanyaan tak terjawab untuk admin).
   7. Menu ⋯: bersihkan, unduh, salin, cetak percakapan; mode lebar untuk desktop. */
(function () {
var D = document, B = window.BOTI;
if (!B) return;
var $b = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
var CTX = {k: null}, HIST = [], HI = -1, LASTQ = "";
var CMD = [["/bantuan", "Lihat semua yang bisa saya lakukan"], ["/izin", "Cari izin atau layanan, mis. /izin perpanjang parkir"], ["/kbli", "Cari kode KBLI, mis. /kbli warung kopi"], ["/ringkas", "Ringkas percakapan untuk dikirim ke admin"], ["/tanya", "Tanya loket langsung dari sini"], ["/status", "Status permohonan saya"], ["/antre", "Tiket dan antrean saya"], ["/booking", "Booking kunjungan"], ["/pengaduan", "Buat pengaduan"], ["/bersih", "Bersihkan percakapan"], ["/unduh", "Unduh percakapan (.txt)"], ["/jam", "Jam booking dan status sekarang"], ["/berangkat", "Hitung jam berangkat ke kunjungan Anda, mis. /berangkat 45"], ["/main", "Buka Ruang Main"], ["/rush", "Langsung ke Suroboyo Rush"], ["/warna", "Ganti warna tampilan, mis. /warna hijau"], ["/tema", "Ganti tema terang atau gelap"], ["/pantun", "Pantun layanan publik dari Cak Takok"], ["/catatan", "Catatan jawaban yang Anda simpan"], ["/siapkan", "Persiapan untuk kunjungan terdekat"], ["/panduan", "Panduan kunjungan 5 langkah"]];
var PERINTAH = {"/status": "status permohonan saya", "/antre": "tiket saya", "/booking": "booking kunjungan", "/pengaduan": "buat pengaduan"};

/* ---------- data loket yang sedang dibahas ---------- */
function ent(k) { return window.entryOf ? entryOf(k) : null; }
function lokOf(k) { var id = String(k).split("_")[0]; return (window.LOCS || []).filter(function (l) { return l.id === id; })[0] || {}; }
function btn(l, c) { return B.btn(l, c); }
function kartuInfo(judul, isi, aksi) { return '<div class="bc2"><b>' + E(judul) + '</b>' + isi + (aksi ? '<div class="ba">' + aksi + '</div>' : "") + '</div>'; }
function aksiDasar(k) { return btn("Buka loket", "open:" + k) + '<button type="button" data-v="sy:' + E(k) + '">Persyaratan</button>' + btn("Tanya admin", "fw:Pertanyaan tentang " + (ent(k) ? ent(k)[1] : "loket")); }
function jawabIni(jenis, k) {
  var e = ent(k); if (!e) return null;
  var l = lokOf(k), nm = e[1], IN = window.SY ? SY.info(k) : [], G = window.SY ? SY.grup(k) : [], ket = window.SY && SY.verif(k) ? "" : '<small class="bnote">Panduan umum, belum diverifikasi loket. Pastikan ke loket sebelum berangkat.</small>';
  if (jenis === "biaya" || jenis === "waktu") {
    var f = jenis === "biaya" ? "biaya" : "waktu", lb = jenis === "biaya" ? "Biaya" : "Lama proses", rows = IN.map(function (x) { return x[f] ? '<li><b>' + E(x.t || "Layanan") + '</b>: ' + E(x[f]) + '</li>' : ""; }).join("");
    if (!rows) return B.bot(lb + " untuk " + nm + " belum diisi admin loket. Tanyakan langsung agar tidak salah perkiraan.", kartuInfo(nm, '<p class="bnote">Tidak ada data ' + lb.toLowerCase() + ' pada loket ini.</p>', aksiDasar(k)));
    return B.bot(lb + " di " + nm + ":", kartuInfo(nm, '<ul class="bul">' + rows + '</ul>' + ket, aksiDasar(k)), 0, false, lb + " di " + nm);
  }
  if (jenis === "syarat") {
    if (!G.length) return B.bot("Persyaratan " + nm + " belum diisi admin loket.", kartuInfo(nm, "", aksiDasar(k)));
    var g = G[0], more = G.length > 1 ? '<p class="bnote">Ada ' + G.length + ' jenis layanan; lihat Persyaratan untuk semuanya.</p>' : "";
    return B.bot("Syarat yang harus dibawa" + (g.t ? " (" + g.t + ")" : "") + " di " + nm + ":", kartuInfo(nm, '<ul class="bul">' + g.items.slice(0, 8).map(function (x) { return '<li>' + E(x) + '</li>'; }).join("") + '</ul>' + (g.items.length > 8 ? '<p class="bnote">+' + (g.items.length - 8) + ' lagi</p>' : "") + more + ket, aksiDasar(k)));
  }
  if (jenis === "jam") {
    var jam = e[7] || l.jam || (window.CFG && CFG.jam) || "";
    return B.bot(jam ? "Jam layanan " + nm + ": " + jam + "." : "Jam layanan " + nm + " belum diisi. Umumnya hari kerja; pastikan lewat Tanya admin.", kartuInfo(nm, '<small class="bnote">Booking tersedia hari kerja pukul 08.00-14.00 (jeda 12.00).</small>', aksiDasar(k)));
  }
  if (jenis === "lokasi") {
    return B.bot(l.al ? nm + " berada di " + l.nm + ": " + l.al + "." : nm + " ada di " + (l.nm || "tempat pelayanan") + ". Alamat lengkap belum diisi.", kartuInfo(nm, '', '<a target="_blank" rel="noopener noreferrer" href="' + E(window.mapsUrl ? mapsUrl(l) : "#") + '">Buka peta</a>' + aksiDasar(k)));
  }
  return null;
}
var FU = {biaya: /\b(biaya|tarif|harga|bayar|gratis|retribusi)/, waktu: /\b(lama|lamanya|berapa hari|berapa lama|proses|prosesnya|selesai|sehari|cepat)/, syarat: /\b(syarat|syaratnya|dokumen|berkas|bawa|persyaratan)/, jam: /\b(jam|buka|tutup|operasional)/, lokasi: /\b(lokasi|alamat|dimana|di mana|letak|maps|peta)/};
var FUW = /\b(?:biaya|tarif|harga|bayar|gratis|retribusi|lama|lamanya|berapa|hari|proses|prosesnya|selesai|sehari|cepat|syarat|syaratnya|dokumen|berkas|bawa|persyaratan|jam|buka|tutup|operasional|lokasi|alamat|dimana|di|mana|letak|maps|peta|nya|itu|ini|nih|dong|ya|sih|apa|apakah|saja|yang|untuk|loket|tadi|tersebut|kalau|kalo|terus|lalu|kemudian|dan|atau|bagaimana|gimana|ada|nya)(?:nya)?\b/g;
function tindak(s) {
  if (!CTX.k || !ent(CTX.k) || s.length > 70) return null;
  var kind = null; Object.keys(FU).some(function (j) { if (FU[j].test(s)) { kind = j; return true; } });
  if (!kind) return null;
  var sisa = s.replace(FUW, " ").replace(/[^a-z0-9]+/g, " ").trim();
  if (sisa) return null; /* ada kata benda baru: biarkan pencarian biasa menangani */
  return jawabIni(kind, CTX.k);
}

/* ---------- cari izin dari chat ---------- */
var IZIN = /\b(izin|perizinan|perpanjang\w*|pengganti\w*|penggantian|rekomendasi|sertifikat|sip|sik|pbg|imb|slf|npwp|bpjs|skck|reklame|parkir|ipt)\b/;
function izinKartu(x) {
  var m = [x.biaya ? 'Biaya: <b>' + E(x.biaya) + '</b>' : "", x.waktu ? 'Proses: <b>' + E(x.waktu) + '</b>' : ""].filter(Boolean).join(" &middot; ");
  return '<div class="bc2"><b>' + E(x.jenis || x.loket) + '</b> <span class="btag">' + E(x.lokasi) + '</span><small>' + E(x.loket) + (x.zona ? " &middot; " + E(x.zona) : "") + '</small>' + (m ? '<p>' + m + '</p>' : "") +
    '<div class="ba">' + btn("Buka loket", "open:" + x.k) + '<button type="button" data-v="sy:' + E(x.k) + '">Persyaratan</button>' + (x.bk ? btn("Booking", "bk:" + x.k) : "") + '</div></div>';
}
function cariIzin(q, paksa) {
  if (!window.UG || !UG.cari) return null;
  var r = UG.cari(q); if (!r.length) return null;
  if (!paksa) { var h = window.kataHit ? kataHit(q.toLowerCase()) : {j: []}; if (h.j.length) return null; }
  CTX.k = r[0].k;
  return B.bot("Ini izin atau layanan yang paling cocok (" + Math.min(r.length, 3) + " teratas dari " + r.length + "):", r.slice(0, 3).map(izinKartu).join("") + '<div class="bch"><button type="button" data-x="izin">Buka pencarian izin lengkap</button></div>');
}

/* ---------- toleran salah ketik ---------- */
var VOC = null;
function vocab() {
  if (VOC) return VOC;
  var v = {};
  function add(s) { String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).forEach(function (w) { if (w.length >= 4 && !/^\d+$/.test(w)) v[w] = 1; }); }
  (window.LOCS || []).forEach(function (l) { add(l.nm); (window.LD && LD[l.id] || []).forEach(function (e) { add(e[1]); add(e[4]); }); });
  (window.KATA || []).forEach(function (r) { (r.k || []).forEach(add); });
  (B.KB || []).forEach(function (k) { add(k.t); });
  if (window.SYN) Object.keys(SYN).forEach(function (a) { add(a); add(SYN[a]); });
  ["permohonan", "pengaduan", "perpanjangan", "persyaratan", "reklame", "perizinan", "koperasi", "restoran", "pendidikan", "kesehatan", "pertanahan", "pembayaran", "booking", "antrean", "sertifikat", "bangunan", "lingkungan", "kependudukan", "pernikahan", "kelahiran", "kematian"].forEach(add);
  return (VOC = Object.keys(v));
}
function lev(a, b, mx) {
  if (Math.abs(a.length - b.length) > mx) return mx + 1;
  var p = [], i, j, c, t;
  for (j = 0; j <= b.length; j++) p[j] = j;
  for (i = 1; i <= a.length; i++) { var q = [i], mn = i; for (j = 1; j <= b.length; j++) { c = a[i - 1] === b[j - 1] ? 0 : 1; t = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + c); q[j] = t; if (t < mn) mn = t; } if (mn > mx) return mx + 1; p = q; }
  return p[b.length];
}
function koreksi(s) {
  var V = vocab(), set = {}; V.forEach(function (w) { set[w] = 1; });
  var ganti = 0, out = s.split(/(\s+)/).map(function (w) {
    var lw = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lw.length < 4 || set[lw] || /^\d+$/.test(lw) || (window.SYN && SYN[lw])) return w;
    var mx = lw.length >= 8 ? 2 : 1, best = null, bd = mx + 1;
    V.forEach(function (c) { var d = lev(lw, c, mx); if (d < bd) { bd = d; best = c; } });
    if (best && bd <= mx) { ganti++; return best; }
    return w;
  }).join("");
  return ganti ? out : null;
}
function adaHasil(s) {
  var tk = window.toks ? toks(s) : [], n = 0;
  if (window.kataHit) { var h = kataHit(s); if (h.j.length || h.k.length) return true; }
  if (window.score && tk.length) (window.LOCS || []).forEach(function (l) { (LD[l.id] || []).forEach(function (d) { if (score(d, tk) > 0) n++; }); });
  return n > 0;
}
function maksud(t, s) {
  if (s.length < 4 || s.length > 80 || adaHasil(s) || (B.KB || []).some(function (k) { return k.re.test(s); })) return null;
  var c = koreksi(s); if (!c || c === s || !adaHasil(c)) return null;
  return B.bot("Saya belum menemukan \"" + t + "\". Maksud Anda:", '<div class="bch">' + btn(c, "q:" + c) + '</div>');
}

/* ---------- penghubung ke pemroses pesan ---------- */
var _pre = window.BOTX && window.BOTX.pre;
window.BOTX = window.BOTX || {};
window.BOTX.pre = function (t, s) {
  LASTQ = t; if (HIST[HIST.length - 1] !== t) { HIST.push(t); if (HIST.length > 30) HIST.shift(); } HI = -1;
  var m = /^\/(\S+)\s*(.*)$/.exec(t);
  if (m) {
    var c = "/" + m[1].toLowerCase(), arg = m[2].trim();
    if (c === "/bantuan" || c === "/help") return bantuan();
    if (c === "/bersih") { bersih(); return Promise.resolve(); }
    if (c === "/unduh") { unduh(); return B.bot("Percakapan diunduh sebagai berkas teks."); }
    if (c === "/izin") { if (!arg) return B.bot("Tulis izin atau layanan yang dicari, mis. /izin perpanjang parkir.", '<div class="bch">' + btn("perpanjang parkir", "q:/izin perpanjang parkir") + btn("PBG rumah", "q:/izin pbg rumah") + '</div>'); return cariIzin(arg, true) || B.bot("Belum ada izin yang cocok dengan \"" + arg + "\". Coba kata lain.", '<div class="bch"><button type="button" data-x="izin">Buka pencarian izin lengkap</button></div>'); }
    if (c === "/kbli") return window.BOTX._asli(arg ? "kbli " + arg : "kbli");
    if (PERINTAH[c]) return window.BOTX._asli(PERINTAH[c]);
    if (c === "/ringkas" || c === "/tanya") return _pre ? _pre(t, s) : null;
  }
  var tf = tindak(s); if (tf) return tf;
  if (IZIN.test(s) && !/^(halo|hai|terima|makasih)/.test(s)) { var iz = cariIzin(t); if (iz) return iz; }
  var mk = maksud(t, s); if (mk) return mk;
  return _pre ? _pre(t, s) : null;
};
/* pemanggil pesan "asli" tanpa memantul ke pre lagi (untuk perintah yang meneruskan ke alur biasa) */
window.BOTX._asli = function (t) {
  var u = $b("bm").querySelectorAll(".bmsg.u"); if (u.length) u[u.length - 1].remove(); /* gelembung "/perintah" diganti gelembung kalimat biasa */
  var tmp = window.BOTX.pre; window.BOTX.pre = _pre; var r; try { r = B.ask(t); } finally { window.BOTX.pre = tmp; } return r;
};

function bantuan() {
  return B.bot("Yang bisa saya bantu:", '<ul class="bul"><li><b>Cari layanan atau izin</b>: ketik keperluan, atau /izin perpanjang parkir</li><li><b>Tanya lanjutan</b>: setelah loket muncul, tanya "biayanya?", "berapa lama?", "syaratnya?", "jam bukanya?"</li><li><b>Dokumen</b>: daftar siap bawa dengan centang</li><li><b>KBLI</b>: /kbli warung kopi</li><li><b>Booking, status, antrean, pengaduan</b></li><li><b>Perintah</b>: ketik / untuk menu perintah</li></ul><div class="bch">' + CMD.slice(0, 6).map(function (c) { return btn(c[0], "q:" + c[0]); }).join("") + '</div>');
}

/* ---------- tombol tindak lanjut, umpan balik, efek mengetik (mengamati pesan baru) ---------- */
function kunciPertama(n) { var b = n.querySelector('[data-b^="open:"]'); return b ? b.dataset.b.slice(5) : ((b = n.querySelector('[data-b^="bk:"]')) ? b.dataset.b.slice(3) : null); }
function pasangTindak(n) {
  var k = kunciPertama(n); if (!k || !ent(k)) return;
  CTX.k = k; if (n.querySelector(".bfc")) return;
  var adaSy = window.SY && SY.ada(k), d = D.createElement("div"); d.className = "bch bfc";
  d.innerHTML = '<span class="bfc-l">Tanya lanjut:</span>' + [["Biaya", "biaya"], ["Lama proses", "waktu"], ["Syarat", "syarat"], ["Jam", "jam"], ["Lokasi", "lokasi"]].map(function (x) { return '<button type="button" data-x="fu" data-j="' + x[1] + '" data-k="' + E(k) + '">' + x[0] + '</button>'; }).join("");
  n.appendChild(d);
}
function pasangUmpan(n) {
  if (n.querySelector(".bfb,.bfx,.bch.bq") || n.classList.contains("typ")) return;
  var p = n.querySelector("p"), subst = n.querySelector(".bc2,.bans") || (p && p.textContent.length > 60);
  if (!subst || !LASTQ || /^\//.test(LASTQ)) return;
  var d = D.createElement("div"); d.className = "bfx"; d.dataset.q = LASTQ.slice(0, 150);
  d.innerHTML = '<span>Membantu?</span><button type="button" data-x="up" aria-label="Membantu">\uD83D\uDC4D</button><button type="button" data-x="down" aria-label="Belum membantu">\uD83D\uDC4E</button>';
  n.appendChild(d);
}
function ketik(n) {
  if (RM || n.dataset.ty) return; n.dataset.ty = "1";
  var p = n.querySelector("p"); if (!p || p.children.length) return;
  var t = p.textContent; if (t.length < 24 || t.length > 700) return;
  var i = 0, step = Math.max(2, Math.ceil(t.length / 38)), m = $b("bm");
  p.textContent = ""; p.style.minHeight = "1.2em";
  (function tik() {
    if (!n.isConnected) return;
    i = Math.min(t.length, i + step); p.textContent = t.slice(0, i);
    if (m.scrollHeight - m.scrollTop - m.clientHeight < 140) m.scrollTop = m.scrollHeight;
    if (i < t.length) setTimeout(tik, 24);
  })();
}
function amati() {
  var m = $b("bm"); if (!m) return;
  new MutationObserver(function (ms) {
    ms.forEach(function (x) { [].forEach.call(x.addedNodes, function (n) {
      if (n.nodeType !== 1 || !n.classList.contains("bmsg") || !n.classList.contains("b") || n.classList.contains("typ")) return;
      ketik(n); pasangTindak(n); pasangUmpan(n);
    }); });
  }).observe(m, {childList: true});
}

/* ---------- unduh, bersih, salin, cetak ---------- */
function teksPercakapan() {
  return [].map.call($b("bm").querySelectorAll(".bmsg:not(.typ)"), function (n) {
    var c = n.cloneNode(true); [].forEach.call(c.querySelectorAll("button,.bfx,.bfc,.bsp"), function (x) { x.remove(); });
    return (n.classList.contains("u") ? "Saya" : "Asisten Takok") + ": " + c.innerText.replace(/\n{2,}/g, "\n").trim();
  }).join("\n\n");
}
function unduh() {
  var a = D.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFFPercakapan dengan Asisten Takok - " + new Date().toLocaleString("id-ID") + "\n\n" + teksPercakapan() + "\n\nTakok Pelayanan Suroboyo: " + location.origin], {type: "text/plain;charset=utf-8"}));
  a.download = "percakapan-takok.txt"; D.body.appendChild(a); a.click(); a.remove();
}
function bersih() { $b("bm").innerHTML = ""; CTX.k = null; B.bot("Percakapan dibersihkan. Mau mulai dari mana?", B.chips(B.MENU.slice(0, 6))); }
function cetak() {
  var d = D.createElement("div"); d.id = "bt-print"; d.innerHTML = '<h1>Percakapan Asisten Takok</h1><p>' + E(new Date().toLocaleString("id-ID")) + '</p><pre style="white-space:pre-wrap;font:inherit">' + E(teksPercakapan()) + '</pre>';
  D.body.appendChild(d); D.body.classList.add("bt-printing"); window.print();
  setTimeout(function () { D.body.classList.remove("bt-printing"); d.remove(); }, 500);
}

/* ---------- menu perintah "/" ---------- */
var SLI = -1;
function slHtml(v) {
  var q = v.toLowerCase().split(" ")[0], l = CMD.filter(function (c) { return c[0].indexOf(q) === 0; });
  return l;
}
function slTampil() {
  var i = $b("bi"), v = i.value, box = $b("bsl");
  if (!box) { box = D.createElement("ul"); box.id = "bsl"; box.className = "bsl"; box.setAttribute("role", "listbox"); box.hidden = true; i.parentNode.parentNode.insertBefore(box, i.parentNode); }
  if (!/^\/\S*$/.test(v)) { box.hidden = true; SLI = -1; return; }
  var l = slHtml(v); if (!l.length) { box.hidden = true; return; }
  if (SLI >= l.length) SLI = 0;
  box.innerHTML = l.map(function (c, n) { return '<li role="option" data-c="' + E(c[0]) + '"' + (n === SLI ? ' class="on" aria-selected="true"' : "") + '><b>' + E(c[0]) + '</b><small>' + E(c[1]) + '</small></li>'; }).join(""); box.hidden = false;
}
function slPilih(c) { var i = $b("bi"), perlu = /izin|kbli|berangkat|warna/.test(c); i.value = c + (perlu ? " " : ""); $b("bsl").hidden = true; SLI = -1; i.focus(); if (!perlu) $b("b-s").click(); }

/* ---------- tampilan: menu ⋯ dan mode lebar ---------- */
function bangun() {
  var hb = D.querySelector("#bp .bhb"); if (!hb) return;
  var more = D.createElement("button"); more.type = "button"; more.id = "b-o"; more.title = "Menu percakapan"; more.setAttribute("aria-label", "Menu percakapan"); more.setAttribute("aria-haspopup", "menu"); more.setAttribute("aria-expanded", "false"); more.innerHTML = "&#8943;";
  hb.insertBefore(more, hb.firstChild);
  var menu = D.createElement("div"); menu.id = "bmore"; menu.className = "bmore"; menu.setAttribute("role", "menu"); menu.hidden = true;
  menu.innerHTML = [["lebar", "Perlebar jendela (desktop)"], ["bersih", "Bersihkan percakapan"], ["unduh", "Unduh (.txt)"], ["salin", "Salin percakapan"], ["cetak", "Cetak / simpan PDF"], ["bantuan", "Bantuan & perintah"], ["izin", "Cari izin lengkap"]].map(function (x) { return '<button type="button" role="menuitem" data-m="' + x[0] + '">' + x[1] + '</button>'; }).join("");
  $b("bp").appendChild(menu);
  try { if (localStorage.getItem("tkb_wide") === "1") $b("bp").classList.add("wide"); } catch (x) {}
  more.onclick = function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; more.setAttribute("aria-expanded", !menu.hidden); };
  D.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest("#bmore,#b-o")) { menu.hidden = true; more.setAttribute("aria-expanded", "false"); } });
  menu.onclick = function (e) {
    var b = e.target.closest("[data-m]"); if (!b) return; menu.hidden = true; more.setAttribute("aria-expanded", "false");
    var a = b.dataset.m;
    if (a === "lebar") { var on = !$b("bp").classList.contains("wide"); $b("bp").classList.toggle("wide", on); try { localStorage.setItem("tkb_wide", on ? "1" : "0"); } catch (x) {} } else if (a === "bersih") bersih(); else if (a === "unduh") unduh(); else if (a === "cetak") cetak();
    else if (a === "salin") { try { navigator.clipboard.writeText(teksPercakapan()).then(function () { if (window.toast) toast("Percakapan disalin."); }); } catch (x) {} }
    else if (a === "bantuan") bantuan(); else if (a === "izin") { if (window.UG) { B.closeB(); UG.buka("cari"); } }
  };
}
function pasangInput() {
  var i = $b("bi"); if (!i) return;
  i.addEventListener("input", function () { SLI = -1; slTampil(); });
  i.addEventListener("keydown", function (e) {
    var box = $b("bsl"), buka = box && !box.hidden;
    if (buka) {
      var n = box.children.length;
      if (e.key === "ArrowDown") { e.preventDefault(); SLI = (SLI + 1) % n; slTampil(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); SLI = (SLI - 1 + n) % n; slTampil(); return; }
      if (e.key === "Tab" || (e.key === "Enter" && SLI >= 0)) { e.preventDefault(); var li = box.children[Math.max(SLI, 0)]; slPilih(li.dataset.c); return; }
      if (e.key === "Escape") { box.hidden = true; e.stopPropagation(); return; }
    }
    if (e.key === "ArrowUp" && !i.value && HIST.length) { e.preventDefault(); HI = HI < 0 ? HIST.length - 1 : Math.max(0, HI - 1); i.value = HIST[HI]; }
    else if (e.key === "ArrowDown" && HI > -1) { e.preventDefault(); HI++; i.value = HI >= HIST.length ? "" : HIST[HI]; if (HI >= HIST.length) HI = -1; }
  }, true);
  $b("bp").addEventListener("click", function (e) { var li = e.target.closest("#bsl li"); if (li) slPilih(li.dataset.c); });
  D.addEventListener("keydown", function (e) {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !$b("bp").hidden && !/^(INPUT|TEXTAREA|SELECT)$/.test((D.activeElement || {}).tagName || "")) { e.preventDefault(); i.focus(); }
  });
}
function pasangKlik() {
  $b("bp").addEventListener("click", function (e) {
    var b = e.target.closest("[data-x]"); if (!b) return; var a = b.dataset.x;
    if (a === "izin") { if (window.UG) { B.closeB(); UG.buka("cari"); } return; }
    if (a === "fu") { var lb = {biaya: "Biayanya berapa?", waktu: "Berapa lama prosesnya?", syarat: "Apa saja syaratnya?", jam: "Jam bukanya?", lokasi: "Di mana lokasinya?"}[b.dataset.j]; B.add("u", E(lb)); CTX.k = b.dataset.k; jawabIni(b.dataset.j, b.dataset.k); return; }
    if (a === "up" || a === "down") {
      var w = b.closest(".bfx"), q = w.dataset.q;
      if (a === "up") { w.innerHTML = "<span>Terima kasih! Senang bisa membantu.</span>"; return; }
      try { api("/api/bot/miss", {q: q}).catch(function () {}); } catch (x) {}
      w.innerHTML = "<span>Maaf belum tepat. Pertanyaan ini dicatat (tanpa identitas) agar admin bisa melengkapi jawabannya.</span>" + btn("Teruskan ke admin", "fw:" + q);
    }
  });
}
function mulai() { bangun(); pasangInput(); pasangKlik(); amati(); }
if ($b("bp")) mulai();
window.BOTPRO = {koreksi: koreksi, jawabIni: jawabIni, ctx: CTX, cariIzin: cariIzin};
})();
