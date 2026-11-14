# MdCRndr.js 模块化裂解计划

> 现状：单文件 **8664 行**，数据表 + 引擎 + 解析 + 渲染全部混在一起。
> 目标：拆成 8 个 `js/plugin/` 下的文件，全部用**经典 `<script>`** 加载（不引入打包器），
> 每个文件只暴露一个命名空间对象，`MdCRndr.js` 退化为"聚合 + API"层。

## 一、切分方案（按现有行号）

| 目标文件 | 现有行范围 | 内容 | 依赖 | 风险 |
|---|---|---|---|---|
| `js/database/mdc-glyph-tables.js` | 93–6553 | `visuHeight` / `visuWidth` / `GARDINER` 三张纯数据表 | 无 | **低**（纯数据） |
| `js/plugin/mdc-encoding.js` | 71–92, 6554–6628 | `SER_TAIL_SVG`、`ENC_PAD`、`EM_SQUARE`、`isAliasKey`、`revGardiner`、`aliasCanonical`、`canonicalCode`、`canonicalize` | 数据表 | 低 |
| `js/plugin/mdc-glyph.js` | 6824–6987 | `decodeCode`、`getMetrics`、`applyShadow`、`renderInShadedCell`、`attachSvgOverlay`、`renderGlyph` + provider 变量 | encoding | 中 |
| `js/plugin/mdc-metrics.js` | 6988–7158 | `ligatureWidth`、`unitMetrics`、`layerMetrics`、`vrgBoxWidth`、`measureUnitEm`、`layoutQuadratAbs`、`placeAbs` | glyph | 中 |
| `js/plugin/mdc-vrg.js` | 7180–7370 | `renderVRG`、`renderLayerUnit`、`renderHRG`、`renderLayerUnitV`、`renderVertical` | metrics | 中 |
| `js/plugin/mdc-enclosure.js` | 7371–7482 | `encADepth`、`renderEnclosure`、`makeUnsupported` | glyph/metrics | 中 |
| `js/plugin/mdc-ligature.js` | 6629–6823, 7483–7646 | `LIGATURES`、`defineLigature`、`renderLigature` | metrics/enclosure | **中高**（连字逻辑） |
| `js/plugin/mdc-parse.js` | 7739–8200+ | `COMPOUND_TRANSLITS`、`protectCompounds`、`resolveTranslitCode`、`parseInput`、`splitLines` | encoding | 中 |
| `js/plugin/mdc-render.js` | 7647–7738 | `render`（顶层渲染入口） | 全部 | 低 |
| `js/plugin/MdCRndr.js` | 其余 | API 对象、`buildCss`、`ensureStyle`、选项 | 全部 | — |

## 二、加载顺序（index.html / 各测试页）

```
js/database/mdc-glyph-tables.js   ← 纯数据
js/plugin/mdc-encoding.js
js/plugin/mdc-glyph.js
js/plugin/mdc-metrics.js
js/plugin/mdc-vrg.js
js/plugin/mdc-enclosure.js
js/plugin/mdc-ligature.js
js/plugin/mdc-parse.js
js/plugin/mdc-render.js
js/plugin/MdCRndr.js              ← 聚合 + 公开 API
```

每个文件形如：

```js
(function (global) {
    "use strict";
    global.MDC = global.MDC || {};
    global.MDC.renderGlyph = function (parent, code, fontSize, align, mirror) { … };
})(window);
```

`MdCRndr.js` 内改为 `const renderGlyph = MDC.renderGlyph;` 之类的**解构别名**，
这样其余代码一行不用改（这是低风险裂解的关键）。

## 三、执行顺序（每步都要跑回归）

1. **数据表外移**（93–6553）—— 纯数据、零逻辑，先做；
2. **编码/规范化**（`canonicalCode` 等）；
3. **glyph 渲染 + 度量**；
4. **VRG/竖排**；
5. **王名圈**；
6. **连字**（含 `renderLigature`）；
7. **parseInput**；
8. **render + API**。

每步验证清单：

- `node --check` 全部文件；
- `regression.html` 11/11；
- `ligature-matrix.html` 输出与拆分前一致（可对比截图 hash）；
- `index.html` 能正常启动（Build 号可见）。

## 四、风险控制

| 风险 | 对策 |
|---|---|
| 循环依赖（glyph ↔ metrics ↔ ligature） | 一律通过 `global.MDC.xxx` **延迟调用**，不在加载时就解构函数引用 |
| `let` 变量（provider、encADepth、quadratMode）被多处修改 | 这些留在 `MdCRndr.js`，通过 `MDC.setProviders()` 注入 |
| 分页/样式注入时序 | `ensureStyle()` 保持在聚合层 |
| 拆分后缓存 | 每次拆分都升 `BUILD` 号 |

## 五、收益

- 单文件从 **8664 行**降到约 **1200 行**（聚合 + API + CSS）；
- 数据表独立后，改字形数据不再触碰引擎；
- 每个模块可单独在测试页加载、单独验证。