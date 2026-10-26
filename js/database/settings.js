// settings.js - 用户可配置项（键位 / VMBox 每页项数 / 功能开关）与持久化
//
// 结构：
//   boxSwitchKey      切换 Box 键（在 VMBox / PDMBox / GMBox 间循环）
//   confirmKey        选项确认键（在任一 MBox 中确认所选）
//   ibConfirmKey      IBBox 确认键（IB 全部内容入正文）
//   vmPageSize        VMBox 每页显示项数（1 ~ 9）
//   pageKeys          各 Box 的翻页键（仅 VMBox 有分页）
//   optionKeys        各 Box 的选项切换键
//   picEnabled        主字符隐式转换（PIC）是否开启
//   keyCastEnabled    按键展示（录屏演示，独立插件 js/plugin/keycast.js）是否开启
//
// 修改后调用 saveSettings() 持久化（localStorage；不可用时静默降级）。

const SETTINGS_KEY = "CHEAV_SETTINGS";

const SETTINGS_DEFAULTS = {
    boxSwitchKey: "Alt",
    confirmKey: "Tab",
    ibConfirmKey: "Enter",
    vmPageSize: 5,
    pageKeys: {
        VM: { prev: "ArrowLeft", next: "ArrowRight" },
    },
    optionKeys: {
        VM: { prev: "ArrowUp", next: "ArrowDown" },
        PDM: { prev: "ArrowLeft", next: "ArrowRight" },
        GM: { prev: "ArrowLeft", next: "ArrowRight" },
    },
    picEnabled: true,        // 主字符隐式转换（PIC）是否开启
    keyCastEnabled: false,   // 按键展示（录屏演示用；仅电脑端显示）
};

/** VMBox 每页项数范围。 */
const VM_PAGE_SIZE_MIN = 1;
const VM_PAGE_SIZE_MAX = 9;

/** 当前设置（深拷贝默认值后叠加已保存项）。 */
const SETTINGS = (function () {
    const s = JSON.parse(JSON.stringify(SETTINGS_DEFAULTS));
    try {
        const raw = (typeof localStorage !== "undefined") && localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            for (const k of Object.keys(s)) {
                if (saved[k] === undefined) continue;
                if (k === "pageKeys" || k === "optionKeys") {
                    for (const box of Object.keys(saved[k])) {
                        s[k][box] = Object.assign({}, s[k][box], saved[k][box]);
                    }
                } else {
                    s[k] = saved[k];
                }
            }
        }
    } catch (e) { /* 无 localStorage 或数据损坏 → 用默认值 */ }
    return s;
})();

/** 规范化：每页项数取整并夹在允许范围内。 */
function normalizeVmPageSize(n) {
    const v = Math.round(Number(n));
    if (!isFinite(v)) return SETTINGS_DEFAULTS.vmPageSize;
    return Math.min(VM_PAGE_SIZE_MAX, Math.max(VM_PAGE_SIZE_MIN, v));
}

/** 持久化当前设置。 */
function saveSettings() {
    try {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
        }
    } catch (e) { /* 忽略持久化失败 */ }
}

/** 恢复默认设置（就地改写 SETTINGS，保持引用不变）。 */
function resetSettings() {
    const d = JSON.parse(JSON.stringify(SETTINGS_DEFAULTS));
    for (const k of Object.keys(SETTINGS)) delete SETTINGS[k];
    Object.assign(SETTINGS, d);
    saveSettings();
    return SETTINGS;
}
