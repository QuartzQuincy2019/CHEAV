# JSesh 排版机制参考（CHEAV 移植用）

> 源码根：`C:\Users\lenovo\Downloads\Compressed\jsesh-master\jsesh-master\jsesh\src\main\java\jsesh\`
> 单位：1 单位 = 1/18 em（`GeometrySpecification.DEFAULT`，`maxCadratHeight = 18`）
> 本文记录**已核对过源码**的规则，标注行号，便于随时复查。

---

## 一、对象模型（语法 → 视图）

```
topitem    ::= cadrat
cadrat     ::= verticalStack
verticalStack ::= horizontalList (COLON horizontalList)*   // ':' 分层
horizontalList ::= element (STAR element)*                 // '*' 并置
element    ::= hieroglyph | cartouche | ...                // '<...>' 是 element
```

- `-` 与空格等价（`MdcLexicon.java:60、113`：`ESPSO = repeat(union(TRUESPACE,'-'))`）。
- **王名圈是 Cadrat 的一个 element**，不是独立顶层项 —— 因此 `QuadratLayout` 的
  `reScale` 作用于整棵框子树（框与其内容一起缩）。
- `HBox.buildHorizontalListElement:126-140`：单子元素直接返回；**多子元素时每个各包一个
  `Cadrat`，装进 `BasicItemList` 返回 `new SubCadrat(list)`**。
- `Cadrat.isEmbedded():180-192`：沿 parent 链遇到 `SubCadrat` 即为 embedded。

---

## 二、尺寸：三套并行机制

### 1. 整组缩到行高（比例缩放）

`QuadratLayout.java:194-195`

```java
if (honourMaxHeight && h > maxCadratHeight)
    currentView.reScale(maxCadratHeight / h);
```

- `honourMaxHeight = !vertical && !embedded`
- `reScale` 只改比例与宽高，**不移动子视图坐标**（`MDCView.java:695-703`）
- 王名圈：自然高 `1em + 2×3/18 = 1.333em` → ×0.75 = **1em**；框内内容 1em → **0.75em**；
  `dSmall` 与线宽同步 ×0.75。实测 `tw.png`、`A1_and_tw.png`：框 0.975em、内容 0.712em。

### 2. 整组缩到列宽

`QuadratLayout.java:99-105`

```java
boolean wide = c.isWide();
if (honourMaxWidth || (getNumberOfSubviews() != 1 && !wide))
    for each subview: scaleForMaxWidth(maxWidth);      // maxWidth = 22/18em
```

`honourMaxWidth = vertical && !embedded`。**单行普通组不走这条**。

### 3. `\l` 宽符号铺满

`QuadratLayout.java:109-119`

```java
if (wide) {
    float maxw = honourMaxWidth ? maxWidth : getMaximalWidthOfSubView();
    for (k) if (c.getHBox(k).isWide()) currentView.getSubView(k).scaleToWidth(maxw);
}
```

- `Cadrat.isWide()` = 任一行 `HBox.isWide()`；`HBox.isWide()` = 行内**只有一个 Hieroglyph**
  且 `Hieroglyph.isWide()`；`Hieroglyph.isWide()` = 修饰符 `\l`（`Hieroglyph.java:239-243`）。
- `scaleToWidth(w)`：只改 `xScale = w/internalWidth` 与 `width`（`MDCView.java:817-825`）。

### 4. 单符号拉满行高

`Layout.java:545-582`（`visitHBox`）

```java
float h = currentView.getMaximalHeightOfSubView();          // 行高
if (group.containsOnlyOneSign() &&
    subView.getHeight() > largeSignSizeRatio() * getHeightOfA1())   // 0.8
    shouldEnlarge = true;
if (shouldEnlarge && hiero.getRelativeSize() == 100)
    subView.reScale(h / subView.getHeight());
new ViewVerticalEnlarger().enlarge(subView, h);
```

判据是 **`> 0.8 × A1 高`**，且必须“该行只有一个符号”，显式 `\s` 缩放时跳过。

### 5. 纵向拉伸（非等比）

`Layout.java:654-663` + `ViewVerticalEnlarger:957-1000`

```java
boolean fixed = (h.getRelativeSize() != 100 || inAbsoluteGroup
                 || h.isAloneInQuadrat() || h.getAngle() != 0);
if (!fixed) currentView.setYStretchable(true);
...
if (view.isYStretchable()) view.setHeight(height);   // 只改高，不改宽
```

---

## 三、四开组的排布

`QuadratLayout.layout` 实际顺序：

```
① scaleForMaxWidth（多行 / 竖排）
② wide 行 → scaleToWidth；否则宽 = 本行最大宽
③ fitLoneSignsToColumnWidth（单行分支）
④ h = Σ行高 + (n−1)×smallSkip；h < 1em → 1em
⑤ w = max行宽；（竖排且非 embedded 且 w < 22/18）→ 22/18
⑥ 多行 → distributeFromTopToBottom；单行 → centerSigns ? centerSubViewsVertically : stickSubViewsTo(BOTTOM)
⑦ h > 1em → reScale(1/h)
```

- 行间/元素间一律 `smallSkip`，**先计入自然高度，再由 1em 下限补齐**（`:136-139`）。
- 行内：`if (sub.getWidth() < w) sub.setWidth(w)`，单元素 `centerSubViewHorizontally()`，
  多元素 `distributeHorizontally()` + `stickSubViewsTo(BOTTOM)`（`:174-193`）。
- 宽度补齐同样受 `!embedded` 约束（`:126-127`）。

---

## 四、间距常量

| 名称 | 值 | 用在哪 |
|---|---|---|
| `smallSkip` | 2/18 em | 四开组内并排与堆叠（`Layout:587/529/537`）、行内组间（`LineLayout:389`）、文本 run 间（`LineLayout:128`）、框内元素间（`Layout:361-365`） |
| `lineSkip` | 6/18 em | 换行位移 `zone.h + zone.minY + lineSkip`（`LineLayout:300/334`）、竖排列推进（`ColumnLayout:103/255`） |
| `innerMargin` | 计算值 | 仅竖排王名圈：`(w − subW)/2` 水平居中（`Layout:444-447`） |

**框内外同值**，不存在“框内更紧”的规则。

---

## 五、王名圈（Cartouche）

### 几何 `Layout.visitCartouche:404-466`

```java
smallDim = 2 * computeCartoucheSecondaryLength(style, type);   // 2 × 3/18 = 6/18
dSmall   = computeCartoucheSecondaryLength(style, type);       // 3/18
longDim  = partLength(startPart);
dLong    = longDim;
longDim += partLength(endPart);
// 横排
width  = subView.w + longDim;
height = max(subView.h + smallDim, maxCadratHeight + smallDim);   // ≥ 1.333em
subView.position = (dLong, dSmall);
setDeltaBaseY(-dSmall);
// 竖排
height = subView.h + longDim;
width  = subView.w < maxCadratWidth + smallDim ? maxCadratWidth + smallDim : subView.w + smallDim;
innerMargin = (width - subView.w) / 2;
subView.position = (innerMargin, dLong);
setDeltaBaseX(-dSmall);
```

**此函数内没有任何缩放**；缩放来自外层 Cadrat（第二节第 1 条）。

### 端头长度 `CartoucheSizeHelper.computeCartouchePartLength`

| 类型 | FIRST | SECOND | 其他 |
|---|---|---|---|
| CARTOUCHE `c` | 10/18 | 11/18 | — |
| SEREKH `s` | 4/18 | 24/18 | — |
| HWT `h` | 4/18 | 14/18 | — |
| CASTLE `f` | 7/18 | — | — |
| CIRCULAR `g` | 10/18 | 10/18 | — |

`computeCartoucheSecondaryLength = cartoucheMargin(2) + cartoucheLineWidth(1) = 3/18`（CASTLE 再加 `bastionDepth 3`）。

### 绘制 `NormalCartoucheDrawer`

- 横排：主干两条直线 `p1→p3`、`p2→p4`；端环三次贝塞尔，`loopSkip = cartoucheLoopLength/3 = 10/54em`；
  `SECOND` 端头额外画竖线 `x = dx*1.5`（左）/ `x = W − dx*1.5`（右）。
- 竖排：结构相同但 **`loopSkip = cartoucheLineWidth/3 = 1/54em`**（JSesh 自身不一致，照抄）。

### 语法 `MdcLexicon.java:136-149`

| 写法 | 含义 |
|---|---|
| `<` | 普通王名圈（OLD_CARTOUCHE_PLAIN） |
| `<s` `<s3` `<h` `<f` `<g` `<1` `<2` `<3` | 指定类型 / 起始端部件 |
| `>` | 默认结束（endPart = 2） |
| `s>` `s3>` `h>` `f>` `g>` `1>` `2>` `3>` | 指定结束端部件 |

### 框内

`preLayoutHook:179-186`：`if (view.getModel() instanceof Cartouche) centerSigns = true;`
`visitCartouche` 结尾复位为 `smallSignCentered()`（`:463-464`）。

---

## 六、行与列

- 行（`Zone`）初值高度 = `maxCadratHeight`（`LineLayout:203/311/344`）→ 天生 ≥ 1em。
- 换行位移 `zone.getHeight() + zone.getMinY() + lineSkip`（`:300`）；`minY` 可为负
  （王名圈比行高时，`Layout` 注释 `:224-229` 明确说明“宁可把行区撑大也不切框”）。
- 两端对齐 `Zone.justifyWidthTo:221-250`：1 个非空单元 → 居中；`space > 0.5×minimalWidth` → 整体居中；
  否则均分。最后一个 zone 只有宽度 ≥ 0.75×目标宽才拉伸（`:142-162`）。
- Tab 停位 `stopPos × tabUnitWidth(18/200 = 0.09em)`（`:365-367`）。
- 竖排：`ColumnLayout` 列宽 = `maxCadratWidth`，列推进 `height + lineSkip`。

---

## 七、CHEAV 覆盖情况

| 机制 | 状态 |
|---|---|
| 整组缩到行高 / 列宽 | ✅ |
| `\l` 宽符号铺满 | ✅ |
| 行内贴底 / 居中、1em 下限 | ✅ |
| 框内 `centerSigns` | ✅ |
| 王名圈包在 Cadrat 内整体缩放 | ✅（`mdcCadrat.js` 按格位 vs 自然尺寸比值缩放） |
| 单符号拉满行高（0.8×A1） | ❌ |
| 纵向拉伸（`yStretchable`） | ❌ |
| 行距 `lineSkip` + `minY` | ❌ |
| 竖排堆叠间距 = `smallSkip` | ❌ |
| 阴影四格位掩码 `ShadingCode` | ❌ |
| 旋转 `\R<degree>` | ❌ |

---

## 八、框内 vs 框外的 Cadrat 渲染

`QuadratLayout.java:72-87`：

```java
if (currentTextOrientation.isHorizontal()) { honourMaxHeight = true;  honourMaxWidth = false; }
else                                        { honourMaxHeight = false; honourMaxWidth = true;  }
boolean embedded = c.isEmbedded();          // 沿 parent 链找 SubCadrat
if (embedded) { honourMaxHeight = false; honourMaxWidth = false; }
```

**`honourMaxHeight` 只看文字方向，与“是否在框内”无关**；框内 Cadrat 的 `embedded` 也是 false
（Cartouche 不是 SubCadrat）。所以框内内容同样受 1em 下限与 `reScale(1/h)` 约束。

已确认的差异只有两条：

| 项 | 框外 | 框内 |
|---|---|---|
| `centerSigns` | `smallSignCentered()` | **true**（`preLayoutHook:179-185`，`visitCartouche` 末尾复位 `:463-464`） |
| 外层缩放 | 无 | **×0.75**（框自然高 1.333em → 1em，整棵子树同比） |

可疑 / 待查：

1. **`inAbsoluteGroup` 跨视图泄漏**：`preLayoutHook` 置 true，`postLayoutHook` 是空实现
   （`:192-194`），复位只在 `visitAbsoluteGroup` 结束时做。框内放绝对定位组后，同级视图的
   `fixed` 判定（`:654`）可能被污染。
2. **文本 run 路径**：框内混排 `+text+s` 时走 `layoutWithRuns`（`:283-352`），不是
   `visitDefault`。规则：`totalMain = Σ(main) + skip × (units − 1)`，一个 text run 算**一个
   unit**，run 内部字符坐标由 `run.layoutOffset(k, mirrored)` 决定（不参与 skip 均分），
   `maxCross` 取各单元交叉轴最大值。
3. `depth` 是否影响 `isAloneInQuadrat()`。
4. `isAloneInQuadrat()` 定义在 `Hieroglyph`（`Cadrat.java` 中无此方法）。

---

## 九、实现约定（踩过的坑）

移植 JSesh 视图模型时，以下四条是硬性约定，违反其中任意一条都会出现「尺寸对不上」类问题：

### 1. 一处缩放

**缩放只能发生在一个地方**，且必须同时作用于「量」与「画」。

- JSesh 的做法：`MDCView.reScale(s)` 把 `s` 乘进 `xScale/yScale` 与 `width/height`，
  绘制时再用 `computeAffineTransform()`（`:263-287`，先 rotate 后 scale、不平移）作用于整棵子树。
  **量到的就是缩过的**，天然一致。
- CHEAV 的做法：`renderEnclosureJseth` 里 `ESC = 1/max(g.h,1)`，同时乘进
  ①容器 inline 宽高 ②各单元格 `left/top/width/height` ③子渲染字号。
  **禁止**再对容器套 `transform: scale(ESC)`——那是 `ESC²`。

### 2. 量画同源

行内排版用的度量必须与绘制用的尺寸出自同一个函数：

- `mdcVrg.js` 的 `enc` 分支 → `E.geometry(...)` 的结果再乘 `ESC`；
- 曾经的错误：度量写死 `{w:1.34,h:1.34}`，或度量用自然值而绘制用缩放值。

### 3. 保持宽高比

把内容塞进单元格时，禁止 `width:100%; height:100%`（各向异性拉伸会破坏四开组行距，
表现为「面包压在鸟背上」）。正确做法：

```js
const r = Math.min(cellW / naturalW, cellH / naturalH);
inner.style.transformOrigin = "0 100%";
inner.style.transform = "scale(" + r + ")";
```

### 4. 布局完成后不得再改动部件

四开组把各行摆好后，后续逻辑（如旧的「单符号 em 盒居中」）**不得**再用
`querySelector(".hie")` 取第一个字形去重新定位——组单元里可能有多个 `.hie`。
判据：`cell.querySelector(".vrg") ? null : cell.querySelector(".hie")`。

### 调试纪律

无头浏览器截图可能因缓存/实例问题产出与代码不对应的画面（曾连续多轮得到逐字节相同的 PNG）。
定位尺寸类问题时，**以真实浏览器控制台读数为准**：

```js
const e = document.querySelector(".enc-js");
const r = e.getBoundingClientRect();
({ h: r.height, w: r.width, inline: [e.style.width, e.style.height],
   tf: e.style.transform, cells: e.querySelectorAll(".enc-cell").length,
   parts: e.querySelectorAll(".vrg-part").length });
```

对比 `r.height` 与 `inline` 高度即可判断是否被二次缩放；`cells/parts` 计数可判断走的是哪条渲染路径。

---

## 十、待查



- `fitLoneSignsToColumnWidth(c, width)` 的判定条件。
- `Cadrat.getHBox()` / `HBox.isWide()` 在王名圈内部的行为。
- `TextRun.layoutRuns` 的文本 run 间距细节。
- `Layout.visitCadrat:389-393` 之外，是否还有对 `Cartouche` 的特殊处理（如 `deltaBase` 的绘制期使用）。

## 十一、四开组排版：MDCView 的尺寸代数（2026-11-15 调查）

这一节记录的是「为什么只做 HBox/Cadrat/Line 三层不够」。真正的排版是围绕
`MDCView` 的一组尺寸操作展开的，三层只是**调用顺序**。

### 11.1 三种"改尺寸"完全不是一回事

| 方法 | 位置 | 做了什么 | 效果 |
|---|---|---|---|
| `setWidth(w)` / `setHeight(h)` | `MDCView:920 / :874` | 只改外部 `width`/`height` | `internalWidth = width/xScale` 随之变大 → `distributeHorizontally` 会把子视图摊开到更宽的盒子，但**子视图本身不变形** |
| `scaleToWidth(w)` | `MDCView:817` | `xScale = w/internalWidth; width = w` | `internalWidth` 不变，**横向拉伸绘制**（纵向不动） |
| `reScale(sc)` | `MDCView:695` | `xScale*=sc; yScale*=sc; width*=sc; height*=sc` | 等比缩放（内容与盒子一起） |
| `scaleForMaxWidth(maxW)` | `MDCView:757` | `if (width > maxW) reScale(maxW/width)` | 只缩不放的等比 |
| `scaleToFitDimensions(w,h)` | `MDCView:796` | `xScale=yScale=min(h/height, w/width)` | 等比塞进指定框（王名圈里用） |

关键恒等式（`MDCView:478/489`）：

```
internalWidth  = width  / xScale
internalHeight = height / yScale
```

`stickSubViewsTo(BOTTOM)`（`:974`）用的是 **internalHeight**，
`distributeHorizontally`（`:319`）用的是 **internalWidth**。

所以：**"把盒子加大"和"把内容放大"是两条不同的路径**，我们的 places 里
一个 `w/h` 同时兼作盒子和绘制尺寸，这是目前最大的结构性偏差（见 11.6）。

### 11.2 行的两条路径

```
Layout.visitDefault:523-543   通用容器（含 BasicItemList）
    width = Σ子宽 + smallSkip(n-1)；height = max 子高；
    setWidth / setHeight / distributeHorizontally

Layout.visitHBox:545-598      HBox（一行）
    h = getMaximalHeightOfSubView()
    for each subView:
        ① 单符号组 且 height > largeSignSizeRatio×heightOfA1
             → reScale(h / height)        拉到整行高
        ② ViewVerticalEnlarger().enlarge(subView, h)   只把格子拔高
    setHeight(h); setWidth(Σw + smallSkip(n-1))
    ※ 注释明确：位置不由行负责，而由 Cadrat 负责
```

两者不可混用——我们此前把它们合并成一个 `layoutRow`，这是错的。

### 11.3 ViewVerticalEnlarger 与 yStretchable

```
QuadratLayout:52      currentView.setYStretchable(true)      // 每个 Cadrat 视图都可纵向拉伸
Layout.visitHieroglyph:654-659
    fixed = relativeSize≠100 || inAbsoluteGroup || isAloneInQuadrat || angle≠0
    if (!fixed) setYStretchable(true)                        // 单个字形是否可拉伸

ViewVerticalEnlarger  (Layout.java:957-1000)
    visitHieroglyph:  if (view.isYStretchable()) view.setHeight(height)
    visitSubCadrat :  遍历 BasicItemList 里 isYStretchable() 的子视图
                      setHeight(height) → distributeFromTopToBottom() → fitToSubViews(false)
```

因为 `setHeight` 不动 `yScale`，这种拔高**只改变格子与相对位置，不改变字形尺寸**。

### 11.4 行内多元素 → SubCadrat → BasicItemList

```
HBox.buildHorizontalListElement:126-140
    单元素  → 直接 deepCopy 该元素
    多元素  → 每个元素各包一个 Cadrat，装进 BasicItemList，再包成 SubCadrat

Layout.visitSubCadrat:841-845
    setWidth(Σ子宽); setHeight(max 子高); distributeHorizontally()

Layout.visitBasicItemList:354-368
    有文本 run → layoutWithRuns；否则横排 → visitDefault（Σ宽 + skip）
```

所以 `t*t*t` 的视图树是
`HBox → SubCadrat → BasicItemList → [Cadrat(t), Cadrat(t), Cadrat(t)]`，
而 `z` 那一行是 `HBox → Cadrat(z)`（单元素不包）。
**多元素行里的 Cadrat 位于 SubCadrat 内 → isEmbedded()=true。**

### 11.5 QuadratLayout 的完整顺序（49-197）

```
1  setYStretchable(true); setXStretchable(true)
2  honourMaxHeight = 横排; honourMaxWidth = 竖排
3  embedded = c.isEmbedded();  if (embedded) 两者都 false
4  wide = c.isWide()                      // = 任一 HBox.isWide()
                                          // HBox.isWide = 单子元素且是 Hieroglyph 且 hiero.isWide
                                          // hiero.isWide = modifiers("l")
5  if (honourMaxWidth || (nSubviews != 1 && !wide))
       for each row: scaleForMaxWidth(maxCadratWidth = 22 单位 = 22/18 em)
6  if (wide) 对"宽行" scaleToWidth(maxw)，maxw = honourMaxWidth ? maxCadratWidth : 最大行宽
   else      fitLoneSignsToColumnWidth(c, 最大行宽)
7  h = Σ行高 + smallSkip(n-1)；if (honourMaxHeight && h < 1em) h = 1em
8  w = 最大行宽；if (honourMaxWidth && !embedded && w < 22/18) w = 22/18
9  n>1 → distributeFromTopToBottom()；否则 centerSigns ? centerSubViewsVertically : stickSubViewsTo(BOTTOM)
10 for each row: if (row.width < w) row.setWidth(w);
                row 单子视图 ? centerSubViewHorizontally : (distributeHorizontally + stickSubViewsTo(BOTTOM))
11 if (honourMaxHeight && h > 1em) reScale(1em/h)
```

### 11.6 仍未建模的四件事（按重要性）

1. **盒子尺寸与绘制比例分离**：需要 `cellW/cellH`（布局用）与 `drawW/drawH`（绘制用）
   两套量，对应 `width/height` 与 `xScale/yScale`。现在只有一个 `w/h`，所以
   "只拔高不拉伸"无法表达，`scaleToWidth` 也只能靠改宽度近似。
2. **视图树**：`Cadrat(t)` 作为独立视图参与父级 `distributeHorizontally`，
   而不是把叶子直接摆进行里；嵌套（`A1:(B1*C2)`）时宽高传播路径不同。
3. **`ViewVerticalEnlarger` 对 SubCadrat 的 `distributeFromTopToBottom` 重分布**
   （会把子 Cadrat 在变高的格子里重新摊开）。
4. **`computeScale()`**（`Layout:945` → `hieroglyphsDrawer.scaleFromFontToStyle`）：
   SVG 模式下应为 1，字体模式下与字号换算有关，尚未核对。

已实现（可对照源码检查）：`scaleForMaxWidth`、`scaleToWidth`、`reScale`、
`distributeHorizontally`、`distributeFromTopToBottom`、`stickSubViewsTo(BOTTOM)`、
`centerSubViewHorizontally`、`fitLoneSignsToColumnWidth`、`visitHBox` 的单符号拉满行高、
`maxCadratWidth` 前置收缩、`isWide = l 修饰符`、`embedded → honour*=false`。

## 十二、行层：LineLayout 与 Zone（2026-11-15 调查，第四层）

四开组之上还有一层：一行文字由 `LineLayout`（`TopItemLayout` 的子类）把每个
topitem（cadrat / 文本 run / 换行 / Tab）摆进 `Zone`，再由 `Zone` 负责行内定位与两端对齐。

### 12.1 结构

```
LineLayout  (jsesh/render/layout/LineLayout.java:41)
   ├─ layoutElement(view)     :113   把 topitem 交给 aux 访问器，位置先置 (0,0)
   ├─ layoutTextRun(run,vs)   :124   文本 run 整体入 zone；镜像由 zone 负责
   ├─ endLayout()             :138   收尾：flushZone() + 两端对齐
   └─ allZones: List<Zone>           多 zone（分栏 / 换页 / 制表位）
```

### 12.2 两端对齐（justified）的精确条件

```java
if (options().justified()) {
    double width = max over zones of z.getWidth();      // 最宽 zone
    width -= geometry().leftMargin();
    for (i, z in allZones)
        if (i != allZones.size()-1 || z.getWidth() >= 0.75 * width)   // ← 0.75
            z.justifyWidthTo(geometry().leftMargin(), width);
}
```

- 最后一个 zone 只有在宽度 ≥ 0.75×最宽 zone 时才被拉伸（短末行不拉）；
- 文档尺寸最后再加上 `leftMargin` 与 `topMargin`（`:164-172`）。

### 12.3 与我们实现的对应关系

| JSesh | 我们 | 状态 |
|---|---|---|
| `LineLayout` + `Zone` | `layoutLine()` 直接串接 cadrat | **缺**：没有 zone、没有对齐、没有页边距 |
| `justifyWidthTo` + 0.75 阈值 | 无 | **缺** |
| `layoutTextRun` 整体入 zone | `+…+s` 文本按 run 渲染 | 部分 |
| `LineBreak` / `TabStop`（`LineLayoutAux:292/364`） | `\n` 换行 | 部分 |

### 12.4 调查顺序（下一步）

1. `Zone.java`：`addRun` / `moveCurrentPoint` / `justifyWidthTo` / 行高（`minY`、行距）
2. `LineLayoutAux`（`:279-397`）：`visitLineBreak` / `visitPageBreak` / `visitTabStop` / `visitDefault`
3. 与 `Zone` 相关的 `TextDirection`（右到左时 zone 内镜像、绘制再镜回）

## 十三、Zone 与换行/制表（2026-11-15 调查）

### 13.1 Zone 的数据结构

```
Zone(minWidth, minHeight)              Zone.java:87
   currentPoint : Point2D              // 下一个元素落在哪
   zoneArea     : Rectangle2D          // 累积包围盒（可能 minY 为负）
   views        : List<MDCView>        // 所有视图（供 translateBy）
   units        : List<List<MDCView>>  // 对齐单位：单个 view 或一个文本 run
```

- `add(view)`：`position = currentPoint + view.getDeltaBaseX/Y`，再 `zoneArea.add(bbox)`
  （`Zone:103-112`）。**每个 view 都带 deltaBaseX/Y（基线偏移）**——我们完全没建模。
- `addRun(views, xOffsets)`：一个文本 run 作为**一个对齐单位**加进来（`:120-130`）。
- `moveCurrentPoint(dx, dy)`、`computeNewSizeWith(view)`、`translateBy(zoneStart)`。

### 13.2 两端对齐的真实规则（比"0.75 阈值"多两条）

```java
// Zone.justifyWidthTo(startMargin, width)   :221-250
minimalWidth = Σ unitWidth(unit);
if (minimalWidth < width) {
    space = width - minimalWidth;
    if (nonEmptyUnits.size() == 1)        moveUnitTo(unit, startMargin + space/2);  // 单个单位 → 居中
    else if (space > 0.5 * minimalWidth) centerInWidth(startMargin, width);         // 空隙过半 → 整行居中
    else                                 各单位间隔 = space/(n-1) 均匀铺开
}
```

调用方 `LineLayout.endLayout:138-172` 只对满足「非最后 zone」或「宽度 ≥ 0.75×最宽 zone」的
zone 调用它，最后 `documentArea` 再加 `leftMargin` / `topMargin`。

### 13.3 换行与制表

```java
// LineLayoutAux.visitLineBreak:292-315
verticalSkip = zone.getHeight() + zone.getMinY() + lineSkip;   // = 基线到行底 + 行距
if (b.getSpacing() != 100) verticalSkip *= b.getSpacing()/100; // -!=…% 记法
zone.add(subView); flushZone();
zone = new Zone(0, maxCadratHeight);                            // 新行高度下限 1em
zoneOriginPosition.y += verticalSkip;

// LineLayoutAux.visitTabStop:364-369
pos = tab.getStopPos() * tabUnitWidth;      // tabUnitWidth = 18/200 = 0.09em
zone.getCurrentPoint().x = pos;

// LineLayoutAux.visitDefault:383-394
dx = (subView.getWidth() != 0) ? subView.getWidth() + smallSkip : 0;
zone.add(subView); zone.moveCurrentPoint(dx, 0);
```

要点：**行距是 `lineSkip`(6/18em) 加上"基线到行底"的距离**；`zone.getMinY()` 可能为负
（有符号超出基线以上时），会直接影响下一行的起点。制表位以 `tabUnitWidth` 为单位。

### 13.4 与我们的差距

| JSesh | 我们 | 状态 |
|---|---|---|
| `deltaBaseX/Y`（每个视图的基线偏移） | 无 | **缺**（影响边界情况下的垂直定位） |
| `Zone` 与 `zoneArea`（minY 可负） | 无，按行高 + smallSkip 串接 | **缺** |
| `justifyWidthTo` 三条分支 | 无 | **缺** |
| 末行 0.75 阈值 | 无 | **缺** |
| `LineBreak` 的 `-!…%` 行距倍率 | 无 | **缺** |
| `TabStop`（0.09em 单位） | 无 | **缺** |
| 文本 run 作为单个对齐单位 | `+…+s` 按 run 渲染，但不参与对齐 | 部分 |

### 13.5 下一步

1. `MDCView.getDeltaBase`（基线偏移）的来源与计算；
2. `Zone.translateBy` + `flushZone`（zone 落位、`addTopMargin`）；
3. `TextDirection`（右到左的镜像与 tab 从东侧计算）；
4. 之后才谈 `justifyWidthTo` 的实现（它依赖 1、2 的坐标语义）。

## 十四、deltaBase：视图的基线偏移（2026-11-15 调查）

### 14.1 语义

`MDCView:50-60` 的注释说得很清楚：

> deltaBaseX / deltaBaseY 描述的是「本视图自己的基线/基准列」与「父级标准基线/基准列」之差。
> 水平文本里通常对齐的是各视图的**顶边**；这两个值参与计算视图位置，算完后位置就完全确定。

`Zone.add` 正是这样用的（`Zone:103-112`）：

```java
view.getPosition().setLocation(currentPoint.x + view.getDeltaBaseX(),
                               currentPoint.y + view.getDeltaBaseY());
```

所以 deltaBase 不是"微调"，而是**每个视图进入行时的落点修正**。

### 14.2 谁在设它

| 位置 | 设置 | 含义 |
|---|---|---|
| `Layout:265-266` | `setDeltaBaseY(maxCadratHeight - alphabeticTextBaseline - ascent)` | 字母文本 run：把文字**基线**放到四开组底线之上 `alphabeticTextBaseline` 处；高度用字体的 `ascent+descent`（:258-261），**不用字形包围盒** |
| `Layout:456-457` | 横排王名圈 `setDeltaBaseY(-dSmall); setDeltaBaseX(0)` | 框整体上移 `dSmall`(3/18em)，使**框内**内容与正文对齐，框体在下方多出 dSmall |
| `Layout:459-460` | 竖排王名圈 `setDeltaBaseY(0); setDeltaBaseX(-dSmall)` | 同理，改为水平方向偏移 |
| `ColumnLayout:98` | `setDeltaBaseY(0)` | 列排版不需要 y 对齐 |

### 14.3 与我们的差距

- 我们**完全没有 deltaBase 这个概念**。王名圈的 `-dSmall` 被吸收进了 `E.geometry()` 的
  框内定位里（视觉上对，但语义不同：JSesh 是"框整体上移"，我们是"内容在框内下移"，
  在多行/基线场景下会分叉）。
- 文本 run（`+…+s`）我们按字形渲染，**没有基线对齐**，也没有用字体 ascent/descent 定高。
  这正是 `+Hello+s` 与圣书体混排时对不齐的根源。

### 14.4 下一步（顺序）

1. 在 place 里引入 `deltaBaseY`（水平文本只需 Y），由"单元类型"决定：
   圣书体 = 0；王名圈 = `-dSmall`；文本 run = `maxCadratHeight - alphabeticTextBaseline - ascent`。
2. `addTopMargin` / `flushZone` 的落位（`LineLayout:219-250`）与 `zoneArea.minY` 的负值处理。
3. 文本 run 的高度改成正文字体的 `ascent+descent`（`Layout:258-261`）。

### 14.5 取值（已核对 GeometrySpecification.DEFAULT）

```
maxCadratHeight      18f   → 1em
maxCadratWidth       22f   → 22/18em
smallSkip             2f   → 2/18em
lineSkip              6f   → 6/18em
tabUnitWidth      18/200f  → 0.09em
largeSignSizeRatio  0.8f
smallSignSizeRatio  0.4f
smallBodyScaleLimit  12f
standardSignHeight   18f
alphabeticTextBaseline 4f  → 4/18em（文字基线在四开组底线之上 4 单位）
```

于是字母文本的落点修正为

```
deltaBaseY = maxCadratHeight - alphabeticTextBaseline - ascent
           = 18 - 4 - ascent = 14 - ascent   （单位同上）
```

SVG 模式下 ascent 取决于正文字体（CSS 字体栈），这也是 `+…+s` 与圣书体混排时
必须先定死正文字体/字号，才能谈对齐的原因。

## 十五、绘制层：视图树 + 两个坐标系（2026-11-15）

这一节回答「盒子和绘制到底怎么合成」，也是 §11.6 四项未建模里第 ① 项的正解。

### 15.1 drawView：三段式

ender\draw\ViewDrawer.java:554-635 每次画一个视图都做同样三件事：

    608  elementDrawer.drawElement(v, currentG, false);   // ① 元素本体（在父坐标系里画）
    611  Graphics2D tmpG = (Graphics2D) currentG.create();
    614  tmpG.transform(v.getAffineTransform());         // ② 本视图的 rotate + scale
    617  drawSubViews(tmpG, ...);                        // ③ 子视图（位置用 internal 坐标）
    622  elementDrawer.drawElement(v, currentG, true);    // ④ 收尾（阴影/线框）

关键点：**① 在父坐标系里画，③ 在「父坐标系 × 本视图 scale」里画**。
也就是说孩子的 position 是「本视图内部坐标」，会被本视图的 xScale/yScale 再放大一次。

### 15.2 getAffineTransform 只含 rotate + scale

ender\view\MDCView.java:263-290：

`java
if (xScale == 0 && yScale == 0 && angle == 0) return IDENTITY;
AffineTransform t = new AffineTransform();
if (angle != 0) t.rotate(angle);
if (xScale != 1.0 || yScale != 1.0) t.scale(xScale, yScale);
return t;
`

**不含平移**（注释写明「translation 由调用方处理」）。平移统一在 drawSubViews:671
的 g.translate(subvx, subvy) 里做。

### 15.3 子视图位置的镜像

ViewDrawer.java:663-670：

`java
if (v.getDirection().isLeftToRight()) {
    subvx = subv.getPosition().x;
} else {
    subvx = v.getInternalWidth() - subv.getPosition().x - subv.getWidth();   // 右到左镜像
}
subvy = subv.getPosition().y;
`

右到左时按 internalWidth 镜像，说明**布局算法内部一律用「从左到右」的坐标**，
方向只在绘制时翻转。这也是我们该采用的策略：布局不算文本方向。

### 15.4 两套尺寸（整个排版层的核心恒等式）

`java
width  = internalWidth  * xScale
height = internalHeight * yScale
`

- setWidth/setHeight 只改**外部盒子**，不动 internal，也不动 scale；
  于是 internalWidth = width/xScale 立刻跟着变 —— 即「格子变宽，内部可用空间变宽」。
- scaleToWidth/scaleForMaxWidth/reScale 改 scale（reScale 同时按比例改外部盒子）。
- 元素本体绘制时，SVGFontHieroglyphDrawer.draw 自己 	mpG.scale(view.getXScale(), view.getYScale())，
  把墨迹铺进 internalWidth × internalHeight；外部再乘一次 scale 正好等于 width/height。
  所以「字形永远铺满自己的格子」在 JSesh 里是恒等式，不是约定。

### 15.5 由此解释的三个现象

1. **setHeight 是「拔高格子」不是「拉伸图形」**：yScale 不变 → internalHeight 变大 →
   ViewVerticalEnlarger 在 internal 空间里重新分布子视图 → 画出来时再乘回 yScale，
   内容铺满更高的格子，而每个字形自身比例不变。（§11.6 第 ③ 项）
2. **scaleToWidth 是「横向拉扁格子」**：只改 xScale → internalWidth 缩小 → 子视图仍按
   internal 坐标排，绘制时横向乘 xScale → 视觉上横向压扁。	*t*t:z 里 z 铺满整行就是这条路。
3. **父级看到的是外部盒子**：getMaximalWidthOfSubView、distributeHorizontally、
   stickSubViewsTo 全用外部 width/height（对应 internal 的换算如 §11.5），
   所以「先缩放再分布」与「先分布再缩放」结果不同 —— 顺序必须照 §11.4 的 11 步。

### 15.6 对我们的实现意味着什么

现在的 mdcCadrat.layoutCadrat 只产出 places[{x,y,w,h}]（外部盒子），
enderLine 再按 w×h 把字形铺进盒子。这等价于「xScale 恒为 1」的特例。
要完整复现 JSesh，place 需要三个字段而不是两个：

`js
{ x, y,                    // 外部位置（父坐标系）
  cellW, cellH,            // 外部盒子（父级分布用这个）
  drawW, drawH }           // 内部盒子（元素绘制用这个；= cell / scale）
`

对应 enderLine 里：部件盒用 cellW/cellH 定位，字形按 drawW×drawH 铺，
超出 cell 的部分靠 overflow:visible 露出来（JSesh 也是不裁剪的）。

### 15.7 尚未读的部分

- DefaultElementDrawer（ender\draw\DefaultElementDrawer.java）里 drawElement 对
  王名圈/组/文本 run 的分派细节，以及它如何使用 getXScale()；
- PageCoordinateSystem（ender\draw\PageCoordinateSystem.java）在缩放/导出时的作用；
- AbsoluteGroupBuilder（ender\view\AbsoluteGroupBuilder.java）对 -absolute 组的处理。
### 15.8 两处独立证据（验证 §15.4 的恒等式）

**证据一：视差要除以 xScale。** DefaultElementDrawer.java:487-499 画相邻两 cadrat 之间的阴影：

`java
double outerWidth = nextView.getPosition().x - currentView.getPosition().x - currentView.getWidth();
r.width = outerWidth / currentView.getXScale();   // ← 换成"本视图内部坐标"
`

这段矩形是在 	mpG（已乘本视图 scale）里画的，所以外部的间隙必须先除以 xScale 转成内部长度。
position 与 width 都是外部量，只有 xScale 是换算因子 —— 与 internalWidth = width/xScale 完全一致。

**证据二：字形铺满自己的视图盒子。** DefaultElementDrawer.java:183-190 画整格阴影：

`java
Rectangle2D.Float r = new Rectangle2D.Float(0, 0, currentView.getWidth(), currentView.getHeight());
`

用的是 currentView 的外部宽高；isitHieroglyph:131 最终也是借用 currentView 让
hieroglyphsDrawer.draw(..., currentView, HieroglyphBodySize.STANDARD) 把墨迹铺进这个盒子。
所以「字形 = 铺满自己的格子」在 JSesh 里是绘制层的恒等式：
盒子多大，字形就画多大；要让字形"不变形地变大"，只能改 scale（reScale），
要让字形"变形"，就只改盒子的一边（scaleToWidth）。

这也给我们的实现划了界线：
- 我们现在用 ackground-size:100% 100% 铺盒子 —— 等价于 JSesh 的"铺满"，是对的；
- 但缺了 xScale/yScale 这一层，所以 scaleToWidth（只横向）无法表达，
  只能靠"把盒子改宽"来近似 —— 这正是 §15.6 要补 drawW/drawH 的原因。

## 十六、元素绘制分派（§15.7 三处的调查结果）

### 16.1 DefaultElementDrawer 的各元素

| 元素 | 位置 | 行为 |
|---|---|---|
| Hieroglyph | isitHieroglyph:131-232 | 按 SymbolCodes 分支；普通字形交给 hieroglyphsDrawer.draw(..., currentView, STANDARD)，铺满 currentView.getWidth()/getHeight() |
| AlphabeticCharacter | isitAlphabeticCharacter:79-91 | TextLayout 画在 (0, ascent)；**必须与布局共用 FontRenderContext**，否则字符 advance 与视图宽度对不上 |
| Cartouche | isitCartouche:110-123 | 按 c.getType() 委派 NormalCartoucheDrawer / SerekhDrawer / EnclosureDrawer(CASTLE) / HwtDrawer / CircularEnclosureDrawer |
| Cadrat | isitCadrat:401-408 | 只画阴影（在子视图之前或之后取决于 ShadingMode） |
| ComplexLigature | isitComplexLigature:541-542 | **空实现** —— 连字自身不画，全靠子视图 |
| ZoneStart / OptionList | :545-551 | 空实现 |

### 16.2 王名圈那段注释是旧的

DefaultElementDrawer:93-108 有一段注释：

> Cartouches are drawn larger than the typical cadrat Height, so that the signs in
> the cartouche be as tall as the ones outside. The cartouche positioning is done
> with setStartPoint(). If a Layout modifies the cartouche's startPoint, it won't work.

但**全仓库只有这条注释提到 setStartPoint**，MDCView 里没有这个方法。
当前版本的实际定位手段是 Layout.visitCartouche 里的 setDeltaBaseY(-dSmall)（§14），
"画得比 cadrat 高"则由父级 QuadratLayout:194-195 的 eScale(1/h) 统一缩回 1em。

也就是说：**框高 1.333em、内部符号随之变大、再由父级等比缩回** —— 这条链与我们
enderEnclosureJseth 里 ESC = 1/max(g.h,1) 的做法一致，不必再引入 startPoint 概念。

### 16.3 两处与排版无关的类（可以放心跳过）

- PageCoordinateSystem（109 行）：只做"页面坐标 ↔ 当前 Graphics 坐标"的换算
  （getTransformToPageCoordinates / moveAreaToPageReferenceSystem / moveBackToPageReferenceSystem），
  供光标与阴影在页面空间里算完再画回去。与布局无关。
- AbsoluteGroupBuilder（155 行）：只服务 UI 的"把选中的若干 top item 组成一个 -absolute 组"，
  内部用 AbsoluteGroupComposer 重新计算相对位置。不在排版主链上。

### 16.4 我们实现里的对应关系

| JSesh | 我们 | 差异 |
|---|---|---|
| hieroglyphsDrawer.draw(..., currentView, …) | .hie + ackground-size:100% 100% | 等价（§15.8） |
| TextLayout.draw(0, ascent) | +…+s 用 <span> 文本节点 | 缺 deltaBaseY 与 ascent 对齐（§14.3） |
| isitCartouche 委派五种 Drawer | enderEnclosureJseth 内 kind 分支 | S/F 已走几何；CASTLE/HWT/CIRCULAR 端头仍是直线近似 |
| isitCadrat 只画阴影 | 未实现 | 阴影 ShadingCode 四格位仍是待办 |
### 15.9 更正：字形不是"铺满盒子"，而是"墨迹 × xScale/yScale"

上面 15.8 的证据二只证明了**阴影矩形**用 currentView.getWidth()/getHeight()，
不能推出"字形铺满盒子"。看到真正的绘制代码后要更正：

ender\elements\SVGFontHieroglyphDrawer.java:110-112

`java
tmpG.scale(view.getXScale(), view.getYScale());
glyph.draw(tmpG, 0, 0, 1.0, 1.0, angle);      // xscale=1, yscale=1 → 按墨迹原尺寸画
`

字形是按**墨迹原尺寸 × 视图的 (xScale, yScale)** 画的，和 width/height 没有直接关系。
width/height 只在 Layout.visitHieroglyph 里由 getBBox() 反推出来（s.getWidth()*computeScale()），
两者在"正常"情况下相等，但机制不同。

这条更正很重要，因为它把"盒子"和"绘制"彻底分开了：

| 操作 | 改动 | 字形视觉结果 |
|---|---|---|
| setWidth/setHeight | 只改 width/height | **不变形、不放大**，字形仍在原位按原尺寸画（盒子变大只是布局空间变大） |
| scaleToWidth | 改 xScale（width 同步） | 横向拉伸 |
| eScale / itLoneSigns | 等比改 (xScale,yScale) 与 width/height | 等比放大/缩小 |
| scaleForMaxWidth | 同上，只缩不放 | 同上 |

所以 §15.6 的 "三个盒子" 只需要两个量：**单元格（布局用）** 与 **绘制比例（scale）**。
我们已经在 i*i:Z2 那次把 cellH 与绘制高 h 分开（提交 ef2af0f），方向是对的；
剩下要补的是"横向"那半：当某行被 scaleToWidth 拉宽时，place 要同时带上 sx，
绘制时按 
aturalW*sx 铺，而不是把盒宽当成字形宽。

这也解释了为什么 	*t*t:z 里 z 被拉宽后**高度不变** —— scaleToWidth 只碰 xScale。
