// semantics.js - 语义单位类层次（VMBox 词匹配的数据抽象）
//
//   Semantics（基类）   发音 + 释义 + 统一的多态接口
//     ├─ Vocabulary     词汇：发音 + **MdC 渲染串**（如 "S34-N35:AA1"）+ 释义
//     └─ Ligature       连字：MdC 串即 "{名称}"，部件几何由渲染引擎插件持有
//
//   Phoneme（独立类）   音素：单个字符。其匹配全部在 PDMBox，不进 VMBox，
//                       故不继承 Semantics（见类定义处说明）。
//
// VMBox 的匹配对象 = Vocabulary + Ligature（SEMANTICS 集合，见 vocabulary.js）。
// 多态接口（匹配系统只依赖此接口，不再按类型分支）：
//   kind            类型标签 "word" | "lig"
//   pron            发音 / 检索键（连字可无发音 → null）
//   code            MdC 渲染串（词汇的码串 / "{连字名}"）
//   renderInput     渲染输入 = MdC 渲染串（渲染引擎只接受纯 MdC）
//   insert          Tab 确认时写入 IB 的串（默认同 code）
//   matchesCode(p)  码前缀匹配
//   matchesPron(p)  发音前缀匹配
//   meanText        释义显示串（当前语言 + en）
//   toCandidate(f)  生成 UI 候选对象
//
// 加载顺序：需在 ligatures.js / vocabulary.js 之前（见 index.html）。
// t / CURRENT_LANG / g 等依赖在"调用时"才求值（getter 延迟），
// 因此本文件可先于 rendering.js 加载。

class Semantics {
    /**
     * @param {string} pron 发音 / 检索键
     * @param {{en?:string, chs?:string}|null} meaning 释义；变体传 null（装配后指向母词汇的释义对象）
     */
    constructor(pron, meaning) {
        this.pron = pron;
        this.meaning = { en: (meaning && meaning.en) || "", chs: (meaning && meaning.chs) || "" };
    }

    /** 类型标签（子类覆盖）。 */
    get kind() { return "semantics"; }

    /** MdC 渲染串（子类覆盖）。 */
    get code() { return ""; }

    /** 渲染输入（子类覆盖）。 */
    get renderInput() { return null; }

    /** Tab 确认时写入 IB 的串（默认即 code；连字覆写为 {name}）。 */
    get insert() { return this.code; }

    /** 是否为主条目（音素覆写：登记表中该发音的首个字符）。 */
    get isPrimary() { return false; }

    /**
     * 码前缀匹配。约定：**首字符大小写敏感**——码以大写字母开头，
     * 小写输入视作发音查询，避免输入 "n" 时误命中码 "N29" / "N37"。
     * 其余字符不区分大小写（如码变体 "A45a" 可写作 "A45A"）。
     */
    matchesCode(prefix) {
        if (!prefix) return false;
        const code = this.code;
        if (!code || code[0] !== prefix[0]) return false;
        return code.toLowerCase().startsWith(prefix.toLowerCase());
    }

    /** 发音前缀匹配。 */
    matchesPron(prefix) {
        return !!prefix && !!this.pron && this.pron.startsWith(prefix);
    }

    /** 释义显示串：en + 当前语言（当前语言为 en 时只显示 en）。 */
    get meanText() {
        const parts = [];
        if (this.meaning.en) parts.push(this.meaning.en);
        if (typeof CURRENT_LANG !== "undefined" && CURRENT_LANG !== "en" && this.meaning.chs) {
            parts.push(this.meaning.chs);
        }
        return parts.join(" | ");
    }

    /**
     * 生成 UI 候选对象（匹配系统的统一产物）。
     * @param {{byPron?:boolean, pronExact?:boolean, pronLen?:number}} flags 匹配来源标记（供排序）
     */
    toCandidate(flags = {}) {
        return {
            kind: this.kind,
            byPron: !!flags.byPron,
            pronExact: !!flags.pronExact,
            pronLen: flags.pronLen,
            insert: this.insert,
            MdC: this.code,
            glyph: this.renderInput,
            pron: this.pron,
            mean: this.meanText,
        };
    }
}

/** 词汇：发音 + MdC 渲染串 + 释义。 */
class Vocabulary extends Semantics {
    /**
     * @param {string} pron 发音（检索键）
     * @param {string} mdC  MdC 渲染串（如 "S34-N35:AA1"、"A9-X1-Y1:Z2"）
     * @param {{en?:string, chs?:string}|null} [meaning] 释义；**变体传 null**
     * @param {string} [variantOf] 母词汇的 MdC（本条目为变体时给出）
     *
     * 变体约定：互为变体的词汇**释义一定相同** —— 由 vocabulary.js 在装配后把变体的
     * `meaning` 指向母词汇的同一个对象实现（因此改母词汇的释义即全族同步），
     * `parent` 指向母词汇实例，`variantOf` 记录母词汇的 MdC（写文件时使用）。
     */
    constructor(pron, mdC, meaning = {}, variantOf = null) {
        super(pron, meaning);
        this.mdC = mdC;
        this.variantOf = variantOf || null;
        this.parent = null;
    }

    /** 是否为某母词汇的变体。 */
    get isVariant() { return !!this.parent; }

    get kind() { return "word"; }

    /** MdC 渲染串（本引擎的渲染输入即此串）。 */
    get code() { return this.mdC; }

    get renderInput() { return this.mdC; }
}

/**
 * 音素：发音 → Gardiner 码（**码**，不是字符——字符由码经 hg() 得到）。
 * 只需在 maps.js 的 PHONEME_TABLE 登记一次，vocabulary.js 会自动建实例。
 *
 * **不继承 Semantics**：音素的匹配全部发生在 PDMBox（音素 / 定符候选框），
 * 不参与 VMBox 的词匹配，因此不需要 VM 侧接口（code 渲染串 / 释义 / 候选构造 /
 * 通用码前缀匹配）。仅保留 PDM 需要的三件数据 + 发音前缀判定。
 */
class Phoneme {
    constructor(pron, code) {
        this.pron = pron;
        this.code = code || "";
    }

    /** 单字符的 MdC 渲染串（PDM 单元预览用）＝ 码本身。 */
    get renderInput() { return this.code || null; }

    /** 该码对应的象形文字字符（便捷取用）。 */
    get char() { return (typeof hg === "function" && this.code) ? (hg(this.code) || "") : ""; }

    /** 主码 = 该发音在 PHONEME_TABLE 中首个登记的码（同音异形时排在最前）。 */
    get isPrimary() { return PHONEMES[this.pron] === this.code; }

    /** 发音前缀匹配（PDM 实时筛选）。 */
    matchesPron(prefix) { return !!prefix && this.pron.startsWith(prefix); }
}

/**
 * 连字：名称即码序列；{name} 为其 MdC 渲染串。
 * 各部件的相对位置与缩放由渲染引擎插件持有（MdCRndr.LIGATURES），
 * 本类只承担 VMBox 匹配与 Tab 确认所需的语义信息。
 */
class Ligature extends Semantics {
    /**
     * @param {string} mdC  MdC 渲染串，形如 "{I10-D46}"
     * @param {string} [pron] 连字发音（可检索但不能单独成词），如 "Dd"
     */
    constructor(mdC, pron) {
        super(pron || null, {});
        this.mdC = mdC;
        this.name = mdC.replace(/^\{(.*)\}$/, "$1");
    }

    get kind() { return "lig"; }

    get code() { return this.mdC; }

    get renderInput() { return this.mdC; }

    /** 连字名归一化后参与码匹配（":" 与 "*" 均视为 "-"）；首字符大小写敏感同基类约定。 */
    matchesCode(prefix) {
        if (!prefix) return false;
        const name = this.name.replace(/[:*]/g, "-");
        if (name[0] !== prefix[0]) return false;
        return name.toLowerCase().startsWith(prefix.toLowerCase());
    }

    /** 连字释义即类型标记（【连字】/ {Lig.}）。 */
    get meanText() { return t("ligatureTag"); }
}
