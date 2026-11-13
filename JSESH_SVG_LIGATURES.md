# JSesh SVG 连字（ligature）源码审计

> 目的：把 JSesh 中"连字区从哪来、怎么用"的完整链路从源码里逐条核实，作为 CHEAV 实现的唯一依据。
> 源码位置：`jsesh/src/main/java/jsesh/...`（本地检出 `jsesh-master`）。

---

## 1. 连字区数据写在 SVG 文件里

`SVGSignSource.java:451`

```java
} else if ("rect".equals(localName)) {
    // In anchors, rectangles are used to define ligature zones.
    // Out of them, as well, if their label is zone...
    if (attributes.getValue("id") != null
            && attributes.getValue("id").startsWith("zone")) {   // "new" system
        zoneName = attributes.getValue("", "id");
        defineZone(attributes);
        zoneName = null;
    } else if (zoneName != null)
        defineZone(attributes);
}
```

- 只有 `<rect id="zone…">` 会被当作连字区；
- 这些 rect 的 `style` 里 `fill:none; stroke:red`，属于标注元素，**不参与字形绘制**。

实例（仓库内 `glyfs/jseshGlyphs/`）：

| 文件 | rect 数 | 声明 |
|---|---|---|
| `D58.svg` | 1 | `zone1` `x=-5.415 w=10.178 y=0.050 h=13.989` `gravity:e` |
| `D28.svg` | 2 | `zone1` `x=2.999 w=6.846 y=-8.276 h=19.183` `gravity:b`；`zone2` 同上 |
| `G43.svg` | 2 | `zone1` `x=-12.491 w=14.803 y=6.435 h=10.154` `gravity:be`；`zone2` `x=9.662 w=23.867 y=-0.041 h=6.408` `gravity:ts` |
| `X1.svg` | 0 | 无声明 |

## 2. 只有两个槽

`SVGSignSource.java:562-582`

```java
private void defineZone(Attributes attributes) {
    int zoneId = 0;                       // zone1
    if ("zone2".equals(zoneName)) zoneId = 1;
    if (zones == null) zones = new LigatureZone[2];   // ← 固定两个
    ...
    zones[zoneId] = new LigatureZone(new Rectangle2D.Double(x, y, w, h));
```

`LigatureZone` 的四个构造参数就是 SVG 的 `x/y/width/height`，单位与字形同一坐标系（18 单位 = 1em）。

## 3. gravity 来自 label 字符串

`SVGSignSource.java:584-600`

```java
String label = attributes.getValue("", "label");
if (label == null) label = attributes.getValue(INKSCAPE_NAMESPACES, "label");
// "gravity:st" 这样的形式，逐字符解析
switch (ch) {
    case 't': zones[zoneId].setVerticalGravity(VerticalGravity.TOP); break;
    case 'b': zones[zoneId].setVerticalGravity(VerticalGravity.BOTTOM); break;
    case 's': ... START ...
    case 'e': ... END ...
}
```

- `s` / `e` = 水平 START / END；
- `t` / `b` = 垂直 TOP / BOTTOM；
- 未给出时保持默认（居中）。

## 4. 有显式区就不推导；没显式区才推导出三个

`SVGFontHieroglyphDrawer.java:204-222`

```java
public Optional<LigatureZone> getLigatureZone(int i, String code) {
    ShapeChar glyph = fontManager.get(canonicalCode);
    Optional<LigatureZone> result = Optional.empty();
    if (glyph != null) {
        if (!glyph.hasZones()) {
            LigatureZoneBuilder l = new LigatureZoneBuilder(glyph);
            for (int k = 0; k < 3; k++) glyph.setZone(k, l.getLigatureArea(k));
        }
        LigatureZone z = glyph.getZone(i);
        if (z != null) result = Optional.of(z);
    }
    return result;
}
```

- `hasZones()` = `zones != null`（`ShapeChar.java:507`）；
- 推导路径通过 `setZone(i, z)` 写入，而 `setZone` 在数组为空时创建 **长度 3**（`ShapeChar.java:421`）；
- 所以：**有显式声明 → 只有 2 个槽（0,1）；无声明 → 3 个槽（0,1,2）**。

`getZone(i)` 直接返回 `zones[i]`（`ShapeChar.java:435`，无越界检查）。

> **待核实的疑点**：本检出中，若字形只有 1–2 个显式 rect，而调用方请求 `i = 2`，`zones[2]` 会抛 `ArrayIndexOutOfBoundsException`。但实测 JSesh（用户环境）对 `w&t`（G43 只有 2 个 rect）工作正常 —— 说明**用户使用的 JSesh 版本与本检出可能不同**（较新版本可能已把数组扩到 3 或加了越界保护）。这一点需要按实际 JSesh 版本再确认。

## 5. `Layout.visitLigature` 的落位规则

`Layout.java:709-790`

```java
List<ExplicitPosition> pos = hieroglyphsDrawer.getPositions(codes);   // ① Tksesh 预定义坐标
if (pos != null) { ...按 x/y/scale 放置... }
else {
    if (l.getNumberOfChildren() == 2) {
        int largerSignIndex = 0, smallerSignIndex = 1, ligatureZonePosition = 2;
        if (currentView.getSubView(1).getHeight() * 0.8
                > currentView.getSubView(0).getHeight()) {
            largerSignIndex = 1; smallerSignIndex = 0; ligatureZonePosition = 0;
        }
        // 位置 2 缺 → 退位置 1
        if (ligatureZonePosition == 2 && !getLigatureZone(2, largerCode).isPresent())
            ligatureZonePosition = 1;

        Optional<LigatureZone> ligatureZone = getLigatureZone(ligatureZonePosition, largerCode);
        if (ligatureZone.isPresent()) {                 // ← 没有 else！
            currentView.getSubView(largerSignIndex).resetPos();
            LigatureZone z = ligatureZone.get().scale(computeScale());
            placeView(z, currentView.getSubView(smallerSignIndex));
        }
    } else if (l.getNumberOfChildren() == 3) {
        // 以第 2 个（中间）为中心：第 1 个 → 位置 0，第 3 个 → 位置 1
        if (r1.isPresent() && r2.isPresent()) { ... }
    }
}
currentView.fitToSubViews(true);     // 最后整体平移（true = 允许平移）
```

要点：

1. **宿主 = 更高的那个**（比较 `subView(1) * 0.8 > subView(0)`）；
2. 宿主在**前** → 默认槽位 2（底部）；宿主在**后** → 槽位 0；
3. 槽位 2 取不到 → 退槽位 1；
4. **槽位取不到时不做任何放置** —— 两个子视图都停在原位 `(0,0)`，视觉上完全重叠；
5. 三段式只用中间字的槽位 0 与 1；
6. 最后 `fitToSubViews(true)` 把整体平移回原点。

## 6. `placeView`：只缩不放 + 六种重力

`Layout.java:1006` 起

```java
subView.scaleToFitDimensions(z.getWidth(), z.getHeight());   // 只缩不放
if (START) xpos = z.getMinX();
else if (END) xpos = z.getMinX() + z.getWidth() - subView.getWidth();
else xpos = z.getMinX() + (z.getWidth() - subView.getWidth()) / 2.0;
if (TOP) ypos = z.getMinY();
else if (BOTTOM) ypos = z.getMinY() + z.getHeight() - subView.getHeight();
else ypos = z.getMinY() + (z.getHeight() - subView.getHeight()) / 2.0;
subView.getPosition().setLocation(xpos, ypos);
```

## 7. 对 CHEAV 的结论

| 规则 | 实现要求 |
|---|---|
| 数据来源 | 解析 SVG 内 `rect id="zone1\|zone2"`；**不要**用自行推导或手写表冒充 |
| 槽数量 | 有声明 → 只有 0/1；无声明 → 推导 0/1/2 |
| 重力 | 从 `label="gravity:xx"` 取 s/e/t/b，缺省居中 |
| 单位 | 18 单位 = 1em（与字形同一坐标系） |
| 宿主 | 更高的那个（`h1*0.8 > h0`） |
| 槽位回退 | 2 → 1；再缺 → **不放置**（重叠于原点） |
| 缩放 | `scaleToFitDimensions`（只缩不放），并按 `computeScale()` 修正 |
| 收尾 | `fitToSubViews(true)` 整体平移 |

**此前 CHEAV 的两处偏差**（已修正）：

1. 手写表给 `D58` 造了一个 SVG 里并不存在的 `zone2`；
2. 槽位取不到时退化成"并排"，而 JSesh 是"不放置"。

---

## 8. 补充审计（第二轮）

### 8.1 LigatureZone 的默认值与缩放

`LigatureZone.java:31-36, 142-149`

```java
public LigatureZone(Rectangle2D box) {
    this.box = box;
    this.verticalGravity = VerticalGravity.CENTER;     // 默认居中
    this.horizontalGravity = HorizontalGravity.CENTER;
}

public LigatureZone scale(float scale) {
    LigatureZone scaledCopy = (LigatureZone) clone();
    scaledCopy.box = new Rectangle2D.Double(
        getMinX() * scale, getMinY() * scale,        // ← 注意：原点坐标也乘
        getWidth() * scale, getHeight() * scale);
    return scaledCopy;
}
```

要点：`scale()` 不只是缩放尺寸，**连 minX/minY 也一起乘** —— 把整个矩形当作绝对坐标缩放。

### 8.2 推导器的常量与判据源

`LigatureZoneBuilder.java:22-41`

```java
private ShapeChar signShape;
private Area signArea;
private LigatureZone zones[];

static final double MARGIN = 1;
static final double MAXHEIGHT = 18;

public LigatureZoneBuilder(ShapeChar signShape) {
    zones = new LigatureZone[3];
    signArea = signShape.getSignArea(0, 0, 1, 1, 0);   // 只含墨迹
}
```

- `MARGIN = 1`（1 个 SVG 用户单位 = 1/18 em）；
- `MAXHEIGHT = 18`（一个 cadrat），底部槽高度 `MAXHEIGHT - p.y + 1`；
- 判据用的 `signArea` **只包含 path/polygon 的填充或描边形状**。

### 8.3 scaleToFitDimensions 的精确条件

`MDCView.java:796-808`

```java
public void scaleToFitDimensions(double wantedWidth, double wantedHeight) {
    if (getWidth() < wantedWidth && getHeight() < wantedHeight)
        return;                                  // 两个方向都更小 → 完全不动
    double zoneScaleW = 1, zoneScaleH = 1;
    if (getWidth() != 0)  zoneScaleW = wantedWidth  / getWidth();
    if (getHeight() != 0) zoneScaleH = wantedHeight / getHeight();
    xScale = yScale = (float) Math.min(zoneScaleH, zoneScaleW);
    width  = width  * xScale;
    height = height * yScale;
}
```

等价于"等比缩放到刚好装进槽，且**绝不放大**"。

### 8.4 computeScale 与槽的相互作用

`Layout.java:945-948`

```java
private float computeScale() {
    JSeshStyle jseshStyle = renderContext.jseshStyle();
    return hieroglyphsDrawer.scaleFromFontToStyle(jseshStyle);
}
```

- 这是全局的"字体单位 → 排版单位"比例（约 18 / heightOfA1 ≈ 1.012）；
- `visitLigature` 里 `z = z.scale(computeScale())` 之后才 `placeView`；
- 由于子视图也处于同一单位，实际影响约 1.2%，但要完全一致必须乘。

### 8.5 其它相关方法

| 方法 | 位置 | 语义 |
|---|---|---|
| reScale(scale) | MDCView:695 | 宽高与 xScale/yScale 同乘 scale |
| resetPos() | MDCView | 位置归零，不改尺寸/缩放 |
| fitToSubViews(doTranslate) | MDCView:347 | 依据子视图重算自身宽高；true 时整体平移使包围盒回到原点 |

### 8.6 对 CHEAV 的追加结论

1. 槽内边距常量应为 `MARGIN = 1 单位 = 1/18 em`（当前实现一致）；
2. 底部槽高度公式 `MAXHEIGHT - p.y + 1`，`MAXHEIGHT = 18 单位`（一致）；
3. 推导所用墨迹必须只含 path/polygon（已收紧取样）；
4. `placeView` 的"只缩不放"与 `scaleToFitDimensions` 等价（一致）；
5. **缺少**：`z.scale(computeScale())`（≈1.012），应补；
6. **缺少**：`fitToSubViews(true)` 的"整体平移回原点"语义（当前"无槽→重叠"情形平移量为 0，暂不影响；多段连字需要）。
