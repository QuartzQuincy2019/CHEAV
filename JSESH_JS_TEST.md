# jsesh-js 0.2.0 功能完整性测试

> 测试对象：上游官方 JS 移植 **jsesh-js 0.2.0**（`jsesh-web-0.2.0.zip`，2026-10-24 发布，171.8 KB bundle + 24 MB 字形数据）
> 测试时间：2026-11-17 · 环境：Windows / Edge 157 headless（Chromium）/ python http.server
> 测试台：[tests/jsesh-web/completeness.html](tests/jsesh-web/completeness.html)（80+ 条断言，结果输出为 JSON）
> 背景：[JSESH_STUDY.md](JSESH_STUDY.md)

---

## 0. 结论

**能用，而且完成度很高**：41/41 关键导出齐全、3 个自定义元素注册正常、24/24 条渲染用例产出合法 SVG（无 `NaN`）、7/7 种排版变体（含竖排与 RTL）可用、3 份真实 `.gly` 文献（含文档头）整篇渲染无误。

**两周前的 0.2.0 落后于 Java 9.x**：`%insert`、`%hkern`、`%vkern` 三个新指令在解析阶段直接报错（master 的 lexer 里已有，release 里没有），自动折行参数 `wrapWidth` 也不存在。也就是说：**日常 MdC 显示没问题，"最新 JSesh 语言"没覆盖**。

**对 CHEAV 的直接影响**：用它替换自研渲染引擎在"显示"这一层是成立的；但要接受 24 MB 数据、CeCILL-C、无字体兜底、无 Unicode 十六进制码输入、以及"错误不抛异常而是画成拉丁文本"的行为。

---

## 1. 测试方法

- 把官方 zip 解压到 `tests/jsesh-web/`，用 `python -m http.server` 起静态服务（模块与 `fetch` 在 `file://` 下不可用）。
- 页面 `completeness.html` `import * as J from "./jsesh/jsesh.js"`，先 `configureJSesh({glyphsUrl:"./jsesh/data/"})`，然后分 11 组跑断言，结果写成 `<script type="application/json" id="result">` 里的 JSON。
- 用 `msedge --headless=new --virtual-time-budget=120000 --dump-dom` 取回 DOM，解析 JSON。
- 注意：虚拟时间下 `performance.now()` 被虚拟化，**耗时数字不可信**；字形 JSON 的抓取次数、SVG 尺寸、节点数是真实值。

---

## 2. 结果总览

| 维度 | 结果 |
|---|---|
| API 导出面 | **41 / 41** 全在（`parseMdc`、`toMdc`、`renderMdc`、`layOutText`、`buildView`、`EditorSession`、`PaletteController`、`DEFAULT_*`、模型类…） |
| 自定义元素 | `jsesh-text` / `jsesh-editor` / `jsesh-palette` 全部注册，且与导出的类一致 |
| 字形数据 | 6,963 个字形、24 条预定义连字、393 条 phon→Gardiner 归一化；`glyph-index.json` 加载 9 ms |
| 解析 | **69 / 84** 用例通过（15 条失败中 11 条是我写错的语法，4 条是真缺口，见 §4） |
| 渲染 | **24 / 24** 产出 `<svg>`，无 `NaN`，无 404 |
| 排版变体 | **7 / 7**（默认 / RTL / 竖排 / 竖排+RTL / 居中 / 两端对齐 / 页宽） |
| 自定义元素行为 | **8 个用例 7 通过**（唯一"失败"是预期报错、实际走错误恢复，见 §7） |
| 真实文档 | 3 / 3 整篇渲染（0.9 KB、21 KB、24 KB），`Error in file` 均未出现 |
| 运行时错误 | 页面 0 个 `window.onerror` / `unhandledrejection`，控制台 0 条 error/warn |
| 缓存 | 同文本渲染两次，字形 JSON 抓取 33 → 33（+0） |

---

## 3. 数据与度量：与 Java 版一致

`glyph-index.json` 的 `format = 1`；`A1` 尺寸 **16.1 × 17.7792**，与 JSesh 7.11 的 `A1.svg`（`width=16.1 height=17.78`）一致；`zoneA1 = {x:-2.4527, y:8.8896, w:4.025, h:4.4448, gravity:END/CENTER}`，与 `LigatureZoneBuilder` 的输出口径一致。

默认几何常量（`DEFAULT_GEOMETRY`）与 Java `GeometrySpecification.DEFAULT` **逐项相同**：

| 常量 | jsesh-js | Java |
|---|---|---|
| `maxCadratHeight` / `maxCadratWidth` | 18 / 22 | 18 / 22 |
| `smallSkip` | 2 | 2 |
| `lineSkip` / `columnSkip` | 6 / 10 | 6 / 10 |
| `tabUnitWidth` | 0.09 (=18/200) | 0.09 |
| `textWidth` / `leftMargin` / `topMargin` | 538 / 6 / 5 | 538 / 6 / 5 |
| `cartoucheLineWidth` / `cartoucheLoopLength` / `cartoucheMargin` | 1 / 10 / 2 | 1 / 10 / 2 |
| `serekhDoorSize` | 20 | 20 |

转写归一化可用：`canonicalCode("nfr") = "F35"`、`canonicalCode("t") = "X1"`（等价于 CHEAV 的 GIMPC）。

---

## 4. 解析：69 / 84，缺口集中在 9.x 新特性

### 通过（节选）

`nfr-f:r`、`A1-N35`、`A1*B2:I10`、`zA&ra`、`t&G43&t`、`q&mA`、`A1&&B2`、`A1^^B2`、`A1&&&B2`、`<A1>`、`<-A1->`、`<s1A1s1>`、`<S1A1S1>`、`<f1A1f1>`、`<0A1>`、`[[A1]]`、`[(A1)]`、`[?A1?]`、`[{A1}]`、`['A1']`、`["A1"]`、`[&A1&]`、`A1#B2`、`A1##B2`、`A1#134`、`A1#1234`、`-#-A1`、`#bA1`、`#eA1`、`+good+s`、`A1|2`、`"small"`、`A1!A2`、`A1!=150%A2`、`A1!!A2`、`A1?100B2`、`A1%clear`、`{l100,200}`、`A1\R90`、`A1\2`、`A1.B2`、`A1..B2`、`A1/B2`、`A1//B2`、`A1h/B2`、`A1v/B2`、`A1oB2`、`A1OB2`、`A1$rB2`、`A1$bB2`、`A1?B2`、`A1??B2`、`(A1:B2)*C3`、`quadrant(A1:B2)`、`A1%[x=1]`、`i-w-r:a-C1-m-p*t:pt`、`zA&ra-mn:n-xpr`、`S34-N35:AA1`、`nfr`、`iri`、空串

### 真缺口（4 条）

| 输入 | 报错 | 说明 |
|---|---|---|
| `%insert[dir=bs,dw=20,dh=30](O1,n:t)` | `expected '[' ... at token 'insert'` | **0.2.0 没有 INSERT 指令**（master 的 lexer 有；`jsesh.js` 里 `hkern`/`%insert`/`kerning` 字符串计数为 0） |
| `p-%hkern-q` | 同上 | 无 `%hkern` |
| `p*%hkern[a=1,b]*q` | `unexpected ... '%'` | 无 `%hkern` |
| `p:%vkern:q` | 同上 | 无 `%vkern` |

### 两个真实的互操作陷阱（已定位到根因）

1. **代码拼写**：`AA1` 不在字形索引里（索引只有 `Aa1`），渲染成**红色文本 `AA1`**；`Aa1` 正常出图形。JSesh 的规范写法是 `Aa1`，`AA1` 是 CHEAV 侧的规范名 —— 两边互操作必须先做别名映射。
2. **带分栏号的框必须用 `-` 隔开**：`<s1A1s1>` 会被当成未知码 `A1s1`（红色占位，`toMdc` 给 `<S-A1s1->`）；写成 **`<s1-A1-s1>`** 才正确（2 条 path、无红字）。同理 `<S1A1S1>` 需要 `<S1-A1-S1>`。已用 9 个变体逐一验证。

> 红字是 jsesh-js 的"缺字形占位符"：`<text fill="#ff0000">码</text>`，与 JSesh 桌面版的红框+码名等价。

### 看似失败、实为我写错语法（11 条）

- `#1234A1`：底纹必须**跟在**某个项之后（`A1#1234` 合法）；
- `A1[x=1]`、`A1[2]`：`[` 只能出现在 `%` 之后或 `quadrant(...)` 之后；
- `A1%{}`、`A1%B2`：`%` 后面必须跟 `[`（如 `A1%[x=1]` 合法，并被规范化为 `A1-%[id=0,orientation=horizontal,justification=left]`）；
- `[A1`、`(A1`、`{A1`、`{no-such-ligature}`：未闭合/未知，**正确抛 `MdcSyntaxError`**。

### 回写（`toMdc`）是"规范化"而非恒等

`parseMdc` → `toMdc` 只对 28/84 逐字相同，其余的改写是**有意的规范形式**：

| 输入 | 回写 |
|---|---|
| `A1&&B2` | `A1**B2` |
| `A1^^B2` | `A1^^^B2` |
| `<A1>` / `<s1A1s1>` / `<S1A1S1>` / `<f1A1f1>` | `<-A1->` / `<S-A1s1->` / `<S-1A1S1->` / `<F-A1f1->` |
| `[[A1]]` | `[[-A1-]]` |
| `A1#B2` | `A1##B2` |
| `#bA1` | `#b-A1#e-` |
| `A1$B2` | `A1-$r-B2$b-` |
| `A1!A2` | `A1-!` + 换行 + `A2` |
| `quadrant(A1:B2)` | `quadrant-(A1:B2)` |

> 这同时回答了一个兼容性问题：**`<-A1->` 是 JSesh 的规范写法**（`<A1>` 会被写成它），不是 CHEAV 的自造语法。

---

## 5. 渲染：24 / 24

| 输入 | `<path>` | `<text>` | SVG 字节 |
|---|---|---|---|
| `nfr-f:r` | 3 | 0 | 3.4 KB |
| `A1*B2:I10` | 3 | 0 | 10.4 KB |
| `zA&ra` | 2 | 0 | 6.3 KB |
| `t&G43&t` | 2 | 0 | 3.1 KB |
| `<A1>` | 2 | 0 | 3.9 KB |
| `<s1A1s1>` | 2 | 1 | 1.0 KB |
| `[[A1]]` | 3 | 0 | 4.0 KB |
| `+good+s` | 0 | 3 | 0.6 KB |
| `A1\R90` | 1 | 0 | 3.7 KB |
| `i-w-r:a-C1-m-p*t:pt` | 9 | 0 | 13.2 KB |
| `S34-N35:AA1` | 2 | 1 | 1.9 KB |
| `13460` | 0 | 1 | 0.3 KB ← **十六进制码不识别，退化为文本** |

---

## 6. 排版：横 / 竖 / RTL 都成立

同一串 `A1-N35-<-t:w->-i-w-r:a-C1`，view 尺寸与输出：

| 变体 | view (em) | SVG (px, cadratHeight=36) |
|---|---|---|
| 默认 | 123.42 × 19.0 | 252 × 42 |
| RTL | 123.42 × 19.0（`direction=RIGHT_TO_LEFT`） | 252 × 42（SVG 内容镜像，字节 12,917 vs 12,524） |
| **竖排** | **24.0 × 165.0** | **52 × 336** |
| 竖排 + RTL | 24.0 × 165.0 | 52 × 336（镜像） |
| 居中 / 两端对齐 | 123.42 × 19.0 | 252 × 42（单行文本看不出差异） |
| 页宽 20em | 123.42 × 19.0 | 252 × 42（**0.2.0 没有 `wrapWidth` 字段**，此变体无效） |

竖排是真竖排：宽高对调、view 树 30 个节点 / 深 7 层。

制表位（`?N`）实测：`A1-B2` = 66.7 px；`?50` = 43.3；`?100` = 50.0；`?200` = 65.0。说明 `?N` 是**绝对位置**（单位 = 1/200 em），落在已有字形范围内会重叠——与 JSesh 的绝对制表语义一致，不是 bug。

---

## 7. 元素与错误行为

- `<jsesh-text>`：内容/`mdc` 属性均可；`cadrat-height`、`direction=rtl`、`orientation=vertical`、`justified`、`centered`、`glyphs-url`（逐元素指定数据目录）全部生效；shadow DOM 内是 `<style>+<svg>`，并派发 `jsesh-render`。
- `<jsesh-editor>` / `<jsesh-palette>`：可实例化、shadow DOM 有内容（palette 118 KB DOM，含 6,963 个签名）；**无头环境未测键盘交互**。
- `autoRender({observe:true})`：`<span class="mdc">` 被加上 `hieroglyphs-processed` 并插入内联 SVG（10.5 KB）。
- **错误行为（重要）**：`parseMdc("[A1")` 抛 `MdcSyntaxError`；但 `renderMdc` / `layOutInPage` 走的是 `readMdcDocument`，**默认容错**——按行回退，把 `Error in file: …` 和原文逐字符画成拉丁文本（59 个 `<text>`，无 `<path>`），**不派发 `jsesh-error`**。这是 JSesh 桌面版打开坏文献的同一策略；但做"实时输入预览"时会被它掩盖错误，必须自己用 `parseMdc` / `readMdcDocument(src,{failFast:true})` 校验。

---

## 8. 真实文献（含文档头）

| 文件 | 大小 | top items | `<path>` | `<text>` | 抓取字形 JSON | SVG |
|---|---|---|---|---|---|---|
| `A_demonstration_of_the_mdc.gly` | 24.3 KB | 18,155 | 182 | 14,510 | 91 | 2.73 MB |
| `Cairo JE 67573.gly` | 0.9 KB | 166 | 48 | 62 | 20 | 81 KB |
| `Book of the dead Chapter 17.gly` | 21.2 KB | 5,530 | 570 | 576 | 246 | 1.68 MB |

全部 `Error in file` = false、`NaN` = false。**字形是按需抓取的**（每篇只取用到的 20–246 个 JSON，不是 6,963 个）。

---

## 9. 与 Java 版的能力差（0.2.0 vs 9.x / master）

| 能力 | 0.2.0 | master / Java 9.x |
|---|---|---|
| `%insert`（把组插入符号） | ❌ | ✅ |
| `%hkern` / `%vkern`（字距） | ❌ | ✅ |
| 自动折行 `wrapWidth` | ❌ | ✅ |
| Unicode 十六进制码（`13460`） | ❌（当文本） | Java 版同样不认（可用 `kEH_JSesh` 映射） |
| search / PDF / RTF 导出 | ❌（官方明示未移植） | ✅ |
| `<jsesh-field>` 单行编辑器 | ❌ | 计划中 |

> 结论：0.2.0 覆盖的是"**显示 + 编辑 + 调色板 + 完整 MdC 主体语法**"，缺的是 2026-10 之后才落地的 9.x 排版新特性。

---

## 10. 对 CHEAV 的意义

1. **可以直接站在它上面**：显示层（`<jsesh-text>` / `renderMdc`）与编辑层（`<jsesh-editor>`）都已可用，省掉自研 `mdcCadrat`/`mdcEnclosure`/连字槽的维护成本。
2. **代价要接受**：24 MB 数据（或自建 CDN + CORS）、CeCILL-C（文件级 copyleft，与 MIT 主仓需隔离声明）、字体条款（数据里含 Thomas 字形，只能随 JSesh 用，不能当独立素材分发）、无字体兜底。
3. **CHEAV 的差异化仍在**：中文界面、词库/音素/定符三路匹配工作流、MIT、轻量、`13460` 这类 Unicode 码输入。把自研引擎退居"轻量字体兜底"、把 jsesh-js 作为"高保真 SVG 渲染后端"，是比二选一更合理的分工。
4. **如果继续自研**：这份测试就是最好的验收基线——同一批 84 条输入、同一套 SVG 尺寸/节点数/错误行为对照。

---

## 11. 复现

见 [tests/jsesh-web/README.md](tests/jsesh-web/README.md)：

```bash
# 1) 下载并解压官方 zip 到 tests/jsesh-web/（jsesh/ 目录，~24 MB）
# 2) 启动静态服务
python -m http.server 8123 --directory tests/jsesh-web
# 3) 打开 http://127.0.0.1:8123/completeness.html
# 4) 无头取结果
msedge --headless=new --virtual-time-budget=120000 --dump-dom http://127.0.0.1:8123/completeness.html
```

`jsesh/` 与 `samples/` 已在 [tests/jsesh-web/.gitignore](tests/jsesh-web/.gitignore) 中排除，不入库。

## 8. 集成进 CHEAV（2026-11-19）

正文渲染区与 IB 预览已改用 jsesh-js，字形一律 JSesh SVG；NewGardiner 字体渲染已移除。

| 位置 | 改动 |
|---|---|
| `lib/jsesh/jsesh.js` | 预构建库（CeCILL-C，随仓库分发） |
| `lib/jsesh/data/` | 6,963 个字形 JSON（约 24 MB，**不入库**；本地目录联接，部署时另行提供） |
| `js/render/jsesh-render.js` | 适配层：动态 import、`configureJSesh`、码位规范化（`AA1`→`Aa1`）、`svgFor()/render()` |
| `js/ui/apply.js` | `refresh()` 与 `updateIBPreview()` 优先走 jsesh-js（带过期令牌）；连字 `{…}`、`&`、`%insert/%hkern/%vkern` 回退 MdCRndr；设置新增「渲染引擎」 |
| 尺寸 | `cadratHeight` = CHEAV 的 `SIZE`（渲染区 100 px；IB 预览 40 px）；`<svg>` 以 `max-width:100%` 自适应 |
| 字体 | 删除 `js/database/ngFontData.js`；`MdCRndr.init({injectFontFace:false})`；设置里移除「字形来源」，只显示 JSesh SVG |

关于 `&`（2026-11-19 复核）：**jsesh-js 支持**。

- 解析：`&` → `Ligature` 节点（`jsesh.js` 的 `case r.AMP`），`&&` → `AbsoluteGroup`（绝对定位组）；
- 绘制：`visitLigature` 先查 24 条显式连字定位表（如 `M17&M17`、`Z1&Z1`、`F12&D28`），
  否则取宿主字形自带的 ligature zone（`glyph-index.json` 里每个字形的 `[x,y,w,h,gravity]` 槽位，
  6,896 / 6,963 个字形有槽位）；
- 实测：`G39&X1` 与 `G39*X1` 输出不同，前者把 X1 放进 G39 的槽位（见 `_probe_amp.html`）。

仍未实现：`{连字名}` 引用（解析报 "Error in file"）、`%insert`（源码显式 `throw "@insert is not supported yet"`）、
`%hkern` / `%vkern`。这三类回退 MdCRndr（其字形同样来自 JSesh SVG）。
适配层 `js/render/jsesh-render.js` 已相应放开 `&`，只有 `{…}` 与上述三个指令才回退。

### 框类（王名圈 / 塞拉赫 / 裸框 / 堡垒框 / 圆形）

jsesh-js 的词法层支持 JSesh 的全部五种框（`jsesh.js` 的 `te` 表：`c`=CARTOUCHE、`s`=SEREKH、
`h`=HOUT、`f`=CASTLE、`g`=CIRCULAR_ENCLOSURE），实测全部可渲染：

| MdC | jsesh-js | MdCRndr（旧） |
|---|---|---|
| `<-D21:N35->` | ✓ 王名圈 | ✓ |
| `<-A1-A1-A1->` | ✓（多 cadrat） | ✓ |
| `<S-A1-N35->` | ✓ 塞拉赫 | ✓（比例不同） |
| `<h1-A1-h1>` | ✓ **裸方框** | ✗ 画成王名圈 |
| `<F-A1-N35->` | ✓ **堡垒框**（雉堞） | ✓ |
| `<g-A1->` | ✓ **圆形**（扇贝边） | ✗ 画成王名圈 |
| `<-A1-A1-><-A1-A1->` | ✓ 一行两个框 | ✓ |

结论：框类可以完全交给 jsesh-js；`<h1-…-h1>` 与 `<g-…->` 反而是 jsesh-js 比旧 MdCRndr 更正确。
`%insert` / `%hkern` / `%vkern` 之外不再拦截任何输入（旧语法 `{…}` 已废除，应用自身的解析层会先报错）。

### 竖排（vertical）

jsesh-js 的竖排**不是** `renderMdc` 的顶层选项，而是样式里的
`style.options.textOrientation = "VERTICAL"`（`DEFAULT_STYLE` 的字段）；
`%[orientation=vertical]` 文档指令对 `renderMdc` 无效（实测输出与横排完全一致）。

实测（`cadratHeight = 60`）：

| 输入 | 横排 | 竖排 |
|---|---|---|
| `D21:Aa1` | 63×21（并排） | 26×51（成列，自上而下） |
| `D21-Aa1`（一个 cadrat 分隔） | 33×21 | 26×24（同列向下） |
| `D21!Aa1` | 24×45（换行） | **58×16（换列，两列）** |
| `D21!Aa1!Y1` | — | 90×18（三列） |

几何：一列宽 **26/18 em**，列间距 **6/18 em**；列自左向右推进（默认方向）。
`!` 就是换行符——横排换行、竖排换列，正好对应 CHEAV 的「`$` 分段 = 一列」。

**CHEAV 方言与 jsesh 的冲突**：jsesh 里 `$` 表示**红色**（实测 `$Aa1` 的填充是 `#ff0000`），
而 CHEAV 用 `$` 表示换行。适配层 `normalize()` 已把 `$` 换成 `!`（`+文本+s` 片段内不替换），
解决该冲突；实测 `D21$Aa1` → `D21!Aa1`，横排出两行、不再变红。

CHEAV 竖排模式已重新启用（`index.html` 的 `#ModeVertical` 去掉 `disabled`），
字号折算按 jsesh 列距 `(32n-6)/18 em` 计算（`verticalFontSize()`），渲染与 IB 预览都走 jsesh，
失败时回退 MdCRndr 的 `renderVerticalText`。

### `$` 红色 / `#` 阴影 / `\` 镜像（2026-11-19 实测）

- **`$` = 红色开关**（不是换行）：`$Aa1-Aa1` 两字皆红；`$Aa1$-Aa1` 只第一个红；`Aa1$Aa1` 只第二个红。
  CHEAV 已把换行统一成 `!`（`MdCRndr` 解析器、`splitLines`、适配层、使用说明都已改），`$` 按 jsesh 语义切换红色。
- **`#` = 阴影**：`D21:Aa1#1` 在左上角加半透明灰块；`#12` 上半、`#1234` 全格。
  jsesh 用半透明灰底（`rgba(153,153,153,0.3)`），不是 CHEAV 旧版的 45° 斜线；象限编号一致（1 左上、2 右上、3 左下、4 右下）。
- **`\` = 镜像后缀**：`G39\` 鹅朝右、`C59C\` 人物反向、`Aa1\` 胸形反向；只能作后缀（`\Aa1` 会报
  "unexpected ... token '\Aa1'"）。CHEAV 原本也是后缀写法，语义一致。
