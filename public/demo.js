"use strict";
/* Tur Demo: tur otomatis ±90 detik yang menjalankan sendiri fitur-fitur utama Takok (pencarian, Pandu KBLI, Pandu Zona, chatbot, Ruang Main)
   dengan narasi di bawah layar. Mulai lewat tombol "▶ Tur Demo", alamat ?demo=1, atau Alt+D. Jeda/lanjut/mundur/berhenti tersedia. Hanya membaca dan mengisi kolom; tidak mengirim data ke server. */
(function () {
var $ = function (i) { return document.getElementById(i); }, Q = function (s) { return document.querySelector(s); };
var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var I = -1, PLAY = true, TOK = 0, BAR = null, T0 = 0, DUR = 0, TM = null;
function hi(el) { document.querySelectorAll(".dm-hl").forEach(function (x) { x.classList.remove("dm-hl"); }); if (el) { el.classList.add("dm-hl"); try { el.scrollIntoView({block: "center", behavior: "smooth"}); } catch (e) {} } }
function klik(s) { var el = typeof s === "string" ? Q(s) : s; if (el) el.click(); return el; }
async function ketik(el, teks, tok) { if (!el) return; el.focus(); el.value = ""; for (var i = 0; i < teks.length; i++) { if (tok !== TOK) return; el.value += teks[i]; el.dispatchEvent(new Event("input", {bubbles: true})); await sleep(55); } }
async function tutupSemua() {
  klik("[data-kp=tutup]"); klik("[data-kz=tutup]"); try { if (window.TKGM) TKGM.close(); } catch (e) {}
  var bp = $("bp"); if (bp && !bp.hidden) { var bx = bp.querySelector("[data-b=x],#b-x,.bx,button[aria-label*='Tutup']"); if (bx) bx.click(); else document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"})); }
  var q = $("q"); if (q && q.value) { q.value = ""; if (window.setQ) setQ(""); }
  hi(null); window.scrollTo(0, 0);
}
var STEPS = [
  {t: "Selamat datang di Takok", d: "Satu pintu informasi dan konsultasi layanan publik Surabaya: SPP dan MPP, KBLI, zona, chatbot, sampai permainan edukasi. Tur ini ±90 detik.", ms: 6000, run: async function () {}},
  {t: "Cari layanan dengan kata sehari-hari", d: "Cukup ketik kebutuhan, misalnya \"bayar pajak reklame\". Takok mencarikan loket dan instansi yang tepat.", ms: 7000, run: async function (tok) { var q = $("q"); hi(q); await ketik(q, "bayar pajak reklame", tok); if (tok === TOK) { klik("#go"); await sleep(500); hi($("res") || $("list")); } }},
  {t: "Pandu KBLI: dari cerita usaha ke kode", d: "Ketik \"warung kopi\", Takok menyarankan kode dari 1.559 KBLI 2025 dan memperingatkan \"bukan ini?\" dari uraian resmi.", ms: 9000, run: async function (tok) { klik("#t10"); await sleep(500); await ketik($("kpq"), "warung kopi", tok); await sleep(400); if (tok === TOK) { klik("[data-kp=pilih]"); await sleep(300); hi(Q(".kp-c")); } }},
  {t: "Paket Siap Datang", d: "Pilih beberapa KBLI, centang dokumen yang disiapkan, lalu cetak atau simpan PDF untuk dibawa ke loket.", ms: 7000, run: async function (tok) { klik("#t10"); await sleep(500); await ketik($("kpq"), "kedai kopi", tok); await sleep(300); if (tok === TOK) { klik("[data-kp=pilih]"); await sleep(300); hi($("kpp")); } }},
  {t: "Pandu Zona & Instansi", d: "Cari instansi di semua lokasi dan Zona MPP, misalnya \"pajak\" atau \"zona 4\".", ms: 8000, run: async function (tok) { klik("#t11"); await sleep(500); await ketik($("kzq"), "pajak", tok); await sleep(1800); if (tok === TOK) await ketik($("kzq"), "zona 4", tok); hi(Q("#kzr .kp-c")); }},
  {t: "Asisten Takok (chatbot)", d: "Menjawab dari aturan yang dikelola admin, memberi kode KBLI, menyiapkan daftar dokumen, hingga membantu pengaduan. Bisa dicoba dengan suara.", ms: 9000, run: async function (tok) { if (window.openAsisten) openAsisten(); await sleep(1500); if (tok === TOK && window.askAsisten) askAsisten("Saya mau buka usaha baru, urus NIB dan izinnya"); }},
  {t: "Ruang Main: belajar sambil bermain", d: "11 permainan, termasuk Tebak KBLI Harian, Tebak Zona MPP, dan Bangun Usaha 3D. Soal berwaktu, ada Mode santai, dan skor bisa dibagikan.", ms: 7000, run: async function () { klik("#mbgo"); await sleep(600); }},
  {t: "Tebak KBLI Harian", d: "5 soal yang sama untuk semua pengunjung tiap hari, dengan batang waktu dan bonus kecepatan.", ms: 8000, run: async function () { klik("#mbgo"); await sleep(500); klik("[data-g=tebak]"); await sleep(500); klik("[data-tb=rand]"); await sleep(600); hi(Q(".wk")); }},
  {t: "Untuk pegawai dan admin", d: "Asisten Piket menjawab sementara saat pegawai tidak di tempat. Kanal WhatsApp dan Telegram, analitik pertanyaan, editor KBLI/loket/zona, serta Kata cari chatbot ada di panel admin.", ms: 9000, run: async function () {}},
  {t: "Terima kasih", d: "Takok Pelayanan Suroboyo: informasi layanan yang lebih dekat, jelas, dan menyenangkan.", ms: 5000, last: true, run: async function () {}}
];
function ui() {
  var d = $("dm"); if (d) return d; d = document.createElement("div"); d.id = "dm"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Tur demo"); d.setAttribute("aria-live", "polite");
  d.innerHTML = '<div class="dm-p"><i id="dmb"></i></div><div class="dm-h"><b id="dmt"></b><small id="dmn"></small></div><p id="dmd"></p><div class="dm-c"><button type="button" class="btn" data-dm="prev" aria-label="Langkah sebelumnya">◀</button><button type="button" class="btn" data-dm="play" aria-label="Jeda atau lanjut">⏸</button><button type="button" class="btn" data-dm="next" aria-label="Langkah berikutnya">▶</button><button type="button" class="btn" data-dm="stop">Selesai</button></div>';
  document.body.appendChild(d); BAR = $("dmb");
  d.addEventListener("click", function (e) { var b = e.target.closest("[data-dm]"); if (!b) return; var a = b.dataset.dm;
    if (a === "stop") stop(); else if (a === "next") go(I + 1); else if (a === "prev") go(I - 1); else if (a === "play") { PLAY = !PLAY; b.textContent = PLAY ? "⏸" : "▶"; if (PLAY) jadwal(Math.max(1500, DUR - (Date.now() - T0))); else clearTimeout(TM); } });
  return d;
}
function jadwal(ms) { clearTimeout(TM); T0 = Date.now(); DUR = ms; if (BAR) { BAR.style.transition = "none"; BAR.style.width = "0"; void BAR.offsetWidth; BAR.style.transition = "width " + ms + "ms linear"; BAR.style.width = "100%"; } if (PLAY) TM = setTimeout(function () { go(I + 1); }, ms); }
async function go(n) {
  if (n < 0) n = 0; if (n >= STEPS.length) return stop();
  var tok = ++TOK; clearTimeout(TM); I = n; var s = STEPS[n], d = ui();
  $("dmt").textContent = s.t; $("dmd").textContent = s.d; $("dmn").textContent = (n + 1) + "/" + STEPS.length; d.querySelector("[data-dm=stop]").textContent = s.last ? "Selesai" : "Berhenti";
  await tutupSemua(); if (tok !== TOK) return;
  try { await s.run(tok); } catch (e) { console.warn("demo", e); }
  if (tok === TOK) jadwal(s.ms);
}
function mulai() { if ($("dm")) return; I = -1; PLAY = true; ui(); document.body.classList.add("dm-on"); go(0); }
function stop() { TOK++; clearTimeout(TM); var d = $("dm"); if (d) d.remove(); document.body.classList.remove("dm-on"); tutupSemua(); }
document.addEventListener("keydown", function (e) { if (e.isTrusted && e.key === "Escape" && $("dm")) stop(); if (e.altKey && (e.key === "d" || e.key === "D")) { e.preventDefault(); $("dm") ? stop() : mulai(); } });
function tombol() { if ($("dmgo")) return; var b = document.createElement("button"); b.type = "button"; b.id = "dmgo"; b.className = "dm-go"; b.textContent = "▶ Tur Demo"; b.setAttribute("aria-label", "Mulai tur demo otomatis"); b.onclick = mulai; document.body.appendChild(b); }
tombol();
if (/[?&]demo=1\b/.test(location.search)) setTimeout(mulai, 1500);
window.TurDemo = {mulai: mulai, stop: stop};
})();
