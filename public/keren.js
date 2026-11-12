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

/* ---- jam WIB hidup + sapaan personal (di bawah tombol Asisten, tidak menimpa ilustrasi) ---- */
var hero = $(".hero");
if (hero && window.Intl) {
  var live = D.createElement("div"); live.className = "kr-live"; live.setAttribute("role", "status");
  live.innerHTML = '<i aria-hidden="true"></i><b id="kr-clk">--.--.--</b><em>WIB</em>';
  var hb = $("#hb", hero) || $(".heroask", hero), anchor = $(".tag2", hero);
  if (hb && hb.parentNode) hb.parentNode.insertBefore(live, hb.nextSibling); else if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(live, anchor.nextSibling); else hero.appendChild(live);
  var fmt = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short"});
  var clk = $("#kr-clk"), lastMin = -1, HARI = {Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7};
  function jam() {
    if (D.hidden) return;
    var p = {}; fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var hh = +p.hour % 24, mm = +p.minute, wd = HARI[p.weekday] || 1, kerja = wd <= 5;
    clk.textContent = String(hh).padStart(2, "0") + "." + p.minute + "." + p.second;
    if (mm !== lastMin) {
      lastMin = mm; var buka = kerja && hh >= 8 && hh < 14; live.classList.toggle("off", !buka);
      live.title = buka ? "Jam booking berlangsung (Sen\u2013Jum 08.00\u201314.00 WIB)" : "Di luar jam booking (Sen\u2013Jum 08.00\u201314.00 WIB)";
    }
  }
  jam(); setInterval(jam, 1000);
}
/* Sapaan: bila pemohon sudah masuk, baris "Selamat Datang di" menyapa namanya. */
(function () {
  var role = $("#role"), sm = hero && $("small", hero); if (!role || !sm) return; var asli = sm.textContent;
  function sapa() {
    var m = /^Pemohon:\s*(.+)$/.exec((role.textContent || "").trim()), h = +(new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false}).format(new Date())) % 24;
    sm.textContent = m ? "Selamat " + (h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam") + ", " + m[1].split(" ")[0] + "!" : asli;
  }
  sapa(); if (window.MutationObserver) new MutationObserver(sapa).observe(role, {childList: true, characterData: true, subtree: true});
})();


/* ---- Personalisasi: warna aksen + bagikan Takok ---- */
var AK = [["biru", "Biru (bawaan)", "#1a46b5"], ["hijau", "Hijau", "#0f8a5f"], ["ungu", "Ungu", "#6d3fd6"], ["tosca", "Tosca", "#0b7f8f"], ["oranye", "Oranye", "#d9560b"], ["merah", "Merah", "#c8102e"]];
function aksen(k) { if (k === "biru") D.documentElement.removeAttribute("data-aksen"); else D.documentElement.setAttribute("data-aksen", k); try { localStorage.setItem("tk_aksen", k); } catch (e) {} }
window.TKAKSEN = {set: aksen, list: AK.map(function (a) { return a[0]; })};
try { var ak0 = localStorage.getItem("tk_aksen"); if (ak0 && AK.some(function (a) { return a[0] === ak0; })) aksen(ak0); } catch (e) {}
var tools = $(".tools");
if (tools) {
  var pb = D.createElement("button"); pb.type = "button"; pb.className = "btn kr-pb"; pb.id = "kr-pb"; pb.setAttribute("aria-haspopup", "dialog"); pb.setAttribute("aria-expanded", "false"); pb.setAttribute("aria-label", "Personalisasi tampilan"); pb.title = "Warna dan bagikan";
  pb.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 100 18c1.4 0 2-.9 2-1.8 0-1.2-1-1.4-1-2.5 0-.9.7-1.7 1.7-1.7H17a4 4 0 004-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/></svg>';
  tools.appendChild(pb);
  var pop = null;
  function tutupPop() { if (!pop) return; pop.remove(); pop = null; pb.setAttribute("aria-expanded", "false"); D.removeEventListener("keydown", kd, true); D.removeEventListener("pointerdown", pd, true); }
  function kd(e) { if (e.key === "Escape") { tutupPop(); pb.focus(); } }
  function pd(e) { if (pop && !pop.contains(e.target) && e.target !== pb && !pb.contains(e.target)) tutupPop(); }
  pb.onclick = function () {
    if (pop) { tutupPop(); return; }
    var cur = D.documentElement.getAttribute("data-aksen") || "biru";
    pop = D.createElement("div"); pop.className = "kr-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Personalisasi tampilan");
    pop.innerHTML = '<b>Warna tampilan</b><div class="kr-sw">' + AK.map(function (a) { return '<button type="button" class="kr-s' + (a[0] === cur ? " on" : "") + '" data-ak="' + a[0] + '" style="--c:' + a[2] + '" aria-label="' + a[1] + '" aria-pressed="' + (a[0] === cur) + '"></button>'; }).join("") + '</div><button type="button" class="btn" data-kr="share">Bagikan Takok ke teman</button>';
    pop.onclick = function (e) {
      var x = e.target.closest("[data-ak]"), sh = e.target.closest("[data-kr=share]");
      if (x) { aksen(x.dataset.ak); [].forEach.call(pop.querySelectorAll(".kr-s"), function (b) { var on = b === x; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }); }
      else if (sh) {
        var d = {title: "Takok Pelayanan Suroboyo", text: "Cari izin, booking kunjungan, dan tanya layanan publik Surabaya di Takok.", url: location.origin};
        if (navigator.share) navigator.share(d).catch(function () {}); else { try { navigator.clipboard.writeText(d.url).then(function () { if (window.toast) toast("Tautan Takok disalin."); }); } catch (z) { if (window.toast) toast(d.url); } }
        tutupPop();
      }
    };
    tools.style.position = tools.style.position || "relative"; D.body.appendChild(pop);
    var r = pb.getBoundingClientRect(); pop.style.top = (r.bottom + window.scrollY + 8) + "px"; pop.style.left = Math.max(8, Math.min(window.innerWidth - 268, r.right - 260)) + "px";
    pb.setAttribute("aria-expanded", "true"); D.addEventListener("keydown", kd, true); D.addEventListener("pointerdown", pd, true);
    var f = pop.querySelector(".kr-s.on") || pop.querySelector("button"); if (f) f.focus();
  };
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
  if (D.body.classList.contains("adm-on") || window.S === "adm") it = [["Ctrl", "K", "Palet perintah admin"], ["J", "K", "Percakapan berikutnya / sebelumnya"], ["R", "", "Fokus kolom balas"], ["/", "", "Cari percakapan; di kolom balas = balasan cepat"], ["Shift", "N", "Panggil berikutnya (tab Booking)"], ["S", "", "Fokus kolom scan tiket (tab Booking)"], ["?", "", "Lembar pintasan ini"], ["Esc", "", "Tutup jendela"]];
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
