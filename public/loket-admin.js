"use strict";
/* Tab admin "Editor loket": ubah nama, uraian, sistem, zona, tambah, sembunyikan, dan kembalikan loket tanpa menyunting kode. */
(function () {
var LK = null, LL = "", LQ = "", ED = null;
async function refreshPublik() {
  try {
    var j = await api("/api/info"); LOCS = j.lokasi.map(function (l) { return {id: l.id, nm: l.nama}; }); LD = {};
    j.loket.forEach(function (r) { (LD[r[0]] = LD[r[0]] || []).push([r[1], r[2], r[3], r[4], r[5] || "", r[6] !== 0, r[7] !== 0]); });
    for (var k in LD) LD[k].sort(function (a, b) { return a[0] - b[0]; });
    if (window.lc) lc();
  } catch (x) {}
}
function form(e) {
  var n = !e;
  return '<div class="card lkf"><h3>' + (n ? "Tambah loket baru" : "Ubah loket: " + esc(e.nama)) + '</h3>' +
    (n ? '<label>Lokasi</label><select class="si" id="lf-l">' + LK.lokasi.map(function (l) { return '<option value="' + esc(l.id) + '"' + (l.id === LL ? " selected" : "") + '>' + esc(l.nama) + '</option>'; }).join("") + '</select>' : "") +
    '<label for="lf-n">Nama loket / instansi</label><input class="si" id="lf-n" maxlength="80" value="' + esc(e ? e.nama : "") + '">' +
    '<label for="lf-u">Uraian layanan <small class="sys" id="lf-c"></small></label><textarea class="si" id="lf-u" rows="5" maxlength="1000">' + esc(e ? e.uraian : "") + '</textarea>' +
    '<label for="lf-s">Sistem / cara layanan</label><input class="si" id="lf-s" maxlength="120" placeholder="mis. SSW / OSS atau Datang langsung" value="' + esc(e ? e.sistem : "") + '">' +
    '<label for="lf-z">Zona <small class="sys">(khusus MPP, mis. Zona 2; kosongkan bila tidak ada)</small></label><input class="si" id="lf-z" maxlength="20" value="' + esc(e ? e.zona || "" : "") + '">' +
    '<label class="ckl"><input type="checkbox" id="lf-d"' + (!e || e.diskusi !== false ? " checked" : "") + '><span>Terima pertanyaan pemohon (Diskusi dengan admin)</span></label>' +
    '<div class="btns"><button type="button" class="send" data-lk="save">Simpan</button><button type="button" class="btn" data-lk="cancel">Batal</button></div></div>';
}
function draw(el) {
  var q = LQ.toLowerCase(), L = LK.loket.filter(function (e) { return e.lokasi === LL && (!q || (e.nama + " " + e.uraian + " " + e.sistem).toLowerCase().indexOf(q) > -1); });
  el.innerHTML = '<h2 class="sec">Editor loket</h2><p class="sys">Perubahan langsung tampil di beranda dan chatbot (tanpa deploy ulang). Loket yang disembunyikan tidak tampil dan tidak menerima booking/pertanyaan, tetapi riwayatnya aman.</p>' +
    '<div class="hint" id="lk-lc">' + LK.lokasi.map(function (l) { return '<button type="button" class="chip" data-lk="loc" data-l="' + esc(l.id) + '" aria-pressed="' + (l.id === LL) + '">' + esc(l.nama) + '</button>'; }).join("") + '</div>' +
    '<div class="hint"><input class="si" id="lk-q" type="search" placeholder="Cari loket..." value="' + esc(LQ) + '" style="flex:1;min-width:160px"><button type="button" class="send" data-lk="new">+ Tambah loket</button></div>' +
    (ED === "new" ? form(null) : "") +
    (L.length ? L.map(function (e) {
      return '<article class="card lkc' + (e.sembunyi ? " off" : "") + '" style="margin:0 0 8px"><b>' + e.no + '. ' + esc(e.nama) + '</b> ' + (e.sembunyi ? '<i class="pb" style="background:#64748b">Disembunyikan</i>' : "") + (e.diubah ? '<i class="pb" style="background:#d97706">Diubah admin</i>' : "") + (!e.asli ? '<i class="pb" style="background:#16a34a">Baru</i>' : "") +
        '<p class="sys" style="margin:4px 0">' + esc(e.uraian.length > 160 ? e.uraian.slice(0, 160) + "..." : e.uraian) + '</p><small class="sys">Sistem: ' + esc(e.sistem || "-") + (e.zona ? " &middot; " + esc(e.zona) : "") + '</small>' +
        '<div class="btns"><button type="button" class="btn" data-lk="edit" data-k="' + e.kunci + '">Ubah</button><button type="button" class="btn" data-lk="hide" data-k="' + e.kunci + '">' + (e.sembunyi ? "Tampilkan" : "Sembunyikan") + '</button>' + (e.asli && e.diubah ? '<button type="button" class="btn" data-lk="reset" data-k="' + e.kunci + '">Kembalikan bawaan</button>' : "") + '</div></article>' + (ED === e.kunci ? form(e) : "");
    }).join("") : '<div class="empty">Tidak ada loket yang cocok.</div>');
  var u = $("lf-u"), c = $("lf-c"); if (u && c) { var f = function () { c.textContent = u.value.length + "/1000"; }; u.oninput = f; f(); }
  var qi = $("lk-q"); if (qi) qi.oninput = function () { LQ = qi.value; var p = qi.selectionStart; draw(el); var n = $("lk-q"); n.focus(); n.setSelectionRange(p, p); };
}
async function load(el) { LK = await api("/api/admin/loket"); if (!LL || !LK.lokasi.some(function (l) { return l.id === LL; })) LL = LK.lokasi[0].id; draw(el); }
async function save(el, e) {
  var body = {kunci: e ? e.kunci : "", lokasi: e ? e.lokasi : $("lf-l").value, nama: $("lf-n").value, uraian: $("lf-u").value, sistem: $("lf-s").value, zona: $("lf-z").value, diskusi: $("lf-d").checked, sembunyi: e ? !!e.sembunyi : false};
  await api("/api/admin/loket/simpan", body); ED = null; await load(el); refreshPublik(); toast("Loket tersimpan dan sudah tampil di beranda.");
}
window.aLk = async function (el) {
  await load(el);
  el.onclick = async function (ev) {
    var b = ev.target.closest("[data-lk]"); if (!b) return; var a = b.dataset.lk, k = b.dataset.k, e = k && LK.loket.filter(function (x) { return x.kunci === k; })[0];
    try {
      if (a === "loc") { LL = b.dataset.l; ED = null; draw(el); }
      else if (a === "new") { ED = "new"; draw(el); $("lf-n").focus(); }
      else if (a === "edit") { ED = k; draw(el); $("lf-n").focus(); }
      else if (a === "cancel") { ED = null; draw(el); }
      else if (a === "save") { b.disabled = true; await save(el, ED === "new" ? null : LK.loket.filter(function (x) { return x.kunci === ED; })[0]); }
      else if (a === "hide") { await api("/api/admin/loket/simpan", {kunci: k, lokasi: e.lokasi, nama: e.nama, uraian: e.uraian, sistem: e.sistem, zona: e.zona || "", diskusi: e.diskusi !== false, sembunyi: !e.sembunyi}); await load(el); refreshPublik(); toast(e.sembunyi ? "Loket ditampilkan." : "Loket disembunyikan."); }
      else if (a === "reset") { if (!confirm("Kembalikan loket ini ke isi bawaan?")) return; await api("/api/admin/loket/reset", {kunci: k}); await load(el); refreshPublik(); toast("Dikembalikan ke bawaan."); }
    } catch (x) { err(x.message); toast(x.message); b.disabled = false; }
  };
};
})();
