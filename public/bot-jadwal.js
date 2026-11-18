"use strict";
/* Chatbot: "ubah jadwal" / "jadwal saya". Perintah /jadwal, /ubah, atau kalimat biasa ("mau ganti jadwal booking"). Memakai dialog Ubah jadwal (ubah.js). */
(function () {
  var D = document;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function tgl(t) { return new Date(t + "T00:00:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"}); }
  var RX_UBAH = /^\/(ubah|jadwal)\b|\b(ubah|ganti|pindah\w*|undur\w*|majukan|reschedule)\b.{0,25}\b(jadwal|booking|kunjungan|janji)\b|\b(jadwal|booking|kunjungan|janji)\b.{0,25}\b(ubah|ganti|pindah\w*|undur\w*|majukan)\b/i;
  function mendatang(L, h) { return L.filter(function (o) { return o.tanggal >= h && ["Terjadwal", "Sudah tiba", "Dipanggil"].indexOf(o.status) > -1; }).sort(function (a, b) { return a.tanggal + a.jam < b.tanggal + b.jam ? -1 : 1; }); }
  async function jawab(I, ubah) {
    if (window.S !== "user") return I.needIn ? I.needIn("Masuk dulu untuk melihat atau mengubah jadwal booking Anda.") : null;
    var j; try { j = await api("/api/booking"); } catch (e) { return I.bot("Jadwal belum bisa dimuat. Coba lagi sebentar."); }
    window.BKL = j.daftar;
    var h = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), L = mendatang(j.daftar, h);
    if (!L.length) return I.bot("Anda belum punya booking yang akan datang. Buka menu Booking untuk memilih tanggal dan jam kunjungan.");
    var bisa = L.filter(function (o) { return o.status === "Terjadwal" && (o.ubah || 0) < 2; });
    var ket = ubah ? (bisa.length ? "Pilih booking yang ingin dipindahkan jadwalnya (maksimal 2 kali ubah per booking):" : "Tidak ada booking yang masih bisa diubah. Booking yang sudah check-in atau sudah 2 kali diubah perlu dibatalkan lalu dibuat ulang.") : "Jadwal kunjungan Anda yang akan datang:";
    var li = L.slice(0, 6).map(function (o) {
      var b = bisa.indexOf(o) > -1 ? ' <button type="button" class="chip" data-ub="' + esc(o.id) + '">Ubah jadwal</button>' : "";
      return "<li><b>" + esc(tgl(o.tanggal)) + ", " + esc(o.jam) + " WIB</b> &middot; " + esc(window.label ? label(o.kunci) : o.kunci) + " &middot; " + esc(o.kode) + " (" + esc(o.status) + ")" + b + "</li>";
    }).join("");
    return I.bot(ket, '<ul class="bul">' + li + "</ul>");
  }
  function pasang() {
    var I = window.BOTI; if (!I || !window.BOTX || window.BOTX.__bj) return false; window.BOTX.__bj = 1;
    var p0 = window.BOTX.pre;
    window.BOTX.pre = function (t, s) {
      if (RX_UBAH.test(String(t || "").trim())) { return jawab(I, !/^\/jadwal\b/i.test(t) || /ubah|ganti|pindah/i.test(t)); }
      return p0 ? p0(t, s) : null;
    };
    return true;
  }
  var n = 0, iv = setInterval(function () { if (pasang() || ++n > 40) clearInterval(iv); }, 500);
})();
