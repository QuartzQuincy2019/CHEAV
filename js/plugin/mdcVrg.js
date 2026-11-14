/**
 * MdCRndr VRG（垂直渲染组）模块（模块化第 5 步）
 *
 * 两组实现并存：
 *   · flow  模式（默认）：renderVRG —— 词典式观感，整组压进 1em 见方，只缩不放；
 *   · jsesh 模式：layoutQuadratAbs —— 显式几何，照 QuadratLayout 从顶到底分布。
 *
 * 跨模块依赖全部走 MDC.host / MDC：
 *   MDC.getMetrics / MDC.ligatureWidth   —— mdcGlyphCore.js / mdcMetrics.js
 *   MDC.host.px                          —— MdCRndr 注入
 *   MDC.host.quadratMode()               —— 当前四开组模式（"flow" | "jsesh"）
 *   MDC.host.encDepth()                  —— 王名圈嵌套深度（>0 时符号上下居中）
 *   MDC.host.render / renderEnclosure / renderLigature / makeUnsupported —— 由 MdCRndr 提供
 *   MDC.host.options                     —— vrgItemGap / vrgLayerGap / textScale
 */
(function () {
    "use strict";
    const MDC = (typeof window !== "undefined" && window.MDC) ? window.MDC : {};

    const EM_SQUARE = MDC.EM_SQUARE || 1000;

    function getMetrics(code) { return MDC.getMetrics ? MDC.getMetrics(code) : { width: EM_SQUARE, height: EM_SQUARE }; }
    function ligatureWidth(name) { return MDC.ligatureWidth ? MDC.ligatureWidth(name) : EM_SQUARE; }
    function layerMetrics(line) { return MDC.layerMetrics ? MDC.layerMetrics(line) : { h: EM_SQUARE, w: EM_SQUARE }; }
    function px(v) { return MDC.host ? MDC.host.px(v) : v; }
    function quadratMode() { return (MDC.host && MDC.host.quadratMode) ? MDC.host.quadratMode() : "flow"; }
    function opt(name, dflt) {
        const o = (MDC.host && MDC.host.options) || {};
        return (typeof o[name] === "number") ? o[name] : dflt;
    }
    // 与 MdCRndr 中的同名函数保持一致（取自同一 options 表）
    function vrgLayerGap() { return opt("vrgLayerGap", 0.05) * EM_SQUARE; }
    function vrgItemGap() { return opt("vrgItemGap", 0.125) * EM_SQUARE; }

    /**
     * 显式几何布局（JSesh MDCView / QuadratLayout 语义）
     *   · 每层自然高 h_i、层间 gap = 0.111em（smallSkip = 2/18）
     *   · 总高超过 1em 时整组只缩一次 s = 1em / totalNat
     *   · 组宽 = 最宽层 × s；单元素层居中，多元素层 space-between
     *   · 层内元素底部对齐；子 cadrat 递归且沿用父级 s（不二次缩放）
     */
    function measureUnitEm(u) {
        if (!u) return { w: 0.3, h: 0.3 };
        if (u.type === "vrg" && u.layers && u.layers.length > 1) {
            const gap = 0.111;
            let wMax = 0, hSum = 0;
            for (const row of u.layers) {
                let w = 0, h = 0.15;
                for (const x of row) { const m = measureUnitEm(x); w += m.w; h = Math.max(h, m.h); }
                wMax = Math.max(wMax, w); hSum += h;
            }
            hSum += gap * (u.layers.length - 1);
            return { w: Math.max(wMax, 0.05), h: Math.max(hSum, 0.05) };
        }
        if (u.type === "char") {
            const am = getMetrics(u.code);
            return { w: Math.max(am.width, 1) / EM_SQUARE, h: Math.max(am.height, 1) / EM_SQUARE };
        }
        if (u.type === "lig") return { w: Math.max(ligatureWidth(u.name), 1) / EM_SQUARE, h: 1 };
        if (u.type === "text") return { w: 0.24 * (u.text || "").length, h: 0.4 };
        return { w: 0.6, h: 1 };
    }

    function layoutQuadratAbs(layers, fontSize, targetHpx) {
        // 严格照 JSesh：QuadratLayout + MDCView.distributeFromTopToBottom
        //   · 层高 h_i = 该层字形墨迹高（不拉伸字）
        //   · 总高不足目标高时，差额均分为 interSpace（不放大判定）
        //   · 超出目标高时整组只缩一次（reScale）
        //   · 组宽 = 最宽层；单元素居中，多元素均分间隙
        const gapEm = 0.111;
        const rows = layers.map((row) => row.map((u) => ({ u, m: measureUnitEm(u) })));
        const n = rows.length;
        const hNat = rows.map((r) => Math.max(0.15, ...r.map((x) => x.m.h)));
        const wNat = rows.map((r) => r.reduce((a, x) => a + x.m.w, 0));
        const totalNatEm = hNat.reduce((a, b) => a + b, 0) + gapEm * (n - 1);
        const targetEm = ((typeof targetHpx === "number" && targetHpx > 0) ? targetHpx : fontSize) / fontSize;
        const s = Math.min(1, targetEm / totalNatEm);          // 只缩不放
        const Hpx = Math.max(targetEm * fontSize, totalNatEm * s * fontSize);
        const sumRowsPx = hNat.reduce((a, b) => a + b, 0) * s * fontSize;
        const interPx = (n > 1) ? Math.max(0, (Hpx - sumRowsPx) / (n - 1)) : 0;
        const Wpx = Math.max(Math.max(...wNat) * s * fontSize, 1);
        const box = document.createElement("span");
        box.className = "vrg";
        box.style.cssText = "position:relative;display:inline-block;vertical-align:bottom;" +
            "width:" + px(Wpx) + "px;height:" + px(Hpx) + "px;";
        let y = 0;
        for (let ri = 0; ri < n; ri++) {
            const items = rows[ri];
            const hPx = hNat[ri] * s * fontSize + 1;
            const rowWpx = wNat[ri] * s * fontSize;
            const interW = items.length > 1 ? Math.max(0, (Wpx - rowWpx) / (items.length - 1)) : 0;
            let x = items.length === 1 ? (Wpx - rowWpx) / 2 : 0;
            for (let k = 0; k < items.length; k++) {
                placeAbs(box, items[k].u, x, y, hPx, items[k].m, s, fontSize);
                x += items[k].m.w * s * fontSize + interW;
            }
            y += hPx + interPx;
        }
        return box;
    }

    /** 在组内放置一个单位：底部对齐到本行底线；子组按行高重新分布（照型）。 */
    function placeAbs(box, u, x, yTop, rowH, m, s, fontSize) {
        const isGroup = (u.type === "vrg" && u.layers && u.layers.length > 1);
        const wPx = m.w * s * fontSize;
        const holder = document.createElement("span");
        holder.style.cssText = "position:absolute;left:" + px(x) + "px;top:" + px(yTop) +
            "px;width:" + px(wPx) + "px;height:" + px(rowH) + "px;overflow:visible;";
        if (isGroup) {
            const sub = layoutQuadratAbs(u.layers, fontSize, rowH);   // 填满本行高度
            sub.style.position = "absolute";
            sub.style.left = "0";
            sub.style.bottom = "0";
            holder.appendChild(sub);
        } else {
            const g = document.createElement("span");
            g.style.cssText = "position:absolute;left:0;bottom:0;line-height:1;";
            MDC.host.render(g, u, fontSize * s);
            holder.appendChild(g);
        }
        box.appendChild(holder);
    }

    function renderVRG(parent, layers, fontSize) {
        if (typeof globalThis !== "undefined") {
            const qc = globalThis.__quadratCalls || (globalThis.__quadratCalls = { flow: 0, jsesh: 0, abs: 0 });
            qc[quadratMode()] = (qc[quadratMode()] || 0) + 1;
        }
        if (quadratMode() === "jsesh") {
            parent.appendChild(layoutQuadratAbs(layers, fontSize, fontSize));
            return;
        }
        const scale = fontSize / EM_SQUARE;
        const N = layers.length;

        // 每层的最大墨迹高度与宽度（含元素间间隔）
        const metrics = layers.map(layerMetrics);

        // 词典式缩放（Faulkner 观感）：符号保持原比例，不放大。
        // 层与层之间保留微小间隔（VRG_LAYER_GAP）；
        // 整体统一缩放系数 s = min(1, 1em/总墨迹高, 1em/最大层宽)，
        // 仅在堆叠组超出 1em 方块时才等比缩小。
        const totalH = metrics.reduce((sum, m) => sum + m.h, 0) + vrgLayerGap() * (N - 1);
        const maxW = Math.max(...metrics.map(m => m.w));
        const s = Math.min(1, EM_SQUARE / totalH, EM_SQUARE / maxW);

        const box = document.createElement("span");
        box.className = "vrg";
        // 组宽 = 最大层宽 × 统一缩放
        const boxW = maxW * s * scale;
        box.style.width = px(boxW) + "px";
        box.style.height = fontSize + "px";
        {
            // 行内嵌排：inline-flex 的基线取**首层**基线，若直接对齐正文基线，
            // 整盒会有 (盒高 − 首层高) 沉到基线以下。此处按该差值上移，
            // 使盒底（= 末层基线）正好落在正文基线上——与普通字符一致。
            // 在 flex 排版（渲染区）中 vertical-align 被忽略，故不影响块级排版。
            box.style.verticalAlign = px(fontSize - metrics[0].h * s * scale) + "px";
        }

        for (let i = 0; i < N; i++) {
            const glyphSize = fontSize * s;                    // 层内单位字号（统一等比缩放）
            const layerH = metrics[i].h * s * scale;           // 层高 = 缩放后的墨迹高度
            const layer = document.createElement("span");
            layer.className = "vrg-layer";
            layer.style.height = px(layerH) + "px";

            // 水平对齐：
            //   多元素层：所有元素两端对齐（space-between）。
            //   单符号层：在该层内左右居中（不与其他层交替左右分布，避免对角错开）。
            layer.style.justifyContent = layers[i].length > 1 ? "space-between" : "center";

            // 层内元素：字符（贴层底）或嵌套 VRG（递归渲染并缩放到层内字号）
            for (const u of layers[i]) renderLayerUnit(layer, u, glyphSize);
            box.appendChild(layer);
        }

        parent.appendChild(box);
        return box;
    }

    /**
     * 渲染层内元素：字符或嵌套 VRG（递归）。
     */
    function renderLayerUnit(layer, u, glyphSize) {
        if (u.type === "char") {
            MDC.renderGlyph(layer, u.code, glyphSize, MDC.host.encDepth() > 0 ? "center" : undefined, u.mirror);
        } else if (u.type === "vrg") {
            if (u.layers.length === 1) {
                // 单层 VRG 视为一般字符：层内元素直接按序列渲染
                for (const x of u.layers[0]) renderLayerUnit(layer, x, glyphSize);
            } else {
                renderVRG(layer, u.layers, glyphSize);
            }
        } else if (u.type === "enc") {
            MDC.host.renderEnclosure(layer, u, glyphSize, false);        // 组内包围框：横排朝向
        } else if (u.type === "lig") {
            MDC.host.renderLigature(layer, u.name, glyphSize);
        } else if (u.type === "text") {
            // 层内文本：字号随层内基准字号（glyphSize）等比，写成绝对 px
            const txt = document.createElement("span");
            txt.className = "txt";
            txt.textContent = u.text;
            txt.style.fontSize = px(opt("textScale", 0.4) * glyphSize) + "px";
            layer.appendChild(txt);
        } else if (u.type === "unsup") {
            // 层内占位框：随层内基准字号缩放
            layer.appendChild(MDC.host.makeUnsupported(u.code, glyphSize, u.mirror));
        } else if (u.type === "seq") {
            for (const x of u.units) renderLayerUnit(layer, x, glyphSize);
        }
    }

    MDC.measureUnitEm = measureUnitEm;
    MDC.layoutQuadratAbs = layoutQuadratAbs;
    MDC.renderVRG = renderVRG;
    MDC.renderLayerUnit = renderLayerUnit;
})();
