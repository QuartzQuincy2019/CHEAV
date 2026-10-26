// lang.js - i18n：UI 文字说明的各语言版本
//
// 语言代码：
//   en  = English（英语）
//   chs = 简体中文（Chinese Simplified）
//
// 用法：
//   t("pagePrev")        取当前语言的 UI 文字
//   tl("ligatureTag","en") 取指定语言的 UI 文字
//   setLang("en")        切换界面语言（切换后调 CHEAV.refresh() 重渲染）

const LANG = {
    en: {
        ligatureTag: "{Lig.}",   // 候选框：连字类型标记
        pagePrev: "Prev",        // VMBox 分页：上一页
        pageNext: "Next",        // VMBox 分页：下一页
        // 各区域说明（置空占位 / IB 输入提示）
        ibPlaceholder: "Type a word or a single glyph here; press Enter to place it into the text…",
        vmPlaceholder: "Vocabulary Match — words and ligatures matching your input (Tab to confirm)",
        pdmPlaceholder: "Phoneme / Determinative Match — letters give single glyphs, \";\" gives determinatives (Tab to confirm)",
        gmPlaceholder: "Gardiner Code Match — matching code glyphs, case-insensitive (Tab to confirm)",
        ibPreviewTag: "Preview",                                    // IB 实时预览标签
        // 设置面板
        settingsTitle: "Settings",
        settingsBoxSwitch: "Switch-box key",
        settingsConfirm: "Option-confirm key",
        settingsIbConfirm: "IB-confirm key",
        settingsPageSize: "VM items per page (1-9)",
        settingsVmPagePrev: "VM page-prev key",
        settingsVmPageNext: "VM page-next key",
        settingsVmOptPrev: "VM option-prev key",
        settingsVmOptNext: "VM option-next key",
        settingsPdmOptPrev: "PDM option-prev key",
        settingsPdmOptNext: "PDM option-next key",
        settingsGmOptPrev: "GM option-prev key",
        settingsGmOptNext: "GM option-next key",
        settingsPic: "Primary implicit conversion (PIC)",
        settingsKeyCast: "Key display (screen recording, desktop only)",
        keyCastTitle: "Keys",
        settingsReset: "Reset to defaults",
        settingsPressKey: "Press a key…",
    },
    chs: {
        ligatureTag: "【连字】",  // 候选框：连字类型标记
        pagePrev: "上一页",        // VMBox 分页：上一页
        pageNext: "下一页",        // VMBox 分页：下一页
        // 各区域说明（置空占位 / IB 输入提示）
        ibPlaceholder: "在这里输入词语或单字符，按 Enter 可置入正文……",
        vmPlaceholder: "词匹配 —— 与输入相符的词汇与连字（Tab 确认）",
        pdmPlaceholder: "音素 / 定符匹配 —— 字母出单字符，分号 ; 出定符（Tab 确认）",
        gmPlaceholder: "Gardiner Code 匹配 —— 大小写不敏感地出对应码单字符（Tab 确认）",
        ibPreviewTag: "预览",                       // IB 实时预览标签
        // 设置面板
        settingsTitle: "设置",
        settingsBoxSwitch: "切换 Box 键",
        settingsConfirm: "选项确认键",
        settingsIbConfirm: "IB 确认键",
        settingsPageSize: "VM 每页项数（1-9）",
        settingsVmPagePrev: "VM 翻页（上一页）键",
        settingsVmPageNext: "VM 翻页（下一页）键",
        settingsVmOptPrev: "VM 选项（上）键",
        settingsVmOptNext: "VM 选项（下）键",
        settingsPdmOptPrev: "PDM 选项（前）键",
        settingsPdmOptNext: "PDM 选项（后）键",
        settingsGmOptPrev: "GM 选项（前）键",
        settingsGmOptNext: "GM 选项（后）键",
        settingsPic: "主字符隐式转换（PIC）",
        settingsKeyCast: "按键展示（录屏演示，仅电脑端）",
        keyCastTitle: "按键",
        settingsReset: "恢复默认",
        settingsPressKey: "按下按键…",
    },
};

// 当前界面语言
let CURRENT_LANG = "chs";

/**
 * 取指定语言版本的 UI 文字；缺失时回退到 chs，再回退到 key 本身。
 */
function tl(key, langCode) {
    const lang = LANG[langCode];
    if (lang && lang[key]) return lang[key];
    if (LANG.chs && LANG.chs[key]) return LANG.chs[key];
    return key;
}

/**
 * 取当前语言的 UI 文字。
 */
function t(key) {
    return tl(key, CURRENT_LANG);
}

/**
 * 切换界面语言（返回切换后的语言代码）。
 */
function setLang(code) {
    if (LANG[code]) CURRENT_LANG = code;
    return CURRENT_LANG;
}
