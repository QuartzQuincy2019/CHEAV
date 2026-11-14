/*
 * tools/build-rndr.js
 *
 * 把渲染引擎打成一个零依赖的浏览器包（dist/rndr.js）。
 *
 *   node tools/build-rndr.js
 *
 * 产物：
 *   dist/rndr.js        引擎 + 基础表（编码、度量、四开组、王名圈…）
 *   dist/rndr-data.js   ngMetrics + ngZones（度量与连字区，强烈建议一起引入）
 *   dist/rndr-font.js   NewGardiner 字体内嵌（离线 / file:// 用）
 *   dist/demo.html      最小示例
 *
 * 用法：
 *   <script src="rndr.js"></script>
 *   <script src="rndr-data.js"></script>
 *   <script src="rndr-font.js"></script>
 *   <script>Rndr.render(el, "A1-N35", { size: 64 });</script>
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
fs.mkdirSync(dist, { recursive: true });

function read(rel) {
    return fs.readFileSync(path.join(root, rel), "utf8");
}

// ---- 引擎：按依赖顺序拼接 ----
const ENGINE = [
    "js/database/mainSigns.js",        // 转写 → Gardiner 码（必需，否则 t/w 等无法归一化）
    "js/database/translit.js",         // 转写表
    "js/database/mdcGlyphTables.js",   // visu 度量 / Gardiner 表
    "js/plugin/mdcEncoding.js",        // 编码规范化
    "js/plugin/mdcMetrics.js",         // 单元/层度量
    "js/plugin/mdcView.js",            // MDCView 内部坐标模型
    "js/plugin/mdcEnclosure.js",       // 王名圈几何与路径
    "js/plugin/mdcVrg.js",             // 四开组排版
    "js/plugin/mdcCadrat.js",          // 四开组语法与布局
    "js/plugin/mdcGlyphCore.js",       // 字形度量与渲染
    "js/plugin/MdCRndr.js"             // 引擎主体
];

const banner = `/*!
 * rndr.js —— CHEAV 圣书体渲染引擎（单文件、零依赖）
 *
 * 只需 <script src="rndr.js"></script>，然后：
 *     Rndr.render(el, "A1-N35-<-t:w->", { size: 64 });
 *
 * 字形来源：默认使用 NewGardiner 字体（配合 rndr-font.js 可完全离线）。
 * 数据文件：rndr-data.js（度量 + 连字区预生成表，建议一并引入）。
 *
 * 生成：node tools/build-rndr.js（勿手工编辑）
 */
`;

let engine = banner;
for (const rel of ENGINE) {
    engine += "\n/* ===== " + rel + " ===== */\n" + read(rel) + "\n";
}

// ---- 对外 API ----
engine += `
/* ===== 对外 API ===== */
(function (global) {
    "use strict";
    var MdC = global.MdCRndr;

    var Rndr = {
        version: "0.1.0",
        /** 渲染一段 MDC 文本到元素 */
        render: function (el, text, opts) {
            opts = opts || {};
            if (opts.size) el.style.fontSize = opts.size + "px";
            if (opts.fontUrl && MdC.init) MdC.init({ fontUrl: opts.fontUrl });
            if (opts.vertical && MdC.renderVerticalText) {
                MdC.renderVerticalText(el, text, opts.size || parseFloat(el.style.fontSize) || 48);
                return el;
            }
            MdC.renderText(el, text, opts.size || parseFloat(el.style.fontSize) || 48);
            return el;
        },
        /** 预载字形（SVG 模式用；字体模式为空操作） */
        preload: function (codes) {
            return (global.Glyphs && Glyphs.preload) ? Glyphs.preload(codes) : Promise.resolve();
        },
        /** 底层引擎，便于高级用法 */
        engine: MdC
    };

    global.Rndr = Rndr;
})(typeof window !== "undefined" ? window : globalThis);
`;

fs.writeFileSync(path.join(dist, "rndr.js"), engine, "utf8");

// ---- 数据包 ----
const data = "/*! rndr-data.js —— 字形度量 + 连字区预生成表 */\n" +
    read("js/database/ngMetrics.js") + "\n" + read("js/database/ngZones.js");
fs.writeFileSync(path.join(dist, "rndr-data.js"), data, "utf8");

// ---- 字体包 ----
fs.copyFileSync(path.join(root, "js/database/ngFontData.js"), path.join(dist, "rndr-font.js"));

// ---- 示例页 ----
const demo = `<!DOCTYPE html>
<meta charset="utf-8">
<title>rndr.js demo</title>
<style>
  body { font: 15px/1.6 system-ui, sans-serif; margin: 24px; }
  .row { margin: 18px 0; }
  .label { color: #666; font-size: 13px; margin-bottom: 4px; }
</style>

<div class="row"><div class="label">A1-N35（基本）</div><div id="a"></div></div>
<div class="row"><div class="label">t:w（层叠）</div><div id="b"></div></div>
<div class="row"><div class="label">&lt;-t:w-&gt;（王名圈）</div><div id="c"></div></div>
<div class="row"><div class="label">t&amp;w（连字）</div><div id="d"></div></div>

<script src="rndr.js"></script>
<script src="rndr-data.js"></script>
<script src="rndr-font.js"></script>
<script>
  Rndr.render(document.getElementById("a"), "A1-N35", { size: 64 });
  Rndr.render(document.getElementById("b"), "t:w", { size: 64 });
  Rndr.render(document.getElementById("c"), "<-t:w->", { size: 64 });
  Rndr.render(document.getElementById("d"), "t&w", { size: 64 });
</script>
`;
fs.writeFileSync(path.join(dist, "demo.html"), demo, "utf8");

const size = function (f) { return (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + " KB"; };
console.log("dist/rndr.js      " + size("rndr.js"));
console.log("dist/rndr-data.js " + size("rndr-data.js"));
console.log("dist/rndr-font.js " + size("rndr-font.js"));
console.log("dist/demo.html    " + size("demo.html"));
