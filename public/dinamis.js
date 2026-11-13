"use strict";
/* Versi 52 (dinamis): isi yang bisa diubah superadmin tanpa menyentuh kode, tersimpan di server (cfg.dinamis) dan ikut dimuat saat aplikasi dibuka.
   1. Pengumuman (banner di atas, jenis info/penting, batas tanggal, bisa ditutup).
   2. Status layanan langsung (buka/tutup + hitung mundur) di Kartu Saya.
   3. Saran Cerdas di Asisten (/saran): saran menyesuaikan jam, tiket aktif, dan saran buatan admin.
   4. Editor "Atur dinamis" (tombol di bar admin): pengumuman, kamus istilah, kerangka pertanyaan, saran, bidang /mulai, dan "Yang baru". */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
function din() { return window.DIN || {}; }
function wib() { var n = new Date(Date.now() + 7 * 36e5); return {wd: n.getUTCDay(), h: n.getUTCHours() + n.getUTCMinutes() / 60, tgl: n.toISOString().slice(0, 10)}; }

/* ---------- 1. Pengumuman ---------- */
function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }
function pengumuman() {
  var a = din().pengumuman || {}, el = $("dn-ann"), t = String(a.teks || "").trim(), aktif = !!t && (!a.sampai || wib().tgl <= a.sampai), tutup = "";
  try { tutup = localStorage.getItem("tk_ann") || ""; } catch (e) {}
  if (!aktif || tutup === hash(t + a.tipe)) { if (el) el.remove(); return; }
  if (el && el.dataset.h === hash(t + a.tipe)) return; if (el) el.remove();
  el = D.createElement("div"); el.id = "dn-ann"; el.dataset.h = hash(t + a.tipe); el.className = "dn-ann " + (a.tipe === "penting" ? "penting" : "info"); el.setAttribute("role", a.tipe === "penting" ? "alert" : "status");
  el.innerHTML = '<span class="dn-ik" aria-hidden="true">' + (a.tipe === "penting" ? "!" : "i") + '</span><span class="dn-tx">' + E(t) + '</span><button type="button" aria-label="Tutup pengumuman">&times;</button>';
  el.querySelector("button").onclick = function () { try { localStorage.setItem("tk_ann", hash(t + a.tipe)); } catch (e) {} el.remove(); };
  var m = D.querySelector("main") || D.body; m.parentNode.insertBefore(el, m);
}

/* ---------- 2. Status layanan ---------- */
function mnt(m) { return m >= 60 ? Math.floor(m / 60) + " jam " + (m % 60) + " menit" : m + " menit"; }
function status() {
  var n = wib(), buka = n.wd >= 1 && n.wd <= 5 && n.h >= 8 && n.h < 14, t;
  if (buka) t = "Layanan buka. Tutup 14.00 WIB (" + mnt(Math.round((14 - n.h) * 60)) + " lagi)";
  else {
    var h = n.wd >= 1 && n.wd <= 5 && n.h < 8 ? 0 : n.wd >= 1 && n.wd <= 4 ? 1 : n.wd === 5 ? 3 : n.wd === 6 ? 2 : 1;
    t = "Layanan tutup. Buka lagi " + (h === 0 ? "hari ini" : HARI[(n.wd + h) % 7]) + " 08.00 WIB" + (h === 0 ? " (" + mnt(Math.round((8 - n.h) * 60)) + " lagi)" : "");
  }
  return '<p class="dn-st ' + (buka ? "buka" : "tutup") + '"><i aria-hidden="true"></i>' + E(t) + '</p><div class="au-kb"><button type="button" class="btn" data-rc="buka">Rencanakan beberapa layanan</button></div>';
}
window.AuraKS = window.AuraKS || {}; window.AuraKS.extra = status;

/* ---------- 3. Saran Cerdas ---------- */
function saran() {
  var B = window.BOTI, o = window.AuraKS && AuraKS.tiket && AuraKS.tiket(), n = wib(), buka = n.wd >= 1 && n.wd <= 5 && n.h >= 8 && n.h < 14, a = [];
  if (window.S === "user") { if (o) { a.push(["Lihat tiket saya", "/tiket"], ["Kapan berangkat?", "/berangkat"], ["Persyaratan hari ini", "/panduan"]); } else a.push(["Buat booking", "booking kunjungan"]); }
  else a.push(["Masuk untuk booking", "login"]);
  a.push(buka ? ["Antrean hari ini", "/antre"] : ["Jam layanan", "jam buka"]);
  (Array.isArray(din().saran) ? din().saran : []).forEach(function (r) { if (r && r[0] && r[1]) a.push([r[0], r[1]]); });
  a.push(["Pemandu layanan", "/mulai"], ["Arti istilah", "/arti"]);
  var seen = {}; a = a.filter(function (x) { if (seen[x[0]]) return false; seen[x[0]] = 1; return true; }).slice(0, 10);
  return B.bot((buka ? "Layanan sedang buka. " : "Layanan sedang tutup. ") + "Saran untuk Anda saat ini:", '<div class="bch">' + a.map(function (x) { return x[1] === "login" ? B.btn(x[0], "login") : B.btn(x[0], "q:" + x[1]); }).join("") + '</div>');
}
function pasangBot() {
  if (!window.BOTI || !window.BOTX || window.BOTX.__dn) return; window.BOTX.__dn = 1; var p0 = window.BOTX.pre;
  window.BOTX.pre = function (t, s) { if (/^\/saran\b/i.test(t)) return saran(); return p0 ? p0(t, s) : null; };
}

/* ---------- 4. Editor (superadmin) ---------- */
var ed = null;
function baris(t) { return String(t || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean); }
function kolom(l, n) { var p = l.split("|").map(function (x) { return x.trim(); }); while (p.length < n) p.push(""); return p; }
function keTeks(rows) { return (rows || []).map(function (r) { return r.join(" | ").replace(/( \| )+$/, ""); }).join("\n"); }
function mulaiTeks(m) { return Object.keys(m || {}).map(function (k) { return k + " | " + m[k][0] + " | " + m[k][1].map(function (x) { return x[0] + "::" + x[1]; }).join("; "); }).join("\n"); }
function kumpul() {
  var g = function (i) { return ($(i) || {}).value || ""; }, mu = {};
  baris(g("dn-mu")).forEach(function (l) { var p = kolom(l, 3), it = p[2].split(";").map(function (x) { var q = x.split("::"); return [(q[0] || "").trim(), (q[1] || "").trim()]; }).filter(function (x) { return x[0] && x[1]; }); if (p[0] && p[1] && it.length) mu[p[0].toLowerCase()] = [p[1], it]; });
  return {pengumuman: {teks: g("dn-pt").trim(), tipe: g("dn-ptp"), sampai: g("dn-ps")}, kamus: baris(g("dn-ka")).map(function (l) { return kolom(l, 4); }), kerangka: baris(g("dn-kr")).map(function (l) { return kolom(l, 2); }),
    saran: baris(g("dn-sr")).map(function (l) { return kolom(l, 2); }), mulai: mu, baru: {v: g("dn-bv").trim(), warga: baris(g("dn-bw")).map(function (l) { return kolom(l, 2); }), admin: baris(g("dn-ba")).map(function (l) { return kolom(l, 2); })}};
}
function tutupEd() { if (ed) { ed.remove(); ed = null; } }
function bukaEd() {
  if (ed) return; var d = din(), p = d.pengumuman || {}, b = d.baru || {};
  var f = function (id, lab, hint, val, rows) { return '<label class="dn-f"><b>' + lab + '</b><small>' + hint + '</small><textarea id="' + id + '" rows="' + rows + '" spellcheck="false">' + E(val) + '</textarea></label>'; };
  ed = D.createElement("div"); ed.className = "pn-ov"; ed.setAttribute("role", "dialog"); ed.setAttribute("aria-modal", "true"); ed.setAttribute("aria-label", "Atur dinamis");
  ed.innerHTML = '<div class="pn-box dn-ed"><div class="au-h"><b>Atur isi dinamis</b><button type="button" class="au-x" data-dn="x" aria-label="Tutup">&times;</button></div><p class="sys">Perubahan langsung tampil di aplikasi warga dan admin saat dimuat ulang. Kosongkan kolom untuk kembali ke bawaan. Hanya superadmin yang bisa menyimpan.</p>' +
    '<label class="dn-f"><b>Pengumuman</b><small>Tampil di atas halaman untuk semua pengguna.</small><input id="dn-pt" maxlength="240" value="' + E(p.teks || "") + '" placeholder="Mis. Layanan tutup Senin untuk libur nasional"></label>' +
    '<div class="dn-r"><label class="dn-f"><b>Jenis</b><select id="dn-ptp"><option value="info"' + (p.tipe !== "penting" ? " selected" : "") + '>Info</option><option value="penting"' + (p.tipe === "penting" ? " selected" : "") + '>Penting</option></select></label><label class="dn-f"><b>Tampil sampai</b><input id="dn-ps" type="date" value="' + E(p.sampai || "") + '"></label></div>' +
    f("dn-ka", "Kamus istilah tambahan", "Satu baris: ISTILAH | Kepanjangan | Penjelasan | kata pencarian. Istilah yang sama menimpa bawaan.", keTeks(d.kamus), 5) +
    f("dn-kr", "Kerangka pertanyaan", "Satu baris: Label | Teks (pakai ... untuk bagian yang diisi warga). Kosong = 5 kerangka bawaan.", keTeks(d.kerangka), 4) +
    f("dn-sr", "Saran cepat di Asisten", "Satu baris: Label | Kueri. Muncul di /saran.", keTeks(d.saran), 3) +
    f("dn-mu", "Bidang untuk /mulai", "Satu baris: kunci | Nama bidang | Label::kueri; Label::kueri. Kunci yang sama menimpa bawaan.", mulaiTeks(d.mulai), 3) +
    '<label class="dn-f"><b>Versi "Yang baru"</b><small>Ubah versi agar jendela tampil lagi ke semua pengguna.</small><input id="dn-bv" maxlength="12" value="' + E(b.v || "") + '" placeholder="52"></label>' +
    f("dn-bw", "Yang baru untuk warga", "Satu baris: Judul | Isi. Kosong = bawaan.", keTeks(b.warga), 4) + f("dn-ba", "Yang baru untuk admin", "Satu baris: Judul | Isi. Kosong = bawaan.", keTeks(b.admin), 3) +
    '<p class="dn-msg" id="dn-msg" role="status"></p><div class="btns" style="justify-content:flex-end"><button type="button" class="btn" data-dn="x">Batal</button><button type="button" class="send" data-dn="s">Simpan</button></div></div>';
  D.body.appendChild(ed);
  ed.onclick = async function (e) {
    if (e.target === ed) { tutupEd(); return; } var bt = e.target.closest("[data-dn]"); if (!bt) return;
    if (bt.dataset.dn === "x") { tutupEd(); return; }
    var m = $("dn-msg"); bt.disabled = true; m.textContent = "Menyimpan\u2026"; m.className = "dn-msg";
    try { var j = await api("/api/admin/dinamis", {d: kumpul()}); window.DIN = j.d || {}; m.textContent = "Tersimpan. Warga melihatnya saat memuat ulang."; m.className = "dn-msg ok"; pengumuman(); if (window.toast) toast("Pengaturan dinamis tersimpan."); }
    catch (er) { m.textContent = (er && er.message) || "Gagal menyimpan. Hanya superadmin yang bisa mengubah."; m.className = "dn-msg no"; }
    bt.disabled = false;
  };
}
D.addEventListener("keydown", function (e) { if (e.key === "Escape" && ed) tutupEd(); });
function pasangAdmin() {
  var bar = $("ap-bar"); if (!bar || $("dn-b")) return; var b = D.createElement("button"); b.type = "button"; b.className = "btn"; b.id = "dn-b"; b.textContent = "Atur dinamis"; b.onclick = bukaEd; bar.appendChild(b);
}

function jalan() { try { pengumuman(); pasangBot(); pasangAdmin(); } catch (e) {} }
setInterval(jalan, 2000); jalan();
})();
