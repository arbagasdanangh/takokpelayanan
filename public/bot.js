"use strict";
/* Asisten Takok: chatbot pemandu layanan. Jalan di browser dari data loket yang sudah ada;
   tidak ada AI luar dan tidak ada data yang dikirim ke pihak ketiga. */
(function () {
var $b = function (i) { return document.getElementById(i); };
var ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h7"/></svg>';
var MENU = [["Izin usaha / NIB", "mau bikin NIB"], ["Dokumen yang dibawa", "syarat dokumen"], ["Status permohonan", "status permohonan saya"], ["Antrean & tiket saya", "tiket saya"], ["Booking kunjungan", "booking kunjungan"], ["Lokasi & jam", "lokasi dan jam buka"], ["Instansi di MPP", "daftar instansi mpp"], ["Buat pengaduan", "buat pengaduan"], ["Berita terbaru", "berita terbaru"]];
var KAT = ["Pelayanan lambat", "Petugas kurang ramah", "Pungutan tidak wajar", "Sistem/aplikasi bermasalah", "Informasi tidak jelas", "Lainnya"];
var KB = [
 {id: "nib", t: "Membuat NIB / izin usaha", re: /\b(nib|kbli|oss|umkm|usaha|toko|warung|kopi|restoran|dagang)/, a: [/^loket cs$/i, /analisa/i, /pengambilan/i], d: ["KTP pemilik usaha", "NPWP (pribadi atau badan usaha)", "Email dan nomor HP aktif", "Alamat lokasi usaha", "Pilihan KBLI (jenis kegiatan usaha)", "Perkiraan modal dan jumlah tenaga kerja"]},
 {id: "sip", t: "SIP dokter, bidan, perawat, apoteker, klinik", re: /\b(sip|dokter|bidan|perawat|apoteker|klinik|praktik)/, a: [/^loket cs$/i, /analisa/i, /pengambilan/i], d: ["KTP", "STR yang masih berlaku", "Ijazah / sertifikat kompetensi", "Pas foto terbaru", "Rekomendasi organisasi profesi", "Alamat atau denah tempat praktik"]},
 {id: "pbg", t: "PBG / IMB / SLF bangunan", re: /\b(pbg|imb|slf|bangunan|renovasi|rumah)/, a: [/^loket cs$/i, /analisa/i, /pengambilan/i], d: ["KTP pemilik bangunan", "Bukti kepemilikan atau penguasaan tanah", "Gambar rencana (arsitektur dan struktur)", "Data lokasi dan peruntukan ruang", "NPWP", "Surat pernyataan yang diminta sistem SIMBG"]},
 {id: "reklame", t: "Izin reklame", re: /\b(reklame|baliho|iklan|billboard|spanduk)/, a: [/^loket cs$/i, /analisa/i], d: ["KTP / identitas pemohon", "Desain dan ukuran reklame", "Titik lokasi pemasangan", "Persetujuan pemilik lahan atau bangunan", "NIB / NPWP usaha"]},
 {id: "ipt", t: "IPT dan retribusi IPT", re: /\b(ipt|retribusi)/, a: [/retribusi ipt/i], d: ["KTP", "Dokumen IPT lama (bila perpanjangan)", "Data lokasi dan luas tanah", "NPWP", "Bukti pembayaran sebelumnya (bila ada)"]},
 {id: "amdal", t: "Izin lingkungan (AMDAL, UKL-UPL, SPPL)", re: /\b(amdal|ukl|upl|sppl|limbah|lingkungan)/, a: [/^loket cs$/i, /dlh/i], d: ["NIB atau data usaha", "Uraian kegiatan dan proses produksi", "Lokasi dan luas lahan", "Jenis dan perkiraan limbah", "Denah atau tata letak"]},
 {id: "kop", t: "Koperasi", re: /\b(koperasi)/, a: [/dinkoperdag/i], d: ["KTP para pendiri", "Daftar pendiri / anggota", "Rencana usaha dan anggaran", "Alamat sekretariat"]}
];
var SBY = [[/\bHalo\b/g, "Piye kabare"], [/\bSilakan\b/g, "Monggo"], [/\bTerima kasih\b/g, "Matur nuwun"], [/\bAnda\b/g, "sampeyan"], [/\bsaya\b/g, "aku"], [/\btidak\b/g, "gak"], [/\bbelum\b/g, "durung"], [/\bsudah\b/g, "wis"], [/\bada\b/g, "onok"], [/\bbisa\b/g, "iso"]];
var AUTO = false, SBYM = false, WZ = null, REC = null, SR = window.SpeechRecognition || window.webkitSpeechRecognition, CK = {};
try { CK = JSON.parse(localStorage.getItem("tkb_ck") || "{}"); } catch (x) {}
function save() { try { localStorage.setItem("tkb_ck", JSON.stringify(CK)); } catch (x) {} }
function tone(s) { if (!SBYM) return s; SBY.forEach(function (r) { s = s.replace(r[0], r[1]); }); return s; }
function sapa() { var h = wibDate(0).getHours(), w = h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam"; return "Selamat " + w + (S === "user" && ME ? ", " + ME.nama.split(" ")[0] : "") + "!"; }
function speak(t) { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = "id-ID"; speechSynthesis.speak(u); } catch (x) {} }
function chips(a) { return '<div class="bch">' + a.map(function (x) { return '<button type="button" data-b="q:' + esc(x[1]) + '">' + esc(x[0]) + '</button>'; }).join("") + '</div>'; }
function btn(l, c) { return '<button type="button" data-b="' + c + '">' + esc(l) + '</button>'; }
function add(w, h, plain) {
  var m = $b("bm"), d = document.createElement("div");
  d.className = "bmsg " + w; d.innerHTML = h;
  if (plain) { d.dataset.t = plain; d.insertAdjacentHTML("beforeend", '<button type="button" class="bsp" data-b="say">Dengarkan</button>'); }
  m.appendChild(d); m.scrollTop = m.scrollHeight; return d;
}
function bot(txt, extra, delay, raw, plain) {
  return new Promise(function (r) {
    var m = $b("bm"), t = document.createElement("div");
    t.className = "bmsg b typ"; t.innerHTML = "<i></i><i></i><i></i>"; m.appendChild(t); m.scrollTop = m.scrollHeight;
    setTimeout(function () { t.remove(); var p = raw ? (txt || "") : tone(txt || ""), sp = plain || p; add("b", (p ? "<p>" + esc(p) + "</p>" : "") + (extra || ""), sp); if (AUTO && sp) speak(sp); r(); }, delay || 420);
  });
}
function needIn(t) { return bot(t, '<div class="bch">' + btn("Masuk / daftar", "login") + '</div>'); }
function ringkasU(t) { t = plainJ(t).replace(/\s+/g, " ").trim(); return t.length > 140 ? t.slice(0, 140) + "…" : t; }
function lk(l, d) {
  var k = l.id + "_" + d[0];
  return '<div class="bc2"><b>' + esc(d[1]) + '</b> <span class="btag">' + esc(l.nm) + '</span><p>' + esc(ringkasU(d[2])) + '</p><div class="ba">' + btn("Buka loket", "open:" + k) + (d[6] !== false ? btn("Booking", "bk:" + k) : "") +
    '<a target="_blank" rel="noopener noreferrer" href="' + esc(mapsUrl(l)) + '">Peta</a></div></div>';
}
function cari(t) {
  var tk = toks(t), R = [];
  if (tk.length) LOCS.forEach(function (l) { (LD[l.id] || []).forEach(function (d) { var sc = score(d, tk); if (sc > 0) R.push({l: l, d: d, s: sc + (l.id === LOC ? 1 : 0)}); }); });
  R.sort(function (a, b) { return b.s - a.s; });
  var fw = '<div class="bch">' + btn("Teruskan ke admin", "fw:" + t.slice(0, 150)) + '</div>';
  if (!R.length) { try { api("/api/bot/miss", {q: t.slice(0, 160)}).catch(function () {}); } catch (x) {} }
  if (!R.length) return bot("Maaf, saya belum menemukan layanan yang cocok dengan \"" + t + "\". Coba kata lain (misalnya NIB, SIP dokter, reklame), atau teruskan pertanyaan ini ke admin.", fw + chips(MENU.slice(0, 4)));
  return bot("Ini loket yang paling sesuai (" + R.length + " ditemukan):", R.slice(0, 3).map(function (r) { return lk(r.l, r.d); }).join("") + fw);
}
function lokasi() {
  var ks = LOCS.map(function (l) {
    return '<div class="bc2"><b>' + esc(l.nm) + '</b>' + (l.al ? '<p>' + esc(l.al) + '</p>' : '') + (l.jam ? '<small class="bnote">Jam: ' + esc(l.jam) + '</small>' : '') +
      '<div class="ba"><a target="_blank" rel="noopener noreferrer" href="' + esc(mapsUrl(l)) + '">Peta</a>' + (telHref(l.tl) ? '<a href="' + esc(telHref(l.tl)) + '">Telepon</a>' : '') + btn("Lihat loket", "loc:" + l.id) + '</div></div>';
  }).join("");
  return bot((CFG.jam ? "Jam layanan: " + clean(CFG.jam) + ". " : "") + "Booking tersedia hari kerja pukul 08.00-14.00 (jeda 12.00). Pilih tempat pelayanan:", ks);
}
async function stat() {
  if (S !== "user") return needIn("Masuk dulu supaya saya bisa menampilkan status permohonan Anda.");
  try {
    var j = await api("/api/permohonan");
    if (!j.daftar.length) return bot("Belum ada permohonan yang tercatat atas nama Anda. Petugas mencatatnya setelah berkas diajukan di loket.");
    return bot("Permohonan Anda (" + j.daftar.length + "):", j.daftar.slice(0, 3).map(function (o) { return '<div class="bc2"><b>' + esc(o.jenis) + '</b><small>No. ' + esc(o.nomor || "-") + ' &middot; ' + fmt(o.ubah) + '</small>' + bdg(o.status) + '</div>'; }).join("") + '<div class="bch">' + btn("Lihat linimasa lengkap", "pn:pmh") + '</div>');
  } catch (x) { return bot(x.message); }
}
async function antre() {
  if (S !== "user") return needIn("Masuk dulu supaya saya bisa menampilkan tiket antrean Anda.");
  try {
    var j = await api("/api/booking"), h = iso(wibDate(0)),
      a = j.daftar.filter(function (o) { return o.tanggal >= h && /Terjadwal|Sudah tiba|Dipanggil/.test(o.status); }).sort(function (x, y) { return (x.tanggal + x.jam) < (y.tanggal + y.jam) ? -1 : 1; });
    if (!a.length) return bot("Anda belum punya booking aktif. Mau buat sekarang?", '<div class="bch">' + btn("Buat booking", "pn:bk") + '</div>');
    return bot("Tiket aktif Anda (" + a.length + "):", a.slice(0, 4).map(function (o) { return '<div class="bc2"><b>' + esc(o.kode) + '</b><small>' + esc(label(o.kunci)) + '</small><p>' + esc(tglId(new Date(o.tanggal + "T00:00:00").getTime())) + ', pukul ' + esc(o.jam) + ' ' + bkBdg(o.status) + '</p></div>'; }).join("") + '<div class="bch">' + btn("Buka tiket & barcode", "pn:bk") + '</div>');
  } catch (x) { return bot(x.message); }
}
function bk0() { return bot("Setiap loket atau instansi punya jadwal dan kuota sendiri. Anda bisa menyusun beberapa tujuan dalam satu kunjungan, dan sistem menandai jam yang sepi.", '<div class="bch">' + btn("Mulai booking", "pn:bk") + btn("Cek dokumen dulu", "q:syarat dokumen") + '</div>'); }
function berita() {
  var b = window.BERITA || [];
  if (!b.length) return bot("Belum ada berita atau pengumuman terbaru.");
  return bot("Berita & informasi terbaru:", b.slice(0, 3).map(function (x) { return '<div class="bc2"><b>' + esc(x.judul) + '</b><small>' + esc(x.kategori || "Berita") + ' &middot; ' + tglId(x.waktu) + '</small></div>'; }).join("") + '<div class="bch">' + btn("Baca di beranda", "home") + '</div>');
}
/* ---- MPP Surabaya: instansi per zona ---- */
var AL = [[/polisi|skck|polrestabes|kepolisian/, /polrestabes/i], [/narkoba|narkotika|bnn/, /bnn/i], [/pengadaan|lpse|bpbjap|tender/, /bpbjap/i], [/\bpos\b|paket|giro/, /pos indonesia/i], [/pbb|pajak|bphtb|bapenda/, /bapenda/i], [/pajak|npwp|djp/, /direktorat jenderal pajak/i], [/pengadilan|sidang|perkara/, /pengadilan negeri/i], [/cerai|nikah|isbat|pengadilan agama/, /pengadilan agama/i], [/bandara/, /otoritas bandara/i], [/^(?!.*ketenagakerjaan).*(bpjs|jkn)/, /bpjs kesehatan/i], [/bpjs|ketenagakerjaan|jht|jaminan hari tua/, /bpjs ketenagakerjaan/i], [/loker|lowongan|kartu kuning|bursa|ak1|pencari kerja/, /bursa tenaga kerja/i], [/pdam|air bersih|air minum|sambungan air/, /pdam/i], [/tanah|sertifikat|bpn|pertanahan|balik nama/, /kantor pertanahan/i], [/kejaksaan|jaksa|tilang/, /kejaksaan/i]];
/* Pencocokan aturan Kata cari memakai indeks terbalik (token pertama kata kunci), sehingga tetap cepat walau ada ribuan aturan.
   Hasilnya setara dengan pencocokan batas-kata; kata kunci bertanda baca khusus (mis. "e-ktp") dicek dengan regex. */
function kataTk(s) { return String(s).toLowerCase().match(/[a-z0-9]+/g) || []; }
function kataIdx(R) {
  var ix = {}, lambat = [];
  R.forEach(function (r, i) {
    (r.k || []).forEach(function (w, o) {
      if (!w) return;
      var t = kataTk(w);
      if (t.length && t.join(" ") === String(w).toLowerCase().replace(/\s+/g, " ").trim()) (ix[t[0]] = ix[t[0]] || []).push([i, o, t]);
      else lambat.push([i, o, w]);
    });
  });
  return {ix: ix, lambat: lambat};
}
function kataHit(s, R) {
  var o = {j: [], k: [], i: [], w: []}, seen = {}, A = R || window.KATA || [], X, best = {}, toks = kataTk(s), txt = String(s).replace(/\s+/g, " ");
  if (R) X = kataIdx(A); else { if (!A.__ix) { try { Object.defineProperty(A, "__ix", {value: kataIdx(A), enumerable: false, configurable: true}); } catch (e) { return o; } } X = A.__ix; }
  toks.forEach(function (tk, p) {
    (X.ix[tk] || []).forEach(function (e) {
      if (toks.slice(p, p + e[2].length).join(" ") === e[2].join(" ") && (!best[e[0]] || e[1] < best[e[0]][0])) best[e[0]] = [e[1], e[2].join(" ")];
    });
  });
  X.lambat.forEach(function (e) {
    if ((!best[e[0]] || e[1] < best[e[0]][0]) && new RegExp("(^|[^a-z0-9])" + String(e[2]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])").test(txt)) best[e[0]] = [e[1], e[2]];
  });
  Object.keys(best).map(Number).sort(function (a, b) { return a - b; }).forEach(function (idx) {
    var r = A[idx];
    o.i.push(idx); o.w.push(best[idx][1]);
    if (r.j && o.j.indexOf(r.j) < 0) o.j.push(r.j);
    (r.t || []).forEach(function (k) { if (!seen[k] && entryOf(k)) { seen[k] = 1; o.k.push(k); } });
  });
  return o;
}
function kataCocok(s, R) { return kataHit(s, R).k; }
/* Pemformat jawaban admin: **tebal**, "- " daftar poin, "1. " daftar langkah, "Syarat:" dst. diberi label tebal. Aman: semua teks di-escape dulu. */
function fmtJawab(t) {
  var o = "", lst = null;
  function close() { if (lst) { o += "</" + lst + ">"; lst = null; } }
  function inl(x) { return esc(x).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>"); }
  String(t || "").split("\n").forEach(function (l) {
    var m;
    if ((m = l.match(/^\s*[-\u2022*]\s+(.*)$/))) { if (lst !== "ul") { close(); o += "<ul>"; lst = "ul"; } o += "<li>" + inl(m[1]) + "</li>"; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { if (lst !== "ol") { close(); o += "<ol>"; lst = "ol"; } o += "<li>" + inl(m[1]) + "</li>"; }
    else if (!l.trim()) close();
    else { close(); m = l.match(/^\s*(Syarat|Langkah|Biaya|Jam layanan|Jam|Catatan|Lokasi|Durasi|Waktu|Dokumen)\s*:\s*(.*)$/i); o += "<p>" + (m ? "<b>" + esc(m[1]) + ":</b> " + inl(m[2]) : inl(l)) + "</p>"; }
  });
  close(); return o;
}
function plainJ(t) { return String(t || "").replace(/\*\*/g, ""); }
function ansCard(j, hdr) {
  return '<div class="bans" data-a="' + esc(plainJ(j)) + '"><div class="bans-h"><span class="bans-i">i</span>' + esc(hdr || "Informasi layanan") + '</div><div class="bans-b">' + fmtJawab(j) + '</div><div class="bans-a"><button type="button" data-b="cp">Salin</button><button type="button" data-b="sh">Bagikan ke WhatsApp</button></div></div>';
}
function kataKartu(s) {
  var h = kataHit(s); if (!h.k.length && !h.j.length) return null;
  var R = window.KATA || [], ks = h.i.map(function (i) { return (R[i].k || [])[0]; }).filter(Boolean).slice(0, 3);
  if (ks.length) { try { api("/api/bot/hit", {ks: ks, v: 0}).catch(function () {}); } catch (x) {} }
  var kb = KB.filter(function (x) { return x.re.test(s); })[0];
  var cards = h.k.slice(0, 4).map(function (k) { var l = LOCS.filter(function (x) { return x.id === k.split("_")[0]; })[0] || {id: "", nm: ""}; return lk(l, entryOf(k)); }).join("");
  var fb = ks.length && h.j.length ? '<div class="bfb" data-ks="' + esc(ks.join("|")) + '" data-q="' + esc(s.slice(0, 150)) + '"><span>Jawaban ini membantu?</span><button type="button" data-b="fb:1">\uD83D\uDC4D Ya</button><button type="button" data-b="fb:-1">\uD83D\uDC4E Belum</button></div>' : "";
  return bot(h.j.length ? "" : "Ini layanan yang cocok dengan pertanyaan Anda:", h.j.map(function (j) { return ansCard(j); }).join("") + cards + (kb ? '<div class="bch">' + btn("Daftar dokumen: " + kb.t, "ck:" + kb.id) + '</div>' : "") + fb, 0, h.j.length > 0, h.j.length ? plainJ(h.j.join("\n\n")) : undefined);
}
function mppRow(d) { return '<li>' + d[0] + '. <b>' + esc(d[1]) + '</b> ' + btn("Buka", "open:mpp_" + d[0]) + (d[6] !== false ? " " + btn("Booking", "bk:mpp_" + d[0]) : "") + '</li>'; }
function zchips() { var z = []; (LD.mpp || []).forEach(function (d) { if (d[4] && z.indexOf(d[4]) < 0) z.push(d[4]); }); return '<div class="bch">' + z.map(function (x) { return btn(x, "q:" + x.toLowerCase() + " mpp"); }).join("") + '</div>'; }
function zcard(z) { var L = (LD.mpp || []).filter(function (d) { return d[4] === z; }); return L.length ? '<div class="bc2" style="border-left-color:' + (ZC[z] || "#ffb800") + '"><b>' + esc(z) + '</b> <span class="btag">' + L.length + ' instansi</span><ul class="bul">' + L.map(mppRow).join("") + '</ul></div>' : ""; }
function mppZona(n) {
  var z = "Zona " + n, h = zcard(z);
  if (!h) return bot("Belum ada instansi " + z + " di daftar MPP Surabaya pada aplikasi ini. Pilih zona lain:", zchips());
  return bot(z + " MPP Surabaya:", h + zchips());
}
function mppAll() {
  var z = [], n = (LD.mpp || []).length; (LD.mpp || []).forEach(function (d) { if (d[4] && z.indexOf(d[4]) < 0) z.push(d[4]); });
  if (!n) return bot("Daftar instansi MPP belum tersedia.");
  return bot("MPP Surabaya berisi " + n + " instansi di " + z.length + " zona. Ketuk Buka untuk melihat loketnya, atau tanya langsung (misalnya \"SKCK\", \"BPJS\", \"sertifikat tanah\").", z.map(zcard).join("") + '<div class="bch"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent("MPP Surabaya") + '">Peta MPP Surabaya</a></div>');
}
function mppCari(s) {
  var R = [], seen = {};
  AL.forEach(function (a) { if (a[0].test(s)) (LD.mpp || []).forEach(function (d) { if (a[1].test(d[1]) && !seen[d[0]]) { seen[d[0]] = 1; R.push(d); } }); });
  if (!R.length) return null;
  var l = LOCS.filter(function (x) { return x.id === "mpp"; })[0] || {id: "mpp", nm: "MPP Surabaya"};
  return bot("Layanan itu ada di MPP Surabaya:", R.slice(0, 3).map(function (d) { return lk(l, d) + '<small class="bnote">' + esc(d[4] || "") + '</small>'; }).join(""));
}
/* ---- Daftar dokumen interaktif ---- */
function ckp(kb) {
  var c = CK[kb.id] || {}, n = 0; kb.d.forEach(function (_, i) { if (c[i]) n++; });
  return '<div class="ckp"><div class="bar2"><i style="width:' + Math.round(n * 100 / kb.d.length) + '%"></i></div><small>' + n + ' dari ' + kb.d.length + ' siap' + (n === kb.d.length ? " - lengkap, siap berangkat!" : "") + '</small></div>';
}
function ckShow(kb) {
  var c = CK[kb.id] || {}, st = kb.a.map(function (rx) { var k = findK(rx, "pusat"), e = k && entryOf(k); return e ? '<li><b>' + esc(e[1]) + '</b> ' + btn("Booking", "bk:" + k) + '</li>' : ""; }).join("");
  return bot("Panduan umum untuk: " + kb.t + ". Centang dokumen yang sudah siap; centangan tersimpan di perangkat Anda.",
    '<div class="bc2" data-kb="' + kb.id + '">' + ckp(kb) + kb.d.map(function (x, i) { return '<label class="ckl"><input type="checkbox" data-c="' + kb.id + ':' + i + '"' + (c[i] ? " checked" : "") + '><span>' + esc(x) + '</span></label>'; }).join("") + '</div>' +
    (st ? '<div class="bc2"><b>Alur yang disarankan (SPP Pusat)</b><ol class="tlx">' + st + '</ol></div>' : "") +
    '<p class="bnote">Ini panduan umum, bukan daftar resmi. Syarat bisa berbeda menurut jenis usaha atau layanan; pastikan ke Loket CS atau Analisa Kesesuaian Berkas.</p><div class="bch">' + btn("Kirim daftar ke WhatsApp", "wa:" + kb.id) + '</div>');
}
function ckWa(id) {
  var kb = KB.filter(function (k) { return k.id === id; })[0], c = CK[id] || {};
  if (!kb) return;
  var t = "Daftar dokumen: " + kb.t + "\n" + kb.d.map(function (x, i) { return (c[i] ? "[v] " : "[ ] ") + x; }).join("\n") + "\n\nDicek lewat Takok Pelayanan Suroboyo: " + location.origin;
  window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener");
}
/* ---- Pengaduan terpandu ---- */
function wzStart() { WZ = {s: 1}; return bot("Baik, saya bantu menyusun pengaduan. Pengaduan tentang apa?", '<div class="bch">' + KAT.map(function (k) { return btn(k, "wk:" + k); }).join("") + '</div><div class="bch">' + btn("Batal", "wx") + '</div>'); }
function wz1(k) { WZ = {s: 2, kat: k}; return bot("Ceritakan kejadiannya: kapan, di loket atau instansi mana, dan apa yang terjadi. Jangan tulis NIK, kata sandi, atau kode OTP."); }
function wz2(t) {
  WZ.s = 3; WZ.txt = ("[Pengaduan - " + WZ.kat + "] " + t).slice(0, 780);
  return bot("Ini draf pengaduan Anda. Kirim ke loket pengaduan?", '<div class="bc2"><p>' + esc(WZ.txt) + '</p></div><div class="bch">' + btn("Kirim sekarang", "ws") + btn("Ulangi", "wz0") + btn("Batal", "wx") + '</div>');
}
function wiz(t) {
  if (/^(batal|cancel|tidak jadi)$/i.test(t)) { WZ = null; return bot("Pengaduan dibatalkan.", chips(MENU.slice(0, 4))); }
  return WZ.s === 2 || WZ.s === 3 ? wz2(t) : wz1(t);
}
async function wzSend() {
  if (!WZ || !WZ.txt) return;
  if (S !== "user") return needIn("Untuk mengirim pengaduan, masuk dulu sebagai pemohon. Draf Anda tetap tersimpan di sini.");
  var k = findK(/pengaduan/i, LOC) || findK(/pengaduan/i, "pusat") || findK(/^loket (informasi|cs)$/i, "pusat"), g = k ? guard(WZ.txt, k) : "Loket pengaduan tidak ditemukan.";
  if (g) return bot(g);
  SENT.push(Date.now());
  try { await api("/api/pesan", {kunci: k, isi: WZ.txt}); WZ = null; SIG = ""; tick(); return bot("Pengaduan terkirim ke " + label(k) + ". Admin akan membalas di Percakapan Saya, dan Anda mendapat notifikasi.", '<div class="bch">' + btn("Lihat percakapan", "open:" + k) + '</div>'); }
  catch (x) { return bot("Gagal mengirim: " + x.message); }
}
/* ---- Pemahaman pertanyaan ---- */
function ask(t) {
  t = clean(t).slice(0, 700); if (!t) return;
  add("u", esc(t)); var s = t.toLowerCase();
  if (WZ) {
    if (WZ.s === 1) { var kt = KAT.filter(function (k) { return k.toLowerCase() === s; })[0]; if (kt) return wz1(kt); WZ = null; }
    else if (WZ.s === 3 && t.length < 25 && !/^(batal|cancel|tidak jadi)$/i.test(t)) WZ = null;
    else return wiz(t);
  }
  if (/^(halo|hai|hi|hello|permisi|selamat|assalam)/.test(s) && s.length < 30) return bot(sapa() + " Ada yang bisa saya bantu?", chips(MENU));
  if (/terima kasih|makasih|thanks|matur nuwun/.test(s)) return bot("Sama-sama! Kalau ada yang masih bingung, tanya lagi kapan saja.");
  if (/darurat|kebakaran|ambulans/.test(s)) return bot("Untuk keadaan darurat, segera hubungi 112. Asisten ini khusus informasi pelayanan publik.");
  var kc = kataKartu(s); if (kc) return kc;
  if (/status|progres|perkembangan|sudah jadi/.test(s)) return stat();
  if (/antre|antri|tiket saya|jadwal saya/.test(s)) return antre();
  if (/\b(adu|pengaduan|komplain|keluhan|lapor|pungli)/.test(s)) return wzStart();
  if (/\b(jam|buka|tutup|lokasi|alamat|dimana|maps|terdekat)\b|di mana/.test(s)) return lokasi();
  var mc = mppCari(s); if (mc) return mc;
  var zn = s.match(/\bzona\s*([1-5])\b/); if (zn) return mppZona(zn[1]);
  if (/\b(mpp|mal pelayanan|instansi)\b/.test(s)) return mppAll();
  var kb = KB.filter(function (k) { return k.re.test(s); })[0];
  if (kb) return ckShow(kb);
  if (/syarat|dokumen|berkas|bawa|persyaratan/.test(s)) return bot("Dokumen untuk urusan apa? Pilih salah satu:", '<div class="bch">' + KB.map(function (k) { return btn(k.t, "ck:" + k.id); }).join("") + '</div>');
  if (/booking|reservasi|kunjung/.test(s)) return bk0();
  if (/survei|skm|kepuasan/.test(s)) return bot("Penilaian Anda membantu kami memperbaiki layanan. Survei Kepuasan hanya butuh satu menit.", '<div class="bch">' + btn("Isi survei", "pn:skm") + '</div>');
  if (/berita|pengumuman|terbaru/.test(s)) return berita();
  if (/bantu|bisa apa|menu|fitur/.test(s)) return bot("Saya bisa mencarikan loket, menyiapkan daftar dokumen, mengecek status dan antrean, membantu booking, serta menyusun pengaduan.", chips(MENU));
  return cari(t);
}
/* ---- Tampilan ---- */
function build() {
  var el = document.createElement("div");
  el.innerHTML = '<button class="bfab" id="bf" type="button" aria-label="Buka Asisten Takok">' + ICO + '<span>Tanya Asisten</span><span class="bdot" id="bn" hidden></span></button>' +
    '<section class="bot" id="bp" role="dialog" aria-label="Asisten Takok" hidden><header><div class="bav">' + ICO + '</div><div class="bti"><b>Asisten Takok</b><small>Pemandu layanan publik Surabaya</small></div><span class="bhb"><button type="button" id="b-v" aria-pressed="false" title="Bacakan jawaban otomatis">Suara</button><button type="button" id="b-a" aria-pressed="false" title="Huruf besar">A+</button><button type="button" id="b-c" aria-pressed="false" title="Gaya bahasa Suroboyoan">Cak</button><button type="button" id="b-x" aria-label="Tutup">&times;</button></span></header>' +
    '<div class="bmsgs" id="bm" role="log" aria-live="polite"></div><div class="bch bq" id="bq">' + MENU.map(function (x) { return btn(x[0], "q:" + x[1]); }).join("") + '</div>' +
    '<div class="bin"><button type="button" id="b-m" aria-label="Bicara" title="Bicara"' + (SR ? "" : " hidden") + '><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg></button><input id="bi" maxlength="700" placeholder="Tulis pertanyaan Anda..." autocomplete="off" aria-label="Pesan untuk asisten"><button type="button" class="bsend" id="b-s">Kirim</button></div></section>';
  while (el.firstChild) document.body.appendChild(el.firstChild);
  var h = document.querySelector(".hero .tag2");
  if (h) h.insertAdjacentHTML("afterend", '<button class="heroask" id="hb" type="button">Ngobrol dengan Asisten Takok</button>');
}
function openB() { $b("bp").hidden = false; $b("bf").hidden = true; if (!$b("bm").children.length) bot(sapa() + " Saya Asisten Takok. Tanyakan layanan apa saja: saya carikan loketnya, siapkan daftar dokumen, cek status dan antrean, sampai bantu menyusun pengaduan.", chips(MENU.slice(0, 5)), 600); setTimeout(function () { $b("bi").focus(); }, 60); }
function closeB() { $b("bp").hidden = true; $b("bf").hidden = false; try { speechSynthesis.cancel(); } catch (x) {} }
function toggle(id, fn) { var b = $b(id), on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); fn(on); }
function init() {
  build();
  $b("bf").onclick = openB; $b("b-x").onclick = closeB; if ($b("hb")) $b("hb").onclick = openB;
  $b("b-s").onclick = function () { var i = $b("bi"), v = i.value; i.value = ""; ask(v); };
  $b("bi").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $b("b-s").click(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$b("bp").hidden) closeB(); });
  $b("b-v").onclick = function () { toggle("b-v", function (on) { AUTO = on; bot(on ? "Suara otomatis aktif. Setiap jawaban akan dibacakan." : "Suara otomatis dimatikan."); }); };
  $b("b-a").onclick = function () { toggle("b-a", function (on) { $b("bp").classList.toggle("xl", on); }); };
  $b("b-c").onclick = function () { toggle("b-c", function (on) { SBYM = on; bot(on ? "Halo Cak dan Ning! Mode Suroboyoan nyala. Silakan takok apa saja." : "Halo! Bahasa baku aktif kembali."); }); };
  $b("b-m").onclick = function () {
    if (REC) { REC.stop(); return; }
    try {
      REC = new SR(); REC.lang = "id-ID"; REC.interimResults = false; $b("b-m").classList.add("on");
      REC.onresult = function (e) { ask(e.results[0][0].transcript); };
      REC.onend = REC.onerror = function () { REC = null; $b("b-m").classList.remove("on"); };
      REC.start();
    } catch (x) { REC = null; $b("b-m").classList.remove("on"); }
  };
  $b("bp").addEventListener("click", function (e) {
    var b = e.target.closest("[data-b]"); if (!b) return;
    var s = b.dataset.b, i = s.indexOf(":"), c = i < 0 ? s : s.slice(0, i), a = i < 0 ? "" : s.slice(i + 1);
    if (c === "q") ask(a);
    else if (c === "say") speak(b.parentNode.dataset.t || "");
    else if (c === "open") { closeB(); openKey(a); }
    else if (c === "loc") { closeB(); LOC = a; ZN = "Semua"; lc(); qv = ""; $("q").value = ""; MYV = false; window.PN = ""; ui(); var li = $("lki"); if (li && li.scrollIntoView) li.scrollIntoView({behavior: "smooth", block: "center"}); }
    else if (c === "bk") {
      if (needLogin()) { closeB(); return; }
      closeB(); setPN("bk");
      var n = 0, iv = setInterval(function () {
        if ($("bl") && $("bk3")) { clearInterval(iv); $("bl").value = a.split("_")[0]; $("bl").dispatchEvent(new Event("change", {bubbles: true})); $("bk3").value = a; $("bk3").dispatchEvent(new Event("change", {bubbles: true})); }
        else if (++n > 30) clearInterval(iv);
      }, 200);
    }
    else if (c === "pn") { if (needLogin()) { closeB(); return; } closeB(); setPN(a); }
    else if (c === "fw") {
      var k = findK(/^loket (informasi|cs)$/i, LOC) || findK(/^loket (informasi|cs)$/i, "pusat");
      if (k) { KEEP["q:" + k] = "Pertanyaan: " + a; closeB(); openKey(k); needLogin(); }
    }
    else if (c === "ck") { var kb = KB.filter(function (x) { return x.id === a; })[0]; if (kb) { add("u", esc(kb.t)); ckShow(kb); } }
    else if (c === "wa") ckWa(a);
    else if (c === "cp") {
      var cd = b.closest(".bans"), tx = cd ? cd.dataset.a : "";
      try { navigator.clipboard.writeText(tx); b.textContent = "Tersalin \u2713"; setTimeout(function () { b.textContent = "Salin"; }, 1800); } catch (x) { b.textContent = "Tidak bisa menyalin"; }
    }
    else if (c === "sh") { var cs = b.closest(".bans"); if (cs) window.open("https://wa.me/?text=" + encodeURIComponent(cs.dataset.a + "\n\nTakok Pelayanan Suroboyo: " + location.origin), "_blank", "noopener"); }
    else if (c === "fb") {
      var w = b.closest(".bfb"); if (!w) return;
      try { api("/api/bot/hit", {ks: w.dataset.ks.split("|"), v: +a}).catch(function () {}); } catch (x) {}
      w.innerHTML = +a > 0 ? "<span>Terima kasih! Senang bisa membantu.</span>" : "<span>Terima kasih masukannya.</span>" + btn("Teruskan ke admin", "fw:" + esc(w.dataset.q));
    }
    else if (c === "wk") { add("u", esc(a)); wz1(a); }
    else if (c === "ws") wzSend();
    else if (c === "wz0") wzStart();
    else if (c === "wx") { WZ = null; bot("Dibatalkan. Ada lagi yang bisa saya bantu?", chips(MENU.slice(0, 4))); }
    else if (c === "login") { closeB(); var l = $("lg"); if (l && !l.hidden) l.scrollIntoView({block: "center"}); }
    else if (c === "home") { closeB(); var bt = $("bt"); (bt && !bt.hidden ? bt : document.body).scrollIntoView({block: "start"}); }
  });
  $b("bp").addEventListener("change", function (e) {
    var c = e.target.dataset && e.target.dataset.c; if (!c) return;
    var p = c.split(":"), kb = KB.filter(function (x) { return x.id === p[0]; })[0]; if (!kb) return;
    (CK[p[0]] = CK[p[0]] || {})[p[1]] = e.target.checked; save();
    var w = e.target.closest("[data-kb]"); if (w) w.querySelector(".ckp").outerHTML = ckp(kb);
  });
  setInterval(function () { var m = document.title.match(/^\((\d+)\)/), n = $b("bn"); n.hidden = !m; n.textContent = m ? m[1] : ""; }, 3000);
  window.openAsisten = openB; window.askAsisten = ask; window.kataCocok = kataCocok; window.kataHit = kataHit; window.fmtJawab = fmtJawab;
}
init();
})();
