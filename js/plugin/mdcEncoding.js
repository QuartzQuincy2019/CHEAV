/**
 * MdCRndr 编码/规范化模块（从 MdCRndr.js 拆出）：
 *   EM_SQUARE —— 设计单位基准（1000）
 *   isAliasKey / revGardiner / aliasCanonical / aliasCanonicalLower
 *   canonicalCode() / canonicalize() —— 把各种写法折算成规范 Gardiner 码
 * 依赖：js/database/mdcGlyphTables.js（GARDINER 表）
 */
(function (global) {
    "use strict";
    const MDC = global.MDC || (global.MDC = {});
    const GARDINER = (global.MDC_GLYPH_TABLES && global.MDC_GLYPH_TABLES.GARDINER) || {};

    const EM_SQUARE = 1000;

    function isAliasKey(key) {
      return key.charAt(0) === "J" || key === "Y1v";
    }
    const revGardiner = {};
    Object.keys(GARDINER).forEach(key => {
      if (isAliasKey(key)) return;
      revGardiner[GARDINER[key]] = key;
    });
    
    /**
     * 别名键 → 正式键名（J1 → AA1、J80 → Aa80、Y1v → Y1a）。
     * 由 revGardiner 反查得到，随表内容自动保持同步。
     */
    const aliasCanonical = {};
    const aliasCanonicalLower = {};
    Object.keys(GARDINER).forEach(key => {
      if (!isAliasKey(key)) return;
      const canon = revGardiner[GARDINER[key]];
      if (!canon) return;
      aliasCanonical[key] = canon;
      aliasCanonicalLower[key.toLowerCase()] = canon;
    });
    
    /**
     * 码的别名写法 → 正式写法（"J1" → "AA1"、"J80" → "Aa80"、"Y1v" → "Y1a"）。
     * 非别名或未收录者原样返回；大小写宽容（"j1c" → "AA1c"）。
     * @param {string} code
     * @returns {string}
     */
    function canonicalCode(code) {
      if (!code) return code;
      return aliasCanonical[code] || aliasCanonicalLower[String(code).toLowerCase()] || code;
    }
    
    /**
     * 把一串 MdC 中的别名码改写为正式写法（J… → AA…/Aa…、Y1v → Y1a）。
     * · 只改写码 token；"<...>" 文本区整体原样保留（含 "\>" 转义）；
     * · 其余分隔符（- : * { } ( ) $ 等）原样保留；
     * · 连字名 {…} 内的码同样改写（连字表按正式名登记）。
     * @param {string} text
     * @returns {string}
     */
    function canonicalize(text) {
      if (!text) return text;
      let out = "";
      let i = 0;
      while (i < text.length) {
        const ch = text[i];
        if (ch === "<") {
          let j = i + 1;
          let buf = "<";
          while (j < text.length) {
            if (text[j] === "\\" && j + 1 < text.length) { buf += text[j] + text[j + 1]; j += 2; continue; }
            buf += text[j];
            if (text[j] === ">") { j++; break; }
            j++;
          }
          out += buf;
          i = j;
          continue;
        }
        if (/[A-Za-z]/.test(ch)) {
          let j = i;
          while (j < text.length && /[A-Za-z0-9]/.test(text[j])) j++;
          out += canonicalCode(text.slice(i, j));
          i = j;
          continue;
        }
        out += ch;
        i++;
      }
      return out;
    }
    
        // 连字表：name -> Ligature 实例（见 semantics.js）

    MDC.EM_SQUARE = EM_SQUARE;
    MDC.revGardiner = revGardiner;
    MDC.aliasCanonical = aliasCanonical;
    MDC.aliasCanonicalLower = aliasCanonicalLower;
    MDC.canonicalCode = canonicalCode;
    MDC.canonicalize = canonicalize;
})(window);
