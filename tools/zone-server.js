/*
 * tools/zone-server.js
 *
 * 静态服务器 + 结果回收器，供 tools/gen-zones.html 使用。
 *
 *   node tools/zone-server.js [port]
 *
 * · 静态文件：以仓库根目录为根（默认 http://127.0.0.1:8012/）
 * · POST /save?name=part-01  body=JSON → 写入 tools/_zones/part-01.json
 *
 * 只用于离线生成字形数据，不参与运行时。
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, "_zones");
const port = parseInt(process.argv[2] || "8012", 10);

fs.mkdirSync(outDir, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".jpg": "image/jpeg"
};

const server = http.createServer(function (req, res) {
  const u = new URL(req.url, "http://127.0.0.1");

  if (req.method === "POST" && u.pathname === "/save") {
    let body = "";
    req.on("data", function (c) { body += c; });
    req.on("end", function () {
      const name = (u.searchParams.get("name") || "part").replace(/[^\w.-]/g, "_");
      const file = path.join(outDir, name + ".json");
      fs.writeFileSync(file, body, "utf8");
      console.log("saved " + path.basename(file) + "  " + body.length + " chars");
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok " + body.length);
    });
    return;
  }

  if (req.method === "POST" && u.pathname === "/log") {
    let body = "";
    req.on("data", function (c) { body += c; });
    req.on("end", function () { console.log("[page] " + body); res.end("ok"); });
    return;
  }

  let p = decodeURIComponent(u.pathname);
  if (p === "/") p = "/index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); res.end("forbidden"); return; }

  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end("not found: " + p); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", function () {
  console.log("zone-server: http://127.0.0.1:" + port + "/tools/gen-zones.html");
  console.log("输出目录: " + outDir);
});
