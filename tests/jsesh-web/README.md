# jsesh-js 完整性测试台

`completeness.html` 在一个页面里加载上游 JS 移植 **jsesh-js**，跑 80+ 条断言（导出面、字形数据、解析、渲染、排版变体、自定义元素、错误行为、真实 `.gly` 文档），把结果写成 `#result` 里的 JSON，并把标题置为 `DONE`。

## 复现

1. 下载官方 zip：<https://files.qenherkhopeshef.org/jsesh-web/jsesh-web-0.2.0.zip>（11 MB，解压约 24 MB）
2. 解压到这里，使目录结构为：

```
tests/jsesh-web/
├─ completeness.html        ← 本测试台
├─ jsesh/jsesh.js           ← 从 zip 复制
├─ jsesh/data/              ← 从 zip 复制（6,963 个字形 JSON + index + 字体）
└─ samples/                 ← 从本机 JSesh 安装的 texts/ 里复制若干 .gly（仅本地测试用）
```

3. 起本地静态服务（不能 `file://` 打开）：

```bash
python -m http.server 8123 --directory tests/jsesh-web
# 打开 http://127.0.0.1:8123/completeness.html
```

4. 无头浏览器取结果（Windows 自带 Edge 即可）：

```powershell
& "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu `
  --virtual-time-budget=120000 --dump-dom "http://127.0.0.1:8123/completeness.html" > dom.html
# 结果在 <script type="application/json" id="result"> 里
```

## 注意

- `jsesh/`（24 MB 字形数据）与 `samples/`（JSesh 文献，许可不明）**不入库**，见同目录 `.gitignore`。
- 字形数据与字体的分发受 JSesh 字体条款约束（见 `../../NOTICE.md`、`../../JSESH_STUDY.md` §7），只做本地测试。
- 测试结论见 [`../../JSESH_JS_TEST.md`](../../JSESH_JS_TEST.md)。
