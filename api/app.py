"""Takok Pelayanan Suroboyo - API untuk Vercel (Python serverless).

Penyimpanan : Upstash Redis (lewat Vercel Marketplace), diakses via REST.
Variabel    : lihat BACA-SAYA.md (SESSION_SECRET, ADMIN_PASSWORD, KV_REST_API_URL/TOKEN).
Satu endpoint: /api/app?p=/rute  (mis. /api/app?p=/info)
"""
import base64, collections, csv, hashlib, hmac, io, json, os, re, secrets, sys, time
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import urllib.request
from html import escape as hesc
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _data import SEED, SKM_MPP  # noqa: E402
import _analisa as AN  # noqa: E402
import _bot as BOT  # noqa: E402

SECRET = (os.environ.get("SESSION_SECRET") or "").encode()
SECURE = os.environ.get("COOKIE_SECURE", "1") != "0"
CSP = ("default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
       "connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")


class HttpError(Exception):
    def __init__(self, code, msg):
        self.code, self.msg = code, msg


# ---------------- Redis (Upstash REST) ----------------
def find_redis_env():
    """Cari URL dan token REST Redis, apa pun awalan nama variabelnya (KV_, UPSTASH_REDIS_, STORAGE_, dst)."""
    e = os.environ
    for u, t in (("KV_REST_API_URL", "KV_REST_API_TOKEN"), ("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN")):
        if e.get(u) and e.get(t):
            return e[u], e[t]
    for k, v in e.items():
        for suf_u, suf_t in (("_REST_API_URL", "_REST_API_TOKEN"), ("_REST_URL", "_REST_TOKEN")):
            if k.endswith(suf_u) and v:
                tok = e.get(k[:-len(suf_u)] + suf_t)
                if tok:
                    return v, tok
    return "", ""


class Upstash:
    def __init__(self):
        self.url, self.tok = find_redis_env()
        self.url = self.url.rstrip("/")

    def _post(self, path, body):
        if not self.url:
            raise HttpError(500, "Penyimpanan Redis belum disambungkan. Isi KV_REST_API_URL dan KV_REST_API_TOKEN di Environment Variables, lalu Redeploy.")
        req = urllib.request.Request(self.url + path, json.dumps(body).encode(),
                                     {"Authorization": "Bearer " + self.tok, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read())

    def cmd(self, *a):
        j = self._post("", [str(x) for x in a])
        if isinstance(j, dict) and j.get("error"):
            raise RuntimeError(j["error"])
        return j.get("result")

    def pipe(self, cmds):
        if not cmds:
            return []
        out = self._post("/pipeline", [[str(x) for x in c] for c in cmds])
        res = []
        for o in out:
            if o.get("error"):
                raise RuntimeError(o["error"])
            res.append(o.get("result"))
        return res


R = None


def db():
    global R
    if R is None:
        R = Upstash()
    return R


def hall(v):
    """HGETALL -> dict (REST mengembalikan daftar datar)."""
    if isinstance(v, dict):
        return v
    v = v or []
    return {v[i]: v[i + 1] for i in range(0, len(v), 2)}


# ---------------- Util ----------------
def now_ms():
    return int(time.time() * 1000)


def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(8)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 150000).hex()


def check_pw(pw, h):
    return bool(h) and "$" in h and hmac.compare_digest(hash_pw(pw, h.split("$")[0]), h)


def sign(p):
    if not SECRET:
        raise HttpError(500, "SESSION_SECRET belum diisi di pengaturan Vercel.")
    b = base64.urlsafe_b64encode(json.dumps(p).encode()).decode().rstrip("=")
    return b + "." + hmac.new(SECRET, b.encode(), hashlib.sha256).hexdigest()


def unsign(tok):
    try:
        b, sig = tok.split(".")
        if not SECRET or not hmac.compare_digest(sig, hmac.new(SECRET, b.encode(), hashlib.sha256).hexdigest()):
            return None
        p = json.loads(base64.urlsafe_b64decode(b + "=" * (-len(b) % 4)))
        return p if p.get("exp", 0) > time.time() else None
    except Exception:
        return None


def norm_hp(s):
    s = re.sub(r"[\s.\-()]", "", str(s))
    if re.match(r"^\+?62", s):
        s = re.sub(r"^\+?62", "0", s)
    return s if re.match(r"^08\d{7,12}$", s) else None


def ok_email(s):
    s = str(s).strip()
    return s if len(s) <= 100 and re.match(r"^[^\s@<>\"']+@[^\s@<>\"']+\.[^\s@<>\"']{2,}$", s) else None


def clean(s, n):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(s)).strip()[:n]


OK_TAG = {"p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "h3", "h4", "blockquote", "a", "hr"}
KAT_BERITA = ["Berita", "Pengumuman", "Tips Layanan"]
ROSTER = {r["id"]: r for r in SKM_MPP}


class _San(HTMLParser):
    """Penyaring HTML berdaftar-putih: hanya tag aman, tanpa atribut selain href tautan http(s)/mailto."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.o, self.st, self.skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
            return
        if self.skip:
            return
        tag = "p" if tag == "div" else tag
        if tag not in OK_TAG:
            return
        if tag in ("br", "hr"):
            self.o.append("<%s>" % tag)
            return
        if tag == "a":
            href = dict(attrs).get("href") or ""
            if re.match(r"^(https?://|mailto:)", href, re.I):
                self.o.append('<a href="%s" target="_blank" rel="noopener noreferrer nofollow">' % hesc(href, quote=True))
                self.st.append("a")
            else:
                self.st.append("a-skip")
            return
        self.o.append("<%s>" % tag)
        self.st.append(tag)

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        tag = "p" if tag == "div" else tag
        if tag in ("br", "hr") or tag not in OK_TAG or tag not in [x.split("-")[0] for x in self.st]:
            return
        while self.st:
            t = self.st.pop()
            if t != "a-skip":
                self.o.append("</%s>" % t)
            if t.split("-")[0] == tag:
                break

    def handle_data(self, data):
        if not self.skip:
            self.o.append(hesc(data))

    def result(self):
        while self.st:
            t = self.st.pop()
            if t != "a-skip":
                self.o.append("</%s>" % t)
        return "".join(self.o)


def sanitize_html(h):
    p = _San()
    p.feed(str(h)[:16000])
    p.close()
    return p.result()


STATUS_PMH = ["Diterima", "Sedang diverifikasi", "Perlu perbaikan berkas", "Disetujui", "Siap diambil", "Selesai", "Ditolak"]
SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"]
SKM_UNSUR = ["Persyaratan pelayanan", "Sistem, mekanisme, dan prosedur", "Waktu penyelesaian", "Biaya/tarif", "Produk spesifikasi jenis pelayanan",
             "Kompetensi pelaksana", "Perilaku pelaksana", "Penanganan pengaduan, saran, dan masukan", "Sarana dan prasarana"]


def wib():
    return time.gmtime(time.time() + 7 * 3600)


def fmt_wib(ms):
    return time.strftime("%d-%m-%Y %H:%M", time.gmtime(ms / 1000 + 7 * 3600))


def cek_tanggal(tgl, jam):
    """Tanggal kunjungan: hari kerja, hari ini sampai 14 hari ke depan; jam belum lewat."""
    try:
        d = time.strptime(tgl, "%Y-%m-%d")
    except ValueError:
        raise HttpError(400, "Tanggal tidak valid.")
    hari_ini = time.strftime("%Y-%m-%d", wib())
    batas = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 7 * 3600 + 14 * 86400))
    if tgl < hari_ini or tgl > batas:
        raise HttpError(400, "Pilih tanggal dari hari ini sampai 14 hari ke depan.")
    if d.tm_wday >= 5:
        raise HttpError(400, "Layanan hanya hari kerja (Senin sampai Jumat).")
    if tgl == hari_ini and jam <= time.strftime("%H:%M", time.gmtime(time.time() + 7 * 3600 + 1800)):
        raise HttpError(400, "Jam tersebut sudah lewat. Pilih jam lain.")


def bisa_booking(k):
    """Loket yang menerima booking kunjungan (bukan telepon/WA/survei)."""
    e = LOKET.get(str(k))
    return bool(e) and not e.get("sembunyi") and not lok_sembunyi(e["lokasi"]) and not re.search(r"telepon|via wa|hotline|skm", e["nama"], re.I)


def kategori_ikm(v):
    return "A (Sangat Baik)" if v >= 88.31 else "B (Baik)" if v >= 76.61 else "C (Kurang Baik)" if v >= 65 else "D (Tidak Baik)"


LOK_BASE = {l["id"]: l["nm"] for l in SEED["lokasi"]}
LOKASI = dict(LOK_BASE)  # diisi ulang di tempat (in-place) oleh refresh_loket: urutan = urutan tampil
LOK_ORDER = [l["id"] for l in SEED["lokasi"]]
LOKMETA = {}  # id -> {uraian, alamat, jam, telp, maps, sembunyi}
BASE = {"%s_%s" % (e["lokasi"], e["no"]): dict(e) for e in SEED["loket"]}
LOKET = {k: dict(v) for k, v in BASE.items()}
_LX = {"t": 0.0, "raw": None, "rawl": None}
LX_FIELD = ("nama", "uraian", "sistem", "zona", "diskusi", "sembunyi", "jam", "tautan")
LK_TEXT = (("uraian", 2000), ("alamat", 200), ("jam", 120), ("telp", 40))
LOK_ID_RE = re.compile(r"^[a-z0-9]{2,16}$")
URAIAN_MAX = 2000


def aman_url(u):
    """Hanya tautan http(s) tanpa spasi/tanda kutip; selain itu dikosongkan."""
    u = str(u or "").strip()[:300]
    return u if re.match(r"^https?://[^\s\"'<>]+$", u) else ""


def lok_sembunyi(lok):
    return bool(LOKMETA.get(lok, {}).get("sembunyi"))


def lok_meta_publik(i, semua=False):
    m = LOKMETA.get(i, {})
    d = {"id": i, "nama": LOKASI.get(i, i), "uraian": m.get("uraian", ""), "alamat": m.get("alamat", ""), "jam": m.get("jam", ""), "telp": m.get("telp", ""), "maps": m.get("maps", "")}
    if semua:
        d.update(sembunyi=bool(m.get("sembunyi")), asli=i in LOK_BASE, diubah=i in (_LX["rawl"] or {}))
    return d


def refresh_loket(maks=10):
    """Gabungkan data bawaan (_data.py) dengan hasil edit admin (Redis hash loketx = loket, lokx = tempat pelayanan). Dipakai ulang antar permintaan selama `maks` detik."""
    if time.time() - _LX["t"] < maks:
        return
    try:
        raw, rawl = [hall(x) for x in db().pipe([["HGETALL", "loketx"], ["HGETALL", "lokx"]])]
    except Exception as e:  # Redis gagal: pakai data terakhir
        print("LOKETX", repr(e))
        return
    _LX["t"] = time.time()
    if raw == _LX["raw"] and rawl == _LX["rawl"]:
        return
    _LX["raw"], _LX["rawl"] = raw, rawl
    # --- tempat pelayanan ---
    nama, meta, urut = dict(LOK_BASE), {}, {i: n * 10 for n, i in enumerate(LOK_ORDER)}
    for i, v in rawl.items():
        o = parse(v, None)
        if not isinstance(o, dict) or not LOK_ID_RE.match(i):
            continue
        if i not in nama:
            nama[i] = str(o.get("nama", ""))[:60] or i
            urut[i] = 1000 + len(urut)
        elif o.get("nama"):
            nama[i] = str(o["nama"])[:60]
        if isinstance(o.get("urut"), int):
            urut[i] = o["urut"]
        m = {f: str(o.get(f, ""))[:n] for f, n in LK_TEXT}
        m["maps"] = aman_url(o.get("maps"))
        m["sembunyi"] = bool(o.get("sembunyi"))
        meta[i] = m
    order = sorted(nama, key=lambda i: (urut.get(i, 9999), i))
    LOKASI.clear()
    LOKASI.update({i: nama[i] for i in order})
    LOK_ORDER[:] = order
    LOKMETA.clear()
    LOKMETA.update(meta)
    # --- loket ---
    new = {k: dict(v) for k, v in BASE.items()}
    for k, v in raw.items():
        o = parse(v, None)
        lok, _, no = k.partition("_")
        if not isinstance(o, dict) or lok not in LOKASI or not no.isdigit():
            continue
        if k in new:
            new[k].update({f: o[f] for f in LX_FIELD if f in o})
        else:
            new[k] = {"lokasi": lok, "no": int(no), "nama": str(o.get("nama", ""))[:80], "uraian": str(o.get("uraian", ""))[:URAIAN_MAX], "sistem": str(o.get("sistem", ""))[:120],
                      "zona": str(o.get("zona", ""))[:20], "diskusi": bool(o.get("diskusi", True)), "sembunyi": bool(o.get("sembunyi")), "baru": True}
        new[k]["jam"] = str(new[k].get("jam", "") or "")[:120]
        new[k]["tautan"] = aman_url(new[k].get("tautan"))
    LOKET.clear()
    LOKET.update(new)


def loket_urut(semua=False):
    ur = {i: n for n, i in enumerate(LOK_ORDER)}
    return sorted([e for e in LOKET.values() if semua or not (e.get("sembunyi") or lok_sembunyi(e["lokasi"]))], key=lambda e: (ur.get(e["lokasi"], 99), e["no"]))


def valid_key(k):
    return str(k) in LOKET


def label(k):
    e = LOKET.get(k)
    if e:
        return LOKASI.get(e["lokasi"], "") + " - " + e["nama"]
    if str(k).endswith("_0"):
        return LOKASI.get(str(k)[:-2], str(k))
    return k


def bk_norm(o):
    """Booking versi lama (tanpa 'kunci') dianggap booking tingkat lokasi."""
    if o and not o.get("kunci"):
        o["kunci"] = "%s_0" % o.get("lokasi", "")
    return o


def slot_key(o):
    k = o["lokasi"] if str(o["kunci"]).endswith("_0") else o["kunci"]
    return "bks:%s|%s|%s" % (k, o["tanggal"], o["jam"])


def limited(key, maxn, window):
    """Hitung percobaan di Redis; True bila sudah melewati batas."""
    c = db().pipe([["INCR", key], ["EXPIRE", key, window, "NX"]])[0]
    return int(c) > maxn


def cfg_all():
    return hall(db().cmd("HGETALL", "cfg"))


def parse(s, d=None):
    try:
        return json.loads(s)
    except Exception:
        return d


# ---------------- Logika data ----------------
def threads():
    r = db().pipe([["HGETALL", "tlu"], ["HGETALL", "tla"], ["HGETALL", "tlast"], ["HGETALL", "sel"], ["HGETALL", "nilai"], ["HGETALL", "pemohon"],
                   ["HGETALL", "ttag"], ["HGETALL", "tmeta"], ["HGETALL", "tkt"]])
    tlu, tla, tlast, sel, nilai, pem, ttag, tmeta, tkt = [hall(x) for x in r]
    pem = {k: parse(v, {}) for k, v in pem.items()}
    now = now_ms()
    out = []
    for f, last in tlast.items():
        pid, kunci = f.split("|", 1)
        p = pem.get(pid)
        if not p:
            continue
        l = parse(last, {})
        lu, la, sl = int(tlu.get(f, 0)), int(tla.get(f, 0)), int(sel.get(f, 0))
        pend = lu > max(la, sl)
        mt = parse(tmeta.get(f), None)
        meta = AN.meta_ringkas(mt if mt else AN.meta_gabung({}, AN.analyze(l.get("teks", ""))))
        tag = parse(ttag.get(f), {}) or {}
        out.append({"pid": int(pid), "kunci": kunci, "nama": p["nama"], "hp": p["hp"], "email": p.get("email", ""), "tk": (parse(tkt.get(f), {}) or {}).get("no", ""),
                    "teks": l.get("teks", ""), "waktu": l.get("waktu", 0), "pend": pend, "lu": lu,
                    "nilai": int(nilai[f]) if f in nilai else None, "meta": meta, "tag": tag, "selesai": sl > 0 and not pend,
                    "skor": AN.skor_prioritas(meta, tag, pend, lu, now)})
    return sorted(out, key=lambda x: (not x["pend"], -x["waktu"]))



def tiket_aktif(f):
    """Tiket = satu rangkaian pertanyaan di satu loket. Setiap pesan membawa nomor tiketnya.
    Pesan baru setelah percakapan ditandai selesai membuka tiket baru (format TKT-YYMM-NNNNN)."""
    cur, sl = db().pipe([["HGET", "tkt", f], ["HGET", "sel", f]])
    cur, sl = parse(cur, None), int(sl or 0)
    if cur and not (sl and sl >= cur.get("t", 0)):
        return cur
    n = int(db().cmd("INCR", "seq:tiket"))
    t = now_ms()
    no = "TKT-%s-%05d" % (time.strftime("%y%m", time.gmtime(t / 1000 + 7 * 3600)), n)
    cur = {"no": no, "t": t}
    db().pipe([["HSET", "tkt", f, json.dumps(cur)], ["HSET", "tktidx", no, f]])
    return cur


def add_msg(pid, kunci, dari, isi):
    f = "%s|%s" % (pid, kunci)
    tk = tiket_aktif(f)
    mid = int(db().cmd("INCR", "seq:pesan"))
    t = now_ms()
    m = {"id": mid, "dari": dari, "isi": isi, "waktu": t, "tk": tk["no"]}
    cmds = [["RPUSH", "msgs:" + f, json.dumps(m, ensure_ascii=False)], ["SADD", "pk:%s" % pid, kunci],
            ["HSET", "tlu" if dari == "pemohon" else "tla", f, t],
            ["HSET", "tlast", f, json.dumps({"teks": isi[:100], "waktu": t}, ensure_ascii=False)]]
    if dari == "pemohon":  # simpan agregat analisis (topik, sentimen, urgensi) per percakapan
        try:
            mt = parse(db().cmd("HGET", "tmeta", f), {})
            cmds.append(["HSET", "tmeta", f, json.dumps(AN.meta_gabung(mt, AN.analyze(isi)), ensure_ascii=False)])
        except Exception as e:
            print("META", repr(e))
    db().pipe(cmds)
    return tk["no"]


PIKET_BATAS = 3  # jawaban otomatis beruntun maksimal per percakapan sebelum menunggu pegawai


def piket_cfg():
    """Pengaturan Asisten Piket (pengganti pegawai sementara). mode: off | langsung | tunda (jawab bila belum dibalas dalam N menit)."""
    c = cfg_all()
    mode = c.get("piket_mode", "off")
    try:
        tunggu = min(240, max(2, int(c.get("piket_tunggu") or 15)))
    except ValueError:
        tunggu = 15
    return {"mode": mode if mode in ("langsung", "tunda") else "off", "tunggu": tunggu, "info": c.get("piket_info", "")}


def piket_balas(pid, k, pc=None):
    """Asisten Piket menjawab pesan terakhir pemohon dari aturan Kata cari + templat topik. Tidak mengubah status 'menunggu pegawai':
    pegawai tetap melihat percakapan ini sebagai belum dijawab. Kembalikan pesan yang dibuat, atau None."""
    f = "%s|%s" % (pid, k)
    if db().cmd("HGET", "pkesc", f):
        return None
    ms = [m for m in (parse(x) for x in db().cmd("LRANGE", "msgs:" + f, 0, -1) or []) if m]
    if not ms or ms[-1]["dari"] != "pemohon" or ms[-1].get("hapus"):
        return None
    run = 0
    for m in reversed(ms):
        if m["dari"] == "admin" and not m.get("bot"):
            break
        if m.get("bot"):
            run += 1
    if run >= PIKET_BATAS:
        return None
    pc = pc or piket_cfg()
    pem = parse(db().cmd("HGET", "pemohon", pid), {}) or {}
    nm = (pem.get("nama") or "").split(" ")[0]
    a = AN.analyze(ms[-1]["isi"])
    sar = AN.saran_balasan(ms, kata_cache()[2], pem.get("nama", ""), label(k), label)
    dari_aturan = [x for x in sar if x["sumber"].startswith("Aturan")]
    if "Pengaduan / keluhan" in a["topik"] or a["urg"] >= 2:
        isi = "Halo %s, mohon maaf atas kendala yang Anda alami. Pesan Anda kami tandai sebagai prioritas dan sudah diteruskan ke pegawai %s. Mohon lengkapi kronologi dan nomor permohonan (bila ada) agar lebih cepat ditangani." % (nm, label(k))
    else:
        isi = (dari_aturan or sar)[0]["teks"] if sar else AN.TEMPLAT_UMUM.format(nama=nm, loket=label(k))
    isi += "\n\n🤖 Jawaban otomatis Asisten Piket" + (" (pegawai sedang tidak di tempat)" if pc["mode"] == "langsung" else " (pegawai belum sempat membalas)") + ". Pegawai akan memeriksa dan melengkapi bila perlu."
    if pc["info"]:
        isi += "\n" + pc["info"]
    tk = tiket_aktif(f)
    mid = int(db().cmd("INCR", "seq:pesan"))
    t = now_ms()
    m = {"id": mid, "dari": "admin", "bot": 1, "isi": isi[:1500], "waktu": t, "tk": tk["no"]}
    db().pipe([["RPUSH", "msgs:" + f, json.dumps(m, ensure_ascii=False)], ["HSET", "tlast", f, json.dumps({"teks": "🤖 " + isi[:96], "waktu": t}, ensure_ascii=False)],
               ["HINCRBY", "pkn", time.strftime("%Y%m%d", wib()), 1]])
    return m


def muat_semua(limit=200):
    """Muat percakapan terbaru beserta seluruh pesannya untuk analisis (dibatasi agar muat dalam 10 detik)."""
    r = db().pipe([["HGETALL", "tlast"], ["HGETALL", "pemohon"], ["HGETALL", "nilai"], ["HGETALL", "sel"], ["HGETALL", "tla"]])
    tlast, pem, nilai, sel, tla = [hall(x) for x in r]
    pem = {k: parse(v, {}) for k, v in pem.items()}
    fs = sorted(tlast, key=lambda f: -(parse(tlast[f], {}).get("waktu", 0)))
    fs = [f for f in fs if f.split("|", 1)[0] in pem][:limit]
    lists = db().pipe([["LRANGE", "msgs:" + f, 0, -1] for f in fs]) if fs else []
    rows = []
    for f, lst in zip(fs, lists):
        pid, kunci = f.split("|", 1)
        msgs = [m for m in (parse(x) for x in lst or []) if m]
        rows.append({"pid": int(pid), "kunci": kunci, "nama": pem[pid].get("nama", "?"), "hp": pem[pid].get("hp", ""), "msgs": msgs,
                     "nilai": int(nilai[f]) if f in nilai else None, "selesai": int(sel.get(f, 0))})
    return rows


# ---------------- Handler ----------------
# ---------------- Kata cari chatbot: impor / ekspor ----------------
KATA_MAX = max(100, min(20000, int(os.environ.get("KATA_MAX", "5000") or 5000)))
_KC = {"v": None, "d": [], "ix": None, "awal": set()}


def kata_baca():
    """Baca seluruh aturan Kata cari (disimpan berpecahan di hash kata2: p0, p1, ...). Kembalian: (daftar, versi|None)."""
    h = hall(db().cmd("HGETALL", "kata2"))
    if not h.get("v"):  # data lama (versi 7): satu blok JSON di cfg.kata
        d = parse(db().cmd("HGET", "cfg", "kata"), [])
        return (d if isinstance(d, list) else []), None
    out = []
    for _, v in sorted((int(k[1:]), v) for k, v in h.items() if k[:1] == "p" and k[1:].isdigit()):
        p = parse(v, [])
        out += p if isinstance(p, list) else []
    return out, h["v"]


def kata_cache():
    """Seperti kata_baca(), tetapi dipakai ulang selama versinya sama (hanya 1 perintah Redis kecil per panggilan)."""
    v = db().cmd("HGET", "kata2", "v")
    if v and _KC["v"] == v:
        return _KC["d"], v, _KC["ix"], _KC["awal"]
    d, v = kata_baca()
    ix = AN.KataIdx(d)
    awal = set((x.get("k") or [""])[0] for x in d if isinstance(x, dict))
    if v:
        _KC.update({"v": v, "d": d, "ix": ix, "awal": awal})
    return d, v, ix, awal



KBLI_MAX = 2500
_KB = {"v": None, "rows": [], "m": {}}


def kbli_baca():
    """Baca data KBLI (hash kbli: p0, p1, ... berisi baris [kode, judul, uraian, risiko, perizinan, padanan2020]; v = versi; m = metadata)."""
    h = hall(db().cmd("HGETALL", "kbli"))
    rows = []
    for i in range(int(h.get("np", 0) or 0)):
        rows += parse(h.get("p%d" % i), []) or []
    return rows, h.get("v") or "", parse(h.get("m"), {}) or {}


def kbli_baris(x):
    """Rapikan satu baris impor. Kembalikan None bila kode bukan 5 angka."""
    if not isinstance(x, (list, tuple)) or len(x) < 2:
        return None
    kode = re.sub(r"\D", "", str(x[0]))
    if len(kode) != 5:
        return None
    g = lambda i, n: clean(x[i], n) if len(x) > i else ""
    judul = g(1, 200)
    if len(judul) < 2:
        return None
    return [kode, judul, g(2, 500), g(3, 40), g(4, 120), g(5, 80)]


def kata_peta_loket():
    by_label, by_nama = {}, {}
    for k in LOKET:
        by_label[label(k).lower()] = k
        by_nama.setdefault(LOKET[k]["nama"].strip().lower(), []).append(k)
    return by_label, by_nama


def kata_cari_loket(v, peta):
    """Terjemahkan isi kolom loket (kode, 'Lokasi - Loket', atau nama loket) menjadi kunci loket."""
    v = clean(v, 200)
    lv = v.lower()
    by_label, by_nama = peta
    if v in LOKET:
        return v, ""
    if lv in by_label:
        return by_label[lv], ""
    for nm in (lv, lv.split(" - ")[-1].strip()):
        if nm in by_nama:
            return by_nama[nm][0], ("" if len(by_nama[nm]) == 1 else "nama loket ada di beberapa lokasi, dipilih yang pertama")
    return None, "loket \"%s\" tidak dikenali" % v[:40]


def kata_baca_baris(raw):
    """Baca .xlsx / .csv / teks tab menjadi daftar baris (maksimal 5.000 baris, 8 kolom)."""
    if raw[:4] == b"\xd0\xcf\x11\xe0":
        raise HttpError(400, "Format .xls lama tidak didukung. Simpan ulang sebagai .xlsx atau .csv.")
    if raw[:2] == b"PK":
        from openpyxl import load_workbook
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        try:
            ws = wb["Aturan"] if "Aturan" in wb.sheetnames else wb.worksheets[0]
            return [["" if v is None else str(v) for v in r] for r in ws.iter_rows(min_row=1, max_row=5001, max_col=8, values_only=True)]
        finally:
            wb.close()
    try:
        txt = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        txt = raw.decode("latin-1")
    first = txt.split("\n", 1)[0]
    delim = "\t" if "\t" in first else max((";", ","), key=lambda d: first.count(d))
    return [r for r in csv.reader(io.StringIO(txt), delimiter=delim)][:5001]


def kata_dari_baris(rows):
    """Ubah baris tabel menjadi aturan. Kembalian: (aturan, baris_yang_dilewati)."""
    peta = kata_peta_loket()
    ik, ij, it, mulai = 0, 1, 2, 0
    if rows:
        h = [str(c).strip().lower() for c in rows[0]]

        def cari(*kunci):
            for i, c in enumerate(h):
                if any(x in c for x in kunci):
                    return i
            return None
        a, b, c = cari("kata"), cari("jawab"), cari("loket", "tujuan")
        if sum(x is not None for x in (a, b, c)) >= 2:
            ik, ij, it, mulai = (0 if a is None else a), (1 if b is None else b), (2 if c is None else c), 1
    ok, lewat = [], []
    for n, r in enumerate(rows[mulai:], start=mulai + 1):
        if not any(str(x).strip() for x in r):
            continue

        def g(i):
            return str(r[i]) if i < len(r) and r[i] is not None else ""
        if g(ik).strip().lower() in ("contoh kata, contoh frasa lain", "contoh dengan loket"):
            continue
        ks = [clean(w, 40).lower() for w in re.split(r"[,;\n]", g(ik))]
        ks = [w for w in ks if len(w) >= 2][:10]
        j = clean(g(ij), 1500)
        t, cat = None, ""
        if g(it).strip():
            t, cat = kata_cari_loket(g(it), peta)
        if not ks:
            lewat.append({"baris": n, "alasan": "kata kunci kosong"})
            continue
        if not j and not t:
            lewat.append({"baris": n, "alasan": cat or "jawaban dan loket kosong"})
            continue
        item = {"k": ks, "t": [t] if t else [], "j": j}
        if cat:
            item["cat"] = cat
        ok.append(item)
    return ok, lewat



class handler(BaseHTTPRequestHandler):
    server_version = "Takok"
    sys_version = ""

    def log_message(self, *a):
        pass

    def ip(self):
        return (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()

    def out(self, code, body, ctype, extra=()):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Frame-Options", "DENY")
        if not any(k.lower() == "cache-control" for k, _ in extra):
            self.send_header("Cache-Control", "no-store")
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def json(self, obj, code=200, extra=()):
        self.out(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8", extra)

    def cookie(self, tok, maxage):
        return [("Set-Cookie", "sid=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d%s" % (tok, maxage, "; Secure" if SECURE else ""))]

    def session(self):
        m = re.search(r"(?:^|;\s*)sid=([^;]+)", self.headers.get("Cookie", ""))
        p = unsign(m.group(1)) if m else None
        if p and p["r"] == "adm" and p.get("v") != (db().cmd("HGET", "cfg", "admin_hash") or "")[:12]:
            return None
        return p

    def refresh(self, p):
        q = dict(p)
        q["exp"] = int(time.time()) + (1800 if p["r"] == "adm" else 3600)
        return self.cookie(sign(q), 3600)

    def do_GET(self):
        self.go("GET")

    def do_POST(self):
        self.go("POST")

    def go(self, method):
        try:
            u = urlparse(self.path)
            q = parse_qs(u.query)
            path = (q.get("p") or ["/"])[0]
            body = {}
            self.raw = b""
            if method == "POST":
                org = self.headers.get("Origin")
                if org and urlparse(org).netloc != self.headers.get("Host"):
                    raise HttpError(403, "Permintaan ditolak.")
                if "application/json" not in (self.headers.get("Content-Type") or ""):
                    raise HttpError(415, "Format permintaan tidak valid.")
                n = int(self.headers.get("Content-Length") or 0)
                if path in ("/wa", "/tg"):  # webhook: butuh badan mentah untuk memeriksa tanda tangan
                    if n > 60000:
                        raise HttpError(413, "Permintaan terlalu besar.")
                    self.raw = self.rfile.read(n)
                    try:
                        body = json.loads(self.raw or b"{}")
                        assert isinstance(body, dict)
                    except Exception:
                        raise HttpError(400, "Data tidak valid.")
                    return self.route(method, path, q, body)
                if n > {"/admin/kata": 700000, "/admin/kata/impor": 4200000, "/admin/loket/massal": 1500000, "/admin/kbli/impor": 1500000}.get(path, 10000):
                    raise HttpError(413, "Permintaan terlalu besar.")
                try:
                    body = json.loads(self.rfile.read(n) or b"{}")
                    assert isinstance(body, dict)
                except Exception:
                    raise HttpError(400, "Data tidak valid.")
            self.route(method, path, q, body)
        except HttpError as e:
            self.json({"error": e.msg}, e.code)
        except Exception as e:
            print("ERROR", repr(e))
            self.json({"error": "Terjadi kesalahan pada server."}, 500)

    def route(self, method, path, q, b):
        refresh_loket()
        if path == "/info":
            return self.info(self.session())
        if path == "/kata" and method == "GET":
            return self.kata_publik()
        if path == "/kbli" and method == "GET":
            return self.kbli_publik()
        if path == "/daftar" and method == "POST":
            return self.daftar(b)
        if path == "/masuk" and method == "POST":
            return self.masuk(b)
        if path == "/admin/masuk" and method == "POST":
            return self.admin_masuk(b)
        if path == "/layar" and method == "GET":
            return self.layar(q)
        if path == "/bot/miss" and method == "POST":
            return self.bot_miss(b)
        if path == "/game/main" and method == "POST":
            return self.game_main(b)
        if path == "/wa":
            return self.kanal_wa(method, q, b)
        if path == "/tg" and method == "POST":
            return self.kanal_tg(b)
        if path == "/populer" and method == "GET":
            return self.populer_publik()
        if path == "/bot/hit" and method == "POST":
            return self.bot_hit(b)
        if path == "/keluar" and method == "POST":
            return self.json({"ok": True}, extra=self.cookie("", 0))
        ses = self.session()
        if not ses:
            raise HttpError(401, "Silakan masuk terlebih dahulu.")
        ex = self.refresh(ses)
        if ses["r"] == "user":
            if path == "/pesan" and method == "GET":
                return self.user_pesan(ses, ex)
            if path == "/pesan" and method == "POST":
                return self.user_kirim(ses, b, ex)
            if path == "/pesan/eskalasi" and method == "POST":
                k = str(b.get("kunci", ""))
                if not valid_key(k) or limited("rl:esk:%s" % ses["id"], 6, 3600):
                    raise HttpError(400, "Permintaan tidak valid atau terlalu sering.")
                self._eskalasi(ses["id"], k)
                add_msg(ses["id"], k, "pemohon", "Mohon dijawab langsung oleh pegawai. (Eskalasi dari jawaban otomatis)")
                return self.json({"ok": True}, extra=ex)
            if path == "/pesan/ubah" and method == "POST":
                return self.user_ubah(ses, b, ex)
            if path == "/pesan/hapus" and method == "POST":
                return self.user_hapus(ses, b, ex)
            if path == "/pesan/reaksi" and method == "POST":
                return self.user_reaksi(ses, b, ex)
            if path == "/nilai" and method == "POST":
                return self.user_nilai(ses, b, ex)
            if path == "/permohonan" and method == "GET":
                return self.user_pmh(ses, ex)
            if path == "/slot" and method == "GET":
                return self.slot(q, ex)
            if path == "/booking" and method == "GET":
                return self.user_bk(ses, ex)
            if path == "/booking" and method == "POST":
                return self.user_bk_baru(ses, b, ex)
            if path == "/booking/batal" and method == "POST":
                return self.user_bk_batal(ses, b, ex)
            if path == "/booking/tiba" and method == "POST":
                return self.user_bk_tiba(ses, b, ex)
            if path == "/skm" and method == "POST":
                return self.user_skm(ses, b, ex)
        if ses["r"] == "adm" and path.startswith("/admin/"):
            return self.admin(method, path[7:], q, b, ex)
        raise HttpError(403, "Tidak diizinkan.")

    def bot_miss(self, b):
        """Catat pertanyaan warga yang tidak terjawab chatbot (anonim, tanpa IP/identitas)."""
        t = clean(b.get("q", ""), 160).lower()
        t = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", " ", t)
        t = re.sub(r"\+?\d[\d\s().-]{5,}\d", " ", t)
        t = re.sub(r"\s+", " ", t).strip()[:100]
        if len(t) < 3 or not re.search(r"[a-z]{3}", t) or limited("rl:miss:" + self.ip(), 20, 3600):
            return self.json({"ok": True})
        n, ada = db().pipe([["HLEN", "miss"], ["HEXISTS", "miss", t]])
        if int(n or 0) >= 300 and not int(ada or 0):
            return self.json({"ok": True})
        db().pipe([["HINCRBY", "miss", t, 1], ["HSET", "missw", t, now_ms()], ["HINCRBY", "kmd", time.strftime("%Y%m%d", wib()), 1]])
        return self.json({"ok": True})

    GAMES = ("cocok", "susun", "urut", "kuis", "kata", "tangkap", "suro", "roda", "usaha", "tebak", "zona")

    def game_main(self, b):
        """Hitung pemakaian Ruang Main secara anonim (tanpa IP/identitas): total per permainan dan per hari."""
        g = b.get("g")
        if g in self.GAMES and not limited("rl:gm:" + self.ip(), 40, 3600):
            db().pipe([["HINCRBY", "gm:n", g, 1], ["HINCRBY", "gm:d", time.strftime("%Y%m%d", wib()), 1]])
        return self.json({"ok": True})

    def bot_hit(self, b):
        """Catat pemakaian aturan kata cari (v=0) atau umpan balik warga (v=1 membantu, v=-1 belum)."""
        ks = [clean(x, 40).lower() for x in (b.get("ks") or []) if isinstance(x, str)][:3]
        v = b.get("v")
        v = v if v in (0, 1, -1) else 0
        if not ks or limited("rl:hit:" + self.ip(), 60, 3600):
            return self.json({"ok": True})
        ada = kata_cache()[3]
        ks = [k for k in ks if k in ada]
        if ks:
            h = "khit" if v == 0 else ("kup" if v == 1 else "kdn")
            cmds = [["HINCRBY", h, k, 1] for k in ks]
            if v == 0:
                cmds.append(["HINCRBY", "khd", time.strftime("%Y%m%d", wib()), 1])
                hk = "khw:" + time.strftime("%Y%m%d", wib())  # hitungan harian untuk "ramai ditanyakan"; kedaluwarsa sendiri
                cmds += [["HINCRBY", hk, k, 1] for k in ks] + [["EXPIRE", hk, 9 * 86400]]
            db().pipe(cmds)
        return self.json({"ok": True})

    def q1(self, k):
        return (parse_qs(urlparse(self.path).query).get(k) or [""])[0]

    # ---------- Kanal WhatsApp (Cloud API) dan Telegram ----------
    def kanal_ctx(self):
        d, v, ix, awal = kata_cache()
        kv = db().cmd("HGET", "kbli", "v")
        if kv:
            if _KB["v"] != kv:
                rows, v2, m = kbli_baca()
                _KB.update(v=v2, rows=rows, m=m)
        lokasi = [lok_meta_publik(i) for i in LOK_ORDER if not lok_sembunyi(i)]
        return {"idx": ix, "loket": loket_urut(), "label": label, "lokasi": lokasi, "cfg": cfg_all(), "kbli": _KB["rows"] if kv else [], "situs": "https://" + (self.headers.get("Host") or "")}

    def kanal_proses(self, ch, uid, mid, teks):
        """Jawab satu pesan masuk. Kembalikan teks balasan atau None bila dilewati (duplikat/terlalu sering/kanal dimatikan)."""
        if (cfg_all().get("kanal_" + ch, "1")) == "0":
            return None
        if mid and not db().cmd("SET", "kn:m:%s:%s" % (ch, mid), "1", "NX", "EX", 3600):
            return None
        if limited("rl:kn:%s:%s" % (ch, hashlib.sha256(str(uid).encode()).hexdigest()[:16]), 30, 3600):
            return None
        bal, ok = BOT.jawab(teks, self.kanal_ctx())
        q = clean(teks or "", 160).lower()
        q = re.sub(r"\+?\d[\d\s().-]{5,}\d", " ", re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", " ", q))
        q = re.sub(r"\s+", " ", q).strip()[:100]
        hari = time.strftime("%Y%m%d", wib())
        cmds = [["LPUSH", "kn:log", json.dumps({"t": now_ms(), "ch": ch, "id": "…" + re.sub(r"\D", "", str(uid))[-3:], "q": q, "ok": 1 if ok else 0}, ensure_ascii=False)], ["LTRIM", "kn:log", 0, 49],
                ["HINCRBY", "kn:n", "%s:%s" % (ch, hari), 1], ["HINCRBY", "kn:n", "%s:total" % ch, 1]]
        if not ok and len(q) >= 3 and re.search(r"[a-z]{3}", q):
            cmds += [["HINCRBY", "miss", q, 1], ["HSET", "missw", q, now_ms()]]
        db().pipe(cmds)
        return bal

    def kanal_wa(self, method, q, b):
        env = os.environ
        if method == "GET":  # verifikasi webhook oleh Meta
            vt = env.get("WA_VERIFY", "")
            if vt and (q.get("hub.mode") or [""])[0] == "subscribe" and hmac.compare_digest((q.get("hub.verify_token") or [""])[0], vt):
                return self.out(200, (q.get("hub.challenge") or [""])[0][:200], "text/plain; charset=utf-8")
            raise HttpError(403, "Verifikasi ditolak.")
        if method != "POST":
            raise HttpError(405, "Metode tidak didukung.")
        secret, tok, pid = env.get("WA_SECRET", ""), env.get("WA_TOKEN", ""), env.get("WA_PHONE_ID", "")
        if not (secret and tok and pid):
            raise HttpError(503, "Kanal WhatsApp belum dikonfigurasi.")
        exp = "sha256=" + hmac.new(secret.encode(), self.raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(exp, self.headers.get("X-Hub-Signature-256", "")):
            raise HttpError(403, "Tanda tangan tidak valid.")
        for en in b.get("entry") or []:
            for ch in en.get("changes") or []:
                for m in ((ch.get("value") or {}).get("messages") or [])[:5]:
                    frm = str(m.get("from") or "")
                    teks = (m.get("text") or {}).get("body") if m.get("type") == "text" else (((m.get("interactive") or {}).get("button_reply") or {}).get("title") if m.get("type") == "interactive" else None)
                    if not frm:
                        continue
                    bal = self.kanal_proses("wa", frm, m.get("id"), teks) if teks else self.kanal_proses("wa", frm, m.get("id"), "")
                    if bal:
                        try:
                            BOT.kirim_wa(tok, pid, frm, bal)
                        except Exception as e:
                            print("WA kirim gagal", repr(e))
        return self.json({"ok": True})

    def kanal_tg(self, b):
        env = os.environ
        tok, sec = env.get("TG_TOKEN", ""), env.get("TG_SECRET", "")
        if not (tok and sec):
            raise HttpError(503, "Kanal Telegram belum dikonfigurasi.")
        if not hmac.compare_digest(self.headers.get("X-Telegram-Bot-Api-Secret-Token", ""), sec):
            raise HttpError(403, "Rahasia webhook tidak cocok.")
        m = b.get("message") or {}
        cid = (m.get("chat") or {}).get("id")
        if cid is not None and (m.get("chat") or {}).get("type") == "private":
            bal = self.kanal_proses("tg", cid, "%s" % b.get("update_id"), m.get("text") or "")
            if bal:
                try:
                    BOT.kirim_tg(tok, cid, bal)
                except Exception as e:
                    print("TG kirim gagal", repr(e))
        return self.json({"ok": True})

    def populer_publik(self):
        """Pertanyaan yang paling ramai dalam 7 hari terakhir (dari pemakaian aturan Kata cari). Anonim: hanya kata kunci dan jumlahnya."""
        hari = [time.strftime("%Y%m%d", time.gmtime(time.time() + 7 * 3600 - i * 86400)) for i in range(7)]
        res = db().pipe([["HGETALL", "khw:" + h] for h in hari])
        tot = collections.Counter()
        for r in res:
            for k, v in hall(r).items():
                tot[k] += int(v)
        ada = kata_cache()[3]
        top = [{"k": k, "n": n} for k, n in tot.most_common(12) if k in ada][:6]
        return self.json({"populer": top}, extra=[("Cache-Control", "public, max-age=60, s-maxage=300")])

    def kata_publik(self):
        """Daftar aturan untuk pengunjung. Dipasang cache CDN selama satu tahun karena URL-nya memuat nomor versi."""
        d, v, _, _ = kata_cache()
        ringan = [{"k": x["k"], "t": x["t"], "j": x["j"]} if x.get("t") else {"k": x["k"], "j": x["j"]} for x in d if isinstance(x, dict)]
        hdr = [("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable")] if (v and self.q1("v") == v) else [("Cache-Control", "no-store")]
        return self.json({"v": v or "", "kata": ringan}, extra=hdr)

    def kbli_publik(self):
        """Data KBLI untuk pengunjung. URL memuat nomor versi, jadi boleh di-cache CDN selama satu tahun."""
        v = db().cmd("HGET", "kbli", "v")
        if not v:
            return self.json({"v": "", "m": {}, "rows": []}, extra=[("Cache-Control", "no-store")])
        if _KB["v"] != v:
            rows, v2, m = kbli_baca()
            _KB.update(v=v2, rows=rows, m=m)
        hdr = [("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable")] if self.q1("v") == _KB["v"] else [("Cache-Control", "no-store")]
        return self.json({"v": _KB["v"], "m": _KB["m"], "rows": _KB["rows"]}, extra=hdr)

    def info(self, ses):
        who = None
        if ses and ses["r"] == "adm":
            who = {"peran": "admin"}
        elif ses:
            p = parse(db().cmd("HGET", "pemohon", ses.get("id")))
            if p:
                who = {"peran": "pemohon", "nama": p["nama"], "hp": p["hp"], "email": p.get("email", "")}
        refresh_loket(0)
        c = cfg_all()
        bt = sorted([parse(v, {}) for v in hall(db().cmd("HGETALL", "berita")).values()], key=lambda x: (not x.get("sematkan"), -x.get("id", 0)))[:10]
        rt = sorted(float(x) for x in db().cmd("LRANGE", "rt", -50, -1) or [])
        balas = round(rt[len(rt) // 2]) if len(rt) >= 3 else None
        kv = db().cmd("HGET", "kata2", "v")
        kbv, kbm = db().pipe([["HGET", "kbli", "v"], ["HGET", "kbli", "m"]])
        kata = kata_baca()[0] if (not kv or self.q1("kata")) else []  # data lama / editor admin: sertakan; pengunjung biasa: ambil via /kata?v=
        self.json({"kata": kata, "kv": kv or "", "kata_max": KATA_MAX, "berita": bt, "balas_menit": balas, "mpp_roster": SKM_MPP, "kbv": kbv or "", "kbm": parse(kbm, {}) or {}, "lokasi": [lok_meta_publik(k) for k in LOKASI if not lok_sembunyi(k)],
                   "loket": [[e["lokasi"], e["no"], e["nama"], e["uraian"], e["sistem"], e.get("zona", ""), 1 if e.get("diskusi", True) else 0, 1 if bisa_booking("%s_%s" % (e["lokasi"], e["no"])) else 0, e.get("jam", ""), e.get("tautan", "")] for e in loket_urut()],
                   "cfg": {k: c.get(k, "") for k in ("wa", "jam", "info", "kuota")}, "piket": piket_cfg()["mode"], "kanal": {"tg": re.sub(r"[^A-Za-z0-9_]", "", os.environ.get("TG_USER", ""))[:40], "wa": re.sub(r"\D", "", os.environ.get("WA_BOT_NUM", ""))[:15]}, "saya": who},
                  extra=self.refresh(ses) if ses and who else ())

    def daftar(self, b):
        ip = self.ip()
        if limited("rl:daftar:" + ip, 10, 3600):
            raise HttpError(429, "Terlalu banyak pendaftaran. Coba lagi nanti.")
        nama, hp, em, pin = clean(b.get("nama", ""), 60), norm_hp(b.get("hp", "")), ok_email(b.get("email", "")), str(b.get("pin", ""))
        if len(nama) < 2:
            raise HttpError(400, "Isi nama Anda.")
        if not hp:
            raise HttpError(400, "Nomor HP tidak valid. Contoh: 081234567890.")
        if not em:
            raise HttpError(400, "Email tidak valid.")
        if not re.match(r"^\d{6}$", pin):
            raise HttpError(400, "PIN harus 6 angka.")
        pid = int(db().cmd("INCR", "seq:pemohon"))
        if int(db().cmd("HSETNX", "hp", hp, pid)) == 0:
            raise HttpError(409, "Nomor HP sudah terdaftar. Silakan masuk dengan PIN Anda.")
        db().cmd("HSET", "pemohon", pid, json.dumps({"id": pid, "nama": nama, "hp": hp, "email": em, "pin": hash_pw(pin), "dibuat": now_ms()}))
        tok = sign({"r": "user", "id": pid, "exp": int(time.time()) + 3600})
        self.json({"ok": True, "saya": {"peran": "pemohon", "nama": nama, "hp": hp, "email": em}}, extra=self.cookie(tok, 3600))

    def masuk(self, b):
        hp, pin, ip = norm_hp(b.get("hp", "")), str(b.get("pin", "")), self.ip()
        if not hp or not re.match(r"^\d{6}$", pin):
            raise HttpError(400, "Nomor HP atau PIN tidak valid.")
        if limited("rl:pin:" + hp, 5, 900) or limited("rl:pinip:" + ip, 30, 900):
            raise HttpError(429, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.")
        pid = db().cmd("HGET", "hp", hp)
        p = parse(db().cmd("HGET", "pemohon", pid)) if pid else None
        if not p or not check_pw(pin, p["pin"]):
            raise HttpError(401, "Nomor HP atau PIN salah.")
        db().cmd("DEL", "rl:pin:" + hp)
        tok = sign({"r": "user", "id": p["id"], "exp": int(time.time()) + 3600})
        self.json({"ok": True, "saya": {"peran": "pemohon", "nama": p["nama"], "hp": p["hp"], "email": p.get("email", "")}}, extra=self.cookie(tok, 3600))

    def admin_masuk(self, b):
        ip, pw = self.ip(), str(b.get("password", ""))
        if limited("rl:adm:" + ip, 5, 600):
            raise HttpError(429, "Terlalu banyak percobaan. Coba lagi dalam 10 menit.")
        h = db().cmd("HGET", "cfg", "admin_hash") or ""
        env = os.environ.get("ADMIN_PASSWORD") or ""
        ok = check_pw(pw, h) if h else (bool(env) and hmac.compare_digest(pw.encode(), env.encode()))
        if not ok:
            time.sleep(0.8)
            raise HttpError(401, "Kata sandi admin salah.")
        if not h:  # pertama kali: simpan hash agar bisa diganti dari panel
            h = hash_pw(pw)
            db().cmd("HSET", "cfg", "admin_hash", h)
        db().cmd("DEL", "rl:adm:" + ip)
        tok = sign({"r": "adm", "v": h[:12], "exp": int(time.time()) + 1800})
        self.json({"ok": True, "saya": {"peran": "admin"}}, extra=self.cookie(tok, 1800))

    # ---- pemohon ----
    def user_pesan(self, ses, ex):
        pid = ses["id"]
        ks, pids, bids = db().pipe([["SMEMBERS", "pk:%s" % pid], ["SMEMBERS", "pmh:%s" % pid], ["SMEMBERS", "bk:%s" % pid]])
        ks = sorted(ks or [])
        n = len(ks)
        cmds = [["LRANGE", "msgs:%s|%s" % (pid, k), 0, -1] for k in ks] + [["HGETALL", "nilai"]]
        idr = None
        if ks:
            idr = len(cmds)
            cmds.append(["HMGET", "rd"] + ["%s|%s" % (pid, k) for k in ks])
        ip = ib = None
        if pids:
            ip = len(cmds)
            cmds.append(["HMGET", "pmh"] + list(pids))
        if bids:
            ib = len(cmds)
            cmds.append(["HMGET", "bk"] + sorted(bids, key=lambda x: -int(x))[:20])
        it = len(cmds)
        if ks:
            fs = ["%s|%s" % (pid, k) for k in ks]
            cmds += [["HMGET", "tkt"] + fs, ["HMGET", "sel"] + fs, ["HMGET", "tla"] + fs]
        res = db().pipe(cmds)
        ms = []
        for k, lst in zip(ks, res[:n]):
            for x in lst or []:
                m = parse(x)
                if m:
                    ms.append({"id": m["id"], "kunci": k, "dari": m["dari"], "isi": m["isi"], "waktu": m["waktu"], "bot": m.get("bot", 0), "hapus": m.get("hapus", 0), "edit": m.get("edit", 0), "re": m.get("re", ""), "tk": m.get("tk", "")})
        try:  # mode "tunda": jawab otomatis bila pegawai belum membalas dalam N menit (dipicu saat pemohon membuka percakapan)
            pc = piket_cfg()
            if pc["mode"] == "tunda" and ms:
                akhir = {}
                for m in sorted(ms, key=lambda x: x["waktu"]):
                    akhir[m["kunci"]] = m
                for k2, m in akhir.items():
                    if m["dari"] == "pemohon" and not m["hapus"] and now_ms() - m["waktu"] >= pc["tunggu"] * 60000:
                        nb = piket_balas(pid, k2, pc)
                        if nb:
                            ms.append({"id": nb["id"], "kunci": k2, "dari": "admin", "bot": 1, "isi": nb["isi"], "waktu": nb["waktu"], "hapus": 0, "edit": 0, "re": "", "tk": nb["tk"]})
        except Exception as e:
            print("PIKET", repr(e))
        nl = hall(res[n])
        pm, bk = [], []
        if ip is not None:
            for x in res[ip] or []:
                o = parse(x) if x else None
                if o:
                    pm.append({"id": o["id"], "jenis": o["jenis"], "nomor": o["nomor"], "status": o["status"], "ubah": o["ubah"]})
        if ib is not None:
            for x in res[ib] or []:
                o = bk_norm(parse(x)) if x else None
                if o and o["status"] in ("Terjadwal", "Sudah tiba", "Dipanggil"):
                    bk.append({"id": o["id"], "kode": o["kode"], "kunci": o["kunci"], "status": o["status"], "tanggal": o["tanggal"], "jam": o["jam"]})
        dib = {k: int(v) for k, v in zip(ks, res[idr] or []) if v} if idr is not None else {}
        tiket = []
        for i, (k, lst) in enumerate(zip(ks, res[:n])):
            cur, sl, la = parse(res[it][i], {}) or {}, int(res[it + 1][i] or 0), int(res[it + 2][i] or 0)
            g = {}
            for x in lst or []:
                m = parse(x)
                if not m or not m.get("tk"):
                    continue
                o = g.setdefault(m["tk"], {"no": m["tk"], "kunci": k, "buka": m["waktu"], "akhir": m["waktu"], "n": 0, "adm": 0, "balas": 0})
                o["n"] += 1
                o["akhir"] = max(o["akhir"], m["waktu"])
                if m["dari"] == "admin" and not m.get("hapus"):
                    o["adm"] += 1
                    o["balas"] = o["balas"] or m["waktu"]
            for no, o in g.items():
                if no == cur.get("no"):
                    tutup = bool(sl and sl >= cur.get("t", 0))
                    o["status"] = "Selesai" if tutup else "Dibalas" if o["adm"] else "Dibaca admin" if dib.get(k, 0) >= cur.get("t", 0) else "Diterima"
                    o["tutup"] = sl if tutup else 0
                else:
                    o["status"], o["tutup"] = "Selesai", 0
                o["dibaca"] = dib.get(k, 0) if o["status"] != "Diterima" else 0
                tiket.append(o)
        tiket.sort(key=lambda o: -o["akhir"])
        self.json({"tiket": tiket[:60], "pesan": ms, "pmh": pm, "bk": bk, "dibaca": dib, "status": {k: {"nilai": int(nl["%s|%s" % (pid, k)])} for k in ks if "%s|%s" % (pid, k) in nl}}, extra=ex)

    # ---- permohonan (pemohon) ----
    def user_pmh(self, ses, ex):
        ids = db().cmd("SMEMBERS", "pmh:%s" % ses["id"]) or []
        rows = [parse(x) for x in (db().cmd("HMGET", "pmh", *ids) if ids else []) if x]
        self.json({"daftar": sorted(rows, key=lambda o: -o["ubah"]), "status": STATUS_PMH}, extra=ex)

    # ---- booking kunjungan (per loket / instansi) ----
    def slot(self, q, ex):
        k, tgl = (q.get("kunci") or [""])[0], (q.get("tanggal") or [""])[0]
        if not bisa_booking(k):
            raise HttpError(400, "Loket ini tidak menerima booking kunjungan.")
        try:
            time.strptime(tgl, "%Y-%m-%d")
        except ValueError:
            raise HttpError(400, "Tanggal tidak valid.")
        kuota = int(db().cmd("HGET", "cfg", "kuota") or 10)
        cnt = db().pipe([["GET", "bks:%s|%s|%s" % (k, tgl, j)] for j in SLOTS])
        self.json({"kuota": kuota, "slot": [{"jam": j, "sisa": max(0, kuota - int(c or 0))} for j, c in zip(SLOTS, cnt)]}, extra=ex)

    def user_bk(self, ses, ex):
        ids = db().cmd("SMEMBERS", "bk:%s" % ses["id"]) or []
        rows = [bk_norm(parse(x)) for x in (db().cmd("HMGET", "bk", *ids) if ids else []) if x]
        rows = sorted(rows, key=lambda o: (o["tanggal"], o["jam"]), reverse=True)[:60]
        hari, aktif = time.strftime("%Y-%m-%d", wib()), ("Terjadwal", "Sudah tiba", "Dipanggil")
        if any(o["tanggal"] == hari and o["status"] in aktif for o in rows):
            ids2 = db().cmd("SMEMBERS", "bkd:%s" % hari) or []
            semua = [bk_norm(parse(x)) for x in (db().cmd("HMGET", "bk", *ids2) if ids2 else []) if x]
            for o in rows:
                if o["tanggal"] == hari and o["status"] in aktif:
                    o["depan"] = sum(1 for z in semua if z["kunci"] == o["kunci"] and z["status"] in aktif and z["id"] != o["id"] and (z["jam"], z["kode"]) < (o["jam"], o["kode"]))
        self.json({"daftar": rows}, extra=ex)

    def user_bk_tiba(self, ses, b, ex):
        o = bk_norm(parse(db().cmd("HGET", "bk", str(b.get("id", "")))))
        if not o or o["pid"] != ses["id"] or o["status"] != "Terjadwal":
            raise HttpError(400, "Booking ini tidak bisa di-check-in.")
        t = wib()
        if o["tanggal"] != time.strftime("%Y-%m-%d", t):
            raise HttpError(400, "Check-in hanya bisa pada hari kunjungan.")
        h, m = [int(x) for x in o["jam"].split(":")]
        buka = h * 60 + m - 60
        if t.tm_hour * 60 + t.tm_min < buka:
            raise HttpError(400, "Check-in dibuka 60 menit sebelum jam booking (mulai %02d:%02d)." % (buka // 60, buka % 60))
        o["status"], o["tiba"] = "Sudah tiba", now_ms()
        db().cmd("HSET", "bk", o["id"], json.dumps(o, ensure_ascii=False))
        self.json({"ok": True}, extra=ex)

    def user_bk_baru(self, ses, b, ex):
        pid, tgl = ses["id"], str(b.get("tanggal", ""))
        items = b.get("item")
        if items is None:
            items = [{"kunci": b.get("kunci", ""), "jam": b.get("jam", "")}]
        if not isinstance(items, list) or not 1 <= len(items) <= 6:
            raise HttpError(400, "Pilih 1 sampai 6 loket untuk satu kunjungan.")
        kep = clean(b.get("keperluan", ""), 200)
        if len(kep) < 3:
            raise HttpError(400, "Isi keperluan kunjungan.")
        todo, jams, keys = [], set(), set()
        for it in items:
            k, j = str(it.get("kunci", "")), str(it.get("jam", ""))
            if not bisa_booking(k) or j not in SLOTS:
                raise HttpError(400, "Loket atau jam tidak valid.")
            if j in jams:
                raise HttpError(400, "Dua loket tidak bisa dijadwalkan di jam yang sama.")
            if k in keys:
                raise HttpError(400, "Loket yang sama dipilih dua kali.")
            cek_tanggal(tgl, j)
            jams.add(j), keys.add(k), todo.append((k, j))
        ids = db().cmd("SMEMBERS", "bk:%s" % pid) or []
        mine = [bk_norm(parse(x)) for x in (db().cmd("HMGET", "bk", *ids) if ids else []) if x]
        aktif = [o for o in mine if o["status"] in ("Terjadwal", "Sudah tiba", "Dipanggil") and o["tanggal"] >= time.strftime("%Y-%m-%d", wib())]
        if len(aktif) + len(todo) > 6:
            raise HttpError(400, "Maksimal 6 booking aktif. Batalkan sebagian dulu.")
        for o in aktif:
            if o["tanggal"] == tgl and o["jam"] in jams:
                raise HttpError(400, "Anda sudah punya booking di jam %s pada tanggal itu." % o["jam"])
            if o["tanggal"] == tgl and o["kunci"] in keys:
                raise HttpError(400, "Anda sudah booking %s pada tanggal itu." % label(o["kunci"]))
        kuota = int(db().cmd("HGET", "cfg", "kuota") or 10)
        diambil = []
        try:
            for k, j in todo:
                sk = "bks:%s|%s|%s" % (k, tgl, j)
                if int(db().cmd("INCR", sk)) > kuota:
                    db().cmd("DECR", sk)
                    raise HttpError(409, "Jam %s untuk %s sudah penuh. Pilih jam lain." % (j, label(k)))
                diambil.append(sk)
        except HttpError:
            for sk in diambil:
                db().cmd("DECR", sk)
            raise
        hasil = []
        for k, j in sorted(todo, key=lambda x: x[1]):
            lok, no = k.rsplit("_", 1)
            urut = int(db().cmd("INCR", "bkn:%s|%s" % (k, tgl)))
            bid = int(db().cmd("INCR", "seq:booking"))
            kode = "%s%02d-%s-%03d" % (lok[:3].upper(), int(no), tgl[8:10] + tgl[5:7], urut)
            o = {"id": bid, "pid": pid, "kunci": k, "lokasi": lok, "tanggal": tgl, "jam": j, "keperluan": kep, "kode": kode, "status": "Terjadwal", "dibuat": now_ms()}
            db().pipe([["HSET", "bk", bid, json.dumps(o, ensure_ascii=False)], ["SADD", "bk:%s" % pid, bid], ["SADD", "bkd:%s" % tgl, bid]])
            hasil.append(o)
        self.json({"ok": True, "booking": hasil}, extra=ex)

    def user_bk_batal(self, ses, b, ex):
        bid = str(b.get("id", ""))
        o = bk_norm(parse(db().cmd("HGET", "bk", bid)))
        if not o or o["pid"] != ses["id"] or o["status"] != "Terjadwal":
            raise HttpError(400, "Booking tidak bisa dibatalkan.")
        o["status"] = "Batal"
        db().pipe([["HSET", "bk", bid, json.dumps(o, ensure_ascii=False)], ["DECR", slot_key(o)]])
        self.json({"ok": True}, extra=ex)

    # ---- layar antrean (publik, tanpa data pribadi) ----
    def layar(self, q):
        if limited("rl:layar:" + self.ip(), 120, 60):
            raise HttpError(429, "Terlalu sering memuat.")
        lok = (q.get("lokasi") or [""])[0]
        rows = [parse(x) for x in db().cmd("LRANGE", "layar", 0, -1) or []]
        rows = [o for o in rows if o and (not lok or o["lokasi"] == lok)][-12:][::-1]
        self.json({"daftar": [{"kode": o["kode"], "loket": o["loket"], "lokasi": LOKASI.get(o["lokasi"], ""), "waktu": o["waktu"]} for o in rows]})

    # ---- SKM ----
    def user_skm(self, ses, b, ex):
        lok, unit, j = str(b.get("lokasi", "")), str(b.get("unit", "")), b.get("j")
        if lok not in LOKASI or not isinstance(j, list) or len(j) != 9 or any(x not in (1, 2, 3, 4) for x in j):
            raise HttpError(400, "Isi semua 9 pertanyaan dengan nilai 1 sampai 4.")
        zona = ""
        if unit:
            if unit in ROSTER and lok == "mpp":
                zona = ROSTER[unit]["zona"]
            elif unit in LOKET and LOKET[unit]["lokasi"] == lok:
                zona = LOKET[unit].get("zona", "")
            else:
                raise HttpError(400, "Unit yang dinilai tidak valid.")
        if limited("rl:skm:%s" % ses["id"], 6, 86400):
            raise HttpError(429, "Anda sudah mengisi survei beberapa kali hari ini. Terima kasih.")
        db().pipe([["RPUSH", "skm", json.dumps({"t": now_ms(), "lokasi": lok, "unit": unit, "zona": zona, "j": j, "saran": clean(b.get("saran", ""), 300)}, ensure_ascii=False)], ["LTRIM", "skm", -5000, -1]])
        self.json({"ok": True}, extra=ex)

    def user_kirim(self, ses, b, ex):
        pid, k, isi = ses["id"], str(b.get("kunci", "")), clean(b.get("isi", ""), 800)
        if not valid_key(k) or not isi:
            raise HttpError(400, "Pesan tidak valid.")
        if LOKET[k].get("sembunyi") or lok_sembunyi(LOKET[k]["lokasi"]) or not LOKET[k].get("diskusi", True):
            raise HttpError(400, "Fasilitas ini tidak menerima pertanyaan lewat aplikasi.")
        if re.search(r"\d{16}", re.sub(r"[\s.\-]", "", isi)):
            raise HttpError(400, "Demi keamanan, jangan kirim NIK/KTP lengkap di sini.")
        if limited("rl:kirim:%s" % pid, 5, 60):
            raise HttpError(429, "Terlalu banyak pesan dalam satu menit.")
        if int(db().cmd("LLEN", "msgs:%s|%s" % (pid, k)) or 0) >= 200:
            raise HttpError(400, "Percakapan ini sudah penuh. Silakan hubungi loket langsung.")
        tk = add_msg(pid, k, "pemohon", isi)
        pc = piket_cfg()
        bot = False
        if pc["mode"] == "langsung" and not b.get("eskalasi"):
            try:
                bot = bool(piket_balas(pid, k, pc))
            except Exception as e:
                print("PIKET", repr(e))
        if b.get("eskalasi"):
            self._eskalasi(pid, k)
        self.json({"ok": True, "tk": tk, "bot": bot}, extra=ex)

    def _eskalasi(self, pid, k):
        """Pemohon meminta dijawab langsung oleh pegawai: hentikan jawaban otomatis dan beri tag Eskalasi."""
        f = "%s|%s" % (pid, k)
        t = parse(db().cmd("HGET", "ttag", f), {}) or {}
        tags = list(t.get("tags") or [])
        if "Eskalasi" not in tags:
            tags.append("Eskalasi")
        t["tags"] = tags
        db().pipe([["HSET", "pkesc", f, now_ms()], ["HSET", "ttag", f, json.dumps(t, ensure_ascii=False)]])

    def _cari_pesan(self, pid, k, mid, dari):
        try:
            mid = int(mid)
        except (TypeError, ValueError):
            raise HttpError(400, "Data tidak valid.")
        if not valid_key(k):
            raise HttpError(400, "Data tidak valid.")
        key = "msgs:%s|%s" % (pid, k)
        ms = [parse(x) for x in (db().cmd("LRANGE", key, 0, -1) or [])]
        for i, m in enumerate(ms):
            if m and m.get("id") == mid:
                if m.get("dari") != dari:
                    raise HttpError(403, "Hanya pesan milik sendiri yang dapat diubah.")
                if m.get("hapus"):
                    raise HttpError(400, "Pesan ini sudah dihapus.")
                return key, i, m, ms
        raise HttpError(404, "Pesan tidak ditemukan.")

    def _simpan_pesan(self, pid, k, key, i, m, ms, teks_terakhir=None):
        cmds = [["LSET", key, i, json.dumps(m, ensure_ascii=False)]]
        if teks_terakhir is not None and i == len(ms) - 1:
            cmds.append(["HSET", "tlast", "%s|%s" % (pid, k), json.dumps({"teks": teks_terakhir[:100], "waktu": m["waktu"]}, ensure_ascii=False)])
        db().pipe(cmds)

    def _ubah(self, pid, k, b, dari, ex):
        """Ubah isi pesan sendiri kapan saja. Versi sebelumnya disimpan (maks. 5) agar lawan bicara bisa melihat apa yang berubah."""
        isi = clean(b.get("isi", ""), 800)
        if not isi:
            raise HttpError(400, "Pesan tidak boleh kosong.")
        if dari == "pemohon" and re.search(r"\d{16}", re.sub(r"[\s.\-]", "", isi)):
            raise HttpError(400, "Demi keamanan, jangan kirim NIK/KTP lengkap di sini.")
        if limited("rl:ubah:%s:%s" % (dari, pid), 10, 60):
            raise HttpError(429, "Terlalu banyak perubahan dalam satu menit.")
        key, i, m, ms = self._cari_pesan(pid, k, b.get("id"), dari)
        if isi != m.get("isi"):
            m["rev"] = (m.get("rev") or [])[-4:] + [{"isi": m.get("isi", ""), "waktu": m.get("edit") or m["waktu"]}]
            m["isi"], m["edit"] = isi, now_ms()
            self._simpan_pesan(pid, k, key, i, m, ms, isi)
        self.json({"ok": True}, extra=ex)

    def _hapus(self, pid, k, b, dari, ex):
        """Hapus lunak: isi dan riwayat revisi dikosongkan; lawan bicara melihat penanda 'dihapus'."""
        if limited("rl:hapus:%s:%s" % (dari, pid), 10, 60):
            raise HttpError(429, "Terlalu banyak penghapusan dalam satu menit.")
        key, i, m, ms = self._cari_pesan(pid, k, b.get("id"), dari)
        m["isi"], m["hapus"], m["rev"], m["re"] = "", now_ms(), [], ""
        self._simpan_pesan(pid, k, key, i, m, ms, "(pesan dihapus)")
        self.json({"ok": True}, extra=ex)

    def user_ubah(self, ses, b, ex):
        return self._ubah(ses["id"], str(b.get("kunci", "")), b, "pemohon", ex)

    def user_hapus(self, ses, b, ex):
        return self._hapus(ses["id"], str(b.get("kunci", "")), b, "pemohon", ex)

    def user_reaksi(self, ses, b, ex):
        """Pemohon memberi reaksi emoji pada balasan admin (satu reaksi per pesan; kirim kosong untuk menghapus)."""
        e = str(b.get("e", ""))
        if e not in ("", "\U0001F44D", "\u2764\ufe0f", "\U0001F64F", "\U0001F60A", "\U0001F62E"):
            raise HttpError(400, "Reaksi tidak valid.")
        if limited("rl:reaksi:%s" % ses["id"], 20, 60):
            raise HttpError(429, "Terlalu cepat.")
        k = str(b.get("kunci", ""))
        key, i, m, ms = self._cari_pesan(ses["id"], k, b.get("id"), "admin")
        m["re"] = e
        self._simpan_pesan(ses["id"], k, key, i, m, ms)
        self.json({"ok": True}, extra=ex)

    def user_nilai(self, ses, b, ex):
        k, v, pid = str(b.get("kunci", "")), b.get("nilai"), ses["id"]
        if not valid_key(k) or v not in (1, 2, 3, 4, 5):
            raise HttpError(400, "Penilaian tidak valid.")
        if not db().cmd("HGET", "tla", "%s|%s" % (pid, k)):
            raise HttpError(400, "Belum ada balasan admin untuk dinilai.")
        db().cmd("HSET", "nilai", "%s|%s" % (pid, k), v)
        self.json({"ok": True}, extra=ex)

    # ---- admin ----
    def admin(self, method, r, q, b, ex):
        if r == "percakapan":
            return self.json({"daftar": threads()}, extra=ex)
        if r == "pesan":
            pid, k = int((q.get("pid") or ["0"])[0] or 0), (q.get("kunci") or [""])[0]
            if not valid_key(k):
                raise HttpError(400, "Data tidak valid.")
            f = "%s|%s" % (pid, k)
            res = db().pipe([["LRANGE", "msgs:" + f, 0, -1], ["HSET", "rd", f, now_ms()], ["HGET", "cat", f], ["HGET", "ttag", f],
                             ["HGET", "pemohon", pid]])
            msgs = [m for m in (parse(x) for x in res[0] or []) if m]
            nama = (parse(res[4], {}) or {}).get("nama", "")
            analisa = AN.ringkas_percakapan(msgs, now_ms(), fmt_wib)
            saran = AN.saran_balasan(msgs, kata_cache()[2], nama, label(k), label) if msgs and msgs[-1]["dari"] == "pemohon" else []
            return self.json({"pesan": msgs, "catatan": res[2] or "", "tag": parse(res[3], {}) or {}, "analisa": analisa, "saran": saran}, extra=ex)
        if r == "tiket" and method == "GET":
            no = clean((q.get("no") or [""])[0], 20).upper()
            f = db().cmd("HGET", "tktidx", no) if re.match(r"^TKT-\d{4}-\d{3,}$", no) else None
            if not f or "|" not in f:
                raise HttpError(404, "Nomor tiket tidak ditemukan.")
            pid, k = f.split("|", 1)
            p = parse(db().cmd("HGET", "pemohon", pid), {}) or {}
            return self.json({"pid": int(pid), "kunci": k, "nama": p.get("nama", ""), "hp": p.get("hp", ""), "email": p.get("email", ""), "tk": no}, extra=ex)
        if r == "analitik" and method == "GET":
            hari = int((q.get("hari") or ["30"])[0] or 30)
            return self.json(AN.statistik(muat_semua(), now_ms(), hari, label), extra=ex)
        if r == "cari" and method == "GET":
            kata = clean((q.get("q") or [""])[0], 60).lower()
            if len(kata) < 2:
                raise HttpError(400, "Ketik minimal 2 huruf untuk mencari.")
            hasil = []
            for row in muat_semua():
                for m in sorted(row["msgs"], key=lambda x: -x.get("waktu", 0)):
                    i = m["isi"].lower().find(kata)
                    if i >= 0:
                        a = max(0, i - 40)
                        hasil.append({"pid": row["pid"], "kunci": row["kunci"], "nama": row["nama"], "hp": row["hp"], "loket": label(row["kunci"]), "dari": m["dari"],
                                      "waktu": m["waktu"], "cuplikan": ("…" if a else "") + m["isi"][a:i + len(kata) + 80], "mulai": i - a + (1 if a else 0), "panjang": len(kata)})
                        break
            hasil.sort(key=lambda x: -x["waktu"])
            return self.json({"daftar": hasil[:40], "total": len(hasil)}, extra=ex)
        if r == "analisis.xlsx":
            return self.analisis_xlsx(ex)
        if r == "templat" and method == "GET":
            t = parse(db().cmd("HGET", "cfg", "qr"), None)
            return self.json({"daftar": t if isinstance(t, list) else ["Terima kasih, pertanyaan Anda sudah kami terima dan sedang kami proses.", "Silakan datang ke loket terkait dengan membawa dokumen asli dan fotokopi persyaratan.", "Mohon lengkapi berkas yang kurang, lalu ajukan kembali melalui sistem yang sesuai.", "Untuk penjelasan lebih lanjut, kami akan menghubungi Anda melalui WhatsApp."]}, extra=ex)
        if r == "kata.xlsx":
            return self.kata_xlsx(ex, False)
        if r == "kata-templat.xlsx":
            return self.kata_xlsx(ex, True)
        if r == "kata/impor" and method == "POST":
            try:
                raw = base64.b64decode(str(b.get("data", "")))
            except Exception:
                raise HttpError(400, "Berkas tidak terbaca.")
            if not raw or len(raw) > 3000000:
                raise HttpError(400, "Berkas kosong atau lebih dari 3 MB.")
            try:
                rows = kata_baca_baris(raw)
            except HttpError:
                raise
            except Exception as e:
                print("IMPOR", repr(e))
                raise HttpError(400, "Berkas tidak bisa dibaca. Pastikan berformat .xlsx atau .csv yang valid.")
            ok, lewat = kata_dari_baris(rows)
            return self.json({"aturan": ok[:KATA_MAX], "lewat": lewat[:40], "total_lewat": len(lewat)}, extra=ex)
        if r == "kstat" and method == "GET":
            res = db().pipe([["HGETALL", "khit"], ["HGETALL", "kup"], ["HGETALL", "kdn"], ["HGETALL", "khd"], ["HGETALL", "kmd"]])
            hit, up, dn, khd, kmd = [{k: int(float(v)) for k, v in hall(x).items()} for x in res]
            days = []
            for i in range(6, -1, -1):
                t = time.gmtime(time.time() + 7 * 3600 - i * 86400)
                d = time.strftime("%Y%m%d", t)
                days.append({"d": time.strftime("%d/%m", t), "hit": khd.get(d, 0), "miss": kmd.get(d, 0)})
            return self.json({"hit": hit, "up": up, "dn": dn, "days": days}, extra=ex)
        if r == "kstat/reset" and method == "POST":
            db().pipe([["DEL", k] for k in ("khit", "kup", "kdn", "khd", "kmd")])
            return self.json({"ok": True}, extra=ex)
        if r == "miss" and method == "GET":
            c, w = [hall(x) for x in db().pipe([["HGETALL", "miss"], ["HGETALL", "missw"]])]
            d = sorted([{"q": k, "n": int(v), "w": int(w.get(k) or 0)} for k, v in c.items()], key=lambda x: (-x["n"], -x["w"]))[:100]
            return self.json({"daftar": d}, extra=ex)
        if r == "miss/hapus" and method == "POST":
            if b.get("semua"):
                db().pipe([["DEL", "miss"], ["DEL", "missw"]])
            else:
                qs = [clean(x, 100) for x in (b.get("qs") or []) if isinstance(x, str)][:100]
                db().pipe([["HDEL", "miss", x] for x in qs] + [["HDEL", "missw", x] for x in qs])
            return self.json({"ok": True}, extra=ex)
        if r == "rekap.csv":
            return self.rekap(ex)
        if r == "data.xlsx":
            return self.xlsx(ex)
        if r == "permohonan" and method == "GET":
            ids = sorted([int(x) for x in db().cmd("SMEMBERS", "pmhall") or []], reverse=True)[:100]
            rows = [parse(x) for x in (db().cmd("HMGET", "pmh", *ids) if ids else []) if x]
            pm = hall(db().cmd("HGETALL", "pemohon"))
            for o in rows:
                p = parse(pm.get(str(o["pid"])), {})
                o["nama"], o["hp"] = p.get("nama", "?"), p.get("hp", "")
            return self.json({"daftar": rows, "status": STATUS_PMH}, extra=ex)
        if r == "booking" and method == "GET":
            tgl = (q.get("tanggal") or [""])[0]
            try:
                time.strptime(tgl, "%Y-%m-%d")
            except ValueError:
                raise HttpError(400, "Tanggal tidak valid.")
            ids = db().cmd("SMEMBERS", "bkd:%s" % tgl) or []
            rows = [bk_norm(parse(x)) for x in (db().cmd("HMGET", "bk", *ids) if ids else []) if x]
            pm = hall(db().cmd("HGETALL", "pemohon"))
            for o in rows:
                p = parse(pm.get(str(o["pid"])), {})
                o["nama"], o["hp"] = p.get("nama", "?"), p.get("hp", "")
                o["lokasi_nama"] = LOKASI.get(o["lokasi"], o["lokasi"])
                o["loket"] = label(o["kunci"])
            return self.json({"daftar": sorted(rows, key=lambda o: (o["jam"], o["kode"])), "kuota": int(db().cmd("HGET", "cfg", "kuota") or 10)}, extra=ex)
        if r == "ringkasan" and method == "GET":
            hari = time.strftime("%Y-%m-%d", wib())
            hh = [time.strftime("%Y-%m-%d", time.gmtime(time.time() + 7 * 3600 + i * 86400)) for i in range(7)]
            sc = db().pipe([["SCARD", "bkd:%s" % d] for d in hh] + [["HLEN", "pemohon"]])
            ids = db().cmd("SMEMBERS", "bkd:%s" % hari) or []
            bk = [parse(x) for x in (db().cmd("HMGET", "bk", *ids) if ids else []) if x]
            bs = {}
            for o in bk:
                bs[o["status"]] = bs.get(o["status"], 0) + 1
            pids = (db().cmd("SMEMBERS", "pmhall") or [])[:500]
            ps = {}
            for x in (db().cmd("HMGET", "pmh", *pids) if pids else []):
                o = parse(x) if x else None
                if o:
                    ps[o["status"]] = ps.get(o["status"], 0) + 1
            ts = threads()
            gn, gd = [hall(x) for x in db().pipe([["HGETALL", "gm:n"], ["HGETALL", "gm:d"]])]
            gdays = []
            for i in range(6, -1, -1):
                t = time.gmtime(time.time() + 7 * 3600 - i * 86400)
                gdays.append({"d": time.strftime("%d/%m", t), "n": int(gd.get(time.strftime("%Y%m%d", t), 0))})
            game = {"per": {k: int(gn.get(k, 0)) for k in self.GAMES}, "hari": gdays}
            rows = [o for o in (parse(x) for x in db().cmd("LRANGE", "skm", 0, -1) or []) if o]
            skm = None
            if rows:
                av = [sum(o["j"][i] for o in rows) / len(rows) for i in range(9)]
                ikm = round(sum(av) / 9 * 25, 2)
                skm = {"n": len(rows), "ikm": ikm, "mutu": kategori_ikm(ikm)}
            return self.json({"pend": sum(1 for t in ts if t["pend"]), "percakapan": len(ts), "pemohon": int(sc[-1] or 0), "hari": hari,
                              "booking_hari_ini": {"total": len(bk), "status": bs}, "booking_7hari": [{"tanggal": d, "n": int(c or 0)} for d, c in zip(hh, sc[:7])],
                              "pmh": ps, "skm": skm, "game": game}, extra=ex)
        if r == "skm" and method == "GET":
            rows = [parse(x) for x in db().cmd("LRANGE", "skm", 0, -1) or []]
            rows = [o for o in rows if o]

            def ringkas(rs):
                if not rs:
                    return None
                av = [round(sum(o["j"][i] for o in rs) / len(rs), 2) for i in range(9)]
                ikm = round(sum(av) / 9 * 25, 2)
                return {"n": len(rs), "unsur": av, "ikm": ikm, "mutu": kategori_ikm(ikm)}
            per = {}
            for l, nm in LOKASI.items():
                rg = ringkas([o for o in rows if o["lokasi"] == l])
                if rg:
                    per[l] = dict(rg, nama=nm)
            saran = [{"lokasi": LOKASI.get(o["lokasi"], ""), "saran": o["saran"], "waktu": fmt_wib(o["t"])} for o in reversed(rows) if o.get("saran")][:20]
            zon = {}
            for o in rows:
                if o["lokasi"] == "mpp" and o.get("zona"):
                    zon.setdefault(o["zona"], []).append(o)
            per_zona = {z: ringkas(rs) for z, rs in zon.items()}
            un = {}
            for o in rows:
                if o.get("unit"):
                    un.setdefault((o["lokasi"], o["unit"]), []).append(o)
            per_unit = []
            for (l, u), rs in un.items():
                nama = ROSTER[u]["nama"] if u in ROSTER else (label(u).split(" - ", 1)[-1] if u in LOKET else u)
                per_unit.append(dict(ringkas(rs), lokasi=LOKASI.get(l, l), nama=nama, zona=(rs[0].get("zona") or "")))
            per_unit.sort(key=lambda x: -x["ikm"])
            return self.json({"unsur": SKM_UNSUR, "total": ringkas(rows), "per": per, "per_zona": per_zona, "per_unit": per_unit[:80], "saran": saran}, extra=ex)
        if r == "loket" and method == "GET":
            refresh_loket(0)
            return self.json({"lokasi": [lok_meta_publik(k, True) for k in LOKASI],
                              "loket": [dict(e, kunci="%s_%s" % (e["lokasi"], e["no"]), asli=("%s_%s" % (e["lokasi"], e["no"])) in BASE,
                                             diubah=(("%s_%s" % (e["lokasi"], e["no"])) in (_LX["raw"] or {}))) for e in loket_urut(True)]}, extra=ex)
        if method != "POST":
            raise HttpError(404, "Tidak ditemukan.")
        if r == "permohonan/baru":
            hp, jenis, nomor = norm_hp(b.get("hp", "")), clean(b.get("jenis", ""), 100), clean(b.get("nomor", ""), 40)
            pid = db().cmd("HGET", "hp", hp) if hp else None
            if not pid:
                raise HttpError(400, "Nomor HP pemohon belum terdaftar di aplikasi.")
            if len(jenis) < 3:
                raise HttpError(400, "Isi jenis permohonan.")
            st = b.get("status") if b.get("status") in STATUS_PMH else "Diterima"
            pmid, t = int(db().cmd("INCR", "seq:pmh")), now_ms()
            o = {"id": pmid, "pid": int(pid), "jenis": jenis, "nomor": nomor, "status": st, "ubah": t, "dibuat": t,
                 "riwayat": [{"status": st, "catatan": clean(b.get("catatan", ""), 200), "waktu": t}]}
            db().pipe([["HSET", "pmh", pmid, json.dumps(o, ensure_ascii=False)], ["SADD", "pmh:%s" % pid, pmid], ["SADD", "pmhall", pmid]])
            return self.json({"ok": True}, extra=ex)
        if r == "permohonan/ubah":
            o = parse(db().cmd("HGET", "pmh", str(b.get("id", ""))))
            if not o or b.get("status") not in STATUS_PMH:
                raise HttpError(400, "Data tidak valid.")
            t = now_ms()
            o["status"], o["ubah"] = b["status"], t
            o["riwayat"].append({"status": b["status"], "catatan": clean(b.get("catatan", ""), 200), "waktu": t})
            db().cmd("HSET", "pmh", o["id"], json.dumps(o, ensure_ascii=False))
            return self.json({"ok": True}, extra=ex)
        if r == "permohonan/hapus":
            o = parse(db().cmd("HGET", "pmh", str(b.get("id", ""))))
            if o:
                db().pipe([["HDEL", "pmh", o["id"]], ["SREM", "pmh:%s" % o["pid"], o["id"]], ["SREM", "pmhall", o["id"]]])
            return self.json({"ok": True}, extra=ex)
        if r == "booking/berikut":
            tgl, k = str(b.get("tanggal", "")), str(b.get("kunci", ""))
            try:
                time.strptime(tgl, "%Y-%m-%d")
            except ValueError:
                raise HttpError(400, "Tanggal tidak valid.")
            ids = db().cmd("SMEMBERS", "bkd:%s" % tgl) or []
            rows = [bk_norm(parse(x)) for x in (db().cmd("HMGET", "bk", *ids) if ids else []) if x]
            cand = sorted([o for o in rows if o["kunci"] == k and o["status"] in ("Sudah tiba", "Terjadwal")], key=lambda o: (o["status"] != "Sudah tiba", o["jam"], o["kode"]))
            if not cand:
                raise HttpError(404, "Tidak ada antrean yang menunggu di loket ini.")
            o = cand[0]
            o["status"] = "Dipanggil"
            p = parse(db().cmd("HGET", "pemohon", o["pid"]), {})
            db().pipe([["HSET", "bk", o["id"], json.dumps(o, ensure_ascii=False)],
                       ["RPUSH", "layar", json.dumps({"kode": o["kode"], "kunci": o["kunci"], "loket": label(o["kunci"]), "lokasi": o["lokasi"], "waktu": now_ms()}, ensure_ascii=False)], ["LTRIM", "layar", -50, -1]])
            return self.json({"ok": True, "kode": o["kode"], "nama": p.get("nama", "?"), "jam": o["jam"]}, extra=ex)
        if r == "booking/status":
            o = bk_norm(parse(db().cmd("HGET", "bk", str(b.get("id", "")))))
            if not o or b.get("status") not in ("Terjadwal", "Sudah tiba", "Dipanggil", "Hadir", "Tidak hadir"):
                raise HttpError(400, "Data tidak valid.")
            o["status"] = b["status"]
            cmds = [["HSET", "bk", o["id"], json.dumps(o, ensure_ascii=False)]]
            if b["status"] == "Dipanggil":
                cmds += [["RPUSH", "layar", json.dumps({"kode": o["kode"], "kunci": o["kunci"], "loket": label(o["kunci"]), "lokasi": o["lokasi"], "waktu": now_ms()}, ensure_ascii=False)], ["LTRIM", "layar", -50, -1]]
            db().pipe(cmds)
            return self.json({"ok": True}, extra=ex)
        if r in ("pesan/ubah", "pesan/hapus") and method == "POST":
            try:
                pid = int(b.get("pid"))
            except (TypeError, ValueError):
                raise HttpError(400, "Data tidak valid.")
            return (self._ubah if r == "pesan/ubah" else self._hapus)(pid, str(b.get("kunci", "")), b, "admin", ex)
        if r == "loket/simpan" and method == "POST":
            lok, kunci = str(b.get("lokasi", "")), str(b.get("kunci", ""))
            nama, uraian = clean(b.get("nama", ""), 80), clean(b.get("uraian", ""), URAIAN_MAX)
            if lok not in LOKASI or len(nama) < 2:
                raise HttpError(400, "Pilih lokasi dan isi nama loket (minimal 2 huruf).")
            if kunci:
                if kunci not in LOKET:
                    raise HttpError(404, "Loket tidak ditemukan.")
                lok = LOKET[kunci]["lokasi"]
            else:
                if len(_LX["raw"] or {}) >= 600:
                    raise HttpError(400, "Jumlah loket tambahan sudah mencapai batas.")
                kunci = "%s_%d" % (lok, max([e["no"] for e in LOKET.values() if e["lokasi"] == lok] + [0]) + 1)
            d = {"nama": nama, "uraian": uraian, "sistem": clean(b.get("sistem", ""), 120), "zona": clean(b.get("zona", ""), 20),
                 "diskusi": bool(b.get("diskusi", True)), "sembunyi": bool(b.get("sembunyi", False)),
                 "jam": clean(b.get("jam", ""), 120), "tautan": aman_url(b.get("tautan"))}
            db().cmd("HSET", "loketx", kunci, json.dumps(d, ensure_ascii=False))
            _LX["t"] = 0.0
            refresh_loket(0)
            return self.json({"ok": True, "kunci": kunci}, extra=ex)
        if r == "loket/massal" and method == "POST":
            # Ubah uraian (dan kolom lain bila diisi) banyak loket sekaligus, mis. dari tempelan spreadsheet. Loket dicari lewat kunci, atau lokasi + nomor/nama.
            items = b.get("items")
            if not isinstance(items, list) or not items or len(items) > 400:
                raise HttpError(400, "Kirim 1 sampai 400 baris.")
            refresh_loket(0)
            by_nama = {}
            for e in LOKET.values():
                by_nama.setdefault((e["lokasi"], re.sub(r"\s+", " ", e["nama"]).strip().lower()), []).append(e)
            cmds, hasil, lewat, seen = [], 0, [], set()
            for n, it in enumerate(items, 1):
                if not isinstance(it, dict):
                    continue
                e = LOKET.get(str(it.get("kunci", "")))
                if not e:
                    lk_ = str(it.get("lokasi", ""))
                    if lk_ in LOKASI and str(it.get("no", "")).isdigit():
                        e = LOKET.get("%s_%d" % (lk_, int(it["no"])))
                    if not e and lk_ in LOKASI:
                        c = by_nama.get((lk_, re.sub(r"\s+", " ", str(it.get("nama", ""))).strip().lower()), [])
                        e = c[0] if len(c) == 1 else None
                if not e:
                    lewat.append({"baris": n, "alasan": "loket tidak dikenali"})
                    continue
                k = "%s_%s" % (e["lokasi"], e["no"])
                if k in seen:
                    lewat.append({"baris": n, "alasan": "loket yang sama muncul dua kali"})
                    continue
                seen.add(k)
                d = {"nama": e["nama"], "uraian": e["uraian"], "sistem": e["sistem"], "zona": e.get("zona", ""), "diskusi": e.get("diskusi", True),
                     "sembunyi": bool(e.get("sembunyi")), "jam": e.get("jam", ""), "tautan": e.get("tautan", "")}
                if "uraian" in it:
                    d["uraian"] = clean(it["uraian"], URAIAN_MAX)
                if "sistem" in it and clean(it["sistem"], 120):
                    d["sistem"] = clean(it["sistem"], 120)
                if "jam" in it:
                    d["jam"] = clean(it["jam"], 120)
                if "tautan" in it:
                    d["tautan"] = aman_url(it["tautan"])
                cmds.append(["HSET", "loketx", k, json.dumps(d, ensure_ascii=False)])
                hasil += 1
            if cmds:
                if len(_LX["raw"] or {}) + len(cmds) > 1200:
                    raise HttpError(400, "Terlalu banyak data loket tersimpan.")
                db().pipe(cmds)
                _LX["t"] = 0.0
                refresh_loket(0)
            return self.json({"ok": True, "diubah": hasil, "dilewati": lewat[:50]}, extra=ex)
        if r == "loket/reset" and method == "POST":
            kunci = str(b.get("kunci", ""))
            if kunci not in BASE:
                raise HttpError(400, "Hanya loket bawaan yang bisa dikembalikan. Loket tambahan cukup disembunyikan.")
            db().cmd("HDEL", "loketx", kunci)
            _LX["t"] = 0.0
            refresh_loket(0)
            return self.json({"ok": True}, extra=ex)
        # ---- tempat pelayanan (lokasi): nama, uraian, alamat, jam, telepon, peta, tampil/sembunyi, urutan ----
        if r == "lokasi/simpan" and method == "POST":
            refresh_loket(0)
            i = str(b.get("id", "")).strip()
            nama = clean(b.get("nama", ""), 60)
            if len(nama) < 3:
                raise HttpError(400, "Nama tempat pelayanan minimal 3 huruf.")
            baru = not i
            if baru:
                if len(LOKASI) >= 30:
                    raise HttpError(400, "Jumlah tempat pelayanan sudah mencapai batas (30).")
                dasar = re.sub(r"[^a-z0-9]", "", nama.lower())[:12] or "lokasi"
                i, n = dasar, 2
                while i in LOKASI or not LOK_ID_RE.match(i):
                    i = (dasar[:12] + str(n))[:16]
                    n += 1
            elif i not in LOKASI:
                raise HttpError(404, "Tempat pelayanan tidak ditemukan.")
            lama = parse(db().cmd("HGET", "lokx", i), {}) or {}
            d = {"nama": nama, "sembunyi": bool(b.get("sembunyi", False))}
            for f, n in LK_TEXT:
                d[f] = clean(b.get(f, ""), n)
            d["maps"] = aman_url(b.get("maps"))
            if b.get("maps") and not d["maps"]:
                raise HttpError(400, "Tautan peta harus diawali https:// atau http://")
            d["urut"] = lama["urut"] if isinstance(lama.get("urut"), int) else (len(LOK_ORDER) * 10 + 1000 if baru else LOK_ORDER.index(i) * 10)
            db().cmd("HSET", "lokx", i, json.dumps(d, ensure_ascii=False))
            _LX["t"] = 0.0
            refresh_loket(0)
            return self.json({"ok": True, "id": i}, extra=ex)
        if r == "lokasi/urutan" and method == "POST":
            refresh_loket(0)
            ids = b.get("ids")
            if not isinstance(ids, list) or sorted(map(str, ids)) != sorted(LOKASI):
                raise HttpError(400, "Daftar urutan tidak cocok dengan tempat pelayanan yang ada. Muat ulang halaman.")
            lama = {i: parse(v, {}) or {} for i, v in (_LX["rawl"] or {}).items()}
            cmds = []
            for n, i in enumerate(ids):
                d = dict(lama.get(i, {}))
                d["urut"] = n * 10
                if i not in lama or "nama" not in d:
                    d["nama"] = LOKASI[i]
                cmds.append(["HSET", "lokx", i, json.dumps(d, ensure_ascii=False)])
            db().pipe(cmds)
            _LX["t"] = 0.0
            refresh_loket(0)
            return self.json({"ok": True}, extra=ex)
        if r == "lokasi/reset" and method == "POST":
            i = str(b.get("id", ""))
            if i not in LOK_BASE:
                raise HttpError(400, "Hanya tempat pelayanan bawaan yang bisa dikembalikan. Yang tambahan cukup disembunyikan.")
            db().cmd("HDEL", "lokx", i)
            _LX["t"] = 0.0
            refresh_loket(0)
            return self.json({"ok": True}, extra=ex)
        if r == "berita":
            jd, isi = clean(b.get("judul", ""), 100), sanitize_html(b.get("isi", ""))
            kat = b.get("kategori") if b.get("kategori") in KAT_BERITA else "Berita"
            if len(jd) < 3 or len(re.sub(r"<[^>]+>", "", isi).strip()) < 3:
                raise HttpError(400, "Isi judul dan isi berita.")
            if len(isi) > 8000:
                raise HttpError(400, "Isi berita terlalu panjang.")
            nid = int(b.get("id") or 0)
            old = parse(db().cmd("HGET", "berita", nid)) if nid else None
            if nid and not old:
                raise HttpError(400, "Berita tidak ditemukan.")
            if not nid:
                nid = int(db().cmd("INCR", "seq:berita"))
            o = {"id": nid, "judul": jd, "isi": isi, "kategori": kat, "sematkan": bool(b.get("sematkan")), "waktu": old["waktu"] if old else now_ms(), "ubah": now_ms()}
            db().cmd("HSET", "berita", nid, json.dumps(o, ensure_ascii=False))
            return self.json({"ok": True, "id": nid}, extra=ex)
        if r == "berita/hapus":
            db().cmd("HDEL", "berita", str(b.get("id", "")))
            return self.json({"ok": True}, extra=ex)
        if r == "templat":
            d = [clean(x, 400) for x in (b.get("daftar") or []) if isinstance(x, str) and clean(x, 400)][:12]
            db().cmd("HSET", "cfg", "qr", json.dumps(d, ensure_ascii=False))
            return self.json({"ok": True, "daftar": d}, extra=ex)
        if r == "kata":
            ada = set(LOKET)
            out = []
            for x in (b.get("daftar") or [])[:1200]:
                if not isinstance(x, dict):
                    continue
                ks = [clean(w, 40).lower() for w in (x.get("k") or []) if isinstance(w, str)]
                ks = list(dict.fromkeys(w for w in ks if len(w) >= 2))[:10]
                ts = [t for t in (x.get("t") or []) if isinstance(t, str) and t in ada][:5]
                j = clean(x.get("j", ""), 1500)
                if ks and (ts or j):
                    out.append({"k": ks, "t": ts, "j": j})
            bagian, total = max(0, int(b.get("bagian") or 0)), max(1, int(b.get("total") or 1))
            if bagian >= total or total > 100:
                raise HttpError(400, "Data tidak valid.")
            if bagian == 0:
                db().cmd("DEL", "kata2n")
            n = int(db().pipe([["HSET", "kata2n", "p%d" % bagian, json.dumps(out, ensure_ascii=False)], ["HINCRBY", "kata2n", "n", len(out)]])[1])
            if n > KATA_MAX:
                db().cmd("DEL", "kata2n")
                raise HttpError(400, "Maksimal %d aturan." % KATA_MAX)
            if bagian < total - 1:
                return self.json({"ok": True, "bagian": bagian}, extra=ex)
            v = str(now_ms())
            db().pipe([["HSET", "kata2n", "v", v], ["RENAME", "kata2n", "kata2"]])  # RENAME bersifat atomik: pengunjung tidak pernah melihat daftar setengah jadi
            _KC["v"] = None
            return self.json({"ok": True, "n": n, "v": v}, extra=ex)
        if r == "kbli/impor":
            rows = b.get("rows")
            bagian, total = max(0, int(b.get("bagian") or 0)), max(1, int(b.get("total") or 1))
            if not isinstance(rows, list) or len(rows) > 700 or bagian >= total or total > 12:
                raise HttpError(400, "Data tidak valid.")
            out = [x for x in (kbli_baris(y) for y in rows) if x]
            if bagian == 0:
                db().cmd("DEL", "kblin")
            n = int(db().pipe([["HSET", "kblin", "p%d" % bagian, json.dumps(out, ensure_ascii=False)], ["HINCRBY", "kblin", "n", len(out)]])[1])
            if n > KBLI_MAX:
                db().cmd("DEL", "kblin")
                raise HttpError(400, "Maksimal %d kode." % KBLI_MAX)
            if bagian < total - 1:
                return self.json({"ok": True, "bagian": bagian}, extra=ex)
            if n < 1:
                db().cmd("DEL", "kblin")
                raise HttpError(400, "Tidak ada baris yang valid. Kode harus 5 angka dan judul tidak boleh kosong.")
            v = str(now_ms())
            m = {"sumber": clean(b.get("sumber", ""), 120), "n": n, "tgl": time.strftime("%Y-%m-%d", wib())}
            db().pipe([["HSET", "kblin", "np", total], ["HSET", "kblin", "v", v], ["HSET", "kblin", "m", json.dumps(m, ensure_ascii=False)], ["RENAME", "kblin", "kbli"]])
            _KB["v"] = None
            return self.json({"ok": True, "n": n, "v": v}, extra=ex)
        if r == "kbli/hapus":
            db().cmd("DEL", "kbli")
            _KB["v"] = None
            return self.json({"ok": True}, extra=ex)
        if r == "catatan":
            pid, k = int(b.get("pid") or 0), str(b.get("kunci", ""))
            if not valid_key(k):
                raise HttpError(400, "Data tidak valid.")
            db().cmd("HSET", "cat", "%s|%s" % (pid, k), clean(b.get("teks", ""), 500))
            return self.json({"ok": True}, extra=ex)
        if r == "balas":
            pid, k, isi = int(b.get("pid") or 0), str(b.get("kunci", "")), clean(b.get("isi", ""), 800)
            if not valid_key(k) or not isi or not db().cmd("HGET", "pemohon", pid):
                raise HttpError(400, "Balasan tidak valid.")
            f = "%s|%s" % (pid, k)
            lu, la = int(db().cmd("HGET", "tlu", f) or 0), int(db().cmd("HGET", "tla", f) or 0)
            if lu > la:
                db().pipe([["RPUSH", "rt", round((now_ms() - lu) / 60000, 1)], ["LTRIM", "rt", -200, -1]])
            tk = add_msg(pid, k, "admin", isi)
            return self.json({"ok": True, "tk": tk}, extra=ex)
        if r == "selesai":
            pid, k = int(b.get("pid") or 0), str(b.get("kunci", ""))
            if not valid_key(k):
                raise HttpError(400, "Data tidak valid.")
            db().cmd("HSET", "sel", "%s|%s" % (pid, k), now_ms())
            return self.json({"ok": True}, extra=ex)
        if r == "label":
            pid, k = int(b.get("pid") or 0), str(b.get("kunci", ""))
            if not valid_key(k) or not db().cmd("HGET", "pemohon", pid):
                raise HttpError(400, "Data tidak valid.")
            tags = [t for t in dict.fromkeys(b.get("tags") or []) if isinstance(t, str) and t in AN.TAGS]
            tl = str(b.get("tl", ""))[:10]
            try:
                time.strptime(tl, "%Y-%m-%d")
            except ValueError:
                tl = ""
            d = {"tags": tags, "pic": clean(b.get("pic", ""), 40), "tl": tl}
            f = "%s|%s" % (pid, k)
            if d["tags"] or d["pic"] or d["tl"]:
                db().cmd("HSET", "ttag", f, json.dumps(d, ensure_ascii=False))
            else:
                db().cmd("HDEL", "ttag", f)
            return self.json({"ok": True, "tag": d}, extra=ex)
        if r == "selesai-massal":
            its = [x for x in (b.get("items") or []) if isinstance(x, dict)][:60]
            cmds = []
            for x in its:
                k = str(x.get("kunci", ""))
                if valid_key(k):
                    cmds.append(["HSET", "sel", "%s|%s" % (int(x.get("pid") or 0), k), now_ms()])
            db().pipe(cmds)
            return self.json({"ok": True, "n": len(cmds)}, extra=ex)
        if r == "hapus":
            pid, k = int(b.get("pid") or 0), str(b.get("kunci", ""))
            f = "%s|%s" % (pid, k)
            db().pipe([["DEL", "msgs:" + f], ["SREM", "pk:%s" % pid, k]] + [["HDEL", h, f] for h in ("tlu", "tla", "tlast", "sel", "nilai", "tmeta", "ttag", "cat", "rd", "tkt")])
            return self.json({"ok": True}, extra=ex)
        if r == "pengaturan":
            cmds = []
            if "wa" in b:
                wa = clean(b.get("wa", ""), 16)
                if wa and not norm_hp(wa):
                    raise HttpError(400, "Nomor WA resmi tidak valid.")
                cmds.append(["HSET", "cfg", "wa", norm_hp(wa) or ""])
            if "jam" in b:
                cmds.append(["HSET", "cfg", "jam", clean(b.get("jam", ""), 100)])
            if "info" in b:
                cmds.append(["HSET", "cfg", "info", clean(b.get("info", ""), 300)])
            if "kuota" in b:
                k = int(b.get("kuota") or 0)
                if not 1 <= k <= 200:
                    raise HttpError(400, "Kuota per jam harus 1 sampai 200.")
                cmds.append(["HSET", "cfg", "kuota", k])
            if "piket_mode" in b:
                if b.get("piket_mode") not in ("off", "langsung", "tunda"):
                    raise HttpError(400, "Mode Asisten Piket tidak valid.")
                cmds.append(["HSET", "cfg", "piket_mode", b["piket_mode"]])
            if "piket_tunggu" in b:
                cmds.append(["HSET", "cfg", "piket_tunggu", min(240, max(2, int(b.get("piket_tunggu") or 15)))])
            for kc in ("kanal_wa", "kanal_tg"):
                if kc in b:
                    cmds.append(["HSET", "cfg", kc, "0" if str(b[kc]) in ("0", "False", "false") else "1"])
            if "piket_info" in b:
                cmds.append(["HSET", "cfg", "piket_info", clean(b.get("piket_info", ""), 200)])
            db().pipe(cmds)
            return self.json({"ok": True, "piket": piket_cfg()}, extra=ex)
        if r == "kanal":
            env, hari = os.environ, time.strftime("%Y%m%d", wib())
            n = hall(db().cmd("HGETALL", "kn:n"))
            base = "https://" + (self.headers.get("Host") or "")
            cf = cfg_all()
            return self.json({"env": {"wa": bool(env.get("WA_TOKEN") and env.get("WA_PHONE_ID") and env.get("WA_SECRET") and env.get("WA_VERIFY")), "tg": bool(env.get("TG_TOKEN") and env.get("TG_SECRET"))},
                              "aktif": {"wa": cf.get("kanal_wa", "1") != "0", "tg": cf.get("kanal_tg", "1") != "0"}, "url": {"wa": base + "/api/wa", "wa2": base + "/api/app?p=/wa", "tg": base + "/api/tg", "tg2": base + "/api/app?p=/tg"},
                              "n": {c: {"hari": int(n.get("%s:%s" % (c, hari), 0)), "total": int(n.get("%s:total" % c, 0))} for c in ("wa", "tg", "uji")},
                              "log": [x for x in (parse(i) for i in (db().cmd("LRANGE", "kn:log", 0, 14) or [])) if x]}, extra=ex)
        if r == "kanal/uji":
            if limited("rl:knuji:%s" % self.ip(), 60, 3600):
                raise HttpError(429, "Terlalu sering mencoba.")
            bal, ok = BOT.jawab(clean(b.get("teks", ""), 300), self.kanal_ctx())
            db().cmd("HINCRBY", "kn:n", "uji:total", 1)
            return self.json({"balas": bal, "ok": ok}, extra=ex)
        if r == "piket":
            pn = hall(db().cmd("HGETALL", "pkn"))
            hari = time.strftime("%Y%m%d", wib())
            return self.json({"cfg": piket_cfg(), "hari_ini": int(pn.get(hari, 0)), "total": sum(int(v) for v in pn.values())}, extra=ex)
        if r == "password":
            h = db().cmd("HGET", "cfg", "admin_hash") or ""
            if not check_pw(str(b.get("lama", "")), h):
                raise HttpError(401, "Kata sandi lama salah.")
            baru = str(b.get("baru", ""))
            if len(baru) < 8:
                raise HttpError(400, "Kata sandi minimal 8 karakter.")
            db().cmd("HSET", "cfg", "admin_hash", hash_pw(baru))
            return self.json({"ok": True}, extra=self.cookie("", 0))
        raise HttpError(404, "Tidak ditemukan.")

    def rekap(self, ex):
        def c(v):
            v = "" if v is None else str(v)
            return "'" + v if v[:1] in ("=", "+", "-", "@", "\t", "\r") else v
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["Nama", "Nomor HP", "Email", "Lokasi dan loket", "Pesan terakhir", "Waktu", "Status", "Nilai", "Topik", "Sentimen", "Urgensi", "Prioritas", "Label", "Petugas"])
        for t in threads():
            w.writerow([c(t["nama"]), c(t["hp"]), c(t["email"]), c(label(t["kunci"])), c(t["teks"]),
                        time.strftime("%d-%m-%Y %H:%M", time.gmtime(t["waktu"] / 1000 + 7 * 3600)),
                        "Perlu dijawab" if t["pend"] else "Sudah dijawab", t["nilai"] or "",
                        c(", ".join(t["meta"]["topik"])), AN.SENTI_NAMA[t["meta"]["senti"]], AN.URG_NAMA[t["meta"]["urg"]], t["skor"],
                        c(", ".join(t["tag"].get("tags", []))), c(t["tag"].get("pic", ""))])
        self.out(200, "\ufeff" + buf.getvalue(), "text/csv; charset=utf-8", [("Content-Disposition", 'attachment; filename="rekap.csv"')] + ex)

    def analisis_xlsx(self, ex):
        """Laporan analisis chat (Excel): ringkasan KPI, percakapan, topik, loket, dan pertanyaan berulang."""
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Font, PatternFill
        rows, t = muat_semua(), now_ms()
        st = AN.statistik(rows, t, 90, label)
        wb = Workbook()
        wb.remove(wb.active)

        def sheet(name, head, data, widths):
            ws = wb.create_sheet(name)
            ws.append(head)
            for i, r in enumerate(data, start=2):
                for j, v in enumerate(r, start=1):
                    c = ws.cell(row=i, column=j, value=v)
                    if isinstance(v, str):
                        c.data_type = "s"
                    c.alignment = Alignment(wrap_text=True, vertical="top")
            for c in ws[1]:
                c.font, c.fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="1A46B5")
            for n, w in enumerate(widths):
                ws.column_dimensions[chr(65 + n)].width = w
            ws.freeze_panes = "A2"
        k = st["kpi"]
        sheet("Ringkasan", ["Indikator", "Nilai"], [
            ["Periode", "90 hari terakhir (dibuat %s WIB)" % fmt_wib(t)], ["Percakapan aktif", k["thread"]], ["Pesan pemohon", k["pesan_pemohon"]],
            ["Pesan admin", k["pesan_admin"]], ["Belum dibalas saat ini", k["menunggu"]], ["Waktu balas tengah (menit)", k["median_menit"] if k["median_menit"] is not None else "-"],
            ["Dibalas <= 1 jam (%)", k["sla1"] if k["sla1"] is not None else "-"], ["Dibalas <= 24 jam (%)", k["sla24"] if k["sla24"] is not None else "-"],
            ["Kepuasan rata-rata (1-5)", k["csat"] if k["csat"] is not None else "-"]] + [["Insight", i["teks"]] for i in st["insight"]], [44, 90])
        data = []
        for r in rows:
            a = AN.ringkas_percakapan(r["msgs"], t, fmt_wib)
            last = r["msgs"][-1] if r["msgs"] else {"isi": ""}
            data.append([r["nama"], r["hp"], label(r["kunci"]), ", ".join(a["topik"]), AN.SENTI_NAMA[a["senti"]], AN.URG_NAMA[a["urg"]], len(r["msgs"]),
                         "Menunggu balasan" if a["tunggu_menit"] is not None else "Sudah dibalas", round(a["tunggu_menit"]) if a["tunggu_menit"] is not None else "",
                         r["nilai"] or "", last["isi"]])
        sheet("Percakapan", ["Nama", "HP", "Loket", "Topik", "Sentimen", "Urgensi", "Jumlah pesan", "Status", "Menunggu (menit)", "Nilai", "Pesan terakhir"], data, [24, 16, 36, 30, 12, 16, 10, 18, 12, 8, 70])
        sheet("Topik", ["Topik", "Jumlah pesan", "Bernada keluhan"], [[x["topik"], x["n"], x["neg"]] for x in st["topik"]], [34, 14, 16])
        sheet("Per loket", ["Loket", "Percakapan", "Pesan", "Belum dibalas", "Keluhan (%)", "Waktu balas tengah (menit)", "Nilai"],
              [[x["nama"], x["thread"], x["pesan"], x["pend"], x["neg_pct"], x["resp"] if x["resp"] is not None else "", x["nilai"] or ""] for x in st["loket"]], [44, 12, 10, 14, 12, 22, 8])
        sheet("Pertanyaan berulang", ["Contoh pertanyaan", "Jumlah", "Topik", "Kata kunci saran"], [[x["contoh"], x["n"], x["topik"], ", ".join(x["kata"])] for x in st["faq"]], [80, 10, 26, 40])
        bio = io.BytesIO()
        wb.save(bio)
        self.out(200, bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 [("Content-Disposition", 'attachment; filename="analisis-chat-takok.xlsx"')] + ex)

    def kata_xlsx(self, ex, templat):
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Font, PatternFill
        from openpyxl.worksheet.datavalidation import DataValidation
        wb = Workbook()
        ws = wb.active
        ws.title = "Aturan"
        ws.append(["Kata kunci", "Jawaban untuk pengunjung", "Loket tujuan (opsional)"])
        keys = list(LOKET)
        if templat:
            rows = [["contoh kata, contoh frasa lain", "Contoh jawaban: tulis cara mengurus, syarat, biaya, dan jam layanan di sini. Hapus baris contoh ini sebelum mengunggah.", ""],
                    ["contoh dengan loket", "Jawaban boleh dikosongkan bila loket tujuan diisi.", label(keys[0]) if keys else ""]]
        else:
            d = kata_baca()[0]
            rows = [[", ".join(x.get("k", [])), x.get("j", ""), label(x["t"][0]) if x.get("t") and x["t"][0] in LOKET else ""] for x in d if isinstance(x, dict)]
        for i, r in enumerate(rows, start=2):
            for j, v in enumerate(r, start=1):
                c = ws.cell(row=i, column=j, value=v)
                c.data_type = "s"
                c.alignment = Alignment(wrap_text=True, vertical="top")
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1A46B5")
        for col, w in (("A", 34), ("B", 80), ("C", 46)):
            ws.column_dimensions[col].width = w
        ws.freeze_panes = "A2"
        pt = wb.create_sheet("Petunjuk")
        for line in ["Cara mengisi", "1. Kolom A: kata atau frasa yang diketik warga. Pisahkan dengan koma (maksimal 10 kata, tiap kata 2-40 huruf).",
                     "2. Kolom B: jawaban untuk pengunjung (maksimal 1.500 karakter, boleh beberapa baris).",
                     "3. Kolom C (opsional): pilih loket dari daftar tarik-turun, atau salin dari sheet 'Daftar loket'.",
                     "4. Baris tanpa kata kunci, atau tanpa jawaban sekaligus tanpa loket, dilewati.",
                     "5. Unggah lewat tombol 'Impor Excel/CSV' di tab Kata cari chatbot, periksa pratinjau, lalu tekan Simpan.",
                     "6. Berkas .csv (UTF-8) dengan tiga kolom yang sama juga bisa diimpor."]:
            pt.append([line])
        pt.column_dimensions["A"].width = 120
        pt["A1"].font = Font(bold=True)
        lk = wb.create_sheet("Daftar loket")
        lk.append(["Pilihan loket (salin ke kolom C)", "Kode"])
        for k in keys:
            lk.append([label(k), k])
        lk.column_dimensions["A"].width = 70
        lk.column_dimensions["B"].width = 16
        for c in lk[1]:
            c.font = Font(bold=True)
        if keys:
            dv = DataValidation(type="list", formula1="='Daftar loket'!$A$2:$A$%d" % (len(keys) + 1), allow_blank=True, showErrorMessage=False)
            ws.add_data_validation(dv)
            dv.add("C2:C%d" % (KATA_MAX + 201))
        bio = io.BytesIO()
        wb.save(bio)
        self.out(200, bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 [("Content-Disposition", 'attachment; filename="%s"' % ("templat-kata-cari.xlsx" if templat else "kata-cari-chatbot.xlsx"))] + ex)

    def xlsx(self, ex):
        from openpyxl import Workbook
        wb = Workbook()
        wb.remove(wb.active)

        def sheet(name, head, rows):
            ws = wb.create_sheet(name)
            ws.append(head)
            for i, r in enumerate(rows, start=2):
                for j, v in enumerate(r, start=1):
                    c = ws.cell(row=i, column=j, value=v)
                    if isinstance(v, str):
                        c.data_type = "s"
            for col in ws.columns:
                ws.column_dimensions[col[0].column_letter].width = 24
            ws.freeze_panes = "A2"
        pem = {k: parse(v, {}) for k, v in hall(db().cmd("HGETALL", "pemohon")).items()}
        sheet("Pemohon", ["id", "nama", "hp", "email", "dibuat"],
              [[p["id"], p["nama"], p["hp"], p.get("email", ""), time.strftime("%d-%m-%Y %H:%M", time.gmtime(p.get("dibuat", 0) / 1000 + 7 * 3600))] for p in pem.values()])
        ts = threads()
        lists = db().pipe([["LRANGE", "msgs:%s|%s" % (t["pid"], t["kunci"]), 0, -1] for t in ts])
        rows = []
        for t, lst in zip(ts, lists):
            for s in lst or []:
                m = parse(s)
                if m:
                    rows.append([m["id"], t["pid"], t["nama"], label(t["kunci"]), m["dari"], m["isi"], time.strftime("%d-%m-%Y %H:%M", time.gmtime(m["waktu"] / 1000 + 7 * 3600))])
        sheet("Pesan", ["id", "pid", "nama", "loket", "dari", "isi", "waktu"], rows)
        sheet("Status", ["nama", "loket", "perlu_dijawab", "nilai"], [[t["nama"], label(t["kunci"]), "ya" if t["pend"] else "tidak", t["nilai"] or ""] for t in ts])
        sheet("Loket", ["lokasi", "no", "nama", "zona", "uraian", "sistem"], [[e["lokasi"], e["no"], e["nama"], e.get("zona", ""), e["uraian"], e["sistem"]] for e in loket_urut(True)])
        bio = io.BytesIO()
        wb.save(bio)
        self.out(200, bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 [("Content-Disposition", 'attachment; filename="data-takok.xlsx"')] + ex)
