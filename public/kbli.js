"use strict";
/* Versi 12: data KBLI (diimpor admin dari sumber resmi OSS/BPS), pencarian bahasa sehari-hari, keranjang KBLI,
   serta "Pemeriksa pertanyaan" dan penyisip KBLI untuk Tanya Admin. Tanpa AI luar; data tersimpan di browser. */
(function () {
var KEY = "tk_kbli2", FAV = "tk_kbli_fav", D = {v: "", m: {}, r: [], ix: []};
var STOP = {yang: 1, dan: 1, untuk: 1, mau: 1, bikin: 1, buat: 1, saya: 1, kode: 1, kbli: 1, usaha: 1, bidang: 1, apa: 1, cari: 1, jenis: 1, dengan: 1, di: 1, ke: 1, atau: 1, punya: 1, ingin: 1, nib: 1, oss: 1, ada: 1, itu: 1, ini: 1, dong: 1, tolong: 1, minta: 1, tentang: 1, daftar: 1, bisnis: 1};
/* Kata sehari-hari -> kata yang biasa dipakai di judul KBLI. Hanya untuk memperluas pencarian, bukan data resmi. */
var SYN = {warung: "makan restoran", warteg: "makan restoran", kopi: "kedai minuman kafe", cafe: "kafe kedai minuman", kafe: "kedai minuman", jualan: "perdagangan eceran", toko: "eceran perdagangan", online: "daring internet", olshop: "daring eceran", dropship: "daring perdagangan", laundry: "binatu cuci", salon: "pangkas rias kecantikan", barbershop: "pangkas rambut", bengkel: "reparasi perawatan", kos: "penginapan", kost: "penginapan", homestay: "penginapan", ojek: "angkutan", taksi: "angkutan", catering: "penyediaan makanan", katering: "penyediaan makanan", konveksi: "pakaian jadi", jahit: "pakaian jadi", fotokopi: "fotokopi", percetakan: "pencetakan cetak", sablon: "pencetakan cetak", klinik: "praktik kesehatan", apotek: "farmasi eceran obat", bimbel: "pendidikan kursus bimbingan", les: "pendidikan kursus", kursus: "pendidikan", tour: "perjalanan wisata", travel: "perjalanan wisata", properti: "real estate", kontraktor: "konstruksi bangunan", bangunan: "konstruksi", software: "perangkat lunak pemrograman", aplikasi: "perangkat lunak", konten: "kreator konten", youtuber: "konten video", ekspedisi: "pengiriman kurir", kurir: "pengiriman", pertanian: "tanaman budidaya", peternakan: "ternak", tambak: "ikan budidaya", roti: "kue bakeri", kue: "bakeri roti", minuman: "minuman", gym: "olahraga kebugaran", fitness: "olahraga kebugaran", parkir: "parkir", bank: "perbankan", fotografi: "fotografi", event: "penyelenggaraan acara", wedding: "penyelenggaraan pernikahan acara"};

function norm(s) { return String(s || "").toLowerCase(); }
function prep(rows) { D.r = rows; D.ix = rows.map(function (r) { return norm(r[1] + " " + r[2]); }); }
function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.v && Array.isArray(o.r)) { D.v = o.v; D.m = o.m || {}; prep(o.r); } } catch (e) {} }
/* Data bawaan: seluruh KBLI 2025 (1.559 kode) dari berkas statis. Dipakai bila admin belum mengimpor data sendiri;
   data impor admin (bila ada) selalu didahulukan. */
var BUN = null;
function bundled() {
  if (D.r.length || BUN) return BUN;
  BUN = fetch("/kbli-2025.json?v=1").then(function (x) { return x.ok ? x.json() : null; }).then(function (j) {
    if (j && j.rows && j.rows.length && !D.r.length) {
      D.v = ""; D.m = j.m || {};
      prep(j.rows.map(function (r) { return [r[0], r[1], r[2] || "", "", "", ""]; }));
      document.dispatchEvent(new Event("kbli-ready"));
    }
  }).catch(function () { BUN = null; });
  return BUN;
}
load();
if (!D.r.length) setTimeout(bundled, 0);
async function sync(v, m) {
  if (!v) { try { localStorage.removeItem(KEY); } catch (e) {} D.v = ""; D.m = {}; prep([]); bundled(); return; }
  if (D.v === v) { D.m = m || D.m; return; }
  try {
    var j = await api("/api/kbli?v=" + encodeURIComponent(v));
    if (j && j.rows && j.rows.length) { D.v = j.v; D.m = j.m || m || {}; prep(j.rows); try { localStorage.setItem(KEY, JSON.stringify({v: D.v, m: D.m, r: D.r})); } catch (e) {} }
  } catch (e) {}
}
function words(q) { return norm(q).replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 1 && !STOP[w]; }); }
function search(q, max) {
  var t = String(q || "").trim(), out = [], i; max = max || 8;
  if (!D.r.length) return out;
  if (/^\d{2,5}$/.test(t)) { for (i = 0; i < D.r.length && out.length < max; i++) if (D.r[i][0].indexOf(t) === 0) out.push(D.r[i]); return out; }
  var ws = words(t); if (!ws.length) return out;
  var gs = ws.map(function (w) { return [w].concat((SYN[w] || "").split(" ").filter(Boolean)); }), need = gs.length > 2 ? Math.ceil(gs.length * 0.6) : 1, sc = [];
  for (i = 0; i < D.r.length; i++) {
    var title = norm(D.r[i][1]), text = D.ix[i], hit = 0, s = 0;
    gs.forEach(function (g) {
      var best = 0;
      g.forEach(function (w, k) { var p = k === 0 ? 3 : 2; if (title.indexOf(w) > -1) best = Math.max(best, p + ((" " + title).indexOf(" " + w) > -1 ? 1 : 0)); else if (text.indexOf(w) > -1) best = Math.max(best, 1); });
      if (best) { hit++; s += best; }
    });
    if (hit >= need) sc.push([s + (hit === gs.length ? 4 : 0), i]);
  }
  sc.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
  return sc.slice(0, max).map(function (x) { return D.r[x[1]]; });
}
function byKode(k) { for (var i = 0; i < D.r.length; i++) if (D.r[i][0] === String(k)) return D.r[i]; return null; }
function risk(r) { var s = norm(r[3]); return /menengah tinggi/.test(s) ? "mt" : /menengah rendah/.test(s) ? "mr" : /tinggi/.test(s) ? "t" : /rendah/.test(s) ? "r" : ""; }
function favs() { try { var a = JSON.parse(localStorage.getItem(FAV) || "[]"); return Array.isArray(a) ? a.filter(function (x) { return /^\d{5}$/.test(x); }) : []; } catch (e) { return []; } }
function setFavs(a) { try { localStorage.setItem(FAV, JSON.stringify(a.slice(0, 20))); } catch (e) {} }
function toggleFav(k) { var a = favs(), i = a.indexOf(k); if (i > -1) a.splice(i, 1); else a.push(k); setFavs(a); return i < 0; }
function meta() { return D.m || {}; }
function judulMeta() { var m = meta(); return (m.sumber || "KBLI") + (m.tgl ? " (data per " + m.tgl + ")" : ""); }
function copy(t, msg) { try { navigator.clipboard.writeText(t).then(function () { if (window.toast) toast(msg || "Tersalin."); }, function () { if (window.toast) toast(t); }); } catch (e) { if (window.toast) toast(t); } }
function detailHtml(r, tombol) {
  var f = favs().indexOf(r[0]) > -1, rk = risk(r);
  return '<div class="kd-c"><div class="kd-h"><b class="kd-k">' + esc(r[0]) + '</b>' + (r[3] ? '<span class="kd-r r-' + rk + '">Risiko: ' + esc(r[3]) + '</span>' : '') + '</div><h3>' + esc(r[1]) + '</h3>' +
    (r[2] ? '<p class="kd-u">' + esc(r[2]) + '</p>' : '') + (r[4] ? '<p class="kd-m"><b>Perizinan:</b> ' + esc(r[4]) + '</p>' : '') + (r[5] ? '<p class="kd-m"><b>Padanan KBLI 2020:</b> ' + esc(r[5]) + '</p>' : '') +
    '<p class="sys">' + esc(judulMeta()) + '. Kode akhir dan tingkat risiko ditetapkan di OSS; cek kembali di oss.go.id sebelum mengajukan.</p>' +
    (tombol === false ? "" : '<div class="btns"><button type="button" class="btn" data-kd="salin" data-k="' + r[0] + '">Salin kode</button><button type="button" class="btn" data-kd="fav" data-k="' + r[0] + '">' + (f ? "Hapus dari daftar" : "Simpan ke daftar") + '</button><button type="button" class="btn" data-kd="adm" data-k="' + r[0] + '">Tanya admin</button><button type="button" class="btn" data-kd="bot" data-k="' + r[0] + '">Tanya Asisten</button></div>') + '</div>';
}
function tanyaAdmin(r, extra) {
  var k = window.findK && (findK(/analisa kesesuaian/i, "pusat") || findK(/^loket (informasi|cs)$/i, "pusat"));
  if (!k) { if (window.toast) toast("Loket tujuan belum ditemukan."); return false; }
  KEEP["q:" + k] = (extra || "Saya ingin bertanya tentang KBLI " + r[0] + " (" + r[1] + "). ");
  if (window.openKey) openKey(k); return true;
}
window.KBLI = {sync: sync, ready: function () { return D.r.length ? Promise.resolve() : (bundled() || Promise.resolve()); }, all: function () { return D.r; }, has: function () { return D.r.length > 0; }, count: function () { return D.r.length; }, meta: meta, search: search, byKode: byKode, risk: risk, favs: favs, toggleFav: toggleFav, clearFavs: function () { setFavs([]); }, detailHtml: detailHtml, copy: copy, tanyaAdmin: tanyaAdmin, judul: judulMeta, words: words};

/* Tombol di kartu detail (dipakai pencarian cepat) */
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-kd]"); if (!b) return;
  var r = byKode(b.dataset.k); if (!r) return;
  if (b.dataset.kd === "salin") copy(r[0], "Kode " + r[0] + " disalin.");
  else if (b.dataset.kd === "fav") { var on = toggleFav(r[0]); b.textContent = on ? "Hapus dari daftar" : "Simpan ke daftar"; if (window.toast) toast(on ? "Disimpan ke daftar KBLI Anda." : "Dihapus dari daftar."); }
  else if (b.dataset.kd === "adm") { var o = document.getElementById("wk"); if (o) o.remove(); tanyaAdmin(r); }
  else if (b.dataset.kd === "bot") { var o2 = document.getElementById("wk"); if (o2) o2.remove(); if (window.openAsisten) openAsisten(); if (window.askAsisten) askAsisten("kbli " + r[0]); }
});

/* ===== Tanya Admin: pemeriksa kejelasan pertanyaan + penyisip KBLI ===== */
function cek(t) {
  t = String(t || "");
  return [
    {ok: t.trim().length >= 25, t: "Apa yang diurus", ins: "Saya ingin mengurus ", tip: "Ceritakan apa yang ingin diurus dalam satu kalimat."},
    {ok: /\b\d{6,}\b|nib\s*[:\-]?\s*\d|nomor|no\.\s*\d/i.test(t), t: "Nomor permohonan/NIB", ins: "\nNomor permohonan/NIB: ", tip: "Sertakan nomor permohonan atau NIB agar admin bisa langsung memeriksa."},
    {ok: /\?|bagaimana|kenapa|mengapa|apakah|berapa|kapan|belum|gagal|error|tidak bisa|kendala|syarat|biaya/i.test(t), t: "Pertanyaan/kendala", ins: "\nKendala saya: ", tip: "Tuliskan pertanyaan atau kendala yang dihadapi."}
  ];
}
window.askPlus = function (ta, tb) {
  if (ta.dataset.ap) return; ta.dataset.ap = "1";
  var p = document.createElement("div"); p.className = "ap"; tb.insertAdjacentElement("afterend", p);
  var open = false;
  function put(s) { var a = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, a) + s + ta.value.slice(ta.selectionEnd || a); ta.focus(); ta.dispatchEvent(new Event("input", {bubbles: true})); }
  function paint() {
    var c = cek(ta.value), n = c.filter(function (x) { return x.ok; }).length, lv = ["Belum lengkap", "Cukup", "Baik", "Sangat jelas"][n], miss = c.filter(function (x) { return !x.ok; })[0], kb = window.KBLI && KBLI.has();
    p.innerHTML = '<div class="ap-h"><span class="ap-m" role="img" aria-label="Kejelasan ' + n + ' dari 3"><i style="width:' + Math.round(n * 100 / 3) + '%" class="n' + n + '"></i></span><b>Kejelasan pertanyaan: ' + lv + '</b></div>' +
      '<div class="ap-c">' + c.map(function (x, i) { return '<button type="button" class="ap-p' + (x.ok ? " ok" : "") + '" data-ap="' + i + '" aria-label="' + x.t + (x.ok ? " sudah ada" : " belum ada, ketuk untuk menambahkan") + '">' + (x.ok ? "\u2713 " : "+ ") + x.t + '</button>'; }).join("") + (kb ? '<button type="button" class="ap-p kbl" data-ap="kbli">' + (open ? "Tutup KBLI" : "Sisipkan KBLI") + '</button>' : "") + '</div>' +
      (miss && ta.value.trim() ? '<small class="sys">' + miss.tip + '</small>' : "") + (open ? '<div class="apk"><input class="si" id="apq" type="search" placeholder="Cari KBLI: warung kopi, toko online, 56101..." autocomplete="off"><div id="apr" role="listbox"></div></div>' : "");
    if (open) { var q = p.querySelector("#apq"); q.value = p.dataset.q || ""; q.oninput = function () { p.dataset.q = q.value; list(); }; q.focus(); q.setSelectionRange(q.value.length, q.value.length); list(); }
  }
  function list() {
    var q = p.querySelector("#apq").value, o = p.querySelector("#apr"), R = q.trim().length > 1 ? KBLI.search(q, 6) : [];
    o.innerHTML = R.length ? R.map(function (r) { return '<button type="button" class="apr" data-pk="' + r[0] + '"><b>' + r[0] + '</b> ' + esc(r[1]) + '</button>'; }).join("") : '<small class="sys">' + (q.trim().length > 1 ? "Tidak ada yang cocok." : "Ketik kegiatan usaha atau kode.") + '</small>';
  }
  p.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.ap === "kbli") { open = !open; paint(); }
    else if (b.dataset.ap !== undefined) { var x = cek(ta.value)[+b.dataset.ap]; if (x && !x.ok) put(x.ins); }
    else if (b.dataset.pk) { var r = KBLI.byKode(b.dataset.pk); if (r) { put((ta.value && !/\s$/.test(ta.value) ? " " : "") + "KBLI " + r[0] + " (" + r[1] + ") "); open = false; paint(); } }
  });
  ta.addEventListener("input", function () { if (!open) paint(); else { var c = p.querySelector(".ap-m i"); } });
  paint();
};
})();
