/**
 * Tksesh 预定义连字表（JSesh 官方数据，逐字移植，永久参考）
 *
 * 来源：jsesh/src/main/resources/jseshResources/data/ligatures.txt
 *      （由 TkseshLigatureCatalogue 读取，SVGFontHieroglyphDrawer.getPositions 使用）
 *
 * 格式：模式| 码 dx dy scale [码 dx dy scale ...]
 *   · dx/dy 单位 = A1 高度的 1/1000（getGroupUnitLength = heightOfA1/1000）
 *   · scale = 百分比（100 = 原尺寸）
 *
 * 解析结果挂在 window.TKESH_LIGATURES：
 *   { "stp&n&ra": [{code:"stp", dx:0.008, dy:0.246, scale:1}, …], … }
 *   —— dx/dy 已换算为 em（除以 1000），可直接用于渲染。
 */
(function (global) {
    "use strict";

    // 原始文本（勿改动；改格式会破坏与 JSesh 的可追溯性）
    var RAW = [
        "i&i| i 0 0 100 i 471 0 100",
        "Z1&Z1| Z1 0 0 100 Z1 178 0 100",
        "F12&D28| F12 72 0 99 D28 0 387 100",
        "U36&D28| U36 271 0 97 D28 0 383 100",
        "E10&Z1| E10 0 50 100 Z1 916 0 52",
        "F20&z| F20 0 0 100 z 0 729 78",
        "F39&Z1| F39 0 0 100 Z1 280 577 100",
        "H&a| H 592 0 98 a 0 210 100",
        "q&mA| q 0 223 100 mA 23 0 98",
        "S&mA| S 0 411 70 mA 34 0 98",
        "nTr&Z1| nTr 0 0 100 Z1 118 596 100",
        "G36&X1&r| G36 0 0 83 X1 591 0 83 r 0 736 101",
        "H&b&Xr| H 0 0 98 b 527 0 97 Xr 283 174 97",
        "Xr&H&b| Xr 283 174 97 H 0 0 98 b 527 0 97",
        "H&a&a| H 537 0 125 a 0 504 100 a 0 129 100",
        "M27&t&Z1| M27 10 0 98 t 0 871 60 Z1 932 751 60",
        "R8&i&t| R8 0 0 97 i 827 5 98 t 538 813 81",
        "r&p&a| r 4 0 90 p 350 329 72 a 0 562 67",
        "D&md&N| D 51 0 93 md 0 151 85 N 299 404 58",
        "D&md&Z1| D 51 0 93 md 0 151 85 Z1 464 602 93",
        "D&md&md&md| D 0 0 93 md 119 411 58 md 292 411 58 md 465 411 58",
        "stp&n&ra| stp 8 246 100 n 0 772 100 ra 542 0 100",
        "s&mt| s 404 0 98 mt 0 375 100",
        "G26&t&y| G26 31 0 98 t 0 840 75 y 722 822 47"
    ];

    var map = Object.create(null);

    RAW.forEach(function (line) {
        var bar = line.indexOf("|");
        if (bar < 0) return;
        var key = line.slice(0, bar).trim();
        var rest = line.slice(bar + 1).trim().split(/\s+/);
        var parts = [];
        for (var i = 0; i + 3 < rest.length; i += 4) {
            parts.push({
                code: rest[i],
                dx: Number(rest[i + 1]) / 1000,   // 1/1000 A1 高 → em
                dy: Number(rest[i + 2]) / 1000,
                scale: Number(rest[i + 3]) / 100
            });
        }
        if (parts.length) map[key] = parts;
    });

    global.TKESH_LIGATURES = map;
    global.TKESH_LIGATURES_RAW = RAW;
})(typeof window !== "undefined" ? window : globalThis);
