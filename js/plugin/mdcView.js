/* ============================================================================
 * mdcView.js —— JSesh MDCView 的 HTML 适配版
 * ----------------------------------------------------------------------------
 * 严格对应 jsesh/render/view/MDCView.java 的几何语义：
 *
 *   · 每个视图持 x、y、width、height、xScale、yScale、angle 与子视图表；
 *   · **布局在"内部坐标"里做**（见 getInternalWidth/Height），缩放是视图
 *     自身的属性，绘制时才施加 —— 这是 JSesh 的核心设计，也是此前
 *     "按 1em 包装盒对齐" 问题的根源；
 *   · reScale() 只改自身与外部尺寸，**不移动子视图坐标**（子视图坐标本就
 *     处在内部坐标系中）；
 *   · 坐标 y 自**顶向下**增长（stickSubViewsTo(BOTTOM) → y = internalH − h）。
 *
 * 与 Java 版的差异只在"模型"层：Java 的 model 是 ModelElement，这里是一个
 * 渲染单位 { type, code, ... }；其余方法逐一对齐。
 * ==========================================================================*/

(function (global) {
    "use strict";

    const MDC = global.MDC = global.MDC || {};

    /** 视图对齐方向（对应 jsesh.render.view.ViewSide） */
    const ViewSide = { START: "start", END: "end", TOP: "top", BOTTOM: "bottom" };

    class MDCView {
        constructor(model) {
            this.model = model || null;
            this.parent = null;
            this.children = [];
            this.x = 0;
            this.y = 0;
            this.width = 0;
            this.height = 0;
            this.xScale = 1;
            this.yScale = 1;
            this.angle = 0;
            this.deltaBaseX = 0;
            this.deltaBaseY = 0;
            this.wide = false;
        }

        // —— 结构 ——
        add(sub) { sub.parent = this; this.children.push(sub); return sub; }
        getNumberOfSubviews() { return this.children.length; }
        getSubView(i) { return this.children[i]; }
        getFirstSubView() { return this.children[0] || null; }
        getLastSubView() { return this.children[this.children.length - 1] || null; }

        // —— 尺寸（外部 / 内部）——
        getWidth() { return this.width; }
        getHeight() { return this.height; }
        setWidth(w) { this.width = w; }
        setHeight(h) { this.height = h; }
        getInternalWidth() { return this.xScale ? this.width / this.xScale : 0; }
        getInternalHeight() { return this.yScale ? this.height / this.yScale : 0; }

        getMaximalWidthOfSubView() {
            let r = 0;
            for (const v of this.children) if (r < v.getWidth()) r = v.getWidth();
            return r;
        }
        getMaximalHeightOfSubView() {
            let r = 0;
            for (const v of this.children) if (r < v.getHeight()) r = v.getHeight();
            return r;
        }
        getSumOfSubViewsWidths() {
            let s = 0;
            for (const v of this.children) s += v.getWidth();
            return s;
        }
        getSumOfSubViewsHeights() {
            let s = 0;
            for (const v of this.children) s += v.getHeight();
            return s;
        }

        // —— 缩放（对应 MDCView.java:695-825）——
        reScale(scale) {
            this.xScale = scale * this.xScale;
            this.yScale = scale * this.yScale;
            this.width = this.width * scale;
            this.height = this.height * scale;
        }
        scaleForMaxHeight(maxHeight) {
            if (maxHeight === 0) return;
            if (this.height > maxHeight) this.reScale(maxHeight / this.height);
        }
        scaleForMaxWidth(maxWidth) {
            if (maxWidth === 0) return;
            if (this.width > maxWidth) this.reScale(maxWidth / this.width);
        }
        scaleSubViewsToWidth(maxWidth) { for (const v of this.children) v.scaleForMaxWidth(maxWidth); }
        scaleSubViewToHeight(maxHeight) { for (const v of this.children) v.scaleForMaxHeight(maxHeight); }

        /**
         * 等比缩到目标框内（MDCView.java:796-808）。
         * 只有"两维都小于目标"才不动；否则按 min(w/width, h/height) 缩放，
         * 进入条件保证这个比例 ≤ 1，因此**恒为缩小**。
         */
        scaleToFitDimensions(wantedWidth, wantedHeight) {
            if (this.width < wantedWidth && this.height < wantedHeight) return;
            let sw = 1, sh = 1;
            if (this.width !== 0) sw = wantedWidth / this.width;
            if (this.height !== 0) sh = wantedHeight / this.height;
            const s = Math.min(sh, sw);
            this.xScale = this.yScale = s;
            this.width = this.width * s;
            this.height = this.height * s;
        }

        /** 纯横向拉伸（MDCView.java:817-825）：`\l` 宽符号专用 */
        scaleToWidth(w) {
            const iw = this.getInternalWidth();
            if (iw !== 0) { this.xScale = w / iw; this.width = w; }
            else { this.xScale = 1; this.width = w; }
        }

        // —— 分布（MDCView.java:224-390、950-992）——
        centerSubViewHorizontally() {
            for (const sub of this.children) {
                const space = (this.getInternalWidth() - sub.getWidth()) / 2;
                sub.x = space;
            }
        }
        centerSubViewsVertically() {
            for (const sub of this.children) {
                const space = (this.getInternalHeight() - sub.getHeight()) / 2;
                sub.y = space;
            }
        }
        /** 纵向填满：interSpace 用**内部**高度算，可为负（允许重叠） */
        distributeFromTopToBottom() {
            if (this.children.length <= 1) return;
            const minH = this.getSumOfSubViewsHeights();
            const interSpace = (this.getInternalHeight() - minH) / (this.children.length - 1);
            let y = 0;
            for (const v of this.children) {
                v.y = y;
                y += v.getHeight() + interSpace;
            }
        }
        /** 横向填满：每个子视图先 resetPos（x、y 都清零）再设 x */
        distributeHorizontally() {
            const n = this.children.length;
            if (n <= 1) return;
            const minW = this.getSumOfSubViewsWidths();
            const interSpace = (this.getInternalWidth() - minW) / (n - 1);
            let x = 0;
            for (const v of this.children) {
                v.x = 0; v.y = 0;
                v.x = x;
                x += v.getWidth() + interSpace;
            }
        }
        /** 收缩到子视图的实际包围盒（doTranslate 为真时把 minX/minY 平移到 0） */
        fitToSubViews(doTranslate) {
            if (this.children.length === 0) { this.width = 0; this.height = 0; return; }
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const v of this.children) {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x + v.getWidth());
                maxY = Math.max(maxY, v.y + v.getHeight());
            }
            if (doTranslate) {
                for (const v of this.children) { v.x -= minX; v.y -= minY; }
                this.width = (maxX - minX) * this.xScale;
                this.height = (maxY - minY) * this.yScale;
            } else {
                this.width = maxX * this.xScale;
                this.height = maxY * this.yScale;
            }
        }
        /** 贴边（BOTTOM 用 internalHeight；END 用 getWidth —— 源码即如此，照抄） */
        stickSubViewsTo(side) {
            for (const sub of this.children) {
                if (side === ViewSide.BOTTOM) sub.y = this.getInternalHeight() - sub.getHeight();
                else if (side === ViewSide.TOP) sub.y = 0;
                else if (side === ViewSide.END) sub.x = this.getWidth() - sub.getWidth();
                else sub.x = 0;
            }
        }
        /** 自顶依次排列（不填满），末尾 fitToSubViews(true) */
        stackTop(skip) {
            let y = 0;
            for (const v of this.children) {
                v.x = 0; v.y = 0;
                v.y = y;
                y += v.getHeight() + skip;
            }
            this.fitToSubViews(true);
        }
        /** 把子 SubCadrat 撑到本视图高度再纵排（MDCView.java:900-910） */
        setSubViewsToHeight() {
            const h = this.getInternalHeight();
            for (const sub of this.children) {
                if (sub.model && sub.model.isSubCadrat) {
                    sub.setHeight(h);
                    sub.distributeFromTopToBottom();
                }
            }
            this.stickSubViewsTo(ViewSide.BOTTOM);
        }
    }

    MDC.View = MDCView;
    MDC.ViewSide = ViewSide;

    /** 递归展开成"绝对定位列表"：把嵌套视图压平成 {x,y,w,h,fs,unit}（px 由调用方给） */
    MDC.flattenView = function (view, pxPerUnitX, pxPerUnitY, ox, oy, out) {
        for (const child of view.children) {
            const absX = ox + child.x * pxPerUnitX;
            const absY = oy + child.y * pxPerUnitY;
            if (child.children.length) {
                MDC.flattenView(child, pxPerUnitX * child.xScale, pxPerUnitY * child.yScale, absX, absY, out);
            } else {
                out.push({
                    x: absX,
                    y: absY,
                    w: child.width * pxPerUnitX,
                    h: child.height * pxPerUnitY,
                    fs: pxPerUnitX * child.xScale,
                    unit: child.model
                });
            }
        }
        return out;
    };

})(typeof window !== "undefined" ? window : this);
