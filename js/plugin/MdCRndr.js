/*!
 * ============================================================================
 *  MdCRndr — MdC（Manuel de Codage）圣书体渲染引擎（单文件、零依赖、可嵌入插件）
 * ----------------------------------------------------------------------------
 *  · 输入：**纯 MdC 渲染串**（Gardiner 码 / 十六进制码 / * : 组语法 / {连字} / <文本> / $ 换行）
 *    （词库等数据一律直接存 MdC）
 *    （组语法为 JSesh 风格："*" 同层并列、":" 下移一层、"-" 分隔四开组）
 *  · 输出：DOM（字形 span + 组 / 连字容器），自带 @font-face 与所需样式
 *  · 最简用法：
 *      <script src="MdCRndr.js"></script>
 *      MdCRndr.renderText(document.getElementById("out"), "S34-N35:AA1");
 *  · 所有常量与默认配置集中在【一、常量与默认配置】，可经 init()/set() 覆盖
 *  · 数据段（度量 / 码表 / 连字）由工具生成，勿手改
 * ----------------------------------------------------------------------------
 *  授权与数据来源（详见项目 NOTICE.md）：
 *   · 本引擎代码：MIT（见项目 LICENSE）
 *   · 字形度量 visuHeight / visuWidth：由 NewGardiner.ttf 提取
 *       © Mark-Jan Nederhof（University of St Andrews）—— SIL OFL 1.1（见 fonts/OFL.txt）
 *   · Gardiner 码表（基础区）与扩展区映射：由 Unicode 数据整理 / 生成
 *       © Unicode, Inc. —— Unicode License V3（见 NOTICE.md 第三节）
 * ============================================================================
 */
(function (global) {
    "use strict";

    // ========================================================================
    // 一、常量与默认配置（用户可按需修改 / 经 init、set 覆盖）
    // ========================================================================
    const DEFAULTS = {
        // ---------- 字体与样式注入 ----------
        fontFamily: "MdCRndr",              // 注入 @font-face 的族名
        fontUrl: "fonts/NewGardiner.ttf",   // 字体地址（相对文档；嵌入他站时改成自己的路径）
        fontFallback: "sans-serif",
        injectStyle: true,                  // 自动注入样式与 @font-face
        injectFontFace: true,
        styleId: "mdcrndr-style",

        // ---------- 渲染 ----------
        fontSize: 40,                       // render / renderText 的默认字号（px）
        vrgLayerGap: 0.05,                  // VRG 层间距（em 比例）
        vrgItemGap: 0.125,                  // VRG 层内元素间距（em 比例）
        textScale: 0.4,                     // <文本> 插入文本相对基准字号的倍率
        inlineBaseline: true,               // 行内嵌排：令堆叠组整盒底边落在正文基线上
        ligatureDebug: false,               // 连字各部件显示红色边框（调试）
        vertical: false,                    // 竖排：自上而下成列，VRG 改为水平渲染组（HRG）
        verticalColumnGap: 0.3,             // 竖排时列间距（em 比例）

        // ---------- 类名（与引擎内部产出保持一致，便于外部覆写样式） ----------
        glyphClass: "hie",
        vrgClass: "vrg",
        vrgLayerClass: "vrg-layer",
        ligClass: "lig",
        ligDebugClass: "lig-debug",
        textClass: "txt",       // <文本> 插入的文本片段
        unsupportedClass: "unsup",  // 字体不支持的码：方块占位 + 码名
        brClass: "br",          // "$" 手动换行标记
        encClass: "enc",        // 包围框（王名圈 / 塞拉赫框 / 方框）
        encKindClass: { A: "enc-A", S: "enc-S", h1: "enc-h1", F: "enc-F" },   // 按种类区分的类名
        encVerticalClass: "enc-v",   // 竖排朝向
        vtextClass: "vtext",    // 竖排整块容器
        vlineClass: "vline",    // 竖排中一列（"$" 分段）
        hrgClass: "hrg",        // 水平渲染组（竖排中的 VRG）
        lineClass: "",
    };

    const options = Object.assign({}, DEFAULTS);
    function setOptions(o) { if (o) Object.assign(options, o); return options; }

    // 渲染期读取的选项钩子（可在运行期经 set() 改变）
    // 塞拉赫框尾部：JSesh 里它是"框的一部分"，并非独立字符；这里按参考图手描成 SVG
const SER_TAIL_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><g fill=\"#000\"><rect x=\"4\" y=\"0\" width=\"12\" height=\"100\"/><rect x=\"30\" y=\"0\" width=\"9\" height=\"100\"/><rect x=\"50\" y=\"6\" width=\"48\" height=\"5\"/><rect x=\"50\" y=\"6\" width=\"5\" height=\"24\"/><rect x=\"50\" y=\"25\" width=\"48\" height=\"5\"/><rect x=\"63\" y=\"15\" width=\"30\" height=\"5\"/><rect x=\"50\" y=\"38\" width=\"48\" height=\"5\"/><rect x=\"50\" y=\"38\" width=\"5\" height=\"24\"/><rect x=\"50\" y=\"57\" width=\"48\" height=\"5\"/><rect x=\"63\" y=\"47\" width=\"30\" height=\"5\"/><rect x=\"50\" y=\"70\" width=\"48\" height=\"5\"/><rect x=\"50\" y=\"70\" width=\"5\" height=\"24\"/><rect x=\"50\" y=\"89\" width=\"48\" height=\"5\"/><rect x=\"63\" y=\"79\" width=\"30\" height=\"5\"/></g></svg>";
const ENC_PAD = 0.12;               // 包围框内边距（em 比例）
    const ENC_CONTENT_SCALE = 0.7;    // 框内字形相对框外的缩放（JSesh 惯例：框内略小）
    function vrgLayerGap() { return options.vrgLayerGap * EM_SQUARE; }
    function vrgItemGap() { return options.vrgItemGap * EM_SQUARE; }
    function ligatureDebug() { return !!options.ligatureDebug; }

    // ========================================================================
    // 二、数据段（工具生成，勿手改）
    // ========================================================================
    // visumetrics.js - 圣书体字形视觉度量（自动生成，勿手改）
// 键格式：x + 小写十六进制 Unicode 码点；单位：字体设计单位（EM = 1000）
// visuHeight = 墨迹高度（bbox 高）；visuWidth = 墨迹宽度（bbox 宽）
// 字体为底部对齐设计（字形坐基线），渲染时用 baseline 对齐即可
// 来源：NewGardiner.ttf（© Mark-Jan Nederhof, University of St Andrews）—— SIL OFL 1.1
//       许可全文见项目 fonts/OFL.txt；提取脚本 gen_metrics.py / g.py 不随仓库分发

// 四开组布局模式："flow"（默认，现行流式）| "jsesh"（显式几何，实验）
let quadratMode = "flow";
let __ovlProvider = null;   // (code, x, y, w, h) → 是否与字形墨迹重叠（em 坐标）

const visuHeight = (typeof window !== "undefined" && window.MDC_GLYPH_TABLES && window.MDC_GLYPH_TABLES.visuHeight) || {};   // 数据见 js/database/mdcGlyphTables.js

const visuWidth = (typeof window !== "undefined" && window.MDC_GLYPH_TABLES && window.MDC_GLYPH_TABLES.visuWidth) || {};   // 数据见 js/database/mdcGlyphTables.js

    /**
 * 映射表：加德纳代码->象形文字
 * 数据来源：基础区由 Unicode 字符名（UnicodeData）整理；扩展区由 Unikemet（Unicode 18.0,
 * UAX #57）的 kEH_JSesh / kEH_UniK 字段生成，仅收录 NewGardiner.ttf 实有字形。
 * © Unicode, Inc. —— Unicode License V3（全文见项目 NOTICE.md 第三节）
 */
const GARDINER = (typeof window !== "undefined" && window.MDC_GLYPH_TABLES && window.MDC_GLYPH_TABLES.GARDINER) || {};   // 数据见 js/database/mdcGlyphTables.js

/**
 * 反映射：象形文字->加德纳代码
 * 别名键（同一字符的另一种写法）不参与反映射，以保证 codeOf() 对既有字符
 * 仍返回其正式键名：
 *   · "J…"  —— AA 组（Unicode AA001…）的等价单字母写法：J1 ≡ AA1、J80 ≡ Aa80
 *   · "Y1v" —— Y1a 的旋转/翻转变体写法
 */
// ==== 编码/规范化：见 js/plugin/mdcEncoding.js（模块化第 2 步） ====
const MDC = (typeof window !== "undefined" && window.MDC) ? window.MDC : {};
const EM_SQUARE = MDC.EM_SQUARE || 1000;
const revGardiner = MDC.revGardiner || {};
const aliasCanonical = MDC.aliasCanonical || {};
const aliasCanonicalLower = MDC.aliasCanonicalLower || {};
const canonicalCode = MDC.canonicalCode || function (c) { return c; };
const canonicalize = MDC.canonicalize || function (t) { return t; };

const LIGATURES = {};


/**
 * 注册（或覆盖）一个连字。
 * 连字名 = 字符组合（如 "G39-X1"），用 "-" 连接 1-3 个字符；
 * 连字名内的分隔符统一为 "-"：":" 与 "*" 都归一化为 "-"。
 * @param {string} name 连字名（{name} 引用）
 * @param {Array<{code:string, dx:number, dy:number, scale:number}>} parts
 *   parts[0] 通常是基准字符（dx=0, dy=0, scale=1）；
 *   其余字符按 dx/dy 相对方块左下角定位、按 scale 缩放。
 * @param {string} [pron] 连字发音（可检索但不能单独成词），如 "Dd"；无发音则省略
 * @returns {{name:string, parts:Array, pron:(string|undefined)}}
 */
function defineLigature(name, parts, pron) {
    // 连字内 ":" 与 "*" 视为 "-"；各段别名码规范化为正式名
    const key = name.replace(/[:*]/g, "-").split("-").map(canonicalCode).join("-");
    LIGATURES[key] = { name: key, parts: parts, pron: pron };
        if (typeof LIGATURE_DEBUG !== "undefined" && LIGATURE_DEBUG) {
    console.log("[ligature] " + key + " =", JSON.stringify(parts), pron ? "(发音 " + pron + ")" : "");
        }
    return LIGATURES[key];
}

// 鸟背面包 sAt
// G43 + X1（w&t / t&w）：用 G43 自带的连字区（zone2 = 右上、zone1 = 左下）驱动
defineLigature("w&t", [
    { code: "G43", dx: 0, dy: 0, scale: 1 },
    { code: "X1", zone: "zone2" }
], "w&t");

defineLigature("t&w", [
    { code: "G43", dx: 0, dy: 0, scale: 1 },
    { code: "X1", zone: "zone1" }
], "t&w");

defineLigature("G39-X1", [
    { code: "G39", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "X1", dx: 0.545, dy: 0.716, scale: 1.0 },
], "sAt");

// 鸟背太阳 sA
defineLigature("G39-N5", [
    { code: "G39", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "N5", dx: 0.65, dy: 0.65, scale: 0.8 },
], "sA");
      // 兼容旧写法：{G39-n} 与 {G39-N5} 同一连字（"鸟背太阳 sa-ra"）
      defineLigature("G39-n", LIGATURES["G39-N5"].parts.slice(), LIGATURES["G39-N5"].pron);

// 上眼镜蛇 下手 Dd
defineLigature("I10-D46", [
    { code: "I10", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "D46", dx: 0.05, dy: 0.0, scale: 0.7 },
], "Dd");

// 上眼镜蛇 下上臂 Da
defineLigature("I10-D36", [
    { code: "I10", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "D36", dx: 0.05, dy: 0.0, scale: 0.7 },
], "Da");

// 上眼镜蛇 下嘴 Dr
defineLigature("I10-D21", [
    { code: "I10", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "D21", dx: 0.05, dy: 0.0, scale: 0.7 },
], "Dr");

// 上眼镜蛇 下嘴 Dt
defineLigature("I10-X1", [
    { code: "I10", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "X1", dx: 0.2, dy: 0.15, scale: 0.8 },
], "Dt");

// 鸟背胎盘 Ax
defineLigature("G25-AA1", [
    { code: "G25", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "AA1", dx: 0.65, dy: 0.6, scale: 0.6 },
], "Ax");

// 鸟背胎盘 Aqyt
defineLigature("G35-X1", [
    { code: "G35", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "X1", dx: 0.65, dy: 0.7, scale: 0.7 },
], "Aqyt");

// 鸟背q Aq
defineLigature("G35-N29", [
    { code: "G35", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "N29", dx: 0.65, dy: 0.6, scale: 0.7 },
], "Aq");

// 鹌鹑雏+p pw
defineLigature("Q3-G43", [
    { code: "G43", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "Q3", dx: 0.0, dy: 0.15, scale: 0.45 },
], "pw");

// 鹌鹑雏+t tw
defineLigature("X1-G43", [
    { code: "G43", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "X1", dx: 0.0, dy: 0.15, scale: 0.75 },
], "tw");

// 鹌鹑雏+t+t tw
defineLigature("X1-G43-X1", [
    { code: "G43", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "X1", dx: 0.0, dy: 0.15, scale: 0.75 },
    { code: "X1", dx: 0.45, dy: 0.8, scale: 0.75 },
], "twt");

// 鹌鹑雏+Z4
defineLigature("G43-Z4", [
    { code: "G43", dx: 0.0, dy: 0.0, scale: 1.0 },
    { code: "Z4", dx: 0.4, dy: 0.7, scale: 0.7 },
], "wy");

// x+mt+t
defineLigature("AA1-D52-X1", [
    { code: "D52", dx: 0.0, dy: -0.25, scale: 1.0 },
    { code: "AA1", dx: 0.25, dy: 0.5, scale: 1.0 },
    { code: "X1", dx: 0.3, dy: 0.0, scale: 0.8 },
], "xmt");

// 与 JSesh 对齐：以下手写条目在 JSesh 源码中**不存在**（源码里没有 w&t / G39-X1 等命名连字），
// JSesh 的 A&B 完全由连字区驱动；若需回退到旧行为，设置 window.CHEAV_KEEP_LEGACY_LIGATURES = true。
if (!(typeof window !== "undefined" && window.CHEAV_KEEP_LEGACY_LIGATURES)) {
    ["w&t", "t&w", "G39-X1", "G39-N5", "G39-n", "I10-D46", "I10-D36", "I10-D21", "I10-X1", "G25-AA1", "G35-X1", "G35-N29", "Q3-G43", "X1-G43", "X1-G43-X1", "G43-Z4", "AA1-D52-X1"].forEach(function (n) { delete LIGATURES[n]; });
}

    // ========================================================================
    // 三、基础工具
    // ========================================================================
    function detectInputMode(code) {
    // 首先检查是否是Gardiner格式
    // 开头 1-2 个字母（首字母必须大写），接着数字，其后可为变体字母或
    // JSesh 式扩展签名（如 F35A、A426B、Aa80、A1d、I96VARA）。
    // 有条件的大小写不敏感：除开头字母外，其余字母不区分大小写
    // （如 "AA1" 可写作 "Aa1"；"X2b" 可写作 "X2B"）。
    const gardinerPattern = /^[A-Z][A-Za-z]?\d+[A-Za-z0-9]*$/;

    // 然后检查是否是16进制格式
    // 接受圣书体区码点：U+13000 ~ U+143FF（基础区 + 扩展 A 区），
    // 即 13xxx 或 14[0-3]xxx，均为 5 位十六进制。
    // （不接受 4 位以内的短十六进制串，避免 "61" 被误判为 0x61='a'）
    const hexPattern = /^1(3[0-9A-Fa-f]{3}|4[0-3][0-9A-Fa-f]{2})$/;

    // 按顺序检查匹配
    if (gardinerPattern.test(code)) {
        return "Gardiner";
    } else if (hexPattern.test(code)) {
        return "Hex";
    } else {
        return "Default";
    }
}

    /**
     * 加德纳编号 -> 象形文字（引擎内部使用）。
     * 先直接查表；未命中时按"除开头字母外大小写不敏感"的三种变体再查
     * （如 "P001A" → "P1a"）。
     * @param {string} gardinerCode
     * @returns {string|null}
     */
    function hg(gardinerCode) {
        let ch = GARDINER[gardinerCode];
        if (!ch) {
            const match = gardinerCode.match(/^([A-Z])([A-Za-z]*)(\d+)([A-Za-z]?)$/);
            if (match) {
                const num = match[3].replace(/^0+/, "") || "0";
                const variants = [
                    match[1] + match[2] + num + match[4],
                    match[1] + match[2].toLowerCase() + num + match[4].toLowerCase(),
                    match[1] + match[2].toUpperCase() + num + match[4].toUpperCase(),
                ];
                for (const v of variants) {
                    if (GARDINER[v]) { ch = GARDINER[v]; break; }
                }
            }
        }
        return ch || null;
    }

    /** 象形文字 -> 加德纳编号 */
    function g(hierograph) { return revGardiner[hierograph]; }

    // ========================================================================
    // 四、渲染引擎
    // ========================================================================

    function px(v) { return Math.round(v * 100) / 100; }

    // 模块化第 3 步：把助手注入 mdcGlyphCore.js（decodeCode 是函数声明，已提升，此处引用安全）
    // 模块化第 4 步：同时注入度量模块需要的连字表与选项表（mdcMetrics.js 用）
    // 模块化第 5 步：再注入 VRG 模块需要的渲染入口与模式读取（mdcVrg.js 用）
    if (typeof window !== "undefined" && window.MDC) {
        window.MDC.host = {
            decodeCode: decodeCode,
            px: px,
            // 连字名大小写不敏感；找不到返回 null
            getLigature: function (n) { return LIGATURES[n] || LIGATURES[String(n).toLowerCase()] || null; },
            options: options,
            // —— 模块化第 5 步（mdcVrg.js）——
            quadratMode: function () { return quadratMode; },
            encDepth: function () { return encADepth; },
            render: function (u, parent, fs) { return render(u, parent, fs); },
            renderEnclosure: function (el, u, fs, vertical) { return renderEnclosure(el, u, fs, vertical); },
            renderLigature: function (el, name, fs) { return renderLigature(el, name, fs); },
            makeUnsupported: function (code, fs, mirror) { return makeUnsupported(code, fs, mirror); }
        };
    }

/**
 * 将码值解码为 Unicode 圣书体字符。
 * 支持 Gardiner 码（"N35"）与十六进制码点（"13216" / "13cea"）。
 */
function decodeCode(code) {
    const mode = detectInputMode(code);
    if (mode === "Gardiner") return hg(code);
    if (mode === "Hex") return String.fromCodePoint(parseInt("0x" + code, 16));
    return null;
}

/**
 * 获取字形的视觉度量（单位：设计单位，EM_SQUARE = 1000）。
 * @param {string} code Gardiner 或 Hex 码
 * @returns {{height:number, width:number}} 墨迹高度与墨迹宽度
 */
function getMetrics(code) { return MDC.getMetrics(code); }

/**
 * 渲染单个字形。
 * @param {HTMLElement} parent 父容器
 * @param {string} code 码值
 * @param {number} fontSize 该字形字号（px），1em = fontSize
 * @param {string} [align] "center"：在 1em 轨道内垂直居中（IS 用）；
 *                         其他/缺省：贴底（baseline 对齐，VRG 层内用）
 */
/**
 * 阴影：把 1-4 分区渲染为 45° 斜线底纹（背景层，不占布局、不影响度量）。
 * 1=左上 2=右上 3=左下 4=右下，可任意组合；每个分区是一层 50%×50% 的背景。
 * 底纹必须落在 1em 方格上（见 .sh-cell），而不是字形自身的行盒。
 */
function applyShadow(el, digits) { return MDC.applyShadow(el, digits); }
/**
 * 生成一个高 1em 的"格"（.sh-cell），把渲染动作放进格内，再给格加阴影。
 * 横排：宽度**不**固定，窄字形（如 Z3）保持自然宽度，避免右侧留白；
 * 竖排：宽度固定 1em（= 列宽），阴影与整列对齐，而不是贴在字形自身宽度上。
 * 横排贴底、竖排居中，与普通字形的基线位置一致；阴影按此格划分四象限。
 */
function renderInShadedCell(parent, fontSize, digits, draw, alignEnd, emWidth) { return MDC.renderInShadedCell(parent, fontSize, digits, draw, alignEnd, emWidth); }
/**
 * 字形提供者（可选）：code → 图片 URL（同步返回）。
 * 返回 null 表示"暂无自定义字形，先用字体渲染"（引擎会在 URL 就绪后按需重绘）。
 * 由宿主页面通过 setGlyphProvider(fn) 注入；引擎本身不依赖任何文件系统 API。
 */
let glyphProvider = null;
let zoneFitMode = "shrink";      // 连字区缩放策略：shrink=只缩不放 / fill=填满 / fill85=填满留 15% 边距
let glyphZoneProvider = null;   // code -> { zone1, zone2 }（连字区，em 坐标）
/** 字形宽高比提供者（可选）：code → 宽/高（数字）或 null。用于让宽符号不被压进 1em 方格。 */
let glyphAspectProvider = null;
/** 字形度量提供者（可选）：code → { w, h }（单位 em）。JSesh 模式用它取代字体度量。 */
let glyphMetricsProvider = null;
/** 字形绘制矩形提供者（可选）：code → { x, y, w, h }（em）。JSesh 模式用它精确摆放 SVG。 */
let glyphBoxProvider = null;
/**
 * 把自定义字形（JSesh SVG）覆盖到字形格上。
 * payload 可以是 SVG 源码，也可以是 data:/blob:/http URL（兼容旧行为）。
 */
function attachSvgOverlay(el, payload, inkW, inkH, dy, position) { return MDC.attachSvgOverlay(el, payload, inkW, inkH, dy, position); }

function renderGlyph(parent, code, fontSize, align, mirror) { return MDC.renderGlyph(parent, code, fontSize, align, mirror); }

function ligatureWidth(name) { return MDC.ligatureWidth(name); }
function unitMetrics(u) { return MDC.unitMetrics(u); }
function layerMetrics(line) { return MDC.layerMetrics(line); }
function vrgBoxWidth(layers) { return MDC.vrgBoxWidth(layers); }

/**
 * 垂直渲染组（VRG）：在一个方块内把多层单位上下堆叠。
 * 层内元素可以是字符或嵌套 VRG（递归缩放到层内字号）。
 * @param {HTMLElement} parent 父容器
 * @param {Array[]} layers 已分层的单位（二维数组，自上而下）
 * @param {number} fontSize 基准字号（px）
 */
function measureUnitEm(u) { return MDC.measureUnitEm(u); }
function layoutQuadratAbs(layers, fontSize, targetHpx) { return MDC.layoutQuadratAbs(layers, fontSize, targetHpx); }
function renderVRG(parent, layers, fontSize) { return MDC.renderVRG(parent, layers, fontSize); }
function renderLayerUnit(layer, u, glyphSize) { return MDC.renderLayerUnit(layer, u, glyphSize); }

// ============================================================================
// 五之二、竖排排版：VRG → HRG（水平渲染组）
// ----------------------------------------------------------------------------
// 竖排时文字自上而下成列，"$" 分段为列，列自右向左。
// 组（横排的 VRG）在竖排中改称"水平渲染组"（HRG）：组的各"层"自上而下各占一整行，
// 层内元素（"*" 连接的）仍然左右并列 —— 与横排完全同一套层结构，只是缩放口径不同：
//   横排 VRG：把整组压进 1 em 见方 —— s = min(1, 1em/总层高, 1em/最大层宽)
//   竖排 HRG：只受列宽 1 em 限制，层高各保留 1 em 轨道，不再纵向压缩
//              —— s = min(1, 1em/最大层宽)，整组因而是"高"的而不是方的
// 仅用于正文渲染区：输入框、预览与候选仍走横排路径（render / renderText）。
// ============================================================================

/**
 * 渲染水平渲染组（HRG）：竖排中的组。
 * 几何与横排 VRG **完全相同**（层自上而下、层内 "*" 左右并列、整组收在 1 em 见方、
 * 只缩不放大），区别只在命名与所处流向：它在竖排里占的是一条"横带"（一行），
 * 因此称水平渲染组。换类名便于样式与调试；内部结构仍是 .vrg-layer。
 * @param {HTMLElement} parent 父容器
 * @param {Array[]} layers 已分层的单位（二维数组，自上而下）
 * @param {number} fontSize 基准字号（px）
 * @returns {HTMLElement}
 */
function renderHRG(parent, layers, fontSize) {
    const box = renderVRG(parent, layers, fontSize);
    if (box) box.className = options.hrgClass;
    return box;
}
/**
 * 竖排列内单位：与 renderLayerUnit 一一对应，区别只在多层的组走 HRG（层各占一行）。
 * @param {HTMLElement} col 列容器
 * @param {Object} u 渲染单位
 * @param {number} size 列内基准字号（px）
 */
function renderLayerUnitV(col, u, size) {
    if (!u) return;
    if (u.type === "char") {
        if (u.shadow) {
            renderInShadedCell(col, size, u.shadow, (cell) => {
                renderGlyph(cell, u.code, size, "center", u.mirror);
            }, false, true);                                // 竖排：格宽 = 列宽 1em
        } else {
            renderGlyph(col, u.code, size, "center", u.mirror);   // 1em 轨道内上下居中
        }
    } else if (u.type === "vrg") {
        // 单层组 = 一行内并列（"*"）；多层组 = 每层一行（":"），都由 HRG 承担
        if (u.shadow) {
            renderInShadedCell(col, size, u.shadow, (cell) => {
                renderHRG(cell, u.layers, size);
            }, false, true);
        } else {
            renderHRG(col, u.layers, size);
        }
    } else if (u.type === "lig") {
        renderLigature(col, u.name, size);
    } else if (u.type === "enc") {
        renderEnclosure(col, u, size, true);        // 竖排：座 / 锦在下
    } else if (u.type === "text") {
        // 竖排中的插入文本：文字方向随列（自上而下），字号同横排比例
        const txt = document.createElement("span");
        txt.className = options.textClass + " txt-v";
        txt.textContent = u.text;
        txt.style.fontSize = px(options.textScale * size) + "px";
        col.appendChild(txt);
    } else if (u.type === "unsup") {
        col.appendChild(makeUnsupported(u.code, size, u.mirror));
    } else if (u.type === "seq") {
        for (const x of u.units) renderLayerUnitV(col, x, size);
    }
    // newline：在列一级由 splitLines 处理，这里忽略
}

/**
 * 竖排整块：每个 "$" 分段一列，列自左向右排列（字形朝前，不镜像时按左→右书写）。
 * @param {HTMLElement} parent 父容器
 * @param {Object} tree 单位树
 * @param {number} fontSize 基准字号（px）
 * @returns {HTMLElement}
 */
function renderVertical(parent, tree, fontSize) {
    const wrap = document.createElement("span");
    wrap.className = options.vtextClass;
    wrap.style.setProperty("--mdc-col-gap", px(options.verticalColumnGap * fontSize) + "px");
    for (const line of splitLines(tree)) {
        const col = document.createElement("span");
        col.className = options.vlineClass;
        wrap.appendChild(col);
        const units = line && line.type === "seq" ? line.units : [line];
        for (const u of units) renderLayerUnitV(col, u, fontSize);
    }
    parent.appendChild(wrap);
    return wrap;
}
/**
 * 渲染包围框：王名圈（A）、塞拉赫框（S）、裸方框（h1）。
 * 框体由 CSS 绘制（.enc-A / .enc-S / .enc-h1 + .enc-v 竖排朝向），此处只负责容器。
 * @param {HTMLElement} parent 父容器
 * @param {Object} u 单位 { type:"enc", kind, units }
 * @param {number} fontSize 基准字号（px）
 * @param {boolean} vertical 竖排朝向
 * @returns {HTMLElement}
 */
let encADepth = 0;          // >0 表示正在渲染王名圈内部（框内单字需上下居中）
function renderEnclosure(parent, u, fontSize, vertical) {
    // JSesh 严格模式：几何与绘制都按 visitCartouche / NormalCartoucheDrawer
    if (options.jsethEnclosure !== false && MDC.Enclosure && (u.kind === "A" || u.kind === "h1")) {
        return renderEnclosureJseth(parent, u, fontSize, vertical);
    }
    const box = document.createElement("span");
    box.className = options.encClass + " " + (options.encKindClass[u.kind] || "")
        + (vertical ? " " + options.encVerticalClass : "");
    box.style.fontSize = fontSize + "px";
    box.title = "包围框：" + u.kind;
    // F 框（堡垒框）：四边雉堞齿 + 四角 L 形齿，用真实元素生成（四角共用同一 class，几何必然全等）
    if (u.kind === "F") {
        for (const side of ["t", "b", "l", "r"]) {
            const e = document.createElement("span");
            e.className = "enc-F-edge enc-F-" + side;
            box.appendChild(e);
        }
        for (const corner of ["tl", "tr", "bl", "br"]) {
            const c = document.createElement("span");
            c.className = "enc-F-corner enc-F-" + corner;
            box.appendChild(c);
        }
    }
    const inner = document.createElement("span");
    inner.className = "enc-body";
    box.appendChild(inner);
    // 框随内容拉伸：横排时内容横向排布，竖排时纵向排布（形状本身只由内容尺寸决定）
    // 框内字形按 JSesh 惯例略小于框外，使框体本身不显得拥挤
    // 塞拉赫框底部要留下宫墙纹，内容再小一档；其余按通用比例
    const innerSize = fontSize * (u.kind === "S" ? 0.64 : u.kind === "F" ? 0.54 : ENC_CONTENT_SCALE);   // F 总高 1em = 内容 0.62 + 内边距 0.16 + 边框 0.06 + 框外齿带 0.16
    if (u.kind === "A") encADepth++;
    try {
    if (vertical) {
        for (const x of (u.units || [])) renderLayerUnitV(inner, x, innerSize);
    } else {
        for (const x of (u.units || [])) render(inner, x, innerSize);
    }
    } finally {
        if (u.kind === "A") encADepth--;
    }
    if (u.kind === "S" && glyphProvider && !vertical) {
        // 尾部不是独立字符：用 img/S_tail.png 的测量几何作背景，放在框外层的 wrap 里
        const tailSvg = (typeof SEREKH_TAIL_SVG === "string" && SEREKH_TAIL_SVG.indexOf("<svg") === 0)
            ? SEREKH_TAIL_SVG
            : SER_TAIL_SVG;
        const wrap = document.createElement("span");
        box.classList.add("enc-S-svg");   // 压制字体伪元素尾部（否则与矢量尾重叠）
        wrap.className = "enc-S-wrap";
        wrap.appendChild(box);
        const tail = document.createElement("span");
        tail.className = "enc-S-tail";
        tail.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tailSvg) + '")';
        wrap.appendChild(tail);
        parent.appendChild(wrap);
        return wrap;
    }
    if (u.kind === "S" && glyphProvider && vertical) {
        // 竖排：尾部在框下，沿用伪元素方案（.enc-S.enc-v::after）
        const tailSvgV = (typeof SEREKH_TAIL_SVG === "string" && SEREKH_TAIL_SVG.indexOf("<svg") === 0)
            ? SEREKH_TAIL_SVG
            : SER_TAIL_SVG;
        box.classList.add("enc-S-svg");
        box.style.setProperty("--enc-tail", 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tailSvgV) + '")');
    }
    parent.appendChild(box);
    return box;
}
/**
 * 按 JSesh 绘制王名圈（kind A = CARTOUCHE，h1 = 裸框）
 *   1) 内容按**原尺寸**渲染（JSesh 不缩放框内符号）；
 *   2) 量出内容墨迹尺寸后套 visitCartouche 几何：
 *      横排 W = 内容宽 + longDim，H = max(内容高 + 6/18, 1em + 6/18)；
 *      内容落在 (dLong, dSmall)；
 *   3) 用内联 SVG 画直线 + 三次贝塞尔环（线宽 1/18em）。
 */
function renderEnclosureJseth(parent, u, fontSize, vertical) {
    const E = MDC.Enclosure;
    const type = u.kind === "A" ? "c" : "h";
    const parts = E.defaultParts(type);
    if (u.startPart) parts.start = u.startPart;
    if (u.endPart) parts.end = u.endPart;
    const units = u.units || [];
    // 1) 内容尺寸：宽度 = 各单元墨迹宽之和；高度 = max(1em, 最高单元)（四开组至少 1em）
    const ms = units.map(function (x) {
        const m = (typeof MDC.measureUnitEm === "function") ? MDC.measureUnitEm(x) : null;
        return (m && m.w > 0 && m.h > 0) ? m : { w: 1, h: 1 };
    });
    let cw = 0, ch = 0;
    if (vertical) {
        for (const m of ms) { ch += m.h; if (m.w > cw) cw = m.w; }
        if (cw < 1) cw = 1;
    } else {
        for (const m of ms) { cw += m.w; if (m.h > ch) ch = m.h; }
        if (ch < 1) ch = 1;                      // ← 四开组高度下限 1em
    }
    // 2) visitCartouche 几何
    const g = E.geometry(type, parts.start, parts.end, cw, ch, !!vertical);
    // 3) 容器 + 逐单元绝对定位；单元按墨迹尺寸、在 1em 行带内**上下居中**（JSesh centerSubViewsVertically）
    const box = document.createElement("span");
    box.className = options.encClass + " enc-js";
    box.style.cssText = "position:relative;display:inline-block;vertical-align:bottom;" +
        "line-height:0;font-size:" + fontSize + "px;width:" + (g.w * fontSize) + "px;height:" + (g.h * fontSize) + "px;";
    let cx = 0, cy = 0;
    if (u.kind === "A") encADepth++;
    try {
        units.forEach(function (x, i) {
            const m = ms[i];
            let left, top;
            if (vertical) { left = g.x + (cw - m.w) / 2; top = g.y + cy + (m.h - m.h) / 2; cy += m.h; }
            else { left = g.x + cx; top = g.y + ((units.length > 1) ? (ch - m.h) : (ch - m.h) / 2); cx += m.w; }
            const cell = document.createElement("span");
            cell.className = "enc-cell";
            cell.style.cssText = "position:absolute;line-height:0;left:" + (left * fontSize) + "px;top:" +
                (top * fontSize) + "px;width:" + (m.w * fontSize) + "px;height:" + (m.h * fontSize) + "px;";
            box.appendChild(cell);
            render(cell, x, fontSize);
            const hie = cell.querySelector(".hie");
            if (hie) {
                hie.style.position = "absolute";
                hie.style.left = "0px";
                hie.style.top = "0px";
                hie.style.margin = "0px";
                hie.style.width = "100%";
                hie.style.height = "100%";
                hie.style.backgroundSize = "100% 100%";   // 单元盒 = 墨迹盒，比例一致，不拉伸
                hie.style.backgroundPosition = "left top";
            }
        });
    } finally {
        if (u.kind === "A") encADepth--;
    }
    box.appendChild(E.svg(type, parts.start, parts.end, g.w, g.h, !!vertical));
    parent.appendChild(box);
    return box;
}
/**
 * 字体不支持的码：画一个方块占位并把码写在框内，作为普通字符参与排版
 * （行内、堆叠组层内、连字前后均可）。字号随码长度收缩，保证码名完整可见。
 * @param {string} code 码（如 "S95"、"A133a"、"13FFF"）
 * @param {number} size 所在位置的基准字号（px）
 * @returns {HTMLElement}
 */
function makeUnsupported(code, size, mirror) {
    // 若宿主提供了自定义字形（如 JSesh SVG），字体缺失的码也能显示：优先用它
    const custom = glyphProvider ? glyphProvider(code) : null;
    if (custom) {
        const el = document.createElement("span");
        el.className = "hie has-svg";
        el.textContent = "";
        el.title = code;
        el.style.fontSize = size + "px";
        // 字体没有这个码 → 直接当 1em 方格用；否则宽度只有一个 nbsp，SVG 会被压得极小
        el.style.display = "inline-block";
        const aspU = glyphAspectProvider ? glyphAspectProvider(code) : null;
        el.style.width = px(size * (aspU && aspU > 0 ? Math.min(aspU, 3) : 1)) + "px";
        el.style.height = px(size) + "px";
        el.style.verticalAlign = "bottom";
        el.style.color = "transparent";
        attachSvgOverlay(el, custom, null, null, 0, "center center");
        if (mirror) { el.style.transform = "scaleX(-1)"; el.classList.add("mir"); }
        return el;
    }
    const box = document.createElement("span");
    box.className = options.unsupportedClass;
    box.textContent = code;
    box.title = code + "（字体不含此字形）";
    const side = size * 0.92;                       // 方块边长：略小于 1em，留出间隙
    box.style.width = px(side) + "px";
    box.style.height = px(side) + "px";
    // 内文比例：以 0.62em/字符 估算，保证整串码名都装进框内（0.90em 可用宽度），
    // 短码不超过 0.32em，长码自动缩小。
    const scale = Math.min(0.32, 0.90 / (0.62 * Math.max(code.length, 1)));
    box.style.fontSize = px(size * scale) + "px";
    if (mirror) { box.style.transform = "scaleX(-1)"; box.classList.add("mir"); }
    return box;
}

/**
 * 渲染连字：2-3 个字符按定义的相对坐标与缩放合并渲染为一个单位。
 * @param {HTMLElement} parent 父容器
 * @param {string} name 连字名（查 LIGATURES 表）
 * @param {number} fontSize 连字字号（px），连字整体占 1em 方块
 */
function renderLigature(parent, name, fontSize) {
    const lig = LIGATURES[name] || LIGATURES[String(name).toLowerCase()] || null;   // 名字大小写不敏感
    if (!lig) return null;

    const box = document.createElement("span");
    box.className = "lig";
    // 宽取连字墨迹宽（而非固定 1em）：使连字与前后字形紧贴，不留空档
    box.style.width = px(ligatureWidth(name) * fontSize / EM_SQUARE) + "px";
    // 容器高 = 宿主墨迹高：连字区坐标相对宿主墨迹 bbox 归一化
    { const hc = (lig.parts[0] || {}).code || "";
      const hb = glyphBoxProvider ? glyphBoxProvider(hc) : null;
      box.style.height = px((hb ? hb.h : 1) * fontSize) + "px"; }

    // —— Tksesh 预定义连字：坐标来自官方表（1/1000 A1 高），y 向下 ——
    if (lig.tksesh) {
        const parts = lig.parts || [];
        let maxW = 0, maxH = 0;
        parts.forEach(function (p) {
            const m = getMetrics(p.code);
            const k = (p.scale || 1);
            const w = (m.width / EM_SQUARE) * k * fontSize;
            const h = (m.height / EM_SQUARE) * k * fontSize;
            maxW = Math.max(maxW, (p.dx || 0) * fontSize + w);
            maxH = Math.max(maxH, (p.dy || 0) * fontSize + h);
        });
        box.style.width = px(Math.max(maxW, 1)) + "px";
        box.style.height = px(Math.max(maxH, 1)) + "px";
        box.style.position = "relative";
        parts.forEach(function (p) {
            const el = renderGlyph(box, p.code, fontSize * (p.scale || 1), "bottom");
            if (!el) return;
            el.style.position = "absolute";
            el.style.marginBottom = "0px";
            el.style.left = px((p.dx || 0) * fontSize) + "px";
            el.style.top = px((p.dy || 0) * fontSize) + "px";
        });
        parent.appendChild(box);
        return box;
    }
    // 照抄 Layout.visitLigature 的 3 子视图分支：中间为宿主，首→槽0、尾→槽1，**两槽缺一就整组不放置**
    const __nParts = lig.parts.length;
    const __placeAllowed = (__nParts === 2 || __nParts === 3);   // 源码只处理 2 与 3 子视图
    let threeSidesOk = true;
    if (lig.parts.length === 3 && glyphZoneProvider) {
        const z3 = glyphZoneProvider((lig.parts[0] || {}).code) || {};
        const ok = function (z) { return !!(z && z.w > 0 && z.h > 0); };
        threeSidesOk = ok(z3.zone1) && ok(z3.zone2);
    }
    const placed = [];                     // placed[i] = 该部件最终位置（em），供链式定位
    lig.parts.forEach((part, i) => {
        const ps = fontSize * (part.scale || 1);
        // 基准字（parts[0]）以独立字为模板：1em 轨道内上下居中；
        // 其余 part 贴基线定位（墨迹底部落在 dx/dy 处）
        const align = i === 0 ? "center" : undefined;
        // part.zone：按锚字符（parts[0]）的连字区自动缩放并贴边（Tier 1）
        let zdx = (part.dx || 0), zdy = (part.dy || 0), zps = ps, zUsed = false;
        if (part.zone && glyphZoneProvider && threeSidesOk && __placeAllowed) {
            const explicitZone = (part.zone === "zone1" || part.zone === "zone2");
            const prevP = explicitZone ? (placed[0] || null) : (placed[i - 1] || placed[0] || null);
            const anchor0 = prevP || { code: (lig.parts[0] || {}).code || "", dx: (lig.parts[0] || {}).dx || 0, dy: (lig.parts[0] || {}).dy || 0 };
            const zones0 = glyphZoneProvider(anchor0.code) || null;
            let z = null;
            if (part.zone === "auto") {
                z = zones0 ? (zones0.zone2 || zones0.zone1) : null;
            } else {
            // 与 JSesh Layout.visitLigature 一致：后接部件优先用"底部槽"，没有才用"右侧槽"
            // 与 JSesh Layout.visitLigature 一致：后接部件优先"底部槽"，没有再退"右侧槽"
            if (part.zone === "zoneB" || part.zone === "zone2") {
                z = zones0 ? (zones0.zoneB || zones0.zone2 || null) : null;
            } else {
                z = zones0 ? zones0[part.zone] : null;
            }
            }
            zUsed = !!(z && z.w > 0 && z.h > 0);
            if (zUsed) {
                const am = getMetrics(part.code);
                const inkW = Math.max(0.01, (am.width !== undefined ? am.width : am.w) / EM_SQUARE);
                const inkH = Math.max(0.01, (am.height !== undefined ? am.height : am.h) / EM_SQUARE);
                const fitK = (inkW <= z.w && inkH <= z.h) ? 1 : Math.min(z.w / inkW, z.h / inkH);
                const k = (part.scale || 1) * fitK;
                zps = fontSize * k;
                const w = inkW * k, h = inkH * k;
                const zLeft = (anchor0.dx || 0) + z.x;
                // 宿主墨迹盒高（em）：z.y/z.h 是 em 值，不能用 1em 作分母
                const hostHm = (function (c) { const b = glyphBoxProvider ? glyphBoxProvider(c) : null; return b ? b.h : 1; })(anchor0.code);
                const zBottom = (anchor0.dy || 0) + (hostHm - (z.y + z.h));
                zdx = (z.gh === "s") ? zLeft : (z.gh === "e") ? (zLeft + z.w - w) : (zLeft + (z.w - w) / 2);
                zdy = (z.gv === "b") ? zBottom : (z.gv === "t") ? (zBottom + z.h - h) : (zBottom + (z.h - h) / 2);
            }
        }
        // 兜底并排仅适用于"按连字区摆放"的部件；预定义连字（无 zone 字段）沿用自己的 dx/dy
        // 与源码一致：没有可用槽时"不放置"——各部件留在原位（视觉上重叠），不并排
        // 与源码一致：无槽时"不放置" —— 部件停在组的**左上角原点**（JSesh 的 y 向下原点）
        const noZoneOrigin = (i > 0 && part.zone && !zUsed);
        // 说明：JSesh 的 placeView 直接按连字区定位，不做"防重叠外推"。
        // 连字区本身就保证不与字形相交（二分搜索的判定），故此处保持与源码一致，不加额外位移。
        if (typeof globalThis !== "undefined") {
            const lg = globalThis.__ligDebug || (globalThis.__ligDebug = []);
            lg.push({ name: name, part: part.code, zone: part.zone || null, zUsed: !!zUsed,
                      host: (lig.parts[0] || {}).code,
                      zx: +zdx.toFixed(3), zy: +zdy.toFixed(3),
                      zdx: +zdx.toFixed(3), zdy: +zdy.toFixed(3), zps: +zps.toFixed(1), fontSize: fontSize });
        }
        const el = renderGlyph(box, part.code, zps, align);
        if (!el) return;
        // 绝对定位：part 的布局底边置于 (dx, dy) 处
        el.style.position = "absolute";
        el.style.left = px(zdx * fontSize) + "px";
        el.style.bottom = px(zdy * fontSize) + "px";
        if (noZoneOrigin) { el.style.top = "0px"; el.style.bottom = "auto"; }   // 原点 = 左上
        el.style.marginBottom = "0px";   // 连字区定位已含墨迹底边，避免 dy 二次叠加
        const __m = getMetrics(part.code);
        placed[i] = { code: part.code, dx: zdx, dy: zdy, w: (__m.width / EM_SQUARE) * (zps / fontSize), h: (__m.height / EM_SQUARE) * (zps / fontSize) , topAnchored: !!noZoneOrigin };
        if (ligatureDebug()) el.classList.add("lig-debug");
    });

    // 照抄 Layout.visitLigature 末尾的 fitToSubViews(true)：
    // 把所有部件的联合包围盒平移回原点（左上对齐），容器尺寸 = 联合尺寸。
    if (placed.length > 1) {
        const hostCode0 = (lig.parts[0] || {}).code || "";
        const hostHm2 = (function (c) { const b = glyphBoxProvider ? glyphBoxProvider(c) : null; return b ? b.h : 1; })(hostCode0);
        let minX = Infinity, maxX = -Infinity, minTop = Infinity, maxBottom = -Infinity;
        for (const p of placed) {
            if (!p) continue;
            if (p.dx < minX) minX = p.dx;
            if (p.dx + p.w > maxX) maxX = p.dx + p.w;
            const bottom = hostHm2 - p.dy;          // y 向下：部件底边
            const top = bottom - (p.h || 0);        // y 向下：部件顶边
            if (top < minTop) minTop = top;
            if (bottom > maxBottom) maxBottom = bottom;
        }
        if (isFinite(minX) && isFinite(maxX) && isFinite(minTop) && isFinite(maxBottom)) {
            const H2 = Math.max(maxBottom - minTop, 0.01);
            let k2 = 0;
            for (const child of box.children) {
                const p = placed[k2++];
                if (!p) continue;
                child.style.left = px((p.dx - minX) * fontSize) + "px";
                if (p.topAnchored) {
                    // 源码的"不放置"= 停在原点（左上）；整体平移时只动 top，不能用 bottom 公式覆盖
                    child.style.top = px((0 - minTop) * fontSize) + "px";
                    child.style.bottom = "auto";
                } else {
                    const nb = (H2 - (hostHm2 - p.dy) + minTop) * fontSize;
                    child.style.bottom = px(nb) + "px";
                    child.style.top = "auto";
                }
            }
            box.style.width = px(Math.max((maxX - minX) * fontSize, 0.02 * fontSize)) + "px";
            box.style.height = px(Math.max(H2 * fontSize, 1)) + "px";
        }
    }
    parent.appendChild(box);
    return box;
}

/**
 * 顶层入口：递归渲染单位树。
 * 渲染单位直接作为 flex item 追加到父容器（父容器用 flex-wrap 实现
 * 按宽度动态换行，每个字形 / VRG 组作为整体参与换行，不从中断开）。
 * @param {HTMLElement} parent 父容器
 * @param {Object} tree 单位树（char / vrg / seq）
 * @param {number} fontSize 基准字号（px）
 */
function render(parent, tree, fontSize) {
    ensureStyle();
    if (!tree) return;
    if (tree.type === "char") {
        if (tree.shadow) {
            renderInShadedCell(parent, fontSize, tree.shadow, (cell) => {
                renderGlyph(cell, tree.code, fontSize, "bottom", tree.mirror);
            }, true);
        } else {
            // 单字贴基线（与 JSesh 一致：符号"sit on the baseline"，不上下居中）
            renderGlyph(parent, tree.code, fontSize, encADepth > 0 ? "center" : "bottom", tree.mirror);
        }
    } else if (tree.type === "vrg") {
        if (tree.layers.length === 1 && !tree.shadow) {
            // 只有一层的 VRG 视为一般字符（序列）
            for (const u of tree.layers[0]) render(parent, u, fontSize);
        } else if (tree.shadow) {
            // 阴影覆盖整个四开组：先放进 1em 方格，再按方格划分四象限
            renderInShadedCell(parent, fontSize, tree.shadow, (cell) => {
                renderVRG(cell, tree.layers, fontSize);
            }, true);
        } else {
            renderVRG(parent, tree.layers, fontSize);
        }
    } else if (tree.type === "lig") {
        // 未知连字名：不静默丢弃 —— 把名字按 "-" 拆成字符顺序渲染，并在控制台告警
        if (!LIGATURES[tree.name] && !LIGATURES[String(tree.name).toLowerCase()]) {
            if (typeof console !== "undefined") {
                console.warn("[MdCRndr] 未定义的连字名 {" + tree.name + "}，已按顺序拆开渲染");
            }
            const fallback = document.createElement("span");
            fallback.className = "lig-fallback";
            String(tree.name).split("-").forEach(function (tok) {
                if (!tok) return;
                if (!renderGlyph(fallback, tok, fontSize, "center")) {
                    fallback.appendChild(document.createTextNode(tok));
                }
            });
            parent.appendChild(fallback);
        } else {
            renderLigature(parent, tree.name, fontSize);
        }
    } else if (tree.type === "newline") {
        // 手动换行：插入占满整行的空 flex item，强制后续单位换行
        const br = document.createElement("span");
        br.className = "br";
        parent.appendChild(br);
    } else if (tree.type === "text") {
        // 插入文本：适中字号（textScale × 基准字号，写成绝对 px，
        // 不依赖宿主容器的 font-size 基准）、上下居中（见 .txt 的 align-self）
        const txt = document.createElement("span");
        txt.className = "txt";
        txt.textContent = tree.text;
        txt.style.fontSize = px(options.textScale * fontSize) + "px";
        parent.appendChild(txt);
    } else if (tree.type === "enc") {
        renderEnclosure(parent, tree, fontSize, !!options.vertical);
    } else if (tree.type === "unsup") {
        // 字体不支持的码：方块占位 + 码名
        parent.appendChild(makeUnsupported(tree.code, fontSize, tree.mirror));
    } else if (tree.type === "seq") {
        for (const u of tree.units) render(parent, u, fontSize);
    }
}

    // ========================================================================
    // 五、解析器
    // ========================================================================
    // engine/parser.js - 输入语法解析（纯逻辑模块，无 DOM 依赖；迁移自 js/basic/parser.js）
//
// 输入语法（渲染码，JSesh 风格）：
//   *            同一四开组内并列（横排）
//   :            下移一层（竖叠）；相邻的 * / : 串构成一个四开组（VRG）
//   -            四开组之间的横排（组间为普通序列关系，VRG 内不允许）
//   { }          连字引用（名字内 ":" 与 "*" 归一化为 "-"）
//   ( )          词（内部按普通序列展开）
//   < >          插入文本（"\<"、"\>" 转义；内部保留空白）
//   $            手动换行（splitLines 据此分段）
//   空格         忽略（<> 文本区内保留）
//
// 主要接口：
//   parseInput(text) -> { tree, invalid }   树 + 无法识别的串列表（警戒反馈）
//   splitLines(tree) -> [seq, ...]          按 "$" 切分为渲染段

/**
 * 解析输入文本为渲染单位树；无法识别的串收集到返回值 invalid。
 */
/**
 * 复合转写保护：`Hry-sStA`、`prt-xrw` 这类转写自带连字符，
 * 而 `-` 又是 CHEAV 的 quadrat 分隔符。解析前先把这些已知复合转写里的
 * `-` 换成一个私有占位符，避免被拆开；expandUnit 查表前再换回来。
 */
const COMPOUND_TRANSLITS = (function () {
    const out = [];
    const push = (tbl) => {
        if (!tbl) return;
        for (const k of Object.keys(tbl)) if (k.indexOf("-") >= 0) out.push(k);
    };
    if (typeof MAIN_SIGNS !== "undefined") push(MAIN_SIGNS);
    if (typeof TRANSLIT_SIGNS !== "undefined") push(TRANSLIT_SIGNS);
    return Array.from(new Set(out)).sort((a, b) => b.length - a.length);   // 长优先
})();
const COMPOUND_MARK = "\u0001";

function protectCompounds(text) {
    if (!COMPOUND_TRANSLITS.length || text.indexOf("-") < 0) return text;
    let out = text;
    for (const k of COMPOUND_TRANSLITS) {
        const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp("(?<![A-Za-z\\\\])" + esc + "(?![A-Za-z])", "g");
        if (re.test(out)) {
            re.lastIndex = 0;
            out = out.replace(re, k.split("-").join(COMPOUND_MARK));
        }
    }
    return out;
}

/** 把一个写法（Gardiner 码或转写）解析成 Gardiner 码：与 expandUnit 同一套规则。 */
function resolveTranslitCode(c) {
    if (typeof MAIN_SIGNS !== "undefined" && MAIN_SIGNS[c]) return MAIN_SIGNS[c];
    if (typeof TRANSLIT_SIGNS !== "undefined" && TRANSLIT_SIGNS[c] && TRANSLIT_SIGNS[c].length) return TRANSLIT_SIGNS[c][0];
    return c;
}

function parseInput(text) {
    const invalid = [];
    // 复合转写（带 "-"）先保护起来，避免被当作 quadrat 分隔符
    text = protectCompounds(text);
    // 容错：孤立/悬空的 &（后面不是字母，如 "t&"、"t&&&"）直接丢弃，
    // 否则解析器会卡在"等待下一个码"的状态，表现为界面假死。
    text = text.replace(/&(?![A-Za-z])/g, "");
    // 即时连字：A&B / t&G43&t …（& = JSesh 连字连接符）
    // 规则：整串里必须且只能有一个"有插槽"的符号（宿主，zone1=前插槽 / zone2=后插槽）；
    //       其余必须是"插头"（无插槽）。宿主排在第一，插头按在原串中的前后进入 zone1/zone2。
    //       两个及以上有插槽、或完全没有宿主 → 视为非法连字，保持原样不合并。
    text = text.replace(/([A-Za-z][A-Za-z0-9]{0,6}(?:\s*&\s*[A-Za-z][A-Za-z0-9]{0,6})+)/g, (all) => {
        const codes = all.split("&").map((x) => x.trim()).filter((x) => x.length)
            .map((c) => resolveTranslitCode(c));
        if (codes.length < 2) return all;
        // 照 JSesh Layout.visitLigature 的规则选择"宿主"与插槽：
        //   · 2 个符号：宿主 = 两者中**更高**的那个；
        //       小符号在宿主之前 → zone1（左）；在宿主之后 → 底部槽（zoneB），无则 zone2（右）
        //   · 3 个符号：**中间**符号为宿主，前 → zone1，后 → zone2（JSesh 只查 zone0/zone1）
        // ① 先查 Tksesh 预定义连字（JSesh 的第一优先级，见 TkseshLigatureCatalogue）
        const tks = (typeof TKESH_LIGATURES !== "undefined") ? TKESH_LIGATURES[codes.join("&")] : null;
        if (tks) {
            const nm2 = codes.join("&");
            if (!LIGATURES[nm2]) {
                // tksesh: true → 使用"绝对坐标（y 向下）"排版，而不是连字区
                LIGATURES[nm2] = { name: nm2, tksesh: true, parts: tks.map(function (p) {
                    return { code: p.code, dx: p.dx, dy: p.dy, scale: p.scale };
                }) };
            }
            return "{" + nm2 + "}";
        }

        const heightOf = (c) => {
            try { const m = getMetrics(c); return Math.max(m.height, 1); } catch (err) { return 1; }
        };
        let hostIdx = 0;
        if (codes.length === 3) {
            hostIdx = 1;
        } else if (codes.length === 2) {
            hostIdx = (heightOf(codes[1]) * 0.8 > heightOf(codes[0])) ? 1 : 0;
        }
        const nm = codes.join("&");
        if (!LIGATURES[nm]) {
            const parts = [{ code: codes[hostIdx], dx: 0, dy: 0, scale: 1 }];
            codes.forEach((c, i) => {
                if (i === hostIdx) return;
                const rearZone = (codes.length === 3) ? "zone2" : "zoneB";   // 3 个：右槽；2 个：底部槽
                parts.push({ code: c, zone: i < hostIdx ? "zone1" : rearZone });
            });
            LIGATURES[nm] = { name: nm, parts: parts };
        }
        return "{" + nm + "}";
    });
    // 包围框种类（按顺序匹配前缀）：<- … ->（王名圈）、<S- … ->（塞拉赫框）、<h1- … -h1>（方框）
    // 包围框开/闭标记表（**长前缀在前**，parseEnclosure 按顺序取第一个匹配）
    //   1) CHEAV 旧语法（保留为别名）：<- … ->、<S- … ->、<h1- … -h1>、<F- … ->
    //   2) JSesh 正式语法（MdcLexicon.java:136-149）：<s / <s1 / <s2 / <s3 … s> / s1> …
    //      <h…>、<f…>、<g…>、<1/<2/<3 … 1> / 2> / 3>；结束标记里的数字 = 结束端 part
    const ENC_OPENERS = [
        // [kind, 开标记, 闭标记, 起始端 part, 结束端 part]
        // CHEAV 旧语法（别名）：起始端固定 1，结束端固定 2
        ["h1", "<h1-", "-h1>", 1, 2], ["S", "<S-", "->", 1, 2], ["F", "<F-", "->", 1, 2], ["A", "<-", "->", 1, 2],
        // JSesh 正式语法：数字出现在开标记=起始端，出现在闭标记=结束端
        ["S", "<s3", "s3>", 3, 3], ["S", "<s2", "s2>", 2, 2], ["S", "<s1", "s1>", 1, 1], ["S", "<s", "s>", 1, 2],
        ["h1", "<h3", "h3>", 3, 3], ["h1", "<h2", "h2>", 2, 2], ["h1", "<h1", "h1>", 1, 1], ["h1", "<h", "h>", 1, 2],
        ["F", "<f3", "f3>", 3, 3], ["F", "<f2", "f2>", 2, 2], ["F", "<f1", "f1>", 1, 1], ["F", "<f", "f>", 1, 2],
        ["A", "<g3", "g3>", 3, 3], ["A", "<g", "g>", 1, 2],
        ["A", "<3", "3>", 3, 3], ["A", "<2", "2>", 2, 2], ["A", "<1", "1>", 1, 1]
    ];

    // 预处理：外部空白宽容剔除；"<>" 文本区内部保留空白（含空格）。
    // "<" 进入文本区、"<" 前带 "\" 转义不进入；">" 退出文本区（"\>" 转义不退出）。
    let s = "";
    let inText = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const escaped = i > 0 && text[i - 1] === "\\";
        if (!inText) {
            if (ch === "<" && !escaped) {
                // 包围框：整段按原样复制（内容不进入 <文本> 模式），用栈配对到对应闭框，
                // 以便框内可含 <文本>、连字、嵌套框等。
                let spec = null;
                for (const sp of ENC_OPENERS) {
                    if (text.slice(i, i + sp[1].length) === sp[1]) { spec = sp; break; }
                }
                if (spec) {
                    const stack = [spec[2]];
                    s += spec[1];
                    let j = i + spec[1].length;
                    while (j < text.length) {
                        let op = null;
                        for (const sp of ENC_OPENERS) {
                            if (text.slice(j, j + sp[1].length) === sp[1]) { op = sp; break; }
                        }
                        if (op) { stack.push(op[2]); s += op[1]; j += op[1].length; continue; }
                        const topc = stack[stack.length - 1];
                        if (text.slice(j, j + topc.length) === topc) {
                            stack.pop(); s += topc; j += topc.length;
                            if (!stack.length) break;
                            continue;
                        }
                        s += text[j]; j++;
                    }
                    i = j - 1;
                    continue;
                }
                inText = true; s += ch;
            }
            else if (ch === ">" && !escaped) { /* 孤立 > 忽略 */ }
            else if (!/\s/.test(ch)) s += ch;
        } else {
            s += ch;
            if (ch === ">" && !escaped) inText = false;
        }
    }
    let pos = 0;

    /**
     * 配对失败时的警戒记录：截取出错片段（含冲突的结束符）并说明缺失项。
     * 例："(D21:G43}" → "(D21:G43} (缺少 \")\")"。
     */
    function closerError(start, want) {
        const end = Math.min(pos + 1, s.length);
        return s.slice(start, end) + " (缺少 \"" + want + "\")";
    }

    function parseCode() {
        const start = pos;
        // "#" 是阴影分隔符（<组>#<1-4>），必须在此终止码 token
        // "\\" 是镜像后缀（<码>\\ → 该字符水平镜像），必须在此终止码 token
        while (pos < s.length && !"-*:]})($<>#\\".includes(s[pos])) pos++;
        return s.slice(start, pos);
    }

    // 词 (...) ：必须由 ")" 闭合
    function parseWord() {
        const start = pos;
        pos++; // (
        const inner = parseSequence();
        if (pos < s.length && s[pos] === ")") pos++;
        else invalid.push(closerError(start, ")"));
        return { type: "word", inner };
    }

    // 连字 {name}：{ } 内是连字名（字符组合，如 "G39-X1"）。
    // 连字名内的分隔符统一为 "-"（":" 与 "*" 都归一化），
    // 各段别名码规范化为正式名（{J1-D52-X1} → {AA1-D52-X1}）。
    function parseLigature() {
        const start = pos;
        pos++; // {
        const at = pos;
        while (pos < s.length && s[pos] !== "}") pos++;
        const name = s.slice(at, pos).replace(/[:*]/g, "-")
            .split("-").map(canonicalCode).join("-");
        if (pos < s.length && s[pos] === "}") pos++;
        else { invalid.push(closerError(start, "}")); return { type: "lig", name: "" }; }
        return { type: "lig", name };
    }

    // 包围框：<- … ->（王名圈）、<S- … ->（塞拉赫框）、<h1- … -h1>（裸方框）。
    // 以 "<种类-" 开头，与普通插入文本 <文本> 区分；内容递归按本语法解析。

    function parseEnclosure() {
        const rest = s.slice(pos);
        let kind = null, open = "", close = "", startPart = 1, endPart = 2;
        for (const spec of ENC_OPENERS) {
            if (rest.slice(0, spec[1].length) === spec[1]) { kind = spec[0]; open = spec[1]; close = spec[2]; startPart = spec[3] || 1; endPart = spec[4] || 2; break; }
        }
        if (!kind) return parseText();                 // 不是包围框 → 普通插入文本
        pos += open.length;
        const from = pos;
        // 用栈配对，支持嵌套（<-<S-…->->）：遇任何开框入栈，遇栈顶闭框出栈
        let end = -1;
        const stack = [close];
        for (let i = pos; i < s.length;) {
            let opened = null;
            for (const spec of ENC_OPENERS) {
                if (s.slice(i, i + spec[1].length) === spec[1]) { opened = spec; break; }
            }
            if (opened) { stack.push(opened[2]); i += opened[1].length; continue; }
            const top = stack[stack.length - 1];
            if (s.slice(i, i + top.length) === top) {
                stack.pop();
                if (!stack.length) { end = i; break; }
                i += top.length;
                continue;
            }
            i++;
        }
        const inner = end < 0 ? s.slice(from) : s.slice(from, end);
        // 包围框不允许嵌套（王名圈、塞拉赫框、方框皆同）——出现即报错
        for (const spec of ENC_OPENERS) {
            if (inner.indexOf(spec[1]) >= 0) {
                invalid.push(open + inner + close + " (包围框不允许嵌套)");
                break;
            }
        }
        if (end < 0) invalid.push(s.slice(from - open.length) + " (缺少 " + close + ")");
        pos = end < 0 ? s.length : end + close.length;
        const sub = parseInput(inner);                 // 内容递归解析
        for (const msg of sub.invalid) invalid.push(msg);
        const units = sub.tree && sub.tree.type === "seq" ? sub.tree.units : (sub.tree ? [sub.tree] : []);
        return { type: "enc", kind: kind, units: units, startPart: startPart, endPart: endPart };
    }
    // 插入文本 <text>：< > 内为普通文本；"\<" 与 "\>" 转义为字面 "<" 与 ">"。
    function parseText() {
        const start = pos;
        pos++; // <
        let t = "";
        while (pos < s.length && s[pos] !== ">") {
            if (s[pos] === "\\" && pos + 1 < s.length && (s[pos + 1] === "<" || s[pos + 1] === ">")) {
                t += s[pos + 1];
                pos += 2;
            } else {
                t += s[pos];
                pos++;
            }
        }
        if (pos < s.length) pos++; // >
        else invalid.push(closerError(start, ">"));
        return { type: "text", text: t };
    }

    // 单个单位解析：无法消费任何字符时返回 null（由四开组解析终止循环）
    function parseUnit() {
        const ch = s[pos];
        if (ch === "{") return parseLigature();
        if (ch === "(") return parseWord();
        if (ch === "<") return parseEnclosure();   // <A- … -> / <S- … -> / <h1- … -h1>
        if (ch === "<") return parseText();
        // "$"：手动换行（渲染区强制换行；文本框中保留显示）
        if (ch === "$") { pos++; return { type: "newline" }; }
        return parseCode();
    }

    // 四开组（quadrat）：由 "*"（同层并列）与 ":"（下移一层）连接的单位串，
    // 遇到 "-"（组间分隔）或输入结束即终止。返回单位数组；
    // 含 ":" 时返回单个 VRG 单位（层自上而下）。VRG 内部不允许 "-"（横排一律用 "*"）。
    function parseQuadrat() {
        const items = [{ unit: parseUnit(), sep: null }];
        while (pos < s.length) {
            const ch = s[pos];
            if (ch === "*" || ch === ":") {
                // 同层并列 / 下移一层
                pos++;
                items[items.length - 1].sep = ch;
                items.push({ unit: parseUnit(), sep: null });
            } else if (ch === "$") {
                // 手动换行：作为独立单位插入（非分隔符语义）
                pos++;
                items.push({ unit: { type: "newline" }, sep: null });
                items.push({ unit: parseUnit(), sep: null });
            } else if (ch === "#") {
                // 阴影：<组>#<1-4>，1=左上 2=右上 3=左下 4=右下，可自由组合
                pos++;
                let digits = "";
                while (pos < s.length && "1234".indexOf(s[pos]) >= 0) { digits += s[pos]; pos++; }
                if (digits) {
                    const last = items[items.length - 1];
                    if (last) last.shadow = digits;
                } else {
                    invalid.push("#" + s.slice(pos));
                }
            } else if (ch === "\\") {
                // 镜像后缀：<码>\ 表示把紧邻的一个字符水平镜像（JSesh 兼容）
                pos++;
                const lastMirror = items[items.length - 1];
                if (lastMirror && lastMirror.unit !== "") lastMirror.mirror = true;   // 前面没有可镜像的单位 → 记非法
                else invalid.push("\\");
            } else if (ch === "-") {
                break;              // 四开组结束（"-" 由 parseSequence 消费）
            } else {
                // 其他字符：作为新单位直接解析（< { ( 或普通码均可无分隔符相连）
                const before = pos;
                const unit = parseUnit();
                if (pos === before) break;   // 无法消费任何字符（如多余的字符），停止
                items.push({ unit, sep: null });
            }
        }
        // 带镜像后缀的项包成 { type:"mirror" }，由 expandUnit 展开后挂 mirror 标记
        const unitOf = (it) => (it.mirror ? { type: "mirror", unit: it.unit } : it.unit);
        // 阴影作用于整个四开组（quadrat / VRG）：取最后一个带阴影的项
        const quadratShadow = (items.filter(it => it.shadow).pop() || {}).shadow || null;
        if (items.some(it => it.sep === ":")) {
            const layers = [];
            let current = [];
            for (const it of items) {
                current.push(unitOf(it));
                if (it.sep === ":" || it.sep === null) {
                    layers.push(current);
                    current = [];
                }
            }
            const unit = { type: "vrg", layers };
            if (quadratShadow) unit.shadow = quadratShadow;
            return [unit];
        }
        const units = items.map(unitOf);
        // "*" 连接的同层组保留为单层 VRG：
        //   横排结果不变（render 对单层组仍按序列展开，不产生层内间隙）；
        //   竖排据此知道这些单位应并列在同一"行"（HRG），而不是各占一行。
        // 含 "$" 换行时不打包，交给 splitLines 处理。
        if (units.length > 1 && items.some(it => it.sep === "*") && !units.some(x => x.type === "newline")) {
            const unit = { type: "vrg", layers: [units] };
            if (quadratShadow) unit.shadow = quadratShadow;
            return [unit];
        }
        if (quadratShadow) {
            if (units.length === 1) return [{ type: "shaded", unit: units[0], shadow: quadratShadow }];
            return [{ type: "vrg", layers: [units], shadow: quadratShadow }];
        }
        return units;
    }

    // 顶层序列：由 "-" 分隔的四开组依次横排（组间只是普通的序列关系）。
    function parseSequence() {
        const units = [];
        for (;;) {
            for (const u of parseQuadrat()) units.push(u);
            if (pos < s.length && s[pos] === "-") { pos++; continue; }
            break;
        }
        return units;
    }

    // 展开单位树：码 token → char 单位；MdC 词汇 → 解析词汇渲染码为单位树嵌入。
    // 渲染区只识别 **raw MdC 渲染串**（Gardiner 码 / 十六进制码 / 组语法 / {连字} / <文本>）。
    // 不识别读音（Vocabulary 的 MdC）与定符名——那些只在 IB 的匹配系统中使用，
    // 由 normalizeMdC 在入正文前把音素片段转成码。
    // 无法识别的串收集到 invalid（文本框警戒色反馈）。
    function expandUnit(u) {
        if (typeof u === "string") {
            if (u === "") return null; // 空串（空文本框）不计入无法识别
            u = u.split(COMPOUND_MARK).join("-");      // 还原被保护的复合转写连字符
            const mode = detectInputMode(u);
            if (mode === "Gardiner") {
                // 表内只登记字体实有的字形；查不到 → 语法合法但字体不支持 → 占位框
                const code = canonicalCode(u);
                return hg(code) ? { type: "char", code: code } : { type: "unsup", code: code };
            }
            if (mode === "Hex") {
                const ch = decodeCode(u);
                // 字体覆盖情况以度量表（= 字体 cmap）为准
                if (ch) {
                    const key = "x" + ch.codePointAt(0).toString(16);
                    if (visuHeight[key] || visuWidth[key]) return { type: "char", code: u };
                }
                return { type: "unsup", code: u };
            }
            // 非码串：可能是 JSesh 的转写（如 mr、mA、Hr）→ 取其"主字符"码；
            // 没有登记主字符时取该转写的第一个候选（与音素匹配框里排在最前的一致）。
            let translitCode = null;
            if (typeof MAIN_SIGNS !== "undefined" && Object.prototype.hasOwnProperty.call(MAIN_SIGNS, u)) {
                translitCode = MAIN_SIGNS[u];
            } else if (typeof TRANSLIT_SIGNS !== "undefined" && TRANSLIT_SIGNS[u] && TRANSLIT_SIGNS[u].length) {
                translitCode = TRANSLIT_SIGNS[u][0];
            }
            if (translitCode) {
                const code = canonicalCode(translitCode);
                return hg(code) ? { type: "char", code: code } : { type: "unsup", code: code };
            }
            // 其余非码串（读音 / 词名 / 定符名等）→ 非法
            invalid.push(u);
            return null;
        }
        if (u.type === "mirror") {
            // 水平镜像：单字符与"字体不支持"的占位码都可以镜像（镜像不改变度量，排版不受影响）
            const inner = expandUnit(u.unit);
            if (!inner) return null;
            return (inner.type === "char" || inner.type === "unsup")
                ? Object.assign({}, inner, { mirror: true })
                : inner;
        }
        if (u.type === "shaded") {
            // 阴影包装：先展开内部单位，再把分区信息挂到结果上
            const inner = expandUnit(u.unit);
            if (!inner) return null;
            return Object.assign({}, inner, { shadow: u.shadow });
        }
        if (u.type === "vrg") {
            return { type: "vrg", layers: u.layers.map(line => line.map(expandUnit).filter(x => x)), shadow: u.shadow };
        }
        if (u.type === "lig") {
            if (LIGATURES[u.name]) return u; // 连字名保留，渲染时查 LIGATURES 表
            invalid.push("{" + u.name + "}");
            return null;
        }
        if (u.type === "newline") {
            return u; // 手动换行标记，渲染时强制换行
        }
        if (u.type === "text") {
            return u; // 插入文本单位，渲染时以适中字号居中显示
        }
        if (u.type === "enc") {
            // 包围框：内容在 parseEnclosure 中已递归解析并展开，这里原样保留
            return { type: "enc", kind: u.kind, units: u.units || [] };
        }
        if (u.type === "word") {
            // 词（lexis）：功能暂留空，内部按普通序列展开
            return { type: "seq", units: u.inner.map(expandUnit).filter(x => x) };
        }
        return null;
    }

    const top = parseSequence();
    // 顶层若仍有未消费的字符（多余 / 异种的结束符）→ 同样计入警戒
    if (pos < s.length) invalid.push(s.slice(pos) + " (多余的字符)");
    const tree = { type: "seq", units: top.map(expandUnit).filter(x => x) };
    return { tree, invalid };
}

/**
 * 把顶层序列按 "$" 手动换行切分为多个段（每个段独立渲染到 .RenderLine，
 * 段间距由外层 column 布局的 row-gap 统一，与段内自动换行间距一致）。
 */
function splitLines(tree) {
    if (!tree) return [];
    if (tree.type !== "seq") return [tree];
    const lines = [];
    let current = [];
    for (const u of tree.units) {
        if (u.type === "newline") {
            if (current.length) {
                lines.push({ type: "seq", units: current });
                current = [];
            }
        } else {
            current.push(u);
        }
    }
    if (current.length) lines.push({ type: "seq", units: current });
    return lines;
}

    // ========================================================================
    // 六、样式注入（含 @font-face）
    // ========================================================================
    /** 包围框样式（王名圈 / 塞拉赫框 / 方框，横排与竖排两种朝向）。 */
    function encCss() {
        const e = "." + options.encClass;
        const body = e + "-body";
        const A = "." + options.encKindClass.A;
        const S = "." + options.encKindClass.S;
        const h1 = "." + options.encKindClass.h1;
        const v = "." + options.encVerticalClass;
        const pad = ENC_PAD + "em";
        return [
            e + " {",
            "    display: inline-flex;",
            "    position: relative;",
            "    box-sizing: content-box;",
            "    padding: " + pad,
            "    vertical-align: bottom;",
            "}",
            body + " {",
            "    display: inline-flex;",
            "    align-items: flex-end;",
            "}",
            A + " {",                       // 圆框：胶囊 + 座（座在框外侧，见 ::after）
            "    border: 0.05em solid #000;",
            "    border-radius: 100vh;",     // 胶囊
            "    padding: 0.1em 0.3em;",     // 竖 0.1 / 横 0.3
            "    box-sizing: content-box;",  // 0.7(内容) + 0.2 + 0.1 = 1em
            "    position: relative;",
            "}",
            A + " .enc-body {",              // 王名圈：框内内容整体居中（JSesh 行为）
            "    display: flex;",
            "    min-height: 1em;",
            "    align-items: center;",
            "    justify-content: center;",
            "}",
            A + "::after {",                // 座：框右侧细条（宽度 = 边框，上下各出半线）
            "    content: \"\";",
            "    position: absolute;",
            "    right: 0;",
            "    top: 0;",
            "    width: 0.05em;",
            "    height: calc(100% + 0.05em);",
            "    margin-top: -0.025em;",
            "    background: #000;",
            "    border-radius: 0.02em;",
            "    transform: translateX(100%);",
            "}",
            A + v + " {",                   // 竖排：内容纵向，座在下
            "    padding: 0.3em 0.1em;",
            "}",
            A + v + "::after {",            // 竖排的座：框下侧细横条
            "    top: auto;",
            "    right: 0;",
            "    bottom: 0;",
            "    width: calc(100% + 0.05em);",
            "    height: 0.05em;",
            "    margin-top: 0;",
            "    margin-left: -0.025em;",
            "    transform: translateY(100%);",
            "}",
            S + " {",                       // 塞拉赫框：矩形 + 底部宫墙纹
            "    border: 0.05em solid #000;",   // 与 JSesh 一致：细框线
            "    padding: 0.13em 0.08em;",           // 0.64 + 0.26 + 0.10 = 1em（与尾部等高）
            "    margin-right: 0;",             // 尾部由 .enc-S-tail 占位
            "    box-sizing: content-box;",      // 0.55 + 0.1 + 0.3 + 0.05×2 ≈ 1em
            "    position: relative;",
            "}",
            ".enc-S-wrap {",
            "    display: inline-flex;",
            "    align-items: stretch;",     // 尾部随框高度拉伸
            "    vertical-align: bottom;",
            "}",
            ".enc-S-tail {",
            "    display: inline-block;",
            "    width: 0.883em;",
            "    background: 0 0 / 100% 100% no-repeat;",
            "}",
            S + ".enc-S-svg:not(" + v + ")::after {",   // 横排：伪元素作废（尾部用 .enc-S-tail 元素）
            "    content: none;",
            "}",
            S + v + ".enc-S-svg::after {",               // 竖排：下尾旋转 90°，与框方向一致
            "    content: \"\";",
            "    background: var(--enc-tail) center center / 100% 100% no-repeat;",
            "    width: 0.883em;",                     // 旋转后可见宽度 = 1em（与框同宽）
            "    height: 1em;",                         // 旋转后可见高度 = 0.883em
            "    transform: translate(-50%, 100%) rotate(90deg);",
            "    transform-origin: center center;",
            "}",
            S + "::after {",                // 右尾（横排）：字体字形 U+13282
            "    content: \"\u{13282}\";",
            "    position: absolute;",
            "    right: 0;",
            "    top: -0.05em;",
            "    bottom: auto;",
            "    transform: translate(100%, 0);",
            "    font-family: \"" + options.fontFamily + "\", \"" + options.fontFamily + "\";",
            "    font-size: 1em;",      // = 框高（0.70 + 0.24 + 0.06）
            "    line-height: 1;",
            "    color: #000;",
            "}",
            S + v + " {",                   // 竖排：下尾在底部，故底部留位
            "    padding: 0.11em 0.04em;",           // 竖排：左右收紧到 0.04
            "    width: 1em;",                // 固定 1em 宽：与尾部字形同宽
            "    box-sizing: border-box;",
            "    margin-right: 0;",
            "    margin-bottom: 0.996em;",   // 与尾同高
            "}",
            S + v + "::after {",            // 下尾（竖排）：字体字形 uniE46A，贴框外沿（下），宽与框同
            "    content: \"\uE46A\";",
            "    left: 50%;",
            "    right: auto;",
            "    bottom: 0.07em;",        // 基准是内边距盒 → 加边框宽，贴住框下外沿
            "    top: auto;",
            "    transform: translate(-50%, 100%);",
            "    font-size: 1em;",      // = 框高（0.70 + 0.24 + 0.06）
            "}",
            v + " .enc-body {",             // 竖排：框内内容纵向排列并居中
            "    flex-direction: column;",
            "    align-items: center;",
            "    justify-content: center;",
            "    width: 100%;",              // 撑满框宽，否则 inline-flex 收缩到内容宽、靠左
            "}",
            "." + options.encKindClass.F + " {",   // 堡垒框（F，fortified enclosure）：细框线 + 外圈雉堞齿（由真实 DOM 元素绘制）
            "    border: 0.03em solid #000;",
            "    position: relative;",
                        "    padding: 0.08em;",
            "    margin: 0.12em;",   // 为框外齿带预留布局空间，避免溢出容器  "    box-sizing: content-box;",
            "}",
            "." + options.encKindClass.F + " .enc-F-edge,",
            "." + options.encKindClass.F + " .enc-F-corner {",
            "    position: absolute;",
            "    pointer-events: none;",
            "}",
            "." + options.encKindClass.F + " .enc-F-edge {",   // 边：齿带 0.14em，相位居中 → 左右/上下对称
            "    background-image: repeating-linear-gradient(var(--f-angle, 90deg), #000 0 0.16em, transparent 0.16em 0.24em);",
            "    background-size: 0.24em 100%;",   // 一个齿周期
            "    background-repeat: space;",       // 整齿等距分布，两端不留半齿
            "    background-position: center;",
            "}",
            "." + options.encKindClass.F + " .enc-F-l,",
            "." + options.encKindClass.F + " .enc-F-r {",
            "    background-size: 100% 0.24em;",   // 竖向边沿 y 平铺
"}",

            "." + options.encKindClass.F + " .enc-F-t { left: 0.24em; right: 0.24em; top: -0.09em; height: 0.10em; }",
            "." + options.encKindClass.F + " .enc-F-b { left: 0.24em; right: 0.24em; bottom: -0.09em; height: 0.10em; }",
            "." + options.encKindClass.F + " .enc-F-l { top: 0.24em; bottom: 0.24em; left: -0.09em; width: 0.10em; --f-angle: 180deg; }",
            "." + options.encKindClass.F + " .enc-F-r { top: 0.24em; bottom: 0.24em; right: -0.09em; width: 0.10em; --f-angle: 180deg; }",
            "." + options.encKindClass.F + " .enc-F-corner {",   // 角：0.14em 方块 + 两向臂 = L
            "    width: 0.14em;",
            "    height: 0.14em;",
            "}",
            "." + options.encKindClass.F + " .enc-F-corner::before,",
            "." + options.encKindClass.F + " .enc-F-corner::after {",
            "    content: \"\";",
            "    position: absolute;",
            "    background-color: #000;",
            "}",
            "." + options.encKindClass.F + " .enc-F-corner::before { width: 0.24em; height: 0.10em; }",
            "." + options.encKindClass.F + " .enc-F-corner::after { width: 0.10em; height: 0.24em; }",
            "." + options.encKindClass.F + v + " {",
            "    width: 1em;",
            "    box-sizing: border-box;",   // 竖排固定 1em 宽，短边才有齿位
            "}",

            "." + options.encKindClass.F + " .enc-F-tl { left: -0.09em; top: -0.09em; }",
            "." + options.encKindClass.F + " .enc-F-tr { right: -0.09em; top: -0.09em; }",
            "." + options.encKindClass.F + " .enc-F-bl { left: -0.09em; bottom: -0.09em; }",
            "." + options.encKindClass.F + " .enc-F-br { right: -0.09em; bottom: -0.09em; }",
            "." + options.encKindClass.F + " .enc-F-tl::before, .enc-F-tr::before { top: 0; }",
            "." + options.encKindClass.F + " .enc-F-bl::before, .enc-F-br::before { bottom: 0; }",
            "." + options.encKindClass.F + " .enc-F-tl::before, .enc-F-bl::before { left: 0; }",
            "." + options.encKindClass.F + " .enc-F-tr::before, .enc-F-br::before { right: 0; }",
            "." + options.encKindClass.F + " .enc-F-tl::after, .enc-F-tr::after { top: 0; }",
            "." + options.encKindClass.F + " .enc-F-bl::after, .enc-F-br::after { bottom: 0; }",
            "." + options.encKindClass.F + " .enc-F-tl::after, .enc-F-bl::after { left: 0; }",
            "." + options.encKindClass.F + " .enc-F-tr::after, .enc-F-br::after { right: 0; }",
            h1 + " {",                      // 裸方框
            "    border: 0.07em solid #000;",   // 与塞拉赫框同粗
            "    padding: 0.08em;",             // 0.70 内容 + 0.16 内边距 + 0.14 边框 = 1em
            "    box-sizing: content-box;",
            "}",
            "",
        ].join("\n");
    }
    function buildCss() {
        const g = "." + options.glyphClass;
        const vrg = "." + options.vrgClass;
        const layer = "." + options.vrgLayerClass;
        const lig = "." + options.ligClass;
        const fam = '"' + options.fontFamily + '", "NewGardiner", ' + options.fontFallback;
        let css = "";
        if (options.injectFontFace) {
            css += '@font-face {\n'
                + '    font-family: "' + options.fontFamily + '";\n'
                + '    src: url("' + options.fontUrl + '") format("truetype");\n'
                + '    font-display: block;\n'
                + '}\n\n';
        }
        css += encCss() + "\n";
        css += g + ' {\n'
            + '    display: inline-block;\n'
            + '    line-height: 1;\n'
            + '    font-family: ' + fam + ';\n'
            + '}\n\n'
            + vrg + ' {\n'
            + '    display: inline-flex;\n'
            + '    flex-direction: column;\n'
            + '}\n\n'
            + '.sh-cell {\n'                                  // 阴影格：高 1em、宽随字形自然宽度
            + '    display: inline-flex;\n'
            + '    justify-content: center;\n'
            + '    flex: 0 0 auto;\n'
            + '    line-height: 1;\n'
            + '}\n\n'
            + layer + ' {\n'
            + '    display: flex;\n'
            + '    align-items: flex-end;\n'
            + '    overflow: visible;\n'
            + '    white-space: nowrap;\n'
            + '}\n\n'
            + lig + ' {\n'
            + '    position: relative;\n'
            + '    display: inline-block;\n'
            + '    vertical-align: bottom;\n'
            + '    line-height: 1;\n'
            + '}\n\n'
            + lig + ' ' + g + ' {\n'
            + '    position: absolute;\n'
            + '    margin: 0;\n'
            + '}\n\n'
            + '.' + options.brClass + ' {\n'
            + '    flex-basis: 100%;\n'
            + '    height: 0;\n'
            + '}\n\n'
            + '.' + options.textClass + ' {\n'
            + '    font-family: sans-serif;\n'
            + '    font-size: ' + options.textScale + 'em;\n'   // 回退值；引擎渲染时会写入绝对 px
            + '    line-height: 1;\n'
            + '    align-self: center;\n'
            + '    color: #333;\n'
            + '    white-space: pre;\n'
            + '}\n\n'
            + '.' + options.unsupportedClass + ' {\n'
            + '    display: inline-flex;\n'                  // 方块占位：码名居中
            + '    align-items: center;\n'
            + '    justify-content: center;\n'
            + '    box-sizing: border-box;\n'
            + '    vertical-align: baseline;\n'              // 与普通字符同坐基线
            + '    border: 1px solid #b4b4b4;\n'
            + '    border-radius: 2px;\n'
            + '    background: #f7f7f7;\n'
            + '    color: #555;\n'
            + '    font-family: Consolas, "Courier New", monospace;\n'
            + '    line-height: 1;\n'
            + '    white-space: nowrap;\n'
            + '    overflow: hidden;\n'
            + '}\n\n'
            + '.' + options.vtextClass + ' {\n'
            + '    display: inline-flex;\n'
            + '    flex-direction: row;\n'          // 列自左向右（字形朝前，不镜像时按左→右）
            + '    align-items: flex-start;\n'
            + '    gap: var(--mdc-col-gap, 0.3em);\n'
            + '}\n\n'
            + '.' + options.vlineClass + ' {\n'
            + '    display: flex;\n'
            + '    flex-direction: column;\n'
            + '    align-items: center;\n'
            + '    width: 1em;\n'                  // 列宽恒为 1em（= 一个四开组）
            + '    flex: 0 0 auto;\n'            // 不被压缩：列多时横向溢出滚动，而非挤扁字形
            + '}\n\n'
            + '.' + options.hrgClass + ' {\n'
            + '    display: inline-flex;\n'
            + '    flex-direction: column;\n'      // 与横排 VRG 同一几何
            + '}\n\n'
            + '.' + options.textClass + '.txt-v {\n'
            + '    writing-mode: vertical-rl;\n'
            + '    text-orientation: mixed;\n'
            + '    align-self: center;\n'
            + '}\n\n'
            + '.' + options.ligDebugClass + ' {\n'
            + '    outline: 1px solid red;\n'
            + '    background: rgba(255, 0, 0, 0.08);\n'
            + '}\n';
        return css;
    }

    /** 注入（或重建）样式表；幂等：同 id 已存在则替换内容。 */
    let styleReady = false;
    function injectStyle() {
        if (!options.injectStyle) return;
        const doc = global.document;
        if (!doc || !doc.createElement) return;
        let el = doc.getElementById ? doc.getElementById(options.styleId) : null;
        if (!el) {
            el = doc.createElement("style");
            el.id = options.styleId;
            (doc.head || doc.documentElement).appendChild(el);
        }
        el.textContent = buildCss();
        styleReady = true;
    }
    /**
     * 确保样式已注入。首次渲染时自动调用，这样宿主页面不写 init() 也能正常显示
     * （@font-face 与全部布局规则都在这里注入）。
     */
    function ensureStyle() {
        if (!styleReady) injectStyle();
    }

    // ========================================================================
    // 七、公开 API
    // ========================================================================
    const MdCRndr = {
        DEFAULTS: DEFAULTS,

        /** 初始化（幂等）：应用配置并注入样式。 */
        init: function (userOptions) {
            setOptions(userOptions);
            injectStyle();
            return MdCRndr;
        },

        /** 运行期修改配置（部分覆盖），重新注入样式。 */
        set: function (userOptions) {
            setOptions(userOptions);
            injectStyle();
            return MdCRndr;
        },

        /** 生效配置副本。 */
        config: function () { return Object.assign({}, options); },

        // ---- 渲染 ----
        render: function (el, tree, fontSize) {
            return render(el, tree, fontSize === undefined ? options.fontSize : fontSize);
        },
        /** 解析纯 MdC 渲染串并渲染到元素（横排；输入框、预览、候选用它）。 */
        renderText: function (el, text, fontSize) {
            if (typeof Glyphs !== "undefined" && Glyphs.beginZoneBudget) Glyphs.beginZoneBudget(8);
            ensureStyle();
            const r = parseInput(text);
            for (const line of splitLines(r.tree)) {
                render(el, line, fontSize === undefined ? options.fontSize : fontSize);
            }
            return r;
        },

        renderVerticalText: function (el, text, fontSize) {
            ensureStyle();
            const r = parseInput(text);
            renderVertical(el, r.tree, fontSize === undefined ? options.fontSize : fontSize);
            return r;
        },


        /**
         * 设置自定义字形提供者（code → 图片 URL；返回 null 表示回落到字体字形）。
         * 传 null 取消。用于把字体渲染切换成 SVG 字形等外部来源。
         * @param {Function|null} fn
         * @returns {Object} MdCRndr（可链式调用）
         */
        /**
         * 设置字形宽高比提供者（code → 宽/高）。传 null 取消。
         * 引擎用它决定宽符号（如 P114）的盒子宽度，避免被压进 1em 方格。
         */
        /** 该码在内置字体（NewGardiner）里是否有字形。 */
        supportsCode: function (code) {
            try { return !!hg(code); } catch (e) { return false; }
        },

        /**
         * 设置字形绘制矩形提供者（code → { x, y, w, h }，单位 em）。
         * JSesh 模式用它按画框/墨迹把 SVG 精确摆进字形格（底边对基线、允许越界）。
         */
        /** 切换四开组布局模式："flow"（默认）| "jsesh"（显式几何，实验） */
        /** 切换王名圈实现：true = JSesh 几何 + SVG 环；false = 旧 CSS 方案 */
    setJsethEnclosure: function (on) { options.jsethEnclosure = !!on; },
    getJsethEnclosure: function () { return !!options.jsethEnclosure; },
    setQuadratMode: function (mode) {
            quadratMode = (mode === "jsesh") ? "jsesh" : "flow";
            return MdCRndr;
        },

        setGlyphBoxProvider: function (fn) {
            glyphBoxProvider = (typeof fn === "function") ? fn : null;
if (window.MDC && window.MDC.providers) window.MDC.providers.box = glyphBoxProvider;
            return MdCRndr;
        },

        /**
         * 设置字形度量提供者（code → { w, h }，单位 em）。传 null 恢复字体度量。
         * JSesh 模式用它让排版采用 JSesh 的比例（18 单位 = 1em）。
         */
        setGlyphMetricsProvider: function (fn) {
            glyphMetricsProvider = (typeof fn === "function") ? fn : null;
if (window.MDC && window.MDC.providers) window.MDC.providers.metrics = glyphMetricsProvider;
            return MdCRndr;
        },

        setGlyphAspectProvider: function (fn) {
            glyphAspectProvider = (typeof fn === "function") ? fn : null;
if (window.MDC && window.MDC.providers) window.MDC.providers.aspect = glyphAspectProvider;
            return MdCRndr;
        },

        /** 连字区缩放策略："shrink"（默认，与 JSesh 一致） | "fill" | "fill85"。 */
        setZoneFit: function (mode) {
            zoneFitMode = (mode === "shrink" || mode === "fill" || mode === "fill85") ? mode : "shrink";
            return MdCRndr;
        },

        /** 注入"矩形是否与字形墨迹重叠"的判定（用于避免 & 连字部件压住宿主）。 */
        setGlyphOverlapProvider: function (fn) {
            __ovlProvider = (typeof fn === "function") ? fn : null;
            return MdCRndr;
        },

        setGlyphZoneProvider: function (fn) {
            glyphZoneProvider = (typeof fn === "function") ? fn : null;
if (window.MDC && window.MDC.providers) window.MDC.providers.zone = glyphZoneProvider;
            return MdCRndr;
        },

        setGlyphProvider: function (fn) {
            glyphProvider = (typeof fn === "function") ? fn : null;
if (window.MDC && window.MDC.providers) window.MDC.providers.glyph = glyphProvider;
            return MdCRndr;
        },
        // ---- 解析 ----
        parse: parseInput,
        splitLines: splitLines,

        // ---- 码 / 字符 ----
        detectInputMode: detectInputMode,
        decodeCode: decodeCode,
        charOf: hg,
        codeOf: g,
        /** 别名码 → 正式名（J1 → AA1、Y1v → Y1a）；非别名原样返回。 */
        canonicalCode: canonicalCode,
        /** 把一串 MdC 中的别名码改写为正式名（文本区 "<...>" 内不改写）。 */
        canonicalize: canonicalize,

        // ---- 数据 ----
        GARDINER: GARDINER,
        revGardiner: revGardiner,
        LIGATURES: LIGATURES,
        EM_SQUARE: EM_SQUARE,
        visuHeight: visuHeight,
        visuWidth: visuWidth,

        // ---- 连字注册 ----
        defineLigature: defineLigature,

        // ---- 内部实现（高级用法 / 兼容层） ----
        internals: {
            px: px,
            getMetrics: getMetrics,
            renderGlyph: renderGlyph,
            ligatureWidth: ligatureWidth,
            makeUnsupported: makeUnsupported,
            unitMetrics: unitMetrics,
            layerMetrics: layerMetrics,
            vrgBoxWidth: vrgBoxWidth,
            renderVRG: renderVRG,
            renderLayerUnit: renderLayerUnit,
            renderLigature: renderLigature,
            renderHRG: renderHRG,
            renderLayerUnitV: renderLayerUnitV,
        decodeCode: decodeCode,          // 供字体栅格等外部模块把码映射成字体字符
            renderVertical: renderVertical,
            buildCss: buildCss,
            injectStyle: injectStyle,
        },
    };

    global.MdCRndr = MdCRndr;
})(typeof window !== "undefined" ? window : globalThis);
