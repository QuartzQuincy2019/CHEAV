// engine/core.js - 兼容层：输入模式检测与码名规范化由渲染引擎插件 MdCRndr 提供
//
// 输入模式（detectInputMode）：
//   "Gardiner"  开头 1-2 个字母（首字母大写）+ 数字 + 变体/扩展后缀（F35A、Aa80、J1…）
//   "Hex"       圣书体区码点：13xxx 或 14[0-3]xxx（U+13000 ~ U+143FF）
//   "Default"   其它
// 别名规范化（canonicalize / canonicalCode）：
//   规范名是 AA…／Aa…（Unicode AA 组），J… 只是等价简写；Y1v ≡ Y1a。
//   写入正文前一律换成正式名：J1 → AA1、J80 → Aa80、Y1v → Y1a。
// 实现见 js/plugin/MdCRndr.js。

const detectInputMode = MdCRndr.detectInputMode;
const canonicalCode = MdCRndr.canonicalCode;   // 单码：J1 → AA1
const canonicalize = MdCRndr.canonicalize;     // 整串（跳过 "<...>" 文本区）
