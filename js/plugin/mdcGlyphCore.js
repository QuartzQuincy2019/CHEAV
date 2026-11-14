/*!
 * mdcGlyphCore.js —— MdCRndr 模块化裂解 · 第 3 步
 * 字形核心：度量 / 阴影 / 覆盖层 / 单字形渲染
 *
 * 从 MdCRndr.js 原样搬出，行为完全不变：
 *   getMetrics / applyShadow / renderInShadedCell / attachSvgOverlay / renderGlyph
 *
 * 依赖（由 MdCRndr.js 在加载期注入）：
 *   MDC.EM_SQUARE            设计单位（1000）
 *   MDC.host.decodeCode()    码值 → Unicode 字符
 *   MDC.host.px()            像素取整
 *   MDC.providers.*          宿主注入的字形/度量/盒/宽高比提供者
 *   window.MDC_GLYPH_TABLES  { visuHeight, visuWidth }
 */
(function (global) {
    "use strict";

    const MDC = global.MDC || (global.MDC = {});
    const TABLES = global.MDC_GLYPH_TABLES || { visuHeight: {}, visuWidth: {} };
    const visuHeight = TABLES.visuHeight || {};
    const visuWidth = TABLES.visuWidth || {};

    /** 与宿主共享的可变 provider 表（宿主 setter 写入，这里读） */
    const P = MDC.providers || (MDC.providers = {
        glyph: null,      // code -> SVG/URL
        zone: null,       // code -> { zone1, zone2 }
        metrics: null,    // code -> { w, h }（em）
        box: null,        // code -> { x, y, w, h, dy }（em）
        aspect: null,     // code -> 宽/高
        ovl: null,
    });

    /** 宿主注入的助手（decodeCode / px）；缺失时退化为安全默认值 */
    function HOST() { return MDC.host || {}; }
    function decodeCode(code) {
        const h = HOST();
        return typeof h.decodeCode === "function" ? h.decodeCode(code) : null;
    }
    function px(v) {
        const h = HOST();
        return typeof h.px === "function" ? h.px(v) : Math.round(v * 100) / 100;
    }
    function emSquare() {
        return MDC.EM_SQUARE || 1000;
    }

    /**
     * 获取字形的视觉度量（单位：设计单位，EM_SQUARE = 1000）。
     * @param {string} code Gardiner 或 Hex 码
     * @returns {{height:number, width:number}} 墨迹高度与墨迹宽度
     */
    function getMetrics(code) {
        // JSesh 模式：用它的自有度量（18 单位 = 1em）取代字体度量，保证整串比例统一
        if (P.metrics) {
            const jm = P.metrics(code);
            if (jm && jm.w > 0 && jm.h > 0) {
                return { width: jm.w * emSquare(), height: jm.h * emSquare() };
            }
        }
        const ch = decodeCode(code);
        if (!ch) return { height: 0, width: 0 };
        const key = "x" + ch.codePointAt(0).toString(16).toLowerCase();
        return { height: visuHeight[key] || 0, width: visuWidth[key] || 0 };
    }

    /**
     * 阴影：把 1-4 分区渲染为 45° 斜线底纹（背景层，不占布局、不影响度量）。
     * 1=左上 2=右上 3=左下 4=右下，可任意组合；每个分区是一层 50%×50% 的背景。
     * 底纹必须落在 1em 方格上（见 .sh-cell），而不是字形自身的行盒。
     */
    function applyShadow(el, digits) {
        if (!el || !el.style) return el;
        const hatch = "repeating-linear-gradient(45deg, #000 0 0.02em, transparent 0.02em 0.06em)";
        const posMap = { "1": "left top", "2": "right top", "3": "left bottom", "4": "right bottom" };
        const layers = [], sizes = [], positions = [];
        for (const d of String(digits)) {
            if (!posMap[d]) continue;
            layers.push(hatch);
            sizes.push("50% 50%");
            positions.push(posMap[d]);
        }
        if (!layers.length) return el;
        el.style.backgroundImage = layers.join(", ");
        el.style.backgroundSize = sizes.join(", ");
        el.style.backgroundPosition = positions.join(", ");
        el.style.backgroundRepeat = "no-repeat";
        return el;
    }

    /**
     * 生成一个高 1em 的"格"（.sh-cell），把渲染动作放进格内，再给格加阴影。
     * 横排：宽度**不**固定，窄字形（如 Z3）保持自然宽度，避免右侧留白；
     * 竖排：宽度固定 1em（= 列宽），阴影与整列对齐，而不是贴在字形自身宽度上。
     * 横排贴底、竖排居中，与普通字形的基线位置一致；阴影按此格划分四象限。
     */
    function renderInShadedCell(parent, fontSize, digits, draw, alignEnd, emWidth) {
        const cell = document.createElement("span");
        cell.className = "sh-cell";
        cell.style.height = px(fontSize) + "px";
        if (emWidth) cell.style.width = px(fontSize) + "px";
        cell.style.alignItems = alignEnd ? "flex-end" : "center";
        parent.appendChild(cell);
        draw(cell);
        applyShadow(cell, digits);
        return cell;
    }

    /**
     * 把自定义字形（JSesh SVG）覆盖到字形格上。
     * payload 可以是 SVG 源码，也可以是 data:/blob:/http URL（兼容旧行为）。
     */
    function attachSvgOverlay(el, payload, inkW, inkH, dy, position) {
        // data:/blob: URL → 背景图铺在字形格内（不参与盒模型，排版零影响）
        el.style.backgroundImage = 'url("' + payload + '")';
        el.style.backgroundRepeat = "no-repeat";
        if (inkW && inkH) {
            el.style.backgroundSize = "100% 100%";
            el.style.backgroundPosition = "center center";   // 盒 = 墨迹盒 → 铺满即精确
            void inkW; void inkH;
        } else {
            el.style.backgroundSize = "contain";
            el.style.backgroundPosition = position || "center bottom";
        }
    }

    /**
     * 渲染单个字形。
     * @param {HTMLElement} parent 父容器
     * @param {string} code 码值
     * @param {number} fontSize 该字形字号（px），1em = fontSize
     * @param {string} [align] "center"：在 1em 轨道内垂直居中（IS 用）；
     *                         其他/缺省：贴底（baseline 对齐，VRG 层内用）
     */
    function renderGlyph(parent, code, fontSize, align, mirror) {
        const ch = decodeCode(code);
        if (!ch) return null;
        const el = document.createElement("span");
        el.className = "hie";
        el.textContent = ch;
        el.title = mirror ? code + "（水平镜像）" : code;
        el.style.fontSize = fontSize + "px";
        const tf = [];
        if (align === "center") {
            // 上下居中：盒已是墨迹盒，靠外层（.enc-body 的 flex 居中）完成，这里不再平移
            // （原 translateY 会与 flex 居中叠加，导致字形被顶出框外）
            void 0;
        }
        if (mirror) {
            tf.push("scaleX(-1)");       // 水平镜像：宽度不变，故不影响排版
            el.classList.add("mir");
        }
        if (tf.length) el.style.transform = tf.join(" ");
        // 自定义字形（如 JSesh SVG）：字体字形透明仅作占位，SVG 作为覆盖层铺在同一格内。
        // 覆盖层用内联 <svg>（而非 CSS 背景图）：不受 background-clip 裁剪、
        // 也不受 blob:/file:// 限制，缩放与居中交给 preserveAspectRatio 处理。
        const customGlyph = P.glyph ? P.glyph(code) : null;
        if (customGlyph) {
            el.style.color = "transparent";
            el.classList.add("has-svg");
            // 盒高仍是 1em 行盒、墨迹贴基线；但**盒宽至少要容得下图片**，
            // 否则背景图会被 background-clip 裁掉左右两侧（这就是"A1 的手和肘被切掉"的原因）。
            {
                const gm = getMetrics(code);                                   // 墨迹尺寸（设计单位）
                const bx = P.box ? P.box(code) : null;                         // 墨迹（em）+ dy 偏移
                const wEm = bx ? bx.w : gm.width / emSquare();
                const hEm = bx ? bx.h : gm.height / emSquare();
                // JSesh 不做"塞进 1em"的缩放：字形按墨迹原尺寸绘制（宽符号可达 22/18 em）
                const fit = 1;
                const w = wEm * fit * fontSize;
                const h = hEm * fit * fontSize;
                const dy = ((bx && bx.dy) ? bx.dy : 0) * fit * fontSize;       // 墨迹底边距基线
                // 盒宽 = 图片宽：字距贴合，也不会被 background-clip 裁掉
                el.style.display = "inline-block";
                // 盒 = 墨迹盒（宽高都取墨迹）：背景铺满盒，绝无裁切；基线由 margin-bottom 承担
                el.style.width = px(w) + "px";
                el.style.height = px(h) + "px";
                el.style.verticalAlign = "bottom";
                el.style.marginBottom = px(dy) + "px";
                attachSvgOverlay(el, customGlyph, w, h, dy,
                    (align === "center") ? "center center" : "center");
            }
        }
        parent.appendChild(el);
        return el;
    }

    MDC.getMetrics = getMetrics;
    MDC.applyShadow = applyShadow;
    MDC.renderInShadedCell = renderInShadedCell;
    MDC.attachSvgOverlay = attachSvgOverlay;
    MDC.renderGlyph = renderGlyph;
})(window);
