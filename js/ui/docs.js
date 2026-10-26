// ui/docs.js —— 文档内嵌（Docs overlay）
//
// 目的：让 instructions.html / for_developers.html 不必离开编辑器就能翻阅
//       （GitHub Pages 上同样可用；纯静态、无依赖）。
//
// 用法：
//   · 点击页脚里的文档链接（带 data-doc="instructions|for_developers"）→ 浮层内打开
//   · 也可用深链接：#doc=instructions / #doc=for_developers（可直接分享）
//   · Esc、✕、点击浮层空白处、浏览器后退 → 关闭
//   · 没有本脚本时链接照常跳转整页（优雅退化）
//
// 与文档页的配合：文档页顶部的「← 返回编辑器」用 target="_top"，
// 因此从浮层里点它会把整页换回编辑器，而不会把编辑器套进 iframe 里。

(function () {
    'use strict';

    var DOCS = {
        instructions: { file: 'instructions.html', title: '使用说明' },
        for_developers: { file: 'for_developers.html', title: '开发者文档' }
    };

    var overlay = document.getElementById('DocOverlay');
    var frame = document.getElementById('DocOverlayFrame');
    var titleEl = document.getElementById('DocOverlayTitle');
    var openLink = document.getElementById('DocOverlayOpen');
    var closeBtn = document.getElementById('DocOverlayClose');
    if (!overlay || !frame) return;              // 页面未提供浮层结构 → 不接管

    var lastFocus = null;
    var current = null;                          // 当前打开的文档键
    var docFrameBase = 'data-doc-frame';         // 在文档页上标记「正处于浮层内」

    /** 打开指定文档（name ∈ DOCS）。 */
    function open(name) {
        var doc = DOCS[name];
        if (!doc) return;
        lastFocus = document.activeElement;
        current = name;
        titleEl.textContent = doc.title;
        openLink.setAttribute('href', doc.file);
        openLink.setAttribute('title', '在新标签页打开 ' + doc.file);
        if (frame.getAttribute('src') !== doc.file) frame.setAttribute('src', doc.file);
        overlay.hidden = false;
        document.documentElement.classList.add('DocOverlay-open');
        if (closeBtn && closeBtn.focus) closeBtn.focus();
        if (window.location.hash !== '#doc=' + name) {
            window.history.pushState({ doc: name }, '', '#doc=' + name);
        }
    }

    /** 关闭浮层。restoreHash=true 时顺带清掉 #doc=…（不新增历史记录）。 */
    function close(restoreHash) {
        if (overlay.hidden) return;
        overlay.hidden = true;
        document.documentElement.classList.remove('DocOverlay-open');
        current = null;
        if (restoreHash !== false && /^#doc=/.test(window.location.hash)) {
            window.history.pushState({}, '', window.location.pathname + window.location.search);
        }
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        lastFocus = null;
    }

    /** 依据 location.hash 同步浮层状态（深链接与前进/后退）。 */
    function syncFromHash() {
        var m = /^#doc=([\w-]+)$/.exec(window.location.hash || '');
        if (m && DOCS[m[1]]) open(m[1]);
        else if (!overlay.hidden) close(false);   // 由 history 驱动，勿再改 hash
    }

    // ---- 页脚链接接管 ----
    Array.prototype.forEach.call(document.querySelectorAll('[data-doc]'), function (a) {
        a.addEventListener('click', function (e) {
            var name = a.getAttribute('data-doc');
            if (!DOCS[name]) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // 让"新标签页打开"照常工作
            e.preventDefault();
            open(name);
        });
    });

    // ---- 关闭交互 ----
    if (closeBtn) closeBtn.addEventListener('click', function () { close(); });
    overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay) close();       // 只有点在遮罩本身（不是 iframe 上）才关闭
    });
    document.addEventListener('keydown', function (e) {
        if (overlay.hidden) return;
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); }
    });

    // ---- 深链接 / 前进后退 ----
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    syncFromHash();

    // 供调试与外部调用
    window.CHEAV_DOCS = { open: open, close: close, list: function () { return Object.keys(DOCS); } };
})();
