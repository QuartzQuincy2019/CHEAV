// ligatures.js - 连字（VM 匹配侧的语义包装）
//
// 连字的**几何定义与渲染数据**由渲染引擎插件提供（js/plugin/MdCRndr.js 内联，
// 经 MdCRndr.LIGATURES / MdCRndr.defineLigature 访问）。
// 本文件只把每个连字包装成 Semantics 子类 Ligature，供 VMBox 匹配与 Tab 确认使用。
//
// 连字 = 2-3 个固定组合的字符合并渲染为一个单位（文本中用 {name} 引用）。
// 每个 part 的变量：code 字符码 / dx 水平偏移(em) / dy 垂直偏移(em) / scale 缩放。
//
// 调试流程（浏览器控制台）：
//   1. defineLigature("名", [ {code:"X1",dx:0,dy:0,scale:1}, {...} ], "发音")  注册/覆盖
//   2. LIGATURE_DEBUG = true   打开调试边框（显示每个 part 的实际位置与大小）
//   3. CHEAV.refresh()         立即重渲染文本框内容，反复调整 dx/dy/scale 至满意

// 连字表：name -> Ligature 语义实例（见 semantics.js）
const LIGATURES = {};

/**
 * 注册（或覆盖）一个连字：写入渲染引擎插件（几何），并建立对应的语义实例。
 * 连字名 = 字符组合（如 "G39-X1"），用 "-" 连接 1-3 个字符；
 * 连字内 VRG 无效，":" 视为 "-"（归一化）。
 * @param {string} name 连字名（{name} 引用）
 * @param {Array<{code:string, dx:number, dy:number, scale:number}>} parts
 *   parts[0] 通常是基准字符（dx=0, dy=0, scale=1）；
 *   其余字符按 dx/dy 相对方块左下角定位、按 scale 缩放。
 * @param {string} [pron] 连字发音（可检索但不能单独成词），如 "Dd"；无发音则省略
 * @returns {Ligature}
 */
function defineLigature(name, parts, pron) {
    const key = name.replace(/:/g, "-");      // 连字内 ":" 视为 "-"
    MdCRndr.defineLigature(key, parts, pron); // 渲染侧（插件）：几何数据
    LIGATURES[key] = new Ligature("{" + key + "}", pron);  // 匹配侧（语义实例，MdC 串）
    console.log("[ligature] " + key + " =", JSON.stringify(parts), pron ? "(发音 " + pron + ")" : "");
    return LIGATURES[key];
}

// 依据插件内的连字表建立语义实例（插件已内联全部内置连字）
(function syncLigaturesFromEngine() {
    for (const key of Object.keys(MdCRndr.LIGATURES)) {
        LIGATURES[key] = new Ligature("{" + key + "}", MdCRndr.LIGATURES[key].pron);
    }
})();
