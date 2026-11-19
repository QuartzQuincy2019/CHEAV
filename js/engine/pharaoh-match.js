// pharaoh-match.js —— 王名检索：英文「朝代 / 姓名」，区分 Ramesses II 与 III
//
// 设计要点：
//   · 姓名可带罗马数字（II、III）或阿拉伯数字（2、3），两者等价；
//   · 朝代可写 "19th dynasty"、"dynasty 19"、"Nineteenth Dynasty"、"新王国/New Kingdom"；
//   · 别名归一到本名（Rameses/Ramses → Ramesses，Tuthmosis → Thutmose，Akhenaten → Amenhotep IV 等）；
//   · 先精确匹配整名/整别名，退化为基名匹配；无数字时返回该名字的全部国王（按王朝/顺序排序）。
//
// 依赖：data/pharaohs/pharaohs.js（window.PHARAOHS）
// 用法：PharaohMatch.search("Ramesses II")
//       PharaohMatch.search("19th dynasty Ramesses")
//       PharaohMatch.search("New Kingdom Thutmose")

(function (global) {
    "use strict";

    var ORD = {
        "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6,
        "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10, "eleventh": 11, "twelfth": 12,
        "thirteenth": 13, "fourteenth": 14, "fifteenth": 15, "sixteenth": 16,
        "seventeenth": 17, "eighteenth": 18, "nineteenth": 19, "twentieth": 20,
        "twenty-first": 21, "twenty-second": 22, "twenty-third": 23, "twenty-fourth": 24,
        "twenty-fifth": 25, "twenty-sixth": 26, "twenty-seventh": 27, "twenty-eighth": 28,
        "twenty-ninth": 29, "thirtieth": 30, "thirty-first": 31
    };
    var ROMAN = {
        "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8,
        "ix": 9, "x": 10, "xi": 11, "xii": 12, "xiii": 13, "xiv": 14, "xv": 15,
        "xvi": 16, "xvii": 17, "xviii": 18, "xix": 19, "xx": 20
    };
    var PERIODS = [
        "predynastic", "early dynastic", "old kingdom", "first intermediate",
        "middle kingdom", "second intermediate", "new kingdom", "third intermediate",
        "late period", "ptolemaic", "roman", "argead", "unplaced"
    ];

    /** 归一化：小写、去变音、标点变空格。 */
    function norm(s) {
        return String(s == null ? "" : s)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function toRoman(n) {
        var map = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
        var out = "";
        for (var i = 0; i < map.length; i++) {
            while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
        }
        return out;
    }

    /** 末尾数字（罗马或阿拉伯）→ { name, num }。 */
    function splitNumeral(text) {
        var t = String(text || "").trim();
        var m = /^(.*?)\s+([IVXivx]+|\d{1,2})$/.exec(t);
        if (!m) return { name: t, num: 0 };
        var tail = m[2];
        var n = /^\d+$/.test(tail) ? parseInt(tail, 10) : (ROMAN[tail.toLowerCase()] || 0);
        if (!n) return { name: t, num: 0 };
        return { name: m[1].trim(), num: n };
    }

    /** 解析朝代/时期片段。 */
    function parseScope(q) {
        var s = " " + norm(q) + " ";
        var scope = { dyn: 0, period: "", rest: q };
        var m;
        // 19th dynasty / 19 dynasty / dynasty 19 / dynasty xix
        m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+dynasty\b/.exec(s);
        if (m) { scope.dyn = parseInt(m[1], 10); s = s.replace(m[0], " "); }
        else if ((m = /\bdynasty\s+(\d{1,2})\b/.exec(s))) { scope.dyn = parseInt(m[1], 10); s = s.replace(m[0], " "); }
        else if ((m = /\bdynasty\s+([ivx]+)\b/.exec(s))) { scope.dyn = ROMAN[m[1]] || 0; s = s.replace(m[0], " "); }
        else {
            // nineteenth dynasty
            for (var w in ORD) {
                var re = new RegExp("\\b" + w + "\\s+dynasty\\b");
                if (re.test(s)) { scope.dyn = ORD[w]; s = s.replace(re, " "); break; }
            }
        }
        // 时期名
        for (var i = 0; i < PERIODS.length; i++) {
            var p = PERIODS[i];
            var rp = new RegExp("\\b" + p.replace(/ /g, "\\s+") + "\\b");
            if (rp.test(s)) { scope.period = p; s = s.replace(rp, " "); break; }
        }
        scope.rest = s.replace(/\s+/g, " ").trim();
        return scope;
    }

    var KINGS = null;
    var ALIAS_BASE = null;   // "ramses" -> "ramesses"
    var BY_BASE = null;      // "ramesses" -> [kings]

    function init() {
        if (KINGS) return;
        KINGS = (global.PHARAOHS || []).slice();
        ALIAS_BASE = Object.create(null);
        BY_BASE = Object.create(null);
        for (var i = 0; i < KINGS.length; i++) {
            var k = KINGS[i];
            var base = norm(k.base);
            if (!BY_BASE[base]) BY_BASE[base] = [];
            BY_BASE[base].push(k);
            // 别名的基名 → 本名（如 Ramses → Ramesses）
            for (var j = 0; j < (k.aliases || []).length; j++) {
                var ab = norm(splitNumeral(k.aliases[j]).name);
                if (ab && ab !== base && !ALIAS_BASE[ab]) ALIAS_BASE[ab] = base;
            }
        }
    }

    function fullName(k) {
        return norm(k.name);
    }

    /**
     * 检索。
     * @param {string} query 例："Ramesses II" / "19th dynasty Ramesses" / "New Kingdom"
     * @returns {Array} 匹配的国王（按精确度、王朝、顺序排序）
     */
    function search(query) {
        init();
        var q = String(query == null ? "" : query);
        var scope = parseScope(q);
        var rest = scope.rest;
        var parts = splitNumeral(rest);
        var nameQ = norm(parts.name);
        var num = parts.num;
        var fullQ = norm(rest);

        var pool = KINGS.filter(function (k) {
            if (scope.dyn && k.dyn !== scope.dyn) return false;
            if (scope.period && k.period !== scope.period) return false;
            return true;
        });

        var exact = [];
        var baseHits = [];
        for (var i = 0; i < pool.length; i++) {
            var k = pool[i];
            var n = fullName(k);
            if (fullQ && n === fullQ) { exact.push(k); continue; }
            var aliasExact = false;
            for (var j = 0; j < (k.aliases || []).length; j++) {
                if (fullQ && norm(k.aliases[j]) === fullQ) { aliasExact = true; break; }
            }
            if (aliasExact) { exact.push(k); continue; }
            if (!nameQ) continue;

            // 基名（含别名基名）匹配
            var canon = ALIAS_BASE[nameQ] || nameQ;
            var kb = norm(k.base);
            if (kb !== canon) continue;
            if (num && k.num !== num) continue;
            baseHits.push(k);
        }

        var out = exact.length ? exact : baseHits;
        if (!exact.length && !baseHits.length && !nameQ) out = pool;

        out.sort(function (a, b) {
            if (a.dyn !== b.dyn) return a.dyn - b.dyn;
            if (a.order !== b.order) return a.order - b.order;
            return a.num - b.num;
        });
        return out;
    }

    /** 某个国王在标题里最常用的完整名（含罗马数字）。 */
    function displayName(k) {
        return k.num ? (k.base + " " + toRoman(k.num)) : k.name;
    }

    global.PharaohMatch = {
        search: search,
        displayName: displayName,
        parse: function (q) { var s = parseScope(q); var p = splitNumeral(s.rest); return { dyn: s.dyn, period: s.period, name: p.name, num: p.num }; },
        all: function () { init(); return KINGS; }
    };
})(typeof window !== "undefined" ? window : globalThis);
