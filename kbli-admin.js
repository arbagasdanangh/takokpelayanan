"use strict";
/* Tab admin "Data KBLI": impor daftar KBLI resmi (OSS/BPS) dari tempelan spreadsheet atau berkas CSV.
   Takok tidak membawa daftar KBLI sendiri agar tidak ada kode yang keliru: sumber kebenarannya adalah berkas resmi yang Anda impor. */
(function () {
var P = null, BUSY = false, SUMBER = "KBLI 2025 (Peraturan BPS 7/2025)";

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
function norm(s) { return String(s || "").replace(/\s+/g, " ").trim().toLowerCase(); }

/* Petakan kolom lewat judul; tanpa judul dipakai urutan: Kode, Judul, Uraian, Risiko, Perizinan, KBLI 2020 */
function periksa(txt) {
  var rows = parseCSV(txt); if (!rows.length) return null;
  var h = rows[0].map(norm), kol = {kode: 0, judul: 1, uraian: 2, risiko: 3, izin: 4, lama: 5}, ada = h.some(function (x) { return /^(kode|kbli|judul|nama|klasifikasi|uraian|deskripsi)/.test(x); });
  if (ada) {
    kol = {}; h.forEach(function (x, i) {
      var k = /2020|lama|padanan|konversi/.test(x) ? "lama" : /^(kode|kbli)( 5 digit| 2025)?$|^kode/.test(x) ? "kode" : /risiko/.test(x) ? "risiko" : /izin|perizinan/.test(x) ? "izin" : /judul|nama|klasifikasi|bidang usaha/.test(x) ? "judul" : /uraian|deskripsi|ruang lingkup|cakupan/.test(x) ? "uraian" : "";
      if (k && kol[k] === undefined) kol[k] = i;
    });
    rows = rows.slice(1);
  }
  if (kol.kode === undefined || kol.judul === undefined) return {err: "Kolom Kode dan Judul tidak ditemukan. Pakai templat atau beri judul kolom: Kode, Judul, Uraian, Risiko, Perizinan, KBLI 2020."};
  var seen = {}, ok = [], lewat = [], dup = 0;
  rows.forEach(function (r, n) {
    var kode = String(r[kol.kode] || "").replace(/\D/g, ""), judul = String(r[kol.judul] || "").replace(/\s+/g, " ").trim();
    if (kode.length !== 5 || judul.length < 2) { if (String(r[kol.kode] || "").trim() || judul) lewat.push((n + 1 + (ada ? 1 : 0)) + ": " + (String(r[kol.kode] || "").trim() || "(kosong)")); return; }
    if (seen[kode]) { dup++; return; }
    seen[kode] = 1;
    var g = function (k, m) { return kol[k] !== undefined ? String(r[kol[k]] || "").replace(/\s+/g, " ").trim().slice(0, m) : ""; };
    ok.push([kode, judul.slice(0, 200), g("uraian", 500), g("risiko", 40), g("izin", 120), g("lama", 80)]);
  });
  return {rows: ok, lewat: lewat, dup: dup};
}

function draw(el, st) {
  var m = (st && st.m) || {}, ada = st && st.n > 0;
  el.innerHTML = '<h2 class="sec">Data KBLI</h2>' +
    '<p class="sys">OSS memakai <b>KBLI 2025</b> sejak 15 Juni 2026. Takok tidak membawa daftar KBLI sendiri; Anda mengimpor daftar resmi (dari OSS atau BPS), lalu data otomatis muncul di Pencarian Cepat (Ctrl+K), Asisten Takok, dan penyisip KBLI di Tanya Admin.</p>' +
    '<div class="card lk-sum"><div><b>' + (ada ? st.n + " kode KBLI tersimpan" : "Belum ada data KBLI") + '</b><p class="sys" style="margin:2px 0 0">' + (ada ? esc(m.sumber || "-") + (m.tgl ? " &middot; diimpor " + esc(m.tgl) : "") : "Pengunjung hanya melihat tautan ke OSS sampai data diimpor.") + '</p></div>' + (ada ? '<div class="btns"><button type="button" class="btn" data-kb="hapus">Hapus data KBLI</button></div>' : "") + '</div>' +
    '<div class="card lkf"><h3>Impor / perbarui daftar KBLI</h3>' +
    '<p class="sys">Salin kolom dari berkas Excel resmi lalu tempel di bawah, atau simpan sebagai CSV (UTF-8) dan pilih berkasnya. Kolom: <b>Kode</b> (5 angka), <b>Judul</b>, lalu opsional <b>Uraian</b>, <b>Risiko</b>, <b>Perizinan</b>, <b>KBLI 2020</b> (padanan). Baris judul boleh ada. Impor <b>mengganti seluruh data</b> sebelumnya.</p>' +
    '<label for="kb-s">Sumber data (tampil ke pengunjung)</label><input class="si" id="kb-s" maxlength="120" value="' + esc(SUMBER) + '">' +
    '<div class="btns"><button type="button" class="btn" data-kb="templat">Unduh templat CSV</button><label class="btn" style="cursor:pointer">Pilih berkas CSV<input type="file" id="kb-f" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden></label></div>' +
    '<textarea class="si" id="kb-t" rows="8" placeholder="Tempel di sini (Kode, Judul, Uraian, Risiko, Perizinan, KBLI 2020)"></textarea>' +
    '<div class="btns"><button type="button" class="send" data-kb="cek">Periksa</button></div><div id="kb-pv"></div></div>';
  var fi = el.querySelector("#kb-f");
  fi.onchange = function () { var f = fi.files[0]; if (!f) return; if (f.size > 3000000) { toast("Berkas terlalu besar (maksimal 3 MB)."); return; } var r = new FileReader(); r.onload = function () { el.querySelector("#kb-t").value = String(r.result); }; r.readAsText(f, "utf-8"); };
}

window.aKb = async function (el) {
  async function status() { var j = await api("/api/kbli"); return {n: (j.rows || []).length, m: j.m || {}}; }
  draw(el, await status());
  el.onclick = async function (ev) {
    var b = ev.target.closest("[data-kb]"); if (!b || BUSY) return; var a = b.dataset.kb;
    try {
      if (a === "templat") {
        var csv = "\uFEFFKode,Judul,Uraian,Risiko,Perizinan,KBLI 2020\r\n56101,Contoh judul KBLI,Contoh uraian singkat,Menengah Rendah,NIB dan Sertifikat Standar,56101\r\n", x = document.createElement("a");
        x.href = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"})); x.download = "templat-kbli.csv"; document.body.appendChild(x); x.click(); x.remove();
      } else if (a === "cek") {
        P = periksa(el.querySelector("#kb-t").value); var pv = el.querySelector("#kb-pv");
        if (!P) { toast("Belum ada data untuk diperiksa."); return; }
        if (P.err) { pv.innerHTML = '<div class="empty">' + esc(P.err) + '</div>'; P = null; return; }
        pv.innerHTML = '<div class="card" style="margin:10px 0"><b>' + P.rows.length + ' kode valid</b><p class="sys" style="margin:2px 0">' + (P.dup ? P.dup + " duplikat dilewati. " : "") + (P.lewat.length ? P.lewat.length + " baris dilewati (kode bukan 5 angka atau judul kosong), contoh: " + esc(P.lewat.slice(0, 5).join("; ")) + ". " : "") + 'Contoh: ' + esc(P.rows.slice(0, 3).map(function (r) { return r[0] + " " + r[1]; }).join(" | ")) + '</p><div class="btns"><button type="button" class="send" data-kb="impor"' + (P.rows.length ? "" : " disabled") + '>Terapkan (ganti seluruh data)</button></div></div>';
      } else if (a === "impor" && P && P.rows.length) {
        if (P.rows.length < 20 && !confirm("Hanya " + P.rows.length + " kode. Daftar resmi KBLI berisi ribuan kode. Tetap ganti seluruh data?")) return;
        BUSY = true; b.disabled = true; SUMBER = el.querySelector("#kb-s").value; var per = 500, tot = Math.ceil(P.rows.length / per), j;
        for (var i = 0; i < tot; i++) { b.textContent = "Mengirim " + (i + 1) + " dari " + tot + "..."; j = await api("/api/admin/kbli/impor", {rows: P.rows.slice(i * per, (i + 1) * per), bagian: i, total: tot, sumber: SUMBER}); }
        P = null; toast(j.n + " kode KBLI tersimpan. Pengunjung akan memuatnya otomatis."); draw(el, await status());
        if (window.KBLI) KBLI.sync(j.v, {sumber: SUMBER});
      } else if (a === "hapus") {
        if (!confirm("Hapus seluruh data KBLI dari Takok?")) return; BUSY = true; await api("/api/admin/kbli/hapus", {}); draw(el, await status()); if (window.KBLI) KBLI.sync("", {}); toast("Data KBLI dihapus.");
      }
    } catch (x) { toast(x.message); }
    BUSY = false;
  };
};
})();
