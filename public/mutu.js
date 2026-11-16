"use strict";
/* Versi 66: penunjang chatbot dan pertanyaan loket.
   - Tab "Mutu jawaban": antrean menunggu pegawai, batas waktu jawab (SLA), median waktu jawab, nilai pemohon per loket.
   - Tombol "Ajari chatbot" di percakapan admin: jadikan tanya-jawab sebagai usulan aturan Kata cari (superadmin menyetujui di tab "Usulan chatbot").
   - Pemohon melihat perkiraan lama jawaban setelah mengirim pertanyaan. */
(function () {
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function dur(mnt) { if (mnt == null) return "-"; if (mnt < 1) return "< 1 mnt"; if (mnt < 60) return Math.round(mnt) + " mnt"; var h = mnt / 60; return (h < 10 ? h.toFixed(1).replace(".", ",") : Math.round(h)) + " jam"; }
function tgl(ms) { try { return new Date(ms).toLocaleString("id-ID", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}); } catch (e) { return ""; } }

/* ---------- Pemohon: perkiraan lama jawaban ---------- */
window.estTampil = async function (k) {
  try {
    var e = await api("/api/estimasi?kunci=" + encodeURIComponent(k));
    if (e && e.med != null) setTimeout(function () { toast("Biasanya pegawai menjawab dalam sekitar " + dur(Math.max(e.med, 5)) + ". Anda akan melihat jawabannya di sini."); }, 2600);
  } catch (x) {}
};

/* ---------- Admin: mutu jawaban ---------- */
window.aMutu = async function (el) {
  var j = await api("/api/admin/mutu", {}), t = j.tot;
  var kpi = function (v, l, c) { return '<div class="kpi' + (c ? " " + c : "") + '"><b>' + v + '</b><span>' + l + '</span></div>'; };
  el.innerHTML = '<h2 class="sec">Mutu jawaban pertanyaan</h2><p class="sys">Dihitung dari percakapan terbaru (maks. 200). Batas waktu jawab pegawai: <b>' + j.sla + ' jam</b>. Waktu dihitung per jam kalender; jawaban Asisten Piket tidak dihitung sebagai jawaban pegawai.</p>' +
    '<div class="kpis mu-k">' + kpi(t.pend, "Menunggu pegawai") + kpi(t.lewat, "Lewat batas waktu", t.lewat ? "mu-bad" : "") + kpi(dur(t.med), "Median waktu jawab") + kpi(t.dalam == null ? "-" : t.dalam + "%", "Dijawab dalam batas") + '</div>' +
    (j.sup ? '<div class="card"><b>Batas waktu jawab</b> <span class="sys">(superadmin)</span><div style="display:flex;gap:8px;align-items:center;margin-top:6px"><input id="mu-sla" type="number" min="1" max="168" value="' + j.sla + '" style="width:90px"> jam <button type="button" class="btn" id="mu-sv">Simpan</button></div></div>' : "") +
    '<div class="card"><b>Antrean paling lama menunggu</b>' + (j.antri.length ? '<div class="mu-q">' + j.antri.map(function (a) { return '<div class="' + (a.lewat ? "mu-late" : "") + '"><b>' + esc2(a.nama) + '</b><span>' + esc2(a.loket) + (a.tk ? " · " + esc2(a.tk) : "") + '</span><em>' + dur(a.tunggu) + '</em></div>'; }).join("") + '</div>' : '<div class="empty">Tidak ada pertanyaan yang menunggu. Mantap!</div>') + '</div>' +
    '<div class="card"><b>Per loket</b>' + (j.loket.length ? '<div class="mu-t"><table class="tb" style="width:100%;font-size:.84rem"><tr><th>Loket</th><th>Tanya</th><th>Menunggu</th><th>Lewat</th><th>Median</th><th>Tepat waktu</th><th>Nilai</th></tr>' + j.loket.map(function (x) { return '<tr><td>' + esc2(x.loket) + '</td><td>' + x.n + '</td><td>' + x.pend + '</td><td class="' + (x.lewat ? "mu-bad" : "") + '">' + x.lewat + '</td><td>' + dur(x.med) + '</td><td>' + (x.dalam == null ? "-" : x.dalam + "%") + '</td><td>' + (x.nilai == null ? "-" : x.nilai + " (" + x.nn + ")") + '</td></tr>'; }).join("") + '</table></div>' : '<div class="empty">Belum ada data.</div>') + '</div>';
  var sv = el.querySelector("#mu-sv"); if (sv) sv.onclick = async function () { try { await api("/api/admin/mutu/sla", {jam: +el.querySelector("#mu-sla").value}); toast("Tersimpan"); window.aMutu(el); } catch (e) { toast(e.message); } };
};

/* ---------- Admin: ajari chatbot ---------- */
window.ajariBot = async function (sel) {
  if (!sel) return;
  var s; try { s = await api("/api/admin/usulan/saran", {pid: sel.pid, kunci: sel.kunci}); } catch (e) { toast(e.message); return; }
  var ov = document.createElement("div"); ov.className = "mu-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Ajari chatbot");
  ov.innerHTML = '<div class="mu-bx"><b>📚 Ajari chatbot</b><p class="sys">Pertanyaan: <i>' + esc2(s.q) + '</i></p>' +
    '<label>Kata kunci (pisahkan koma)<input id="mu-k" value="' + esc2(s.k.join(", ")) + '"></label>' +
    '<label>Jawaban chatbot<textarea id="mu-j" rows="5" maxlength="1500">' + esc2(s.j) + '</textarea></label>' +
    '<label class="mu-c"><input type="checkbox" id="mu-t" checked> Arahkan pemohon ke ' + esc2(s.loket) + '</label>' +
    '<p class="sys">Hapus data pribadi (nama, nomor, NIK) dari jawaban. Usulan dari akun loket ditinjau superadmin dahulu.</p>' +
    '<div class="btns"><button type="button" class="send" id="mu-ok">Kirim usulan</button><button type="button" class="btn" id="mu-x">Batal</button></div></div>';
  document.body.appendChild(ov);
  function tutup() { ov.remove(); }
  ov.querySelector("#mu-x").onclick = tutup; ov.addEventListener("click", function (e) { if (e.target === ov) tutup(); });
  ov.addEventListener("keydown", function (e) { if (e.key === "Escape") tutup(); });
  ov.querySelector("#mu-k").focus();
  ov.querySelector("#mu-ok").onclick = async function () {
    var k = ov.querySelector("#mu-k").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean), j = ov.querySelector("#mu-j").value.trim();
    if (!k.length || !j) { toast("Kata kunci dan jawaban wajib diisi"); return; }
    this.disabled = true;
    try { var r = await api("/api/admin/usulan", {k: k, j: j, t: ov.querySelector("#mu-t").checked ? [s.t] : [], langsung: 1}); tutup(); toast(r.langsung ? "Chatbot sudah belajar (" + r.n + " aturan)" : "Usulan terkirim ke superadmin"); }
    catch (e) { toast(e.message); this.disabled = false; }
  };
};

/* ---------- Superadmin: usulan chatbot ---------- */
window.aUsul = async function (el) {
  var j = await api("/api/admin/usulan/daftar", {});
  el.innerHTML = '<h2 class="sec">Usulan jawaban chatbot</h2><p class="sys">Usulan dari admin loket yang diambil dari percakapan nyata. Periksa, ubah bila perlu, lalu terima agar chatbot ikut menjawabnya.</p>' +
    (j.daftar.length ? j.daftar.map(function (u) { return '<div class="card mu-u" data-id="' + u.id + '"><small class="sys">' + esc2(u.oleh) + ' · ' + tgl(u.waktu) + (u.tl ? " · " + esc2(u.tl) : "") + '</small><label>Kata kunci<input class="mu-k" value="' + esc2(u.k.join(", ")) + '"></label><label>Jawaban<textarea class="mu-j" rows="4" maxlength="1500">' + esc2(u.j) + '</textarea></label><div class="btns"><button type="button" class="send" data-ua="terima">Terima</button><button type="button" class="btn" data-ua="tolak">Tolak</button></div></div>'; }).join("") : '<div class="empty">Tidak ada usulan baru.</div>');
  [].forEach.call(el.querySelectorAll("[data-ua]"), function (b) {
    b.onclick = async function () {
      var c = b.closest(".mu-u"), body = {id: +c.dataset.id, aksi: b.dataset.ua};
      if (b.dataset.ua === "terima") { body.k = c.querySelector(".mu-k").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean); body.j = c.querySelector(".mu-j").value.trim(); }
      b.disabled = true; try { await api("/api/admin/usulan/aksi", body); toast(b.dataset.ua === "terima" ? "Chatbot sudah belajar" : "Usulan ditolak"); window.aUsul(el); } catch (e) { toast(e.message); b.disabled = false; }
    };
  });
};
})();
