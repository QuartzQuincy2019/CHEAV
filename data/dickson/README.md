# data/dickson —— Dickson 词典派生词表

本目录**不是 MIT 代码**，而是 R. Dickson *Dictionary of Middle Egyptian*（2006）的
**派生数据**，按 **CC BY-NC-SA 2.5** 分发（署名 · 非商业性使用 · 相同方式共享）。
详见同目录 [`LICENSE`](LICENSE)。

## 文件

| 文件 | 说明 |
|---|---|
| `vocabulary-dickson.js` | 生成文件，勿手改：`[发音, MdC 渲染串, 英文释义, 页码]` 数组，共 7,747 条 |
| `LICENSE` | CC BY-NC-SA 2.5 许可声明与全文链接 |

`index.html` 在 `js/database/vocabulary.js` 之后加载本文件；加载时按 MdC 跳过已有词条，
页面启动后 `VOCABULARY` 从 227 条（项目自有）增至约 7,687 条。

## 生成方式

```bash
# 1) 从 DicksonDictionary.pdf 反推 MdC（仓库外工具，见 DICKSON_LOOKUP.md）
python tools/dickson_mdc.py --pages 10-305 --dump
# 2) 生成词表（默认输出到本目录）
python tools/gen_dickson_vocab.py
```

只收录几何与印刷码数自动对齐（`status=auto`）的词条，并按（发音, MdC）去重。
释义为词典英文原文摘录；中文释义留空。

## 署名与使用限制

- 数据来源：R. Dickson, *Dictionary of Middle Egyptian*, 2006。
- 许可：CC BY-NC-SA 2.5 <https://creativecommons.org/licenses/by-nc-sa/2.5/>。
- 再分发时必须保留署名、以相同许可共享，且不得用于商业目的。
- 项目代码（其余目录）仍为 MIT；两者边界以本目录为界。
