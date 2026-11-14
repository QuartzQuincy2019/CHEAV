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

## 九、待查


- `fitLoneSignsToColumnWidth(c, width)` 的判定条件。
- `Cadrat.getHBox()` / `HBox.isWide()` 在王名圈内部的行为。
- `TextRun.layoutRuns` 的文本 run 间距细节。
- `Layout.visitCadrat:389-393` 之外，是否还有对 `Cartouche` 的特殊处理（如 `deltaBase` 的绘制期使用）。
