"""Takok Pelayanan Suroboyo - API untuk Vercel (Python serverless).

Penyimpanan : Upstash Redis (lewat Vercel Marketplace), diakses via REST.
Variabel    : lihat BACA-SAYA.md (SESSION_SECRET, ADMIN_PASSWORD, KV_REST_API_URL/TOKEN).
Satu endpoint: /api/app?p=/rute  (mis. /api/app?p=/info)
"""
import base64, csv, hashlib, hmac, io, json, os, re, secrets, sys, time
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import urllib.request
from html import escape as hesc
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _data import SEED, SKM_MPP  # noqa: E402

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
    return bool(e) and not re.search(r"telepon|via wa|hotline|skm", e["nama"], re.I)


def kategori_ikm(v):
    return "A (Sangat Baik)" if v >= 88.31 else "B (Baik)" if v >= 76.61 else "C (Kurang Baik)" if v >= 65 else "D (Tidak Baik)"


LOKASI = {l["id"]: l["nm"] for l in SEED["lokasi"]}
LOKET = {"%s_%s" % (e["lokasi"], e["no"]): e for e in SEED["loket"]}


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
    r = db().pipe([["HGETALL", "tlu"], ["HGETALL", "tla"], ["HGETALL", "tlast"], ["HGETALL", "sel"], ["HGETALL", "nilai"], ["HGETALL", "pemohon"]])
    tlu, tla, tlast, sel, nilai, pem = [hall(x) for x in r]
    pem = {k: parse(v, {}) for k, v in pem.items()}
    out = []
    for f, last in tlast.items():
        pid, kunci = f.split("|", 1)
        p = pem.get(pid)
        if not p:
            continue
        l = parse(last, {})
        lu, la, sl = int(tlu.get(f, 0)), int(tla.get(f, 0)), int(sel.get(f, 0))
        out.append({"pid": int(pid), "kunci": kunci, "nama": p["nama"], "hp": p["hp"], "email": p.get("email", ""),
                    "teks": l.get("teks", ""), "waktu": l.get("waktu", 0), "pend": lu > max(la, sl),
                    "nilai": int(nilai[f]) if f in nilai else None})
    return sorted(out, key=lambda x: (not x["pend"], -x["waktu"]))


def add_msg(pid, kunci, dari, isi):
    f = "%s|%s" % (pid, kunci)
    mid = int(db().cmd("INCR", "seq:pesan"))
    t = now_ms()
    m = {"id": mid, "dari": dari, "isi": isi, "waktu": t}
    db().pipe([["RPUSH", "msgs:" + f, json.dumps(m, ensure_ascii=False)], ["SADD", "pk:%s" % pid, kunci],
               ["HSET", "tlu" if dari == "pemohon" else "tla", f, t],
               ["HSET", "tlast", f, json.dumps({"teks": isi[:100], "waktu": t}, ensure_ascii=False)]])


# ---------------- Handler ----------------
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
            if method == "POST":
                org = self.headers.get("Origin")
                if org and urlparse(org).netloc != self.headers.get("Host"):
                    raise HttpError(403, "Permintaan ditolak.")
                if "application/json" not in (self.headers.get("Content-Type") or ""):
                    raise HttpError(415, "Format permintaan tidak valid.")
                n = int(self.headers.get("Content-Length") or 0)
                if n > 10000:
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
        if path == "/info":
            return self.info(self.session())
        if path == "/daftar" and method == "POST":
            return self.daftar(b)
        if path == "/masuk" and method == "POST":
            return self.masuk(b)
        if path == "/admin/masuk" and method == "POST":
            return self.admin_masuk(b)
        if path == "/layar" and method == "GET":
            return self.layar(q)
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

    def info(self, ses):
        who = None
        if ses and ses["r"] == "adm":
            who = {"peran": "admin"}
        elif ses:
            p = parse(db().cmd("HGET", "pemohon", ses.get("id")))
            if p:
                who = {"peran": "pemohon", "nama": p["nama"], "hp": p["hp"], "email": p.get("email", "")}
        c = cfg_all()
        bt = sorted([parse(v, {}) for v in hall(db().cmd("HGETALL", "berita")).values()], key=lambda x: (not x.get("sematkan"), -x.get("id", 0)))[:10]
        rt = sorted(float(x) for x in db().cmd("LRANGE", "rt", -50, -1) or [])
        balas = round(rt[len(rt) // 2]) if len(rt) >= 3 else None
        kata = parse(db().cmd("HGET", "cfg", "kata"), [])
        self.json({"kata": kata if isinstance(kata, list) else [], "berita": bt, "balas_menit": balas, "mpp_roster": SKM_MPP, "lokasi": [{"id": k, "nama": v} for k, v in LOKASI.items()],
                   "loket": [[e["lokasi"], e["no"], e["nama"], e["uraian"], e["sistem"], e.get("zona", ""), 1 if e.get("diskusi", True) else 0, 1 if bisa_booking("%s_%s" % (e["lokasi"], e["no"])) else 0] for e in SEED["loket"]],
                   "cfg": {k: c.get(k, "") for k in ("wa", "jam", "info", "kuota")}, "saya": who},
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
        res = db().pipe(cmds)
        ms = []
        for k, lst in zip(ks, res[:n]):
            for x in lst or []:
                m = parse(x)
                if m:
                    ms.append({"id": m["id"], "kunci": k, "dari": m["dari"], "isi": m["isi"], "waktu": m["waktu"]})
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
        self.json({"pesan": ms, "pmh": pm, "bk": bk, "dibaca": dib, "status": {k: {"nilai": int(nl["%s|%s" % (pid, k)])} for k in ks if "%s|%s" % (pid, k) in nl}}, extra=ex)

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
        if not LOKET[k].get("diskusi", True):
            raise HttpError(400, "Fasilitas ini tidak menerima pertanyaan lewat aplikasi.")
        if re.search(r"\d{16}", re.sub(r"[\s.\-]", "", isi)):
            raise HttpError(400, "Demi keamanan, jangan kirim NIK/KTP lengkap di sini.")
        if limited("rl:kirim:%s" % pid, 5, 60):
            raise HttpError(429, "Terlalu banyak pesan dalam satu menit.")
        if int(db().cmd("LLEN", "msgs:%s|%s" % (pid, k)) or 0) >= 200:
            raise HttpError(400, "Percakapan ini sudah penuh. Silakan hubungi loket langsung.")
        add_msg(pid, k, "pemohon", isi)
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
            res = db().pipe([["LRANGE", "msgs:" + f, 0, -1], ["HSET", "rd", f, now_ms()], ["HGET", "cat", f]])
            return self.json({"pesan": [m for m in (parse(x) for x in res[0] or []) if m], "catatan": res[2] or ""}, extra=ex)
        if r == "templat" and method == "GET":
            t = parse(db().cmd("HGET", "cfg", "qr"), None)
            return self.json({"daftar": t if isinstance(t, list) else ["Terima kasih, pertanyaan Anda sudah kami terima dan sedang kami proses.", "Silakan datang ke loket terkait dengan membawa dokumen asli dan fotokopi persyaratan.", "Mohon lengkapi berkas yang kurang, lalu ajukan kembali melalui sistem yang sesuai.", "Untuk penjelasan lebih lanjut, kami akan menghubungi Anda melalui WhatsApp."]}, extra=ex)
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
            rows = [o for o in (parse(x) for x in db().cmd("LRANGE", "skm", 0, -1) or []) if o]
            skm = None
            if rows:
                av = [sum(o["j"][i] for o in rows) / len(rows) for i in range(9)]
                ikm = round(sum(av) / 9 * 25, 2)
                skm = {"n": len(rows), "ikm": ikm, "mutu": kategori_ikm(ikm)}
            return self.json({"pend": sum(1 for t in ts if t["pend"]), "percakapan": len(ts), "pemohon": int(sc[-1] or 0), "hari": hari,
                              "booking_hari_ini": {"total": len(bk), "status": bs}, "booking_7hari": [{"tanggal": d, "n": int(c or 0)} for d, c in zip(hh, sc[:7])],
                              "pmh": ps, "skm": skm}, extra=ex)
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
            ada = set("%s_%s" % (e["lokasi"], e["no"]) for e in SEED["loket"])
            out = []
            for x in (b.get("daftar") or [])[:50]:
                if not isinstance(x, dict):
                    continue
                ks = [clean(w, 40).lower() for w in (x.get("k") or []) if isinstance(w, str)]
                ks = [w for w in ks if len(w) >= 2][:10]
                ts = [t for t in (x.get("t") or []) if isinstance(t, str) and t in ada][:5]
                if ks and ts:
                    out.append({"k": ks, "t": ts})
            db().cmd("HSET", "cfg", "kata", json.dumps(out, ensure_ascii=False))
            return self.json({"ok": True, "daftar": out}, extra=ex)
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
            add_msg(pid, k, "admin", isi)
            return self.json({"ok": True}, extra=ex)
        if r == "selesai":
            pid, k = int(b.get("pid") or 0), str(b.get("kunci", ""))
            if not valid_key(k):
                raise HttpError(400, "Data tidak valid.")
            db().cmd("HSET", "sel", "%s|%s" % (pid, k), now_ms())
            return self.json({"ok": True}, extra=ex)
        if r == "hapus":
            pid, k = int(b.get("pid") or 0), str(b.get("kunci", ""))
            f = "%s|%s" % (pid, k)
            db().pipe([["DEL", "msgs:" + f], ["SREM", "pk:%s" % pid, k]] + [["HDEL", h, f] for h in ("tlu", "tla", "tlast", "sel", "nilai")])
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
            db().pipe(cmds)
            return self.json({"ok": True}, extra=ex)
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
        w.writerow(["Nama", "Nomor HP", "Email", "Lokasi dan loket", "Pesan terakhir", "Waktu", "Status", "Nilai"])
        for t in threads():
            w.writerow([c(t["nama"]), c(t["hp"]), c(t["email"]), c(label(t["kunci"])), c(t["teks"]),
                        time.strftime("%d-%m-%Y %H:%M", time.gmtime(t["waktu"] / 1000 + 7 * 3600)),
                        "Perlu dijawab" if t["pend"] else "Sudah dijawab", t["nilai"] or ""])
        self.out(200, "\ufeff" + buf.getvalue(), "text/csv; charset=utf-8", [("Content-Disposition", 'attachment; filename="rekap.csv"')] + ex)

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
        sheet("Loket", ["lokasi", "no", "nama", "zona", "uraian", "sistem"], [[e["lokasi"], e["no"], e["nama"], e.get("zona", ""), e["uraian"], e["sistem"]] for e in SEED["loket"]])
        bio = io.BytesIO()
        wb.save(bio)
        self.out(200, bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 [("Content-Disposition", 'attachment; filename="data-takok.xlsx"')] + ex)
