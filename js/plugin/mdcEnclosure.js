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

    const FINE_WIDTH = 0.5 / 18;
    const BASTION_LENGTH = 4 * EM;      // bastionLength = 4

    /** 塞拉赫尾端「宫殿立面」——照 SerekhDrawer.drawSerekhEnd（横排） */
    function serekhEnd(p1, p2, pa, pb, thick, fine) {
        const L = function (arr, ax, ay, bx, by) {
            arr.push("M" + n(ax) + " " + n(ay) + "L" + n(bx) + " " + n(by));
        };
        const dxv = pa[0] - p1[0], dyv = p2[1] - p1[1];
        // 两条檐线
        L(thick, p1[0], p1[1], pa[0], pa[1]);
        L(thick, p2[0], p2[1], pb[0], pb[1]);
        // 立面上的三道竖线：10% 粗线，30%/40% 细线
        const l1x = p1[0] + dxv * 0.1, l2x = p1[0] + dxv * 0.3, l3x = p1[0] + dxv * 0.4;
        L(thick, l1x, p1[1], l1x, p2[1]);
        L(fine, l2x, p1[1], l2x, p2[1]);
        L(fine, l3x, p1[1], l3x, p2[1]);
        // 壁龛：i = 1,4,7
        const recessX = p1[0] + dxv * 0.5, endX = pa[0];
        for (let i = 1; i < 10; i += 3) {
            const y1 = p1[1] + 0.1 * dyv * i;
            const y2 = p1[1] + 0.1 * dyv * (i + 1);
            const y3 = p1[1] + 0.1 * dyv * (i + 2);
            L(fine, recessX, y1, endX, y1);
            L(fine, recessX, y3, endX, y3);
            L(fine, recessX, y1, recessX, y3);
            const innerX = recessX + 0.2 * (endX - recessX);
            L(fine, innerX, y2, endX, y2);
        }
    }

    /** 塞拉赫（横排）：两端按 CartouchePart 画「小屋端」或「宫殿立面」 */
    function serekhPath(W, H, startPart, endPart) {
        const dy = LINE_WIDTH / 2, dx = LINE_WIDTH / 2;
        const w1 = partLength("s", startPart), w2 = partLength("s", endPart);
        const p1 = [w1, dy], p2 = [w1, H - dy], p3 = [W - w2, dy], p4 = [W - w2, H - dy];
        const thick = [], fine = [];
        const L = function (arr, ax, ay, bx, by) {
            arr.push("M" + n(ax) + " " + n(ay) + "L" + n(bx) + " " + n(by));
        };
        if (startPart !== NONE) {
            if (startPart === FIRST) {                 // 小屋端
                L(thick, dx, dy, dx, H - dy);
                L(thick, dx, dy, p1[0], p1[1]);
                L(thick, dx, H - dy, p2[0], p2[1]);
            } else {
                serekhEnd(p1, p2, [dx, dy], [dx, H - dy], thick, fine);
            }
        }
        L(thick, p1[0], p1[1], p3[0], p3[1]);
        L(thick, p2[0], p2[1], p4[0], p4[1]);
        if (endPart !== NONE) {
            if (endPart === FIRST) {
                L(thick, W - dx, dy, W - dx, H - dy);
                L(thick, W - dx, dy, p3[0], p3[1]);
                L(thick, W - dx, H - dy, p4[0], p4[1]);
            } else {
                serekhEnd(p3, p4, [W - dx, dy], [W - dx, H - dy], thick, fine);
            }
        }
        return { d: thick.join(" "), dFine: fine.join(" "), stroke: LINE_WIDTH, fineStroke: FINE_WIDTH };
    }


    /** 城堡框（CASTLE）：照 EnclosureDrawer.drawEnclosure（横排，四边全画） */
    function castlePath(W, H) {
        const bL = BASTION_LENGTH, bD = BASTION_DEPTH;
        const sides = [];
        const fills = [];
        const L = function (ax, ay, bx, by) {
            sides.push("M" + n(ax) + " " + n(ay) + "L" + n(bx) + " " + n(by));
        };
        const R = function (x, y, w, h) {
            if (w > 0 && h > 0) fills.push([x, y, w, h]);
        };
        // 内框（四边各让出碉堡进深）
        const topX = bD, topY = bD;
        const innerW = W - 2 * bD, innerH = H - 2 * bD;
        const tl = [topX, topY], bl = [topX, topY + innerH];
        const tr = [topX + innerW, topY], br = [topX + innerW, topY + innerH];
        L(tl[0], tl[1], tr[0], tr[1]);
        L(bl[0], bl[1], br[0], br[1]);
        L(tl[0], tl[1], bl[0], bl[1]);
        L(tr[0], tr[1], br[0], br[1]);

        // 边上的碉堡分布：n = floor((l − 3b)/(2b))，间距 = (l − (n+2)b)/(n+1)
        function info(len) {
            let cnt = Math.floor((len - 3 * bL) / (2 * bL));
            let skip;
            if (cnt < 0) cnt = 0;
            skip = (len - (cnt + 2) * bL) / (cnt + 1);
            if (cnt === 1) { cnt = 0; skip = 0; }
            return { n: cnt, skip: skip };
        }
        const hInfo = info(innerW), vInfo = info(innerH);

        // 上下两条边：顶边碉堡向外（y = topY − bD），底边向外（y = bl.y）
        let x = tl[0] + hInfo.skip + bL;
        for (let i = 0; i < hInfo.n; i++) { R(x, topY - bD, bL, bD); x += bL + hInfo.skip; }
        x = bl[0] + hInfo.skip + bL;
        for (let i = 0; i < hInfo.n; i++) { R(x, bl[1], bL, bD); x += bL + hInfo.skip; }
        // 左右两条边
        let y = tl[1] + vInfo.skip + bL;
        for (let i = 0; i < vInfo.n; i++) { R(tl[0] - bD, y, bD, bL); y += bL + vInfo.skip; }
        y = tr[1] + vInfo.skip + bL;
        for (let i = 0; i < vInfo.n; i++) { R(tr[0], y, bD, bL); y += bL + vInfo.skip; }

        // 四角碉堡（L 形）
        R(tl[0] - bD, tl[1] - bD, bD + bL, bD);
        R(tl[0] - bD, tl[1] - bD, bD, bD + bL);
        R(bl[0] - bD, bl[1] - bL, bD, bL);
        R(bl[0] - bD, bl[1], bD + bL, bD);
        R(tr[0] - bL, tr[1] - bD, bD + bL, bD);
        R(tr[0], tr[1] - bD, bD, bD + bL);
        R(br[0], br[1] - bL, bD, bL);
        R(br[0] - bL, br[1], bD + bL, bD);

        return { d: sides.join(" "), fills: fills, stroke: LINE_WIDTH };
    }

    function enclosurePath(type, startPart, endPart, W, H, vertical) {
        if (type === "f" && !vertical) return castlePath(W, H);
        if (type === "s" && !vertical) return serekhPath(W, H, startPart, endPart);
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
        if (p.fills) {
            for (let i = 0; i < p.fills.length; i++) {
                const f = p.fills[i];
                const rect = document.createElementNS(svgNs, "rect");
                rect.setAttribute("x", String(n(f[0])));
                rect.setAttribute("y", String(n(f[1])));
                rect.setAttribute("width", String(n(f[2])));
                rect.setAttribute("height", String(n(f[3])));
                rect.setAttribute("fill", "currentColor");
                rect.setAttribute("stroke", "none");
                svg.appendChild(rect);
            }
        }
        if (p.dFine) {
            const fine = document.createElementNS(svgNs, "path");
            fine.setAttribute("d", p.dFine);
            fine.setAttribute("fill", "none");
            fine.setAttribute("stroke", "currentColor");
            fine.setAttribute("stroke-width", String(n(p.fineStroke)));
            svg.appendChild(fine);
        }
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
