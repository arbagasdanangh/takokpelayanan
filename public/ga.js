"use strict";
/* Google Analytics / tag Google (opsional). Aktif hanya bila ga-config.js berisi ID "G-XXXXXXXXXX" (Analytics) atau "GTM-XXXXXXX" (tag Google).
   Menghormati Do Not Track / Global Privacy Control. Google tidak menampilkan alamat IP per pengunjung;
   untuk IP, lihat panel admin Pengunjung. */
(function () {
  var id = String(window.TAKOK_GA || "").trim();
  var N = navigator;
  if (!/^(G-[A-Z0-9]{6,14}|GTM-[A-Z0-9]{5,10})$/.test(id)) return;
  if (N.doNotTrack === "1" || window.doNotTrack === "1" || N.globalPrivacyControl === true) return;
  var gtm = id.indexOf("GTM-") === 0;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  var s = document.createElement("script"); s.async = true;
  if (gtm) {
    window.dataLayer.push({"gtm.start": Date.now(), event: "gtm.js"});
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id);
  } else {
    gtag("js", new Date());
    gtag("config", id, {anonymize_ip: true, page_title: "Takok Pelayanan Suroboyo"});
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  }
  document.head.appendChild(s);
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(".tile,#mbgo,#mbusaha,#mas"); if (!t || !t.id) return;
    if (gtm) window.dataLayer.push({event: "buka_fitur", fitur: t.id}); else gtag("event", "buka_fitur", {fitur: t.id});
  }, true);
})();
