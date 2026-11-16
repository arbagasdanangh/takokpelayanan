"use strict";
/* Versi 68: Cadangan dan pemulihan pengaturan (superadmin).
   Isi cadangan: pengaturan, kata cari chatbot, loket, katalog izin, KBLI, berita, usulan, biro jasa.
   TIDAK termasuk data pribadi warga (akun pemohon, percakapan, permohonan, booking) maupun akun admin. */
(function () {
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function tgl(ms) { try { return new Date(ms).toLocaleString("id-ID", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}); } catch (e) { return ""; } }

window.aCad = async function (el) {
  var j = await api("/api/admin/cadangan");
  var jml = function (x) { return x.n + " entri"; };
  el.innerHTML = '<h2 class="sec">Cadangan dan pemulihan</h2><p class="sys">Simpan salinan pengaturan dan pengetahuan aplikasi ke berkas, lalu pulihkan bila ada yang terhapus atau salah impor. <b>Data pribadi warga dan akun admin tidak ikut</b>, jadi berkas ini aman disimpan, tetapi tetap perlakukan sebagai dokumen internal.</p>' +
    '<div class="card"><b>1. Unduh cadangan</b><div class="cd-l">' + j.daftar.map(function (x) { return '<label><input type="checkbox" class="cd-p" value="' + x.id + '" checked> ' + esc2(x.nama) + ' <small>' + jml(x) + '</small></label>'; }).join("") + '</div><div class="btns"><button type="button" class="send" id="cd-dl">Unduh cadangan (.json)</button></div><p class="sys">Disarankan mengunduh sebelum impor besar atau mengubah banyak data, dan secara berkala (misalnya tiap minggu).</p></div>' +
    '<div class="card"><b>2. Pulihkan dari berkas</b><p class="sys">Bagian yang dipilih akan <b>menggantikan seluruh isi</b> bagian itu saat ini. Unduh cadangan terbaru lebih dulu bila ragu.</p><input type="file" id="cd-f" accept="application/json,.json"><div id="cd-r"></div></div>' +
    '<div class="card"><b>Riwayat</b>' + (j.riwayat.length ? '<table class="tb" style="width:100%;font-size:.84rem"><tr><th>Waktu</th><th>Aksi</th><th>Oleh</th><th>Bagian</th></tr>' + j.riwayat.map(function (x) { return '<tr><td>' + tgl(x.t) + '</td><td>' + (x.a === "pulih" ? "Pemulihan" : "Unduh") + '</td><td>' + esc2(x.u) + '</td><td>' + esc2((x.s || []).join(", ")) + '</td></tr>'; }).join("") + '</table>' : '<div class="empty">Belum ada.</div>') + '</div>';
  el.querySelector("#cd-dl").onclick = function () {
    var p = [].map.call(el.querySelectorAll(".cd-p:checked"), function (x) { return x.value; });
    if (!p.length) { toast("Pilih minimal satu bagian"); return; }
    location.href = "/api/app?p=%2Fadmin%2Fcadangan.json&set=" + p.join(",");
    setTimeout(function () { window.aCad(el); }, 2500);
  };
  var data = null;
  el.querySelector("#cd-f").onchange = async function () {
    var f = this.files[0], box = el.querySelector("#cd-r"); box.innerHTML = ""; data = null; if (!f) return;
    if (f.size > 4000000) { box.innerHTML = '<div class="err">Berkas lebih dari 4 MB.</div>'; return; }
    try { data = JSON.parse(await f.text()); } catch (e) { box.innerHTML = '<div class="err">Berkas bukan JSON yang valid.</div>'; return; }
    try {
      var r = await api("/api/admin/cadangan/pulih", {data: data});
      box.innerHTML = '<p class="sys">Cadangan tertanggal <b>' + tgl(r.waktu) + '</b>. Centang bagian yang dipulihkan:</p><div class="cd-l">' + r.ringkas.map(function (x) { return '<label><input type="checkbox" class="cd-q" value="' + x.id + '"> ' + esc2(x.nama) + ' <small>sekarang ' + x.kini + ' &rarr; menjadi ' + x.baru + '</small></label>'; }).join("") + '</div><label class="cd-k">Ketik <b>PULIHKAN</b> untuk memastikan<input id="cd-kf" autocomplete="off" placeholder="PULIHKAN"></label><div class="btns"><button type="button" class="send" id="cd-go">Pulihkan sekarang</button></div>';
      box.querySelector("#cd-go").onclick = async function () {
        var s = [].map.call(box.querySelectorAll(".cd-q:checked"), function (x) { return x.value; });
        if (!s.length) { toast("Pilih minimal satu bagian"); return; }
        this.disabled = true;
        try { var o = await api("/api/admin/cadangan/pulih", {data: data, set: s, terap: 1, konfirmasi: box.querySelector("#cd-kf").value}); toast("Dipulihkan: " + o.dipulihkan.length + " bagian. Muat ulang halaman untuk melihat perubahan."); window.aCad(el); }
        catch (e) { toast(e.message); this.disabled = false; }
      };
    } catch (e) { box.innerHTML = '<div class="err">' + esc2(e.message) + '</div>'; }
  };
};
})();
