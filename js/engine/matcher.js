// engine/matcher.js - 匹配引擎（纯逻辑模块，无 DOM 依赖）
//
// 四个匹配器（对应四个候选区）：
//   VM 词匹配      matchVocabulary(run)     IB 中已确认的码序列前缀 → 词条 + 连字（连字视作"词"）
//   PM 音素匹配    音素单元池（PHONEME_UNITS）小写/大写字母 → 单字符
//   DM 定符匹配    matchDeterminative(q)    ";" 后 → 定符
//   GM 码匹配      matchGardiner(token)     大写字母 → Gardiner 单字符
//
// 统一候选对象：
//   { kind, insert, MdC, glyph, pron, mean }
//   kind   "word" | "lig" | "phon" | "det" | "code"
//   insert Tab 确认时写入 IB 的 MdC 渲染串
//   MdC    显示用的 MdC 串
//   glyph  预览渲染输入 = **MdC 渲染串**（经 MdCRndr.renderText 渲染）
//   pron   左侧加粗显示（发音 / 码）
//   mean   释义（可为空串）

// ============ 基础工具 ============

/** 是否为 Gardiner 码片段（首字母大写 + 可选字母/数字/变体后缀），如 "D"、"AA1"、"A45a"。 */
function isGardinerSeg(s) {
    return !!s && /^[A-Z][A-Za-z]*\d*[A-Za-z]?$/.test(s);
}

/** 归一化码键：首字母保留，其余字母小写（"AA1" → "Aa1"；"A45A" → "A45a"）。 */
function normCodeKey(s) {
    if (!s) return "";
    const m = s.match(/^([A-Z]+)(\d*)([A-Za-z]?)$/);
    if (!m) return s;
    return m[1][0] + m[1].slice(1).toLowerCase() + m[2] + m[3].toLowerCase();
}

/**
 * 发音片段规范化为码（= 主字符隐式转换 PIC）。
 * 实现已解耦到独立模块 pic.js（仅依赖 PHONEMES / g，并跳过 "<...>" 文本区）；
 * 此处保留薄封装，便于调用方语义清晰。
 */
function normalizeMdC(text) {
    return (typeof PIC !== "undefined") ? PIC.convert(text) : text;
}

// ============ 当前编辑段（run） ============

const RUN_CHARS = "-:*[]{}();$<>";
// 码序列可包含的字符（字母、数字、连接符、组符号）——run 由此连续扫描得到
const RUN_BODY = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-:*{}";

/**
 * 取光标前的"编辑段"。返回 { text, start, end, seg, segStart, lead }：
 *   text / start — 码序列（供 VM 词匹配与整段替换）：
 *                  光标前连续的码字符（字母/数字/-/:/ * /{ }），
 *                  因此跨越组符号与连接符，如 "S34-N35:"、"V31*"、"D58-G43"。
 *   seg / segStart — 当前片段（供 PM / GM / DM 匹配与片段替换）：run 内最后一段。
 *   lead — seg 前的那个字符（"" / "-" / ":" / "*" / "{" / ";"）。
 * 例："S34-N35:" → text="S34-N35:", seg="", lead=":"；
 *     "D58-G43" → text="D58-G43", seg="G43"；"*k" → text="*k", seg="k", lead="*"；
 *     ";eye" → text="eye", seg="eye", lead=";"（";" 是边界，不入 run）。
 */
function currentRunOf(v, end) {
    // ① run：光标前的码序列（跨组符号连续扫描）
    let start = end;
    while (start > 0 && RUN_BODY.includes(v[start - 1])) start--;
    // ② seg：run 内最后一段
    let segStart = end;
    while (segStart > start && !RUN_CHARS.includes(v[segStart - 1])) segStart--;
    const seg = v.slice(segStart, end);
    const lead = segStart > 0 ? v[segStart - 1] : "";
    return { text: v.slice(start, end), start, end, seg, segStart, lead };
}

// ============ VM：词匹配（按码序列前缀 / 按发音） ============
//
// 词汇 / 音素 / 连字均为 Semantics 子类（见 semantics.js），
// 这里只遍历统一的 SEMANTICS 集合，经由多态接口取值，不区分具体类型。

/** 显示质量比较：发音匹配（精确优先、较短优先）→ 码匹配。 */
function betterForDisplay(a, b) {
    const qa = [wordRank(a), a.pronExact ? 0 : 1, a.pronLen || 0];
    const qb = [wordRank(b), b.pronExact ? 0 : 1, b.pronLen || 0];
    for (let i = 0; i < qa.length; i++) {
        if (qa[i] !== qb[i]) return qa[i] < qb[i];
    }
    return false;
}

/** 候选排序权：发音匹配 → 复合码串（含 "-"）→ 单段码。 */
function wordRank(c) {
    if (c.byPron) return 0;
    return c.MdC.includes("-") ? 1 : 2;
}

/**
 * 合并多组 VM 候选：按 insert（渲染串）去重。
 * 同一渲染串的多个语义单位合并释义，并取"显示质量更优"者的发音作为该行标签，
 * 否则先出现的单位会占住标签（例如输入 X 时显示成先登记的 Xt）。
 * 排序 = 发音匹配 → 复合码串 → 单段码；
 * 同级内：精确等长发音优先 → 发音较短优先 → 字典序。
 */
function mergeWordCandidates(groups) {
    const map = new Map();
    for (const list of groups) {
        for (const c of list) {
            const ex = map.get(c.insert);
            if (!ex) { map.set(c.insert, c); continue; }
            if (c.mean && !ex.mean.includes(c.mean)) ex.mean = ex.mean ? ex.mean + "; " + c.mean : c.mean;
            if (betterForDisplay(c, ex)) {
                ex.pron = c.pron;
                ex.kind = c.kind;
                ex.byPron = c.byPron;
                ex.pronExact = c.pronExact;
                ex.pronLen = c.pronLen;
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => {
        const ra = wordRank(a), rb = wordRank(b);
        if (ra !== rb) return ra - rb;
        const ea = a.pronExact ? 0 : 1, eb = b.pronExact ? 0 : 1;
        if (ea !== eb) return ea - eb;
        const la = a.pronLen || 0, lb = b.pronLen || 0;
        if (la !== lb) return la - lb;
        return a.MdC < b.MdC ? -1 : a.MdC > b.MdC ? 1 : 0;
    });
}

/**
 * 词匹配（码前缀）：query → Vocabulary + Ligature（VMBox 的匹配对象，不含 Phoneme）。
 * 首字符大小写敏感（码以大写开头），避免小写发音查询误命中码。
 */
function matchVocabulary(query) {
    const key = query || "";
    const list = [];
    for (const u of SEMANTICS) {
        if (u.matchesCode(key)) list.push(u.toCandidate({ byPron: false }));
    }
    return list;
}

/**
 * 词匹配（发音）：IB 中键入的字母 token → 发音以之开头的 Vocabulary / Ligature。
 * 用于"输入字母时，同发音的词条同时显示在词区"。
 * 标注 pronExact / pronLen 供排序：精确等长的发音优先，其次发音较短的。
 */
function matchVocabularyByPron(token) {
    if (!token) return [];
    const list = [];
    for (const u of SEMANTICS) {
        if (!u.matchesPron(token)) continue;
        list.push(u.toCandidate({ byPron: true, pronExact: u.pron === token, pronLen: u.pron.length }));
    }
    return list;
}

// ============ PDM / GM：字符单元池（onload 一次性生成，后续只切换 display） ============
//
// 单元为纯数据 { kind, matchKey, insert, glyph, l1, l2 }：
//   matchKey  前缀匹配键（音素 = 发音；定符 = 名称小写；码 = 归一化码）
//   insert    Tab 确认时写入 IB 的渲染串
//   glyph     预览渲染输入
//   l1 / l2   下标两行文字（l1 加粗）

/**
 * 音素单元（PM）：来自 PHONEME_UNITS（PHONEMES 单点注册的产物）。
 * 下标：第一行 = 发音（加粗），第二行 = Gardiner Code。
 */
function buildPhonemeUnits() {
    return PHONEME_UNITS.map(u => ({
        kind: "phon",
        matchKey: u.pron,
        insert: u.code,
        glyph: u.renderInput,
        l1: u.pron,
        l2: u.code,
    })).sort((a, b) => {
        if (a.l1.length !== b.l1.length) return a.l1.length - b.l1.length;
        return a.l1 < b.l1 ? -1 : a.l1 > b.l1 ? 1 : 0;
    });
}

/**
 * 定符单元（DM）：DETERMINATIVES 全表（每条名称一个单元）。
 * 下标：第一行 = ;名称（加粗），第二行 = Gardiner Code。
 */
function buildDeterminativeUnits() {
    const list = [];
    for (const d of DETERMINATIVES) {
        for (const n of d.names) {
            list.push({
                kind: "det",
                matchKey: n.toLowerCase(),
                insert: d.code,
                glyph: d.code,
                l1: ";" + n,
                l2: d.code,
            });
        }
    }
    return list.sort((a, b) => {
        if (a.l1.length !== b.l1.length) return a.l1.length - b.l1.length;
        return a.l1 < b.l1 ? -1 : a.l1 > b.l1 ? 1 : 0;
    });
}

/**
 * Gardiner Code 单元（GM）：GARDINER 全表（含字符变体，如 A45a）。
 * 下标：第一行 = Gardiner Code（加粗），第二行 = Unicode 十六进制。
 * matchKey 全小写 → GM 匹配**大小写不敏感**（输入 "v" 也命中 V 系）。
 */
function buildGardinerUnits() {
    const list = [];
    for (const key of Object.keys(GARDINER)) {
        // 放宽后接受：常规码（A45a）、JSesh 扩展签名（F35A/A426B/Aa80）、
        // UniKemet 编码（A1d）；池子本身取自 GARDINER 表，故可宽松。
        if (!/^[A-Z][A-Za-z]?\d+[A-Za-z0-9]*$/.test(key)) continue;
        const ch = GARDINER[key];
        list.push({
            kind: "code",
            matchKey: normCodeKey(key).toLowerCase(),
            insert: key,
            glyph: key,
            l1: key,
            l2: "U+" + ch.codePointAt(0).toString(16).toUpperCase(),
        });
    }
    return list.sort((a, b) => {
        if (a.l1.length !== b.l1.length) return a.l1.length - b.l1.length;
        return a.l1 < b.l1 ? -1 : a.l1 > b.l1 ? 1 : 0;
    });
}

/** GM 码前缀的匹配键（归一化并小写：大小写不敏感）。 */
function gardinerQueryKey(token) {
    return normCodeKey(token).toLowerCase();
}
