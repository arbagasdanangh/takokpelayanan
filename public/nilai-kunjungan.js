/* Pemohon: menilai kunjungan (bintang 1-5 + komentar singkat) setelah dilayani. */
(function () {
  var D = document, ov = null;
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  var KT = ["", "Sangat kurang", "Kurang", "Cukup", "Baik", "Sangat baik"];
  function tutup() { if (ov) { ov.remove(); ov = null; } }
  D.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov) tutup(); });
  function buka(o) {
    tutup(); var n = 0;
    ov = D.createElement("div"); ov.className = "pn-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Nilai kunjungan");
    ov.innerHTML = '<div class="pn-box nk-box"><b>Bagaimana kunjungan Anda?</b><p class="sys">' + E(o.kode) + ' &middot; ' + E(o.tanggal) + '. Penilaian dan komentar dibaca admin tanpa nama Anda.</p>' +
      '<div class="nk-st" role="radiogroup" aria-label="Nilai">' + [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" role="radio" aria-checked="false" aria-label="' + i + ' bintang, ' + KT[i] + '" data-n="' + i + '">☆</button>'; }).join("") + '</div>' +
      '<p class="sys" id="nk-t" aria-live="polite">Ketuk bintang untuk menilai.</p>' +
      '<label class="sys" for="nk-k">Komentar (boleh dikosongkan)</label><textarea id="nk-k" class="si" maxlength="200" rows="3" placeholder="Apa yang sudah baik atau perlu diperbaiki?" style="width:100%"></textarea>' +
      '<p class="bp-w" id="nk-e" role="alert" hidden></p><div class="btns" style="justify-content:flex-end"><button type="button" class="btn" data-x="1">Nanti</button><button type="button" class="send" id="nk-ok" disabled>Kirim penilaian</button></div></div>';
    D.body.appendChild(ov);
    ov.onclick = async function (e) {
      if (e.target === ov || e.target.closest("[data-x]")) return tutup();
      var s = e.target.closest("[data-n]"), ok = e.target.closest("#nk-ok");
      if (s) {
        n = +s.dataset.n; [].forEach.call(ov.querySelectorAll("[data-n]"), function (b) { var on = +b.dataset.n <= n; b.textContent = on ? "★" : "☆"; b.setAttribute("aria-checked", String(+b.dataset.n === n)); });
        ov.querySelector("#nk-t").textContent = n + " dari 5: " + KT[n]; ov.querySelector("#nk-ok").disabled = false;
      } else if (ok && !ok.disabled) {
        ok.disabled = true; var er = ov.querySelector("#nk-e"); er.hidden = true;
        try { await api("/api/booking/nilai", {id: o.id, nilai: n, komentar: ov.querySelector("#nk-k").value}); tutup(); toast("Terima kasih atas penilaian Anda."); if (window.TKSLOTS) await window.TKSLOTS(); }
        catch (x) { er.hidden = false; er.textContent = x.message || "Gagal mengirim."; ok.disabled = false; }
      }
    };
    var f = ov.querySelector("[data-n]"); if (f) f.focus();
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-nk]"); if (!b) return;
    var o = (window.BKL || []).filter(function (x) { return String(x.id) === b.dataset.nk; })[0]; if (!o) return;
    e.preventDefault(); buka(o);
  });
})();
