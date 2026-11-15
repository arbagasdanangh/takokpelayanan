"use strict";
/* Versi 62: Redaksi Berita Pelayanan.
   Admin loket menulis berita/pengumuman untuk loketnya, mengirim untuk ditinjau; superuser menyetujui, menolak (dengan catatan), menyematkan,
   atau menerbitkan langsung. Ada jadwal terbit dan kedaluwarsa, tingkat Info/Penting/Darurat (Darurat menjadi spanduk di aplikasi), templat cepat,
   pratinjau, dan statistik dibaca/membantu. Sisi warga: lencana tingkat, tombol "Membantu", dihitung baca, dan spanduk darurat. */
(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
function tg(ms) { try { return new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}); } catch (e) { return ""; } }
function localIso(ms) { if (!ms) return ""; var d = new Date(ms + 7 * 3600000); return d.toISOString().slice(0, 16); }
function plain(h) { var t = D.createElement("div"); t.innerHTML = String(h || "").replace(/<\/(p|li|h3|div)>/gi, "$& "); return (t.textContent || "").replace(/\s+/g, " ").trim(); }
var TING = {info: ["Info", "#1a46b5"], penting: ["Penting", "#d97706"], darurat: ["Darurat", "#c81e1e"]};
var STAT = {draf: ["Draf", "#64748b"], tinjau: ["Menunggu persetujuan", "#d97706"], terbit: ["Terbit", "#15803d"], arsip: ["Arsip", "#475569"]};
var TEMPLAT = {
  gangguan: ["Gangguan layanan", "Gangguan", "penting", "<p><b>Layanan sedang mengalami gangguan.</b></p><p>Mohon maaf atas ketidaknyamanan. Layanan [nama layanan] belum dapat dilayani sementara waktu karena [penyebab].</p><ul><li>Perkiraan pulih: [waktu]</li><li>Alternatif: [booking ulang / datang besok / hubungi admin]</li></ul>"],
  libur: ["Libur / loket tutup", "Libur", "info", "<p>Loket [nama loket] <b>tutup</b> pada [tanggal] dalam rangka [alasan].</p><p>Layanan kembali dibuka pada [tanggal buka]. Anda tetap dapat membuat booking dan bertanya lewat Asisten Takok.</p>"],
  baru: ["Layanan baru", "Layanan Baru", "info", "<p>Kabar baik! Layanan <b>[nama layanan]</b> kini tersedia di [loket].</p><ul><li>Syarat: [ringkas]</li><li>Biaya: [biaya]</li><li>Cara: [langkah singkat]</li></ul>"],
  jam: ["Perubahan jam layanan", "Pengumuman", "penting", "<p>Mulai [tanggal], jam layanan [loket] berubah menjadi <b>[jam baru]</b>.</p><p>Pengambilan antrean ditutup pukul [jam].</p>"]
};
var TBAR = [["bold", "<b>B</b>", "Tebal"], ["italic", "<i>I</i>", "Miring"], ["underline", "<u>U</u>", "Garis bawah"], ["h3", "H", "Judul bagian"], ["insertUnorderedList", "&bull; Daftar", "Daftar poin"], ["insertOrderedList", "1. Daftar", "Daftar nomor"], ["createLink", "Tautan", "Sisipkan tautan"]];
var L = null, EDIT = 0;

/* ---------- Admin ---------- */
function lencana(t, w) { return '<span class="bdg" style="background:' + w[1] + '">' + E(w[0]) + "</span> "; }
function wa(x) { return "*" + x.judul + "*\n" + (x.kategori || "") + (x.loket_nama ? " · " + x.loket_nama : "") + "\n\n" + plain(x.isi) + "\n\nTakok Pelayanan Suroboyo\n" + location.origin; }
function kartu(x, sup) {
  var b = "", st = x.status || "terbit";
  b += '<button type="button" class="btn" data-rd="ubah" data-id="' + x.id + '">Ubah</button>';
  if (st === "tinjau" && sup) b += '<button type="button" class="send" data-rd="setuju" data-id="' + x.id + '">Setujui dan terbitkan</button><button type="button" class="btn" data-rd="tolak" data-id="' + x.id + '">Kembalikan</button>';
  if (st === "draf" || st === "arsip") b += '<button type="button" class="send" data-rd="kirim" data-id="' + x.id + '">' + (sup ? "Terbitkan" : "Kirim untuk ditinjau") + "</button>";
  if (st === "terbit") { if (sup) b += '<button type="button" class="btn" data-rd="sematkan" data-id="' + x.id + '">' + (x.sematkan ? "Lepas sematan" : "Sematkan") + "</button>"; b += '<button type="button" class="btn" data-rd="arsip" data-id="' + x.id + '">Arsipkan</button>'; }
  b += '<button type="button" class="btn" data-rd="wa" data-id="' + x.id + '">Salin untuk WhatsApp</button>';
  if (sup || st !== "terbit") b += '<button type="button" class="btn" data-rd="hapus" data-id="' + x.id + '">Hapus</button>';
  var jad = (x.mulai || x.sampai) ? '<small class="sys">Jadwal: ' + (x.mulai ? "mulai " + E(tg(x.mulai)) : "") + (x.sampai ? " sampai " + E(tg(x.sampai)) : "") + (x.status === "terbit" && !x.tayang ? " &middot; <b>belum/tidak tayang sekarang</b>" : "") + "</small>" : "";
  return '<article class="card rd-i"><div class="rd-h">' + lencana("s", STAT[st] || STAT.terbit) + lencana("t", TING[x.tingkat || "info"] || TING.info) + (x.sematkan ? '<span class="bdg" style="background:#7c3aed">Disematkan</span> ' : "") + '<b>' + E(x.judul) + '</b></div>' +
    '<small class="sys">' + E(x.kategori || "Berita") + " &middot; " + E(x.loket_nama || "Semua loket") + " &middot; " + E(x.penulis || "-") + " &middot; diubah " + E(tg(x.ubah || x.waktu)) + "</small>" + jad +
    (x.catatan ? '<div class="rd-cat">Catatan peninjau: ' + E(x.catatan) + "</div>" : "") +
    (st === "terbit" ? '<small class="sys">Dibaca <b>' + (x.baca || 0) + "</b> kali &middot; dinilai membantu <b>" + (x.membantu || 0) + "</b></small>" : "") +
    '<p class="rd-p">' + E(plain(x.isi).slice(0, 160)) + '</p><div class="btns">' + b + "</div></article>";
}
function gambar(el) {
  var sup = L.super, lk = L.loket || [];
  var tm = Object.keys(TEMPLAT).map(function (k) { return '<button type="button" class="chip" data-rd="tpl" data-k="' + k + '">' + E(TEMPLAT[k][0]) + "</button>"; }).join("");
  var lokOpt = sup ? '<option value="">Semua loket</option>' : lk.map(function (z) { return '<option value="' + E(z.kunci) + '">' + E(z.nama) + "</option>"; }).join("");
  var o = '<h2 class="sec">Redaksi Berita Pelayanan</h2><p class="sys">' + (sup ? "Anda superuser: berita bisa langsung terbit dan Anda menyetujui kiriman admin loket." : "Tulis berita untuk loket Anda. Berita dikirim ke superuser untuk ditinjau sebelum tayang di aplikasi.") + "</p>";
  if (sup && L.tinjau) o += '<div class="rd-warn" role="status"><b>' + L.tinjau + "</b> berita menunggu persetujuan Anda.</div>";
  o += '<div class="card" id="rd-ed"><b id="rd-jt">Tulis berita baru</b><div class="hint" style="margin:6px 0">Mulai cepat dari templat: ' + tm + "</div>" +
    '<input class="si" id="rd-j" maxlength="100" placeholder="Judul berita" aria-label="Judul">' +
    '<div class="btns"><select class="si" id="rd-k" aria-label="Kategori" style="max-width:190px">' + L.kategori.map(function (k) { return "<option>" + E(k) + "</option>"; }).join("") + "</select>" +
    '<select class="si" id="rd-t" aria-label="Tingkat" style="max-width:170px"><option value="info">Info</option><option value="penting">Penting</option>' + (sup ? '<option value="darurat">Darurat (spanduk)</option>' : "") + "</select>" +
    '<select class="si" id="rd-l" aria-label="Loket" style="max-width:260px">' + lokOpt + "</select></div>" +
    '<div class="btns"><label class="sys">Mulai tayang <input class="si" type="datetime-local" id="rd-m"></label><label class="sys">Berakhir <input class="si" type="datetime-local" id="rd-s"></label>' +
    (sup ? '<label class="sys"><input type="checkbox" id="rd-p"> Sematkan di atas</label>' : "") + "</div>" +
    '<div class="tbar" role="toolbar" aria-label="Format teks">' + TBAR.map(function (t) { return '<button type="button" class="btn" data-cmd="' + t[0] + '" title="' + t[2] + '">' + t[1] + "</button>"; }).join("") + "</div>" +
    '<div class="ed rich" id="rd-e" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Isi berita" data-ph="Tulis isi berita. Ganti bagian [dalam kurung siku] pada templat."></div>' +
    '<div class="btns"><button type="button" class="btn" data-rd="simpan" data-st="draf">Simpan draf</button><button type="button" class="send" data-rd="simpan" data-st="terbit">' + (sup ? "Terbitkan" : "Kirim untuk ditinjau") + '</button><button type="button" class="btn" data-rd="pratinjau">Pratinjau</button><button type="button" class="btn" id="rd-b" data-rd="batal" hidden>Batal ubah</button></div><div id="rd-pv"></div></div>';
  var grup = [["tinjau", "Menunggu persetujuan"], ["terbit", "Terbit"], ["draf", "Draf"], ["arsip", "Arsip"]];
  grup.forEach(function (g) {
    var a = L.daftar.filter(function (x) { return (x.status || "terbit") === g[0]; });
    if (a.length) o += '<h2 class="sec">' + g[1] + " (" + a.length + ")</h2>" + a.map(function (x) { return kartu(x, sup); }).join("");
  });
  if (!L.daftar.length) o += '<div class="empty">Belum ada berita.</div>';
  el.innerHTML = o;
}
function form() { return {judul: $("rd-j").value.trim(), kategori: $("rd-k").value, tingkat: $("rd-t").value, loket: $("rd-l").value, mulai: $("rd-m").value, sampai: $("rd-s").value, sematkan: $("rd-p") ? $("rd-p").checked : false, isi: $("rd-e").innerHTML, id: EDIT}; }
function isi(x) {
  EDIT = x ? x.id : 0; $("rd-jt").textContent = x ? "Ubah berita #" + x.id : "Tulis berita baru"; $("rd-b").hidden = !x;
  $("rd-j").value = x ? x.judul : ""; $("rd-k").value = x ? x.kategori : L.kategori[0]; $("rd-t").value = x ? (x.tingkat || "info") : "info";
  if (x && $("rd-l").querySelector('option[value="' + x.loket + '"]')) $("rd-l").value = x.loket;
  $("rd-m").value = x ? localIso(x.mulai) : ""; $("rd-s").value = x ? localIso(x.sampai) : ""; if ($("rd-p")) $("rd-p").checked = !!(x && x.sematkan);
  $("rd-e").innerHTML = x ? x.isi : ""; $("rd-pv").innerHTML = ""; $("rd-ed").scrollIntoView({behavior: "smooth", block: "start"});
}
async function muat(el) { L = await api("/api/admin/redaksi"); gambar(el); }
function pratinjau() {
  var f = form(); if (!f.judul || !plain(f.isi)) { if (window.toast) window.toast("Isi judul dan isi berita dulu."); return; }
  $("rd-pv").innerHTML = '<h3 class="lap-h">Pratinjau tampilan warga</h3>' + (f.tingkat === "darurat" ? '<div class="nw-dar" style="position:static"><b>DARURAT</b> ' + E(f.judul) + "</div>" : "") + window.beritaKartu({judul: f.judul, isi: f.isi, kategori: f.kategori, tingkat: f.tingkat, waktu: Date.now(), loket: f.loket}, true);
}
window.aRed = async function (el) {
  await muat(el);
  if (el._rd) return; el._rd = true;
  el.addEventListener("click", async function (e) {
    var cmd = e.target.closest("[data-cmd]");
    if (cmd) { var c = cmd.dataset.cmd, ed = $("rd-e"); ed.focus(); if (c === "h3") D.execCommand("formatBlock", false, "h3"); else if (c === "createLink") { var u = prompt("Alamat tautan (https://...)"); if (u && /^https?:\/\//i.test(u)) D.execCommand("createLink", false, u); } else D.execCommand(c, false, null); return; }
    var b = e.target.closest("[data-rd]"); if (!b) return;
    var a = b.dataset.rd, id = +b.dataset.id, x = L && L.daftar.filter(function (n) { return n.id === id; })[0];
    try {
      if (a === "tpl") { var t = TEMPLAT[b.dataset.k]; $("rd-j").value = t[0]; $("rd-k").value = t[1]; $("rd-t").value = t[2]; $("rd-e").innerHTML = t[3]; return; }
      if (a === "pratinjau") return pratinjau();
      if (a === "batal") return isi(null);
      if (a === "ubah" && x) return isi(x);
      if (a === "wa" && x) { try { await navigator.clipboard.writeText(wa(x)); if (window.toast) window.toast("Teks WhatsApp disalin."); } catch (z) { if (window.toast) window.toast("Tidak bisa menyalin."); } return; }
      if (a === "simpan") { var f = form(); f.status = b.dataset.st; var r = await api("/api/admin/redaksi/simpan", f); if (window.toast) window.toast(r.status === "terbit" ? "Berita terbit." : r.status === "tinjau" ? "Terkirim untuk ditinjau superuser." : "Draf tersimpan."); EDIT = 0; return muat(el); }
      if (!x) return;
      var body = {id: id, aksi: a};
      if (a === "hapus" && !confirm("Hapus berita ini?")) return;
      if (a === "tolak") { var cat = prompt("Catatan untuk penulis (opsional)"); if (cat === null) return; body.catatan = cat; }
      await api("/api/admin/redaksi/aksi", body); if (window.toast) window.toast("Selesai."); await muat(el);
    } catch (err) { if (window.toast) window.toast(err.message || "Gagal."); }
  });
};

/* ---------- Sisi warga ---------- */
var sudah = {}, asli = window.beritaKartu;
window.beritaKartu = function (x, buka) {
  var t = TING[x.tingkat || "info"] || TING.info, id = x.id || 0;
  var sampai = x.sampai ? '<small class="sys">Berlaku sampai ' + E(tg(x.sampai)) + "</small> " : "";
  return '<details class="card news' + (x.tingkat === "darurat" ? " nw-d" : "") + '"' + (buka ? " open" : "") + ' data-nid="' + id + '"><summary><span class="nh"><b>' + E(x.judul) + "</b> " + (x.tingkat && x.tingkat !== "info" ? '<span class="bdg" style="background:' + t[1] + '">' + t[0] + "</span> " : "") +
    (x.sematkan ? '<span class="bdg" style="background:#d97706">Disematkan</span> ' : "") + '<span class="bdg" style="background:#1a46b5">' + E(x.kategori || "Berita") + "</span>" + (x.loket ? "" : "") + '</span><small class="sys">' + (window.tglId ? window.tglId(x.waktu) : "") + '</small></summary><div class="rich">' + (window.safeHtml ? window.safeHtml(x.isi || "") : E(x.isi)) + "</div>" +
    (id ? '<div class="nw-f">' + sampai + '<button type="button" class="chip" data-nwx="' + id + '">👍 Membantu</button></div>' : "") + "</details>";
};
function post(u, b) { try { return window.api(u, b).catch(function () {}); } catch (e) { return Promise.resolve(); } }
D.addEventListener("toggle", function (e) {
  var d = e.target; if (!d || !d.matches || !d.matches("details.news[data-nid]") || !d.open) return;
  var id = d.dataset.nid; if (!+id || sudah[id]) return; sudah[id] = 1; post("/api/berita/baca", {id: +id});
}, true);
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-nwx]"); if (!b) return;
  var id = b.dataset.nwx, k = "tk_nwx"; var s = {}; try { s = JSON.parse(localStorage.getItem(k) || "{}"); } catch (z) {}
  if (!s[id]) { s[id] = 1; try { localStorage.setItem(k, JSON.stringify(s)); } catch (z) {} post("/api/berita/baca", {id: +id, v: 1}); }
  b.textContent = "Terima kasih"; b.disabled = true;
});
/* Spanduk darurat */
function spanduk() {
  var b = (window.BERITA || []).filter(function (x) { return x.tingkat === "darurat"; })[0], el = $("nw-dar");
  var tutup = ""; try { tutup = localStorage.getItem("tk_dar") || ""; } catch (z) {}
  if (!b || window.S === "adm" || String(b.id) + ":" + (b.ubah || b.waktu) === tutup) { if (el) el.remove(); return; }
  if (el && el.dataset.k === String(b.id)) return;
  if (el) el.remove();
  el = D.createElement("div"); el.id = "nw-dar"; el.className = "nw-dar"; el.dataset.k = String(b.id); el.setAttribute("role", "alert");
  el.innerHTML = '<b>' + E(b.kategori || "Info") + ":</b> <span>" + E(b.judul) + '</span><button type="button" class="nw-x" aria-label="Tutup pengumuman">&times;</button>';
  el.onclick = function (ev) {
    if (ev.target.closest(".nw-x")) { try { localStorage.setItem("tk_dar", b.id + ":" + (b.ubah || b.waktu)); } catch (z) {} el.remove(); return; }
    var n = D.querySelector('details.news[data-nid="' + b.id + '"]'); if (n) { n.open = true; n.scrollIntoView({behavior: "smooth", block: "center"}); }
  };
  D.body.appendChild(el);
}
setInterval(spanduk, 2500); setTimeout(spanduk, 1500);
})();
