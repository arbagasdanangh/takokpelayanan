"use strict";
/* Penghitung pengunjung anonim (ala Histats).
   - Tanpa cookie pelacak dan tanpa layanan pihak ketiga: semuanya lewat /api/app milik situs ini.
   - ID acak disimpan di perangkat (localStorage) hanya untuk membedakan pengunjung baru dan kembali.
     Server menyimpan versi hash-nya saja, tidak pernah alamat IP.
   - Menghormati Do Not Track / Global Privacy Control: bila aktif, tidak ada yang dicatat dan tidak ada ID dibuat.
   - Admin yang sedang masuk dan bot tidak dihitung (diperiksa di server).
   - Menampilkan lencana "online / hari ini / total" di kaki halaman. */
(function () {
  var W = window, D = document, N = navigator;
  var dnt = N.doNotTrack === "1" || W.doNotTrack === "1" || N.msDoNotTrack === "1" || N.globalPrivacyControl === true;
  var LS = null, SS = null;
  try { LS = W.localStorage; LS.getItem("vs_t"); } catch (e) { LS = null; }
  try { SS = W.sessionStorage; SS.getItem("vs_t"); } catch (e) { SS = null; }

  function acak() {
    var a = new Uint8Array(16), s = "";
    try { (W.crypto || W.msCrypto).getRandomValues(a); } catch (e) { for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 16; j++) s += ("0" + a[j].toString(16)).slice(-2);
    return s;
  }
  function rute(r) { return "/api/app?p=" + encodeURIComponent(r); }
  function kirim(r, body) {
    try {
      return fetch(rute(r), {method: "POST", credentials: "same-origin", keepalive: true, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)})
        .then(function (x) { return x.json(); }).catch(function () { return {}; });
    } catch (e) { return Promise.resolve({}); }
  }

  var vid = "", rv = 0, nw = 1, lastPing = Date.now();
  if (!dnt) {
    try { vid = (LS && LS.getItem("vs_id")) || ""; } catch (e) { vid = ""; }
    if (/^[A-Za-z0-9]{16,40}$/.test(vid)) rv = 1;
    else { vid = acak(); try { if (LS) LS.setItem("vs_id", vid); } catch (e) {} }
    try { if (SS && SS.getItem("vs_s")) nw = 0; else if (SS) SS.setItem("vs_s", "1"); } catch (e) {}
  }

  /* ---------- lencana di kaki halaman ---------- */
  var angka = function (n) { return Number(n || 0).toLocaleString("id-ID"); };
  function lencana(j) {
    var f = D.querySelector("footer.foot"); if (!f || !j || j.online == null) return;
    var b = D.getElementById("vs-b");
    if (!b) {
      b = D.createElement("div"); b.id = "vs-b"; b.className = "vs-b"; b.setAttribute("role", "group"); b.setAttribute("aria-label", "Statistik pengunjung");
      var sv = f.querySelector("svg"); if (sv) f.insertBefore(b, sv); else f.appendChild(b);
    }
    var bagian = [["vs-dot", angka(j.online), "online"], ["", angka(j.unik_hari_ini), "pengunjung hari ini"], ["", angka(j.unik_total), "total pengunjung"]];
    b.textContent = "";
    bagian.forEach(function (x) {
      var s = D.createElement("span"), n = D.createElement("b");
      if (x[0]) { var d = D.createElement("i"); d.className = x[0]; d.setAttribute("aria-hidden", "true"); s.appendChild(d); }
      n.textContent = x[1]; s.appendChild(n); s.appendChild(D.createTextNode(" " + x[2]));
      b.appendChild(s);
    });
    b.title = "Tampilan halaman: " + angka(j.hari_ini) + " hari ini, " + angka(j.total) + " total. Statistik anonim, tanpa menyimpan alamat IP.";
  }
  function muatLencana() {
    if (D.visibilityState === "hidden") return;
    fetch(rute("/v/ringkas"), {credentials: "same-origin"}).then(function (x) { return x.ok ? x.json() : null; }).then(lencana).catch(function () {});
  }

  /* ---------- pencatatan ---------- */
  function param(k) { try { return new URLSearchParams(W.location.search).get(k) || ""; } catch (e) { return ""; } }
  function catat() {
    if (dnt) { muatLencana(); return; }
    var b = {vid: vid, nw: nw, rv: rv};
    if (nw) { b.ref = (D.referrer || "").slice(0, 200); b.utm = param("utm_source").slice(0, 30).toLowerCase(); }
    kirim("/v/hit", b).then(muatLencana);
  }
  function jalan(f) { if (W.requestIdleCallback) W.requestIdleCallback(f, {timeout: 2500}); else setTimeout(f, 800); }
  if (D.readyState === "complete") jalan(catat); else W.addEventListener("load", function () { jalan(catat); });

  if (dnt) { setInterval(muatLencana, 120000); return; }

  /* fitur yang dibuka (menu utama, Ruang Main, maskot): hanya kunci tetap yang diterima server */
  D.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest(".tile, #mbgo, #mbusaha, #mas") : null;
    if (t && t.id) kirim("/v/e", {e: t.id});
  }, true);

  /* detak "masih di halaman" tiap 2 menit selama tab terlihat; setelah lama tersembunyi, daftar ulang saat kembali */
  setInterval(function () {
    if (D.visibilityState !== "visible") return;
    lastPing = Date.now(); kirim("/v/ping", {vid: vid, lanjut: 0}); muatLencana();
  }, 120000);
  D.addEventListener("visibilitychange", function () {
    if (D.visibilityState === "visible" && Date.now() - lastPing > 290000) { lastPing = Date.now(); kirim("/v/ping", {vid: vid, lanjut: 1}); muatLencana(); }
  });
})();
