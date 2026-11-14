#!/usr/bin/env node
/**
 * 从本地 NewGardiner.ttf 提取每个码位的**字形轮廓墨迹框**，生成 js/database/ngMetrics.js。
 *
 * 口径与 JSesh 一致：量的是字形轮廓（glyf），不是字宽/行盒。
 * 输出：window.NG_METRICS = { "x13000": { w: 0.914, h: 1.014 }, ... }  —— em 为单位。
 *
 * 用法： node tools/ttf-metrics.js [字体路径] [输出路径]
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FONT = process.argv[2] || path.join(ROOT, "fonts", "NewGardiner.ttf");
const OUT = process.argv[3] || path.join(ROOT, "js", "database", "ngMetrics.js");

const buf = fs.readFileSync(FONT);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

/* ---------- sfnt 表目录 ---------- */
const numTables = dv.getUint16(4);
const tables = Object.create(null);
for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
    tables[tag] = { off: dv.getUint32(p + 8), len: dv.getUint32(p + 12) };
}
for (const need of ["head", "maxp", "cmap", "loca", "glyf"]) {
    if (!tables[need]) throw new Error("缺少表: " + need);
}

const unitsPerEm = dv.getUint16(tables.head.off + 18);
const indexToLocFormat = dv.getInt16(tables.head.off + 50);
const numGlyphs = dv.getUint16(tables.maxp.off + 4);

/* ---------- loca ---------- */
function readLoca() {
    const base = tables.loca.off;
    const out = new Array(numGlyphs + 1);
    for (let i = 0; i <= numGlyphs; i++) {
        out[i] = indexToLocFormat === 0 ? dv.getUint16(base + i * 2) * 2 : dv.getUint32(base + i * 4);
    }
    return out;
}
const loca = readLoca();

/* ---------- cmap ---------- */
function readCmap() {
    const base = tables.cmap.off;
    const n = dv.getUint16(base + 2);
    let best = null;
    for (let i = 0; i < n; i++) {
        const rec = base + 4 + i * 8;
        const plat = dv.getUint16(rec), enc = dv.getUint16(rec + 2);
        const off = base + dv.getUint32(rec + 4);
        const fmt = dv.getUint16(off);
        const score = (fmt === 12 ? 100 : fmt === 4 ? 50 : 0) + (plat === 3 ? 10 : 0);
        if (!best || score > best.score) best = { off, fmt, score };
    }
    if (!best) throw new Error("没有可用的 cmap 子表");
    const map = new Map();
    const off = best.off;
    if (best.fmt === 12) {
        const nGroups = dv.getUint32(off + 12);
        for (let g = 0; g < nGroups; g++) {
            const p = off + 16 + g * 12;
            const s = dv.getUint32(p), e = dv.getUint32(p + 4), gid = dv.getUint32(p + 8);
            for (let c = s; c <= e; c++) map.set(c, gid + (c - s));
        }
    } else if (best.fmt === 4) {
        const segX2 = dv.getUint16(off + 6);
        const seg = segX2 / 2;
        const ends = off + 14;
        const starts = ends + segX2 + 2;
        const deltas = starts + segX2;
        const rangeOffs = deltas + segX2;
        for (let i = 0; i < seg; i++) {
            const e = dv.getUint16(ends + i * 2);
            const s = dv.getUint16(starts + i * 2);
            const delta = dv.getInt16(deltas + i * 2);
            const ro = dv.getUint16(rangeOffs + i * 2);
            for (let c = s; c <= e && c !== 0xffff; c++) {
                let gid;
                if (ro === 0) gid = (c + delta) & 0xffff;
                else {
                    const gp = rangeOffs + i * 2 + ro + (c - s) * 2;
                    gid = dv.getUint16(gp);
                    if (gid !== 0) gid = (gid + delta) & 0xffff;
                }
                if (gid) map.set(c, gid);
            }
        }
    } else {
        throw new Error("暂不支持的 cmap 格式: " + best.fmt);
    }
    return map;
}
const cmap = readCmap();

/* ---------- glyf：轮廓点 → 精确 bbox ---------- */
const bboxCache = new Map();   // gid → {x0,y0,x1,y1} | null

function emptyBox() { return { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }; }
function addPt(b, x, y) {
    if (x < b.x0) b.x0 = x;
    if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y;
    if (y > b.y1) b.y1 = y;
}
function isEmptyBox(b) { return b.x0 > b.x1 || b.y0 > b.y1; }
// 二次贝塞尔（P0 起点、P1 控制点、P2 终点）在 x/y 上的极值
function quadExtrema(a, c, b, out) {
    const den = a - 2 * c + b;
    if (Math.abs(den) > 1e-9) {
        const t = (a - c) / den;
        if (t > 0 && t < 1) out.push((1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b);
    }
}

function readSimpleGlyph(off, endOff) {
    const nContours = dv.getInt16(off);
    const box = emptyBox();
    if (nContours === 0) return null;
    const endPts = [];
    let p = off + 10;
    for (let i = 0; i < nContours; i++, p += 2) endPts.push(dv.getUint16(p));
    const nPts = endPts[endPts.length - 1] + 1;
    p += 2;
    const flags = new Uint8Array(nPts);
    for (let i = 0; i < nPts;) {
        const f = dv.getUint8(p++);
        flags[i++] = f;
        if (f & 8) {          // REPEAT
            let r = dv.getUint8(p++);
            while (r-- > 0 && i < nPts) flags[i++] = f;
        }
    }
    const xs = new Int32Array(nPts), ys = new Int32Array(nPts);
    let v = 0;
    for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 2) { const d = dv.getUint8(p++); v += (f & 16) ? d : -d; }
        else if (!(f & 16)) { v += dv.getInt16(p); p += 2; }
        xs[i] = v;
    }
    v = 0;
    for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 4) { const d = dv.getUint8(p++); v += (f & 32) ? d : -d; }
        else if (!(f & 32)) { v += dv.getInt16(p); p += 2; }
        ys[i] = v;
    }
    // 按轮廓遍历：在线点直接取点；离线的四点是二次曲线，取端点 + 曲线极值
    const xEx = [], yEx = [];
    let start = 0;
    for (let ci = 0; ci < nContours; ci++) {
        const end = endPts[ci];
        let i = start;
        let px = xs[i], py = ys[i], pOn = !!(flags[i] & 1);
        const firstIdx = i;
        let moved = false;
        const ring = [];
        for (let k = start; k <= end; k++) ring.push(k);
        // 以“第一个在线点”为起点重建（没有在线点时用两点中点）
        for (let k = 1; k <= ring.length; k++) {
            const j = ring[k % ring.length];
            const on = !!(flags[j] & 1);
            if (!moved && pOn) { addPt(box, px, py); moved = true; }
            if (on) {
                if (moved) {
                    // 上一点是控制点 → 二次曲线
                    addPt(box, xs[j], ys[j]);
                } else {
                    addPt(box, xs[j], ys[j]);
                    moved = true;
                }
                px = xs[j]; py = ys[j]; pOn = true;
            } else {
                // 控制点：与下一个在线点（或中点）形成曲线
                let nj = ring[(k + 1) % ring.length];
                let nx, ny;
                if (flags[nj] & 1) { nx = xs[nj]; ny = ys[nj]; }
                else { nx = (xs[j] + xs[nj]) / 2; ny = (ys[j] + ys[nj]) / 2; }
                const ex = [], ey = [];
                quadExtrema(px, xs[j], nx, ex);
                quadExtrema(py, ys[j], ny, ey);
                for (const t of ex) xEx.push(t);
                for (const t of ey) yEx.push(t);
                addPt(box, nx, ny);
                px = nx; py = ny; pOn = true;
                if (nj === firstIdx) break;
            }
        }
        start = end + 1;
    }
    for (const t of xEx) { if (t < box.x0) box.x0 = t; if (t > box.x1) box.x1 = t; }
    for (const t of yEx) { if (t < box.y0) box.y0 = t; if (t > box.y1) box.y1 = t; }
    addPt(box, dv.getInt16(off + 2), dv.getInt16(off + 4));   // xMin/yMin
    addPt(box, dv.getInt16(off + 6), dv.getInt16(off + 8));   // xMax/yMax
    return isEmptyBox(box) ? null : box;
}

function readCompositeGlyph(off, endOff) {
    const box = emptyBox();
    let p = off + 10;
    let guard = 0;
    for (;;) {
        if (++guard > 64) break;
        const flags = dv.getUint16(p); p += 2;
        const gid = dv.getUint16(p); p += 2;
        let dx = 0, dy = 0;
        if (flags & 1) {                       // ARG_1_AND_2_ARE_WORDS
            if (flags & 2) { dx = dv.getInt16(p); dy = dv.getInt16(p + 2); }
            else { dx = dv.getUint16(p); dy = dv.getUint16(p + 2); }
            p += 4;
        } else {
            if (flags & 2) { dx = dv.getInt8(p); dy = dv.getInt8(p + 1); }
            else { dx = dv.getUint8(p); dy = dv.getUint8(p + 1); }
            p += 2;
        }
        let a = 1, b = 0, c = 0, d = 1;
        if (flags & 8) { a = d = dv.getInt16(p) / 16384; p += 2; }
        else if (flags & 0x40) { a = dv.getInt16(p) / 16384; d = dv.getInt16(p + 2) / 16384; p += 4; }
        else if (flags & 0x80) {
            a = dv.getInt16(p) / 16384; b = dv.getInt16(p + 2) / 16384;
            c = dv.getInt16(p + 4) / 16384; d = dv.getInt16(p + 6) / 16384; p += 8;
        }
        const sub = glyphBox(gid);
        if (sub) {
            for (const [sx, sy] of [[sub.x0, sub.y0], [sub.x1, sub.y0], [sub.x0, sub.y1], [sub.x1, sub.y1]]) {
                addPt(box, a * sx + c * sy + dx, b * sx + d * sy + dy);
            }
        }
        if (!(flags & 0x20)) break;            // MORE_COMPONENTS
    }
    return isEmptyBox(box) ? null : box;
}

function glyphBox(gid) {
    if (bboxCache.has(gid)) return bboxCache.get(gid);
    bboxCache.set(gid, null);                  // 防自引用
    const off = tables.glyf.off + loca[gid];
    const endOff = tables.glyf.off + loca[gid + 1];
    if (endOff <= off) return null;
    const nContours = dv.getInt16(off);
    const box = nContours >= 0 ? readSimpleGlyph(off, endOff) : readCompositeGlyph(off, endOff);
    bboxCache.set(gid, box);
    return box;
}

/* ---------- 输出 ---------- */
const out = Object.create(null);
let ok = 0, miss = 0;
for (const [cp, gid] of [...cmap.entries()].sort((a, b) => a[0] - b[0])) {
    if (cp < 0x20) continue;
    const key = "x" + cp.toString(16).toLowerCase();
    const b = glyphBox(gid);
    if (!b) { miss++; continue; }
    const w = (b.x1 - b.x0) / unitsPerEm;
    const h = (b.y1 - b.y0) / unitsPerEm;
    if (!(w > 0 && h > 0)) { miss++; continue; }
    out[key] = { w: Math.round(w * 10000) / 10000, h: Math.round(h * 10000) / 10000 };
    ok++;
}

const banner = `/**
 * NewGardiner.ttf 字形轮廓度量（自动生成，勿手工编辑）
 * 生成器：tools/ttf-metrics.js
 * 字体：${path.basename(FONT)}（unitsPerEm = ${unitsPerEm}，字形 ${numGlyphs} 个，收录 ${ok} 个码位）
 * 口径：glyf 轮廓的真实墨迹框（含二次曲线极值），与 JSesh 的 getBBox 一致；单位 em。
 */
`;
const body = "window.NG_METRICS = " + JSON.stringify(out, null, 0).replace(/\},\{/g, "},\n{") + ";\n";
fs.writeFileSync(OUT, banner + body, "utf8");
console.log(`  ✓ ${path.relative(ROOT, OUT)}  收录 ${ok} 个码位（跳过 ${miss}），unitsPerEm=${unitsPerEm}`);
