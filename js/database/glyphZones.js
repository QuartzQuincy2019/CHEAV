// js/database/glyphZones.js - 连字区（ligature zones）数据 · Tier 1
//
// 来源：JSesh 导出的 SVG 字形中 id="zone1"/"zone2" 的矩形（共 20 个符号）。
//   zone1 = 该符号**之前**的组要落进去的区域；
//   zone2 = 该符号**之后**的组要落进去的区域；
//   gravity（label 里的 "gravity:xx"）：s/e = 贴 start/end 侧，t/b = 贴 top/bottom；缺省则居中。
//
// 坐标已归一化为 em（1em = 1 cadrat）：x/y 自画布左上角起、y 向下，w/h 为区域宽高。
// 未列入的符号没有显式 zone —— JSesh 会按字形墨迹自动推导（见 Tier 2）。
//
// 渲染时这些矩形本身不绘制（读取 SVG 时已剔除红框），只在连字排版时作为容器使用。
(function (global) {
    "use strict";
    global.GLYPH_ZONES = {
        "A17": {
            "zone1": {
                "x": -0.322,
                "y": 0.004,
                "w": 0.617,
                "h": 0.556,
                "gh": "e",
                "gv": null,
                "gravity": "e"
            },
            "zone2": {
                "x": 0.525,
                "y": 0.787,
                "w": 0.718,
                "h": 0.352,
                "gh": "s",
                "gv": "t",
                "gravity": "st"
            },
            "scale": 1800
        },
        "A17A": {
            "zone2": {
                "x": 0.449,
                "y": 0.776,
                "w": 0.435,
                "h": 0.222,
                "gh": "s",
                "gv": "b",
                "gravity": "sb"
            },
            "scale": 18
        },
        "A18": {
            "zone1": {
                "x": -0.323,
                "y": 0.23,
                "w": 0.495,
                "h": 0.445,
                "gh": "e",
                "gv": null,
                "gravity": "e"
            },
            "zone2": {
                "x": 0.356,
                "y": 0.857,
                "w": 0.575,
                "h": 0.282,
                "gh": "s",
                "gv": "t",
                "gravity": "st"
            },
            "scale": 1800
        },
        "A272": {
            "zone1": {
                "x": -0.371,
                "y": -0.001,
                "w": 0.573,
                "h": 0.647,
                "gh": "e",
                "gv": null,
                "gravity": "e"
            },
            "zone2": {
                "x": 0.397,
                "y": 0.84,
                "w": 0.61,
                "h": 0.299,
                "gh": "s",
                "gv": "t",
                "gravity": "st"
            },
            "scale": 1800
        },
        "D28": {
            "zone1": {
                "x": 0.167,
                "y": -0.46,
                "w": 0.38,
                "h": 1.066,
                "gh": null,
                "gv": "b",
                "gravity": "b"
            },
            "zone2": {
                "x": 0.167,
                "y": -0.46,
                "w": 0.38,
                "h": 1.066,
                "gh": null,
                "gv": "b",
                "gravity": "b"
            },
            "scale": 18
        },
        "D40": {
            "zone1": {
                "x": 0.209,
                "y": 0.057,
                "w": 0.587,
                "h": 0.708,
                "gh": null,
                "gv": "b",
                "gravity": "b"
            },
            "scale": 18
        },
        "D58": {
            "zone1": {
                "x": -0.301,
                "y": 0.003,
                "w": 0.565,
                "h": 0.777,
                "gh": "e",
                "gv": null,
                "gravity": "e"
            },
            "scale": 18
        },
        "E6": {
            "zone2": {
                "x": 0.416,
                "y": 0.002,
                "w": 0.745,
                "h": 0.27,
                "gh": "s",
                "gv": "t",
                "gravity": "ts"
            },
            "scale": 18
        },
        "F20": {
            "zone2": {
                "x": 0.001,
                "y": 0.275,
                "w": 0.803,
                "h": 1.098,
                "gh": null,
                "gv": null,
                "gravity": null
            },
            "scale": 1800
        },
        "F39": {
            "zone2": {
                "x": 0.013,
                "y": 0.563,
                "w": 0.61,
                "h": 0.811,
                "gh": null,
                "gv": "t",
                "gravity": "t"
            },
            "scale": 18
        },
        "F40": {
            "zone2": {
                "x": 0.244,
                "y": 0.57,
                "w": 0.588,
                "h": 0.704,
                "gh": null,
                "gv": "t",
                "gravity": "t"
            },
            "scale": 18
        },
        "G43": {
            "zone1": {
                "x": -0.694,
                "y": 0.357,
                "w": 0.822,
                "h": 0.564,
                "gh": "e",
                "gv": "b",
                "gravity": "be"
            },
            "zone2": {
                "x": 0.537,
                "y": -0.002,
                "w": 1.326,
                "h": 0.356,
                "gh": "s",
                "gv": "t",
                "gravity": "ts"
            },
            "scale": 18
        },
        "M4": {
            "zone2": {
                "x": 0.206,
                "y": 0.179,
                "w": 0.407,
                "h": 0.817,
                "gh": null,
                "gv": null,
                "gravity": null
            },
            "scale": 18
        },
        "O1": {
            "zone2": {
                "x": 0.1,
                "y": 0.621,
                "w": 0.81,
                "h": 0.32,
                "gh": null,
                "gv": null,
                "gravity": null
            },
            "scale": 18
        },
        "O38": {
            "zone2": {
                "x": 0.171,
                "y": 0.174,
                "w": 0.776,
                "h": 0.841,
                "gh": "s",
                "gv": "t",
                "gravity": "ts"
            },
            "scale": 18
        },
        "R8": {
            "zone1": {
                "x": 0.015,
                "y": 0.322,
                "w": 0.318,
                "h": 0.683,
                "gh": "e",
                "gv": "b",
                "gravity": "be"
            },
            "scale": 18
        },
        "R8A": {
            "zone1": {
                "x": 0.015,
                "y": 0.322,
                "w": 0.318,
                "h": 0.683,
                "gh": "e",
                "gv": "b",
                "gravity": "be"
            },
            "scale": 18
        },
        "S38": {
            "zone2": {
                "x": 0.3,
                "y": 0.37,
                "w": 1.072,
                "h": 0.621,
                "gh": "s",
                "gv": "b",
                "gravity": "sb"
            },
            "scale": 1800
        },
        "W54": {
            "zone2": {
                "x": 0.253,
                "y": 0.314,
                "w": 0.605,
                "h": 0.686,
                "gh": null,
                "gv": null,
                "gravity": null
            },
            "scale": 18
        },
        "nTrw": {
            "zone1": {
                "x": 0.015,
                "y": 0.322,
                "w": 0.318,
                "h": 0.683,
                "gh": "e",
                "gv": "b",
                "gravity": "be"
            },
            "scale": 18
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
