# JSesh 官方逻辑 vs CHEAV Rndr（SVG 模式）

本文基于对 JSesh 源码（`jsesh-master`）的阅读，梳理两套渲染体系在**数据模型、度量、排版、连字、包围框**上的根本差异，并说明哪些差异会造成肉眼可见的不同。

参考源码（均在 `jsesh/src/main/java/jsesh/`）：

| 主题 | 关键类 |
|---|---|
| 字形加载与度量 | `glyphs/signsource/SVGSignSource.java`、`glyphs/shape/ShapeChar.java` |
| 绘制与缩放基准 | `render/elements/SVGFontHieroglyphDrawer.java`、`render/elements/HieroglyphDrawer.java` |
| 四开组排版 | `render/layout/QuadratLayout.java`、`render/layout/Layout.java` |
| 视图模型 | `render/view/MDCView.java`、`render/view/ViewBuilder.java` |
| 连字区 | `glyphs/shape/LigatureZoneBuilder.java` |
| 绝对组 | `model/AbsoluteGroup.java`、`render/view/AbsoluteGroupBuilder.java` |
| 几何常量 | `render/style/GeometrySpecification.java` |

---

## 一、总体架构差异

| 维度 | JSesh | CHEAV Rndr（现状） |
|---|---|---|
| 布局模型 | **显式矩形树**：每个 `MDCView` 有 `width/height/position/xScale/deltaBaseY` | **CSS 流式**：inline-block + flex，尺寸由 line-box 与内容决定 |
| 坐标系 | 自己的 18 单位 = 1 cadrat；绘制时统一 `scaleFromFontToStyle()` | 以 em 为单位（18 或 1800 换算），但盒尺寸取**墨迹** |
| 缩放 | 四开组只在 `reScale()` 一处缩放 | 多层各自缩放（历史上曾出现父子两级叠乘） |
| 字形定位 | `ShapeChar.fixShape()` 把墨迹平移到 `(0,0)`，bbox 恒为 `(0,0,w,h)`，**底边即基线** | 盒 = 墨迹尺寸，`vertical-align: bottom` 贴基线，另用 `margin-bottom` 修正 `dy` |
| 测量数据 | 运行时 `getBBox()`（Java2D，含所有图元与变换） | 运行时 DOM `getBBox()`（同样的语义），另有数值法兜底 |
| 缺省容错 | 依赖 `A1` 必须存在（缩放基准） | 按 `width/height` 量级（`>100`）判 18/1800 |

**结论**：JSesh 是"先算几何、再按坐标画"，CHEAV 是"交给浏览器排版"。凡是"叠层比例""子组拉伸"这类需求，流式模型都会吃亏。

---

## 二、字号与缩放基准

JSesh：

```java
// SVGFontHieroglyphDrawer
heightOfA1 = fontManager.get("A1").getBbox().getHeight();      // 实测 17.78（18 单位制）

// HieroglyphDrawer
scaleFromFontToStyle(style) = style.geometry().standardSignHeight() / heightOfA1;
//                                 默认 18 / 17.78 ≈ 1.012
```

要点：

1. **全局只乘一个系数** `k = 18 / heightOfA1`，所有字形按自身墨迹 ×k 绘制；
2. 不存在"逐字归一化"（不填满 1em，也不按画布缩放）；
3. 1800 单位制文件在加载时**只除以 100**：

```java
// SVGSignSource
if (shape.getBbox().getHeight() > 60) shape.scaleToHeight(shape.getBbox().getHeight() / 100.0);
```

CHEAV：以墨迹尺寸（em）定盒，等价于 `k = 1`（相对 18 单位制）。两者差异约 **1.2%**，不构成观感差异。

> 曾经尝试过的"填满 1em"和"画布定标"都**不是** JSesh 的行为，已废弃。

---

## 三、四开组（VRG / Cadrat）排版

几何常量（`GeometrySpecification`）：

```
maxCadratHeight   = 18       // 1 cadrat 高
maxCadratWidth    = 22       // 1.222 × 高
standardSignHeight= 18       // A1 的期望高度
smallSkip         = 2        // 层间空隙（2/18 em）
largeSignSizeRatio= 0.8
smallSignSizeRatio= 0.4
alphabeticTextBaseline = 4
```

`QuadratLayout.layout()` 的流程（简化）：

```java
// 1. 宽度：超过 maxCadratWidth 的 hbox → scaleForMaxWidth(maxWidth)
if (honourMaxWidth || (nSubViews != 1 && !wide)) each.scaleForMaxWidth(maxWidth);

// 2. 高度 = 各行高之和 + smallSkip × (行数-1)
//    水平文本时若不足 maxCadratHeight → 补足
if (honourMaxHeight && h < maxCadratHeight) h = maxCadratHeight;

// 3. 宽度 = 各 hbox 自然宽的最大值（列文本再补到 maxCadratWidth）

// 4. 排布：
if (nSubViews > 1) currentView.distributeFromTopToBottom();   // 多层自上而下
else if (centerSigns) centerSubViewsVertically();             // 单层垂直居中
else stickSubViewsTo(BOTTOM);                                 // 否则贴底

// 5. 每层撑到组宽；层内单元素居中，多元素 distributeHorizontally() + 贴底
sub.setWidth(w);
if (sub.getNumberOfSubviews() == 1) sub.centerSubViewHorizontally();
else { sub.distributeHorizontally(); sub.stickSubViewsTo(BOTTOM); }

// 6. 全局缩放在最后执行一次
if (honourMaxHeight && h > maxCadratHeight) currentView.reScale(maxCadratHeight / h);
```

CHEAV 现状：`renderVRG` 用 flex 列 + `space-between` + 每层度量来自 `unitMetrics()`，缩放分散在各处。**没有** `scaleForMaxWidth` 的宽度约束，**没有**"层撑到组宽"，也**没有**"只在最后缩一次"。

---

## 四、子 cadrat（括号组 `( … )`）与"照"型

模型：`model/SubCadrat.java`，包裹一个 `BasicItemList`。

常规布局（`Layout.visitSubCadrat`）：

```java
currentView.setWidth(currentView.getSumOfSubViewsWidths());
currentView.setHeight(currentView.getMaximalHeightOfSubView());
currentView.distributeHorizontally();
```

**"照"型的关键**是 `Layout.ViewVerticalEnlarger`：

```java
void enlarge(MDCView subView, float h) { height = h; view = subView; subView.getModel().accept(this); }

visitSubCadrat(SubCadrat c) {
    MDCView inner = view.getFirstSubView();
    for (MDCView elementView : inner) {
        if (elementView.isYStretchable()) {
            elementView.setHeight(height);              // 拉高到所在 hbox 的高度
            elementView.distributeFromTopToBottom();    // 内部各行按高度重新分配
        }
    }
    inner.fitToSubViews(false);
    view.fitToSubViews(false);
}
```

即：**外层行高被更高的兄弟撑满 → 子组被拉高 → 子组内部各行重新分配高度**，于是"日"可以占到超过单层的高度。

CHEAV 现状：**不解析括号**（`(` 由既有的 `parseWord` 吞掉，内容按普通序列展开），因此没有子组，也没有"拉高 + 重分配"。

---

## 五、连字

JSesh 有三条互不相同的通道：

1. **显式连字区（`&`）**：SVG 内 `<rect id="zone1">/<rect id="zone2">`，带 `inkscape:label="gravity:…"`；
2. **自动推导**（无显式区时，`SVGFontHieroglyphDrawer.getLigatureZone(k, code)` → `LigatureZoneBuilder`）：

```java
static final double MARGIN = 1;          // 1 单位（1/18 em）
static final double MAXHEIGHT = 18;

zone0（前）：宽 = 字形宽/2，高 = 字形高/3，从 (-宽, 字形高/2) 向 (0, …) 二分找"不与字形相交"的最远位置
            失败则宽高各取 1/4 → 仍失败则无前槽
            gravity: HorizontalGravity.END
zone1（后）：宽 = 字形宽/2，高 = 字形高/2.5，从 (字形宽, 0) 向 (字形宽/2, 0) 二分
            gravity: START + TOP
zone2（下）：沿对角线 (宽/2, 高) → (宽, 0) 二分
            区域 = x∈[0, p.x], y∈[p.y, 18]，gravity: BOTTOM
```

  判定"相交"用的是**字形填充区 `Area`**（`ShapeChar.getSignArea`），不是包围盒。

3. **预定义组合**（`TkseshLigatureCatalogue.get(normalizedCodes)` → `List<ExplicitPosition>`），以及通用的**绝对组**：

```java
absoluteGroup ::= hieroglyph (DOUBLEAMP hieroglyph)+     // A&&B
// Layout.visitAbsoluteGroup: x = h.getX() * groupUnitScale; y = h.getY() * groupUnitScale;
// AbsoluteGroupBuilder 可把一次普通布局"烘焙"成显式坐标（scanView 递归累加位置与缩放）
```

CHEAV 现状：显式区已接入（20 个符号的数据表）+ 自动推导用"墨迹 3×3 密度"近似 + 预定义组合用数据表；**没有** `A&&B` 绝对组，也没有基于 `Area` 的精确二分。

---

## 六、包围框（王名圈 / 塞拉赫）

JSesh：`Layout.visitCartouche()` 先布局内部子视图，再**按内部尺寸计算框体**（`CartoucheSizeHelper.computeCartoucheSecondaryLength`），框是"结果"。

CHEAV：用 CSS 边框 + padding 包裹内容，框是"容器"。因此：

- 内部单字的居中/间距由 `encADepth`、`gap` 等 CSS 控制；
- 塞拉赫尾为外挂 SVG（`serekhTail.js`），几何来自实测数据。

两者观感接近，但**框随内容生长**的规则不同（JSesh 有固定边距常量，CHEAV 是 padding）。

---

## 七、文本与竖排

- JSesh 有独立的 `TextRun`（`TextRun.layoutRuns`）处理拉丁转写，基线与 `alphabeticTextBaseline = 4` 对齐；竖排通过 `TextOrientation` 切换 `honourMaxWidth/honourMaxHeight`。
- CHEAV 文本用 `<text>` 单位渲染，`options.textScale = 0.4`；竖排由 `renderVerticalText` 单独实现，度量沿用 `unitMetrics`。

---

## 八、可见差异的归因表

| 现象 | 根本原因 | 是否可修 |
|---|---|---|
| `N25`/`N21` 等"墨迹未满画布"的字偏小 | 两边都用墨迹；差异来自**排版上下文**（行高、组宽），非字形缩放 | 可（需四开组排版对齐） |
| `n:(ra:Z1)*A40` 里 `n` 不横跨、`ra/Z1` 紧贴 | 缺 `scaleForMaxWidth`、缺"层撑到组宽"、缺子组拉高 | 可（照第三章重写 `renderVRG`） |
| 括号组完全无效果 | `(` 被 `parseWord` 吞掉，无 `SubCadrat` | 可（新增子组解析 + 拉高逻辑） |
| 连字槽位与 JSesh 略有出入 | 自动推导用密度近似，非 `Area` 二分 | 可（用 `isPointInFill` 采样 + 二分） |
| `A&&B` 绝对组不支持 | 未实现 | 可（新增解析 + 显式坐标渲染） |

---

## 九、若要"完全对齐 JSesh"，需要改的四件事

按风险从低到高：

1. **连字区推导改为 `Area` 二分**（`isPointInFill` 采样 + 二分），替换 3×3 密度；
2. **`renderVRG` 对齐 `QuadratLayout`**：宽度约束 `maxCadratWidth`、层撑到组宽、单元素居中、多元素 `space-between`、**只在最后缩一次**；
3. **新增子 cadrat `( … )`**：解析 + `ViewVerticalEnlarger` 语义（拉高 + 内部重分配）；
4. **新增 `A&&B` 绝对组**：显式 `(x, y, size%)` 坐标渲染。

每一条都应：**默认关闭（`SETTINGS` 开关）→ 固定回归样本全绿 → 再切默认**。回归样本建议：

```
A1                    单字
A1:B2                 两层
A1*B2                 同层
t&w / w&t / t&w&t     连字链
n:(ra:Z1)*A40         子组 + 照型
```

---

## 十、附：本仓库中被验证过的关键事实

- `signs_description.xml` **不含任何几何数据**（只有 `sign`/`contains`/`variantOf`/`hasTag`/`hasTransliteration`/`signDescription`）；
- 6946 个 SVG **全部**有 `width/height`；6398 个是 18 单位制、548 个是 1800 单位制；
- 文件是**按墨迹裁切**的（width 分布 10–21，6062 个宽≠高），所以 SVG 本身不含 cadrat 信息；
- `ShapeChar.fixShape()` 把墨迹平移到原点 ⇒ **墨迹底边 = 基线**，这一点与我们一致；
- 风险特性极少：`<image>` 3、`<use>` 2、`<gradient>` 2、`<style>` 1。

---

## 十一、字形比例的完整推导链（源码级）

这是此前最容易误解的部分。一个符号的最终尺寸由**四步**决定，其中**只有第 3b 步是非等比**的。

### 第 1 步：墨迹尺寸（自然大小）

```java
// Layout.visitHieroglyph, case SymbolCodes.MDCCODE
Rectangle2D s = hieroglyphsDrawer.getBBox(code, angle, true);   // ShapeChar bbox
currentView.setWidth (s.getWidth()  * computeScale());
currentView.setHeight(s.getHeight() * computeScale());
```

- `ShapeChar.fixShape()` 已把墨迹平移到 `(0,0)`，故 bbox = `(0,0,w,h)`；
- `computeScale() = scaleFromFontToStyle() = 18 / heightOfA1`（全局常数 ≈ 1.012）。

⇒ 每个字的视图形状 = 它的墨迹形状，与 CHEAV 的"墨迹定盒"一致。

### 第 2 步：显式大小修正

```java
if (h.getRelativeSize() != 100) currentView.reScale(h.getRelativeSize() / 100f);
```

等比缩放，用于 `:100:…` 之类的显式比例。

### 第 3a 步：等比缩放（三种接口，全部 uniform）

```java
reScale(s)                       // xScale、yScale、width、height 同乘 s
scaleForMaxWidth(maxWidth)       // 宽超限 → reScale(maxWidth / width)
scaleToFitDimensions(w, h)       // xScale = yScale = min(w/width, h/height)（连字区使用）
```

### 第 3b 步：非等比横向拉伸（唯一改变字形比例的地方）

```java
/** scale the view horizontally, so that its content fills the width passed as argument.
 *  The vertical scale remains unchanged. */
public void scaleToWidth(float w) {
    xScale = w / getInternalWidth();     // 只改 xScale
    width  = w;
}
```

触发条件：

```java
// QuadratLayout：只有 "wide" 四开组才横向拉伸
boolean wide = c.isWide();
if (wide) { ... currentView.getSubView(k).scaleToWidth(maxw); ... }

// 判定链：Cadrat.isWide() → HBox.isWide() → Hieroglyph.isWide()
public boolean isWide() {
    return getModifiers().getBoolean("l");     // ← MdC 的 "l" 修饰符
}
```

⇒ **只有给符号写了 `l` 修饰符，JSesh 才会把它横向拉满**；默认所有符号保持墨迹比例。

### 第 4 步：层内剩余空间用"均分"，不是拉伸元素

```java
// MDCView.distributeHorizontally()
float interSpace = (getInternalWidth()  - getSumOfSubViewsWidths())  / (n - 1);
// MDCView.distributeFromTopToBottom()
float interSpace = (getInternalHeight() - getSumOfSubViewsHeights()) / (n - 1);
// MDCView.centerSubViewHorizontally()
sub.getPosition().x = (getInternalWidth() - sub.getWidth()) / 2;
// MDCView.stickSubViewsTo(BOTTOM)
sub.getPosition().y = getInternalHeight() - sub.getHeight();
```

即：**元素自身尺寸不变，只调整位置**（均分间隙 / 居中 / 贴边）。

### 对 ZHAO 例子的正确解释

`n:(ra:Z1)*A40` 中 `n` 没有 `l` 修饰符 ⇒ **不被拉伸**。它在参考图里"横跨"，是因为：

```
n  (N35) 墨迹宽 ≈ 1.03 em
下层 = ra(0.375) + A40(0.63) ≈ 1.0 em   →  组宽 ≈ 1.03 em
⇒ n 的自然宽 ≈ 组宽，看起来就是"横跨"
```

**不需要任何拉伸规则。** 若渲染出的 `n` 明显窄于组宽，问题在"绘制的实际宽度与度量不一致"，不在布局。

### 与 CHEAV 的差异

| 步骤 | JSesh | CHEAV 现状 |
|---|---|---|
| 1 墨迹尺寸 | bbox × k | 墨迹 em（等价） |
| 2 显式比例 | `reScale` | 部分（连字部件的 `scale` 字段） |
| 3a 等比缩放 | 三处统一接口 | 分散实现 |
| 3b 横向拉伸 | `scaleToWidth`（`l` 修饰符） | 未实现，也未解析 `l` |
| 4 均分 / 贴边 | `distribute*` / `stick` / `center` | flex 的 `space-between` / `flex-end` 近似 |

**优先级**：3b 最低（仅影响 `l` 写法）；真正影响观感的是第 1 步的**度量与绘制一致性**和第 3a 步的**只在最后缩一次**。
