// engine/parser.js - 兼容层：输入语法解析现由插件 MdCRndr 提供
//
// 输入语法（渲染码，JSesh 风格）：
//   *            同一四开组内并列（横排）
//   :            下移一层（竖叠）；相邻的 * / : 串构成一个四开组（VRG）
//   -            四开组之间的横排（VRG 内不允许）
//   { }          连字引用（名字内 : 与 * 归一化为 -）；( ) 词（内部按普通序列展开）
//   < >          插入文本（"\<"、"\>" 转义；内部保留空白）
//   $            手动换行（splitLines 据此分段）
//   空格         忽略（<> 文本区内保留）
//   括号严格配对：{ }、( )、< > 异种或缺失即计入 invalid（警戒反馈）
//
// 主要接口：
//   parseInput(text) -> { tree, invalid }   树 + 无法识别的串列表（警戒反馈）
//   splitLines(tree) -> [seq, ...]          按 "$" 切分为渲染段

const parseInput = MdCRndr.parse;
const splitLines = MdCRndr.splitLines;
