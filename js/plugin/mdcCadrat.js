/*
 * mdcCadrat.js — MDC 三层结构（四开组）与 JSesh QuadratLayout 等价实现
 * ------------------------------------------------------------------
 * 语法分层（严格照抄 $SRC\parser\MDCParser.java:225-231、410-440）：
 *   mdcfile        ::= topitems                // SEPARATOR = '-' | 空格
 *   topitem        ::= cadrat                  // 一个四开组
 *   cadrat         ::= verticalStack
 *   verticalStack  ::= horizontalList (COLON horizontalList)*      // ':' 分层
 *   horizontalList ::= element (STAR element)*                     // '*' 并置
 *
 * 布局分层（照抄 QuadratLayout.java + Layout.visitDefault/HBox）：
 *   行内 HBox      : width = Σw + smallSkip*(n-1); height = max(h)
 *                    单元素 → 水平居中；多元素 → distributeHorizontally + 贴底
 *   四开组 Cadrat  : 行栈；h = ΣrowH + smallSkip*(n-1)，不足 1em 补 1em
 *                    单行 → centerSigns ? 垂直居中 : 贴底
 *                    h > 1em → reScale(1/h)
 *   行 Line        : 串接 cadrat，width = Σw + smallSkip*(n-1)，高取 max，顶对齐
 *
 * 单元度量一律用墨迹 bbox（MDC.measureUnitEm，em 口径）。
 */
(function (global) {
    "use strict";

    const MDC = global.MDC = global.MDC || {};

    const SMALL_SKIP = 2 / 18;      // GeometrySpecification.smallSkip
    const MAX_CADRAT_HEIGHT = 1;

// JSesh: GeometrySpecification.alphabeticTextBaseline = 4（单位 1/18em）。
// 默认取 JSesh 的原值 4。曾经为了对齐 JSesh 截图调到 7，后来确认那是
// 字体差异（JSesh 用 Times New Roman，我们用 sans-serif），不再做补偿。
// 仍保留 ?tb=N（1/18em 的倍数）供需要时临时对照，不改默认行为。
const ALPHABETIC_TEXT_BASELINE_UNITS = (function () {
    try {
        const q = new URLSearchParams(location.search).get("tb");
        const n = q === null ? NaN : Number(q);
        if (isFinite(n) && n >= 0 && n <= 18) return n;
    } catch (e) { /* 非浏览器环境 */ }
    return 4;
})();    // maxCadratHeight = 18/18
    const MAX_CADRAT_WIDTH = 22 / 18;

    function measure(u) {
        if (MDC.measureUnitEm) {
            const m = MDC.measureUnitEm(u);
            // 度量失败或退化成极小值（例如连字名查不到表）时按 1em 方盒处理，
            // 否则部件会被压成几个像素，看起来"框内什么都没有"。
        return (m.asc !== undefined) ? { w: m.w, h: m.h, asc: m.asc } : { w: m.w, h: m.h };
        }
        return { w: MAX_CADRAT_WIDTH, h: MAX_CADRAT_HEIGHT };
    }

    /* ---------- 语法：三层切分 ---------- */

    // 按顶层分隔符切分，保护 () [] <> 内部；sep 为待匹配字符集合
    function splitTop(text, seps) {
        const out = [];
        let buf = "", depthP = 0, depthA = 0, depthS = 0;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === "(") depthP++;
            else if (ch === ")") depthP = Math.max(0, depthP - 1);
            else if (ch === "<") depthA++;
            else if (ch === ">") depthA = Math.max(0, depthA - 1);
            else if (ch === "[") depthS++;
            else if (ch === "]") depthS = Math.max(0, depthS - 1);

            const atTop = depthP === 0 && depthA === 0 && depthS === 0;
            if (atTop && seps.indexOf(ch) >= 0) {
                out.push(buf);
                buf = "";
                // 连续的 '-' 与空格等价，折叠成一个分隔
                while (i + 1 < text.length && (seps.indexOf(text[i + 1]) >= 0)) i++;
                continue;
            }
            buf += ch;
        }
        out.push(buf);
        return out.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    }

    /**
     * 解析文本为四开组序列。
     * @param {string} text
     * @param {function(string):object} parseElement 把单元素字符串解析成单元（复用现有解析器）
     * @returns {Array} cadrat 列表：[{ hboxes: [ [element, ...], ... ] }]
     */
    function parse(text, parseElement) {
        // JSesh 把 "+…+s" 当成独立的四开组：输入 A1+hhello+sN35 时，
        // 它存盘变成 "A1-+hhello+s-N35"（自带分隔符）。这里先把文本块用 "-" 包起来。
        const __src = String(text).replace(/(\+[a-rt-z](?:\\.|[^+])*\+s)/g, function (m) { return "-" + m + "-"; });
        const cadratTexts = splitTop(__src, ["-", " "]);
        return cadratTexts.map(function (ct) {
            const rows = splitTop(ct, [":"]).map(function (rt) {
                const elems = splitTop(rt, ["*"]).map(function (et) {
                    if (et.charAt(0) === "(" && et.charAt(et.length - 1) === ")") {
                        const inner = et.slice(1, -1);
                        return { type: "group", cadrats: parse(inner, parseElement) };
                    }
                    // MdC 的 l 修饰符（Hieroglyph.java:239 getModifiers().getBoolean("l")）
                    // 在 HBox 层表现为「这一行是 wide」（HBox.isWide），
                    // QuadratLayout:107-119 只对 wide 的行做 scaleToWidth。
                    if (et === "l") return { type: "wide" };
                    return { type: "unit", unit: parseElement(et), text: et };
                });
                return elems;
            });
            // 行内含 l 标记 → cadrat.wide（对应 Cadrat.isWide()）
            let __wide = false;
            for (let i = 0; i < rows.length; i++) {
                const keep = [];
                for (let j = 0; j < rows[i].length; j++) {
                    if (rows[i][j].type === "wide") __wide = true;
                    else keep.push(rows[i][j]);
                }
                if (keep.length) rows[i] = keep;
            }
            return { hboxes: rows, wide: __wide };
        });
    }

    /* ---------- 布局：逐层照抄 ---------- */

    function measureElement(el) {
        if (el.type === "group") {
            const laid = layoutLine(el.cadrats, { centerSigns: false, embedded: true });
            return { w: laid.w, h: laid.h };
        }
        const __u = (el.unit && el.unit.type === "seq" && el.unit.units && el.unit.units.length === 1) ? el.unit.units[0] : el.unit;   // 拆掉 parseInput 的 seq 包装
        const m = measure(__u);
        return (m.asc !== undefined) ? { w: m.w, h: m.h, asc: m.asc } : { w: m.w, h: m.h };
    }

    // 一行（HBox）：多元素底对齐；单元素水平居中
    // ========================================================================
    // 三层排版：HBox（行）→ Cadrat（四开组）→ 行串接
    // 下面三个函数是 JSesh 的直译，函数名与注释都对齐到具体源码位置，
    // 不再自创规则。常量取自 GeometrySpecification.DEFAULT（单位 em，1em = 18 设计单位）。
    // ========================================================================
    const GEOM = {
        maxCadratHeight: 18 / 18,        // maxCadratHeight 18
        maxCadratWidth: 22 / 18,         // maxCadratWidth 22
        smallSkip: 2 / 18,               // smallSkip 2
        largeSignSizeRatio: 0.8,         // largeSignSizeRatio
        smallSignSizeRatio: 0.4,         // smallSignSizeRatio
        heightOfA1: 18 / 18,             // getHeightOfA1()：名义 A1 高 = 18 单位 = 1em
        // —— 行层（Zone / LineLayoutAux）——
        lineSkip: 6 / 18,                // lineSkip 6：换行时行与行之间的距离
        tabUnitWidth: 18 / 200,          // tabUnitWidth 18/200 = 0.09em：一个 Tab 的宽度
        leftMargin: 6 / 18,              // leftMargin 6：行首左边距
        textWidth: 538 / 18,             // textWidth 538：正文栏宽（em）
        topMargin: 5 / 18,               // topMargin 5：首行上边距
        justifyWidthTo: 0.75             // LineLayout.endLayout: 非末 zone 或宽度 ≥ 0.75×最宽 才拉满
    };

    /** MDCView.stickSubViewsTo(ViewSide.BOTTOM)：子视图贴底 */
    function stickSubViewsToBottom(row, h) {
        for (let i = 0; i < row.places.length; i++) row.places[i].y = h - row.places[i].h;
    }

    /** MDCView.centerSubViewHorizontally：唯一子视图水平居中 */
    function centerSubViewHorizontally(row, w) {
        if (row.places.length === 1) row.places[0].x = (w - row.places[0].w) / 2;
    }

    /** MDCView.distributeHorizontally：多子视图等分多余宽度 */
    function distributeHorizontally(row, w) {
        const n = row.places.length;
        if (n < 2) return;
        let sum = 0;
        for (let i = 0; i < n; i++) sum += row.places[i].w;
        const inner = (w - sum) / (n - 1);
        let x = 0;
        for (let i = 0; i < n; i++) {
            row.places[i].x = x;
            x += row.places[i].w + inner;
        }
    }

    /** MDCView.distributeFromTopToBottom：首行贴顶、末行贴底，行距等分（可为负） */
    function distributeFromTopToBottom(rows, H) {
        let sumH = 0;
        for (let i = 0; i < rows.length; i++) sumH += rows[i].h;
        const inner = rows.length > 1 ? (H - sumH) / (rows.length - 1) : 0;
        let y = 0;
        for (let i = 0; i < rows.length; i++) {
            rows[i].y = y;
            y += rows[i].h + inner;
        }
    }

    /** MDCView.scaleToWidth：只改横向（xScale），高度不动 */
    function scaleToWidth(row, w) {
        if (!(row.w > 0) || !(w > 0) || Math.abs(row.w - w) < 1e-9) return;
        const k = w / row.w;
        for (let i = 0; i < row.places.length; i++) {
            row.places[i].x *= k;
            row.places[i].w *= k;
            // MDCView.scaleToWidth:817-825：xScale = w / internalWidth，yScale 不变。
            // 字形由盒宽自动拉伸（background 100%），文本则需要显式 scaleX。
            row.places[i].sx = (row.places[i].sx || 1) * k;
        }
        row.w = w;
    }

    /** MDCView.scaleForMaxWidth：超过 maxWidth 时整体等比缩小 */
    function scaleForMaxWidth(row, maxWidth) {
        if (!(row.w > maxWidth) || !(row.w > 0)) return;
        const k = maxWidth / row.w;
        for (let i = 0; i < row.places.length; i++) {
            const p = row.places[i];
            p.x *= k; p.y *= k; p.w *= k; p.h *= k;
        }
        row.w *= k;
        row.h *= k;
    }

    /** Layout.visitDefault:523-548 —— 一条横排 HBox：宽度求和 + 子视图贴底 */
    function layoutRow(elems) {
        const ms = elems.map(measureElement);
        let w = 0, h = 0;
        for (let i = 0; i < ms.length; i++) {
            w += ms[i].w + (i > 0 ? GEOM.smallSkip : 0);
            if (ms[i].h > h) h = ms[i].h;
        }
        // Layout.visitHBox:549-597
        //   ① 单符号组且高 > largeSignSizeRatio×A1 高 → reScale(h/高) 拉到行高
        //   ② 其余可拉伸视图（yStretchable）由 ViewVerticalEnlarger 把**格子**高度设成 h，
        //      但绘制尺寸不变（MDCView.setHeight 不动 xScale/yScale），所以字形仍在格子底部。
        const places = [];
        let x = 0;
        for (let i = 0; i < ms.length; i++) {
            if (i > 0) x += GEOM.smallSkip;
            let w = ms[i].w, inkH = ms[i].h;
            if (elems[i] && elems[i].type === "unit" && ms.length >= 1
                && inkH > GEOM.largeSignSizeRatio * GEOM.heightOfA1 && h > inkH) {
                const k = h / inkH;                 // ① 单符号拉满行高
                w *= k; inkH *= k;
            }
            // 文本 run（带 asc）按基线对齐：
            // JSesh 实测：文本在四开组里是**垂直居中**的（不是贴基线），见 m14162 对照图
            // JSesh deltaBaseY = 18 - 4 - ascent：文本基线在格底之上 4/18 em。
            // JSesh: deltaBaseY = 18 - alphabeticTextBaseline - ascent，常量 4 来自
            // GeometrySpecification.alphabeticTextBaseline。实测（m14359 对照图）
            // CHEAV 比 JSesh 略低，故在基准上加 1 个设计单位（= 1/18em）补偿：
            // 这是唯一的可调旋钮，若仍差一点就改这里的分子。
            const __y = (ms[i].asc !== undefined) ? (h - ALPHABETIC_TEXT_BASELINE_UNITS / 18 - ms[i].asc) : (h - inkH);
            places.push({
                x: x, y: __y, w: w, h: inkH,
                cellH: h,                            // ② 格子高 = 行高（绘制仍用 h）
                elem: elems[i], asc: ms[i].asc, nh: ms[i].h
            });
            x += w;
        }
        return { w: w, h: h, y: 0, places: places, wide: elems.length === 1 && !!(elems[0] && elems[0].wide) };
    }

    /** HBox.containsOnlyOneSign()：整行只有一个元素时，返回它的度量 */
    function loneSignOf(elems) {
        return elems.length === 1 ? measureElement(elems[0]) : null;
    }

    /**
     * Cadrat.isWide() / HBox.isWide() / Hieroglyph.isWide()
     *   HBox.isWide   = 该行只有一个子元素且它是 Hieroglyph，且 hiero.isWide()
     *   hiero.isWide  = getModifiers().getBoolean("l")   ← MdC 的 l 修饰符
     * 我们目前不支持修饰符，所以这里恒为 false（与"没有写 l"的输入一致）。
     */
    function isWideCadrat(cad) {
        return !!cad && !!cad.wide;
    }

    /** QuadratLayout:199-233 fitLoneSignsToColumnWidth —— 单元素行里的宽扁独字等比撑满行宽 */
    function fitLoneSignsToColumnWidth(hboxes, rows, width) {
        for (let k = 0; k < rows.length; k++) {
            if (rows[k].places.length !== 1) continue;
            const m = loneSignOf(hboxes[k]);
            if (!m) continue;
            if (!(m.w >= GEOM.largeSignSizeRatio * GEOM.heightOfA1)) continue;
            if (!(m.h <= GEOM.smallSignSizeRatio * GEOM.heightOfA1)) continue;
            const p = rows[k].places[0];
            if (!(p.w > 0)) continue;
            const scale = width / p.w;
            if (!isFinite(scale) || scale <= 0) continue;
            p.w *= scale;
            p.h *= scale;
            p.y = 0;                       // 独字撑满，贴底等价于贴行顶
            rows[k].w = p.w;
            rows[k].h = p.h;
        }
    }

    /** QuadratLayout:49-197 —— 一个 Cadrat（四开组） */
    function layoutCadrat(cad, ctx) {
        const centre = !!(ctx && ctx.centerSigns);
        const horizontal = !(ctx && ctx.vertical);

        // QuadratLayout:72-87  honourMaxHeight/Width 与 embedded
        let honourMaxHeight = horizontal;
        let honourMaxWidth = !horizontal;
        const embedded = !!cad.embedded;              // Cadrat.isEmbedded()
        if (embedded) { honourMaxHeight = false; honourMaxWidth = false; }

        const hboxes = cad.hboxes;
        const rows = hboxes.map(layoutRow);

        // QuadratLayout:97  boolean wide = c.isWide();
        const wide = isWideCadrat(cad);

        // QuadratLayout:99-105  先按最大宽度收缩
        if (honourMaxWidth || (rows.length !== 1 && !wide)) {
            for (let k = 0; k < rows.length; k++) scaleForMaxWidth(rows[k], GEOM.maxCadratWidth);
        }

        // QuadratLayout:107-131  宽行拉伸 / 独字撑满
        if (wide) {
            let maxw = 0;
            if (honourMaxWidth) maxw = GEOM.maxCadratWidth;
            else for (let k = 0; k < rows.length; k++) if (rows[k].w > maxw) maxw = rows[k].w;
            for (let k = 0; k < rows.length; k++) {
                if (rows[k].wide) scaleToWidth(rows[k], maxw);
            }
        } else {
            let width = 0;
            for (let k = 0; k < rows.length; k++) if (rows[k].w > width) width = rows[k].w;
            // QuadratLayout.java:120-131（逐行核对过）：
            //   float width = currentView.getMaximalWidthOfSubView();
            //   if (honourMaxWidth && !embedded && width < maxWidth) width = maxWidth;
            //   fitLoneSignsToColumnWidth(c, width);      ← 无条件调用！
            // 也就是说：门控只决定 width 是否抬到 maxWidth，不决定要不要做；
            // 而 fitLoneSignsToColumnWidth:217-230 内部还有自己的条件：
            //   relativeSize==100 && internalWidth >= 0.8*A1 && internalHeight <= 0.4*A1
            // 且它用的是 **reScale（等比）**，不是只压宽度。
            if (honourMaxWidth && !embedded && width < GEOM.maxCadratWidth) width = GEOM.maxCadratWidth;
            fitLoneSignsToColumnWidth(hboxes, rows, width);
        }

        // QuadratLayout:133-150  高度 = Σ行高 + 行距，按需抬到 maxCadratHeight
        let h = 0;
        for (let i = 0; i < rows.length; i++) h += rows[i].h + (i > 0 ? GEOM.smallSkip : 0);
        if (honourMaxHeight && h < GEOM.maxCadratHeight) h = GEOM.maxCadratHeight;

        // QuadratLayout:152-162  宽度 = 各行最大宽
        let w = 0;
        for (let k = 0; k < rows.length; k++) if (rows[k].w > w) w = rows[k].w;
        if (honourMaxWidth && !embedded && w < GEOM.maxCadratWidth) w = GEOM.maxCadratWidth;

        // QuadratLayout:164-172  行分布
        if (rows.length > 1) {
            distributeFromTopToBottom(rows, h);
        } else if (rows.length === 1) {
            rows[0].y = centre ? (h - rows[0].h) / 2 : (h - rows[0].h);
        }

        // QuadratLayout:177-192  行内：补宽 → 居中/均分 → 贴底
        for (let k = 0; k < rows.length; k++) {
            const row = rows[k];
            if (row.w < w) row.w = w;
            if (row.places.length === 1) {
                centerSubViewHorizontally(row, w);
            } else {
                distributeHorizontally(row, w);
                stickSubViewsToBottom(row, row.h);
            }
        }

        // QuadratLayout:194-196  超高则整组等比缩回
        let scale = 1;
        if (honourMaxHeight && h > GEOM.maxCadratHeight) scale = GEOM.maxCadratHeight / h;

        const places = [];
        for (let k = 0; k < rows.length; k++) {
            const row = rows[k];
            for (let j = 0; j < row.places.length; j++) {
                const p = row.places[j];
                places.push({
                    x: p.x * scale,
                    y: (row.y + p.y) * scale,
                    w: p.w * scale,
                    h: p.h * scale,
                    cellH: (p.cellH || p.h) * scale,
                    elem: p.elem
                });
            }
        }
        return { w: w * scale, h: h * scale, places: places };
    }

    function layoutLine(cadrats, ctx) {
        const cs = cadrats.map(function (c) { return layoutCadrat(c, ctx); });
        let w = 0, h = 0;
        for (let i = 0; i < cs.length; i++) {
            w += cs[i].w + (i > 0 ? SMALL_SKIP : 0);
            if (cs[i].h > h) h = cs[i].h;
        }
        const places = [];
        let x = 0;
        for (let i = 0; i < cs.length; i++) {
            for (let k = 0; k < cs[i].places.length; k++) {
                const p = cs[i].places[k];
                places.push({ x: x + p.x, y: p.y, w: p.w, h: p.h, elem: p.elem });
            }
            x += cs[i].w + SMALL_SKIP;
        }
        // 行层需要的两个量（LineLayoutAux.visitLineBreak:292-315）：
        //   maxH：行内最高元素；minY：行内最小上沿（可为负，符号可探出基线）
        // Zone.justifyWidthTo:221-250（三分支）
        //   ① 只有一个单位 → 居中
        //   ② 剩余空间 > 0.5 * 最小单位宽 → 整行居中
        //   ③ 否则等间隔铺开
        const targetW = (ctx && ctx.justifyWidth) || 0;
        if (targetW > w && places.length) {
            const space = targetW - w;
            let minUnitW = Infinity;
            for (let i = 0; i < cs.length; i++) if (cs[i].w > 0 && cs[i].w < minUnitW) minUnitW = cs[i].w;
            if (!isFinite(minUnitW)) minUnitW = w;
            if (cs.length === 1 || space > 0.5 * minUnitW) {
                const dx = space / 2;
                for (let i = 0; i < places.length; i++) places[i].x += dx;
            } else if (cs.length > 1) {
                // 等间隔铺开：第 i 个 cadrat 及其后的 place 右移 i * gap
                const gap = space / (cs.length - 1);
                let acc = 0, ci = 0;
                const bounds = [];
                let bx = 0;
                for (let i = 0; i < cs.length; i++) { bounds.push(bx); bx += cs[i].w + SMALL_SKIP; }
                for (let i = 0; i < places.length; i++) {
                    while (ci + 1 < bounds.length && places[i].x >= bounds[ci + 1] - 1e-9) ci++;
                    acc = gap * ci;
                    places[i].x += acc;
                }
            }
            w = targetW;
        }

        let minY = 0;
        for (let i = 0; i < places.length; i++) if (places[i].y < minY) minY = places[i].y;
        return { w: w, h: h, minY: minY, maxH: h, places: places };
    }

    // 把 places 压平成绝对定位（em 口径）；内嵌括号组递归展开
    function flatten(laid) {
        const out = [];
        function walk(p) {
            if (p.elem && p.elem.type === "group") {
                const inner = layoutLine(p.elem.cadrats, { centerSigns: false, embedded: true });
                const sx = p.w / (inner.w || 1), sy = p.h / (inner.h || 1);
                inner.places.forEach(function (q) {
                    walk({ x: p.x + q.x * sx, y: p.y + q.y * sy, w: q.w * sx, h: q.h * sy, elem: q.elem });
                });
            } else if (p.elem) {
                out.push({ x: p.x, y: p.y, w: p.w, h: p.h, unit: p.elem.unit, text: p.elem.text, asc: p.asc, nh: p.nh, sx: p.sx });
            }
        }
        (laid.places || []).forEach(walk);
        return out;
    }


    /** 把一行文本按四开组结构渲染成 DOM（.vrg + .vrg-part 绝对定位） */
    function renderLine(parent, text, fontSize, opts) {
        const o = opts || {};
        const parseElement = o.parseElement || function (str) { return { type: "char", code: str }; };
        const cadrats = parse(text, parseElement);
        const laid = layoutLine(cadrats, { justifyWidth: o.justifyWidth, centerSigns: o.centerSigns, embedded: o.embedded });
        const flat = flatten(laid);
        const box = document.createElement("span");
        box.className = "vrg";
        box.style.cssText = "position:relative;display:inline-block;vertical-align:bottom;" +
            "line-height:0;font-size:" + fontSize + "px;width:" + (laid.w * fontSize) + "px;height:" + (laid.h * fontSize) + "px;";
        const renderUnit = o.renderUnit || (MDC.host && MDC.host.render);
        parent.appendChild(box);   // 先入文档，后面的尺寸才量得到
        flat.forEach(function (p) {
            const el = document.createElement("span");
            el.className = "vrg-part";
            el.style.cssText = "position:absolute;line-height:0;left:" + (p.x * fontSize) + "px;top:" +
                (p.y * fontSize) + "px;width:" + (p.w * fontSize) + "px;height:" + (p.h * fontSize) + "px;";
            box.appendChild(el);
            // JSesh QuadratLayout:109-119：wide 的行走 scaleToWidth(maxw)，
            // 只改 xScale（横向拉伸），yScale 不变 —— 这里用 scaleX 等价表达。
            if (p.sx && Math.abs(p.sx - 1) > 0.001) {
                const t = el.querySelector(".txt");
                if (t) { t.style.transformOrigin = "left bottom"; t.style.transform = "scaleX(" + p.sx + ")"; }
            }
            if (p.unit && renderUnit) {
                renderUnit(p.unit, el, fontSize);
                // JSesh 里文本是 view，随 xScale/yScale 一起缩放；
                // 我们的文本是绝对 px 字号，这里用「按 place 缩放比缩字号」等价实现。
                if (p.nh > 0) {
                    const k = p.h / p.nh;
                    const txtEl = el.querySelector(".txt");
                    if (txtEl && Math.abs(k - 1) > 0.001) {
                        const cur = parseFloat(txtEl.style.fontSize) || 0;
                        if (cur > 0) txtEl.style.fontSize = (cur * k) + "px";
                    }
                }
                // 王名圈等"自带几何尺寸"的单元：按其自然尺寸与本格尺寸的比值整体缩放
                // （JSesh 里 Cartouche 是 Cadrat 的一个 element，QuadratLayout:194-195 的
                //   reScale 作用在整棵子树上，框与框内内容一起缩）
                const hies = el.querySelectorAll(".hie");
                if (hies.length === 1 && el.children.length === 1) {
                    const hie = hies[0];
                    const overlay = hie.querySelector("svg,img");
                    const bg = hie.style.backgroundImage;
                    const isSvg = !!overlay || (bg && bg !== "none");
                    if (isSvg) {
                        // SVG 字形：字形盒拉满部件盒（墨迹=部件盒）
                        hie.style.position = "absolute";
                        hie.style.left = "0px";
                        hie.style.top = "0px";
                        hie.style.margin = "0px";
                        hie.style.width = "100%";
                        hie.style.height = "100%";
                        hie.style.backgroundSize = "100% 100%";
                        hie.style.backgroundPosition = "left top";
                    } else {
                        // NewGardiner 字体字形：尺寸由 font-size 决定，只把它摆到部件盒底边
                        hie.style.position = "absolute";
                        hie.style.left = "0px";
                        hie.style.display = "block";
                        hie.style.lineHeight = "1";
                        hie.style.margin = "0px";
                        hie.style.verticalAlign = "baseline";
                        // 墨迹下沉量（descent）要补掉，否则字形会压到下一行
                        let desc = 0;
                        if (MDC.fontInk) {
                            const ink = MDC.fontInk(hie.textContent || "");
                            if (ink && ink.descent) desc = ink.descent / 1000;
                        }
                        hie.style.bottom = (-desc * fontSize) + "px";
                        fitFontGlyph(hie, p.w * fontSize, p.h * fontSize, p.unit);
                    }
                } else {
                    fitContent(el, p.w * fontSize, p.h * fontSize);
                }
            }
        });
        return box;
        return laid;
    }

    /**
     * 字体字形（NewGardiner）：尺寸由 font-size 决定，无法像 SVG 那样拉伸，
     * 因此只在"行盒明显超出部件盒"时做一次性等比缩小，避免溢出。
     */
    function fitFontGlyph(hie, targetW, targetH, unit) {
        const r = hie.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const s = Math.min(
            targetW > 0 ? targetW / r.width : 1,
            targetH > 0 ? targetH / r.height : 1
        );
        if (!isFinite(s) || s <= 0 || s >= 0.999) return;
        hie.style.transformOrigin = "left bottom";
        hie.style.transform = "scale(" + s + ")";
    }

    /**
     * 把 el 的内容等比缩放进 targetW×targetH（连字、层叠组、王名圈等复合单元）。
     * 单字形走上面的 100% 拉伸，复合结构走这里做整体缩放，避免溢出部件盒。
     */
    function fitContent(el, targetW, targetH) {
        const kids = [].slice.call(el.children || []);
        if (!kids.length || !targetW || !targetH) return;
        const base = el.getBoundingClientRect();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        kids.forEach(function (k) {
            const r = k.getBoundingClientRect();
            if (!r.width && !r.height) return;
            if (r.left < minX) minX = r.left;
            if (r.top < minY) minY = r.top;
            if (r.right > maxX) maxX = r.right;
            if (r.bottom > maxY) maxY = r.bottom;
        });
        if (!isFinite(minX) || maxX <= minX || maxY <= minY) return;
        // 只缩内容，不缩容器：
        // 把 transform 下到唯一子元素（.tksesh 包装盒）上，
        // 否则连容器自己的盒一起缩，整组会变成 0.79em 而不是 1em。
        const host = (kids.length === 1) ? kids[0] : el;
        const s = Math.min(targetW / (maxX - minX), targetH / (maxY - minY), 1);
        if (!isFinite(s) || s <= 0) return;
        if (s > 0.999) return;                       // 没超出就不动
        const tx = (host === el) ? -(minX - base.left) : 0;
        const ty = (host === el) ? -(minY - base.top) : 0;
        host.style.transformOrigin = "left top";
        host.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
    }

    MDC.Cadrat = {
        SMALL_SKIP: SMALL_SKIP,
        lineSkip: GEOM.lineSkip,
        topMargin: GEOM.topMargin,
        leftMargin: GEOM.leftMargin,
        textWidth: GEOM.textWidth,
        MAX_CADRAT_HEIGHT: MAX_CADRAT_HEIGHT,
        MAX_CADRAT_WIDTH: MAX_CADRAT_WIDTH,
        parse: parse,
        splitTop: splitTop,
        layoutCadrat: layoutCadrat,
        layoutLine: layoutLine,
        layoutRow: layoutRow,
        measureElement: measureElement,
        flatten: flatten,
        renderLine: renderLine
    };
})(window);
