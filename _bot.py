"""Otak chatbot lintas kanal (WhatsApp Cloud API dan Telegram). Murni fungsi: menerima teks, mengembalikan balasan teks.
Urutan jawaban: sapaan/menu, KBLI (kode atau kata), jam dan kontak, aturan 'Kata cari chatbot', pencarian loket, lalu KBLI untuk kata usaha.
Tidak meminta data pribadi, tidak menyimpan isi pesan selain kutipan pendek anonim (ditangani app.py)."""
import json
import os
import re
import urllib.request

STOP = set("apa yang dan di ke dari untuk saya mau ingin cara bagaimana gimana tolong mohon info syarat bikin buat urus mengurus izin usaha kbli loket nib itu ini ada bisa kah dong ya min kak pak bu".split())
SAPA = re.compile(r"^\s*(/start|halo|hallo|hai|hi|p|assalamualaikum|assalamu'?alaikum|selamat\s+(pagi|siang|sore|malam)|menu|help|bantuan|mulai)\b", re.I)
# kata sehari-hari -> awalan judul KBLI 2025 (hanya untuk urutan hasil)
BOOST = [(r"warung|warteg|rumah makan|restoran|nasi|bakso|soto|angkringan", r"^AKTIVITAS PENYEDIAAN MAKANAN DI BANGUNAN"), (r"kopi|kafe|cafe|kedai|minuman|boba|jus", r"^AKTIVITAS (RUMAH MINUM|KEDAI MINUMAN|PENYEDIAAN MINUMAN)"),
         (r"katering|catering|jasa boga", r"^AKTIVITAS (JASA BOGA|PENYEDIAAN JASA BOGA)"), (r"online|olshop|dropship|marketplace", r"^(PLATFORM DIGITAL INTERMEDIASI PERDAGANGAN ECERAN|JASA INTERMEDIASI PERDAGANGAN ECERAN)"),
         (r"laundry|binatu", r"^AKTIVITAS PENCUCIAN DAN PEMBERSIHAN PRODUK TEKSTIL"), (r"salon|barber|pangkas", r"^AKTIVITAS PENATAAN DAN PANGKAS RAMBUT"), (r"bengkel|servis mobil", r"^REPARASI MOBIL"),
         (r"bengkel motor|servis motor", r"^REPARASI DAN PERAWATAN SEPEDA MOTOR"), (r"kos|kost|homestay|penginapan", r"^AKTIVITAS (RUMAH TINGGAL SEWA|PENYEDIAAN AKOMODASI JANGKA PENDEK)"), (r"konveksi|jahit|garmen", r"^INDUSTRI (PAKAIAN JADI|PENJAHITAN)"),
         (r"baju|pakaian|fashion", r"^PERDAGANGAN ECERAN PAKAIAN"), (r"sepatu|sandal", r"^PERDAGANGAN ECERAN SEPATU"), (r"sablon|percetakan|cetak", r"^PENCETAKAN"), (r"apotek", r"^PERDAGANGAN ECERAN SEDIAAN FARMASI"),
         (r"klinik", r"^AKTIVITAS KLINIK"), (r"bimbel|bimbingan belajar", r"^PENDIDIKAN BIMBINGAN BELAJAR"), (r"gym|fitness", r"^FASILITAS PUSAT KEBUGARAN"), (r"travel|tour|wisata", r"^AKTIVITAS (AGEN|BIRO) PERJALANAN"),
         (r"kurir|ekspedisi", r"^AKTIVITAS KURIR"), (r"aplikasi|software|website", r"^AKTIVITAS (PEMROGRAMAN|PENGEMBANGAN APLIKASI)|^AKTIVITAS JASA TEKNOLOGI INFORMASI"), (r"fotografi|foto", r"^AKTIVITAS FOTOGRAFI"),
         (r"kelontong|sembako|minimarket", r"^PERDAGANGAN ECERAN BERBAGAI MACAM BARANG YANG UTAMANYA MAKANAN")]
LOKET_SYN = {"pajak": "pajak bapenda", "pbb": "pajak bapenda", "tanah": "pertanahan", "sertifikat": "pertanahan", "skck": "polrestabes", "narkoba": "bnn", "paket": "pos", "air": "pdam", "kerja": "tenaga kerja ketenagakerjaan",
             "cerai": "pengadilan agama", "nikah": "pengadilan agama", "sehat": "bpjs kesehatan", "pensiun": "bpjs ketenagakerjaan", "tilang": "kejaksaan", "pbg": "simbg", "imb": "simbg", "slf": "simbg", "reklame": "reklame"}
_KB = {"rows": None}


def tok(s):
    return [w for w in re.findall(r"[a-z0-9]+", str(s).lower()) if len(w) > 1]


def kbli_file():
    if _KB["rows"] is None:
        try:
            p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "kbli-2025.json")
            with open(p, encoding="utf-8") as f:
                _KB["rows"] = json.load(f).get("rows", [])
        except Exception:
            _KB["rows"] = []
    return _KB["rows"]


def cari_kbli(q, rows, n=3):
    q = q.lower()
    t = [w for w in tok(q) if w not in STOP]
    if not t:
        return []
    bo = [re.compile(p) for k, p in BOOST if re.search(k, q)]
    out = []
    for r in rows:
        ju = r[1].lower()
        s = sum(4 for w in t if w in ju) + sum(1 for w in t if w in (r[2] or "").lower()[:600])
        if any(p.search(r[1].upper()) for p in bo):
            s += 9
        if s >= 4:
            if re.match(r"^(industri |perdagangan besar|aktivitas penunjang)", ju) and not re.search(r"industri|pabrik|besar|grosir|mesin", q):
                s -= 3
            out.append((s, r))
    out.sort(key=lambda x: -x[0])
    return [r for s, r in out[:n]]


def kalimat1(u, maks=160):
    s = re.sub(r"\s+", " ", str(u or "")).strip()
    s = re.sub(r"^(kelompok|subgolongan|golongan|kategori) ini (juga )?mencakup\s*", "", s, flags=re.I)
    s = (re.split(r"(?<=[.;])\s", s) or [""])[0]
    return s if len(s) <= maks else s[:maks - 1].rstrip() + "…"


def fmt_kbli(rs, q):
    if not rs:
        return ""
    o = ["*Kode KBLI 2025 yang mungkin cocok* untuk \"%s\":" % q[:40]]
    for r in rs:
        o.append("\n• *%s* %s\n  %s" % (r[0], r[1].capitalize() if r[1].isupper() else r[1], kalimat1(r[2])))
    o.append("\nKode akhir dan tingkat risiko ditetapkan di OSS (oss.go.id). Tanyakan syarat terbaru ke loket Takok.")
    return "\n".join(o)


def cari_loket(q, loket, label, n=3):
    z = re.search(r"zona\s*(\d)", q.lower())
    t = [w for w in tok(q) if w not in STOP and not (z and w == "zona")]
    if not t and not z:
        return []
    ex = list(t)
    for w in t:
        ex += tok(LOKET_SYN.get(w, ""))
    out = []
    for e in loket:
        if z and e.get("zona") != "Zona " + z.group(1):
            continue
        nm, hay = e["nama"].lower(), (e["nama"] + " " + e.get("uraian", "") + " " + e.get("sistem", "")).lower()
        s = sum(6 if w in nm else 2 if w in hay else 0 for w in t) + sum(4 for w in ex[len(t):] if w in nm)
        if z and not t:
            s = 1
        if s >= (1 if z and not t else 4):
            out.append((s, e))
    out.sort(key=lambda x: -x[0])
    return [e for s, e in out[:n]]


def fmt_loket(es, label):
    if not es:
        return ""
    o = ["*Loket / instansi yang sesuai:*"]
    for e in es:
        o.append("\n• *%s*%s\n  %s" % (label("%s_%s" % (e["lokasi"], e["no"])), " (%s)" % e["zona"] if e.get("zona") else "", kalimat1(e.get("uraian"), 130)))
    return "\n".join(o)


def jawab(teks, c):
    """c: dict(idx, loket, label, lokasi(list dict), cfg, kbli(list), situs). Kembalian: (balasan, terjawab:bool)."""
    t = re.sub(r"\s+", " ", str(teks or "")).strip()[:500]
    situs, cfg = c.get("situs", ""), c.get("cfg", {})
    menu = ("Halo! 👋 Saya *Asisten Takok* Pelayanan Suroboyo.\n\nKetik:\n• *KBLI warung kopi* → cari kode KBLI 2025\n• *Loket pajak* → cari loket/instansi (bisa juga *zona 4*)\n• *Jam* → jam layanan & kontak\n• atau langsung tanya, mis. *syarat NIB*" +
            ("\n\nBuka aplikasi: " + situs if situs else ""))
    if not t:
        return menu, True
    if SAPA.match(t) and len(t) < 40:
        return menu, True
    rows = c.get("kbli") or kbli_file()
    if re.fullmatch(r"(kbli\s*)?\d{5}", t.lower()):
        k = re.sub(r"\D", "", t)
        r = next((x for x in rows if x[0] == k), None)
        if r:
            return "*KBLI %s* %s\n\n%s\n\nKode akhir dan tingkat risiko ditetapkan di OSS (oss.go.id)." % (r[0], r[1], re.sub(r"\s+", " ", r[2] or "")[:700]), True
        return "Kode %s tidak ada di data KBLI 2025 kami. Cek ulang angkanya, atau tulis kegiatan usahanya (mis. *KBLI bengkel motor*)." % k, False
    if re.match(r"^(jam|alamat|kontak|lokasi|telepon|telp|wa)\b", t.lower()):
        o = ["*Lokasi layanan Takok:*"]
        for L in c.get("lokasi", [])[:8]:
            o.append("\n• *%s*%s%s%s" % (L["nama"], "\n  " + L["alamat"] if L.get("alamat") else "", "\n  Jam: " + L["jam"] if L.get("jam") else "", "\n  Telp: " + L["telp"] if L.get("telp") else ""))
        if cfg.get("jam"):
            o.append("\nJam layanan umum: " + str(cfg["jam"]))
        if cfg.get("wa"):
            o.append("WhatsApp: " + str(cfg["wa"]))
        return "\n".join(o)[:1600], True
    kb = re.match(r"^kbli\s+(.+)", t, re.I)
    if kb:
        r = fmt_kbli(cari_kbli(kb.group(1), rows), kb.group(1))
        return (r, True) if r else ("Belum ketemu KBLI untuk \"%s\". Coba kata lain, misalnya jenis barang/jasanya." % kb.group(1)[:40], False)
    lk = re.match(r"^(loket|instansi|zona)\s*(.*)", t, re.I)
    if lk:
        q = t if lk.group(1).lower() == "zona" else lk.group(2)
        r = fmt_loket(cari_loket(q, c["loket"], c["label"]), c["label"])
        if r:
            return r, True
    rule = None
    try:
        h = c["idx"].cocok(t)
        rule = h[0][0] if h else None
    except Exception:
        rule = None
    if rule:
        j = re.sub(r"\*\*", "*", str(rule.get("j") or "")).strip()
        if not j and rule.get("t"):
            j = "Silakan datang ke " + ", ".join(c["label"](k) for k in rule["t"][:2]) + "."
        if j:
            return j[:1500] + "\n\n_Jawaban otomatis Asisten Takok. Ketik *menu* untuk pilihan lain._", True
    r = fmt_loket(cari_loket(t, c["loket"], c["label"]), c["label"])
    if r:
        return r, True
    if re.search(r"\b(nib|oss)\b", t.lower()):
        return ("*NIB (Nomor Induk Berusaha)* diurus lewat OSS (oss.go.id), gratis.\n\nSiapkan: KTP, NPWP, email dan nomor HP aktif, alamat usaha, dan kode KBLI kegiatan usaha.\n\nBingung kodenya? Ketik *KBLI* lalu kegiatan usaha Anda, mis. *KBLI warung kopi*." + ("\n\nBantuan tatap muka: " + situs if situs else ""), True)
    if re.search(r"usaha|nib|toko|warung|jual|jasa|bengkel|kedai|kafe|salon|laundry|kos|restoran|dagang", t.lower()):
        r = fmt_kbli(cari_kbli(t, rows), t)
        if r:
            return r, True
    return ("Maaf, saya belum menemukan jawabannya 🙏\nPertanyaan Anda sudah dicatat agar pegawai bisa melengkapi jawaban.\n\nCoba kata lain, atau ketik *menu*.%s%s" %
            ("\nJam layanan: " + str(cfg["jam"]) if cfg.get("jam") else "", "\nBuka: " + situs if situs else "")), False


def _post(url, data, headers, timeout=6):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=dict({"Content-Type": "application/json"}, **headers), method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 (URL tetap: graph.facebook.com / api.telegram.org)
        return r.status


def kirim_wa(token, phone_id, ke, teks):
    return _post("https://graph.facebook.com/v21.0/%s/messages" % re.sub(r"\D", "", phone_id), {"messaging_product": "whatsapp", "to": re.sub(r"\D", "", ke), "type": "text", "text": {"preview_url": False, "body": teks[:3500]}}, {"Authorization": "Bearer " + token})


def kirim_tg(token, chat_id, teks):
    return _post("https://api.telegram.org/bot%s/sendMessage" % token, {"chat_id": chat_id, "text": teks[:3500].replace("*", "")}, {})
