# lib/jsesh — jsesh-js（JSesh 官方 TypeScript 移植，预构建单文件）

CHEAV 从本版起用 jsesh-js 渲染正文（渲染区与 IB 预览），字形也全部用 JSesh 官方 SVG；
内置的 NewGardiner 字体渲染已移除。

## 文件

| 路径 | 说明 | 是否入库 |
|---|---|---|
| jsesh.js | 预构建库（解析 / 排版 / 绘制 / <jsesh-text>），约 176 KB | 是 |
| data/ | 字形数据（6,963 个 SVG + 索引，约 24 MB） | **否**（.gitignore 已排除） |

data/ 本地目前是指向 jsesh-web 0.2.0 包的目录联接：

    E:\QKMansion\CSX10\w\_jsesh-web-0.2.0\jsesh-web\jsesh\data

部署时把该目录（或官方 @jsesh/glyphs 的数据目录）放到 lib/jsesh/data/ 即可；
也可在 js/render/jsesh-render.js 里把 GLYPHS_URL 指向任意同源地址。

## 许可

jsesh-js：CeCILL-C（见上游 <https://github.com/rosmord/jsesh> / <https://jsesh.qenherkhopeshef.org>）。
字形图纸版权见上游说明；CHEAV 仅在本地开发时挂载，不分发数据目录。

## API（本项目用到的部分）

    import { configureJSesh, renderMdc } from "./lib/jsesh/jsesh.js";
    configureJSesh({ glyphsUrl: "./lib/jsesh/data/" });
    const svg = await renderMdc("D21:Aa1-Y1:A1", { cadratHeight: 100 });

- cadratHeight：一个四开组的像素高度；CHEAV 的 SIZE = 100 与之对齐。
- 自定义元素 <jsesh-text cadrat-height="50" mdc="..."> 也可直接用（本项目未用，走 
enderMdc 以便控制时机）。
