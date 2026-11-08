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
    const BUILD = "glyphs-202611081706";
    const DB_NAME = "CHEAV_FS";
    const STORE = "files";
    const KEY = "jseshGlyphs";

    let jarFile = null;              // jar 文件
    let index = new Map();           // "jseshGlyphs/A1.svg" → { method, csize, size, off }
    let dirHandle = null;            // 或：已解压目录
    let dirEntries = new Map();      // code → FileSystemFileHandle
    const urls = new Map();          // code → objectURL | null
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
            const bb = el.getBBox();
            if (bb && bb.width > 0 && bb.height > 0) return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
        } catch (e) { /* 忽略 */ } finally {
            if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
        }
        return null;
    }

    /** 写入（或替换）viewBox。 */
    function setViewBox(svgText, vb) {
        if (/\bviewBox\s*=\s*["'][^"']*["']/.test(svgText)) {
            return svgText.replace(/(<svg\b[^>]*?)\bviewBox\s*=\s*["'][^"']*["']/, '$1viewBox="' + vb + '"');
        }
        return svgText.replace(/<svg\b/, '<svg viewBox="' + vb + '"');
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
            let svgText = stripGuides(fixSvgNs(raw));
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
        box(code) { return boxesEm.has(code) ? boxesEm.get(code) : null; },

        /** 某个码的 JSesh 自有度量（单位 em）；未知返回 null。 */
        metrics(code) { return metricsEm.has(code) ? metricsEm.get(code) : null; },

        /** 某个码的宽高比（宽/高）；未知返回 null。 */
        aspect(code) { return aspects.has(code) ? aspects.get(code) : null; },

        /** 是否已尝试过（无论成功或失败）——用于避免反复重试。 */
        tried(code) { return urls.has(code); },

        /** 同步查询某个码的 URL（未就绪返回 null，无副作用）。 */
        urlFor(code) {
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
