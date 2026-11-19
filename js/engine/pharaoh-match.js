// pharaoh-match.js —— 王名检索（英文朝代 / 姓名）
//
// 支持的 IB 写法：
//     ~d<Code>~<Name>     例：~d19~Ramesses II、~dpt~Ptolemy、~dnk~Thutmose III
//     ~<Name>             例：~Ramesses III（不给朝代）
// 也兼容旧的自由文本：Ramesses II、19th dynasty Ramesses、New Kingdom。
//
// <Code>：两位王朝号 01–31，或时期代号
//     pd 前王朝 · ed 早王朝 · ok 古王国 · fi 第一中间期 · mk 中王国
//     si 第二中间期 · nk 新王国 · ti 第三中间期 · lp 晚期
//     ag 阿吉德 · pt 托勒密 · ro 罗马 · ab 阿拜多斯 · un 未定位
//
// 规则：~d 段可省略，~<Name> 必需；姓名可带罗马/阿拉伯数字，II 与 III 严格区分；
//       先精确整名/整别名，再退化为基名匹配；无数字时返回同名全部国王。

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

    /** 时期代号（两位字母）；数值王朝号另算。 */
    var PERIOD_CODES = {
        pd: "predynastic", ed: "early dynastic", ok: "old kingdom",
        fi: "first intermediate", mk: "middle kingdom", si: "second intermediate",
        nk: "new kingdom", ti: "third intermediate", lp: "late period",
        ag: "argead", pt: "ptolemaic", ro: "roman", ab: "abydos", un: "unplaced"
    };

    var PERIOD_ALIASES = {
        "predynastic": "pd", "early dynastic": "ed", "old kingdom": "ok",
        "first intermediate": "fi", "first intermediate period": "fi",
        "middle kingdom": "mk", "second intermediate": "si", "second intermediate period": "si",
        "new kingdom": "nk", "third intermediate": "ti", "third intermediate period": "ti",
        "late period": "lp", "argead": "ag", "ptolemaic": "pt", "ptolemaic kingdom": "pt",
        "roman": "ro", "roman period": "ro", "abydos": "ab", "unplaced": "un",
        "unplaced kings": "un"
    };

    function norm(s) {
        return String(s == null ? "" : s)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    }

    /** 去空格键：名字里不允许空格，匹配时两边都压掉空格/连字符。 */
    function key(s) { return norm(s).replace(/[\s-]+/g, ""); }

    function toRoman(n) {
        var map = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], out = "";
        for (var i = 0; i < map.length; i++) while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
        return out;
    }

    function splitNumeral(text) {
        var t = String(text || "").trim();
        var m = /^(.*?)\s+([IVXivx]+|\d{1,2})$/.exec(t);
        if (!m) return { name: t, num: 0 };
        var tail = m[2];
        var n = /^\d+$/.test(tail) ? parseInt(tail, 10) : (ROMAN[tail.toLowerCase()] || 0);
        return n ? { name: m[1].trim(), num: n } : { name: t, num: 0 };
    }

    /** `~n` 名号类别：o=Nomen, n=Nebty, p=Prenomen, h=Horus, g=Golden Horus。 */
    var CATEGORY = { o: "Nomen", n: "Nebty", p: "Prenomen", h: "Horus", g: "Golden falcon" };

    /**
     * 解析 `~d19~np~RamessesII`：`~d<Code>` 与 `~n<类别>` 都是可选的、顺序任意，
     * 最后一段是必需的姓名。
     */
    function parseTilde(q) {
        var s = String(q || "").trim();
        if (s.charAt(0) !== "~") return null;
        var parts = s.split("~");
        var code = "", category = "", i = 1;
        for (; i < parts.length; i++) {
            var tok = parts[i].toLowerCase();
            if (/^d(?:[a-z]{2}|\d{1,2})$/.test(tok)) { code = tok.slice(1); continue; }
            if (/^n[opnhg]$/.test(tok)) { category = tok.charAt(1); continue; }
            break;
        }
        var rest = parts.slice(i).join("~").trim();
        var p = splitNumeral(rest);
        return { code: code, category: category, name: p.name, num: p.num, nameRequired: true };
    }

    /** 解析自由文本里的朝代/时期（兼容旧写法）。 */
    function parseScope(q) {
        var s = " " + norm(q) + " ";
        var scope = { code: "", rest: q };
        var m;
        m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+dynasty\b/.exec(s);
        if (m) { scope.code = m[1].length === 1 ? "0" + m[1] : m[1]; s = s.replace(m[0], " "); }
        else if ((m = /\bdynasty\s+(\d{1,2})\b/.exec(s))) { scope.code = m[1].length === 1 ? "0" + m[1] : m[1]; s = s.replace(m[0], " "); }
        else if ((m = /\bdynasty\s+([ivx]+)\b/.exec(s))) { scope.code = String(ROMAN[m[1]] || "").padStart(2, "0"); s = s.replace(m[0], " "); }
        else {
            for (var w in ORD) {
                var re = new RegExp("\\b" + w + "\\s+dynasty\\b");
                if (re.test(s)) { scope.code = String(ORD[w]).padStart(2, "0"); s = s.replace(re, " "); break; }
            }
        }
        if (!scope.code) {
            for (var alias in PERIOD_ALIASES) {
                var rp = new RegExp("\\b" + alias.replace(/ /g, "\\s+") + "\\b");
                if (rp.test(s)) { scope.code = PERIOD_ALIASES[alias]; s = s.replace(rp, " "); break; }
            }
        }
        scope.rest = s.replace(/\s+/g, " ").trim();
        return scope;
    }

    var KINGS = null, ALIAS_BASE = null, BY_BASE = null, BY_ID = null;
    var FULL_KEY = null;      // "ramessesii" -> [kings]（整名/整别名，去空格）
    var BASE_KEY = null;      // "ramesses" -> [kings]

    function init() {
        if (KINGS) return;
        KINGS = (global.PHARAOHS || []).slice();
        ALIAS_BASE = Object.create(null);
        BY_BASE = Object.create(null);
        BY_ID = Object.create(null);
        FULL_KEY = Object.create(null);
        BASE_KEY = Object.create(null);
        for (var i = 0; i < KINGS.length; i++) {
            var k = KINGS[i];
            BY_ID[k.id] = k;
            var base = norm(k.base);
            (BY_BASE[base] || (BY_BASE[base] = [])).push(k);
            var bk = key(k.base);
            (BASE_KEY[bk] || (BASE_KEY[bk] = [])).push(k);
            (FULL_KEY[key(k.name)] || (FULL_KEY[key(k.name)] = [])).push(k);
            for (var j = 0; j < (k.aliases || []).length; j++) {
                var ab = norm(splitNumeral(k.aliases[j]).name);
                if (ab && ab !== base) {
                    if (!ALIAS_BASE[ab]) ALIAS_BASE[ab] = base;
                    var abk = key(splitNumeral(k.aliases[j]).name);
                    (BASE_KEY[abk] || (BASE_KEY[abk] = [])).push(k);   // 别名基名也可检索
                }
                (FULL_KEY[key(k.aliases[j])] || (FULL_KEY[key(k.aliases[j])] = [])).push(k);
            }
        }
    }

    function fullName(k) { return norm(k.name); }

    /** code 过滤：数值王朝号 → dyn；时期代号 → period 或特殊 code。 */
    function matchCode(k, code) {
        if (!code) return true;
        if (/^\d{1,2}$/.test(code)) return k.dyn === parseInt(code, 10);
        var want = code.toLowerCase();
        return k.code === want || k.period === want;
    }

    /**
     * 检索。query 可以是 "~d19~Ramesses II" 形式，也可以是自由文本。
     * @returns {Array} 匹配的国王（按精确度、王朝、顺序排序）
     */
    function search(query) {
        init();
        var raw = String(query == null ? "" : query);
        var tilde = parseTilde(raw);
        var code = "", nameQ = "", num = 0, fullQ = "";
        if (tilde) {
            code = tilde.code; nameQ = norm(tilde.name); num = tilde.num; fullQ = norm(tilde.name);
        } else {
            var scope = parseScope(raw);
            code = scope.code;
            var parts = splitNumeral(scope.rest);
            nameQ = norm(parts.name); num = parts.num; fullQ = norm(scope.rest);
        }

        var nameKey = key(tilde ? tilde.name : (parseScope(raw).rest));
        if (tilde && !nameKey) return [];          // ~d19~ / ~ 没有名字 → 不返回候选
        var pool = KINGS.filter(function (k) { return matchCode(k, code); });
        var exact = [], baseHits = [];

        // ① 整名 / 整别名（去空格）
        if (nameKey && FULL_KEY[nameKey]) {
            exact = FULL_KEY[nameKey].filter(function (k) { return matchCode(k, code); });
        }
        // ② 末尾数字（Ramesses3 / RamessesIII / PtolemyXII）
        if (!exact.length && nameKey) {
            var m = /^(.*?)(\d{1,2})$/.exec(nameKey);
            if (m) {
                var nNum = parseInt(m[2], 10);
                var bk = m[1];
                (BASE_KEY[bk] || []).forEach(function (k) {
                    if (k.num === nNum && matchCode(k, code)) baseHits.push(k);
                });
            } else {
                var mr = /^(.*?)([ivx]+)$/.exec(nameKey);
                if (mr && ROMAN[mr[2]]) {
                    var rNum = ROMAN[mr[2]];
                    (BASE_KEY[mr[1]] || []).forEach(function (k) {
                        if (k.num === rNum && matchCode(k, code)) baseHits.push(k);
                    });
                }
            }
        }
        // ③ 无数字的基名（Ramesses / Ptolemy）
        if (!exact.length && !baseHits.length && nameKey) {
            baseHits = (BASE_KEY[nameKey] || []).filter(function (k) { return matchCode(k, code); });
        }
        var out = exact.length ? exact : baseHits;
        if (!out.length && nameKey) {
            var seen = Object.create(null);
            searchEntries(raw).forEach(function (hit) {
                if (!seen[hit.king.id]) { seen[hit.king.id] = 1; out.push(hit.king); }
            });
        }
        if (!out.length && !nameKey) out = pool;
        out.sort(function (a, b) {
            if (a.dyn !== b.dyn) return a.dyn - b.dyn;
            if (a.order !== b.order) return a.order - b.order;
            return a.num - b.num;
        });
        return out;
    }

    function displayName(k) { return k.num ? (k.base + " " + toRoman(k.num)) : k.name; }

    /**
     * 按「王名本身」检索：把每位国王的全部 2,333 条王名（名称 / 转写 / MdC）
     * 都作为候选键。返回 [{ king, entry }]，entry = { s, n, t, g, m }。
     */
    function searchEntries(query) {
        init();
        var raw = String(query == null ? "" : query);
        var t = parseTilde(raw);
        var code, category = "", nameQ;
        if (t) { code = t.code; category = t.category; nameQ = key(t.name); }
        else {
            var scope = parseScope(raw);
            var parts = splitNumeral(scope.rest);
            code = scope.code;
            nameQ = key(parts.name);
        }
        if (!nameQ) return [];
        var pool = KINGS.filter(function (k) { return matchCode(k, code); });
        var out = [];
        for (var i = 0; i < pool.length; i++) {
            var king = pool[i];
            var list = namesFor(king.id);
            for (var j = 0; j < list.length; j++) {
                var e = list[j];
                if (category && e.s !== CATEGORY[category]) continue;
                var kn = key(e.n), kt = key(e.t), km = key(e.m);
                var exact = (kn === nameQ || kt === nameQ || km === nameQ);
                var prefix = !exact && (kn.indexOf(nameQ) === 0 || kt.indexOf(nameQ) === 0);
                if (exact || prefix) out.push({ king: king, entry: e, exact: exact });
            }
        }
        out.sort(function (a, b) {
            if (a.exact !== b.exact) return a.exact ? -1 : 1;
            if (a.king.dyn !== b.king.dyn) return a.king.dyn - b.king.dyn;
            if (a.king.order !== b.king.order) return a.king.order - b.king.order;
            return 0;
        });
        return out;
    }

    function namesFor(id) {
        var all = global.PHARAOH_NAMES || {};
        return all[id] || [];
    }

    /** 该国王拥有的王名类别（按固定顺序）。 */
    function categoriesFor(id) {
        var order = ["Horus", "Nebty", "Golden falcon", "Prenomen", "Nomen",
                     "Prenomen + Nomen", "Autokrator + Kaisaros", "Kaisaros"];
        var have = {};
        namesFor(id).forEach(function (n) { have[n.s] = (have[n.s] || 0) + 1; });
        return order.filter(function (s) { return have[s]; })
            .map(function (s) { return { section: s, count: have[s] }; });
    }

    global.PharaohMatch = {
        search: search,
        parse: function (q) {
            var t = parseTilde(q);
            if (t) return { tilde: true, code: t.code, category: t.category, name: t.name, num: t.num };
            var s = parseScope(q), p = splitNumeral(s.rest);
            return { tilde: false, code: s.code, name: p.name, num: p.num };
        },
        displayName: displayName,
        searchEntries: searchEntries,
        namesFor: namesFor,
        categoriesFor: categoriesFor,
        byId: function (id) { init(); return BY_ID[id] || null; },
        periodCode: function (code) { return PERIOD_CODES[String(code || "").toLowerCase()] || ""; },
        categorySection: function (code) { return CATEGORY[String(code || "").toLowerCase()] || ""; },
        all: function () { init(); return KINGS; }
    };
})(typeof window !== "undefined" ? window : globalThis);
