"use strict";
/* Versi 65: Pemberitahuan jawaban admin lewat Telegram atau WhatsApp.
   - Pemohon: kartu "Beri tahu saya" di Percakapan saya (pilih Telegram atau WhatsApp, tautkan, uji kirim).
   - Superadmin: tab "Pemberitahuan jawaban" (saklar, templat WhatsApp, isi pesan, statistik, log).
   Pesan hanya berisi nomor tiket dan ajakan membuka aplikasi; isi jawaban tidak pernah dikirim. */
(function () {
var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
function tgl(ms) { try { return new Date(ms).toLocaleString("id-ID", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}); } catch (e) { return ""; } }

/* ---------- Pemohon ---------- */
var ST = null, busy = false, link = null, obs = null;
async function muat() { try { ST = await api("/api/notif"); } catch (e) { ST = null; } }
function kartu() {
  if (!ST || !ST.aktif || (!ST.ada.tg && !ST.ada.wa)) return "";
  var on = ST.ch, nm = on === "tg" ? "Telegram" : on === "wa" ? "WhatsApp (" + esc2(ST.wa) + ")" : "";
  var h = '<div class="ntf-card" id="ntfc"><div class="ntf-h"><b>🔔 Kabari saya bila admin menjawab</b>' + (on ? '<span class="ntf-on">Aktif: ' + nm + '</span>' : '<span class="ntf-off">Belum aktif</span>') + '</div>' +
    '<p class="sys">Dapat pesan singkat saat jawaban admin sudah ada. Isi jawaban tetap dibaca di aplikasi, jadi data Anda aman.</p><div class="ntf-b">';
  if (ST.ada.tg) h += '<button type="button" class="btn' + (on === "tg" ? " on" : "") + '" data-nt="tg">✈️ Telegram</button>';
  if (ST.ada.wa) h += '<button type="button" class="btn' + (on === "wa" ? " on" : "") + '" data-nt="wa">💬 WhatsApp</button>';
  if (on) h += '<button type="button" class="btn" data-nt="uji">Kirim uji</button><button type="button" class="btn" data-nt="off">Matikan</button>';
  h += '</div>';
  if (link) h += '<div class="ntf-l"><b>Langkah terakhir:</b> buka <a href="' + esc2(link.link) + '" target="_blank" rel="noopener">tautan Telegram ini</a>, tekan <b>Start</b>, lalu kembali ke sini. Kode berlaku 15 menit.</div>';
  return h + '</div>';
}
function pasang() {
  var el = document.getElementById("v-my"); if (!el || el.hidden) return;
  if (el.querySelector("#ntfc") || !ST) return; var k = kartu(); if (!k) return;
  var t = document.createElement("div"); t.innerHTML = k; el.insertBefore(t.firstChild, el.firstChild);
}
var pt = null;
function tunggu() {
  clearInterval(pt); var n = 0;
  pt = setInterval(async function () {
    if (!link || ++n > 220 || !document.getElementById("ntfc")) { clearInterval(pt); return; }
    await muat(); if (ST && ST.tg && ST.ch === "tg") { clearInterval(pt); link = null; toast("Telegram tersambung. Anda akan dikabari."); var c = document.getElementById("ntfc"); if (c) c.remove(); pasang(); }
  }, 4000);
}
async function aksi(a) {
  if (busy) return; busy = true;
  try {
    if (a === "tg") { if (ST.tg) { await api("/api/notif/atur", {ch: "tg"}); link = null; toast("Pemberitahuan Telegram aktif"); } else { link = await api("/api/notif/tautkan", {}); } }
    else if (a === "wa") { await api("/api/notif/atur", {ch: "wa"}); toast("Pemberitahuan WhatsApp aktif untuk nomor akun Anda"); }
    else if (a === "off") { await api("/api/notif/atur", {ch: "off"}); link = null; toast("Pemberitahuan dimatikan"); }
    else if (a === "uji") { await api("/api/notif/uji", {}); toast("Pesan uji terkirim. Cek aplikasi Anda."); }
    await muat();
    if (link) tunggu();
  } catch (e) { toast(e.message || "Gagal"); }
  busy = false; var c = document.getElementById("ntfc"); if (c) c.remove(); pasang();
}
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-nt]"); if (!b || !document.getElementById("ntfc")) return; aksi(b.dataset.nt);
  if (b.dataset.nt === "tg" && ST && ST.tg === false) { /* tautan muncul setelah permintaan selesai */ }
});
function awasi() {
  var el = document.getElementById("v-my"); if (!el || obs) return;
  obs = new MutationObserver(function () { if (!el.hidden && !el.querySelector("#ntfc")) { if (ST) pasang(); else muat().then(pasang); } });
  obs.observe(el, {childList: true});
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", awasi); else awasi();

/* ---------- Superadmin ---------- */
window.aNtf = async function (el) {
  var j = await api("/api/admin/notif", {}), c = j.cfg;
  var siap = function (ok, t) { return '<span class="stp ' + (ok ? "st-ok" : "st-w") + '">' + (ok ? "Siap" : "Belum") + '</span> ' + t; };
  el.innerHTML = '<h2 class="sec">Pemberitahuan jawaban admin</h2><p class="sys">Saat admin menjawab pertanyaan, pemohon yang mengaktifkannya otomatis diberi tahu lewat Telegram atau WhatsApp. Pesan hanya berisi nomor tiket dan ajakan membuka aplikasi, tidak memuat isi jawaban. Maksimal satu pemberitahuan per percakapan tiap 10 menit.</p>' +
    '<div class="card"><label><input type="checkbox" id="nt-on"' + (c.aktif ? " checked" : "") + '> Pemberitahuan otomatis aktif</label>' +
    '<div class="sys" style="margin-top:6px">' + siap(j.env.tg, "Telegram Bot (butuh <code>TG_TOKEN</code> dan <code>TG_SECRET</code>, sama dengan Kanal Telegram)") + '<br>' + siap(j.env.wa, "WhatsApp Cloud API (butuh <code>WA_TOKEN</code> dan <code>WA_PHONE_ID</code>)") + '</div>' +
    '<div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px"><div class="kpi"><b>' + j.n.ok_hari + '</b><span>Terkirim hari ini</span></div><div class="kpi"><b>' + j.n.gagal_hari + '</b><span>Gagal hari ini</span></div><div class="kpi"><b>' + j.pel.tg + '</b><span>Pelanggan Telegram</span></div><div class="kpi"><b>' + j.pel.wa + '</b><span>Pelanggan WhatsApp</span></div></div></div>' +
    '<div class="card"><b>Isi pesan</b><div class="sys">Gunakan {nama}, {tiket}, {loket}, dan {situs}. Maksimal 300 huruf.</div><textarea id="nt-tx" rows="3" maxlength="300" style="width:100%">' + esc2(c.teks) + '</textarea>' +
    '<div class="btns"><button type="button" class="btn" id="nt-reset">Kembalikan bawaan</button></div>' +
    '<b style="display:block;margin-top:10px">Templat WhatsApp (disarankan)</b><div class="sys">WhatsApp hanya mengizinkan pesan bebas dalam 24 jam setelah warga menulis. Agar pemberitahuan sampai kapan pun, buat templat kategori <i>Utility</i> di Meta Business Manager dengan isi mirip: <code>Halo {{1}}, pertanyaan Anda ({{2}}) di {{3}} sudah dijawab admin. Buka aplikasi Takok Pelayanan Suroboyo, menu Tanya, untuk membacanya.</code> Setelah disetujui, isi nama templat di bawah. Kosongkan bila belum punya (pesan biasa dipakai).</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><input id="nt-tpl" placeholder="nama_templat" value="' + esc2(c.tpl) + '" maxlength="60" style="flex:2;min-width:160px"><input id="nt-lg" placeholder="id" value="' + esc2(c.lang) + '" maxlength="8" style="flex:1;min-width:70px"></div>' +
    '<div class="btns"><button type="button" class="send" id="nt-sv">Simpan</button></div></div>' +
    '<div class="card"><b>Pemberitahuan terakhir</b>' + (j.log.length ? '<table class="tb" style="width:100%;font-size:.85rem"><tr><th>Waktu</th><th>Kanal</th><th>Tiket</th><th>Penerima</th><th></th></tr>' + j.log.map(function (x) { return '<tr><td>' + tgl(x.t) + '</td><td>' + (x.ch === "tg" ? "Telegram" : "WhatsApp") + '</td><td>' + esc2(x.tk) + (x.uji ? " (uji)" : "") + '</td><td>' + esc2(x.n || "") + '</td><td>' + (x.ok ? "✔" : '<span title="' + esc2(x.e) + '">✖</span>') + '</td></tr>'; }).join("") + '</table>' : '<div class="empty">Belum ada pemberitahuan.</div>') + '</div>' +
    '<details class="card"><summary><b>Cara kerja untuk warga</b></summary><ol><li>Warga membuka <b>Percakapan saya</b>, memilih Telegram atau WhatsApp pada kartu pemberitahuan.</li><li>Telegram: tekan tautan, lalu <b>Start</b> di bot. WhatsApp: memakai nomor yang didaftarkan di akun mereka.</li><li>Tiap admin menjawab, pesan singkat dikirim otomatis. Warga bisa kirim <code>/stop</code> di Telegram untuk berhenti.</li></ol></details>';
  el.querySelector("#nt-on").onchange = async function () { try { await api("/api/admin/notif/simpan", {aktif: this.checked ? "1" : "0"}); toast(this.checked ? "Pemberitahuan aktif" : "Pemberitahuan dimatikan"); } catch (e) { toast(e.message); } };
  el.querySelector("#nt-reset").onclick = function () { el.querySelector("#nt-tx").value = j.teks_awal; };
  el.querySelector("#nt-sv").onclick = async function () { try { await api("/api/admin/notif/simpan", {teks: el.querySelector("#nt-tx").value, tpl: el.querySelector("#nt-tpl").value.trim(), lang: el.querySelector("#nt-lg").value.trim() || "id"}); toast("Tersimpan"); } catch (e) { toast(e.message); } };
};
})();
