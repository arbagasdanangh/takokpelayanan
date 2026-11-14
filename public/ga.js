"use strict";
/* Google Analytics 4 (opsional). Aktif hanya bila ga-config.js berisi ID G-XXXXXXXXXX.
   Menghormati Do Not Track / Global Privacy Control. GA4 tidak menampilkan alamat IP per pengunjung (IP dianonimkan oleh Google);
   untuk IP, lihat panel admin Pengunjung. */
(function () {
  var id = String(window.TAKOK_GA || "").trim();
  var N = navigator;
  if (!/^G-[A-Z0-9]{6,14}$/.test(id)) return;
  if (N.doNotTrack === "1" || window.doNotTrack === "1" || N.globalPrivacyControl === true) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", id, {anonymize_ip: true, page_title: "Takok Pelayanan Suroboyo"});
  var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(".tile,#mbgo,#mbusaha,#mas"); if (t && t.id) gtag("event", "buka_fitur", {fitur: t.id});
  }, true);
})();
