"use strict";
/* Versi 92 - Admin: tab "Libur & tutup". Tandai tanggal libur/tutup (semua loket atau satu loket); booking di tanggal itu ditolak server,
   dan pemohon melihat tanggalnya di halaman Booking. Daftar bisa disaring: Mendatang / Sudah lewat / Semua + pilih bulan. */
(function () {
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var MODE = "next", BLN = "";
  function hr(iso) { return new Date(iso + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}); }
  function opsi() {
    var o = '<option value="*">Semua loket (superadmin)</option>';
    (window.LOCS || []).forEach(function (l) { (window.LD && LD[l.id] || []).forEach(function (d) { var k = l.id + "_" + d[0]; o += '<option value="' + E(k) + '">' + E(window.label ? label(k) : k) + '</option>'; }); });
    return o;
  }
  window.aLb = async function (el) {
    var j = await api("/api/admin/libur"), hari = j.hari_ini;
    function daftar() {
      return j.daftar.filter(function (x) {
        if (MODE === "next" && x.tgl < hari) return false;
        if (MODE === "past" && x.tgl >= hari) return false;
        if (BLN && x.tgl.slice(0, 7) !== BLN) return false;
        return true;
      });
    }
    function gambar() {
      var D = daftar(), l = el.querySelector("#lb-l");
      el.querySelector("#lb-n").textContent = D.length + " dari " + j.daftar.length + " tanggal";
      l.innerHTML = D.length ? D.map(function (x) {
        return '<div class="card lb-i"><div><b>' + E(hr(x.tgl)) + '</b><span class="sys">' + (x.kunci === "*" ? "Semua loket" : E(window.label ? label(x.kunci) : x.kunci)) + ' &middot; ' + E(x.ket) + (x.oleh ? ' &middot; oleh ' + E(x.oleh) : '') + '</span>' +
          (x.tgl >= hari && x.terdampak ? '<span class="lb-w">' + x.terdampak + ' booking aktif di tanggal ini perlu dikabari / dijadwal ulang</span>' : '') + '</div>' +
          (x.boleh ? '<button type="button" class="btn" data-lbx="' + E(x.tgl) + '" data-k="' + E(x.kunci) + '">Hapus</button>' : '') + '</div>';
      }).join("") : '<div class="empty">Tidak ada tanggal libur pada pilihan ini.</div>';
      [].forEach.call(el.querySelectorAll("[data-lbm]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.lbm === MODE)); });
    }
    el.innerHTML = '<h2 class="sec">Libur &amp; tutup layanan</h2><p class="sys">Tanggal yang ditandai tidak bisa dipilih untuk booking baru atau ubah jadwal. Booking yang sudah ada tidak dibatalkan otomatis; kabari lewat Siaran di tab Operasional.</p>' +
      '<div class="card"><b>Tambah tanggal</b><div class="lb-f"><label>Tanggal<input class="si" type="date" id="lb-t" min="' + hari + '"></label><label>Loket<select class="si" id="lb-k">' + opsi() + '</select></label>' +
      '<label>Alasan<input class="si" id="lb-a" maxlength="80" placeholder="mis. Cuti bersama, rapat internal"></label></div><div class="btns"><button type="button" class="send" id="lb-s">Simpan</button></div></div>' +
      '<div class="hint" role="group" aria-label="Saring">' + [["next", "Mendatang"], ["past", "Sudah lewat"], ["all", "Semua"]].map(function (x) { return '<button type="button" class="chip" data-lbm="' + x[0] + '" aria-pressed="' + (x[0] === MODE) + '">' + x[1] + '</button>'; }).join("") +
      '<label class="sys">Bulan <input class="si" type="month" id="lb-b" value="' + BLN + '"></label></div><p class="sys" id="lb-n"></p><div id="lb-l"></div>';
    gambar();
    el.onclick = async function (e) {
      var m = e.target.closest("[data-lbm]"); if (m) { MODE = m.dataset.lbm; gambar(); return; }
      var x = e.target.closest("[data-lbx]");
      if (x) { if (!confirm("Hapus tanggal libur ini?")) return; try { await api("/api/admin/libur/hapus", {tgl: x.dataset.lbx, kunci: x.dataset.k}); toast("Dihapus"); window.aLb(el); } catch (er) { toast(er.message); } return; }
      if (e.target.id === "lb-s") {
        var t = el.querySelector("#lb-t").value, k = el.querySelector("#lb-k").value, a = el.querySelector("#lb-a").value.trim();
        if (!t) { toast("Pilih tanggal"); return; }
        try { await api("/api/admin/libur/simpan", {tgl: t, kunci: k, ket: a}); toast("Tersimpan"); window.aLb(el); } catch (er) { toast(er.message); }
      }
    };
    el.querySelector("#lb-b").onchange = function () { BLN = this.value; gambar(); };
  };
})();
