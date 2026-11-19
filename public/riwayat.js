"use strict";
/* Versi 91 — Pemohon: "Riwayat Saya". Satu linimasa untuk tiket, permohonan, dan booking dengan filter jenis + tanggal, ringkasan, dan unduh CSV. */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var TG = window.TKTGL ? TKTGL.baru() : {}, JN = "all", DATA = [];
  var NAMA = {tiket: "Tiket", pmh: "Permohonan", bk: "Booking"}, IKON = {tiket: "🎫", pmh: "📄", bk: "📅"};
  function lbl(k) { try { return window.label ? label(k) : String(k); } catch (e) { return String(k); } }
  function wib(t) { return new Date(t).toLocaleString("id-ID", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}); }
  function hari(t) { return new Date(t).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}); }
  function kunci(t) { return new Date(t + 7 * 36e5).toISOString().slice(0, 10); }

  function kumpul(pmh, bk) {
    var L = [];
    (window.TKT || []).forEach(function (t) { L.push({j: "tiket", t: +t.buka || 0, h: "Tiket " + t.no, s: lbl(t.kunci) + " · " + (t.n || 0) + " pesan", st: t.status}); });
    (pmh || []).forEach(function (o) { L.push({j: "pmh", t: +(o.ubah || o.dibuat) || 0, h: o.jenis, s: "No. " + (o.nomor || "-"), st: o.status}); });
    (bk || []).forEach(function (o) {
      var t = Date.parse(o.tanggal + "T" + (o.jam || "08:00") + ":00+07:00"); if (isNaN(t)) t = TKTGL.ms(o.tanggal);
      L.push({j: "bk", t: t, h: "Kunjungan " + lbl(o.kunci), s: (o.jam || "") + (o.keperluan ? " · " + o.keperluan : ""), st: o.status});
    });
    return L.sort(function (a, b) { return b.t - a.t; });
  }
  function saring() { return DATA.filter(function (x) { return (JN === "all" || x.j === JN) && (!window.TKTGL || TKTGL.ok(TG, x.t)); }); }
  function gambar(el) {
    var D = saring(), n = el.querySelector("#rw-n"), l = el.querySelector("#rw-l"), h = "", g = "";
    n.textContent = (window.TKTGL && TKTGL.aktif(TG) ? "Menampilkan " + D.length + " dari " + DATA.length + " catatan (" + TKTGL.ket(TG) + ")" : DATA.length + " catatan");
    D.forEach(function (x) {
      var k = kunci(x.t); if (k !== g) { g = k; h += '<h3 class="rw-d">' + esc(hari(x.t)) + '</h3>'; }
      h += '<div class="rw-i rw-' + x.j + '"><span class="rw-ic" aria-hidden="true">' + IKON[x.j] + '</span><div><b>' + esc(x.h) + '</b><small>' + esc(NAMA[x.j]) + ' · ' + esc(wib(x.t)) + '</small><span>' + esc(x.s) + '</span></div><em>' + esc(x.st || "") + '</em></div>';
    });
    l.innerHTML = h || '<div class="empty">Tidak ada catatan pada pilihan ini.</div>';
    [].forEach.call(el.querySelectorAll("[data-rwj]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.rwj === JN)); });
  }
  function csv() {
    var D = saring(); if (!D.length) { if (window.toast) toast("Tidak ada data untuk diunduh."); return; }
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var s = "Jenis,Waktu,Judul,Keterangan,Status\n" + D.map(function (x) { return [NAMA[x.j], wib(x.t), x.h, x.s, x.st].map(q).join(","); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + s], {type: "text/csv"})); a.download = "riwayat-saya.csv"; document.body.appendChild(a); a.click(); a.remove();
  }
  window.pRw = async function (el) {
    var pmh = [], bk = [];
    try { pmh = (await api("/api/permohonan")).daftar || []; } catch (e) {}
    try { bk = (await api("/api/booking")).daftar || []; } catch (e) {}
    DATA = kumpul(pmh, bk);
    var c = {tiket: 0, pmh: 0, bk: 0}; DATA.forEach(function (x) { c[x.j]++; });
    el.innerHTML = '<button type="button" class="btn" data-pn="">&larr; Kembali ke beranda</button><h2 class="sec">Riwayat Saya</h2><p class="sys">Semua tiket, permohonan, dan booking Anda dalam satu linimasa. Pilih tanggal agar daftar tidak terlalu panjang.</p>' +
      (DATA.length ? '<div class="hint" role="group" aria-label="Jenis catatan">' + [["all", "Semua (" + DATA.length + ")"], ["tiket", "🎫 Tiket (" + c.tiket + ")"], ["pmh", "📄 Permohonan (" + c.pmh + ")"], ["bk", "📅 Booking (" + c.bk + ")"]].map(function (x) { return '<button type="button" class="chip" data-rwj="' + x[0] + '" aria-pressed="' + (x[0] === JN) + '">' + x[1] + '</button>'; }).join("") + '</div>' +
        (window.TKTGL ? TKTGL.bar(TG, "rw") : "") + '<div class="btns"><button type="button" class="chip" id="rw-csv">⬇ Unduh CSV</button></div><p class="sys" id="rw-n"></p><div id="rw-l" class="rw-l"></div>'
        : '<div class="empty">Belum ada riwayat. Tiket, permohonan, dan booking Anda akan muncul di sini.</div>');
    if (!DATA.length) return;
    el.onclick = function (e) { var b = e.target.closest("[data-rwj]"); if (b) { JN = b.dataset.rwj; gambar(el); } else if (e.target.closest("#rw-csv")) csv(); };
    if (window.TKTGL) TKTGL.pasang(el, TG, function () { gambar(el); });
    gambar(el);
  };
  var tb = $("t13"); if (tb) tb.onclick = function () { if (window.needLogin && needLogin()) return; if (window.setPN) setPN("rw"); };
})();
