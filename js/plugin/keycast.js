/*!
 * ============================================================================
 *  KeyCast — 按键展示插件（录屏演示用）
 * ----------------------------------------------------------------------------
 *  · 单文件、零依赖：自行注入样式、自行创建 DOM，可嵌入任意前端项目
 *  · 最简用法：<script src="keycast.js"></script>（默认自动初始化并显示）
 *  · 所有常量与默认配置集中在下方【一、常量与默认配置】，直接改即可
 *
 *  布局：视口一角（默认右下）竖向排列
 *        标题
 *        历史键帽（旧在上、新在下；越远越透明；条数可配置）
 *        ────────── 分隔线
 *        当前按键组合（独立成块，背景色可配置，默认浅黄）
 *
 *  用法示例：
 *    KeyCast.init({ position: "fixed", right: "24px", bottom: "24px" });
 *    KeyCast.set({ currentKeyBackground: "#ffd54f", historyLength: 5 });
 *    KeyCast.setEnabled(false);     // 临时隐藏（不销毁）
 *    KeyCast.destroy();             // 完全移除（DOM + 样式 + 事件）
 *
 *  API：init(options) / set(options) / setEnabled(bool) / show() / hide()
 *       toggle() / reset() / keys() / isVisible() / destroy()
 *
 *  说明：样式全部通过 CSS 自定义属性下发，运行期 set() 只改属性，不重建样式表。
 * ============================================================================
 */
(function (global) {
    "use strict";

    // ========================================================================
    // 一、常量与默认配置（全部集中于此，用户可自由指定）
    // ========================================================================

    /** 默认配置：init()/set() 传入的对象会按项覆盖。 */
    const DEFAULTS = {
        // ---------- 行为 ----------
        enabled: true,              // 是否显示（false = 初始化但不显示）
        autoInit: true,             // 脚本载入后自动初始化
        desktopOnly: true,          // 仅电脑端显示（精细指针，且视口足够宽）
        minViewportWidth: 900,      // desktopOnly 生效时的最小视口宽度（px）
        historyLength: 6,           // 按键历史记录条数（建议 3~6）
        minOpacity: 0.25,           // 最旧一个键的透明度（越远越透明）
        pagePaddingBottom: 0,       // 显示时为 <body> 预留的底部空间（px；0 = 不改动）
        mountTo: null,              // 挂载父节点（默认 document.body）

        // ---------- 外观：颜色 ----------
        boxBackground: "transparent",        // 按键框背景色（默认透明）
        currentKeyBackground: "#ffe08a",     // 当前按键的背景色（默认浅黄）
        currentKeyColor: "#111",             // 当前按键文字色
        historyKeyBackground: "#f7f7f7",     // 历史键帽背景色
        historyKeyColor: "#111",             // 历史键帽文字色
        titleColor: "#666",                  // 标题文字色
        dividerColor: "rgba(128,128,128,0.35)",  // 当前键块上方的分隔线

        // ---------- 外观：尺寸 ----------
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: 13,               // 键帽字号
        titleFontSize: 12,          // 标题字号
        keyPadding: "3px 8px",      // 键帽内边距
        keyMinWidth: 22,            // 键帽最小宽度
        keyRadius: 6,               // 键帽圆角
        keyShadow: "0 2px 0 rgba(0,0,0,0.25)",   // 键帽投影
        boxRadius: 10,              // 按键框圆角
        boxPadding: "8px 10px",     // 按键框内边距
        gap: 6,                     // 块间距
        keyGap: 4,                  // 键帽间距

        // ---------- 位置 ----------
        // position 可为 fixed / absolute / relative / sticky / static；
        // fixed/absolute 时 top/right/bottom/left 生效（"auto" = 不设置）。
        position: "fixed",
        top: "auto",
        right: "16px",
        bottom: "16px",
        left: "auto",
        zIndex: 9999,

        // ---------- 文案 ----------
        title: "Keys",              // 标题文字（置空字符串则不显示）
        keyNames: {                 // 功能键显示名
            " ": "Space", Backspace: "\u232b Backspace", Enter: "Enter", Tab: "Tab", Escape: "Esc",
            ArrowUp: "\u2191 Up", ArrowDown: "\u2193 Down", ArrowLeft: "\u2190 Left", ArrowRight: "\u2192 Right",
            Alt: "Alt", Control: "Ctrl", Shift: "Shift", Meta: "Meta", CapsLock: "CapsLock",
            Delete: "Del", Insert: "Ins", Home: "Home", End: "End", PageUp: "PgUp", PageDown: "PgDn",
            ContextMenu: "Menu",
        },
        modifierKeys: { Alt: "Alt", Control: "Ctrl", Shift: "Shift", Meta: "Meta" },  // 参与"组合键"的修饰键

        // ---------- 其它 ----------
        injectStyle: true,          // 自动注入样式（false = 自备样式，类名见 CSS_TEMPLATE）
    };

    /** 注入样式表的 id（重复 init 不会重复注入）。 */
    const STYLE_ID = "keycast-style";
    /** 根节点 class（用户自备样式时可据此覆写）。 */
    const ROOT_CLASS = "kc-root";

    /**
     * 注入的样式模板：所有可变项均走 CSS 自定义属性（--kc-*），
     * 由 applyVars() 依据配置写入根节点，运行期 set() 无需重建样式表。
     */
    const CSS_TEMPLATE = `
.${ROOT_CLASS} {
    position: var(--kc-position);
    top: var(--kc-top);
    right: var(--kc-right);
    bottom: var(--kc-bottom);
    left: var(--kc-left);
    z-index: var(--kc-z-index);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--kc-gap);
    max-width: calc(100vw - 32px);
    padding: var(--kc-box-padding);
    border-radius: var(--kc-box-radius);
    background: var(--kc-box-bg);
    pointer-events: none;
    box-sizing: border-box;
}
.${ROOT_CLASS}[hidden] { display: none; }
.kc-title {
    align-self: flex-start;
    font-size: var(--kc-title-font-size);
    color: var(--kc-title-color);
    opacity: 0.9;
}
.kc-title:empty { display: none; }
.kc-history {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--kc-key-gap);
}
.kc-now {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--kc-gap);
    padding-top: var(--kc-gap);
    border-top: 1px solid var(--kc-divider);
}
.kc-now:empty { display: none; }
.kc-key {
    display: inline-block;
    flex: 0 0 auto;
    box-sizing: border-box;
    max-width: 100%;
    min-width: var(--kc-key-min-width);
    padding: var(--kc-key-padding);
    border-radius: var(--kc-key-radius);
    font-family: var(--kc-font-family);
    font-size: var(--kc-font-size);
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: var(--kc-history-key-bg);
    color: var(--kc-history-key-color);
    box-shadow: var(--kc-key-shadow);
}
.kc-key.kc-key--now {
    background: var(--kc-now-bg);
    color: var(--kc-now-color);
    font-weight: bold;
}
@media (max-width: 899px), (pointer: coarse) {
    .${ROOT_CLASS}[data-desktop-only="1"] { display: none !important; }
}`;

    /** 数值型长度的配置项（写入 CSS 时补 "px"；其余数值如 zIndex 原样输出）。 */
    const PX_KEYS = {
        fontSize: 1, titleFontSize: 1, keyMinWidth: 1, keyRadius: 1,
        boxRadius: 1, gap: 1, keyGap: 1,
    };

    /** 配置项 → CSS 变量名（键帽/根节点样式全部由这些变量驱动）。 */
    const VAR_MAP = {
        boxBackground: "--kc-box-bg",
        currentKeyBackground: "--kc-now-bg",
        currentKeyColor: "--kc-now-color",
        historyKeyBackground: "--kc-history-key-bg",
        historyKeyColor: "--kc-history-key-color",
        titleColor: "--kc-title-color",
        dividerColor: "--kc-divider",
        fontFamily: "--kc-font-family",
        fontSize: "--kc-font-size",
        titleFontSize: "--kc-title-font-size",
        keyPadding: "--kc-key-padding",
        keyMinWidth: "--kc-key-min-width",
        keyRadius: "--kc-key-radius",
        keyShadow: "--kc-key-shadow",
        boxRadius: "--kc-box-radius",
        boxPadding: "--kc-box-padding",
        gap: "--kc-gap",
        keyGap: "--kc-key-gap",
        position: "--kc-position",
        top: "--kc-top",
        right: "--kc-right",
        bottom: "--kc-bottom",
        left: "--kc-left",
        zIndex: "--kc-z-index",
    };

    // ========================================================================
    // 二、内部状态与工具
    // ========================================================================

    const options = assign({}, DEFAULTS);          // 生效配置
    const state = {
        inited: false,
        root: null,
        titleEl: null,
        historyEl: null,
        nowEl: null,
        held: [],                                   // 当前按住的修饰键
        combo: [],                                  // 当前组合（黄色块）
        history: [],                                // 历史（末尾 = 最新）
        bound: null,                                // 已绑定的事件处理器
        prevBodyPadding: null,                      // 显示前的 <body> 底部内边距
    };

    function assign(target) {
        for (let i = 1; i < arguments.length; i++) {
            const src = arguments[i];
            if (!src) continue;
            for (const k of Object.keys(src)) target[k] = src[k];
        }
        return target;
    }

    /** 电脑端判定：视口足够宽，且（可检测时）指针为精细指针。 */
    function isDesktop() {
        const doc = global.document;
        if (!doc) return false;
        const w = global.innerWidth || (doc.documentElement && doc.documentElement.clientWidth) || 0;
        if (w < options.minViewportWidth) return false;
        if (typeof global.matchMedia === "function") {
            const mm = global.matchMedia("(pointer: fine)");
            if (mm && mm.matches === false) return false;
        }
        return true;
    }

    /** 键名显示：功能键用配置的显示名，可打印字符原样。 */
    function keyName(e) {
        if (options.keyNames[e.key]) return options.keyNames[e.key];
        if (e.key && e.key.length === 1) return e.key;
        return e.key || "?";
    }

    function isModifier(e) {
        return !!options.modifierKeys[e.key];
    }

    function modifierName(e) {
        return options.modifierKeys[e.key] || e.key;
    }

    /** 是否应当显示（开关 + 设备判定）。 */
    function shouldShow() {
        if (!options.enabled) return false;
        return options.desktopOnly ? isDesktop() : true;
    }

    // ========================================================================
    // 三、DOM 构建与渲染
    // ========================================================================

    function injectStyle() {
        const doc = global.document;
        if (!options.injectStyle || !doc || !doc.createElement || !doc.head) return;
        if (doc.getElementById && doc.getElementById(STYLE_ID)) return;
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS_TEMPLATE;
        doc.head.appendChild(style);
    }

    function createRoot() {
        const doc = global.document;
        const root = doc.createElement("div");
        root.className = ROOT_CLASS;
        root.hidden = true;

        const title = doc.createElement("div");
        title.className = "kc-title";
        root.appendChild(title);

        const history = doc.createElement("div");
        history.className = "kc-history";
        root.appendChild(history);

        const now = doc.createElement("div");
        now.className = "kc-now";
        root.appendChild(now);

        (options.mountTo || doc.body || doc.documentElement).appendChild(root);
        state.root = root;
        state.titleEl = title;
        state.historyEl = history;
        state.nowEl = now;
    }

    /** 把配置写入根节点 CSS 变量（运行期 set() 也走这里）。 */
    function applyVars() {
        const root = state.root;
        if (!root || !root.style || !root.style.setProperty) return;
        for (const key of Object.keys(VAR_MAP)) {
            const v = options[key];
            const css = (typeof v === "number" && PX_KEYS[key]) ? v + "px" : String(v);
            root.style.setProperty(VAR_MAP[key], css);
        }
        root.setAttribute("data-desktop-only", options.desktopOnly ? "1" : "0");
    }

    function makeKey(text, isNow) {
        const cap = global.document.createElement("span");
        cap.className = "kc-key" + (isNow ? " kc-key--now" : "");
        cap.textContent = text;
        return cap;
    }

    /** 渲染：历史（竖式，旧→新，越远越透明） + 当前组合（独立块）。 */
    function render() {
        if (!state.root) return;
        const visible = shouldShow();
        state.root.hidden = !visible;
        updateBodyPadding(visible);
        if (!visible) return;

        state.titleEl.textContent = options.title || "";
        state.historyEl.innerHTML = "";
        state.nowEl.innerHTML = "";

        const max = Math.max(1, options.historyLength | 0);
        const list = state.history.slice(-max);
        const span = Math.max(1, max - 1);
        list.forEach(function (k, i) {
            const cap = makeKey(k, false);
            const depth = list.length - 1 - i;      // 0 = 最新（最靠下）
            const op = 1 - depth * (1 - options.minOpacity) / span;
            cap.style.opacity = String(Math.max(options.minOpacity, op));
            state.historyEl.appendChild(cap);
        });

        for (const k of state.combo) state.nowEl.appendChild(makeKey(k, true));
    }

    /** 显示时为 <body> 预留底部空间；隐藏时还原。 */
    function updateBodyPadding(visible) {
        const body = global.document && global.document.body;
        if (!body || !body.style) return;
        if (visible && options.pagePaddingBottom > 0) {
            if (state.prevBodyPadding === null) state.prevBodyPadding = body.style.paddingBottom || "";
            body.style.paddingBottom = options.pagePaddingBottom + "px";
        } else if (state.prevBodyPadding !== null) {
            body.style.paddingBottom = state.prevBodyPadding;
            state.prevBodyPadding = null;
        }
    }

    // ========================================================================
    // 四、键盘事件
    // ========================================================================

    function onKeyDown(e) {
        if (!shouldShow()) return;
        if (isModifier(e)) {
            const name = modifierName(e);
            if (state.held.indexOf(name) >= 0) return;     // 长按不重复记录
            state.held.push(name);
            state.combo = state.held.slice();
            pushHistory(name);
        } else {
            const name = keyName(e);
            state.combo = state.held.concat(name);
            pushHistory(name);
        }
        render();
    }

    function onKeyUp(e) {
        if (!shouldShow() || !isModifier(e)) return;
        const name = modifierName(e);
        state.held = state.held.filter(function (m) { return m !== name; });
        const rest = state.combo.filter(function (k) { return k !== name; });
        // 单独按下修饰键后松开：保留显示该键（"时刻显示所按的键"）
        state.combo = rest.length ? rest : [name];
        render();
    }

    function pushHistory(name) {
        state.history.push(name);
        const max = Math.max(1, options.historyLength | 0);
        while (state.history.length > max) state.history.shift();
    }

    function onResize() { render(); }

    function bind() {
        if (state.bound || !global.addEventListener) return;
        state.bound = { keydown: onKeyDown, keyup: onKeyUp, resize: onResize };
        // 捕获阶段：任何元素上的按键都能显示，且不干扰原有逻辑
        global.addEventListener("keydown", onKeyDown, true);
        global.addEventListener("keyup", onKeyUp, true);
        global.addEventListener("resize", onResize);
    }

    function unbind() {
        if (!state.bound || !global.removeEventListener) return;
        global.removeEventListener("keydown", state.bound.keydown, true);
        global.removeEventListener("keyup", state.bound.keyup, true);
        global.removeEventListener("resize", state.bound.resize);
        state.bound = null;
    }

    // ========================================================================
    // 五、公开 API
    // ========================================================================

    const KeyCast = {
        DEFAULTS: DEFAULTS,
        CSS_TEMPLATE: CSS_TEMPLATE,

        /** 初始化（幂等）：创建 DOM、注入样式、绑定事件。可传配置覆盖默认值。 */
        init: function (userOptions) {
            if (userOptions) assign(options, userOptions);
            if (!state.inited) {
                if (!global.document) return KeyCast;
                injectStyle();
                createRoot();
                bind();
                state.inited = true;
            }
            applyVars();
            render();
            return KeyCast;
        },

        /** 运行期修改配置（部分覆盖），立即重新应用。 */
        set: function (userOptions) {
            if (userOptions) assign(options, userOptions);
            if (!state.inited) return KeyCast.init();
            applyVars();
            render();
            return KeyCast;
        },

        /** 开关显示（默认关闭状态的嵌入方，初始化后调用即可）。 */
        setEnabled: function (on) {
            options.enabled = !!on;
            if (!state.inited) return KeyCast.init();
            render();
            return KeyCast;
        },

        show: function () { return KeyCast.setEnabled(true); },
        hide: function () { return KeyCast.setEnabled(false); },
        toggle: function () { return KeyCast.setEnabled(!options.enabled); },

        /** 是否正在显示。 */
        isVisible: function () { return !!state.root && !state.root.hidden; },

        /** 清空历史与当前组合。 */
        reset: function () {
            state.held = [];
            state.combo = [];
            state.history = [];
            render();
            return KeyCast;
        },

        /** 只读快照（调试 / 测试）。 */
        keys: function () {
            return { combo: state.combo.slice(), history: state.history.slice(), visible: KeyCast.isVisible() };
        },

        /** 当前生效配置的副本。 */
        config: function () { return assign({}, options); },

        /** 完全移除：解绑事件、移除 DOM 与样式、还原页面留白。 */
        destroy: function () {
            unbind();
            updateBodyPadding(false);
            const doc = global.document;
            if (state.root && state.root.parentNode) {
                state.root.parentNode.removeChild(state.root);
            } else if (state.root && state.root.remove) {
                state.root.remove();
            }
            state.root = state.titleEl = state.historyEl = state.nowEl = null;
            state.held = []; state.combo = []; state.history = [];
            state.inited = false;
            if (options.injectStyle && doc && doc.getElementById) {
                const style = doc.getElementById(STYLE_ID);
                if (style && style.parentNode) style.parentNode.removeChild(style);
            }
            return KeyCast;
        },
    };

    global.KeyCast = KeyCast;

    // 自动初始化（可在引入前设置 window.KeyCastAutoInit = false 关闭）
    if (DEFAULTS.autoInit && global.KeyCastAutoInit !== false) {
        if (global.document && global.document.readyState === "loading" && global.addEventListener) {
            global.addEventListener("DOMContentLoaded", function () { KeyCast.init(); });
        } else if (global.document) {
            KeyCast.init();
        }
    }
})(typeof window !== "undefined" ? window : globalThis);
