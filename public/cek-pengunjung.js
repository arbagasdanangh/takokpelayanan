"use strict";
(function () {
  var o = document.getElementById("o"), baris = [];
  function t(ok, judul, isi) { baris.push('<div class="k ' + (ok ? "ok" : "bad") + '"><div class="t">' + (ok ? "&#10003; " : "&#10007; ") + judul + '</div>' + (isi ? "<small>" + isi + "</small>" : "") + "</div>"); }
  function tampil() { o.innerHTML = baris.join(""); }
  var n = navigator, dnt = n.doNotTrack === "1" || window.doNotTrack === "1" || n.globalPrivacyControl === true;
  t(!dnt, dnt ? "Browser ini mengirim sinyal Do Not Track / Global Privacy Control" : "Tidak ada sinyal Do Not Track", dnt ? "Karena itu kunjungan sengaja TIDAK dicatat. Coba browser lain, atau matikan opsi &quot;Send a Do Not Track request&quot; di pengaturan." : "");
  var ls = true; try { localStorage.setItem("vs_t", "1"); } catch (e) { ls = false; }
  t(ls, ls ? "Penyimpanan browser aktif" : "Penyimpanan browser dimatikan", ls ? "" : "Pengunjung tetap dihitung, tetapi tidak bisa dibedakan baru/kembali.");
  fetch("/visitor.js", {cache: "no-store"}).then(function (r) {
    t(r.ok, r.ok ? "File visitor.js ada di situs" : "File visitor.js TIDAK ditemukan (status " + r.status + ")", r.ok ? "" : "Deploy belum membawa file terbaru. Unggah ulang folder lalu Redeploy.");
    return fetch("/api/app?p=%2Fv%2Fhit", {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json"}, body: JSON.stringify({vid: "cek" + Math.random().toString(16).slice(2) + "0123456789abcdef", nw: 1, rv: 0})});
  }).then(function (r) {
    return r.text().then(function (x) {
      var j = {}; try { j = JSON.parse(x); } catch (e) {}
      if (r.status !== 200) { t(false, "Server menjawab galat " + r.status, "Isi jawaban: " + String(x).replace(/[<>&]/g, "").slice(0, 300) + "<br>Kirim teks ini ke pembuat program."); return; }
      var s = {admin: "Anda sedang masuk sebagai admin di browser ini (admin tidak dihitung). Buka lewat jendela samaran tanpa login.", dnt: "Server menerima sinyal Do Not Track dari browser.", bot: "Browser terdeteksi sebagai bot.", batas: "Terlalu banyak kunjungan dari jaringan ini dalam 1 jam.", mati: "Pencatatan dimatikan: variabel VISITOR_OFF=1 aktif di Vercel. Hapus variabel itu lalu Redeploy."}[j.lewat];
      if (j.lewat) t(false, "Kunjungan dilewati server", s || j.lewat);
      else t(true, "Kunjungan percobaan TERCATAT", "Fitur berfungsi. Tunggu sekitar 1 menit (lencana di-cache), lalu muat ulang situs.");
    });
  }).then(function () { return fetch("/api/app?p=%2Fv%2Fringkas", {cache: "no-store"}).then(function (r) { return r.json(); }); }).then(function (j) {
    t(true, "Angka di server saat ini", "Online: " + j.online + " &middot; hari ini: " + j.unik_hari_ini + " pengunjung &middot; total: " + j.unik_total);
  }).catch(function (e) { t(false, "Gagal menghubungi server", String(e && e.message || e)); }).then(tampil);
})();
