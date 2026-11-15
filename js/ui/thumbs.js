// thumbs.js - CHEAV 界面的"字形缩略图"渲染（与 Rndr 插件解耦）
//
// 为什么单独一层：候选格、词汇匹配左列、IB 预览只需要"把几个字形按墨迹盒
// 摆成一行"，不需要四开组排版。之前复用 MdCRndr.renderText 把它们和 Rndr 的
// .vrg/.vrg-part 绝对定位结构绑在一起，结果任何 UI 微调都要跟渲染器搏斗。
//
// 这里只依赖两样数据：SVG_BOXES（墨迹盒，em）+ Glyphs.urlFor（SVG data URL）。
// 输出是纯 inline-block，父级 flex 就能居中，不需要任何定位 hack。
//
//   Thumbs.render(el, mdcString, sizeEm)   把 MdC 串里的码逐个画成缩略图
//   Thumbs.codes(mdcString)                取出码列表（调试用）
(function (global) {
    "use strict";

    const CODE_RE = /[A-Za-z][A-Za-z0-9]{0,6}|\d+/g;

    function codes(text) {
        const out = [];
        const s = String(text == null ? "" : text);
        let m;
        CODE_RE.lastIndex = 0;
        while ((m = CODE_RE.exec(s))) out.push(m[0]);
        return out;
    }

    function ink(code) {
        const boxes = global.SVG_BOXES || {};
        let b = boxes[code];
        if (!b) {
            const alias = (global.MDC_GLYPH_ALIAS || {})[code];
            if (alias && boxes[alias]) b = boxes[alias];
        }
        if (b && b.w > 0 && b.h > 0) return { w: b.w, h: b.h };
        // 兜底：1em 见方，至少不会把字形裁掉
        return { w: 1, h: 1 };
    }

    function urlOf(code) {
        try {
            if (global.Glyphs && typeof global.Glyphs.urlFor === "function") {
                return global.Glyphs.urlFor(code) || null;
            }
        } catch (e) { /* 忽略 */ }
        return null;
    }

    function charOf(code) {
        try {
            if (typeof global.decodeCode === "function") return global.decodeCode(code) || "";
        } catch (e) { /* 忽略 */ }
        return "";
    }

    function render(el, text, sizeEm) {
        if (!el) return null;
        const fs = sizeEm || 32;
        el.innerHTML = "";
        el.classList.add("thumb-box");

        const line = document.createElement("span");
        line.className = "thumb-line";
        el.appendChild(line);

        const missing = [];
        const list = codes(text);
        list.forEach(function (code) {
            const box = ink(code);
            const sign = document.createElement("span");
            sign.className = "thumb-sign";
            sign.setAttribute("data-code", code);
            sign.style.width = (box.w * fs).toFixed(2) + "px";
            sign.style.height = (box.h * fs).toFixed(2) + "px";

            const url = urlOf(code);
            if (url) {
                sign.style.backgroundImage = 'url("' + url + '")';
                sign.style.backgroundSize = "100% 100%";
                sign.style.backgroundRepeat = "no-repeat";
            } else {
                const ch = charOf(code);
                if (ch) sign.textContent = ch;
                else sign.classList.add("thumb-missing");
                sign.style.fontSize = (box.h * fs).toFixed(2) + "px";
                sign.style.lineHeight = (box.h * fs).toFixed(2) + "px";
                missing.push(code);
            }
            line.appendChild(sign);
        });

        if (!list.length) {
            line.textContent = String(text || "");
            line.style.fontSize = fs + "px";
        }

        // 字形还没载入时，触发一次预载，完成后重画（只重试一次，避免循环）
        if (missing.length && global.Glyphs && typeof global.Glyphs.preload === "function" && !el.__thumbRetry) {
            el.__thumbRetry = true;
            try {
                Promise.resolve(global.Glyphs.preload(missing)).then(function () {
                    el.__thumbRetry = false;
                    render(el, text, sizeEm);
                }, function () { el.__thumbRetry = false; });
            } catch (e) { el.__thumbRetry = false; }
        }
        return el;
    }

    global.Thumbs = { render: render, codes: codes, ink: ink };
})(window);
