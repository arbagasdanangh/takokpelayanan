/* Pemohon: daftar tunggu untuk jam yang penuh. Dikabari lewat Telegram/WhatsApp (bila aktif) saat ada pembatalan. */
(function () {
  var D = document;
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function tl(t) { return new Date(t + "T00:00:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"}); }
  function nama(k) { try { return window.label ? label(k) : k; } catch (e) { return k; } }
  async function muat() {
    var host = D.getElementById("bkx-l"); if (!host || window.S !== "user") return;
    var box = D.getElementById("wl-box");
    if (!box) { box = D.createElement("div"); box.id = "wl-box"; box.className = "card wl-box"; host.parentNode.insertBefore(box, host); }
    try {
      var j = await api("/api/booking/tunggu");
      if (!j.daftar.length) { box.hidden = true; box.innerHTML = ""; return; }
      box.hidden = false;
      box.innerHTML = "<b>Daftar tunggu Anda</b><ul class=\"bul\" style=\"margin:6px 0 0\">" + j.daftar.map(function (x) {
        return "<li>" + E(tl(x.tanggal)) + ", " + E(x.jam) + " WIB &middot; " + E(nama(x.kunci)) + (x.urutan ? " &middot; antrean ke-" + x.urutan : "") + ' <button type="button" class="chip" data-wlx="' + E(x.kunci + "|" + x.tanggal + "|" + x.jam) + '">Keluar</button></li>';
      }).join("") + "</ul><small class=\"sys\">Jika ada yang membatalkan jam ini, Anda dikabari lewat Telegram/WhatsApp (bila sudah diaktifkan). Siapa cepat dia dapat.</small>";
    } catch (x) { box.hidden = true; }
  }
  D.addEventListener("click", async function (e) {
    var a = e.target.closest && e.target.closest("[data-wl]"), x = e.target.closest && e.target.closest("[data-wlx]"), p;
    if (a) {
      p = a.dataset.wl.split("|"); e.preventDefault(); a.disabled = true;
      try { var r = await api("/api/booking/tunggu", {kunci: p[0], tanggal: p[1], jam: p[2]}); toast("Anda masuk daftar tunggu jam " + p[2] + " (antrean ke-" + r.urutan + ")."); a.textContent = "Dalam daftar tunggu"; }
      catch (er) { toast(er.message || "Gagal masuk daftar tunggu."); a.disabled = false; }
      muat();
    } else if (x) {
      p = x.dataset.wlx.split("|"); x.disabled = true;
      try { await api("/api/booking/tunggu", {kunci: p[0], tanggal: p[1], jam: p[2], batal: true}); toast("Keluar dari daftar tunggu."); } catch (er) { toast(er.message || "Gagal."); }
      muat();
    }
  });
  var n = 0, iv = setInterval(function () { if (D.getElementById("bkx-l") && !D.getElementById("wl-box")) muat(); if (++n > 600) clearInterval(iv); }, 1500);
  window.TKWL = muat;
})();
