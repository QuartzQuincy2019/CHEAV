// js/database/serekhTail.js - 塞拉赫框（Serekh）尾部
//
// 坐标系 = img/S_tail.png 裁去白边后的像素坐标（763×864，上边线自 y=0 起）。
// 数值全部来自对该图的投影测量：上/下横线 y=0..36 与 y=828..864；
// 两条竖线 x=122、x=207（宽 18）；宫墙区 x=291..732；内短横自 x=375。
// 竖线 y 范围严格为 0..828，与上下横线外沿齐平，不会探头。
// 该 PNG 仅作描摹源，已加入 .gitignore。
(function (global) {
    "use strict";
    global.SEREKH_TAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 763 864"><g fill="#000"><rect x="0" y="0" width="763" height="36"/><rect x="0" y="828" width="763" height="36"/><rect x="122" y="0" width="18" height="828"/><rect x="207" y="0" width="18" height="828"/><rect x="291" y="92" width="18" height="165"/><rect x="291" y="92" width="441" height="18"/><rect x="291" y="239" width="441" height="18"/><rect x="375" y="175" width="357" height="18"/><rect x="291" y="340" width="18" height="166"/><rect x="291" y="340" width="441" height="18"/><rect x="291" y="488" width="441" height="18"/><rect x="375" y="423" width="357" height="18"/><rect x="291" y="589" width="18" height="165"/><rect x="291" y="589" width="441" height="18"/><rect x="291" y="736" width="441" height="18"/><rect x="375" y="671" width="357" height="18"/></g></svg>`;
})(typeof window !== "undefined" ? window : globalThis);
