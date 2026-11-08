// js/database/serekhTail.js - 塞拉赫框（Serekh）尾部
//
// 纯几何绘制：100×128 画布、线宽 5、17 个矩形。
// 竖线夹在上下边线之间（5..123），不会出头；
// 宫墙格右端止于 x=84，与右侧外边线（x=95）之间留空 —— 与 JSesh 一致。
(function (global) {
    "use strict";
    global.SEREKH_TAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 128"><g fill="#000"><rect x="0" y="0" width="100" height="5"/><rect x="0" y="123" width="100" height="5"/><rect x="95" y="0" width="5" height="128"/><rect x="11" y="5" width="4" height="118"/><rect x="26" y="5" width="5" height="118"/><rect x="40" y="16" width="4" height="28"/><rect x="40" y="16" width="44" height="4"/><rect x="40" y="40" width="44" height="4"/><rect x="52" y="28" width="26" height="4"/><rect x="40" y="52" width="4" height="28"/><rect x="40" y="52" width="44" height="4"/><rect x="40" y="76" width="44" height="4"/><rect x="52" y="64" width="26" height="4"/><rect x="40" y="88" width="4" height="28"/><rect x="40" y="88" width="44" height="4"/><rect x="40" y="112" width="44" height="4"/><rect x="52" y="100" width="26" height="4"/></g></svg>`;
})(typeof window !== "undefined" ? window : globalThis);
