# CHEAV — Cyrene's Hierograph Editor and Viewer

[English](README.en.md) · **简体中文**

在浏览器里输入、编辑与阅读古埃及圣书体文本的编辑器。纯静态前端：**无需构建、无需包管理器、无第三方运行时依赖**，打开 `index.html` 即可使用。

> **在线使用：<https://quartzquincy2019.github.io/CHEAV/>**
> （GitHub Pages，无需安装；本地使用见下）

- 版本：**1.0.0**（2025-12-27 起）
- 作者：**Quincy K. / Quartz Studio ©2019-2026**
- 渲染引擎为单文件插件 [`js/plugin/MdCRndr.js`](js/plugin/MdCRndr.js)，可独立嵌入其它项目

---

## 快速开始

**线上**：直接打开 <https://quartzquincy2019.github.io/CHEAV/>。

**本地**：

```text
1. 直接用浏览器打开 index.html      ← 最省事
2. 或起一个本地静态服务器（推荐，字体与样式更稳）：
     python -m http.server 8000
   然后访问 http://localhost:8000/
```

更新代码后请 **Ctrl+F5** 强制刷新（浏览器会缓存脚本与字体）。

在输入框里键入 `nfr` → 按 <kbd>Tab</kbd> 确认候选（写入 `F35`）→ 按 <kbd>Enter</kbd> 送入正文，下方即渲染出象形文字。

---

## 界面与操作

| 区域 | 作用 |
|---|---|
| **IB**（输入缓冲区） | 键入发音（`nfr`）、Gardiner 码（`F35`）或码序列；<kbd>Enter</kbd> 送正文 |
| **IB 预览** | 输入内容的实时渲染 + 规范化后的 MdC 串 |
| **VMBox** | 词汇与连字匹配（候选：发音 / 字形 / 码串 + 释义） |
| **PDMBox** | 音素（字母 → 单字符）；输入 `;` 后切换为定符 |
| **GMBox** | 按 Gardiner 码检索，大小写不敏感 |
| **正文** | 最终文本，只接受纯 MdC 渲染串 |
| **渲染区** | 正文的只读渲染结果 |
| **设置** | 键位、每页项数、功能开关（改动即时生效并记住） |

| 按键 | 作用（均可在设置中改绑） |
|---|---|
| <kbd>Alt</kbd> | 在三个候选区之间切换焦点（自动跳过无候选的框） |
| <kbd>Tab</kbd> | 确认当前候选，写入 IB |
| <kbd>Enter</kbd> | IB → 正文 |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>←</kbd> <kbd>→</kbd> | 选项间移动 / 翻页 |
| <kbd>Backspace</kbd> | IB 为空时直接删正文（无需切换焦点） |

文档不必离开编辑器：页脚的「使用说明」「开发者文档」会在**页内浮层**中打开（Esc、✕ 或点击空白处关闭）；index.html#doc=instructions、#doc=for_developers 是可直接分享的深链接。

---

## 输入语法（MdC 渲染子集）

| 写法 | 含义 | 示例 |
|---|---|---|
| `N35` | Gardiner 码 → 单字符 | `N35` |
| `1313F` | 十六进制码位（U+13000–U+143FF） | `1313F` |
| `*` | 同一方块内并列 | `W24*X1:N1` |
| `:` | 下移一层（竖叠） | `D21:N35` |
| `-` | 方块之间的横排（竖叠组内不能用 `-`） | `D58-G43` |
| `{名称}` | 连字引用 | `{I10-D46}` |
| `<文本>` | 插入文本 | `F35-<good>` |
| `$` | 手动换行 | `D21-$-D46` |

说明：

- 堆叠组（VRG）采用词典式缩放：符号只缩不放大，超出 1 em 方块时整体等比缩小。
- `J…` 是 `AA…`/`Aa…` 组的等价简写（`J1` ≡ `AA1`、`J80` ≡ `Aa80`），写入正文时自动规范化为 `AA…`/`Aa…`。
- 字体缺失的码（如 `S95`、`A133a`）**不算错误**：渲染为方块占位并显示码名，占据应在的位置。
- 真正非法的只有"不是码的串"（如发音 `nfr`、定符名 `;eye` 直接写进正文）与未闭合的括号。

---

## 功能一览

- **三路匹配**：词汇/连字、音素/定符、Gardiner 码；候选按吻合度排序，分页显示
- **主字符隐式转换（PIC）**：音频片段自动换为主字符码（`nfr` → `F35`），可关闭
- **连字**：2–3 个字符按固定相对位置合并为一个方块，几何数据在插件内
- **词汇变体**：互为变体的词条**共享同一释义对象**，改一处即全族同步
- **设置面板**：键位改绑、VM 每页项数（1–9）、PIC 开关、按键展示开关（插件存在时才显示）、恢复默认
- **按键展示**：录屏演示用的半透明浮层（最近按键历史 + 当前组合），可独立嵌入。**该插件仅本地保留，不随仓库分发**；缺失时应用与设置面板自动跳过此功能
- **警戒与容错**：非法片段亮警戒色并中止渲染（保留上次画面），不产生半成品

---

## 目录结构

```text
CHEAV/
├─ index.html               编辑器主页面（18 个脚本，纯 <script> 顺序加载）
├─ instructions.html        使用者文档
├─ for_developers.html      开发者文档（MdCRndr 外部接口）
├─ README.en.md             英文 README
├─ LICENSE                  MIT（项目自有代码与文档）
├─ NOTICE.md                第三方组件与数据来源声明（含 Unicode 许可全文）
├─ fonts/
│   ├─ NewGardiner.ttf      OFL 1.1 授权字体
│   └─ OFL.txt              字体许可全文
├─ css/general.css          界面样式（渲染样式由插件注入）
├─ lib/visumetrics.js       兼容层：度量表绑定
├─ js/
│   ├─ plugin/
│   │   ├─ MdCRndr.js       渲染引擎插件（单文件零依赖：解析 / 渲染 / 码表 / 度量）
│   │   └─ keycast.js       按键展示插件（单文件零依赖；.gitignore 排除，不随仓库分发）
│   ├─ database/            数据与语义层（词汇、音素、定符、连字、文案、设置）
│   ├─ engine/              引擎层（兼容层、PIC、匹配）
│   └─ ui/                   UI 集成（apply.js 五模块状态机、docs.js 文档内嵌浮层）
├─ tools/entries.js         词条维护命令行工具（查询 / 添加 / 修改）
└─ CPlugin_Test/index.html  渲染插件测试台（只依赖插件）
```

> **开发期资料与本地备份不随仓库分发**：Unicode 源数据（`Unikemet.txt`）、签名↔码位对照表、截图，
> 字形度量提取脚本（`g.py`、`gen_metrics.py`）与生成的 `visumetrics.json`，以及本地历史备份目录
> `backup/`，均已移至仓库外的 `..\_tem_dd\cheav\`（其中 `README.md` 说明了各项用途与授权）。
> 运行时不需要这些文件——度量与码表已内联在 [`js/plugin/MdCRndr.js`](js/plugin/MdCRndr.js) 中。

---

## 渲染引擎插件（可独立使用）

`js/plugin/MdCRndr.js` 是一个**单文件、零依赖**的 MdC 渲染引擎，自带字体注册与所需样式，
可直接拷进任意网页项目：

```html
<script src="js/plugin/MdCRndr.js"></script>
<script>
  MdCRndr.init({ fontUrl: "fonts/NewGardiner.ttf" });
  MdCRndr.renderText(document.getElementById("out"), "S34-N35:AA1");
</script>
```

完整接口（`init` / `set` / `config` / `parse` / `render` / `renderText` / `splitLines` /
`charOf` / `codeOf` / `canonicalize` / `defineLigature` / `internals` 等）见
[for_developers.html](for_developers.html)；独立演示见 [CPlugin_Test/index.html](CPlugin_Test/index.html)。

---

## 词条维护

```bash
node tools/entries.js "/s -v /p anx"                    # 查询：发音含 anx 的词汇
node tools/entries.js "/a -p -prim /p a /g D36"          # 添加：音素 a 的主码设为 D36（已是主码则报"未改动"）
node tools/entries.js "/m -v /bf /r -e S34-N35:AA1 /ef /m -en \"live, life\" -chs \"生活，生命\""  # 修改释义
node tools/entries.js                                    # 交互模式（:h 帮助）
```

自动处理排序（词汇按 MdC 自然序、定符按 Gardiner 码自然序、音素按首字母分组）、
写盘前自动备份、写盘后重新载入复核。

备份位置默认为仓库内的 `backup/`（已列入 `.gitignore`，不会进版本库）；
若希望备份落在仓库外，设置环境变量即可：

```bash
CHEAV_BACKUP_DIR=../_tem_dd/cheav/backup  node tools/entries.js "/s -v /p anx"
```

---

## 运行环境

| 用途 | 要求 |
|---|---|
| 使用编辑器 | 支持 ES2017+ 的现代浏览器（Chrome / Edge / Firefox / Safari 近期版本），**无需安装任何东西** |
| 词条维护 CLI | Node.js ≥ 16（无第三方依赖） |
| 重新生成度量数据 | Python 3 + [fontTools](https://github.com/fonttools/fonttools)；脚本 `gen_metrics.py` / `g.py` 与数据 `visumetrics.json` 不随仓库分发，见上文说明 |

---

## 授权

| 内容 | 许可 |
|---|---|
| 本项目代码与文档（`index.html`、`js/`、`lib/`、`css/`、`tools/` 等） | **MIT**，见 [LICENSE](LICENSE) |
| 字体 `NewGardiner.ttf` 及由其提取的字形度量数据 | **SIL OFL 1.1**（© Mark-Jan Nederhof, University of St Andrews），见 [fonts/OFL.txt](fonts/OFL.txt) |
| Gardiner 码表、扩展区映射等由 Unicode 数据生成的内容 | **Unicode License V3**（© Unicode, Inc.），全文见 [NOTICE.md](NOTICE.md) |

本仓库**不包含** JSesh 的字形素材（其授权不允许用于其它圣书体文字处理器）、Unicode 码表 PDF
（禁止公开分发），以及开发期用的 Unicode 源数据与度量脚本（已移至仓库外）。详见 [NOTICE.md](NOTICE.md)。

---

## 现状与限制

- 字体为 **NewGardiner v3.06**，覆盖基础区 1071 字与扩展区 core 符号（Unicode 16 的 3995 个中约 3427 个）；
  其余 **568 个 non-core 符号无字形**，在正文中显示为占位方块。
- 扩展区符号没有 Gardiner 编号，按 Unicode 码位（`13460`–`143FF`）或 UniKemet 规范编号（如 `A1d`）引用；
  JSesh 式扩展签名（如 `F35A`）也已登记。
- 词库英文释义中 24 条长条目体例接近词典，公开分发前建议核对来源（见 NOTICE.md 第六节）。

---

## 鸣谢

- **NewGardiner** 字体与字形数据 — Mark-Jan Nederhof（University of St Andrews），OFL 1.1
- **Unicode / Unikemet（UAX #57）** — Unicode, Inc.
- 本项目为独立实现，未包含 JSesh 的字形素材；向 JSesh 与 Serge Rosmorduc 在圣书体排版领域的开创性工作致意
