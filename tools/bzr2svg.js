// 把 JSesh 的 .bzr 多边形字体里的字形导出成 SVG（预览 / 补字用）。
// 用法：
//   node tools/bzr2svg.js --preview           生成 tests/probes/_bzrprev.html 供人眼核对
//   node tools/bzr2svg.js --write <code>...   把指定码写成 glyfs/jseshGlyphs/<code>.svg
//
// 格式依据（逐字段照抄）：
//   jsesh/glyphs/bzr/BzrCodes.java          控制码（b B e l L s S p t O x P）
//   jsesh/glyphs/bzr/BzrPortableFile.java   readBDouble / readSDouble / readString
//   jsesh/glyphs/bzr/BzrFontReader.java     文件结构：header → chars → postface
//   jsesh/glyphs/fonts/GnutraceHieroglyphShapeRepository.java  set("码", fonts['X'].getChar(n+31))

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BZR_DIR = path.join(ROOT, "tests", "probes", "_bzr");
const MAP_JAVA = "C:/Users/lenovo/Downloads/Compressed/jsesh-master/jsesh-master/jsesh/src/main/java/jsesh/glyphs/fonts/GnutraceHieroglyphShapeRepository.java";

const CODES = process.argv.includes("--preview")
    ? ["Aa8", "Aa9", "Aa10", "Aa11", "Aa12", "L6", "M41", "N20", "N22", "N33", "N41", "O50", "Z3", "Z8", "Z9", "Ff1", "N37", "N37A"]
    : process.argv.slice(process.argv.indexOf("--write") + 1).filter(a => !a.startsWith("--"));

// ---------- .bzr 读取 ----------
function makeReader(buf) {
    let p = 0;
    const MAXREAL = 255 + 255 / 256 + 255 / 65536;
    function byte() { return buf[p++]; }
    function readBuffer(n) {
        const hi = byte();
        const neg = (hi & 0x80) !== 0;
        const b = [hi];
        for (let i = 1; i < n; i++) b.push(byte());
        return { b, neg };
    }
    return {
        read() { return byte(); },
        peek() { return buf[p]; },
        skipNops() { let c; while ((c = byte()) === 0x78 /* 'x' */); return c; },
        readBDouble() {
            const { b, neg } = readBuffer(3);
            let d = b[0] + b[1] / 256 + b[2] / 65536;
            if (neg) d -= MAXREAL;
            return d;
        },
        readSDouble() {
            const { b, neg } = readBuffer(2);
            let d = b[0] / 256 + b[1] / 65536;
            if (neg) d -= 1;
            return d;
        },
        readString() {
            const n = byte();
            const s = buf.slice(p, p + n).toString("latin1");
            p += n;
            return s;
        },
        eof() { return p >= buf.length; }
    };
}

function parseBzr(file) {
    const r = makeReader(fs.readFileSync(file));
    r.readBDouble();          // size
    r.readString();           // font name
    const glyphs = new Map(); // code -> {llx,lly,urx,ury,paths:[[{x,y,c1?,c2?}...]]}
    let c;
    while (!r.eof() && (c = r.skipNops()) !== 0x50 /* 'P' */) {
        const abbrev = (c === 0x42 /* 'B' */);
        if (c !== 0x62 /* 'b' */ && !abbrev) break;
        const code = r.read();
        const rd = abbrev ? () => r.readSDouble() : () => r.readBDouble();
        const width = rd(), llx = rd(), lly = rd(), urx = rd(), ury = rd();
        const paths = [];
        // 注意：路径起始标记（p / t / O）只能被消费一次。
        // 内层循环退出时会返回该标记，必须复用到外层，否则会把它当成坐标读掉。
        let c2 = r.skipNops();
        while (c2 !== 0x65 /* 'e' */) {
            if (c2 !== 0x70 /* 'p' */ && c2 !== 0x74 /* 't' */ && c2 !== 0x4f /* 'O' */) break;
            const pts = [];
            let x = r.readBDouble(), y = r.readBDouble();
            pts.push({ x, y });
            let seg = r.skipNops();
            while (seg !== 0x70 && seg !== 0x74 && seg !== 0x4f && seg !== 0x65) {
                if (seg === 0x6c /* 'l' */) {
                    x = r.readBDouble(); y = r.readBDouble();
                    pts.push({ x, y });
                } else if (seg === 0x4c /* 'L' */) {
                    x += r.readSDouble(); y += r.readSDouble();
                    pts.push({ x, y });
                } else if (seg === 0x73 /* 's' */ || seg === 0x53 /* 'S' */) {
                    const rr = (seg === 0x53) ? () => r.readSDouble() : () => r.readBDouble();
                    const c1x = rr(), c1y = rr(), c2x = rr(), c2y = rr(), px = rr(), py = rr();
                    pts.push({ x: px, y: py, c1x, c1y, c2x, c2y });
                    x = px; y = py;
                } else {
                    break;
                }
                seg = r.skipNops();
            }
            paths.push(pts);
            c2 = seg;                 // ← 复用内层读到的标记
        }
        glyphs.set(code, { llx, lly, urx, ury, paths });
    }
    return glyphs;
}

// ---------- 码 → (字体文件, 槽位) ----------
function readMap() {
    const src = fs.readFileSync(MAP_JAVA, "utf8");
    const map = new Map();
    let m;

    // 形式一：fonts['N' - 'A'].getChar(38 + 31)
    const reChar = /set\("([^"]+)",\s*fonts\['([A-Za-z])'\s*-\s*'A'\]\.getChar\((\d+)\s*\+\s*31\)\)/g;
    while ((m = reChar.exec(src))) map.set(m[1], { family: m[2], slot: Number(m[3]) + 31 });

    // 形式二（Aa 族专用）：fonts[26].getChar(7 + 31)
    // fontNames[] 的顺序是 A..Z 然后 Aa，所以下标 26 对应 Aa.bzr。
    const reIdx = /set\("([^"]+)",\s*fonts\[(\d+)\]\.getChar\((\d+)\s*\+\s*31\)\)/g;
    while ((m = reIdx.exec(src))) map.set(m[1], { family: m[2] === "26" ? "Aa" : String(m[2]), slot: Number(m[3]) + 31, byIndex: true });

    return map;
}

// ---------- 生成 SVG 路径 ----------
function toPathData(g) {
    const out = [];
    for (const pts of g.paths) {
        if (!pts.length) continue;
        out.push("M " + pts[0].x.toFixed(2) + " " + pts[0].y.toFixed(2));
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            if (p.c1x !== undefined) {
                out.push("C " + p.c1x.toFixed(2) + " " + p.c1y.toFixed(2) + " " +
                    p.c2x.toFixed(2) + " " + p.c2y.toFixed(2) + " " + p.x.toFixed(2) + " " + p.y.toFixed(2));
            } else {
                out.push("L " + p.x.toFixed(2) + " " + p.y.toFixed(2));
            }
        }
        out.push("Z");
    }
    return out.join(" ");
}

function svgFor(g) {
    const x = Math.min(g.llx, g.urx), y = Math.min(g.lly, g.ury);
    const w = Math.abs(g.urx - g.llx) || 1, h = Math.abs(g.ury - g.lly) || 1;
    const pad = Math.max(w, h) * 0.04;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(x - pad).toFixed(2)} ${(y - pad).toFixed(2)} ${(w + 2 * pad).toFixed(2)} ${(h + 2 * pad).toFixed(2)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="transform:scaleY(-1)"><path d="${toPathData(g)}" fill="#000" fill-rule="evenodd"/></svg>`;
}

// ---------- main ----------
const map = readMap();
const fonts = new Map();      // family -> glyphs
function glyphFor(code) {
    const hit = map.get(code);
    if (!hit) return null;
    if (!fonts.has(hit.family)) fonts.set(hit.family, parseBzr(path.join(BZR_DIR, hit.family + ".bzr")));
    const g = fonts.get(hit.family).get(hit.slot);
    if (!g) return null;
    return { ...g, family: hit.family, slot: hit.slot, familySize: (fonts.get(hit.family).__size || null) };
}

const mode = process.argv.includes("--write") ? "write" : "preview";

if (mode === "preview") {
    const rows = CODES.map(code => {
        const g = glyphFor(code);
        if (!g) return `<div class="cell"><div class="miss">缺</div><div class="n">${code}</div></div>`;
        return `<div class="cell"><div class="g">${svgFor(g)}</div><div class="n">${code}</div>` +
            `<div class="u">${g.family}.bzr #${g.slot}</div></div>`;
    }).join("\n");
    const html = `<!DOCTYPE html><meta charset="utf-8">
<style>
body{margin:16px;background:#fff;color:#111;font:13px -apple-system,Segoe UI,sans-serif}
h1{font-size:15px;margin:0 0 10px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.cell{border:1px solid #e3e3e3;border-radius:6px;padding:8px;text-align:center}
.g{height:96px;display:flex;align-items:center;justify-content:center}
.n{font-size:12px;margin-top:4px}.u{font-size:10px;color:#999}
.miss{height:96px;color:#c00;font-size:12px;display:flex;align-items:center;justify-content:center}
</style>
<h1>.bzr 字形预览 —— 取自 JSesh 7.11 : jseshResources/goodbzr/*.bzr</h1>
<div class="grid">
${rows}
</div>
`;
    const out = path.join(ROOT, "tests", "probes", "_bzrprev.html");
    fs.writeFileSync(out, html, "utf8");
    console.log("已写入 " + out);
} else {
    for (const code of CODES) {
        const g = glyphFor(code);
        if (!g) { console.log("  ! " + code + " 找不到字形"); continue; }
        const x = Math.min(g.llx, g.urx), y = Math.min(g.lly, g.ury);
        const w = Math.abs(g.urx - g.llx) || 1, h = Math.abs(g.ury - g.lly) || 1;
        // BZR 的 y 轴向上；SVG 向下 → 用 transform 翻转，viewBox 用原坐标
        const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" ` +
            `width="${w.toFixed(2)}" height="${h.toFixed(2)}">\n` +
            `  <g transform="translate(0,${(y + h).toFixed(2)}) scale(1,-1)">\n` +
            `    <path d="${toPathData(g)}" fill="#000" fill-rule="evenodd"/>\n  </g>\n</svg>\n`;
        const dst = path.join(ROOT, "glyfs", "jseshGlyphs", code + ".svg");
        fs.writeFileSync(dst, svg, "utf8");
        console.log("  ✓ " + code + " → " + path.relative(ROOT, dst));
    }
}
