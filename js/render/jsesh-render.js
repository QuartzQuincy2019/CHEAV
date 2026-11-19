// jsesh-render.js —— 用 jsesh-js（JSesh 官方 TypeScript 移植）渲染 MdC
//
// 目的：CHEAV 原来由内置 MdCRndr.js 排版/绘制；本适配层把「正文渲染区」和
// 「IB 实时预览」交给 jsesh-js，使排版与 JSesh 桌面版一致。
//
// 用法（apply.js）：
//     await JseshRender.render(container, mdc, cadratHeight);
//   cadratHeight = 一个 quadrat 的像素高（CHEAV 的 SIZE = 100 → 与 MdCRndr 同尺度）
//
// 说明：
//   * jsesh-js 不认识 CHEAV 的规范码 AA1（会画成红色码文本），这里统一换成 Aa1；
//   * jsesh-js 0.2.0 尚未实现本站的连字构造 `{name}`、`&` 插入与 %insert/%hkern/%vkern，
//     这类输入返回 supports()=false，由调用方回退 MdCRndr；
//   * 字形数据在 ./lib/jsesh/data/（本地为指向 jsesh-web 包的目录联接，不入库）。
(function () {
    "use strict";

    // 注意：经典脚本里的动态 import() 以**脚本自身 URL**为基准解析相对路径，
    // 必须显式基于 document.baseURI 生成绝对地址，否则会去请求
    // js/render/lib/jsesh/jsesh.js。
    const MODULE_URL = new URL("lib/jsesh/jsesh.js", document.baseURI).href;
    const GLYPHS_URL = new URL("lib/jsesh/data/", document.baseURI).href;

    let mod = null;
    let ready = false;
    let loading = null;
    let lastError = null;

    // CHEAV 方言 → jsesh 方言：只差码位前缀 AA→Aa（AA1→Aa1、AA30→Aa30…）。
    // 换行统一为 `!`、红色统一为 `$`、阴影 `#`、镜像 `\\`，都与 jsesh / JSesh 一致，
    // 适配层不再改写这些标记。
    function normalize(mdc) {
        return String(mdc).replace(/(^|[^A-Za-z0-9])AA(\d+[A-Za-z]?)/g, function (_m, pre, rest) {
            return pre + "Aa" + rest;
        });
    }

    // jsesh-js 已实现 `&` 连字（解析为 Ligature 节点，按字形自带的 ligature zone 摆放）
    // 与王名圈/塞拉赫/HWT/堡垒框（`<-`、`<S-`、`<h-`、`<F-`、`<g-`）。
    // 未实现的只有 %insert（源码显式 throw "@insert is not supported yet"）与 %hkern / %vkern。
    // `{连字名}` 是 CHEAV 旧语法（已废除）：不再预先拦截，交给下面的 "Error in file" 检测回退。
    function supports(mdc) {
        return !/%insert|%hkern|%vkern/.test(String(mdc));
    }

    function init() {
        if (loading) return loading;
        loading = (async function () {
            try {
                mod = await import(MODULE_URL);
                mod.configureJSesh({ glyphsUrl: GLYPHS_URL });
                ready = true;
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
            // jsesh-js 对不认识的语法不抛异常，而是画一行红/黑字 "Error in file: …"。
            // 这种输出必须当作失败，交给 MdCRndr 回退（例如旧版 {连字名} 文本）。
            if (/Error in file/i.test(svg)) throw new Error("jsesh parse error");
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
        normalize: normalize,
        get ready() { return ready; },
        get lastError() { return lastError; },
        get failed() { return !ready && !!loading && !loading.__pending; },
    };
})();
