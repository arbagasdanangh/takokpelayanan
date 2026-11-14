"""Statistik pengunjung ala Histats untuk Takok (anonim, tanpa cookie pelacak, tanpa menyimpan alamat IP).

Penyimpanan (Upstash Redis), semua kedaluwarsa sendiri:
  vs:d:YYYYMMDD  hash harian (WIB): pv, vis, new, ret, h00..h23, c:<negara>, t:<negara>|<kota>, b:<browser>,
                 o:<OS>, v:<perangkat>, r:<sumber>, e:<fitur>
  vs:u:YYYYMMDD  HyperLogLog pengunjung unik hari itu;  vs:u:all = unik sepanjang masa
  vs:on          zset pengunjung online (skor = detik terakhir terlihat)
  vs:last        50 kunjungan terbaru (tanpa IP, tanpa ID)
  vs:tot         hash total: pv, vis, sejak
ID pengunjung dari browser di-hash (HMAC) sebelum disimpan; HyperLogLog tidak bisa dibaca balik menjadi ID.
"""
import hashlib, hmac, json, re
from urllib.parse import unquote, urlparse

TTL = 400 * 86400
ONLINE = 300          # detik: dianggap online bila terlihat dalam 5 menit terakhir
HARI_MAKS = 90

# Fitur yang boleh dicatat (kunci dari visitor.js). Kunci lain diabaikan agar data tidak bisa dibengkakkan.
FITUR = {
    "t1": "Layanan Publik", "t2": "Informasi Pelayanan", "t3": "Lokasi Pelayanan", "t4": "Percakapan Saya",
    "t5": "Tanya Admin", "t6": "Pengaduan", "t7": "Status Permohonan", "t8": "Booking Kunjungan",
    "t9": "Survei Kepuasan", "t10": "Pandu KBLI", "t11": "Pandu Zona", "t12": "Perizinan Resmi",
    "mbgo": "Ruang Main", "mbusaha": "Animasi Usaha 3D", "mas": "Maskot / Asisten",
}

BOT_RE = re.compile(r"bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python|axios|"
                    r"httpclient|facebookexternalhit|whatsapp/|telegrambot|vercel", re.I)
VID_RE = re.compile(r"^[A-Za-z0-9]{16,40}$")
HOST_RE = re.compile(r"^[a-z0-9]([a-z0-9.-]{0,60}[a-z0-9])?$")
UTM_RE = re.compile(r"^[a-z0-9._-]{1,30}$")

# Sumber populer dikelompokkan agar tabel tidak terpecah (google.co.id, google.com, ...)
SUMBER = [
    (re.compile(r"(^|\.)google\.|(^|\.)googleusercontent\.|android-app://com\.google"), "Google"),
    (re.compile(r"(^|\.)bing\.com$"), "Bing"),
    (re.compile(r"(^|\.)duckduckgo\.com$"), "DuckDuckGo"),
    (re.compile(r"(^|\.)yahoo\."), "Yahoo"),
    (re.compile(r"(^|\.)(facebook|fb)\.com$|(^|\.)fb\.me$|^l\.facebook\.com$"), "Facebook"),
    (re.compile(r"(^|\.)instagram\.com$"), "Instagram"),
    (re.compile(r"(^|\.)(twitter|x)\.com$|^t\.co$"), "X / Twitter"),
    (re.compile(r"(^|\.)tiktok\.com$"), "TikTok"),
    (re.compile(r"(^|\.)youtube\.com$|^youtu\.be$"), "YouTube"),
    (re.compile(r"(^|\.)whatsapp\.com$|^wa\.me$|com\.whatsapp"), "WhatsApp"),
    (re.compile(r"(^|\.)t\.me$|(^|\.)telegram\.(org|me)$|org\.telegram"), "Telegram"),
    (re.compile(r"(^|\.)linkedin\.com$|^lnkd\.in$"), "LinkedIn"),
]


def klasifikasi_ua(ua):
    """(browser, os, perangkat). Perkiraan dari User-Agent; cukup untuk statistik kasar."""
    u = ua or ""
    if re.search(r"FBAN|FBAV|FB_IAB", u):
        br = "Facebook (dalam aplikasi)"
    elif "Instagram" in u:
        br = "Instagram (dalam aplikasi)"
    elif re.search(r"musical_ly|BytedanceWebview|TikTok", u):
        br = "TikTok (dalam aplikasi)"
    elif "Line/" in u:
        br = "LINE (dalam aplikasi)"
    elif re.search(r"EdgA?/|Edg/|EdgiOS", u):
        br = "Edge"
    elif re.search(r"OPR/|Opera|OPT/", u):
        br = "Opera"
    elif "SamsungBrowser" in u:
        br = "Samsung Internet"
    elif re.search(r"UCBrowser|UCWEB", u):
        br = "UC Browser"
    elif re.search(r"Firefox|FxiOS", u):
        br = "Firefox"
    elif re.search(r"Chrome|CriOS|Chromium", u):
        br = "Chrome"
    elif "Safari" in u:
        br = "Safari"
    else:
        br = "Lainnya"
    if re.search(r"iPhone|iPad|iPod", u):
        os_ = "iOS"
    elif "Android" in u:
        os_ = "Android"
    elif "Windows" in u:
        os_ = "Windows"
    elif re.search(r"Macintosh|Mac OS X", u):
        os_ = "macOS"
    elif "CrOS" in u:
        os_ = "ChromeOS"
    elif "Linux" in u:
        os_ = "Linux"
    else:
        os_ = "Lainnya"
    if re.search(r"iPad|Tablet", u) or ("Android" in u and "Mobile" not in u):
        dv = "Tablet"
    elif re.search(r"Mobi|iPhone|iPod|Android", u):
        dv = "Ponsel"
    else:
        dv = "Komputer"
    return br, os_, dv


def sumber_kunjungan(ref, utm, host_sendiri):
    """Label sumber: UTM lebih dulu, lalu referrer dikelompokkan, kosong/internal = Langsung."""
    utm = (utm or "").strip().lower()
    if UTM_RE.match(utm):
        return "utm:" + utm
    ref = (ref or "").strip()
    if not ref:
        return "Langsung"
    if ref.startswith("android-app://"):
        h = ref[len("android-app://"):].split("/")[0].lower()
    else:
        try:
            h = (urlparse(ref).hostname or "").lower()
        except Exception:
            return "Langsung"
    if h.startswith("www."):
        h = h[4:]
    if not h or not HOST_RE.match(h):
        return "Langsung"
    if host_sendiri and h == host_sendiri.split(":")[0].lower().removeprefix("www."):
        return "Langsung"
    for rx, nama in SUMBER:
        if rx.search(h) or (ref.startswith("android-app://") and rx.search(ref.lower()[:60])):
            return nama
    return h[:40]


def hash_id(secret, vid, ip, ua, hari):
    """ID anonim. Bila browser tidak mengirim ID (penyimpanan dimatikan), pakai sidik harian dari IP+UA yang tidak disimpan."""
    kunci = secret or b"x"
    if vid and VID_RE.match(vid):
        return hmac.new(kunci, b"v|" + vid.encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.new(kunci, ("d|%s|%s|%s" % (hari, ip, ua)).encode(), hashlib.sha256).hexdigest()[:16]


def _tampung_geo(hdr):
    cc = (hdr.get("x-vercel-ip-country") or "").strip().upper()
    cc = cc if re.match(r"^[A-Z]{2}$", cc) else "??"
    kota = unquote(hdr.get("x-vercel-ip-city") or "").strip()
    kota = re.sub(r"[^\w .'-]", "", kota, flags=re.U)[:40]
    return cc, kota


def catat_kunjungan(r, secret, hdr, ip, b, hari, jam, now_s, host):
    """Catat satu kunjungan/halaman. b = badan JSON dari browser. Mengembalikan dict hasil kecil."""
    ua = hdr.get("user-agent") or ""
    if not ua or BOT_RE.search(ua):
        return {"ok": True, "lewat": "bot"}
    vid = b.get("vid") if isinstance(b.get("vid"), str) else ""
    hid = hash_id(secret, vid, ip, ua, hari)
    nw = b.get("nw") in (1, True)
    d = "vs:d:" + hari
    cmds = [["HINCRBY", d, "pv", 1], ["HINCRBY", d, "h" + jam, 1], ["HINCRBY", "vs:tot", "pv", 1],
            ["ZADD", "vs:on", now_s, hid]]
    if nw:
        br, os_, dv = klasifikasi_ua(ua)
        cc, kota = _tampung_geo(hdr)
        src = sumber_kunjungan(b.get("ref") if isinstance(b.get("ref"), str) else "",
                               b.get("utm") if isinstance(b.get("utm"), str) else "", host)
        kembali = b.get("rv") in (1, True)
        cmds += [["HINCRBY", d, "vis", 1], ["HINCRBY", d, "ret" if kembali else "new", 1],
                 ["HINCRBY", d, "c:" + cc, 1], ["HINCRBY", d, "b:" + br, 1], ["HINCRBY", d, "o:" + os_, 1],
                 ["HINCRBY", d, "v:" + dv, 1], ["HINCRBY", d, "r:" + src, 1],
                 ["HINCRBY", "vs:tot", "vis", 1], ["HSETNX", "vs:tot", "sejak", hari],
                 ["PFADD", "vs:u:" + hari, hid], ["PFADD", "vs:u:all", hid],
                 ["EXPIRE", d, TTL], ["EXPIRE", "vs:u:" + hari, TTL], ["EXPIRE", "vs:on", 7200],
                 ["ZREMRANGEBYSCORE", "vs:on", "-inf", now_s - 3600],
                 ["LPUSH", "vs:last", json.dumps({"t": now_s, "c": cc, "k": kota, "b": br, "o": os_, "v": dv,
                                                  "r": src, "n": 0 if kembali else 1}, ensure_ascii=False)],
                 ["LTRIM", "vs:last", 0, 49]]
        if kota:
            cmds.append(["HINCRBY", d, "t:%s|%s" % (cc, kota), 1])
    r.pipe(cmds)
    return {"ok": True}


def catat_fitur(r, secret, hdr, ip, b, hari, now_s):
    k = b.get("e")
    if k not in FITUR:
        return {"ok": True}
    ua = hdr.get("user-agent") or ""
    if not ua or BOT_RE.search(ua):
        return {"ok": True}
    d = "vs:d:" + hari
    r.pipe([["HINCRBY", d, "e:" + k, 1], ["EXPIRE", d, TTL]])
    return {"ok": True}


def id_anon(secret, hdr, ip, b, hari):
    """ID anonim pemanggil, atau None bila bot. Dipakai rute detak."""
    ua = hdr.get("user-agent") or ""
    if not ua or BOT_RE.search(ua):
        return None
    vid = b.get("vid") if isinstance(b.get("vid"), str) else ""
    return hash_id(secret, vid, ip, ua, hari)


def ringkas(r, now_s, hari):
    """Angka untuk lencana publik."""
    res = r.pipe([["ZCOUNT", "vs:on", now_s - ONLINE, "+inf"], ["HGET", "vs:d:" + hari, "pv"],
                  ["PFCOUNT", "vs:u:" + hari], ["HGET", "vs:tot", "pv"], ["PFCOUNT", "vs:u:all"]])
    n = lambda v: int(v or 0)
    return {"online": n(res[0]), "hari_ini": n(res[1]), "unik_hari_ini": n(res[2]), "total": n(res[3]), "unik_total": n(res[4])}


def _hall(v):
    if isinstance(v, dict):
        return v
    v = v or []
    return {v[i]: v[i + 1] for i in range(0, len(v), 2)}


def _urut(c, n=15):
    return [{"k": k, "n": v} for k, v in sorted(c.items(), key=lambda x: (-x[1], x[0]))[:n] if v > 0]


def statistik(r, now_s, daftar_hari, tgl_label):
    """daftar_hari: kunci YYYYMMDD dari terlama ke terbaru (panjang >= 2). tgl_label(k) -> teks pendek."""
    cmds = []
    for h in daftar_hari:
        cmds += [["HGETALL", "vs:d:" + h], ["PFCOUNT", "vs:u:" + h]]
    cmds += [["PFCOUNT"] + ["vs:u:" + h for h in daftar_hari], ["ZCOUNT", "vs:on", now_s - ONLINE, "+inf"],
             ["LRANGE", "vs:last", 0, 29], ["HGETALL", "vs:tot"], ["PFCOUNT", "vs:u:all"]]
    res = r.pipe(cmds)
    n = len(daftar_hari)
    harian, tot = [], {"pv": 0, "vis": 0, "new": 0, "ret": 0}
    jam = [0] * 24
    dim = {p: {} for p in "cbovret"}
    for i, h in enumerate(daftar_hari):
        d = _hall(res[2 * i])
        pv, vis = int(d.get("pv", 0)), int(d.get("vis", 0))
        harian.append({"d": h, "l": tgl_label(h), "pv": pv, "uv": int(res[2 * i + 1] or 0), "vis": vis})
        for k in tot:
            tot[k] += int(d.get(k, 0))
        for k, v in d.items():
            if re.match(r"^h\d\d$", k):
                jam[int(k[1:])] += int(v)
            elif len(k) > 2 and k[1] == ":" and k[0] in dim:
                dim[k[0]][k[2:]] = dim[k[0]].get(k[2:], 0) + int(v)
    ext = 2 * n
    uv_periode, online, terbaru, total_h, uv_all = res[ext], res[ext + 1], res[ext + 2], _hall(res[ext + 3]), res[ext + 4]
    last = []
    for x in terbaru or []:
        try:
            last.append(json.loads(x))
        except Exception:
            pass
    hari_ini, kemarin = harian[-1], harian[-2]
    fitur = [{"k": FITUR.get(k, k), "n": v} for k, v in sorted(dim["e"].items(), key=lambda x: -x[1])[:20] if v > 0]
    return {
        "online": int(online or 0),
        "harian": harian,
        "kpi": {
            "hari_ini": hari_ini, "kemarin": kemarin,
            "periode": {"pv": tot["pv"], "vis": tot["vis"], "uv": int(uv_periode or 0), "baru": tot["new"], "kembali": tot["ret"], "hari": n},
            "total": {"pv": int(total_h.get("pv", 0)), "vis": int(total_h.get("vis", 0)), "uv": int(uv_all or 0), "sejak": total_h.get("sejak", "")},
        },
        "jam": jam,
        "sumber": _urut(dim["r"]), "negara": _urut(dim["c"]), "browser": _urut(dim["b"]),
        "os": _urut(dim["o"]), "perangkat": _urut(dim["v"]),
        "kota": [{"k": k.split("|", 1)[1] + (", " + k.split("|", 1)[0] if k.split("|", 1)[0] != "??" else ""), "n": v}
                 for k, v in sorted(dim["t"].items(), key=lambda x: -x[1])[:15] if "|" in k and v > 0],
        "fitur": fitur, "terbaru": last,
    }


def live(r, now_s, hari):
    """Versi ringan untuk penyegaran otomatis di dasbor: online, angka hari ini, dan kunjungan terbaru (4 perintah)."""
    res = r.pipe([["ZCOUNT", "vs:on", now_s - ONLINE, "+inf"], ["HMGET", "vs:d:" + hari, "pv", "vis"],
                  ["PFCOUNT", "vs:u:" + hari], ["LRANGE", "vs:last", 0, 29]])
    pv, vis = (res[1] or [0, 0])[:2] if isinstance(res[1], list) else (0, 0)
    last = []
    for x in res[3] or []:
        try:
            last.append(json.loads(x))
        except Exception:
            pass
    return {"online": int(res[0] or 0), "hari_ini": {"pv": int(pv or 0), "uv": int(res[2] or 0), "vis": int(vis or 0)}, "terbaru": last}
