# 连字区（Ligature Zones）：源码事实、踩坑记录与未解之谜

本文汇总 CHEAV 在实现 JSesh 兼容的 `&` 连字过程中，对 JSesh 源码（`jsesh-master`）的**完整调查结果**、**我们遇到的问题清单**，以及**尚未解开的关键线索**。

> 目的：避免"按症状调参"，让后续任何人（包括我自己）能从这里直接接上，而不是重新猜一遍。

---

## 一、源码事实清单

每条都标注了文件与方法，便于复核。

### F1 · 连字区有两条独立来源

```java
// SVGFontHieroglyphDrawer.getLigatureZone(i, code)
ShapeChar glyph = fontManager.get(canonicalCode);
if (!glyph.hasZones()) {                       // ← 只有"完全没有区"才推导
    LigatureZoneBuilder l = new LigatureZoneBuilder(glyph);
    for (int k = 0; k < 3; k++) glyph.setZone(k, l.getLigatureArea(k));
}
LigatureZone z = glyph.getZone(i);
if (z != null) result = Optional.of(z);
```

→ **全有或全无**：SVG 里只要有区，就**不再推导**；缺的槽就是 `null`。

### F2 · 显式区只支持两个（`zone1` / `zone2`）

```java
// SVGSignSource.defineZone
int zoneId = 0;
if ("zone2".equals(zoneName)) zoneId = 1;
if (zones == null) zones = new LigatureZone[2];      // ← 长度 2
zones[zoneId] = new LigatureZone(new Rectangle2D.Double(x, y, w, h));
```

**没有 zone3**。也就是说：**只有"无显式区"的字形才可能有底部槽。**

### F3 · 推导路径的数组是长度 3

```java
// ShapeChar.setZone
if (zones == null) zones = new LigatureZone[3];     // ← 长度 3
zones[i] = z;
```

→ 两种路径产出的数组长度不同（2 vs 3），而 `visitComplexLigature` 无条件访问 `zones.get(2)`，这是一个**潜在的越界隐患**（见 Q2）。

### F4 · 坐标是"墨迹 bbox 坐标系"，且不翻转、不除以 100

```java
// defineZone：原样读取 x/y/width/height
// ShapeChar.fixShape()：与字形一起平移
Rectangle2D rect = new Rectangle2D.Double(
    zones[i].getMinX() - r.getMinX(),
    zones[i].getMinY() - r.getMinY(), ...);
zones[i].setBox(rect);
setBBox(0, maxY - minY, maxX - minX, 0);            // bbox = (0,0,w,h)
```

→ 原点 = **墨迹左上角**，**y 向下**（SVG 约定），与字形同一坐标系。

### F5 · 单位换算会同步缩放 zone

```java
// SVGSignSource：bbox 高 > 60 时（1800 单位制）
shape.scaleToHeight(shape.getBbox().getHeight() / 100.0);

// ShapeChar.scaleGlyph
zones[i].setBox(new Rectangle2D.Double(minX*scale, minY*scale, w*scale, h*scale));
```

→ 1800 → 18 的换算对 zone 同样生效。

### F6 · 重力：默认 CENTER，label 覆盖

```java
// LigatureZone 构造：vertical = CENTER, horizontal = CENTER
// defineZone：label 形如 "gravity:st"
//   t → TOP, b → BOTTOM, s → START, e → END
```

→ 推导出的底部槽**只设置了** `VerticalGravity.BOTTOM`，水平方向保持 **CENTER**。

### F7 · 布局：before → zone0；after → **zone2 优先**，其次 zone1

```java
// Layout.visitComplexLigature
for (int i = 0; i < 3; i++) {
    float scale = computeScale();                       // ≈ 18/heightOfA1 ≈ 1.012
    zones.add(getLigatureZone(i, code).map(z -> z.scale(scale)));
}
if (beforeGroup != null) { zones.get(0) → placeView; else /* 退化为 * */ }
// 宿主固定在 (0,0)，scale 1
if (afterGroup != null) {
    if (zones.get(2).isPresent()) placeView(zones.get(2), afterGroup);   // 底部优先
    else if (zones.get(1).isPresent()) placeView(zones.get(1), afterGroup);
    else /* 退化为 * */
}
currentView.fitToSubViews(true);                        // 统一修正负坐标
```

### F8 · `placeView`：只缩不放 + 六种重力定位

```java
subView.scaleToFitDimensions(z.getWidth(), z.getHeight());   // 已足够小则不改
x = START ? minX : END ? minX+w-sub.w : minX+(w-sub.w)/2;
y = TOP   ? minY : BOTTOM ? minY+h-sub.h : minY+(h-sub.h)/2;
```

`scaleToFitDimensions` 关键：

```java
if (getWidth() < wantedWidth && getHeight() < wantedHeight) return;   // 绝不放大
xScale = yScale = min(wantedW/w, wantedH/h);
```

### F9 · 三个槽的算法参数与**不同的**回退策略

`LigatureZoneBuilder`（`MARGIN = 1`，`MAXHEIGHT = 18`，二分精度 0.01）：

| 槽 | outer → inner | 矩形 | 失败回退 | 阈值 | 重力 |
|---|---|---|---|---|---|
| 0 左 | `(-w/2, h/2) → (0, h/2)` | `w/2 × h/3` | 改 `w/4 × h/4` | ≥0.2 → ≥0.1 | H=END |
| 1 右 | `(w, 0) → (w/2, 0)` | `w/2 × h/2.5` | 高度改 `h/3` | ≥0.2 → ≥0.1 | H=START, V=TOP |
| 2 下 | `(w/2, h) → (w, 0)` | **`width=-w`**, `height=h` | **`outer.x = 0`** 重试 | >0.2 | V=BOTTOM（H=CENTER） |

槽 2 的结果矩形：

```java
zones[2] = new LigatureZone(0, p.y, p.x, MAXHEIGHT - p.y + 1);
```

### F10 · `findBestZonePosition` 的语义

```java
double innerT = 1, outerT = 0;
while (|innerT - outerT| > 0.01) {
    t = (innerT + outerT)/2;
    p = outer + t*(inner - outer);
    minx = p.x - MARGIN;  miny = p.y - MARGIN;
    if (width  < 0) minx += width;
    if (height < 0) miny += height;
    rect = (minx, miny, |width|+2M, |height|+2M);
    if (rect ∩ signArea 为空) outerT = t; else innerT = t;
}
return outerT;      // 返回"仍不重叠"的最大 t
```

---

## 二、未解之谜（关键线索）

### Q1 · ~~`MAXHEIGHT - p.y + 1` 的 y 方向~~ —— **已解决**

**结论：全程 y 向下，没有翻转。**

证据链：

1. `SVGSignSource` 构造路径时**直接使用 SVG 坐标**，没有取负：

```java
subPath.moveTo(Float.parseFloat(coords[0]), Float.parseFloat(coords[1]));
// 全部 lineTo / curveTo 同此，无 -y
```

2. `ShapeChar.fixShape()` 只做平移，不翻转：

```java
shape = translate(-r.getMinX(), -r.getMinY());
setBBox(0, maxY - minY, maxX - minX, 0);     // bbox = (0,0,w,h)
```

3. Java2D 屏幕坐标本身就是 **y 向下**，无需额外变换；`PageCoordinateSystem` 只记录/还原变换，不做翻转。

因此（关键）：

```
字形占 y ∈ [0, h]（y 向下，0 = 墨迹顶边）
cadrat 高 18，也是 y 向下
zones[2] = (0, p.y, p.x, 18 - p.y + 1)
         → 从 p.y 向**下**延伸到 ~19，即落在字形**下方** ✓
VerticalGravity.BOTTOM → 子视图贴该矩形下边 = 19 - subH ≈ cadrat 底部 ✓
```

这与"`D&t` 的面包在蛇下方"**完全自洽**。

**对实现的影响**：`computeThirdArea` 的对角线 `(w/2, h) → (w, 0)`
在 y 向下时表示"**底边中点 → 右上角**"；我们此前按 y 向上（`1 - t`）实现，
方向正好相反 —— 这才是 `tB = 0` 的根因，而不是网格精度问题。

**修正后的口径（统一用 y 向下归一化，Y=0 顶边、Y=1 底边）**：

```
outer = (0.5, 1.0)   // 底边中点
inner = (1.0, 0.0)   // 右上角
矩形   = x ∈ [p.X - 1, p.X]，y ∈ [p.Y, p.Y + 1]（向下延伸，外扩 MARGIN）
zone   = (x=0, y=p.Y, w=p.X, h=(18 - p.Y*18 + 1)/18)
gravity= 垂直 BOTTOM，水平 CENTER
```

### Q1-旧述（保留存档）· `MAXHEIGHT - p.y + 1` 的 y 方向

坐标系是 **y 向下**（F4），那么 `18 - p.y` 是向**上**延伸（朝向更小的 y）。再配合 `VerticalGravity.BOTTOM`（子视图贴矩形下边）：

```
y_sub = minY + h - subH = p.y + (18 - p.y + 1) - subH = 19 - subH
```

这个位置在 `19 - subH` 附近 —— 若字形占 `0..h`（h≈18），则它在**字形顶部之外**。而 JSesh 实测 `D&t` 的面包在**下方**。

→ **要么渲染入口有整体 y 翻转，要么此处的 y 方向理解需修正。** 这是解开 `D&t` 的最后一把钥匙。

**待查**：`MDCDrawingFacade` / `ViewDrawer` 是否对 Graphics2D 做了 `scale(1,-1)`。

### Q2 · `zones.length == 2` 时访问 `getZone(2)`

`defineZone` 建长度 2 的数组，而 `visitComplexLigature` 循环 `i=0..2`、`getZone(2)` → **数组越界**。

两种可能：

1. 有显式区的字形走不到 `afterGroup` 分支（不成立，`D&t` 之类很常见）；
2. `getZone` 实际有保护（当前读到的代码没有）。

→ 若确认无保护，则说明 **JSesh 7.x 对"有显式区的字形 + afterGroup"存在潜在崩溃路径**，而实际不崩说明 `zones[2]` 在别处被填充为 null（长度仍 2，仍然越界）。

值得用一个小 Java 测试或在 JSesh 里试 `A17&t` 验证。

### Q3 · `D&t` 面包位于左下的可能解释

若 I10 的槽 2（底部）成立且 `p.x ≈ 0.6`：

```
zone2 = (x=0, y=p.y, w=p.x≈0.6, h≈18-p.y)
水平重力 CENTER → 面包落在 [0, 0.6] 的中间
垂直重力 BOTTOM → 贴该矩形下边
```

→ 视觉上正是"下方偏左"，与截图一致。所以**只要槽 2 能算出来**，行为自洽。

### Q4 · 我们推导 `tB = 0` 的原因候选

实测（32×32 Canvas 网格，I10）：

```
t1=0.008  t1b=0.398  t2=0  t2b=0  tB1=0  tB2=0
```

候选原因：

1. **网格口径**：`g.w/g.h` 用了 `img.naturalWidth`（画布宽）而非墨迹宽；
2. **矩形起点**：我们以 `1 - t`（y 向上）构造，源码是 y 向下；
3. **MARGIN 外扩**在 32×32 网格里相当于 0.5 格，边界判定偏保守；
4. I10 的墨迹确实占满 bbox → 源码也会失败（需与 JSesh 实测对照）。

---

## 三、我们踩过的坑（问题清单）

| 编号 | 问题 | 根因 | 现状 |
|---|---|---|---|
| P1 | `grid=null`，推导全部失败 | `rawSvg` 未填充；后改用 data URI 兜底 | 已修 |
| P2 | 只解析 `<path>` 点，4769 个文件不适用 | 正则采样 | 已改为 Canvas 栅格 |
| P3 | 测试台连字不生效 | 缺 `setGlyphZoneProvider` | 已修 |
| P4 | headless 截图永不结束 | 测试页 `setInterval` 拖住虚拟时间 | 已改为两次延时 |
| P5 | 反复"打补丁"导致锚点失配、页面不更新 | 用字符串 replace 改测试页 | 教训：整块重写 |
| P6 | `zoneFor` 的"显式 + 推导补缺" | 与源码 **全有或全无** 相反 | **未改** |
| P7 | `zoneB` 的 `gh` 写成 `s` | 源码推导槽只有 BOTTOM 重力 | **未改** |
| P8 | 缺 `computeScale()` 缩放 | 源码对每个 zone 乘 1.012 | **未改** |
| P9 | 曾尝试"无槽 → 退化为 `*`" | 会把 X1 放到**右侧**，与 JSesh 的"下方"不符 | 已否决 |
| P10 | 曾想用"全局系数/逐字修正" | 方案不普适，被用户否决 | 已放弃 |

---

## 四、当前实现状态

| 文件 | 内容 |
|---|---|
| `js/ui/glyphs.js` | `inkGrid`（Canvas 栅格，惰性 + 位图）、`deriveZones`（三槽 + 三套回退）、`zoneFor`（显式优先 + 推导补缺 ← 与源码不一致）、`overlapsInk` |
| `js/plugin/MdCRndr.js` | `renderLigature`（zone 缩放/定位、重叠外推、兜底并排）、`setQuadratMode` |
| `js/database/glyphZones.js` | 20 个符号的显式 zone1/zone2（**无 zone3**，与 F2 一致） |
| `CPlugin_Test/zhao.html` | 13 个样本 + A/B 变体 + I10 槽可视化 |

已提交的关键 commit：

```
407219c  槽2 按 computeThirdArea 精确实现（含 18 单位换算与两条对角线回退）
a248542  连字区网格改用 Canvas 栅格化（惰性 + 位图）
0952f3d  & 恢复走连字区（撤销"复用预定义坐标"），修掉 t&w 重叠
```

---

## 五、下一步（按可验证性排序）

1. **查 `ViewDrawer`/`MDCDrawingFacade` 的全局 y 变换** → 解开 Q1，决定 `zoneB` 的 y 语义；
2. **按 F1 改成"全有或全无"** → 移除我们"补缺"的推导（会改变 A17 的行为）；
3. **`zoneB` 的重力改 CENTER、补 `computeScale()`**；
4. **用 Java 单测或 JSesh 实测确认 Q2**（有显式区的字形 + afterGroup 是否越界）；
5. 用 `D&t / t&D / t&I10 / t&A17 / t&D37` 五组与 JSesh 截图逐格对照。

---

## 六、方法论教训（写给未来的自己）

1. **不要先假设再验证**：我先假设"缺槽就补"，于是只去验证它，漏掉了 `hasZones()` 的门控语义；
2. **读调用链，不要只读算法**：`LigatureZoneBuilder` 只是被调用者，`getLigatureZone` 与 `visitComplexLigature` 才是决定行为的地方；
3. **工具输出会截断**：多次 `Get-Content -First N` 把关键段落切掉了，应整段读或按方法名定位；
4. **区分"源码事实"与"我们的推论"**：本文第一节与第二、三节严格分开，避免把猜测当结论。
