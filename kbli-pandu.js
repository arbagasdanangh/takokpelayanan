"use strict";
/* Pandu KBLI: dari cerita usaha ke kode KBLI yang tepat, lengkap dengan peringatan "bukan ini?" (diambil dari kalimat
   "tidak mencakup ... lihat kode ..." di uraian resmi), daftar KBLI pilihan, daftar dokumen, dan Paket Siap Datang (salin/cetak).
   Murni di browser, memakai data KBLI 2025 bawaan. Indikatif saja: rujukan akhir tetap OSS dan loket. */
(function () {
var K = function () { return window.KBLI; }, SEL = [], OPEN = "", Q = "", O = null;
var e = function (s) { return window.esc ? window.esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function sel() { return K().favs(); }
function kalimat(u, re) { return (String(u || "").match(/[^.]*\.?/g) || []).map(function (x) { return x.trim(); }).filter(function (x) { return x && re.test(x); }); }
function kodeDi(t) { var m = String(t).match(/\b\d{5}\b/g) || []; return m.filter(function (k, i) { return m.indexOf(k) === i; }); }
function awal(u) { var s = kalimat(u, /./)[0] || ""; return s.length > 200 ? s.slice(0, 198) + "…" : s; }
var DOK_UMUM = ["KTP pemilik/penanggung jawab", "NPWP (pribadi atau badan)", "Email dan nomor HP aktif", "Alamat lengkap lokasi usaha", "Perkiraan modal dan jumlah tenaga kerja", "Akun OSS (daftar di oss.go.id)"];
function dokKhas(k) {
  var d = k.slice(0, 2), a = [];
  if (/^(10|11|56)$/.test(d)) a.push("Informasi jaminan produk halal dan higiene sanitasi (tanyakan syarat terbaru ke loket)");
  if (/^(41|42|43|71)$/.test(d)) a.push("Dokumen kompetensi/sertifikasi konstruksi dan data lokasi bangunan");
  if (/^(86|87|75)$/.test(d)) a.push("Dokumen tenaga/izin praktik kesehatan dan sarana");
  if (/^(46|47)$/.test(d)) a.push("Bukti tempat usaha atau, bila daring, alamat toko/akun penjualan");
  if (/^(01|02|03)$/.test(d)) a.push("Data lokasi lahan/usaha dan status penguasaan lahan");
  if (/^(49|50|51|52|53)$/.test(d)) a.push("Data armada/sarana angkutan dan dokumen kendaraan bila ada");
  if (/^(10|11|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33)$/.test(d)) a.push("Data lokasi kegiatan dan kesesuaian ruang; tanyakan kebutuhan izin lingkungan");
  return a;
}
function paket() {
  var A = sel().map(function (k) { return K().byKode(k); }).filter(Boolean), dok = DOK_UMUM.slice();
  A.forEach(function (r) { dokKhas(r[0]).forEach(function (x) { if (dok.indexOf(x) < 0) dok.push(x); }); });
  return {A: A, dok: dok};
}
function teks() {
  var p = paket(); if (!p.A.length) return "";
  return "PAKET SIAP DATANG: Takok Pelayanan Suroboyo\nTanggal: " + new Date().toLocaleDateString("id-ID") + "\n\nKBLI pilihan:\n" + p.A.map(function (r, i) { return (i + 1) + ". " + r[0] + " - " + r[1]; }).join("\n") +
    "\n\nSiapkan:\n" + p.dok.map(function (x) { return "[ ] " + x; }).join("\n") + "\n\nCatatan: kode akhir dan tingkat risiko ditetapkan di OSS (oss.go.id). Tanyakan syarat terbaru ke loket.";
}
function cetak() {
  var p = paket(); if (!p.A.length) return;
  var d = document.createElement("div"); d.id = "kp-print";
  d.innerHTML = '<h1>Paket Siap Datang</h1><p>Takok Pelayanan Suroboyo &middot; ' + e(new Date().toLocaleDateString("id-ID")) + '</p><h2>KBLI pilihan</h2><ol>' + p.A.map(function (r) { return '<li><b>' + e(r[0]) + '</b> ' + e(r[1]) + '</li>'; }).join("") + '</ol><h2>Siapkan</h2><ul style="list-style:none;padding:0">' + p.dok.map(function (x) { return '<li>&#9744; ' + e(x) + '</li>'; }).join("") + '</ul><p><small>Kode akhir dan tingkat risiko ditetapkan di OSS (oss.go.id). Tanyakan syarat terbaru ke loket.</small></p>';
  document.body.appendChild(d); document.body.classList.add("kp-printing");
  var done = function () { document.body.classList.remove("kp-printing"); if (d.parentNode) d.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done); setTimeout(function () { window.print(); }, 50); setTimeout(done, 60000);
}
function kartu(r) {
  var on = sel().indexOf(r[0]) > -1, ex = kalimat(r[2], /tidak mencakup/i), buka = OPEN === r[0], kd = [];
  ex.forEach(function (s) { kodeDi(s).forEach(function (k) { if (k !== r[0] && kd.indexOf(k) < 0) kd.push(k); }); });
  var h = '<div class="kp-c' + (on ? " on" : "") + '"><div class="kp-h"><b class="kp-k">' + e(r[0]) + '</b><span>' + e(r[1]) + '</span></div><p class="kp-u">' + e(awal(r[2])) + '</p>';
  if (kd.length) h += '<div class="kp-x"><small>Bukan ini? Lihat juga:</small>' + kd.slice(0, 4).map(function (k) { var z = K().byKode(k); return '<button type="button" class="kp-chip" data-kp="go" data-k="' + k + '">' + k + (z ? " " + e(z[1].length > 30 ? z[1].slice(0, 28) + "…" : z[1]) : "") + '</button>'; }).join("") + '</div>';
  if (buka) {
    var inc = kalimat(r[2], /(juga )?mencakup/i).filter(function (s) { return !/tidak mencakup/i.test(s); });
    h += '<div class="kp-d"><p>' + e(r[2]) + '</p>' + (ex.length ? '<p class="kp-no"><b>Perhatikan pengecualian:</b> ' + e(ex.join(" ")) + '</p>' : '') + (inc.length > 1 ? '<small class="sys">' + inc.length + ' kalimat cakupan pada uraian resmi.</small>' : '') + '</div>';
  }
  return h + '<div class="btns"><button type="button" class="' + (on ? "btn" : "send") + '" data-kp="pilih" data-k="' + r[0] + '">' + (on ? "✓ Dipilih (hapus)" : "+ Pilih kode ini") + '</button><button type="button" class="btn" data-kp="det" data-k="' + r[0] + '">' + (buka ? "Ringkas" : "Baca uraian lengkap") + '</button></div></div>';
}
function panel() {
  var p = paket(); if (!p.A.length) return '<div class="kp-p"><b>Paket Siap Datang</b><small class="sys">Belum ada KBLI dipilih. Pilih satu atau lebih kode; satu NIB boleh memuat beberapa KBLI.</small></div>';
  return '<div class="kp-p"><b>Paket Siap Datang (' + p.A.length + ' KBLI)</b><ol>' + p.A.map(function (r) { return '<li><b>' + e(r[0]) + '</b> ' + e(r[1]) + ' <button type="button" class="kp-x2" data-kp="pilih" data-k="' + r[0] + '" aria-label="Hapus ' + e(r[0]) + '">&times;</button></li>'; }).join("") + '</ol><b>Siapkan dokumen</b><ul class="kp-dk">' + p.dok.map(function (x) { return '<li><label><input type="checkbox"> ' + e(x) + '</label></li>'; }).join("") + '</ul>' +
    '<div class="btns"><button type="button" class="send" data-kp="cetak">Cetak / simpan PDF</button><button type="button" class="btn" data-kp="salin">Salin ringkasan</button><button type="button" class="btn" data-kp="adm">Tanya admin</button><button type="button" class="btn" data-kp="bot">Tanya Asisten</button></div><small class="sys">Panduan indikatif. Kode akhir dan tingkat risiko ditetapkan di OSS.</small></div>';
}
function hasil() {
  var R = Q.trim().length > 1 ? K().search(Q, 8) : [], t = Q.trim();
  if (!K().has()) return '<small class="sys">Data KBLI sedang dimuat…</small>';
  if (!t) return '<small class="sys">Ceritakan usahamu dengan kata sehari-hari, misalnya: <i>warung kopi</i>, <i>jual baju online</i>, <i>bengkel motor</i>, <i>jasa desain grafis</i>. Atau ketik kode 5 angka.</small>';
  return R.length ? R.map(kartu).join("") : '<small class="sys">Tidak ketemu. Coba kata lain (misalnya jenis barang/jasanya) atau ketik 2-5 angka awal kode.</small>';
}
function paint(only) {
  if (!O) return; var r = O.querySelector("#kpr"), p = O.querySelector("#kpp");
  if (r) r.innerHTML = hasil(); if (p) p.innerHTML = panel();
}
function buka(q0) {
  if (O) return; if (typeof q0 === "string" && q0) Q = q0.replace(/\b(apa|syarat|bikin|buat|nib|mohon|info|tolong|untuk)\b/gi, " ").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim(); var kk = K(); if (kk && !kk.has()) kk.ready().then(function () { paint(); });
  O = document.createElement("div"); O.id = "kp"; O.setAttribute("role", "dialog"); O.setAttribute("aria-modal", "true"); O.setAttribute("aria-label", "Pandu KBLI");
  O.innerHTML = '<div class="kp-w"><div class="kp-top"><div><small>Takok</small><h2>Pandu KBLI</h2></div><button type="button" class="btn" data-kp="tutup" aria-label="Tutup">Tutup</button></div>' +
    '<p class="sys">Cari kode usaha dari 1.559 KBLI 2025. Pilih kode, lihat peringatan "bukan ini?", lalu cetak Paket Siap Datang untuk dibawa ke loket.</p>' +
    '<input class="si" id="kpq" type="search" placeholder="Usaha apa yang ingin dibuka? mis. warung kopi, toko baju online" autocomplete="off" aria-label="Cari KBLI"><div id="kpr" class="kp-r"></div><div id="kpp"></div></div>';
  document.body.appendChild(O); document.body.style.overflow = "hidden";
  var q = O.querySelector("#kpq"); q.value = Q; q.focus(); paint();
  q.addEventListener("input", function () { Q = q.value; OPEN = ""; var r = O.querySelector("#kpr"); r.innerHTML = hasil(); });
  O.addEventListener("click", klik);
  O.addEventListener("keydown", function (ev) { if (ev.key === "Escape") tutup(); });
}
function tutup() { if (!O) return; O.remove(); O = null; document.body.style.overflow = ""; var b = document.getElementById("t10"); if (b) b.focus(); }
function klik(ev) {
  var b = ev.target.closest && ev.target.closest("[data-kp]"); if (!b) return; var a = b.dataset.kp, k = b.dataset.k, r = k && K().byKode(k);
  if (a === "tutup") tutup();
  else if (a === "pilih" && r) { K().toggleFav(k); paint(); }
  else if (a === "det" && r) { OPEN = OPEN === k ? "" : k; paint(); }
  else if (a === "go" && r) { Q = k; OPEN = k; O.querySelector("#kpq").value = k; paint(); }
  else if (a === "salin") K().copy(teks(), "Ringkasan tersalin.");
  else if (a === "cetak") cetak();
  else if (a === "adm") { var p = paket(); tutup(); K().tanyaAdmin(p.A[0], "Saya ingin mengurus NIB/perizinan dengan KBLI: " + p.A.map(function (x) { return x[0] + " (" + x[1] + ")"; }).join("; ") + ". "); }
  else if (a === "bot") { var p2 = paket(); tutup(); if (window.openAsisten) openAsisten(); if (window.askAsisten && p2.A[0]) askAsisten("kbli " + p2.A[0][0]); }
}
document.addEventListener("click", function (ev) { var t = ev.target.closest && ev.target.closest("#t10"); if (t) buka(); });
window.PanduKBLI = {buka: buka};
})();
