/* Admin: tab Operasional. Pengingat besok, rapikan antrean, siaran ke pemohon, catatan serah terima. */
(function () {
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  window.aOp = async function (el) {
    el.innerHTML = '<h2 class="sec">Operasional</h2><p class="sys">Aksi harian untuk petugas: pengingat, merapikan antrean, siaran, dan catatan serah terima.</p>';
    var j = {};
    var pg = document.createElement("div"); pg.className = "card noprint"; pg.id = "lh-ing"; el.appendChild(pg);
    function ing() {
      api("/api/admin/pengingat").then(function (r) {
        var tgl = new Date(r.tanggal + "T00:00:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"});
        pg.innerHTML = '<b>Pengingat janji temu besok (' + e(tgl) + ')</b><p class="sys" style="margin:4px 0 8px">' + r.total + ' booking terjadwal: <b>' + r.bisa + '</b> siap diingatkan, ' + r.sudah + ' sudah diingatkan, ' + r.tanpa + ' belum mengaktifkan Telegram/WhatsApp. Pesan hanya memuat jam, loket, dan kode.</p><button type="button" class="btn" id="lh-ik"' + (r.bisa ? "" : " disabled") + '>Kirim pengingat (' + r.bisa + ')</button>';
        pg.querySelector("#lh-ik").onclick = function () {
          var b = this; if (!confirm("Kirim pengingat ke " + r.bisa + " pemohon?")) return; b.disabled = true;
          api("/api/admin/pengingat", {}).then(function (h) { toast("Terkirim " + h.ok + ", gagal " + h.gagal + ", dilewati " + h.lewat); ing(); }).catch(function (x) { toast(x.message); ing(); });
        };
      }).catch(function () { pg.remove(); });
    }
    var rp = document.createElement("div"); rp.className = "card noprint"; rp.id = "lh-rp"; el.appendChild(rp);
    function rpk() {
      var tol = (rp.querySelector("#lh-tol") || {}).value || 30;
      api("/api/admin/antrean/rapikan?tol=" + encodeURIComponent(tol)).then(function (r) {
        rp.innerHTML = '<b>Rapikan antrean hari ini</b><p class="sys" style="margin:4px 0 8px">Tandai "Tidak hadir" untuk booking yang belum check-in dan jamnya sudah lewat lebih dari <select id="lh-tol" aria-label="Toleransi menit">' + [15, 30, 45, 60, 90].map(function (m) { return '<option value="' + m + '"' + (m === r.tol ? " selected" : "") + ">" + m + "</option>"; }).join("") + '</select> menit. Ada <b>' + r.jumlah + '</b> booking' + (r.contoh.length ? " (mis. " + r.contoh.map(function (c) { return e(c.kode) + " jam " + e(c.jam); }).join(", ") + ")" : "") + '.</p><button type="button" class="btn" id="lh-rk"' + (r.jumlah ? "" : " disabled") + '>Tandai tidak hadir (' + r.jumlah + ')</button>';
        rp.querySelector("#lh-tol").onchange = rpk;
        rp.querySelector("#lh-rk").onclick = function () {
          if (!confirm("Tandai " + r.jumlah + " booking sebagai Tidak hadir?")) return; this.disabled = true;
          api("/api/admin/antrean/rapikan", {tol: r.tol}).then(function (h) { toast(h.ditandai + " booking ditandai tidak hadir"); rpk(); }).catch(function (x) { toast(x.message); rpk(); });
        };
      }).catch(function () { rp.remove(); });
    }
    rpk();
    var STG = window.TKTGL ? TKTGL.baru() : {}; function TKTGL_ON(s) { return window.TKTGL && TKTGL.aktif(s); }
    var sr = document.createElement("div"); sr.className = "card noprint"; sr.id = "lh-sr"; el.appendChild(sr);
    function srn(hari, teks) {
      api("/api/admin/siaran?hari=" + (hari || "ini")).then(function (r) {
        sr.innerHTML = '<b>Siaran ke pemohon</b><p class="sys" style="margin:4px 0 8px">Kirim info singkat (mis. loket tutup lebih awal) ke pemohon yang punya booking aktif <select id="lh-sh" aria-label="Hari">' + [["ini", "hari ini"], ["besok", "besok"]].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === r.hari ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + '</select>. ' + r.pemohon + ' pemohon: <b>' + r.bisa + '</b> bisa dikirimi (Telegram/WhatsApp aktif), ' + r.tanpa + ' tidak.</p>' +
          '<textarea id="lh-st" class="si" maxlength="200" rows="2" style="width:100%" placeholder="Contoh: Loket tutup pukul 14.00 karena rapat. Mohon datang sebelum jam itu." aria-label="Isi siaran">' + e(teks || "") + '</textarea><div class="sys" id="lh-sc" style="text-align:right">0/200</div>' +
          '<button type="button" class="btn" id="lh-sk"' + (r.bisa ? "" : " disabled") + '>Kirim siaran (' + r.bisa + ')</button>' +
          ((r.log || []).length ? '<details style="margin-top:8px"' + (TKTGL_ON(STG) ? " open" : "") + '><summary class="sys">Riwayat siaran (' + r.log.length + ')</summary>' + (window.TKTGL ? TKTGL.bar(STG, "sl") : "") + '<ul class="bul" id="lh-sl" style="margin:6px 0 0"></ul></details>' : "");
        function logGambar() {
          var ul = sr.querySelector("#lh-sl"); if (!ul) return;
          var L = r.log.filter(function (l) { return !window.TKTGL || TKTGL.ok(STG, l.t); });
          ul.innerHTML = L.length ? L.map(function (l) { return "<li>" + e(new Date(l.t).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"})) + " &middot; " + e(l.u) + " &middot; terkirim " + l.ok + ", gagal " + l.gagal + "<br><small class=\"sys\">" + e(l.pesan) + "</small></li>"; }).join("") : '<li class="sys">Tidak ada siaran pada tanggal ini.</li>';
        }
        if (window.TKTGL) TKTGL.pasang(sr, STG, logGambar);
        logGambar();
        var ta = sr.querySelector("#lh-st"), sc = sr.querySelector("#lh-sc");
        function cnt() { sc.textContent = ta.value.length + "/200"; }
        ta.oninput = cnt; cnt();
        sr.querySelector("#lh-sh").onchange = function () { srn(this.value, ta.value); };
        sr.querySelector("#lh-sk").onclick = function () {
          var b = this, v = ta.value.trim(); if (v.length < 10) { toast("Pesan minimal 10 huruf."); return; }
          if (!confirm("Kirim siaran ini ke " + r.bisa + " pemohon?\n\n" + v)) return; b.disabled = true;
          api("/api/admin/siaran", {hari: sr.querySelector("#lh-sh").value, pesan: v}).then(function (h) { toast("Siaran terkirim " + h.ok + ", gagal " + h.gagal); srn(r.hari, ""); }).catch(function (x) { toast(x.message); b.disabled = false; });
        };
      }).catch(function () { sr.remove(); });
    }
    srn("ini");
    ing();

    var SHG = window.TKTGL ? TKTGL.baru() : {};
    var sh = document.createElement("div"); sh.className = "card"; sh.id = "op-sh"; el.appendChild(sh);
    function shn() {
      api("/api/admin/serah").then(function (r) {
        var CAT = r.catatan.filter(function (o) { return !window.TKTGL || TKTGL.ok(SHG, o.t); });
        sh.innerHTML = '<b>Catatan serah terima</b><p class="sys" style="margin:4px 0 8px">Pesan antar petugas dan antar shift (kendala, antrean tertunda, hal yang perlu dilanjutkan). ' + r.belum + ' belum selesai.</p>' +
          '<textarea id="sh-t" class="si" maxlength="300" rows="2" style="width:100%" placeholder="Contoh: Printer loket 2 macet, berkas B sudah dipindah ke loket 3." aria-label="Isi catatan"></textarea>' +
          '<div class="btns" style="margin:6px 0"><button type="button" class="btn" id="sh-k">Tambah catatan</button></div>' +
          (window.TKTGL ? TKTGL.bar(SHG, "sh") : "") + '<p class="sys" id="sh-n"></p>' +
          (CAT.length ? '<ul class="bul" style="margin:8px 0 0;list-style:none;padding:0">' + CAT.map(function (o) {
            return '<li style="padding:6px 0;border-top:1px solid rgba(128,128,128,.25)' + (o.sel ? ";opacity:.6" : "") + '"><div' + (o.sel ? ' style="text-decoration:line-through"' : "") + ">" + e(o.teks) + '</div><small class="sys">' + e(new Date(o.t).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"})) + " &middot; " + e(o.nm) + (o.label ? " &middot; " + e(o.label) : "") + (o.sel ? " &middot; selesai oleh " + e(o.oleh || "") : "") +
              ' <button type="button" class="chip" data-sa="selesai" data-id="' + e(o.id) + '">' + (o.sel ? "Buka lagi" : "Tandai selesai") + "</button>" + (o.milik ? ' <button type="button" class="chip" data-sa="hapus" data-id="' + e(o.id) + '">Hapus</button>' : "") + "</small></li>";
          }).join("") + "</ul>" : '<div class="empty">' + (r.catatan.length ? "Tidak ada catatan pada tanggal ini." : "Belum ada catatan.") + "</div>");
        sh.querySelector("#sh-n").textContent = "Menampilkan " + CAT.length + " dari " + r.catatan.length + " catatan (" + (window.TKTGL ? TKTGL.ket(SHG) : "semua tanggal") + ").";
        if (window.TKTGL) TKTGL.pasang(sh, SHG, shn);
        sh.querySelector("#sh-k").onclick = function () {
          var v = sh.querySelector("#sh-t").value.trim(); if (v.length < 5) { toast("Catatan minimal 5 huruf."); return; } this.disabled = true;
          api("/api/admin/serah", {aksi: "tambah", teks: v}).then(shn).catch(function (x) { toast(x.message); shn(); });
        };
        [].forEach.call(sh.querySelectorAll("[data-sa]"), function (b) {
          b.onclick = function () {
            if (b.dataset.sa === "hapus" && !confirm("Hapus catatan ini?")) return; b.disabled = true;
            api("/api/admin/serah", {aksi: b.dataset.sa, id: b.dataset.id}).then(shn).catch(function (x) { toast(x.message); shn(); });
          };
        });
      }).catch(function () { sh.remove(); });
    }
    shn();
  };
})();
