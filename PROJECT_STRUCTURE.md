# CHEAV 项目结构解析

> 生成时间：2026-11-17 · 基于工作区当前状态（`d960369` + 5 个未提交文件）
> 方法：目录/文件枚举、Git 历史、逐个模块读源码头与导出面、以及用 Node `vm` 在假 DOM 中实测插件加载顺序与解析管线。

---

## 0. 一句话定位

CHEAV（*Cyrene's Hierograph Editor and Viewer*）是一个**纯静态、无构建、无包管理器**的浏览器端古埃及圣书体（hieroglyph）输入/排版/渲染应用：

- 输入 **MdC（Manuel de Codage）** 子集，输出 DOM（字形 + 四开组 + 框类）；
- 正文渲染改用 **jsesh-js**（`lib/jsesh/jsesh.js`，JSesh 官方移植；字形全部为 JSesh SVG，
  不再使用 NewGardiner 字体渲染）；内置 **MdCRndr** 保留为连字回退与候选格渲染；
- 核心是一个可独立嵌入的渲染引擎 **MdCRndr**（现在由 9 个经典 `<script>` 拼成）；
- 语料（词库 / 音素 / 定符 / 转写 / 连字）与多张大型字形数据表（见 §3）同仓；
- 双语（en / 简体中文），MIT + OFL 1.1 + Unicode License V3。

| 指标 | 数值 |
|---|---|
| 版本（页脚 / 最新提交） | `ud3.0.0-a2d` / `d960369 release: ud3.0.0-a2d` |
| 提交数 | 524 |
| 版本库跟踪文件 | 212 |
| `js/` 代码总量 | 37 个文件、31,595 行（含生成数据表）；**手写约 11,221 行** |
| 插件层 | 5,079 行 / 9 个文件 |
| UI 层 | 2,926 行 / 5 个文件 |
| 引擎层 | 323 行 / 4 个文件（其中 3 个是兼容层） |
| 数据库层（手写部分） | 2,893 行 |
| 样式 | `css/general.css` 1,287 行 / 13 个分节 |
| 工具脚本 | 1,965 行 / 11 个 |
| `index.html` 首屏 | **37 个 `<script>`、5.59 MB**（其中内嵌字库 `ngFontData.js` 3.72 MB，占 66%） |

> 行数统计均含空行（按 `\n` 计数）。

---

## 1. 顶层目录职责

| 路径 | 角色 | 规模 |
|---|---|---|
| [index.html](index.html) | 唯一应用入口：编辑器 + 渲染区 + 设置 + 文档浮层 | 139 行 / 9 KB |
| [instructions.html](instructions.html) | 使用者文档（12 节） | 53 KB |
| [for_developers.html](for_developers.html) | 开发者文档 / 插件 API（16 节） | 165 KB |
| [regression.html](regression.html) | 回归测试台（判据 13 项） | 15 KB |
| [tks.html](tks.html) | Tksesh 预定义连字测试台（24 条） | 8 KB |
| [CPlugin_Test/](CPlugin_Test/) | "只依赖插件"的独立测试台 —— **已过期**（见 §11.3） | 2 文件 |
| [css/](css/) | `general.css`：页面/编辑器样式；渲染样式由插件注入 | 1,287 行 |
| [lib/](lib/) | `visumetrics.js` 兼容层（把插件数据绑回旧全局名） | 14 行 |
| [js/plugin/](js/plugin/) | 渲染引擎（9 文件）+ 按键展示插件 | 5,079 行 |
| [js/database/](js/database/) | 语义类、语料、设置、i18n，以及 6 张生成数据表 | 17 文件 |
| [js/engine/](js/engine/) | 兼容层 ×3 + 匹配引擎 | 323 行 |
| [js/ui/](js/ui/) | `apply.js` 状态机、`glyphs.js` 字形来源、`thumbs.js`、`docs.js` | 2,926 行 |
| [js/lib/](js/lib/) | 第三方 `paper-core.min.js`（仅做矢量命中测试） | 204 KB |
| [fonts/](fonts/) | NewGardiner v3.06 + OFL 全文 | 2.85 MB |
| [dist/](dist/) | 打包产物：`rndr.js` / `rndr-data.js` / `rndr-font.js` / `demo.html` | 5.2 MB |
| [tools/](tools/) | 构建、数据生成、词条 CLI | 11 脚本 + `_zones/` |
| [tests/](tests/) | 6 个正式诊断页 + 254 个一次性探针（另有 27 个 `.bzr` 样本）（`probes/` 被 gitignore） | 288 文件 |
| [glyfs/](glyfs/) | 本机 JSesh SVG 字形（**不分发**；仅 17 个例外入库） | 6,967 文件 / 35 MB |
| [img/](img/) | 参考图 / 测量源图（107 项入库） | 5 MB |
| [_shots/](_shots/) | 开发截图（gitignore） | 446 文件 / 12.5 MB |
| [_backup/](_backup/) | 旧版 `MdCRndr-20261108-2213.js`（模块化前快照，340 KB） | gitignore |
| 根目录 `_*.html` | 30+ 个探针残页（gitignore） | — |

文档类 Markdown：[README.md](README.md) / [README.en.md](README.en.md) / [NOTICE.md](NOTICE.md) / [LICENSE](LICENSE)，以及 5 份 JSesh 逆向分析（[JSESH_LAYOUT_REF.md](JSESH_LAYOUT_REF.md) 41 KB、[JSESH_SVG_LIGATURES.md](JSESH_SVG_LIGATURES.md) 25 KB、[JSESH_VS_CHEAV.md](JSESH_VS_CHEAV.md) 15 KB、[LIGATURE_ZONES.md](LIGATURE_ZONES.md) 12 KB、[JSESH_LAYOUT_AUDIT.md](JSESH_LAYOUT_AUDIT.md) 6 KB）、[TKSESH_LIST.md](TKSESH_LIST.md)、[MDCRNDR_MODULE_PLAN.md](MDCRNDR_MODULE_PLAN.md)。

---

## 2. 运行时分层

```
┌──────────────────────────────────────────────────────────────┐
│ 入口 index.html（37 个 <script>，全局作用域，无模块系统）        │
├──────────────────────────────────────────────────────────────┤
│ UI 集成层   js/ui/apply.js     五模块/四区域 + 出流-入流状态机  │
│             js/ui/glyphs.js    JSesh SVG 字形来源（jar/目录）  │
│             js/ui/thumbs.js    候选格缩略图（墨迹盒 inline-block）│
│             js/ui/docs.js      文档浮层；js/plugin/keycast.js 按键展示│
├──────────────────────────────────────────────────────────────┤
│ 逻辑层      js/engine/matcher.js   四路匹配（VM / PM / DM / GM）│
│             js/engine/{core,parser,rendering}.js  兼容层（绑定插件）│
├──────────────────────────────────────────────────────────────┤
│ 语义/数据层 js/database/semantics.js   Semantics → Vocabulary / Ligature│
│             maps / vocabulary / determinatives / ligatures /    │
│             translit / mainSigns / lang / settings             │
│             生成表：mdcGlyphTables / ngMetrics / svgBoxes / ngZones│
│                     ngFontData / glyphFiles                    │
├──────────────────────────────────────────────────────────────┤
│ 渲染引擎    js/plugin/  MdCRndr.js（聚合 + 解析 + CSS + API）    │
│             mdcEncoding → mdcMetrics → mdcView → mdcEnclosure  │
│             → mdcVrg → mdcCadrat → mdcGlyphCore                │
├──────────────────────────────────────────────────────────────┤
│ 兼容层      lib/visumetrics.js、js/database/GardinerCode.js、   │
│             js/database/ligatures.js（旧全局名 ← 插件导出）      │
└──────────────────────────────────────────────────────────────┘
                ↕ 字形来源可切换：JSesh SVG ↔ 内置 NewGardiner 字体
```

**关键契约**：全部以传统 `<script>` 顺序加载，共享同一个全局作用域。没有 `import`、没有打包器，**加载顺序本身就是架构**（见 §4）。

---

## 3. 数据规模（实测）

| 数据表 / 语料 | 文件 | 规模 |
|---|---|---|
| `visuHeight` / `visuWidth`（字体墨迹度量） | [mdcGlyphTables.js](js/database/mdcGlyphTables.js) | 各 4,634 项；文件 6,459 行 |
| `GARDINER`（码 → 字符） | 同上 | **4,575** 项（基础区 + 扩展 A + J 别名） |
| `NG_METRICS`（字体度量 w/h） | [ngMetrics.js](js/database/ngMetrics.js) | 4,634 项（单行 JSON） |
| `SVG_BOXES`（SVG 墨迹盒 em） | [svgBoxes.js](js/database/svgBoxes.js) | **6,951** 项 |
| `NG_ZONES`（连字槽，离线预生成） | [ngZones.js](js/database/ngZones.js) | **6,878** 个字形（各 1–3 槽） |
| 内嵌字体 data URI | [ngFontData.js](js/database/ngFontData.js) | 3.72 MB base64 TTF |
| SVG 文件名清单 | [glyphFiles.js](js/database/glyphFiles.js) | 6,946 项 |
| 词汇 `VOCABULARY` | [vocabulary.js](js/database/vocabulary.js) | **228** 条（含变体族） |
| 定符 `DETERMINATIVES` | [determinatives.js](js/database/determinatives.js) | **187** 条 |
| 音素 `PHONEME_TABLE` | [maps.js](js/database/maps.js) | **96** 行（多对多） |
| 转写 `TRANSLIT_SIGNS` | [translit.js](js/database/translit.js) | **821** 条（JSesh keyboard 表） |
| 主字符 `MAIN_SIGNS` | [mainSigns.js](js/database/mainSigns.js) | 179+ 条（JSesh + 学术校正） |
| Tksesh 连字 | [tkseshLigatures.js](js/database/tkseshLigatures.js) | 24 条（绝对坐标） |
| 连字静态表 `LIGATURES` | [MdCRndr.js](js/plugin/MdCRndr.js) | **默认清空**（改用 zone 驱动，见 §11.9） |

---

## 4. 加载顺序与隐式依赖（最重要的一节）

`index.html` 的 37 个脚本实际可归为 6 段，顺序不可随意调整：

```
① 生成数据表        mdcGlyphTables → ngMetrics → svgBoxes → ngFontData
② 编码/度量/视图    mdcEncoding → mdcMetrics → mdcView
③ 框类/排版         mdcEnclosure → mdcVrg → mdcCadrat
④ 字形核心 + 聚合   mdcGlyphCore → MdCRndr          ← 引擎就绪
⑤ 兼容层 + 语料     lib/visumetrics → serekhTail → glyphZones → ngZones
                    → mainSigns → translit → GardinerCode → maps → semantics
                    → tkseshLigatures → ligatures → determinatives → lang
                    → settings → engine/core → engine/rendering
                    → vocabulary → engine/parser → engine/matcher
⑥ 应用胶水          keycast → docs → paper-core → glyphs → thumbs → apply
```

**四条容易踩的隐式规则**（都能在源码里验证）：

1. **命名空间由谁创建**：`mdcEncoding` 用 `global.MDC || (global.MDC = {})` 真正创建 `window.MDC`；而 `mdcMetrics` / `mdcGlyphCore` / `mdcVrg` 用的是
   `const MDC = window.MDC ? window.MDC : {}` —— 这类模块若**先于** `mdcEncoding`/`mdcView` 加载，导出会写进一个游离对象而永久丢失。这正是 §11.3 事故的根因。
2. **反向依赖（插件先于聚合层）**：`mdcGlyphCore` 必须先于 `MdCRndr.js` 加载，因为聚合层在 [MdCRndr.js:322-340](js/plugin/MdCRndr.js#L322-L340) 把 `decodeCode / px / options / render / …` 注入 `MDC.host`；而 `MdCRndr` 又通过
   `function getMetrics(c){ return MDC.getMetrics(c); }` 这类**延迟转发**把实现让回模块层。两边都不在加载时解构函数引用 —— 这是避免循环依赖的关键手法。
3. **数据表是插件的硬前置**：`mdcEncoding`、`mdcGlyphCore` 都在加载期读取 `window.MDC_GLYPH_TABLES` / `NG_METRICS`；缺了它们不报错，但码表为空、字形数量退化为 0（静默降级）。
4. **`apply.js` 必须最后**：它在 IIFE 里直接 `document.getElementById(...)` 取 20 多个节点，只能在 DOM 解析完成后执行。

---

## 5. 渲染引擎插件（`js/plugin/`）

| 文件 | 职责 | 对外导出 |
|---|---|---|
| [mdcEncoding.js](js/plugin/mdcEncoding.js) (97 行) | 码规范化：`J1→AA1`、别名、`canonicalize` | `MDC.EM_SQUARE / revGardiner / aliasCanonical / canonicalCode / canonicalize` |
| [mdcMetrics.js](js/plugin/mdcMetrics.js) (135) | 纯测量：单元/层/VRG 宽度、`measureUnitEm` | `MDC.unitMetrics / layerMetrics / vrgBoxWidth / ligatureWidth` |
| [mdcView.js](js/plugin/mdcView.js) (232) | JSesh `MDCView` 的 HTML 适配：x/y/w/h/scale/子视图树 | `MDC.View / ViewSide / flattenView` |
| [mdcEnclosure.js](js/plugin/mdcEnclosure.js) (345) | 框类几何：王名圈 / 塞拉赫 / `h1` 方框 / 堡垒框（1 单位 = 1/18 em） | `MDC.Enclosure` |
| [mdcVrg.js](js/plugin/mdcVrg.js) (338) | **legacy** 四开组/竖排：`renderVRG / renderHRG / renderLayerUnit` | `MDC.measureUnitEm / computeCadrat / layoutQuadratAbs / renderVRG …` |
| [mdcCadrat.js](js/plugin/mdcCadrat.js) (622) | **正式**三层布局：`mdcfile → cadrat → verticalStack → horizontalList`（逐行对齐 `QuadratLayout.java`） | `MDC.Cadrat = { parse, layoutCadrat, layoutLine, layoutRow, flatten, renderLine, … }` |
| [mdcGlyphCore.js](js/plugin/mdcGlyphCore.js) (209) | 单字形渲染、阴影、SVG 覆盖层；消费 5 个 provider | `MDC.getMetrics / applyShadow / renderInShadedCell / attachSvgOverlay / renderGlyph` |
| [MdCRndr.js](js/plugin/MdCRndr.js) (2,586) | 聚合层：配置 → host 注入 → 解析器 → 样式注入 → 公开 API | `window.MdCRndr`（约 60 个成员，含 `internals`） |
| [keycast.js](js/plugin/keycast.js) (515) | 录屏用按键浮层，**不随仓库分发**（gitignore） | `window.KeyCast` |

`MdCRndr.js` 内部的七段式结构（可直接按行号定位）：

| 段 | 行 | 内容 |
|---|---|---|
| 一、常量与配置 | 26–79 | `DEFAULTS`（字体、字号、VRG 间距、`cadratMode`、竖排、类名表…） |
| 二、数据段 | 79–250 | 残余数据：`SER_TAIL_SVG`、`ENC_PAD`、`LIGATURES` 静态表（默认为空） |
| 三、基础工具 | 250–313 | `detectInputMode`、`hg`(码→字)、`g`(字→码)、`decodeCode` |
| 四、渲染引擎 | 313–1,269 | 字形 / 阴影 / VRG·HRG / 竖排 / 包围框 / 四开组适配 / 连字 / 顶层 `render` |
| 五、解析器 | 1,269–1,806 | `protectCompounds`、`resolveTranslitCode`、`parseInput` 及 8 个子解析器、`expandUnit`、`splitLines` |
| 六、样式注入 | 1,806–2,118 | `buildCss`（约 180 行 CSS 字符串）、`injectStyle`、`ensureStyle` |
| 七、公开 API | 2,118–2,586 | 约 60 个 API：`init/set/config/render/renderText/renderPreview/parse/…` + `internals` |

### 字形来源可插拔（provider 模式）

引擎本身不碰文件系统，字形由宿主通过 5 个 provider 注入：

```
MdCRndr.setGlyphProvider(fn)        code → { url } | null       （SVG 位图/data URL）
       .setGlyphBoxProvider(fn)     code → { x, y, w, h }        （墨迹盒）
       .setGlyphMetricsProvider(fn) code → { w, h }              （JSesh 18 单位口径）
       .setGlyphAspectProvider(fn)
       .setGlyphZoneProvider(fn)    code → 连字槽
```

`js/ui/glyphs.js` 负责实现它们：读本机 `jseshGlyphs-*.jar`（浏览器内解 zip 中央目录）、或已解压目录、或站点 `glyfs/jseshGlyphs/`；命中即用 SVG，未命中回落到内嵌字体。**站点不分发 JSesh 数据**是这个设计的核心合规约束。

---

## 6. 解析与渲染管线（实测）

### 6.1 解析

```
原始文本
  ├─ protectCompounds()       复合转写里的 "-" 先保护
  ├─ 丢弃悬空 "&"
  ├─ & 连字改写：选"宿主"（有插槽者）→ {宿主名}，其余进 zone1/zone2
  └─ parseInput()
        parseCode / parseWord / parseLigature / parseEnclosure / parseText
        / parseUnit / parseQuadrat / parseSequence
        → expandUnit()  →  { tree: {type:"seq", units:[…]}, invalid:[…] }
```

单元类型：`char` / `unsup` / `vrg` / `lig` / `enc` / `text` / `br`。

在假 DOM 中实跑（`parse` 返回 `{tree, invalid}`）：

| 输入 | 结果 |
|---|---|
| `nfr` | `char F35` —— 转写经 GIMPC 收敛为主字符 |
| `N35` | `char N35` |
| `nfr D21` | `invalid: ["nfrD21"]`（空格被吞后不再是合法码） |
| `A1-N35-<-t:w->` | `char A1, char N35, enc{kind:"A", units:[vrg], source:"t:w"}` |
| `t&G43&t` | `lig "X1&G43&X1"` —— 中间符号为宿主，两侧进槽 |
| `A1*B2:I10` | `vrg`：2 层，第 1 层 `A1*B2`，第 2 层 `I10` |
| `13460` | `unsup 13460`（无字形 → 占位方块） |

转写解析优先级（`resolveTranslitCode`）：`SVG_BOXES → MAIN_SIGNS → PHONEMES → TRANSLIT_SIGNS`；**只在解析期生效，不改写用户文本**。

### 6.2 排版

两套引擎并存，由 `options.cadratMode` 切换（默认 `"jsesh"`）：

| 模式 | 实现 | 模型 |
|---|---|---|
| `jsesh`（默认） | [mdcCadrat.js](js/plugin/mdcCadrat.js) | JSesh 三层：`Cadrat`（行栈，不足 1 em 补齐 1 em，超 1 em 等比缩）／`HBox`（`*` 并列，`smallSkip=2/18 em`）／`Line`；1 单位 = 1/18 em，最大 1 em × 1.222 em |
| `flow`（legacy） | [mdcVrg.js](js/plugin/mdcVrg.js) | 自研 VRG 层堆叠；竖排时改为 HRG（水平渲染组） |

实测 `MDC.Cadrat.layoutLine("A1-N35")` → `w=2.042 h=1.000 places=2`（两个 1 em 方块 + 1 个 smallSkip）。

### 6.3 渲染

```
tree → MDC.Cadrat.renderLine 或 renderVRG
     → 每个 unit：mdcGlyphCore.renderGlyph（SVG 背景 或 字体字符）+ 度量盒
     → 框类：mdcEnclosure（王名圈 / 塞拉赫 / h1 / 堡垒框，SVG viewBox 1 em 单位）
     → 连字：{名} → 查 LIGATURES 注册表；有 Tksesh 绝对坐标者直接用，否则由 renderLigature 从 zone provider 取槽做相对落位
```

---

## 7. 匹配层与 UI 状态机

**四路匹配**（[matcher.js](js/engine/matcher.js)，258 行、无 DOM 依赖）对应四个候选区：

| 区 | 匹配器 | 数据源 | 触发 |
|---|---|---|---|
| `VMBox` | `matchVocabulary` | `VOCABULARY ∪ LIGATURES`（`SEMANTICS`） | IB 中已确认码序列前缀 + 键入字母的发音 |
| `PDMBox` | 音素 | `PHONEME_UNITS` | 小写字母 |
| `PDMBox` | `matchDeterminative` | `DETERMINATIVES` | `;` 前缀 |
| `GMBox` | `matchGardiner` | `GARDINER` 表 | 大写字母 |

统一候选对象：`{ kind, insert, MdC, glyph, pron, mean }`；`kind ∈ word|lig|phon|det|code`。

**UI 集成**（[apply.js](js/ui/apply.js)，1,357 行）：

- **五模块**：IB 输入缓冲 / VM / PM / DM / GM；**四区域**：IBBox、VMBox、PDMBox、GMBox；
- **出流 / 入流状态机**：开始输入 → 全部 MBox 进入匹配；确认键或键入 `-` `:` 等终结符 → 除 VM 外清空；
- 渲染策略：VMBox 只渲染当前页；PDM/GM 在 `onload` 预建单元池，匹配只切 `display`；
- 键位、每页项数、水印、字形来源、按键展示全部由 [settings.js](js/database/settings.js) 的 `SETTINGS` 驱动（`localStorage`，不可用则静默降级）。

**语义类层次**（[semantics.js](js/database/semantics.js)）：

```
Semantics（pron + meaning + 多态接口）
 ├─ Vocabulary   词：pron + MdC 串 + 释义
 └─ Ligature     连字：MdC 串即 "{名称}"
Phoneme（独立）   单字符，只在 PDMBox 出现，不进 VMBox
```

变体族（`new Vocabulary(pron, 变体MdC, null, 母MdC)`）在装配后**共享同一个 meaning 对象**，改一处全族同步。

---

## 8. 构建 / 发布管线

| 工具 | 作用 |
|---|---|
| [tools/build-rndr.js](tools/build-rndr.js) | 按固定顺序拼接 12 个源文件 → [dist/rndr.js](dist/rndr.js)（533 KB），并包装 `window.Rndr` API；同时产出 `rndr-data.js`（度量 + SVG 盒 + 连字槽，1.06 MB）、`rndr-font.js`（内嵌字体 3.8 MB）、`demo.html` |
| [tools/stamp-version.js](tools/stamp-version.js) | 给各页面的 `<script src>` / `<link href>` 批量打 `?v=` 版本戳（当前统一 `glyphs-202611142250`） |
| [tools/entries.js](tools/entries.js) | 词条维护 CLI（45 KB，`/s /a /m` 查询·添加·修改，自动排序、写盘前备份、写盘后复核） |
| [tools/ttf-metrics.js](tools/ttf-metrics.js) | TTF → 度量表（`ngMetrics`） |
| [tools/svg-bbox.js](tools/svg-bbox.js) | SVG path → 墨迹盒（`svgBoxes`） |
| [tools/bzr2svg.js](tools/bzr2svg.js) | `.bzr`（旧二进制字形）→ SVG，补 17 个缺字形 |
| [tools/gen-zones.html](tools/gen-zones.html) + [zone-server.js](tools/zone-server.js) | 浏览器端跑连字槽推导 → `ngZones` |
| [tools/embed-font.js](tools/embed-font.js) | TTF → `ngFontData.js` data URI |
| [tools/import-glyphs.ps1](tools/import-glyphs.ps1) | 本机 JSesh 字形导入 |

`dist/` 是**可选**产物（4 个文件入库），面向"把引擎嵌进别的项目"的场景；应用本身不需要构建。

---

## 9. 测试与诊断体系

| 层 | 内容 |
|---|---|
| 回归 | [regression.html](regression.html)：判据 13 项（[tests/README.md](tests/README.md) 记 13/13；[MDCRNDR_MODULE_PLAN.md](MDCRNDR_MODULE_PLAN.md) 的验收清单仍写 11/11） |
| 连字 | [tks.html](tks.html)：Tksesh 24 条逐条检查 + 整行排版 |
| 正式诊断页 | [tests/pages/](tests/pages/)：`ligature-matrix`、`zones-audit`、`jseth-zone-diag`、`diagnose-A138`、`inspect`、`text-layout` |
| 一次性探针 | [tests/probes/](tests/probes/)：254 个 `_*.html`（`_enc*` 王名圈几何、`_aa*` viewBox、`_lig*` 连字、`_vrg2` 堆叠…），统一注入 `<base href="../../">`，gitignore |
| 视觉留档 | [_shots/](_shots/) 446 张截图（gitignore） |
| 插件台 | [CPlugin_Test/index.html](CPlugin_Test/index.html)（**现状失效**，见 §11.3） |

**没有自动化测试运行器**：全部依赖浏览器手工/半自动页面，配合 `node --check` 与 Build 号肉眼确认（见 [MDCRNDR_MODULE_PLAN.md](MDCRNDR_MODULE_PLAN.md) 的验收清单）。

---

## 10. 文档体系

```
面向使用者   README(.en).md  →  instructions.html（12 节）
面向集成者   for_developers.html（16 节：API / 解析 / 码表 / internals / CSS 类名 / 陷阱）
面向维护者   MDCRNDR_MODULE_PLAN.md（裂解计划）
             JSESH_LAYOUT_REF.md      排版机制总参考（17 节，41 KB）
             JSESH_SVG_LIGATURES.md   连字槽源码审计（14 节）
             JSESH_VS_CHEAV.md        两套实现差异归因（11 节）
             LIGATURE_ZONES.md        连字区事实/踩坑（6 节）
             JSESH_LAYOUT_AUDIT.md    首轮调查清单（32 点）
             TKSESH_LIST.md           24 条连字清单
合规         NOTICE.md（Unicode License V3 全文、OFL 1.1、未包含素材）、LICENSE
```

这套文档的密度远高于同规模前端项目：几乎每个"为什么这样写"都能追到 JSesh 的具体 `.java` 行号。

---

## 11. 架构观察与风险（按影响排序）

> **作者补充（2026-11-17）**：本节的判断基于代码现状，需结合项目意图理解——
> ① **模块化是开发期策略**：`js/plugin` 的 9 个文件是"先拆开逐个开发、最后再合回单文件 `MdCRndr.js`"，
> 目标形态是一个类 MathJax 的可嵌入引擎，因此 §11.2 的"未拆完"是进度而非方向错误，
> 真正的风险是**开发树与单文件发布产物之间缺少构建约束**（见 §8 的 `tools/build-rndr.js`）；
> ② **NewGardiner 字体模式当前不支持**（`glyphSource` 默认 `"svg"`，字体仅作兜底），
> 本期主攻 **JSesh SVG 模式**，目标是在前端完全复刻 JSesh 行为；
> ③ **竖排仍待做**（`ModeVertical` 被 `disabled` 即此意）；
> ④ 上游 JSesh 已有官方 TypeScript 移植 `jsesh-js`，调查详见 [JSESH_STUDY.md](JSESH_STUDY.md)。

### 11.1 文档落后于代码（三处系统性脱节）

| 文档说法 | 代码实际 |
|---|---|
| README："18 个脚本" | **37** 个 `<script>`（[index.html](index.html)） |
| README / for_developers §1：插件是"单文件零依赖 205 KB" | **9 个文件 5,079 行**；且依赖 `js/database` 的三张表 |
| README：版本 2.0.0（2026-11-07） | 页脚 / 提交：`ud3.0.0-a2d`（2026-11-15） |

`MODULE_PLAN.md` 是唯一记录真实结构的文档，但它描述的是**计划**而非现状。

### 11.2 模块化只完成到一半

计划把 8,664 行的单文件拆成 9 个新文件（1 张数据表 + 7 个引擎模块 + 聚合层）。实际：数据表与 6 个引擎模块已拆出，另新增计划外的 `mdcView` / `mdcCadrat`；`mdc-ligature` / `mdc-parse` / `mdc-render` 三个尚未拆：

- 已拆：encoding / metrics / glyphCore / view / enclosure / vrg / cadrat；
- **未拆**：`mdc-ligature`（仍在 [MdCRndr.js:984](js/plugin/MdCRndr.js#L984)）、`mdc-parse`（[:1338](js/plugin/MdCRndr.js#L1338)）、`mdc-render`（[:1192](js/plugin/MdCRndr.js#L1192)）；
- 结果：`MdCRndr.js` 仍有 **2,586 行**，计划目标是 1,200 行。

### 11.3 `CPlugin_Test` 已失效（可复现）

实测（Node `vm` + 假 DOM，按该页脚本顺序加载）：

```
window.MDC keys: 18
  MDC.unitMetrics   = UNDEFINED     ← mdcMetrics 的导出丢失
  MDC.canonicalCode = UNDEFINED     ← mdcEncoding 根本没加载
  MDC.Cadrat        = UNDEFINED     ← 缺 mdcCadrat.js
MdCRndr.GARDINER size: 0           ← 缺 mdcGlyphTables.js
```

原因有三层：① `mdcMetrics` 排在 `mdcView` 之前，`window.MDC` 尚不存在，导出写进了游离对象；② 缺 `mdcEncoding` / `mdcCadrat`；③ 缺 `mdcGlyphTables` / `ngMetrics` / `svgBoxes`。**"只依赖插件"的说法已不成立** —— 插件现在依赖 `js/database` 的生成表。

### 11.4 两套排版引擎并存

`mdcCadrat`（JSesh 三层）与 `mdcVrg`（legacy VRG/HRG）同时活着，`cadratMode` 切换。风险：框内、嵌入、竖排路径仍走 VRG，两套的度量口径（墨迹 bbox vs 18 单位网格）需要长期保持一致，是回归 bug 的高发区。`JSESH_VS_CHEAV.md` 已列出 8 条可见差异归因。

### 11.5 全局命名空间与加载顺序耦合

456 个顶层 `const/var/function` 名（去重）+ `window.MDC`（29 键）+ 十余个 `window.*` 全局（`SVG_BOXES` / `NG_ZONES` / `TKESH_LIGATURES` …）；37 个 `<script>` 的顺序就是接口契约，且缺乏运行期校验。任何一个文件放错位置都表现为"静默降级"而非报错（§11.3）。

### 11.6 首屏体积与缓存策略

- 5.59 MB / 37 个脚本请求，其中内嵌字库 3.72 MB（66%）、`ngZones` 676 KB、`mdcGlyphTables` 260 KB、`svgBoxes` 229 KB；
- 无压缩、无分包、无 `defer`/`async` —— 37 个脚本全部同步阻塞解析；
- 版本戳统一为 `glyphs-202611142250`（11/14 22:50），而源码最后修改在 11/16 之后 —— 版本戳**无法精确对应**内容，只能靠 Ctrl+F5。

### 11.7 数据事实源在仓库外

`glyfs/`（35 MB JSesh SVG）被 gitignore（仅 17 个补绘图入库）；Unicode 源数据、度量脚本在仓库外 `..\_tem_dd\cheav\`。**新克隆者没有 SVG 字形**，只能以字体兜底渲染（[apply.js:171](js/ui/apply.js#L171) 的 `effective = "font"` 分支，`html[data-glyph-mode=font]`），SVG 模式与连字槽推导（Tier 2）无法复现。`dist/rndr-font.js` 与 `ngFontData.js` 是同一字体的两份副本（3.8 MB × 2）。

### 11.8 许可登记缺口

[NOTICE.md](NOTICE.md) 未登记 `js/lib/paper-core.min.js`（paper.js，MIT），而它随仓库分发。另存在两个 `lib` 目录（根 `lib/` 兼容层、`js/lib/` 第三方），职责上应合并或改名。

### 11.9 连字模型已迁移，但注释未跟上

内置 `LIGATURES` 静态表默认被**清空**（[MdCRndr.js:246-247](js/plugin/MdCRndr.js#L246-L247) 删掉 17 条旧连字，改由 zone 驱动 + Tksesh 目录懒注册），实测 `MdCRndr.LIGATURES` 长度为 0。但 [ligatures.js](js/database/ligatures.js)、README、for_developers 仍按"几何数据在插件内"的静态表模型描述，读者会被误导。

### 11.10 其它

- 竖排按钮在 `ud3.0.0-a2d` 被 `disabled`，引擎侧 `renderVertical / renderHRG` 全链路仍在 —— 半成品状态；
- 根目录 30+ 个 `_*.html` 探针残页（已 gitignore，但影响目录可读性）；
- `_backup/MdCRndr-20261108-2213.js`（340 KB）是模块化前快照，与现 134 KB 的聚合层不可比，保留价值仅作历史；
- 工作区有 5 个未提交文件（版本戳 + `thumbs.js` 调整），当前不是干净状态。

---

## 12. 一句话总结

这是一个**"单文件应用"演化成"小型框架"**的典型案例：数据层（6 张生成表 + 4 类语料）、引擎层（9 个 IIFE 模块 + provider 注入）、UI 层（状态机 + 三路候选池）、工具链（数据生成 + 打包 + 词条 CLI）四段分明，接口靠全局约定与加载顺序维系；源码里对 JSesh 的逆向注释密度极高，是项目最大的智力资产。当前主要债务集中在**文档/测试台与模块化进度不同步**（§11.1–11.3）和**双排版引擎并存**（§11.4）。
