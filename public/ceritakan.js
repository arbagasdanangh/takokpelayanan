"use strict";
/* Versi 60: Cerita Layanan + kenyamanan chat. Semua dibuat di peramban dari informasi yang sudah ada di Takok (tanpa AI luar, tanpa kirim data).
   1. Jawaban atau layanan apa pun bisa diceritakan ulang sebagai: Berita, Cerita warga (ilustrasi), Penjelasan mudah, Poin-poin,
      Pesan WhatsApp, Caption media sosial, atau Tanya-jawab. Tombol "Ceritakan ulang" muncul di bawah jawaban asisten,
      dan tombol "Ceritakan" ada di tiap loket. Perintah: /cerita, /berita [topik], /ceritakan.
   2. Hasil bisa disalin, dikirim ke WhatsApp, didengarkan, atau dijadikan Kartu gambar (PNG) untuk dibagikan.
   3. Saran pertanyaan saat mengetik di kolom chat.
   4. Kecepatan suara Dengarkan (Lambat / Normal / Cepat) dan tombol Hentikan suara.
   Catatan kejujuran: teks hanya menyusun ulang isi layanan yang ada, tidak menambah fakta. Berita diberi catatan "dibuat otomatis". */
(function () {
var D = document, W = window, B = W.BOTI;
var $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function ujung(f) { try { return f(); } catch (e) { return undefined; } }
function toast(m) { if (W.toast) W.toast(m); }
if (!B || !W.BOTX) return;

var FM = {
  berita: "Berita", cerita: "Cerita warga", mudah: "Penjelasan mudah", poin: "Poin-poin", wa: "Pesan WhatsApp", caption: "Caption medsos", tanya: "Tanya-jawab"
};
var ALIAS = {berita: "berita", news: "berita", cerita: "cerita", kisah: "cerita", mudah: "mudah", sederhana: "mudah", simpel: "mudah", poin: "poin", ringkas: "poin", wa: "wa", whatsapp: "wa", caption: "caption", medsos: "caption", tanya: "tanya", faq: "tanya"};
var TOPIK = [["Membuat NIB", "mau bikin NIB"], ["SIP dokter / tenaga kesehatan", "SIP dokter"], ["PBG / IMB", "izin PBG IMB"], ["Izin reklame", "izin reklame"], ["Retribusi IPT", "retribusi IPT"], ["Izin lingkungan", "izin lingkungan"], ["Koperasi", "koperasi"]];

/* ---------- bahan ---------- */
function bersih(t) { return String(t || "").replace(/\*\*/g, "").replace(/<[^>]+>/g, " ").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim(); }
function kalimat(t) {
  t = bersih(t).replace(/([.!?])\s+(?=[A-Z0-9"(])/g, "$1\n");
  return t.split(/\n+/).map(function (x) { return x.replace(/^[\-\u2022*]\s*|^\d+[.)]\s*/, "").trim(); }).filter(function (x) { return x.length > 3; });
}
function daftar(a) { a = a.filter(Boolean); return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " dan " + a[a.length - 1]; }
function awal(s) { s = String(s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function topikDari(q) { return awal(bersih(q).replace(/[?!.]+$/, "").replace(/^(tolong\s+)?(jelaskan|ceritakan|apa itu|bagaimana|gimana|cara|mau|ingin|pengen)\s+/i, "")); }
function tgl() { try { return new Intl.DateTimeFormat("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}).format(new Date()); } catch (e) { return ""; } }
function situs() { return location.origin + "/"; }

var SRC = {}, CID = 0;
function modelPesan(cid) {
  var s = SRC[cid]; if (!s) return null; var k = kalimat(s.teks); if (!k.length) return null;
  return {judul: topikDari(s.tanya) || "Penjelasan dari Asisten Takok", tanya: s.tanya || "", k: k.slice(0, 10), dok: [], loket: [], jam: ""};
}
function modelTopik(q) {
  var s = String(q || "").toLowerCase(), h = W.kataHit ? ujung(function () { return W.kataHit(s); }) : null; h = h || {j: [], k: []};
  var kb = (B.KB || []).filter(function (x) { return x.re.test(s); })[0], k = [];
  (h.j || []).forEach(function (j) { k = k.concat(kalimat(j)); });
  var lk = (h.k || []).slice(0, 4).map(function (x) { return ujung(function () { return W.label(x); }) || ""; }).filter(Boolean);
  if (!k.length && !kb && !lk.length) return null;
  if (!k.length) k = ["Layanan " + (kb ? kb.t : topikDari(q)) + " tersedia di Takok Pelayanan Suroboyo.", "Warga dapat memeriksa persyaratan dan loket yang melayani sebelum datang."];
  return {judul: kb ? kb.t : topikDari(q), tanya: q, k: k.slice(0, 10), dok: kb ? kb.d.slice(0, 8) : [], loket: lk, jam: ""};
}
function modelLoket(key) {
  var p = String(key).split("_"), e = (W.LD && W.LD[p[0]] || []).filter(function (x) { return String(x[0]) === p[1]; })[0]; if (!e) return null;
  var l = (W.LOCS || []).filter(function (x) { return x.id === p[0]; })[0], k = kalimat(e[2]);
  var nm = String(e[1]); if (!k.length) k = ["Layanan " + nm + " tersedia di " + (l ? l.nm : "loket terkait") + "."];
  return {judul: nm, tanya: "Layanan " + nm, k: k.slice(0, 10), dok: [], loket: [(l ? l.nm : "") + (e[0] ? " (loket " + e[0] + ")" : "")], jam: e[7] || (l && l.jam) || "", sistem: e[3] || ""};
}
function ambil(spec) {
  if (spec.indexOf("m:") === 0) return modelPesan(spec.slice(2));
  if (spec.indexOf("l:") === 0) return modelLoket(spec.slice(2));
  return modelTopik(spec.replace(/^t:/, ""));
}

/* ---------- penyusun bentuk ---------- */
function bagi(a, n) { var o = [], per = Math.max(1, Math.ceil(a.length / n)); for (var i = 0; i < a.length; i += per) o.push(a.slice(i, i + per).join(" ")); return o; }
function susun(f, M) {
  var j = M.judul, lead = M.k[0], sisa = M.k.slice(1), dk = M.dok, lo = M.loket, t = [], judul = "";
  var dok = dk.length ? "Dokumen yang perlu disiapkan: " + daftar(dk) + "." : "";
  var tempat = lo.length ? "Layanan ini dapat diurus di " + daftar(lo) + (M.jam ? ", jam layanan " + M.jam : "") + "." : (M.jam ? "Jam layanan: " + M.jam + "." : "");
  if (f === "berita") {
    judul = dk.length ? j + ": Siapkan " + dk.length + " Dokumen Ini Sebelum ke Loket" : j + ": Ini yang Perlu Diketahui Warga Surabaya";
    t.push("SURABAYA, " + tgl() + " - " + lead);
    bagi(sisa, 2).forEach(function (p) { t.push(p); });
    if (dok) t.push("Adapun " + dok.charAt(0).toLowerCase() + dok.slice(1)); if (tempat) t.push(tempat);
    t.push("Warga disarankan memeriksa kembali persyaratan di loket sebelum berangkat agar urusan berjalan lebih cepat. Informasi lengkap tersedia di aplikasi Takok Pelayanan Suroboyo.");
    t.push("(Teks ini disusun otomatis dari informasi layanan di Takok, bukan berita media. Cek ketentuan terbaru di loket.)");
  } else if (f === "cerita") {
    var umum = !M.tanya; judul = umum ? "Cerita Bu Rina dan Layanan Publik di Surabaya" : "Cerita Bu Rina dan Urusan " + j;
    t.push(umum ? "Pagi itu Bu Rina butuh informasi layanan publik. Ia lalu membuka aplikasi Takok dan bertanya." : "Pagi itu Bu Rina bingung soal " + j.toLowerCase() + ". Ia lalu membuka aplikasi Takok dan bertanya.");
    t.push("Dari jawaban yang ia baca: " + lead + (sisa.length ? " " + sisa.slice(0, 2).join(" ") : ""));
    if (dk.length) t.push("Bu Rina pun menyiapkan " + daftar(dk) + " sebelum berangkat."); if (lo.length) t.push("Ia mencatat bahwa urusannya dilayani di " + daftar(lo) + ".");
    t.push("Dengan informasi itu di tangan, Bu Rina merasa lebih tenang saat berangkat ke loket.");
    t.push("(Cerita ilustrasi, tokoh rekaan. Isi layanan mengikuti informasi di Takok.)");
  } else if (f === "mudah") {
    judul = "Penjelasan Mudah: " + j;
    t.push("Intinya: " + lead); if (sisa.length) t.push("Yang perlu Anda tahu:\n" + sisa.slice(0, 5).map(function (x) { return "- " + x; }).join("\n"));
    if (dk.length) t.push("Yang dibawa:\n" + dk.map(function (x) { return "- " + x; }).join("\n")); if (tempat) t.push(tempat);
  } else if (f === "poin") {
    judul = j + ": Ringkasan"; t.push(M.k.slice(0, 8).map(function (x) { return "- " + x; }).join("\n"));
    if (dk.length) t.push("Dokumen:\n" + dk.map(function (x) { return "- " + x; }).join("\n")); if (tempat) t.push(tempat);
  } else if (f === "wa") {
    judul = "*" + j + "*"; t.push("_" + lead + "_"); if (sisa.length) t.push(sisa.slice(0, 4).map(function (x) { return "- " + x; }).join("\n"));
    if (dk.length) t.push("*Dokumen:* " + daftar(dk) + "."); if (tempat) t.push(tempat); t.push("Selengkapnya di Takok: " + situs());
  } else if (f === "caption") {
    var tag = "#" + (j.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).slice(0, 3).map(awal).join("") || "Layanan");
    judul = "\uD83D\uDCCC " + j; t.push(lead); if (sisa.length) t.push(sisa.slice(0, 3).map(function (x) { return "\u2705 " + x; }).join("\n"));
    t.push("\uD83D\uDCF2 Simpan dan bagikan ke yang butuh. Cek selengkapnya di Takok: " + situs()); t.push("#TakokSuroboyo #PelayananPublik #Surabaya " + tag);
  } else {
    judul = "Tanya-Jawab: " + j; t.push("Tanya: " + (M.tanya ? awal(bersih(M.tanya)).replace(/[?.]*$/, "") + "?" : "Apa itu " + j + "?") + "\nJawab: " + lead);
    if (sisa.length) t.push("Tanya: Apa lagi yang perlu diperhatikan?\nJawab: " + sisa.slice(0, 3).join(" "));
    if (dk.length) t.push("Tanya: Dokumen apa yang dibawa?\nJawab: " + daftar(dk) + "."); if (lo.length) t.push("Tanya: Di mana mengurusnya?\nJawab: " + daftar(lo) + (M.jam ? ", jam " + M.jam : "") + ".");
  }
  return {judul: judul, isi: t.join("\n\n")};
}
function teksPenuh(o) { return o.judul + "\n\n" + o.isi; }

/* ---------- tampilan di chat ---------- */
function chipFormat(spec, kecuali) {
  return '<div class="bch rm-fr">' + Object.keys(FM).filter(function (f) { return f !== kecuali; }).map(function (f) { return '<button type="button" data-ct="' + f + '|' + E(spec) + '">' + E(FM[f]) + '</button>'; }).join("") + '</div>';
}
function menuAwal() {
  var kec = ujung(function () { return Number(localStorage.getItem("tk_rate")) || 1; }) || 1, nm = kec < 1 ? "Lambat" : kec > 1 ? "Cepat" : "Normal";
  return B.bot("Ceritakan layanan dengan cara yang paling nyaman. Pilih bentuknya dulu, lalu topiknya. Anda juga bisa mengetik, misalnya: /berita bikin NIB.", '<div class="bch rm-fr">' + Object.keys(FM).map(function (f) { return '<button type="button" data-ctm="' + f + '">' + E(FM[f]) + '</button>'; }).join("") + '</div>' +
    '<div class="bch rm-fr"><button type="button" data-ctv="rate">Kecepatan suara: ' + nm + '</button><button type="button" data-ctv="stop">Hentikan suara</button></div>');
}
function menuTopik(f) {
  return B.add("u", E("Ceritakan sebagai " + FM[f])), B.bot("Mau menceritakan layanan yang mana?", '<div class="bch rm-fr">' + TOPIK.map(function (x) { return '<button type="button" data-ct="' + f + '|t:' + E(x[1]) + '">' + E(x[0]) + '</button>'; }).join("") + '</div>');
}
function jalankan(f, spec, tampilkan) {
  var M = ambil(spec);
  if (tampilkan) B.add("u", E("Ceritakan sebagai " + FM[f] + (spec.charAt(0) === "t" ? ": " + spec.slice(2) : "")));
  if (!M) return B.bot("Maaf, saya belum menemukan informasi untuk topik itu. Coba pilih salah satu topik berikut.", '<div class="bch rm-fr">' + TOPIK.map(function (x) { return '<button type="button" data-ct="' + f + '|t:' + E(x[1]) + '">' + E(x[0]) + '</button>'; }).join("") + '</div>');
  var o = susun(f, M), plain = teksPenuh(o);
  return B.bot("", '<div class="rm-art"><b class="rm-at">' + E(o.judul.replace(/^\*|\*$/g, "")) + '</b><div class="rm-ab">' + E(o.isi) + '</div></div>' +
    '<div class="bch rm-fr"><button type="button" data-ctimg="1">Kartu gambar</button><button type="button" data-ctmore="' + E(spec) + '|' + f + '">Bentuk lain</button></div>', 380, true, plain);
}

/* perintah */
var pre0 = W.BOTX.pre;
W.BOTX.pre = function (t, s) {
  var m = /^\/(cerita|ceritakan|berita)\b\s*(.*)$/i.exec(t);
  if (m) {
    var c = m[1].toLowerCase(), arg = m[2].trim(), f = c === "berita" ? "berita" : "", w = arg.split(/\s+/);
    if (w[0] && ALIAS[w[0].toLowerCase()]) { f = ALIAS[w[0].toLowerCase()]; arg = w.slice(1).join(" "); }
    if (c === "ceritakan" && !arg) {
      var ms = [].slice.call(D.querySelectorAll("#bm .bmsg.b[data-t]")).filter(function (x) { return !x.querySelector(".rm-art") && bersih(x.dataset.t).length > 40; }), last = ms[ms.length - 1];
      if (!last) return B.bot("Belum ada jawaban yang bisa diceritakan. Tanyakan sesuatu dulu, atau ketik /cerita untuk memilih topik.");
      var cid = siapkan(last); return B.bot("Mau diceritakan sebagai apa jawaban terakhir tadi?", chipFormat("m:" + cid));
    }
    if (!arg) return f ? menuTopik(f) : menuAwal();
    return jalankan(f || "berita", "t:" + arg, false);
  }
  return pre0 ? pre0(t, s) : null;
};
function siapkan(msg) {
  if (msg.dataset.cid) return msg.dataset.cid;
  var cid = String(++CID), q = "", p = msg.previousElementSibling;
  while (p && !(p.classList.contains("bmsg") && p.classList.contains("u") && !/^\s*(ceritakan|\/)/i.test(p.textContent))) p = p.previousElementSibling;
  if (p) q = p.textContent; SRC[cid] = {tanya: q, teks: msg.dataset.t || ""}; msg.dataset.cid = cid; return cid;
}

/* klik */
D.addEventListener("click", function (e) {
  var t = e.target; if (!t.closest) return;
  var a = t.closest("[data-ct]");
  if (a) { var p = a.dataset.ct.split("|"); getarK(); jalankan(p[0], p.slice(1).join("|"), true); return; }
  a = t.closest("[data-ctm]"); if (a) { getarK(); menuTopik(a.dataset.ctm); return; }
  a = t.closest("[data-ctmore]");
  if (a) { var q = a.dataset.ctmore.split("|"), f0 = q.pop(); var sp = q.join("|"); var r = a.parentNode.nextElementSibling; if (r && r.classList.contains("rm-fr2")) { r.remove(); return; } a.parentNode.insertAdjacentHTML("afterend", chipFormat(sp, f0).replace("rm-fr", "rm-fr rm-fr2")); return; }
  a = t.closest("[data-ctb]");
  if (a) {
    var msg = a.closest(".bmsg"), nx = msg.querySelector(".rm-fr3"); if (nx) { nx.remove(); return; }
    msg.insertAdjacentHTML("beforeend", chipFormat("m:" + siapkan(msg)).replace("rm-fr", "rm-fr rm-fr3")); return;
  }
  a = t.closest("[data-ctimg]");
  if (a) { var art = a.closest(".bmsg").querySelector(".rm-art"); if (art) kartu(art.querySelector(".rm-at").textContent, art.querySelector(".rm-ab").textContent); return; }
  a = t.closest("[data-ctv]");
  if (a) { if (a.dataset.ctv === "stop") { ujung(function () { speechSynthesis.cancel(); }); toast("Suara dihentikan"); } else { var c = Number(localStorage.getItem("tk_rate")) || 1; c = c === 1 ? 0.8 : c < 1 ? 1.25 : 1; ujung(function () { localStorage.setItem("tk_rate", String(c)); }); a.textContent = "Kecepatan suara: " + (c < 1 ? "Lambat" : c > 1 ? "Cepat" : "Normal"); toast("Kecepatan suara: " + (c < 1 ? "Lambat" : c > 1 ? "Cepat" : "Normal")); } return; }
  a = t.closest("[data-ctl]");
  if (a) { var key = a.dataset.ctl, bp = $("bp"), bf = $("bf"); if (bp && bp.hidden && bf) bf.click(); setTimeout(function () { jalankan("berita", "l:" + key, true); }, 450); }
}, true);
function getarK() { try { if (W.Apk && Apk.hap() && navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

/* tombol "Ceritakan ulang" di bawah jawaban */
function hiasPesan() {
  [].forEach.call(D.querySelectorAll("#bm .bmsg.b[data-t]"), function (m) {
    if (m.querySelector(".rm-ctb") || m.querySelector(".rm-art") || bersih(m.dataset.t).length < 60) return;
    var b = D.createElement("button"); b.type = "button"; b.className = "bsp rm-ctb"; b.dataset.ctb = "1"; b.textContent = "Ceritakan ulang"; m.appendChild(b);
  });
}
function hiasLoket() {
  [].forEach.call(D.querySelectorAll("#list details.row .body"), function (b) {
    if (b.querySelector(".rm-ctl")) return; var d = b.closest("details.row"), k = d && d.dataset.n; if (!k) return;
    var w = D.createElement("div"); w.className = "rm-ctl"; w.innerHTML = '<button type="button" class="chip" data-ctl="' + E(k) + '">Ceritakan sebagai berita</button>'; b.appendChild(w);
  });
}
if (W.MutationObserver) {
  var bm = $("bm"); if (bm) new MutationObserver(function () { ujung(hiasPesan); }).observe(bm, {childList: true});
  var ls = $("list"); if (ls) new MutationObserver(function () { ujung(hiasLoket); }).observe(ls, {childList: true});
}

/* ---------- kartu gambar ---------- */
function bungkus(x, teks, mx, lebar, maxBaris) {
  var out = [], paras = String(teks).split("\n");
  for (var p = 0; p < paras.length; p++) {
    var w = paras[p].split(/\s+/), baris = "";
    for (var i = 0; i < w.length; i++) { var u = baris ? baris + " " + w[i] : w[i]; if (x.measureText(u).width > lebar && baris) { out.push(baris); baris = w[i]; } else baris = u; }
    out.push(baris);
  }
  if (out.length > maxBaris) { out = out.slice(0, maxBaris); out[maxBaris - 1] = out[maxBaris - 1].replace(/\s*\S*$/, "") + " ..."; }
  return out;
}
function kartu(judul, isi) {
  var Wd = 1080, Ht = 1350, c = D.createElement("canvas"); c.width = Wd; c.height = Ht; var x = c.getContext("2d"), f = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  var g = x.createLinearGradient(0, 0, Wd, Ht); g.addColorStop(0, "#1b4fc4"); g.addColorStop(1, "#0c2a86"); x.fillStyle = g; x.fillRect(0, 0, Wd, Ht);
  x.fillStyle = "#ffc933"; x.font = "800 40px " + f; x.fillText("Takok Pelayanan Suroboyo", 80, 110);
  x.fillStyle = "#fff"; x.beginPath(); if (x.roundRect) x.roundRect(60, 160, 960, 1050, 36); else x.rect(60, 160, 960, 1050); x.fill();
  x.fillStyle = "#0c2a86"; x.font = "800 58px " + f; var y = 250; bungkus(x, judul.replace(/^\*|\*$/g, ""), 0, 880, 5).forEach(function (l) { x.fillText(l, 100, y); y += 72; });
  y += 16; x.fillStyle = "#ffb800"; x.fillRect(100, y - 40, 120, 8); y += 24;
  x.fillStyle = "#1d2a4d"; x.font = "500 38px " + f; var sisa = Math.floor((1170 - y) / 54);
  bungkus(x, isi.replace(/\(Teks ini disusun[^)]*\)|\(Cerita ilustrasi[^)]*\)/g, "").replace(/\n{2,}/g, "\n"), 0, 880, Math.max(3, sisa)).forEach(function (l) { x.fillText(l, 100, y); y += 54; });
  x.fillStyle = "#fff"; x.font = "700 34px " + f; x.fillText("Cek selengkapnya di " + location.host, 80, 1280);
  c.toBlob(function (bl) {
    if (!bl) { toast("Gagal membuat gambar"); return; }
    var file; try { file = new File([bl], "takok-layanan.png", {type: "image/png"}); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({files: [file]})) { navigator.share({files: [file], title: judul}).catch(function () {}); return; }
    var a = D.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "takok-layanan.png"; D.body.appendChild(a); a.click(); a.remove(); toast("Kartu gambar diunduh");
  }, "image/png");
}

/* ---------- saran saat mengetik ---------- */
var SARAN = ["Mau bikin NIB", "Syarat SIP dokter", "Cara urus PBG atau IMB", "Izin reklame", "Retribusi IPT", "Izin lingkungan UKL-UPL", "Cek kesiapan berkas", "Jam paling sepi", "Rencana kunjungan", "Cari kode KBLI", "Dokumen yang dibawa", "Status permohonan saya", "Jadwal booking saya", "Lokasi dan jam layanan", "Daftar KBLI saya", "Pengaduan layanan", "Ceritakan jawaban tadi sebagai berita", "/cerita", "/berita bikin NIB", "/jam"];
function pasangSaran() {
  var bi = $("bi"), bin = D.querySelector("#bp .bin"); if (!bi || !bin || $("rm-sg")) return;
  var d = D.createElement("div"); d.id = "rm-sg"; d.className = "bch rm-sg"; d.hidden = true; bin.parentNode.insertBefore(d, bin);
  var riw = []; ujung(function () { riw = JSON.parse(localStorage.getItem("tk_cari") || "[]"); });
  bi.addEventListener("input", function () {
    var v = bi.value.trim().toLowerCase(); if (v.length < 2) { d.hidden = true; d.innerHTML = ""; return; }
    var pool = (Array.isArray(riw) ? riw : []).concat(SARAN), hit = [];
    pool.forEach(function (x) { if (hit.length < 4 && x.toLowerCase().indexOf(v) > -1 && x.toLowerCase() !== v && hit.indexOf(x) < 0) hit.push(x); });
    d.innerHTML = hit.map(function (x) { return '<button type="button" data-sg="' + E(x) + '">' + E(x) + '</button>'; }).join(""); d.hidden = !hit.length;
  });
  d.addEventListener("click", function (e) { var b = e.target.closest("[data-sg]"); if (!b) return; bi.value = b.dataset.sg; d.hidden = true; var s = $("b-s"); if (s) s.click(); });
  bi.addEventListener("keydown", function (e) { if (e.key === "Enter") d.hidden = true; });
}

/* ---------- kecepatan suara ---------- */
(function () {
  if (!("speechSynthesis" in W)) return; var sp0 = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = function (u) {
    try { var r = Number(localStorage.getItem("tk_rate")) || 1; u.rate = r; u.lang = "id-ID"; var v = speechSynthesis.getVoices().filter(function (x) { return /^id/i.test(x.lang); })[0]; if (v) u.voice = v; } catch (e) {}
    sp0(u);
  };
})();

setInterval(function () { ujung(hiasPesan); ujung(hiasLoket); ujung(pasangSaran); }, 1500);
ujung(hiasPesan); ujung(pasangSaran);
W.Ceritakan = {jalankan: jalankan, susun: susun, kartu: kartu};
})();
