"""Mesin analisis chat Takok (tanpa AI luar, tanpa biaya): klasifikasi topik, sentimen, urgensi,
prioritas, ringkasan percakapan, saran balasan, dan statistik untuk dasbor admin.
Semua fungsi murni (tidak menyentuh Redis) supaya mudah diuji."""
import re
import time
from collections import Counter

TAGS = ["Mendesak", "Tindak lanjut", "Eskalasi", "Menunggu berkas", "Kasus khusus"]

STOP = set("""yang dan di ke dari untuk pada dengan atau ini itu saya aku kami kita anda bapak ibu pak bu mas mbak kak admin
halo hai selamat pagi siang sore malam mohon tolong minta bisa dapat apakah apa bagaimana gimana kapan dimana mana berapa
adalah akan sudah belum sedang masih juga lagi saja aja ya yg dg dgn utk tdk tidak nggak gak ga bukan ada ingin mau
mohon info informasi tanya bertanya kah nya lah pun sih dong deh kok terima kasih makasih trims thanks oleh karena agar
supaya jika kalau bila sebagai antara dalam sama seperti sangat lebih banyak sedikit para kepada tentang soal terkait
sudahkah harus perlu cara caranya bagaimanakah lalu kemudian setelah sebelum hanya cuma bahwa saat ketika buat bikin
untuknya mereka dia ia kamu dulu nanti sekarang hari ini besok kemarin dan lain lainnya mohon maaf maaf permisi assalamualaikum sekali banget bgt sih nih tuh yaa ya mohon bapak ibu""".split())

TOPIK = [
    ("Izin usaha / NIB", r"\b(nib|oss|kbli|siup|tdp|sertifikat standar|izin usaha|perizinan berusaha|npwp usaha|umkm|izin toko)\b"),
    ("Bangunan (PBG/SLF)", r"\b(pbg|imb|slf|simbg|bangunan|gambar teknis|rumah tinggal|ruko|kdb|klb)\b"),
    ("Reklame & IPT", r"\b(reklame|baliho|billboard|ipt|izin pemakaian tanah|retribusi|videotron)\b"),
    ("Kesehatan / SIP", r"\b(sip|str|dokter|bidan|perawat|apoteker|klinik|apotek|praktik|puskesmas)\b"),
    ("Lingkungan", r"\b(amdal|ukl|upl|sppl|limbah|lingkungan|persetujuan lingkungan|dlh)\b"),
    ("Transportasi / Andalalin", r"\b(andalalin|dishub|parkir|angkutan|lalu lintas|trayek|rambu)\b"),
    ("Kependudukan", r"\b(ktp|kk|kartu keluarga|akta|capil|dispenduk|kia|pindah|domisili|nik)\b"),
    ("Pajak / BPJS / instansi MPP", r"\b(pajak|pbb|bphtb|bpjs|skck|polisi|pengadilan|cerai|bpn|sertifikat tanah|pdam|kartu kuning|npwp)\b"),
    ("Status permohonan", r"\b(status|sampai mana|progres|proses|diproses|nomor (permohonan|registrasi|berkas)|tracking|sudah jadi|kapan (selesai|jadi))\b"),
    ("Syarat & dokumen", r"\b(syarat|persyaratan|dokumen|berkas|lampiran|formulir|fotokopi|legalisir|surat kuasa)\b"),
    ("Biaya & pembayaran", r"\b(biaya|tarif|bayar|pembayaran|tagihan|gratis|mahal|denda|virtual account|va)\b"),
    ("Antrean & booking", r"\b(antre|antrean|booking|jadwal|tiket|kuota|jam buka|jam layanan|datang)\b"),
    ("Kendala aplikasi", r"\b(error|eror|gagal|tidak bisa (masuk|login|buka|upload)|lupa (pin|password|kata sandi)|otp|login|website|situs|aplikasi|loading|bug)\b"),
    ("Pengaduan / keluhan", r"\b(komplain|keluhan|mengeluh|pengaduan|pungli|lambat|kecewa|tidak puas|ditelantarkan|dipersulit|oknum|marah|parah|buruk)\b"),
]
TOPIK_RE = [(n, re.compile(p, re.I)) for n, p in TOPIK]

NEG_RE = re.compile(r"\b(kecewa|lambat|lama sekali|lama banget|kelamaan|tidak jelas|gak jelas|nggak jelas|ribet|susah|sulit|mahal|marah|parah|buruk|pungli|bingung|gagal|error|mengeluh|komplain|keluhan|tidak bisa|gak bisa|nggak bisa|belum juga|berkali-kali|dipersulit|ditelantarkan|tidak puas|menyebalkan|capek|kesal|mengecewakan|tidak ada kabar|belum ada kabar|dioper|dilempar|rugi|ditolak)\b", re.I)
POS_RE = re.compile(r"\b(terima kasih|makasih|mantap|bagus|membantu|puas|cepat|sip|oke|ok|top|keren|mudah|jelas|siap|sukses|luar biasa)\b", re.I)
URG2_RE = re.compile(r"\b(darurat|mendesak|urgent|segera|secepatnya|batas waktu|deadline|hari ini juga|jatuh tempo|berkali-kali|belum ada kabar|tidak ada kabar|ditelantarkan|pungli|sudah (\d+|beberapa|seminggu|sebulan|dua|tiga) ?(hari|minggu|bulan)?)\b", re.I)
URG1_RE = re.compile(r"\b(besok|minggu ini|kapan|cepat|lama|belum|tolong|penting|butuh|harap)\b", re.I)
PII_RE = re.compile(r"(\d{6,}|[\w.+-]+@[\w-]+\.[\w.]+)")

TEMPLAT_TOPIK = {
    "Status permohonan": "Halo {nama}, untuk mengecek status permohonan Anda, mohon informasikan nomor permohonan/registrasi. Status juga bisa dilihat di menu Status Permohonan. Kami akan cek dan kabari secepatnya.",
    "Syarat & dokumen": "Halo {nama}, persyaratan untuk layanan {loket} dapat kami jelaskan. Mohon sebutkan jenis izin/layanan yang diurus agar daftar dokumennya tepat. Berkas asli diserahkan langsung di loket.",
    "Biaya & pembayaran": "Halo {nama}, informasi biaya/tarif bergantung pada jenis layanan dan ketentuan yang berlaku. Mohon sebutkan jenis layanannya, kami bantu jelaskan rinciannya.",
    "Antrean & booking": "Halo {nama}, Anda dapat memesan jadwal lewat menu Booking Kunjungan, lalu menekan 'Saya sudah tiba' saat tiba di lokasi (dibuka 60 menit sebelum jam booking).",
    "Kendala aplikasi": "Halo {nama}, mohon maaf atas kendalanya. Mohon jelaskan langkah yang dilakukan dan pesan kesalahan yang muncul. Jangan kirim PIN atau kode OTP kepada siapa pun.",
    "Pengaduan / keluhan": "Halo {nama}, mohon maaf atas ketidaknyamanan yang Anda alami. Pengaduan Anda kami catat dan teruskan ke petugas terkait. Mohon lengkapi kronologi dan tanggal kejadiannya.",
    "Izin usaha / NIB": "Halo {nama}, untuk izin usaha/NIB, pengajuan dilakukan melalui OSS. Mohon sebutkan jenis usaha atau KBLI-nya agar kami arahkan persyaratan yang sesuai.",
    "Bangunan (PBG/SLF)": "Halo {nama}, pengajuan PBG/SLF dilakukan melalui SIMBG. Mohon sebutkan fungsi bangunan dan luasnya agar kami bantu arahkan dokumen yang diperlukan.",
}
TEMPLAT_UMUM = "Halo {nama}, terima kasih sudah menghubungi {loket}. Pertanyaan Anda sudah kami terima dan sedang kami proses."


def tok(s):
    out = []
    for w in re.sub(r"[^a-z0-9 ]", " ", str(s).lower()).split():
        if len(w) > 5 and w.endswith("nya"):
            w = w[:-3]
        if len(w) > 2 and w not in STOP and not w.isdigit():
            out.append(w)
    return out


def analyze(text):
    """Analisis satu pesan pemohon. topik: daftar nama topik; senti: -1/0/1; urg: 0-2."""
    t = str(text or "")
    topik = [n for n, rx in TOPIK_RE if rx.search(t)]
    neg, pos = len(NEG_RE.findall(t)), len(POS_RE.findall(t))
    if "?" in t and not neg:
        pos = max(0, pos - 1)
    senti = -1 if neg > pos else (1 if pos > neg else 0)
    urg = 2 if URG2_RE.search(t) else (1 if URG1_RE.search(t) else 0)
    if senti < 0 and urg == 1 and neg >= 2:
        urg = 2
    return {"topik": topik[:3], "senti": senti, "urg": urg, "neg": neg}


def meta_gabung(m, a):
    """Perbarui agregat percakapan (disimpan di Redis, hash tmeta) dengan hasil analyze() pesan baru."""
    m = dict(m or {})
    t = dict(m.get("t") or {})
    for x in a["topik"]:
        t[x] = t.get(x, 0) + 1
    m.update({"t": t, "n": m.get("n", 0) + 1, "s": m.get("s", 0) + a["senti"], "sm": min(m.get("sm", 0), a["senti"]),
              "u": max(m.get("u", 0), a["urg"]), "sl": a["senti"], "ul": a["urg"]})
    return m


def meta_ringkas(m):
    """Bentuk ringan untuk daftar kotak masuk."""
    m = m or {}
    t = m.get("t") or {}
    top = sorted(t.items(), key=lambda x: -x[1])[:2]
    return {"topik": [x[0] for x in top], "senti": m.get("sl", 0), "urg": max(m.get("ul", 0), 1 if m.get("u", 0) >= 2 else 0), "n": m.get("n", 0)}


def skor_prioritas(meta, tag, pend, lu_ms, now_ms):
    """0-100. Makin tinggi makin perlu ditangani dulu."""
    if not pend:
        return 0
    jam = max(0, (now_ms - lu_ms) / 3600000.0) if lu_ms else 0
    s = 20 + meta.get("urg", 0) * 22 + (14 if meta.get("senti", 0) < 0 else 0) + min(30, jam * 2.5)
    tg = (tag or {}).get("tags") or []
    s += 25 if "Mendesak" in tg else 0
    s += 15 if "Eskalasi" in tg else 0
    return int(min(100, round(s)))


def pesan_pemohon(msgs):
    return [m for m in msgs if m.get("dari") == "pemohon"]


def hitung_respons(msgs, now_ms):
    """Daftar waktu balas (menit) tiap giliran pertanyaan, dan waktu mulai menunggu bila belum dibalas."""
    ms = sorted(msgs, key=lambda m: m.get("waktu", 0))
    mulai, hasil = None, []
    for m in ms:
        if m.get("dari") == "pemohon":
            if mulai is None:
                mulai = m["waktu"]
        elif mulai is not None:
            hasil.append((m["waktu"] - mulai) / 60000.0)
            mulai = None
    return hasil, mulai


def pot(s, n):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + "…"


def durasi(menit):
    menit = int(round(menit))
    if menit < 1:
        return "kurang dari 1 menit"
    if menit < 60:
        return "%d menit" % menit
    if menit < 1440:
        return "%d jam %d menit" % (menit // 60, menit % 60) if menit % 60 else "%d jam" % (menit // 60)
    return "%d hari %d jam" % (menit // 1440, (menit % 1440) // 60)


SENTI_NAMA = {-1: "Negatif", 0: "Netral", 1: "Positif"}
URG_NAMA = {0: "Biasa", 1: "Cukup mendesak", 2: "Mendesak"}


def ringkas_percakapan(msgs, now_ms, tgl_fmt):
    """Ringkasan ekstraktif satu percakapan untuk panel admin."""
    ms = sorted(msgs, key=lambda m: m.get("waktu", 0))
    pm = pesan_pemohon(ms)
    if not ms:
        return {"baris": [], "topik": [], "senti": 0, "urg": 0, "tunggu_menit": None, "n_pemohon": 0, "n_admin": 0, "respons_menit": None}
    an = [analyze(m["isi"]) for m in pm]
    c = Counter(x for a in an for x in a["topik"])
    topik = [k for k, _ in c.most_common(3)]
    senti = an[-1]["senti"] if an else 0
    urg = max([a["urg"] for a in an] or [0])
    resp, mulai = hitung_respons(ms, now_ms)
    n_a = len(ms) - len(pm)
    baris = []
    if pm:
        baris.append("Pertanyaan awal: " + pot(pm[0]["isi"], 140))
    baris.append("%d pesan (%d pemohon, %d admin) sejak %s." % (len(ms), len(pm), n_a, tgl_fmt(ms[0]["waktu"])))
    if topik:
        baris.append("Topik terdeteksi: " + ", ".join(topik) + ".")
    baris.append("Nada pemohon terakhir: %s. Tingkat urgensi: %s." % (SENTI_NAMA[senti].lower(), URG_NAMA[urg].lower()))
    tunggu = None
    if mulai is not None:
        tunggu = (now_ms - mulai) / 60000.0
        baris.append("Menunggu balasan admin selama %s." % durasi(tunggu))
        if len(pm) > 1:
            baris.append("Permintaan terbaru: " + pot(pm[-1]["isi"], 140))
    elif resp:
        baris.append("Terakhir dibalas admin dalam %s." % durasi(resp[-1]))
    return {"baris": baris, "topik": topik, "senti": senti, "urg": urg, "tunggu_menit": tunggu, "n_pemohon": len(pm), "n_admin": n_a,
            "respons_menit": round(sum(resp) / len(resp), 1) if resp else None}


def cocok_kata(teks, aturan):
    """Cocokkan teks dengan aturan 'Kata cari chatbot' (sama seperti di chatbot: batas kata)."""
    s = re.sub(r"\s+", " ", str(teks).lower())
    out = []
    for r in aturan:
        if not isinstance(r, dict):
            continue
        for w in r.get("k") or []:
            if w and re.search(r"(^|[^a-z0-9])" + re.escape(w) + r"($|[^a-z0-9])", s):
                out.append((r, w))
                break
    return out


def saran_balasan(msgs, aturan, nama, loket_label, label_fn):
    """Saran balasan: jawaban dari aturan kata cari admin yang cocok, lalu templat topik."""
    pm = pesan_pemohon(sorted(msgs, key=lambda m: m.get("waktu", 0)))
    if not pm:
        return []
    teks = " ".join(m["isi"] for m in pm[-2:])
    out, seen = [], set()
    for r, w in cocok_kata(teks, aturan)[:3]:
        j = re.sub(r"\*\*", "", str(r.get("j") or "")).strip()
        if not j and r.get("t"):
            j = "Silakan datang ke " + ", ".join(label_fn(k) for k in r["t"][:2]) + "."
        if j and j not in seen:
            seen.add(j)
            out.append({"sumber": "Aturan chatbot (“%s”)" % w, "teks": pot(j, 780)})
    a = analyze(teks)
    for tp in a["topik"]:
        tpl = TEMPLAT_TOPIK.get(tp)
        if tpl:
            out.append({"sumber": "Templat topik: " + tp, "teks": tpl.format(nama=nama.split(" ")[0] if nama else "", loket=loket_label)})
            break
    if len(out) < 3:
        out.append({"sumber": "Templat umum", "teks": TEMPLAT_UMUM.format(nama=nama.split(" ")[0] if nama else "", loket=loket_label)})
    return out[:4]


# ---------------- Statistik dasbor ----------------
def _wib(ms):
    return time.gmtime(ms / 1000.0 + 7 * 3600)


def _jaccard(a, b):
    return len(a & b) / float(len(a | b)) if a and b else 0.0


HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]


def statistik(rows, now_ms, hari=30, label_fn=lambda k: k):
    """rows: [{pid, kunci, nama, hp, msgs:[{dari,isi,waktu}], nilai:int|None, selesai:int}]"""
    hari = hari if hari in (7, 14, 30, 90) else 30
    batas = now_ms - hari * 86400000
    heat = [[0] * 24 for _ in range(7)]
    harian = {}
    n_hari = min(hari, 30)
    for i in range(n_hari - 1, -1, -1):
        t = _wib(now_ms - i * 86400000)
        harian[time.strftime("%Y-%m-%d", t)] = {"d": time.strftime("%d/%m", t), "u": 0, "a": 0, "wd": t.tm_wday}
    topik_c, topik_neg = Counter(), Counter()
    senti_c = Counter()
    resp_all, resp_loket = [], {}
    loket = {}
    terms, bigr = Counter(), Counter()
    kal = []
    pend = []
    aktif_pem = Counter()
    nilai_d = Counter()
    n_msg_u = n_msg_a = n_thread = n_selesai = 0
    trend_now = trend_prev = 0
    for r in rows:
        ms = sorted(r["msgs"], key=lambda m: m.get("waktu", 0))
        if not ms:
            continue
        pm_in = [m for m in ms if m["dari"] == "pemohon" and m["waktu"] >= batas]
        any_in = [m for m in ms if m["waktu"] >= batas]
        resp, mulai = hitung_respons(ms, now_ms)
        if mulai is not None:
            pend.append({"pid": r["pid"], "kunci": r["kunci"], "nama": r["nama"], "loket": label_fn(r["kunci"]), "menit": round((now_ms - mulai) / 60000.0, 1),
                         "teks": pot([m for m in ms if m["dari"] == "pemohon"][-1]["isi"], 110)})
        if not any_in:
            continue
        n_thread += 1
        if r.get("selesai"):
            n_selesai += 1
        L = loket.setdefault(r["kunci"], {"kunci": r["kunci"], "nama": label_fn(r["kunci"]), "thread": 0, "pesan": 0, "neg": 0, "pend": 0, "resp": [], "nilai": []})
        L["thread"] += 1
        if mulai is not None:
            L["pend"] += 1
        if r.get("nilai"):
            L["nilai"].append(r["nilai"])
            nilai_d[r["nilai"]] += 1
        # respons dihitung untuk balasan yang terjadi di dalam rentang
        t0 = None
        for m in ms:
            if m["dari"] == "pemohon":
                t0 = m["waktu"] if t0 is None else t0
            elif t0 is not None:
                if m["waktu"] >= batas:
                    x = (m["waktu"] - t0) / 60000.0
                    resp_all.append(x)
                    L["resp"].append(x)
                t0 = None
        for m in any_in:
            k = time.strftime("%Y-%m-%d", _wib(m["waktu"]))
            if m["dari"] == "pemohon":
                n_msg_u += 1
                L["pesan"] += 1
                aktif_pem[(r["pid"], r["nama"])] += 1
                t = _wib(m["waktu"])
                heat[t.tm_wday][t.tm_hour] += 1
                if k in harian:
                    harian[k]["u"] += 1
                if m["waktu"] >= now_ms - 7 * 86400000:
                    trend_now += 1
                elif m["waktu"] >= now_ms - 14 * 86400000:
                    trend_prev += 1
            else:
                n_msg_a += 1
                if k in harian:
                    harian[k]["a"] += 1
        for m in pm_in:
            a = analyze(m["isi"])
            senti_c[a["senti"]] += 1
            tps = a["topik"][:1] or ["Lainnya"]
            for tp in tps:
                topik_c[tp] += 1
                if a["senti"] < 0:
                    topik_neg[tp] += 1
            if a["senti"] < 0:
                L["neg"] += 1
            tk = tok(m["isi"])
            terms.update(set(tk))
            bigr.update(set(zip(tk, tk[1:])))
            if len(m["isi"]) >= 10 and len(set(tk)) >= 2:
                kal.append((set(tk), m["isi"], tps[0]))
    # klaster pertanyaan berulang
    klaster = []
    for ts, teks, tp in kal[:400]:
        for c in klaster:
            if _jaccard(ts, c["ts"]) >= 0.5:
                c["n"] += 1
                c["ts"] |= ts
                if len(teks) < len(c["contoh"]):
                    c["contoh"] = teks
                break
        else:
            klaster.append({"ts": set(ts), "n": 1, "contoh": teks, "topik": tp})
    faq = sorted([c for c in klaster if c["n"] >= 2], key=lambda c: -c["n"])[:8]
    faq = [{"contoh": pot(c["contoh"], 130), "n": c["n"], "topik": c["topik"], "kata": sorted(c["ts"], key=lambda w: -terms.get(w, 0))[:4]} for c in faq]

    def med(a):
        a = sorted(a)
        return a[len(a) // 2] if a else None

    def p90(a):
        a = sorted(a)
        return a[min(len(a) - 1, int(len(a) * 0.9))] if a else None
    rs = resp_all
    kpi = {"thread": n_thread, "pesan_pemohon": n_msg_u, "pesan_admin": n_msg_a, "selesai": n_selesai, "menunggu": len(pend),
           "median_menit": med(rs), "p90_menit": p90(rs), "rata_menit": round(sum(rs) / len(rs), 1) if rs else None,
           "sla1": round(100.0 * sum(1 for x in rs if x <= 60) / len(rs)) if rs else None,
           "sla24": round(100.0 * sum(1 for x in rs if x <= 1440) / len(rs)) if rs else None,
           "csat": round(sum(k * v for k, v in nilai_d.items()) / float(sum(nilai_d.values())), 2) if nilai_d else None, "n_nilai": sum(nilai_d.values()),
           "trend_pct": round(100.0 * (trend_now - trend_prev) / trend_prev) if trend_prev else None}
    umur = {"<1 jam": 0, "1-4 jam": 0, "4-24 jam": 0, ">24 jam": 0}
    for p in pend:
        m = p["menit"]
        umur["<1 jam" if m < 60 else "1-4 jam" if m < 240 else "4-24 jam" if m < 1440 else ">24 jam"] += 1
    pend.sort(key=lambda p: -p["menit"])
    topik_l = [{"topik": k, "n": v, "neg": topik_neg.get(k, 0)} for k, v in topik_c.most_common(12)]
    loket_l = []
    for L in loket.values():
        loket_l.append({"kunci": L["kunci"], "nama": L["nama"], "thread": L["thread"], "pesan": L["pesan"], "pend": L["pend"],
                        "neg_pct": round(100.0 * L["neg"] / L["pesan"]) if L["pesan"] else 0, "resp": round(med(L["resp"]), 1) if L["resp"] else None,
                        "nilai": round(sum(L["nilai"]) / float(len(L["nilai"])), 2) if L["nilai"] else None})
    loket_l.sort(key=lambda x: -x["pesan"])
    # insight otomatis
    ins = []
    tot = sum(sum(r) for r in heat)
    if tot >= 5:
        jam_c = [sum(heat[d][h] for d in range(7)) for h in range(24)]
        hari_c = [sum(r) for r in heat]
        jm, hm = max(range(24), key=lambda h: jam_c[h]), max(range(7), key=lambda d: hari_c[d])
        ins.append({"ikon": "⏰", "teks": "Chat paling ramai pukul %02d.00-%02d.00 WIB dan pada hari %s. Jadwalkan petugas jaga pada waktu itu." % (jm, (jm + 1) % 24, HARI[hm])})
    if kpi["median_menit"] is not None:
        s = "Waktu balas tengah (median) %s; %d%% dibalas dalam 1 jam, %d%% dalam 24 jam." % (durasi(kpi["median_menit"]), kpi["sla1"], kpi["sla24"])
        ins.append({"ikon": "⚡", "teks": s, "nada": "baik" if kpi["sla1"] >= 70 else ("sedang" if kpi["sla1"] >= 40 else "buruk")})
    if umur[">24 jam"]:
        ins.append({"ikon": "⚠️", "teks": "%d percakapan menunggu lebih dari 24 jam. Tangani lebih dulu." % umur[">24 jam"], "nada": "buruk"})
    if topik_l:
        t0 = topik_l[0]
        ins.append({"ikon": "\U0001f3f7️", "teks": "Topik terbanyak: %s (%d%% dari pesan)." % (t0["topik"], round(100.0 * t0["n"] / max(1, n_msg_u)))})
    bad = [t for t in topik_l if t["n"] >= 3 and t["neg"] / float(t["n"]) >= 0.3 and t["topik"] != "Lainnya"]
    if bad:
        b = max(bad, key=lambda t: t["neg"] / float(t["n"]))
        ins.append({"ikon": "\U0001f62c", "teks": "Topik “%s” paling banyak bernada keluhan (%d%%). Periksa alur layanannya." % (b["topik"], round(100.0 * b["neg"] / b["n"])), "nada": "buruk"})
    if kpi["trend_pct"] is not None and abs(kpi["trend_pct"]) >= 15:
        ins.append({"ikon": "\U0001f4c8" if kpi["trend_pct"] > 0 else "\U0001f4c9", "teks": "Pesan pemohon 7 hari terakhir %s %d%% dibanding 7 hari sebelumnya." % ("naik" if kpi["trend_pct"] > 0 else "turun", abs(kpi["trend_pct"]))})
    if faq and faq[0]["n"] >= 3:
        ins.append({"ikon": "\U0001f4a1", "teks": "Pertanyaan serupa muncul %d kali: “%s”. Jadikan aturan Kata cari chatbot agar terjawab otomatis." % (faq[0]["n"], faq[0]["contoh"])})
    if kpi["csat"] is not None and kpi["n_nilai"] >= 3:
        ins.append({"ikon": "⭐", "teks": "Kepuasan jawaban admin rata-rata %.1f/5 dari %d penilaian." % (kpi["csat"], kpi["n_nilai"]), "nada": "baik" if kpi["csat"] >= 4 else ("sedang" if kpi["csat"] >= 3 else "buruk")})
    if loket_l and loket_l[0]["pesan"] >= 3:
        ins.append({"ikon": "\U0001f4cd", "teks": "Loket paling banyak ditanya: %s (%d pesan)." % (loket_l[0]["nama"], loket_l[0]["pesan"])})
    return {"hari": hari, "kpi": kpi, "harian": [dict(v, tgl=k) for k, v in sorted(harian.items())], "heat": heat,
            "topik": topik_l, "senti": {"neg": senti_c[-1], "net": senti_c[0], "pos": senti_c[1]},
            "loket": loket_l[:12], "umur": umur, "menunggu": pend[:10],
            "kata": [{"k": k, "n": v} for k, v in terms.most_common(20)],
            "frasa": [{"k": " ".join(k), "n": v} for k, v in bigr.most_common(30) if v >= 2][:10],
            "faq": faq, "nilai": {str(i): nilai_d.get(i, 0) for i in range(1, 6)},
            "aktif": [{"nama": n, "pid": p, "n": c} for (p, n), c in aktif_pem.most_common(5)], "insight": ins}
