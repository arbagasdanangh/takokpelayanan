/* Admin: Laporan rentang tanggal (mingguan/bulanan): tren per hari, ringkasan per loket, CSV. */
(function () {
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function wib(n) { return new Date(Date.now() + 7 * 36e5 + (n || 0) * 864e5).toISOString().slice(0, 10); }
  function fm(n) { return n == null ? "–" : String(n).replace(".", ","); }
  var ST = {dari: "", sampai: ""};
  function csv(j) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var r = [["Laporan antrean", j.dari + " s.d. " + j.sampai].map(q).join(";"), "", ["Tanggal", "Booking", "Dilayani", "Tidak hadir", "Batal"].map(q).join(";")];
    j.hari.forEach(function (h) { r.push([h.tanggal, h.booking, h.dilayani, h.tidak_hadir, h.batal].map(q).join(";")); });
    r.push("", ["Loket", "Booking", "Dilayani", "Tidak hadir", "Batal", "Rata tunggu (mnt)", "Rata layanan (mnt)", "Nilai", "Penilai"].map(q).join(";"));
    j.loket.forEach(function (l) { r.push([l.loket, l.booking, l.dilayani, l.tidak_hadir, l.batal, fm(l.rata_tunggu), fm(l.rata_layanan), fm(l.nilai), l.nilai_n].map(q).join(";")); });
    return "﻿" + r.join("\r\n");
  }
  function grafik(H) {
    var mx = Math.max.apply(null, [1].concat(H.map(function (h) { return h.booking; }))), w = 100 / H.length, g = "";
    H.forEach(function (h, i) {
      var x = i * w, tot = h.booking / mx * 90, dil = h.dilayani / mx * 90;
      g += '<g><title>' + e(h.tanggal) + ": " + h.booking + " booking, " + h.dilayani + " dilayani, " + h.tidak_hadir + " tidak hadir, " + h.batal + ' batal</title>' +
        '<rect x="' + (x + w * 0.12) + '" y="' + (95 - tot) + '" width="' + w * 0.76 + '" height="' + tot + '" fill="#93b4f5" rx="0.6"/>' +
        '<rect x="' + (x + w * 0.12) + '" y="' + (95 - dil) + '" width="' + w * 0.76 + '" height="' + dil + '" fill="#1d4ed8" rx="0.6"/></g>';
    });
    var lb = H.length > 1 ? e(H[0].tanggal.slice(5)) + " – " + e(H[H.length - 1].tanggal.slice(5)) : e(H[0].tanggal);
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Grafik booking per hari, ' + lb + ', puncak ' + mx + ' booking" style="width:100%;height:160px;display:block">' + g + "</svg>" +
      '<div class="sys" style="display:flex;justify-content:space-between"><span>' + lb + '</span><span><i style="background:#93b4f5;display:inline-block;width:10px;height:10px;border-radius:2px"></i> booking &nbsp;<i style="background:#1d4ed8;display:inline-block;width:10px;height:10px;border-radius:2px"></i> dilayani</span></div>';
  }
  window.aLr = async function (el, d1, d2) {
    ST.dari = d1 || ST.dari || wib(-6); ST.sampai = d2 || ST.sampai || wib(0);
    var j; try { j = await api("/api/admin/laporan/rentang?dari=" + ST.dari + "&sampai=" + ST.sampai); } catch (x) { toast(x.message); j = null; }
    var t = j && j.total;
    var bar = '<h2 class="sec">Laporan rentang tanggal</h2><div class="card noprint"><div class="btns lh-ctl"><button type="button" class="btn" id="lr-h">&larr; Laporan harian</button>' +
      '<label class="sys">Dari <input class="si" type="date" id="lr-a" value="' + e(ST.dari) + '" max="' + wib(0) + '"></label><label class="sys">Sampai <input class="si" type="date" id="lr-b" value="' + e(ST.sampai) + '" max="' + wib(0) + '"></label>' +
      '<button type="button" class="btn" data-p="7">7 hari</button><button type="button" class="btn" data-p="30">30 hari</button><button type="button" class="btn" data-p="m">Bulan ini</button>' + (j ? '<button type="button" class="btn" id="lr-csv">Unduh CSV</button><button type="button" class="btn" onclick="window.print()">Cetak</button>' : "") + "</div></div>";
    if (!j) { el.innerHTML = bar; }
    else {
      el.innerHTML = bar + '<div class="kpis"><div class="kpi"><b>' + t.booking + '</b><span>Total booking</span></div><div class="kpi"><b>' + t.dilayani + '</b><span>Dilayani</span></div><div class="kpi"><b>' + (t.kehadiran == null ? "–" : t.kehadiran + "%") + '</b><span>Tingkat kehadiran</span></div><div class="kpi"><b>' + fm(t.rata_tunggu) + '</b><span>Rata tunggu (menit)</span></div><div class="kpi"><b>' + fm(t.rata_layanan) + '</b><span>Rata layanan (menit)</span></div><div class="kpi"><b>' + (t.nilai == null ? "–" : fm(t.nilai) + " / 5") + '</b><span>Nilai kunjungan (' + t.nilai_n + ' penilai)</span></div></div>' +
        '<h3 class="dh">Booking per hari</h3><div class="card">' + (t.booking ? grafik(j.hari) : '<div class="empty">Tidak ada booking pada rentang ini.</div>') + "</div>" +
        (j.loket.length ? '<h3 class="dh">Per loket</h3><div class="card lh-tb"><table><thead><tr><th>Loket</th><th>Booking</th><th>Dilayani</th><th>Tdk hadir</th><th>Batal</th><th>Tunggu</th><th>Layanan</th><th>Nilai</th></tr></thead><tbody>' +
          j.loket.map(function (l) { return "<tr><td>" + e(l.loket) + "</td><td>" + l.booking + "</td><td>" + l.dilayani + "</td><td>" + l.tidak_hadir + "</td><td>" + l.batal + "</td><td>" + fm(l.rata_tunggu) + "</td><td>" + fm(l.rata_layanan) + "</td><td>" + (l.nilai == null ? "–" : fm(l.nilai) + " (" + l.nilai_n + ")") + "</td></tr>"; }).join("") + "</tbody></table></div>" : "");
    }
    function ulang(a, b) { window.aLr(el, a, b); }
    el.querySelector("#lr-h").onclick = function () { window.aLh(el).catch(function (x) { toast(x.message); }); };
    el.querySelector("#lr-a").onchange = el.querySelector("#lr-b").onchange = function () { var a = el.querySelector("#lr-a").value, b = el.querySelector("#lr-b").value; if (a && b) ulang(a, b); };
    [].forEach.call(el.querySelectorAll("[data-p]"), function (b) {
      b.onclick = function () { var p = b.dataset.p; if (p === "m") ulang(wib(0).slice(0, 8) + "01", wib(0)); else ulang(wib(1 - +p), wib(0)); };
    });
    var c = el.querySelector("#lr-csv");
    if (c) c.onclick = function () { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(j)], {type: "text/csv;charset=utf-8"})); a.download = "laporan-antrean-" + j.dari + "_" + j.sampai + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  };
})();
