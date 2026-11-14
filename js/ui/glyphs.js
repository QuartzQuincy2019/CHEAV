// js/ui/glyphs.js - JSesh SVG 字形来源（本机文件，零再分发）
//
// 设计要点：
//   · 数据来自用户本机的 jseshGlyphs-*.jar（或已解压的 SVG 目录），浏览器内解包，
//     **站点不分发任何 JSesh 数据**（JSesh 为 LGPL / CeCILL 授权）。
//   · 引擎只拿到一个「同步查询」的 provider（code → objectURL | null），
//     没有任何回调/重绘握手：应用层先 preload 需要的码，再渲染。
//   · 读不到就返回 null，引擎自然回落到 NewGardiner 字体。
//
// 应用层用法：
//   Glyphs.setRenderer(MdCRndr)            // 绑定引擎（内部 setGlyphProvider）
//   await Glyphs.useFile(file)             // jar（File/Blob）
//   await Glyphs.useDir(dirHandle)         // 已解压目录
//   await Glyphs.preload(["A1","C59C"])    // 预载需要的码
//   Glyphs.setEnabled(true)                // 开关
(function (global) {
    "use strict";

    // 构建标记：控制台执行 Glyphs.debug().build 即可确认当前加载的是哪一版
    const BUILD = "glyphs-202611141503";
    const DB_NAME = "CHEAV_FS";
    const STORE = "files";
    const KEY = "jseshGlyphs";

    let jarFile = null;              // jar 文件
    let index = new Map();           // "jseshGlyphs/A1.svg" → { method, csize, size, off }
    let dirHandle = null;            // 或：已解压目录
    let dirEntries = new Map();      // code → FileSystemFileHandle
    const urls = new Map();          // code → objectURL | null
    const rawSvg = new Map();      // 原始 SVG 文本（Tier 2 推导用）
    const derivedZones = new Map(); // 推导得到的连字区缓存
    const fillCache = new Map();   // code → {svg, vb, paths}（矢量命中测试用）
    let fontZoneBudget = 8;        // 单次渲染最多推导多少个字形（超限降级，防卡顿）
    let charDecoder = null;        // code → 字体字符（由 MdCRndr.decodeCode 注入）
    const svgZones = new Map();   // code → { 0: zone, 1: zone }（SVG 内 <rect id="zone1|zone2"> 的原始声明）
    const fontGrids = new Map();   // code → { N, bits, w, h }（字体墨迹栅格，em/单位口径与 inkGrid 一致）
    const inkGrids = new Map();     // code → { N, bits: Uint32Array, w, h }
    const gridPending = new Set();  // 正在栅格化的码
    let gridLastMs = 0;             // 最近一次栅格化耗时（诊断用）
    let ZONE_B_VARIANT = "B";   // "A" = Java 语义（矩形延伸到 18）；"B" = 屏幕语义（贴底带）
    const busy = new Set();          // 正在解压的 code
    const boxesEm = new Map();       // code → { x, y, w, h }（em，字形格左上角为原点）
    const metricsEm = new Map();     // code → { w, h }（单位：em，来自 JSesh 的 18 单位网格）
    const aspects = new Map();       // code → 宽高比（宽/高，取自 SVG 的 width/height）
    let indexLower = new Map();      // 小写名 → 真实条目名（JSesh 文件名大小写不统一，如 Aa1.svg）
    let dirLower = new Map();        // 小写码 → 真实码
    let enabled = false;
    let onLoadedCb = null;            // 每成功载入一个字形就回调一次（供界面刷新预览/匹配区）
    let siteDir = null;              // 站点内的已解压目录（如 glyfs/jseshGlyphs/），fetch 直读、零解压
    let fontFilter = null;           // (code) => true 表示内置字体已有该字形，不必用 SVG
    let engine = null;
    let lastError = "";

    /** 探测站点内是否有已解压的 SVG 目录（HTTP 打开时可用；file:// 下 fetch 会失败）。 */
    async function probeSiteDir() {
        const bases = ["glyfs/jseshGlyphs/", "glyphs/jseshGlyphs/", "jseshGlyphs/", "glyfs/"];
        for (const b of bases) {
            try {
                const r = await fetch(b + "A1.svg", { cache: "no-store" });
                if (r.ok) { siteDir = b; return b; }
            } catch (e) { /* file:// 或不存在 */ }
        }
        return null;
    }

    // ---------------- IndexedDB：记住上次选的 jar ----------------
    function openDb() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function idbPut(file) {
        try {
            const db = await openDb();
            await new Promise((res, rej) => {
                const tx = db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).put(file, KEY);
                tx.oncomplete = res;
                tx.onerror = () => rej(tx.error);
            });
            db.close();
        } catch (e) { /* 无 IDB 就只在本次会话有效 */ }
    }

    async function idbGet() {
        try {
            const db = await openDb();
            const file = await new Promise((res, rej) => {
                const tx = db.transaction(STORE, "readonly");
                const r = tx.objectStore(STORE).get(KEY);
                r.onsuccess = () => res(r.result || null);
                r.onerror = () => rej(r.error);
            });
            db.close();
            return file || null;
        } catch (e) { return null; }
    }

    // ---------------- ZIP：中央目录 ----------------
    /** 读 jar 尾部（EOCD + 中央目录），返回 { entries: Map, cdStart, cdSize }。 */
    async function readCentralDirectory(file) {
        const size = file.size;
        if (size < 22) throw new Error("文件太小，不是有效的 jar");
        // EOCD 最大 22 + 注释 65535
        const tailLen = Math.min(size, 22 + 65535);
        const tail = new Uint8Array(await file.slice(size - tailLen, size).arrayBuffer());
        const dv = new DataView(tail.buffer);
        let eocd = -1;
        for (let i = tail.length - 22; i >= 0; i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) throw new Error("不是有效的 zip/jar（找不到中央目录）");
        let count = dv.getUint16(eocd + 10, true);
        const cdSize = dv.getUint32(eocd + 12, true);
        let cdOff = dv.getUint32(eocd + 16, true);
        if (cdOff === 0xffffffff || count === 0xffff) {
            throw new Error("暂不支持 ZIP64 格式的 jar");
        }
        const cdBuf = new Uint8Array(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
        const cdv = new DataView(cdBuf.buffer);
        const entries = new Map();
        let p = 0;
        for (let i = 0; i < count && p + 46 <= cdBuf.length; i++) {
            if (cdv.getUint32(p, true) !== 0x02014b50) break;
            const method = cdv.getUint16(p + 10, true);
            const csize = cdv.getUint32(p + 20, true);
            const nameLen = cdv.getUint16(p + 28, true);
            const extraLen = cdv.getUint16(p + 30, true);
            const commentLen = cdv.getUint16(p + 32, true);
            const localOff = cdv.getUint32(p + 42, true);
            const name = new TextDecoder("utf-8").decode(new Uint8Array(cdBuf.buffer, p + 46, nameLen));
            entries.set(name, { method: method, csize: csize, off: localOff });
            p += 46 + nameLen + extraLen + commentLen;
        }
        if (!entries.size) throw new Error("jar 里没有条目");
        return entries;
    }

    /** 只读该条目需要的字节（两次 slice：先读本地头，再读压缩数据）。 */
    async function readEntry(name) {
        const ent = index.get(name);
        if (!ent) return null;
        if (!jarFile) return null;
        const head = new Uint8Array(await jarFile.slice(ent.off, ent.off + 30).arrayBuffer());
        const dv = new DataView(head.buffer);
        if (dv.getUint32(0, true) !== 0x04034b50) throw new Error("条目头损坏：" + name);
        const nameLen = dv.getUint16(26, true);
        const extraLen = dv.getUint16(28, true);
        const start = ent.off + 30 + nameLen + extraLen;
        const raw = new Uint8Array(await jarFile.slice(start, start + ent.csize).arrayBuffer());
        if (ent.method === 0) return raw;
        if (typeof DecompressionStream === "undefined") throw new Error("浏览器不支持 DecompressionStream");
        const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    // ---------------- 单个字形 ----------------
    /**
     * 规整 SVG 根元素：
     *   · 缺 xmlns 时补上（JSesh 有部分文件没写，浏览器会当成坏图片）
     *   · 缺 viewBox 时用 width/height 补一个
     *     —— 否则浏览器按 16×18 px 的固有尺寸栅格化再放大，细笔画会糊成一团（A1 的手就是这么丢的）
     */
    /** 用浏览器实测 SVG 的实际墨迹范围（含 transform）；拿不到返回 null。 */
    /** 墨迹并集：根 <svg> 的 getBBox() 返回视口，必须逐个 path/polygon 求并集（含 CTM 变换）。 */
    function unionInk(el) {
        let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity, any = false;
        const shapes = el.querySelectorAll("path,polygon");
        for (let i = 0; i < shapes.length; i++) {
            let bb = null;
            try { bb = shapes[i].getBBox(); } catch (e) { continue; }
            if (!bb || !(bb.width > 0) || !(bb.height > 0)) continue;
            let pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]];
            let ctm = null;
            try { ctm = shapes[i].getCTM(); } catch (e) { }
            if (ctm && isFinite(ctm.a)) {
                pts = pts.map(function (p) { return [ctm.a * p[0] + ctm.c * p[1] + ctm.e, ctm.b * p[0] + ctm.d * p[1] + ctm.f]; });
            }
            for (let k2 = 0; k2 < pts.length; k2++) {
                const px = pts[k2][0], py = pts[k2][1];
                if (px < ux0) ux0 = px; if (px > ux1) ux1 = px;
                if (py < uy0) uy0 = py; if (py > uy1) uy1 = py;
                any = true;
            }
        }
        return any ? { x: ux0, y: uy0, w: ux1 - ux0, h: uy1 - uy0 } : null;
    }

    function measureSvg(svgText) {
        if (typeof document === "undefined" || !document.body) return null;
        let holder = null;
        try {
            holder = document.createElement("div");
            holder.style.cssText = "position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden";
            holder.innerHTML = svgText;
            document.body.appendChild(holder);
            const el = holder.querySelector("svg");
            if (!el || typeof el.getBBox !== "function") return null;
            const bb = unionInk(el) || el.getBBox();   // 优先墨迹并集，兜底用视口
            if (bb && bb.width > 0 && bb.height > 0) return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
        } catch (e) { /* 忽略 */ } finally {
            if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
        }
        return null;
    }

    /** 写入（或替换）viewBox。 */
function setViewBox(svgText, vb) {
    const parts = String(vb).trim().split(/\s+/);
    if (parts.length !== 4 || parts.some(function (p) { return !isFinite(Number(p)); })) return svgText;
    const clean = parts.map(function (p) { return Number(p); }).join(" ");
    if (/\bviewBox\s*=\s*["'][^"']*["']/.test(svgText)) {
        return svgText.replace(/\bviewBox\s*=\s*["'][^"']*["']/, 'viewBox="' + clean + '"');
    }
    return svgText.replace(/<svg\b/, '<svg viewBox="' + clean + '"');
}

    function fixSvgNs(svg) {
        let out = svg;
        if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/.test(out)) {
            out = out.replace(/<svg(\s)/, '<svg xmlns="http://www.w3.org/2000/svg"$1');
        }
        const m = /<svg\b([^>]*)>/.exec(out);
        if (m && !/\bviewBox\s*=/.test(m[1])) {
            const w = /\bwidth\s*=\s*["']?([\d.]+)/.exec(m[1]);
            const h = /\bheight\s*=\s*["']?([\d.]+)/.exec(m[1]);
            if (w && h) {
                const wv = parseFloat(w[1]), hv = parseFloat(h[1]);
                if (wv > 0 && hv > 0) {
                    out = out.replace(/<svg\b/, '<svg viewBox="0 0 ' + wv + ' ' + hv + '"');
                }
            }
        }
        return out;
    }

    /**
     * 数值法求 path 的包围盒（不依赖 DOM）。
     * 覆盖 M/L/H/V/C/S/Q/T/A/Z 各命令的元数，绝对/相对都支持；
     * 控制点也计入 → 结果一定是真实墨迹的**超集**（宁可略大，绝不裁切）。
     */
    function numericBBox(xml) {
        const ds = [];
        const re = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["']/g;
        let mm;
        while ((mm = re.exec(xml))) ds.push(mm[1]);
        if (!ds.length) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const add = (x, y) => {
            if (!isFinite(x) || !isFinite(y)) return;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        };
        for (const d of ds) {
            const tok = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
            let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = "";
            const num = () => parseFloat(tok[i++]);
            while (i < tok.length) {
                if (/[MmLlHhVvCcSsQqTtAaZz]/.test(tok[i])) cmd = tok[i++];
                if (!cmd) { i++; continue; }
                const rel = cmd === cmd.toLowerCase();
                switch (cmd.toUpperCase()) {
                    case "M": { const x = num(), y = num(); cx = rel ? cx + x : x; cy = rel ? cy + y : y; sx = cx; sy = cy; add(cx, cy); cmd = rel ? "l" : "L"; break; }
                    case "L": { const x = num(), y = num(); cx = rel ? cx + x : x; cy = rel ? cy + y : y; add(cx, cy); break; }
                    case "H": { const x = num(); cx = rel ? cx + x : x; add(cx, cy); break; }
                    case "V": { const y = num(); cy = rel ? cy + y : y; add(cx, cy); break; }
                    case "C": { const a = num(), b = num(), c = num(), e = num(), x = num(), y = num();
                        add(rel ? cx + a : a, rel ? cy + b : b); add(rel ? cx + c : c, rel ? cy + e : e);
                        cx = rel ? cx + x : x; cy = rel ? cy + y : y; add(cx, cy); break; }
                    case "S": case "Q": { const a = num(), b = num(), x = num(), y = num();
                        add(rel ? cx + a : a, rel ? cy + b : b);
                        cx = rel ? cx + x : x; cy = rel ? cy + y : y; add(cx, cy); break; }
                    case "T": { const x = num(), y = num(); cx = rel ? cx + x : x; cy = rel ? cy + y : y; add(cx, cy); break; }
                    case "A": { num(); num(); num(); num(); num(); const x = num(), y = num();
                        cx = rel ? cx + x : x; cy = rel ? cy + y : y; add(cx, cy); break; }
                    case "Z": { cx = sx; cy = sy; add(cx, cy); cmd = ""; break; }
                    default: i++;
                }
            }
        }
        if (!isFinite(minX)) return null;
        return { x: minX, y: minY, w: Math.max(1e-6, maxX - minX), h: Math.max(1e-6, maxY - minY) };
    }

    /** JSesh 画框尺寸（SVG 用户单位）；取不到返回 null。 */
    function frameUnits(svg) {
        const m = /<svg\b[^>]*>/.exec(svg);
        if (!m) return null;
        const w = /\bwidth\s*=\s*["' ]?([\d.]+)/.exec(m[0]);
        const h = /\bheight\s*=\s*["' ]?([\d.]+)/.exec(m[0]);
        if (!w || !h) return null;
        const wv = parseFloat(w[1]), hv = parseFloat(h[1]);
        if (!(wv > 0 && hv > 0)) return null;
        return { w: wv, h: hv };
    }

    /**
     * JSesh 字形放进 1em 方格时的尺寸（单位 em）。
     * 取 JSesh 声明的画框，按「最长边 = 1em」归一化 —— 这正是 JSesh 自己把符号缩进
     * 一个 quadrat 的做法；比例保持不变，因此宽符号仍是宽的、扁符号仍是扁的。
     */
    function frameEm(svg) {
        const m = /<svg\b[^>]*>/.exec(svg);
        if (!m) return null;
        const w = /\bwidth\s*=\s*["' ]?([\d.]+)/.exec(m[0]);
        const h = /\bheight\s*=\s*["' ]?([\d.]+)/.exec(m[0]);
        if (!w || !h) return null;
        const wv = parseFloat(w[1]), hv = parseFloat(h[1]);
        if (!(wv > 0 && hv > 0)) return null;
        const k = 1 / Math.max(wv, hv);
        return { w: wv * k, h: hv * k };
    }

    function svgAspect(svg) {
        const m = /<svg\b[^>]*>/.exec(svg);
        if (!m) return null;
        const w = /\bwidth\s*=\s*["' ]?([\d.]+)/.exec(m[0]);
        const h = /\bheight\s*=\s*["' ]?([\d.]+)/.exec(m[0]);
        if (!w || !h) return null;
        const wv = parseFloat(w[1]), hv = parseFloat(h[1]);
        if (!(wv > 0 && hv > 0)) return null;
        return wv / hv;
    }

    function stripGuides(svg) {
        return svg
            // 任何形状元素：style 里出现 stroke:red / stroke:#ff0000 就整块删掉
            .replace(/<(rect|path|line|polyline|polygon|circle|ellipse)\b[^>]*style="[^"]*(?:stroke:\s*red|stroke:\s*#ff0000|#ff0000)[^"]*"[^>]*?\/?>/gi, "")
            // 兜底：显式红描边属性
            .replace(/<(rect|path|line|polyline|polygon|circle|ellipse)\b[^>]*stroke="(?:red|#ff0000)"[^>]*?\/?>/gi, "");
    }

    async function loadOne(code) {
    if (api.canon) code = api.canon(code);
        if (urls.has(code)) return urls.get(code);
        if (busy.has(code)) return null;
        // JSesh 的文件名大小写并不总与码表一致（如 AA1 → Aa1.svg）：先精确匹配，再忽略大小写
        let name = "jseshGlyphs/" + code + ".svg";
        if (!index.has(name)) {
            const alt = indexLower.get(name.toLowerCase());
            if (alt) name = alt;
        }
        let dirKey = code;
        if (!dirEntries.has(dirKey)) {
            const altDir = dirLower.get(code.toLowerCase());
            if (altDir) dirKey = altDir;
        }
        const inDir = dirEntries.has(dirKey);
        if (!inDir && !index.has(name) && !siteDir) { urls.set(code, null); return null; }
        busy.add(code);
        try {
            let bytes;
            if (inDir) {
                const fh = dirEntries.get(dirKey);
                bytes = new Uint8Array(await (await fh.getFile()).arrayBuffer());
            } else if (siteDir && !index.size) {
                // 站点内已解压目录（如 glyfs/jseshGlyphs/）：直接 fetch 文本，零解压开销
                let resp = await fetch(siteDir + code + ".svg", { cache: "force-cache" });
                if (!resp.ok) {
                    resp = await fetch(siteDir + code.toLowerCase() + ".svg", { cache: "force-cache" });
                }
                if (!resp.ok) { urls.set(code, null); return null; }
                bytes = new TextEncoder().encode(await resp.text());
            } else {
                bytes = await readEntry(name);
            }
            if (!bytes) { urls.set(code, null); return null; }
            const raw = new TextDecoder("utf-8").decode(bytes);
            // 先解析连字区（stripGuides 会把红框 rect 删掉，必须在它之前）
            try { const sz = api.parseSvgZones(raw); if (sz) svgZones.set(code, sz); } catch (e) { }
            let svgText = stripGuides(fixSvgNs(raw));
            rawSvg.set(code, svgText);      // 供 Tier 2 连字区推导
            // 用数值方法算墨迹范围（不依赖 DOM，getBBox 只作为交叉校验）：
            // JSesh 的画框 width/height 是符号的"自然尺寸"，18 单位 = 1em；
            // 墨迹偶尔会略微超出画框，viewBox 取「画框 ∪ 墨迹」，避免被 SVG 视口裁掉。
            // 墨迹范围：优先用浏览器 getBBox（含 g 的 transform），
            // 没有 DOM（Node 测试）时退回数值法（不处理 transform，仅作兜底）。
            const ink = measureSvg(svgText) || numericBBox(svgText);
            const fr = frameUnits(svgText) || (ink ? { w: ink.x + ink.w, h: ink.y + ink.h } : null);
            const big = fr ? Math.max(fr.w, fr.h) : 0;
            // JSesh 的 SVG 有两种导出比例：
            //   · 常规文件 18 单位 = 1em（A1 17.78 → 0.99em）
            //   · 高清文件 1800 单位 = 1em（Aa1 864.7 → 0.48em、G7 1800 → 1em）
            // 用 100 单位做分界；按各自的"每 em 单位数"归一化，比例才与 JSesh 一致。
            const em = big > 100 ? 1800 : 18;
            if (fr) {
                // viewBox 只取「墨迹 + 少量留白」：这样盒子可以贴着字形，字符间距不会被撑大，
                // 图片也不会宽于盒子而被 background-clip 裁掉。
                const pad = Math.max(ink ? Math.max(ink.w, ink.h) : 0, 1) * 0.01;
                const ix = ink ? ink.x - pad : 0;
                const iy = ink ? ink.y - pad : 0;
                const iw = ink ? ink.w + pad * 2 : fr.w;
                const ih = ink ? ink.h + pad * 2 : fr.h;
                svgText = setViewBox(svgText, ix + " " + iy + " " + iw + " " + ih);
                /* zone 已在剥离前解析 */
                aspects.set(code, iw / ih);
                // 布局尺寸 = 墨迹（em）：字距贴合、堆叠组层高紧凑
                metricsEm.set(code, { w: iw / em, h: ih / em });
                // 绘制：墨迹在字形格内的位置（em）——底边相对基线的偏移由画框决定
                const frameH = fr.h;
                const inkBottom = ink ? ink.y + ink.h : frameH;
                boxesEm.set(code, {
                    w: iw / em,
                    h: ih / em,
                    dy: (frameH - inkBottom) / em,   // 墨迹底边距基线的距离（>0 表示浮空）
                });
            } else {
                const asp = svgAspect(raw);
                if (asp) aspects.set(code, asp);
                const fm = frameEm(raw);          // 无 DOM 时的兜底（按画框归一化）
                if (fm) metricsEm.set(code, { w: fm.w, h: fm.h });
            }
            // data: URL —— file:// 页面下 blob:null/… 无法作为背景图加载，data: 则到处都能用
            const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
            urls.set(code, url);
            // 字形已就绪：立即推导连字区（矢量命中测试此时可用），避免"未加载→判定为占据"的误判
            derivedZones.delete(code);
            try { api.deriveZones(code); } catch (e) { }
            if (typeof onLoadedCb === "function") {
                try { onLoadedCb(code); } catch (e) { /* 忽略回调异常 */ }
            }
            return url;
        } catch (e) {
            lastError = e.message || String(e);
            urls.set(code, null);
            return null;
        } finally {
            busy.delete(code);
        }
    }

    /** 同步查询（无副作用）：命中缓存返回 URL，否则 null。加载统一由应用层 preload 负责。 */
    function provider(code) {
        if (!enabled) return null;
        if (fontFilter && fontFilter(code)) return null;   // 内置字体有这个字形 → 交给字体
        if (urls.has(code)) return urls.get(code);
        return null;
    }

    function syncEngine() {
        if (engine && typeof engine.setGlyphProvider === "function") {
            engine.setGlyphProvider(enabled ? provider : null);
        }
    }

    // ---------------- 对外接口 ----------------
    const api = {
        get supported() {
            return typeof DecompressionStream !== "undefined";
        },
        get enabled() { return enabled; },
        get ready() { return !!(index.size || dirEntries.size || siteDir); },
        get name() { return jarFile ? jarFile.name : (dirHandle ? (dirHandle.name + "/") : (siteDir || "")); },
        get count() { return index.size || dirEntries.size || 0; },
        get error() { return lastError; },

        /** 载入字形后的回调（code）。 */
        set onLoaded(fn) { onLoadedCb = (typeof fn === "function") ? fn : null; },
        get onLoaded() { return onLoadedCb; },

        setRenderer(md) {
            engine = md || null;
            syncEngine();
        },

        /** 设置「哪些码仍交给字体渲染」（返回 true 表示用字体）。 */
        setFontFilter(fn) {
            fontFilter = (typeof fn === "function") ? fn : null;
            return api;
        },

        setEnabled(on) {
            enabled = !!on;
            syncEngine();
            return enabled;
        },

        /** 载入 jar（File / Blob）。 */
        async useFile(file) {
            lastError = "";
            jarFile = file; dirHandle = null; dirEntries = new Map();
            urls.forEach(u => { if (u && u.indexOf("blob:") === 0) URL.revokeObjectURL(u); });
            urls.clear(); busy.clear();
            index = await readCentralDirectory(file);
            indexLower = new Map();
            index.forEach((_, name) => indexLower.set(name.toLowerCase(), name));
            return index.size;
        },

        /** 载入已解压的 SVG 目录。 */
        async useDir(dir) {
            lastError = "";
            dirHandle = dir; jarFile = null; index = new Map();
            urls.forEach(u => { if (u && u.indexOf("blob:") === 0) URL.revokeObjectURL(u); });
            urls.clear(); busy.clear();
            dirEntries = new Map();
            for await (const entry of dir.values()) {
                if (entry.kind !== "file") continue;
                const m = /^(.+)\.svg$/i.exec(entry.name);
                if (m) dirEntries.set(m[1], entry);
            }
            dirLower = new Map();
            dirEntries.forEach((_, code) => dirLower.set(code.toLowerCase(), code));
            if (!dirEntries.size) throw new Error("目录里没有 .svg 文件");
            return dirEntries.size;
        },

        /** 用 <input webkitdirectory> 选到的文件列表建立索引（不依赖 File System Access API）。 */
        async useFileList(files) {
            lastError = "";
            dirHandle = { name: "（目录）" }; jarFile = null; index = new Map();
            urls.forEach(u => { if (u && u.indexOf("blob:") === 0) URL.revokeObjectURL(u); });
            urls.clear(); busy.clear();
            dirEntries = new Map();
            for (const f of files) {
                const m = /^(.+)\.svg$/i.exec(f.name || "");
                if (m) dirEntries.set(m[1], { getFile: async () => f });
            }
            dirLower = new Map();
            dirEntries.forEach((_, code) => dirLower.set(code.toLowerCase(), code));
            if (!dirEntries.size) throw new Error("所选目录里没有 .svg 文件");
            return dirEntries.size;
        },

        /** 弹出文件选择器（jar）。 */
        async pick() {
            if (typeof global.showOpenFilePicker !== "function") throw new Error("浏览器不支持文件选择（需 Chrome / Edge）");
            const handles = await global.showOpenFilePicker({
                id: "jseshGlyphs",
                multiple: false,
                types: [{
                    description: "JSesh 字形库（jseshGlyphs-*.jar）",
                    accept: { "application/java-archive": [".jar"], "application/zip": [".zip"] },
                }],
            });
            const file = await handles[0].getFile();
            const n = await api.useFile(file);
            idbPut(file);
            return n;
        },

        /** 弹出目录选择器（已解压的 SVG）。 */
        async pickDir() {
            if (typeof global.showDirectoryPicker !== "function") throw new Error("浏览器不支持目录选择（需 Chrome / Edge）");
            const dir = await global.showDirectoryPicker({ id: "jseshGlyphs", mode: "read" });
            return api.useDir(dir);
        },

        /** 恢复上次的 jar（IDB）。 */
        async restore() {
            if (index.size || dirEntries.size) return true;
            const file = await idbGet();
            if (!file) return false;
            try { await api.useFile(file); return true; } catch (e) { return false; }
        },

        /** 预载一批码（逐个解压，失败不影响其它）。 */
        async preload(codes) {
            if (Array.isArray(codes)) codes = codes.map(function (c) { return api.canon(c); });
            let loaded = 0;
            for (const c of codes) {
                if (!c || urls.has(c)) continue;
                const before = urls.size;
                await loadOne(c);
                if (urls.size > before && urls.get(c)) loaded++;
            }
            return loaded;
        },

        /** jar 内可用的码名列表（形如 A1、C59C；用于把外部码并入匹配池）。 */
        codes() {
            const out = [];
            index.forEach((_, name) => {
                const m = /^jseshGlyphs\/(.+)\.svg$/.exec(name);
                if (m && /^[A-Z][A-Za-z]?\d+[A-Za-z0-9]*$/.test(m[1])) out.push(m[1]);
            });
            dirEntries.forEach((_, code) => {
                if (/^[A-Z][A-Za-z]?\d+[A-Za-z0-9]*$/.test(code) && out.indexOf(code) < 0) out.push(code);
            });
            return out;
        },

        /** 某个码在字形格内的绘制矩形（单位 em，左上角为原点）；未知返回 null。 */
        box(code) {
            code = this.canon(code);
            return boxesEm.has(code) ? boxesEm.get(code) : null;
        },

        /** 某个码的 JSesh 自有度量（单位 em）；未知返回 null。 */
        metrics(code) {
            code = this.canon(code);
            return metricsEm.has(code) ? metricsEm.get(code) : null;
        },

        /** 某个码的宽高比（宽/高）；未知返回 null。 */
        aspect(code) {
            code = this.canon(code);
            return aspects.has(code) ? aspects.get(code) : null;
        },

        /** 是否已尝试过（无论成功或失败）——用于避免反复重试。 */
        tried(code) { return urls.has(code); },

        /** 同步查询某个码的 URL（未就绪返回 null，无副作用）。 */
        urlFor(code) {
            code = this.canon(code);
            return urls.has(code) ? urls.get(code) : null;
        },

        /** 诊断：返回某码 SVG 的整体 bbox 与各子元素 bbox（找"看不见的大元素"）。 */
        async probe(code) {
            await loadOne(code);
            const url = urls.get(code);
            if (!url || url.indexOf("data:") !== 0) return { error: "未加载" };
            const svgText = decodeURIComponent(url.slice(url.indexOf(",") + 1));
            const holder = document.createElement("div");
            holder.style.cssText = "position:absolute;left:-99999px;top:0";
            holder.innerHTML = svgText;
            document.body.appendChild(holder);
            const svg = holder.querySelector("svg");
            const bb = svg.getBBox();
            const children = [];
            svg.querySelectorAll("*").forEach(function (el) {
                if (typeof el.getBBox !== "function") return;
                try {
                    const b = el.getBBox();
                    children.push(el.tagName + (el.getAttribute("style") || "").slice(0, 40) + " " +
                      b.x.toFixed(1) + "," + b.y.toFixed(1) + " " + b.width.toFixed(1) + "×" + b.height.toFixed(1));
                } catch (e) { }
            });
            holder.remove();
            return { viewBox: svg.getAttribute("viewBox"), bbox: [bb.x.toFixed(1), bb.y.toFixed(1), bb.width.toFixed(1), bb.height.toFixed(1)], children: children };
        },

        /** 尝试使用站点内的已解压目录（HTTP 打开时最省事：零解压）。 */
        async useSiteDir() {
            const b = await probeSiteDir();
            if (!b) return null;
            jarFile = null; dirHandle = null; index = new Map(); dirEntries = new Map();
            urls.forEach(u => { if (u && u.indexOf("blob:") === 0) URL.revokeObjectURL(u); });
            urls.clear(); busy.clear(); aspects.clear(); metricsEm.clear(); boxesEm.clear();
            return b;
        },

        /** 连字区（来自 js/database/glyphZones.js，Tier 1）。 */
        /** Tier 2：按墨迹占据网格推导连字区（JSesh LigatureZoneBuilder 的网格版）。 */
        /** 转写 → 规范 Gardiner 码（多数用户输入转写，度量/区/加载前必须规范化）。 */
        /** 注入 code → 字体字符 的映射（字体栅格必须用它，否则画出来是码字面量 "G43"）。 */
        setCharDecoder(fn) { charDecoder = (typeof fn === "function") ? fn : null; },

        canon(code) {
            const c = String(code == null ? "" : code);
            if (typeof MAIN_SIGNS !== "undefined" && MAIN_SIGNS[c]) return MAIN_SIGNS[c];
            if (typeof TRANSLIT_SIGNS !== "undefined") {
                const v = TRANSLIT_SIGNS[c];
                if (Array.isArray(v) && v.length) return v[0];
                if (typeof v === "string" && v) return v;
            }
            return c;
        },

        /** 诊断：已缓存的原始 SVG 数量与样例键。 */
        rawSize() { return { n: rawSvg.size, keys: Array.from(rawSvg.keys()).slice(0, 5) }; },

        /** 惰性请求把某字形栅格化为 32×32 占据位图（不阻塞渲染；完成后再参与推导）。 */
        requestGrid(code) {
            const self = this;
            if (inkGrids.has(code) || gridPending.has(code)) return;
            const url = urls.get(code);
            if (!urls.get(code)) {
                // 尚未加载：先加载再回来栅格化
                if (typeof loadOne === "function") {
                    gridPending.add(code);
                    loadOne(code).then(function () { gridPending.delete(code); self.requestGrid(code); }).catch(function () { gridPending.delete(code); });
                }
                return;
            }
            if (!url) return;
            gridPending.add(code);
            const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
            const img = new Image();
            img.decoding = "async";
            img.onload = () => {
                try {
                    const N = 128;  // 列数（行数按墨迹宽高比）
                    const em0 = metricsEm.get(code) || { w: 1, h: 1 };
                    const M = Math.max(8, Math.min(N * 4, Math.round(N * (em0.h / Math.max(em0.w, 1e-6)))));
                    const cv = document.createElement("canvas");
                    cv.width = N; cv.height = M;
                    const ctx2 = cv.getContext("2d", { willReadFrequently: true });
                    ctx2.drawImage(img, 0, 0, N, M);
                    const data = ctx2.getImageData(0, 0, N, M).data;
                    const bits = new Uint32Array((N * M + 31) >> 5);
                    for (let i = 0; i < N * M; i++) {
                        if (data[i * 4 + 3] > 128) bits[i >> 5] |= (1 << (i & 31));
                    }
                    const em2 = metricsEm.get(code) || { w: 1, h: 1 };
                    inkGrids.set(code, { N, M, bits, w: em2.w * 18, h: em2.h * 18 });
                    derivedZones.delete(code);   // 让下次 zoneFor 重新推导
                    gridLastMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
                } catch (err) { /* 忽略：保持回退槽 */ }
                gridPending.delete(code);
            };
            img.onerror = () => { gridPending.delete(code); };
            img.src = url;
        },

        /** 取占据网格；未就绪返回 null 并后台栅格化。 */
        inkGrid(code) {
            code = this.canon(code);
            const g = inkGrids.get(code);
            if (g) return g;
            this.requestGrid(code);
            return null;
        },
        /** 从 SVG 源提取 <rect id="zone1|zone2"> 的连字区声明（JSesh 的 Tier 1 权威数据）。 */
        parseSvgZones(svgText) {
            const out = {};
            const re = /<rect\b[^>]*id="(zone[12])"[^>]*>/g;
            let m;
            while ((m = re.exec(svgText))) {
                const tag = m[0];
                const num = (k) => { const mm = new RegExp(k + "=\"([-0-9.eE]+)\"").exec(tag); return mm ? parseFloat(mm[1]) : null; };
                const x = num("x"), y = num("y"), w = num("width"), h = num("height");
                if (x === null || y === null || w === null || h === null) continue;
                const lab = /gravity:([a-zA-Z]+)/.exec(tag);
                const g = lab ? lab[1] : "";
                const z = {
                    x: x / 18, y: y / 18, w: w / 18, h: h / 18,      // SVG 用户单位 18 = 1em
                    gh: g.indexOf("s") >= 0 ? "s" : (g.indexOf("e") >= 0 ? "e" : "c"),
                    gv: g.indexOf("t") >= 0 ? "t" : (g.indexOf("b") >= 0 ? "b" : "c"),
                    gravity: g
                };
                out[m[1] === "zone1" ? 0 : 1] = z;
            }
            return Object.keys(out).length ? out : null;
        },

        /** 字体墨迹栅格（New Gardiner）：仅首次计算并缓存；N 越大越准、越慢。 */
        fontGrid(code) {
            if (fontGrids.has(code)) return fontGrids.get(code);
            fontGrids.set(code, null);                        // 占位，避免重入
            const ch = charDecoder ? charDecoder(code) : code;  // 必须映射成字体字符，不能直接用码字面量
            if (!ch) return null;
            const N = 96;
            const cv = document.createElement("canvas");
            cv.width = N; cv.height = N;
            const ctx = cv.getContext("2d", { willReadFrequently: true });   // 多次 getImageData：按提示优化
            if (!ctx) return null;
            ctx.font = N + "px \"MdCRndr\", \"NewGardiner\", sans-serif";
            ctx.textBaseline = "alphabetic";
            // ① 先量墨迹 bbox（画一次，读像素，取边界）
            const asc = (ctx.measureText(ch).actualBoundingBoxAscent) || N * 0.8;
            const baseY = Math.min(N - 1, Math.max(asc, 1));
            ctx.fillStyle = "#000";
            ctx.fillText(ch, 0, baseY);
            let img = ctx.getImageData(0, 0, N, N).data;
            let minx = N, miny = N, maxx = -1, maxy = -1;
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    if (img[(r * N + c) * 4 + 3] > 128) {
                        if (c < minx) minx = c; if (c > maxx) maxx = c;
                        if (r < miny) miny = r; if (r > maxy) maxy = r;
                    }
                }
            }
            if (maxx < 0) return null;                        // 字体里没有该字形
            // ② 把墨迹 bbox 精确铺满画布（与 SVG 栅格"归一化到墨迹盒"同一口径），再取位图
            const bw = maxx - minx + 1, bh = maxy - miny + 1;
            ctx.save();
            ctx.clearRect(0, 0, N, N);
            ctx.setTransform(N / bw, 0, 0, N / bh, -minx * (N / bw), -miny * (N / bh));
            ctx.font = N + "px \"MdCRndr\", \"NewGardiner\", sans-serif";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(ch, 0, baseY);
            ctx.restore();
            img = ctx.getImageData(0, 0, N, N).data;
            const bits = new Uint32Array(N * N);
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    if (img[(r * N + c) * 4 + 3] > 128) bits[r * N + c] = 1;
                }
            }
            // 与 inkGrid 同口径：内部存"单位"（em × 18），deriveZones 用 sx=g.w/18 还原 em
            const g = { N: N, bits: bits, w: (bw / N) * 18, h: (bh / N) * 18 };
            fontGrids.set(code, g);
            return g;
        },

        /** 矢量命中测试的 DOM 缓存（等价 JSesh 的 Area 语义，不看描边）。 */
        fillProbe(code) {
            code = this.canon(code);
            if (fillCache.has(code)) return fillCache.get(code);
            const url = urls.get(code);
            if (!url || url.indexOf("data:") !== 0) return null;
            const txt = decodeURIComponent(url.slice(url.indexOf(",") + 1));
            const holder = document.createElement("div");
            holder.style.cssText = "position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden";
            holder.innerHTML = txt;
            document.body.appendChild(holder);
            const svg = holder.querySelector("svg");
            const rec = { holder: holder, svg: svg, vb: null, shapes: [] };
            if (svg) {
                const nums = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
                if (nums.length === 4) rec.vb = { x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
                rec.shapes = Array.prototype.slice.call(
                    svg.querySelectorAll("path,polygon")   /* JSesh：墨迹只来自 path 与 polygon */);
            }
            fillCache.set(code, rec);
            return rec;
        },

        /** 矩形（归一化，y 向上）是否与字形**填充区**相交；未知返回 null。 */
        fillBusy(code, x0, y0, x1, y1) {
            const rec = this.fillProbe(code);
            if (!rec || !rec.vb || !rec.svg) return null;
            const vb = rec.vb;
            const N = 20;
            for (let i = 0; i <= N; i++) {
                for (let j = 0; j <= N; j++) {
                    const x = x0 + (x1 - x0) * i / N;
                    const y = y0 + (y1 - y0) * j / N;
                    const pt = rec.svg.createSVGPoint();
                    pt.x = vb.x + x * vb.w;
                    pt.y = vb.y + (1 - y) * vb.h;
                    for (let k = 0; k < rec.shapes.length; k++) {
                        const el = rec.shapes[k];
                        try { if (el.isPointInFill && el.isPointInFill(pt)) return true; } catch (e) { }
                    }
                }
            }
            return false;
        },


        /** 诊断：栅格缓存统计（含最近一次耗时）。 */
        gridStats() { return { cached: inkGrids.size, pending: gridPending.size, lastMs: Math.round(gridLastMs * 100) / 100 }; },

        /** 网格区域是否被占据（坐标 0..1，y 自下而上）。 */
        _busy(g, x0, y0, x1, y1) {
            if (!g || !g.bits) return false;   // 栅格尚未就绪：视为空
            // 与 JSesh 的 Area.intersect 等价：完全落在字形包围盒之外 → 必然为空
            if (x1 <= 0 || x0 >= 1 || y1 <= 0 || y0 >= 1) return false;
            const W = g.N, H = g.M || g.N;
            const c0 = Math.max(0, Math.floor(x0 * W)), c1 = Math.min(W - 1, Math.ceil(x1 * W) - 1);
            const r0 = Math.max(0, Math.floor(y0 * H)), r1 = Math.min(H - 1, Math.ceil(y1 * H) - 1);
            if (c1 < c0 || r1 < r0) return false;
            for (let r = r0; r <= r1; r++) {
                const row = (H - 1 - r) * W;
                for (let c = c0; c <= c1; c++) {
                    const idx = row + c;
                    if (g.bits[idx >> 5] & (1 << (idx & 31))) return true;
                }
            }
            return false;
        },


        _paperReady: null,
        /** 懒初始化 paper.js；若页面已 setup 过则直接复用（重复 setup 会抛异常）。 */
        _ensurePaper() {
            if (this._paperReady !== null) return this._paperReady;
            try {
                if (typeof paper === "undefined") { this._paperReady = false; return false; }
                if (paper.project && paper.view) { this._paperReady = true; return true; }   // 已由页面初始化
                const cv = document.createElement("canvas");
                cv.width = 1; cv.height = 1;
                paper.setup(cv);
                this._paperReady = true;
            } catch (e) { this.__paperErr = (e && e.message) || String(e); this._paperReady = false; }
            return this._paperReady;
        },

        // ================= 精确推导：逐行照抄 JSesh LigatureZoneBuilder =================
        // 坐标系：em、y 向下、原点 = 墨迹左上（等价 ShapeChar.fixShape 之后的状态）
        _MARGIN_E: 1 / 18,      // 源码 MARGIN = 1 个字形单位；1em = 18 单位
        _MAXH_E: 1,             // 源码 MAXHEIGHT = 18 单位 = 1em

        /** 取字形的多边形（em，y 向下，原点=墨迹左上）。缓存。 */
        glyphGeoEm(code) {
            const key = this.canon(code);
            if (!this._geoCache) this._geoCache = new Map();
            if (this._geoCache.has(key)) return this._geoCache.get(key);
            this._geoCache.set(key, null);
            if (!this._ensurePaper()) return null;
            try {
                const url = urls.get(key);
                if (!url) { this.__geoWhy = "no-url"; return null; }
                const txt = decodeURIComponent(url.slice(url.indexOf(",") + 1));
                const vm = /viewBox=("|')([\s\S]*?)\1/.exec(txt);
                const vb = vm ? vm[2].split(/[\s,]+/).map(Number) : null;
                const m = metricsEm.get(key) || null;
                if (!vb || !m) { this.__geoWhy = "no-vb-or-metrics vb=" + !!vb + " m=" + !!m; return null; }
                const emUnits = vb[2] / m.w;                  // 1em = 多少原始单位（18 或 1800）
                if (!(emUnits > 0)) { this.__geoWhy = "bad-emUnits " + emUnits; return null; }
                const polys = [];
                const re = /<path\b[^>]*\bd=("|')([\s\S]*?)\1/g;
                let mm;
                while ((mm = re.exec(txt))) {
                    const subs = mm[2].split(/(?=[Mm])/).map(function (x) { return x.trim(); }).filter(Boolean);
                    for (const sub of subs) {
                        try {
                            const p = new paper.Path({ pathData: sub, insert: false });
                            if (!p || !p.segments || p.segments.length < 3) continue;
                            p.flatten(Math.max(0.05, 0.01 * emUnits));   // 0.01em 容差，避免点数爆炸（性能）
                            polys.push(p.segments.map(function (sg) {
                                return [sg.point.x / emUnits, sg.point.y / emUnits];
                            }));
                        } catch (e) { }
                    }
                }
                if (!polys.length) { this.__geoWhy = "no-polys"; return null; }
                let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
                polys.forEach(function (pts) {
                    pts.forEach(function (q) {
                        if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
                        if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
                    });
                });
                const W = x1 - x0, H = y1 - y0;
                if (!(W > 0) || !(H > 0)) return null;
                // fixShape：平移到墨迹左上
                const moved = polys.map(function (pts) {
                    return pts.map(function (q) { return [q[0] - x0, q[1] - y0]; });
                });
                const geo = { polys: moved, W: W, H: H };
                this._geoCache.set(key, geo);
                return geo;
            } catch (e) { this.__geoErr = (e && e.message) || String(e); return null; }
        },

        /** Area.intersect(signArea).isEmpty() 的等价判定：交集面积 > 0 才算被占据。 */
        _clash(geo, x0, y0, x1, y1) {
            // 性能保护：点数过多的字形退化为包围盒判定（宁可略粗，也不能卡死主线程）
            let __pts = 0;
            for (let i = 0; i < geo.polys.length; i++) __pts += geo.polys[i].length;
            if (__pts > 4000) {
                for (let i = 0; i < geo.polys.length; i++) {
                    const p = geo.polys[i];
                    let px0 = Infinity, py0 = Infinity, px1 = -Infinity, py1 = -Infinity;
                    for (let k = 0; k < p.length; k++) {
                        if (p[k][0] < px0) px0 = p[k][0]; if (p[k][0] > px1) px1 = p[k][0];
                        if (p[k][1] < py0) py0 = p[k][1]; if (p[k][1] > py1) py1 = p[k][1];
                    }
                    if (!(x1 < px0 || x0 > px1 || y1 < py0 || y0 > py1)) return true;
                }
                return false;
            }
            let total = 0;
            for (let k = 0; k < geo.polys.length; k++) {
                const R = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
                let out = geo.polys[k];
                for (let e = 0; e < 4 && out.length; e++) {
                    const a = R[e], b = R[(e + 1) % 4];
                    const side = function (q) { return (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); };
                    const nxt = [];
                    for (let i = 0; i < out.length; i++) {
                        const cur = out[i], prv = out[(i + out.length - 1) % out.length];
                        const ci = side(cur) >= 0, pi = side(prv) >= 0;
                        const ip = function (p1, q1) {
                            const dx = q1[0] - p1[0], dy = q1[1] - p1[1], ex = b[0] - a[0], ey = b[1] - a[1];
                            const den = dx * ey - dy * ex;
                            if (Math.abs(den) < 1e-12) return q1;
                            const tt = ((a[0] - p1[0]) * ey - (a[1] - p1[1]) * ex) / den;
                            return [p1[0] + dx * tt, p1[1] + dy * tt];
                        };
                        if (ci) { if (!pi) nxt.push(ip(prv, cur)); nxt.push(cur); }
                        else if (pi) nxt.push(ip(prv, cur));
                    }
                    out = nxt;
                }
                if (out && out.length >= 3) {
                    let s2 = 0;
                    for (let i = 0; i < out.length; i++) {
                        const a2 = out[i], b2 = out[(i + 1) % out.length];
                        s2 += a2[0] * b2[1] - b2[0] * a2[1];
                    }
                    total += s2 / 2;
                }
            }
            return Math.abs(total) > 1e-12;
        },

        /** findBestZonePosition：二分，返回 outerT（源码同名字段）。 */
        _findBestZone(geo, outer, inner, width, height) {
            const M = this._MARGIN_E;
            let innerT = 1, outerT = 0, guard = 0;
            while (Math.abs(innerT - outerT) > 0.01 && guard++ < 40) {
                const t = (innerT + outerT) / 2;
                const px = outer[0] + t * (inner[0] - outer[0]);
                const py = outer[1] + t * (inner[1] - outer[1]);
                let minx = px - M, miny = py - M;
                if (width < 0) minx += width;
                if (height < 0) miny += height;
                const busy = this._clash(geo, minx, miny,
                    minx + Math.abs(width) + 2 * M, miny + Math.abs(height) + 2 * M);
                if (busy) innerT = t; else outerT = t;
            }
            return outerT;
        },

        _posAt(outer, inner, t) {
            return [outer[0] + t * (inner[0] - outer[0]), outer[1] + t * (inner[1] - outer[1])];
        },

        /** 照抄 computeFirstArea / computeSecondArea / computeThirdArea。 */
        deriveZones(code) {
            code = this.canon(code);
            const geo = this.glyphGeoEm(code);
            if (!geo) {
                try { return this.deriveZonesRaster(code); } catch (e) { this.__rasterErr = (e && e.message) || String(e); return null; }
            }     // 无几何（如纸面未加载）退回栅格版
            const W = geo.W, H = geo.H;
            const out = {};

            // ---- computeFirstArea ----
            {
                let y = 0.5 * H;
                let height = H / 3, width = W / 2;
                const outer = [-width, y], inner = [0, y];
                let t = this._findBestZone(geo, outer, inner, width, height);
                if (t < 0.2) {
                    height = H / 4; width = W / 4;
                    t = this._findBestZone(geo, outer, inner, width, height);
                    if (t >= 0.1) {
                        const p = this._posAt(outer, inner, t);
                        out.zone1 = { x: p[0], y: p[1], w: width, h: height, gh: "e", gv: "c" };
                    }
                } else {
                    const p = this._posAt(outer, inner, t);
                    out.zone1 = { x: p[0], y: p[1], w: width, h: height, gh: "e", gv: "c" };
                }
            }

            // ---- computeSecondArea ----
            {
                let width = W / 2, height = H / 2.5;
                const outer = [W, 0], inner = [W / 2, 0];
                let t = this._findBestZone(geo, outer, inner, width, height);
                if (t < 0.2) {
                    height = H / 3;
                    t = this._findBestZone(geo, outer, inner, width, height);
                    if (t >= 0.1) {
                        const p = this._posAt(outer, inner, t);
                        out.zone2 = { x: p[0], y: p[1], w: width, h: height, gh: "s", gv: "t" };
                    }
                } else {
                    const p = this._posAt(outer, inner, t);
                    out.zone2 = { x: p[0], y: p[1], w: width, h: height, gh: "s", gv: "t" };
                }
            }

            // ---- computeThirdArea（源码：重试结果被无条件丢弃） ----
            {
                const outer = [W / 2, H], inner = [W, 0];
                let t = this._findBestZone(geo, outer, inner, -W, H);
                if (t > 0.2) {
                    const p = this._posAt(outer, inner, t);
                    out.zoneB = { x: 0, y: p[1], w: p[0], h: this._MAXH_E - p[1] + this._MARGIN_E, gh: "c", gv: "b" };
                } else {
                    outer[0] = 0;
                    t = this._findBestZone(geo, outer, inner, -W, H);
                    out.zoneB = null;      // 源码 line 75：zones[2] = null（重试白做）
                }
            }
            return out;
        },

        /** 推导 zone1（前置）/ zone2（后接）；风格沿用 glyphZones.js 的数据格式（em）。 */
        deriveZonesRaster(code) {
            if (!this.inkGrid(code) && !(typeof enabled !== "undefined" && !enabled)) {
                // 栅格未就绪：不推导（调用方会稍后重试）
            }
            const dbg = {};   // 诊断：各槽搜索的 t 值
            if (typeof globalThis !== "undefined") {
                const tr = globalThis.__zoneTrace || (globalThis.__zoneTrace = []);
                tr.push({ code: code, hasUrl: !!urls.get(code), probe: !!this.fillProbe(code),
                          vb: (function (p) { return p && p.vb ? [p.vb.x, p.vb.y, p.vb.w, p.vb.h] : null; })(this.fillProbe(code)),
                          shapes: (function (p) { return p ? p.shapes.length : 0; })(this.fillProbe(code)) });
            }
            // SVG 模式只用 SVG 栅格（避免与字体栅格混用导致数值不一致）；
            // 纯字体模式（enabled=false，无 SVG 来源）才退回字体栅格。
            const g = this.inkGrid(code) || (enabled ? null : this.fontGrid(code));
            const MARGIN = 1 / 18;
            // 判定"矩形是否压到字形"：位图粗筛（快） + 矢量复核（准，等价 Area.intersect）
            const busy = (x, y, w, h) => {
                const x0 = x, y0 = y, x1 = x + Math.abs(w), y1 = y + Math.abs(h);
                if (!this._busy(g, x0, y0, x1, y1)) return false;      // 粗筛：位图判空 → 空
                const exact = this.fillBusy(code, x0, y0, x1, y1);
                return (exact === null) ? this._busy(g, x0, y0, x1, y1) : exact;   // 矢量不可用 → 用位图结果
            };
            // 诊断：记录被判为"被占据"的最小格子（用于定位 t 上不去的具体原因）
            const blockCells = [];
            const busyRec = (x, y, w, h) => {
                const hit = this._busy(g, x, y, x + Math.abs(w), y + Math.abs(h));
                if (hit && blockCells.length < 8) {
                    const N2 = g.N;
                    const c = Math.min(N2 - 1, Math.max(0, Math.floor((x + Math.abs(w) / 2) * N2)));
                    const r = Math.min(N2 - 1, Math.max(0, Math.floor((y + Math.abs(h) / 2) * N2)));
                    blockCells.push({ x: +x.toFixed(2), y: +y.toFixed(2), w: +Math.abs(w).toFixed(2), h: +Math.abs(h).toFixed(2), c: c, r: r });
                }
                return hit;
            };
            // 沿 outer→inner 二分，返回"仍不重叠"的最大 t（照 findBestZonePosition）
            const bestT = (ox, oy, ix, iy, w, h) => {
                let innerT = 1, outerT = 0;
                while (Math.abs(innerT - outerT) > 0.01) {
                    const t = (innerT + outerT) / 2;
                    const px = ox + t * (ix - ox), py = oy + t * (iy - oy);
                    const x0 = (w < 0) ? px + w - MARGIN : px - MARGIN;
                    const y0 = (h < 0) ? py + h - MARGIN : py - MARGIN;
                    if (busyRec(x0, y0, Math.abs(w) + 2 * MARGIN, Math.abs(h) + 2 * MARGIN)) innerT = t;
                    else outerT = t;
                }
                return outerT;
            };
            const out = {};
            // ---- 槽 0：前置（左）----
            // 源码 computeFirstArea：w = W/2, h = H/3, y = H/2（y 向下 = 中间）
            //   outer = (-w, y) → inner = (0, y)；t < 0.2 时把矩形减半 (W/4 × H/4) 重试，t < 0.1 则放弃
            //   存盘：LigatureZone(p.x, p.y, w, h) —— 不含 MARGIN；重力 END + 默认 CENTER
            {
                const h0 = 1 / 3, w0 = 1 / 2, y0 = 0.5;
                let t = bestT(-w0, y0, 0, y0, w0, -h0); dbg.t1 = t;
                let w = w0, h = h0;
                if (t < 0.2) { w = 1 / 4; h = 1 / 4; t = bestT(-w, y0, 0, y0, w, -h); } dbg.t1b = t;
                if (t >= 0.1) {
                    const px = -w + t * w;                       // -w → 0
                    out.zone1 = { x: px, y: 0.5, w: w, h: h, gh: "e", gv: "c" };
                }
            }
            // ---- 槽 1：后接（右）----
            // 源码 computeSecondArea：w = W/2, h = H/2.5, y = 0（y 向下 = 顶边）
            //   outer = (W, 0) → inner = (W/2, 0)；t < 0.2 时 h 改 H/3 重试，t < 0.1 则放弃
            //   存盘：LigatureZone(p.x, p.y, w, h) —— 不含 MARGIN；重力 START + TOP
            {
                const w1 = 1 / 2;
                let h = 1 / 2.5;
                let t = bestT(1, 1, 0.5, 1, w1, -h); dbg.t2 = t;      // y 向上：顶边 = 1
                if (t < 0.2) { h = 1 / 3; t = bestT(1, 1, 0.5, 1, w1, -h); }
                dbg.t2b = t;
                if (t >= 0.1) {
                    const px = 1 + t * (0.5 - 1);                 // W → W/2
                    out.zone2 = { x: px, y: 0, w: w1, h: h, gh: "s", gv: "t" };
                }
            }
            // ---- 槽 2：底部（computeThirdArea，y 向下）----
            //   outer = 底边中点 (0.5, 1) → inner = 右上角 (1, 0)（Y 向下：0=顶边）
            //   矩形 x∈[p.X-1, p.X]、y∈[p.Y, p.Y+1]（向下延伸）
            //   失败则 outer.x 改 0 重试；t 必须 > 0.2
            //   注意：_busy 使用 y 向上，故此处 y 取 (1 - Y向下)，高度取负表示向下延伸
            {
                let t = bestT(0.5, 0, 1, 1, -1, -1);
                dbg.tB1 = t;
                // ⚠ 严格照抄源码（LigatureZoneBuilder.computeThirdArea）：
                //   第一条对角线 t <= 0.2 时，即使 outer.x=0 重试成功，
                //   源码最后仍无条件执行 zones[2] = null —— 重试结果被丢弃。
                dbg.tB2 = (t <= 0.2) ? bestT(0, 0, 1, 1, -1, -1) : t;
                if (t <= 0.2) t = 0;                    // 丢弃重试结果（源码行为）
                if (t > 0.2) {
                    const pX = 0.5 + t * 0.5;           // 0.5 → 1
                    const pYdown = 1 - t;               // 顶边起算（y 向下）
                    const hUnits = 18 - pYdown * 18 + 1;   // 源码：MAXHEIGHT - p.y + 1
                    out.zoneB = { x: 0, y: pYdown, w: pX,
                                  h: hUnits / 18, gh: "c", gv: "b" };
                }
            }
out.__debug = dbg; dbg.blocks = blockCells.slice(0, 4);
            // 归一化坐标（0..1 相对墨迹 bbox）→ em（渲染端与显式数据同一口径）
            {
                const sx = (g.w || 18) / 18, sy = (g.h || 18) / 18;
                ["zone1", "zone2", "zoneB"].forEach(function (k) {
                    const z = out[k];
                    if (!z) return;
                    z.x *= sx; z.w *= sx; z.y *= sy; z.h *= sy;
                });
            }
            return (out.zone1 || out.zone2 || out.zoneB) ? out : null;
        },

        /** 判定 em 坐标矩形（x 相对字形左缘，y 自底向上）是否与字形墨迹重叠。 */
        overlapsInk(code, xEm, yEm, wEm, hEm) {
            const grid = this.inkGrid(code);
            if (!grid) return false;
            const emW = grid.w / 18, emH = grid.h / 18;
            const x0 = xEm / emW, x1 = (xEm + wEm) / emW;
            const y0 = yEm / emH, y1 = (yEm + hEm) / emH;
            return this._busy(grid, x0, y0, x1, y1);
        },

        /** 连字区：优先显式数据（Tier 1），否则按墨迹网格推导（Tier 2）。 */
        /** 切换 zoneB 的 y 轴约定（用于与 JSesh 对照实测）。 */
        setZoneBVariant(v) { ZONE_B_VARIANT = (v === "A") ? "A" : "B"; derivedZones.clear(); return this; },

        zoneFor(code) {
            code = this.canon(code);
            // ① SVG 内 <rect id="zone1|zone2"> 是 JSesh 的权威声明（Tier 1）
            const svgZ = svgZones.get(code);
            if (svgZ) return { zone1: svgZ[0] || null, zone2: svgZ[1] || null, zoneB: null };
            // ② 没有声明才按墨迹推导（三槽）
            if (!derivedZones.has(code)) {
                let zc = null;
                try { zc = this.deriveZones(code); } catch (e) { zc = null; }   // 推导失败绝不打断渲染
                derivedZones.set(code, zc);
            }
            const d = derivedZones.get(code);
            if (!d) return null;
            return { zone1: d.zone1 || null, zone2: d.zone2 || null, zoneB: d.zoneB || null };
        },
        /** 重开一次渲染的推导预算（每次 renderText 前调用）。 */
        beginZoneBudget(n) { fontZoneBudget = (typeof n === "number" && n > 0) ? n : 8; },

        /** 字体模式的连字区：只在真正需要排版连字时调用，带缓存与预算上限。 */
        zoneForFont(code) {
            const key = this.canon ? this.canon(code) : code;
            if (derivedZones.has(key)) return derivedZones.get(key);
            if (fontZoneBudget <= 0) return null;         // 预算用尽 → 降级为并排
            fontZoneBudget--;
            let z = null;
            try { z = this.deriveZones(key); } catch (e) { z = null; }
            derivedZones.set(key, z);
            return z;
        },


        /** 诊断快照。 */
        debug() {
            return {
                jar: jarFile ? jarFile.name : null,
                dir: dirHandle ? dirHandle.name : null,
                indexSize: index.size,
                siteDir: siteDir,
                dirSize: dirEntries.size,
                urls: urls.size,
                busy: busy.size,
                enabled: enabled,
                engine: !!engine,
                build: BUILD,
                error: lastError || null,
            };
        },
    };

    global.Glyphs = api;
})(typeof window !== "undefined" ? window : globalThis);
