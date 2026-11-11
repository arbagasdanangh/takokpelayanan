"use strict";
/* Tab admin "Editor loket" (versi 11).
   Dua bagian:
   1. Tempat pelayanan: ubah nama, uraian, alamat, jam, telepon, tautan peta; tambah, urutkan, sembunyikan, kembalikan bawaan.
   2. Loket & uraian: ubah nama, uraian berformat (pratinjau langsung), sistem, jam, tautan resmi, zona; filter "uraian belum diisi";
      simpan lalu lanjut ke loket berikutnya; isi massal dari tempelan spreadsheet atau berkas CSV. */
(function () {
var LK = null, VW = "lok", LL = "", LQ = "", FL = "semua", ED = null, EL = null, IM = null, IMS = false, BUSY = false;
var KERANGKA = "Layanan yang tersedia:\n- \n- \n\nSyarat: \nBiaya: \nJam layanan: \nCatatan: ";

function kosong(u) { u = String(u || "").trim(); return !u || /belum diisi/i.test(u); }
function plain(u) { return String(u || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim(); }
function potong(u, n) { u = plain(u); return u.length > n ? u.slice(0, n) + "..." : u; }
function lokOf(id) { return LK.lokasi.filter(function (l) { return l.id === id; })[0]; }
function loketDi(id) { return LK.loket.filter(function (e) { return e.lokasi === id; }); }
function stat(id) { var L = loketDi(id), t = L.length, ok = L.filter(function (e) { return !kosong(e.uraian); }).length; return {t: t, ok: ok, p: t ? Math.round(ok * 100 / t) : 0}; }
function statSy(id) { var r = {ada: 0, ver: 0, jenis: 0}; loketDi(id).forEach(function (e) { if (e.syarat && e.syarat.length) { r.ada++; if (e.syv) r.ver++; r.jenis += e.syarat.filter(function (x) { return /^#\s*/.test(x); }).length || 1; } }); return r; }
function bar(p) { return '<div class="lk-bar" role="img" aria-label="' + p + ' persen terisi"><i style="width:' + p + '%"></i></div>'; }
function pb(t, c) { return '<i class="pb" style="background:' + c + '">' + t + '</i> '; }
function pv(v) { return window.fmtJawab ? fmtJawab(v) : "<p>" + esc(v) + "</p>"; }
function edAktif() { return ED && ED !== "new" ? LK.loket.filter(function (x) { return x.kunci === ED; })[0] : null; }

async function refreshPublik() {
  try {
    var j = await api("/api/info");
    LOCS = j.lokasi.map(function (l) { return {id: l.id, nm: l.nama, ur: l.uraian || "", al: l.alamat || "", jam: l.jam || "", tl: l.telp || "", mp: l.maps || ""}; }); LD = {};
    j.loket.forEach(function (r) { (LD[r[0]] = LD[r[0]] || []).push([r[1], r[2], r[3], r[4], r[5] || "", r[6] !== 0, r[7] !== 0, r[8] || "", r[9] || "", r[10] || [], r[11] ? 1 : 0]); });
    for (var k in LD) LD[k].sort(function (a, b) { return a[0] - b[0]; });
    if (!LD[LOC] && LOCS.length) LOC = LOCS[0].id;
    if (window.lc) lc();
  } catch (x) {}
}

/* ---------- Editor uraian berformat ---------- */
function editorU(id, val, max, rows) {
  return '<div class="lk-tb" role="toolbar" aria-label="Format uraian">' +
    '<button type="button" class="btn" data-lk="fmt" data-f="b" data-t="' + id + '"><b>Tebal</b></button>' +
    '<button type="button" class="btn" data-lk="fmt" data-f="ul" data-t="' + id + '">&bull; Poin</button>' +
    '<button type="button" class="btn" data-lk="fmt" data-f="ol" data-t="' + id + '">1. Langkah</button>' +
    '<button type="button" class="btn" data-lk="fmt" data-f="tpl" data-t="' + id + '">Kerangka</button></div>' +
    '<textarea class="si" id="' + id + '" rows="' + (rows || 7) + '" maxlength="' + max + '">' + esc(val || "") + '</textarea>' +
    '<div class="lk-pv"><small class="sys">Pratinjau (seperti tampilan pengunjung)</small><div class="ur" id="' + id + '-p"></div></div>';
}
function bindEditor(id, cid, max) {
  var u = $(id), p = $(id + "-p"), c = cid && $(cid); if (!u) return;
  var f = function () { p.innerHTML = u.value.trim() ? pv(u.value) : '<span class="sys">Belum ada isi.</span>'; if (c) c.textContent = u.value.length + "/" + max; };
  u.oninput = f; f();
}
function fmtTa(ta, f) {
  var v = ta.value, a = ta.selectionStart, b = ta.selectionEnd, sel = v.slice(a, b);
  if (f === "b") { var t = sel || "teks tebal"; ta.value = v.slice(0, a) + "**" + t + "**" + v.slice(b); ta.setSelectionRange(a + 2, a + 2 + t.length); }
  else if (f === "ul" || f === "ol") {
    var s0 = v.lastIndexOf("\n", a - 1) + 1, e0 = v.indexOf("\n", b); if (e0 < 0) e0 = v.length;
    var n = 0, blok = v.slice(s0, e0).split("\n").map(function (l) { l = l.replace(/^\s*(?:[-\u2022*]|\d+[.)])\s+/, ""); n++; return (f === "ul" ? "- " : n + ". ") + l; }).join("\n");
    ta.value = v.slice(0, s0) + blok + v.slice(e0); ta.setSelectionRange(s0, s0 + blok.length);
  } else if (f === "tpl") { ta.value = v.trim() ? v.replace(/\s+$/, "") + "\n\n" + KERANGKA : KERANGKA; }
  ta.focus(); ta.dispatchEvent(new Event("input"));
}

/* ---------- Bagian 1: tempat pelayanan ---------- */
function formLok(l) {
  var n = !l;
  return '<div class="card lkf"><h3>' + (n ? "Tambah tempat pelayanan baru" : "Ubah tempat pelayanan: " + esc(l.nama)) + '</h3>' +
    '<label for="lo-n">Nama tempat pelayanan</label><input class="si" id="lo-n" maxlength="60" placeholder="mis. SPP Rungkut" value="' + esc(l ? l.nama : "") + '">' +
    '<label for="lo-u">Uraian tempat pelayanan <small class="sys" id="lo-c"></small></label>' + editorU("lo-u", l ? l.uraian : "", 2000, 6) +
    '<label for="lo-a">Alamat</label><input class="si" id="lo-a" maxlength="200" placeholder="mis. Jl. Tunjungan No. 1, Surabaya" value="' + esc(l ? l.alamat : "") + '">' +
    '<div class="lk-2"><div><label for="lo-j">Jam layanan</label><input class="si" id="lo-j" maxlength="120" placeholder="mis. Senin-Jumat 08.00-14.00" value="' + esc(l ? l.jam : "") + '"></div>' +
    '<div><label for="lo-t">Telepon</label><input class="si" id="lo-t" maxlength="40" inputmode="tel" placeholder="mis. (031) 1234567" value="' + esc(l ? l.telp : "") + '"></div></div>' +
    '<label for="lo-m">Tautan peta <small class="sys">(opsional, https://... dari Google Maps; kosong = pencarian otomatis)</small></label><input class="si" id="lo-m" maxlength="300" type="url" value="' + esc(l ? l.maps : "") + '">' +
    '<label class="ckl"><input type="checkbox" id="lo-v"' + (!l || !l.sembunyi ? " checked" : "") + '><span>Tampilkan di beranda</span></label>' +
    '<div class="btns"><button type="button" class="send" data-lk="lsave">Simpan</button><button type="button" class="btn" data-lk="cancel">Batal</button></div></div>';
}
function viewLok() {
  var tot = LK.loket.length, ok = LK.loket.filter(function (e) { return !kosong(e.uraian); }).length, p = tot ? Math.round(ok * 100 / tot) : 0;
  return '<div class="card lk-sum"><div><b>' + LK.lokasi.length + ' tempat pelayanan &middot; ' + tot + ' loket</b><p class="sys" style="margin:2px 0 0">Uraian loket terisi: ' + ok + ' dari ' + tot + ' (' + p + '%)</p></div>' + bar(p) + '</div>' +
    '<div class="hint"><button type="button" class="send" data-lk="lnew">+ Tambah tempat pelayanan</button></div>' +
    (EL === "new" ? formLok(null) : "") +
    LK.lokasi.map(function (l, i) {
      var s = stat(l.id), m = [];
      if (l.alamat) m.push("Alamat: " + esc(l.alamat)); if (l.jam) m.push("Jam: " + esc(l.jam)); if (l.telp) m.push("Telp: " + esc(l.telp));
      return '<article class="card lkc' + (l.sembunyi ? " off" : "") + '" style="margin:0 0 8px"><div class="lk-h"><b>' + esc(l.nama) + '</b>' +
        (l.sembunyi ? pb("Disembunyikan", "#64748b") : "") + (l.diubah ? pb(l.asli ? "Diubah admin" : "Baru", l.asli ? "#d97706" : "#16a34a") : "") + '</div>' +
        '<p class="sys" style="margin:4px 0">' + (l.uraian ? esc(potong(l.uraian, 200)) : '<i>Uraian tempat belum diisi.</i>') + '</p>' +
        (m.length ? '<small class="sys">' + m.join(" &middot; ") + '</small>' : '') +
        '<div class="lk-st"><small class="sys">' + s.ok + ' dari ' + s.t + ' uraian loket terisi</small>' + bar(s.p) + '</div>' +
        '<div class="btns"><button type="button" class="btn" data-lk="ledit" data-l="' + esc(l.id) + '">Ubah</button>' +
        '<button type="button" class="btn" data-lk="lktl" data-l="' + esc(l.id) + '">Kelola loket (' + s.t + ')</button>' +
        '<button type="button" class="btn" data-lk="lup" data-l="' + esc(l.id) + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Naikkan urutan">&uarr;</button>' +
        '<button type="button" class="btn" data-lk="ldn" data-l="' + esc(l.id) + '"' + (i === LK.lokasi.length - 1 ? " disabled" : "") + ' aria-label="Turunkan urutan">&darr;</button>' +
        '<button type="button" class="btn" data-lk="lhide" data-l="' + esc(l.id) + '">' + (l.sembunyi ? "Tampilkan" : "Sembunyikan") + '</button>' +
        (l.asli && l.diubah ? '<button type="button" class="btn" data-lk="lreset" data-l="' + esc(l.id) + '">Kembalikan bawaan</button>' : "") + '</div></article>' +
        (EL === l.id ? formLok(l) : "");
    }).join("");
}

/* ---------- Persyaratan per jenis izin (versi 37) ---------- */
var SY_CEPAT = ["Izin Baru", "Perpanjangan", "Perubahan Data", "Penggantian (hilang/rusak)", "Bersyarat"];
function syParse(L) {
  var G = [], cur = null;
  (L || []).forEach(function (x) {
    if (/^#\s*/.test(x)) { cur = {t: x.replace(/^#\s*/, "").trim(), items: []}; G.push(cur); }
    else if (String(x).trim()) { if (!cur) { cur = {t: "", items: []}; G.push(cur); } cur.items.push(String(x).trim()); }
  });
  return G;
}
function syGrup(g, i) {
  return '<div class="syg"><div class="syg-h"><span class="syg-n">Jenis izin</span>' +
    '<input class="si syg-t" maxlength="100" placeholder="mis. Izin Baru Penyelenggaraan Tempat Parkir" value="' + esc(g.t) + '" aria-label="Nama jenis izin">' +
    '<span class="syg-b"><button type="button" class="btn" data-lk="syup" title="Naikkan" aria-label="Naikkan jenis izin">&uarr;</button>' +
    '<button type="button" class="btn" data-lk="sydn" title="Turunkan" aria-label="Turunkan jenis izin">&darr;</button>' +
    '<button type="button" class="btn" data-lk="sydup" title="Gandakan sebagai dasar jenis izin lain">Gandakan</button>' +
    '<button type="button" class="btn" data-lk="sydel">Hapus</button></span></div>' +
    '<textarea class="si syg-i" rows="' + Math.max(4, Math.min(12, g.items.length + 1)) + '" maxlength="4000" placeholder="Satu syarat per baris&#10;KTP&#10;Surat permohonan bermaterai" aria-label="Persyaratan jenis izin">' + esc(g.items.join("\n")) + '</textarea></div>';
}
function syEditor(L) {
  var G = syParse(L);
  return '<div id="lf-syw" class="syw"><div id="lf-syl">' + G.map(syGrup).join("") + '</div>' +
    '<div class="syw-a"><button type="button" class="send" data-lk="syadd">+ Tambah jenis izin</button>' +
    '<button type="button" class="btn" data-lk="sytempel">Tempel massal</button><span class="sys">Tambah cepat:</span>' + SY_CEPAT.map(function (n) { return '<button type="button" class="chip" data-lk="syadd" data-n="' + esc(n) + '">' + esc(n) + '</button>'; }).join("") + '</div>' +
    '<div id="lf-syp" class="syp" hidden><p class="sys">Tempel daftar. <b>Cara 1:</b> satu nama jenis izin per baris (mis. daftar peruntukan PBG), syaratnya diisi sesudahnya. <b>Cara 2:</b> awali nama dengan <b>#</b>, baris di bawahnya jadi syarat. Hasilnya <b>ditambahkan</b> ke kartu yang ada.</p>' +
    '<textarea class="si" id="lf-syt" rows="8" placeholder="# PBG Rumah Tinggal Sederhana&#10;KTP&#10;Bukti hak tanah&#10;# PBG Menara Telekomunikasi&#10;..."></textarea>' +
    '<div class="btns"><button type="button" class="send" data-lk="sytapply">Buat kartu</button><button type="button" class="btn" data-lk="sytutup">Batal</button></div></div></div>';
}
function syBaca() {
  var out = [];
  [].forEach.call(document.querySelectorAll("#lf-syl .syg"), function (g) {
    var t = g.querySelector(".syg-t").value.replace(/^[#\s]+/, "").trim(), items = g.querySelector(".syg-i").value.split(/\r?\n/).map(function (x) { return x.replace(/^[#\s]+/, "").trim(); }).filter(Boolean);
    if (!t && !items.length) return;
    out.push("# " + (t || "Persyaratan umum")); items.forEach(function (x) { out.push(x); });
  });
  return out;
}
function syAksi(a, b) {
  var L = $("lf-syl"); if (!L) return false;
  var g = b.closest(".syg");
  if (a === "sytempel") { $("lf-syp").hidden = false; $("lf-syt").focus(); return true; }
  if (a === "sytutup") { $("lf-syp").hidden = true; return true; }
  if (a === "sytapply") {
    var tx = $("lf-syt").value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!tx.length) { toast("Tempel dulu daftarnya."); return true; }
    var G = syParse(/^#/.test(tx[0]) || tx.some(function (x) { return /^#/.test(x); }) ? tx : tx.map(function (x) { return "# " + x; }));
    if (G.length > 40) { toast("Maksimal 40 jenis izin sekali tempel."); return true; }
    L.insertAdjacentHTML("beforeend", G.map(syGrup).join("")); $("lf-syt").value = ""; $("lf-syp").hidden = true;
    toast(G.length + " jenis izin ditambahkan. Isi syaratnya, lalu Simpan."); return true;
  }
  if (a === "syadd") {
    var h = document.createElement("div"); h.innerHTML = syGrup({t: b.dataset.n || "", items: []}); var n = h.firstChild; L.appendChild(n);
    var f = n.querySelector(".syg-t"); if (b.dataset.n) n.querySelector(".syg-i").focus(); else f.focus(); n.scrollIntoView({block: "nearest"}); return true;
  }
  if (!g) return false;
  if (a === "sydel") { var tt = g.querySelector(".syg-t").value.trim(), ii = g.querySelector(".syg-i").value.trim(); if ((tt || ii) && !confirm("Hapus jenis izin" + (tt ? " \"" + tt + "\"" : "") + " beserta persyaratannya? (Belum tersimpan sampai Anda menekan Simpan.)")) return true; g.remove(); return true; }
  if (a === "syup" && g.previousElementSibling) { L.insertBefore(g, g.previousElementSibling); return true; }
  if (a === "sydn" && g.nextElementSibling) { L.insertBefore(g.nextElementSibling, g); return true; }
  if (a === "sydup") {
    var h2 = document.createElement("div"); h2.innerHTML = syGrup({t: g.querySelector(".syg-t").value.trim() + " (salinan)", items: g.querySelector(".syg-i").value.split(/\r?\n/).filter(Boolean)}); var c = h2.firstChild;
    L.insertBefore(c, g.nextElementSibling); c.querySelector(".syg-t").focus(); return true;
  }
  return true;
}

/* ---------- Bagian 2: loket dan uraian ---------- */
function formLoket(e) {
  var n = !e;
  return '<div class="card lkf"><h3>' + (n ? "Tambah loket baru di " + esc((lokOf(LL) || {}).nama || "") : "Ubah loket: " + esc(e.nama)) + '</h3>' +
    '<label for="lf-n">Nama loket / instansi</label><input class="si" id="lf-n" maxlength="80" value="' + esc(e ? e.nama : "") + '">' +
    '<label for="lf-u">Uraian layanan <small class="sys" id="lf-c"></small></label>' + editorU("lf-u", e && !kosong(e.uraian) ? e.uraian : "", 2000, 8) +
    '<label>Persyaratan per jenis izin <small class="sys">(tiap loket bisa punya beberapa jenis izin, masing-masing dengan syarat sendiri)</small></label>' + syEditor(e && e.syarat) +
    (e && e.syarat && e.syarat.length && !e.syv ? '<p class="sys">Isi awal bawaan aplikasi, <b>belum diverifikasi</b> loket. Periksa, ubah bila perlu, lalu Simpan: setelah itu tampil sebagai terverifikasi admin.</p>' : '<p class="sys">Tampil di Booking, Pendamping, dan Lembar Pengantar pemohon sesuai loket yang dituju. Maksimal 150 baris syarat per loket.</p>') +
    '<label for="lf-s">Sistem / cara layanan</label><input class="si" id="lf-s" maxlength="120" placeholder="mis. SSW / OSS atau Datang langsung" value="' + esc(e ? e.sistem : "") + '">' +
    '<div class="lk-2"><div><label for="lf-j">Jam layanan loket <small class="sys">(opsional)</small></label><input class="si" id="lf-j" maxlength="120" placeholder="mis. 08.00-14.00" value="' + esc(e ? e.jam || "" : "") + '"></div>' +
    '<div><label for="lf-z">Zona <small class="sys">(MPP, mis. Zona 2)</small></label><input class="si" id="lf-z" maxlength="20" value="' + esc(e ? e.zona || "" : "") + '"></div></div>' +
    '<label for="lf-l">Tautan informasi resmi <small class="sys">(opsional, https://...)</small></label><input class="si" id="lf-l" maxlength="300" type="url" value="' + esc(e ? e.tautan || "" : "") + '">' +
    '<label class="ckl"><input type="checkbox" id="lf-d"' + (!e || e.diskusi !== false ? " checked" : "") + '><span>Terima pertanyaan pemohon (Diskusi dengan admin)</span></label>' +
    '<div class="btns"><button type="button" class="send" data-lk="save">Simpan</button>' + (!n ? '<button type="button" class="btn" data-lk="savenext">Simpan &amp; loket berikutnya</button>' : "") + '<button type="button" class="btn" data-lk="cancel">Batal</button></div></div>';
}
function daftarLoket() {
  var q = LQ.toLowerCase();
  return loketDi(LL).filter(function (e) {
    if (FL === "kosong" && !kosong(e.uraian)) return false;
    if (FL === "diubah" && !e.diubah && e.asli) return false;
    if (FL === "sembunyi" && !e.sembunyi) return false;
    if (FL === "sybelum" && e.syarat && e.syarat.length) return false;
    if (FL === "syvbelum" && !(e.syarat && e.syarat.length && !e.syv)) return false;
    return !q || (e.nama + " " + e.uraian + " " + e.sistem + " " + (e.zona || "")).toLowerCase().indexOf(q) > -1;
  });
}
function viewImpor() {
  if (!IM) return "";
  if (IM === "buka") {
    if (IMS) return '<div class="card lkf"><h3>Impor persyaratan: ' + esc((lokOf(LL) || {}).nama) + '</h3>' +
      '<p class="sys">Satu baris = satu syarat. Kolom: <b>Loket</b> (nama sama persis, atau nomor), <b>Jenis Izin</b>, <b>Syarat</b>. Kolom Loket/Jenis Izin boleh dikosongkan pada baris di bawahnya (ikut baris di atas). Cara: (1) klik <b>Unduh templat CSV</b>, (2) isi di Excel/Google Sheets, (3) salin lalu tempel di bawah, atau simpan CSV (UTF-8) dan pilih berkasnya. <b>Syarat lama loket yang ada di berkas akan diganti seluruhnya.</b> Berkas .xlsx: salin selnya lalu tempel.</p>' +
      '<div class="btns"><button type="button" class="btn" data-lk="templatsy">Unduh templat CSV</button><label class="btn" style="cursor:pointer">Pilih berkas CSV<input type="file" id="im-f" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden></label></div>' +
      '<textarea class="si" id="im-t" rows="8" placeholder="Loket&#9;Jenis Izin&#9;Syarat&#10;Layanan DPRKPP&#9;PBG Rumah Tinggal Sederhana&#9;KTP&#10;&#9;&#9;Bukti hak tanah"></textarea>' +
      '<div class="btns"><button type="button" class="send" data-lk="impcek">Periksa</button><button type="button" class="btn" data-lk="impbatal">Batal</button></div></div>';
    return '<div class="card lkf"><h3>Isi massal uraian loket: ' + esc((lokOf(LL) || {}).nama) + '</h3>' +
      '<p class="sys">Cara termudah: (1) klik <b>Unduh templat CSV</b>, (2) isi kolom Uraian di Excel/Google Sheets, (3) salin sel lalu tempel di kotak di bawah, atau simpan sebagai CSV (UTF-8) dan pilih berkasnya. Kolom: <b>Nama</b> (atau No), <b>Uraian</b>, lalu opsional Sistem, Jam, Tautan. Baris judul boleh ada. Nama harus sama dengan nama loket.</p>' +
      '<div class="btns"><button type="button" class="btn" data-lk="templat">Unduh templat CSV</button><label class="btn" style="cursor:pointer">Pilih berkas CSV<input type="file" id="im-f" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden></label></div>' +
      '<textarea class="si" id="im-t" rows="7" placeholder="Tempel di sini (salinan dari Excel / Google Sheets)"></textarea>' +
      '<div class="btns"><button type="button" class="send" data-lk="impcek">Periksa</button><button type="button" class="btn" data-lk="impbatal">Batal</button></div></div>';
  }
  var ok = IM.items.filter(function (x) { return x.ok; }), ubah = ok.filter(function (x) { return x.beda; });
  return '<div class="card lkf"><h3>Pratinjau isi massal</h3><p class="sys">' + ubah.length + ' loket akan diubah, ' + (ok.length - ubah.length) + ' tidak berubah, ' + (IM.items.length - ok.length) + ' baris dilewati. Belum tersimpan sampai Anda menekan Terapkan.</p>' +
    '<div class="lk-imp">' + IM.items.map(function (x) {
      return '<div class="lk-ir ' + (!x.ok ? "bad" : x.beda ? "chg" : "same") + '"><b>' + esc(x.nama || "(kosong)") + '</b> <small>' + (!x.ok ? "dilewati: " + esc(x.alasan) : x.beda ? "diubah" : "sama") + '</small>' +
        (x.ok && x.beda && x.sy ? '<p class="sys">' + x.sy.jenis + ' jenis izin, ' + x.sy.butir + ' syarat' + (x.lama ? ' (menggantikan ' + x.lama + ' baris lama)' : '') + ': ' + esc(potong(x.sy.nama.join(", "), 160)) + '</p>' : '') + (x.ok && x.beda && !x.sy ? '<p class="sys">' + (x.lama ? "<s>" + esc(potong(x.lama, 80)) + "</s> " : "") + esc(potong(x.uraian, 160)) + '</p>' : '') + '</div>';
    }).join("") + '</div><div class="btns"><button type="button" class="send" data-lk="impterap"' + (ubah.length ? "" : " disabled") + '>Terapkan ' + ubah.length + ' perubahan</button><button type="button" class="btn" data-lk="impbatal">Batal</button></div></div>';
}
function viewLoket() {
  var L = daftarLoket(), s = stat(LL), sy = statSy(LL), kos = loketDi(LL).filter(function (e) { return kosong(e.uraian); }).length;
  return '<div class="hint" id="lk-lc" role="group" aria-label="Tempat pelayanan">' + LK.lokasi.map(function (l) { return '<button type="button" class="chip" data-lk="loc" data-l="' + esc(l.id) + '" aria-pressed="' + (l.id === LL) + '">' + esc(l.nama) + (l.sembunyi ? " (sembunyi)" : "") + '</button>'; }).join("") + '</div>' +
    '<div class="card lk-sum"><div><b>' + esc((lokOf(LL) || {}).nama) + '</b><p class="sys" style="margin:2px 0 0">' + s.ok + ' dari ' + s.t + ' uraian terisi' + (kos ? ", " + kos + " belum" : " (lengkap)") + '</p><p class="sys" style="margin:2px 0 0">Persyaratan: ' + sy.ada + ' loket terisi (' + sy.jenis + ' jenis izin), ' + sy.ver + ' terverifikasi admin</p></div>' + bar(s.p) + '</div>' +
    '<div class="hint" id="lk-fl" role="group" aria-label="Saring">' + [["semua", "Semua"], ["kosong", "Uraian belum diisi"], ["diubah", "Diubah admin"], ["sembunyi", "Disembunyikan"], ["sybelum", "Syarat belum diisi"], ["syvbelum", "Syarat belum diverifikasi"]].map(function (f) { return '<button type="button" class="chip" data-lk="fl" data-f="' + f[0] + '" aria-pressed="' + (FL === f[0]) + '">' + f[1] + '</button>'; }).join("") + '</div>' +
    '<div class="hint"><input class="si" id="lk-q" type="search" placeholder="Cari loket atau isi uraian..." value="' + esc(LQ) + '" style="flex:1;min-width:160px"><button type="button" class="send" data-lk="new">+ Tambah loket</button><button type="button" class="btn" data-lk="impor">Isi massal uraian (Excel/CSV)</button><button type="button" class="btn" data-lk="impsy">Impor persyaratan (Excel/CSV)</button></div>' +
    (IM ? viewImpor() : "") + (ED === "new" ? formLoket(null) : "") +
    (L.length ? L.map(function (e) {
      return '<article class="card lkc' + (e.sembunyi ? " off" : "") + '" style="margin:0 0 8px"><b>' + e.no + '. ' + esc(e.nama) + '</b> ' + (e.sembunyi ? pb("Disembunyikan", "#64748b") : "") + (e.diubah ? pb("Diubah admin", "#d97706") : "") + (!e.asli ? pb("Baru", "#16a34a") : "") + (kosong(e.uraian) ? pb("Uraian kosong", "#dc2626") : "") +
        '<p class="sys" style="margin:4px 0">' + (kosong(e.uraian) ? '<i>Uraian belum diisi.</i>' : esc(potong(e.uraian, 180))) + '</p><small class="sys">Sistem: ' + esc(e.sistem || "-") + (e.zona ? " &middot; " + esc(e.zona) : "") + (e.jam ? " &middot; Jam: " + esc(e.jam) : "") + '</small>' +
        '<div class="btns"><button type="button" class="btn" data-lk="edit" data-k="' + e.kunci + '">Ubah</button><button type="button" class="btn" data-lk="hide" data-k="' + e.kunci + '">' + (e.sembunyi ? "Tampilkan" : "Sembunyikan") + '</button>' + (e.asli && e.diubah ? '<button type="button" class="btn" data-lk="reset" data-k="' + e.kunci + '">Kembalikan bawaan</button>' : "") + '</div></article>' + (ED === e.kunci ? formLoket(e) : "");
    }).join("") : '<div class="empty">' + (FL === "kosong" ? "Semua uraian di tempat ini sudah terisi." : "Tidak ada loket yang cocok.") + '</div>');
}

function draw(el) {
  el.innerHTML = '<h2 class="sec">Editor loket</h2><p class="sys">Perubahan langsung tampil di beranda dan chatbot tanpa deploy ulang. Yang disembunyikan tidak tampil dan tidak menerima booking atau pertanyaan baru, tetapi riwayatnya aman.</p>' +
    '<div class="hint" role="group" aria-label="Bagian editor"><button type="button" class="chip" data-lk="vw" data-v="lok" aria-pressed="' + (VW === "lok") + '">Tempat pelayanan</button><button type="button" class="chip" data-lk="vw" data-v="lkt" aria-pressed="' + (VW === "lkt") + '">Loket &amp; uraian</button></div>' +
    (VW === "lok" ? viewLok() : viewLoket());
  bindEditor("lo-u", "lo-c", 2000); bindEditor("lf-u", "lf-c", 2000);
  var qi = $("lk-q"); if (qi) qi.oninput = function () { LQ = qi.value; var p = qi.selectionStart; draw(el); var n = $("lk-q"); n.focus(); n.setSelectionRange(p, p); };
  var fi = $("im-f"); if (fi) fi.onchange = function () { var f = fi.files[0]; if (!f) return; if (f.size > 900000) { toast("Berkas terlalu besar (maksimal 900 KB)."); return; } var r = new FileReader(); r.onload = function () { $("im-t").value = String(r.result); }; r.readAsText(f, "utf-8"); };
}

async function load(el) {
  LK = await api("/api/admin/loket");
  if (!LL || !LK.lokasi.some(function (l) { return l.id === LL; })) LL = LK.lokasi[0].id;
  draw(el);
}

/* ---------- CSV / tempelan ---------- */
function parseCSV(t) {
  t = String(t).replace(/^\uFEFF/, ""); var first = t.split(/\r?\n/)[0] || "";
  var d = first.indexOf("\t") > -1 ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
  var rows = [], row = [], cur = "", q = false;
  for (var i = 0; i < t.length; i++) {
    var c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === "") q = true;
    else if (c === d) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); cur = ""; rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
}
function csvCell(v) { v = String(v == null ? "" : v); return /[",\n\r;\t]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function norm(s) { return String(s || "").replace(/\s+/g, " ").trim().toLowerCase(); }
function unduhTemplat() {
  var rows = [["No", "Nama", "Uraian", "Sistem", "Jam", "Tautan"]].concat(loketDi(LL).map(function (e) { return [e.no, e.nama, kosong(e.uraian) ? "" : e.uraian, e.sistem || "", e.jam || "", e.tautan || ""]; }));
  var blob = new Blob(["\uFEFF" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n")], {type: "text/csv;charset=utf-8"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "uraian-" + LL + ".csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
}
function unduhTemplatSy() {
  var e0 = loketDi(LL)[0];
  var rows = [["Loket", "Jenis Izin", "Syarat"]];
  loketDi(LL).forEach(function (e) {
    var first = true, j = "", jt = "";
    (e.syarat || []).forEach(function (x) {
      if (/^#\s*/.test(x)) { j = x.replace(/^#\s*/, ""); jt = ""; return; }
      rows.push([first ? e.nama : "", j !== jt ? j : "", x]); first = false; jt = j;
    });
  });
  if (rows.length === 1 && e0) rows.push([e0.nama, "Izin Baru", "KTP"], ["", "", "Surat permohonan bermaterai"], ["", "Perpanjangan", "KTP"], ["", "", "Izin lama"]);
  var blob = new Blob(["﻿" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n")], {type: "text/csv;charset=utf-8"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "persyaratan-" + LL + ".csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
}
function periksaSyarat() {
  var rows = parseCSV($("im-t").value); if (!rows.length) { toast("Belum ada data untuk diperiksa."); return; }
  var h = rows[0].map(norm), kol = {loket: 0, jenis: 1, syarat: 2};
  if (h.some(function (x) { return /^(no|nama|loket|instansi|jenis|syarat|persyaratan)/.test(x); })) {
    kol = {}; h.forEach(function (x, i) { var k = /^no\.?$|^nomor/.test(x) ? "no" : /loket|instansi|nama/.test(x) ? "loket" : /jenis|izin|layanan/.test(x) ? "jenis" : /syarat|dokumen|berkas/.test(x) ? "syarat" : ""; if (k && kol[k] === undefined) kol[k] = i; });
    rows = rows.slice(1);
  }
  if (kol.syarat === undefined || (kol.loket === undefined && kol.no === undefined)) { toast("Kolom Loket (atau No) dan Syarat tidak ditemukan. Gunakan templat."); return; }
  var L = loketDi(LL), by = {}, order = [], cur = null, jenis = "", jenisTulis = "";
  rows.slice(0, 1500).forEach(function (r) {
    var nm = kol.loket !== undefined ? String(r[kol.loket] || "").trim() : "", no = kol.no !== undefined ? String(r[kol.no] || "").trim() : "";
    if (nm || no) { cur = nm || ("No " + no); jenis = ""; jenisTulis = ""; if (!by[cur]) { by[cur] = {nama: cur, no: no, lines: [], jenis: [], butir: 0}; order.push(cur); } }
    if (!cur) return;
    var g = by[cur], j = kol.jenis !== undefined ? String(r[kol.jenis] || "").trim() : "", sy = String(r[kol.syarat] || "").replace(/^[#\s]+/, "").trim();
    if (j) jenis = j.replace(/^[#\s]+/, "");
    if (jenis && jenis !== jenisTulis) { g.lines.push("# " + jenis); g.jenis.push(jenis); jenisTulis = jenis; }
    if (sy) { g.lines.push(sy); g.butir++; }
  });
  IM = {items: order.map(function (n) {
    var g = by[n], e = L.filter(function (x) { return norm(x.nama) === norm(g.nama) || (/^\d+$/.test(g.no) && x.no === +g.no); }), it = {nama: g.nama, ok: false};
    if (e.length !== 1) it.alasan = e.length ? "nama ganda" : "loket tidak ditemukan di " + ((lokOf(LL) || {}).nama || "");
    else if (!g.butir) it.alasan = "tidak ada syarat";
    else if (g.lines.length > 150) it.alasan = "lebih dari 150 baris";
    else {
      it.ok = true; it.kunci = e[0].kunci; it.lama = (e[0].syarat || []).length; it.beda = e[0].syarat.join("\n") !== g.lines.join("\n") || !e[0].syv;
      it.sy = {jenis: g.jenis.length, butir: g.butir, nama: g.jenis.length ? g.jenis : ["(tanpa judul)"]}; it.body = {kunci: e[0].kunci, syarat: g.lines};
    }
    return it;
  })};
}
function periksaImpor() {
  var rows = parseCSV($("im-t").value); if (!rows.length) { toast("Belum ada data untuk diperiksa."); return; }
  var h = rows[0].map(norm), kol = {nama: 0, uraian: 1, sistem: 2, jam: 3, tautan: 4}, ada = h.some(function (x) { return /^(no|nama|loket|instansi|uraian)/.test(x); });
  if (ada) {
    kol = {}; h.forEach(function (x, i) { var k = /^no\.?$|^nomor/.test(x) ? "no" : /nama|loket|instansi/.test(x) ? "nama" : /uraian|deskripsi|layanan/.test(x) ? "uraian" : /sistem/.test(x) ? "sistem" : /jam/.test(x) ? "jam" : /tautan|link|url/.test(x) ? "tautan" : ""; if (k && kol[k] === undefined) kol[k] = i; });
    rows = rows.slice(1);
  }
  if (kol.uraian === undefined || (kol.nama === undefined && kol.no === undefined)) { toast("Kolom Nama (atau No) dan Uraian tidak ditemukan. Gunakan templat."); return; }
  var L = loketDi(LL), items = [], seen = {};
  rows.slice(0, 400).forEach(function (r) {
    var nm = kol.nama !== undefined ? String(r[kol.nama] || "").trim() : "", no = kol.no !== undefined ? String(r[kol.no] || "").trim() : "", ur = String(r[kol.uraian] || "").replace(/\r/g, "").trim();
    var e = L.filter(function (x) { return nm ? norm(x.nama) === norm(nm) : /^\d+$/.test(no) && x.no === +no; });
    var it = {nama: nm || ("No " + no), ok: false, uraian: ur};
    if (e.length !== 1) it.alasan = e.length ? "nama ganda" : "loket tidak ditemukan di " + ((lokOf(LL) || {}).nama || "");
    else if (seen[e[0].kunci]) it.alasan = "muncul dua kali";
    else if (!ur) it.alasan = "uraian kosong";
    else {
      seen[e[0].kunci] = 1; it.ok = true; it.kunci = e[0].kunci; it.lama = kosong(e[0].uraian) ? "" : e[0].uraian; it.beda = ur !== it.lama;
      it.body = {kunci: e[0].kunci, uraian: ur};
      ["sistem", "jam", "tautan"].forEach(function (k) { if (kol[k] !== undefined) { var v = String(r[kol[k]] || "").trim(); if (v) it.body[k] = v; } });
    }
    items.push(it);
  });
  IM = {items: items};
}

/* ---------- Simpan ---------- */
function bodyLoket(e) {
  return {kunci: e ? e.kunci : "", lokasi: e ? e.lokasi : LL, nama: $("lf-n").value, uraian: $("lf-u").value, syarat: syBaca(), sistem: $("lf-s").value, zona: $("lf-z").value, jam: $("lf-j").value, tautan: $("lf-l").value, diskusi: $("lf-d").checked, sembunyi: e ? !!e.sembunyi : false};
}
function keLoket(e, ov) { var o = {kunci: e.kunci, lokasi: e.lokasi, nama: e.nama, uraian: e.uraian, sistem: e.sistem, zona: e.zona || "", jam: e.jam || "", tautan: e.tautan || "", diskusi: e.diskusi !== false, sembunyi: !!e.sembunyi}; for (var k in ov) o[k] = ov[k]; return o; }

window.aLk = async function (el) {
  await load(el);
  el.onclick = async function (ev) {
    var b = ev.target.closest("[data-lk]"); if (!b || BUSY) return;
    var a = b.dataset.lk, k = b.dataset.k, id = b.dataset.l, e = k && LK.loket.filter(function (x) { return x.kunci === k; })[0];
    if (/^sy(add|del|up|dn|dup|tempel|tutup|tapply)$/.test(a)) { syAksi(a, b); return; }
    try {
      if (a === "fmt") fmtTa($(b.dataset.t), b.dataset.f);
      else if (a === "vw") { VW = b.dataset.v; ED = EL = null; IM = null; draw(el); }
      else if (a === "loc") { LL = id; ED = null; IM = null; draw(el); }
      else if (a === "fl") { FL = b.dataset.f; draw(el); }
      else if (a === "cancel") { ED = EL = null; draw(el); }
      else if (a === "lktl") { VW = "lkt"; LL = id; FL = "semua"; LQ = ""; ED = EL = null; draw(el); }
      /* tempat pelayanan */
      else if (a === "lnew") { EL = "new"; draw(el); $("lo-n").focus(); }
      else if (a === "ledit") { EL = id; draw(el); $("lo-n").focus(); }
      else if (a === "lsave" || a === "lhide") {
        BUSY = true; var l = a === "lhide" ? lokOf(id) : (EL && EL !== "new" ? lokOf(EL) : null), body;
        if (a === "lhide") body = {id: l.id, nama: l.nama, uraian: l.uraian, alamat: l.alamat, jam: l.jam, telp: l.telp, maps: l.maps, sembunyi: !l.sembunyi};
        else body = {id: l ? l.id : "", nama: $("lo-n").value, uraian: $("lo-u").value, alamat: $("lo-a").value, jam: $("lo-j").value, telp: $("lo-t").value, maps: $("lo-m").value, sembunyi: !$("lo-v").checked};
        var r = await api("/api/admin/lokasi/simpan", body); if (a === "lsave") EL = null; if (r && r.id && !l) LL = r.id;
        await load(el); refreshPublik();
        toast(a === "lhide" ? (body.sembunyi ? "Tempat pelayanan disembunyikan." : "Tempat pelayanan ditampilkan.") : "Tempat pelayanan tersimpan dan sudah tampil di beranda.");
      }
      else if (a === "lup" || a === "ldn") {
        BUSY = true; var ids = LK.lokasi.map(function (x) { return x.id; }), i = ids.indexOf(id), j = a === "lup" ? i - 1 : i + 1;
        if (j >= 0 && j < ids.length) { var t = ids[i]; ids[i] = ids[j]; ids[j] = t; await api("/api/admin/lokasi/urutan", {ids: ids}); await load(el); refreshPublik(); }
      }
      else if (a === "lreset") { if (!confirm("Kembalikan tempat pelayanan ini (nama, uraian, alamat, urutan) ke isi bawaan?")) return; BUSY = true; await api("/api/admin/lokasi/reset", {id: id}); await load(el); refreshPublik(); toast("Dikembalikan ke bawaan."); }
      /* loket */
      else if (a === "new") { ED = "new"; draw(el); $("lf-n").focus(); }
      else if (a === "edit") { ED = k; draw(el); var f = $("lf-n"); if (f) { f.focus(); f.scrollIntoView({block: "center"}); } }
      else if (a === "save" || a === "savenext") {
        BUSY = true; var ce = edAktif(), asal = ce && ce.kunci, urut = daftarLoket().map(function (x) { return x.kunci; });
        await api("/api/admin/loket/simpan", bodyLoket(ce)); ED = null; await load(el);
        if (a === "savenext" && asal) {
          var sisa = daftarLoket().map(function (x) { return x.kunci; }), nx = urut.slice(urut.indexOf(asal) + 1).filter(function (x) { return sisa.indexOf(x) > -1; })[0];
          if (nx) { ED = nx; draw(el); var g = $("lf-n"); if (g) { g.focus(); g.scrollIntoView({block: "center"}); } }
        }
        refreshPublik(); toast("Loket tersimpan dan sudah tampil di beranda.");
      }
      else if (a === "hide") { BUSY = true; await api("/api/admin/loket/simpan", keLoket(e, {sembunyi: !e.sembunyi})); await load(el); refreshPublik(); toast(e.sembunyi ? "Loket ditampilkan." : "Loket disembunyikan."); }
      else if (a === "reset") { if (!confirm("Kembalikan loket ini ke isi bawaan?")) return; BUSY = true; await api("/api/admin/loket/reset", {kunci: k}); await load(el); refreshPublik(); toast("Dikembalikan ke bawaan."); }
      /* isi massal */
      else if (a === "impor") { IM = "buka"; IMS = false; ED = null; draw(el); }
      else if (a === "impsy") { IM = "buka"; IMS = true; ED = null; draw(el); }
      else if (a === "templatsy") unduhTemplatSy();
      else if (a === "impbatal") { IM = null; draw(el); }
      else if (a === "templat") unduhTemplat();
      else if (a === "impcek") { if (IMS) periksaSyarat(); else periksaImpor(); draw(el); }
      else if (a === "impterap") {
        BUSY = true; var items = IM.items.filter(function (x) { return x.ok && x.beda; }).map(function (x) { return x.body; }); var res = await api("/api/admin/loket/massal", {items: items});
        IM = null; await load(el); refreshPublik(); toast(res.diubah + (IMS ? " loket: persyaratan tersimpan" : " uraian loket tersimpan") + (res.dilewati && res.dilewati.length ? ", " + res.dilewati.length + " dilewati." : "."));
      }
    } catch (x) { err(x.message); toast(x.message); }
    BUSY = false;
  };
};
})();
