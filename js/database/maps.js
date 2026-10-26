// maps.js

// LUT: the Leiden Unified Transliteration
// 共25个
const MdC2LUT = {
    A: "ꜣ",
    i: "ỉ",
    j: "ỉ",
    y: "y",
    a: "ꜥ",
    w: "w",
    b: "b",
    p: "p",
    f: "f",
    m: "m",
    n: "n",
    r: "r",
    h: "h",
    H: "ḥ",
    x: "ḫ",
    X: "ẖ",
    z: "z",
    s: "s",
    S: "š",
    q: "q",
    k: "k",
    g: "g",
    t: "t",
    T: "ṯ",
    d: "d",
    D: "ḏ"
}

// ============ 音素表（发音 ↔ 字符，多对多） ============
// 每行：[发音, 字符…]
//   · 同一发音登记多个字符 → 同音异形（["nw", hg("U19"), hg("W24")]）
//   · 同一字符出现在多行     → 一形多音（["smA", X] 与 ["zmA", X]）
// 本表是音素的**唯一登记处**：vocabulary.js 据 PHONEME_ROWS 自动建立 Phoneme 实例
// （同音异形会生成多条候选，一形多音会生成多个发音条目），无需另写词条。
const PHONEME_TABLE = [
    // ---- 单辅音（发音 → 主码；同一发音可列多个码 = 同音异形） ----
    ["A", "G1"],
    ["i", "M17"],
    ["j", "M17"],
    ["y", "M17a"],
    ["a", "D36"],
    ["w", "G43"],
    ["b", "D58"],
    ["p", "Q3"],
    ["f", "I9"],
    ["m", "G17"],
    ["n", "N35"],
    ["r", "D21"],
    ["h", "O4"],
    ["H", "V28"],
    ["x", "AA1"],
    ["X", "F32"],
    ["z", "O34"],
    ["s", "S29"],
    ["S", "N37"],
    ["q", "N29"],
    ["k", "V31"],
    ["g", "W11"],
    ["t", "X1"],
    ["T", "V13"],
    ["d", "D46"],
    ["D", "I10"],
    // ---- 复辅音 ----
    ["nfr", "F35"],
    ["nn", "M22"],
    ["nm", "T35"],
    ["nw", "W24", "U19"],
    ["nTr", "R8"],
    ["nxb", "M22"],
    ["TA", "N16", "G47"],
    ["sw", "M23"],
    ["smA", "F36"],
    ["smn", "U32"],
    ["stp", "U21"],
    ["zmn", "U32"],
    ["zmA", "F36"],
    ["DA", "U28", "U29"],
    ["Xn", "D33"],
    ["XA", "K4"],
    ["ad", "K3"],
    ["anx", "S34"],
    ["aD", "K3"],
    ["Aw", "F40"],
    ["Ab", "U23"],
    ["km", "I6"],
    ["xA", "N28", "M12"],
    ["xt", "M3"],
    ["xnt", "W18", "W17"],
    ["xpr", "L1"],
    ["HA", "M16"],
    ["Hm", "U36"],
    ["Hr", "N31"],
    ["Hs", "W14"],
    ["HqA", "S38"],
    ["Hn", "M2"],
    ["in", "W25", "K1"],
    ["ir", "D4"],
    ["is", "M2"],
    ["iw", "D54"],
    ["iT", "V15"],
    ["spr", "F42"],
    ["pA", "G40"],
    ["pr", "O1"],
    ["kA", "D28"],
    ["mA", "U1", "G3", "U3"],
    ["mt", "D52"],
    ["ms", "F31"],
    ["mn", "Y5", "T1"],
    ["mr", "U6", "N36", "U23"],
    ["mAw", "G46"],
    ["ti", "U33", "M6"],
    ["tA", "U30"],
    ["tr", "M6"],
    ["gb", "G38"],
    ["Dd", "R11"],
    ["wsr", "F12"],
    ["rs", "T13"],
    ["ri", "M6"],
    ["rw", "E23"],
    ["rwD", "T12"],
    ["SA", "M8"],
    ["Sms", "T18"],
    ["Sma", "M26"],
    ["qs", "T19"],
    ["wa", "G45", "T21"],
    ["wD", "M13", "M14"],
    ["ww", "G44"],
    ["wn", "E34"],
    ["wAD", "M13", "M14"],
    ["di", "X8", "D37"],
    ["bAs", "W1"],
    ["bs", "K5"],
    ["bw", "K2"],
];

// 全部登记项 [{pron, code}]（含同音异形 / 一形多音的所有组合）
const PHONEME_ROWS = [];
// 派生：pron → 主码（该发音首个登记的 Gardiner 码；供 hm() 逐字转写与 PIC 规范化使用）
const PHONEMES = {};
(function buildPhonemeTable() {
    for (const row of PHONEME_TABLE) {
        for (let i = 1; i < row.length; i++) registerPhonemeRow(row[0], row[i]);
    }
})();

/** 追加一条音素登记（内部使用）。 */
function registerPhonemeRow(pron, code) {
    if (!pron || !code) return null;
    const item = { pron: pron, code: code };
    PHONEME_ROWS.push(item);
    if (!PHONEMES[pron]) PHONEMES[pron] = code;   // 主码 = 首个登记项
    return item;
}

/**
 * 登记音素（运行期扩展用，等价于在 PHONEME_TABLE 追加一行）。
 * @param {string} pron 发音（MdC）
 * @param {...string} codes 该发音对应的 Gardiner 码（可多个 = 同音异形；首个为主码）
 * @returns {Array<{pron:string, code:string}>} 本次新增的登记项
 * @example definePhoneme("nw", "W24", "U19");   // nw 有两个码
 * @example definePhoneme("zmA", "F36");         // F36 又多一种发音
 */
function definePhoneme(pron, ...codes) {
    const added = [];
    for (const code of codes) {
        const item = registerPhonemeRow(pron, code);
        if (item) added.push(item);
    }
    return added;
}

/** 某发音登记的全部码（同音异形；首个为主码）。 */
function phonemeCodesOf(pron) {
    return PHONEME_ROWS.filter(r => r.pron === pron).map(r => r.code);
}

/** 某码登记的全部发音（一形多音）。 */
function phonemePronsOf(code) {
    return PHONEME_ROWS.filter(r => r.code === code).map(r => r.pron);
}

/**
 * 加德纳编号->象形文字
 * @param {string} gardinerCode 
 * @returns 象形文字字符
 */
function hg(gardinerCode) {
    // GARDINER 的值已是 Unicode 字符，直接返回
    let ch = GARDINER[gardinerCode];
    if (!ch) {
        // 尝试格式化后再查找（例如 "P001A" -> "P1a"）。
        // 有条件的大小写不敏感：除开头字母外，其余字母不区分大小写，
        // 依次尝试三种变体（原样 / 其余小写 / 其余大写），命中即返回。
        const match = gardinerCode.match(/^([A-Z])([A-Za-z]*)(\d+)([A-Za-z]?)$/);
        if (match) {
            const num = match[3].replace(/^0+/, '') || '0';
            const variants = [
                match[1] + match[2] + num + match[4],
                match[1] + match[2].toLowerCase() + num + match[4].toLowerCase(),
                match[1] + match[2].toUpperCase() + num + match[4].toUpperCase(),
            ];
            for (const v of variants) {
                if (GARDINER[v]) { ch = GARDINER[v]; break; }
            }
        }
    }
    return ch || null;
}

/**
 * 象形文字->加德纳编号
 * @param {string} hierograph 
 * @returns 加德纳编号
 */
function g(hierograph) {
    return revGardiner[hierograph];
}

/**
 * 通过MdC获取象形文字字符串
 * @param {string} MdC 
 * @example hm("nfr") => "𓈖𓆑𓂋"
 * @returns 
 *
 * 注意：本函数按**单个字符**逐字查 PHONEMES（用于转写拼读），
 * 每个发音取主码（PHONEMES[发音]，即 PHONEME_TABLE 中该发音首个登记的码）再经 hg() 取字符；
 * 同音异形的其余码、以及一形多音的其他发音，由 matcher.js 的 matchPhoneme/
 * matchVocabularyByPron 经 PHONEME_UNITS 全部参与匹配。
 * 若需 hm 支持复辅音，应改为最长匹配（贪婪）扫描。
 */
function hm(MdC) {
    var output = "";
    for (const element of MdC) {
        // 音素表是「发音 → 码」，转写时再由码取字符
        output += (PHONEMES[element] && hg(PHONEMES[element])) || "?";
    }
    return output;
}