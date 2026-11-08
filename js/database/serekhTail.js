// js/database/serekhTail.js - 塞拉赫框（Serekh）尾部
//
// 坐标系 = img/S_tail.png 的像素坐标（763×901），全部数值取自对该图的投影测量：
//   上/下横线 y=24..60 与 y=852..888；两条竖线 x=122、x=207（宽 18）；
//   宫墙区 x=291..732，三格分别 y=[116/199/281] [364/447/530] [613/695/778]，内短横自 x=375。
// 竖线 y 范围严格夹在上下横线之间（24..852），因此不会"出头"。
// 该 PNG 仅作描摹源，已加入 .gitignore。
(function (global) {
    "use strict";
    global.SEREKH_TAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 763 901"><g fill="#000"><rect x="0" y="24" width="763" height="36"/><rect x="0" y="852" width="763" height="36"/><rect x="122" y="24" width="18" height="828"/><rect x="207" y="24" width="18" height="828"/><rect x="291" y="116" width="18" height="165"/><rect x="291" y="116" width="441" height="18"/><rect x="291" y="263" width="441" height="18"/><rect x="375" y="199" width="357" height="18"/><rect x="291" y="364" width="18" height="166"/><rect x="291" y="364" width="441" height="18"/><rect x="291" y="512" width="441" height="18"/><rect x="375" y="447" width="357" height="18"/><rect x="291" y="613" width="18" height="165"/><rect x="291" y="613" width="441" height="18"/><rect x="291" y="760" width="441" height="18"/><rect x="375" y="695" width="357" height="18"/></g></svg>`;
})(typeof window !== "undefined" ? window : globalThis);
