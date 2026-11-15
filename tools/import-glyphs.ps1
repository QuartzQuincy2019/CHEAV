<#
  从 JSesh 安装目录里的 jseshGlyphs-*.jar 补齐缺失的字形 SVG。

  背景：glyfs/jseshGlyphs/ 是从某一版 jseshGlyphs jar 解压出来的，
        但那一版缺了若干码的 SVG（例如 N37、Z3、Z8、Z9、Aa8…Aa12、
        Ff1、L6、M41、N20、N22、N33、N41、O50）。这些码在 JSesh 里能正常
        显示，在 CHEAV 里却会退化，所以要从用户实际使用的 jar 里补回来。

  用法：
      pwsh tools/import-glyphs.ps1 -Jar "C:\Program Files\JSesh\lib\jseshGlyphs-7.6.jar"

  参数：
      -Jar       jseshGlyphs 的 jar 路径（必填）
      -DryRun    只列出会复制哪些文件，不实际写入
      -NoMetrics 复制后不重跑 tools/svg-bbox.js

  流程：
      1. 把 jar 当 zip 展开到临时目录；
      2. 遍历其中 jseshGlyphs/*.svg，凡目标目录里没有的，复制过去；
      3. （默认）重跑 tools/svg-bbox.js 重新生成 js/database/svgBoxes.js；
      4. 打印「新增了哪些 / 仍然缺哪些」。
#>
param(
    [Parameter(Mandatory = $true)][string]$Jar,
    [switch]$DryRun,
    [switch]$NoMetrics
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot          # 仓库根
$glyphDir = Join-Path $root "glyfs\jseshGlyphs"

if (-not (Test-Path -LiteralPath $Jar)) { throw "找不到 jar：$Jar" }
if (-not (Test-Path -LiteralPath $glyphDir)) { throw "找不到字形目录：$glyphDir" }

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("jseshglyphs-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
    $zip = Join-Path $tmp "glyphs.zip"
    Copy-Item -LiteralPath $Jar -Destination $zip
    $unzip = Join-Path $tmp "x"
    Expand-Archive -LiteralPath $zip -DestinationPath $unzip -Force

    $srcDirs = Get-ChildItem -Path $unzip -Recurse -Directory -Filter jseshGlyphs -ErrorAction SilentlyContinue |
               Where-Object { (Get-ChildItem -Path $_.FullName -Filter *.svg -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0 }
    if (-not $srcDirs) { throw "jar 里没有找到 jseshGlyphs/*.svg" }

    $existing = @{}
    Get-ChildItem -LiteralPath $glyphDir -Filter *.svg -File | ForEach-Object { $existing[$_.Name.ToLower()] = $true }

    $added = @()
    foreach ($d in $srcDirs) {
        foreach ($f in Get-ChildItem -LiteralPath $d.FullName -Filter *.svg -File) {
            if ($existing.ContainsKey($f.Name.ToLower())) { continue }
            $added += $f.Name
            if (-not $DryRun) { Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $glyphDir $f.Name) }
        }
    }

    Write-Host ("新增字形 {0} 个{1}" -f $added.Count, $(if ($DryRun) { "（DryRun，未写入）" } else { "" }))
    if ($added.Count) { Write-Host ("  " + (($added | Sort-Object) -join " ")) }

    if (-not $DryRun -and -not $NoMetrics -and $added.Count) {
        Write-Host "重新生成度量表 js/database/svgBoxes.js …"
        & node (Join-Path $root "tools\svg-bbox.js")
    }

    # 仍然缺的码（与 basicGardinerCodes 对齐由 svg-bbox 打印，这里只做存在性检查）
    $still = @("Aa8","Aa9","Aa10","Aa11","Aa12","L6","M41","N20","N22","N33","N41","O50","Z3","Z8","Z9","Ff1") |
             Where-Object { -not (Test-Path -LiteralPath (Join-Path $glyphDir "$_.svg")) }
    if ($still) { Write-Host ("仍然缺：" + ($still -join " ")) } else { Write-Host "16 个已知缺口已全部补齐。" }
}
finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
