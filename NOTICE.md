# NOTICE — 第三方组件与数据来源

CHEAV（*Cyrene's Hierograph Editor and Viewer*）本体代码与文档的许可见 [`LICENSE`](LICENSE)。
本文件列出随项目分发或用于生成数据的**第三方资产**、其版权归属与许可条件。

---

## 一、随项目分发的第三方资产

| 资产 | 位置 | 版权 / 来源 | 许可 |
|---|---|---|---|
| **NewGardiner.ttf** v3.06（2025-12-21） | `fonts/NewGardiner.ttf` | © Mark-Jan Nederhof（University of St Andrews）<br>分发页 <https://github.com/nederhof/newgardiner> | **SIL Open Font License 1.1**<br>全文见 [`fonts/OFL.txt`](fonts/OFL.txt) |
| 字形度量数据<br>`visuHeight` / `visuWidth` | `js/plugin/MdCRndr.js`（内嵌）<br>`lib/visumetrics.js`（绑定） | 由上述字体提取（提取脚本与 `visumetrics.json` 不随仓库分发） | 同上（OFL 1.1 授权范围内的字体衍生物） |
| Gardiner 码表（基础区）<br>`GARDINER` / `revGardiner` | `js/plugin/MdCRndr.js`（内嵌）<br>`js/database/GardinerCode.js` | 由 Unicode 字符名（UnicodeData）整理 | **Unicode License V3**（全文见第三节） |
| 扩展区映射（A 区 + J 组别名） | `js/plugin/MdCRndr.js`（内嵌 `GARDINER` 扩展区段） | 由 **Unikemet**（Unicode 18.0, UAX #57）的 `kEH_JSesh` / `kEH_UniK` 字段生成 | 同上 |

Unicode 源数据（`Unikemet.txt`）与由其生成的对照表（`jsesh-unicode-map.json`）仅用于开发期生成上述
码表，**不随本仓库分发**（现存放于仓库外 `..\_tem_dd\cheav\`）；其版权与许可同第三节。

字体的使用说明：

- 字体以**未修改**的原样形式分发（版本 3.06）。OFL 允许嵌入、随软件分发与修改；
  若将来修改字体，须注意 OFL 第 3 条（保留字体名）与第 5 条（衍生字体须仍在 OFL 下分发）。
- OFL 第 1 条禁止**单独出售**字体本身；把字体随本应用一起分发是允许的。

---

## 二、明确**未**包含的第三方素材

以下素材**不属于**本仓库的分发内容（均存放于仓库外 `..\..\_external_CHEAV\`，
原因见该目录的 `README.md`）：

| 素材 | 原因 |
|---|---|
| JSesh 字形 SVG（6944 个，源自 `rosmord/jsesh`） | JSesh 字体图纸由 Serge J.-P. Thomas 绘制，其条款明确不允许用于"其它圣书体文字处理器"；且目录内许可混杂（含 GPL-2.0 197 个、CC-BY-NC-ND/NC 7 个） |
| Unicode 码表 PDF `U13460.pdf` | Unicode 官方码表条款仅允许个人/内部使用，禁止公开分发 |

另：开发期用的 Unicode 源数据（`Unikemet.txt`）、对照表与字形度量脚本/数据（`g.py`、`gen_metrics.py`、
`visumetrics.json`）也不在仓库内，存放于 `..\_tem_dd\cheav\`；它们对运行时不必要（数据已内联进插件）。

替代做法：字体用 OFL 的 NewGardiner 即可；Unicode 码表请在线引用
<https://www.unicode.org/charts/PDF/U13460.pdf>，机器可读数据用
<https://www.unicode.org/Public/18.0.0/ucd/Unikemet.txt>。

---

## 三、UNICODE LICENSE V3（全文）

来源：<https://www.unicode.org/license.txt>

```
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.
```

---

## 四、SIL OPEN FONT LICENSE 1.1

字体 `fonts/NewGardiner.ttf` 依 SIL OFL 1.1 分发（原文随附于
[`fonts/OFL.txt`](fonts/OFL.txt)，正文与 <https://openfontlicense.org> 发布文本逐字一致）。

---

## 五、代码与运行环境

- 仓库内全部 JavaScript / CSS / HTML 均为本项目自有代码，**不含任何第三方库**；
  页面不引用任何外部 CDN、远程字体或统计脚本。
- 渲染引擎 `js/plugin/MdCRndr.js` 与按键展示插件 `js/plugin/keycast.js` 均为单文件零依赖实现。

## 六、数据说明

- 词条释义中的**中文部分**为项目作者撰写。
- 词条释义中的**英文部分**（尤其 24 条长度超过 60 字符、按义项分组的长释义）体例接近
  埃及学词典条目。若这些英文释义系成批摘录自受版权保护的词典（如 Faulkner *A Concise
  Dictionary of Middle Egyptian*、*Wörterbuch der ägyptischen Sprache* 等），
  在公开分发前应核对来源，必要时改写或取得许可。
- 定符名称（`js/database/determinatives.js`）为简短的检索用标签。

---

*本文件最后更新：2026-10-25（CHEAV 合规整改第 3 项）。*
