# JSesh 排版层源码调查清单（首轮，32 点）

> 目的：把"复刻 JSesh"从连字扩展到**排版**全域。每条给出源码位置、规则、我们的现状。
> 状态：✅ 已实现/一致 ｜ ⚠️ 部分实现 ｜ ❌ 未实现 ｜ 🔍 待细读源码

## A. Cadrat（四开组）与行

| # | 规则 | 源码 | 我们的状态 |
|---|---|---|---|
| 1 | Cadrat 高度 = `max(内容高 + smallDim, maxCadratHeight + smallDim)`，**至少 1 em** | `Layout.visitCadrat` 389-431 | ✅ 2026-11-14：`.RenderLine{min-height:1em}`，行盒不再塌陷 |
| 2 | Cadrat 宽度 = `max(内容宽, maxCadratWidth)`（窄组补到 1 em） | `Layout.visitCadrat` 436-439 | ❌ 宽度随内容 |
| 3 | Cadrat 太高时整体 `reScale(maxCadratHeight / h)` 缩回 | `QuadratLayout` 193-195 | ❌ 无整体缩放 |
| 4 | 宽单字按宽度 `scaleToWidth` 填满行 | `QuadratLayout` 117-122, 211-228 | ❌ |
| 5 | 行高恒为 `maxCadratHeight`（换行 view 高度） | `Layout.visitLineBreak` 793-798 | ✅ 2026-11-14：`min-height:1em` 后实测行高恒 1.000em |
| 6 | `FULLSPACE` 高 = `maxCadratHeight`；`HALFSPACE` 高 = 一半 | `Layout.visitHieroglyph` 617-631 | ❌ 未区分占位符 |
| 7 | 空行/空 cadrat 也要占 1 em | 同 #5 | ❌ |

## B. 基线（Baseline）与垂直定位

| # | 规则 | 源码 | 我们的状态 |
|---|---|---|---|
| 8 | 行内基线 = `maxCadratHeight - alphabeticTextBaseline` | `Layout` 261-266 | 🔍 未核对 |
| 9 | 混合文字（拉丁字母）时按 `layout.getAscent()/getDescent()` 对齐 | `Layout` 252-266 | ❌ 我们直接底对齐 |
| 10 | 字形视图高度 = `bbox × computeScale()`，位置以**左上角**为锚（y 向下） | `Layout.visitHieroglyph` 661-677 | ✅ |
| 11 | `relativeSize != 100` → `reScale(size/100)` | `Layout.visitHieroglyph` 686-692 | ❌ `l` 修饰符未支持 |

## C. 连字（已实现部分，列在此处备查）

| # | 规则 | 源码 | 状态 |
|---|---|---|---|
| 12 | Tksesh `getPositions` 优先（按码序列查表，位置单位 1/1000 A1 高） | `SVGFontHieroglyphDrawer.getPositions` | ⚠️ 24 条，未逐条核对 |
| 13 | 两件：宿主 = 更高者（`h1*0.8 > h0`）；大部在前→底槽→右槽；在后→左槽 | `Layout.visitLigature` 739-773 | ✅ |
| 14 | 三件：中间为宿主，首→槽0、尾→槽1，**两槽缺一整组不放置** | 同上 774-787 | ✅ |
| 15 | 无槽 → 不放置（子视图留在原点） | 同上（无 else） | ✅ |
| 16 | `placeView`：`scaleToFitDimensions`（只缩不放）+ 重力 START/END/CENTER/TOP/BOTTOM | `Layout.placeView` 1006 | ✅ |
| 17 | 每次排版后 `fitToSubViews(true)`（整体平移回原点） | `Layout` 789 | ⚠️ 已实现，长串仍有偏差 |
| 18 | 部件数 ∉ {2,3} → 不放置 | `Layout` 739/774 | ✅ |

## D. Cartouche（王名圈）/ 框类

| # | 规则 | 源码 | 我们的状态 |
|---|---|---|---|
| 19 | 圈内高度 = `max(内容高 + smallDim, maxCadratHeight + smallDim)` | `Layout.visitCartouche` 404-431 | ❌ 我们按内容 |
| 20 | 圈内宽度不足时补到 `maxCadratWidth + smallDim` | 同上 436-439 | ❌ |
| 21 | 内容在圈内**水平居中**：`innerMargin = (W - subW)/2` | 同上 | ⚠️ 近似 |
| 22 | 圈内内容位置 = `(dLong, dSmall)`（分别对应长/短边方向的内边距） | 同上 | ❌ 未实现两向边距 |
| 23 | 竖排时圈的"长边"是垂直方向，边距方向要互换 | `Layout` 404-468 分支 | ❌ |
| 24 | `SubCadrat`（四分之一子格）单独缩放 | `Layout.visitSubCadrat` 841-870 | ❌ |
| 25 | `HBox` 内按 `maxWidth` 逐级 `scaleForMaxWidth` | `QuadratLayout` 103-108 | ❌ |

## E. 竖排（ColumnLayout）

| # | 规则 | 源码 | 我们的状态 |
|---|---|---|---|
| 26 | 竖排 = 列：`subView.setWidth(maxCadratWidth)`，行变成列 | `ColumnLayout` 193-194 | ❌ 无竖排布局 |
| 27 | 竖排时字形是否旋转 90° 由 `SignOrientation`/`isRotated` 决定 | 🔍 `Layout`/`Cadrats` 待细读 | 🔍 |
| 28 | 竖排列间距、列内垂直堆叠顺序 | `ColumnLayout` 全文 | ❌ |

## F. 其它排版要素

| # | 规则 | 源码 | 我们的状态 |
|---|---|---|---|
| 29 | `visitHRule`：横线占满 cadrat 宽度，高度固定 | `Layout` 697-708 | ❌ |
| 30 | `visitModifier` / `ModifiersList`：修饰符（如 `*`）附加在字形右上 | `Layout` 802-812 | ❌ |
| 31 | `visitOverwrite` / `visitPhilology`：叠加与斜体标记的定位 | `Layout` 812-841 | ❌ |
| 32 | `visitSuperScript`：上标尺寸 = `superScriptDimensions` | `Layout` 848-858 | ❌ |
| 33 | 页/行断点（`PageBreak`）与 `TabStop` 的宽度语义 | `Layout` 823-868 | ❌ |
| 34 | 绝对组 `AbsoluteGroup`（显式坐标） | `Layout.visitAbsoluteGroup` 233-252 | ❌ |

## 建议的实施顺序

1. **#1/#2/#5（cadrat 与行高）** —— 直接解决"矮字形上浮"与行距不一致；
2. **#3/#4（cadrat 缩放与宽字填满）**；
3. **#19–#22（王名圈）** —— 你已点名的区域；
4. **#26–#28（竖排）** —— 结构性最大，单独一轮；
5. **#8/#9（基线/混排）**、#29–#34（其它元素）。

## 待细读清单（下一轮）

- `ColumnLayout.java` 全文（竖排）
- `QuadratLayout.java` 全文（cadrat 缩放/宽字）
- `Layout.visitCartouche` 完整分支（含竖排差异）
- `JSeshGeometry`：`maxCadratWidth/Height`、`alphabeticTextBaseline` 的取值来源
- `MDCView`：`getMaximalHeightOfSubView`、`reScale`、`scaleToWidth` 的确切语义