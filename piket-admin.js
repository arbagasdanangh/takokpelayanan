"use strict";
/* Tab admin "Asisten Piket": pengganti pegawai sementara. Saat pegawai tidak di tempat, Asisten Piket menjawab pertanyaan warga
   dari aturan "Kata cari chatbot" dan templat topik (tanpa AI luar). Jawaban diberi label jelas, pegawai tetap melihat percakapan
   sebagai "belum dijawab" untuk ditinjau, dan warga bisa menekan "Minta dijawab pegawai". */
(function () {
var MODE = [["off", "Mati", "Hanya pegawai yang menjawab."], ["langsung", "Pegawai tidak di tempat", "Setiap pertanyaan baru langsung dijawab Asisten Piket. Cocok untuk libur, rapat, atau di luar jam layanan."], ["tunda", "Cadangan", "Asisten Piket menjawab bila pegawai belum membalas dalam beberapa menit. Cocok saat antrean padat."]];
window.aPk = async function (el) {
  var j = await api("/api/admin/piket", {}), c = j.cfg;
  el.innerHTML = '<h2 class="sec">Asisten Piket (pengganti pegawai sementara)</h2>' +
    '<p class="sys">Asisten Piket menjawab pertanyaan warga memakai aturan Kata cari chatbot dan templat topik yang sudah Anda kelola. Semua jawaban diberi label "jawaban otomatis", percakapan tetap muncul sebagai belum dijawab agar pegawai bisa meninjau, dan jawaban beruntun dibatasi 3 kali. Pengaduan dan pesan mendesak hanya dijawab dengan pernyataan diteruskan ke pegawai.</p>' +
    '<div class="card"><div class="kpis"><div class="kpi"><span class="kv">' + j.hari_ini + '</span><span>Jawaban otomatis hari ini</span></div><div class="kpi"><span class="kv">' + j.total + '</span><span>Total jawaban otomatis</span></div></div>' +
    '<h3>Mode</h3><div role="radiogroup" aria-label="Mode Asisten Piket">' + MODE.map(function (m) { return '<label class="card" style="display:block;margin:6px 0;cursor:pointer"><input type="radio" name="pk-m" value="' + m[0] + '"' + (c.mode === m[0] ? " checked" : "") + '> <b>' + m[1] + '</b><div class="sys">' + m[2] + '</div></label>'; }).join("") + '</div>' +
    '<label for="pk-t">Tunggu berapa menit sebelum Asisten Piket menjawab (mode Cadangan)</label><input class="si" id="pk-t" type="number" min="2" max="240" value="' + c.tunggu + '">' +
    '<label for="pk-i">Catatan tambahan di setiap jawaban otomatis (opsional)</label><input class="si" id="pk-i" maxlength="200" placeholder="mis. Layanan tatap muka kembali buka Senin 08.00" value="' + esc(c.info || "") + '">' +
    '<div class="btns"><button type="button" class="send" id="pk-s">Simpan</button></div></div>' +
    '<div class="card"><b>Tips</b><ul><li>Makin lengkap aturan di tab "Kata cari chatbot", makin bagus jawaban Asisten Piket.</li><li>Pesan yang ditandai "Eskalasi" berarti warga meminta dijawab langsung oleh pegawai.</li></ul></div>';
  el.querySelector("#pk-s").onclick = async function () {
    var m = (el.querySelector('input[name="pk-m"]:checked') || {}).value || "off";
    try { await api("/api/admin/pengaturan", {piket_mode: m, piket_tunggu: +el.querySelector("#pk-t").value || 15, piket_info: el.querySelector("#pk-i").value}); if (window.CFG) CFG.piket = m; toast(m === "off" ? "Asisten Piket dimatikan." : "Asisten Piket aktif: " + MODE.filter(function (x) { return x[0] === m; })[0][1] + "."); } catch (x) { toast(x.message); }
  };
};
})();
