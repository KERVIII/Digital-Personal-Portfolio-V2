#!/usr/bin/env python3
"""Copy data/*.json into the embedded fallback <script> blocks of index.html.
Run from the project root after editing any JSON in data/:  python3 tools/sync-fallback.py"""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
for fid, name in (("fb-projects", "projects"), ("fb-certificates", "certificates"), ("fb-skills", "skills")):
    data = json.loads((root / "data" / f"{name}.json").read_text(encoding="utf-8"))
    blob = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    pat = re.compile(r'(<script type="application/json" id="%s">)(.*?)(</script>)' % fid, re.S)
    if not pat.search(html):
        raise SystemExit(f"missing block #{fid}")
    html = pat.sub(lambda m: m.group(1) + blob + m.group(3), html, count=1)
(root / "index.html").write_text(html, encoding="utf-8")
print("fallback blocks synced")
