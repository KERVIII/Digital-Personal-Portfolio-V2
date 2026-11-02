#!/usr/bin/env python3
"""Static integrity checks. Run from project root: python3 tests/static-check.py"""
import re, os, json, sys, collections
from html.parser import HTMLParser
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(root)
fails = []
def check(name, cond, detail=""):
    print(("  ok  " if cond else "  FAIL ") + name + ("" if cond else "  -> " + str(detail)))
    if not cond: fails.append(name)
h = open("index.html", encoding="utf-8").read()
ids = re.findall(r'\sid="([^"]+)"', h)
check("no duplicate ids", not [k for k, v in collections.Counter(ids).items() if v > 1])
js = {f: open("js/" + f, encoding="utf-8").read() for f in os.listdir("js")}
refs = set(); [refs.update(re.findall(r'getElementById\("([^"]+)"\)', s)) for s in js.values()]
dynamic = {"detail-back"}
check("every getElementById target exists", not [r for r in refs if r not in ids and r not in dynamic], [r for r in refs if r not in ids and r not in dynamic])
sym = set(re.findall(r'<symbol id="([^"]+)"', h))
used = set(re.findall(r'href="#(i-[\w-]+)"', h))
for s in js.values(): used |= {"i-" + x for x in re.findall(r'icon\("([\w-]+)"', s)}
sk = json.load(open("data/skills.json"))
used |= {"i-" + i["icon"] for g in sk["groups"] for i in g["items"]} | {"i-" + x["icon"] for x in sk.get("expertise", [])}
check("every icon used exists in the sprite", not (used - sym), used - sym)
check("in-page anchors resolve", not [a for a in set(re.findall(r'href="#([\w-]+)"', h)) if not a.startswith("i-") and a not in ids], "")
check("local assets referenced by index.html exist", not [m for m in re.findall(r'(?:src|href|content)="((?:assets|css|js|data)/[^"]+)"', h) if not os.path.exists(m)], "")
for f in os.listdir("css"):
    s = re.sub(r"/\*.*?\*/", "", open("css/" + f).read(), flags=re.S)
    check("css braces balanced: " + f, s.count("{") == s.count("}"))
for f in ["data/projects.json", "data/certificates.json", "data/skills.json", "manifest.json"]:
    try: json.load(open(f)); check("valid JSON: " + f, True)
    except Exception as e: check("valid JSON: " + f, False, e)
for fid, name in (("fb-projects", "projects"), ("fb-certificates", "certificates"), ("fb-skills", "skills")):
    m = re.search(r'id="%s">(.*?)</script>' % fid, h, re.S)
    same = m and json.loads(m.group(1).replace("<\\/", "</")) == json.load(open(f"data/{name}.json"))
    check(f"embedded fallback in sync: {name}", bool(same), "run python3 tools/sync-fallback.py")
check("intro is not suppressed by storage", not re.search(r"(sessionStorage|localStorage)", js["animations.js"] + js["script.js"]) and "no-intro" not in h)
check("localStorage used only for theme", all("localStorage" not in s for n, s in js.items() if n != "theme.js"))
secrets = re.compile(r"(api\.telegram\.org|bot\d+:|TELEGRAM_BOT_TOKEN)", re.I)
check("no Telegram credentials/API in frontend", not any(secrets.search(s) for s in js.values()) and not secrets.search(h))
check("Nexus Vanguard has no fabricated repo URL", [p for p in json.load(open("data/projects.json"))["projects"] if p["id"] == "nexus-vanguard"][0]["repository"] == {"status": "coming-soon", "url": None})
check("existing repo links preserved", {p["repository"]["url"] for p in json.load(open("data/projects.json"))["projects"]} >= {"https://github.com/KERVIII/Ayunda-Rusdi-Refork", "https://github.com/KERVIII/IoBattery-Huashu-Web"})
check("commission form has all required fields", all(x in h for x in ('name="nickname"', 'name="service"', 'name="title"', 'name="description"', 'name="budget"', 'type="file"')))
class P(HTMLParser):
    void = {"meta", "link", "img", "input", "br", "use", "path", "circle", "rect", "source"}
    def __init__(s): super().__init__(); s.st = []; s.bad = []
    def handle_starttag(s, t, a):
        if t not in s.void: s.st.append(t)
    def handle_endtag(s, t):
        if t in s.void: return
        if s.st and s.st[-1] == t: s.st.pop()
        else: s.bad.append((t, s.getpos()))
p = P(); p.feed(h); check("HTML tags balanced", not p.bad and not p.st, (p.bad[:3], p.st[:3]))
for f in ["404.html", "tools/certificate.html"]:
    q = P(); q.feed(open(f).read()); check("HTML tags balanced: " + f, not q.bad and not q.st)
sys.exit(1 if fails else 0)
