// pic.js - 主字符隐式转换（Primary Implicit Conversion, PIC）
//
// 独立模块：只依赖 PHONEMES（音素表：发音 → 主码）与 g()（字符 → Gardiner 码反查，用于 hm 类需求），
// 与匹配系统（matcher.js）、渲染（rendering.js）、UI（apply.js）解耦。
// 开关由 SETTINGS.picEnabled 决定（默认开启）。
//
// 规则：
//   · 命中 PHONEMES 的片段 → 转换为其**主码**（如 nfr → F35）
//   · 未命中的片段 → 原封不动
//   · 分隔符（- : * { } ( ) $）原样保留
//   · "<...>" 文本区整体跳过：内部不做转换；其内容也不参与非法判定
//     （因此 "F35-<good>"、"<nfr>" 等不会被改写）
//
// 用法：
//   PIC.enabled()        是否启用
//   PIC.codeOf("nfr")    单个片段 → 码（无对应音素返回 null）
//   PIC.convert(text)    整串转换

const PIC = {
    /** 是否启用（用户设置，默认开启）。 */
    enabled() {
        return !(typeof SETTINGS !== "undefined" && SETTINGS.picEnabled === false);
    },

    /** 片段 → 主码；无对应音素返回 null。 */
    codeOf(seg) {
        if (!seg || typeof PHONEMES === "undefined") return null;
        return PHONEMES[seg] || null;      // 音素表即「发音 → 主码」
    },

    /** 分隔符 / 结构字符（文本区 "<" ">" 单独处理）。 */
    isDelimiter(ch) {
        return "-:*{}()$".includes(ch);
    },

    /**
     * 整串转换：按分隔符切分，逐片段查音素表；"<...>" 文本区原样拷贝。
     * @param {string} text
     * @returns {string}
     */
    convert(text) {
        if (!text) return text;
        let out = "";
        let i = 0;
        while (i < text.length) {
            const ch = text[i];
            // 文本区：原样拷贝至配对的 ">"（"\>" 视为转义，不结束文本区）
            if (ch === "<") {
                let j = i + 1;
                let buf = "<";
                while (j < text.length) {
                    if (text[j] === "\\" && j + 1 < text.length) {
                        buf += text[j] + text[j + 1];
                        j += 2;
                        continue;
                    }
                    buf += text[j];
                    if (text[j] === ">") { j++; break; }
                    j++;
                }
                out += buf;
                i = j;
                continue;
            }
            if (this.isDelimiter(ch) || ch === ">") { out += ch; i++; continue; }
            let j = i;
            while (j < text.length && !this.isDelimiter(text[j]) && text[j] !== "<" && text[j] !== ">") j++;
            const seg = text.slice(i, j);
            out += this.codeOf(seg) || seg;
            i = j;
        }
        return out;
    },
};
