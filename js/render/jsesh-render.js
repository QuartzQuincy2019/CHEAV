// jsesh-render.js —— 用 jsesh-js（JSesh 官方 TypeScript 移植）渲染 MdC
//
// 目的：CHEAV 原来由内置 MdCRndr.js 排版/绘制；本适配层把「正文渲染区」和
// 「IB 实时预览」交给 jsesh-js，使排版与 JSesh 桌面版一致。
//
// 用法（apply.js）：
//     await JseshRender.svgFor(mdc, cadratHeight);            // 返回 <svg> 字符串
//     await JseshRender.render(container, mdc, cadratHeight); // 直接写入容器
//   cadratHeight = 一个 quadrat 的像素高（CHEAV 的 SIZE = 100 → 与 MdCRndr 同尺度）
//
// 说明：
//   * 码位写法以 jsesh / JSesh 的数据表为准：CHEAV 的 AA1 → Aa1、
//     M17a → M17A、Y1a → Y1v 等（见 fixCode；启动时读 glyph-index.json 校验）。
//   * `!` 换行、`$` 红色、`#` 阴影、`\` 镜像与 jsesh 一致，适配层不改写；
//   * %insert / %hkern / %vkern 未实现，supports()=false 时由调用方回退 MdCRndr；
//   * 字形数据在 ./lib/jsesh/data/（随仓库分发，GitHub Pages 直接可用）。
(function () {
    "use strict";

    // 注意：经典脚本里的动态 import() 以**脚本自身 URL**为基准解析相对路径，
    // 必须显式基于 document.baseURI 生成绝对地址，否则会去请求
    // js/render/lib/jsesh/jsesh.js。
    const MODULE_URL = new URL("lib/jsesh/jsesh.js", document.baseURI).href;
    const GLYPHS_URL = new URL("lib/jsesh/data/", document.baseURI).href;
    const INDEX_URL = new URL("glyph-index.json", GLYPHS_URL).href;

    let mod = null;
    let ready = false;
    let loading = null;
    let lastError = null;
    let avail = null;             // Set of codes present in jsesh's glyph data
    let provider = null;          // jsesh glyph provider (single-glyph fast path)
    let providerLoading = null;
    const glyphCache = new Map(); // "code@cadratHeight" → <svg> string

    // jsesh 数据里没有的少数写法：按 JSesh 的正式码修正
    const SPECIAL = {
        "Y1a": "Y1v",
        "Y1A": "Y1v",
    };

    /** 把一个码修正为 jsesh 数据里存在的形式（存在则原样返回）。 */
    function fixCode(code) {
        if (!avail) {
            // 字形索引还没就绪：只做无风险的静态修正
            if (SPECIAL[code]) return SPECIAL[code];
            if (/^AA\d/.test(code)) return "Aa" + code.slice(2);
            return code;
        }
        if (avail.has(code)) return code;
        const cands = [];
        if (SPECIAL[code]) cands.push(SPECIAL[code]);
        if (/^AA\d/.test(code)) cands.push("Aa" + code.slice(2));
        const m = code.match(/^([A-Z][A-Za-z]?\d+)([a-z])$/);   // M17a → M17A
        if (m) cands.push(m[1] + m[2].toUpperCase());
        const m2 = code.match(/^([A-Z][A-Za-z]?\d+)([A-Z])$/);  // 反向：X1A → X1a
        if (m2) cands.push(m2[1] + m2[2].toLowerCase());
        for (let i = 0; i < cands.length; i++) {
            if (avail.has(cands[i])) return cands[i];
        }
        return code;               // 数据里确实没有：交给 jsesh 画红字提示
    }

    // CHEAV 文本 → jsesh 文本：只改码位写法，不动标点。
    // `+文本+s` 片段内的内容不参与替换（可能是普通文字）。
    function normalize(mdc) {
        const parts = String(mdc).split(/(\+[^+]{0,160}\+[a-zA-Z])/g);
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) continue;                     // 保护文本块
            parts[i] = parts[i].replace(/[A-Z][A-Za-z]?\d+[A-Za-z]?/g, fixCode);
        }
        return parts.join("");
    }

    /** 单字形快速通道：只取该码的路径，不跑整篇 MdC 的排版引擎。 */
    function glyphProvider() {
        if (!providerLoading) {
            providerLoading = mod.loadGlyphProvider(GLYPHS_URL).then(function (p) {
                provider = p;
                return p;
            }).catch(function () {
                providerLoading = null;
                return null;
            });
        }
        return providerLoading;
    }

    /**
     * 直接输出一个码的 <svg>（候选格缩略图用）。
     * 与 renderMdc 相比跳过了文档排版/字体加载，实测 7 个码约 10 ms。
     * 字形不存在时返回 null，由调用方回退到完整渲染。
     */
    async function glyphSvg(code, cadratHeight) {
        await init();
        if (!ready) throw new Error("jsesh-js unavailable");
        const c = fixCode(String(code).trim());
        if (avail && !avail.has(c)) return null;
        const size = cadratHeight || 26;
        const key = c + "@" + size;
        if (glyphCache.has(key)) return glyphCache.get(key);
        const p = await glyphProvider();
        if (!p) return null;
        await p.loadShapes([c]);
        const sh = p.shape(c);
        const sz = p.size(c);
        if (!sh || !sh.d || !sz || !sz.width) return null;
        const k = size / 18;                      // 1 quadrat = 18 units
        const w = (sz.width * k).toFixed(2);
        const h = (sz.height * k).toFixed(2);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + sz.width + ' ' + sz.height +
            '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
            '<path d="' + sh.d + '" fill="#000000"/></svg>';
        glyphCache.set(key, svg);
        return svg;
    }

    // jsesh-js 已实现 `&` 连字（Ligature 节点 + 字形自带 ligature zone）与
    // 王名圈/塞拉赫/HWT/堡垒框（`<-`、`<S-`、`<h-`、`<F-`、`<g-`）。
    // 未实现的只有 %insert（源码显式 throw）与 %hkern / %vkern。
    function supports(mdc) {
        return !/%insert|%hkern|%vkern/.test(String(mdc));
    }

    function init() {
        if (loading) return loading;
        loading = (async function () {
            try {
                mod = await import(MODULE_URL);
                mod.configureJSesh({ glyphsUrl: GLYPHS_URL });
                // 读取字形索引，用于把 CHEAV 的码位写法映射到 jsesh 的写法
                try {
                    const res = await fetch(INDEX_URL);
                    if (res.ok) {
                        const idx = await res.json();
                        if (idx && idx.glyphs) avail = new Set(Object.keys(idx.glyphs));
                    }
                } catch (e) { /* 索引拿不到：fixCode 退化为静态规则 */ }
                ready = true;
                // 预热单字形通道（候选格缩略图用），避免第一次输入时等索引
                glyphProvider();
            } catch (e) {
                lastError = String(e && e.message || e);
                console.warn("[JseshRender] jsesh-js 初始化失败，将回退 MdCRndr：", e);
            }
        })();
        return loading;
    }

    // 只取 SVG 源码（供调用方做过期检查后自行写入容器）。
    // opts.vertical = true → 竖排（jsesh 的 style.options.textOrientation = VERTICAL）
    async function svgFor(mdc, cadratHeight, opts) {
        await init();
        if (!ready) throw new Error("jsesh-js unavailable");
        const options = { cadratHeight: cadratHeight };
        if (opts && opts.vertical) options.style = { options: { textOrientation: "VERTICAL" } };
        try {
            const svg = await mod.renderMdc(normalize(mdc), options);
            // jsesh-js 对不认识的语法不抛异常，而是把 "Error in file: …" **逐字符**
            // 画成一堆 <text>，字与字之间连空格都没有（"Errorinfile:unexpected…"）。
            // 判断时去掉标签与所有空白，再匹配压缩后的串。
            const squashed = svg.replace(/<[^>]*>/g, "").replace(/\s+/g, "");
            if (/errorinfile/i.test(squashed)) {
                const m = squashed.match(/line(\d+)char(\d+)attoken/i);
                const msg = "jsesh 无法解析该 MdC 串" +
                    (m ? "（第 " + m[1] + " 行第 " + m[2] + " 个字符附近）" : "");
                lastError = msg;
                throw new Error(msg);
            }
            return svg;
        } catch (e) {
            lastError = String(e && e.message || e);
            throw e;
        }
    }

    // 渲染到容器；失败抛异常，由调用方回退。
    async function render(container, mdc, cadratHeight) {
        const svg = await svgFor(mdc, cadratHeight);
        container.innerHTML = svg;
        const el = container.querySelector("svg");
        if (el) {
            el.style.display = "block";
            el.style.maxWidth = "100%";
            el.style.height = "auto";
        }
        return el;
    }

    window.JseshRender = {
        init: init,
        render: render,
        svgFor: svgFor,
        supports: supports,
        glyphSvg: glyphSvg,
        normalize: normalize,
        fixCode: fixCode,
        get ready() { return ready; },
        get lastError() { return lastError; },
    };
})();
