/* Filter tanggal bersama: TKTGL.bar(state) -> HTML; TKTGL.pasang(box, state, onChange); TKTGL.ok(state, ms). Zona WIB. */
(function () {
  function wibIso(n) { return new Date(Date.now() + 7 * 36e5 + (n || 0) * 864e5).toISOString().slice(0, 10); }
  function ms(iso, akhir) { var t = Date.parse(iso + "T00:00:00+07:00"); return akhir ? t + 864e5 : t; }
  var T = {
    baru: function () { return {p: "all", a: "", b: ""}; },
    bar: function (st, id) {
      id = id || "tg" + Math.random().toString(36).slice(2, 7);
      var P = [["all", "Semua"], ["today", "Hari ini"], ["7", "7 hari"], ["30", "30 hari"]];
      return '<div class="tg-bar noprint" data-tg="' + id + '" role="group" aria-label="Filter tanggal">' + P.map(function (x) { return '<button type="button" class="chip" data-tgp="' + x[0] + '" aria-pressed="' + (st.p === x[0]) + '">' + x[1] + "</button>"; }).join("") +
        '<label class="sys">Dari <input class="si" type="date" data-tga value="' + (st.a || "") + '" max="' + wibIso(0) + '"></label><label class="sys">Sampai <input class="si" type="date" data-tgb value="' + (st.b || "") + '" max="' + wibIso(0) + '"></label></div>';
    },
    pasang: function (box, st, onChange) {
      var bar = box.querySelector(".tg-bar"); if (!bar) return;
      function sinkron() {
        [].forEach.call(bar.querySelectorAll("[data-tgp]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.tgp === st.p)); });
        bar.querySelector("[data-tga]").value = st.a || ""; bar.querySelector("[data-tgb]").value = st.b || "";
      }
      bar.onclick = function (e) {
        var b = e.target.closest("[data-tgp]"); if (!b) return;
        var p = b.dataset.tgp; st.p = p;
        if (p === "all") { st.a = st.b = ""; } else if (p === "today") { st.a = st.b = wibIso(0); } else { st.a = wibIso(1 - +p); st.b = wibIso(0); }
        sinkron(); onChange();
      };
      bar.onchange = function (e) {
        if (!e.target.matches("[data-tga],[data-tgb]")) return;
        st.p = "kustom"; st.a = bar.querySelector("[data-tga]").value; st.b = bar.querySelector("[data-tgb]").value;
        if (st.a && st.b && st.a > st.b) { var x = st.a; st.a = st.b; st.b = x; }
        sinkron(); onChange();
      };
    },
    ok: function (st, t) { t = +t || 0; if (st.a && t < ms(st.a)) return false; if (st.b && t >= ms(st.b, true)) return false; return true; },
    aktif: function (st) { return !!(st.a || st.b); },
    ket: function (st) { return st.a || st.b ? (st.a === st.b ? "tanggal " + st.a : (st.a || "…") + " s.d. " + (st.b || "…")) : "semua tanggal"; },
    ms: ms
  };
  window.TKTGL = T;
})();
