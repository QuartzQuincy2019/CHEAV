#!/usr/bin/env node
/**
 * tools/stamp-version.js — 给页面里的本地 js/css 引用打上版本号
 *
 * 为什么需要：
 *   index.html 用 file:// 打开时，浏览器会长期缓存 apply.js / MdCRndr.js 等，
 *   改了代码却仍旧执行旧脚本（BUILD 变了、行为没变，很难察觉）。
 *   统一给本地引用加 ?v=<BUILD>，每次构建换新 URL，缓存必然失效。
 *
 * 用法：node tools/stamp-version.js [--check]
 *   BUILD 取自 js/ui/glyphs.js 的 `const BUILD = "glyphs-...";`
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GLYPHS = path.join(ROOT, "js", "ui", "glyphs.js");
const PAGES = ["index.html", "regression.html"];

const build = (fs.readFileSync(GLYPHS, "utf8").match(/const BUILD = "([^"]+)"/) || [])[1];
if (!build) {
    console.error("找不到 BUILD（js/ui/glyphs.js）");
    process.exit(1);
}

const checkOnly = process.argv.includes("--check");
let changed = 0;

for (const page of PAGES) {
    const file = path.join(ROOT, page);
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    // 只处理本地相对引用（./js/... 、.\css\...），外链与 data: 不动
    const after = before.replace(
        /((?:src|href)\s*=\s*")((?:\.\/|\.\\|js\/|css\/)[^"?#]+?\.(?:js|css))(?:\?v=[^"]*)?"/g,
        (m, head, url) => head + url.replace(/\\/g, "/") + "?v=" + build + '"'
    );
    if (after !== before) {
        changed++;
        if (!checkOnly) fs.writeFileSync(file, after, "utf8");
        const n = (before.match(/\?v=/g) || []).length;
        console.log("  " + page + " → v=" + build + "（原有 " + n + " 处）");
    } else {
        console.log("  " + page + " 无改动");
    }
}
console.log(changed ? "完成" : "无需改动");
