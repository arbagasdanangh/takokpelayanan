"use strict";
/* Versi 43: kenyamanan percakapan yang panjang.
   - Percakapan (pemohon dan admin): pesan lama dilipat (tombol "Tampilkan N pesan sebelumnya"), tombol "Pesan terbaru" saat menggulir ke atas,
     dan kolom "Cari di percakapan" untuk admin.
   - Kotak masuk admin: daftar dibatasi 30 per halaman dengan tombol "Tampilkan lebih banyak".
   - Asisten Takok: tombol "Pesan terbaru" dan tombol Salin percakapan.
   Semua bekerja di atas tampilan yang sudah ada (tidak mengubah data), lewat pengamat perubahan DOM. */
(function () {
var KEEP_N = 20, FOLD_AT = 26, PAGE = 30;
var open = {}, LIM = PAGE, QS = "", busy = false;
function $(i) { return document.getElementById(i); }
function key(th) { var d = th.closest("[data-n]"); return th.id || (d && d.dataset.n) || "t"; }

/* ---------- percakapan ---------- */
function proses(th) {
  var k = key(th), ms = [].slice.call(th.children).filter(function (c) { return c.classList && c.classList.contains("m"); });
  [].forEach.call(th.querySelectorAll(".cp-more,.cp-bot"), function (n) { n.remove(); });
  var seps = [].slice.call(th.querySelectorAll(".dsep"));
  ms.forEach(function (m) { m.classList.remove("cp-old", "cp-miss"); }); seps.forEach(function (s) { s.classList.remove("cp-old"); });
  if (ms.length > FOLD_AT && !open[k]) {
    var cut = ms.length - KEEP_N, hid = ms.slice(0, cut);
    hid.forEach(function (m) { m.classList.add("cp-old"); });
    var pivot = ms[cut];
    seps.forEach(function (s) { if (s.compareDocumentPosition(pivot) & Node.DOCUMENT_POSITION_FOLLOWING) s.classList.add("cp-old"); });
    var b = document.createElement("button"); b.type = "button"; b.className = "cp-more chip"; b.textContent = "▲ Tampilkan " + cut + " pesan sebelumnya";
    b.onclick = function () { open[k] = 1; busy = true; proses(th); busy = false; th.scrollTop = 0; };
    th.insertBefore(b, th.firstChild);
  }
  /* pencarian (admin) */
  if (th.id === "th2" && QS) {
    var n = 0; ms.forEach(function (m) { var ok = m.textContent.toLowerCase().indexOf(QS) > -1; m.classList.toggle("cp-miss", !ok); m.classList.remove("cp-old"); if (ok) n++; });
    seps.forEach(function (s) { s.classList.add("cp-miss"); });
    var c = $("cp-sc"); if (c) c.textContent = n + " pesan cocok";
  } else if (th.id === "th2") { var c2 = $("cp-sc"); if (c2) c2.textContent = ""; }
  /* tombol pesan terbaru */
  var dn = document.createElement("button"); dn.type = "button"; dn.className = "cp-bot chip"; dn.textContent = "↓ Pesan terbaru"; dn.hidden = true;
  dn.onclick = function () { th.scrollTo({top: th.scrollHeight, behavior: "smooth"}); };
  th.appendChild(dn);
  th.onscroll = function () { dn.hidden = th.scrollHeight - th.scrollTop - th.clientHeight < 120; };
  th.onscroll();
}
function kolomCari() {
  var th = $("th2"); if (!th || $("cp-s")) return;
  var w = document.createElement("div"); w.className = "cp-sb";
  w.innerHTML = '<input class="si" id="cp-s" type="search" placeholder="Cari di percakapan ini..." aria-label="Cari di percakapan" maxlength="60"><small class="sys" id="cp-sc"></small>';
  th.parentNode.insertBefore(w, th);
  $("cp-s").value = QS;
  $("cp-s").oninput = function () { QS = this.value.trim().toLowerCase(); busy = true; proses(th); busy = false; };
}

/* ---------- kotak masuk admin ---------- */
function paging() {
  var al = $("al"); if (!al) return;
  [].forEach.call(al.querySelectorAll(".cp-pg"), function (n) { n.remove(); });
  var it = [].slice.call(al.children).filter(function (c) { return c.classList.contains("tiw"); });
  it.forEach(function (w, i) { w.classList.toggle("cp-old", i >= LIM); });
  if (it.length > LIM) {
    var b = document.createElement("button"); b.type = "button"; b.className = "cp-pg btn";
    b.textContent = "Tampilkan " + Math.min(PAGE, it.length - LIM) + " lagi (" + (it.length - LIM) + " tersisa)";
    b.onclick = function () { LIM += PAGE; busy = true; paging(); busy = false; };
    al.appendChild(b);
  }
}
document.addEventListener("change", function (e) { if (e.target && /^(ls|so|tps|sns)$/.test(e.target.id)) LIM = PAGE; });
document.addEventListener("input", function (e) { if (e.target && e.target.id === "as") LIM = PAGE; });
document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#af")) LIM = PAGE; });

/* ---------- Asisten Takok ---------- */
function bot() {
  var m = $("bm"); if (!m) return;
  if (!$("cp-bd")) {
    var d = document.createElement("button"); d.type = "button"; d.id = "cp-bd"; d.className = "cp-bd"; d.textContent = "↓ Terbaru"; d.hidden = true;
    d.onclick = function () { m.scrollTo({top: m.scrollHeight, behavior: "smooth"}); };
    m.parentNode.insertBefore(d, m.nextSibling);
    m.addEventListener("scroll", function () { d.hidden = m.scrollHeight - m.scrollTop - m.clientHeight < 140; });
  }
  var hb = document.querySelector("#bp .bhb");
  if (hb && !$("b-cp")) {
    var s = document.createElement("button"); s.type = "button"; s.id = "b-cp"; s.title = "Salin percakapan"; s.textContent = "Salin";
    s.onclick = function () {
      var out = [].map.call(m.querySelectorAll(".bmsg:not(.typ)"), function (n) {
        var c = n.cloneNode(true); [].forEach.call(c.querySelectorAll("button,.bsp"), function (x) { x.remove(); });
        var t = (c.textContent || "").replace(/\s+/g, " ").trim(); return t ? (n.classList.contains("u") ? "Saya: " : "Asisten: ") + t : "";
      }).filter(Boolean).join("\n\n");
      var done = function () { if (window.toast) toast("Percakapan disalin."); };
      try { navigator.clipboard.writeText(out).then(done, function () { if (window.toast) toast("Gagal menyalin."); }); } catch (x) { if (window.toast) toast("Gagal menyalin."); }
    };
    hb.insertBefore(s, hb.firstChild);
  }
}

function semua() {
  if (busy) return; busy = true;
  try { [].forEach.call(document.querySelectorAll(".thread"), proses); kolomCari(); paging(); bot(); } catch (x) {}
  busy = false;
}
var t = 0, obs = new MutationObserver(function () { if (busy) return; clearTimeout(t); t = setTimeout(function () { obs.disconnect(); semua(); obs.observe(document.body, {childList: true, subtree: true}); }, 60); });
obs.observe(document.body, {childList: true, subtree: true});
semua();
})();
