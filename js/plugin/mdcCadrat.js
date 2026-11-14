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
    const MAX_CADRAT_HEIGHT = 1;    // maxCadratHeight = 18/18
    const MAX_CADRAT_WIDTH = 22 / 18;

    function measure(u) {
        if (MDC.measureUnitEm) {
            const m = MDC.measureUnitEm(u);
            // 度量失败或退化成极小值（例如连字名查不到表）时按 1em 方盒处理，
            // 否则部件会被压成几个像素，看起来"框内什么都没有"。
            if (m && m.w > 0.05 && m.h > 0.05) return { w: m.w, h: m.h };
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
        const cadratTexts = splitTop(text, ["-", " "]);
        return cadratTexts.map(function (ct) {
            const rows = splitTop(ct, [":"]).map(function (rt) {
                const elems = splitTop(rt, ["*"]).map(function (et) {
                    if (et.charAt(0) === "(" && et.charAt(et.length - 1) === ")") {
                        const inner = et.slice(1, -1);
                        return { type: "group", cadrats: parse(inner, parseElement) };
                    }
                    return { type: "unit", unit: parseElement(et), text: et };
                });
                return elems;
            });
            return { hboxes: rows };
        });
    }

    /* ---------- 布局：逐层照抄 ---------- */

    function measureElement(el) {
        if (el.type === "group") {
            const laid = layoutLine(el.cadrats, { centerSigns: false, embedded: true });
            return { w: laid.w, h: laid.h };
        }
        const m = measure(el.unit);
        return { w: m.w, h: m.h };
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
        heightOfA1: 18 / 18              // getHeightOfA1()：名义 A1 高 = 18 单位 = 1em
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
        const places = [];
        let x = 0;
        for (let i = 0; i < ms.length; i++) {
            if (i > 0) x += GEOM.smallSkip;
            places.push({ x: x, y: h - ms[i].h, w: ms[i].w, h: ms[i].h, elem: elems[i] });
            x += ms[i].w;
        }
        return { w: w, h: h, y: 0, places: places };
    }

    /** HBox.containsOnlyOneSign()：整行只有一个元素时，返回它的度量 */
    function loneSignOf(elems) {
        return elems.length === 1 ? measureElement(elems[0]) : null;
    }

    /** "大字形"：宽 ≥ largeSignSizeRatio × A1 高（Cadrat.isWide 的判据） */
    function isLargeSign(m) {
        return !!m && m.w >= GEOM.largeSignSizeRatio * GEOM.heightOfA1;
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

        // Cadrat.isWide()：只有一行，或某行含"大字形"
        let wide = (rows.length === 1);
        if (!wide) {
            for (let k = 0; k < rows.length; k++) {
                if (isLargeSign(loneSignOf(hboxes[k]))) { wide = true; break; }
            }
        }

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
                if (isLargeSign(loneSignOf(hboxes[k]))) scaleToWidth(rows[k], maxw);
            }
        } else {
            let width = 0;
            for (let k = 0; k < rows.length; k++) if (rows[k].w > width) width = rows[k].w;
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
        return { w: w, h: h, places: places };
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
                out.push({ x: p.x, y: p.y, w: p.w, h: p.h, unit: p.elem.unit, text: p.elem.text });
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
        const laid = layoutLine(cadrats, o);
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
            if (p.unit && renderUnit) {
                renderUnit(p.unit, el, fontSize);
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
