/* Admin: Laporan Harian Antrean (per loket, jam puncak, unduh CSV, cetak). */
(function () {
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }
  var LAST = null;
  function fm(n) { return n ? String(n).replace(".", ",") : "–"; }
  function csv(j) {
    var h = ["Loket", "Total booking", "Dilayani", "Tidak hadir", "Batal", "Belum selesai", "Rata tunggu (menit)", "Rata layanan (menit)", "Tunggu terlama (menit)", "Nilai rata-rata", "Jumlah penilai"];
    var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var r = [["Laporan harian antrean", j.tanggal].map(q).join(";"), h.map(q).join(";")];
    j.loket.forEach(function (l) { r.push([l.loket, l.total, l.dilayani, l.tidak_hadir, l.batal, l.belum, fm(l.rata_tunggu), fm(l.rata_layanan), fm(l.tunggu_maks), fm(l.nilai), l.nilai_n].map(q).join(";")); });
    var t = j.total; r.push(["TOTAL", t.booking, t.dilayani, t.tidak_hadir, t.batal, "", fm(t.rata_tunggu), fm(t.rata_layanan), ""].map(q).join(";"));
    return "﻿" + r.join("\r\n");
  }
  window.aLh = async function (el, tgl) {
    tgl = tgl || (LAST && LAST.tanggal) || today();
    var j = await api("/api/admin/laporan/harian?tanggal=" + encodeURIComponent(tgl)); LAST = j; var t = j.total, mx = Math.max.apply(null, [1].concat(j.jam.map(function (x) { return x.n; })));
    var puncak = j.jam.slice().sort(function (a, b) { return b.n - a.n; })[0];
    el.innerHTML = '<h2 class="sec">Laporan harian antrean</h2><div class="card"><div class="btns lh-ctl"><input class="si" type="date" id="lh-d" value="' + e(j.tanggal) + '" max="' + today() + '" style="max-width:180px" aria-label="Tanggal laporan"><button type="button" class="btn" id="lh-csv">Unduh CSV</button><button type="button" class="btn" id="lh-p">Cetak</button><button type="button" class="btn" id="lh-r">Rentang tanggal</button></div></div>' +
      '<div class="kpis"><div class="kpi"><b>' + t.booking + '</b><span>Total booking</span></div><div class="kpi"><b>' + t.dilayani + '</b><span>Dilayani</span></div><div class="kpi"><b>' + (t.kehadiran == null ? "–" : t.kehadiran + "%") + '</b><span>Tingkat kehadiran</span></div><div class="kpi"><b>' + fm(t.rata_tunggu) + '</b><span>Rata tunggu (menit)</span></div><div class="kpi"><b>' + fm(t.rata_layanan) + '</b><span>Rata layanan (menit)</span></div><div class="kpi"><b>' + t.batal + '</b><span>Batal</span></div><div class="kpi"><b>' + (j.nilai && j.nilai.rata != null ? fm(j.nilai.rata) + " / 5" : "–") + '</b><span>Nilai kunjungan (' + ((j.nilai && j.nilai.n) || 0) + ' penilai)</span></div></div>' +
      (j.loket.length ? '<h3 class="dh">Per loket</h3><div class="card lh-tb"><table><thead><tr><th>Loket</th><th>Total</th><th>Dilayani</th><th>Tdk hadir</th><th>Batal</th><th>Belum</th><th>Tunggu</th><th>Layanan</th><th>Terlama</th><th>Nilai</th></tr></thead><tbody>' +
        j.loket.map(function (l) { return '<tr><td>' + e(l.loket) + '</td><td>' + l.total + '</td><td>' + l.dilayani + '</td><td>' + l.tidak_hadir + '</td><td>' + l.batal + '</td><td>' + l.belum + '</td><td>' + fm(l.rata_tunggu) + '</td><td>' + fm(l.rata_layanan) + '</td><td>' + fm(l.tunggu_maks) + '</td><td>' + (l.nilai != null ? fm(l.nilai) + " (" + l.nilai_n + ")" : "–") + '</td></tr>'; }).join("") +
        '</tbody><tfoot><tr><td>Total</td><td>' + t.booking + '</td><td>' + t.dilayani + '</td><td>' + t.tidak_hadir + '</td><td>' + t.batal + '</td><td></td><td>' + fm(t.rata_tunggu) + '</td><td>' + fm(t.rata_layanan) + '</td><td></td><td>' + (j.nilai && j.nilai.rata != null ? fm(j.nilai.rata) : "") + '</td></tr></tfoot></table><p class="sys" style="margin:6px 0 0">Waktu dalam menit. Tunggu = check-in sampai dipanggil dimulai; layanan = mulai sampai check-out.</p></div>' +
        ((j.komentar || []).length ? '<h3 class="dh">Komentar pengunjung</h3><div class="card"><ul class="bul" style="margin:0">' + j.komentar.map(function (k) { return '<li><b>' + "\u2605".repeat(k.nilai) + "\u2606".repeat(5 - k.nilai) + '</b> ' + e(k.teks) + ' <small class="sys">' + e(k.kode) + ' &middot; ' + e(k.loket) + '</small></li>'; }).join("") + '</ul></div>' : '') + '<h3 class="dh">Booking per jam' + (puncak ? ' (puncak ' + e(puncak.jam) + ', ' + puncak.n + ' booking)' : '') + '</h3><div class="card"><div class="lh-bar" role="img" aria-label="Grafik booking per jam">' +
        j.jam.map(function (x) { return '<div><b>' + x.n + '</b><i style="height:' + Math.round(x.n / mx * 85) + '%"></i><span>' + e(x.jam) + '</span></div>'; }).join("") + '</div></div>'
        : '<div class="empty">Tidak ada booking pada tanggal ini.</div>');
    el.querySelector("#lh-d").onchange = function () { if (this.value) window.aLh(el, this.value).catch(function (x) { toast(x.message); }); };
    el.querySelector("#lh-r").onclick = function () { if (window.aLr) window.aLr(el); };
    el.querySelector("#lh-p").onclick = function () { window.print(); };
    el.querySelector("#lh-csv").onclick = function () {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(j)], {type: "text/csv;charset=utf-8"})); a.download = "laporan-antrean-" + j.tanggal + ".csv";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
  };
})();
