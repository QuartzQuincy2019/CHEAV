"""Generate js/database/vocabulary-dickson.js from the Dickson MdC dump.

The dump comes from tools/dickson_mdc.py --dump (vocab-p10-305.json).  Only
`status == "auto"` entries are used: those are the ones whose geometry matched
the printed code count.  Entries are de-duplicated by (transliteration, MdC).

The output is **derived data** of R. Dickson's dictionary (CC BY-NC-SA 2.5),
not MIT code: keep the file out of the repository's MIT-licensed source set and
redistribute it under CC BY-NC-SA with attribution.

Usage:
    python tools/gen_dickson_vocab.py
    python tools/gen_dickson_vocab.py --json <dump.json> --out <vocabulary-dickson.js>
"""
from __future__ import annotations

import argparse
import json
import os


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default=r"E:\QKMansion\CSX10\w\_dickson\pipeline\vocab-p10-305.json")
    ap.add_argument("--out", default=r"data\dickson\vocabulary-dickson.js")
    ap.add_argument("--max", type=int, default=0, help="limit entries (0 = all)")
    args = ap.parse_args()

    rows = json.load(open(args.json, encoding="utf-8"))
    seen = set()
    out = []
    for r in rows:
        if r.get("status") != "auto":
            continue
        pron = (r.get("translit") or "").strip()
        mdc = (r.get("mdc") or "").strip()
        gloss = (r.get("gloss") or "").strip()
        page = r.get("page")
        if not pron or not mdc:
            continue
        key = (pron, mdc)
        if key in seen:
            continue
        seen.add(key)
        out.append((pron, mdc, gloss, page))
        if args.max and len(out) >= args.max:
            break

    lines = []
    lines.append("// vocabulary-dickson.js —— Dickson 词典反推词表（生成文件，勿手改）")
    lines.append("//")
    lines.append("// 数据来源：R. Dickson, *Dictionary of Middle Egyptian* (2006)，")
    lines.append("// 许可：CC BY-NC-SA 2.5（署名 · 非商业 · 相同方式共享）。")
    lines.append("// 本文件是该词典的**派生数据**，不属于仓库 MIT 代码部分；分发时须保留署名，")
    lines.append("// 并以 CC BY-NC-SA 2.5 共享。由 tools/gen_dickson_vocab.py 生成。")
    lines.append("//")
    lines.append("// 字段：[发音, MdC, 英文释义, 页码]；仅收录自动对齐（status=auto）的词条，")
    lines.append("// 按 (发音, MdC) 去重。加载时跳过 VOCABULARY 里已有的同形词条。")
    lines.append("(function () {")
    lines.append('    "use strict";')
    lines.append("    if (typeof Vocabulary !== \"function\" || !Array.isArray(window.VOCABULARY)) return;")
    lines.append("    var ROWS = [")
    for pron, mdc, gloss, page in out:
        lines.append("        [%s, %s, %s, %s]," % (
            json.dumps(pron, ensure_ascii=False),
            json.dumps(mdc, ensure_ascii=False),
            json.dumps(gloss, ensure_ascii=False),
            json.dumps(page),
        ))
    lines.append("    ];")
    lines.append("    var added = 0;")
    lines.append("    for (var i = 0; i < ROWS.length; i++) {")
    lines.append("        var r = ROWS[i];")
    lines.append("        if (!r[0] || !r[1]) continue;")
    lines.append("        if (window.VOCAB_BY_MDC && VOCAB_BY_MDC[r[1]]) continue;   // 已有同形词条")
    lines.append("        var v = new Vocabulary(r[0], r[1], { en: r[2], chs: \"\" });")
    lines.append("        v.source = \"Dickson 2006, p.\" + r[3];")
    lines.append("        v.page = r[3];")
    lines.append("        VOCABULARY.push(v);")
    lines.append("        if (window.SEMANTICS) SEMANTICS.push(v);")
    lines.append("        if (window.VOCAB_BY_MDC) VOCAB_BY_MDC[r[1]] = v;")
    lines.append("        added++;")
    lines.append("    }")
    lines.append("    window.DICKSON_ADDED = added;")
    lines.append("    if (window.console) console.log(\"[vocabulary-dickson] +\" + added + \" entries\");")
    lines.append("})();")

    out_path = args.out
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("entries:", len(out), "->", out_path, "(", round(os.path.getsize(out_path) / 1024.0, 1), "KB )")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
