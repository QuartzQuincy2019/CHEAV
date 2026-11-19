"""Dickson PDF: vector glyph -> sign groups -> Gardiner codes -> MdC.

Prototype pipeline used to answer "can we turn the dictionary's vector glyphs
into MdC strings, without the printed codes?".

Stages
  1. pdftocairo gives the page as SVG: every sign is a set of filled <path>s
     with absolute coordinates;
  2. paths are grouped into signs (containment / small-gap union-find);
  3. signs are ordered row-major; entries are taken from the text layer
     (`[translit] gloss {codes}`) and aligned by line box;
  4. where the number of signs equals the number of printed codes, a labelled
     corpus (shape -> code) is produced automatically ("weak supervision");
  5. a shape model is trained: exact shape hash + k-NN over 24x24 rasters;
  6. MdC is assembled from the predicted codes and the row layout
     (same row -> '*', next row -> ':').

Usage:
  python tools/dickson_mdc.py --pages 10-14 --report
  python tools/dickson_mdc.py --pages 10-14 --train 10-12 --test 13-14

The script deliberately keeps everything in the standard library + Pillow.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass

SVG = "{http://www.w3.org/2000/svg}"
NUM = re.compile(r"-?\d+\.?\d*")
REDRE = re.compile(r"fill:rgb\((\d+)%,(\d+)%,(\d+)%\)")
ENTRY = re.compile(r"\[([^\[\]]{1,60})\]\s*(.*?)\s*\{([^}]*)\}")


# ------------------------------------------------------------------ vector data
@dataclass
class Path:
    d: str
    bbox: tuple[float, float, float, float]
    red: bool = False

    @property
    def w(self) -> float:
        return self.bbox[2] - self.bbox[0]

    @property
    def h(self) -> float:
        return self.bbox[3] - self.bbox[1]


def parse_svg(path: str) -> list[Path]:
    """Page-level path list.

    pdftocairo writes font outlines as `<symbol>` definitions inside `<defs>` and
    refers to them with `<use>`; those paths carry glyph-local coordinates and
    must not be mistaken for hieroglyphs drawn on the page (they used to leak into
    the glyph block and drag text fragments into the crops).
    """
    out: list[Path] = []
    skip = {SVG + "defs", SVG + "symbol", SVG + "clipPath", SVG + "mask", SVG + "pattern"}

    def walk(el) -> None:
        if el.tag in skip:
            return
        if el.tag == SVG + "path":
            d = el.get("d") or ""
            nums = [float(v) for v in NUM.findall(d)]
            if len(nums) >= 2:
                xs, ys = nums[0::2], nums[1::2]
                style = el.get("style") or ""
                m = REDRE.search(style)
                red = False
                if m:
                    r, g, b = (int(m.group(i)) for i in (1, 2, 3))
                    red = r >= 60 and g <= 20 and b <= 20
                out.append(Path(d, (min(xs), min(ys), max(xs), max(ys)), red))
        for child in el:
            walk(child)

    walk(ET.parse(path).getroot())
    return out


def shape_sig(p: Path) -> tuple:
    """Translation-invariant signature (bbox-relative coordinates)."""
    x0, y0 = p.bbox[0], p.bbox[1]
    nums = [float(v) for v in NUM.findall(p.d)]
    rel = tuple(round(v - (x0 if i % 2 == 0 else y0), 2) for i, v in enumerate(nums))
    return (round(p.w, 2), round(p.h, 2), rel)


def group_sig(group: list[Path]) -> tuple:
    """Signature of a whole sign: all subpaths, relative to the sign's own box,
    order-independent (the same glyph drawn twice yields the same signature)."""
    gx, gy, gx1, gy1 = bbox_of(group)
    parts = []
    for p in group:
        nums = [float(v) for v in NUM.findall(p.d)]
        rel = tuple(round(v - (gx if i % 2 == 0 else gy), 2) for i, v in enumerate(nums))
        parts.append(rel)
    parts.sort()
    return (round(gx1 - gx, 2), round(gy1 - gy, 2), tuple(parts))


def union_groups(paths: list[Path], dilate: float = 0.2) -> list[list[Path]]:
    n = len(paths)
    parent = list(range(n))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i in range(n):
        ax0, ay0, ax1, ay1 = paths[i].bbox
        for j in range(i + 1, n):
            bx0, by0, bx1, by1 = paths[j].bbox
            if ax0 - dilate <= bx1 and bx0 - dilate <= ax1 and ay0 - dilate <= by1 and by0 - dilate <= ay1:
                ra, rb = find(i), find(j)
                if ra != rb:
                    parent[rb] = ra

    groups: dict[int, list[Path]] = defaultdict(list)
    for i, p in enumerate(paths):
        groups[find(i)].append(p)
    return list(groups.values())


def bbox_of(group: list[Path]) -> tuple[float, float, float, float]:
    return (min(p.bbox[0] for p in group), min(p.bbox[1] for p in group),
            max(p.bbox[2] for p in group), max(p.bbox[3] for p in group))


def _overlap(a: tuple, b: tuple) -> float:
    """Vertical overlap of two bboxes, as a fraction of the smaller height."""
    top, bottom = max(a[1], b[1]), min(a[3], b[3])
    inter = max(0.0, bottom - top)
    return inter / max(1e-6, min(a[3] - a[1], b[3] - b[1]))


def to_rows(groups: list[list[Path]], overlap: float = 0.45) -> list[list[list[Path]]]:
    """Rows by vertical overlap (signs beside each other share a row)."""
    items = sorted(((g, bbox_of(g)) for g in groups), key=lambda gb: gb[1][1])
    rows: list[list[tuple[list[Path], tuple]]] = []
    for g, bb in items:
        for row in rows:
            rb = (min(b[0] for _, b in row), min(b[1] for _, b in row),
                  max(b[2] for _, b in row), max(b[3] for _, b in row))
            if _overlap(bb, rb) >= overlap:
                row.append((g, bb))
                break
        else:
            rows.append([(g, bb)])
    rows.sort(key=lambda row: min(b[1] for _, b in row))
    return [[g for g, _ in sorted(row, key=lambda gb: gb[1][0])] for row in rows]


# ---------------------------------------------------------------- text layer IO
def x_overlap(a: tuple, b: tuple) -> bool:
    return min(a[2], b[2]) - max(a[0], b[0]) > 0.0


def _stroke_kind(g: list[Path]) -> str:
    """'v'/'h' for thin bars, 'm' for small marks, '' otherwise.

    Z2 is printed as three vertical bars, Z3 as three stacked bars, and some
    signs (e.g. N33A) as a row of small marks -- all of them are ONE sign whose
    parts are separate PDF paths.
    """
    b = bbox_of(g)
    w, h = b[2] - b[0], b[3] - b[1]
    if min(w, h) <= 1.9 and max(w, h) >= 2.5:
        return "v" if h >= w else "h"
    if 0.6 <= w <= 3.4 and 0.6 <= h <= 3.4:
        return "m"
    return ""


def merge_red_labels(groups: list[list[Path]]) -> list[list[Path]]:
    """Merge red code labels into one sign each.

    Codes with no glyph in Dickson's font are printed as red text (page 80:
    G29A).  Red paths are therefore labels, never signs; adjacent red groups are
    merged into a single one.
    """
    out = [list(g) for g in groups]

    def close(a, b) -> bool:
        gap_x = max(b[0] - a[2], a[0] - b[2])
        gap_y = max(b[1] - a[3], a[1] - b[3])
        return gap_x <= 4.0 and gap_y <= 2.0

    guard = 0
    while guard < 40:
        guard += 1
        reds = [(i, bbox_of(g)) for i, g in enumerate(out) if any(p.red for p in g)]
        if len(reds) < 2:
            break
        parent = list(range(len(reds)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for i in range(len(reds)):
            for j in range(i + 1, len(reds)):
                if close(reds[i][1], reds[j][1]):
                    ra, rb = find(i), find(j)
                    if ra != rb:
                        parent[rb] = ra
        comps = {}
        for i in range(len(reds)):
            comps.setdefault(find(i), []).append(reds[i][0])
        clusters = [c for c in comps.values() if len(c) >= 2]
        if not clusters:
            break
        idxs = sorted(max(clusters, key=len))
        base = out[idxs[0]]
        for k in idxs[1:]:
            base = base + out[k]
        out = [g for i, g in enumerate(out) if i not in idxs] + [base]
    return out


def merge_base_marks(groups: list[list[Path]], codes: list[str]) -> list[list[Path]]:
    """Merge a flat sign with its small base mark (N16 = bar + tiny stroke).

    Dickson prints N16 as a wide flat bar with a tiny mark underneath; counted
    separately that produced a bogus "1+1+1" structure.
    """
    if len(groups) <= len(codes):
        return groups
    out = [list(g) for g in groups]
    guard = 0
    while len(out) > len(codes) and guard < 12:
        guard += 1
        boxes = [bbox_of(g) for g in out]
        merged = False
        for i, bi in enumerate(boxes):
            w, h = bi[2] - bi[0], bi[3] - bi[1]
            if w < 8.0 or h > 3.6:
                continue
            for j, bj in enumerate(boxes):
                if i == j:
                    continue
                mw, mh = bj[2] - bj[0], bj[3] - bj[1]
                if mw > 6.5 or mh > 1.9:
                    continue
                dy = bj[1] - bi[3]
                if -0.5 <= dy <= 1.8:
                    cx = (bj[0] + bj[2]) / 2
                    if bi[0] - 1 <= cx <= bi[2] + 1:
                        out[i] = out[i] + out[j]
                        del out[j]
                        merged = True
                        break
            if merged:
                break
        if not merged:
            break
    return out


def merge_identical_parts(groups: list[list[Path]], codes: list[str]) -> list[list[Path]]:
    """Merge repeated identical parts: N35A is three water strokes stacked.

    Dickson prints N35A as three identical flat strokes, Z2 as three identical
    bars, etc.  Identical-size parts that are stacked (or side by side) with a
    small gap belong to one sign; merge while the count exceeds the code count.
    """
    if len(groups) <= len(codes):
        return groups
    out = [list(g) for g in groups]

    def similar(ba, bb) -> bool:
        return (abs((ba[2] - ba[0]) - (bb[2] - bb[0])) <= 1.5
                and abs((ba[3] - ba[1]) - (bb[3] - bb[1])) <= 1.5)

    def close(ba, bb) -> bool:
        vgap = max(bb[1] - ba[3], ba[1] - bb[3])       # >0 when stacked
        hgap = max(bb[0] - ba[2], ba[0] - bb[2])       # >0 when side by side
        same_col = abs(ba[0] - bb[0]) <= 2.5 and abs(ba[2] - bb[2]) <= 2.5
        same_row = abs(ba[1] - bb[1]) <= 2.5 and abs(ba[3] - bb[3]) <= 2.5
        # Stacked identical parts (N35A) may be large; side-by-side identical
        # parts are only merged when they are small (Z2 bars, dots), otherwise
        # two neighbouring signs in the same row got fused (X1*D9A).
        small = max(ba[2] - ba[0], ba[3] - ba[1]) <= 5.5 and max(bb[2] - bb[0], bb[3] - bb[1]) <= 5.5
        return (same_col and vgap <= 3.6) or (same_row and hgap <= 3.6 and small)

    guard = 0
    while len(out) > len(codes) and guard < 30:
        guard += 1
        boxes = [bbox_of(g) for g in out]
        parent = list(range(len(out)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                if similar(boxes[i], boxes[j]) and close(boxes[i], boxes[j]):
                    ra, rb = find(i), find(j)
                    if ra != rb:
                        parent[rb] = ra
        comps = {}
        for i in range(len(out)):
            comps.setdefault(find(i), []).append(i)
        clusters = [c for c in comps.values() if len(c) >= 2]
        if not clusters:
            break
        idxs = sorted(max(clusters, key=len))
        base = out[idxs[0]]
        for k in idxs[1:]:
            base = base + out[k]
        out = [g for i, g in enumerate(out) if i not in idxs] + [base]
    return out


def merge_label_runs(groups: list[list[Path]], codes: list[str]) -> list[list[Path]]:
    """Merge a code printed as text (e.g. "D92", "Q38", "N21A") into one sign.

    When the sign has no glyph in Dickson's font, the dictionary prints its code
    as small detached letters next to the block.  Each letter is a separate path
    and used to be counted as a sign (so `rwt` = D21 X1 G43 D92 looked like six
    signs).  Letter-sized groups sharing a baseline are merged into one.
    """
    if len(groups) <= len(codes):
        return groups
    out = [list(g) for g in groups]

    def is_letter(g: list[Path]) -> bool:
        b = bbox_of(g)
        w, h = b[2] - b[0], b[3] - b[1]
        return 0.4 <= w <= 4.6 and 0.4 <= h <= 4.8

    def parent_find(parent, a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    # 1) label cluster with a letter drawn inside it ("D92" = one wide group +
    #    a detached glyph); merge the inner part into the outer label.
    guard0 = 0
    while len(out) > len(codes) and guard0 < 12:
        guard0 += 1
        merged = False
        boxes = [bbox_of(g) for g in out]
        for i, bi in enumerate(boxes):
            w, h = bi[2] - bi[0], bi[3] - bi[1]
            if not (w <= 14.0 and h <= 6.5):
                continue
            for j, bj in enumerate(boxes):
                if i == j:
                    continue
                iw, ih = bj[2] - bj[0], bj[3] - bj[1]
                if iw > 5.5 or ih > 5.5:
                    continue
                inside = (bj[0] >= bi[0] - 0.8 and bj[2] <= bi[2] + 0.8
                          and bj[1] >= bi[1] - 0.8 and bj[3] <= bi[3] + 0.8)
                if inside:
                    out[i] = out[i] + out[j]
                    del out[j]
                    merged = True
                    break
            if merged:
                break
        if not merged:
            break

    # 2) Fallback: a code printed as text is a small, flat group sitting at the
    #    right end of the block (e.g. O21B drawn as two letter runs).  Merge the
    #    rightmost small groups while the sign count is still too high.
    guard_r = 0
    while len(out) > len(codes) and guard_r < 12:
        guard_r += 1
        cands = [(i, bbox_of(g)) for i, g in enumerate(out)
                 if (bbox_of(g)[3] - bbox_of(g)[1]) <= 5.6 and (bbox_of(g)[2] - bbox_of(g)[0]) <= 16.0]
        if len(cands) < 2:
            break
        cands.sort(key=lambda ib: ib[1][2], reverse=True)
        ia, ba = cands[0]
        merged = False
        for ib, bb in cands[1:]:
            ov = max(0.0, min(ba[3], bb[3]) - max(ba[1], bb[1]))
            small = min(ba[3] - ba[1], bb[3] - bb[1])
            gap = max(bb[0] - ba[2], ba[0] - bb[2])
            if small > 0 and ov / small >= 0.5 and gap <= 3.2:
                out[ia] = out[ia] + out[ib]
                del out[ib]
                merged = True
                break
        if not merged:
            break

    guard = 0
    while len(out) > len(codes) and guard < 20:
        guard += 1
        items = [(i, bbox_of(g)) for i, g in enumerate(out) if is_letter(g)]
        if len(items) < 2:
            break
        parent = list(range(len(items)))
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                ia, ba = items[i]
                ib, bb = items[j]
                same_line = abs(ba[3] - bb[3]) < 1.8          # shared baseline
                gap = max(bb[0] - ba[2], ba[0] - bb[2])
                if same_line and gap <= 4.6:
                    ra, rb = parent_find(parent, i), parent_find(parent, j)
                    if ra != rb:
                        parent[rb] = ra
        comps = {}
        for i in range(len(items)):
            comps.setdefault(parent_find(parent, i), []).append(items[i][0])
        clusters = [c for c in comps.values() if len(c) >= 2]
        if not clusters:
            break
        idxs = sorted(max(clusters, key=len))
        base = out[idxs[0]]
        for k in idxs[1:]:
            base = base + out[k]
        out = [g for i, g in enumerate(out) if i not in idxs] + [base]
    return out


def merge_stroke_clusters(groups: list[list[Path]], codes: list[str]) -> list[list[Path]]:
    """Merge the parts of multi-stroke signs (Z2, Z3, N33A ...) into one sign.

    Dickson prints these signs as several detached paths.  Counted separately
    they inflate the sign count, so the entry never matches its code count.
    Parts are clustered by proximity/orientation and merged while the count is
    still above the printed code count.
    """
    if len(groups) <= len(codes):
        return groups
    out = [list(g) for g in groups]

    def parts():
        res = []
        for idx, g in enumerate(out):
            k = _stroke_kind(g)
            if k:
                res.append((idx, k, bbox_of(g)))
        return res

    def near(ka, ba, kb, bb) -> bool:
        # A merged sign must still fit a quadrat: 22/18 x 1 em = 20.7 x 17.8 pt.
        if max(ba[2], bb[2]) - min(ba[0], bb[0]) > 21.0:
            return False
        if max(ba[3], bb[3]) - min(ba[1], bb[1]) > 18.0:
            return False
        ca = ((ba[0] + ba[2]) / 2, (ba[1] + ba[3]) / 2)
        cb = ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)
        if ka == "m" or kb == "m":
            d = ((ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2) ** 0.5
            sa = max(ba[2] - ba[0], ba[3] - ba[1])
            sb = max(bb[2] - bb[0], bb[3] - bb[1])
            ratio = max(sa, sb) / max(1e-6, min(sa, sb))
            return d < 9.0 and ratio < 2.0
        if ka != kb:
            return False
        if ka == "v":  # bars: side by side, or stacked (Z3)
            side = (abs(ba[1] - bb[1]) < 1.2 and abs(ba[3] - bb[3]) < 1.2
                    and max(bb[0] - ba[2], ba[0] - bb[2]) < 8.0)
            stack = (abs(ca[0] - cb[0]) < 2.5
                     and max(bb[1] - ba[3], ba[1] - bb[3]) < 8.0)
            return side or stack
        side = (abs(ba[0] - bb[0]) < 1.2 and abs(ba[2] - bb[2]) < 1.2
                and max(bb[1] - ba[3], ba[1] - bb[3]) < 8.0)
        stack = (abs(ca[1] - cb[1]) < 2.5
                 and max(bb[0] - ba[2], ba[0] - bb[2]) < 8.0)
        return side or stack

    guard = 0
    while len(out) > len(codes) and guard < 30:
        guard += 1
        items = parts()
        if len(items) < 2:
            break
        parent = list(range(len(items)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                ia, ka, ba = items[i]
                ib, kb, bb = items[j]
                if near(ka, ba, kb, bb):
                    ra, rb = find(i), find(j)
                    if ra != rb:
                        parent[rb] = ra
        comps = {}
        for i in range(len(items)):
            comps.setdefault(find(i), []).append(items[i])
        clusters = [c for c in comps.values() if len(c) >= 2]
        if not clusters:
            break
        cl = sorted(clusters, key=len, reverse=True)[0]
        idxs = sorted(x[0] for x in cl)
        base = out[idxs[0]]
        for k in idxs[1:]:
            base = base + out[k]
        out = [g for i, g in enumerate(out) if i not in idxs] + [base]
    return out


def cadrat_structure(groups: list[list[Path]]) -> list[list[list[list[Path]]]]:
    """Split signs into cadrats, then each cadrat into layers.

    MdC semantics (CHEAV README / mdcCadrat.js / MdCRndr.parseQuadrat):
      '*'  same layer inside one cadrat
      ':'  next layer inside the same cadrat
      '-'  between cadrats (a new 1em square)

    A cadrat is a column: its signs overlap horizontally.  Splitting by
    x-overlap recovers `D2*X1:N1` (one cadrat, two layers) instead of
    `D2-X1-N1` (three cadrats), which is what a naive linear join produces.
    """
    boxes = [(g, bbox_of(g)) for g in groups]
    n = len(boxes)
    parent = list(range(n))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i in range(n):
        for j in range(i + 1, n):
            if x_overlap(boxes[i][1], boxes[j][1]):
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[rj] = ri
    comps: dict[int, list] = defaultdict(list)
    for i in range(n):
        comps[find(i)].append(boxes[i])

    out = []
    for comp in sorted(comps.values(), key=lambda c: min(b[0] for _, b in c)):
        layers: list[list[tuple]] = []
        for g, bb in sorted(comp, key=lambda gb: gb[1][1]):
            for layer in layers:
                lb = (min(x[1][0] for x in layer), min(x[1][1] for x in layer),
                      max(x[1][2] for x in layer), max(x[1][3] for x in layer))
                if _overlap(bb, lb) >= 0.45:
                    layer.append((g, bb))
                    break
            else:
                layers.append([(g, bb)])
        layers.sort(key=lambda layer: min(x[1][1] for x in layer))
        out.append([[g for g, _ in sorted(layer, key=lambda gb: gb[1][0])] for layer in layers])
    return out


def cadrat_mdc(cadrats: list[list[list[str]]]) -> str:
    """Serialise [cadrat][layer][code] with '*' / ':' / '-' as MdC requires."""
    return "-".join(":".join("*".join(layer) for layer in cadrat) for cadrat in cadrats)

def _area(b: tuple) -> float:
    return max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])


def _inter(a: tuple, b: tuple) -> float:
    w = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    h = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    return w * h


def amp_candidates(groups: list[list[Path]], codes: list[str]) -> tuple[bool, str]:
    """`&` (ligature: host + inserted sign) is deliberately OUT of scope.

    Two cheap signals let us park such entries for manual handling instead of
    emitting a wrong `*`/`:` result:
      * geometric nesting -- one sign's box mostly inside another's;
      * the known G39/X1 combination (the author's example).
    """
    # Only the known combination is used: bbox nesting fired on ordinary
    # side-by-side or stacked signs (A1 inside V30, a code label inside its own
    # glyph) and produced ~190 false "&" candidates.
    if "G39" in codes and "X1" in codes:
        return True, "G39+X1"
    return False, ""

def page_lines(pdf: str, page: int, work: str) -> list[dict]:
    """Lines with bbox and text, from `pdftotext -bbox`."""
    xml = os.path.join(work, f"p{page}.xml")
    if not os.path.exists(xml):
        subprocess.run(["pdftotext", "-f", str(page), "-l", str(page), "-bbox", pdf, xml], check=True)
    root = ET.parse(xml).getroot()
    words = []
    for w in root.iter("{http://www.w3.org/1999/xhtml}word"):
        words.append({
            "x0": float(w.get("xMin")), "y0": float(w.get("yMin")),
            "x1": float(w.get("xMax")), "y1": float(w.get("yMax")),
            "t": w.text or "",
        })
    # group by vertical band (poppler -bbox has no <line> elements)
    bands: list[list[dict]] = []
    for w in sorted(words, key=lambda w: (w["y0"] + w["y1"]) / 2):
        cy = (w["y0"] + w["y1"]) / 2
        for band in bands:
            bcy = sum((x["y0"] + x["y1"]) / 2 for x in band) / len(band)
            if abs(cy - bcy) <= 3.0:
                band.append(w)
                break
        else:
            bands.append([w])
    out = []
    for band in bands:
        band.sort(key=lambda w: w["x0"])
        # Split by the page gutter, not by a gap threshold: a long left-column
        # entry can reach the gutter and a 25pt gap rule then fuses both columns
        # into one "line" (which later produced crops spanning the whole page).
        left = [w for w in band if (w["x0"] + w["x1"]) / 2 < 300]
        right = [w for w in band if (w["x0"] + w["x1"]) / 2 >= 300]
        for seg in (left, right):
            if seg:
                out.append(seg)
    lines = []
    for seg in out:
        lines.append({
            "x0": min(w["x0"] for w in seg), "y0": min(w["y0"] for w in seg),
            "x1": max(w["x1"] for w in seg), "y1": max(w["y1"] for w in seg),
            "text": " ".join(w["t"] for w in seg),
        })
    # merge wrapped entries: a line with "[" but no "}" continues on the next line
    merged: list[dict] = []
    for ln in lines:
        if merged:
            prev = merged[-1]
            if "[" in prev["text"] and "}" not in prev["text"] and "}" in ln["text"] \
                    and abs(ln["x0"] - prev["x0"]) < 80 and 0 <= ln["y0"] - prev["y1"] < 22:
                prev["text"] = prev["text"] + " " + ln["text"]
                prev["x1"] = max(prev["x1"], ln["x1"])
                prev["y1"] = max(prev["y1"], ln["y1"])
                continue
        merged.append(ln)
    return merged


def page_image(pdf: str, page: int, work: str, dpi: int) -> str:
    # The dpi is part of the file name: a cached p10.png rendered at 300 dpi was
    # silently reused when 200 dpi was requested, so every crop was off by 1.5x
    # (the strip showed an entry a few lines above the one in the row).
    png = os.path.join(work, f"p{page}@{dpi}.png")
    if not os.path.exists(png):
        subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-r", str(dpi),
                        "-png", "-singlefile", pdf, png[:-4]], check=True)
    return png


def page_svg(pdf: str, page: int, work: str) -> str:
    svg = os.path.join(work, f"p{page}.svg")
    if not os.path.exists(svg):
        subprocess.run(["pdftocairo", "-f", str(page), "-l", str(page), "-svg", pdf, svg], check=True)
    return svg


# ------------------------------------------------------------------- raster ops
def rasterize(page_png: str, dpi: int, group: list[Path]):
    from PIL import Image
    im = Image.open(page_png).convert("L")
    s = dpi / 72.0
    x0, y0, x1, y1 = bbox_of(group)
    pad = 1.0
    return im.crop((int((x0 - pad) * s), int((y0 - pad) * s), int((x1 + pad) * s), int((y1 + pad) * s)))


def descriptor(img, n: int = 32) -> tuple[int, ...]:
    """Aspect-preserving binary raster of the sign (1 = ink), size-normalised."""
    from PIL import Image
    g = img.convert("L")
    w, h = g.size
    side = max(w, h)
    canvas = Image.new("L", (side, side), 255)
    canvas.paste(g, ((side - w) // 2, (side - h) // 2))
    small = canvas.resize((n, n), Image.LANCZOS)
    return tuple(1 if v < 160 else 0 for v in small.getdata())


# --------------------------------------------------------------- entry extraction
def page_words(pdf: str, page: int, work: str) -> list[tuple[float, float, float, float]]:
    """Word boxes from the text layer, used as a mask.

    pdftocairo turns part of the running text into plain <path> elements (not
    <use>), so without this mask the code letters land inside the glyph block
    and the crops show "N21A" instead of a sign.
    """
    xml = os.path.join(work, f"p{page}.xml")
    if not os.path.exists(xml):
        subprocess.run(["pdftotext", "-f", str(page), "-l", str(page), "-bbox", pdf, xml], check=True)
    root = ET.parse(xml).getroot()
    return [(float(w.get("xMin")), float(w.get("yMin")), float(w.get("xMax")), float(w.get("yMax")))
            for w in root.iter("{http://www.w3.org/1999/xhtml}word")]


def _in_word(b: tuple, words: list[tuple], pad: float = 1.0) -> bool:
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    for w in words:
        if w[0] - pad <= cx <= w[2] + pad and w[1] - pad <= cy <= w[3] + pad:
            return True
    return False

def _merge_wrapped(lines: list[dict]) -> list[dict]:
    """Join the continuation lines of an entry (head has '[' but no '}').

    Per column, and appending every following line that has no '[' while it is
    close enough: glosses wrap over one or two lines, codes over another, and a
    short line can sit between the head and the closing '}'.
    """
    out: list[dict] = []
    for col in (0, 1):
        merged: list[dict] = []
        head: dict | None = None
        for ln in sorted((l for l in lines if _column_of(l) == col), key=lambda l: l["y0"]):
            if head is not None and "[" not in ln["text"] and 0 <= ln["y0"] - head["y1"] < 22:
                head["text"] = head["text"] + " " + ln["text"]
                head["x1"] = max(head["x1"], ln["x1"])
                head["y1"] = max(head["y1"], ln["y1"])
                if "}" in ln["text"]:
                    head = None
                continue
            item = dict(ln)
            merged.append(item)
            head = item if ("[" in item["text"] and "}" not in item["text"]) else None
        out.extend(merged)
    return sorted(out, key=lambda l: l["y0"])


def _column_of(ln: dict) -> int:
    # Use the line END: a right-column line may start at the gutter (<300) when
    # its text is short, but it always ends past the gutter.
    return 0 if ln.get("x1", ln.get("x0", 0)) < 320 else 1


def entry_records(pdf: str, pages: range, work: str, dpi: int, raster: bool = True) -> list[dict]:
    recs = []
    for page in pages:
        paths = parse_svg(page_svg(pdf, page, work))
        words = page_words(pdf, page, work)
        paths = [p for p in paths if not _in_word(p.bbox, words)]
        png = page_image(pdf, page, work, dpi) if raster else ""
        lines = _merge_wrapped(page_lines(pdf, page, work))
        for idx, ln in enumerate(lines):
            m = ENTRY.search(ln["text"])
            if not m:
                continue
            translit, gloss, codes_txt = m.group(1), m.group(2), m.group(3)
            codes = codes_txt.split()
            if not codes:
                continue
            # Vertical window: half-way to the previous / next entry line of the
            # SAME column.  The old fixed +/-7pt band dragged in glyph fragments
            # from the neighbouring entry (a D2 of the line above, etc.).
            col = _column_of(ln)
            prev = next((lines[j] for j in range(idx - 1, -1, -1) if _column_of(lines[j]) == col), None)
            nxt = next((lines[j] for j in range(idx + 1, len(lines)) if _column_of(lines[j]) == col), None)
            y_top = (prev["y1"] + ln["y0"]) / 2 if prev else ln["y0"] - 12
            y_bot = (ln["y1"] + nxt["y0"]) / 2 if nxt else ln["y1"] + 12
            col_start = 36.0 if col == 0 else 296.0
            block = [p for p in paths
                     if col_start - 3 <= p.bbox[0] and p.bbox[2] <= ln["x0"] - 1
                     and y_top <= (p.bbox[1] + p.bbox[3]) / 2 <= y_bot]
            if not block:
                continue
            groups = merge_base_marks(
                merge_label_runs(
                    merge_identical_parts(
                        merge_stroke_clusters(merge_red_labels(union_groups(block)), codes), codes), codes),
                codes)
            rows = to_rows(groups)
            cadrats = cadrat_structure(groups)
            amp, amp_reason = amp_candidates(groups, codes)
            recs.append({
                "page": page, "translit": translit, "gloss": gloss, "codes": codes,
                "amp": amp, "amp_reason": amp_reason,
                "rows": rows, "cadrats": cadrats,
                "n_signs": sum(len(layer) for cad in cadrats for layer in cad),
                "n_rows": len(cadrats),
                "png": png, "dpi": dpi, "y": (ln["y0"], ln["y1"]),
                "bbox": (ln["x0"], ln["y0"], ln["x1"], ln["y1"]),
                "window": (y_top, y_bot), "col_start": col_start,
            })
    return recs


# ---------------------------------------------------------------- shape model
class ShapeModel:
    """Exact-shape table + k-NN over raster descriptors (the 'trained' part)."""

    def __init__(self) -> None:
        self.table: dict[tuple, Counter] = defaultdict(Counter)
        self.samples: list[tuple[list[float], str]] = []

    def fit(self, entries: list[dict]) -> None:
        for e in entries:
            if e["n_signs"] != len(e["codes"]):
                continue
            flat = [g for row in e["rows"] for g in row]
            for g, code in zip(flat, e["codes"]):
                self.table[group_sig(g)][code] += 1
                img = rasterize(e["png"], e.get("dpi", 300), g)
                self.samples.append((descriptor(img), code))

    def predict(self, group: list[Path], page_png: str, k: int = 5) -> tuple[str, str]:
        sig = group_sig(group)
        if sig in self.table:
            return self.table[sig].most_common(1)[0][0], "hash"
        q = descriptor(rasterize(page_png, 300, group))
        best = sorted(self.samples, key=lambda s: sum(a != b for a, b in zip(q, s[0])))[:k]
        votes = Counter(c for _, c in best)
        return votes.most_common(1)[0][0], "knn"


def mdc_from_rows(rows: list[list[str]]) -> str:
    """For flat code lists only: one cadrat per row, '*' inside a row."""
    return "-".join("*".join(r) for r in rows)


# ---------------------------------------------------------------------- report
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=r"E:\QKMansion\Documents\Garden\languages\埃及语\DicksonDictionary.pdf")
    ap.add_argument("--work", default=r"E:\QKMansion\CSX10\w\_dickson\pipeline")
    ap.add_argument("--pages", default="10-12")
    ap.add_argument("--train", default=None, help="page range for the shape model")
    ap.add_argument("--test", default=None, help="page range for evaluation")
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--dump", action="store_true", help="write vocabulary JSON (auto / manual-*)")
    args = ap.parse_args()

    os.makedirs(args.work, exist_ok=True)

    def rng(s: str) -> range:
        m = re.match(r"(\d+)-(\d+)$", s)
        return range(int(m.group(1)), int(m.group(2)) + 1) if m else range(int(s), int(s) + 1)

    if args.train and args.test:
        train = entry_records(args.pdf, rng(args.train), args.work, args.dpi)
        test = entry_records(args.pdf, rng(args.test), args.work, args.dpi)
        model = ShapeModel()
        model.fit(train)
        aligned_train = [e for e in train if e["n_signs"] == len(e["codes"])]
        print(f"train entries: {len(train)} (aligned {len(aligned_train)}), "
              f"shape table: {len(model.table)} shapes, raster samples: {len(model.samples)}")

        sign_ok = sign_total = 0
        mdc_ok = 0
        used = [e for e in test if e["n_signs"] == len(e["codes"])]
        for e in used:
            pred_rows, gold_rows = [], []
            for row in e["rows"]:
                pr, gr = [], []
                for g in row:
                    code, how = model.predict(g, e["png"])
                    pr.append(code)
                pred_rows.append(pr)
            gold_rows = [e["codes"][sum(len(r) for r in e["rows"][:i]): sum(len(r) for r in e["rows"][:i + 1])]
                         for i in range(len(e["rows"]))]
            for pr, gr in zip(pred_rows, gold_rows):
                for a, b in zip(pr, gr):
                    sign_total += 1
                    sign_ok += int(a == b)
            if mdc_from_rows(pred_rows) == mdc_from_rows(gold_rows):
                mdc_ok += 1
        print(f"test entries: {len(test)} (evaluated {len(used)})")
        print(f"sign accuracy: {sign_ok}/{sign_total} = {100*sign_ok/max(1,sign_total):.2f}%")
        print(f"code-sequence exact match (layout excluded): {mdc_ok}/{len(used)} = {100*mdc_ok/max(1,len(used)):.1f}%")
        for e in used[:6]:
            pr_rows = [[model.predict(g, e['png'])[0] for g in row] for row in e["rows"]]
            print(f"   {e['translit']:14} gold={mdc_from_rows([[c] for c in e['codes']]):22} pred={mdc_from_rows(pr_rows)}")
        return 0

    if args.dump:
        recs = entry_records(args.pdf, rng(args.pages), args.work, args.dpi, raster=False)
        out = []
        stats = Counter()
        for e in recs:
            rec = {"page": e["page"], "translit": e["translit"].replace(" ", ""), "gloss": e["gloss"], "codes": e["codes"]}
            if e["amp"]:
                rec["status"] = "manual-amp"
                rec["amp_reason"] = e["amp_reason"]
            elif e["n_signs"] != len(e["codes"]):
                rec["status"] = "manual-layout"
                rec["n_signs"] = e["n_signs"]
            else:
                k = 0
                cad = []
                for c in e["cadrats"]:
                    cad_c = []
                    for layer in c:
                        cad_c.append([e["codes"][k + i] for i in range(len(layer))])
                        k += len(layer)
                    cad.append(cad_c)
                rec["mdc"] = cadrat_mdc(cad)
                rec["status"] = "auto"
            stats[rec["status"]] += 1
            out.append(rec)
        first, last = min(rng(args.pages)), max(rng(args.pages))
        path = os.path.join(args.work, f"vocab-p{first}-{last}.json")
        json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"pages {first}-{last}: {dict(stats)}  ->  {path}")
        return 0
    recs = entry_records(args.pdf, rng(args.pages), args.work, args.dpi)
    aligned = [e for e in recs if e["n_signs"] == len(e["codes"])]
    print(f"pages {args.pages}: entries {len(recs)}, sign/code aligned {len(aligned)} "
          f"({100*len(aligned)/max(1,len(recs)):.1f}%)")
    print("row-count histogram (aligned):", dict(Counter(e["n_rows"] for e in aligned)))
    if args.report:
        for e in aligned[:12]:
            rows = [[f"<{len(r)}>"] for r in e["rows"]]
            print(f"   p{e['page']:3} {e['translit']:16} {','.join(e['codes']):28} rows={e['n_rows']} signs={e['n_signs']}")
        out = os.path.join(args.work, "aligned.json")
        json.dump([{k: v for k, v in e.items() if k not in ("rows", "png")} for e in aligned],
                  open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("wrote", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
