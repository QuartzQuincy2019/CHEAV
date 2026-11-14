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
            if (m && m.w > 0) return { w: m.w, h: m.h };
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
    function layoutRow(elems, width) {
        const ms = elems.map(measureElement);
        let w = 0, h = 0;
        for (let i = 0; i < ms.length; i++) {
            w += ms[i].w + (i > 0 ? SMALL_SKIP : 0);
            if (ms[i].h > h) h = ms[i].h;
        }
        const W = (typeof width === "number" && width > w) ? width : w;
        const places = [];
        let x = 0;
        for (let i = 0; i < ms.length; i++) {
            if (i > 0) x += SMALL_SKIP;
            const y = h - ms[i].h;              // stickSubViewsTo(BOTTOM)
            places.push({ x: x, y: y, w: ms[i].w, h: ms[i].h, elem: elems[i] });
            x += ms[i].w;
        }
        if (elems.length === 1 && W > w) {      // centerSubViewHorizontally
            places[0].x = (W - places[0].w) / 2;
        }
        return { w: W, h: h, places: places };
    }

    // 一个四开组（Cadrat）：行栈 + 1em 下限 + 超高缩放
    function layoutCadrat(cad, ctx) {
        const centre = !!(ctx && ctx.centerSigns);
        const rows = cad.hboxes.map(function (hb) { return layoutRow(hb); });

        let w = 0;
        for (let i = 0; i < rows.length; i++) if (rows[i].w > w) w = rows[i].w;

        let h = 0;
        for (let i = 0; i < rows.length; i++) h += rows[i].h + (i > 0 ? SMALL_SKIP : 0);

        // QuadratLayout:174-190 —— 行宽补到 cadrat 宽 w，再决定居中/均分
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.w >= w - 1e-9) continue;
            if (row.places.length === 1) {
                row.places[0].x += (w - row.places[0].w) / 2;          // centerSubViewHorizontally
            } else {
                let sum = 0;
                for (let k = 0; k < row.places.length; k++) sum += row.places[k].w;
                const gap = (w - sum) / (row.places.length - 1);       // distributeHorizontally
                let x = 0;
                for (let k = 0; k < row.places.length; k++) {
                    row.places[k].x = x;
                    x += row.places[k].w + gap;
                }
            }
            row.w = w;
        }

        const places = [];
        if (rows.length > 1) {
            // distributeFromTopToBottom
            let y = 0;
            for (let i = 0; i < rows.length; i++) {
                for (let k = 0; k < rows[i].places.length; k++) {
                    const p = rows[i].places[k];
                    places.push({ x: p.x, y: y + p.y, w: p.w, h: p.h, elem: p.elem });
                }
                y += rows[i].h + SMALL_SKIP;
            }
            if (h < MAX_CADRAT_HEIGHT) {
                // 多行但不足 1em：把整栈下移贴底
                const dy = MAX_CADRAT_HEIGHT - h;
                for (let i = 0; i < places.length; i++) places[i].y += dy;
                h = MAX_CADRAT_HEIGHT;
            }
        } else {
            h = rows.length ? rows[0].h : 0;
            if (h < MAX_CADRAT_HEIGHT) h = MAX_CADRAT_HEIGHT;
            const row = rows[0];
            if (row) {
                const dy = centre ? (h - row.h) / 2 : (h - row.h);   // 居中 / 贴底
                for (let k = 0; k < row.places.length; k++) {
                    const p = row.places[k];
                    places.push({ x: p.x, y: dy + p.y, w: p.w, h: p.h, elem: p.elem });
                }
            }
        }

        let scale = 1;
        if (h > MAX_CADRAT_HEIGHT) {            // honourMaxHeight && h > max
            scale = MAX_CADRAT_HEIGHT / h;
            h = MAX_CADRAT_HEIGHT;
            w = w * scale;
            for (let i = 0; i < places.length; i++) {
                places[i].x *= scale; places[i].y *= scale;
                places[i].w *= scale; places[i].h *= scale;
            }
        }
        return { w: w, h: h, scale: scale, places: places };
    }

    // 一行里的若干 cadrat：横向串联、顶对齐（visitDefault）
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
                const enc = el.querySelector(".enc-js");
                if (enc) {
                    const nw = parseFloat(enc.style.width), nh = parseFloat(enc.style.height);
                    const pw = p.w * fontSize, ph = p.h * fontSize;
                    if (nw > 0 && nh > 0 && (Math.abs(pw - nw) > 0.5 || Math.abs(ph - nh) > 0.5)) {
                        const r = Math.min(pw / nw, ph / nh);
                        enc.style.transformOrigin = "0 0";
                        enc.style.transform = "scale(" + r + ")";
                    }
                }
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
        parent.appendChild(box);
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
        const s = Math.min(targetW / (maxX - minX), targetH / (maxY - minY));
        if (!isFinite(s) || s <= 0) return;
        const tx = -(minX - base.left), ty = -(minY - base.top);
        el.style.transformOrigin = "left top";
        el.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
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
