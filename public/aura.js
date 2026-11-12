"use strict";
/* Versi 52: Aura. Semua berjalan di peramban, tanpa perubahan server.
   1. Panel Kenyamanan (semua pengguna): ukuran huruf, kontras tinggi, gerak dikurangi, teks lega. Tersimpan di perangkat.
   2. Asisten: /tiket (kartu tiket dengan tahapan) dan /mulai (pemandu pilih layanan lewat kategori).
   3. Admin: tombol "Fokus" (bar atas) menampilkan 6 percakapan paling mendesak, sekali klik membuka percakapannya. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };

/* ---------- 1. Panel Kenyamanan ---------- */
var KEY = "tk_aura", ST = {f: 0, k: 0, g: 0, l: 0};
try { var s0 = JSON.parse(localStorage.getItem(KEY) || "{}"); ["f", "k", "g", "l"].forEach(function (k) { if (s0 && +s0[k]) ST[k] = Math.min(2, +s0[k]); }); } catch (e) {}
function simpan() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
function terap() {
  var h = D.documentElement.classList;
  h.toggle("au-f1", ST.f === 1); h.toggle("au-f2", ST.f === 2); h.toggle("au-k", !!ST.k); h.toggle("au-g", !!ST.g); h.toggle("au-l", !!ST.l);
}
terap();
var pan = null;
function tutupPan() { if (pan) { pan.remove(); pan = null; D.removeEventListener("keydown", escPan, true); } }
function escPan(e) { if (e.key === "Escape") { tutupPan(); var b = $("au-b"); if (b) b.focus(); } }
function gambarPan() {
  var seg = [["Normal", 0], ["Besar", 1], ["Sangat besar", 2]];
  pan.innerHTML = '<div class="au-h"><b>Kenyamanan membaca</b><button type="button" class="au-x" data-au="x" aria-label="Tutup">&times;</button></div>' +
    '<p class="au-t">Ukuran huruf</p><div class="au-seg" role="group" aria-label="Ukuran huruf">' + seg.map(function (s) { return '<button type="button" data-au="f" data-v="' + s[1] + '" aria-pressed="' + (ST.f === s[1]) + '">' + s[0] + '</button>'; }).join("") + '</div>' +
    [["k", "Kontras tinggi", "Warna lebih tegas dan garis lebih jelas"], ["g", "Kurangi gerakan", "Matikan animasi dan efek bergerak"], ["l", "Teks lega", "Jarak antarbaris dan antarhuruf lebih longgar"]].map(function (x) {
      return '<label class="au-sw"><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span><input type="checkbox" data-au="' + x[0] + '"' + (ST[x[0]] ? " checked" : "") + '><i aria-hidden="true"></i></label>';
    }).join("") + '<button type="button" class="au-rs" data-au="r">Kembalikan ke bawaan</button>';
}
function bukaPan(btn) {
  if (pan) { tutupPan(); return; }
  pan = D.createElement("div"); pan.className = "au-pan"; pan.setAttribute("role", "dialog"); pan.setAttribute("aria-label", "Kenyamanan membaca");
  gambarPan(); D.body.appendChild(pan);
  pan.onclick = function (e) {
    var b = e.target.closest("[data-au]"); if (!b) return; var a = b.dataset.au;
    if (a === "x") { tutupPan(); return; }
    if (a === "f") ST.f = +b.dataset.v; else if (a === "r") ST = {f: 0, k: 0, g: 0, l: 0};
    else if (b.type === "checkbox") ST[a] = b.checked ? 1 : 0;
    simpan(); terap(); gambarPan();
  };
  D.addEventListener("keydown", escPan, true);
  setTimeout(function () { D.addEventListener("click", function once(e) { if (pan && !pan.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { tutupPan(); } if (!pan) D.removeEventListener("click", once); }); }, 0);
}
function pasangBtn() {
  if ($("au-b")) return;
  var t = D.querySelector(".top .tools"), th = $("th"); if (!t) return;
  var b = D.createElement("button"); b.type = "button"; b.className = "btn"; b.id = "au-b"; b.setAttribute("aria-label", "Pengaturan kenyamanan membaca"); b.textContent = "Aa";
  b.onclick = function (e) { e.stopPropagation(); bukaPan(b); };
  t.insertBefore(b, th || null);
}

/* ---------- 2. Asisten: /tiket dan /mulai ---------- */
var B = window.BOTI;
var LANG = ["Terjadwal", "Sudah tiba", "Dipanggil", "Selesai"], LANGL = ["Booking", "Tiba", "Dipanggil", "Selesai"];
function stepper(st) {
  var i = Math.max(0, LANG.indexOf(st));
  return '<ol class="au-st" aria-label="Tahapan tiket">' + LANGL.map(function (l, n) { return '<li class="' + (n < i ? "ok" : n === i ? "now" : "") + '"><i>' + (n < i ? "&#10003;" : n + 1) + '</i><span>' + l + '</span></li>'; }).join("") + '</ol>';
}
async function cmdTiket() {
  if (window.S !== "user") return B.needIn("Masuk dulu supaya saya bisa menampilkan tiket Anda.");
  var j; try { j = await api("/api/booking"); } catch (e) { return B.bot("Tiket belum bisa dimuat. Coba lagi sebentar."); }
  var hari = iso(wibDate(0)), a = (j.daftar || []).filter(function (o) { return o.tanggal >= hari && LANG.indexOf(o.status) > -1 && o.status !== "Selesai"; }).sort(function (x, y) { return (x.tanggal + x.jam) < (y.tanggal + y.jam) ? -1 : 1; });
  if (!a.length) return B.bot("Belum ada tiket aktif.", '<div class="bch">' + B.btn("Buat booking", "q:booking kunjungan") + '</div>');
  return B.bot("Tiket aktif Anda (" + a.length + "):", a.slice(0, 3).map(function (o) {
    var hi = o.tanggal === hari, tip = o.status === "Dipanggil" ? "Nomor Anda sedang dipanggil. Silakan menuju loket." : o.status === "Sudah tiba" ? "Anda sudah tercatat tiba. Tunggu nomor dipanggil." : hi ? "Kunjungan hari ini. Tekan Saya sudah tiba saat sampai." : "Kunjungan " + o.tanggal + ".";
    return '<div class="bc2 au-tk"><div class="au-tkh"><b>' + E(o.kode) + '</b><span>' + E(o.jam) + ' WIB</span></div><small>' + E(typeof label === "function" ? label(o.kunci) : (o.loket || "")) + '</small>' + stepper(o.status) + '<p class="au-tp">' + E(tip) + '</p>' +
      '<div class="ba">' + B.btn("Hitung jam berangkat", "q:/berangkat") + (window.SY && o.kunci && SY.ada(o.kunci) ? '<button type="button" data-v="sy:' + E(o.kunci) + '">Persyaratan</button>' : "") + '</div></div>';
  }).join(""));
}
var KAT = {
  usaha: ["Usaha dan izin", [["Bikin NIB", "mau bikin NIB"], ["Cari kode KBLI", "/kbli"], ["Izin usaha makanan", "izin usaha makanan"], ["Perpanjang izin parkir", "/izin perpanjang parkir"]]],
  duk: ["Kependudukan", [["KTP-el", "KTP elektronik"], ["Kartu Keluarga", "kartu keluarga"], ["Akta kelahiran", "akta kelahiran"], ["Pindah domisili", "pindah domisili"]]],
  bgn: ["Bangunan dan tanah", [["PBG rumah", "/izin pbg rumah"], ["Sertifikat laik fungsi", "sertifikat laik fungsi"], ["Izin reklame", "izin reklame"]]],
  sehat: ["Kesehatan", [["BPJS Kesehatan", "BPJS kesehatan"], ["SIP dokter", "SIP dokter"], ["Izin klinik", "izin klinik"]]],
  lantas: ["Kendaraan dan lalu lintas", [["SIM", "SIM"], ["Pajak kendaraan", "pajak kendaraan"], ["Dishub", "dishub"]]],
  hukum: ["Polisi dan hukum", [["SKCK", "SKCK"], ["Pengadilan", "pengadilan"], ["Pengaduan", "/pengaduan"]]]
};
function cmdMulai(arg) {
  var k = KAT[(arg || "").toLowerCase()];
  if (!k) return B.bot("Mau urus apa? Pilih bidangnya dulu, nanti saya tunjukkan pilihan layanannya.", '<div class="bch">' + Object.keys(KAT).map(function (x) { return B.btn(KAT[x][0], "q:/mulai " + x); }).join("") + '</div>');
  return B.bot(k[0] + ". Pilih yang paling dekat dengan kebutuhan Anda:", '<div class="bch">' + k[1].map(function (x) { return B.btn(x[0], "q:" + x[1]); }).join("") + B.btn("Bidang lain", "q:/mulai") + '</div>');
}
function bukaArena() {
  return B.bot("Membuka Arena Zona. Rebut tiga menara, kalahkan Si Ruwet!").then(function () {
    B.closeB(); setTimeout(function () { var b = $("mbgo"); if (b) b.click(); if (window.ArenaZona) setTimeout(function () { ArenaZona.menu(); }, 60); }, 80);
  });
}
function pasangBot() {
  if (!B || !window.BOTX || window.BOTX.__au) return;
  window.BOTX.__au = 1;
  var pre0 = window.BOTX.pre;
  window.BOTX.pre = function (t, s) {
    var m = /^\/(\S+)\s*(.*)$/.exec(t);
    if (m) { var c = m[1].toLowerCase(); if (c === "tiket") return cmdTiket(); if (c === "mulai") return cmdMulai(m[2].trim()); if (c === "arena") return bukaArena(); }
    return pre0 ? pre0(t, s) : null;
  };
}

/* ---------- 3. Admin: Fokus sekarang ---------- */
var fk = null;
function tutupFk() { if (fk) { fk.remove(); fk = null; } }
function bukaFk() {
  if (fk) { tutupFk(); return; }
  var now = Date.now(), ls = (typeof T !== "undefined" ? T : []).filter(function (x) { return x.pend; }).sort(function (a, b) { return (b.skor || 0) - (a.skor || 0) || a.lu - b.lu; });
  var tua = ls.reduce(function (m, x) { return Math.max(m, now - x.lu); }, 0);
  fk = D.createElement("div"); fk.className = "ap-ov"; fk.setAttribute("role", "dialog"); fk.setAttribute("aria-modal", "true"); fk.setAttribute("aria-label", "Fokus sekarang");
  fk.innerHTML = '<div class="ap-box au-fk"><div class="au-h"><b>Fokus sekarang</b><button type="button" class="au-x" data-f="x" aria-label="Tutup">&times;</button></div>' +
    (ls.length ? '<p class="au-t">' + ls.length + ' percakapan perlu dijawab. Terlama menunggu ' + (typeof waitTxt === "function" ? waitTxt(tua) : "") + '. Berikut yang paling mendesak:</p><ul class="au-ls">' +
      ls.slice(0, 6).map(function (x, i) { var pl = typeof prLvl === "function" ? prLvl(x.skor || 0) : ["", "#64748b"]; return '<li><button type="button" data-f="' + i + '"><span class="au-pr" style="background:' + pl[1] + '">' + E(pl[0]) + '</span><span class="au-tx"><b>' + E(x.nama) + '</b><small>' + E(typeof label === "function" ? label(x.kunci) : x.kunci) + ' &middot; menunggu ' + E(typeof waitTxt === "function" ? waitTxt(now - x.lu) : "") + '</small><em>' + E(String(x.teks || "").slice(0, 90)) + '</em></span></button></li>'; }).join("") + '</ul>'
      : '<p class="au-ok">Semua percakapan sudah dijawab. Kerja bagus!</p>') + '</div>';
  D.body.appendChild(fk);
  fk.onclick = function (e) {
    if (e.target === fk) { tutupFk(); return; }
    var b = e.target.closest("[data-f]"); if (!b) return;
    if (b.dataset.f === "x") { tutupFk(); return; }
    var x = ls[+b.dataset.f]; tutupFk(); if (!x) return;
    var tb = D.querySelector('#atabs [data-at="inbox"]'); if (tb) tb.click();
    if (typeof pick === "function") pick(x);
  };
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && fk) tutupFk(); });
function pasangAdmin() {
  var bar = $("ap-bar"); if (!bar || $("au-fk")) return;
  var b = D.createElement("button"); b.type = "button"; b.className = "btn"; b.id = "au-fk"; b.textContent = "Fokus sekarang"; b.onclick = bukaFk; bar.appendChild(b);
  var f = D.createElement("button"); f.type = "button"; f.className = "btn"; f.id = "au-fs"; f.textContent = "Layar penuh";
  f.onclick = function () { try { if (D.fullscreenElement) D.exitFullscreen(); else D.documentElement.requestFullscreen(); } catch (e) { if (window.toast) toast("Layar penuh tidak didukung di perangkat ini."); } }; bar.appendChild(f);
}

function jalan() { pasangBtn(); pasangBot(); pasangAdmin(); }
jalan(); setInterval(jalan, 1500);
})();
