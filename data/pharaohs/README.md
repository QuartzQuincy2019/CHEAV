# data/pharaohs —— 王名检索索引

本目录是 [pharaoh.se](https://pharaoh.se/) 王表数据的**派生索引**，用于 CHEAV 的
「王名输入」功能：按英文朝代 / 姓名检索国王，再选择其五类王名变体。

## 文件

| 文件 | 说明 |
|---|---|
| `pharaohs.js` | 生成文件，勿手改。382 位国王：id、英文名、基名、序号、别名、王朝、时期、王位名、在位年代、王名变体数 |
| （仓库外）`pharaohs_all.json` | 完整的 2,333 条王名变体（类别 / 名称 / 转写 / 释义 / MdC），抓取自 pharaoh.se |

## 数据来源与许可

- 来源：Peter Lundström, **pharaoh.se** — <https://pharaoh.se/>；
- 许可：**CC BY 4.0**（署名 4.0 国际）。再分发或修改时请保留署名与许可链接；
- 原始出处：Kitchen, *Ramesside Inscriptions*；von Beckerath, *Handbuch der ägyptischen Königsnamen*；
  Leprohon, *The Great Name*；Petrie 等（见各国王页的 References）。

## 检索接口

`js/engine/pharaoh-match.js` 提供 `PharaohMatch`：

```js
PharaohMatch.search("Ramesses II");            // → [Ramesses-II]
PharaohMatch.search("Ramesses 3");             // → [Ramesses-III]（阿拉伯数字等价）
PharaohMatch.search("19th dynasty Ramesses");  // → 第十九王朝的 Ramesses
PharaohMatch.search("New Kingdom Thutmose");   // → 新王国的 Thutmose
PharaohMatch.search("Akhenaten");              // → Amenhotep IV（别名）
```

规则：

- 姓名可带罗马数字或阿拉伯数字（`II` = `2`），**II 与 III 严格区分**；
- 朝代写法：`19th dynasty`、`dynasty 19`、`Nineteenth Dynasty`；
- 时期写法：`New Kingdom`、`Middle Kingdom`、`Late Period`、`Ptolemaic`、`Roman` 等；
- 别名归一到本名：`Rameses`/`Ramses` → `Ramesses`，`Tuthmosis`/`Thutmosis` → `Thutmose`，
  `Akhenaten` → `Amenhotep IV`，`King Tut` → `Tutankhamun`；
- 不给数字时返回该名字的全部国王（如 `Ramesses` → 11 位），按王朝与顺序排序。
