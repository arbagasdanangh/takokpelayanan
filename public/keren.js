"use strict";
/* v48: lapisan tampilan interaktif untuk beranda. Semua murni tampilan dan bisa dimatikan tanpa mengganggu fungsi lain.
   - bilah kemajuan gulir + tombol "ke atas" bercincin
   - jam WIB hidup di hero + keterangan jam booking
   - pita info berjalan (tips layanan)
   - ubin menu: cahaya mengikuti kursor dan miring halus
   - muncul saat digulir (dilewati bila pengguna memilih gerak dikurangi)
   - lembar pintasan keyboard (tekan ?) dan tombol G untuk Ruang Main
   - kode rahasia: ↑ ↑ ↓ ↓ ← → ← → membuka Mode Pahlawan */
(function () {
var D = document, RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
var FINE = !!(window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches);
var $ = function (s, r) { return (r || D).querySelector(s); };
function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }

/* ---- bilah kemajuan + ke atas ---- */
var prog = D.createElement("div"); prog.className = "kr-prog"; prog.setAttribute("aria-hidden", "true"); prog.innerHTML = "<i></i>"; D.body.appendChild(prog);
var up = D.createElement("button"); up.type = "button"; up.className = "kr-up"; up.setAttribute("aria-label", "Kembali ke atas");
var CIR = 2 * Math.PI * 21;
up.innerHTML = '<svg viewBox="0 0 46 46" aria-hidden="true"><circle class="t" cx="23" cy="23" r="21"/><circle class="p" cx="23" cy="23" r="21" stroke-dasharray="' + CIR.toFixed(1) + '" stroke-dashoffset="' + CIR.toFixed(1) + '"/></svg><b aria-hidden="true">&uarr;</b>';
up.onclick = function () { window.scrollTo({top: 0, behavior: RM ? "auto" : "smooth"}); };
D.body.appendChild(up);
var tick = false;
function onScroll() {
  if (tick) return; tick = true;
  requestAnimationFrame(function () {
    tick = false; var h = D.documentElement, max = Math.max(1, h.scrollHeight - h.clientHeight), f = Math.min(1, Math.max(0, (window.scrollY || h.scrollTop) / max));
    prog.firstChild.style.transform = "scaleX(" + f.toFixed(3) + ")"; $(".p", up).style.strokeDashoffset = (CIR * (1 - f)).toFixed(1);
    up.classList.toggle("on", (window.scrollY || h.scrollTop) > 480);
  });
}
window.addEventListener("scroll", onScroll, {passive: true}); window.addEventListener("resize", onScroll); onScroll();

/* ---- jam WIB hidup ---- */
var hero = $(".hero");
if (hero && window.Intl) {
  var live = D.createElement("div"); live.className = "kr-live"; live.setAttribute("role", "status");
  live.innerHTML = '<i aria-hidden="true"></i><b id="kr-clk">--.--.--</b><span>WIB</span><span id="kr-st"></span>';
  var anchor = $(".tag2", hero); if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(live, anchor.nextSibling); else hero.appendChild(live);
  var fmt = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short"});
  var clk = $("#kr-clk"), st = $("#kr-st"), lastMin = -1;
  function jam() {
    if (D.hidden) return;
    var p = {}; fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var hh = +p.hour % 24, mm = +p.minute, wd = p.weekday, kerja = wd !== "Sat" && wd !== "Sun";
    clk.textContent = String(hh).padStart(2, "0") + "." + p.minute + "." + p.second;
    if (mm !== lastMin) {
      lastMin = mm; var buka = kerja && hh >= 8 && hh < 14;
      live.classList.toggle("off", !buka);
      st.textContent = buka ? "\u00b7 Jam booking berlangsung" : "\u00b7 Di luar jam booking (Sen\u2013Jum 08.00\u201314.00)";
    }
  }
  jam(); setInterval(jam, 1000);
}

/* ---- pita info ---- */
var menu = $(".menu");
if (menu && menu.parentNode) {
  var T = ["Pesan jadwal lewat Booking Kunjungan supaya tidak antre lama.", "Tekan Ctrl+K untuk Cari izin dari mana saja, dan tekan ? untuk semua pintasan.", "Tekan \u201cSaya sudah tiba\u201d saat sudah di lokasi agar Anda didahulukan.",
    "Jangan kirim NIK lengkap, kata sandi, atau kode OTP lewat chat. Petugas tidak pernah memintanya.", "Setelah dilayani, isi Survei Kepuasan. Penilaian Anda dipakai untuk memperbaiki layanan.", "Bosan menunggu? Coba Suroboyo Rush di Ruang Main dan kejar rekor Anda."];
  var tk = D.createElement("div"); tk.className = "kr-tick"; tk.setAttribute("role", "region"); tk.setAttribute("aria-label", "Tips layanan");
  var row = T.map(function (s) { return "<span>" + s + "</span>"; }).join("");
  tk.innerHTML = "<div>" + row + row.replace(/<span>/g, '<span aria-hidden="true">') + "</div>";
  if (RM) { tk.firstChild.style.width = "auto"; tk.firstChild.style.flexWrap = "wrap"; }
  menu.parentNode.insertBefore(tk, menu.nextSibling);
}

/* ---- ubin: cahaya + miring ---- */
if (FINE) {
  var cur = null;
  D.addEventListener("pointermove", function (e) {
    var el = e.target.closest && e.target.closest(".tile,.gc,.mainbn");
    if (cur && cur !== el) { cur.classList.remove("kr-hov"); if (cur.classList.contains("tile")) cur.style.transform = ""; cur = null; }
    if (!el) return; var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    el.classList.add("kr-hov"); el.style.setProperty("--mx", x + "px"); el.style.setProperty("--my", y + "px"); cur = el;
    if (el.classList.contains("tile") && !RM) { var rx = ((y / r.height) - 0.5) * -8, ry = ((x / r.width) - 0.5) * 8; el.style.transform = "perspective(500px) rotateX(" + rx.toFixed(1) + "deg) rotateY(" + ry.toFixed(1) + "deg) translateY(-2px)"; }
  }, {passive: true});
  D.addEventListener("pointerleave", function () { if (cur) { cur.classList.remove("kr-hov"); cur.style.transform = ""; cur = null; } });
}

/* ---- muncul saat digulir ---- */
if (!RM && "IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("kr-in"); io.unobserve(e.target); } }); }, {rootMargin: "0px 0px -8% 0px", threshold: 0.08});
  [].forEach.call(D.querySelectorAll("#v-cari .steps li, #v-cari .mainbn, #v-cari h2.sec, .foot"), function (el, i) {
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("kr-rv"); el.style.setProperty("--kd", ((i % 3) * 0.08) + "s"); io.observe(el);
  });
}

/* ---- lembar pintasan ---- */
function lembar() {
  if ($(".kr-ov")) return;
  var ov = D.createElement("div"); ov.className = "kr-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Pintasan keyboard");
  var it = [["Ctrl", "K", "Cari izin dan layanan"], ["Alt", "K", "Pencarian cepat"], ["G", "", "Buka Ruang Main"], ["?", "", "Lembar pintasan ini"], ["Esc", "", "Tutup jendela"], ["\u2190 \u2192", "", "Geser jalur di Suroboyo Rush"]];
  ov.innerHTML = '<div class="kr-card"><h2>Pintasan keyboard</h2><dl>' + it.map(function (r) { return "<dt><kbd>" + r[0] + "</kbd>" + (r[1] ? "<kbd>" + r[1] + "</kbd>" : "") + "</dt><dd>" + r[2] + "</dd>"; }).join("") + '</dl><div class="btns"><button type="button" class="send" id="kr-x">Tutup</button></div></div>';
  function x() { ov.remove(); D.removeEventListener("keydown", esc, true); }
  function esc(e) { if (e.key === "Escape") { e.stopPropagation(); x(); } }
  ov.addEventListener("click", function (e) { if (e.target === ov) x(); }); D.addEventListener("keydown", esc, true);
  D.body.appendChild(ov); $("#kr-x", ov).focus(); $("#kr-x", ov).onclick = x;
}
var KON = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"], ki = 0;
D.addEventListener("keydown", function (e) {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "?") { e.preventDefault(); lembar(); return; }
  if ((e.key === "g" || e.key === "G") && !D.querySelector(".kr-ov") && !($("#gm") && !$("#gm").hidden)) { var b = $("#mbgo"); if (b && !D.body.classList.contains("adm-on")) { e.preventDefault(); b.click(); } return; }
  ki = e.key === KON[ki] ? ki + 1 : (e.key === KON[0] ? 1 : 0);
  if (ki === KON.length) {
    ki = 0; var on = D.documentElement.classList.toggle("kr-hero");
    if (on && window.konfeti) window.konfeti(90);
    if (window.toast) toast(on ? "Mode Pahlawan aktif. Merdeka! Ulangi kode untuk mematikan." : "Mode Pahlawan dimatikan.");
  }
});
})();
