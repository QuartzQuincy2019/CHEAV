/**
 * 四开组（cadrat）布局 —— 逐行照抄 JSesh QuadratLayout.java:49-197
 *
 * 文件名沿用 mdcVrg.js（页面接线不变），但布局逻辑已完全改为 JSesh 的
 * Cadrat / QuadratLayout 模型，原来的 "flow"（词典式压进 1em）分支已删除。
 *
 * 依据：
 *   $SRC/render/layout/QuadratLayout.java:49-197（layout）
 *   $SRC/render/layout/QuadratLayout.java:199-236（fitLoneSignsToColumnWidth）
 *   $SRC/render/style/GeometrySpecification.java:101-127（DEFAULT 常量）
 *
 * 单位换算：GeometrySpecification 里 1 单位 = 1/18 em
 *   maxCadratHeight = 18 单位 = 1.000em
 *   maxCadratWidth  = 22 单位 = 1.222em
 *   smallSkip       =  2 单位 = 0.111em
 *
 * 横排（honourMaxHeight=true, honourMaxWidth=false）流程：
 *   1. 子视图数 ≠ 1 且非 wide → 每个子视图 scaleForMaxWidth(maxCadratWidth)
 *   2. 非 wide → fitLoneSignsToColumnWidth(c, width=子视图最大宽)
 *   3. h = Σ 行高 + (n−1)*smallSkip；h < maxCadratHeight → h = maxCadratHeight
 *   4. w = 子视图最大宽（横排不补齐）
 *   5. n > 1 → distributeFromTopToBottom()；否则贴底（centerSigns 时居中）
 *   6. 每行：宽度补到 w；单元素水平居中，多元素 distributeHorizontally + 贴底
 *   7. h > maxCadratHeight → reScale(maxCadratHeight / h)
 * 竖排（honourMaxWidth=true, honourMaxHeight=false）把宽高规则对调。
 */
(function () {
    "use strict";
    const MDC = (typeof window !== "undefined" && window.MDC) ? window.MDC : {};

    const EM_SQUARE = MDC.EM_SQUARE || 1000;

    // —— GeometrySpecification.DEFAULT（单位 = 1/18 em，这里已换算成 em）——
    const MAX_CADRAT_HEIGHT = 18 / 18;      // 1.000
    const MAX_CADRAT_WIDTH = 22 / 18;       // 1.222
    const SMALL_SKIP = 2 / 18;              // 0.111
    const LARGE_SIGN_SIZE_RATIO = 0.8;      // largeSignSizeRatio
    const SMALL_SIGN_SIZE_RATIO = 0.4;      // smallSignSizeRatio

    function getMetrics(code) { return MDC.getMetrics ? MDC.getMetrics(code) : { width: EM_SQUARE, height: EM_SQUARE }; }
    function ligatureWidth(name) { return MDC.ligatureWidth ? MDC.ligatureWidth(name) : EM_SQUARE; }

    /** 单位度量（em） */
    function measureUnitEm(u) {
        if (!u) return { w: 0.3, h: 0.3 };
        if (u.type === "vrg" && u.layers && u.layers.length) {
            const g = computeCadrat(u.layers, false);
            return { w: Math.max(g.w, 0.05), h: Math.max(g.h, 0.05) };
        }
        if (u.type === "seq" && u.units) {
            let w = 0, h = 0;
            for (const x of u.units) { const m = measureUnitEm(x); w += m.w; if (m.h > h) h = m.h; }
            return { w: Math.max(w, 0.05), h: Math.max(h, 0.05) };
        }
        // 字形（不论 type 叫什么，只要有 code 就按字形量）
        if (typeof u.code === "string" && u.code && u.type !== "lig") {
            const m = getMetrics(u.code) || {};
            const mw = (typeof m.w === "number") ? m.w : ((typeof m.width === "number") ? m.width : 1);
            const mh = (typeof m.h === "number") ? m.h : ((typeof m.height === "number") ? m.height : 1);
            return { w: Math.max(mw, 1) / EM_SQUARE, h: Math.max(mh, 1) / EM_SQUARE };
        }
        if (u.type === "lig") return { w: Math.max(ligatureWidth(u.name), 1) / EM_SQUARE, h: 1 };
        if (u.type === "text") return { w: 0.24 * (u.text || "").length, h: 0.4 };
        if (u.type === "enc") return { w: 1.34, h: 1.34 };
        return { w: 0.6, h: 1 };
    }

    function px(v) { return MDC.host ? MDC.host.px(v) : v; }

    /** 一行（HBox）的度量：parts 里带上各自累计缩放 s */
    function rowMetrics(row) {
        let w = 0, h = 0;
        const parts = [];
        for (const u of row) {
            const m = measureUnitEm(u);
            const part = { u, m: { w: m.w, h: m.h }, s: 1 };
            w += m.w;
            if (m.h > h) h = m.h;
            parts.push(part);
        }
        return { parts, w: w, h: Math.max(h, 0.05) };
    }

    function scaleRow(row, s) {
        row.w *= s;
        row.h *= s;
        for (const p of row.parts) {
            p.m = { w: p.m.w * s, h: p.m.h * s };
            p.s *= s;
        }
    }

    /**
     * 核心：按 QuadratLayout.layout() 计算四开组几何（JSesh 单位 = em）
     * 返回 { w, h, scale, view, places:[{x,y,w,h,fs,unit}] }
     * places 的坐标与 fs 都是 em 口径（绘制时乘 fontSize）。
     */
    function computeCadrat(layers, vertical) {
        const V = MDC.View;
        if (!V) throw new Error("MDC.View 未加载：请把 mdcView.js 放在 mdcVrg.js 之前");

        // —— 建视图树：cadrat → HBox（层）→ unit ——
        const cadrat = new V({ isCadrat: true });
        const rows = [];
        for (const layer of layers) {
            const row = new V({ isHBox: true });
            for (const u of layer) {
                const m = measureUnitEm(u);
                const v = new V(u);
                v.width = m.w;
                v.height = m.h;
                v.wide = !!u.wide;                    // \l 修饰符（尚未解析，先留口）
                row.add(v);
            }
            row.setWidth(row.getSumOfSubViewsWidths());
            row.setHeight(row.getMaximalHeightOfSubView());
            cadrat.add(row);
            rows.push(row);
        }

        const n = rows.length;
        const wide = rows.some(function (r) {
            return r.getNumberOfSubviews() === 1 && r.getSubView(0).wide;
        });
        const embedded = false;                       // (x:t) 子四开组尚未接入
        const honourMaxHeight = embedded ? false : !vertical;
        const honourMaxWidth = embedded ? false : !!vertical;

        // 1. 横向超宽的行先整体缩小（QuadratLayout.java:61-73）
        if (honourMaxWidth || (n !== 1 && !wide)) {
            for (const r of rows) r.scaleForMaxWidth(MAX_CADRAT_WIDTH);
        }

        // 2. wide 行横向拉伸；否则单符号行按"宽扁符号"补宽
        if (wide) {
            const maxw = honourMaxWidth ? MAX_CADRAT_WIDTH : cadrat.getMaximalWidthOfSubView();
            for (const r of rows) {
                if (r.getNumberOfSubviews() === 1 && r.getSubView(0).wide) r.scaleToWidth(maxw);
            }
        } else {
            let width = cadrat.getMaximalWidthOfSubView();
            if (honourMaxWidth && !embedded && width < MAX_CADRAT_WIDTH) width = MAX_CADRAT_WIDTH;
            fitLoneSignsToColumnWidth(cadrat, width);
        }

        // 3. 高度：内容高 + 层间距，不足 1em 补到 1em
        let h = cadrat.getSumOfSubViewsHeights() + (n - 1) * SMALL_SKIP;
        if (honourMaxHeight && h < MAX_CADRAT_HEIGHT) h = MAX_CADRAT_HEIGHT;
        cadrat.setHeight(h);

        // 4. 宽度：取最宽行，竖排补到 maxCadratWidth
        let w = cadrat.getMaximalWidthOfSubView();
        if (honourMaxWidth && !embedded && w < MAX_CADRAT_WIDTH) w = MAX_CADRAT_WIDTH;
        cadrat.setWidth(w);

        // 5. 层间分布
        if (n > 1) cadrat.distributeFromTopToBottom();
        else cadrat.stickSubViewsTo(MDC.ViewSide.BOTTOM);   // 单个字形落基线

        // 6. 行内分布：单元素居中，多元素均分后贴底
        for (const r of cadrat.children) {
            if (r.getWidth() < w) r.setWidth(w);
            if (r.getNumberOfSubviews() === 1) r.centerSubViewHorizontally();
            else { r.distributeHorizontally(); r.stickSubViewsTo(MDC.ViewSide.BOTTOM); }
        }

        // 7. 过高则整组缩回 1em（只缩不放大）
        if (honourMaxHeight && h > MAX_CADRAT_HEIGHT) cadrat.reScale(MAX_CADRAT_HEIGHT / h);

        const places = MDC.flattenView(cadrat, cadrat.xScale, cadrat.yScale, 0, 0, []);
        return { w: cadrat.getWidth(), h: cadrat.getHeight(), scale: cadrat.xScale, view: cadrat, places: places };
    }

    /**
     * 单符号行补宽（QuadratLayout.fitLoneSignsToColumnWidth）：
     * 行只有一个元素、该元素只有一个符号、不是相对字号、且"宽扁"
     * （宽 ≥ 0.8×A1 高、高 ≤ 0.4×A1 高）时，横向拉伸到列宽。
     */
    function fitLoneSignsToColumnWidth(cadrat, width) {
        for (const row of cadrat.children) {
            if (row.getNumberOfSubviews() !== 1) continue;
            const unit = row.getSubView(0);
            if (unit.getNumberOfSubviews() !== 1) continue;
            const m = measureUnitEm(unit.getSubView(0).model);
            if (m.w >= LARGE_SIGN_SIZE_RATIO && m.h <= SMALL_SIGN_SIZE_RATIO) {
                unit.reScale(width / unit.getWidth());
                row.fitToSubViews(true);
            }
        }
    }

    /** 渲染：几何全部算好后**扁平绝对定位**；字号 = fontSize × 累计缩放 */
    function renderCadrat(parent, layers, fontSize, vertical) {
        if (typeof globalThis !== "undefined") {
            globalThis.__quadratCalls = globalThis.__quadratCalls || {};
            globalThis.__quadratCalls.cadrat = (globalThis.__quadratCalls.cadrat || 0) + 1;
        }
        const g = computeCadrat(layers, !!vertical);
        const box = document.createElement("span");
        box.className = "vrg";
        box.style.cssText = "position:relative;display:inline-block;vertical-align:bottom;" +
            "width:" + px(g.w * fontSize) + "px;height:" + px(g.h * fontSize) + "px;";
        for (const p of g.places) {
            const holder = document.createElement("span");
            holder.className = "vrg-part";
            holder.style.cssText = "position:absolute;left:" + px(p.x * fontSize) + "px;" +
                "top:" + px(p.y * fontSize) + "px;width:" + px(p.w * fontSize) + "px;" +
                "height:" + px(p.h * fontSize) + "px;line-height:0;";
            const fs = p.fs * fontSize;
            // 统一走 host 的单位渲染器，再把产物拉满到"墨迹盒"
            if (MDC.host && MDC.host.render) {
                const inner = document.createElement("span");
                inner.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;" +
                    "line-height:0;font-size:" + px(fs) + "px;";
                MDC.host.render(inner, p.unit, fs);
                // 渲染器给出的盒子可能带 1em 行高/基线余量，这里全部按墨迹盒归一
                const kids = inner.querySelectorAll(".hie, [style*='background-image'], span");
                for (const k of kids) {
                    if (!k.style) continue;
                    if (k.querySelector && k.querySelector(".hie")) continue;
                    k.style.position = "absolute";
                    k.style.left = "0";
                    k.style.top = "0";
                    k.style.margin = "0";
                    k.style.width = "100%";
                    k.style.height = "100%";
                    k.style.backgroundSize = "100% 100%";
                    k.style.lineHeight = "0";
                }
                holder.appendChild(inner);
            }
            box.appendChild(holder);
        }
        if (parent) parent.appendChild(box);
        return box;
    }

    // —— 兼容旧导出（MdCRndr 里仍以 renderVRG 名字调用）——
    function renderVRG(parent, layers, fontSize) { return renderCadrat(parent, layers, fontSize, false); }

    function layoutQuadratAbs(layers, fontSize) { return renderCadrat(null, layers, fontSize, false); }

    function renderLayerUnit(layer, u, glyphSize) {
        const span = document.createElement("span");
        span.style.cssText = "display:inline-block;line-height:1;vertical-align:bottom;";
        MDC.host.render(span, u, glyphSize);
        layer.appendChild(span);
    }

    MDC.measureUnitEm = measureUnitEm;
    MDC.computeCadrat = computeCadrat;
    MDC.renderCadrat = renderCadrat;
    MDC.layoutQuadratAbs = layoutQuadratAbs;
    MDC.renderVRG = renderVRG;
    MDC.renderLayerUnit = renderLayerUnit;
})();
