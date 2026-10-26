// ui/apply.js - UI 集成层：五模块 / 四区域 / 出流-入流状态机
//
// 模块：IB 输入缓冲区、VM 词匹配、PM 音素匹配、DM 定符匹配、GM Gardiner Code 匹配
// 区域：IBBox（IB）、VMBox（VM）、PDMBox（PM + DM）、GMBox（GM）
//
// 匹配对象：
//   VMBox   Vocabulary + Ligature（循环侦测 IB 全部字符；另叠加键入字母的发音匹配）
//   PDMBox  Phoneme（单字符）+ Determinative（单字符），均来自 onload 预建单元池
//   GMBox   Gardiner Code（单字符，大小写不敏感）
//
// 状态：
//   【出流】用户开始输入 → 所有 MBox 进入匹配状态
//   【入流】用户终止一个词/单字符的输入（确认键，或键入 "-" / ":" 等终结符）
//           → 除 VMBox 外，其余 MBox 空闲（清空）
//
// 渲染策略：
//   VMBox 只渲染当前页；PDMBox / GMBox 单元 onload 预建，匹配只切 display，数量按父宽限定。
//   键位、每页项数、单字框开关等由 settings.js 的 SETTINGS 驱动（见设置面板）。
(function () {
    const input = document.getElementById("Input");       // 总文本框
    const ib = document.getElementById("IB");             // IBBox
    const vmBox = document.getElementById("VMBox");        // 词匹配候选框
    const pdmBox = document.getElementById("PDMBox");      // 音素 / 定符匹配候选框
    const gmBox = document.getElementById("GMBox");        // Gardiner Code 候选框
    const previewBox = document.getElementById("IBPreview");   // IB 实时预览（合法时显示）
    const previewTag = document.getElementById("IBPreviewTag");
    const previewRender = document.getElementById("IBPreviewRender");
    const previewMdc = document.getElementById("IBPreviewMdc");
    const settingsBody = document.getElementById("SettingsBody");
    const settingsTitle = document.getElementById("SettingsTitle");
    const box = document.getElementById("RenderBox");

    const SIZE = 100;            // 渲染区 1 quadrat = 100px
    const PREVIEW_SIZE = 26;     // 候选预览 / 字符单元字形字号
    const IB_PREVIEW_SIZE = 40;  // IB 实时预览字号
    const CELL_GAP = 8;          // 与 .MBox 的 gap 一致（宽度限量估算用）
    const CELL_MIN_W = 84;       // 与 .mcell 的固定 width 一致

    // ============ 状态 ============
    let focusBox = "IB";                                  // "IB" | "VM" | "PDM" | "GM"
    const vm = { list: [], page: 0, sel: 0 };             // sel = **页内**序号（翻页后保持同位）
    const pd = { pool: [], visible: [], sel: 0 };
    const gm = { pool: [], visible: [], sel: 0 };
    let mode = "idle";                                    // idle | phon | gc | phon+gc | det
    let inflow = false;                                   // true = 入流（PDM/GM 空闲）

    // ============ 渲染区刷新（总文本框内容） ============
    // 渲染区只识别 raw MdC 渲染串。出现无法识别的串时：
    // 切换文本框警戒色并**终止本次渲染**（保留上一次的画面，不清空、不尝试渲染非法字符）。
    function refresh() {
        // 别名规范化：正文中一律使用正式名（J… → AA…／Aa…、Y1v → Y1a）。
        // 需要改写时同步修正光标，避免输入过程中光标跳动。
        if (/[Jj]/.test(input.value)) {
            const before = input.value;
            const canon = canonicalize(before);
            if (canon !== before) {
                const p = (typeof input.selectionStart === "number") ? input.selectionStart : before.length;
                const headDelta = canonicalize(before.slice(0, p)).length - p;
                input.value = canon;
                const np = Math.max(0, Math.min(canon.length, p + headDelta));
                input.selectionStart = input.selectionEnd = np;
            }
        }
        const { tree, invalid } = parseInput(input.value);
        if (invalid.length) {
            input.classList.add("invalid");
            return;                     // 非法 → 中止渲染
        }
        input.classList.remove("invalid");
        box.innerHTML = "";
        for (const line of splitLines(tree)) {
            const seg = document.createElement("span");
            seg.className = "RenderLine";
            render(seg, line, SIZE);
            box.appendChild(seg);
        }
    }

    // ============ IB 实时预览 ============
    // 预览内容 = IB 经 PIC（主字符隐式转换，开启时）与别名规范化后的文本；内置该功能。
    //   合法且非空 → 渲染字形 + MdC 串
    //   非法       → 警戒样式（边框/底色转警戒色，只显示文本串，不渲染）
    //   空         → 隐藏
    function updateIBPreview() {
        if (!previewBox || !previewRender) return;
        const src = canonicalize(PIC.enabled() ? PIC.convert(ib.value) : ib.value);
        const { tree, invalid } = parseInput(src);
        const hasText = src.length > 0;
        const valid = hasText && invalid.length === 0;

        previewBox.hidden = !hasText;
        previewBox.classList.toggle("invalid", hasText && !valid);
        if (!valid) {
            previewRender.innerHTML = "";
            if (previewMdc) previewMdc.textContent = hasText ? src : "";
            return;
        }
        previewRender.innerHTML = "";
        for (const line of splitLines(tree)) {
            const seg = document.createElement("span");
            seg.className = "RenderLine";
            render(seg, line, IB_PREVIEW_SIZE);
            previewRender.appendChild(seg);
        }
        if (previewMdc) previewMdc.textContent = src;
    }

    /**
     * PIC 就地转换 IB 内容（开启时）；返回是否发生变化。
     * 保留光标位置：分别转换光标前 / 后的文本，光标随前缀长度平移。
     * 光标位于 "<...>" 文本区内时跳过（文本内容不参与转换）。
     */
    function picConvertInPlace() {
        if (!PIC.enabled()) return false;
        const val = ib.value;
        const caret = (typeof ib.selectionStart === "number") ? ib.selectionStart : val.length;
        const lt = val.lastIndexOf("<", caret - 1);
        const gt = val.lastIndexOf(">", caret - 1);
        if (lt > gt) return false;                       // 光标在文本区内 → 不转换
        const before = val.slice(0, caret);
        const after = val.slice(caret);
        const nb = PIC.convert(before);
        const na = PIC.convert(after);
        if (nb === before && na === after) return false;
        ib.value = nb + na;
        ib.selectionStart = ib.selectionEnd = nb.length;
        return true;
    }

    // ============ VMBox（页内选择模型 + 只渲染当前页） ============
    function pageSize() { return normalizeVmPageSize(SETTINGS.vmPageSize); }
    function vmTotalPages() { return Math.max(1, Math.ceil(vm.list.length / pageSize())); }
    function vmPageLen(page) {
        const p = (page === undefined) ? vm.page : page;
        return Math.max(0, Math.min(pageSize(), vm.list.length - p * pageSize()));
    }
    function vmClampSel() {
        const len = vmPageLen();
        vm.sel = len > 0 ? Math.min(Math.max(0, vm.sel), len - 1) : 0;
    }
    function vmCurrent() { return vm.list[vm.page * pageSize() + vm.sel] || null; }

    // ============ 超宽内容循环滚动 ============
    // 结构：定宽 wrap（overflow:hidden） + 内部不定宽 inner。
    // 三类可滚动对：VM 候选行的 MdC+释义、单元下标第一行、单元下标第二行。
    const MARQUEE_PAIRS = [
        [".c-mean-wrap", ".c-mean-inner"],
        [".mcell-l1wrap", ".mcell-l1"],
        [".mcell-l2wrap", ".mcell-l2"],
    ];
    const MARQUEE_DUR = "8.75s";

    /** 收集子树中带指定 class 的元素（不依赖 querySelectorAll，便于无头测试）。 */
    function collectByClass(root, cls, out) {
        out = out || [];
        for (const el of root.children) {
            if ((el.className || "").split(" ").includes(cls)) out.push(el);
            if (el.children) collectByClass(el, cls, out);
        }
        return out;
    }

    /** 对单组 wrap/inner 测量溢出：超出则加 marquee 并给出位移与时长。 */
    function marqueePair(root, wrapCls, innerCls) {
        for (const wrap of collectByClass(root, wrapCls)) {
            const inner = wrap.children[0];
            if (!inner || (inner.className || "").split(" ").indexOf(innerCls) < 0) continue;
            const dist = inner.scrollWidth - wrap.clientWidth;
            if (dist > 0) {
                wrap.classList.add("marquee");
                inner.style.setProperty("--dist", (-dist) + "px");
                inner.style.setProperty("--dur", MARQUEE_DUR);
            } else {
                wrap.classList.remove("marquee");
            }
        }
    }

    /** 对一棵子树启用循环滚动（候选行 / 字符单元通用）。 */
    function applyMarquee(root) {
        for (const [wrapCls, innerCls] of MARQUEE_PAIRS) {
            marqueePair(root, wrapCls.slice(1), innerCls.slice(1));
        }
    }

    function renderVM() {
        vmBox.innerHTML = "";
        const total = vm.list.length;
        const totalPages = vmTotalPages();
        if (vm.page >= totalPages) vm.page = totalPages - 1;
        if (vm.page < 0) vm.page = 0;
        vmClampSel();
        const start = vm.page * pageSize();

        // 只渲染本页
        vm.list.slice(start, start + pageSize()).forEach((c, i) => {
            const item = document.createElement("div");
            item.className = "candidate" + (i === vm.sel && focusBox === "VM" ? " selected" : "") +
                (i === vm.sel && focusBox !== "VM" ? " current" : "");

            const pron = document.createElement("span");
            pron.className = "c-pron";
            pron.textContent = c.pron || "/";
            item.appendChild(pron);

            const prev = document.createElement("span");
            prev.className = "c-preview";
            MdCRndr.renderText(prev, c.glyph, PREVIEW_SIZE);   // c.glyph 为 MdC 渲染串
            item.appendChild(prev);

            const wrap = document.createElement("span");
            wrap.className = "c-mean-wrap";
            const inner = document.createElement("span");
            inner.className = "c-mean-inner";
            const mdc = document.createElement("span");
            mdc.className = "c-mdc";
            mdc.textContent = c.MdC;
            inner.appendChild(mdc);
            const mean = document.createElement("span");
            mean.className = "c-mean";
            mean.textContent = c.mean;
            inner.appendChild(mean);
            wrap.appendChild(inner);
            item.appendChild(wrap);

            // 点选候选行：在 mousedown 阶段直接执行并阻止冒泡
            //（框的 mousedown 会重建 DOM，若等到 click，元素已被移除 → 点击失效）
            item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                focusBox = "VM";
                vm.sel = i;
                confirmCurrent();
            });
            vmBox.appendChild(item);
        });

        if (totalPages > 1) {
            const pager = document.createElement("div");
            pager.className = "pager";
            const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
            const prevBtn = document.createElement("button");
            prevBtn.type = "button";
            prevBtn.textContent = t("pagePrev");
            prevBtn.disabled = vm.page === 0;
            // mousedown 阶段翻页（同候选行：避免框重建导致 click 丢失）
            prevBtn.addEventListener("mousedown", (e) => { stop(e); turnPage(-1); renderAll(); });
            const info = document.createElement("span");
            info.textContent = (vm.page + 1) + " / " + totalPages;
            const nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.textContent = t("pageNext");
            nextBtn.disabled = vm.page >= totalPages - 1;
            nextBtn.addEventListener("mousedown", (e) => { stop(e); turnPage(1); renderAll(); });
            pager.appendChild(prevBtn);
            pager.appendChild(info);
            pager.appendChild(nextBtn);
            vmBox.appendChild(pager);
        }

        vmBox.classList.toggle("empty", total === 0);
        if (total) {
            applyMarquee(vmBox);
            if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => applyMarquee(vmBox));
        }
    }

    // ============ PDMBox / GMBox：onload 预建全部单元 ============
    const phonUnits = buildPhonemeUnits();      // 音素单元池
    const detUnits = buildDeterminativeUnits(); // 定符单元池
    const codeUnits = buildGardinerUnits();     // Gardiner Code 单元池

    function createCellEl(u) {
        const cell = document.createElement("div");
        cell.className = "mcell";
        const glyph = document.createElement("span");
        glyph.className = "mcell-glyph";
        MdCRndr.renderText(glyph, u.glyph, PREVIEW_SIZE);      // u.glyph 为 MdC 渲染串
        cell.appendChild(glyph);
        // 两行下标：定宽 wrap 内放不定宽标签 → 超长文本（如定符名）循环滚动
        const l1wrap = document.createElement("span");
        l1wrap.className = "mcell-l1wrap";
        const l1 = document.createElement("span");
        l1.className = "mcell-l1";
        l1.textContent = u.l1;
        l1wrap.appendChild(l1);
        cell.appendChild(l1wrap);
        const l2wrap = document.createElement("span");
        l2wrap.className = "mcell-l2wrap";
        const l2 = document.createElement("span");
        l2.className = "mcell-l2";
        l2.textContent = u.l2;
        l2wrap.appendChild(l2);
        cell.appendChild(l2wrap);
        cell.style.display = "none";
        // 点选单元：同样在 mousedown 阶段执行并阻止冒泡（避免框重建吞掉 click）
        cell.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const which = pd.pool.indexOf(u) >= 0 ? "PDM" : "GM";
            const data = which === "PDM" ? pd : gm;
            const i = data.visible.indexOf(u);
            if (i < 0) return;
            focusBox = which;
            data.sel = i;
            confirmCurrent();
        });
        return cell;
    }

    function buildPools() {
        for (const u of phonUnits) { u.el = createCellEl(u); pdmBox.appendChild(u.el); }
        for (const u of detUnits) { u.el = createCellEl(u); pdmBox.appendChild(u.el); }
        for (const u of codeUnits) { u.el = createCellEl(u); gmBox.appendChild(u.el); }
    }

    function visibleLimit(container) {
        const W = container.clientWidth || 0;
        if (!W) return 8;
        const sample = container.children[0];
        const step = (sample && sample.offsetWidth ? sample.offsetWidth : CELL_MIN_W) + CELL_GAP;
        return Math.max(1, Math.floor((W + CELL_GAP) / step));
    }

    /**
     * 按查询键筛选单元：只切 display。
     * @param {string|null} queryKey 匹配键前缀；null = 全部隐藏；"" = 列出全部（数量仍受宽度限制）
     */
    function filterUnits(container, pool, others, queryKey) {
        for (const p of others) for (const u of p) u.el.style.display = "none";
        const limit = visibleLimit(container);
        const showAll = queryKey === "";
        const visible = [];
        for (const u of pool) {
            const hit = showAll || (!!queryKey && u.matchKey.startsWith(queryKey));
            const show = hit && visible.length < limit;
            u.el.style.display = show ? "" : "none";
            if (show) visible.push(u);
        }
        container.classList.toggle("empty", visible.length === 0);
        return visible;
    }

    function paintCells(data, which) {
        data.visible.forEach((u, i) => {
            const cls = "mcell" + (i === data.sel && focusBox === which ? " selected" : "") +
                (i === data.sel && focusBox !== which ? " current" : "");
            if (u.el.className !== cls) u.el.className = cls;
            applyMarquee(u.el);      // 可见单元：测量下标溢出（定符长名 / Unicode 串）
        });
    }

    function renderAll() {
        renderVM();
        paintCells(pd, "PDM");
        paintCells(gm, "GM");
        ib.classList.toggle("mbox-focused", focusBox !== "IB");
        vmBox.classList.toggle("focused", focusBox === "VM");
        pdmBox.classList.toggle("focused", focusBox === "PDM");
        gmBox.classList.toggle("focused", focusBox === "GM");
    }

    // ============ 匹配（出流 / 入流） ============
    function ibMatchingDisabled() {
        return ib.value.includes("<") || ib.value.includes(">");
    }

    function clearCharBoxes() {
        pd.pool = []; pd.visible = []; pd.sel = 0;
        gm.pool = []; gm.visible = []; gm.sel = 0;
        filterUnits(pdmBox, [], [phonUnits, detUnits], null);
        filterUnits(gmBox, [], [codeUnits], null);
    }

    /**
     * VM 的侦测文本（循环侦测 IB 全部字符）：
     * 忽略 "{" "}"（有些圣书体文本不主动写成连字形式）。
     */
    function vmQuery() {
        return ib.value.replace(/[{}]/g, "");
    }

    function updateMatch() {
        const run = currentRunOf(ib.value, ib.selectionStart);
        mode = "idle";
        vm.page = 0;
        vm.sel = 0;
        vm.list = [];

        if (ibMatchingDisabled()) { clearCharBoxes(); return; }

        // ---- DM 定符匹配：";" 后 → PDMBox 列定符；VMBox 与 GMBox 一并禁用 ----
        // Tab 确认后 ";" 会被删除（见 replaceForBox），随即回到正常匹配状态。
        if (run.lead === ";") {
            vm.list = [];                              // VMBox 禁用
            vm.page = 0;
            vm.sel = 0;
            pd.pool = detUnits;
            pd.sel = 0;
            pd.visible = filterUnits(pdmBox, detUnits, [phonUnits], run.seg.toLowerCase());
            gm.pool = [];                              // GMBox 禁用
            gm.sel = 0;
            gm.visible = filterUnits(gmBox, [], [codeUnits], null);
            mode = "det";
            return;
        }

        // ---- VMBox：词汇 + 连字（码前缀匹配 + 键入字母的发音匹配） ----
        const query = vmQuery();
        const pronToken = run.seg && !/\d/.test(run.seg) ? run.seg : "";
        vm.list = mergeWordCandidates([
            pronToken ? matchVocabularyByPron(pronToken) : [],
            query ? matchVocabulary(query) : [],
        ]);
        vmClampSel();

        // ---- PDMBox / GMBox：仅【出流】时匹配（入流时空闲） ----
        if (inflow) { clearCharBoxes(); return; }

        const seg = run.seg;
        if (!seg || !/^[A-Za-z0-9]/.test(seg)) { clearCharBoxes(); return; }

        // PM 音素匹配：含数字等可判定必走码时关闭
        if (!/\d/.test(seg)) {
            pd.pool = phonUnits;
            pd.sel = 0;
            pd.visible = filterUnits(pdmBox, phonUnits, [detUnits], seg);
        } else {
            pd.pool = []; pd.sel = 0;
            pd.visible = filterUnits(pdmBox, [], [phonUnits, detUnits], null);
        }
        // GM 码匹配：大小写不敏感（输入 "v" 也命中 V 系）
        if (/^[A-Za-z]/.test(seg)) {
            gm.pool = codeUnits;
            gm.sel = 0;
            gm.visible = filterUnits(gmBox, codeUnits, [], gardinerQueryKey(seg));
        } else {
            gm.pool = []; gm.sel = 0;
            gm.visible = filterUnits(gmBox, [], [codeUnits], null);
        }
        mode = (pd.visible.length && gm.visible.length) ? "phon+gc"
            : (gm.visible.length ? "gc" : (pd.visible.length ? "phon" : "idle"));
    }

    /** 出流：开始一个词 / 字符的输入 → 所有 MBox 进入匹配状态。 */
    function enterOutflow() {
        inflow = false;
        if (pd.visible.length) focusBox = "PDM";
        else if (gm.visible.length) focusBox = "GM";
        else focusBox = vm.list.length ? "VM" : "IB";
    }

    /** 入流：终止一个词 / 字符的输入 → 除 VMBox 外，其余 MBox 空闲。
     *  此处执行 PIC 就地转换，使转换结果参与 VMBox 的匹配。 */
    function enterInflow() {
        inflow = true;
        picConvertInPlace();
        focusBox = "VM";
        clearCharBoxes();
    }

    // ============ 上屏与确认 ============
    function insertToInput(text) {
        const p = (typeof input.selectionStart === "number") ? input.selectionStart : input.value.length;
        const prev = p > 0 ? input.value[p - 1] : "";
        const next = p < input.value.length ? input.value[p] : "";
        let insert = text;
        if (prev && !"-$<{[(".includes(prev)) insert = "-" + insert;
        if (next && !"-$>}])".includes(next)) insert = insert + "-";
        input.value = input.value.slice(0, p) + insert + input.value.slice(p);
        input.selectionStart = input.selectionEnd = p + insert.length;
    }

    function replaceSpan(from, to, text) {
        ib.value = ib.value.slice(0, from) + text + ib.value.slice(to);
        ib.selectionStart = ib.selectionEnd = from + text.length;
    }

    /**
     * 按来源确定替换区间（一律不删除区间外的字符）：
     *   VM 词条         → 整段码序列；VM 连字 → 仅从 "{" 起
     *   PDM / GM        → 当前片段（定符模式连同前导 ";"）
     */
    function replaceForBox(which, cand) {
        const run = currentRunOf(ib.value, ib.selectionStart);
        if (which === "VM") {
            if (cand.kind === "lig") {
                const bi = run.text.lastIndexOf("{");
                if (bi >= 0) return replaceSpan(run.start + bi, run.end, cand.insert);
            }
            return replaceSpan(run.start, run.end, cand.insert);
        }
        if (run.lead === ";") return replaceSpan(run.segStart - 1, run.end, cand.insert);
        return replaceSpan(run.segStart, run.end, cand.insert);
    }

    /** 确认当前 MBox 的选中项 → 写入 IBBox → 进入【入流】。 */
    function confirmCurrent() {
        const c = focusBox === "VM" ? vmCurrent()
            : focusBox === "PDM" ? pd.visible[pd.sel]
                : focusBox === "GM" ? gm.visible[gm.sel] : null;
        if (!c) return;
        replaceForBox(focusBox, c);
        enterInflow();
        updateMatch();
        updateIBPreview();
        renderAll();
    }

    /**
     * IBBox 确认键：IB 内容经 PIC 与别名规范化后入总文本框（自动处理连字符），IB 清空。
     * 别名规范化：J… 是 AA…／Aa… 组的不规范简写，写入正文一律换成正式名
     * （J1 → AA1、J80 → Aa80、Y1v → Y1a）。
     */
    function commitAll() {
        const raw = PIC.enabled() ? PIC.convert(ib.value) : ib.value;
        const text = canonicalize(raw);
        if (!text) return;
        insertToInput(text);
        ib.value = "";
        ib.selectionStart = ib.selectionEnd = 0;
        focusBox = "IB";
        inflow = false;
        updateMatch();
        updateIBPreview();
        renderAll();
        refresh();
    }

    // ============ 键盘 ============
    /** 某 MBox 是否有匹配项。 */
    function boxHasOptions(which) {
        if (which === "VM") return vm.list.length > 0;
        if (which === "PDM") return pd.visible.length > 0;
        return gm.visible.length > 0;
    }

    /**
     * 切换 Box：跳过无匹配项的框；三者皆无选项时不动（等效禁用）。
     * 鼠标点选不受此限制（见各框的 mousedown 处理）。
     * @returns {boolean} 是否发生了切换
     */
    function cycleFocus() {
        const order = ["VM", "PDM", "GM"];
        const start = order.indexOf(focusBox);     // focusBox = "IB" → -1
        for (let k = 1; k <= order.length; k++) {
            const next = order[(start + k + order.length) % order.length];
            if (boxHasOptions(next)) {
                focusBox = next;
                return true;
            }
        }
        return false;   // 三个 MBox 都无匹配项 → 不切换
    }

    function moveSel(which, delta) {
        if (which === "VM") {
            const len = vmPageLen();
            if (!len) return;
            vm.sel = (vm.sel + delta + len) % len;   // 页内循环
            return;
        }
        const data = which === "PDM" ? pd : gm;
        if (!data.visible.length) return;
        data.sel = (data.sel + delta + data.visible.length) % data.visible.length;
    }

    /** 翻页：保持页内序号；新页项数不足时取该页最后一项。 */
    function turnPage(delta) {
        if (!vm.list.length) return;
        const totalPages = vmTotalPages();
        const next = Math.min(Math.max(0, vm.page + delta), totalPages - 1);
        if (next === vm.page) return;
        vm.page = next;
        vmClampSel();
    }

    /** 按键动作判定（键位来自 SETTINGS）。 */
    function onKeyDown(e) {
        if (e.key === SETTINGS.boxSwitchKey) {
            e.preventDefault();
            cycleFocus();
            renderAll();
            return;
        }
        if (e.key === SETTINGS.ibConfirmKey) {
            e.preventDefault();
            commitAll();
            return;
        }
        // IB 为空 + 退格：等同总文本框退格
        if (e.key === "Backspace" && ib.value === "" && input.value) {
            const p = (typeof input.selectionStart === "number") ? input.selectionStart : input.value.length;
            if (p > 0) {
                e.preventDefault();
                input.value = input.value.slice(0, p - 1) + input.value.slice(p);
                input.selectionStart = input.selectionEnd = p - 1;
                refresh();
            }
            return;
        }
        if (e.key === SETTINGS.confirmKey) {
            e.preventDefault();
            if (focusBox !== "IB") confirmCurrent();
            return;
        }
        if (focusBox === "IB") return;   // 无 MBox 焦点：方向键交给 IB 光标

        const opt = SETTINGS.optionKeys[focusBox];
        const pg = SETTINGS.pageKeys[focusBox];
        if (opt && e.key === opt.prev) { e.preventDefault(); moveSel(focusBox, -1); renderAll(); }
        else if (opt && e.key === opt.next) { e.preventDefault(); moveSel(focusBox, 1); renderAll(); }
        else if (pg && e.key === pg.prev) { e.preventDefault(); turnPage(-1); renderAll(); }
        else if (pg && e.key === pg.next) { e.preventDefault(); turnPage(1); renderAll(); }
    }

    // ============ 事件与初始化 ============
    // 【入流】触发键：终止一个词 / 单字符输入的字符——分隔符 "-" ":"，
    // 以及组闭合符 "}"（敲完即视为该单位输入结束，随即执行 PIC 就地转换）。
    const INFLOW_KEYS = /^[-:}]$/;

    function onInput(e) {
        const data = e && e.data;
        const typing = !!(e && e.inputType === "insertText");
        // 状态先行：键入入流触发键 → 入流（并就地转换，使结果参与 VM 匹配）；
        // 其余键入 → 出流。
        const terminator = !!data && INFLOW_KEYS.test(data);
        if (terminator) {
            inflow = true;
            picConvertInPlace();
        } else if (typing) {
            inflow = false;
        }

        updateMatch();     // 按最新状态统一匹配一次（避免先匹配后切态导致 PDM/GM 空白）
        updateIBPreview();

        if (terminator) focusBox = "VM";
        else if (typing) enterOutflow();
        renderAll();
    }

    ib.addEventListener("input", onInput);
    ib.addEventListener("keydown", onKeyDown);
    // 点击各区域：仅切换选中焦点（框内项目已在 mousedown 阶段自行处理并阻止冒泡）
    ib.addEventListener("mousedown", () => { if (focusBox !== "IB") { focusBox = "IB"; renderAll(); } });
    vmBox.addEventListener("mousedown", () => { if (focusBox !== "VM") { focusBox = "VM"; renderAll(); } });
    pdmBox.addEventListener("mousedown", () => { if (focusBox !== "PDM") { focusBox = "PDM"; renderAll(); } });
    gmBox.addEventListener("mousedown", () => { if (focusBox !== "GM") { focusBox = "GM"; renderAll(); } });
    input.addEventListener("input", () => { refresh(); });
    if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("resize", () => { updateMatch(); renderAll(); updateKeyCast(); });
    }

    // ============ 按键展示（独立插件 js/plugin/keycast.js） ============
    // 录屏演示用：本页只把"设置项 + 文案 + 底部留白"同步给插件，
    // 键位记录、竖式历史、透明度、右下角定位等全在插件内部实现。
    // 插件为单文件、零依赖，可原样嵌入任何前端项目（见该文件顶部配置区）。
    function updateKeyCast() {
        if (typeof KeyCast === "undefined") return;   // 插件未加载 → 静默跳过
        KeyCast.init({
            title: t("keyCastTitle"),
            pagePaddingBottom: 88,                    // 右下角浮层不遮页脚
            historyLength: 6,
            desktopOnly: true,
        }).setEnabled(!!SETTINGS.keyCastEnabled);
    }

    // ============ 设置面板 ============
    const KEY_LABELS = {
        ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓",
        " ": "Space", Escape: "Esc",
    };
    function keyLabel(k) { return KEY_LABELS[k] || k; }

    function getPath(path) {
        let o = SETTINGS;
        for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
        return o[path[path.length - 1]];
    }
    function setPath(path, value) {
        let o = SETTINGS;
        for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
        o[path[path.length - 1]] = value;
    }

    // 设置项定义：[类型, 取值路径, i18n 标签键]
    const SETTING_ROWS = [
        ["key", ["boxSwitchKey"], "settingsBoxSwitch"],
        ["key", ["confirmKey"], "settingsConfirm"],
        ["key", ["ibConfirmKey"], "settingsIbConfirm"],
        ["num", ["vmPageSize"], "settingsPageSize"],
        ["key", ["pageKeys", "VM", "prev"], "settingsVmPagePrev"],
        ["key", ["pageKeys", "VM", "next"], "settingsVmPageNext"],
        ["key", ["optionKeys", "VM", "prev"], "settingsVmOptPrev"],
        ["key", ["optionKeys", "VM", "next"], "settingsVmOptNext"],
        ["key", ["optionKeys", "PDM", "prev"], "settingsPdmOptPrev"],
        ["key", ["optionKeys", "PDM", "next"], "settingsPdmOptNext"],
        ["key", ["optionKeys", "GM", "prev"], "settingsGmOptPrev"],
        ["key", ["optionKeys", "GM", "next"], "settingsGmOptNext"],
        ["bool", ["picEnabled"], "settingsPic"],
        ["bool", ["keyCastEnabled"], "settingsKeyCast"],
    ];

    function buildSettings() {
        if (!settingsBody) return;
        if (settingsTitle) settingsTitle.textContent = t("settingsTitle");
        settingsBody.innerHTML = "";
        // 按键展示插件（js/plugin/keycast.js）是可选插件：未加载时不显示该开关
        const hasKeyCast = typeof KeyCast !== "undefined";
        for (const [type, path, labelKey] of SETTING_ROWS) {
            if (!hasKeyCast && path[0] === "keyCastEnabled") continue;
            const row = document.createElement("div");
            row.className = "SettingRow";
            const label = document.createElement("span");
            label.className = "SettingLabel";
            label.textContent = t(labelKey);
            row.appendChild(label);

            if (type === "key") {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "SettingKey";
                btn.textContent = keyLabel(getPath(path));
                btn.addEventListener("click", () => {
                    btn.textContent = t("settingsPressKey");
                    btn.classList.add("capturing");
                    const handler = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (ev.key !== "Escape") setPath(path, ev.key);
                        btn.removeEventListener("keydown", handler);
                        btn.classList.remove("capturing");
                        saveSettings();
                        buildSettings();
                        updateMatch();
                        renderAll();
                    };
                    btn.addEventListener("keydown", handler);
                    btn.focus();
                });
                row.appendChild(btn);
            } else if (type === "num") {
                const num = document.createElement("input");
                num.type = "number";
                num.className = "SettingNum";
                num.min = String(VM_PAGE_SIZE_MIN);
                num.max = String(VM_PAGE_SIZE_MAX);
                num.value = String(getPath(path));
                num.addEventListener("change", () => {
                    const v = normalizeVmPageSize(num.value);
                    setPath(path, v);
                    num.value = String(v);
                    saveSettings();
                    updateMatch();
                    renderAll();
                });
                row.appendChild(num);
            } else {
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.className = "SettingBool";
                cb.checked = !!getPath(path);
                cb.addEventListener("change", () => {
                    setPath(path, cb.checked);
                    saveSettings();
                    updateMatch();
                    updateIBPreview();
                    updateKeyCast();
                    renderAll();
                });
                row.appendChild(cb);
            }
            settingsBody.appendChild(row);
        }
        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "SettingReset";
        reset.textContent = t("settingsReset");
        reset.addEventListener("click", () => {
            resetSettings();
            buildSettings();
            updateMatch();
            updateIBPreview();
            updateKeyCast();
            renderAll();
        });
        settingsBody.appendChild(reset);
    }

    // ============ 界面文字同步 ============
    function applyI18n() {
        ib.placeholder = t("ibPlaceholder");
        vmBox.setAttribute("data-ph", t("vmPlaceholder"));
        pdmBox.setAttribute("data-ph", t("pdmPlaceholder"));
        gmBox.setAttribute("data-ph", t("gmPlaceholder"));
        if (previewTag) previewTag.textContent = t("ibPreviewTag");
        buildSettings();
    }

    applyI18n();
    buildPools();      // onload：一次性生成全部字符单元
    updateMatch();
    renderAll();
    updateIBPreview();
    refresh();
    updateKeyCast();   // 按键展示（设置开启且为电脑端时显示）

    // 调试接口
    globalThis.CHEAV = {
        refresh,
        setLang: (code) => { setLang(code); applyI18n(); renderAll(); updateIBPreview(); updateKeyCast(); refresh(); },
        units: { phon: phonUnits, det: detUnits, code: codeUnits },
        keyCast: () => (typeof KeyCast !== "undefined" ? KeyCast.keys() : null),
        state: () => ({ focusBox, mode, inflow, vm: { page: vm.page, sel: vm.sel, total: vm.list.length } }),
    };
})();
