// engine/rendering.js - 兼容层：渲染引擎实现现由插件 MdCRndr 提供
//
// 输入形式：**纯 MdC 渲染串**。
// 实现（含排版模型与全部布局算法）见 js/plugin/MdCRndr.js；
// 本文件只把插件的导出绑定回原有全局名，供本项目的既有模块沿用。
//
// 排版模型：一切以「方块（quadrat）」为基准，1 quadrat = 1em × 1em。
//   IS（独立显示）：字形在 1em 轨道内垂直居中。
//   VRG（垂直堆叠）：层内字形贴层底；窄层符号向组两端对齐（倒「品」字形）。
//   字体为「底部对齐」设计（字形坐基线），CSS baseline 对齐即贴底。

// 初始化插件：注入 @font-face 与 .hie / .vrg / .lig 等样式（幂等）
MdCRndr.init({ fontUrl: "./fonts/NewGardiner.ttf" });

const px = MdCRndr.internals.px;
const decodeCode = MdCRndr.decodeCode;
const getMetrics = MdCRndr.internals.getMetrics;
const renderGlyph = MdCRndr.internals.renderGlyph;
const ligatureWidth = MdCRndr.internals.ligatureWidth;
const unitMetrics = MdCRndr.internals.unitMetrics;
const layerMetrics = MdCRndr.internals.layerMetrics;
const vrgBoxWidth = MdCRndr.internals.vrgBoxWidth;
const renderVRG = MdCRndr.internals.renderVRG;
const renderLayerUnit = MdCRndr.internals.renderLayerUnit;
const renderLigature = MdCRndr.internals.renderLigature;
const render = MdCRndr.render;

// 连字调试开关：转发到插件配置（控制台仍可 `LIGATURE_DEBUG = true`）
Object.defineProperty(globalThis, "LIGATURE_DEBUG", {
    get: () => MdCRndr.config().ligatureDebug,
    set: (v) => MdCRndr.set({ ligatureDebug: !!v }),
    configurable: true,
});
