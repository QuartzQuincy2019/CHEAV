#!/usr/bin/env node
/**
 * tools/svg-bbox.js — 从 jseshGlyphs 的 SVG 路径数据算出**墨迹外框**（JSesh 口径）
 *
 * 为什么不用 <svg width/height>：
 *   老 Inkscape 导出的文件里 width/height 是**画布**（比如 N35 是 18×18 的正方形），
 *   而 JSesh 自己在加载时用的是 path 的几何外框（ShapeChar.fixShape 把 minX/minY 平移到 0）。
 *   所以只有 path 包围盒才与 JSesh 的排版尺寸一致。
 *
 * 用法：node tools/svg-bbox.js [--check]
 *   默认输出 js/database/svgBoxes.js（window.SVG_BOXES，单位 em，除以 A1 的墨迹高度）
 *   --check 只打印抽查结果，不写文件
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GLYPH_DIR = path.join(ROOT, "glyfs", "jseshGlyphs");
const OUT = path.join(ROOT, "js", "database", "svgBoxes.js");

// ---------- 路径包围盒 ----------
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

function tokenize(d) {
    const out = [];
    const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
    let m;
    while ((m = re.exec(d))) {
        if (m[1]) out.push(m[1]);
        else out.push(parseFloat(m[2]));
    }
    return out;
}

const box = () => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

function add(b, x, y) {
    if (x < b.minX) b.minX = x;
    if (y < b.minY) b.minY = y;
    if (x > b.maxX) b.maxX = x;
    if (y > b.maxY) b.maxY = y;
}

// 二次贝塞尔极值：B(t)=a(1-t)^2+2ct(1-t)+bt^2，B'(t)=0 → t=(a-c)/(a-2c+b)
function quadExtrema(a, c, b) {
    const den = a - 2 * c + b;
    if (Math.abs(den) < 1e-12) return [];
    const t = (a - c) / den;
    return (t > 0 && t < 1) ? [t] : [];
}

// 三次贝塞尔极值：B'(t)/3 = ... 解二次方程
function cubicExtrema(p0, p1, p2, p3) {
    const a = -p0 + 3 * p1 - 3 * p2 + p3;
    const b = 2 * (p0 - 2 * p1 + p2);
    const c = -p0 + p1;
    const ts = [];
    if (Math.abs(a) < 1e-12) {
        if (Math.abs(b) > 1e-12) ts.push(-c / b);
    } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const s = Math.sqrt(disc);
            ts.push((-b + s) / (2 * a), (-b - s) / (2 * a));
        }
    }
    return ts.filter((t) => t > 0 && t < 1);
}

function quadAt(p0, c, p1, t) {
    const u = 1 - t;
    return u * u * p0 + 2 * u * t * c + t * t * p1;
}

function cubicAt(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// 圆弧采样（A 命令），端点转换为中心参数化
function arcPoints(x0, y0, rx, ry, phiDeg, largeArc, sweep, x1, y1) {
    if (rx === 0 || ry === 0) return [[x1, y1]];
    const phi = (phiDeg * Math.PI) / 180;
    const cosp = Math.cos(phi), sinp = Math.sin(phi);
    const dx2 = (x0 - x1) / 2, dy2 = (y0 - y1) / 2;
    const x1p = cosp * dx2 + sinp * dy2;
    const y1p = -sinp * dx2 + cosp * dy2;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
    const sign = largeArc === sweep ? -1 : 1;
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = sign * Math.sqrt(Math.max(0, num / den));
    const cxp = (co * rx * y1p) / ry;
    const cyp = (-co * ry * x1p) / rx;
    const cx = cosp * cxp - sinp * cyp + (x0 + x1) / 2;
    const cy = sinp * cxp + cosp * cyp + (y0 + y1) / 2;
    const ang = (ux, uy, vx, vy) => {
        const dot = ux * vx + uy * vy;
        const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
        let a = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
        if (ux * vy - uy * vx < 0) a = -a;
        return a;
    };
    const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dtheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
    if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
    const pts = [];
    const N = 24;
    for (let i = 1; i <= N; i++) {
        const th = theta1 + (dtheta * i) / N;
        const x = cx + rx * Math.cos(th) * cosp - ry * Math.sin(th) * sinp;
        const y = cy + rx * Math.cos(th) * sinp + ry * Math.sin(th) * cosp;
        pts.push([x, y]);
    }
    return pts;
}

/** 计算一条 d 的包围盒 */
function pathBBox(d) {
    const b = box();
    const tk = tokenize(d);
    let i = 0, cmd = null;
    let x = 0, y = 0, sx = 0, sy = 0;          // 当前点 / 子路径起点
    let px = 0, py = 0;                        // 上一个控制点（S/T 用）
    let lastCmd = null;
    const num = () => tk[i++];
    const isNum = () => typeof tk[i] === "number";

    while (i < tk.length) {
        if (typeof tk[i] === "string") { cmd = tk[i++]; }
        else if (cmd === null) { i++; continue; }
        else if (cmd === "M") { cmd = "L"; }     // 隐式重复：M 后接坐标按 L 处理
        else if (cmd === "m") { cmd = "l"; }

        const rel = cmd === cmd.toLowerCase();
        const C = cmd.toUpperCase();
        if (C === "Z") {
            add(b, x, y); x = sx; y = sy; add(b, x, y);
            lastCmd = "Z"; px = py = x; // 控制点复位
            cmd = null;
            continue;
        }
        if (!isNum()) { cmd = null; continue; }

        if (C === "M") {
            x = rel ? x + num() : num(); y = rel ? y + num() : num();
            sx = x; sy = y; add(b, x, y);
        } else if (C === "L") {
            x = rel ? x + num() : num(); y = rel ? y + num() : num(); add(b, x, y);
        } else if (C === "H") {
            x = rel ? x + num() : num(); add(b, x, y);
        } else if (C === "V") {
            y = rel ? y + num() : num(); add(b, x, y);
        } else if (C === "C") {
            const x1 = rel ? x + num() : num(), y1 = rel ? y + num() : num();
            const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
            const x3 = rel ? x + num() : num(), y3 = rel ? y + num() : num();
            add(b, x, y);
            for (const t of cubicExtrema(x, x1, x2, x3)) add(b, cubicAt(x, x1, x2, x3, t), cubicAt(y, y1, y2, y3, t));
            for (const t of cubicExtrema(y, y1, y2, y3)) add(b, cubicAt(x, x1, x2, x3, t), cubicAt(y, y1, y2, y3, t));
            x = x3; y = y3; px = x2; py = y2; add(b, x, y);
        } else if (C === "S") {
            const x1 = lastCmd && /[CS]/.test(lastCmd) ? 2 * x - px : x;
            const y1 = lastCmd && /[CS]/.test(lastCmd) ? 2 * y - py : y;
            const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
            const x3 = rel ? x + num() : num(), y3 = rel ? y + num() : num();
            add(b, x, y);
            for (const t of cubicExtrema(x, x1, x2, x3)) add(b, cubicAt(x, x1, x2, x3, t), cubicAt(y, y1, y2, y3, t));
            for (const t of cubicExtrema(y, y1, y2, y3)) add(b, cubicAt(x, x1, x2, x3, t), cubicAt(y, y1, y2, y3, t));
            x = x3; y = y3; px = x2; py = y2; add(b, x, y);
        } else if (C === "Q") {
            const x1 = rel ? x + num() : num(), y1 = rel ? y + num() : num();
            const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
            add(b, x, y);
            for (const t of quadExtrema(x, x1, x2)) add(b, quadAt(x, x1, x2, t), quadAt(y, y1, y2, t));
            for (const t of quadExtrema(y, y1, y2)) add(b, quadAt(x, x1, x2, t), quadAt(y, y1, y2, t));
            x = x2; y = y2; px = x1; py = y1; add(b, x, y);
        } else if (C === "T") {
            const x1 = lastCmd && /[QT]/.test(lastCmd) ? 2 * x - px : x;
            const y1 = lastCmd && /[QT]/.test(lastCmd) ? 2 * y - py : y;
            const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
            add(b, x, y);
            for (const t of quadExtrema(x, x1, x2)) add(b, quadAt(x, x1, x2, t), quadAt(y, y1, y2, t));
            for (const t of quadExtrema(y, y1, y2)) add(b, quadAt(x, x1, x2, t), quadAt(y, y1, y2, t));
            x = x2; y = y2; px = x1; py = y1; add(b, x, y);
        } else if (C === "A") {
            const rx = num(), ry = num(), rot = num(), la = num(), sw = num();
            const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
            add(b, x, y);
            for (const p of arcPoints(x, y, rx, ry, rot, la, sw, x2, y2)) add(b, p[0], p[1]);
            x = x2; y = y2; add(b, x, y);
        } else {
            i++;
        }
        lastCmd = C;
    }
    return b;
}

/** 一个 SVG 文件的墨迹盒（所有 path 的并集） */
function svgBBox(text) {
    const b = box();
    const re = /<path\b[^>]*?\bd\s*=\s*["']([^"']+)["']/g;
    let m, n = 0;
    while ((m = re.exec(text))) {
        const pb = pathBBox(m[1]);
        if (!isFinite(pb.minX)) continue;
        add(b, pb.minX, pb.minY); add(b, pb.maxX, pb.maxY);
        n++;
    }
    return n ? b : null;
}

module.exports = { pathBBox, svgBBox };

// ---------- 生成表 ----------
if (require.main === module) {
    const checkOnly = process.argv.includes("--check");
    const files = fs.readdirSync(GLYPH_DIR).filter((f) => f.toLowerCase().endsWith(".svg"));
    const rows = [];
    let skipped = 0;
    for (const f of files) {
        const code = f.slice(0, -4);
        const text = fs.readFileSync(path.join(GLYPH_DIR, f), "utf8");
        const b = svgBBox(text);
        if (!b) { skipped++; continue; }
        let w = b.maxX - b.minX, h = b.maxY - b.minY;
        // 字形文件有两种坐标口径：大多数是 ~18 单位/字，
        // 但 I10 / U1 / E10 这类是 ~1800 单位（导出时放大了 100 倍）。
        // 不归一化就会被当成异常尺寸丢弃，这些字形就会退到 TTF 度量。
        while (Math.max(w, h) > 60) { w /= 100; h /= 100; }
        rows.push({ code, w: w, h: h });
    }
    const a1 = rows.find((r) => r.code === "A1");
    const em = a1 ? a1.h : 18;
    const out = {};
    const odd = [];
    for (const r of rows) {
        const w = r.w / em, h = r.h / em;
        if (!(w > 0.001 && h > 0.001) || w > 4 || h > 4) { odd.push(r.code); continue; }
        out[r.code] = { w: Math.round(w * 1000) / 1000, h: Math.round(h * 1000) / 1000 };
    }
    const keys = Object.keys(out).sort();
    console.log("1em(A1 墨迹高) =", em.toFixed(3), "units");
    console.log("表内", keys.length, "个；无路径", skipped, "；异常", odd.length);
    const spot = ["A1", "N5", "N35", "U21", "G43", "D28", "Z1", "X1", "M27", "G26"];
    console.log("抽查:", spot.map((k) => k + "=" + JSON.stringify(out[k] || null)).join("  "));
    if (!checkOnly) {
        const header = [
            "// SVG 墨迹盒（JSesh 口径）：由 tools/svg-bbox.js 从 jseshGlyphs/*.svg 的 path 数据算出，",
            "// 单位 em = A1 的墨迹高度（" + em.toFixed(3) + " 单位）。",
            "// 与字体轮廓度量（ngMetrics.js）分开：排版优先用本表，缺项再回退。",
            "window.SVG_BOXES = {",
        ].join("\n");
        const body = keys.map((k) => "  " + JSON.stringify(k) + ": {\"w\":" + out[k].w + ", \"h\":" + out[k].h + "}").join(",\n");
        fs.writeFileSync(OUT, header + "\n" + body + "\n};\n", "utf8");
        console.log("已写入", path.relative(ROOT, OUT), (fs.statSync(OUT).size / 1024).toFixed(0) + " KB");
    }
}
