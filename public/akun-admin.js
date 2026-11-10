"use strict";
/* Akun admin (versi 34).
   Superuser (kata sandi utama) membuat akun per loket atau akun superuser tambahan. Admin loket hanya melihat dan mengelola
   percakapan, booking, permohonan, analitik, dan survei untuk loket yang dipilih. Pembatasan sebenarnya dilakukan di server
   (api/app.py: ADM_SUPER, boleh, izin); file ini hanya menyesuaikan tampilan dan menyediakan tab "Akun admin". */
(function () {
var AKD = {};

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString("id-ID", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) : "belum pernah";
}

/* Spanduk "masuk sebagai" dan penyembunyian bagian yang hanya untuk superuser. Dipanggil setelah panel admin dibuat. */
window.akunUI = function () {
  var old = $("a-who");
  if (old) old.remove();
  var at = $("atabs");
  if (!at || !ME) return;
  var sup = admSup(), lk = ME.loket || [];
  var txt = sup ? "Superuser: semua fitur dan semua loket."
    : "Admin loket untuk " + (lk.length <= 3 ? lk.map(function (k) { return esc(label(k)); }).join("; ") : lk.length + " loket") + ".";
  at.insertAdjacentHTML("beforebegin", '<div class="hint" id="a-who"><b>' + esc(ME.nama || "") + (ME.u ? " (@" + esc(ME.u) + ")" : "") + '</b> <span class="sys">' + txt + "</span></div>");
  if (!sup) {
    var dl = document.querySelector('a[href*="data.xlsx"]');
    if (dl) dl.style.display = "none";
    var cw = $("cw");
    if (cw) { /* pengaturan global disembunyikan; yang tersisa hanya ganti kata sandi */
      [].slice.call(cw.parentNode.children, 0, 7).forEach(function (c) { c.style.display = "none"; });
      var dt = cw.closest("details");
      if (dt) dt.querySelector("summary").textContent = "Ganti kata sandi saya";
    }
  }
};

window.aAk = async function (el) {
  var j = await api("/api/admin/akun"), lk = await api("/api/admin/loket");
  var G = {}, NL = {}, LN = {}, urut = [];
  lk.lokasi.forEach(function (l) { NL[l.id] = l.nama; urut.push(l.id); });
  lk.loket.forEach(function (e) {
    (G[e.lokasi] = G[e.lokasi] || []).push(e);
    LN[e.kunci] = (NL[e.lokasi] || e.lokasi) + " - " + e.nama;
  });
  AKD = {};
  j.daftar.forEach(function (a) { AKD[a.u] = a; });

  var picker = urut.filter(function (id) { return G[id]; }).map(function (id) {
    return '<details class="akl"><summary>' + esc(NL[id] || id) + ' <small class="sys">(' + G[id].length + ' loket)</small></summary>' +
      '<div class="btns"><button type="button" class="btn" data-ak-pil="1">Pilih semua</button><button type="button" class="btn" data-ak-pil="0">Kosongkan</button></div>' +
      G[id].map(function (e) { return '<label class="akc"><input type="checkbox" data-lk="' + esc(e.kunci) + '"> ' + esc(e.no + ". " + e.nama) + "</label>"; }).join("") + "</details>";
  }).join("");

  var list = j.daftar.map(function (a) {
    var own = a.u === j.saya;
    var cakup = a.peran === "super" ? "Semua fitur dan semua loket"
      : a.loket.length + " loket: " + esc(a.loket.slice(0, 6).map(function (k) { return LN[k] || k; }).join("; ")) + (a.loket.length > 6 ? " ..." : "");
    return '<article class="card" style="margin:0 0 8px"><b>' + esc(a.nama) + '</b> <span class="sys">@' + esc(a.u) + (own ? " (akun Anda)" : "") + "</span>" +
      '<div class="sys"><b>' + (a.peran === "super" ? "Superuser" : "Admin loket") + "</b>" + (a.aktif ? "" : " &middot; <b>Nonaktif</b>") + "</div>" +
      '<div class="sys">' + cakup + "</div><div class=\"sys\">Terakhir masuk: " + fmt(a.masuk) + "</div>" +
      '<div class="btns"><button type="button" class="btn" data-ak-ubah="' + esc(a.u) + '">Ubah</button>' +
      (own ? "" : '<button type="button" class="btn" data-ak-tgl="' + esc(a.u) + '">' + (a.aktif ? "Nonaktifkan" : "Aktifkan") + "</button>" +
        '<button type="button" class="btn" data-ak-hps="' + esc(a.u) + '">Hapus</button>') + "</div></article>";
  }).join("");

  el.innerHTML = '<h2 class="sec">Akun admin</h2><div class="card"><p class="sys" style="margin:0">' +
    "Superuser dapat membuka semua fitur. Admin loket hanya melihat dan mengelola percakapan, booking, permohonan, analitik chat, dan rekap survei untuk loket yang dipilih; " +
    "pengaturan, editor loket, berita, kata cari chatbot, kanal, Asisten Piket, data KBLI, dan unduhan database tidak tersedia baginya. " +
    "Perubahan akun berlaku pada permintaan berikutnya; akun yang dihapus atau dinonaktifkan langsung keluar.</p></div>" +
    '<h2 class="sec" id="akjd">Tambah akun</h2><div class="card">' +
    '<input class="si" id="aku" placeholder="Nama pengguna (huruf kecil/angka, 3-24 karakter)" maxlength="24" autocapitalize="none" autocomplete="off" spellcheck="false" aria-label="Nama pengguna">' +
    '<input class="si" id="akn" placeholder="Nama petugas atau unit" maxlength="60" aria-label="Nama petugas">' +
    '<select class="si" id="akr" aria-label="Peran"><option value="loket">Admin loket (terbatas pada loket terpilih)</option><option value="super">Superuser (semua fitur)</option></select>' +
    '<input class="si" id="akp" type="password" placeholder="Kata sandi (min. 8 karakter)" autocomplete="new-password" aria-label="Kata sandi">' +
    '<div id="akl">' + picker + "</div>" +
    '<label class="akc"><input type="checkbox" id="aka" checked> Akun aktif</label>' +
    '<div class="btns"><button type="button" class="send" id="aks">Simpan akun</button><button type="button" class="btn" id="akx">Kosongkan form</button></div></div>' +
    '<h2 class="sec">Daftar akun (' + j.daftar.length + ")</h2>" +
    '<article class="card" style="margin:0 0 8px"><b>Superuser utama</b><div class="sys">Dimasuki dengan nama pengguna dikosongkan dan kata sandi utama. Tidak bisa dihapus; kata sandinya diganti lewat Pengaturan di Kotak masuk.</div></article>' +
    (list || '<div class="empty">Belum ada akun tambahan.</div>');

  var rol = $("akr");
  rol.onchange = function () { $("akl").style.display = rol.value === "super" ? "none" : ""; };
};

function isi(a) {
  $("akjd").textContent = "Ubah akun";
  $("aku").value = a.u; $("aku").readOnly = true;
  $("akn").value = a.nama || "";
  $("akr").value = a.peran; $("akr").onchange();
  $("akp").value = ""; $("akp").placeholder = "Kosongkan bila kata sandi tidak diganti";
  $("aka").checked = !!a.aktif;
  [].forEach.call(document.querySelectorAll("#akl [data-lk]"), function (c) { c.checked = a.loket.indexOf(c.dataset.lk) > -1; });
  [].forEach.call(document.querySelectorAll("#akl details"), function (d) { d.open = !!d.querySelector("[data-lk]:checked"); });
  $("aku").scrollIntoView({behavior: "smooth", block: "center"});
}

$("v-adm").addEventListener("click", async function (e) {
  if (S !== "adm" || AT !== "ak") return;
  var t = e.target.closest("button");
  if (!t) return;
  var d = t.dataset;
  try {
    if (d.akPil !== undefined) {
      [].forEach.call(t.closest("details").querySelectorAll("[data-lk]"), function (c) { c.checked = d.akPil === "1"; });
      return;
    }
    if (d.akUbah) { if (AKD[d.akUbah]) isi(AKD[d.akUbah]); return; }
    if (t.id === "akx") { await window.aX("ak"); return; }
    if (t.id === "aks") {
      var peran = $("akr").value;
      var body = {u: $("aku").value.trim().toLowerCase(), nama: $("akn").value, peran: peran, password: $("akp").value, aktif: $("aka").checked,
                  loket: [].map.call(document.querySelectorAll("#akl [data-lk]:checked"), function (c) { return c.dataset.lk; })};
      if (!body.u) { err("Isi nama pengguna."); return; }
      if (peran === "loket" && !body.loket.length) { err("Pilih minimal satu loket untuk admin loket."); return; }
      var r = await api("/api/admin/akun/simpan", body);
      toast(r.baru ? "Akun dibuat." : "Akun diperbarui.");
      await window.aX("ak");
      return;
    }
    if (d.akTgl) {
      var a = AKD[d.akTgl];
      await api("/api/admin/akun/simpan", {u: a.u, nama: a.nama, peran: a.peran, loket: a.loket, aktif: !a.aktif});
      toast(a.aktif ? "Akun dinonaktifkan." : "Akun diaktifkan.");
      await window.aX("ak");
      return;
    }
    if (d.akHps) {
      if (d.sure !== "1") { d.sure = "1"; t.textContent = "Yakin hapus?"; return; }
      await api("/api/admin/akun/hapus", {u: d.akHps});
      toast("Akun dihapus.");
      await window.aX("ak");
    }
  } catch (x) { err(x.message); }
});
})();
