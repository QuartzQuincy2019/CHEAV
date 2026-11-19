# Dickson 词典（2006）识别与导入笔记

> 源文件：`E:\QKMansion\Documents\Garden\languages\埃及语\DicksonDictionary.pdf`
> 305 页 · 612×792 pt（US Letter）· OpenOffice.org 2.0 生成（2006-12-01）· 有文本层 + 矢量字形
> 许可：**CC BY-NC-SA 2.5**（署名 · 非商业 · 相同方式共享）——只能用于非商业用途，引用需署名，衍生数据同许可

---

## 1. 书籍结构（决定解析策略）

- 按 **Gardiner 分类顺序**编排（A 男人、D 人体部位、N 天空/土地…），页眉第二行即分类名（如 `D – Parts of Men`）；
- **双栏**排版，每栏一条条词条；
- 每条词条 = `字形块` + `[转写]` + `释义` + `{Gardiner 码}`：

```
   ▷ ◠        [Hrt] sky, heaven  {D2 X1 N1}
   ▬
```

- 文中 `H` = ḥ（`Hrt` = ḥrt），`a` = ꜣ，`A` = ʕ 等——是 AEL/传统转写写法。

## 2. 抽取管线（已在本机验证）

```powershell
# 1) 整本转文本（保留版面），每页之间是 \f
pdftotext -layout DicksonDictionary.pdf all.txt

# 2) 需要精确坐标时（词级 bbox，单位 pt，原点左上）
pdftotext -f 10 -l 10 -bbox DicksonDictionary.pdf p10.xml

# 3) 需要图像时（300 dpi 足够做证据图）
pdftoppm -f 10 -l 10 -r 300 -png -singlefile DicksonDictionary.pdf p10_300

# 4) 解析（Python）：按页切开 → 合并折行 → 正则
#    \[(?P<t>[^\[\]\n]{1,60})\]\s*(?P<g>(?:(?!\[)[^\n]){0,300}?)\{(?P<c>[^}\n]{0,160})\}
```

实测结果（本机 2026-11-17）：

| 指标 | 数值 |
|---|---|
| 可解析词条 | **7,926 条**（302 页有词条） |
| 码 token（过滤后） | 36,190 个；丢弃的版面噪声 8,945 个（`{S29`、`(of`、`the` 等） |
| **码可解析率** | **99.4%** 的词条全部码都能在 CHEAV `GARDINER` 表或 jsesh-js 字形索引里找到 |
| 部分可解析 / 完全失败 | 41 / 5 条 |
| 高频码 | X1(3,037) · N35(1,747) · M17(1,715) · D21(1,321) · G43(1,319) · S29(1,183) |

### 已定位的两个坑

1. **双栏同线**：左右两栏的词条可能落在同一文本行，直接按行正则会把两条粘在一起 → 用 `finditer` 逐段匹配，或按 x 坐标切栏。
2. **代码拼写两套**：Dickson 与 JSesh 用 `Aa1`、`N35A` 这类写法；CHEAV 的 `GARDINER` 用 `AA1`。导入前做一次规范化（`AA1 → Aa1` 或反之），否则会误判"缺字形"。
3. 另有一页含**人工/AI 追加的说明文字**（"This dictionary entry is for the infinitive verb pronounced…"，出现在第 4 页 `qAi` 条），解析时会污染 `gloss`，需要白名单/长度过滤。

## 3. 已做的识别示例

**p.10 右栏第 5 条**：

| 项 | 内容 |
|---|---|
| 转写 | `Hrt` = **ḥrt** |
| 释义 | sky, heaven（天空、天） |
| 字形 | **D2**（ḥr，脸）· **X1**（t，面包）· **N1**（pt，天空） |
| 排布 | 上层并置 `D2*X1`，下层 `N1` |
| MdC | **`D2*X1:N1`** |
| 验证 | jsesh-js 渲染 `D2*X1:N1`，字形与排布同书页一致 |
| 旁证 | 同页左栏还有变体 `[Hrt] sky, heaven {D2 D21 X1 N1}`（多一个 D21 口） |

定位方法：`pdftotext -bbox` 给出 `[Hrt]`/`sky,`/`{D2` 的 pt 坐标（x 340.3–489.6, y 203.2–216.9），再在 300 dpi 页图上找到字形区（x 314.2–331.0, y 197.2–213.8），两框叠加即得"词框"和"条目框"。

## 4. 接到 CHEAV 的词汇功能

建议的导入模型（与 `js/database/semantics.js` 对齐）：

```js
{
  translit: "Hrt",                 // 词典原文转写
  read: "ḥrt",                     // 规范转写（可选）
  meaning: { en: "sky, heaven", chs: "天空、天" },
  mdc: "D2*X1:N1",                 // 由 codes 生成
  codes: ["D2","X1","N1"],
  source: { book: "Dickson 2006", page: 10, column: 2, index: 5,
            bbox: [314.2, 197.2, 487.4, 216.4] }  // pt，供 UI 回链原页
}
```

UI 上可以做"点词 → 弹出词典原页裁片 + 红框"（本机已生成示例图），这套 bbox 已经随词条一起抽出来了。

### 4.1 MdC 的 "-" ":" "*" "&" —— 四开组语义（关键修正）

先前把印刷码用 `-` 直接连起来是**错的**。按 CHEAV 自己的定义（[README.md](README.md) §输入语法、
[js/plugin/mdcCadrat.js](js/plugin/mdcCadrat.js) 文件头语法、[js/plugin/MdCRndr.js](js/plugin/MdCRndr.js) `parseQuadrat`）：

| 符号 | 语义 | 出处 |
|---|---|---|
| `*` | **同一个四开组内并列**（同一层，HBox） | README："同一方块内并列 `W24*X1:N1`" |
| `:` | **同一四开组内下移一层**（verticalStack） | README："下移一层 `D21:N35`" |
| `-` | **四开组之间的横排**：每个 `-` = 一个新的 1em 方块 | README："方块之间的横排（竖叠组内不能用 `-`）" |
| `&` | **组内连字**（宿主 + 插入件合成一个字形），不是方块分隔符 | `ligature ::= ligAux AMP hieroglyph`（JSesh 文法）；CHEAV `t&G43&t` |

文法（mdcCadrat.js 文件头，严格照 JSesh `MDCParser.java`）：

```
mdcfile        ::= topitems                 // SEPARATOR = '-' | 空格
topitem        ::= cadrat                   // 一个四开组（1em 方块）
cadrat         ::= verticalStack
verticalStack  ::= horizontalList (COLON horizontalList)*
horizontalList ::= element (STAR element)*
```

**所以 `D2-X1-N1` 是三个方块并排，而书页里 `ḥrt` 是一个方块里两层**——字形对、版面错。
该书页字形块尺寸 17.4 × 16.7 pt ≈ 1em（A1 高 17.78），本身就证明它只占**一个**四开组。

### 4.2 由几何重建四开组（当前实现）

```
1. 同一词的字形按 x 区间重叠聚成列  → 每个列 = 一个 cadrat（1em 方块）
2. cadrat 内按 y 区间重叠分层      → 每层 = 一行
3. 层内按 x 排序、用 '*' 连接；层间用 ':'；cadrat 间用 '-'
```

六条抽样的结果（已用 jsesh-js 渲染对照书页，见 `dickson_quadrat_fix.png`）：

| 词条 | 印刷码 | 旧（线性，错） | 新（几何重建） | 与码序 |
|---|---|---|---|---|
| `ḥrt` sky | D2 X1 N1 | `D2-X1-N1` | **`D2*X1:N1`** | ✅ |
| `ḥr` face | D2 Z1 | `D2-Z1` | **`D2:Z1`** | ✅ |
| `ḥry` upper | D2 N1 | `D2-N1` | **`D2:N1`** | ✅ |
| `ḥr tp` | D2 Z1 D1 Z1 | `D2-Z1-D1-Z1` | **`D2:Z1-D1:Z1`** | ✅ |
| `ḥrtt` lump | D2 X1 X1 D12 | `D2-X1-X1-D12` | **`D2:X1-X1:D12`** | ✅ |
| `ḥrf` bread | D2 I9 X4 | `D2-I9-X4` | **`D2:I9-X4`** | ✅（作者确认；此前标"码序冲突"是我手工判错 cadrat 边界） |

> `ḥrf` 的书页读法：**脸(D2)在上、蛇(I9)在下，竖叠成一个方块；面包(X4)在右侧** →
> `D2:I9-X4`。注意 jsesh-js 里 `I9` = 角蝰（蛇），`X4` = 长条面包；渲染时标签与图必须同批生成，
> 否则会出现"图是 `D2:X4-I9`、标签写 `D2:I9-X4`"的错位（本次已修正）。
### 4.2.1 取块窗口与折行合并（2026-11-17 第二轮）

第一版用固定 `±7pt` 的块窗口，会把上/下一行的字形残片带进来；折行条目也只合并"紧邻上一行"，
导致条目漏检。现改为：

1. **先按栏合并折行**：同栏内，从"含 `[` 且不含 `}`"的条目头开始，把后续不含 `[` 的行按行距 <22pt 连续并进来
   （词条释义/码可能跨 2–3 行）；
2. **再按栏取块窗口**：上界＝与同栏上一条目行的中点，下界＝与下一条目行的中点；取字形 bbox 中心落窗者。
   这样相邻行的字形不会被吸进本条。

实测：

| 范围 | 词条 | 符号数=码数 | 比例 |
|---|---|---|---|
| p10 | 29 | 25 | 86% |
| p10–14 | 137 | 105 | 77% |
| p10–20 | 301 | 228 | 76% |
| p10–40（dump） | 867 | 671 auto / 190 manual-layout / 6 manual-amp | 77% auto |

六条已确认样本全部正确：`D2*X1:N1`、`D2:Z1`、`D2:N1`、`D2:Z1-D1:Z1`、`D2:X1-X1:D12`、`D2:I9-X4`。

| p10–305（全量 dump） | 8,279 | **6,389 auto** · 1,801 manual-layout · 89 manual-amp | 77.2% auto |

全量 dump 产物：`E:\QKMansion\CSX10\w\_dickson\pipeline\vocab-p10-305.json`（8,279 条，按页顺序）。
随机抽 6 条 auto（p40/120/200）渲染对照书页，字形顺序与排布一致（图：`dickson_auto_sample.png`）。
`--dump` 输出 `{page, translit, gloss, codes, mdc, status}`，`status` 三种：`auto`（可直接入库）、
`manual-layout`（字形数≠码数，需人工看）、`manual-amp`（`&` 候选，人工处理）。
### 4.3 `&`：明确不在自动转换范围内

`&` 只出现在少数词里（作者的例子：含 `G39` + `X1` 的词）。样本太少、不适合作为训练目标，
因此**按作者决定：不自动处理，改为「识别 + 标记 + 人工」**：

- `tools/dickson_mdc.py` 的 `amp_candidates()` 提供两个廉价信号：
  1. **几何嵌套**：两字形 bbox 交集 ≥ 较小者面积的 60%（典型的 `宿主&插入件`）；
  2. **已知组合**：码表里同时出现 `G39` 与 `X1`。
- 命中的词条写 `amp: true` + `amp_reason`，**不进入**自动生成的 `VOCABULARY`，排队人工处理；
- 未命中的词条照常输出几何重建的 MdC（`*` / `:` / `-`）。

`#`（覆盖）：**本词典未使用**（作者确认），不处理。仍待处理：相邻行字形混入分组（块窗口 ±7pt 会带进邻行残片）。

## 4.4 审核表（人工核对入口）

`tools/dickson_review.py` 生成 `review.html`：每条待处理词条一行——

| 列 | 内容 |
|---|---|
字形 | 书页字形块裁片（紧贴墨迹；个别条目本身印的是"码文本"，因为该字形缺失） |
转写/释义 | 词典原文 |
印刷码 | `{...}` 里的码，附"几何 n / 码 m" |
几何形状 | 例如 `2·1 \| 1` = 第一个方块两层（2 + 1），第二个方块一层 |
类型 | `版式待定`（signs≠codes）或 `& 候选` |
最终 MdC | 人工填写，`✓` 标记完成；进度存 localStorage |

用法：`python tools/dickson_review.py --pages 10-305`，输出到 `_dickson/review/`（裁片与 HTML 都不入库）。
## 5. 许可注意

- 词条文本与页面图像受 **CC BY-NC-SA 2.5** 约束：可用于非商业的 CHEAV 词库，需署名 "Paul Dickson, *Dictionary of Middle Egyptian* (2006)"，衍生数据同许可；
- **不要把页面截图或大批词条直接并入以 MIT 发布的仓库**——建议放独立的、标注 CC BY-NC-SA 的数据包，或运行时由用户本机 PDF 现场抽取；
- 页面上的字形是 Dickson 自绘/第三方字形，与 JSesh 字形条款无关，但同样不可当作字体素材再分发。

---

## 6. 状态与交接（2026-11-17）

### 已经站得住的

| 项 | 证据 |
|---|---|
| 词条结构 | 305 页、`[转写] 释义 {Gardiner 码}`，文本层可解析 |
| 词条抽取 | **7,926 条**（`dickson_entries.json`） |
| 码可解析率 | **99.4%**（过滤 8,945 个版面噪声 token 后，码全部能在 CHEAV `GARDINER` 或 jsesh-js 索引中找到） |
| 单条定位 | 第 10 页 `ḥrt`：词框 (314.2,197.2)–(331.0,213.8) pt，条目框到 x=487.4 pt（已出图核对） |
| MdC 生成（由印刷码） | 确定性：`codes.join("-")`；7,926 条全部可生成 |

### 还没验证、不能当结论的

| 项 | 现状 | 风险 |
|---|---|---|
| 矢量图 → 码 | 原型 `tools/dickson_mdc.py`：路径分组 + 印刷码弱标注 + 形状表 | 未达生产：p10 符号数/码数一致率 86%；train 10-24（219 条对齐）/ test 25-30：**符号准确率 42.0%、MdC 整串完全一致 2.8%** |
| 版面（行/列）推断 | 按垂直重叠分行，行内按 x 排序 | 与书页排布未必一致（`D2*X1:N1` 这类叠放可能被判成 `D2-X1-N1`） |
| 词条边界 | 双栏同线、折行条目依赖启发式合并 | 长释义/折行条目可能被拆开或与邻条粘连（7,926 这个数本身含此类误差） |
| 码→字形的对应 | Dickson 用 `Aa1`/`N35A` 写法，CHEAV 用 `AA1` | 需规范化表；否则误判缺字形 |

### 交接清单（文件都在本机）

| 文件 | 内容 |
|---|---|
| `tools/dickson_mdc.py` | 原型流水线：SVG 路径 → 符号分组 → 与印刷码对齐 → 形状表 + k-NN → MdC 组装 |
| `E:\QKMansion\CSX10\w\_dickson\dickson_entries.json` | 7,926 条词条（page / translit / gloss / codes） |
| `E:\QKMansion\CSX10\w\_dickson\dickson_audit_sheet.png` | 6 条抽样的人工核对表（左：书页字形，右：jsesh-js 渲染） |
| `E:\QKMansion\CSX10\w\_dickson\dickson_p10_word_box.png` | 第 10 页双框标注（词 / 条目） |
| `E:\QKMansion\CSX10\w\_dickson\dickson_entries.json` 的 `page` 字段 | 可回到 PDF 原页复核 |

### 建议的验收方式（人工 10 分钟可做）

1. 抽 20 条（跨 4–5 页，含长释义与折行条目）；
2. 每条检查三件事：码是否完整、MdC 渲染的字形是否与书页一致、排布是否可接受；
3. 把结果记成 `verified: true/false`，只有 `true` 的进 `VOCABULARY`；
4. 若"码完整"通过率 ≥ 95%，就可以先按**线性 MdC**（`-` 连接）建库——排布以后再补，不影响检索与显示。
