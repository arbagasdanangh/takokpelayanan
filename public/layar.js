/* Layar Antrean Pro: /?layar=1[&lokasi=ID]. Publik, hanya nomor antrean dan loket (tanpa nama). */
(function () {
  var qs = new URLSearchParams(location.search);
  if (!qs.has("layar") || qs.get("layar") === "klasik") return;
  var main = document.querySelector("main"); if (main) main.hidden = true;
  var ft = document.querySelector(".foot"); if (ft) ft.hidden = true;
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  var sec = document.createElement("section"); sec.className = "lp"; sec.id = "layar";
  sec.innerHTML = '<div class="lp-h"><b>Antrean Pelayanan</b><div class="lp-ctl"><select id="lps" aria-label="Lokasi"><option value="">Semua lokasi</option></select><button type="button" id="lpu">Aktifkan suara</button><button type="button" id="lpf">Layar penuh</button></div><div class="lp-jam" id="lpj"></div></div>' +
    '<div class="lp-main"><div class="lp-now" id="lpn" aria-live="assertive"><small>Sedang dipanggil</small><div class="lp-no" id="lpno">&ndash;</div><div class="lp-lk" id="lplk">Menunggu panggilan</div><ul class="lp-rec" id="lprec"></ul></div><div class="lp-side" id="lpside"></div></div>' +
    '<div class="lp-tk" id="lpk" hidden></div><div class="lp-ft"><span id="lpt"></span><span class="lp-qr" id="lpq"></span></div>';
  document.body.appendChild(sec);
  document.title = "Layar Antrean";
  var lok = qs.get("lokasi") || "", suara = false, last = "", ctx = null;
  function $(i) { return document.getElementById(i); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  var HR = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  function jam() {
    var d = new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
    $("lpj").innerHTML = pad(d.getHours()) + "." + pad(d.getMinutes()) + "<small>" + HR[d.getDay()] + ", " + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + " WIB</small>";
  }
  jam(); setInterval(jam, 15000);
  function tiker(j) {
    var a = (j.dinamis && j.dinamis.pengumuman) || {}, t = String(a.teks || "").trim(), h = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), b = $("lpk");
    if (!t || (a.sampai && h > a.sampai)) { b.hidden = true; b.innerHTML = ""; return; }
    var x = (a.tipe === "penting" ? "PENTING: " : "INFO: ") + t;
    b.hidden = false; b.className = "lp-tk" + (a.tipe === "penting" ? " pen" : ""); b.innerHTML = '<div class="lp-tr" style="animation-duration:' + Math.max(15, Math.round(x.length * 0.28)) + 's"><span>' + e(x) + '</span><span aria-hidden="true">' + e(x) + '</span></div>';
  }
  function info() { return (window.api ? api("/api/info") : Promise.reject()).then(function (j) {
    tiker(j);
    if ($("lps").options.length > 1) return;
    $("lps").innerHTML = '<option value="">Semua lokasi</option>' + j.lokasi.map(function (l) { return '<option value="' + e(l.id) + '">' + e(l.nama) + '</option>'; }).join("");
    $("lps").value = lok;
  }).catch(function () {}); }
  info(); setInterval(info, 300000);
  $("lps").onchange = function () { lok = this.value; last = ""; muat(); };
  $("lpf").onclick = function () { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (x) {} };
  $("lpu").onclick = function () { suara = !suara; this.textContent = suara ? "Suara aktif" : "Aktifkan suara"; if (suara) { chime(); ucap("Suara antrean aktif"); } };
  function chime() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        var t = ctx.currentTime + i * 0.25; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.start(t); o.stop(t + 0.32);
      });
    } catch (x) {}
  }
  function ucap(t) { try { if (!window.speechSynthesis) return; var u = new SpeechSynthesisUtterance(t); u.lang = "id-ID"; u.rate = 0.9; speechSynthesis.speak(u); } catch (x) {} }
  function eja(k) { return k.replace(/-/g, " ").split("").join(" "); }
  function est(l) { return l.menunggu ? "± " + l.est_menit + " menit" : "tidak ada antrean"; }
  async function muat() {
    try {
      var j = await api("/api/layar/ringkas" + (lok ? "?lokasi=" + encodeURIComponent(lok) : "")), t = j.terbaru || [];
      if (t.length) {
        var n = t[0], key = n.kode + "|" + n.waktu;
        $("lpno").textContent = n.kode; $("lplk").textContent = n.loket;
        $("lprec").innerHTML = t.slice(1, 7).map(function (x) { return "<li>" + e(x.kode) + " &middot; " + e(x.loket) + "</li>"; }).join("");
        if (last && key !== last) {
          var b = $("lpn"); b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash");
          if (suara) { chime(); setTimeout(function () { ucap("Nomor antrean " + eja(n.kode) + ", silakan menuju " + n.loket); }, 700); }
        }
        last = key;
      } else { $("lpno").textContent = "–"; $("lplk").textContent = "Menunggu panggilan"; $("lprec").innerHTML = ""; }
      var L = j.loket || [];
      $("lpside").innerHTML = L.length ? L.map(function (l) {
        return '<div class="lp-lo"><b>' + e(l.loket) + '</b><span class="sd">' + e(l.sedang || "–") + '</span><div class="mt"><span>Menunggu: <b>' + l.menunggu + '</b></span><span>Berikut: <b>' + e(l.berikut || "–") + '</b></span><span><em>' + e(est(l)) + '</em></span>' + (l.rata_layan ? '<span>Rata layanan ' + l.rata_layan + ' mnt</span>' : '') + '</div></div>';
      }).join("") : '<div class="lp-kos">Belum ada antrean hari ini.</div>';
      $("lpt").textContent = "Total menunggu " + (j.total ? j.total.menunggu : 0) + " · selesai hari ini " + (j.total ? j.total.selesai : 0) + " · diperbarui otomatis";
    } catch (x) {}
  }
  if (window.TKQR) { try { $("lpq").innerHTML = TKQR.svg(location.origin + "/", {margin: 1}) + "<span>Pindai untuk<br>buat janji temu</span>"; } catch (x) {} }
  muat(); setInterval(muat, 5000);
})();
