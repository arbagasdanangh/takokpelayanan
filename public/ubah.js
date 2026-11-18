/* Pemohon: ubah jadwal booking (tanggal/jam baru, loket sama). */
(function () {
  var D = document, ov = null, TOK = 0;
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function wib() { return new Date(Date.now() + 7 * 36e5); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function hariKerja() { var r = [], d = wib(); for (var i = 0; i < 15; i++) { var x = new Date(d.getTime() + i * 864e5); if (x.getUTCDay() % 6) r.push(iso(x)); } return r; }
  function lb(t) { return new Date(t + "T00:00:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"}); }
  function tutup() { if (ov) { ov.remove(); ov = null; } }
  D.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov) tutup(); });
  function buka(o) {
    tutup(); var tgl = "", jam = "", days = hariKerja();
    ov = D.createElement("div"); ov.className = "pn-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Ubah jadwal");
    ov.innerHTML = '<div class="pn-box ub-box"><b>Ubah jadwal</b><p class="sys">Saat ini: <b>' + E(lb(o.tanggal)) + ", " + E(o.jam) + ' WIB</b> (' + E(o.kode) + '). Loket tetap sama; kode antrean akan diganti mengikuti tanggal baru. Maksimal 2 kali ubah.</p>' +
      '<div class="ub-days" role="radiogroup" aria-label="Tanggal baru">' + days.map(function (t) { return '<button type="button" class="chip" role="radio" aria-checked="false" data-t="' + t + '">' + E(lb(t)) + "</button>"; }).join("") + '</div>' +
      '<div class="ub-slots" id="ub-s" aria-live="polite"><small class="sys">Pilih tanggal untuk melihat jam.</small></div><p class="bp-w" id="ub-e" role="alert" hidden></p>' +
      '<div class="btns" style="justify-content:flex-end"><button type="button" class="btn" data-x="1">Tutup</button><button type="button" class="send" id="ub-ok" disabled>Simpan jadwal baru</button></div></div>';
    D.body.appendChild(ov);
    function err(m) { var e = ov.querySelector("#ub-e"); e.hidden = !m; e.textContent = m || ""; }
    function sok() { ov.querySelector("#ub-ok").disabled = !(tgl && jam); }
    ov.onclick = async function (e) {
      if (e.target === ov || e.target.closest("[data-x]")) return tutup();
      var d = e.target.closest("[data-t]"), s = e.target.closest("[data-j]"), ok = e.target.closest("#ub-ok");
      if (d) {
        tgl = d.dataset.t; jam = ""; err(""); sok(); [].forEach.call(ov.querySelectorAll("[data-t]"), function (b) { b.setAttribute("aria-checked", String(b === d)); });
        var my = ++TOK, box = ov.querySelector("#ub-s"); box.innerHTML = '<small class="sys">Memuat jam&hellip;</small>';
        try {
          var j = await api("/api/slot?kunci=" + encodeURIComponent(o.kunci) + "&tanggal=" + encodeURIComponent(tgl)); if (my !== TOK || !ov) return;
          var now = wib(), hm = ("0" + now.getUTCHours()).slice(-2) + ":" + ("0" + now.getUTCMinutes()).slice(-2);
          box.innerHTML = j.slot.map(function (x) {
            var dis = !x.sisa || (tgl === iso(now) && x.jam <= hm) || (tgl === o.tanggal && x.jam === o.jam);
            return '<button type="button" class="chip" data-j="' + E(x.jam) + '" aria-pressed="false"' + (dis ? " disabled" : "") + ">" + E(x.jam) + " <small>" + (x.sisa ? "sisa " + x.sisa : "penuh") + "</small></button>";
          }).join("");
        } catch (x) { box.innerHTML = '<small class="bp-w">' + E(x.message || "Gagal memuat jam.") + "</small>"; }
      } else if (s && !s.disabled) {
        jam = s.dataset.j; err(""); sok(); [].forEach.call(ov.querySelectorAll("[data-j]"), function (b) { b.setAttribute("aria-pressed", String(b === s)); });
      } else if (ok && !ok.disabled) {
        ok.disabled = true;
        try { var h = await api("/api/booking/ubah", {id: o.id, tanggal: tgl, jam: jam}); tutup(); toast("Jadwal diubah. Kode baru: " + h.booking.kode); if (window.TKSLOTS) await window.TKSLOTS(); }
        catch (x) { err(x.message || "Gagal mengubah jadwal."); sok(); }
      }
    };
    var f = ov.querySelector("[data-t]"); if (f) f.focus();
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-ub]"); if (!b) return;
    var o = (window.BKL || []).filter(function (x) { return String(x.id) === b.dataset.ub; })[0]; if (!o) return;
    e.preventDefault(); buka(o);
  });
})();
