/**
 * MdCRndr 度量模块（模块化第 4 步）
 * 只做"宽度/高度计算"，不碰 DOM：
 *   · ligatureWidth(name)  连字墨迹宽度（unit，相对 1em）
 *   · unitMetrics(u)       渲染单位度量：char / vrg / lig / seq / enc / text / newline / unsup
 *   · layerMetrics(line)   VRG 单层度量（宽 = 元素宽之和 + 层内间隔）
 *   · vrgBoxWidth(layers)  嵌套 VRG 组宽（词典式缩放：只缩不放）
 *
 * 依赖通过共享表取得，避免跨文件引用 IIFE 内部变量：
 *   MDC.getMetrics(code)      —— 由 mdcGlyphCore.js 提供
 *   MDC.host.getLigature(n)   —— 由 MdCRndr.js 注入（LIGATURES 表）
 *   MDC.host.options          —— 由 MdCRndr.js 注入（vrgItemGap / vrgLayerGap 等）
 */
(function () {
    "use strict";
    const MDC = (typeof window !== "undefined" && window.MDC) ? window.MDC : {};

    const EM_SQUARE = MDC.EM_SQUARE || 1000;
    const ENC_PAD = 0.12;               // 包围框内边距（em 比例），与 MdCRndr 中的 ENC_PAD 一致

    function getMetrics(code) { return MDC.getMetrics ? MDC.getMetrics(code) : { width: EM_SQUARE, height: EM_SQUARE }; }
    function ligatureOf(name) { return (MDC.host && MDC.host.getLigature) ? MDC.host.getLigature(name) : null; }
    function opt(name, dflt) {
        const o = (MDC.host && MDC.host.options) || {};
        return (typeof o[name] === "number") ? o[name] : dflt;
    }
    function vrgItemGap() { return opt("vrgItemGap", 0.125) * EM_SQUARE; }
    function vrgLayerGap() { return opt("vrgLayerGap", 0.05) * EM_SQUARE; }

    /**
     * 连字的墨迹宽度（unit，相对 1em）：各部件右端 = dx + scale × 部件墨迹宽，取最大值。
     * 连字盒宽取此值而非固定 1em——否则当基准部件较窄（如 G43 仅 0.675em）时，
     * 连字右侧会留下与后续字形之间的空档。
     */
    function ligatureWidth(name) {
        const lig = ligatureOf(name);   // 名字大小写不敏感
        if (!lig) return EM_SQUARE;
        let w = 0;
        for (const p of lig.parts) {
            const m = getMetrics(p.code);
            w = Math.max(w, (p.dx || 0) * EM_SQUARE + (p.scale || 1) * m.width);
        }
        return Math.max(w, 1);
    }

    /**
     * 计算渲染单位的度量（unit，相对 EM_SQUARE = 1000）。
     * 支持 char（单字符）、vrg（嵌套堆叠组，整体占 1em 方块）、seq（序列，宽为元素宽之和）。
     */
    function unitMetrics(u) {
        if (u.type === "char") {
            const m = getMetrics(u.code);
            return { h: Math.max(m.height, 1), w: Math.max(m.width, 1) };
        }
        if (u.type === "vrg") {
            // 只有一层的 VRG 视为一般字符（序列），不再保留方块结构
            if (u.layers.length === 1) {
                // 单层组在横排中按序列展开（无层内间隙），度量也按序列计，保证横排不变
                let h = 0, w = 0;
                for (const x of u.layers[0]) {
                    const m = unitMetrics(x);
                    h = Math.max(h, m.h);
                    w += m.w;
                }
                return { h: Math.max(h, 1), w: Math.max(w, 1) };
            }
            return { h: EM_SQUARE, w: Math.max(vrgBoxWidth(u.layers), 1) };
        }
        if (u.type === "lig") {
            // 连字整体占 1em 高，宽取墨迹宽
            return { h: EM_SQUARE, w: ligatureWidth(u.name) };
        }
        if (u.type === "newline") {
            // 手动换行标记：不占宽高（顶层渲染时单独处理）
            return { h: 1, w: 1 };
        }
        if (u.type === "text") {
            // 插入文本：适中字号（0.4em），宽度按字符数估算
            return { h: 0.4 * EM_SQUARE, w: Math.max(0.24 * EM_SQUARE * u.text.length, 1) };
        }
        if (u.type === "enc") {
            // 包围框：内容宽 + 内边距（左右各 ENC_PAD em）；高度按 1em 计
            let w = 0;
            for (const x of (u.units || [])) w += unitMetrics(x).w;
            return { h: EM_SQUARE, w: Math.max(w + ENC_PAD * 2 * EM_SQUARE, 1) };
        }
        if (u.type === "unsup") {
            // 字体不支持的码（占位框）：按 1em 方块计——与普通字符同位、参与 VRG 缩放
            return { h: EM_SQUARE, w: EM_SQUARE };
        }
        if (u.type === "seq") {
            let h = 0, w = 0;
            for (const x of u.units) {
                const m = unitMetrics(x);
                h = Math.max(h, m.h);
                w += m.w;
            }
            return { h: Math.max(h, 1), w: Math.max(w, 1) };
        }
        return { h: 1, w: 1 };
    }

    /**
     * 计算 VRG 中一层的度量（unit）：高 = 最大墨迹高；宽 = 元素宽之和 + 元素间间隔。
     * 层内多个元素由 space-between 两端对齐，其间隔即由本函数预留的空隙提供。
     */
    function layerMetrics(line) {
        let h = 0, w = 0;
        for (const u of line) {
            const m = unitMetrics(u);
            h = Math.max(h, m.h);
            w += m.w;
        }
        if (line.length > 1) w += vrgItemGap() * (line.length - 1);
        return { h: Math.max(h, 1), w: Math.max(w, 1) };
    }

    /**
     * 嵌套 VRG 的组宽（unit，相对 1em）：递归计算。
     * 词典式缩放：符号保持原比例（不放大），仅整体超出 1em 方块时等比缩小；
     * 层与层之间保留微小间隔（VRG_LAYER_GAP）。
     */
    function vrgBoxWidth(layers) {
        const metrics = layers.map(layerMetrics);
        const totalH = metrics.reduce((sum, m) => sum + m.h, 0) + vrgLayerGap() * (layers.length - 1);
        const maxW = Math.max(...metrics.map(m => m.w));
        const s = Math.min(1, EM_SQUARE / totalH, EM_SQUARE / maxW);
        return maxW * s;
    }

    MDC.ligatureWidth = ligatureWidth;
    MDC.unitMetrics = unitMetrics;
    MDC.layerMetrics = layerMetrics;
    MDC.vrgBoxWidth = vrgBoxWidth;
})();
