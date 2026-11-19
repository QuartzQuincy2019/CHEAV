"""Build a manual review table for the Dickson entries.

The automatic pass (tools/dickson_mdc.py --dump) accepts 6,389 entries where the
number of drawn signs equals the number of printed codes.  The rest need a human
decision:

  manual-layout   signs != codes   (merged signs or a ligature component)
  manual-amp      `&` candidates   (nested boxes / G39+X1), out of scope

This script re-reads the PDF, crops the glyph block of every such entry and
writes a self-contained HTML table (crops referenced by relative path) with an
editable MdC field; decisions are kept in localStorage.

Run:
  python tools/dickson_review.py --pages 10-305
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dickson_mdc as D  # noqa: E402


CSS = """
:root { --ink:#1a1a1a; --mut:#777; --line:#e6e6e6; --ok:#0a7a2f; --warn:#b26a00; --bad:#b00020; }
* { box-sizing: border-box; }
body { margin:0; font:15px/1.5 "Segoe UI","Microsoft YaHei",system-ui,sans-serif; color:var(--ink); background:#fafafa; }
header { position:sticky; top:0; z-index:5; background:#fff; border-bottom:1px solid var(--line); padding:12px 20px; }
h1 { font-size:19px; margin:0 0 4px; }
.sub { color:var(--mut); font-size:13px; }
.stats { margin-top:6px; font-size:13px; }
.stats b { color:var(--ink); }
table { width:100%; border-collapse:collapse; background:#fff; }
th, td { border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:middle; text-align:left; }
th { background:#f3f3f3; font-weight:600; font-size:13px; position:sticky; top:74px; }
tr.done { opacity:.45; }
td.crop { width:430px; }
td.crop img { max-width:420px; max-height:110px; display:block; }
td.code { font-family:Consolas,monospace; font-size:13px; color:#444; white-space:nowrap; }
td.geom { font-family:Consolas,monospace; font-size:13px; color:#666; }
.badge { display:inline-block; padding:1px 7px; border-radius:10px; font-size:12px; }
.b-layout { background:#fff3e0; color:var(--warn); }
.b-amp { background:#fdecea; color:var(--bad); }
input.mdc { width:260px; font-family:Consolas,monospace; font-size:13px; padding:4px 6px; border:1px solid #ccc; border-radius:4px; }
button.ok { margin-left:6px; padding:4px 8px; border:1px solid #bbb; background:#fff; border-radius:4px; cursor:pointer; }
button.ok:hover { background:#f0f0f0; }
.pagehead td { background:#f7f7f7; font-weight:600; color:#555; }
.hint { font-size:12px; color:var(--mut); }
"""

JS = """
const KEY = "dickson-review";
function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
function save(o) { localStorage.setItem(KEY, JSON.stringify(o)); }
function apply() {
  const st = load();
  let done = 0, total = 0;
  document.querySelectorAll("tr[data-key]").forEach(tr => {
    total++;
    const k = tr.dataset.key, rec = st[k];
    if (rec && rec.mdc) tr.querySelector("input.mdc").value = rec.mdc;
    if (rec && rec.ok) { tr.classList.add("done"); done++; }
  });
  document.getElementById("done").textContent = done;
  document.getElementById("total").textContent = total;
}
document.addEventListener("click", (e) => {
  if (!e.target.matches("button.ok")) return;
  const tr = e.target.closest("tr[data-key]");
  const st = load(); const k = tr.dataset.key;
  st[k] = { mdc: tr.querySelector("input.mdc").value.trim(), ok: true };
  save(st); apply();
});
document.addEventListener("input", (e) => {
  if (!e.target.matches("input.mdc")) return;
  const tr = e.target.closest("tr[data-key]");
  const st = load(); const k = tr.dataset.key;
  st[k] = Object.assign({}, st[k], { mdc: e.target.value.trim() });
  save(st);
});
function filter(kind) {
  document.querySelectorAll("tr[data-kind]").forEach(tr => {
    tr.style.display = (kind === "all" || tr.dataset.kind === kind) ? "" : "none";
  });
  document.querySelectorAll("tr.pagehead").forEach(tr => { tr.style.display = ""; });
}
window.addEventListener("DOMContentLoaded", apply);

function exportDone() {
  const st = load(); const out = [];
  for (const k in st) { if (st[k] && st[k].ok) out.push({ key: k, mdc: st[k].mdc || "" }); }
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "review-decisions.json"; a.click();
}
"""


def geom_shape(cadrats) -> str:
    """Human-readable cadrat/layer shape: `2·1 | 1`."""
    one = []
    for cad in cadrats:
        one.append("·".join(str(len(layer)) for layer in cad))
    return " | ".join(one)


def key_for(rec: dict, idx: int) -> str:
    return f"p{rec['page']}-{idx}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=r"E:\QKMansion\Documents\Garden\languages\埃及语\DicksonDictionary.pdf")
    ap.add_argument("--work", default=r"E:\QKMansion\CSX10\w\_dickson\pipeline")
    ap.add_argument("--out", default=r"E:\QKMansion\CSX10\w\_dickson\review")
    ap.add_argument("--pages", default="10-305")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--thumbs", default="420")
    args = ap.parse_args()

    m = re.match(r"(\d+)-(\d+)$", args.pages)
    first, last = (int(m.group(1)), int(m.group(2))) if m else (int(args.pages), int(args.pages))
    pages = range(first, last + 1)

    crops_dir = os.path.join(args.out, "crops")
    os.makedirs(crops_dir, exist_ok=True)

    rows = []
    stats = Counter()
    for page in pages:
        recs = D.entry_records(args.pdf, [page], args.work, args.dpi, raster=True)
        for i, e in enumerate(recs):
            if e["amp"]:
                kind = "manual-amp"
            elif e["n_signs"] != len(e["codes"]):
                kind = "manual-layout"
            else:
                kind = "auto"
            stats[kind] += 1
            if kind == "auto":
                continue
            groups = [g for cad in e["cadrats"] for layer in cad for g in layer]
            if not groups:
                continue
            # Crop a PAGE RECTANGLE, not a path bounding box: the glyph column of
            # this entry, from the column edge to the text start.  Computing the
            # box from detected paths used to clip signs whose parts fell outside
            # the x/y filters (the crop then showed half a sign).
            # Whole-page-width strip of the entry band, with a red box around the
            # detected glyph block.  Cropping by path bounding boxes kept clipping
            # signs; a full-width strip cannot be cut, and the box still points at
            # the word.
            ly0, ly1 = e["y"]
            ytop, ybot = e.get("window", (ly0, ly1))
            # Column half of the page: 2x the resolution of a full-width strip,
            # still a page rectangle (nothing can be clipped).  Column is decided
            # by the line END, as in _column_of().
            lx1 = e.get("bbox", (0, 0, 300, 0))[2]
            col = 0 if lx1 < 320 else 1
            x0, x1 = (0.0, 300.0) if col == 0 else (300.0, 612.0)
            y0, y1 = ytop, ybot
            s = args.dpi / 72.0
            pad = 2.0
            crop_name = f"p{page}-{i}.png"
            th = args.thumbs
            from PIL import Image
            im = Image.open(e["png"])
            c = im.crop((int((x0) * s), int((y0) * s), int((x1) * s), int((y1) * s)))
            try:
                from PIL import ImageDraw
                d = ImageDraw.Draw(c)
                bx0 = min(b[0] for b in boxes); by0 = min(b[1] for b in boxes)
                bx1 = max(b[2] for b in boxes); by1 = max(b[3] for b in boxes)
                d.rectangle([int((bx0 - x0) * s) - 2, int((by0 - y0) * s) - 2,
                             int((bx1 - x0) * s) + 2, int((by1 - y0) * s) + 2],
                            outline=(200, 20, 20), width=2)
            except Exception:
                pass
            c.thumbnail((int(th), int(th)))
            c.save(os.path.join(crops_dir, crop_name), optimize=True)
            rows.append({
                "key": key_for(e, i), "kind": kind, "page": page,
                "translit": e["translit"], "gloss": e["gloss"], "codes": e["codes"],
                "geom": geom_shape(e["cadrats"]), "n_signs": e["n_signs"],
                "amp_reason": e["amp_reason"], "crop": f"crops/{crop_name}",
            })
        if page % 20 == 0:
            print(f"  page {page}: {len(rows)} review rows", flush=True)

    # ------------------------------------------------ HTML
    rows.sort(key=lambda r: (r["page"], r["translit"]))
    parts = [f"""<!doctype html><html lang="zh"><meta charset="utf-8">
<title>Dickson 词条审核表</title><style>{CSS}</style>
<header>
  <h1>Dickson 词典 · 词条审核表</h1>
  <div class="sub">页 {first}–{last} · 共 <b>{len(rows)}</b> 条待处理（auto 已接受 {stats['auto']} 条，不在表内）</div>
  <div class="stats">已完成 <b id="done">0</b> / <b id="total">0</b> ·
    筛选：
    <button onclick="filter('all')">全部</button>
    <button onclick="filter('manual-layout')">版式待定 {stats['manual-layout']}</button>
    <button onclick="filter('manual-amp')">&amp; 候选 {stats['manual-amp']}</button>
    <button onclick="exportDone()">导出已审核 JSON</button>
  </div>
  <div class="sub hint">左列：书页字形原样裁片 · 中间：印刷码与几何形状（<code>2·1 | 1</code> = 第一个方块两层(2+1)，第二个方块一层）·
    右列：填入最终 MdC（如 <code>D2*X1:N1</code>），点 ✓ 标记完成；进度存在浏览器 localStorage。</div>
</header>
<table><thead><tr>
  <th>字形</th><th style="width:150px">转写 / 释义</th><th>印刷码</th><th style="width:120px">几何形状</th><th>类型</th><th>最终 MdC</th>
</tr></thead><tbody>
"""]

    last_page = None
    for r in rows:
        if r["page"] != last_page:
            last_page = r["page"]
            parts.append(f'<tr class="pagehead"><td colspan="6">第 {r["page"]} 页</td></tr>')
        badge = ('<span class="badge b-amp">&amp; 候选</span>' if r["kind"] == "manual-amp"
                 else '<span class="badge b-layout">版式待定</span>')
        reason = f'<div class="hint">{html.escape(r["amp_reason"])}</div>' if r["amp_reason"] else ""
        parts.append(f"""<tr data-key="{r['key']}" data-kind="{r['kind']}">
  <td class="crop"><img src="{r['crop']}" alt="p{r['page']} {html.escape(r['translit'])}" loading="lazy"></td>
  <td><b>{html.escape(r['translit'])}</b><div class="hint">{html.escape(r['gloss'][:60])}</div></td>
  <td class="code">{' '.join(r['codes'])}<div class="hint">几何 {r['n_signs']} / 码 {len(r['codes'])}</div></td>
  <td class="geom">{html.escape(r['geom'])}</td>
  <td>{badge}{reason}</td>
  <td><input class="mdc" placeholder="在此填 MdC" spellcheck="false"><button class="ok" title="标记完成">✓</button></td>
</tr>""")

    parts.append("</tbody></table><script>" + JS + "</script><p style='padding:20px;color:#888'>Dickson 2006, CC BY-NC-SA 2.5 · 裁片仅本地使用</p></html>")
    out_html = os.path.join(args.out, "review.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write("".join(parts))
    json.dump(rows, open(os.path.join(args.out, "review.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("review rows:", len(rows), "->", out_html)
    print("stats:", dict(stats))
    return 0


if __name__ == "__main__":
    sys.exit(main())
