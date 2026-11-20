"use strict";
/* Versi 106: Catatan internal pada percakapan loket (admin). Hanya admin yang berhak atas loket itu yang dapat membaca dan menulis;
   tidak pernah dikirim ke pemohon. Berguna untuk serah terima antar-petugas ("sudah telepon pemohon", "menunggu data dari Dinas X"). */
(function () {
var D = document;
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function waktu(t) { return new Date(t).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}) + " WIB"; }
function tampil(box, daftar) {
  box.innerHTML = (daftar.length ? daftar.map(function (n) {
    return '<div class="cin-n"><div class="cin-h"><b>' + E(n.oleh) + '</b> <small class="sys">' + waktu(n.t) + '</small>' + (n.milik ? ' <button type="button" class="chip" data-cin="del" data-id="' + E(n.id) + '" aria-label="Hapus catatan">Hapus</button>' : '') + '</div><div class="cin-t">' + E(n.isi).replace(/\n/g, "<br>") + '</div></div>';
  }).join("") : '<small class="sys">Belum ada catatan. Tulis apa yang sudah dilakukan atau yang perlu diketahui petugas lain.</small>') +
  '<textarea class="si" id="cin-i" rows="2" maxlength="600" placeholder="Tulis catatan untuk sesama admin (pemohon tidak melihat ini)"></textarea><button type="button" class="btn" data-cin="add">Simpan catatan</button>';
}
function badge(n) { var s = D.querySelector("#cin > summary"); if (s) s.firstChild.textContent = "🔒 Catatan internal" + (n ? " (" + n + ") " : " "); }
async function panggil(jalan, extra) {
  var S = window.SEL; if (!S) throw new Error("Percakapan belum dipilih.");
  var j = await window.api("/api/admin/" + jalan, Object.assign({pid: S.pid, kunci: S.kunci}, extra || {}));
  return j.daftar || [];
}
async function muat() {
  var box = D.getElementById("cinb"); if (!box) return;
  try { var d = await panggil("catatan"); tampil(box, d); badge(d.length); } catch (e) { box.innerHTML = '<small class="sys">' + E(e.message || "Gagal memuat catatan.") + '</small>'; }
}
D.addEventListener("toggle", function (e) { if (e.target && e.target.id === "cin" && e.target.open) muat(); }, true);
D.addEventListener("click", async function (e) {
  var b = e.target.closest && e.target.closest("[data-cin]"); if (!b) return;
  var box = D.getElementById("cinb");
  try {
    if (b.dataset.cin === "add") {
      var i = D.getElementById("cin-i"), v = i ? i.value.trim() : ""; if (v.length < 2) { if (window.toast) toast("Tulis catatan dulu."); return; }
      b.disabled = true; var d = await panggil("catatan/tambah", {isi: v}); tampil(box, d); badge(d.length); if (window.toast) toast("Catatan tersimpan (hanya terlihat admin).");
    } else if (b.dataset.cin === "del") {
      if (!confirm("Hapus catatan ini?")) return; var d2 = await panggil("catatan/hapus", {id: b.dataset.id}); tampil(box, d2); badge(d2.length);
    }
  } catch (x) { if (window.toast) toast(x.message || "Gagal."); b.disabled = false; }
});
})();
