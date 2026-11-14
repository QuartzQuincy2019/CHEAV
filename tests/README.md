# tests/ —— 开发期测试页与探针页

## tests/probes/

一次性诊断页（`_aa*.html`、`_enc*.html`、`_x*.html`、`_tk*.html` …），
原本散在仓库根目录，2026-11-14 统一收进这里。

约定：

- 每个文件开头都插了一行 `<base href="../../">`。
  这样探针里的 `js/…`、`glyfs/…`、`index.html` 仍然相对**仓库根**解析，
  挪进子目录后不必逐个改路径。
- 这些是**草稿**，不入版本库（`.gitignore` 里的 `_*.html` 仍然生效）。
  需要长期保留的用例请写进 `regression.html` 或 `tks.html`。
- 多数探针需要 http 环境（`python -m http.server 8011`），
  访问 `http://127.0.0.1:8011/tests/probes/xxx.html`；
  `file://` 下 SVG 目录会被同源策略拦住。

| 文件 | 用途 |
|---|---|
| `_enc*.html` | 王名圈几何/度量（框尺寸、框内四开组、缩放链） |
| `_aa*.html` | Aa1 / viewBox / SVG 墨迹盒与 `<g transform>` 问题 |
| `_x*.html` | 音素 x → Aa1 的解析与渲染 |
| `_tk*.html` | Tksesh 预定义连字的中间试验（正式测试台见根目录 `tks.html`） |

## tests/pages/

较早的诊断页，仍纳入版本库（属于 lib 级的正式文件，只是平时不用）：

| 文件 | 用途 |
|---|---|
| `ligature-matrix.html` | 连字矩阵：逐条打印连字分区、包围盒与实测尺寸 |
| `zones-audit.html` | 连字区（zone）表审计 |
| `jseth-zone-diag.html` | JSesh SVG 槽位与我们的推导结果对照 |
| `diagnose-A138.html` | A138 字形问题定位 |
| `inspect.html` | 通用字形/SVG 检查器 |

## 正式页面（仍在仓库根）

`index.html`（编辑器）、`regression.html`（回归，13/13 判据）、
`tks.html`（Tksesh 测试台）、`instructions.html`（使用说明）、
`for_developers.html`（开发者文档）。
