"""Pengamanan masukan (XSS, injeksi) dan indikasi biro jasa/calo. Murni logika, tanpa akses jaringan."""
import html
import re
import urllib.parse

# Karakter kendali tak terlihat (zero-width, pengubah arah teks) yang dipakai untuk menyamarkan teks atau memalsukan tampilan.
_TAK_TERLIHAT = re.compile("[​-‏‪-‮⁠-⁤⁦-⁩﻿]")


def bersih(s):
    return _TAK_TERLIHAT.sub("", s)


def _normal(s):
    """Bentuk yang diperiksa: HTML/URL di-decode (maks. 2 putaran) agar penyamaran seperti &lt;script&gt; atau %3Cscript tetap terdeteksi."""
    t = str(s)
    for _ in range(2):
        u = html.unescape(urllib.parse.unquote(t))
        if u == t:
            break
        t = u
    return bersih(t)


_POLA = [
    ("XSS", re.compile(r"<\s*/?\s*(script|iframe|object|embed|svg|math|link|meta|base|style|img|video|audio|body|form|input|details|marquee)\b", re.I)),
    ("XSS", re.compile(r"(java|vb)script\s*:|data\s*:\s*text/html|\bon[a-z]{3,20}\s*=\s*['\"`a-z(]", re.I)),
    ("XSS", re.compile(r"expression\s*\(|document\s*\.\s*(cookie|domain|write)|window\s*\.\s*location|\beval\s*\(", re.I)),
    ("SQL injection", re.compile(r"\bunion\b[\s\S]{0,30}\bselect\b|\b(or|and)\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+|;\s*(drop|delete|insert|update|alter|truncate)\s+\w+|information_schema|\bsleep\s*\(\s*\d|'\s*(or|and)\s*'", re.I)),
    ("Redis/NoSQL", re.compile(r"\$(where|ne|gt|lt|regex|eval|function)\b|[\r\n]\s*(hset|hget|hdel|del|flushall|flushdb|eval|config|set|keys|rpush|lpush)\b", re.I)),
    ("Perintah/template", re.compile(r"[;&|]\s*(rm|curl|wget|bash|sh|nc|cat|chmod|python|powershell)\b|\$\(|\{\{[\s\S]*\}\}|\$\{[\s\S]*\}|<%|%>", re.I)),
    ("Path traversal", re.compile(r"\.\.[/\\]|/etc/passwd|file://|%2e%2e", re.I)),
]


def serangan(teks):
    """Label jenis serangan bila teks berpola kode/perintah berbahaya; kosong bila wajar."""
    t = _normal(teks)
    for label, p in _POLA:
        if p.search(t):
            return label
    return ""


# ---------------- Indikasi biro jasa / calo ----------------
# (pola, bobot, label). Bobot besar = ajakan pembayaran di luar ketentuan.
_KATA_BJ = [
    (re.compile(r"uang pelicin|pelicin|amplop|suap|sogok|gratifikasi|uang lelah|jalur (cepat|belakang|khusus)|orang dalam|bayar (lebih|ekstra|extra)|tembus (cepat|langsung)", re.I), 4, "ajakan bayaran/jalur tidak resmi"),
    (re.compile(r"biro jasa|jasa (urus|pengurusan)|\bcalo\b|makelar|perantara|tarif jasa|biaya jasa|ongkos urus|terima beres|jasa titip", re.I), 2, "menyebut jasa pengurusan berbayar"),
    (re.compile(r"rekening|\bnorek\b|transfer ke|\bdp\b dulu|bayar di muka|fee (sebesar|rp|\d)", re.I), 2, "menyebut rekening/fee"),
    (re.compile(r"atas nama (klien|pelanggan|customer|bos|orang lain)|(klien|pelanggan|customer) (saya|kami)|titip berkas|surat kuasa|dikuasakan|mengurus (untuk|punya) (banyak|orang)", re.I), 1, "mengurus untuk pihak lain"),
]


def bj_kata(teks):
    """[(bobot, label, cuplikan)] untuk pesan yang memuat tanda-tanda biro jasa."""
    t = bersih(str(teks))
    out = []
    for p, w, lab in _KATA_BJ:
        m = p.search(t)
        if m:
            out.append((w, lab, t[max(0, m.start() - 30): m.end() + 40].replace("\n", " ")[:120]))
    return out


def tingkat(skor):
    return "tinggi" if skor >= 6 else "pantau" if skor >= 3 else "aman"


def hitung_bj(bk30, pmh30, akun_ip, umur_hari, kata, kep_beda):
    """Skor indikasi biro jasa dari perilaku. kata = {label: [bobot, jumlah]} dari pesan pemohon.
    Hasil bukan putusan: hanya membantu admin memeriksa akun yang pola pakainya tidak lazim bagi pemohon perorangan."""
    s, al = 0, []
    if bk30 >= 10:
        s += 2; al.append("%d booking dalam 30 hari" % bk30)
    elif bk30 >= 6:
        s += 1; al.append("%d booking dalam 30 hari" % bk30)
    if pmh30 >= 10:
        s += 2; al.append("%d permohonan dalam 30 hari" % pmh30)
    elif pmh30 >= 5:
        s += 1; al.append("%d permohonan dalam 30 hari" % pmh30)
    if kep_beda >= 6 and bk30 >= 6:
        s += 1; al.append("%d keperluan berbeda-beda" % kep_beda)
    if akun_ip >= 6:
        s += 2; al.append("%d akun dari jaringan yang sama" % akun_ip)
    elif akun_ip >= 3:
        s += 1; al.append("%d akun dari jaringan yang sama" % akun_ip)
    if umur_hari is not None and umur_hari <= 2 and bk30 >= 4:
        s += 1; al.append("akun baru langsung banyak booking")
    for lab, (w, n) in kata.items():
        s += min(w * n, w * 2); al.append("%s (%dx di chat)" % (lab, n))
    return s, al
