/*
 * tools/embed-font.js
 *
 * 把 fonts/NewGardiner.ttf 嵌成 js/database/ngFontData.js（base64 data URI）。
 * 用途：宿主页面（尤其是 file:// 直接打开时）不需要额外的字体文件，
 *       也不受 @font-face 跨源限制。
 *
 * 用法：node tools/embed-font.js
 *
 * 字体：NewGardiner.ttf（© Mark-Jan Nederhof, University of St Andrews）
 *       许可：SIL Open Font License 1.1
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ttfPath = path.join(root, "fonts", "NewGardiner.ttf");
const outPath = path.join(root, "js", "database", "ngFontData.js");

const ttf = fs.readFileSync(ttfPath);
const b64 = ttf.toString("base64");

const header =
    "/* js/database/ngFontData.js - 内置字体（离线 / file:// 可用）\n" +
    " *\n" +
    " * NewGardiner.ttf 的 base64 编码。作用：宿主页面不需要额外字体文件，\n" +
    " * 也不受 file:// 下 @font-face 跨源限制的影响。\n" +
    " *\n" +
    " * 字体：NewGardiner.ttf（© Mark-Jan Nederhof，SIL OFL 1.1）\n" +
    " * 生成：node tools/embed-font.js（勿手工编辑）\n" +
    " */\n" +
    "(function (global) {\n" +
    "    \"use strict\";\n" +
    "    global.NG_FONT_DATA_URI = \"data:font/ttf;base64,";

const footer = "\";\n})(typeof window !== \"undefined\" ? window : globalThis);\n";

fs.writeFileSync(outPath, header + b64 + footer, "utf8");
console.log("写入 " + outPath);
console.log("字体 " + (ttf.length / 1024).toFixed(0) + " KB → 输出 " +
    ((header.length + b64.length + footer.length) / 1048576).toFixed(2) + " MB");
