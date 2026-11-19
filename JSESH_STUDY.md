# JSesh 7.11 调查

> 调查对象：`D:\JSesh-7.11`（Windows 安装版）+ 上游源码 `rosmord/jsesh`（`release-7.11` 标签与 `master`）
> 调查时间：2026-11-17 · 方法：安装物解剖、jar 反查包结构、源码级算法核对、与 CHEAV 实测对照、上游网页/Zenodo/Unicode 文档检索
> 相关：CHEAV 结构解析见 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 0. 结论摘要

1. **JSesh 是古埃及圣书体排版的学术级事实标准**：2002 年开写、2004 年首发（前身 TkSesh），作者是 CNAM 副教授、CÉDRIC 实验室 VERTIGO 团队的 **Serge Rosmorduc**；字体由 **Serge J.-P. Thomas** 绘制（历史绘图纸的数字化）。被 IFAO（2007 起）、JARCE 等机构用于正式出版物，是 MdC（Manuel de Codage）生态里最常用的实现。
2. **版本线正在加速**：7.6.1（2023-02）→ 7.9（2025-09）→ **7.11（2026-04-07，即你安装的版本）** → 8.0.x（2026-07～10，大重构）→ 9.1/9.3 预发布（2026-11，仍是 alpha）。仓库 `rosmord/jsesh` 92★/25 fork，2026-11-15 仍在推送。
3. **你的 7.11 与 CHEAV 引用的源码不是同一代**：7.11 的包是 `jsesh/mdcDisplayer/{layout,view,draw}`；CHEAV 注释里写的是 `jsesh/render/{layout,view,style}` —— 那是 **8.x/9.x master** 的路径。以 `Layout.visitCartouche` 为例，master 在 **433 行**，CHEAV 注释写 404-467。把版本对齐（或至少记录 commit）是当前第一优先的工程卫生问题。
4. **上游已经有官方 JS 移植 `jsesh-js`（0.3.0，CeCILL-C）**：TypeScript 11,244 行、Web Component `<jsesh-text>`、单文件 bundle、38 MB 字形 JSON、用 Java 导出的 fixtures 做逐视图比对。它和 CHEAV 的最终目标（"网页里像 MathJax 那样实时渲染"）正面重合，必须纳入参照系。
5. **许可必须重写**：代码是 **CeCILL-C / CeCILL（LGPL 系）**，字体受 **Thomas 条款**约束（明确不允许用于"其它圣书体文字处理器"），`signs_description.xml` 是 **CC BY 4.0**。CHEAV 目前 README/NOTICE 写"独立实现、未包含 JSesh 素材"——这与"大部分源码抄自 JSesh"并存，是**分发风险**，不是文字问题。
6. **对 CHEAV 的好消息**：算力投入方向是对的。JSesh 需要被移植的核心面（model+parser+layout+draw+sign DB）是 **271 个文件 / 38,175 行 Java**；CHEAV 已用 ~11,000 行手写 JS 覆盖了其中的四开组、行、王名框、连字槽。剩下的差距集中在**解析方言**（`%` 指令、语文学括号、`&&` 绝对组、`\` 修饰符、制表）、**字距（kerning）**、**`%insert`**、**竖排（ColumnLayout）**。

---

## 1. 项目身份

| 项 | 事实 |
|---|---|
| 全名 | JSesh — *JSesh hieroglyphic editor*（"sesh"＝埃及语"书写"，J＝Java） |
| 作者 | **Serge Rosmorduc**（serge.rosmorduc@qenherkhopeshef.org），CNAM 副教授，CÉDRIC EA 4629 / VERTIGO 团队；早年在 Université Paris 8 / IUT de Montreuil，亦在 EPHE 授课；ORCID 0000-0001-5147-2997 |
| 字体 | **Serge J.-P. Thomas**（绝大多数字形）+ Rosmorduc（少量，SIL OFL） |
| 起源 | 1990 年代 TkSesh（Tcl/Tk）→ 2002 重写为 Java（Java 1.2 `Graphics2D` 出现后）→ 2004 首发 |
| 形态 | Java/Swing 桌面应用；**同时是一个 Java 库**（`jsesh.jar`，文档明示可嵌入其它程序） |
| 使用方 | IFAO（2007 年采用）、JARCE、"各种书籍"；TSL（Thot Sign List）页面用它显示字符 |
| 引用 | `CITATION.cff`（CFF 1.1.0，含 ORCID）；Zenodo DOI：7.6.1 → 10.5281/zenodo.7661339；字体目录 7.5.5 → 10.5281/zenodo.5849135 |
| 仓库 | <https://github.com/rosmord/jsesh>，2017-11-17 建（前史在 SourceForge：2.13.7 → 7.2.0），Java，46 MB，topics `egyptology` `hieroglyphs` `wordprocessor` |
| 状态 | 活跃：30 个 open issue；2026-11-15 仍在推 9.3.0 预发布 |
| 官网 | <https://jsesh.qenherkhopeshef.org/>（法/英），新闻页记录了历史与决策 |

### 1.1 版本与下载量（GitHub Releases，`published_at`）

| 版本 | 日期 | 备注 |
|---|---|---|
| 7.2.0 | 2018-05-31 | |
| 7.3.2 | 2019-04-26 | |
| 7.4.2 | 2020-06-09 | |
| 7.5.5 | 2020-11-11 | 字体目录被 Zenodo 收录 |
| 7.6.1 | 2023-02-21 | setup.exe 累计 **20,341** 次下载 |
| 7.9.1 | 2025-09-05 | 大量字形重绘 |
| **7.11** | **2026-04-07** | setup.exe **3,712**、zip 1,314、pkg 1,304（即你安装的版本） |
| 8.0.5 / 8.0.7 | 2026-07-27 / 09-26 | 大重构（FlatLaf、新 API、可编辑拉丁文本、阿拉伯语本地化） |
| 8.0.8 | 2026-10-18 | msi / dmg-intel / dmg-m1 / deb 全平台 |
| 9.1.0 / 9.3.0 | 2026-11-07 / 11-15 | 预发布，"Still alpha"；新增 RES 式连字、`%hkern`/`%vkern` 字距、自动折行、图文混排 |

> 换代节奏很关键：**CHEAV 正在追的是 9.x 的行为**，而 7.11 只是"能跑起来的参照物"。上游 9.x 每隔几周就改布局，追赶策略必须能应对上游漂移。

### 1.2 学术定位里几个可验证的硬事实

- **MdC 的定义来源**：J. Buurman, N. Grimal, M. Hainsworth, J. Hallof, D. van der Plas, *Inventaire des signes hiéroglyphiques en vue de leur saisie informatique*, Paris **1988**（初版 1984）。英文通行说明是 H. van den Berg, *Manuel de Codage* (1997, <http://www.catchpenny.org/codage/>)。JSesh 的 MdC 教程直接引用这份文献。
- **Unicode 侧的证据**：WG2 文档 **N5163**（扩展区字形的来源清单）把 "**JSesh elements (version 7.5.5)**" 列为来源集合之一；Unikemet/UAX #57 里专门有 `kEH_JSesh` 属性（如 `U+13005 kEH_JSesh A5A`）。也就是说，**Unicode 的埃及圣书体扩展区（U+13460–143FF，Unicode 16.0）在字符层面参考了 JSesh 的编码实践**。
- **格式控制符的对应**：U+13430 垂直连接符 ↔ MdC `:`；U+13431 水平连接符 ↔ `*`；U+13437/13438 ↔ `( )`。这解释了为什么 CHEAV 的 `A1*B2:I10` 语义和 Unicode 文本模型能对上。
- **学术合作线**：Polis & Rosmorduc (2013)《Réviser le codage de l'égyptien ancien》, *Document numérique* 16(3), 45–69；TSL 由 ULiège + BBAW 维护，页面交叉引用 "Jsesh U105" 这类码。

---

## 2. 你手上的 7.11 是什么

`D:\JSesh-7.11` 是 **Windows 安装产物**，不是源码树：

```
D:\JSesh-7.11\
├─ JSesh.exe          启动器（64 KB，无版本资源）
├─ SignInfo.exe       字形信息编辑器
├─ unins000.exe       卸载器（Inno Setup）
├─ jre\               ★ 自带 JRE 25.0.2（模块化裁剪：java.base/desktop/xml/sql…）
├─ lib\  (19 个 jar, 见下表)
├─ texts\ (208 个 .gly 文档，含 KV34\ 墓室子目录)
├─ licenses\ (CeCILL V2.1 英/法全文、JHotDraw、LGPL/MPL/CUP/JLex、OALNF)
├─ icons\ (5)
├─ LICENSE.txt        "This software is governed by the CeCILL license"（CeCILL v2.1）
├─ FONT-LICENSE.md    0 字节（空文件！字体条款去官网看）
└─ Readme.html        0 字节
```

### 2.1 jar 清单与职责

| jar | 大小 | 作用 |
|---|---|---|
| `jseshGlyphs-7.11.jar` | 16.1 MB | **6,948 个 SVG 字形** + `list.txt`（6,947 行，`码<TAB>文件`），即 CHEAV `glyfs/` 的来源 |
| `jsesh-7.11.jar` | 1.64 MB | 核心库：**744 条目 / 529 个 class**（model、parser、layout、view、draw、sign DB、export） |
| `jseshAppli-7.11.jar` | 149 KB | 主程序（`Main-Class: jsesh.jhotdraw.JSeshMain`） |
| `jseshSearch` / `jseshLabels` / `signInfoAppli` | 51 / 31 / 111 KB | 检索、文案、字形信息编辑器 |
| `jhotdrawfw-7.11.jar` | 984 KB | JHotDraw 7 应用框架（编辑器画布/工具链，LGPL） |
| `itext-2.1.5` | 1.12 MB | PDF 导出（LGPL/MPL） |
| `bouncycastle` ×2 | 1.75 MB | 加密/证书（签名相关） |
| `jvectclipboard-8.1.0` | 114 KB | 矢量剪贴板（SVG/EMF 到 Office） |
| `cupruntime` / `forms` / `miglayout` / `swing-layout` / `finitestate` / `qenherkhopeshefUtils` | — | CUP 运行时、布局库、状态机、工具库 |
| `junit-4.13.1` | 383 KB | 测试（随发行版意外打包） |

> 构建标识：jar 清单 `Created-By: Maven JAR Plugin`、`Build-Jdk-Spec: 21`；7.11 用 **Maven**，master 已换成 **Gradle（Kotlin DSL）**。

### 2.2 texts：208 个可以当测试语料的真实文献

`texts/*.gly` 是 MdC 文档库（`A_demonstration_of_the_mdc.gly`、`Book of the dead Chapter 17.gly`、`Urk.IV…`、`Stela Louvre C2 - Hor.gly` …），另有 `KV34/`（图特摩斯三世墓室文本）。上游已把这些抽成独立仓库 `rosmord/MDC-texts`，而 `jsesh-js` 的回归语料正是"约 200 个真实文档"。**这套语料对 CHEAV 是现成的兼容性测试集**（注意：文本本身许可不清，`MDC-texts` 作者自述"texts 的许可比较混乱"）。

---

## 3. 源码架构（以 `release-7.11` 源码为准）

### 3.1 模块与体量

`git clone --depth 1 --branch release-7.11` 得到 8,566 个文件 / 47.6 MB，Maven 多模块：

| 模块 | Java 文件 | 行数 | 说明 |
|---|---|---|---|
| `jsesh` | 436 | **57,600** | 核心库（模型/解析/排版/绘制/导出/字形库） |
| `jhotdrawfw` | 300 | 64,353 | 内嵌的 JHotDraw 7（第三方，占全仓 38%） |
| `qenherkhopeshefUtils` | 109 | 8,576 | 作者自用工具库 |
| `jseshAppli` | 73 | 7,882 | Swing 应用 |
| `signInfoAppli` | 27 | 4,179 | 字形信息编辑器 |
| `jseshSearch` | 37 | 2,971 | 检索 |
| `jseshTests` | 10 | 674 | 测试程序 |
| `jseshLabels` | 2 | 58 | 全部菜单/按钮文案（便于翻译） |
| **合计** | **1,054** | **168,257** | 含 JHotDraw |

**CHEAV 真正要对齐的"移植面"** = `jsesh/mdc`（13,565）+ `mdcDisplayer`（11,475）+ `hieroglyphs`（6,578）+ `graphics`（6,557）= **271 文件 / 38,175 行**。

### 3.2 包结构与职责（7.11）

| 包 | 类数 | 职责 |
|---|---|---|
| `jsesh/mdc/model` | 49 | 文档模型：`Cadrat`、`HBox`、`Cartouche`、`Ligature`、`Overwrite`、`Philology`、`SubCadrat`、`ZoneStart`、`ShadingCode`、`Tabbing`、`LineBreak`、`PageBreak`、`HRule`、`Modifier`…（访问者/适配器/操作模式） |
| `jsesh/mdc/utils` | 33 | 分组与规范化：`HorizontalGrouper`、`VerticalGrouper`、`BasicItemListGrouper`、`InnerGroupBuilder`、`ComplexLigatureExtractor`、`MDCNormalizer`、`YODChoice`… |
| `jsesh/mdc/{interfaces,lex,constants,parser,output,unicode,translitteration}` | 22/12/11/… | 接口、词法 token、常量、CUP 解析入口、DOM/MdC 输出、Unicode 转换、转写 |
| `jsesh/mdcDisplayer/layout` | 18 | **排版核心**：`Layout`(接口)、`SimpleLayout`(35 KB)、`LineLayout`、`ColumnLayout`、`QuadrantLayout`、`Zone`、`LigatureManager`、`TopItemLayout` |
| `jsesh/mdcDisplayer/mdcView` | 7 | 视图树 `MDCView`（27 KB）、`ViewBuilder`、`ViewIterator`、`ViewSide`、坐标/缩放代数 |
| `jsesh/mdcDisplayer/draw` | 9 | 绘制：`ViewDrawer`(37 KB)、`SimpleElementDrawer`(21 KB)、`MDCDrawingFacade`、`Shader`、`PictureCache` |
| `jsesh/mdcDisplayer/drawingElements/cartouche` | 7 | 框类绘制器：`NormalCartoucheDrawer`、`SerekhDrawer`、`HwtDrawer`、`EnclosureDrawer`、`CartoucheDrawerHelper` |
| `jsesh/mdcDisplayer/preferences` | 6 | `DrawingSpecification`、`DrawingSpecificationsImplementation`(25 KB，几何常量)、`CartoucheSizeHelper`、`PageLayout` |
| `jsesh/hieroglyphs/data` | 18 | 字形数据库：`ManuelDeCodage`、`SignDescription*`、`PossibilitiesList`、`SignVariant`… |
| `jsesh/hieroglyphs/graphics` | 15 | 字体管理 + **`LigatureZone` / `LigatureZoneBuilder`**、`ShapeChar`、重力枚举 |
| `jsesh/graphics/export/{svg,pdf,emf,eps,html,rtf,macpict,wmf,bitmaps}` | 45 | 9 种导出后端（SVG/PDF/EMF/EPS/HTML/RTF/PICT/WMF/位图） |
| `jsesh/swing`, `jsesh/editor`, `jsesh/newEdit` | 59/56/7 | Swing UI、编辑器动作/命令、旧编辑器 |

### 3.3 数据流（与 CHEAV 的管线一一对应）

```
MdC 文本
  │ JLex 词法（src/jlex/MDCLexAux.l，428 条规则；MDCLex.java 只做空白与包装）
  ▼ token: HIEROGLYPH / BPAR / EPAR / COLON / STAR / AMP / …
CUP LALR 语法（src/jcup/MDCParse.y，575 行）
  ▼ 抽象模型（mdc/model，49 类）
MDCBuilder / MDCParserModelGenerator
  ▼ 视图树（mdcView/MDCView：x/y/w/h/scale/子视图，y 向下）
Layout（SimpleLayout + QuadrantLayout + LineLayout/ColumnLayout + Zone）
  ▼ 绘制（ViewDrawer → Java2D / SVG / PDF / RTF…）
```

对照 CHEAV：`parseInput` ≈ lexer+parser，`{type:"vrg",layers}` ≈ Cadrat/HBox，`MDC.Cadrat.layoutLine` ≈ QuadratLayout，`mdcView` ≈ MDCView，`mdcEnclosure` ≈ cartouche drawers。**结构是对得上的**，这点 CHEAV 做得不错。

### 3.4 关键算法（源码级，可直接对照 CHEAV）

**(a) 四开组 `QuadrantLayout.layout()`（7.11：235 行，master 改名 `QuadratLayout`）**

1. 方向决定两个开关：横排 `honourMaxHeight=true, honourMaxWidth=false`；竖排反之；`embedded`（子 cadrat，如方括号组）两者都为 false；
2. 先按 `maxCadratWidth` 缩放太宽的 HBox；`wide` 的再 `scaleToWidth`；
3. 高度 = Σ 行高 + `(n−1) × smallSkip`；横排且不足 `maxCadratHeight` 时**补到 18 单位**；
4. 宽度 = 子视图最大宽（竖排/非嵌入时补到 `maxCadratWidth`）；
5. 多行 `distributeFromTopToBottom()`，单行 `centerSigns ? 垂直居中 : 贴底`；
6. 每个 HBox 补到 cadrat 宽；单元素水平居中，多元素 `distributeHorizontally + 贴底`；
7. 高度超限 → `reScale(maxCadratHeight / h)`（**只缩不放**）。

> CHEAV 的 `mdcCadrat.js`（622 行）与 `mdcVrg.js`（338 行）复刻的就是这套流程；`MAX_CADRAT_HEIGHT=1`、`MAX_CADRAT_WIDTH=22/18`、`SMALL_SKIP=2/18` 与上游逐字对应。

**(b) 连字槽推导 `LigatureZoneBuilder`（230 行，Tier 2）**

- 三个槽：zone0＝左（gravity `END`）、zone1＝右（`START`+`TOP`）、zone2＝下（`VERTICAL BOTTOM`）；
- 用**二分法**沿对角线找"不与字形墨迹相交"的最大位置（`findBestZonePosition`，收敛阈值 0.01，MARGIN=1，MAXHEIGHT=18）；
- 失败时降级到更小的框，再失败该槽为 `null`；
- 结果就是 CHEAV `js/database/ngZones.js`（6,878 个字形）的离线预生成内容，`js/ui/glyphs.js` 在运行期按同一算法补算。

**(c) 连字的宿主规则 `Layout.visitLigature`（master 799–880 行）**

- 若 `hieroglyphsDrawer.getPositions(codes)` 有显式坐标（Tksesh 预定义连字）→ 直接按绝对坐标摆；
- 2 个符号：取更高者为主字；第 2 个比第 1 个高 0.8 倍以上 → 小字进 zone0（左侧），否则进 zone2（下），zone2 缺失再退 zone1；
- 3 个符号：**中间符号**为主字，前→zone0、后→zone1；
- 最后 `fitToSubViews(true)`。

> CHEAV 的 `&` 改写（`t&G43&t` → `{X1&G43&X1}`）与这套规则一致，已在实测中验证。

**(d) 行/列 `LineLayout` / `ColumnLayout`**

- 行：`lineSkip=6`、`smallSkip=2`，支持两端对齐（`justifyWidthTo`）、页宽折行；
- 列（竖排）：每个 top item 在 `TextOrientation.VERTICAL` 下排版；`Zone` 累积当前列（`add`/`computeNewSizeWith`/`moveCurrentPoint`），遇 `LineBreak` → `flushZone()` 并把 `zoneStart.x += zone.width + columnSkip(10)`；文档区面积累积 `documentArea`；RTL 在**绘制期镜像**（`layoutToDrawing`）。
- master 还加了 `TextRun`（整行拉丁文本作为一个 run）与 `TopLevelKerning`。

**(e) 几何常量（`GeometrySpecification.DEFAULT`，master 106–133 行；7.11 在 `DrawingSpecificationsImplementation`）**

| 常量 | 值（1 单位 = 1/18 em） | CHEAV 对应 |
|---|---|---|
| `maxCadratHeight` / `maxCadratWidth` | 18 / 22 | `MAX_CADRAT_HEIGHT=1`、`MAX_CADRAT_WIDTH=22/18` ✅ |
| `smallSkip` | 2 | `SMALL_SKIP=2/18` ✅ |
| `lineSkip` / `columnSkip` | 6 / 10 | `lineSkip:6/18` ✅ / 竖排未实现 ✗ |
| `tabUnitWidth` | 18/200 = 0.09 em | `tabUnitWidth:18/200` ✅ |
| `leftMargin` / `topMargin` / `textWidth` | 6 / 5 / 538 | 6/18、5/18、538/18 ✅ |
| `cartoucheLineWidth` / `cartoucheLoopLength` / `cartoucheMargin` | 1 / 10 / 2 | `mdcEnclosure` 逐项一致 ✅ |
| `serekhDoorSize` / `bastionDepth` / `bastionLength` / `hwtSmallMargin` / `hwtSquareSize` | 20 / 3 / 4 / 3 / 10 | 前四项 ✅（`hwtSquareSize` 未用） |
| `fineLineWidth` / `wideLineWidth` | 0.5 / 3 | `FINE_WIDTH=0.5/18` ✅ |
| `largeSignSizeRatio` / `smallSignSizeRatio` | 0.8 / 0.4 | 用于"孤立窄符号拉满列宽"，CHEAV 未含 ✗ |

---

## 4. MdC 方言全貌（这是 CHEAV 最大的缺口）

JSesh 7.11 的词法有 **428 条规则**（`MDCLexAux.l`），语法 **575 行**（`MDCParse.y`）。它接受的不只是"码 + `*` + `:` + `-`"，而是一整套带非标准扩展的语言：

| 类别 | 语法 | 语义 |
|---|---|---|
| 符号 | `A1`、`Aa1`、`F35A`、`@x`、`` ` `` | 码/变体/任意码 |
| 分隔 | 空格/`_`（词末）、双空格/`__`（句末）、`-`（组间） | 词界用于检索 |
| 组 | `:` 竖叠、`*` 并置、`(`…`)` 子组、`[`…`]` 子 cadrat、`{名}` 绝对定位/选项 | |
| 连字 | `&`、`&&`/`**`（绝对组）、`^^^`/`^^`（前插）、`&&&`（后插） | 见 §3.4(c) |
| 框类 | `<`…`>`、`<s1`…`s1>`、`<S`/`<F`/`<H`(+b/m/e)、`<0`…`<3" 分栏 | 王名圈/塞拉赫/堡垒框/分栏 |
| 语文学括号 | `[[ ]]` 删除、`[{ }]` 编辑者判衍、`[" "]` 旧读、`[' ']` 书吏增补、`[& &]` 编辑者增补、`[( )]` 小增补、`[? ?]` 存疑 | 7 种 |
| 覆盖 | `#`（符号后）或 `##` | 两符号叠写 |
| 底纹 | `#1`…`#1234`、`-#-`/`#-`/`-#`/`#b`/`#e` 切换 | 四分区斜线 |
| 文本 | `+X…+s`（X=类型）、`|…`（上标）、`"…"`（小字） | 拉丁/转写/上标 |
| 换行/分页 | `!`（可 `=N%` 调间距）、`!!` 分页 | |
| 制表 | `?N` 定位、`%` 制表、`%clear`、`{l…, …}`/`{L…, …}` 横线 | |
| 修饰符 | `\R90`（旋转）、`\2`（缩放）、`\?` 等 | |
| 符号 | `.` 半空、`..` 全空、`/`、`//`、`h/`、`v/`（底纹）、`o`/`O`（红/黑点）、`?`/`??`（缺文） | |
| 颜色 | `$r` 红、`$b` 黑、`$` 切换 | |
| 绝对位置 | `{{x,y,z}}`、`^`/`$` 组合 | |

### 4.1 CHEAV 方言 vs JSesh（实测，2026-11-17）

用 Node 假 DOM 直接跑 CHEAV 的 `MdCRndr.parse()`：

| 输入 | CHEAV 结果 | JSesh 语义 | 判定 |
|---|---|---|---|
| `<-A1->` | `enc{kind:"A", units:[A1]}` | `<` 开框、`-` 作分隔符被容忍 → 同样是王名圈 | ✅ 兼容（写法冗余） |
| `<A1>` | `enc{kind:"A"}` | 王名圈 | ✅ |
| `<s1A1s1>` | `enc{kind:"S"}`（塞拉赫！） | `<s1`…`s1>` 是**新式分栏王名圈**（type s, part 1），且 0.2.0 需写成 `<s1-A1-s1>` 才正确 | ❌ 语义错位 + 输入脆弱 |
| `+good+s` | `text{"ood"}` | 也是 `ood`：`+` 后第一个字母是**文本类型**（`+b`/`+i`…），不是正文 | ✅ 与 JSesh 一致 |
| `<good>` | `enc{kind:"A"}` + `invalid:["ood"]` | 不合法（`good` 不是码） | ⚠️ README 声称"`<文本>` 插入文本"——**实测不成立** |
| `A1!A2` | `invalid` | `!` 换行 | ❌ 不支持 |
| `A1$A2` | `newline` | `$` 是颜色切换，换行是 `!` | ❌ 语义冲突 |
| `A1&&A2` | `lig{A1&A2}` | `&&` 绝对组 | ❌ 语义冲突 |
| `A1\R90` | `mirror:true` + `unsup:"R90"` | 整体旋转 90° | ⚠️ 部分 |
| `[[A1]]` | `invalid` | 删除符号括号 | ❌ 不支持 |
| `?100A1` | `invalid` | 制表定位 | ❌ 不支持 |
| `A1#134` | `shadow:"134"` | 四分区底纹 | ✅ |
| `A1&A2` / `A1-A2` / `A1*B2:I10` | 连字 / 两码 / 两层 | 同 | ✅ |

**结论**：CHEAV 目前实现的不是"JSesh 的 MdC 子集"，而是一个**近似但会静默误读的方言**（`$`、`&&`、`<s1>` 三处最危险：不是报错，而是给出不同含义）。要做到"前端完全复刻 JSesh"，解析层要按 §4 表逐项补齐，并加"不认识就报错"的严格模式。

---

## 5. 7.11 → master 的大重构（对 CHEAV 的直接影响）

| 维度 | 7.11 | master（8.x/9.x） |
|---|---|---|
| 包名 | `jsesh/mdc/model`、`jsesh/mdcDisplayer/{layout,view,draw,preferences}` | `jsesh/model`、`jsesh/render/{layout,view,draw,style,elements,context}`、`jsesh/parser/...` |
| 配置对象 | `DrawingSpecification`（可变）+ `DrawingSpecificationsImplementation` | `JSeshStyle` + `GeometrySpecification`(**record**) + `FontSpecification` + `PaintingSpecifications` |
| 布局入口 | `Layout` 是**接口**（75 行），`SimpleLayout` 实现 | `Layout` 是**具体类**（1,127 行），`SimpleLayout` 已消失 |
| 类名 | `QuadrantLayout`（拼写错误 n） | `QuadratLayout`（已修正） |
| 新增 | — | `KerningPacker`、`TextRun`、`layout/insert/{ShapeMask,InsertionFitter,ViewSilhouette,Kerner}`、`elements/cartouche/CircularEnclosureDrawer`、`context/` |
| 构建 | Maven | Gradle (Kotlin) + JRE 25 |

**证据**：CHEAV 注释写 `jsesh/render/layout/QuadratLayout.java:49-197`、`jsesh/render/view/MDCView.java`、`jsesh/render/style/GeometrySpecification.java`——全是 master 路径；而实测 master 的 `visitCartouche` 在 **433 行**（注释写 404-467）、`visitLigature` 在 **799** 行。**引用的行号已经漂移**。

**行动建议**：在 `js/plugin/*` 的每个文件头写死"上游 commit sha + 文件路径 + 该文件对应的 Java 行数范围"，并写一个 `tools/check-drift.js`：拉取上游对应文件、按 sha 校验摘要，变了就提示"需要复核"。这比记住行号可靠。

---

## 6. 上游已经有 JS 移植：`jsesh-js`（必须正视）

2026-10-24 官方宣布：仓库内新增 TypeScript 版 **`jsesh-js`**，目标是"**像素级**画得和 Java 一样"，官网本身已经用它渲染 MdC。

| 维度 | jsesh-js | CHEAV |
|---|---|---|
| 许可 | **CeCILL-C**（文件级 copyleft） | MIT（当前声明） |
| 版本/发布 | 0.3.0，私有，未上 npm；zip 0.1.0/0.2.0 可从 files.qenherkhopeshef.org 下载 | ud3.0.0-a2d，静态站 |
| 代码量 | 54 个 TS 文件 / **11,244 行**（不含测试） | 手写 JS **11,221 行** |
| 结构 | `@jsesh/core`（parser/model/writer/layout/SVG，无 DOM）+ `@jsesh/glyphs` + `@jsesh/elements`(`<jsesh-text>`) + `@jsesh/editor` + `@jsesh/palette` + `@jsesh/vue` | 一个全局 `MdCRndr` + 9 个 IIFE 模块 + `apply.js` UI |
| 布局 | `render/layout.ts` 约 1,100 行，逐类照 Java；`Math.fround` 复刻 Java float | `mdcCadrat`/`mdcVrg`，DOM + CSS 定位 |
| 字形数据 | Java 导出 JSON（`glyph-index.json` + 每字形 `glyphs/*.json` + `sign-info.json`），约 **38 MB**，git-ignored | JSesh SVG 现场解 jar / 站点目录（不分发），字体兜底 |
| 测试 | **fixtures 即规格**：Java 导出 parse 树 / MdC / view 树，TS 逐视图比对；含 layout/parser/writer/kerning/insert 测试 | 浏览器手工回归页（`regression.html` 13 项 + 254 个探针） |
| 覆盖 | 解析、模型、写回、布局、SVG、字形库、编辑器、调色板；缺 search / PDF / RTF / 分页；**0.2.0 尚无 `%insert` / `%hkern` / `%vkern` / `wrapWidth`** | 解析子集、四开组、行、框类、连字槽、词汇/音素/定符匹配 UI |
| 差异化 | 无中文界面、无词库/音素/定符工作流、38 MB 数据、CeCILL-C、无字体兜底 | 中文 Egyptology 输入法工作流、MIT、轻量、可分模式 |

**判断**：`jsesh-js` 不是"竞品威胁"那么简单——它同时是**最好的 oracle（行为基准）**。CHEAV 若要"完全复刻 JSesh"，最省力的验证路径就是拿它的 fixtures 思路：Java 导出 view 树 → CHEAV 逐视图比对。但无法直接复用其代码（CeCILL-C 与 MIT 不兼容），只能读来校准行为。

> 2026-11-17 实测（官方 0.2.0 zip）：见 [JSESH_JS_TEST.md](JSESH_JS_TEST.md)。41/41 API 导出、24/24 渲染用例、竖排与 RTL 均可用、3 份真实 .gly 整篇渲染无误；但 %insert / %hkern / %vkern 在 0.2.0 的解析器里还不存在（master 已有），wrapWidth 也缺。

其他先例：`macleginn/jsesh-web`（服务端 Clojure 包装，返回 PNG，GPL-3，TSL 在用）、`HieroJax`（Nederhof，GPL-3，客户端 JS 但走 Unicode 编码而非 MdC）、`WikiHiero`（PHP，GPL-2+，服务端出图）。

---

## 7. 许可与合规（最需要立刻处理的事）

| 资产 | 许可 | 依据 |
|---|---|---|
| JSesh **代码**（7.11） | **CeCILL v2.1**（LGPL 兼容） | `LICENSE.txt`、`licenses/Cecill/*`；旧文件头写 LGPL（`licenses/Readme.html` 是陈旧文本） |
| JSesh **代码**（master / jsesh-js） | **CeCILL-C** | `jsesh-js/README.md`、源文件 `SPDX-License-Identifier: CECILL-C` |
| **字体/字形**（Thomas） | 自定义 **jsesh-fonts**：可随 JSesh 分发、可在论文/数据库/网站**用 JSesh 生成**、可改；但**"不允许用于其它圣书体文字处理器，这一点不能改"** | `FONT-LICENSE.md`、<https://jsesh.qenherkhopeshef.org/page/fonts_license> |
| Rosmorduc 自绘字形 | SIL OFL（部分 SVG 内注明） | 同上 |
| `signs_description.xml`（字形元数据） | **CC BY 4.0** | 仓库 README |
| `texts/*.gly` | 不明（作者自述"许可比较混乱"） | `rosmord/MDC-texts` 说明 |
| 第三方库 | iText（LGPL/MPL）、JHotDraw（LGPL/CC-BY）、CUP/JLex（各自 BSD 类）、BouncyCastle | `licenses/librariesused/*` |

**对 CHEAV 的直接影响**（事实陈述，非法务意见）：

1. CHEAV 现在的 [README.md](README.md) 写"本项目为独立实现，未包含 JSesh 的字形素材"，[NOTICE.md](NOTICE.md) 同类表述。但项目自述"大部分源码抄自 JSesh"，且代码里逐行标注 JSesh 的 Java 文件与行号——**这在 CeCILL 系许可下属于衍生作品**。注意两代许可强度不同：**7.11 源码是 CeCILL v2.1（强 copyleft，类似 GPL）**，8.x/9.x 与 jsesh-js 才改为 **CeCILL-C（文件级，类似 LGPL）**。也就是说，按现有"照 Java 逐类移植"的方式，`js/plugin/*` 应按对应上游版本的 CeCILL 声明分发（CeCILL-C 至少要求这些文件保持 CeCILL-C，并保留版权与来源）；把整个仓库继续标成纯 MIT 有实质风险。最小合规动作：文件头写来源与上游许可、`NOTICE.md` 补 "Portions ported from JSesh (CeCILL v2.1 / CeCILL-C)"、仓库 `LICENSE` 说明哪些目录例外。
2. **字体/字形是红线**：Thomas 条款明确禁止"其它圣书体文字处理器"使用其字形。CHEAV "不分发 SVG、让用户读本机 jar"的设计是**正确的规避**；但 `glyfs/` 入库的 17 个补绘图、`dist/rndr-font.js` 内嵌的 NewGardiner（OFL，独立授权）需要分开说明——不能再出现"未包含 JSesh 素材"这种一刀切表述。
3. **`js/lib/paper-core.min.js` 未登记**（MIT），应补进 NOTICE。
4. 若将来直接复用 `jsesh-js` 的代码：CeCILL-C 是**文件级** copyleft，复用哪个文件哪个文件就得 CeCILL-C，与 MIT 主仓混用需要显式隔离与声明。

---

## 8. CHEAV ↔ JSesh 映射与差距

| JSesh（master 路径） | 7.11 路径 | CHEAV | 状态 |
|---|---|---|---|
| `render/layout/QuadratLayout.java` | `mdcDisplayer/layout/QuadrantLayout.java` | `js/plugin/mdcCadrat.js`、`mdcVrg.js` | ✅ 核心流程一致 |
| `render/layout/LineLayout.java` | `mdcDisplayer/layout/LineLayout.java` | `mdcCadrat.renderLine`（部分） | ⚠️ 缺两端对齐/折行边界情形 |
| `render/layout/ColumnLayout.java` | `mdcDisplayer/layout/ColumnLayout.java` | `MdCRndr.renderVertical`（早期版） | ❌ 待重写（见 §10） |
| `render/layout/Zone.java` | `mdcDisplayer/layout/Zone.java` | 无独立模型（DOM 流式堆叠） | ❌ 缺 |
| `render/view/MDCView.java` | `mdcDisplayer/mdcView/MDCView.java` | `js/plugin/mdcView.js` | ✅ 已移植 |
| `render/style/GeometrySpecification.java` | `preferences/DrawingSpecificationsImplementation.java` | 常量散落在 `mdcCadrat`/`mdcEnclosure` | ✅ 值一致，结构散 |
| `render/elements/cartouche/*` | `drawingElements/cartouche/*` | `js/plugin/mdcEnclosure.js` | ✅ A/S/h1/F 四种 |
| `render/draw/ViewDrawer.java` | `mdcDisplayer/draw/ViewDrawer.java` | `mdcCadrat.renderLine`（DOM 版） | ⚠️ 绘制目标不同（DOM vs Graphics2D/SVG） |
| `render/layout/insert/*`、`KerningPacker` | 无 | 无 | ❌ `%insert`、`%hkern`/`%vkern` 未实现 |
| `hieroglyphs/graphics/LigatureZoneBuilder` | 同 | `ngZones.js` + `glyphs.js` 动态推导 | ✅ |
| `hieroglyphs/resources/signs_description.xml` | 同 | `translit.js`、`mainSigns.js`、`vocabulary.js` 的重整 | ✅ 已提取 821 转写 / 179 主字符 |
| `mdc/parser`（CUP）+ `mdc/lex`（JLex） | 同 | `MdCRndr.parseInput` | ⚠️ 方言覆盖不足（§4.1） |
| `mdc/unicode/*` | 同 | `mdcEncoding`（码规范化） | ⚠️ 仅别名，无 MdC↔Unicode 双向 |

**量化**：JSesh 移植面 38,175 行 Java；CHEAV 手写 11,221 行 JS → 约 3.4 : 1 的压缩比，符合 Java→JS 的常规比例。数据面 CHEAV 已备齐（4,575 码 / 6,951 墨迹盒 / 6,878 连字槽 / 4,634 度量）。

---

## 9. 生态与上游动向（决定 CHEAV 的"追赶目标"）

- **Tksesh / Thot Sign List（TSL）**：TSL 由 ULiège + BBAW 维护，页面交叉引用 JSesh 码；TSL 的显示走 `jsesh-web`（服务端渲染 PNG）。
- **MDC-texts**：`rosmord/MDC-texts`（2022-04 建），把 208 个 .gly 文本从软件里剥离出来。
- **Unicode**：Ext-A（U+13460–143FF，16.0，约 3,995 码位）；格式控制符 U+13430–1345F（12.0 引入、15.0 扩到 38 个）；Unikemet `kEH_JSesh`。
- **9.x 的新特性**（正在改布局，CHEAV 要留意）：RES 式连字、`%hkern`/`%vkern` 字距、自动折行、图文混排（text runs）。
- **作者本人的方法学**（2026-11-15 新闻）：`jsesh-js` 是"让 Claude 一天写出来的 TypeScript 移植"，**保持 Java 结构、feature-for-feature**。这等于上游给 CHEAV 的路线做了背书：**照结构移植 + fixtures 比对**是可行且已被验证的路径。

---

## 10. 对 CHEAV 五条目标的直接建议

**① 灵感来源 / 抄自 JSesh → 建立"可追溯的移植台账"**
- 每个 `js/plugin/*`、`js/database/*` 文件头统一写：`上游 repo@sha · Java 文件路径 · 对应行范围 · 移植日期`；
- 新增 `tools/upstream-drift.js`：按 sha 拉取对应 Java 文件并比对内容哈希，漂移即报警；
- 把 `PROJECT_STRUCTURE.md` §11 里"注释描述的静态表模型"之类的过期说明一起清掉。

**② 未完成 + 模块化是手段 → 把"单文件"做成构建产物**
- 现在的 `tools/build-rndr.js` 已经在拼 `dist/rndr.js`（12 个源文件 → 533 KB），这正是 `jsesh.js` bundle 的同类物。建议把它提升为**唯一发布形态**：`npm run build:single` → `MdCRndr.min.js`（含 CSS、可选内嵌字体）+ `.d.ts` 草案；
- 开发期保持 9 个模块（好读、好测），发布期必须产物化，避免"源码 9 个文件、用户拿到 1 个文件"两条路径漂移；
- 目标形态可以对齐 `<jsesh-text>` 的思路：`<mdc-text>A1-N35</mdc-text>` + `MdCRndr.renderText(el, mdc)` 双入口，MathJax 式"引一行脚本即可"。

**③ 二期已完成自由连字/横排/王名框，竖排待做 → 照 ColumnLayout/Zone 重写，而不是打补丁**
- 必读三件套（master）：`render/layout/ColumnLayout.java`（316 行）、`render/layout/Zone.java`、`render/layout/LineLayout.java`，以及 `QuadratLayout` 里方向开关的四组合（横/竖 × 主字高/宽 × 嵌入与否）；
- 关键语义：**列 = zone**；`LineBreak` 是"提列 + 换列"（`zoneStart.x += zone.width + columnSkip(10/18em)`）；不足一列宽时 `honourMaxWidth` 把字补满；RTL 只在绘制期镜像；
- CHEAV 现有 `renderVertical/renderHRG` 是"层内换轴"的近似，建议按 `Zone` 重写，并复用 `mdcCadrat` 的度量；
- 竖排落地后，`index.html` 的 `ModeVertical` 才解除 `disabled`。

**④ 两种渲染模式、当前做 SVG、目标完全复刻 → 先修方言，再谈像素**
- 优先级：解析层方言（§4）> 排版边界（jsesh-js 已暴露的 6 种样式：default / RTL / columns / columns-RTL / centered / justified）> 绘制细节；
- 用 **fixtures 而非截图**验收：让 JSesh 导出 view 树（`LayoutExporter` 思路：每个 view 的 x/y/w/h/scale），CHEAV 输出同构 JSON 比对，差异能定位到具体视图；
- 语料用 `texts/*.gly` 里的 200 个真实文献（注意版权，仅本地测试用）；
- 明确"不支持"清单（search/PDF/RTF/分页/`%insert`/kerning 初期），避免"看起来能跑"的假象。

**⑤ 最终目标是单文件实时渲染（类 MathJax）→ 定位要重新想清楚**
- 上游 `jsesh-js` 已经占据"完全复刻 + Web Component + 单文件 bundle"这个生态位，且是 CeCILL-C、非 npm、38 MB 数据；
- CHEAV 的差异化机会在：**中文界面与 Egyptology 输入法工作流**（词库/音素/定符三路匹配、双语释义、Gardiner 检索）、**MIT 许可**、**轻量**（5 MB 级 vs 38 MB）、**字体兜底**（无 SVG 也能出字）、**不加构建**；
- 若求"最像 JSesh"，最省力路线是"以 jsesh-js 为 oracle 校准 CHEAV 的布局"，而不是重写 parser 到 100%——先覆盖埃及学实际会用到的 90% 语法（`!` 换行、`+…+s` 文本、`&`/`^` 连字、7 类括号、`%` 制表、`\` 修饰符、`#` 底纹/覆盖的歧义），剩下的显式报错。

---

## 11. 关键索引

**本地**
- 安装版：`D:\JSesh-7.11\`（`lib/jsesh-7.11.jar`、`lib/jseshGlyphs-7.11.jar`、`texts/`、`licenses/`）
- 7.11 源码（本次调查克隆）：`E:\QKMansion\CSX10\w\_jsesh-src-7.11`（tag `release-7.11`，commit `68c4c77`）
- master 抽取件：`E:\QKMansion\CSX10\w\_jsesh-master-render`（`jsesh/render` 82 个文件）、`E:\QKMansion\CSX10\w\_jsesh-master-js`（`jsesh-js` + `jseshJsExport`）

**7.11 源码里的"必读文件"**
- 语法/词法：`jsesh/src/jcup/MDCParse.y`（575 行）、`jsesh/src/jlex/MDCLexAux.l`（428 行）
- 排版：`mdcDisplayer/layout/QuadrantLayout.java`、`SimpleLayout.java`(35 KB)、`LineLayout.java`、`ColumnLayout.java`、`Zone.java`
- 视图：`mdcDisplayer/mdcView/MDCView.java`(27 KB)
- 框类：`mdcDisplayer/drawingElements/cartouche/{NormalCartoucheDrawer,SerekhDrawer,HwtDrawer,EnclosureDrawer}.java`
- 常量：`mdcDisplayer/preferences/DrawingSpecificationsImplementation.java`（229-245 行）
- 连字槽：`hieroglyphs/graphics/LigatureZoneBuilder.java`（230 行）
- 字形库：`jsesh/src/main/resources/jsesh/hieroglyphs/resources/signs_description.xml`（1.77 MB / 6,799 个 sign）

**上游链接**
- 仓库 <https://github.com/rosmord/jsesh> · 官网 <https://jsesh.qenherkhopeshef.org/>
- 7.11 release <https://github.com/rosmord/jsesh/releases/tag/release-7.11>
- 8.0.8 说明 <https://jsesh.qenherkhopeshef.org/releases/release_8_0_8>
- 字体许可 <https://jsesh.qenherkhopeshef.org/page/fonts_license> · `FONT-LICENSE.md`（仓库内）
- jsesh-js 说明 <https://github.com/rosmord/jsesh/tree/master/jsesh-js> · 0.2.0 zip <https://files.qenherkhopeshef.org/jsesh-web/>
- MdC 标准（van den Berg 1997） <http://www.catchpenny.org/codage/>
- Unicode：Ext-A <https://codepoints.net/egyptian_hieroglyphs_extended-a> · 格式控制符 <http://unicode.org/charts/nameslist/n_13430.html> · Unikemet/UAX #57 <https://www.unicode.org/reports/tr57/>
- WG2 N5163（扩展区来源清单，含 JSesh 7.5.5） <http://unicode.org/wg2/docs/n5163-hieroglyphs.pdf>
- Zenodo：7.6.1 <https://doi.org/10.5281/zenodo.7661339> · 字体目录 7.5.5 <https://doi.org/10.5281/zenodo.5849135>
- MDC-texts <https://github.com/rosmord/MDC-texts> · TSL <https://thotsignlist.org/>

---

## 12. 一句话

JSesh 是一个**由埃及学家亲自写、被学界当标准用、还在快速换代**的 Java 排版系统；它的价值不在"能画字"，而在那套被 20 年打磨出来的 **MdC 语义 + 四开组/行/列几何 + 连字槽推导**。CHEAV 已经把其中最硬的部分（四开组、行、框类、连字槽）搬了过来，下一步不是继续凭空造，而是**建立与上游的可追溯映射、补齐方言、按 Zone 重写竖排、用 fixtures 验收**——同时把许可声明改成与"移植自 CeCILL 项目"相符的版本。
