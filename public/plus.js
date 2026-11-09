"use strict";
/* Versi 15: fitur baru Asisten Takok dan pertanyaan per loket.
   Semua berjalan di browser dari data loket dan aturan Kata cari yang sudah ada: tanpa AI luar, tanpa server baru.
   Bagian A: Asisten (memori topik, Pemandu Kesiapan, Rencana Kunjungan, Progres Dokumen, Tanya Loket dari chat, Jam Sepi).
   Bagian B: Kartu per loket (aksi cepat, FAQ dari aturan admin, penyusun pertanyaan, lampiran otomatis, meter tunggu balasan). */
(function () {
var I = window.BOTI; if (!I) return;
var $p = function (i) { return document.getElementById(i); };
var bot = I.bot, KB = I.KB, NS = '<i class="nosg" hidden></i>';
function bx(label, code) { return '<button type="button" data-x="' + esc(code) + '">' + esc(label) + '</button>'; }
function bd(label, code) { return '<button type="button" data-b="' + esc(code) + '">' + esc(label) + '</button>'; }
function row(h) { return '<div class="bch">' + h + '</div>'; }
function tg(m) { if (window.toast) toast(m); }
function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
function kbById(id) { return KB.filter(function (k) { return k.id === id; })[0]; }
function kbOfText(s) { return KB.filter(function (k) { return k.re.test(s); })[0] || null; }
function locOf(key) { var id = String(key).split("_")[0]; return LOCS.filter(function (l) { return l.id === id; })[0] || {id: id, nm: id}; }
function dur(m) { m = Math.max(1, Math.round(m)); return m < 60 ? m + " menit" : m < 2880 ? Math.round(m / 60) + " jam" : Math.round(m / 1440) + " hari"; }
function waOpen(t) { window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener"); }
function copyTxt(t, msg) { try { navigator.clipboard.writeText(t).then(function () { tg(msg || "Disalin."); }, function () { tg("Tidak bisa menyalin."); }); } catch (x) { tg("Tidak bisa menyalin."); } }
function acceptsQ(key) { var e = entryOf(key); return !!e && e[5] !== false; }

/* ---------- Indeks aturan Kata cari per loket ---------- */
var RX = {ver: null, m: {}};
function rulesOf(key) {
  var A = window.KATA || [];
  if (RX.ver !== A) { RX.ver = A; RX.m = {}; A.forEach(function (r, i) { if (r && r.j) (r.t || []).forEach(function (x) { (RX.m[x] = RX.m[x] || []).push(i); }); }); }
  return RX.m[key] || [];
}

/* ---------- Pencarian loket ---------- */
function kandidat(q, need) {
  var tk = toks(q), R = [];
  if (tk.length) LOCS.forEach(function (l) { (LD[l.id] || []).forEach(function (d) { if (d[need] === false) return; var sc = score(d, tk); if (sc > 0) R.push({k: l.id + "_" + d[0], s: sc + (l.id === LOC ? 1 : 0)}); }); });
  R.sort(function (a, b) { return b.s - a.s; });
  return R.slice(0, 4).map(function (r) { return r.k; });
}
function lkMini(key, act, lbl) {
  var l = locOf(key), e = entryOf(key); if (!e) return "";
  return '<div class="bc2"><b>' + esc(e[1]) + '</b> <span class="btag">' + esc(l.nm) + '</span>' + row(bx(lbl, act + ":" + key)) + '</div>';
}
function pilihLoket(q, act, need, judul) {
  var ks = q ? kandidat(q, need) : [];
  if (!ks.length) { [/^loket informasi$/i, /^loket cs$/i].forEach(function (rx) { var k = findK(rx, LOC) || findK(rx, "pusat"); if (k && ks.indexOf(k) < 0 && entryOf(k) && entryOf(k)[need] !== false) ks.push(k); }); }
  if (!ks.length) return bot("Saya belum menemukan loket yang cocok. Coba tulis nama layanannya, misalnya \"SIP dokter\" atau \"reklame\".", NS);
  return bot(judul + (q ? "" : " Ketik nama layanan untuk mencari loket lain."), ks.map(function (k) { return lkMini(k, act, "Pilih loket ini"); }).join("") + NS);
}

/* ============================================================
   A1. Memori topik: pertanyaan lanjutan ("biayanya?", "berapa lama?")
   ============================================================ */
var CTX = null;
var FU = [
  ["biaya", /\b(biaya(nya)?|tarif(nya)?|bayar(nya)?|gratis|harga(nya)?|berapa (rupiah|duit))\b/, /biaya|tarif|gratis|retribusi|rp\.?\s?\d|rupiah|bayar/i, "Biaya"],
  ["waktu", /\b(berapa lama|lamanya|durasi|berapa hari|kapan (jadi|selesai)|estimasi)\b/, /lama|durasi|estimasi|hari kerja|\bhari\b|menit|selesai|proses/i, "Lama proses"],
  ["syarat", /\b(syarat(nya)?|persyaratan|dokumen(nya)?|berkas(nya)?|bawa apa)\b/, /syarat|persyaratan|dokumen|berkas|ktp|npwp|bawa/i, "Syarat"],
  ["cara", /\b(cara(nya)?|langkah(nya)?|prosedur(nya)?|alur(nya)?|gimana|bagaimana)\b/, /langkah|cara |alur|prosedur|ajukan|mendaftar|datang/i, "Cara mengurus"],
  ["jam", /\b(jam (buka|layanan|kerja)|buka jam|kapan buka|hari apa)\b/, null, "Jam layanan"],
  ["lokasi", /\b(di ?mana|alamat(nya)?|lokasi(nya)?|peta|ruangan)\b/, null, "Lokasi"],
  ["book", /\b(booking|jadwal(nya)?|antre|antri|daftar kunjungan)\b/, null, "Booking"]
];
function topicOf(s) {
  var h = I.kataHit(s), kb = kbOfText(s);
  return {kb: kb, keys: h.k.slice(0, 3), ans: h.j.slice(), has: !!(kb || h.k.length || h.j.length)};
}
function ctxKey() {
  if (!CTX) return null;
  if (CTX.keys.length) return CTX.keys[0];
  if (CTX.kb) { var a = CTX.kb.a; for (var i = a.length - 1; i >= 0; i--) { var k = findK(a[i], "pusat"); if (k) return k; } }
  return null;
}
function cleanLine(l) { return String(l).replace(/\*\*/g, "").replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim(); }
function ekstrak(text, rx) {
  var L = String(text || "").split("\n"), out = [];
  for (var i = 0; i < L.length && out.length < 6; i++) {
    if (!rx.test(L[i])) continue;
    out.push(cleanLine(L[i]));
    if (/:\s*$/.test(L[i].trim())) { for (var j = i + 1; j < L.length && out.length < 6 && /^\s*(?:[-•*]|\d+[.)])\s+/.test(L[j]); j++) out.push(cleanLine(L[j])); }
  }
  return out;
}
function sumber() {
  var o = [];
  CTX.ans.forEach(function (t) { o.push({t: t, src: "Jawaban dari admin"}); });
  CTX.keys.forEach(function (k) { var e = entryOf(k); if (e && e[2]) o.push({t: e[2], src: "Uraian " + e[1]}); });
  return o;
}
function tanyaOffer(topik, kw) {
  var k = ctxKey();
  return bot("Info " + kw.toLowerCase() + " untuk " + topik + " belum tercantum di data Takok, jadi saya tidak mau menebak. Tanyakan langsung ke loketnya ya.", NS + (k && acceptsQ(k) ? row(bx("Tanya loket ini dari chat", "tqs:" + k + ":" + kw)) : ""));
}
function doFU(f) {
  var topik = CTX.kb ? CTX.kb.t : (CTX.keys[0] && entryOf(CTX.keys[0]) ? entryOf(CTX.keys[0])[1] : "topik tadi"), k = ctxKey(), id = f[0];
  if (id === "syarat" && CTX.kb) return I.ckShow(CTX.kb);
  if (id === "book") return bot("Booking untuk " + topik + ":", NS + (k ? row(bd("Booking loket ini", "bk:" + k) + bx("Cek jam sepi", "sp:" + k)) : row(bd("Mulai booking", "pn:bk"))));
  if (id === "lokasi" || id === "jam") {
    var l = k ? locOf(k) : (LOCS.filter(function (x) { return x.id === LOC; })[0] || LOCS[0]), e = k ? entryOf(k) : null;
    if (id === "jam" && e && e[7]) return bot("Jam layanan " + e[1] + ": " + e[7] + ".", NS);
    if (!l) return tanyaOffer(topik, f[3]);
    return bot((id === "jam" ? "Jam layanan " : "Lokasi ") + l.nm + ":", NS + '<div class="bc2"><b>' + esc(l.nm) + '</b>' + (l.al ? '<p>' + esc(l.al) + '</p>' : '') + ((id === "jam" || l.jam) && l.jam ? '<small class="bnote">Jam: ' + esc(l.jam) + '</small>' : '') + '<div class="ba"><a target="_blank" rel="noopener noreferrer" href="' + esc(mapsUrl(l)) + '">Peta</a></div></div>');
  }
  var hits = [];
  sumber().some(function (s) { var r = ekstrak(s.t, f[2]); if (r.length) { hits = r; hits.src = s.src; return true; } return false; });
  if (!hits.length) return tanyaOffer(topik, f[3]);
  return bot("Soal " + f[3].toLowerCase() + " untuk " + topik + ", sesuai data yang ada:", NS + I.ansCard(hits.map(function (x) { return "- " + x; }).join("\n"), f[3] + " (" + hits.src + ")") + '<p class="bnote">Biaya dan syarat bisa berubah; pastikan ke loket sebelum berangkat.</p>');
}
function followUp(s) {
  if (!CTX || s.length > 70 || /^(lokasi dan jam buka|booking kunjungan|daftar instansi mpp|syarat dokumen|tiket saya)$/.test(s)) return null;
  for (var i = 0; i < FU.length; i++) if (FU[i][1].test(s)) return doFU(FU[i]);
  return null;
}

/* ============================================================
   A2. Pemandu Kesiapan: kuis ya/belum per dokumen, hasilnya menyinkronkan daftar dokumen
   ============================================================ */
function panduMenu() {
  return bot("Mau cek kesiapan berkas untuk urusan apa? Saya tanya satu per satu (ya atau belum), lalu hitung kesiapan Anda dan tunjukkan yang masih kurang.", NS + row(KB.map(function (k) { return bx(k.t, "pd:" + k.id + ":0:"); }).join("")));
}
function panduQ(id, i, bits) {
  var kb = kbById(id); if (!kb) return panduMenu();
  if (i >= kb.d.length) return panduHasil(kb, bits);
  return bot("", NS + '<div class="bc2"><div class="bar2"><i style="width:' + Math.round(i * 100 / kb.d.length) + '%"></i></div><small>' + esc(kb.t) + ' &middot; pertanyaan ' + (i + 1) + ' dari ' + kb.d.length + '</small><p style="font-size:1rem;margin:8px 0 2px">Apakah <b>' + esc(kb.d[i]) + '</b> sudah siap?</p></div>' + row(bx("Ya, sudah siap", "pd:" + id + ":" + (i + 1) + ":" + bits + "1") + bx("Belum", "pd:" + id + ":" + (i + 1) + ":" + bits + "0") + bx("Batal", "pdx")), 300);
}
function panduHasil(kb, bits) {
  var ok = [], no = [], ck = I.ck(), n = kb.d.length;
  ck[kb.id] = {};
  kb.d.forEach(function (d, i) { if (bits.charAt(i) === "1") { ok.push(d); ck[kb.id][i] = true; } else no.push(d); });
  I.saveCk();
  var p = Math.round(ok.length * 100 / n), lv = p === 100 ? ["Siap berangkat", "#16a34a"] : p >= 60 ? ["Hampir siap", "#ca8a04"] : p >= 30 ? ["Perlu persiapan", "#ea580c"] : ["Baru mulai", "#dc2626"];
  var k = null; for (var q = kb.a.length - 1; q >= 0 && !k; q--) k = findK(kb.a[q], "pusat");
  var h = '<div class="bc2 pdr"><div class="pdr-top"><div class="pdr-ring" style="--p:' + p + '"><b>' + p + '%</b></div><div><b style="color:' + lv[1] + '">' + lv[0] + '</b><small>' + ok.length + ' dari ' + n + ' berkas siap &middot; ' + esc(kb.t) + '</small></div></div>' +
    (ok.length ? '<p class="pdr-h">Sudah siap</p><ul class="pdr-l ok">' + ok.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' : "") +
    (no.length ? '<p class="pdr-h">Perlu disiapkan</p><ul class="pdr-l todo">' + no.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' : "") + '</div>';
  var b = bd("Buka daftar dokumen", "ck:" + kb.id) + (k && entryOf(k) && entryOf(k)[6] !== false ? bd("Booking", "bk:" + k) : "") + (no.length ? bx("Kirim kekurangan ke WhatsApp", "pdw:" + kb.id + ":" + bits) + bx("Tanya loket soal kekurangan", "pdt:" + kb.id + ":" + bits) : "") + bx("Ulangi", "pd:" + kb.id + ":0:");
  if (p === 100 && window.konfeti) { try { konfeti(); } catch (x) {} }
  return bot(p === 100 ? "Semua berkas sudah siap. Tinggal booking jadwal kunjungan." : "Ini hasil pengecekan Anda. Daftar dokumen di Asisten ikut diperbarui.", NS + h + '<p class="bnote">Panduan umum, bukan daftar resmi. Syarat sebenarnya bisa berbeda; pastikan ke Loket CS atau Analisa Kesesuaian Berkas.</p>' + row(b), 350);
}
function kurang(id, bits) { var kb = kbById(id); return kb ? {kb: kb, list: kb.d.filter(function (d, i) { return bits.charAt(i) !== "1"; })} : null; }

/* ============================================================
   A3. Rencana Kunjungan: gabungkan beberapa urusan jadi satu rute loket + dokumen tanpa duplikat
   ============================================================ */
function rencanaMenu() {
  return bot("Mau mengurus beberapa hal sekaligus? Centang semua urusan Anda. Saya susun urutan loketnya dan gabungkan daftar dokumennya supaya cukup satu kali datang.", NS + '<div class="bc2 rnp">' + KB.map(function (k) { return '<label class="ckl"><input type="checkbox" data-rn="' + k.id + '"><span>' + esc(k.t) + '</span></label>'; }).join("") + '</div>' + row(bx("Buat rencana", "rnb")));
}
function dokKey(d) { var u = d.toUpperCase(); return /^KTP/.test(u) ? "KTP" : /^NPWP/.test(u) ? "NPWP" : /^NIB/.test(u) ? "NIB" : u; }
function rencanaBuat(ids) {
  var steps = [], seen = {}, docs = [], dk = {}, tot = 0, n = 0;
  ids.forEach(function (id) {
    var kb = kbById(id); if (!kb) return; n++;
    kb.a.forEach(function (rx) { var k = findK(rx, "pusat"); if (!k) return; if (seen[k]) { if (seen[k].w.indexOf(kb.t) < 0) seen[k].w.push(kb.t); return; } seen[k] = {k: k, w: [kb.t]}; steps.push(seen[k]); });
    kb.d.forEach(function (d) { tot++; var key = dokKey(d); if (!dk[key]) { dk[key] = 1; docs.push(d); } });
  });
  if (!steps.length) return bot("Rute loket untuk pilihan itu belum bisa disusun dari data yang ada. Coba tanya Loket CS.", NS);
  steps.sort(function (a, b) { var pa = /pengambilan/i.test(entryOf(a.k)[1]) ? 1 : 0, pb = /pengambilan/i.test(entryOf(b.k)[1]) ? 1 : 0; return pa - pb; });
  var plan = "Rencana kunjungan " + ids.map(function (x) { return kbById(x).t; }).join(" + ") + "\n\nUrutan loket (SPP Pusat):\n" + steps.map(function (s, i) { return (i + 1) + ". " + entryOf(s.k)[1] + " (" + s.w.join(", ") + ")"; }).join("\n") + "\n\nDokumen yang dibawa:\n" + docs.map(function (d) { return "[ ] " + d; }).join("\n") + "\n\nDisusun lewat Takok Pelayanan Suroboyo: " + location.origin;
  var h = '<div class="bc2 rnr" data-plan="' + esc(plan) + '"><b>Urutan loket</b><ol class="tlx">' + steps.map(function (s) { var e = entryOf(s.k); return '<li><b>' + esc(e[1]) + '</b><small>untuk: ' + esc(s.w.join(", ")) + '</small>' + (e[6] !== false ? ' ' + bd("Booking", "bk:" + s.k) : "") + '</li>'; }).join("") + '</ol></div>' +
    '<div class="bc2"><b>Dokumen yang dibawa (' + docs.length + ')</b>' + (tot > docs.length ? '<small>Hemat ' + (tot - docs.length) + ' berkas ganda dibanding mengurus satu per satu.</small>' : "") + '<ul class="pdr-l todo">' + docs.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join("") + '</ul></div>';
  return bot(n + " urusan, " + steps.length + " loket, " + docs.length + " dokumen unik:", NS + h + '<p class="bnote">Urutan mengikuti alur umum di SPP Pusat. Petugas Loket CS dapat menyesuaikan.</p>' + row(bx("Salin rencana", "rnc") + bx("Kirim ke WhatsApp", "rnw") + bx("Susun ulang", "rnm") + bx("Cek kesiapan berkas", "pdm")), 350);
}

/* ============================================================
   A4. Progres dokumen semua urusan
   ============================================================ */
function progres() {
  var ck = I.ck(), L = KB.map(function (k) { var c = ck[k.id] || {}, n = 0; k.d.forEach(function (_, i) { if (c[i]) n++; }); return {k: k, n: n}; });
  if (!L.some(function (x) { return x.n > 0; })) return bot("Belum ada dokumen yang Anda centang. Mulai dengan kuis singkat kesiapan berkas, atau buka daftar dokumen satu per satu.", NS + row(bx("Mulai cek kesiapan", "pdm") + bd("Daftar dokumen", "q:syarat dokumen")));
  L.sort(function (a, b) { return b.n / b.k.d.length - a.n / a.k.d.length; });
  return bot("Progres daftar dokumen Anda (tersimpan di perangkat ini):", NS + L.map(function (x) { return '<div class="bc2"><b>' + esc(x.k.t) + '</b>' + I.ckp(x.k) + row(bd(x.n ? "Lanjutkan" : "Mulai", "ck:" + x.k.id)) + '</div>'; }).join(""));
}

/* ============================================================
   A5. Tanya loket langsung dari chat (dengan pemeriksaan jawaban otomatis dulu)
   ============================================================ */
var TQ = null, STARTER = {"Biaya": "Berapa biaya resmi dan apakah ada tarif untuk layanan ini?", "Lama proses": "Berapa lama proses untuk layanan ini sampai selesai?", "Syarat": "Apa saja syarat dan dokumen yang harus dibawa?", "Cara mengurus": "Bagaimana cara dan langkah mengurus layanan ini?", "Jam layanan": "Pada hari dan jam berapa layanan ini bisa dikunjungi?"};
function tanyaStart(rest) {
  if (S !== "user") return I.needIn("Masuk dulu supaya pertanyaan Anda bisa dikirim ke loket dan balasannya masuk ke Percakapan Saya.");
  var m = String(rest || "").match(/^([^:]{2,60}):\s*([\s\S]{5,})$/), q = m ? m[1] : rest, msg = m ? m[2].trim() : "";
  TQ = {step: 1, draft: msg};
  var ck = ctxKey();
  if (!q && ck && acceptsQ(ck)) return pilihKey(ck);
  return pilihLoket(q, "tqs", 5, "Pertanyaan ini untuk loket mana?");
}
function pilihKey(k, starter) {
  if (!acceptsQ(k)) return bot("Loket itu tidak menerima pertanyaan lewat aplikasi. Silakan tanya di Loket Informasi atau Loket CS.", NS);
  TQ = TQ || {};
  TQ.step = 2; TQ.key = k; if (starter) TQ.draft = starter;
  if (TQ.draft) return tqDraft();
  return bot("Tulis pertanyaan Anda untuk " + label(k) + ". Saya periksa dulu apakah sudah ada jawabannya, lalu kirim langsung ke loket. Jangan tulis NIK, kata sandi, atau kode OTP.", NS + row(QQ.map(function (q, i) { return bx(q, "tqq:" + i); }).join("") + bx("Batal", "tqx")));
}
function tqDraft(skipCek) {
  var h = I.kataHit(TQ.draft.toLowerCase());
  if (!skipCek && h.j.length) return bot("Sepertinya sudah ada jawabannya. Cek dulu sebelum mengirim:", NS + I.ansCard(h.j[0]) + row(bx("Cukup, terima kasih", "tqx") + bx("Tetap kirim ke loket", "tqf")), 350);
  return bot("Ini pertanyaan yang akan dikirim ke " + label(TQ.key) + ":", NS + '<div class="bc2"><p style="white-space:pre-wrap;margin:0">' + esc(TQ.draft) + '</p></div>' + row(bx("Kirim ke loket", "tqg") + bx("Ubah", "tqe") + bx("Batal", "tqx")));
}
async function tqSend() {
  if (!TQ || !TQ.key || !TQ.draft) return;
  if (S !== "user") return I.needIn("Sesi Anda berakhir. Masuk lagi untuk mengirim.");
  var g = guard(TQ.draft, TQ.key); if (g) return bot(g, NS);
  SENT.push(Date.now());
  try {
    await api("/api/pesan", {kunci: TQ.key, isi: TQ.draft}); var k = TQ.key; TQ = null; SIG = ""; tick();
    return bot("Terkirim ke " + label(k) + ". Balasan admin masuk ke Percakapan Saya dan Anda mendapat notifikasi.", NS + row(bd("Buka percakapan", "open:" + k)));
  } catch (x) { return bot("Gagal mengirim: " + x.message, NS); }
}
function tqPre(t, s) {
  if (/^(batal|cancel|tidak jadi)$/.test(s)) { TQ = null; return bot("Dibatalkan. Ada lagi yang bisa saya bantu?", NS); }
  if (s.charAt(0) === "/" || (TQ.step === 1 && t.length > 60)) { TQ = null; return null; }
  if (TQ.step === 1) return pilihLoket(t, "tqs", 5, "Pilih loket tujuan:");
  if (TQ.step === 2 && TQ.draft && /^(kirim|ya|oke?|lanjut)$/.test(s)) return tqSend();
  if (TQ.step === 2) { TQ.draft = t.slice(0, 780); return tqDraft(); }
  return null;
}

/* ============================================================
   A6. Jam paling sepi (kuota booking nyata dari server)
   ============================================================ */
async function sepiHtml(key) {
  var e = entryOf(key); if (!e) return {html: "<p>Loket tidak ditemukan.</p>"};
  if (e[6] === false) return {html: '<p class="bnote">Loket ini tidak menerima booking, jadi tidak ada data kuota.</p>'};
  var days = [], o = wibDate(0).getHours() >= 13 ? 1 : 0;
  while (days.length < 3 && o < 14) { var d = wibDate(o++); if (d.getDay() > 0 && d.getDay() < 6) days.push(d); }
  var res = await Promise.all(days.map(function (d) { return api("/api/slot?kunci=" + encodeURIComponent(key) + "&tanggal=" + encodeURIComponent(iso(d))).then(function (j) { return {d: d, j: j}; }, function (x) { return {d: d, err: x.message}; }); }));
  var best = null, h = "", okn = 0;
  res.forEach(function (r) {
    var nm = r.d.toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "short"});
    if (r.err || !r.j || !r.j.slot || !r.j.slot.length) { h += '<div class="spr"><b>' + esc(nm) + '</b><small>' + esc(r.err || "Tidak ada slot") + '</small></div>'; return; }
    okn++;
    h += '<div class="spr"><b>' + esc(nm) + '</b><div>' + r.j.slot.map(function (s) {
      var q = r.j.kuota ? s.sisa / r.j.kuota : 0, c = !s.sisa ? "x" : q >= 0.7 ? "s" : q <= 0.3 ? "r" : "m";
      if (s.sisa && (!best || q > best.q)) best = {q: q, jam: s.jam, sisa: s.sisa, ku: r.j.kuota, nm: nm};
      return '<span class="spk ' + c + '" title="' + esc(s.jam + ": " + (s.sisa ? "sisa " + s.sisa : "penuh")) + '">' + esc(String(s.jam).slice(0, 2)) + '</span>';
    }).join("") + '</div></div>';
  });
  if (!okn) return {html: h + '<p class="bnote">Data kuota belum bisa dimuat. Coba lagi nanti.</p>'};
  return {html: h + '<div class="spl"><span class="spk s">sepi</span><span class="spk m">sedang</span><span class="spk r">ramai</span><span class="spk x">penuh</span></div>' + (best ? '<p class="sprec">Paling lengang: <b>' + esc(best.nm) + ', pukul ' + esc(best.jam) + '</b> (sisa ' + best.sisa + ' dari ' + best.ku + ').</p>' : '<p class="sprec">Semua jam pada hari-hari ini penuh. Coba tanggal lain di halaman Booking.</p>'), best: best};
}
async function sepiChat(key) {
  var r = await sepiHtml(key);
  return bot("Kepadatan booking " + label(key) + " (3 hari kerja terdekat):", NS + '<div class="bc2 spw">' + r.html + '</div>' + row(bd("Booking loket ini", "bk:" + key) + bx("Loket lain", "spm")), 350);
}
function sepiStart(rest) {
  if (S !== "user") return I.needIn("Masuk dulu supaya saya bisa membaca kuota booking per jam.");
  var k = ctxKey(); if (!rest && k && entryOf(k) && entryOf(k)[6] !== false) return sepiChat(k);
  return pilihLoket(rest, "sp", 6, "Cek kepadatan untuk loket mana?");
}

/* ============================================================
   Pintu masuk dari ask(): perintah, alur pertanyaan, pertanyaan lanjutan
   ============================================================ */
var R_PANDU = /^\/?pandu\b|cek kesiapan|kesiapan (berkas|dokumen)|siap(kah)? (berkas|dokumen)|berkas (saya )?(sudah )?lengkap/, R_RENC = /^\/?rencana\b|rencana kunjungan|susun (rencana )?kunjungan|urus (beberapa|banyak|sekaligus)/,
  R_PROG = /^\/?progres( dokumen)?$|progres (dokumen|berkas)|dokumen saya/, R_TANYA = /^(\/tanya|tanya loket|kirim pertanyaan ke)\b\s*([\s\S]*)$/, R_SEPI = /^\/?sepi\b|jam (sepi|lengang|paling sepi)|kapan (sepi|lengang)|waktu (terbaik|tersepi)|hindari antre/;
window.BOTX = {
  pre: function (t, s) {
    if (TQ) { var r0 = tqPre(t, s); if (r0) return r0; }
    var m;
    if (R_PANDU.test(s)) { var kb = kbOfText(s.replace(/cek kesiapan|\/?pandu/g, "")); return kb ? panduQ(kb.id, 0, "") : panduMenu(); }
    if (R_RENC.test(s)) return rencanaMenu();
    if (R_PROG.test(s)) return progres();
    if ((m = s.match(R_TANYA))) return tanyaStart(t.slice(t.length - m[2].length).trim());
    if (R_SEPI.test(s)) return sepiStart(s.replace(/^\/?sepi|jam (paling )?(sepi|lengang)|kapan (sepi|lengang)|waktu (terbaik|tersepi)|hindari antre|\b(di|untuk)\b/g, " ").replace(/\s+/g, " ").trim());
    var tp = topicOf(s);
    if (tp.has) { CTX = {kb: tp.kb, keys: tp.keys, ans: tp.ans, q: s}; return null; }
    return followUp(s);
  },
  about: function (key) {
    var e = entryOf(key); if (!e) return;
    var empty = !$p("bm").children.length; if (window.openAsisten) openAsisten();
    var rl = rulesOf(key).map(function (i) { return window.KATA[i]; });
    CTX = {kb: KB.filter(function (k) { return k.re.test(e[1].toLowerCase()) || rl.some(function (r) { return (r.k || []).some(function (w) { return k.re.test(w); }); }); })[0] || null, keys: [key], ans: rl.map(function (r) { return r.j; }).slice(0, 4), q: e[1]};
    I.add("u", esc("Tentang " + e[1]));
    var b = (CTX.kb ? bd("Daftar dokumen", "ck:" + CTX.kb.id) : "") + (e[6] !== false ? bd("Booking", "bk:" + key) + bx("Cek jam sepi", "sp:" + key) : "") + (e[5] !== false ? bx("Tanya loket ini", "tqs:" + key) : "");
    bot("Ini loket " + e[1] + ". Anda bisa tanya " + (CTX.kb ? "\"biayanya?\", \"syaratnya?\", " : "") + "atau pilih tindakan:", NS + I.lk(locOf(key), e) + row(b), empty ? 900 : 380);
  }
};

function onClick(e) {
  var b = e.target.closest("[data-x]"); if (!b) return;
  var p = b.dataset.x.split(":"), c = p[0];
  function off() { [].forEach.call(b.parentNode.querySelectorAll("button"), function (z) { z.disabled = true; }); }
  if (c === "pd") { off(); I.add("u", esc(b.textContent)); panduQ(p[1], +p[2], p[3] || ""); }
  else if (c === "pdm") panduMenu();
  else if (c === "pdx") { off(); bot("Pengecekan dibatalkan.", NS); }
  else if (c === "pdw" || c === "pdt") {
    var k = kurang(p[1], p[2] || ""); if (!k || !k.list.length) return;
    if (c === "pdw") waOpen("Berkas yang masih perlu saya siapkan untuk " + k.kb.t + ":\n" + k.list.map(function (d) { return "[ ] " + d; }).join("\n") + "\n\nDicek lewat Takok Pelayanan Suroboyo: " + location.origin);
    else { var ck = findK(/^loket (informasi|cs)$/i, LOC) || findK(/^loket (informasi|cs)$/i, "pusat"); if (!ck) return; if (S !== "user") { I.needIn("Masuk dulu untuk mengirim pertanyaan ke loket."); return; } I.add("u", "Tanya loket soal kekurangan berkas"); TQ = {step: 2, key: ck, draft: ("Untuk " + k.kb.t + ", saya belum punya: " + k.list.join(", ") + ". Bagaimana cara mengurusnya, dan apakah boleh diajukan sambil menyusul?").slice(0, 780)}; tqDraft(true); }
  }
  else if (c === "rnm") rencanaMenu();
  else if (c === "rnb") {
    var w = b.closest(".bmsg"), ids = [].map.call(w.querySelectorAll("input[data-rn]:checked"), function (x) { return x.dataset.rn; });
    if (!ids.length) { tg("Centang minimal satu urusan."); return; }
    off(); I.add("u", esc("Rencana: " + ids.map(function (x) { return kbById(x).t; }).join(", "))); rencanaBuat(ids);
  }
  else if (c === "rnc" || c === "rnw") { var rr = b.closest(".bmsg").querySelector(".rnr"), pl = rr ? rr.dataset.plan : ""; if (!pl) return; if (c === "rnc") copyTxt(pl, "Rencana disalin."); else waOpen(pl); }
  else if (c === "tqs") { I.add("u", esc(label(p[1]))); TQ = TQ || {}; pilihKey(p[1], STARTER[p[2]] || ""); }
  else if (c === "tqq") { if (TQ && TQ.key) { TQ.draft = QQ[+p[1]]; I.add("u", esc(TQ.draft)); tqDraft(); } }
  else if (c === "tqg") { off(); tqSend(); }
  else if (c === "tqf") { if (TQ && TQ.draft) { off(); tqDraft(true); } }
  else if (c === "tqe") { off(); if (TQ) { TQ.step = 2; TQ.draft = ""; } bot("Silakan tulis ulang pertanyaan Anda.", NS); }
  else if (c === "tqx") { off(); TQ = null; bot("Baik, tidak jadi dikirim. Ada lagi yang bisa saya bantu?", NS); }
  else if (c === "sp") { I.add("u", esc("Jam sepi " + label(p[1]))); sepiChat(p[1]).catch(function (x) { bot(x.message, NS); }); }
  else if (c === "spm") { off(); sepiStart(""); }
}
$p("bp").addEventListener("click", onClick);

/* ============================================================
   B. Kartu per loket (halaman daftar loket)
   ============================================================ */
function infoLoket(key) {
  var e = entryOf(key), l = locOf(key); if (!e) return "";
  var t = [e[1] + " (" + l.nm + ")", "Sistem: " + e[3]];
  if (e[2] && !/^belum diisi/i.test(e[2])) t.push("", I.plainJ(e[2]));
  if (e[7]) t.push("Jam: " + e[7]); else if (l.jam) t.push("Jam: " + l.jam);
  if (l.al) t.push("Alamat: " + l.al);
  if (e[8]) t.push("Info resmi: " + e[8]);
  t.push("", "Dari Takok Pelayanan Suroboyo: " + location.origin);
  return t.join("\n");
}
function faqHtml(key) {
  var ix = rulesOf(key).slice(0, 8); if (!ix.length) return "";
  return '<details class="lx-faq"><summary>Pertanyaan yang sering ditanyakan (' + ix.length + ')</summary>' + ix.map(function (i) {
    var r = window.KATA[i], ks = (r.k || []).slice(0, 3);
    return '<details class="lx-q" data-ri="' + i + '"><summary>' + esc(cap(ks[0])) + (ks.length > 1 ? ' <small>&middot; ' + esc(ks.slice(1).join(", ")) + '</small>' : '') + '</summary><div class="bans-b">' + fmtJawab(r.j) + '</div><div class="lx-qa"><button type="button" class="chip" data-lx="fsalin">Salin</button><button type="button" class="chip" data-lx="fup">👍 Membantu</button><button type="button" class="chip" data-lx="fdn">👎 Belum jelas</button><button type="button" class="chip" data-lx="ftanya">Tanya admin</button></div></details>';
  }).join("") + '</details>';
}
function kbChips(key) {
  var e = entryOf(key); if (!e) return "";
  var rl = rulesOf(key).map(function (i) { return window.KATA[i]; }), ck = I.ck(), out = [];
  KB.forEach(function (kb) {
    if (!(kb.re.test(e[1].toLowerCase()) || rl.some(function (r) { return (r.k || []).some(function (w) { return kb.re.test(w); }); }))) return;
    var c = ck[kb.id] || {}, n = 0; kb.d.forEach(function (_, i) { if (c[i]) n++; });
    out.push('<button type="button" class="chip" data-lx="ckb" data-id="' + kb.id + '">' + esc(kb.t) + ' (' + n + '/' + kb.d.length + ')</button>');
  });
  return out.length ? '<div class="lx-kb"><small>Daftar dokumen terkait:</small> ' + out.join(" ") + '</div>' : "";
}
function injectRow(det) {
  det.setAttribute("data-lxd", "1");
  var key = det.dataset.n, e = entryOf(key), qa = det.querySelector(".body .qa"); if (!e || !qa) return;
  var bk = e[6] !== false;
  qa.insertAdjacentHTML("beforebegin", '<div class="lx" data-key="' + esc(key) + '"><div class="lx-act">' + (bk ? '<button type="button" class="chip" data-lx="book">Booking loket ini</button>' : "") + '<button type="button" class="chip" data-lx="asisten">Tanya Asisten</button>' + (bk ? '<button type="button" class="chip" data-lx="sepi">Cek jam sepi</button>' : "") + '<button type="button" class="chip" data-lx="salin">Salin info</button><button type="button" class="chip" data-lx="wa">Bagikan</button></div><div class="lx-sp" hidden></div>' + kbChips(key) + faqHtml(key) + '</div>');
}

/* Penyusun pertanyaan: jenis pertanyaan + lampiran otomatis + meter tunggu balasan */
var JN = [["Syarat", "[Syarat] Mohon info syarat dan dokumen yang harus dibawa untuk {x}. "], ["Biaya", "[Biaya] Berapa biaya resmi untuk {x}, dan apakah ada tarif lain? "], ["Lama proses", "[Lama proses] Berapa lama proses {x} sampai selesai? "], ["Status berkas", "[Status berkas] Mohon dicek status berkas saya. "], ["Jadwal", "[Jadwal] Hari dan jam apa yang paling baik untuk {x}? "], ["Keluhan", "[Keluhan] "]];
var AT = null;
function lampiran() {
  if (AT && Date.now() - AT.t < 90000) return AT.p;
  var p = Promise.all([api("/api/permohonan").catch(function () { return {daftar: []}; }), api("/api/booking").catch(function () { return {daftar: []}; })]).then(function (r) { return {pm: r[0].daftar || [], bk: r[1].daftar || []}; });
  AT = {t: Date.now(), p: p}; return p;
}
function waitHtml(key) {
  var L = M.filter(function (m) { return m.n === key && !m.dl; }).sort(function (a, b) { return a.ts - b.ts; }), last = L[L.length - 1];
  if (!last || last.by !== "user") return "";
  var mins = (Date.now() - last.ts) / 60000, typ = BALAS || 0, late = typ ? mins > Math.max(typ * 3, 60) : mins > 1440, pct = typ ? Math.min(100, Math.round(mins * 100 / (typ * 2))) : Math.min(100, Math.round(mins * 100 / 1440));
  var aw = CFG.wa || "", nudge = late && aw ? ' <a class="chip" target="_blank" rel="noopener noreferrer" href="' + esc(waLink(aw, "Halo admin, saya " + (ME ? ME.nama : "") + ". Pertanyaan saya di " + label(key) + " belum dibalas. Mohon dicek di Takok Pelayanan Suroboyo.")) + '">Ingatkan admin via WhatsApp</a>' : "";
  return '<div class="lx-w' + (late ? " late" : "") + '"><div class="bar2"><i style="width:' + pct + '%"></i></div><small>Menunggu balasan admin ' + dur(mins) + (typ ? ". Biasanya dibalas dalam ±" + dur(typ) + "." : ".") + (late ? " Lebih lama dari biasanya." : "") + '</small>' + nudge + '</div>';
}
function injectQ(ta) {
  ta.setAttribute("data-lxd", "1");
  var key = ta.dataset.k.slice(2), e = entryOf(key), nm = e ? e[1] : "layanan ini";
  var w = document.createElement("div"); w.className = "lxq"; w.dataset.key = key;
  w.innerHTML = '<div class="lxq-h"><b>Jenis pertanyaan</b> <small>supaya admin bisa menjawab lebih cepat</small></div><div class="lxq-c">' + JN.map(function (j, i) { return '<button type="button" class="chip" data-lq="' + i + '">' + esc(j[0]) + '</button>'; }).join("") + '</div><div class="lxq-a" hidden></div><div class="lxq-w">' + waitHtml(key) + '</div>';
  ta.insertAdjacentElement("beforebegin", w);
  lampiran().then(function (r) {
    var box = w.querySelector(".lxq-a"); if (!box || !w.isConnected) return;
    var h = r.pm.slice(0, 3).map(function (o, i) { return '<button type="button" class="chip" data-la="pm:' + i + '">Permohonan: ' + esc(String(o.jenis).slice(0, 28)) + '</button>'; }).join("") +
      r.bk.filter(function (o) { return o.kunci === key && /Terjadwal|Sudah tiba|Dipanggil/.test(o.status); }).slice(0, 2).map(function (o) { return '<button type="button" class="chip" data-la="bk:' + esc(o.kode) + '">Tiket ' + esc(o.kode) + '</button>'; }).join("");
    if (h) { box.hidden = false; box.innerHTML = '<small>Lampirkan data saya:</small> ' + h; box._d = r; }
  });
}
function insertTa(ta, s) { if (!ta) return; var v = ta.value; ta.value = v + (v && !/\s$/.test(v) ? "\n" : "") + s; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.dispatchEvent(new Event("input", {bubbles: true})); }
function taOf(el) { var qa = el.closest(".qa"); return qa ? qa.querySelector("textarea") : null; }

document.addEventListener("click", async function (e) {
  var t = e.target; if (!t.closest) return;
  var q = t.closest("[data-lq]");
  if (q) {
    var w = q.closest(".lxq"), ta = taOf(w), j = JN[+q.dataset.lq], e1 = entryOf(w.dataset.key), x = e1 ? e1[1] : "layanan ini", pre = j[1].replace("{x}", x);
    if (!ta) return;
    var tag = pre.match(/^\[[^\]]+\]\s*/)[0];
    if (ta.value && !/^\[[^\]]+\]/.test(ta.value)) { ta.value = tag + ta.value; ta.dispatchEvent(new Event("input", {bubbles: true})); ta.focus(); }
    else if (/^\[[^\]]+\]/.test(ta.value)) { ta.value = ta.value.replace(/^\[[^\]]+\]\s*/, tag); ta.dispatchEvent(new Event("input", {bubbles: true})); ta.focus(); }
    else insertTa(ta, pre);
    [].forEach.call(w.querySelectorAll("[data-lq]"), function (z) { z.setAttribute("aria-pressed", z === q ? "true" : "false"); });
    return;
  }
  var a = t.closest("[data-la]");
  if (a) {
    var box = a.closest(".lxq-a"), r = box && box._d, pa = a.dataset.la.split(":"), ta2 = taOf(a); if (!r || !ta2) return;
    if (pa[0] === "pm") { var o = r.pm[+pa[1]]; if (o) insertTa(ta2, "Permohonan: " + o.jenis + (o.nomor ? ", No. " + o.nomor : "") + (o.status ? ", status: " + o.status : "") + "."); }
    else { var bk = r.bk.filter(function (z) { return z.kode === pa[1]; })[0]; if (bk) insertTa(ta2, "Tiket booking: " + bk.kode + " (" + bk.tanggal + " pukul " + bk.jam + ")."); }
    return;
  }
  var d = t.closest("[data-lx]"); if (!d) return;
  var act = d.dataset.lx, lx = d.closest(".lx"), key = lx ? lx.dataset.key : "";
  if (act === "book") { I.goBook(key); }
  else if (act === "asisten") { BOTX.about(key); }
  else if (act === "salin") copyTxt(infoLoket(key), "Info loket disalin.");
  else if (act === "wa") waOpen(infoLoket(key));
  else if (act === "ckb") { var kb = kbById(d.dataset.id); if (kb && window.openAsisten) { var em = !$p("bm").children.length; openAsisten(); setTimeout(function () { I.add("u", esc(kb.t)); I.ckShow(kb); }, em ? 900 : 0); } }
  else if (act === "sepi") {
    var sp = lx.querySelector(".lx-sp"); if (!sp) return;
    if (S !== "user") { needLogin(); return; }
    if (!sp.hidden && sp.dataset.on) { sp.hidden = true; sp.dataset.on = ""; return; }
    sp.hidden = false; sp.dataset.on = "1"; sp.innerHTML = '<small class="sys">Memuat kuota booking...</small>';
    try { var rs = await sepiHtml(key); sp.innerHTML = rs.html; } catch (x) { sp.textContent = x.message; }
  }
  else {
    var qd = d.closest(".lx-q"), r2 = qd ? window.KATA[+qd.dataset.ri] : null; if (!r2) return;
    if (act === "fsalin") copyTxt(I.plainJ(r2.j), "Jawaban disalin.");
    else if (act === "fup" || act === "fdn") { try { api("/api/bot/hit", {ks: [(r2.k || [])[0]], v: act === "fup" ? 1 : -1}).catch(function () {}); } catch (x) {} d.parentNode.innerHTML = act === "fup" ? "<small>Terima kasih! Senang bisa membantu.</small>" : '<small>Terima kasih masukannya.</small> <button type="button" class="chip" data-lx="ftanya">Tanya admin</button>'; }
    else if (act === "ftanya") {
      if (needLogin()) return;
      var ta3 = taOf(lx), kw = (r2.k || [])[0] || ""; if (!ta3) return;
      insertTa(ta3, "Saya masih bingung soal “" + kw + "”: "); ta3.scrollIntoView({block: "center"});
    }
  }
});

function scanLx() {
  [].forEach.call(document.querySelectorAll("#list details.row:not([data-lxd])"), injectRow);
  [].forEach.call(document.querySelectorAll('#list .qf textarea[data-k^="q:"]:not([data-lxd])'), injectQ);
}
var raf2 = 0;
new MutationObserver(function () { if (!raf2) raf2 = requestAnimationFrame(function () { raf2 = 0; scanLx(); }); }).observe($p("list"), {childList: true, subtree: true});
setInterval(function () { [].forEach.call(document.querySelectorAll(".lxq"), function (w) { var h = waitHtml(w.dataset.key), z = w.querySelector(".lxq-w"); if (z && z.innerHTML !== h) z.innerHTML = h; }); }, 60000);
scanLx();
})();
