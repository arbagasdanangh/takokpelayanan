"use strict";
/* v53b: Pengingat Izin Berakhir. Membaca Dompet Izin (tk_dompet, hanya di perangkat) dan menampilkan kartu di beranda bila ada izin yang
   berakhir dalam 30 hari atau sudah lewat. Tidak mengirim apa pun ke server; kartu bisa disembunyikan sampai besok. */
(function () {
var D = document, KEY = "tk_dompet", HIDE = "tk_ingat_izin";
function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
function hariIni() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }
function selisih(t) { return Math.round((new Date(t + "T00:00:00Z") - new Date(hariIni() + "T00:00:00Z")) / 864e5); }
var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function lukis() {
  var o = D.getElementById("izg"); if (o) o.remove();
  if (rd(HIDE, "") === hariIni()) return;
  var L = rd(KEY, []).filter(function (w) { return w && w.tgl && /^\d{4}-\d{2}-\d{2}$/.test(w.tgl); }).map(function (w) { return {w: w, d: selisih(w.tgl)}; }).filter(function (x) { return x.d <= 30; }).sort(function (a, b) { return a.d - b.d; });
  if (!L.length) return;
  var nav = D.getElementById("t1"); nav = nav && nav.parentNode; if (!nav || !nav.parentNode) return;
  var lewat = L.some(function (x) { return x.d < 0; });
  var c = D.createElement("section"); c.id = "izg"; c.setAttribute("role", "status");
  c.style.cssText = "margin:0 0 14px;padding:12px 14px;border-radius:16px;border:1px solid " + (lewat ? "#fca5a5" : "#fcd34d") + ";background:" + (lewat ? "#fef2f2" : "#fffbeb") + ";color:#1f2937";
  c.innerHTML = '<b>' + (lewat ? "Ada izin yang sudah berakhir" : "Izin Anda segera berakhir") + '</b><ul style="margin:6px 0 8px;padding-left:18px">' + L.slice(0, 3).map(function (x) {
    return "<li>" + E(x.w.nm) + ": " + (x.d < 0 ? "berakhir " + (-x.d) + " hari lalu" : x.d === 0 ? "berakhir hari ini" : x.d + " hari lagi") + "</li>"; }).join("") + (L.length > 3 ? "<li>dan " + (L.length - 3) + " lainnya</li>" : "") + '</ul>' +
    '<div class="btns"><button type="button" class="send" data-ig="buka">Lihat Dompet Izin</button><button type="button" class="btn" data-ig="besok">Ingatkan besok</button></div>' +
    '<small style="display:block;margin-top:6px;opacity:.75">Cek aturan perpanjangan di SSW Alfa atau OSS. Catatan ini hanya ada di perangkat Anda.</small>';
  nav.parentNode.insertBefore(c, nav);
}
D.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-ig]"); if (!b) return;
  if (b.dataset.ig === "buka") { if (window.Izin) Izin.buka("saya"); }
  else { try { localStorage.setItem(HIDE, JSON.stringify(hariIni())); } catch (x) {} var o = D.getElementById("izg"); if (o) o.remove(); }
});
window.addEventListener("storage", lukis);
D.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-iz=dwadd],[data-iz=dwdel]")) setTimeout(lukis, 400); });
if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", function () { setTimeout(lukis, 300); }); else setTimeout(lukis, 300);
})();
