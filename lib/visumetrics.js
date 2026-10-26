// lib/visumetrics.js - 兼容层：视觉度量数据现由渲染引擎插件提供
//
// 数据本体（自动生成，勿手改）已内联进 js/plugin/MdCRndr.js：
//   EM_SQUARE / visuHeight / visuWidth
// 本文件仅把插件的导出绑定回原有全局名，供本项目的既有模块沿用。
// 键格式：x + 小写十六进制 Unicode 码点；单位：字体设计单位（EM = 1000）
// visuHeight = 墨迹高度（bbox 高）；visuWidth = 墨迹宽度（bbox 宽）
//
// 来源与授权：由 NewGardiner.ttf 提取（gen_metrics.py / g.py，脚本与 visumetrics.json 不随仓库分发）
//   © Mark-Jan Nederhof（University of St Andrews）—— SIL OFL 1.1，见 fonts/OFL.txt

const EM_SQUARE = MdCRndr.EM_SQUARE;
const visuHeight = MdCRndr.visuHeight;
const visuWidth = MdCRndr.visuWidth;
