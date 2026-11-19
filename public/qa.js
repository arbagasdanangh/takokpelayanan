"use strict";
/* Versi 93 - Tanya Jawab Publik. Pemohon: ajukan pertanyaan (anonim), cari jawaban yang sudah terbit, tandai "Membantu", lihat status pertanyaan sendiri.
   Admin: tab "Tanya jawab publik" untuk menjawab/mengedit/menerbitkan/menolak/menghapus, dengan saringan status dan tanggal. */
(function () {
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var tg = function (t) { return t ? new Date(t).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : ""; };
  var PT = window.TKTGL ? TKTGL.baru() : {}, AT = window.TKTGL ? TKTGL.baru() : {}, ST = "baru", Q = "";
  var NM = {baru: "Menunggu dijawab", jawab: "Sudah dijawab", tolak: "Tidak diterbitkan"};

  /* ---------- Pemohon ---------- */
  window.pQa = async function (el) {
    var j = await api("/api/qa");
    function gambar() {
      var kata = Q.toLowerCase().split(/\s+/).filter(Boolean);
      var D = j.publik.filter(function (x) {
        if (window.TKTGL && !TKTGL.ok(PT, x.ta)) return false;
        var h = (x.q + " " + x.a).toLowerCase(); return kata.every(function (k) { return h.indexOf(k) >= 0; });
      });
      el.querySelector("#qa-n").textContent = D.length + " dari " + j.publik.length + " jawaban" + (window.TKTGL && TKTGL.aktif(PT) ? " (" + TKTGL.ket(PT) + ")" : "");
      el.querySelector("#qa-l").innerHTML = D.length ? D.map(function (x) {
        return '<details class="card qa-i"><summary><b>' + E(x.q) + '</b><small>' + E(tg(x.ta)) + (x.v ? ' &middot; ' + x.v + ' merasa terbantu' : '') + '</small></summary><div class="qa-a">' + (window.fmtJawab ? fmtJawab(x.a) : E(x.a)) +
          '<button type="button" class="chip" data-qv="' + E(x.id) + '" aria-pressed="' + x.sv + '">👍 ' + (x.sv ? "Terbantu" : "Membantu") + '</button></div></details>';
      }).join("") : '<div class="empty">Belum ada jawaban yang cocok. Ajukan pertanyaan Anda di bawah.</div>';
    }
    el.innerHTML = '<button type="button" class="btn" data-pn="">&larr; Kembali ke beranda</button><h2 class="sec">Tanya Jawab Publik</h2><p class="sys">Pertanyaan dan jawaban dari petugas PTSP yang boleh dibaca semua warga. Identitas penanya tidak ditampilkan.</p>' +
      '<input class="si" id="qa-s" type="search" placeholder="Cari jawaban..." aria-label="Cari jawaban" value="' + E(Q) + '">' + (window.TKTGL ? TKTGL.bar(PT, "qap") : "") +
      '<p class="sys" id="qa-n"></p><div id="qa-l"></div>' +
      '<div class="card"><b>Ajukan pertanyaan</b><p class="sys">Jangan tulis NIK, nomor telepon, atau data pribadi. Maksimal 5 pertanyaan per hari.</p><textarea class="si" id="qa-q" rows="3" maxlength="300" placeholder="Tulis pertanyaan Anda (min. 10 huruf)"></textarea><div class="btns"><button type="button" class="send" id="qa-k">Kirim pertanyaan</button></div></div>' +
      '<h3 class="sec">Pertanyaan saya</h3>' + (j.saya.length ? j.saya.map(function (x) { return '<div class="card qa-s"><b>' + E(x.q) + '</b><small>' + E(tg(x.t)) + ' &middot; ' + E(NM[x.st] || x.st) + '</small></div>'; }).join("") : '<div class="empty">Belum ada pertanyaan dari Anda.</div>');
    gambar();
    if (window.TKTGL) TKTGL.pasang(el, PT, gambar);
    el.querySelector("#qa-s").oninput = function () { Q = this.value; gambar(); };
    el.onclick = async function (e) {
      var v = e.target.closest("[data-qv]");
      if (v) { try { var r = await api("/api/qa/vote", {id: v.dataset.qv}); var x = j.publik.filter(function (z) { return z.id === v.dataset.qv; })[0]; if (x) { x.v = r.v; x.sv = r.sv; } var op = v.closest("details").open; gambar(); } catch (er) { toast(er.message); } return; }
      if (e.target.id === "qa-k") {
        var q = el.querySelector("#qa-q").value.trim();
        if (q.length < 10) { toast("Tulis pertanyaan minimal 10 huruf."); return; }
        try { await api("/api/qa/tanya", {q: q}); toast("Terkirim. Petugas akan menjawab dan menerbitkannya di sini."); window.pQa(el); } catch (er) { toast(er.message); }
      }
    };
  };

  /* ---------- Admin ---------- */
  window.aQa = async function (el) {
    var j = await api("/api/admin/qa");
    function gambar() {
      var D = j.daftar.filter(function (x) { return (ST === "all" || x.st === ST) && (!window.TKTGL || TKTGL.ok(AT, x.t)); });
      var c = {baru: 0, jawab: 0, tolak: 0}; j.daftar.forEach(function (x) { c[x.st] = (c[x.st] || 0) + 1; });
      [].forEach.call(el.querySelectorAll("[data-qst]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.qst === ST)); });
      el.querySelector("#aq-n").textContent = D.length + " dari " + j.daftar.length + " pertanyaan (baru " + c.baru + ", terbit " + c.jawab + ", ditolak " + c.tolak + ")" + (window.TKTGL && TKTGL.aktif(AT) ? " · " + TKTGL.ket(AT) : "");
      el.querySelector("#aq-l").innerHTML = D.length ? D.map(function (x) {
        return '<div class="card qa-ad" data-id="' + E(x.id) + '"><small class="sys">' + E(x.id) + ' &middot; ' + E(tg(x.t)) + ' &middot; ' + E(NM[x.st] || x.st) + (x.v ? ' &middot; ' + x.v + ' membantu' : '') + (x.oleh ? ' &middot; dijawab ' + E(x.oleh) : '') + '</small>' +
          '<label>Pertanyaan (boleh diedit agar tidak memuat data pribadi)<textarea class="si" data-f="q" rows="2" maxlength="300">' + E(x.q) + '</textarea></label>' +
          '<label>Jawaban<textarea class="si" data-f="a" rows="4" maxlength="1500">' + E(x.a) + '</textarea></label>' +
          '<div class="btns"><button type="button" class="send" data-qa="jawab">' + (x.st === "jawab" ? "Simpan perubahan" : "Terbitkan") + '</button>' + (x.st === "baru" ? '<button type="button" class="btn" data-qa="tolak">Tolak</button>' : '') + '<button type="button" class="btn" data-qa="hapus">Hapus</button></div></div>';
      }).join("") : '<div class="empty">Tidak ada pertanyaan pada pilihan ini.</div>';
    }
    el.innerHTML = '<h2 class="sec">Tanya jawab publik</h2><p class="sys">Pertanyaan dari pemohon. Jawaban yang diterbitkan tampil di menu Tanya Jawab untuk semua warga, tanpa nama penanya.</p>' +
      '<div class="hint" role="group" aria-label="Status">' + [["baru", "Baru"], ["jawab", "Terbit"], ["tolak", "Ditolak"], ["all", "Semua"]].map(function (x) { return '<button type="button" class="chip" data-qst="' + x[0] + '" aria-pressed="' + (x[0] === ST) + '">' + x[1] + '</button>'; }).join("") + '</div>' +
      (window.TKTGL ? TKTGL.bar(AT, "aqa") : "") + '<p class="sys" id="aq-n"></p><div id="aq-l"></div>';
    gambar();
    if (window.TKTGL) TKTGL.pasang(el, AT, gambar);
    el.onclick = async function (e) {
      var s = e.target.closest("[data-qst]"); if (s) { ST = s.dataset.qst; gambar(); return; }
      var b = e.target.closest("[data-qa]"); if (!b) return;
      var c = b.closest(".qa-ad"), id = c.dataset.id, act = b.dataset.qa;
      try {
        if (act === "jawab") await api("/api/admin/qa/jawab", {id: id, q: c.querySelector('[data-f=q]').value, a: c.querySelector('[data-f=a]').value});
        else if (act === "tolak") await api("/api/admin/qa/tolak", {id: id});
        else { if (!confirm("Hapus pertanyaan ini?")) return; await api("/api/admin/qa/hapus", {id: id}); }
        toast("Tersimpan"); window.aQa(el);
      } catch (er) { toast(er.message); }
    };
  };
  var tb = document.getElementById("t14"); if (tb) tb.onclick = function () { if (window.needLogin && needLogin()) return; if (window.setPN) setPN("qa"); };
})();
