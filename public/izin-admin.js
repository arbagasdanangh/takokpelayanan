"use strict";
/* Tab admin "Katalog Perizinan" (superadmin). Tujuan: merawat daftar jenis izin yang tampil di Perizinan Resmi (izin.js).
   Cara kerja: buka Daftar Perizinan di SSW Alfa atau OSS, salin nama izin dan syaratnya ke Excel/Sheets, tempel di sini, Periksa, lalu Simpan.
   Takok tidak menarik data otomatis dari kedua situs (tidak ada API publik). Tombol "Uji koneksi" hanya memeriksa apakah server ini bisa menjangkau situsnya. */
(function () {
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function norm(s) { return String(s || "").replace(/\s+/g, " ").trim().toLowerCase(); }
function parseCSV(t) {
  t = String(t).replace(/^﻿/, ""); var first = t.split(/\r?\n/)[0] || "";
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
function csvOut(rows) { return "﻿" + rows.map(function (r) { return r.map(function (x) { x = String(x == null ? "" : x); return /[",\n;\t]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(","); }).join("\r\n"); }
var HEAD = ["Nama izin", "Bidang", "Instansi", "Syarat (pisahkan dengan ;)", "Biaya", "Waktu", "Tautan", "Terverifikasi (ya/tidak)"];
function unduh(nama, teks) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([teks], {type: "text/csv;charset=utf-8"})); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function periksa(txt) {
  var rows = parseCSV(txt); if (!rows.length) return null;
  var h = rows[0].map(norm), kol = {nama: 0, bidang: 1, instansi: 2, syarat: 3, biaya: 4, waktu: 5, link: 6, ver: 7}, ada = h.some(function (x) { return /^(nama|izin|jenis|perizinan|bidang|instansi|syarat|persyaratan)/.test(x); });
  if (ada) {
    kol = {}; h.forEach(function (x, i) {
      var k = /verif/.test(x) ? "ver" : /tautan|link|url/.test(x) ? "link" : /biaya|tarif/.test(x) ? "biaya" : /waktu|lama|sla|jangka/.test(x) ? "waktu" : /syarat|persyaratan|dokumen/.test(x) ? "syarat" : /instansi|opd|perangkat|dinas/.test(x) ? "instansi" : /bidang|layanan|kategori/.test(x) ? "bidang" : /nama|izin|jenis|perizinan/.test(x) ? "nama" : "";
      if (k && kol[k] === undefined) kol[k] = i;
    });
    rows = rows.slice(1);
  }
  if (kol.nama === undefined) return {err: "Kolom Nama izin tidak ditemukan. Pakai templat atau beri judul kolom: Nama izin, Bidang, Instansi, Syarat, Biaya, Waktu, Tautan, Terverifikasi."};
  var ok = [], lewat = 0, dup = 0, seen = {};
  rows.forEach(function (r) {
    function g(k) { return kol[k] === undefined ? "" : String(r[kol[k]] || "").replace(/\s+/g, " ").trim(); }
    var nm = g("nama"); if (nm.length < 3) { if (r.some(function (x) { return String(x).trim(); })) lewat++; return; }
    var k = norm(nm) + "|" + norm(g("bidang")); if (seen[k]) { dup++; return; } seen[k] = 1;
    var ln = g("link"); if (ln && !/^https?:\/\/\S+$/.test(ln)) ln = "";
    ok.push([nm.slice(0, 120), g("bidang").slice(0, 80), g("instansi").slice(0, 80), g("syarat").slice(0, 700), g("biaya").slice(0, 100), g("waktu").slice(0, 80), ln, /^(1|y|ya|true|v|terverifikasi)$/i.test(g("ver")) ? 1 : 0]);
  });
  return {ok: ok, lewat: lewat, dup: dup};
}
function kunci(r) { return norm(r[0]) + "|" + norm(r[1]); }

window.aIz = async function (el) {
  var j = await api("/api/admin/izin"), R = (j.rows || []).map(function (r) { return r.slice(0, 8); }), meta = {tgl: j.tgl || 0, sumber: j.sumber || ""}, P = null, QF = "", DIRTY = false, EDIT = -1, BUSY = false;
  var bidNama = (window.Izin && Izin.bidang || []).map(function (b) { return b[1]; });
  function tglTeks() { return meta.tgl ? new Date(meta.tgl).toLocaleString("id-ID", {dateStyle: "medium", timeStyle: "short"}) : "belum pernah"; }
  function daftar() {
    var q = norm(QF), L = R.map(function (r, i) { return {r: r, i: i}; }).filter(function (x) { return !q || norm(x.r.slice(0, 4).join(" ")).indexOf(q) > -1; });
    return '<div class="izx-tbw"><table class="izx-tb"><thead><tr><th>Nama izin</th><th>Bidang</th><th>Ver.</th><th></th></tr></thead><tbody>' + (L.length ? L.slice(0, 100).map(function (x) {
      return '<tr><td><b>' + E(x.r[0]) + '</b><br><small class="sys">' + E(x.r[2]) + (x.r[3] ? " · " + E(x.r[3].slice(0, 70)) + (x.r[3].length > 70 ? "…" : "") : "") + '</small></td><td>' + E(x.r[1]) + '</td><td>' + (x.r[7] ? "Ya" : "—") + '</td><td style="white-space:nowrap"><button type="button" class="btn" data-iz="ubah" data-i="' + x.i + '">Ubah</button> <button type="button" class="btn" data-iz="hapus" data-i="' + x.i + '">Hapus</button></td></tr>';
    }).join("") : '<tr><td colspan="4" class="sys">' + (R.length ? "Tidak ada yang cocok." : "Katalog masih kosong. Tempel data di atas atau tambah satu per satu.") + '</td></tr>') + '</tbody></table></div>' + (L.length > 100 ? '<small class="sys">Menampilkan 100 dari ' + L.length + '. Gunakan pencarian.</small>' : "");
  }
  function form() {
    var r = EDIT > -1 ? R[EDIT] : ["", "", "", "", "", "", "", 0];
    return '<details class="iz-fm"' + (EDIT > -1 ? " open" : "") + '><summary>' + (EDIT > -1 ? "Ubah izin" : "Tambah satu izin") + '</summary><div class="iz-fg"><label>Nama izin<input class="si" id="izx-nm" maxlength="120" value="' + E(r[0]) + '"></label>' +
      '<label>Bidang (nama bidang SSW Alfa)<input class="si" id="izx-bd" maxlength="80" list="izx-bl" value="' + E(r[1]) + '"><datalist id="izx-bl">' + bidNama.map(function (n) { return '<option value="' + E(n) + '">'; }).join("") + '</datalist></label>' +
      '<label>Instansi / OPD<input class="si" id="izx-in" maxlength="80" value="' + E(r[2]) + '"></label><label>Waktu<input class="si" id="izx-wk" maxlength="80" value="' + E(r[5]) + '" placeholder="mis. 3 hari kerja"></label>' +
      '<label>Biaya<input class="si" id="izx-bi" maxlength="100" value="' + E(r[4]) + '" placeholder="mis. Gratis"></label><label>Tautan resmi (opsional)<input class="si" id="izx-ln" maxlength="300" value="' + E(r[6]) + '" placeholder="https://..."></label>' +
      '<label class="iz-w2">Syarat (pisahkan dengan titik koma)<textarea class="si" id="izx-sy" rows="3" maxlength="700">' + E(r[3]) + '</textarea></label>' +
      '<label class="iz-w2" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="izx-vr"' + (r[7] ? " checked" : "") + ' style="width:20px;height:20px"> Sudah saya cocokkan dengan sumber resmi</label></div>' +
      '<div class="btns"><button type="button" class="send" data-iz="simpan1">' + (EDIT > -1 ? "Terapkan perubahan" : "Tambah ke daftar") + '</button>' + (EDIT > -1 ? '<button type="button" class="btn" data-iz="batal">Batal</button>' : "") + '</div></details>';
  }
  function pv() {
    if (!P) return ""; if (P.err) return '<p class="empty">' + E(P.err) + '</p>';
    var peta = {}; R.forEach(function (r) { peta[kunci(r)] = 1; }); var baru = P.ok.filter(function (r) { return !peta[kunci(r)]; }).length;
    return '<div class="izx-s"><div><b>' + P.ok.length + '</b><small>baris valid</small></div><div><b>' + baru + '</b><small>baru</small></div><div><b>' + (P.ok.length - baru) + '</b><small>sudah ada (diperbarui)</small></div><div><b>' + (P.lewat + P.dup) + '</b><small>dilewati (' + P.lewat + ' tanpa nama, ' + P.dup + ' ganda)</small></div></div>' +
      '<div class="btns"><button type="button" class="send" data-iz="gabung">Gabungkan ke daftar</button><button type="button" class="btn" data-iz="ganti">Ganti seluruh daftar</button><button type="button" class="btn" data-iz="buang">Batalkan</button></div><p class="sys">Belum tersimpan di server sampai Anda menekan "Simpan ke server".</p>';
  }
  function draw() {
    el.innerHTML = '<div class="card"><h3 style="margin-top:0">Katalog Perizinan</h3><p class="sys">Isi katalog ini tampil di <b>Perizinan Resmi</b> (menu beranda). Salin dari Daftar Perizinan SSW Alfa atau OSS, lalu tempel di sini. Takok tidak menarik data otomatis dari kedua situs karena keduanya tidak membuka API publik; yang tampil ke warga adalah data yang Anda rawat.</p>' +
      '<div class="izx-s"><div><b>' + R.length + '</b><small>izin di katalog</small></div><div><b>' + R.filter(function (r) { return r[7]; }).length + '</b><small>sudah diverifikasi</small></div><div><b style="font-size:.95rem">' + E(tglTeks()) + '</b><small>terakhir disimpan</small></div></div>' +
      '<label class="sys" style="display:block;margin:6px 0">Sumber data (untuk keterangan ke warga)<input class="si" id="izx-sm" maxlength="120" value="' + E(meta.sumber) + '" placeholder="mis. SSW Alfa, diambil 14 Nov 2026"></label>' +
      '<div class="btns"><button type="button" class="send" data-iz="simpan"' + (DIRTY ? "" : " disabled") + '>' + (DIRTY ? "Simpan ke server" : "Tersimpan") + '</button><button type="button" class="btn" data-iz="templat">Unduh templat CSV</button><button type="button" class="btn" data-iz="ekspor"' + (R.length ? "" : " disabled") + '>Ekspor CSV</button><button type="button" class="btn" data-iz="uji">Uji koneksi ke OSS &amp; SSW Alfa</button></div><div id="izx-ping" class="izx-ping" aria-live="polite"></div></div>' +
      '<div class="card"><h3 style="margin-top:0">Impor dari spreadsheet</h3><div class="btns"><label class="btn" style="cursor:pointer">Pilih berkas CSV<input type="file" id="izx-f" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden></label></div>' +
      '<textarea class="si" id="izx-t" rows="6" placeholder="Atau tempel dari Excel/Google Sheets di sini (kolom: ' + E(HEAD.join(", ")) + ')"></textarea><div class="btns"><button type="button" class="send" data-iz="cek">Periksa</button></div><div id="izx-pv">' + pv() + '</div></div>' +
      '<div class="card">' + form() + '<h3>Daftar izin</h3><input class="si" id="izx-q" type="search" placeholder="Cari di katalog" value="' + E(QF) + '" aria-label="Cari di katalog"><div id="izx-ls">' + daftar() + '</div></div>';
    var fi = el.querySelector("#izx-f");
    fi.onchange = function () { var f = fi.files[0]; if (!f) return; if (f.size > 1500000) { toast("Berkas terlalu besar (maksimal 1,5 MB)."); return; } var r = new FileReader(); r.onload = function () { el.querySelector("#izx-t").value = String(r.result); }; r.readAsText(f, "utf-8"); };
    el.querySelector("#izx-q").oninput = function (e) { QF = e.target.value; el.querySelector("#izx-ls").innerHTML = daftar(); };
    el.querySelector("#izx-sm").oninput = function (e) { meta.sumber = e.target.value; DIRTY = true; var b = el.querySelector("[data-iz=simpan]"); if (b) { b.disabled = false; b.textContent = "Simpan ke server"; } };
  }
  function tandai() { DIRTY = true; draw(); }
  el.onclick = async function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-iz]"); if (!b || BUSY) return; var a = b.dataset.iz, i = +b.dataset.i;
    if (a === "templat") unduh("templat-katalog-perizinan.csv", csvOut([HEAD, ["Contoh: Surat pengantar menikah", "Kelurahan", "Kelurahan", "Fotokopi KTP-el; Fotokopi KK", "Gratis", "1 hari kerja", "", "tidak"]]));
    else if (a === "ekspor") unduh("katalog-perizinan.csv", csvOut([HEAD].concat(R.map(function (r) { return [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7] ? "ya" : "tidak"]; }))));
    else if (a === "cek") { P = periksa(el.querySelector("#izx-t").value); if (!P) { toast("Tidak ada data untuk diperiksa."); return; } el.querySelector("#izx-pv").innerHTML = pv(); }
    else if (a === "buang") { P = null; el.querySelector("#izx-pv").innerHTML = ""; }
    else if (a === "gabung" || a === "ganti") {
      if (!P || !P.ok) return;
      if (a === "ganti") { if (!confirm("Ganti seluruh isi katalog dengan " + P.ok.length + " baris ini?")) return; R = P.ok.slice(); }
      else { var peta = {}; R.forEach(function (r, k) { peta[kunci(r)] = k; }); P.ok.forEach(function (r) { var k = peta[kunci(r)]; if (k === undefined) { peta[kunci(r)] = R.length; R.push(r); } else R[k] = r; }); }
      if (R.length > 800) { toast("Maksimal 800 izin. Kurangi baris."); R = R.slice(0, 800); }
      P = null; el.querySelector("#izx-t").value = ""; tandai(); toast("Diterapkan di daftar. Tekan Simpan ke server.");
    }
    else if (a === "ubah") { EDIT = i; draw(); el.querySelector("#izx-nm").focus(); }
    else if (a === "batal") { EDIT = -1; draw(); }
    else if (a === "hapus") { if (confirm("Hapus \"" + R[i][0] + "\" dari katalog?")) { R.splice(i, 1); EDIT = -1; tandai(); } }
    else if (a === "simpan1") {
      var v = function (id) { return el.querySelector(id).value.replace(/\s+/g, " ").trim(); }, ln = v("#izx-ln");
      var r = [v("#izx-nm"), v("#izx-bd"), v("#izx-in"), el.querySelector("#izx-sy").value.replace(/\s*\n\s*/g, "; ").trim(), v("#izx-bi"), v("#izx-wk"), ln, el.querySelector("#izx-vr").checked ? 1 : 0];
      if (r[0].length < 3) { toast("Isi nama izin."); return; } if (ln && !/^https?:\/\/\S+$/.test(ln)) { toast("Tautan harus diawali http:// atau https://"); return; }
      if (EDIT > -1) R[EDIT] = r; else { var ada = R.findIndex(function (x) { return kunci(x) === kunci(r); }); if (ada > -1) R[ada] = r; else R.push(r); }
      EDIT = -1; tandai();
    }
    else if (a === "simpan") {
      BUSY = true; b.disabled = true; b.textContent = "Menyimpan…";
      try { var res = await api("/api/admin/izin/simpan", {rows: R, sumber: meta.sumber}); meta.tgl = res.tgl; DIRTY = false; if (window.Izin && Izin.reset) Izin.reset(); toast("Katalog tersimpan (" + res.n + " izin). Warga melihatnya dalam beberapa menit."); draw(); }
      catch (x) { toast(x.message || "Gagal menyimpan."); b.disabled = false; b.textContent = "Simpan ke server"; }
      BUSY = false;
    }
    else if (a === "uji") {
      var box = el.querySelector("#izx-ping"); box.innerHTML = '<p class="sys">Menguji koneksi…</p>'; BUSY = true;
      try {
        var h = await api("/api/admin/izin/cek", {}), N = {oss: "OSS (oss.go.id)", ssw: "SSW Alfa (sswalfa.surabaya.go.id)"};
        box.innerHTML = h.hasil.map(function (x) {
          return '<div class="izx-p' + (x.ok ? "" : " bad") + '"><i aria-hidden="true"></i><div><b>' + E(N[x.n] || x.n) + '</b>: ' + (x.ok ? "bisa dijangkau" : "tidak bisa dijangkau") + '<small>' + (x.kode ? "HTTP " + x.kode + " · " : "") + x.ms + ' ms' + (x.jenis ? " · " + E(x.jenis) : "") + (x.galat ? " · " + E(x.galat) : "") + '</small>' +
            (x.ok && x.n === "ssw" && x.dinamis ? '<small>Daftar perizinannya dimuat lewat skrip ("Sedang memuat data"), jadi tidak bisa dibaca otomatis dari server. Salin manual ke katalog.</small>' : "") + '</div></div>';
        }).join("") + '<p class="sys">Uji ini hanya memeriksa apakah server Takok bisa membuka halaman tersebut. Takok tidak menyimpan isinya.</p>';
      } catch (x) { box.innerHTML = '<p class="empty">' + E(x.message || "Uji gagal.") + '</p>'; }
      BUSY = false;
    }
  };
  draw();
};
})();
