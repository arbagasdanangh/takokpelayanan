"use strict";
(function () {
var $ = function (i) { return document.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var stream = null, hasil = "";
function stop() { try { stream && stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null; }
async function tes() {
  var b = $("go"), o = $("o"), v = $("v"); b.disabled = true; stop(); v.hidden = true; o.innerHTML = '<div class="k">Memeriksa dan meminta izin kamera&hellip;</div>'; var err = null;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw {name: "TidakDidukung"};
    try { stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: "environment"}}, audio: false}); }
    catch (x) { if (x && (x.name === "OverconstrainedError" || x.name === "NotFoundError")) stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false}); else throw x; }
    v.srcObject = stream; v.hidden = false; await v.play();
  } catch (x) { err = x; }
  var d = await DiagKamera.jalankan(err), ok = !err, rows = DiagKamera.baris(d.fakta);
  o.innerHTML = '<div class="k ' + (ok ? "ok" : "bad") + '"><div class="t">' + (ok ? "Kamera berhasil dibuka" : E(d.judul)) + '</div>' + (ok ? '<small>Pratinjau tampil di bawah. Kamera akan mati saat Anda menutup halaman atau menekan tes lagi.</small>' : '<ol>' + d.langkah.map(function (l) { return "<li>" + E(l) + "</li>"; }).join("") + '</ol>') + '</div>' +
    '<div class="k"><div class="t">Rincian pemeriksaan</div><table>' + rows.map(function (r) { return "<tr><td>" + E(r[0]) + "</td><td><b>" + E(r[1]) + "</b></td></tr>"; }).join("") + '</table><small>' + E(d.fakta.ua) + '</small></div>';
  hasil = (ok ? "KAMERA BERHASIL DIBUKA" : "KAMERA GAGAL: " + d.judul) + "\n" + rows.map(function (r) { return r[0] + ": " + r[1]; }).join("\n") + "\n" + d.fakta.ua;
  $("salin").hidden = false; b.disabled = false; b.textContent = "Tes lagi";
}
$("go").addEventListener("click", tes);
$("salin").addEventListener("click", function () { try { navigator.clipboard.writeText(hasil).then(function () { $("salin").textContent = "Tersalin"; }, function () { $("salin").textContent = "Gagal menyalin"; }); } catch (e) { $("salin").textContent = "Gagal menyalin"; } });
window.addEventListener("pagehide", stop);
})();
