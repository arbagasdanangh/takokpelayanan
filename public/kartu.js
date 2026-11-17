"use strict";
/* Versi 72: Kartu Tiket (PNG berbarcode Code 39) dan Pengingat kalender (.ics) untuk pemohon.
   Kartu hanya memuat nomor tiket, loket, status, tanggal; tanpa nama atau data pribadi. */
(function () {
var $ = function (i) { return document.getElementById(i); };
var P39 = {"0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn",
  N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn"};
/* kembalikan daftar lebar elemen (bar, spasi, bar, ...) dalam satuan modul; wide = 3 */
function code39(teks) {
  var s = "*" + String(teks).toUpperCase().replace(/[^0-9A-Z\-. ]/g, "") + "*", out = [];
  for (var i = 0; i < s.length; i++) { var p = P39[s[i]]; for (var j = 0; j < 9; j++) out.push(p[j] === "w" ? 3 : 1); if (i < s.length - 1) out.push(1); }
  return out;
}
function tgl(ms) { try { return new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"}); } catch (e) { return ""; } }
function bulat(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function gambar(t) {
  var W = 900, H = 520, cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
  var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0e7490"); g.addColorStop(1, "#164e63"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = "#fff"; bulat(c, 28, 28, W - 56, H - 56, 28); c.fill();
  c.fillStyle = "#0e7490"; c.fillRect(28, 28, W - 56, 86); c.fillStyle = "#fff"; c.font = "700 30px system-ui,sans-serif"; c.textBaseline = "middle"; c.fillText("Takok Pelayanan Suroboyo", 60, 62);
  c.font = "500 18px system-ui,sans-serif"; c.fillText("Kartu tiket pertanyaan", 60, 94);
  c.fillStyle = "#64748b"; c.font = "600 18px system-ui,sans-serif"; c.fillText("NOMOR TIKET", 60, 150);
  c.fillStyle = "#0f172a"; c.font = "800 58px ui-monospace,Menlo,monospace"; c.fillText(t.no, 60, 202);
  c.fillStyle = "#64748b"; c.font = "600 18px system-ui,sans-serif"; c.fillText("LOKET", 60, 262); c.fillText("STATUS", 520, 262);
  c.fillStyle = "#0f172a"; c.font = "700 26px system-ui,sans-serif";
  var lk = String((window.label ? label(t.kunci) : t.kunci) || ""); while (c.measureText(lk).width > 420 && lk.length > 4) lk = lk.slice(0, -2); if (lk !== String(window.label ? label(t.kunci) : t.kunci)) lk += "…";
  c.fillText(lk, 60, 296); c.fillText(t.status || "", 520, 296);
  c.fillStyle = "#64748b"; c.font = "500 18px system-ui,sans-serif"; c.fillText("Dibuat " + tgl(t.buka) + (t.n ? " · " + t.n + " pesan" : ""), 60, 336);
  var el = code39(t.no), tot = el.reduce(function (a, b) { return a + b; }, 0), m = Math.max(1, Math.floor(560 / tot)), x = 60, y = 370; c.fillStyle = "#000";
  el.forEach(function (w, i) { if (i % 2 === 0) c.fillRect(x, y, w * m, 70); x += w * m; });
  c.fillStyle = "#64748b"; c.font = "500 16px system-ui,sans-serif"; c.fillText("Tunjukkan kartu ini di loket atau sebutkan nomor tiket saat menghubungi petugas.", 60, 468);
  return cv;
}
function unduh(blob, nama) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
function kartu(no) {
  var t = (window.TKT || []).filter(function (z) { return z.no === no; })[0]; if (!t) return;
  var cv = gambar(t);
  cv.toBlob(function (b) {
    if (!b) { toast("Gagal membuat kartu."); return; }
    var f = null; try { f = new File([b], "kartu-" + no + ".png", {type: "image/png"}); } catch (e) {}
    if (f && navigator.canShare && navigator.canShare({files: [f]}) && /Mobi|Android/i.test(navigator.userAgent)) { navigator.share({files: [f], title: "Kartu tiket " + no}).catch(function () { unduh(b, "kartu-" + no + ".png"); }); return; }
    unduh(b, "kartu-" + no + ".png"); toast("Kartu tiket diunduh.");
  }, "image/png");
}
function z2(n) { return (n < 10 ? "0" : "") + n; }
function utc(d) { return d.getUTCFullYear() + z2(d.getUTCMonth() + 1) + z2(d.getUTCDate()) + "T" + z2(d.getUTCHours()) + z2(d.getUTCMinutes()) + "00Z"; }
function ics(no, jam) {
  var t = (window.TKT || []).filter(function (z) { return z.no === no; })[0]; if (!t) return;
  var d = new Date(Date.now() + jam * 36e5), e = new Date(d.getTime() + 15 * 6e4);
  var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Takok Pelayanan Suroboyo//ID", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", "UID:" + no + "-" + d.getTime() + "@takok", "DTSTAMP:" + utc(new Date()), "DTSTART:" + utc(d), "DTEND:" + utc(e),
    "SUMMARY:Cek balasan tiket " + no, "DESCRIPTION:Buka Takok Pelayanan Suroboyo dan lihat balasan tiket " + no + " (" + String(window.label ? label(t.kunci) : "").replace(/[,;\\\n]/g, " ") + ").", "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY", "DESCRIPTION:Cek balasan tiket " + no, "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  unduh(new Blob([L.join("\r\n") + "\r\n"], {type: "text/calendar"}), "pengingat-" + no + ".ics"); toast("Pengingat diunduh. Buka berkas untuk menambahkannya ke kalender.");
}
function pasang() {
  var host = $("v-my"); if (!host) return;
  [].forEach.call(host.querySelectorAll(".tkcard"), function (c) {
    var act = c.querySelector(".tkact"); if (!act || act.querySelector("[data-kt2]")) return; var no = c.dataset.no; if (!no) return;
    act.insertAdjacentHTML("beforeend", '<button type="button" class="chip" data-kt2="kartu" data-no="' + no + '">🪪 Kartu tiket</button><button type="button" class="chip" data-kt2="ics" data-no="' + no + '">📅 Ingatkan besok</button>');
  });
}
var OB = null, tm = 0;
function jadwal() { clearTimeout(tm); tm = setTimeout(function () { pasang(); if (OB) OB.takeRecords(); }, 60); }
var iv = setInterval(function () { var h = $("v-my"); if (h) { clearInterval(iv); OB = new MutationObserver(jadwal); OB.observe(h, {childList: true, subtree: true}); jadwal(); } }, 300);
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-kt2]"); if (!b) return; e.stopPropagation();
  if (b.dataset.kt2 === "kartu") kartu(b.dataset.no); else ics(b.dataset.no, 24);
}, true);
window.TKKARTU = {code39: code39, gambar: gambar};
})();
