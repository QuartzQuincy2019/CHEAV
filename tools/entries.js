#!/usr/bin/env node
/*!
 * ============================================================================
 *  entries.js — CHEAV 词条维护脚本（查询 / 添加 Vocabulary · Determinative · PHONEME）
 * ----------------------------------------------------------------------------
 *  用法：
 *    node tools/entries.js "/s -v /p anx"            # 单次查询
 *    node tools/entries.js "/a -p -prim /p a /g D36" # 单次添加
 *    node tools/entries.js                            # 交互模式（:q 退出，:h 帮助）
 *  选项：
 *    --dry-run   只显示将要写入的内容，不落盘
 *    --help      显示完整帮助
 *
 *  查询（/s）：
 *    /s [-a] [-s] [(-v|-d|-p)] [-e]
 *       [-e 前面的 (-v|-d|-p) = 范围：-v 词汇 / -d 定符 / -p 音素（省略＝全部）
 *        -e = 该范围内**全局一致匹配**（作用于所有 /p /g /r /m）
 *        -a = 列出范围内全部条目（其余参数忽略）；-s 或缺省 = 只列匹配项]
 *       [/p [-e] <发音>] [/g [-e] <码>] [/r [-e] <MdC>] [/m [-e] <释义或定符名>]
 *
 *  添加（/a）：
 *    /a (-v|-d|-p) [-prim]
 *       [/p <发音>] [/g <码>] [/r <MdC>] [/m [-en <英文>] [-chs <中文>] | <名称>] [/h <象形字>]
 *       -v 词汇：需 /p + /r，可选 /m -en… -chs…
 *       -p 音素：需 /p + /g；-prim = 已存在该发音时把本码设为主码
 *       -d 定符：需 /g + /m；-prim = 已存在该名称时把它排到第 1 位
 *
 *  匹配规则：发音区分大小写（S 与 s 是不同音素）；码 / MdC / 释义不区分大小写。
 *  排序规则：词汇按 MdC 自然序；定符按 Gardiner 码自然序；
 *            音素按首字母分组（同组内不强制次序）。
 * ============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = {
    plugin: path.join(ROOT, 'js/plugin/MdCRndr.js'),
    maps: path.join(ROOT, 'js/database/maps.js'),
    vocab: path.join(ROOT, 'js/database/vocabulary.js'),
    det: path.join(ROOT, 'js/database/determinatives.js'),
};
const DRY = process.argv.includes('--dry-run');

// ============================================================================
// 一、载入引擎与数据（headless：不依赖浏览器）
// ============================================================================
function makeDoc() {
    const el = () => ({ style: { setProperty() {} }, children: [], className: '', id: '',
        appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, getAttribute() { return null; },
        addEventListener() {}, textContent: '' });
    return { createElement: el, head: el(), getElementById: () => null, documentElement: el() };
}

/** 载入插件 + 数据文件，返回 { M, VOCABULARY, DETERMINATIVES, PHONEME_TABLE, PHONEME_ROWS, PHONEMES }。 */
function loadAll() {
    const doc = makeDoc();
    const win = { document: doc };
    // 插件注册连字时会 console.log，载入期间静音
    const log = console.log;
    console.log = () => {};
    try {
        new Function('window', 'document', fs.readFileSync(P.plugin, 'utf8'))(win, doc);
        const M = win.MdCRndr;
        // 兼容层（visumetrics / GardinerCode）自行从 MdCRndr 取 GARDINER / revGardiner，勿再作为参数传入
        const files = ['lib/visumetrics.js', 'js/database/GardinerCode.js', 'js/database/maps.js',
            'js/database/semantics.js', 'js/database/ligatures.js', 'js/database/determinatives.js',
            'js/database/vocabulary.js'];
        let code = '';
        for (const f of files) code += fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n';
        code += '; return { VOCABULARY, DETERMINATIVES, PHONEME_TABLE, PHONEME_ROWS, PHONEMES, variantsOf, variantFamily };';
        const data = new Function('window', 'document', 'MdCRndr', code)(win, doc, M);
        return Object.assign({ M }, data);
    } finally {
        console.log = log;
    }
}

// ============================================================================
// 二、命令行解析
// ============================================================================
/** 按空白切分，支持 "…" 与 '…' 引号。 */
function tokenize(line) {
    const out = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(line)) !== null) out.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
    return out;
}

const FIELD_RE = /^\/(p|g|r|m)$/;

/** 解析查询：/s [-a] [-s] [(-v|-d|-p)] [-e] [/x [-e] 值]… */
function parseQuery(tk) {
    const q = { mode: 's', all: false, scope: null, exact: false, filters: [] };
    let i = 1;
    for (; i < tk.length; i++) {
        const t = tk[i];
        if (t === '-a') { q.all = true; continue; }
        if (t === '-s') continue;
        if (t === '-v' || t === '-d' || t === '-p') { q.scope = t.slice(1); continue; }
        if (t === '-e') { q.exact = true; continue; }
        if (FIELD_RE.test(t)) break;
        return { error: '无法识别的参数: ' + t };
    }
    for (; i < tk.length; i++) {
        const t = tk[i];
        if (!FIELD_RE.test(t)) return { error: '无法识别的参数: ' + t + '（筛选器须形如 /p /g /r /m）' };
        const field = t.slice(1);
        let exact = false;
        if (tk[i + 1] === '-e') { exact = true; i++; }
        const value = tk[i + 1];
        if (value === undefined) return { error: '筛选器 /' + field + ' 缺少取值' };
        i++;
        q.filters.push({ field, value, exact });
    }
    return q;
}

/** 解析字段序列 [/p 值] [/g 值] [/r 值] [/m [-en 值] [-chs 值] | 文本] [/h 值] [-prim]
 *  返回 { fields, next } 或 { error }。供添加与修改共用。 */
function parseFields(tk, i) {
    const f = { pron: null, code: null, mdc: null, en: null, chs: null, mean: null, hiero: null, prim: false,
        addName: null, delName: null, names: null };
    for (; i < tk.length; i++) {
        const t = tk[i];
        if (t === '-prim') { f.prim = true; continue; }
        if (t === '/p' || t === '/g' || t === '/r' || t === '/h') {
            const v = tk[i + 1];
            if (v === undefined) return { error: t + ' 缺少取值' };
            if (t === '/p') f.pron = v; else if (t === '/g') f.code = v; else if (t === '/r') f.mdc = v; else f.hiero = v;
            i++;
            continue;
        }
        if (t === '/m') {
            i++;
            const parts = [];
            while (i < tk.length && !FIELD_RE.test(tk[i]) && tk[i] !== '/h' && tk[i] !== '/m') {
                if (tk[i] === '-en') { f.en = tk[i + 1]; i += 2; continue; }
                if (tk[i] === '-chs') { f.chs = tk[i + 1]; i += 2; continue; }
                if (tk[i] === '-add') { f.addName = tk[i + 1]; i += 2; continue; }
                if (tk[i] === '-del') { f.delName = tk[i + 1]; i += 2; continue; }
                if (tk[i] === '-set') { f.names = (tk[i + 1] || '').split(/[,、]/).map(s => s.trim()).filter(Boolean); i += 2; continue; }
                parts.push(tk[i]); i++;
            }
            i--;
            if (parts.length) f.mean = parts.join(' ');
            continue;
        }
        return { error: '无法识别的参数: ' + t };
    }
    return { fields: f, next: i };
}

/** 解析添加：/a (-v|-d|-p) [-prim] [/p 值] [/g 值] [/r 值] [/m …] [/h 值] */
function parseAdd(tk) {
    const a = { mode: 'a', scope: null, prim: false };
    let i = 1;
    for (; i < tk.length; i++) {
        const t = tk[i];
        if (t === '-v' || t === '-d' || t === '-p') { a.scope = t.slice(1); continue; }
        if (t === '-prim') { a.prim = true; continue; }
        break;
    }
    if (!a.scope) return { error: '添加必须指定范围：-v（词汇）/ -d（定符）/ -p（音素）' };
    const r = parseFields(tk, i);
    if (r.error) return r;
    return Object.assign(a, r.fields, { prim: a.prim || r.fields.prim });
}

/** 解析修改：/m (-v|-d|-p) [-V] /bf <搜索> /ef <字段…> */
function parseModify(tk) {
    const m = { mode: 'm', scope: null, family: false, search: null };
    let i = 1;
    for (; i < tk.length; i++) {
        const t = tk[i];
        if (t === '-v' || t === '-d' || t === '-p') { m.scope = t.slice(1); continue; }
        if (t === '-V') { m.family = true; continue; }
        if (t === '/bf') break;
        return { error: '无法识别的参数: ' + t };
    }
    if (!m.scope) return { error: '修改必须指定范围：-v（词汇）/ -d（定符）/ -p（音素）' };
    const ef = tk.indexOf('/ef', i);
    if (i >= tk.length || tk[i] !== '/bf' || ef < 0) return { error: '修改需用 /bf <搜索条件> /ef 指定目标' };
    const sq = parseQuery(['/s'].concat(tk.slice(i + 1, ef)));
    if (sq.error) return { error: '搜索条件有误：' + sq.error };
    if (sq.all || sq.scope) return { error: '/bf 内的搜索条件不可含 -a / -s / (-v|-d|-p)' };
    m.search = sq;
    const r = parseFields(tk, ef + 1);
    if (r.error) return r;
    m.fields = r.fields;
    return m;
}

// ============================================================================
// 三、排序键
// ============================================================================
/** MdC / 码的自然序键：忽略 - : * { } ( )，数字按数值比较，数字优先于字母。 */
function natKey(s) {
    const out = [];
    for (const part of String(s).replace(/[-:*{}()]/g, '').match(/\d+|\D+/g) || []) {
        out.push(/^\d+$/.test(part) ? [0, parseInt(part, 10), ''] : [1, 0, part]);
    }
    return out;
}
function cmpNat(a, b) {
    const ka = natKey(a), kb = natKey(b);
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
        for (let j = 0; j < 3; j++) {
            if (ka[i][j] < kb[i][j]) return -1;
            if (ka[i][j] > kb[i][j]) return 1;
        }
    }
    return ka.length - kb.length;
}

/** MdC 串中的码 token（用于 /g 过滤）。 */
function codesOfMdC(mdc) {
    return String(mdc).split(/[-:*{}()$<>]/).filter(Boolean);
}

// ============================================================================
// 四、查询
// ============================================================================
const pad = (s, n) => {
    let w = 0;
    for (const ch of String(s)) w += /[\u2E80-\uFFFF]/.test(ch) ? 2 : 1;
    return String(s) + ' '.repeat(Math.max(0, n - w));
};

/** 过长的字段截断显示（保留可读宽度，不撑破表格）。 */
const clip = (s, n = 34) => {
    const str = String(s === undefined || s === null ? '' : s);
    let w = 0, out = '';
    for (const ch of str) {
        const cw = /[\u2E80-\uFFFF]/.test(ch) ? 2 : 1;
        if (w + cw > n) return out + '…';
        out += ch; w += cw;
    }
    return out;
};

/** 单条记录按字段取值（词 / 定符 / 音素各自的可用字段）。 */
function fieldsOf(d, kind) {
    if (kind === 'v') return { p: [d.pron], g: codesOfMdC(d.mdC), r: [d.mdC], m: [d.en, d.chs].filter(Boolean) };
    if (kind === 'd') return { p: [], g: [d.code], r: [], m: d.names.slice() };
    return { p: [d.pron], g: [d.code], r: [d.code], m: [] };
}

/** 单条记录是否满足全部筛选器。 */
function matchEntry(d, kind, q) {
    for (const f of q.filters) {
        const vals = fieldsOf(d, kind)[f.field] || [];
        const exact = f.exact || q.exact;
        const ci = f.field !== 'p';               // 发音区分大小写，其余不区分
        const want = ci ? f.value.toLowerCase() : f.value;
        const hit = vals.some(v => {
            const s = ci ? String(v).toLowerCase() : String(v);
            return exact ? s === want : s.indexOf(want) >= 0;
        });
        if (!hit) return false;
    }
    return true;
}

function doQuery(q, data) {
    const kinds = q.scope ? [q.scope] : ['v', 'd', 'p'];
    const nameOf = { v: '词汇', d: '定符', p: '音素' };
    let total = 0;
    for (const k of kinds) {
        let rows;
        if (k === 'v') {
            rows = data.VOCABULARY.map(u => ({ kind: k, pron: u.pron, mdC: u.mdC,
                en: (u.meaning && u.meaning.en) || '', chs: (u.meaning && u.meaning.chs) || '',
                isVariant: !!u.parent, parentMdC: u.variantOf }));
        } else if (k === 'd') {
            rows = data.DETERMINATIVES.map(u => ({ kind: k, code: u.code, names: u.names }));
        } else {
            rows = data.PHONEME_ROWS.map(r => ({ kind: k, pron: r.pron, code: r.code, primary: data.PHONEMES[r.pron] === r.code }));
        }
        const hit = q.all ? rows : rows.filter(d => matchEntry(d, k, q));
        if (!hit.length) continue;
        total += hit.length;
        console.log('\n── %s（%d 条）%s', nameOf[k], hit.length, q.all ? ' [全部]' : '');
        if (k === 'v') {
            const w = [8, 30, 34];
            console.log('  ' + pad('发音', w[0]) + pad('MdC', w[1]) + pad('英文释义', w[2]) + '中文释义');
            for (const d of hit) console.log('  ' + pad(d.pron, w[0]) + pad(clip(d.mdC, 30) + (d.isVariant ? ' ⟨变体⟩' : ''), w[1] + 4)
                + pad(clip(d.en, 34), w[2]) + clip(d.chs, 34));
        } else if (k === 'd') {
            console.log('  ' + pad('码', 8) + pad('字形', 6) + '名称');
            for (const d of hit) console.log('  ' + pad(d.code, 8) + pad(data.M.charOf(d.code) || '?', 6) + clip(d.names.join(', '), 60));
        } else {
            console.log('  ' + pad('发音', 8) + pad('主码', 8) + pad('字形', 6) + '说明');
            for (const d of hit) {
                console.log('  ' + pad(d.pron, 8) + pad(d.code, 8) + pad(data.M.charOf(d.code) || '?', 6)
                    + (d.primary ? '主字符' : `（同音异形；主码 ${data.PHONEMES[d.pron]}）`));
            }
        }
    }
    console.log('\n合计 %d 条匹配。', total);
    return total;
}

// ============================================================================
// 五、添加
// ============================================================================
/**
 * 备份根目录（写盘前自动备份到这里）。
 * 默认仓库内 `backup/`（已列入 .gitignore，不会进版本库）；
 * 若设置了环境变量 CHEAV_BACKUP_DIR，则备份到该目录（可指向仓库外）。
 */
function backupRoot() {
    return process.env.CHEAV_BACKUP_DIR || path.join(ROOT, 'backup');
}

function backup() {
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const root = backupRoot();
    let dir = path.join(root, stamp);
    for (let n = 2; fs.existsSync(dir); n++) dir = path.join(root, stamp + '-' + n);   // 同秒多次写入不覆盖
    fs.mkdirSync(dir, { recursive: true });
    for (const [k, f] of Object.entries(P)) fs.copyFileSync(f, path.join(dir, path.basename(f)));
    console.log('已备份到 %s/', path.relative(ROOT, dir).startsWith('..') ? dir : path.relative(ROOT, dir));
    return dir;
}

/** 把 MdC 渲染出的字符集中起来（用于 /h 校验）。 */
function glyphsOf(M, mdc) {
    const r = M.parse(mdc);
    if (r.invalid.length) return null;
    let out = '';
    (function walk(u) {
        if (!u) return;
        if (u.type === 'char') out += M.charOf(u.code) || '';
        else if (u.type === 'vrg') u.layers.forEach(l => l.forEach(walk));
        else if (u.type === 'seq') u.units.forEach(walk);
        else if (u.type === 'text') out += u.text;
    })(r.tree);
    return out;
}

function addVocabulary(a, data) {
    const M = data.M;
    if (!a.pron) return '缺少 /p <发音>';
    if (!a.mdc) return '缺少 /r <MdC 渲染串>';
    const parsed = M.parse(a.mdc);
    if (parsed.invalid.length) return 'MdC 无法解析：' + JSON.stringify(parsed.invalid);
    if (a.hiero) {
        const got = glyphsOf(M, a.mdc);
        if (got !== a.hiero) console.log('  ⚠ /h 与 MdC 渲染结果不一致：/h = %s，MdC 渲染 = %s', a.hiero, got || '(空)');
    }
    const en = a.en || (a.mean || ''), chs = a.chs || (a.mean && !a.en ? a.mean : '');
    if (data.VOCABULARY.some(u => u.pron === a.pron && u.mdC === a.mdc)) {
        return '已存在同（发音, MdC）词条，未改动';
    }
    // 按 MdC 自然序插入
    const lines = fs.readFileSync(P.vocab, 'utf8').split('\n');
    const RE = /^\s*new Vocabulary\("([^"]*)",\s*"([^"]*)"/;
    const entries = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(RE);
        if (m) entries.push({ i, pron: m[1], mdc: m[2] });
    }
    let at = null;
    for (const e of entries) { if (cmpNat(e.mdc, a.mdc) <= 0) at = e.i; else break; }
    if (at === null) at = entries.length ? entries[0].i : -1;
    else at = at + 1;
    const mean = (en || chs) ? `, { en: ${JSON.stringify(en)}, chs: ${JSON.stringify(chs)} }` : '';
    const line = `    new Vocabulary(${JSON.stringify(a.pron)}, ${JSON.stringify(a.mdc)}${mean}),`;
    if (DRY) { console.log('  [dry-run] 将在第 %d 行插入：\n%s', at + 1, line); return null; }
    lines.splice(at, 0, line);
    fs.writeFileSync(P.vocab, lines.join('\n'), 'utf8');
    console.log('  已插入第 %d 行：%s', at + 1, line.trim());
    return null;
}

function addDeterminative(a, data) {
    if (!a.code) return '缺少 /g <Gardiner Code>';
    if (!a.mean) return '缺少 /m <名称>';
    if (!data.M.charOf(a.code)) return '码 ' + a.code + ' 不在字体码表中（无法渲染）';
    const lines = fs.readFileSync(P.det, 'utf8').split('\n');
    const RE = /^(\s*)\{ code: "([^"]+)",\s*names: \[([^\]]*)\] \},?\s*$/;
    const idx = lines.findIndex(l => { const m = l.match(RE); return m && m[2] === a.code; });
    if (idx >= 0) {
        const m = lines[idx].match(RE);
        let names = m[3].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
        if (names.includes(a.mean)) {
            if (!a.prim || names[0] === a.mean) return '该名称已存在，未改动';
            names = [a.mean].concat(names.filter(n => n !== a.mean));
            if (DRY) { console.log('  [dry-run] 将#{1} 把 %s 提到首位: %s', a.mean, names.join(', ')); return null; }
            lines[idx] = `${m[1]}{ code: "${a.code}", names: [${names.map(n => `"${n}"`).join(', ')}] },`;
            fs.writeFileSync(P.det, lines.join('\n'), 'utf8');
            console.log('  已把 %s 排到 %s 的第 1 位', a.mean, a.code);
            return null;
        }
        if (!a.prim) names.push(a.mean);
        else names = [a.mean].concat(names);
        lines[idx] = `${m[1]}{ code: "${a.code}", names: [${names.map(n => `"${n}"`).join(', ')}] },`;
        if (DRY) { console.log('  [dry-run] %s → %s', a.code, names.join(', ')); return null; }
        fs.writeFileSync(P.det, lines.join('\n'), 'utf8');
        console.log('  已更新 %s → %s', a.code, names.join(', '));
        return null;
    }
    // 新码：按 Gardiner 码自然序插入
    const rows = [];
    for (let i = 0; i < lines.length; i++) { const m = lines[i].match(RE); if (m) rows.push({ i, code: m[2] }); }
    let at = null;
    for (const r of rows) { if (cmpNat(r.code, a.code) <= 0) at = r.i; else break; }
    at = (at === null) ? (rows.length ? rows[0].i : lines.length - 1) : at + 1;
    const line = `    { code: ${JSON.stringify(a.code)}, names: [${JSON.stringify(a.mean)}] },`;
    if (DRY) { console.log('  [dry-run] 将在第 %d 行插入：\n%s', at + 1, line); return null; }
    lines.splice(at, 0, line);
    fs.writeFileSync(P.det, lines.join('\n'), 'utf8');
    console.log('  已插入第 %d 行：%s', at + 1, line.trim());
    return null;
}

function addPhoneme(a, data) {
    if (!a.pron) return '缺少 /p <发音>';
    if (!a.code) return '缺少 /g <Gardiner Code>';
    if (!data.M.charOf(a.code)) return '码 ' + a.code + ' 不在字体码表中（无法渲染）';
    const lines = fs.readFileSync(P.maps, 'utf8').split('\n');
    const start = lines.findIndex(l => /^const PHONEME_TABLE = \[/.test(l));
    const end = lines.findIndex((l, i) => i > start && /^\];/.test(l));
    if (start < 0 || end < 0) return '定位 PHONEME_TABLE 失败';
    const ROW = /^(\s*)\[([^\]]*)\],?\s*$/;
    const parseRow = (l) => { const m = l.match(ROW); if (!m) return null;
        return { indent: m[1], items: m[2].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean) }; };
    const rows = [];
    for (let i = start + 1; i < end; i++) { const r = parseRow(lines[i]); if (r) rows.push({ i, row: r }); }
    const same = rows.find(r => r.row.items[0] === a.pron);
    if (same) {
        const codes = same.row.items.slice(1);
        if (codes.includes(a.code)) {
            if (!a.prim || codes[0] === a.code) return '该（发音, 码）已存在，未改动';
            const reordered = [a.code].concat(codes.filter(c => c !== a.code));
            lines[same.i] = `    [${[a.pron].concat(reordered).map(x => `"${x}"`).join(', ')}],`;
            if (DRY) { console.log('  [dry-run] %s → %s', a.pron, reordered.join(', ')); return null; }
            fs.writeFileSync(P.maps, lines.join('\n'), 'utf8');
            console.log('  已把 %s 设为主码（%s → %s）', a.code, a.pron, reordered.join(', '));
            return null;
        }
        const nc = a.prim ? [a.code].concat(codes) : codes.concat([a.code]);
        lines[same.i] = `    [${[a.pron].concat(nc).map(x => `"${x}"`).join(', ')}],`;
        if (DRY) { console.log('  [dry-run] %s → %s', a.pron, nc.join(', ')); return null; }
        fs.writeFileSync(P.maps, lines.join('\n'), 'utf8');
        console.log('  已更新 %s → %s', a.pron, nc.join(', '));
        return null;
    }
    // 新发音：单辅音插在单辅音末尾；复辅音按首字母分组（同组内追加）
    const singleRows = rows.filter(r => r.row.items[0].length === 1);
    const multiRows = rows.filter(r => r.row.items[0].length > 1);
    let at;
    if (a.pron.length === 1) {
        at = singleRows.length ? singleRows[singleRows.length - 1].i + 1 : start + 2;
    } else {
        let anchor = null;
        for (const r of multiRows) { if (r.row.items[0][0] <= a.pron[0]) anchor = r.i; else break; }
        at = anchor === null ? (multiRows.length ? multiRows[0].i : (singleRows.length ? singleRows[singleRows.length - 1].i + 1 : start + 2)) : anchor + 1;
    }
    const line = `    [${[a.pron, a.code].map(x => `"${x}"`).join(', ')}],`;
    if (DRY) { console.log('  [dry-run] 将在第 %d 行插入：\n%s', at + 1, line); return null; }
    lines.splice(at, 0, line);
    fs.writeFileSync(P.maps, lines.join('\n'), 'utf8');
    console.log('  已插入第 %d 行：%s', at + 1, line.trim());
    return null;
}

function doAdd(a, data) {
    const err = a.scope === 'v' ? addVocabulary(a, data)
        : a.scope === 'd' ? addDeterminative(a, data)
            : addPhoneme(a, data);
    if (err) { console.log('  ✗ %s', err); return 1; }
    return 0;       // 写盘后的复核由 verify() 统一负责
}

// ============================================================================
// 五之二、变体与修改
// ============================================================================
/** 某范围内可用于匹配的记录行（带 src 指回原始条目）。 */
function rowsOf(kind, data) {
    if (kind === 'v') {
        return data.VOCABULARY.map(u => ({ kind, src: u, pron: u.pron, mdC: u.mdC,
            en: (u.meaning && u.meaning.en) || '', chs: (u.meaning && u.meaning.chs) || '', isVariant: !!u.parent }));
    }
    if (kind === 'd') return data.DETERMINATIVES.map(u => ({ kind, src: u, code: u.code, names: u.names }));
    return data.PHONEME_ROWS.map(r => ({ kind, src: r, pron: r.pron, code: r.code, primary: data.PHONEMES[r.pron] === r.code }));
}

/** 按搜索条件取匹配行（供变体添加与修改使用）。 */
function matchRows(kind, data, q) {
    const rows = rowsOf(kind, data);
    return q.all ? rows : rows.filter(d => matchEntry(d, kind, q));
}

/** /bf … /ef 之间的搜索条件（不含 -a -s 与范围） */
function parseSearch(tk, from, to) {
    const sq = parseQuery(['/s'].concat(tk.slice(from, to)));
    if (sq.error) return sq;
    if (sq.all || sq.scope) return { error: '/bf 内的搜索条件不可含 -a / -s / (-v|-d|-p)' };
    return sq;
}

// ---------- 词汇文件的行级操作 ----------
const VOCAB_LINE = /^(\s*)new Vocabulary\("([^"]*)",\s*"([^"]*)"(?:,\s*(null|\{[^}]*\}))?(?:,\s*"([^"]*)")?\s*\),?\s*$/;

function readVocabLines() {
    const lines = fs.readFileSync(P.vocab, 'utf8').split('\n');
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(VOCAB_LINE);
        if (m) rows.push({ i, indent: m[1], pron: m[2], mdc: m[3], mean: m[4] === undefined ? null : m[4], variantOf: m[5] || null });
    }
    return { lines, rows };
}

/** 生成一行词汇（变体：mean 传 "null" 并给 variantOf）。 */
function vocabLine(pron, mdc, mean, variantOf) {
    return variantOf
        ? `    new Vocabulary(${JSON.stringify(pron)}, ${JSON.stringify(mdc)}, null, ${JSON.stringify(variantOf)}),`
        : `    new Vocabulary(${JSON.stringify(pron)}, ${JSON.stringify(mdc)}${mean ? ', ' + mean : ''}),`;
}

/** 按 MdC 自然序插入若干行（一次性计算位置，自下而上插入，互不影响）。 */
function insertVocabLines(items) {
    const { lines, rows } = readVocabLines();
    const plan = [];
    for (const it of items) {
        let at = null;
        for (const r of rows) { if (cmpNat(r.mdc, it.mdC) <= 0) at = r.i; else break; }
        at = (at === null) ? (rows.length ? rows[0].i : lines.length - 1) : at + 1;
        plan.push({ at, line: it.line, mdC: it.mdC });
    }
    // 同一插入点按 MdC 自然序排定先后
    plan.sort((a, b) => (a.at - b.at) || cmpNat(a.mdC, b.mdC));
    const result = lines.slice();
    for (let k = plan.length - 1; k >= 0; k--) result.splice(plan[k].at, 0, plan[k].line);
    if (!DRY) fs.writeFileSync(P.vocab, result.join('\n'), 'utf8');
    for (const p of plan) console.log('  %s第 %d 行：%s', DRY ? '[dry-run] 将插入' : '已插入', p.at + 1, p.line.trim());
}

/** 替换第 i 行（并按需要重新定位以维持 MdC 自然序）。 */
function rewriteVocabLine(rowIndex, newLine, newMdc) {
    const { lines, rows } = readVocabLines();
    const others = rows.filter(r => r.i !== rowIndex);
    lines[rowIndex] = newLine;
    if (newMdc !== undefined) {
        let at = null;
        for (const r of others) { if (cmpNat(r.mdc, newMdc) <= 0) at = r.i; else break; }
        at = (at === null) ? (others.length ? others[0].i : lines.length - 1) : at + 1;
        const line = lines.splice(rowIndex, 1)[0];
        const target = at > rowIndex ? at - 1 : at;    // 抽出后索引左移
        lines.splice(target, 0, line);
        if (target !== rowIndex) console.log('  （按 MdC 自然序移动到第 %d 行）', target + 1);
    }
    if (!DRY) fs.writeFileSync(P.vocab, lines.join('\n'), 'utf8');
    console.log('  %s第 %d 行：%s', DRY ? '[dry-run] 将改写' : '已改写', rowIndex + 1, newLine.trim());
}

// ---------- [A] 为已存在的词汇添加变体 ----------
function addVariant(tk, data) {
    const bf = tk.indexOf('/bf'), ef = tk.indexOf('/ef', bf + 1);
    if (bf < 0 || ef < 0) return '变体添加需 /bf <搜索条件> /ef';
    const sq = parseSearch(tk, bf + 1, ef);
    if (sq.error) return sq.error;
    const r = parseFields(tk, ef + 1);
    if (r.error) return r.error;
    const f = r.fields;
    if (!f.mdc) return '缺少 /r <MdC 渲染串>';
    if (data.M.parse(f.mdc).invalid.length) return 'MdC 无法解析：' + JSON.stringify(data.M.parse(f.mdc).invalid);
    const hits = matchRows('v', data, sq);
    if (hits.length !== 1) return `母词汇必须恰好 1 个匹配，实际 ${hits.length} 个`;
    const found = hits[0].src;
    const parent = found.parent || found;                     // 若命中的本身是变体，则归到同一母词汇
    if (found.parent) console.log('  （命中的 %s 是变体，归到母词汇 %s）', found.mdC, parent.mdC);
    const pron = f.pron || parent.pron;                       // 未给 /p → 与母词汇同音
    if (data.VOCABULARY.some(u => u.mdC === f.mdc)) return '已存在同 MdC 词条：' + f.mdc;
    if (data.VOCABULARY.some(u => u.pron === pron && u.mdC === f.mdc)) return '已存在同（发音, MdC）词条';
    if (!DRY) backup();
    console.log('  母词汇：%s（%s）', parent.mdC, parent.pron);
    insertVocabLines([{ mdc: f.mdc, line: vocabLine(pron, f.mdc, null, parent.mdC) }]);
    return null;
}

// ---------- [B] 添加新词汇与其变体 ----------
function addVocabWithVariants(tk, data) {
    const bl = tk.indexOf('/bli'), el = tk.indexOf('/eli', bl + 1);
    if (bl < 0 || el < 0) return '词汇+变体添加需 /m <释义> /bli # … # … /eli';
    // /m 释义（在 /bli 之前）
    let mean = null;
    const mi = tk.indexOf('/m', 1);
    if (mi >= 0 && mi < bl) {
        const rf = parseFields(['/m'].concat(tk.slice(mi + 1, bl)), 0);
        if (rf.error) return rf.error;
        mean = rf.fields;
    }
    // 列表项：以 # 分隔
    const items = [];
    let cur = null;
    for (let i = bl + 1; i < el; i++) {
        if (tk[i] === '#') { cur = []; items.push(cur); continue; }
        if (!cur) return '/bli 之后应以 # 开始第 1 项';
        cur.push(tk[i]);
    }
    if (!items.length) return '/bli … /eli 之间没有任何项';
    const parsed = [];
    let prevPron = null;
    for (let n = 0; n < items.length; n++) {
        const rf = parseFields(items[n], 0);
        if (rf.error) return `第 ${n + 1} 项：` + rf.error;
        const f = rf.fields;
        if (!f.mdc) return `第 ${n + 1} 项缺少 /r <MdC 渲染串>`;
        if (data.M.parse(f.mdc).invalid.length) return `第 ${n + 1} 项 MdC 无法解析：` + JSON.stringify(data.M.parse(f.mdc).invalid);
        if (n === 0 && !f.pron) return '第 1 项必须有 /p <发音>';
        const pron = f.pron || prevPron;                       // 省略 /p → 与前一项相同
        if (!pron) return `第 ${n + 1} 项无法确定发音`;
        if (data.VOCABULARY.some(u => u.mdC === f.mdc)) return `第 ${n + 1} 项的 MdC 已存在：` + f.mdc;
        parsed.push({ pron: pron, mdC: f.mdc, hiero: f.hiero });
        prevPron = pron;
    }
    const dup = parsed.map(p => p.mdC).filter((m, i, a) => a.indexOf(m) !== i);
    if (dup.length) return '列表内 MdC 重复：' + dup.join(', ');
    if (!DRY) backup();
    const en = mean ? (mean.en || mean.mean || '') : '';
    const chs = mean ? (mean.chs || (mean.en ? '' : mean.mean || '')) : '';
    if (!en && !chs) console.log('  ⚠ 未给 /m 释义（母词汇释义为空）');
    const parentMdc = parsed[0].mdC;
    const items2 = parsed.map((p, n) => ({
        mdC: p.mdC,
        line: vocabLine(p.pron, p.mdC,
            n === 0 ? `{ en: ${JSON.stringify(en)}, chs: ${JSON.stringify(chs)} }` : null,
            n === 0 ? null : parentMdc),
    }));
    items2.forEach((it, n) => console.log('  %s %s（%s）', n === 0 ? '母词汇' : '变体 ' + n, it.mdC, parsed[n].pron));
    if (parsed[0].hiero) {
        const got = glyphsOf(data.M, parsed[0].mdC);
        if (got !== parsed[0].hiero) console.log('  ⚠ /h 与 MdC 渲染结果不一致：/h = %s，MdC 渲染 = %s', parsed[0].hiero, got || '(空)');
    }
    insertVocabLines(items2);
    return null;
}

// ---------- [C] 修改 ----------
function doModify(m, data) {
    const hits = matchRows(m.scope, data, m.search);
    if (hits.length !== 1) return `需要恰好 1 个匹配，实际 ${hits.length} 个`;
    const t = hits[0].src, f = m.fields;
    if (m.scope === 'v') return modifyVocabulary(t, f, m, data);
    if (m.scope === 'd') return modifyDeterminative(t, f, data);
    return modifyPhoneme(t, f, data);
}

function modifyVocabulary(target, f, m, data) {
    const { rows } = readVocabLines();
    const row = rows.find(r => r.mdc === target.mdC);
    if (!row) return '在 vocabulary.js 中找不到该条目（MdC ' + target.mdC + '）';
    const fam = data.variantFamily ? data.variantFamily(target.mdC) : null;
    const variants = data.variantsOf ? data.variantsOf(target.mdC) : [];
    const touched = [];
    // /m 释义（写在“携带释义”的那一行：变体为空、母词汇带 {…}）
    if (f.en !== null || f.chs !== null || f.mean !== null) {
        const carrier = (fam && fam.parent) || target;               // 释义一定在母词汇行上
        const crow = rows.find(r => r.mdc === carrier.mdC) || row;
        const old = carrier.meaning || {};
        const en = f.en !== null ? f.en : (f.mean !== null && !f.chs ? f.mean : (old.en || ''));
        const chs = f.chs !== null ? f.chs : (f.mean !== null ? (old.chs && f.en !== null ? old.chs : f.mean) : (old.chs || ''));
        const parentIsVariant = !!carrier.variantOf;
        let line = vocabLine(carrier.pron, carrier.mdC, `{ en: ${JSON.stringify(en)}, chs: ${JSON.stringify(chs)} }`, parentIsVariant ? carrier.variantOf : null);
        console.log('  释义：{ en: %s, chs: %s } → { en: %s, chs: %s }', JSON.stringify(old.en || ''), JSON.stringify(old.chs || ''), JSON.stringify(en), JSON.stringify(chs));
        if (variants.length && !m.family) console.log('  ⚠ 该词汇有 %d 个变体，释义共享同一对象，将一并同步', variants.length);
        else if (m.family) console.log('  同时作用于母词汇与 %d 个变体（释义本就共享）', variants.length);
        rewriteVocabLine(crow.i, line);
        touched.push(crow);
        if (m.family && variants.length) console.log('  变体：%s', variants.map(v => v.mdC).join('、'));
    }
    // /p 发音、/r MdC（只作用于命中的这一条）
    if (f.pron !== null || f.mdc !== null) {
        const pron = f.pron !== null ? f.pron : target.pron;
        const mdc = f.mdc !== null ? f.mdc : target.mdC;
        if (f.mdc !== null) {
            if (data.M.parse(mdc).invalid.length) return 'MdC 无法解析：' + JSON.stringify(data.M.parse(mdc).invalid);
            if (data.VOCABULARY.some(u => u.mdC === mdc && u !== target)) return '已存在同 MdC 词条：' + mdc;
        }
        if (f.pron !== null && data.VOCABULARY.some(u => u.pron === pron && u.mdC === mdc && u !== target)) return '已存在同（发音, MdC）词条';
        const isVar = !!row.variantOf;
        const line = vocabLine(pron, mdc, isVar ? null : row.mean, isVar ? row.variantOf : null);
        // 仅当被改的是**母词汇**时，才需要把变体的第 4 参数同步到新 MdC；
        // 改一个变体自己的 MdC 不影响其它变体（它们指向母词汇）。
        const isParent = !isVar && variants.length > 0;
        if (f.mdc !== null && isParent) console.log('  ⚠ 该词汇有 %d 个变体，将同步更新它们的母词汇引用', variants.length);
        rewriteVocabLine(row.i, line, f.mdc !== null ? mdc : undefined);
        touched.push(row);
        if (f.mdc !== null && isParent) {
            const cur = readVocabLines();
            for (let k = variants.length - 1; k >= 0; k--) {
                const vr = cur.rows.find(r => r.mdC === variants[k].mdC);
                if (!vr) continue;
                rewriteVocabLine(vr.i, vocabLine(variants[k].pron, variants[k].mdC, null, mdc));
            }
        }
    }
    if (!touched.length) return '未指明任何修改项（可用 /p /r /m）';
    return null;
}

function modifyDeterminative(target, f, data) {
    const lines = fs.readFileSync(P.det, 'utf8').split('\n');
    const RE = /^(\s*)\{ code: "([^"]+)",\s*names: \[([^\]]*)\] \},?\s*$/;
    const idx = lines.findIndex(l => { const mm = l.match(RE); return mm && mm[2] === target.code; });
    if (idx < 0) return '在 determinatives.js 中找不到码 ' + target.code;
    const mm = lines[idx].match(RE);
    let code = mm[2];
    let names = mm[3].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    const before = code + ' [' + names.join(', ') + ']';
    if (f.code !== null) {
        if (!data.M.charOf(f.code)) return '码 ' + f.code + ' 不在字体码表中（无法渲染）';
        if (data.DETERMINATIVES.some(d => d.code === f.code && d !== target)) return '已存在该码：' + f.code;
        code = f.code;
    }
    if (f.names) names = f.names.slice();
    if (f.addName) { if (!names.includes(f.addName)) names.push(f.addName); }
    if (f.delName) names = names.filter(n => n !== f.delName);
    if (f.mean !== null && !f.names && !f.addName && !f.delName) names = [f.mean];
    if (!names.length) return '名称列表不能为空';
    let line = `${mm[1]}{ code: "${code}", names: [${names.map(n => `"${n}"`).join(', ')}] },`;
    lines[idx] = line;
    if (f.code !== null) {                                   // 码变了 → 按自然序重排
        const rowAt = [];
        for (let i = 0; i < lines.length; i++) { const x = lines[i].match(RE); if (x) rowAt.push({ i, code: x[2] }); }
        const others = rowAt.filter(r => r.i !== idx);
        let at = null;
        for (const r of others) { if (cmpNat(r.code, code) <= 0) at = r.i; else break; }
        at = (at === null) ? (others.length ? others[0].i : lines.length - 1) : at + 1;
        const moved = lines.splice(idx, 1)[0];
        const target2 = at > idx ? at - 1 : at;
        lines.splice(target2, 0, moved);
        if (target2 !== idx) console.log('  （按码自然序移动到第 %d 行）', target2 + 1);
    }
    if (DRY) { console.log('  [dry-run] %s → %s [%s]', before, code, names.join(', ')); return null; }
    fs.writeFileSync(P.det, lines.join('\n'), 'utf8');
    console.log('  已修改：%s → %s [%s]', before, code, names.join(', '));
    return null;
}

function modifyPhoneme(target, f, data) {
    const lines = fs.readFileSync(P.maps, 'utf8').split('\n');
    const start = lines.findIndex(l => /^const PHONEME_TABLE = \[/.test(l));
    const end = lines.findIndex((l, i) => i > start && /^\];/.test(l));
    const ROW = /^(\s*)\[([^\]]*)\],?\s*$/;
    const rows = [];
    for (let i = start + 1; i < end; i++) { const r = lines[i].match(ROW); if (r) rows.push({ i, items: r[2].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean) }); }
    const idx = rows.findIndex(r => r.items[0] === target.pron && r.items.slice(1).includes(target.code));
    if (idx < 0) return `在 maps.js 中找不到音素 ${target.pron} → ${target.code}`;
    const row = rows[idx];
    let pron = row.items[0];
    let codes = row.items.slice(1);
    const before = pron + ' [' + codes.join(', ') + ']';
    if (f.pron !== null) {
        if (data.PHONEME_ROWS.some(r => r.pron === f.pron && r.pron !== pron)) return '已存在该发音：' + f.pron + '（如需合并请手动处理）';
        pron = f.pron;
    }
    if (f.code !== null) {
        if (!data.M.charOf(f.code)) return '码 ' + f.code + ' 不在字体码表中（无法渲染）';
        codes = codes.map(c => c === target.code ? f.code : c);
    }
    if (f.prim) {
        const want = f.code !== null ? f.code : target.code;
        const at = codes.indexOf(want);
        if (at > 0) codes = [want].concat(codes.filter(c => c !== want));
        else console.log('  主码已是 %s，未改动', want);
    }
    lines[row.i] = `    [${[pron].concat(codes).map(x => `"${x}"`).join(', ')}],`;
    if (DRY) { console.log('  [dry-run] %s → %s [%s]', before, pron, codes.join(', ')); return null; }
    fs.writeFileSync(P.maps, lines.join('\n'), 'utf8');
    console.log('  已修改：%s → %s [%s]', before, pron, codes.join(', '));
    return null;
}

// ============================================================================
// 六、入口
// ============================================================================
function run(line, data) {
    const tk = tokenize(line);
    if (!tk.length) return 0;
    if (tk[0] === '/s') {
        const q = parseQuery(tk);
        if (q.error) { console.log('  ✗ %s', q.error); return 1; }
        doQuery(q, data);
        return 0;
    }
    if (tk[0] === '/a') {
        // /a -v -v …＝为已有词汇添加变体；/a -v -V …＝新词汇与其变体
        if (tk[1] === '-v' && tk[2] === '-v') {
            if (!DRY) backup();
            const e1 = addVariant(tk, data);
            if (e1) { console.log('  ✗ %s', e1); return 1; }
            return verify();
        }
        if (tk[1] === '-v' && tk[2] === '-V') {
            if (!DRY) backup();
            const e2 = addVocabWithVariants(tk, data);
            if (e2) { console.log('  ✗ %s', e2); return 1; }
            return verify();
        }
        const a = parseAdd(tk);
        if (a.error) { console.log('  ✗ %s', a.error); return 1; }
        if (!DRY) backup();
        const rc = doAdd(a, data);
        return rc === 0 ? verify() : rc;
    }
    if (tk[0] === '/m') {
        const m = parseModify(tk);
        if (m.error) { console.log('  ✗ %s', m.error); return 1; }
        if (!DRY) backup();
        const e3 = doModify(m, loadAll());
        if (e3) { console.log('  ✗ %s', e3); return 1; }
        return DRY ? 0 : verify();
    }
    console.log('  ✗ 未知指令：%s（查询 /s、添加 /a、修改 /m；:h 看帮助）', tk[0]);
    return 1;
}

/** 写盘后复核：重新载入并检查数据一致性。 */
function verify() {
    if (DRY) return 0;
    try {
        const chk = loadAll();
        const bad = chk.VOCABULARY.filter(u => chk.M.parse(u.mdC).invalid.length);
        const orphans = chk.VOCABULARY.filter(u => u.variantOf && !u.parent);
        if (bad.length) { console.log('  ⚠ 复核发现 %d 条词条 MdC 非法（未回滚，请检查）', bad.length); return 1; }
        if (orphans.length) { console.log('  ⚠ 复核发现 %d 条变体的母词汇不存在', orphans.length); return 1; }
        console.log('  ✓ 复核通过：词条 %d（含变体 %d）/ 定符 %d / 音素登记 %d',
            chk.VOCABULARY.length, chk.VOCABULARY.filter(u => u.parent).length,
            chk.DETERMINATIVES.length, chk.PHONEME_ROWS.length);
    } catch (e) {
        console.log('  ⚠ 复核载入失败：%s（数据可能已损坏，备份在 backup/）', e.message);
        return 1;
    }
    return 0;
}

const HELP = `CHEAV 词条维护脚本

查询：
  /s [-a] [-s] [(-v|-d|-p)] [-e] [/p [-e] 发音] [/g [-e] 码] [/r [-e] MdC] [/m [-e] 释义或定符名]
    -a          列出范围内全部条目（其余参数忽略）
    -s 或缺省    只列匹配项
    -v/-d/-p    范围：词汇 / 定符 / 音素（省略＝三者都查）
    -e          全局一致匹配（作用于其后所有筛选器）
    /p /g /r /m 筛选器；其后的 -e 只对该筛选器生效
  例：
    /s -v /p anx                    词汇中发音含 anx
    /s -v -e /p anx /g S34          发音为 anx 且码为 S34
    /s -v /p anx /g -e S34          发音含 anx 且码恰为 S34
    /s -p -a                        列出全部音素
    /s -d /m eye                    定符名含 eye
添加：
  /a (-v|-d|-p) [-prim] [/p 发音] [/g 码] [/r MdC] [/m …] [/h 象形字]
    /a -v /p whn /r "G43-O4:N35-O118" /m -en "throw down" -chs "推倒"
    /a -p -prim /p a /g D36         音素 a 的主码设为 D36
    /a -d -prim /g C1 /m Ra         定符 C1 的名称 Ra 排到第 1 位
  说明：-prim 用于音素（设为主码）与定符（名称排首位）；/h 仅用于与 MdC 渲染结果比对校验。
变体（互为变体的词汇释义一定相同，且共享同一释义对象）：
  [A] 为已存在的词汇添加变体：
      /a -v -v /bf <搜索条件> /ef [/p 发音] /r <MdC>
        · /bf … /ef 内是与 /s 相同的搜索条件（不可含 -a / -s / (-v|-d|-p)）
        · 母词汇必须恰好 1 个匹配；省略 /p 时变体与母词汇同音
        · 例：/a -v -v /bf /p anx /g -e "S34-N35:AA1" /ef /r "S34-N35:AA1-Z1"
  [B] 添加新词汇与它的变体：
      /a -v -V /m <释义> /bli # /r <MdC> /p <发音> # /r <MdC> # … /eli
        · 第 1 项必须有 /p，第 2 项起可省略 /p（则与前一项同音，不是与第 1 项）
        · 每项必须有 /r；第 1 项为母词汇，其余为它的变体
        · 例：/a -v -V /m -en "house" -chs "房屋" /bli # /r "O1" /p pr # /r "O1-Z1" /eli
修改：
  /m (-v|-d|-p) [-V] /bf <搜索条件> /ef <修改项…>
    · 目标必须恰好 1 个匹配；未指明的项目维持原样
    · -v：/p 改发音、/r 改 MdC、/m [-en …] [-chs …] 改释义
    · -d：/g 改码、/m -set 名1,名2 | -add 名 | -del 名 | <名称>（整列替换）
    · -p：/p 改发音、/g 改码、-prim 设为主码
    · -V（仅 -v）：释义修改同时作用于母词汇与全部变体
    · 例：/m -v -V /bf /p anx /g -e "S34-N35:AA1" /ef /m -en "live, life" -chs "生活，生命"
选项：--dry-run 只预览不写盘。交互模式：输入 :q 退出，:h 帮助。`;

function main() {
    const args = process.argv.slice(2).filter(x => x !== '--dry-run');
    let data = loadAll();
    if (args.includes('--help')) { console.log(HELP); return; }
    if (args.length) {
        process.exitCode = run(args.join(' '), data);
        return;
    }
    console.log('CHEAV 词条维护 — 交互模式（:h 帮助，:q 退出）');
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
    rl.prompt();
    rl.on('line', (line) => {
        const t = line.trim();
        if (t === ':q' || t === ':quit' || t === ':exit') { rl.close(); return; }
        if (t === ':h' || t === ':help') { console.log(HELP); rl.prompt(); return; }
        if (t) { run(t, data); data = loadAll(); }
        rl.prompt();
    });
    rl.on('close', () => console.log('再见。'));
}

main();
