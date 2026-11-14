/* ============================================================================
 * mdcEnclosure.js —— 王名圈 / 框类包围（复刻 JSesh）
 * ----------------------------------------------------------------------------
 * 几何：jsesh/render/layout/Layout.java:404-467 (visitCartouche)
 * 绘制：jsesh/render/elements/cartouche/NormalCartoucheDrawer.java
 * 长度：jsesh/render/style/CartoucheSizeHelper.java
 * 常量：jsesh/render/style/GeometrySpecification.java (DEFAULT)
 *
 * 单位约定：**1 单位 = 1/18 em**。本模块内部一律用 em（已除 18），
 * 绘制用 SVG viewBox = em 单位，故 stroke-width 直接写 1/18。
 * ==========================================================================*/

(function (global) {
    "use strict";

    const MDC = global.MDC = global.MDC || {};

    // —— GeometrySpecification.DEFAULT（em）——
    const EM = 1 / 18;                       // 1 单位
    const LINE_WIDTH = 1 * EM;               // cartoucheLineWidth = 1
    const LOOP_LENGTH = 10 * EM;             // cartoucheLoopLength = 10
    const MARGIN = 2 * EM;                   // cartoucheMargin = 2
    const HWT_SMALL_MARGIN = 3 * EM;         // hwtSmallMargin = 3
    const SEREKH_DOOR_SIZE = 20 * EM;        // serekhDoorSize = 20
    const BASTION_DEPTH = 3 * EM;            // bastionDepth = 3
    const MAX_CADRAT_HEIGHT = 1;             // 18 单位
    const MAX_CADRAT_WIDTH = 22 * EM;        // 22 单位

    // CartouchePart：0 NONE / 1 FIRST / 2 SECOND / 3 THIRD
    const NONE = 0, FIRST = 1, SECOND = 2, THIRD = 3;

    /**
     * 端头长度（CartoucheSizeHelper.computeCartouchePartLength）
     * @param {string} type c=王名圈 s=塞拉赫 h=HWT f=城堡 g=圆形
     * @param {number} part
     */
    function partLength(type, part) {
        if (part === NONE) return 0;
        switch (type) {
            case "c":                                  // CARTOUCHE
                return part === FIRST ? LOOP_LENGTH : LOOP_LENGTH + LINE_WIDTH;
            case "s":                                  // SEREKH
                return part === FIRST ? HWT_SMALL_MARGIN + LINE_WIDTH
                    : HWT_SMALL_MARGIN + LINE_WIDTH + SEREKH_DOOR_SIZE;
            case "h":                                  // HWT
                return part === FIRST ? HWT_SMALL_MARGIN + LINE_WIDTH
                    : SEREKH_DOOR_SIZE - SEREKH_DOOR_SIZE / 2;   // 14 单位
            case "f":                                  // CASTLE
                return HWT_SMALL_MARGIN + BASTION_DEPTH + LINE_WIDTH;
            case "g":                                  // CIRCULAR_ENCLOSURE
                return LOOP_LENGTH;
            default:
                return LOOP_LENGTH;
        }
    }

    /** 副轴长度（computeCartoucheSecondaryLength）：内容与框线之间两侧的余量总和用 2 倍 */
    function secondaryLength(type) {
        let d = MARGIN + LINE_WIDTH;                   // 3 单位
        if (type === "f") d += BASTION_DEPTH;
        return d;
    }

    /**
     * visitCartouche 的几何部分。
     * @param {string} type    c/s/h/f/g
     * @param {number} startPart CartouchePart
     * @param {number} endPart   CartouchePart
     * @param {number} subW    内容宽（em）
     * @param {number} subH    内容高（em）
     * @param {boolean} vertical 竖排
     * @returns {{w:number,h:number,x:number,y:number,w2:number,h2:number,dLong:number,dSmall:number}}
     */
    function enclosureGeometry(type, startPart, endPart, subW, subH, vertical) {
        const dSmall = secondaryLength(type);          // 3 单位 = 0.1667em
        const smallDim = 2 * dSmall;                   // 6 单位 = 0.3333em
        const dLong = partLength(type, startPart);
        const longDim = dLong + partLength(type, endPart);

        let w, h, x, y;
        if (!vertical) {
            w = subW + longDim;
            h = Math.max(subH + smallDim, MAX_CADRAT_HEIGHT + smallDim);
            x = dLong;
            y = dSmall;
        } else {
            h = subH + longDim;
            w = (subW < MAX_CADRAT_WIDTH + smallDim) ? MAX_CADRAT_WIDTH + smallDim : subW + smallDim;
            x = (w - subW) / 2;                        // innerMargin 居中
            y = dLong;
        }
        return { w: w, h: h, x: x, y: y, w2: subW, h2: subH, dLong: dLong, dSmall: dSmall };
    }

    function n(v) { return Math.round(v * 10000) / 10000; }

    /**
     * 绘制路径（NormalCartoucheDrawer.drawHorizontal / drawVertical）。
     * 返回 { d: path数据, stroke: 线宽 }，坐标原点在框的左上角，y 向下。
     */
    function enclosurePath(type, startPart, endPart, W, H, vertical) {
        const d = "M0 0";                       // 占位，实际下面拼
        const dy = LINE_WIDTH / 2;
        const dx = LINE_WIDTH / 2;
        const loopSkip = vertical ? LINE_WIDTH / 3 : LOOP_LENGTH / 3;
        const segs = [];
        const w1 = partLength(type, startPart);
        const w2 = partLength(type, endPart);

        if (!vertical) {
            const p1 = [w1, dy], p2 = [w1, H - dy], p3 = [W - w2, dy], p4 = [W - w2, H - dy];
            if (startPart !== NONE) {
                let p0x = dx;
                if (startPart === SECOND) {
                    p0x += LINE_WIDTH;
                    segs.push("M" + n(dx * 1.5) + " " + n(p1[1]) + "L" + n(dx * 1.5) + " " + n(p2[1]));
                }
                segs.push("M" + n(p1[0]) + " " + n(p1[1]) +
                    "C" + n(p0x - loopSkip) + " " + n(p1[1]) + " " +
                    n(p0x - loopSkip) + " " + n(p2[1]) + " " +
                    n(p2[0]) + " " + n(p2[1]));
            }
            segs.push("M" + n(p1[0]) + " " + n(p1[1]) + "L" + n(p3[0]) + " " + n(p3[1]));
            segs.push("M" + n(p2[0]) + " " + n(p2[1]) + "L" + n(p4[0]) + " " + n(p4[1]));
            if (endPart !== NONE) {
                let p0x = -dx;
                if (endPart === SECOND) {
                    p0x += -LINE_WIDTH;
                    segs.push("M" + n(W - dx * 1.5) + " " + n(p3[1]) + "L" + n(W - dx * 1.5) + " " + n(p4[1]));
                }
                segs.push("M" + n(p3[0]) + " " + n(p3[1]) +
                    "C" + n(W + loopSkip + p0x) + " " + n(p3[1]) + " " +
                    n(W + loopSkip + p0x) + " " + n(p4[1]) + " " +
                    n(p4[0]) + " " + n(p4[1]));
            }
        } else {
            const p1 = [W - dx, w1], p2 = [dx, w1], p3 = [W - dx, H - dy - w2], p4 = [dx, H - dy - w2];
            if (startPart !== NONE) {
                let p0x = dx;
                if (startPart === SECOND) {
                    p0x += LINE_WIDTH;
                    segs.push("M" + n(p2[0]) + " " + n(dy) + "L" + n(p1[0]) + " " + n(dy));
                }
                segs.push("M" + n(p1[0]) + " " + n(p1[1]) +
                    "C" + n(p1[0]) + " " + n(p0x - loopSkip) + " " +
                    n(p2[0]) + " " + n(p0x - loopSkip) + " " +
                    n(p2[0]) + " " + n(p2[1]));
            }
            segs.push("M" + n(p1[0]) + " " + n(p1[1]) + "L" + n(p3[0]) + " " + n(p3[1]));
            segs.push("M" + n(p2[0]) + " " + n(p2[1]) + "L" + n(p4[0]) + " " + n(p4[1]));
            if (endPart !== NONE) {
                let p0x = -dx;
                if (endPart === SECOND) {
                    p0x += -LINE_WIDTH;
                    segs.push("M" + n(p4[0]) + " " + n(H - dy * 1.5) + "L" + n(p3[0]) + " " + n(H - dy * 1.5));
                }
                segs.push("M" + n(p3[0]) + " " + n(p3[1]) +
                    "C" + n(p3[0]) + " " + n(H + loopSkip + p0x) + " " +
                    n(p4[0]) + " " + n(H + loopSkip + p0x) + " " +
                    n(p4[0]) + " " + n(p4[1]));
            }
        }
        return { d: segs.join(" "), stroke: LINE_WIDTH };
    }

    /** 把路径包成 SVG 元素（viewBox 用 em 单位，天然随字号缩放） */
    function enclosureSvg(type, startPart, endPart, W, H, vertical) {
        const p = enclosurePath(type, startPart, endPart, W, H, vertical);
        const svgNs = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNs, "svg");
        svg.setAttribute("viewBox", "0 0 " + n(W) + " " + n(H));
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;";
        const path = document.createElementNS(svgNs, "path");
        path.setAttribute("d", p.d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", String(n(p.stroke)));
        path.setAttribute("vector-effect", "none");
        svg.appendChild(path);
        return svg;
    }

    /** 类型字符 → CartouchePart 缺省（`<x>` = 起 FIRST、止 SECOND） */
    function defaultParts(type) {
        return { start: FIRST, end: SECOND };
    }

    MDC.Enclosure = {
        LINE_WIDTH, LOOP_LENGTH, MARGIN, MAX_CADRAT_HEIGHT, MAX_CADRAT_WIDTH,
        NONE, FIRST, SECOND, THIRD,
        partLength, secondaryLength,
        geometry: enclosureGeometry,
        path: enclosurePath,
        svg: enclosureSvg,
        defaultParts
    };

})(typeof window !== "undefined" ? window : this);
