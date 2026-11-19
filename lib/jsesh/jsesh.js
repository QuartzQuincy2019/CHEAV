// packages/core/src/parser/ast.ts
function e(e, t, n) {
	let r = n;
	for (let n of e.options) n.name === t && n.value.nodeType === "Text" && (r = n.value.value);
	return r;
}
function t(e, t, n) {
	let r = n;
	for (let n of e.options) n.name === t && n.value.nodeType === "Int" && (r = n.value.value);
	return r;
}
function n(e, t) {
	let n = e.options.filter((e) => e.name !== t);
	return n.length === e.options.length ? e : {
		nodeType: "OptionList",
		options: n
	};
}
// packages/core/src/parser/symbols.ts
var r = /* @__PURE__ */ function(e) {
	return e.PAGE_END = "PAGE_END", e.LINE_END = "LINE_END", e.TAB_STOP = "TAB_STOP", e.TABBING = "TABBING", e.TABBING_CLEAR = "TABBING_CLEAR", e.HRULE = "HRULE", e.ZONE = "ZONE", e.QUADRAT = "QUADRAT", e.INSERT = "INSERT", e.UNKNOWN_OPERATOR = "UNKNOWN_OPERATOR", e.START_HIEROGLYPHS = "START_HIEROGLYPHS", e.TEXT_SUPER = "TEXT_SUPER", e.WORD_END = "WORD_END", e.SENTENCE_END = "SENTENCE_END", e.SEPARATOR = "SEPARATOR", e.TOGGLE = "TOGGLE", e.SHADING = "SHADING", e.COLON = "COLON", e.STAR = "STAR", e.OPEN_BRACE = "OPEN_BRACE", e.BEGIN_OLD_CARTOUCHE = "BEGIN_OLD_CARTOUCHE", e.BEGIN_CARTOUCHE = "BEGIN_CARTOUCHE", e.END_CARTOUCHE = "END_CARTOUCHE", e.BEGIN_PHIL = "BEGIN_PHIL", e.END_PHIL = "END_PHIL", e.LPAREN = "LPAREN", e.RPAREN = "RPAREN", e.OVERWRITE = "OVERWRITE", e.AMP = "AMP", e.GRAMMAR = "GRAMMAR", e.MODIFIER = "MODIFIER", e.HIEROGLYPH = "HIEROGLYPH", e.DOUBLE_AMP = "DOUBLE_AMP", e.LIG_AFTER = "LIG_AFTER", e.LIG_BEFORE = "LIG_BEFORE", e.DOUBLE_LEFT_CURLY = "DOUBLE_LEFT_CURLY", e.DOUBLE_RIGHT_CURLY = "DOUBLE_RIGHT_CURLY", e.CLOSE_BRACE = "CLOSE_BRACE", e.COMMA = "COMMA", e.EQUAL = "EQUAL", e.INTEGER = "INTEGER", e.IDENTIFIER = "IDENTIFIER", e.TEXT = "TEXT", e.UNKNOWN = "UNKNOWN", e.EOF = "EOF", e;
}({});
// packages/core/src/parser/lexer.ts
function i(e) {
	let t = new RegExp(e, "suy");
	return (e, n) => {
		t.lastIndex = n;
		let r = t.exec(e);
		return r && r[0].length > 0 ? r[0].length : -1;
	};
}
function a(e) {
	return (t, n) => t.startsWith(e, n) ? e.length : -1;
}
function o(...e) {
	return (t, n) => Math.max(...e.map((e) => e(t, n)));
}
var s = (e, t) => t >= e.length ? -1 : (e.codePointAt(t) ?? 0) > 65535 ? 2 : 1, c = (e, t) => {
	if (e[t] !== "+" || t + 1 >= e.length) return -1;
	let n = e[t + 1];
	if (!/[a-rt-z+]/.test(n)) return -1;
	let r = t + 2;
	for (; r < e.length;) {
		let t = e[r];
		if (t === "\\" && e[r + 1] === "+") r += 2;
		else if (t !== "+") r += 1;
		else if (r + 1 < e.length && !/[a-z+]/.test(e[r + 1])) r += 2;
		else break;
	}
	return r - t;
}, l = "[ \\t\\n\\r_]", u = "[ \\t\\n\\r_-]*", d = [
	{
		type: 0,
		match: i(`!!${u}`)
	},
	{
		type: 1,
		match: i(`!(?:=[0-9]+%)?${u}`)
	},
	{
		type: 2,
		match: i("\\?[0-9]+")
	},
	{
		type: 3,
		match: a("%")
	},
	{
		type: 4,
		match: a("%clear")
	},
	{
		type: 5,
		match: i("\\{l[0-9]+,[0-9]+\\}")
	},
	{
		type: 6,
		match: i("\\{L[0-9]+,[0-9]+\\}")
	},
	{
		type: 7,
		match: c
	},
	{
		type: 8,
		match: a("@zone")
	},
	{
		type: 9,
		match: a("@quadrat")
	},
	{
		type: 10,
		match: a("@insert")
	},
	{
		type: 12,
		match: a("+s")
	},
	{
		type: 13,
		match: i("\\|(?:\\\\-|[^-])*")
	},
	{
		type: 14,
		match: i(l)
	},
	{
		type: 15,
		match: i(`(?:${l}${l})+`)
	},
	{
		type: 16,
		match: i(`-${u}`)
	},
	{
		type: 17,
		match: i("-#-?")
	},
	{
		type: 18,
		match: i("#(?:-| +)")
	},
	{
		type: 19,
		match: a("#")
	},
	{
		type: 20,
		match: i("-?#b")
	},
	{
		type: 21,
		match: i("-?#e")
	},
	{
		type: 22,
		match: a("$r")
	},
	{
		type: 23,
		match: a("$b")
	},
	{
		type: 24,
		match: a("?")
	},
	{
		type: 25,
		match: a("??")
	},
	{
		type: 26,
		match: a("^")
	},
	{
		type: 27,
		match: a("$")
	},
	{
		type: 28,
		match: i("#1?2?3?4?")
	},
	{
		type: 29,
		match: a(":")
	},
	{
		type: 30,
		match: a("*")
	},
	{
		type: 31,
		match: a("["),
		next: 1
	},
	{
		type: 32,
		match: a("<")
	},
	{
		type: 33,
		match: i("<[SFH][bme]")
	},
	{
		type: 34,
		match: i("<[SFHG]")
	},
	{
		type: 35,
		match: i("<[bme]")
	},
	{
		type: 36,
		match: i("<[sfhg][0123]")
	},
	{
		type: 37,
		match: i("<[sfhg]")
	},
	{
		type: 38,
		match: i("<[012]")
	},
	{
		type: 39,
		match: a(">")
	},
	{
		type: 40,
		match: i("[sfhg][0123]>")
	},
	{
		type: 41,
		match: i("[sfhg]>")
	},
	{
		type: 42,
		match: i("[012]>")
	},
	{
		type: 43,
		match: a("[[")
	},
	{
		type: 44,
		match: a("[{")
	},
	{
		type: 45,
		match: a("[\"")
	},
	{
		type: 46,
		match: a("['")
	},
	{
		type: 47,
		match: a("[&")
	},
	{
		type: 48,
		match: a("]]")
	},
	{
		type: 49,
		match: a("}]")
	},
	{
		type: 50,
		match: a("\"]")
	},
	{
		type: 51,
		match: a("']")
	},
	{
		type: 52,
		match: a("&]")
	},
	{
		type: 53,
		match: a(")]")
	},
	{
		type: 54,
		match: a("[(")
	},
	{
		type: 55,
		match: a("?]")
	},
	{
		type: 56,
		match: a("[?")
	},
	{
		type: 57,
		match: a("(")
	},
	{
		type: 58,
		match: a(")")
	},
	{
		type: 59,
		match: a("##")
	},
	{
		type: 60,
		match: a("&")
	},
	{
		type: 61,
		match: a("=")
	},
	{
		type: 62,
		match: a("\\?")
	},
	{
		type: 63,
		match: i("\\\\R-?[0-9]*")
	},
	{
		type: 64,
		match: i("\\\\[A-Za-z]*[0-9]*")
	},
	{
		type: 65,
		match: a("`")
	},
	{
		type: 66,
		match: a("o")
	},
	{
		type: 67,
		match: a("O")
	},
	{
		type: 68,
		match: i("\"(?:[^\"\\\\\\]]|\\\\.)*\"")
	},
	{
		type: 11,
		match: i("@[a-z]+")
	},
	{
		type: 69,
		match: o(i("(?:[A-Z]|Aa)[0-9]+A*"), i("[@a-zA-Z0-9]+"), i("@."))
	},
	{
		type: 70,
		match: a(".")
	},
	{
		type: 71,
		match: a("..")
	},
	{
		type: 72,
		match: a("//")
	},
	{
		type: 73,
		match: a("v/")
	},
	{
		type: 74,
		match: a("/")
	},
	{
		type: 75,
		match: a("h/")
	},
	{
		type: 76,
		match: o(a("&&"), a("**"))
	},
	{
		type: 77,
		match: a("&&&")
	},
	{
		type: 78,
		match: o(a("^^^"), a("^^"))
	},
	{
		type: 79,
		match: a("{{"),
		next: 1
	},
	{
		type: 86,
		match: s
	},
	{
		type: 82,
		match: a(",")
	}
], f = [
	{
		type: 80,
		match: a("}}"),
		next: 0
	},
	{
		type: 81,
		match: a("]"),
		next: 0
	},
	{
		type: 82,
		match: a(",")
	},
	{
		type: 83,
		match: a("=")
	},
	{
		type: 84,
		match: i("[0-9]+")
	},
	{
		type: 85,
		match: i("[A-Za-z_][A-Za-z0-9_]*")
	},
	{
		type: 86,
		match: s
	}
], p = /[ \t\n\r]*/y, m = class {
	source;
	pos = 0;
	state = 0;
	philologyAsSigns = !1;
	expectSpace = !1;
	justAfterSign = !1;
	constructor(e) {
		this.source = e;
	}
	position() {
		return this.pos;
	}
	nextSymbol() {
		for (;;) {
			let e = this.nextToken();
			if (e === void 0) return;
			let t = this.interpret(e.type, e.text, e.start);
			if (t !== void 0) return this.fixExpect(t), t;
		}
	}
	nextToken() {
		if (this.state === 1 && (p.lastIndex = this.pos, p.exec(this.source), this.pos = p.lastIndex), this.pos >= this.source.length) return;
		let e = this.state === 0 ? d : f, t, n = 0;
		for (let r of e) {
			let e = r.match(this.source, this.pos);
			(e > n || e === n && e > 0 && r.type < t.type) && (t = r, n = e);
		}
		let r = this.pos;
		return this.pos += n, t.next !== void 0 && (this.state = t.next), {
			type: t.type,
			text: this.source.substring(r, this.pos),
			start: r
		};
	}
	fixExpect(e) {
		this.expectSpace = e.code === r.HIEROGLYPH || e.code === r.MODIFIER || e.code === r.DOUBLE_RIGHT_CURLY, this.justAfterSign = e.code === r.HIEROGLYPH;
	}
	interpret(e, t, n) {
		let i = (e, r = null) => ({
			code: e,
			value: r,
			text: t,
			position: n
		}), a = (e) => i(r.HIEROGLYPH, {
			subtype: e,
			text: t
		}), o = (e) => i(r.TOGGLE, e), s = (e, n) => this.philologyAsSigns ? i(r.HIEROGLYPH, {
			subtype: {
				nodeType: "Philology",
				kind: e,
				begin: n
			},
			text: t
		}) : i(n ? r.BEGIN_PHIL : r.END_PHIL, e);
		switch (e) {
			case 0: return i(r.PAGE_END);
			case 1: return i(r.LINE_END, v(t));
			case 2: return i(r.TAB_STOP, parseInt(t.substring(1), 10));
			case 3: return i(r.TABBING);
			case 4: return i(r.TABBING_CLEAR);
			case 5: return i(r.HRULE, g("l", t));
			case 6: return i(r.HRULE, g("L", t));
			case 7: return i(r.TEXT, ee(t));
			case 8: return i(r.ZONE);
			case 9: return i(r.QUADRAT);
			case 10: return i(r.INSERT);
			case 11: return i(r.UNKNOWN_OPERATOR);
			case 12: return i(r.START_HIEROGLYPHS);
			case 13: return i(r.TEXT_SUPER, t.substring(1));
			case 14: return this.expectSpace ? i(r.WORD_END) : void 0;
			case 15: return this.expectSpace ? i(r.SENTENCE_END) : void 0;
			case 16: return i(r.SEPARATOR);
			case 17: return o("SHADING_TOGGLE");
			case 18: return this.justAfterSign ? i(r.SHADING, "#1234") : o("SHADING_TOGGLE");
			case 19: return this.justAfterSign ? i(r.OVERWRITE) : o("SHADING_TOGGLE");
			case 20: return o("SHADING_ON");
			case 21: return o("SHADING_OFF");
			case 22: return o("RED");
			case 23: return o("BLACK");
			case 24: return o("LACUNA");
			case 25: return o("LINE_LACUNA");
			case 26: return o("OMIT");
			case 27: return o("BLACK_RED");
			case 28: return i(r.SHADING, t);
			case 29: return i(r.COLON);
			case 30: return i(r.STAR);
			case 31: return i(r.OPEN_BRACE);
			case 32: return i(r.BEGIN_OLD_CARTOUCHE, {
				code: "c",
				part: "a"
			});
			case 33: return i(r.BEGIN_OLD_CARTOUCHE, {
				code: t[1],
				part: t[2]
			});
			case 34: return i(r.BEGIN_OLD_CARTOUCHE, {
				code: t[1],
				part: "a"
			});
			case 35: return i(r.BEGIN_OLD_CARTOUCHE, {
				code: "c",
				part: t[1]
			});
			case 36: return i(r.BEGIN_CARTOUCHE, {
				type: t[1],
				part: h(t[2])
			});
			case 37: return i(r.BEGIN_CARTOUCHE, {
				type: t[1],
				part: 1
			});
			case 38: return i(r.BEGIN_CARTOUCHE, {
				type: "c",
				part: h(t[1])
			});
			case 39: return i(r.END_CARTOUCHE, {
				type: "c",
				part: 2
			});
			case 40: return i(r.END_CARTOUCHE, {
				type: t[0],
				part: h(t[1])
			});
			case 41: return i(r.END_CARTOUCHE, {
				type: t[0],
				part: 2
			});
			case 42: return i(r.END_CARTOUCHE, {
				type: "c",
				part: h(t[0])
			});
			case 43: return s("ERASED_SIGNS", !0);
			case 48: return s("ERASED_SIGNS", !1);
			case 44: return s("EDITOR_SUPERFLUOUS", !0);
			case 49: return s("EDITOR_SUPERFLUOUS", !1);
			case 45: return s("PREVIOUSLY_READABLE", !0);
			case 50: return s("PREVIOUSLY_READABLE", !1);
			case 46: return s("SCRIBE_ADDITION", !0);
			case 51: return s("SCRIBE_ADDITION", !1);
			case 47: return s("EDITOR_ADDITION", !0);
			case 52: return s("EDITOR_ADDITION", !1);
			case 53: return s("MINOR_ADDITION", !1);
			case 54: return s("MINOR_ADDITION", !0);
			case 55: return s("DUBIOUS", !1);
			case 56: return s("DUBIOUS", !0);
			case 57: return i(r.LPAREN);
			case 58: return i(r.RPAREN);
			case 59: return i(r.OVERWRITE);
			case 60: return i(r.AMP);
			case 61: return i(r.GRAMMAR);
			case 62:
			case 63:
			case 64: return i(r.MODIFIER, _(t));
			case 65:
			case 69: return a("MDC_CODE");
			case 66: return a("RED_POINT");
			case 67: return a("BLACK_POINT");
			case 68: return a("SMALL_TEXT");
			case 70: return a("HALF_SPACE");
			case 71: return a("FULL_SPACE");
			case 72: return a("FULL_SHADE");
			case 73: return a("VERTICAL_SHADE");
			case 74: return a("QUARTER_SHADE");
			case 75: return a("HORIZONTAL_SHADE");
			case 76: return i(r.DOUBLE_AMP);
			case 77: return i(r.LIG_AFTER);
			case 78: return i(r.LIG_BEFORE);
			case 79: return i(r.DOUBLE_LEFT_CURLY);
			case 80: return i(r.DOUBLE_RIGHT_CURLY);
			case 81: return i(r.CLOSE_BRACE);
			case 82: return i(r.COMMA);
			case 83: return i(r.EQUAL);
			case 84: return i(r.INTEGER, parseInt(t, 10));
			case 85: return i(r.IDENTIFIER, t);
			case 86: return i(r.UNKNOWN, t);
		}
	}
};
function h(e) {
	return e.charCodeAt(0) - 48;
}
function g(e, t) {
	let n = t.indexOf(",");
	return {
		type: e,
		start: parseInt(t.substring(2, n), 10),
		end: parseInt(t.substring(n + 1, t.indexOf("}")), 10)
	};
}
function _(e) {
	let t = 1;
	for (; t < e.length && /[\p{L}?]/u.test(e[t]);) t++;
	return {
		name: e.substring(1, t),
		value: t < e.length ? parseInt(e.substring(t), 10) : null
	};
}
function ee(e) {
	let t = e.length > 2 ? e.substring(2) : "";
	return t = t.replaceAll("\\+", "+").replaceAll("\\\\", "\\"), {
		code: e[1],
		text: t
	};
}
function v(e) {
	let t = e.indexOf("=");
	return t === -1 ? 100 : parseInt(e.substring(t + 1, e.indexOf("%")), 10);
}
// packages/core/src/parser/parser.ts
var y = class extends Error {
	line;
	charPos;
	token;
	constructor(e, t, n, r) {
		super(e), this.line = t, this.charPos = n, this.token = r, this.name = "MdcSyntaxError";
	}
}, te = {
	c: "CARTOUCHE",
	s: "SEREKH",
	h: "HOUT",
	f: "CASTLE",
	g: "CIRCULAR_ENCLOSURE"
}, ne = [
	"NONE",
	"FIRST",
	"SECOND",
	"THIRD"
], re = {
	s: "START",
	e: "END",
	t: "TOP",
	b: "BOTTOM",
	st: "START_TOP",
	sb: "START_BOTTOM",
	et: "END_TOP",
	eb: "END_BOTTOM",
	c: "CENTER"
};
function ie(e) {
	let t = te[e.toLowerCase()];
	if (t === void 0) throw Error("Not a valid cartouche type code: " + e);
	return t;
}
function ae(e) {
	let t = ne[e];
	if (t === void 0) throw Error("Not a valid cartouche part digit: " + e);
	return t;
}
function oe(e, t = {}) {
	return new se(t).parse(e);
}
var se = class {
	philologyAsSigns;
	lexer;
	source = "";
	token;
	constructor(e = {}) {
		this.philologyAsSigns = e.philologyAsSigns ?? !0;
	}
	parse(e) {
		this.source = e, this.lexer = new m(e), this.lexer.philologyAsSigns = this.philologyAsSigns;
		try {
			return this.advance(), this.parseMdcFile();
		} catch (e) {
			throw e instanceof y ? e : new y("Generic Error: " + e.message, 0, 0, "");
		}
	}
	lineOf(e) {
		let t = 0, n = Math.min(e, this.source.length);
		for (let e = 0; e < n; e++) this.source[e] === "\n" && t++;
		return t;
	}
	error(e) {
		let t = this.lineOf(this.token.position), n = this.token.position, r = this.token.text;
		return new y(`${e} line ${t} char ${n} at token '${r}'`, t, n, r);
	}
	advance() {
		this.token = this.lexer.nextSymbol() ?? {
			code: r.EOF,
			value: null,
			text: "",
			position: this.lexer.position()
		};
	}
	at(e) {
		return this.token.code === e;
	}
	expect(e, t) {
		if (!this.at(e)) throw this.error("expected " + t);
		let n = this.token.value;
		return this.advance(), n;
	}
	atHieroglyphStart() {
		return this.at(r.GRAMMAR) || this.at(r.HIEROGLYPH);
	}
	atCadratStart() {
		return this.atHieroglyphStart() || this.at(r.BEGIN_PHIL) || this.at(r.LPAREN) || this.at(r.BEGIN_CARTOUCHE) || this.at(r.BEGIN_OLD_CARTOUCHE) || this.at(r.QUADRAT) || this.at(r.INSERT);
	}
	parseMdcFile() {
		let e = this.parseTopItems();
		if (!this.at(r.EOF)) throw this.error("unexpected or unknown item.");
		return {
			nodeType: "Document",
			topItems: {
				nodeType: "TopItemList",
				items: e
			}
		};
	}
	parseTopItems() {
		let e = [];
		for (;;) {
			this.skipOptSeparator();
			let t, n = this.token.value;
			switch (this.token.code) {
				case r.TOGGLE:
					t = {
						nodeType: "Toggle",
						toggleType: n
					}, this.advance();
					break;
				case r.START_HIEROGLYPHS:
					t = { nodeType: "StartHieroglyphicText" }, this.advance();
					break;
				case r.TEXT: {
					let e = n;
					t = {
						nodeType: "AlphabeticText",
						scriptCode: e.code,
						text: e.text
					}, this.advance();
					break;
				}
				case r.TEXT_SUPER:
					t = {
						nodeType: "Superscript",
						text: n
					}, this.advance();
					break;
				case r.LINE_END:
					t = {
						nodeType: "LineBreak",
						skip: n
					}, this.advance();
					break;
				case r.PAGE_END:
					t = { nodeType: "PageBreak" }, this.advance();
					break;
				case r.TAB_STOP:
					t = {
						nodeType: "TabStop",
						stopWidth: n
					}, this.advance();
					break;
				case r.TABBING:
					this.advance(), t = {
						nodeType: "Tabbing",
						options: this.parseOptionList()
					};
					break;
				case r.TABBING_CLEAR:
					t = { nodeType: "TabbingClear" }, this.advance();
					break;
				case r.HRULE: {
					let e = n;
					t = {
						nodeType: "HRule",
						lineType: e.type,
						startPos: e.start,
						endPos: e.end
					}, this.advance();
					break;
				}
				case r.ZONE:
					t = this.parseZone();
					break;
				default: t = this.atCadratStart() ? this.parseCadratWithShading() : null;
			}
			if (t === null) break;
			e.push(t);
		}
		return e;
	}
	skipOptSeparator() {
		this.at(r.SEPARATOR) && this.advance();
	}
	parseZone() {
		this.expect(r.ZONE, "zone");
		let e = {
			nodeType: "OptionList",
			options: []
		};
		this.at(r.OPEN_BRACE) && (e = this.parseOptionList()), this.expect(r.LPAREN, "'('");
		let t = this.parseTopItems();
		return this.expect(r.RPAREN, "')'"), {
			nodeType: "Zone",
			options: e,
			list: {
				nodeType: "TopItemList",
				items: t
			}
		};
	}
	parseOptionList() {
		this.expect(r.OPEN_BRACE, "'['");
		let e = [];
		for (;;) {
			let t = this.expect(r.IDENTIFIER, "option name");
			if (this.at(r.EQUAL)) {
				if (this.advance(), this.at(r.IDENTIFIER)) e.push({
					nodeType: "Option",
					name: t,
					value: {
						nodeType: "Text",
						value: this.token.value
					}
				});
				else if (this.at(r.INTEGER)) e.push({
					nodeType: "Option",
					name: t,
					value: {
						nodeType: "Int",
						value: this.token.value
					}
				});
				else throw this.error("expected option value");
				this.advance();
			} else e.push({
				nodeType: "Option",
				name: t,
				value: { nodeType: "Flag" }
			});
			if (!this.at(r.COMMA)) break;
			this.advance();
		}
		return this.expect(r.CLOSE_BRACE, "']'"), {
			nodeType: "OptionList",
			options: e
		};
	}
	parseCadratWithShading() {
		let e = {
			nodeType: "Cadrat",
			hBoxes: [],
			shading: 0,
			options: null
		};
		return this.parseCadrat(e), this.at(r.SHADING) && (e.shading = ce(this.token.value), this.advance()), e;
	}
	parseCadrat(e) {
		this.at(r.QUADRAT) ? (this.advance(), this.at(r.OPEN_BRACE) && (e.options = this.parseOptionList()), this.expect(r.LPAREN, "'('"), this.parseVerticalStack(e), this.expect(r.RPAREN, "')'")) : this.parseVerticalStack(e);
	}
	parseVerticalStack(e) {
		for (e.hBoxes.push(this.parseHorizontalList()); this.at(r.COLON);) this.advance(), e.hBoxes.push(this.parseHorizontalList());
	}
	parseHorizontalList() {
		let e = [this.parseHorizontalListElement()];
		for (; this.at(r.STAR);) this.advance(), e.push(this.parseHorizontalListElement());
		return {
			nodeType: "HBox",
			elements: e
		};
	}
	parseHorizontalListElement() {
		if (this.at(r.BEGIN_CARTOUCHE) || this.at(r.BEGIN_OLD_CARTOUCHE)) return this.parseCartouche();
		let e;
		if (this.atHieroglyphStart()) {
			let t = this.parseHieroglyph();
			if (this.at(r.LIG_AFTER)) return this.advance(), {
				nodeType: "ComplexLigature",
				beforeGroup: null,
				hieroglyph: t,
				afterGroup: this.parseInnerGroup()
			};
			e = this.continueInnerGroup(t);
		} else e = this.parseInnerGroup();
		if (this.at(r.LIG_BEFORE)) {
			this.advance();
			let t = this.parseHieroglyph(), n = null;
			return this.at(r.LIG_AFTER) && (this.advance(), n = this.parseInnerGroup()), {
				nodeType: "ComplexLigature",
				beforeGroup: e,
				hieroglyph: t,
				afterGroup: n
			};
		}
		return e;
	}
	parseInnerGroup() {
		if (this.atHieroglyphStart()) return this.continueInnerGroup(this.parseHieroglyph());
		if (this.at(r.BEGIN_PHIL)) return this.parsePhilology();
		if (this.at(r.LPAREN)) return this.parseSubgroup();
		if (this.at(r.INSERT)) return this.parseInsert();
		throw this.error("unexpected or unknown item.");
	}
	parseInsert() {
		this.expect(r.INSERT, "insert");
		let t = this.parseOptionList(), i = e(t, "dir", null);
		if (i === null) throw this.error("insert: missing 'dir' option");
		let a = re[i];
		if (a === void 0) throw this.error("insert: unknown 'dir' option value: " + i);
		this.expect(r.LPAREN, "'('");
		let o = this.parseBasicItems();
		this.expect(r.COMMA, "','");
		let s = this.parseBasicItems();
		return this.expect(r.RPAREN, "')'"), {
			nodeType: "Insert",
			direction: a,
			options: n(t, "dir"),
			mainItems: o,
			insertedItems: s
		};
	}
	continueInnerGroup(e) {
		switch (this.token.code) {
			case r.AMP:
			case r.DOUBLE_AMP: {
				let t = this.token.code, n = [e];
				for (; this.at(t);) this.advance(), n.push(this.parseHieroglyph());
				return t === r.AMP ? {
					nodeType: "Ligature",
					hieroglyphs: n
				} : {
					nodeType: "AbsoluteGroup",
					hieroglyphs: n
				};
			}
			case r.OVERWRITE: return this.advance(), {
				nodeType: "Overwrite",
				first: e,
				second: this.parseHieroglyph()
			};
			default: return e;
		}
	}
	parsePhilology() {
		let e = this.expect(r.BEGIN_PHIL, "philology start"), t = this.parseBasicItems();
		return {
			nodeType: "Philology",
			openingKind: e,
			closingKind: this.expect(r.END_PHIL, "philology end"),
			content: t
		};
	}
	parseSubgroup() {
		this.expect(r.LPAREN, "'('");
		let e = this.parseBasicItems();
		return this.expect(r.RPAREN, "')'"), {
			nodeType: "SubCadrat",
			content: e
		};
	}
	parseCartouche() {
		if (this.at(r.BEGIN_CARTOUCHE)) {
			let e = this.token.value;
			this.advance();
			let t = this.parseBasicItems(), n = this.expect(r.END_CARTOUCHE, "end of cartouche");
			return this.parseModifiers(), {
				nodeType: "Cartouche",
				type: ie(e.type),
				startPart: ae(e.part),
				endPart: ae(n.part),
				content: t
			};
		}
		let e = this.expect(r.BEGIN_OLD_CARTOUCHE, "cartouche"), t = this.parseBasicItems();
		this.expect(r.END_CARTOUCHE, "end of cartouche");
		let n, i;
		switch (e.part.toLowerCase()) {
			case "b":
				n = "FIRST", i = "NONE";
				break;
			case "m":
				n = "NONE", i = "NONE";
				break;
			case "e":
				n = "NONE", i = "SECOND";
				break;
			default: n = "FIRST", i = "SECOND";
		}
		return {
			nodeType: "Cartouche",
			type: ie(e.code),
			startPart: n,
			endPart: i,
			content: t
		};
	}
	parseBasicItems() {
		let e = [];
		for (;;) if (this.skipOptSeparator(), this.at(r.TEXT)) {
			let t = this.token.value;
			e.push({
				nodeType: "AlphabeticText",
				scriptCode: t.code,
				text: t.text
			}), this.advance();
		} else if (this.at(r.START_HIEROGLYPHS)) e.push({ nodeType: "StartHieroglyphicText" }), this.advance();
		else if (this.at(r.TOGGLE)) e.push({
			nodeType: "Toggle",
			toggleType: this.token.value
		}), this.advance();
		else if (this.atCadratStart()) e.push(this.parseCadratWithShading());
		else break;
		return {
			nodeType: "BasicItemList",
			items: e
		};
	}
	parseHieroglyph() {
		let e = !1;
		this.at(r.GRAMMAR) && (e = !0, this.advance());
		let t = this.expect(r.HIEROGLYPH, "sign code"), n = this.parseModifiers(), i = 0, a = 0, o = 100;
		this.at(r.DOUBLE_LEFT_CURLY) && (this.advance(), i = this.expect(r.INTEGER, "integer"), this.expect(r.COMMA, "','"), a = this.expect(r.INTEGER, "integer"), this.expect(r.COMMA, "','"), o = this.expect(r.INTEGER, "integer"), this.expect(r.DOUBLE_RIGHT_CURLY, "'}}'"));
		let s = "NONE";
		return this.at(r.WORD_END) ? (s = "WORD_END", this.advance()) : this.at(r.SENTENCE_END) && (s = "SENTENCE_END", this.advance()), {
			nodeType: "Hieroglyph",
			isGrammar: e,
			type: t.subtype,
			code: t.text,
			modifiers: n,
			endingCode: s,
			x: i,
			y: a,
			scale: o
		};
	}
	parseModifiers() {
		let e = [];
		for (; this.at(r.MODIFIER);) {
			let t = this.token.value;
			e.push({
				nodeType: "Modifier",
				name: t.name,
				value: t.value
			}), this.advance();
		}
		return {
			nodeType: "ModifierList",
			modifiers: e
		};
	}
};
function ce(e) {
	let t = 0;
	for (let n of e) switch (n) {
		case "1":
			t |= 1;
			break;
		case "2":
			t |= 2;
			break;
		case "3":
			t |= 4;
			break;
		case "4": t |= 8;
	}
	return t;
}
// packages/core/src/model/constants.ts
var b = {
	HALFSPACE: 1,
	FULLSPACE: 2,
	REDPOINT: 3,
	BLACKPOINT: 4,
	FULLSHADE: 5,
	VERTICALSHADE: 6,
	HORIZONTALSHADE: 7,
	QUATERSHADE: 8,
	MDCCODE: 9,
	SMALLTEXT: 10,
	ERASEDSIGNS: 50,
	EDITORADDITION: 51,
	EDITORSUPERFLUOUS: 52,
	PREVIOUSLYREADABLE: 53,
	SCRIBEADDITION: 54,
	MINORADDITION: 55,
	DUBIOUS: 56,
	BEGINERASE: 100,
	ENDERASE: 101,
	BEGINEDITORADDITION: 102,
	ENDEDITORADDITION: 103,
	BEGINEDITORSUPERFLUOUS: 104,
	ENDEDITORSUPERFLUOUS: 105,
	BEGINPREVIOUSLYREADABLE: 106,
	ENDPREVIOUSLYREADABLE: 107,
	BEGINSCRIBEADDITION: 108,
	ENDSCRIBEADDITION: 109,
	BEGINMINORADDITION: 110,
	ENDMINORADDITION: 111,
	BEGINDUBIOUS: 112,
	ENDDUBIOUS: 113
}, x = {
	NONE: 0,
	TOP_START: 1,
	TOP_END: 2,
	BOTTOM_START: 4,
	BOTTOM_END: 8,
	FULL: 15
};
function le(e, t) {
	if (t === x.NONE) return "";
	let n = e;
	return t & x.TOP_START && (n += "1"), t & x.TOP_END && (n += "2"), t & x.BOTTOM_START && (n += "3"), t & x.BOTTOM_END && (n += "4"), n;
}
var ue = {
	CARTOUCHE: "c",
	SEREKH: "s",
	HWT: "h",
	CASTLE: "f",
	CIRCULAR_ENCLOSURE: "g"
};
function de(e) {
	return ue[e];
}
function fe(e) {
	let t = e.toLowerCase();
	for (let [e, n] of Object.entries(ue)) if (n === t) return e;
	throw Error("Not a valid cartouche type code: " + e);
}
var pe = {
	l: "LATIN",
	b: "BOLD",
	i: "ITALIC",
	t: "TRANSLITERATION",
	c: "COPTIC",
	g: "GREEK",
	h: "HEBREW",
	r: "CYRILLIC"
};
function me(e) {
	return pe[e] ?? "OTHER";
}
var he = {
	[b.HALFSPACE]: ".",
	[b.FULLSPACE]: "..",
	[b.REDPOINT]: "o",
	[b.BLACKPOINT]: "O",
	[b.FULLSHADE]: "//",
	[b.VERTICALSHADE]: "v/",
	[b.HORIZONTALSHADE]: "h/",
	[b.QUATERSHADE]: "/",
	[b.BEGINERASE]: "[[",
	[b.ENDERASE]: "]]",
	[b.BEGINEDITORADDITION]: "[&",
	[b.ENDEDITORADDITION]: "&]",
	[b.BEGINMINORADDITION]: "[(",
	[b.ENDMINORADDITION]: ")]",
	[b.BEGINDUBIOUS]: "[?",
	[b.ENDDUBIOUS]: "?]",
	[b.BEGINEDITORSUPERFLUOUS]: "[{",
	[b.ENDEDITORSUPERFLUOUS]: "}]",
	[b.BEGINPREVIOUSLYREADABLE]: "[\"",
	[b.ENDPREVIOUSLYREADABLE]: "\"]",
	[b.BEGINSCRIBEADDITION]: "['",
	[b.ENDSCRIBEADDITION]: "']",
	[b.SMALLTEXT]: "\"\""
}, ge = new Map(Object.entries(he).map(([e, t]) => [t, Number(e)]));
function _e(e) {
	return he[e];
}
function ve(e) {
	return ge.get(e) ?? -1;
}
function ye(e) {
	return {
		[b.ERASEDSIGNS]: "[[",
		[b.EDITORADDITION]: "[&",
		[b.EDITORSUPERFLUOUS]: "[{",
		[b.PREVIOUSLYREADABLE]: "[\"",
		[b.SCRIBEADDITION]: "['"
	}[e];
}
function be(e) {
	return {
		[b.ERASEDSIGNS]: "]]",
		[b.EDITORADDITION]: "&]",
		[b.EDITORSUPERFLUOUS]: "}]",
		[b.PREVIOUSLYREADABLE]: "\"]",
		[b.SCRIBEADDITION]: "']"
	}[e];
}
// packages/core/src/model/model.ts
var S = class {
	visitDefault(e) {}
	visitHieroglyphicText(e) {
		this.visitDefault(e);
	}
	visitCadrat(e) {
		this.visitDefault(e);
	}
	visitHBox(e) {
		this.visitDefault(e);
	}
	visitHieroglyph(e) {
		this.visitDefault(e);
	}
	visitModifiersList(e) {
		this.visitDefault(e);
	}
	visitModifier(e) {
		this.visitDefault(e);
	}
	visitLigature(e) {
		this.visitDefault(e);
	}
	visitAbsoluteGroup(e) {
		this.visitDefault(e);
	}
	visitOverwrite(e) {
		this.visitDefault(e);
	}
	visitComplexLigature(e) {
		this.visitDefault(e);
	}
	visitSubCadrat(e) {
		this.visitDefault(e);
	}
	visitBasicItemList(e) {
		this.visitDefault(e);
	}
	visitCartouche(e) {
		this.visitDefault(e);
	}
	visitPhilology(e) {
		this.visitDefault(e);
	}
	visitAlphabeticCharacter(e) {
		this.visitDefault(e);
	}
	visitComment(e) {
		this.visitDefault(e);
	}
	visitSuperscript(e) {
		this.visitDefault(e);
	}
	visitLineBreak(e) {
		this.visitDefault(e);
	}
	visitPageBreak(e) {
		this.visitDefault(e);
	}
	visitTabStop(e) {
		this.visitDefault(e);
	}
	visitTabbing(e) {
		this.visitDefault(e);
	}
	visitTabbingClear(e) {
		this.visitDefault(e);
	}
	visitHRule(e) {
		this.visitDefault(e);
	}
}, C = class {
	_children = [];
	_parent = null;
	updatesEnabled = !0;
	get parent() {
		return this._parent;
	}
	get children() {
		return this._children;
	}
	getChildAt(e) {
		let t = this._children[e];
		if (t === void 0) throw RangeError(`no child ${e} in ${this.constructor.name}`);
		return t;
	}
	get numberOfChildren() {
		return this._children.length;
	}
	get nextSibling() {
		if (this._parent === null) return null;
		let e = this._parent._children;
		return e[e.indexOf(this) + 1] ?? null;
	}
	get previousSibling() {
		if (this._parent === null) return null;
		let e = this._parent._children;
		return e[e.indexOf(this) - 1] ?? null;
	}
	indexInParent() {
		return this._parent === null ? -1 : this._parent._children.indexOf(this);
	}
	addChild(e) {
		this.addChildAt(this._children.length, e);
	}
	addChildAt(e, t) {
		t.detach(), t._parent = this, this._children.splice(e, 0, t), this.notify({
			kind: "insertion",
			element: this,
			index: e,
			children: [t]
		});
	}
	removeChildAt(e) {
		if (e < 0 || e >= this._children.length) return;
		let [t] = this._children.splice(e, 1);
		return t._parent = null, this.notify({
			kind: "deletion",
			element: this,
			start: e,
			end: e + 1
		}), t;
	}
	removeChild(e) {
		this.removeChildAt(this._children.indexOf(e));
	}
	removeChildren(e, t) {
		let n = this._children.splice(e, t - e);
		for (let e of n) e._parent = null;
		return this.notify({
			kind: "deletion",
			element: this,
			start: e,
			end: t
		}), n;
	}
	setChildAt(e, t) {
		t.detach();
		let n = this._children[e];
		n !== void 0 && (n._parent = null), t._parent = this, this._children[e] = t, this.notify({
			kind: "replacement",
			element: this,
			index: e
		});
	}
	clearChildren() {
		for (let e of this._children) e._parent = null;
		this._children.length = 0, this.notify({
			kind: "modification",
			element: this
		});
	}
	detach() {
		if (this._parent !== null) {
			let e = this._parent._children, t = e.indexOf(this);
			t >= 0 && e.splice(t, 1), this._parent = null;
		}
	}
	copyChildrenTo(e) {
		for (let t of this._children) e.addChild(t.deepCopy());
	}
	notifyModification() {
		this.notify({
			kind: "modification",
			element: this
		});
	}
	disableUpdates() {
		this.updatesEnabled = !1;
	}
	enableUpdates() {
		this.updatesEnabled = !0;
	}
	notify(e) {
		this.updatesEnabled && (this._parent === null ? this.notifyObservers(e) : this._parent.notify({
			kind: "child",
			element: this._parent,
			operation: e
		}));
	}
	notifyObservers(e) {}
	containsOnlyOneSign() {
		return this._children.length === 1 && this._children[0].containsOnlyOneSign();
	}
	getLoneSign() {
		if (!this.containsOnlyOneSign()) throw Error("Wrong call to getLoneSign.");
		return this._children[0].getLoneSign();
	}
	isBreak() {
		return !1;
	}
}, w = class e {
	isRed;
	isShaded;
	constructor(e = !1, t = !1) {
		this.isRed = e, this.isShaded = t;
	}
	duplicate() {
		return new e(this.isRed, this.isShaded);
	}
	equals(e) {
		return this.isRed === e.isRed && this.isShaded === e.isShaded;
	}
}, T = class extends C {
	state = new w();
	get isRed() {
		return this.state.isRed;
	}
	get isShaded() {
		return this.state.isShaded;
	}
	copyStateTo(e) {
		e.state = this.state.duplicate();
	}
}, xe = class extends T {}, Se = class extends C {}, E = class extends Se {}, Ce = class e extends C {
	observers = /* @__PURE__ */ new Set();
	constructor(e = []) {
		super();
		for (let t of e) this.addTopItem(t);
	}
	accept(e) {
		return e.visitHieroglyphicText(this);
	}
	get topItems() {
		return this.children;
	}
	getTopItemAt(e) {
		return this.getChildAt(e);
	}
	addTopItem(e) {
		this.addChild(e);
	}
	addTopItemAt(e, t) {
		this.addChildAt(e, t);
	}
	addAll(e) {
		for (let t of e) this.addChild(t);
	}
	insertItemsAt(e, t) {
		t.forEach((t, n) => this.addChildAt(e + n, t));
	}
	removeItems(e, t) {
		return this.removeChildren(e, t);
	}
	removeTopItem(e) {
		this.removeChildAt(e);
	}
	deepCopy() {
		let t = new e();
		return this.copyChildrenTo(t), t;
	}
	addObserver(e) {
		this.observers.add(e);
	}
	deleteObserver(e) {
		this.observers.delete(e);
	}
	notifyObservers(e) {
		for (let t of this.observers) t(e);
	}
	getCodes() {
		let e = /* @__PURE__ */ new Set(), t = (n) => {
			n instanceof D && n.type === b.MDCCODE && e.add(n.code);
			for (let e of n.children) t(e);
		};
		return t(this), [...e];
	}
}, we = class e extends xe {
	shading = x.NONE;
	constructor(e = []) {
		super();
		for (let t of e) this.addHBox(t);
	}
	accept(e) {
		return e.visitCadrat(this);
	}
	get hBoxes() {
		return this.children;
	}
	getHBox(e) {
		return this.getChildAt(e);
	}
	get numberOfHBoxes() {
		return this.numberOfChildren;
	}
	addHBox(e) {
		this.addChild(e);
	}
	addHBoxAt(e, t) {
		this.addChildAt(e, t);
	}
	removeHBox(e) {
		this.removeChild(e);
	}
	setShading(e) {
		this.shading = e, this.notifyModification();
	}
	isShadedPart(e) {
		return (this.shading & e) !== 0;
	}
	isWide() {
		return this.hBoxes.some((e) => e.isWide());
	}
	isEmbedded() {
		for (let e = this.parent; e !== null; e = e.parent) if (e instanceof Ne) return !0;
		return !1;
	}
	deepCopy() {
		let t = new e();
		return t.shading = this.shading, this.copyChildrenTo(t), this.copyStateTo(t), t;
	}
}, Te = class e extends C {
	constructor(e = []) {
		super();
		for (let t of e) this.addHorizontalListElement(t);
	}
	accept(e) {
		return e.visitHBox(this);
	}
	get elements() {
		return this.children;
	}
	getElementAt(e) {
		return this.getChildAt(e);
	}
	addHorizontalListElement(e) {
		this.addChild(e);
	}
	addHorizontalListElementAt(e, t) {
		this.addChildAt(e, t);
	}
	removeHorizontalListElement(e) {
		this.removeChild(e);
	}
	isWide() {
		let e = this.numberOfChildren === 1 ? this.getChildAt(0) : null;
		return e instanceof D && e.isWide();
	}
	deepCopy() {
		let t = new e();
		return this.copyChildrenTo(t), t;
	}
}, Ee = class e extends C {
	name;
	value;
	constructor(e, t) {
		super(), this.name = e, this.value = t;
	}
	accept(e) {
		return e.visitModifier(this);
	}
	deepCopy() {
		return new e(this.name, this.value);
	}
	toString() {
		return "\\" + this.name + (this.value ?? "");
	}
}, De = class e extends C {
	angle = 0;
	reversed = !1;
	scale = 100;
	accept(e) {
		return e.visitModifiersList(this);
	}
	get modifiers() {
		return this.children;
	}
	static arity(e) {
		return e.value === null ? 0 : 1;
	}
	getModifierFrom(t, n) {
		return this.modifiers.find((r) => r.name === t && (n === -1 || e.arity(r) === n));
	}
	addAux(t) {
		let n = this.getModifierFrom(t.name, e.arity(t));
		n === void 0 ? this.addChild(t) : e.arity(t) === 1 && (n.value = t.value, this.notifyModification());
	}
	includeModifier(e) {
		if (e.name === "") e.value === null ? this.reversed = !0 : this.setScale(e.value);
		else if (e.value !== null) switch (e.name) {
			case "r":
				this.angle = (360 - e.value * 90) % 360;
				break;
			case "t":
				this.angle = (360 - e.value * 90) % 360, this.reversed = !0;
				break;
			case "R":
				this.angle = e.value % 360, this.angle < 0 && (this.angle += 360);
				break;
			case "s": {
				let t = 100;
				for (let n = 0; n < e.value; n++) t /= 1.4142136;
				this.setScale(Math.trunc(t));
				break;
			}
			default: this.addAux(e);
		}
		else this.addAux(e);
	}
	removeModifier(t) {
		if (t.name === "") t.value === null ? this.reversed = !1 : this.setScale(100);
		else if (t.value !== null && [
			"r",
			"t",
			"R"
		].includes(t.name)) this.angle = 0, t.name === "t" && (this.reversed = !1);
		else {
			let n = this.getModifierFrom(t.name, e.arity(t));
			n && this.removeChild(n);
		}
	}
	getBoolean(e) {
		return e === "" ? this.reversed : this.getModifierFrom(e, 0) !== void 0;
	}
	setBoolean(e, t) {
		t ? this.includeModifier(new Ee(e, null)) : this.removeModifier(new Ee(e, null));
	}
	hasInteger(e) {
		return this.getModifierFrom(e, 1) !== void 0;
	}
	getIntegerWithDefault(e, t) {
		return this.getModifierFrom(e, 1)?.value ?? t;
	}
	setInteger(e, t) {
		this.includeModifier(new Ee(e, t));
	}
	unsetInteger(e) {
		let t = this.getModifierFrom(e, 1);
		t && this.removeChild(t);
	}
	setScale(e) {
		this.scale = e, this.notifyModification();
	}
	setAngle(e) {
		this.angle = e % 360, this.notifyModification();
	}
	setReversed(e) {
		this.reversed = e, this.notifyModification();
	}
	deepCopy() {
		let t = new e();
		return t.angle = this.angle, t.reversed = this.reversed, t.scale = this.scale, this.copyChildrenTo(t), t;
	}
}, D = class e extends E {
	code = "A1";
	type = b.MDCCODE;
	grammar = !1;
	endingCode = "NONE";
	x = 0;
	y = 0;
	constructor(e, t = new De()) {
		super(), this.addChild(t), this.setCode(e);
	}
	accept(e) {
		return e.visitHieroglyph(this);
	}
	get modifiers() {
		return this.getChildAt(0);
	}
	setModifiers(e) {
		this.setChildAt(0, e), this.notifyModification();
	}
	setCode(e) {
		e.startsWith("J") ? e = "Aa" + e.substring(1) : e === "Ff2" && (e = "V49A"), this.code = e;
		let t = ve(e);
		this.type = t === -1 ? b.MDCCODE : t, this.notifyModification();
	}
	setType(e) {
		this.type = e, this.notifyModification();
	}
	setGrammar(e) {
		this.grammar = e, this.notifyModification();
	}
	setEndingCode(e) {
		this.endingCode = e, this.notifyModification();
	}
	setExplicitPosition(e, t, n) {
		this.x = e, this.y = t, this.modifiers.setScale(n);
	}
	get angle() {
		return this.modifiers.angle;
	}
	get relativeSize() {
		return this.modifiers.scale;
	}
	get isReversed() {
		return this.modifiers.reversed;
	}
	isWide() {
		return this.modifiers.getBoolean("l");
	}
	isShadingSign() {
		return this.type === b.HORIZONTALSHADE || this.type === b.VERTICALSHADE || this.type === b.FULLSHADE || this.type === b.QUATERSHADE;
	}
	getSmallText() {
		if (this.type !== b.SMALLTEXT) throw Error("Incorrect call");
		return this.code.substring(this.code.indexOf("\"") + 1, this.code.length - 1);
	}
	isAloneInQuadrat() {
		let e = this.parent;
		for (; e !== null && !(e instanceof we);) e = e.parent;
		return e !== null && e.containsOnlyOneSign();
	}
	containsOnlyOneSign() {
		return !0;
	}
	getLoneSign() {
		return this;
	}
	deepCopy() {
		let t = new e(this.code, this.modifiers.deepCopy());
		return t.endingCode = this.endingCode, t.grammar = this.grammar, t.type = this.type, t.x = this.x, t.y = this.y, t;
	}
}, Oe = class e extends E {
	constructor(e = []) {
		super();
		for (let t of e) this.addHieroglyph(t);
	}
	accept(e) {
		return e.visitLigature(this);
	}
	get hieroglyphs() {
		return this.children;
	}
	addHieroglyph(e) {
		this.addChild(e);
	}
	containsOnlyOneSign() {
		return !1;
	}
	deepCopy() {
		let t = new e();
		return this.copyChildrenTo(t), t;
	}
}, ke = class e extends E {
	constructor(e = []) {
		super();
		for (let t of e) this.addHieroglyph(t);
	}
	accept(e) {
		return e.visitAbsoluteGroup(this);
	}
	get hieroglyphs() {
		return this.children;
	}
	addHieroglyph(e) {
		if (e.isShadingSign()) {
			let t = 0;
			for (; t < this.numberOfChildren && this.hieroglyphs[t].isShadingSign();) t++;
			this.addChildAt(t, e);
		} else this.addChild(e);
	}
	containsOnlyOneSign() {
		return this.numberOfChildren === 1;
	}
	compact() {
		if (this.numberOfChildren === 0) return;
		let e = Math.min(...this.hieroglyphs.map((e) => e.x)), t = Math.min(...this.hieroglyphs.map((e) => e.y));
		for (let n of this.hieroglyphs) n.setExplicitPosition(n.x - e, n.y - t, n.relativeSize);
	}
	deepCopy() {
		let t = new e();
		return this.copyChildrenTo(t), t;
	}
}, Ae = class e extends E {
	constructor(e, t) {
		super(), this.addChild(e), this.addChild(t);
	}
	accept(e) {
		return e.visitOverwrite(this);
	}
	get first() {
		return this.getChildAt(0);
	}
	get second() {
		return this.getChildAt(1);
	}
	containsOnlyOneSign() {
		return !1;
	}
	deepCopy() {
		return new e(this.first.deepCopy(), this.second.deepCopy());
	}
}, je = class e extends Se {
	hasBeforeGroup;
	hasAfterGroup;
	constructor(e, t, n) {
		super(), this.hasBeforeGroup = e !== null, this.hasAfterGroup = n !== null, e !== null && this.addChild(e), this.addChild(t), n !== null && this.addChild(n);
	}
	accept(e) {
		return e.visitComplexLigature(this);
	}
	get beforeGroup() {
		return this.hasBeforeGroup ? this.getChildAt(0) : null;
	}
	get hieroglyph() {
		return this.getChildAt(+!!this.hasBeforeGroup);
	}
	get afterGroup() {
		return this.hasAfterGroup ? this.getChildAt(this.hasBeforeGroup ? 2 : 1) : null;
	}
	containsOnlyOneSign() {
		return !1;
	}
	deepCopy() {
		return new e(this.beforeGroup?.deepCopy() ?? null, this.hieroglyph.deepCopy(), this.afterGroup?.deepCopy() ?? null);
	}
}, Me = class e extends C {
	constructor(e = []) {
		super();
		for (let t of e) this.addBasicItem(t);
	}
	accept(e) {
		return e.visitBasicItemList(this);
	}
	get items() {
		return this.children;
	}
	addBasicItem(e) {
		this.addChild(e);
	}
	insertItemsAt(e, t) {
		t.forEach((t, n) => this.addChildAt(e + n, t));
	}
	removeItems(e, t) {
		return this.removeChildren(e, t);
	}
	deepCopy() {
		let t = new e();
		return this.copyChildrenTo(t), t;
	}
}, Ne = class e extends E {
	constructor(e = new Me()) {
		super(), this.addChild(e);
	}
	accept(e) {
		return e.visitSubCadrat(this);
	}
	get basicItemList() {
		return this.getChildAt(0);
	}
	deepCopy() {
		return new e(this.basicItemList.deepCopy());
	}
}, Pe = class e extends E {
	type;
	startPart;
	endPart;
	constructor(e, t, n, r = new Me()) {
		super(), this.type = e, this.startPart = t, this.endPart = n, this.addChild(r);
	}
	accept(e) {
		return e.visitCartouche(this);
	}
	get basicItemList() {
		return this.getChildAt(0);
	}
	containsOnlyOneSign() {
		return !1;
	}
	deepCopy() {
		return new e(this.type, this.startPart, this.endPart, this.basicItemList.deepCopy());
	}
}, Fe = class e extends E {
	type;
	constructor(e, t = new Me()) {
		super(), this.type = e, this.addChild(t);
	}
	accept(e) {
		return e.visitPhilology(this);
	}
	get basicItemList() {
		return this.getChildAt(0);
	}
	containsOnlyOneSign() {
		return !1;
	}
	deepCopy() {
		return new e(this.type, this.basicItemList.deepCopy());
	}
};
function Ie(e) {
	return e.replaceAll("!", "^h").replaceAll("@", "^H").replaceAll("#", "^x").replaceAll("£", "^X").replaceAll("%", "^s").replaceAll("&", "^t").replaceAll("ß", "^T").replaceAll("*", "^T").replaceAll("\"", "^d").replaceAll("c", "s");
}
var O = class e extends xe {
	mdcScriptCode;
	codePoint;
	script;
	uppercase;
	constructor(e, t, n = !1) {
		super(), this.mdcScriptCode = e, this.codePoint = t, this.script = me(e), this.uppercase = n && this.script === "TRANSLITERATION";
	}
	static fromMdcText(t, n) {
		let r = [], i = me(t) === "TRANSLITERATION";
		i && (n = Ie(n));
		let a = !1;
		for (let o of n) {
			let n = o.codePointAt(0);
			i && o === "^" ? a = !0 : ((o === "\n" || o === "\r" || o === "	") && (n = 32), r.push(new e(t, n, a)), a = !1);
		}
		return r;
	}
	accept(e) {
		return e.visitAlphabeticCharacter(this);
	}
	get mdcText() {
		let e = String.fromCodePoint(this.codePoint);
		return this.uppercase ? "^" + e : e;
	}
	isSameScriptAs(e) {
		return this.mdcScriptCode === e.mdcScriptCode;
	}
	isSpace() {
		return /\s/u.test(String.fromCodePoint(this.codePoint));
	}
	deepCopy() {
		let t = new e(this.mdcScriptCode, this.codePoint, this.uppercase);
		return this.copyStateTo(t), t;
	}
}, Le = class e extends xe {
	text;
	constructor(e) {
		super(), this.text = e;
	}
	accept(e) {
		return e.visitComment(this);
	}
	deepCopy() {
		let t = new e(this.text);
		return this.copyStateTo(t), t;
	}
}, Re = class e extends T {
	text;
	constructor(e) {
		super(), this.text = e;
	}
	accept(e) {
		return e.visitSuperscript(this);
	}
	deepCopy() {
		let t = new e(this.text);
		return this.copyStateTo(t), t;
	}
}, ze = class e extends T {
	spacing;
	constructor(e = 100) {
		super(), this.spacing = e;
	}
	accept(e) {
		return e.visitLineBreak(this);
	}
	isBreak() {
		return !0;
	}
	deepCopy() {
		let t = new e(this.spacing);
		return this.copyStateTo(t), t;
	}
}, Be = class e extends T {
	accept(e) {
		return e.visitPageBreak(this);
	}
	isBreak() {
		return !0;
	}
	deepCopy() {
		let t = new e();
		return this.copyStateTo(t), t;
	}
}, Ve = class e extends T {
	stopPos;
	constructor(e) {
		super(), this.stopPos = e;
	}
	accept(e) {
		return e.visitTabStop(this);
	}
	deepCopy() {
		let t = new e(this.stopPos);
		return this.copyStateTo(t), t;
	}
}, He = class e extends T {
	id;
	justification;
	orientation;
	constructor(e, t, n) {
		super(), this.id = e, this.justification = t, this.orientation = n;
	}
	accept(e) {
		return e.visitTabbing(this);
	}
	deepCopy() {
		let t = new e(this.id, this.justification, this.orientation);
		return this.copyStateTo(t), t;
	}
}, Ue = class e extends T {
	accept(e) {
		return e.visitTabbingClear(this);
	}
	deepCopy() {
		let t = new e();
		return this.copyStateTo(t), t;
	}
}, We = class e extends T {
	type;
	startPos;
	endPos;
	constructor(e, t, n) {
		super(), this.type = e, this.startPos = t, this.endPos = n;
	}
	accept(e) {
		return e.visitHRule(this);
	}
	deepCopy() {
		let t = new e(this.type, this.startPos, this.endPos);
		return this.copyStateTo(t), t;
	}
};
// packages/core/src/mdcreader/builder.ts
function Ge(e, t = {}) {
	return new Ze().buildText(oe(e, t).topItems);
}
var Ke = {
	CARTOUCHE: "CARTOUCHE",
	SEREKH: "SEREKH",
	HOUT: "HWT",
	CASTLE: "CASTLE",
	CIRCULAR_ENCLOSURE: "CIRCULAR_ENCLOSURE"
}, qe = {
	NONE: 0,
	FIRST: 1,
	SECOND: 2,
	THIRD: 3
}, Je = {
	ERASED_SIGNS: b.ERASEDSIGNS,
	EDITOR_ADDITION: b.EDITORADDITION,
	EDITOR_SUPERFLUOUS: b.EDITORSUPERFLUOUS,
	PREVIOUSLY_READABLE: b.PREVIOUSLYREADABLE,
	SCRIBE_ADDITION: b.SCRIBEADDITION,
	MINOR_ADDITION: b.MINORADDITION,
	DUBIOUS: b.DUBIOUS
}, Ye = {
	MDC_CODE: b.MDCCODE,
	RED_POINT: b.REDPOINT,
	BLACK_POINT: b.BLACKPOINT,
	SMALL_TEXT: b.SMALLTEXT,
	HALF_SPACE: b.HALFSPACE,
	FULL_SPACE: b.FULLSPACE,
	FULL_SHADE: b.FULLSHADE,
	VERTICAL_SHADE: b.VERTICALSHADE,
	QUARTER_SHADE: b.QUATERSHADE,
	HORIZONTAL_SHADE: b.HORIZONTALSHADE
};
function Xe(e) {
	if (typeof e == "string") return Ye[e];
	let t = Je[e.kind];
	return e.begin ? t * 2 : t * 2 + 1;
}
var Ze = class {
	currentState = new w();
	buildText(e) {
		let t = new Ce();
		for (let n of e.items) for (let e of this.buildTopItem(n)) n.nodeType !== "Tabbing" && n.nodeType !== "TabbingClear" && (e.state = this.currentState.duplicate()), t.addTopItem(e);
		return t;
	}
	buildTopItem(n) {
		switch (n.nodeType) {
			case "Superscript": return [new Re(n.text.replace(/\\(\\|-)/g, "$1"))];
			case "LineBreak": return [new ze(n.skip)];
			case "PageBreak": return [new Be()];
			case "TabStop": return [new Ve(n.stopWidth)];
			case "Tabbing": {
				let r = e(n.options, "orientation", "horizontal").toUpperCase() === "VERTICAL" ? "VERTICAL" : "HORIZONTAL", i = e(n.options, "justification", "left").toUpperCase();
				if (![
					"FILL",
					"LEFT",
					"RIGHT"
				].includes(i)) throw Error("No enum constant TabbingJustification." + i);
				return [new He(t(n.options, "id", 0), i, r)];
			}
			case "TabbingClear": return [new Ue()];
			case "HRule": return [new We(n.lineType, n.startPos, n.endPos)];
			case "Zone": return [];
			default: return this.buildBasicItem(n);
		}
	}
	buildBasicItem(e) {
		switch (e.nodeType) {
			case "Cadrat": {
				let t = new we(e.hBoxes.map((e) => new Te(e.elements.map((e) => this.buildElement(e)))));
				return t.shading = e.shading, [t];
			}
			case "AlphabeticText": return e.scriptCode === "+" ? [new Le(e.text)] : O.fromMdcText(e.scriptCode, e.text);
			case "Toggle": return this.applyToggle(e.toggleType), [];
			case "StartHieroglyphicText": return [];
		}
	}
	applyToggle(e) {
		let t = this.currentState;
		switch (e) {
			case "BLACK":
				t.isRed = !1;
				break;
			case "BLACK_RED":
				t.isRed = !t.isRed;
				break;
			case "RED":
				t.isRed = !0;
				break;
			case "SHADING_OFF":
				t.isShaded = !1;
				break;
			case "SHADING_ON":
				t.isShaded = !0;
				break;
			case "SHADING_TOGGLE": t.isShaded = !t.isShaded;
		}
	}
	buildBasicItemList(e) {
		let t = new Me();
		for (let n of e.items) for (let e of this.buildBasicItem(n)) t.addBasicItem(e);
		return t;
	}
	buildElement(e) {
		return e.nodeType === "ComplexLigature" ? new je(e.beforeGroup === null ? null : this.buildInnerGroup(e.beforeGroup), this.buildHieroglyph(e.hieroglyph), e.afterGroup === null ? null : this.buildInnerGroup(e.afterGroup)) : this.buildInnerGroup(e);
	}
	buildInnerGroup(e) {
		switch (e.nodeType) {
			case "Hieroglyph": return this.buildHieroglyph(e);
			case "Cartouche": return new Pe(Ke[e.type], qe[e.startPart], qe[e.endPart], this.buildBasicItemList(e.content));
			case "Ligature": return new Oe(e.hieroglyphs.map((e) => this.buildHieroglyph(e)));
			case "AbsoluteGroup": return new ke(e.hieroglyphs.map((e) => this.buildHieroglyph(e)));
			case "Overwrite": return new Ae(this.buildHieroglyph(e.first), this.buildHieroglyph(e.second));
			case "SubCadrat": return new Ne(this.buildBasicItemList(e.content));
			case "Philology": return new Fe(Je[e.openingKind], this.buildBasicItemList(e.content));
			case "Insert": throw Error("@insert is not supported yet");
		}
	}
	buildHieroglyph(e) {
		let t = new D(e.code, this.buildModifiers(e.modifiers));
		return t.setGrammar(e.isGrammar), t.setType(Xe(e.type)), t.setEndingCode(e.endingCode), (e.x !== 0 || e.y !== 0 || e.scale !== 100) && t.setExplicitPosition(e.x, e.y, e.scale), t;
	}
	buildModifiers(e) {
		let t = new De();
		for (let n of e.modifiers) t.includeModifier(new Ee(n.name, n.value));
		return t;
	}
};
// packages/core/src/writer/writer.ts
function Qe(e, t = {}) {
	let n = new et(t.start ?? 0, t.end ?? e.numberOfChildren, t.normalize);
	return e.accept(n), n.out;
}
function $e(e, t, n) {
	let r = e.children[t];
	if (!(r instanceof O)) return t;
	let i = t + 1;
	for (; i < e.numberOfChildren; i++) {
		let t = e.children[i];
		if (!(t instanceof O) || !t.isSameScriptAs(r) || n && !t.state.equals(r.state)) break;
	}
	return i;
}
var et = class {
	startIndex;
	endIndex;
	normalize;
	out = "";
	wantsMinus = !0;
	constructor(e, t, n) {
		this.startIndex = e, this.endIndex = t, this.normalize = n;
	}
	write(e) {
		this.out += e;
	}
	visitElementList(e, t) {
		let n = 0;
		for (; n < e.numberOfChildren;) n > 0 && this.write(t), n = this.writeElementOrRun(e, n, e.numberOfChildren);
	}
	writeElementOrRun(e, t, n) {
		let r = e.getChildAt(t);
		if (r instanceof O) {
			let i = Math.min($e(e, t, !0), n), a = "";
			for (let n = t; n < i; n++) a += e.getChildAt(n).mdcText;
			return this.writeTextBlock(r.mdcScriptCode, a), i;
		}
		return r.accept(this), t + 1;
	}
	writeTextBlock(e, t) {
		this.write("+" + e + t.replaceAll("\\", "\\\\").replaceAll("+", "\\+") + "+s");
	}
	visitAlphabeticCharacter(e) {
		this.writeTextBlock(e.mdcScriptCode, e.mdcText);
	}
	visitComment(e) {
		this.writeTextBlock("+", e.text);
	}
	visitBasicItemList(e) {
		this.visitElementList(e, "-");
	}
	visitCadrat(e) {
		this.visitElementList(e, ":"), this.write(le("#", e.shading));
	}
	visitCartouche(e) {
		let t = e.type === "CARTOUCHE" ? "" : de(e.type), n, r;
		e.startPart === 1 && e.endPart === 2 ? (n = "<" + t.toUpperCase() + "-", r = "->") : (n = "<" + t + e.startPart + "-", r = "-" + t + e.endPart + ">"), this.write(n), e.basicItemList.accept(this), this.write(r);
	}
	visitHBox(e) {
		this.visitElementList(e, "*");
	}
	visitHieroglyph(e) {
		e.grammar && this.write("="), this.write(this.normalize ? this.normalize(e.code) : e.code);
		let t = e.modifiers;
		t.reversed && this.write("\\");
		let n = e.x !== 0 || e.y !== 0;
		!n && t.scale !== 100 && this.write("\\" + t.scale), t.angle !== 0 && this.write("\\R" + t.angle), this.visitModifiersList(t), n && this.write(`{{${e.x},${e.y},${t.scale}}}`), e.endingCode === "WORD_END" ? this.write("_") : e.endingCode === "SENTENCE_END" && this.write("__");
	}
	visitHRule(e) {
		this.write(`{${e.type}${e.startPos},${e.endPos}}`);
	}
	visitLigature(e) {
		this.visitElementList(e, "&");
	}
	visitModifier(e) {
		this.write("\\" + e.name + (e.value ?? ""));
	}
	visitModifiersList(e) {
		for (let t of e.modifiers) this.visitModifier(t);
	}
	visitOverwrite(e) {
		e.first.accept(this), this.write("##"), e.second.accept(this);
	}
	visitPhilology(e) {
		this.write("(" + (ye(e.type) ?? "null") + "-"), this.visitElementList(e, "-"), this.write("-" + (be(e.type) ?? "null") + ")");
	}
	visitSubCadrat(e) {
		this.write("("), this.visitElementList(e, "-"), this.write(")");
	}
	visitSuperscript(e) {
		this.write("|" + e.text.replaceAll("\\", "\\\\").replaceAll("-", "\\-") + "-"), this.wantsMinus = !1;
	}
	visitTabStop(e) {
		this.write("?" + e.stopPos);
	}
	visitTabbing(e) {
		this.write(`%[id=${e.id},orientation=${e.orientation.toLowerCase()},justification=${e.justification.toLowerCase()}]`);
	}
	visitTabbingClear() {
		this.write("%clear");
	}
	visitHieroglyphicText(e) {
		let t = new w(), n = !1, r = this.startIndex;
		for (; r < this.endIndex;) {
			let i = e.getTopItemAt(r), a = i.state;
			r > this.startIndex && this.wantsMinus && this.write("-"), this.wantsMinus = !0, (i instanceof ze || i instanceof Be) && (a = new w()), n = this.fixToggles(t, a, n), r = this.writeElementOrRun(e, r, this.endIndex), t = a;
		}
		this.fixToggles(t, new w(), n);
	}
	fixToggles(e, t, n) {
		if (t.isRed === e.isRed && t.isShaded === e.isShaded) return n;
		let r = !t.isShaded && e.isShaded, i = t.isShaded && !e.isShaded, a = !t.isRed && e.isRed, o = t.isRed && !e.isRed;
		return r && a ? this.write(n ? "$b-#e-" : "#e-$b-") : r ? e.isRed && n ? (this.write("$b-#e-$r-"), n = !0) : this.write("#e-") : a && (e.isShaded && !n ? (this.write("#e-$b-#b-"), n = !1) : this.write("$b-")), i && (this.write("#b-"), n = !1), o && (this.write("$r-"), n = !0), n;
	}
	visitLineBreak(e) {
		this.write("!"), e.spacing !== 100 && this.write("=" + e.spacing + "%"), this.write("\n"), this.wantsMinus = !1;
	}
	visitPageBreak() {
		this.write("!!\n"), this.wantsMinus = !1;
	}
	visitAbsoluteGroup(e) {
		this.visitElementList(e, "**");
	}
	visitComplexLigature(e) {
		e.beforeGroup !== null && (e.beforeGroup.accept(this), this.write("^^^")), e.hieroglyph.accept(this), e.afterGroup !== null && (this.write("&&&"), e.afterGroup.accept(this));
	}
}, tt = "++JSesh_";
function nt(e) {
	let t = +!!e.startsWith("﻿"), n = {};
	for (; e.startsWith(tt, t);) {
		let r = t;
		for (; r < e.length && e[r] !== "\n" && e[r] !== "\r";) r++;
		let i = e.substring(t, r);
		t = e[r] === "\r" && e[r + 1] === "\n" ? r + 2 : r < e.length ? r + 1 : r;
		let a = i.split(" ");
		n[a[0].substring(2)] = a.length > 1 ? a[1] : "";
	}
	return {
		properties: n,
		body: e.substring(t)
	};
}
function rt(e) {
	let t = "++JSesh_Info 1.0 +s\n";
	for (let [n, r] of Object.entries(e)) n !== "JSesh_Info" && (t += `++${n} ${r} +s\n`);
	return t;
}
// packages/core/src/document/preferences.ts
var it = Object.freeze({
	smallSignCentered: !1,
	textOrientation: "HORIZONTAL",
	textDirection: "LEFT_TO_RIGHT",
	cartoucheLineWidth: 1,
	maxQuadratWidth: 22,
	maxQuadratHeight: 18,
	lineSkip: 6,
	columnSkip: 8,
	useLinesForShading: !1,
	standardSignHeight: 18,
	smallBodyScaleLimit: 12,
	smallSkip: 2,
	alphabeticTextBaseline: 4
}), at = {
	smallSignCentered: "JSesh_small_sign_centered",
	textOrientation: "JSesh_page_orientation",
	textDirection: "JSesh_page_direction",
	cartoucheLineWidth: "JSesh_cartouche_line_width",
	maxQuadratWidth: "JSesh_max_quadrant_width",
	maxQuadratHeight: "JSesh_max_quadrantHeight",
	lineSkip: "JSesh_line_skip",
	columnSkip: "JSesh_column_skip",
	useLinesForShading: "JSesh_use_lines_for_shading",
	standardSignHeight: "JSesh_standard_sign_height",
	smallBodyScaleLimit: "JSesh_small_body_scale_limit",
	smallSkip: "JSesh_small_skip",
	alphabeticTextBaseline: "JSesh_alphabetic_text_baseline"
};
function ot(e) {
	let t = { ...it };
	for (let [n, r] of Object.entries(at)) {
		let i = e[r];
		if (i === void 0) continue;
		let a = it[n];
		t[n] = typeof a == "boolean" ? i === "1" || i !== "0" && i.toLowerCase() === "true" : typeof a == "number" ? Number.parseFloat(i) : i;
	}
	return t;
}
function st(e) {
	let t = {};
	for (let [n, r] of Object.entries(at)) {
		let i = e[n];
		t[r] = typeof i == "number" ? ct(i) : String(i);
	}
	return t;
}
function ct(e) {
	return Number.isInteger(e) ? e.toFixed(1) : String(e);
}
// packages/core/src/document/document.ts
function lt(e, t = {}) {
	let { properties: n, body: r } = nt(e), i = Object.keys(n).length > 0 ? ot(n) : { ...it }, a;
	try {
		a = Ge(r);
	} catch (e) {
		if (t.failFast) throw e;
		a = new Ce();
		for (let e of r.split(/\r\n|\n|\r/)) try {
			a.addAll(Ge(e).topItems.slice());
		} catch (t) {
			a.addAll(O.fromMdcText("b", "Error in file: " + t.message)), a.addTopItem(new ze()), a.addAll(O.fromMdcText("l", e)), a.addTopItem(new ze());
		}
	}
	return {
		preferences: i,
		text: a
	};
}
function ut(e) {
	return rt(st(e.preferences)) + Qe(e.text);
}
// packages/core/src/render/view.ts
var k = Math.fround, A = class e {
	x;
	y;
	width;
	height;
	constructor(e = 0, t = 0, n = 0, r = 0) {
		this.x = e, this.y = t, this.width = n, this.height = r;
	}
	get minX() {
		return this.x;
	}
	get minY() {
		return this.y;
	}
	get maxX() {
		return this.x + this.width;
	}
	get maxY() {
		return this.y + this.height;
	}
	isEmpty() {
		return this.width <= 0 || this.height <= 0;
	}
	clone() {
		return new e(this.x, this.y, this.width, this.height);
	}
	add(e) {
		this.setFromDiagonal(Math.min(this.minX, e.minX), Math.min(this.minY, e.minY), Math.max(this.maxX, e.maxX), Math.max(this.maxY, e.maxY));
	}
	addPoint(e, t) {
		this.setFromDiagonal(Math.min(this.minX, e), Math.min(this.minY, t), Math.max(this.maxX, e), Math.max(this.maxY, t));
	}
	setFromDiagonal(e, t, n, r) {
		this.x = e, this.y = t, this.width = n - e, this.height = r - t;
	}
}, dt = class {
	model;
	_angle = 0;
	deltaBaseX = 0;
	deltaBaseY = 0;
	xStretchable = !1;
	yStretchable = !1;
	direction = "LEFT_TO_RIGHT";
	_parent = null;
	_next = null;
	_previous = null;
	position = {
		x: 0,
		y: 0
	};
	subViews = [];
	_width = 0;
	_height = 0;
	_xScale = 1;
	_yScale = 1;
	constructor(e) {
		this.model = e;
	}
	get width() {
		return this._width;
	}
	set width(e) {
		this._width = k(e);
	}
	get height() {
		return this._height;
	}
	set height(e) {
		this._height = k(e);
	}
	get xScale() {
		return this._xScale;
	}
	set xScale(e) {
		this._xScale = k(e);
	}
	get yScale() {
		return this._yScale;
	}
	set yScale(e) {
		this._yScale = k(e);
	}
	get angle() {
		return this._angle;
	}
	set angle(e) {
		this._angle = k(e);
	}
	get parent() {
		return this._parent;
	}
	get next() {
		return this._next;
	}
	get previous() {
		return this._previous;
	}
	get numberOfSubviews() {
		return this.subViews.length;
	}
	get subviews() {
		return this.subViews;
	}
	getSubView(e) {
		let t = this.subViews[e];
		if (t === void 0) throw RangeError(`no subview ${e}`);
		return t;
	}
	get firstSubView() {
		return this.getSubView(0);
	}
	get lastSubView() {
		return this.subViews[this.subViews.length - 1] ?? null;
	}
	add(e) {
		this.addAt(this.subViews.length, e);
	}
	addAt(e, t) {
		this.subViews.splice(e, 0, t), this.fixSiblingsAt(e - 1), this.fixSiblingsAt(e), this.fixSiblingsAt(e + 1), t._parent = this;
	}
	remove(e, t = e + 1) {
		for (let n = t - 1; n >= e; n--) {
			let e = this.getSubView(n);
			e._parent = null, e._next = null, e._previous = null, this.subViews.splice(n, 1);
		}
		this.fixSiblingsAt(e - 1), this.fixSiblingsAt(e);
	}
	replaceSubView(e, t) {
		this.subViews[e] = t, this.fixSiblingsAt(e - 1), this.fixSiblingsAt(e), this.fixSiblingsAt(e + 1), t._parent = this;
	}
	clear() {
		for (let e of this.subViews) e._parent = null, e._next = null, e._previous = null;
		this.subViews.length = 0;
	}
	fixSiblingsAt(e) {
		if (e < 0 || e >= this.subViews.length) return;
		let t = this.subViews[e];
		t._previous = this.subViews[e - 1] ?? null, t._next = this.subViews[e + 1] ?? null;
	}
	get internalWidth() {
		return k(this._width / this._xScale);
	}
	get internalHeight() {
		return k(this._height / this._yScale);
	}
	centerSubViewHorizontally() {
		for (let e of this.subViews) e.position.x = k((this.internalWidth - e.width) / 2);
	}
	centerSubViewsVertically() {
		for (let e of this.subViews) e.position.y = k((this.internalHeight - e.height) / 2);
	}
	distributeFromTopToBottom() {
		if (this.subViews.length > 1) {
			let e = this.sumOfSubViewsHeights, t = k((this.internalHeight - e) / (this.subViews.length - 1)), n = 0;
			for (let e of this.subViews) e.position.y = n, n += k(e.height + t);
		}
	}
	distributeHorizontally() {
		let e = this.subViews.length;
		if (e > 1) {
			let t = this.sumOfSubViewsWidths, n = k((this.internalWidth - t) / (e - 1)), r = 0;
			for (let e of this.subViews) e.resetPos(), e.position.x = r, r += k(e.width + n);
		}
	}
	fitToSubViews(e) {
		if (this.width = 0, this.height = 0, this.subViews.length === 0) return;
		let t = null;
		for (let e of this.subViews) {
			let n = new A(e.position.x, e.position.y, e.width, e.height);
			t === null ? t = n : t.add(n);
		}
		if (e) {
			for (let e of this.subViews) e.position.x -= t.minX, e.position.y -= t.minY;
			this.width = k(t.width) * this._xScale, this.height = k(t.height) * this._yScale;
		} else this.width = k(t.maxX) * this._xScale, this.height = k(t.maxY) * this._yScale;
	}
	get maximalHeightOfSubView() {
		let e = 0;
		for (let t of this.subViews) e < t.height && (e = t.height);
		return e;
	}
	get maximalWidthOfSubView() {
		let e = 0;
		for (let t of this.subViews) e < t.width && (e = t.width);
		return e;
	}
	get sumOfSubViewsHeights() {
		let e = 0;
		for (let t of this.subViews) e = k(e + t.height);
		return e;
	}
	get sumOfSubViewsWidths() {
		let e = 0;
		for (let t of this.subViews) e = k(e + t.width);
		return e;
	}
	getSubViewBounds(e) {
		let t = this.getSubView(e);
		return this.layoutToDrawing(new A(t.position.x, t.position.y, t.width, t.height));
	}
	layoutToDrawing(e) {
		return this.direction === "RIGHT_TO_LEFT" ? new A(this.internalWidth - e.x - e.width, e.y, e.width, e.height) : e;
	}
	reScale(e) {
		e = k(e), this.xScale = e * this._xScale, this.yScale = e * this._yScale, this.width = this._width * e, this.height = this._height * e;
	}
	reset() {
		this.width = 0, this.height = 0, this._xScale = 1, this._yScale = 1, this._angle = 0, this.xStretchable = !1, this.yStretchable = !1;
	}
	resetPos() {
		this.position.x = 0, this.position.y = 0;
	}
	scaleForMaxHeight(e) {
		e !== 0 && this.height > e && this.reScale(k(e / this.height));
	}
	scaleForMaxWidth(e) {
		e !== 0 && this.width > e && this.reScale(k(e / this.width));
	}
	scaleToFitDimensions(e, t) {
		if (this.width < e && this.height < t) return;
		let n = 1, r = 1;
		this.width !== 0 && (n = e / this.width), this.height !== 0 && (r = t / this.height);
		let i = k(Math.min(r, n));
		this._xScale = i, this._yScale = i, this.width = this._width * i, this.height = this._height * i;
	}
	scaleToWidth(e) {
		this.internalWidth === 0 ? (this._xScale = 1, this.width = e) : (this.xScale = e / this.internalWidth, this.width = e);
	}
	setSubViewsToHeight() {
		let e = this.internalHeight;
		for (let t of this.subViews) t.model instanceof Ne && (t.height = e, t.distributeFromTopToBottom());
		this.stickSubViewsTo("BOTTOM");
	}
	stackTop(e) {
		let t = 0;
		for (let n of this.subViews) n.resetPos(), n.position.y = t, t += k(n.height + e);
		this.fitToSubViews(!0);
	}
	stickSubViewsTo(e) {
		for (let t of this.subViews) switch (e) {
			case "BOTTOM":
				t.position.y = k(this.internalHeight - t.height);
				break;
			case "TOP":
				t.position.y = 0;
				break;
			case "END":
				t.position.x = k(this.width - t.width);
				break;
			default: t.position.x = 0;
		}
	}
	nextIsHorizontallyAdjacent() {
		return this._next !== null && this._next.position.y < this.position.y + this.height;
	}
};
// packages/core/src/render/path.ts
function ft(e) {
	let t = [];
	for (let n of e.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
		let e = n[1], r = n[2].trim() === "" ? [] : n[2].trim().split(/[\s,]+/).map(Number);
		t.push(e === "Z" ? { type: e } : {
			type: e,
			points: r
		});
	}
	return t;
}
function pt(e) {
	let t = e * Math.PI / 180, n = Math.cos(t), r = Math.sin(t);
	return [
		n,
		r,
		-r,
		n,
		0,
		0
	];
}
function j(e, t) {
	return e.map((e) => {
		if (e.type === "Z") return e;
		let n = [...e.points];
		for (let e = 0; e < n.length; e += 2) {
			let r = n[e], i = n[e + 1];
			n[e] = t[0] * r + t[2] * i + t[4], n[e + 1] = t[1] * r + t[3] * i + t[5];
		}
		return {
			type: e.type,
			points: n
		};
	});
}
function mt(e) {
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity, a = (e, a) => {
		t = Math.min(t, e), n = Math.min(n, a), r = Math.max(r, e), i = Math.max(i, a);
	}, o = 0, s = 0;
	for (let t of e) switch (t.type) {
		case "M":
		case "L":
			[o, s] = t.points, a(o, s);
			break;
		case "Q": {
			let [e, n, r, i] = t.points;
			for (let t of ht(o, e, r).concat(ht(s, n, i))) {
				let c = 1 - t;
				a(c * c * o + 2 * c * t * e + t * t * r, c * c * s + 2 * c * t * n + t * t * i);
			}
			a(r, i), o = r, s = i;
			break;
		}
		case "C": {
			let [e, n, r, i, c, l] = t.points;
			for (let t of _t(o, e, r, c).concat(_t(s, n, i, l))) a(gt(o, e, r, c, t), gt(s, n, i, l, t));
			a(c, l), o = c, s = l;
			break;
		}
	}
	return t === Infinity ? new A() : new A(t, n, r - t, i - n);
}
function ht(e, t, n) {
	let r = e - 2 * t + n;
	if (r === 0) return [];
	let i = (e - t) / r;
	return i > 0 && i < 1 ? [i] : [];
}
function gt(e, t, n, r, i) {
	let a = 1 - i;
	return a * a * a * e + 3 * a * a * i * t + 3 * a * i * i * n + i * i * i * r;
}
function _t(e, t, n, r) {
	let i = 3 * (-e + 3 * t - 3 * n + r), a = 6 * (e - 2 * t + n), o = 3 * (t - e), s = [];
	if (Math.abs(i) < 1e-12) a !== 0 && s.push(-o / a);
	else {
		let e = a * a - 4 * i * o;
		if (e >= 0) {
			let t = Math.sqrt(e);
			s.push((-a + t) / (2 * i), (-a - t) / (2 * i));
		}
	}
	return s.filter((e) => e > 0 && e < 1);
}
// packages/core/src/render/glyphs.ts
var M = Math.fround;
function N(e, t) {
	return {
		...e,
		x: e.x * t,
		y: e.y * t,
		width: e.width * t,
		height: e.height * t
	};
}
var vt = 2, yt = .75, bt = /* @__PURE__ */ new Set([
	"[[",
	"]]",
	"[?",
	"?]",
	"[&",
	"&]",
	"[{",
	"}]",
	"[\"",
	"\"]",
	"['",
	"']",
	"[(",
	")]"
]), xt = 3, St = class e {
	provider;
	heightOfA1;
	shadingSizes;
	constructor(e) {
		this.provider = e;
		let t = e.size(e.canonicalCode("A1"));
		if (t === void 0) throw Error("The glyph provider has no A1 sign");
		this.heightOfA1 = M(t.height);
		let n = M(t.width), r = this.heightOfA1;
		this.shadingSizes = /* @__PURE__ */ new Map([
			["/", new A(0, 0, M(n / 2), M(r / 2))],
			["//", new A(0, 0, n, r)],
			["h/", new A(0, 0, n, M(r / 2))],
			["v/", new A(0, 0, M(n / 2), r)]
		]);
	}
	static isSpecial(e) {
		return bt.has(e);
	}
	getBBox(t, n, r) {
		if (e.isSpecial(t)) {
			if (n === 0 && !r) return new A(0, 0, xt, vt);
			let e = new A(0, 0, xt, 18);
			return n === 0 ? e : Ct(e, n);
		}
		let i = this.provider.canonicalCode(t);
		if (n === 0) {
			let e = this.provider.size(i);
			return e === void 0 ? this.shadingSizes.get(t)?.clone() : new A(0, 0, e.width, e.height);
		}
		let a = this.provider.shape(i);
		if (a !== void 0) return mt(j(ft(a.d), pt(n)));
		let o = this.getBBox(t, 0, r);
		return o === void 0 ? void 0 : Ct(o, n);
	}
	getGroupUnitLength() {
		return this.heightOfA1 / 1e3;
	}
	getHeightOfA1() {
		return this.heightOfA1;
	}
	getLigatureZone(t, n) {
		if (!e.isSpecial(n)) return this.provider.ligatureZone(this.provider.canonicalCode(n), t);
	}
	isKnown(t) {
		return e.isSpecial(t) ? !0 : this.provider.size(this.provider.canonicalCode(t)) !== void 0 || this.shadingSizes.has(t);
	}
	getPositions(e) {
		return this.provider.ligaturePositions(e.map((e) => this.provider.canonicalCode(e)));
	}
	getShape(e) {
		return this.provider.shape(this.provider.canonicalCode(e));
	}
	scaleFromFontToStyle(e) {
		return M(e.geometry.standardSignHeight / this.heightOfA1);
	}
};
function Ct(e, t) {
	return mt(j([
		{
			type: "M",
			points: [e.minX, e.minY]
		},
		{
			type: "L",
			points: [e.maxX, e.minY]
		},
		{
			type: "L",
			points: [e.maxX, e.maxY]
		},
		{
			type: "L",
			points: [e.minX, e.maxY]
		},
		{ type: "Z" }
	], pt(t)));
}
// packages/core/src/render/style.ts
var P = Math.fround, wt = Object.freeze({
	fineLineWidth: .5,
	wideLineWidth: 3,
	lineSkip: 6,
	columnSkip: 10,
	tabUnitWidth: P(18 / 200),
	cartoucheLineWidth: 1,
	cartoucheLoopLength: 10,
	cartoucheMargin: 2,
	bastionDepth: 3,
	bastionLength: 4,
	hwtSmallMargin: 3,
	hwtSquareSize: 10,
	serekhDoorSize: 20,
	textWidth: 538,
	textHeight: 760,
	leftMargin: 6,
	topMargin: 5,
	maxCadratHeight: 18,
	maxCadratWidth: 22,
	smallSkip: 2,
	largeSignSizeRatio: P(.8),
	smallSignSizeRatio: P(.4),
	smallBodyScaleLimit: 12,
	standardSignHeight: 18,
	alphabeticTextBaseline: 4
}), Tt = Object.freeze({
	textDirection: "LEFT_TO_RIGHT",
	textOrientation: "HORIZONTAL",
	paged: !1,
	smallSignCentered: !1,
	justified: !1
}), Et = Object.freeze({
	blackColor: "#000000",
	redColor: "#ff0000",
	cursorColor: "#0000ff",
	grayColor: "rgba(153, 153, 153, 0.3)",
	backgroundColor: "#ffffff",
	shadingStyle: "GRAY_SHADING",
	colorMap: Object.freeze({})
});
function F(e) {
	return `${e.style ?? "normal"} ${e.weight ?? "normal"} ${e.size}px ${e.family}`;
}
var I = "'Times New Roman', Times, serif", Dt = Object.freeze({
	translitUnicode: !0,
	yodChoice: "UA7BD",
	gardinerQofUsed: !0,
	plainFont: {
		family: I,
		size: 12
	},
	boldFont: {
		family: I,
		size: 12,
		weight: "bold"
	},
	italicFont: {
		family: I,
		size: 12,
		style: "italic"
	},
	superScriptFont: {
		family: I,
		size: 5,
		style: "italic"
	},
	transliterationFont: {
		family: `CharisSIL, ${I}`,
		size: 12
	}
});
function L(e, t) {
	switch (t) {
		case "BOLD": return e.boldFont;
		case "ITALIC": return e.italicFont;
		case "TRANSLITERATION": return e.transliterationFont;
		default: return e.plainFont;
	}
}
var Ot = Object.freeze({
	geometry: wt,
	painting: Et,
	fonts: Dt,
	options: Tt
});
function R(e, t) {
	return {
		geometry: {
			...e.geometry,
			...t.geometry
		},
		painting: {
			...e.painting,
			...t.painting
		},
		fonts: {
			...e.fonts,
			...t.fonts
		},
		options: {
			...e.options,
			...t.options
		}
	};
}
function kt(e, t) {
	return R(t, {
		geometry: {
			cartoucheLineWidth: P(e.cartoucheLineWidth),
			maxCadratWidth: P(e.maxQuadratWidth),
			maxCadratHeight: P(e.maxQuadratHeight),
			lineSkip: P(e.lineSkip),
			columnSkip: P(e.columnSkip),
			standardSignHeight: P(e.standardSignHeight),
			smallBodyScaleLimit: P(e.smallBodyScaleLimit),
			smallSkip: P(e.smallSkip),
			alphabeticTextBaseline: P(e.alphabeticTextBaseline)
		},
		options: {
			smallSignCentered: e.smallSignCentered,
			textOrientation: e.textOrientation,
			textDirection: e.textDirection
		},
		painting: { shadingStyle: e.useLinesForShading ? "LINE_HATCHING" : "GRAY_SHADING" }
	});
}
function At(e, t, n) {
	let r = e.geometry;
	switch (t) {
		case "CARTOUCHE": switch (n) {
			case 0: return 0;
			case 1: return r.cartoucheLoopLength;
			case 2: return P(r.cartoucheLoopLength + r.cartoucheLineWidth);
			default: throw Error("bad value for element " + n);
		}
		case "CIRCULAR_ENCLOSURE": switch (n) {
			case 0: return 0;
			case 1:
			case 2: return r.cartoucheLoopLength;
			default: throw Error("bad value for element " + n);
		}
		case "SEREKH": switch (n) {
			case 1: return P(r.hwtSmallMargin + r.cartoucheLineWidth);
			case 2: return P(P(r.hwtSmallMargin + r.cartoucheLineWidth) + r.serekhDoorSize);
			default: return 0;
		}
		case "HWT": switch (n) {
			case 1: return P(r.hwtSmallMargin + r.cartoucheLineWidth);
			case 2:
			case 3: return P(P(r.hwtSmallMargin + r.cartoucheLineWidth) + r.hwtSquareSize);
			default: return 0;
		}
		case "CASTLE": return n === 0 ? 0 : P(P(r.hwtSmallMargin + r.bastionDepth) + r.cartoucheLineWidth);
	}
}
function jt(e, t) {
	let n = e.geometry, r = P(n.cartoucheMargin + n.cartoucheLineWidth);
	return t === "CASTLE" ? P(r + n.bastionDepth) : r;
}
function Mt(e) {
	switch (e >= 100 && (e = Math.trunc(e / 2)), e) {
		case b.EDITORADDITION:
		case b.EDITORSUPERFLUOUS:
		case b.ERASEDSIGNS:
		case b.SCRIBEADDITION:
		case b.PREVIOUSLYREADABLE:
		case b.MINORADDITION:
		case b.DUBIOUS: return 4;
		default: return 0;
	}
}
// packages/core/src/render/text.ts
function Nt(e) {
	return e === "HEBREW";
}
function Pt(e, t) {
	return e.script === "TRANSLITERATION" && e.codePoint < 65536 ? Ft(String.fromCharCode(e.codePoint), e.uppercase, t) : String.fromCodePoint(e.codePoint);
}
function Ft(e, t, n) {
	if (!n.translitUnicode) return e;
	let r, i;
	switch (e) {
		case "A":
			[r, i] = ["Ꜣ", "ꜣ"];
			break;
		case "i":
			[r, i] = {
				U0313: ["I̓", "i̓"],
				UA7BD: ["Ꞽ", "ꞽ"],
				U0486: ["I҆", "i҆"],
				PLAIN_J: ["J", "j"]
			}[n.yodChoice];
			break;
		case "a":
			[r, i] = ["Ꜥ", "ꜥ"];
			break;
		case "H":
			[r, i] = ["Ḥ", "ḥ"];
			break;
		case "x":
			[r, i] = ["Ḫ", "ḫ"];
			break;
		case "X":
			[r, i] = ["H̱", "ẖ"];
			break;
		case "S":
			[r, i] = ["Š", "š"];
			break;
		case "q":
			[r, i] = n.gardinerQofUsed ? ["Ḳ", "ḳ"] : ["Q", "q"];
			break;
		case "T":
			[r, i] = ["Ṯ", "ṯ"];
			break;
		case "D":
			[r, i] = ["Ḏ", "ḏ"];
			break;
		default: [r, i] = [e.toUpperCase(), e];
	}
	return t ? r : i;
}
var It = class e {
	start;
	end;
	offsets;
	widths;
	width;
	constructor(e, t, n, r, i) {
		this.start = e, this.end = t, this.offsets = n, this.widths = r, this.width = i;
	}
	layoutOffset(e, t) {
		return t ? this.width - this.offsets[e] - this.widths[e] : this.offsets[e];
	}
	layoutOffsets(e) {
		return this.offsets.map((t, n) => this.layoutOffset(n, e));
	}
	views(e) {
		let t = [];
		for (let n = this.start; n < this.end; n++) t.push(e.getSubView(n));
		return t;
	}
	static layoutRuns(t, n, r) {
		let i = [], a = t.numberOfSubviews, o = 0;
		for (; o < a;) {
			let s = t.getSubView(o).model;
			if (!(s instanceof O)) {
				o++;
				continue;
			}
			let c = o + 1;
			for (; c < a;) {
				let e = t.getSubView(c).model;
				if (!(e instanceof O) || !e.isSameScriptAs(s)) break;
				c++;
			}
			let l = [];
			for (let e = o; e < c; e++) l.push(Pt(t.getSubView(e).model, n));
			let u = r.measureRun(n, s.script, l, Nt(s.script)), d = new e(o, c, u.offsets, u.widths, u.width);
			for (let e = o; e < c; e++) t.getSubView(e).width = d.widths[e - o];
			i.push(d), o = c;
		}
		return i;
	}
}, z = Math.fround;
function Lt(e, t, n = 0, r = e.numberOfChildren) {
	let i = new Rt(t), a = !0, o = 0, s = null, c = new class extends S {
		visitModifier(e) {
			throw Error("this method shouldn't be called");
		}
		visitModifiersList(e) {
			throw Error("this method shouldn't be called");
		}
		visitDefault(e) {
			o++;
			let t = new dt(e);
			i.preLayoutHook(t);
			let [c, l] = a ? [n, r] : [0, e.numberOfChildren];
			a = !1;
			for (let n = c; n < l; n++) e.getChildAt(n).accept(this), t.add(s);
			i.layout(t, o), s = t, o--;
		}
		visitHieroglyph(e) {
			let t = new dt(e);
			i.preLayoutHook(t), i.layout(t, o + 1), s = t;
		}
	}();
	return e.accept(c), s;
}
var Rt = class {
	currentView;
	centerSigns;
	currentTextOrientation;
	currentTextDirection;
	inAbsoluteGroup = !1;
	style;
	hieroglyphsDrawer;
	measurer;
	aux = new zt(this);
	constructor(e) {
		this.style = e.style, this.hieroglyphsDrawer = e.drawer, this.measurer = e.measurer, this.currentTextOrientation = this.style.options.textOrientation, this.currentTextDirection = this.style.options.textDirection, this.centerSigns = this.style.options.smallSignCentered;
	}
	layout(e, t) {
		this.currentView = e, e.direction = this.currentTextDirection, e.model.accept(this.aux);
	}
	preLayoutHook(e) {
		e.model instanceof Pe ? this.centerSigns = !0 : e.model instanceof ke && (this.inAbsoluteGroup = !0);
	}
	get v() {
		return this.currentView;
	}
	get s() {
		return this.style;
	}
	get drawer() {
		return this.hieroglyphsDrawer;
	}
	get textMeasurer() {
		return this.measurer;
	}
	get orientation() {
		return this.currentTextOrientation;
	}
	get centered() {
		return this.centerSigns;
	}
	set centered(e) {
		this.centerSigns = e;
	}
	get absoluteGroup() {
		return this.inAbsoluteGroup;
	}
	set absoluteGroup(e) {
		this.inAbsoluteGroup = e;
	}
	computeScale() {
		return this.hieroglyphsDrawer.scaleFromFontToStyle(this.style);
	}
	getGroupUnitScale() {
		return this.hieroglyphsDrawer.getGroupUnitLength() * this.computeScale();
	}
}, zt = class extends S {
	l;
	constructor(e) {
		super(), this.l = e;
	}
	visitAbsoluteGroup(e) {
		let t = this.l.v;
		for (let n = 0; n < t.numberOfSubviews; n++) {
			let r = t.getSubView(n), i = e.hieroglyphs[n];
			r.resetPos(), r.position.x = i.x * this.l.getGroupUnitScale(), r.position.y = i.y * this.l.getGroupUnitScale();
		}
		t.fitToSubViews(!1), this.l.absoluteGroup = !1;
	}
	visitAlphabeticCharacter(e) {
		let t = this.l.s, n = this.l.textMeasurer.characterMetrics(t.fonts, e.script, Pt(e, t.fonts)), r = this.l.v;
		r.width = n.advance, r.height = z(z(n.ascent) + z(n.descent));
		let i = t.geometry;
		r.deltaBaseY = z(z(i.maxCadratHeight - i.alphabeticTextBaseline) - z(n.ascent));
	}
	visitComment(e) {
		this.l.v.reset(), this.l.v.resetPos();
	}
	layoutWithRuns(e, t, n) {
		let r = this.l.v, i = r.direction !== "LEFT_TO_RIGHT", a = r.numberOfSubviews, o = 0, s = 0, c = 0, l = 0;
		for (let n = 0; n < a;) {
			let i, a, u = e[l];
			if (u !== void 0 && u.start === n) {
				l++;
				let e = 0;
				for (let t of u.views(r)) e = Math.max(e, t.height);
				i = t ? u.width : e, a = t ? e : u.width, n = u.end;
			} else {
				let e = r.getSubView(n++);
				i = t ? e.width : e.height, a = t ? e.height : e.width;
			}
			o += i, s = Math.max(s, a), c++;
		}
		o += n * (c - 1), t ? (r.width = o, r.height = s) : (r.width = s, r.height = o);
		let u = 0;
		l = 0;
		for (let o = 0; o < a;) {
			let a = e[l];
			if (a !== void 0 && a.start === o) {
				l++;
				let e = a.views(r), c = 0;
				e.forEach((e, n) => {
					e.resetPos(), e.position = t ? {
						x: u + a.layoutOffset(n, i),
						y: 0
					} : {
						x: (s - a.width) / 2 + a.layoutOffset(n, i),
						y: u
					}, c = Math.max(c, e.height);
				}), u += (t ? a.width : c) + n, o = a.end;
			} else {
				let e = r.getSubView(o++);
				e.resetPos(), t ? (e.position = {
					x: u,
					y: 0
				}, u += e.width + n) : (e.position = {
					x: (s - e.width) / 2,
					y: u
				}, u += e.height + n);
			}
		}
	}
	visitBasicItemList(e) {
		let t = this.l.s, n = It.layoutRuns(this.l.v, t.fonts, this.l.textMeasurer), r = t.options.textOrientation === "HORIZONTAL";
		n.length > 0 ? this.layoutWithRuns(n, r, t.geometry.smallSkip) : r ? this.visitDefault(e) : (this.l.v.stackTop(t.geometry.smallSkip), this.l.v.centerSubViewHorizontally());
	}
	visitCadrat(e) {
		new Vt(this.l.s, this.l.drawer, this.l.centered, this.l.orientation).layout(this.l.v, e);
	}
	visitCartouche(e) {
		let t = this.l.s, n = this.l.v, r = n.firstSubView, i = 0, a = z(2 * jt(t, e.type)), o = jt(t, e.type);
		i = z(i + At(t, e.type, e.startPart));
		let s = i;
		i = z(i + At(t, e.type, e.endPart));
		let c = t.geometry;
		this.l.orientation === "HORIZONTAL" ? (n.width = r.width + i, n.height = Math.max(z(r.height + a), z(c.maxCadratHeight + a)), r.position = {
			x: s,
			y: o
		}) : (n.height = r.height + i, n.width = r.width < z(c.maxCadratWidth + a) ? c.maxCadratWidth + a : r.width + a, r.position = {
			x: z(z(n.width - r.width) / 2),
			y: s
		}), this.l.orientation === "HORIZONTAL" ? (n.deltaBaseY = -o, n.deltaBaseX = 0) : (n.deltaBaseY = 0, n.deltaBaseX = -o), this.l.centered = t.options.smallSignCentered;
	}
	visitComplexLigature(e) {
		let t = [];
		for (let n = 0; n < 3; n++) {
			let r = this.l.computeScale(), i = e.hieroglyph.relativeSize === 100 ? r : z(r * z(e.hieroglyph.relativeSize / 100)), a = this.l.drawer.getLigatureZone(n, e.hieroglyph.code);
			t.push(a === void 0 ? void 0 : N(a, i));
		}
		let n = this.l.v, r = 0;
		if (e.beforeGroup !== null && (t[0] !== void 0 && B(t[0], n.getSubView(r)), r++), r++, e.afterGroup !== null) {
			let e = n.getSubView(r);
			t[2] === void 0 ? t[1] !== void 0 && B(t[1], e) : B(t[2], e);
		}
		n.fitToSubViews(!0);
	}
	visitDefault(e) {
		let t = this.l.s, n = this.l.v;
		if (n.numberOfSubviews !== 0) {
			if (t.options.textOrientation === "HORIZONTAL") n.width = z(n.sumOfSubViewsWidths + z(t.geometry.smallSkip * (n.numberOfSubviews - 1))), n.height = n.maximalHeightOfSubView, n.distributeHorizontally();
			else {
				let e = z(n.sumOfSubViewsHeights + z(t.geometry.smallSkip * (n.numberOfSubviews - 1)));
				n.width = n.maximalWidthOfSubView, n.height = e, n.distributeFromTopToBottom();
			}
		}
	}
	visitHBox(e) {
		let t = this.l.s, n = this.l.v, r = n.maximalHeightOfSubView;
		for (let e of n.subviews) {
			let n = e.model, i = !1;
			n.containsOnlyOneSign() && e.height > t.geometry.largeSignSizeRatio * this.l.drawer.getHeightOfA1() && (i = !0), i && n.getLoneSign().relativeSize === 100 && e.reScale(z(r / e.height)), new Bt().enlarge(e, r);
		}
		let i = z(n.sumOfSubViewsWidths + z((n.numberOfSubviews - 1) * t.geometry.smallSkip));
		n.height = r, n.width = i;
		for (let e of n.subviews) new Bt().enlarge(e, r);
	}
	visitHieroglyph(e) {
		let t = this.l.s, n = t.geometry, r = this.l.v, i = this.l.drawer;
		switch (e.type) {
			case b.SMALLTEXT: {
				let n = this.l.textMeasurer.smallTextDimensions(t.fonts, e.getSmallText());
				r.height = n.height, r.width = n.width;
				break;
			}
			case b.FULLSHADE:
			case b.FULLSPACE:
				r.width = n.maxCadratWidth, r.height = n.maxCadratHeight;
				break;
			case b.QUATERSHADE:
			case b.HALFSPACE:
				r.width = n.maxCadratWidth / 2, r.height = n.maxCadratHeight / 2;
				break;
			case b.VERTICALSHADE:
				r.width = n.maxCadratWidth / 2, r.height = n.maxCadratHeight;
				break;
			case b.HORIZONTALSHADE:
				r.width = n.maxCadratWidth, r.height = n.maxCadratHeight / 2;
				break;
			case b.BEGINERASE:
			case b.ENDERASE:
			case b.REDPOINT:
			case b.BLACKPOINT:
			case b.BEGINEDITORADDITION:
			case b.ENDEDITORADDITION:
			case b.BEGINEDITORSUPERFLUOUS:
			case b.ENDEDITORSUPERFLUOUS:
			case b.BEGINPREVIOUSLYREADABLE:
			case b.ENDPREVIOUSLYREADABLE:
			case b.BEGINMINORADDITION:
			case b.ENDMINORADDITION:
			case b.BEGINSCRIBEADDITION:
			case b.ENDSCRIBEADDITION:
			case b.BEGINDUBIOUS:
			case b.ENDDUBIOUS: {
				let t = e.relativeSize !== 100 || this.l.absoluteGroup || e.isAloneInQuadrat() || e.angle !== 0;
				t || (r.yStretchable = !0);
				let n = i.getBBox(e.code, e.angle, t);
				r.width = n?.width ?? 0, r.height = n?.height ?? 0;
				break;
			}
			case b.MDCCODE: {
				let n = e.code;
				if (i.isKnown(n)) {
					let t = i.getBBox(n, e.angle, !0);
					r.height = t.height * this.l.computeScale(), r.width = t.width * this.l.computeScale();
				} else {
					let e = this.l.textMeasurer.smallTextDimensions(t.fonts, n);
					r.height = e.height, r.width = e.width;
				}
				break;
			}
		}
		e.relativeSize !== 100 && r.reScale(z(e.relativeSize / 100));
	}
	visitHRule(e) {
		this.l.v.width = this.l.s.geometry.textWidth, this.l.v.height = this.l.s.geometry.wideLineWidth;
	}
	visitLigature(e) {
		let t = this.l.v, n = this.l.drawer, r = e.hieroglyphs.map((e) => e.code), i = n.getPositions(r);
		if (i !== void 0) i.forEach((e, n) => {
			let r = t.getSubView(n), i = this.l.computeScale(), a = z(z(e.x * i) * this.l.getGroupUnitScale()), o = z(z(e.y * i) * this.l.getGroupUnitScale());
			r.resetPos(), r.reScale(z(e.scale / 100)), r.position = {
				x: a,
				y: o
			};
		});
		else if (e.numberOfChildren === 2) {
			let r = 0, i = 1, a = 2;
			t.getSubView(1).height * .8 > t.getSubView(0).height && (r = 1, i = 0, a = 0);
			let o = e.hieroglyphs[r].code;
			a === 2 && n.getLigatureZone(a, o) === void 0 && (a = 1);
			let s = n.getLigatureZone(a, o);
			s !== void 0 && (t.getSubView(r).resetPos(), B(N(s, this.l.computeScale()), t.getSubView(i)));
		} else if (e.numberOfChildren === 3) {
			let r = e.hieroglyphs[1].code, i = n.getLigatureZone(0, r), a = n.getLigatureZone(1, r);
			i !== void 0 && a !== void 0 && (t.getSubView(1).resetPos(), B(N(i, this.l.computeScale()), t.getSubView(0)), B(N(a, this.l.computeScale()), t.getSubView(2)));
		}
		t.fitToSubViews(!0);
	}
	visitLineBreak(e) {
		this.l.v.width = 0, this.l.v.height = this.l.s.geometry.maxCadratHeight;
	}
	visitOverwrite(e) {
		let t = this.l.v;
		t.width = Math.max(t.getSubView(0).width, t.getSubView(1).width), t.height = Math.max(t.getSubView(0).height, t.getSubView(1).height), t.centerSubViewHorizontally(), t.centerSubViewsVertically();
	}
	visitPageBreak(e) {}
	visitPhilology(e) {
		let t = this.l.v, n = t.firstSubView, r = z(Mt(e.type) + this.l.s.geometry.smallSkip);
		n.position = {
			x: r,
			y: 0
		}, t.width = z(r * 2) + n.width, t.height = n.height;
	}
	visitSubCadrat(e) {
		let t = this.l.v;
		t.width = t.sumOfSubViewsWidths, t.height = t.maximalHeightOfSubView, t.distributeHorizontally();
	}
	visitSuperscript(e) {
		let t = this.l.s, n = this.l.textMeasurer.smallTextDimensions(t.fonts, e.text);
		this.l.v.width = n.width, this.l.v.height = Math.max(t.geometry.maxCadratHeight, n.height + t.geometry.smallSkip * 2);
	}
	visitTabStop(e) {}
	visitHieroglyphicText(e) {
		let t = this.l.s, n = this.l.v, r = this.l.orientation === "HORIZONTAL" ? new Gt(n, t) : new Kt(n, t), i = It.layoutRuns(n, t.fonts, this.l.textMeasurer), a = 0;
		r.startLayout();
		let o = 0;
		for (; o < n.numberOfSubviews;) {
			let e = i[a];
			if (e !== void 0 && e.start === o) {
				a++;
				let t = e.views(n);
				for (let e of t) e.resetPos();
				r.layoutTextRun(e, t), o = e.end;
			} else {
				let e = n.getSubView(o++);
				e.resetPos(), r.layoutElement(e);
			}
		}
		r.endLayout(), n.width = r.documentArea.width, n.height = r.documentArea.height;
	}
}, Bt = class extends S {
	height = 0;
	view;
	enlarge(e, t) {
		this.height = t, this.view = e, e.model.accept(this);
	}
	visitSubCadrat(e) {
		let t = this.view.firstSubView, n = !1;
		for (let e of t.subviews) e.yStretchable && (e.height = this.height, e.distributeFromTopToBottom(), n = !0);
		n && (t.fitToSubViews(!1), this.view.fitToSubViews(!1));
	}
	visitHieroglyph(e) {
		this.view.yStretchable && (this.view.height = this.height);
	}
};
function B(e, t) {
	t.scaleToFitDimensions(e.width, e.height);
	let n, r;
	n = e.horizontalGravity === "START" ? e.x : e.horizontalGravity === "END" ? e.x + e.width - t.width : e.x + (e.width - t.width) / 2, r = e.verticalGravity === "TOP" ? e.y : e.verticalGravity === "BOTTOM" ? e.y + e.height - t.height : e.y + (e.height - t.height) / 2, t.position = {
		x: n,
		y: r
	};
}
var Vt = class {
	style;
	hieroglyphsDrawer;
	centerSigns;
	currentTextOrientation;
	currentView;
	constructor(e, t, n, r) {
		this.style = e, this.hieroglyphsDrawer = t, this.centerSigns = n, this.currentTextOrientation = r;
	}
	layout(e, t) {
		this.currentView = e;
		let n = this.style.geometry;
		e.yStretchable = !0, e.xStretchable = !0;
		let r, i;
		this.currentTextOrientation === "HORIZONTAL" ? (i = !0, r = !1) : (i = !1, r = !0);
		let a = t.isEmbedded();
		a && (i = !1, r = !1);
		let o = n.maxCadratWidth, s = t.isWide();
		if (r || e.numberOfSubviews !== 1 && !s) for (let t of e.subviews) t.scaleForMaxWidth(o);
		if (s) {
			let n = r ? o : e.maximalWidthOfSubView;
			for (let r = 0; r < e.numberOfSubviews; r++) t.getHBox(r).isWide() && e.getSubView(r).scaleToWidth(n);
		} else {
			let n = e.maximalWidthOfSubView;
			r && !a && n < o && (n = o), this.fitLoneSignsToColumnWidth(t, n);
		}
		let c = e.sumOfSubViewsHeights;
		c = z(c + z((e.numberOfSubviews - 1) * n.smallSkip)), i && c < n.maxCadratHeight && (c = n.maxCadratHeight), e.height = c;
		let l = e.maximalWidthOfSubView;
		r && !a && l < o && (l = o), e.width = l, e.numberOfSubviews > 1 ? e.distributeFromTopToBottom() : this.centerSigns ? e.centerSubViewsVertically() : e.stickSubViewsTo("BOTTOM");
		for (let t of e.subviews) t.width < l && (t.width = l), t.numberOfSubviews === 1 ? t.centerSubViewHorizontally() : (t.distributeHorizontally(), t.stickSubViewsTo("BOTTOM"));
		i && c > n.maxCadratHeight && e.reScale(z(n.maxCadratHeight / c));
	}
	fitLoneSignsToColumnWidth(e, t) {
		let n = this.style.geometry, r = this.currentView;
		for (let i = 0; i < r.numberOfSubviews; i++) {
			if (r.getSubView(i).numberOfSubviews !== 1) continue;
			let a = e.getHBox(i).children[0];
			if (!a.containsOnlyOneSign()) continue;
			let o = a.getLoneSign(), s = r.getSubView(i).getSubView(0), c = this.hieroglyphsDrawer.getHeightOfA1();
			o.relativeSize === 100 && s.internalWidth >= n.largeSignSizeRatio * c && s.internalHeight <= n.smallSignSizeRatio * c && (s.reScale(z(t / s.width)), r.getSubView(i).fitToSubViews(!0));
		}
	}
}, V = class {
	currentPoint = {
		x: 0,
		y: 0
	};
	zoneArea;
	views = [];
	units = [];
	constructor(e, t) {
		this.zoneArea = new A(0, 0, e, t);
	}
	add(e) {
		e.position = {
			x: this.currentPoint.x + e.deltaBaseX,
			y: this.currentPoint.y + e.deltaBaseY
		}, this.zoneArea.add(new A(e.position.x, e.position.y, e.width, e.height)), this.views.push(e), this.units.push([e]);
	}
	addRun(e, t) {
		e.forEach((e, n) => {
			e.position = {
				x: this.currentPoint.x + t[n] + e.deltaBaseX,
				y: this.currentPoint.y + e.deltaBaseY
			}, this.zoneArea.add(new A(e.position.x, e.position.y, e.width, e.height)), this.views.push(e);
		}), this.units.push([...e]);
	}
	get width() {
		return this.zoneArea.width;
	}
	get height() {
		return this.zoneArea.height;
	}
	isEmpty() {
		return this.zoneArea.isEmpty();
	}
	get minX() {
		return this.zoneArea.minX;
	}
	get minY() {
		return this.zoneArea.minY;
	}
	get maxX() {
		return this.zoneArea.maxX;
	}
	moveCurrentPoint(e, t) {
		this.currentPoint.x += e, this.currentPoint.y += t;
	}
	translateBy(e) {
		for (let t of this.views) t.position.x += e.x, t.position.y += e.y;
	}
	justifyWidthTo(e, t) {
		let n = 0, r = [];
		for (let e of this.units) {
			let t = Ut(e);
			n += t, t !== 0 && r.push(e);
		}
		if (n < t) {
			let i = t - n;
			if (r.length === 1) Wt(r[0], e + i / 2);
			else if (i > .5 * n) this.centerInWidth(e, t);
			else if (r.length > 1) {
				let t = i / (r.length - 1), n = e;
				for (let e of r) Wt(e, n), n += Ut(e) + t;
			}
		}
	}
	centerInWidth(e, t) {
		let n = Infinity, r = -Infinity;
		for (let e of this.views) e.width > 0 && (n = Math.min(n, e.position.x), r = Math.max(r, e.position.x + e.width));
		if (n > r) return;
		let i = e + (t - (r - n)) / 2;
		this.translateBy({
			x: i - n,
			y: 0
		});
	}
};
function Ht(e) {
	return Math.min(...e.map((e) => e.position.x));
}
function Ut(e) {
	return e.length === 1 ? e[0].width : Math.max(...e.map((e) => e.position.x + e.width)) - Ht(e);
}
function Wt(e, t) {
	let n = t - Ht(e);
	for (let t of e) t.position.x += n;
}
var Gt = class extends S {
	documentView;
	style;
	documentArea = new A();
	zone = new V(0, 0);
	allZones = [];
	zoneOriginPosition = {
		x: 0,
		y: 0
	};
	currentTextDirection;
	subView;
	addTopMargin = !0;
	constructor(e, t) {
		super(), this.documentView = e, this.style = t, this.currentTextDirection = t.options.textDirection;
	}
	layoutElement(e) {
		this.subView = e, e.position = {
			x: 0,
			y: 0
		}, e.model.accept(this);
	}
	layoutTextRun(e, t) {
		let n = this.currentTextDirection !== "LEFT_TO_RIGHT";
		this.zone.addRun(t, e.layoutOffsets(n)), e.width !== 0 && this.zone.moveCurrentPoint(e.width + this.style.geometry.smallSkip, 0);
	}
	endLayout() {
		let e = this.style.geometry;
		if (this.zone.isEmpty() || this.flushZone(), this.style.options.justified) {
			let t = 0;
			for (let e of this.allZones) e.width > t && (t = e.width);
			t -= e.leftMargin, this.allZones.forEach((n, r) => {
				(r !== this.allZones.length - 1 || n.width >= .75 * t) && n.justifyWidthTo(e.leftMargin, t);
			});
		}
		this.documentArea.addPoint(this.documentArea.maxX + e.leftMargin, this.documentArea.minY + e.topMargin);
	}
	startLayout() {
		this.allZones.length = 0, this.addTopMargin = !0, this.documentView.reset(), this.documentView.direction = this.currentTextDirection, this.initZoneForPage();
	}
	initZoneForPage() {
		this.zone = new V(0, this.style.geometry.maxCadratHeight), this.zoneOriginPosition = {
			x: 0,
			y: 0
		};
	}
	flushZone() {
		let e = this.style.geometry, t = e.leftMargin, n = this.addTopMargin ? e.topMargin : 0, r = this.zone.minX, i = this.zone.minY;
		this.zoneOriginPosition.y = this.zoneOriginPosition.y + n - i, this.zoneOriginPosition.x = t - r, this.zone.translateBy(this.zoneOriginPosition), this.documentArea.add(new A(this.zoneOriginPosition.x + r, this.zoneOriginPosition.y + i, this.zone.width, this.zone.height)), this.style.options.justified && this.allZones.push(this.zone);
	}
	visitLineBreak(e) {
		let t = this.style.geometry, n = this.zone.height + this.zone.minY + t.lineSkip;
		e.spacing !== 100 && (n = n * e.spacing / 100), this.zone.add(this.subView), this.flushZone(), this.zone = new V(0, t.maxCadratHeight), this.zoneOriginPosition.y += n, this.addTopMargin = !1;
	}
	visitPageBreak(e) {
		let t = this.style.geometry, n = this.zone.height;
		this.flushZone(), this.style.options.paged ? this.initZoneForPage() : (this.zone = new V(0, 0), this.zoneOriginPosition.y += t.lineSkip + n, this.subView.width = 32, this.subView.height = t.lineSkip, this.zone.add(this.subView), this.flushZone(), this.zone = new V(0, t.maxCadratHeight)), this.addTopMargin = !0;
	}
	visitTabStop(e) {
		let t = z(e.stopPos * this.style.geometry.tabUnitWidth);
		this.zone.currentPoint.x = t, this.zone.currentPoint.y = 0, this.zone.add(this.subView);
	}
	visitDefault(e) {
		let t = 0;
		this.subView.width !== 0 && (t = z(this.subView.width + this.style.geometry.smallSkip)), this.zone.add(this.subView), this.zone.moveCurrentPoint(t, 0);
	}
}, Kt = class extends S {
	documentView;
	documentArea = new A();
	zone;
	zoneStart = {
		x: 0,
		y: 0
	};
	style;
	currentTextDirection;
	subView;
	constructor(e, t) {
		super(), this.documentView = e, this.style = t, this.currentTextDirection = t.options.textDirection;
	}
	layoutElement(e) {
		this.subView = e, e.model.accept(this);
	}
	layoutTextRun(e, t) {
		let n = this.currentTextDirection !== "LEFT_TO_RIGHT", r = 0;
		for (let e of t) e.deltaBaseY = 0, r = Math.max(r, e.height);
		this.zone.addRun(t, e.layoutOffsets(n)), r !== 0 && this.zone.moveCurrentPoint(0, r + this.style.geometry.lineSkip);
	}
	endLayout() {
		this.zone.isEmpty() || this.flushZone(), this.documentArea.addPoint(this.documentArea.maxX + this.style.geometry.leftMargin, this.documentArea.minY);
	}
	startLayout() {
		this.documentView.reset(), this.style = R(this.style, { options: { textOrientation: "VERTICAL" } }), this.documentView.direction = this.currentTextDirection, this.zone = this.createNewZone(), this.zoneStart = {
			x: this.style.geometry.leftMargin,
			y: 0
		};
	}
	createNewZone() {
		let e = new V(0, 0);
		return e.moveCurrentPoint(0, this.style.geometry.topMargin), e;
	}
	flushZone() {
		this.zoneStart.y += -this.zone.minY, this.zoneStart.x += -this.zone.minX, this.zone.translateBy(this.zoneStart), this.documentArea.add(new A(this.zoneStart.x, this.zoneStart.y, this.zone.width, this.zone.height));
	}
	visitLineBreak(e) {
		this.endColumn();
	}
	endColumn() {
		this.subView.height = .1, this.subView.width = this.style.geometry.maxCadratWidth, this.zone.add(this.subView), this.flushZone(), this.zoneStart.x += this.zone.width + this.style.geometry.columnSkip, this.zone = this.createNewZone();
	}
	visitPageBreak(e) {
		this.style.options.paged || this.endColumn();
	}
	visitTabStop(e) {
		this.visitDefault(e);
	}
	visitDefault(e) {
		this.zone.add(this.subView), this.subView.height !== 0 && this.zone.moveCurrentPoint(0, this.subView.height + this.style.geometry.lineSkip);
	}
};
// packages/core/src/render/codes.ts
function qt(e, t) {
	let n = /* @__PURE__ */ new Set(), r = (e) => {
		if (e instanceof D) n.add(t.canonicalCode(e.code));
		else for (let t of e.children) r(t);
	};
	return r(e), n;
}
// packages/core/src/render/svg-writer.ts
function H(e) {
	let t = Math.round(e * 1e3) / 1e3;
	return Object.is(t, -0) ? "0" : String(t);
}
function Jt(e) {
	return e.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "").replace(/[&<>"']/g, (e) => `&#${e.charCodeAt(0)};`);
}
var U = class {
	d = "";
	moveTo(e, t) {
		return this.d += `M${H(e)} ${H(t)}`, this;
	}
	lineTo(e, t) {
		return this.d += `L${H(e)} ${H(t)}`, this;
	}
	curveTo(e, t, n, r, i, a) {
		return this.d += `C${H(e)} ${H(t)} ${H(n)} ${H(r)} ${H(i)} ${H(a)}`, this;
	}
	line(e, t, n, r) {
		return this.moveTo(e, t).lineTo(n, r);
	}
	rect(e, t, n, r) {
		return this.d += `M${H(e)} ${H(t)}h${H(n)}v${H(r)}h${H(-n)}Z`, this;
	}
	closePath() {
		return this.d += "Z", this;
	}
	isEmpty() {
		return this.d === "";
	}
	toString() {
		return this.d;
	}
};
function Yt(e, t, n) {
	let r = e.toString();
	return r === "" ? "" : `<path d="${r}" fill="none" stroke="${t}" stroke-width="${H(n)}" stroke-linecap="square" stroke-miterlimit="10"/>`;
}
function Xt(e, t, n = !1) {
	let r = e.toString();
	return r === "" ? "" : `<path d="${r}" fill="${t}"${n ? " fill-rule=\"evenodd\"" : ""}/>`;
}
// packages/core/src/render/cartouches.ts
var W = (e, t) => ({
	x: e,
	y: t
});
function Zt(e, t, n, r, i) {
	let a = new Qt(t, t.options.textDirection, t.options.textOrientation, n, r, i), o = t.options.textOrientation === "HORIZONTAL";
	switch (e.type) {
		case "CASTLE": return o ? a.enclosureHorizontal(e) : a.enclosureVertical(e);
		case "SEREKH": return o ? a.serekhHorizontal(e) : a.serekhVertical(e);
		case "HWT": return o ? a.hwtHorizontal(e) : a.hwtVertical(e);
		case "CIRCULAR_ENCLOSURE": return o ? a.circularHorizontal(e) : a.circularVertical(e);
		default: return o ? a.normalHorizontal(e) : a.normalVertical(e);
	}
}
var Qt = class {
	style;
	direction;
	orientation;
	width;
	height;
	color;
	lines = new U();
	fineLines = new U();
	fills = new U();
	constructor(e, t, n, r, i, a) {
		this.style = e, this.direction = t, this.orientation = n, this.width = r, this.height = i, this.color = a;
	}
	result() {
		let e = this.style.geometry;
		return Yt(this.lines, this.color, e.cartoucheLineWidth) + Yt(this.fineLines, this.color, e.fineLineWidth) + Xt(this.fills, this.color);
	}
	line(e, t, n = !1) {
		(n ? this.fineLines : this.lines).line(e.x, e.y, t.x, t.y);
	}
	sides(e) {
		return this.direction === "LEFT_TO_RIGHT" ? [e.startPart, e.endPart] : [e.endPart, e.startPart];
	}
	partLength(e, t) {
		return At(this.style, e.type, t);
	}
	horizontalCorners(e, t) {
		let n = this.style.geometry.cartoucheLineWidth / 2;
		return [
			W(e, n),
			W(e, this.height - n),
			W(this.width - t, n),
			W(this.width - t, this.height - n)
		];
	}
	verticalCorners(e, t) {
		let n = this.style.geometry.cartoucheLineWidth / 2;
		return [
			W(this.width - n, e),
			W(n, e),
			W(this.width - n, this.height - n - t),
			W(n, this.height - n - t)
		];
	}
	normalHorizontal(e) {
		let t = this.style.geometry, [n, r] = this.sides(e), [i, a, o, s] = this.horizontalCorners(this.partLength(e, n), this.partLength(e, r)), c = t.cartoucheLineWidth / 2, l = t.cartoucheLoopLength / 3;
		if (n !== 0) {
			let e = c;
			n === 2 && (e += t.cartoucheLineWidth, this.lines.line(c * 1.5, i.y, c * 1.5, a.y)), this.lines.moveTo(i.x, i.y).curveTo(e - l, i.y, e - l, a.y, a.x, a.y);
		}
		if (this.line(i, o), this.line(a, s), r !== 0) {
			let e = -c;
			r === 2 && (e += -t.cartoucheLineWidth, this.lines.line(this.width - c * 1.5, o.y, this.width - c * 1.5, s.y)), this.lines.moveTo(o.x, o.y).curveTo(this.width + l + e, o.y, this.width + l + e, s.y, s.x, s.y);
		}
		return this.result();
	}
	normalVertical(e) {
		let t = this.style.geometry, [n, r, i, a] = this.verticalCorners(this.partLength(e, e.startPart), this.partLength(e, e.endPart)), o = t.cartoucheLineWidth / 2, s = t.cartoucheLineWidth / 3;
		if (e.startPart !== 0) {
			let i = o;
			e.startPart === 2 && (i += t.cartoucheLineWidth, this.lines.line(r.x, o, n.x, o)), this.lines.moveTo(n.x, n.y).curveTo(n.x, i - s, r.x, i - s, r.x, r.y);
		}
		if (this.line(n, i), this.line(r, a), e.endPart !== 0) {
			let n = -o;
			e.endPart === 2 && (n += -t.cartoucheLineWidth, this.lines.line(a.x, this.height - o * 1.5, i.x, this.height - o * 1.5)), this.lines.moveTo(i.x, i.y).curveTo(i.x, this.height + s + n, a.x, this.height + s + n, a.x, a.y);
		}
		return this.result();
	}
	hwtHorizontal(e) {
		let t = this.style.geometry.cartoucheLineWidth / 2, [n, r] = this.sides(e), [i, a, o, s] = this.horizontalCorners(this.partLength(e, n), this.partLength(e, r));
		return n !== 0 && this.drawHutEnd(n, W(t, t), W(t, this.height - t), i, a), this.line(i, o), this.line(a, s), r !== 0 && this.drawHutEnd(r, W(this.width - t, t), W(this.width - t, this.height - t), o, s), this.result();
	}
	hwtVertical(e) {
		let t = this.style.geometry.cartoucheLineWidth / 2, [n, r, i, a] = this.verticalCorners(this.partLength(e, e.startPart), this.partLength(e, e.endPart));
		return e.startPart !== 0 && this.drawHutEnd(e.startPart, W(this.width - t, t), W(t, t), n, r), this.line(n, i), this.line(r, a), e.endPart !== 0 && this.drawHutEnd(e.endPart, W(this.width - t, this.height - t), W(t, this.height - t), i, a), this.result();
	}
	drawHutEnd(e, t, n, r, i) {
		if (e === 0) return;
		let a = this.style.geometry, o = 1, s = 1;
		this.line(t, n), this.line(t, r), this.line(n, i);
		let c = a.hwtSquareSize - a.cartoucheLineWidth / 2, l = this.orientation === "HORIZONTAL";
		if (l ? r.x < t.x && (o = -1) : (t.x < n.x && (o = -1), r.y > t.y && (s = -1), this.direction !== "LEFT_TO_RIGHT" && (e === 2 ? e = 3 : e === 3 && (e = 2))), e === 2) {
			let e = l ? W(n.x, n.y - c) : W(n.x, n.y - c * s), t = W(n.x + o * c, n.y), r = l ? W(n.x + o * c, n.y - c) : W(n.x + o * c, n.y - c * s);
			this.line(e, r), this.line(r, t);
		} else if (e === 3) {
			let e, n, i;
			l ? (e = W(t.x, t.y + c), n = W(t.x + o * c, t.y), i = W(t.x + o * c, r.y + c)) : (e = W(t.x, t.y - c * s), n = W(t.x - o * c, t.y), i = W(t.x - o * c, t.y - c * s)), this.line(e, i), this.line(i, n);
		}
	}
	serekhHorizontal(e) {
		let t = this.style.geometry.cartoucheLineWidth / 2, [n, r] = this.sides(e), [i, a, o, s] = this.horizontalCorners(this.partLength(e, n), this.partLength(e, r));
		if (n !== 0) {
			let e = W(t, t), r = W(t, this.height - t);
			n === 1 ? this.drawHutEnd(n, e, r, i, a) : this.drawSerekhEnd(i, a, e, r);
		}
		if (this.line(i, o), this.line(a, s), r !== 0) {
			let e = W(this.width - t, t), n = W(this.width - t, this.height - t);
			r === 1 ? this.drawHutEnd(r, e, n, o, s) : this.drawSerekhEnd(o, s, e, n);
		}
		return this.result();
	}
	serekhVertical(e) {
		let t = this.style.geometry.cartoucheLineWidth / 2, [n, r, i, a] = this.verticalCorners(this.partLength(e, e.startPart), this.partLength(e, e.endPart));
		if (e.startPart !== 0) {
			let i = W(t, t), a = W(this.width - t, t);
			e.startPart === 1 ? this.drawHutEnd(1, a, i, n, r) : this.drawSerekhEnd(n, r, a, i);
		}
		if (this.line(n, i), this.line(r, a), e.endPart !== 0) {
			let n = W(t, this.height - t), r = W(this.width - t, this.height - t);
			e.endPart === 1 ? this.drawHutEnd(1, r, n, i, a) : this.drawSerekhEnd(i, a, r, n);
		}
		return this.result();
	}
	drawSerekhEnd(e, t, n, r) {
		if (this.line(e, n), this.line(t, r), this.orientation === "HORIZONTAL") {
			let r = n.x - e.x, i = t.y - e.y, a = e.x + r * .1, o = e.x + r * .3, s = e.x + r * .4;
			this.lines.line(a, e.y, a, t.y), this.fineLines.line(o, e.y, o, t.y), this.fineLines.line(s, e.y, s, t.y);
			let c = e.x + r * .5;
			for (let t = 1; t < 10; t += 3) {
				let r = e.y + .1 * i * t, a = e.y + .1 * i * (t + 1), o = e.y + .1 * i * (t + 2), s = n.x;
				this.fineLines.line(c, r, s, r), this.fineLines.line(c, o, s, o), this.fineLines.line(c, r, c, o);
				let l = c + .2 * (s - c);
				this.fineLines.line(l, a, s, a);
			}
		} else {
			let r = t.x - e.x, i = n.y - e.y, a = e.y + i * .1, o = e.y + i * .3, s = e.y + i * .4;
			this.lines.line(e.x, a, t.x, a), this.fineLines.line(e.x, o, t.x, o), this.fineLines.line(e.x, s, t.x, s);
			let c = e.y + i * .5, l = n.y;
			for (let t = 1; t < 10; t += 3) {
				let n = e.x + .1 * r * t, i = e.x + .1 * r * (t + 1), a = e.x + .1 * r * (t + 2);
				this.fineLines.line(n, c, n, l), this.fineLines.line(a, c, a, l), this.fineLines.line(n, c, a, c);
				let o = c + .2 * (l - c);
				this.fineLines.line(i, o, i, l);
			}
		}
	}
	enclosureHorizontal(e) {
		let [t, n] = this.sides(e);
		return this.drawEnclosure(this.width, this.height, !0, !0, t !== 0, n !== 0), this.result();
	}
	enclosureVertical(e) {
		return this.drawEnclosure(this.width, this.height, e.startPart !== 0, e.endPart !== 0, !0, !0), this.result();
	}
	drawEnclosure(e, t, n, r, i, a) {
		let o = this.style.geometry, s = o.bastionLength, c = o.bastionDepth, l = 0, u = 0, d = e, f = t;
		i && (l += c, d -= c), n && (u += c, f -= c), r && (f -= c), a && (d -= c);
		let p = W(l, u), m = W(p.x, p.y + f), h = W(p.x + d, p.y), g = W(p.x + d, m.y), _ = this.bastionInfo(d), ee = this.bastionInfo(f), v = (e, t, n, r) => this.fills.rect(e, t, n, r), y = (e, t, n, r) => {
			let i = t + e.interBastionSkip + s, a = r ? n - c : n;
			for (let t = 0; t < e.numberOfBastions; t++) v(i, a, s, c), i += s + e.interBastionSkip;
		}, te = (e, t, n, r) => {
			let i = n + e.interBastionSkip + s, a = r ? t - c : t;
			for (let t = 0; t < e.numberOfBastions; t++) v(a, i, c, s), i += s + e.interBastionSkip;
		};
		if (n && (this.line(p, h), y(_, p.x, h.y, !0)), r && (this.line(m, g), y(_, m.x, m.y, !1)), i && (this.line(p, m), te(ee, p.x, p.y, !0)), a && (this.line(h, g), te(ee, h.x, h.y, !1)), n && i) {
			let e = p.x - c, t = p.y - c;
			v(e, t, c + s, c), v(e, t, c, c + s);
		}
		if (r && i) {
			let e = p.x - c, t = m.y;
			v(e, t - s, c, s), v(e, t, c + s, c);
		}
		if (n && a) {
			let e = h.x, t = h.y - c;
			v(e - s, t, c + s, c), v(e, t, c, c + s);
		}
		if (r && a) {
			let e = h.x, t = g.y;
			v(e, t - s, c, s), v(e - s, t, c + s, c);
		}
	}
	bastionInfo(e) {
		let t = this.style.geometry.bastionLength, n = Math.trunc((e - 3 * t) / (2 * t)), r = (e - (n + 2) * t) / (n + 1);
		return n === 1 && (n = 0, r = 0), {
			numberOfBastions: n,
			interBastionSkip: r
		};
	}
	circularHorizontal(e) {
		let t = this.style.geometry, [n, r] = this.sides(e), [i, a, o, s] = this.horizontalCorners(this.partLength(e, n), this.partLength(e, r)), c = t.cartoucheLineWidth / 2, l = t.cartoucheLoopLength / 3, u = W(this.width / 2, this.height / 2), d = null;
		n !== 0 && (d = [W(c - l, i.y), W(c - l, a.y)], this.lines.moveTo(i.x, i.y).curveTo(d[0].x, d[0].y, d[1].x, d[1].y, a.x, a.y)), this.line(i, o), this.line(a, s);
		let f = null;
		return r !== 0 && (f = [W(this.width + l - c, o.y), W(this.width + l - c, s.y)], this.lines.moveTo(o.x, o.y).curveTo(f[0].x, f[0].y, f[1].x, f[1].y, s.x, s.y)), this.bastionRow(i, o, 0, -1), this.bastionRow(a, s, 0, 1), d !== null && this.bastionsAlongCubic(i, d[0], d[1], a, u), f !== null && this.bastionsAlongCubic(o, f[0], f[1], s, u), this.result();
	}
	circularVertical(e) {
		let t = this.style.geometry, [n, r, i, a] = this.verticalCorners(this.partLength(e, e.startPart), this.partLength(e, e.endPart)), o = t.cartoucheLineWidth / 2, s = t.cartoucheLineWidth / 3, c = W(this.width / 2, this.height / 2), l = null;
		e.startPart !== 0 && (l = [W(n.x, o - s), W(r.x, o - s)], this.lines.moveTo(n.x, n.y).curveTo(l[0].x, l[0].y, l[1].x, l[1].y, r.x, r.y)), this.line(n, i), this.line(r, a);
		let u = null;
		return e.endPart !== 0 && (u = [W(i.x, this.height + s - o), W(a.x, this.height + s - o)], this.lines.moveTo(i.x, i.y).curveTo(u[0].x, u[0].y, u[1].x, u[1].y, a.x, a.y)), this.bastionRow(n, i, 1, 0), this.bastionRow(r, a, -1, 0), l !== null && this.bastionsAlongCubic(n, l[0], l[1], r, c), u !== null && this.bastionsAlongCubic(i, u[0], u[1], a, c), this.result();
	}
	bastionRadius() {
		return this.style.geometry.cartoucheLineWidth * 1.5;
	}
	bastionRow(e, t, n, r) {
		let i = Math.hypot(t.x - e.x, t.y - e.y), a = this.bastionRadius(), o = Math.round(i / (a * 3));
		if (o <= 0) return;
		let s = i / o, c = (t.x - e.x) / i, l = (t.y - e.y) / i;
		for (let t = 0; t < o; t++) {
			let i = s * (t + .5);
			this.bastion(e.x + c * i, e.y + l * i, n, r);
		}
	}
	bastionsAlongCubic(e, t, n, r, i) {
		let a = [], o = [];
		for (let i = 0; i <= 48; i++) {
			let s = i / 48, c = 1 - s;
			a.push(W(c * c * c * e.x + 3 * c * c * s * t.x + 3 * c * s * s * n.x + s * s * s * r.x, c * c * c * e.y + 3 * c * c * s * t.y + 3 * c * s * s * n.y + s * s * s * r.y)), o.push(i === 0 ? 0 : o[i - 1] + Math.hypot(a[i].x - a[i - 1].x, a[i].y - a[i - 1].y));
		}
		let s = o[48], c = Math.round(s / (this.bastionRadius() * 3));
		if (c <= 0) return;
		let l = s / c, u = 0;
		for (let e = 0; e < c; e++) {
			let t = l * (e + .5);
			for (; u < 47 && o[u + 1] < t;) u++;
			let n = a[u], r = a[u + 1], s = o[u + 1] - o[u], c = s <= 0 ? 0 : (t - o[u]) / s, d = n.x + (r.x - n.x) * c, f = n.y + (r.y - n.y) * c, p = r.x - n.x, m = r.y - n.y, h = Math.hypot(p, m);
			if (h === 0) continue;
			p /= h, m /= h;
			let g = -m, _ = p;
			g * (d - i.x) + _ * (f - i.y) < 0 && (g = -g, _ = -_), this.bastion(d, f, g, _);
		}
	}
	bastion(e, t, n, r) {
		let i = this.bastionRadius(), a = i * .5522847498307936, o = i / 4, s = -r, c = n, l = e - i * s, u = t - i * c, d = e + i * n, f = t + i * r, p = e + i * s, m = t + i * c;
		this.fills.moveTo(l - o * n, u - o * r).lineTo(l, u).curveTo(e + a * n - i * s, t + a * r - i * c, e + i * n - a * s, t + i * r - a * c, d, f).curveTo(e + i * n + a * s, t + i * r + a * c, e + a * n + i * s, t + a * r + i * c, p, m).lineTo(p - o * n, m - o * r).closePath();
	}
}, G = (e, t) => ({
	type: "M",
	points: [e, t]
}), K = (e, t) => ({
	type: "L",
	points: [e, t]
}), q = (e, t, n, r, i, a) => ({
	type: "C",
	points: [
		e,
		t,
		n,
		r,
		i,
		a
	]
}), J = (e) => ({
	actual: e,
	bounding: null
});
function $t(e, t) {
	return [
		G(0, 0),
		K(e, 0),
		K(e, t),
		K(0, t),
		K(0, 0)
	];
}
var en = (e, t, n) => J([
	G(e - n / 2, n / 2),
	K(n / 2, n / 2),
	K(n / 2, t - n / 2),
	K(e - n / 2, t - n / 2)
]), tn = (e, t, n) => J([
	G(n / 2, n / 2),
	K(e - n / 2, n / 2),
	K(e - n / 2, t - n / 2),
	K(n / 2, t - n / 2)
]), nn = (e, t, n) => J([
	G(e, n / 2),
	K(n / 2, n / 2),
	K(n / 2, t / 2)
]), rn = (e, t, n) => J([
	G(n / 2, n / 2),
	K(e - n / 2, n / 2),
	K(e - n / 2, t / 2)
]), an = (e, t, n) => J([
	G(e - n / 2, n / 2),
	K(n / 2, t / 2),
	K(e - n / 2, t - n / 2)
]), on = (e, t, n) => J([
	G(n / 2, n / 2),
	K(e - n / 2, t / 2),
	K(n / 2, t - n / 2)
]), sn = (e, t, n) => J([G(e - n / 2, n / 2), q(0, 0, 0, t - n / 2, e - n / 2, t - n / 2)]), cn = (e, t, n) => J([G(n / 2, n / 2), q(e, n / 2, e, t - n / 2, n / 2, t - n / 2)]), ln = (e, t, n) => ({
	actual: [G(e / 2, n / 2), K(e / 2, t / 3)],
	bounding: $t(e, t)
}), un = ln;
function Y(e, t, n, r) {
	let i = n / 2, a = t / 2, o = e - i;
	return r ? [
		G(o, i),
		q(i, i, o, a, i, a),
		G(i, a),
		q(o, a, i, t - i, o, t - i)
	] : [
		G(i, i),
		q(e - i, i, i, a, e - i, a),
		G(e - i, a),
		q(i, a, e - i, t - i, i, t - i)
	];
}
var dn = (e, t, n) => ({
	actual: Y(e, t, n, !0).slice(0, 2),
	bounding: Y(e, t, n, !0)
}), fn = (e, t, n) => ({
	actual: Y(e, t, n, !0).slice(2),
	bounding: Y(e, t, n, !0)
}), pn = (e, t, n) => ({
	actual: Y(e, t, n, !1).slice(0, 2),
	bounding: Y(e, t, n, !1)
}), mn = (e, t, n) => ({
	actual: Y(e, t, n, !1).slice(2),
	bounding: Y(e, t, n, !1)
});
function hn(e, t) {
	return (n, r) => {
		let i = n / 2 + t, a = 3 * t, o = e ? i : n - i;
		return {
			actual: [G(o, a), K(o, r - a)],
			bounding: $t(n, r)
		};
	};
}
var gn = {
	"[[": [[en, 1]],
	"]]": [[tn, 1]],
	"[?": [[nn, 1]],
	"?]": [[rn, 1]],
	"[&": [[an, 1]],
	"&]": [[on, 1]],
	"[{": [[dn, 1], [fn, 1]],
	"}]": [[pn, 1], [mn, 1]],
	"[\"": [[en, 1], [hn(!0, yt), .75]],
	"\"]": [[tn, 1], [hn(!1, yt), .75]],
	"['": [[ln, 1]],
	"']": [[un, 1]],
	"[(": [[sn, 1]],
	")]": [[cn, 1]]
}, _n = 3;
function vn(e, t, n, r, i, a, o) {
	let s = "";
	for (let [c, l] of gn[e] ?? []) {
		let e = yt * l, u;
		if (t === 0) u = c(n, r, e).actual;
		else {
			let n = c(_n * i, 18 * a, e), r = pt(t), o = j(n.actual, r), s = mt(n.bounding === null ? o : j(n.bounding, r));
			u = j(o, [
				1,
				0,
				0,
				1,
				-s.minX + e / 2,
				-s.minY + e / 2
			]);
		}
		let d = u.map((e) => e.type === "Z" ? "Z" : e.type + e.points.map(H).join(" ")).join("");
		s += `<path d="${d}" fill="none" stroke="${o}" stroke-width="${H(e)}" stroke-linecap="square" stroke-miterlimit="10"/>`;
	}
	return s;
}
// packages/core/src/render/svg.ts
function yn(e, t, n = {}) {
	let r = n.scale ?? 1, i = Math.ceil(e.width) + 2, a = Math.ceil(e.height) + 2, o = new bn(t, n.idPrefix ?? "jsesh"), s = o.draw(e), c = n.title === void 0 ? "" : `<title>${Jt(n.title)}</title>`, l = n.title === void 0 ? " aria-hidden=\"true\"" : " role=\"img\"", u = n.background ? `<rect width="100%" height="100%" fill="${t.style.painting.backgroundColor}"/>` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${i} ${a}" width="${H(i * r)}" height="${H(a * r)}"${l}${n.attributes ? " " + n.attributes : ""}>` + c + o.defs() + u + s + o.hatching() + "</svg>";
}
var bn = class {
	prefix;
	style;
	drawer;
	measurer;
	drawingState = new w();
	hatched = [];
	shapeIds = /* @__PURE__ */ new Map();
	shapeDefs = "";
	constructor(e, t) {
		this.prefix = t, this.style = e.style, this.drawer = e.drawer, this.measurer = e.measurer;
	}
	draw(e) {
		return this.drawView(e, 0, {
			sx: 1,
			sy: 1,
			tx: 0,
			ty: 0
		});
	}
	useShape(e, t, n) {
		let r = this.shapeIds.get(e);
		return r === void 0 && (r = `${this.prefix}-s${this.shapeIds.size}`, this.shapeIds.set(e, r), this.shapeDefs += `<path id="${r}" d="${t.d}"${t.evenOdd ? " fill-rule=\"evenodd\"" : ""}/>`), `<use href="#${r}" fill="${n}"/>`;
	}
	defs() {
		let e = this.shapeDefs;
		return this.hatched.length > 0 && (e += this.hatchingPattern()), e === "" ? "" : `<defs>${e}</defs>`;
	}
	hatchingPattern() {
		let e = H(3 / Math.SQRT2);
		return `<pattern id="${this.prefix}-hatching" patternUnits="userSpaceOnUse" width="${e}" height="${e}" patternTransform="rotate(45) translate(-0.25 0)"><rect width="0.5" height="${e}" fill="${this.style.painting.blackColor}"/></pattern>`;
	}
	hatching() {
		if (this.hatched.length === 0) return "";
		let e = new U();
		for (let t of this.hatched) e.rect(t.x, t.y, t.width, t.height);
		return `<path d="${e}" fill="url(#${this.prefix}-hatching)"/>`;
	}
	drawView(e, t, n) {
		t === 1 && e.model instanceof T && (this.drawingState = e.model.state);
		let r = this.drawingState.isRed ? this.style.painting.redColor : this.style.painting.blackColor, i = new Tn(this, e, r, n), a = i.draw(!1), o = "", s = {
			sx: n.sx * e.xScale,
			sy: n.sy * e.yScale,
			tx: n.tx,
			ty: n.ty
		};
		for (let n = 0; n < e.numberOfSubviews; n++) {
			let r = e.getSubViewBounds(n), i = {
				sx: s.sx,
				sy: s.sy,
				tx: s.tx + r.x * s.sx,
				ty: s.ty + r.y * s.sy
			}, a = this.drawView(e.getSubView(n), t + 1, i);
			a !== "" && (o += Cn(xn(r.x, r.y), a));
		}
		return o !== "" && (a += Cn(Sn(e.xScale, e.yScale), o)), a += i.draw(!0), a;
	}
	get s() {
		return this.style;
	}
	get signs() {
		return this.drawer;
	}
	get textMeasurer() {
		return this.measurer;
	}
	get state() {
		return this.drawingState;
	}
	hatch(e) {
		this.hatched.push(e);
	}
};
function xn(e, t) {
	return e === 0 && t === 0 ? "" : `translate(${H(e)} ${H(t)})`;
}
function Sn(e, t) {
	return e === 1 && t === 1 ? "" : e === t ? `scale(${H(e)})` : `scale(${H(e)} ${H(t)})`;
}
function Cn(e, t) {
	return e === "" ? t : `<g transform="${e}">${t}</g>`;
}
function wn(e, t, n, r, i) {
	return e.trim() === "" ? "" : `<text x="${H(t)}" y="${H(n)}" fill="${i}" style="font:${Jt(F(r))};white-space:pre">${Jt(e)}</text>`;
}
var Tn = class extends S {
	d;
	view;
	color;
	page;
	postfix = !1;
	out = "";
	constructor(e, t, n, r) {
		super(), this.d = e, this.view = t, this.color = n, this.page = r;
	}
	draw(e) {
		return this.postfix = e, this.out = "", this.view.model.accept(this), this.out;
	}
	visitAlphabeticCharacter(e) {
		if (!this.postfix) return;
		let t = this.d.s.fonts, n = Pt(e, t), r = this.d.textMeasurer.characterMetrics(t, e.script, n);
		this.out += wn(n, 0, r.ascent, L(t, e.script), this.color);
	}
	visitCartouche(e) {
		this.postfix && (this.out += Zt(e, this.d.s, this.view.width, this.view.height, this.color));
	}
	visitCadrat(e) {
		this.postfix && this.doShade(e.shading);
	}
	visitHieroglyph(e) {
		let t = this.d.s;
		if (!this.postfix) e.modifiers.hasInteger("shading") && this.doShade(Dn(String(e.modifiers.getIntegerWithDefault("shading", 0))));
		else {
			for (let n of e.modifiers.modifiers) {
				let e = t.painting.colorMap[n.name];
				e !== void 0 && (this.color = e);
			}
			switch (e.modifiers.getBoolean("red") && (this.color = t.painting.redColor), e.modifiers.getBoolean("i") && (this.color = t.painting.grayColor), e.type) {
				case b.SMALLTEXT: {
					let n = e.getSmallText(), r = this.d.textMeasurer.smallTextDimensions(t.fonts, n);
					this.out += wn(n, 0, r.height, t.fonts.superScriptFont, this.color);
					break;
				}
				case b.REDPOINT:
					this.out += this.sign(e.code, 0, !1, this.d.signs.scaleFromFontToStyle(t), t.painting.redColor);
					break;
				case b.HALFSPACE:
				case b.FULLSPACE: break;
				case b.FULLSHADE:
				case b.VERTICALSHADE:
				case b.HORIZONTALSHADE:
				case b.QUATERSHADE:
					this.shadeArea([new A(0, 0, this.view.width, this.view.height)]);
					break;
				default: {
					let n = e.type >= b.BEGINERASE && e.type <= b.ENDDUBIOUS, r = e.isReversed !== (t.options.textDirection === "RIGHT_TO_LEFT"), i = n ? 1 : this.d.signs.scaleFromFontToStyle(t);
					this.out += this.sign(e.code, e.angle, r, i, this.color);
				}
			}
		}
	}
	sign(e, t, n, r, i) {
		let a = this.view, o = this.d.s, s = this.d.signs, c;
		if (s.isKnown(e)) {
			if (St.isSpecial(e)) c = vn(e, t, a.width, a.height, a.xScale, a.yScale, i);
			else {
				let n = s.getShape(e);
				if (n === void 0) c = "";
				else {
					let o = this.d.useShape(s.provider.canonicalCode(e), n, i);
					if (t !== 0) {
						let e = mt(j(ft(n.d), pt(t)));
						o = Cn(`${xn(-e.minX, -e.minY)} rotate(${H(t)})`.trim(), o);
					}
					c = Cn(Sn(r * a.xScale, r * a.yScale), o);
				}
			}
		} else c = wn(e, 0, this.d.textMeasurer.smallTextDimensions(o.fonts, e).height, o.fonts.superScriptFont, o.painting.redColor);
		return n && c !== "" && (c = Cn(`matrix(-1 0 0 1 ${H(a.width)} 0)`, c)), c;
	}
	visitHRule(e) {
		if (!this.postfix) return;
		let t = this.d.s.geometry, n = new U().line(e.startPos * t.tabUnitWidth, 0, e.endPos * t.tabUnitWidth, 0);
		this.out += Yt(n, this.color, e.type === "L" ? t.wideLineWidth : t.fineLineWidth);
	}
	visitPageBreak(e) {
		this.postfix && !this.d.s.options.paged && (this.out += Yt(new U().line(-1e4, 0, 1e4, 0), this.color, this.d.s.geometry.fineLineWidth));
	}
	visitPhilology(e) {
		if (!this.postfix) return;
		let t = Mt(e.type);
		this.out += this.bracket(e.type * 2 + 1, this.view.width - t), this.out += this.bracket(e.type * 2, 0);
	}
	bracket(e, t) {
		let n = En[e] ?? "??", r = Mt(e), i = this.view.height, a = this.d.s.fonts.plainFont;
		return `<text x="0" y="0" fill="${this.color}" textLength="${H(r)}" lengthAdjust="spacingAndGlyphs" transform="translate(${H(t)} ${H(i * .8)}) scale(1 ${H(i / a.size)})" style="font:${Jt(F(a))}">${Jt(n)}</text>`;
	}
	visitSuperscript(e) {
		if (!this.postfix) return;
		let t = this.d.s, n = this.d.textMeasurer.smallTextDimensions(t.fonts, e.text), r = n.ascent ?? n.height * .8;
		this.out += wn(e.text, 0, r, t.fonts.superScriptFont, this.color);
		let i = new U().line(n.width / 2, n.height + t.geometry.smallSkip, n.width / 2, this.view.internalHeight);
		this.out += Yt(i, this.color, t.geometry.fineLineWidth);
	}
	visitHieroglyphicText(e) {}
	doShade(e) {
		let t = this.view, n = this.d.state.isShaded;
		if (n && (e = x.FULL), e === x.NONE) return;
		let [r, i, a, o] = t.parent !== null && t.parent.direction === "LEFT_TO_RIGHT" ? [
			x.TOP_START,
			x.TOP_END,
			x.BOTTOM_START,
			x.BOTTOM_END
		] : [
			x.TOP_END,
			x.TOP_START,
			x.BOTTOM_END,
			x.BOTTOM_START
		], s = t.width / 2, c = t.height / 2, l = [];
		e & r && l.push(new A(0, 0, s, c)), e & i && l.push(new A(s, 0, s, c)), e & a && l.push(new A(0, c, s, c)), e & o && l.push(new A(s, c, s, c));
		let u = t.next;
		if (u !== null && n && this.d.s.options.textOrientation === "HORIZONTAL" && t.nextIsHorizontallyAdjacent()) {
			let e = u.position.x - t.position.x - t.width;
			l.push(new A(t.width, 0, e / t.xScale, t.height));
		}
		this.shadeArea(l);
	}
	shadeArea(e) {
		let t = this.d.s.painting;
		if (t.shadingStyle === "GRAY_SHADING") {
			let n = new U();
			for (let t of e) n.rect(t.x, t.y, t.width, t.height);
			this.out += Xt(n, t.grayColor);
		} else {
			let t = this.page;
			for (let n of e) this.d.hatch(new A(t.tx + n.x * t.sx, t.ty + n.y * t.sy, n.width * t.sx, n.height * t.sy));
		}
	}
}, En = {
	[b.BEGINERASE]: "[",
	[b.ENDERASE]: "]",
	[b.BEGINEDITORADDITION]: "<",
	[b.ENDEDITORADDITION]: ">",
	[b.BEGINEDITORSUPERFLUOUS]: "{",
	[b.ENDEDITORSUPERFLUOUS]: "}",
	[b.BEGINPREVIOUSLYREADABLE]: "[|",
	[b.ENDPREVIOUSLYREADABLE]: "|]",
	[b.BEGINSCRIBEADDITION]: "'",
	[b.ENDSCRIBEADDITION]: "'"
};
function Dn(e) {
	let t = 0;
	for (let n of e) n === "1" ? t |= x.TOP_START : n === "2" ? t |= x.TOP_END : n === "3" ? t |= x.BOTTOM_START : n === "4" && (t |= x.BOTTOM_END);
	return t;
}
// packages/core/src/render/measurers.ts
function On(e, t, n) {
	let r = [0], i = "";
	for (let t of e) i += t, r.push(n(i));
	let a = r[e.length], o = e.map((e, t) => Math.max(0, r[t + 1] - r[t]));
	return {
		offsets: e.map((e, n) => t ? a - r[n + 1] : r[n]),
		widths: o,
		width: a
	};
}
var kn = class {
	context;
	constructor() {
		let e = null;
		if (typeof OffscreenCanvas < "u" ? e = new OffscreenCanvas(1, 1).getContext("2d") : typeof document < "u" && (e = document.createElement("canvas").getContext("2d")), e === null) throw Error("No canvas available to measure text");
		this.context = e;
	}
	metrics(e, t) {
		return this.context.font = F(e), this.context.measureText(t);
	}
	measureRun(e, t, n, r) {
		let i = L(e, t);
		return On(n, r, (e) => this.metrics(i, e).width);
	}
	characterMetrics(e, t, n) {
		let r = L(e, t), i = this.metrics(r, n);
		return {
			advance: i.width,
			ascent: i.fontBoundingBoxAscent ?? r.size * .8,
			descent: i.fontBoundingBoxDescent ?? r.size * .2
		};
	}
	smallTextDimensions(e, t) {
		let n = this.metrics(e.superScriptFont, t), r = n.fontBoundingBoxAscent ?? e.superScriptFont.size * .8, i = n.fontBoundingBoxDescent ?? e.superScriptFont.size * .2;
		return {
			width: n.width,
			height: r + i,
			ascent: r
		};
	}
}, An = class {
	width(e, t) {
		let n = 0;
		for (let r of t) n += e.size * (r >= "A" && r <= "Z" ? .65 : r === " " ? .25 : .5);
		return n;
	}
	measureRun(e, t, n, r) {
		let i = L(e, t);
		return On(n, r, (e) => this.width(i, e));
	}
	characterMetrics(e, t, n) {
		let r = L(e, t);
		return {
			advance: this.width(r, n),
			ascent: r.size * .9,
			descent: r.size * .22
		};
	}
	smallTextDimensions(e, t) {
		let n = e.superScriptFont;
		return {
			width: this.width(n, t),
			height: n.size * 1.15,
			ascent: n.size * .9
		};
	}
}, jn;
function Mn() {
	if (jn === void 0) try {
		jn = new kn();
	} catch {
		jn = new An();
	}
	return jn;
}
function Nn(e) {
	return e.geometry !== void 0 && e.painting !== void 0 && e.fonts !== void 0 && e.options !== void 0;
}
function Pn(e, t) {
	let n, r = Ot;
	if (typeof e == "string") {
		let t = lt(e);
		n = t.text, Object.keys(nt(e).properties).length > 0 && (r = kt(t.preferences, r));
	} else n = e;
	return t.style !== void 0 && (r = Nn(t.style) ? t.style : R(r, t.style)), {
		text: n,
		style: r
	};
}
function Fn(e, t) {
	let { text: n, style: r } = Pn(e, t);
	return Ln(n, r, t);
}
async function In(e, t) {
	let { text: n, style: r } = Pn(e, t);
	return await t.glyphs.loadShapes(qt(n, t.glyphs)), Ln(n, r, t);
}
function Ln(e, t, n) {
	let r = new St(n.glyphs), i = n.measurer ?? Mn();
	return {
		text: e,
		style: t,
		view: Lt(e, {
			style: t,
			drawer: r,
			measurer: i
		}),
		drawer: r,
		measurer: i
	};
}
function Rn(e, t = {}) {
	let n = t.cadratHeight === void 0 ? t.scale : t.cadratHeight / e.style.geometry.standardSignHeight;
	return yn(e.view, {
		style: e.style,
		drawer: e.drawer,
		measurer: e.measurer
	}, {
		...t,
		scale: n
	});
}
async function zn(e, t) {
	return Rn(await In(e, t), {
		title: typeof e == "string" ? e : void 0,
		...t
	});
}
// packages/glyphs/src/glyph-files.ts
function Bn(e) {
	let t = "";
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		t += r >= "a" && r <= "z" || r >= "0" && r <= "9" ? r : r >= "A" && r <= "Z" ? "_" + r.toLowerCase() : "-" + e.charCodeAt(n).toString(16) + "-";
	}
	return t;
}
// packages/glyphs/src/provider.ts
var Vn = {
	s: "START",
	c: "CENTER",
	e: "END"
}, Hn = {
	t: "TOP",
	c: "CENTER",
	b: "BOTTOM"
}, Un = class {
	index;
	loadShape;
	ligatures = /* @__PURE__ */ new Map();
	shapes = /* @__PURE__ */ new Map();
	pending = /* @__PURE__ */ new Map();
	constructor(e, t) {
		this.index = e, this.loadShape = t;
		for (let [t, n] of e.ligatures) this.ligatures.set(t.join("\0"), n.map(([e, t, n]) => ({
			x: e,
			y: t,
			scale: n
		})));
	}
	get codes() {
		return Object.keys(this.index.glyphs);
	}
	canonicalCode(e) {
		let t = this.index.canonical[e];
		if (t !== void 0) return t;
		let n = e;
		return (e.endsWith("H") || e.endsWith("V")) && e.length > 1 && /\d/.test(e[e.length - 2]) && (n = e.substring(0, e.length - 1) + e.substring(e.length - 1).toLowerCase()), this.index.canonical[n] ?? n;
	}
	size(e) {
		let t = this.index.glyphs[e];
		return t === void 0 ? void 0 : {
			width: t[0],
			height: t[1]
		};
	}
	ligatureZone(e, t) {
		let n = this.index.glyphs[e]?.[2]?.[t];
		if (n == null) return;
		let [r, i, a, o, s] = n;
		return {
			x: r,
			y: i,
			width: a,
			height: o,
			horizontalGravity: Vn[s[0]],
			verticalGravity: Hn[s[1]]
		};
	}
	ligaturePositions(e) {
		return this.ligatures.get(e.join("\0"));
	}
	shape(e) {
		return this.shapes.get(e);
	}
	async loadShapes(e) {
		let t = [];
		for (let n of e) {
			if (this.shapes.has(n) || this.index.glyphs[n] === void 0) continue;
			let e = this.pending.get(n);
			e === void 0 && (e = this.loadShape(Bn(n)).then((e) => {
				this.shapes.set(n, e), this.pending.delete(n);
			}, (e) => {
				this.pending.delete(n), console.warn(`Could not load the shape of ${n}`, e);
			}), this.pending.set(n, e)), t.push(e);
		}
		await Promise.all(t);
	}
}, X = [], Wn = /^(US[0-9]+)?(Aa|Ff|NL|NU|[A-Z])[0-9]+[a-z]*$/i, Gn = class {
	data;
	signs = /* @__PURE__ */ new Map();
	order = /* @__PURE__ */ new Map();
	containing = /* @__PURE__ */ new Map();
	families;
	constructor(e) {
		this.data = e, e.signs.forEach((e, t) => {
			this.signs.set(e.c, e), this.order.set(e.c, t);
			for (let t of e.in ?? []) {
				let n = this.containing.get(t);
				n === void 0 && this.containing.set(t, n = []), n.push(e.c);
			}
		}), this.families = e.families.map(([e, t]) => ({
			code: e,
			description: t
		}));
	}
	compareCodes = (e, t) => {
		let n = this.order.get(e) ?? 2 ** 53 - 1, r = this.order.get(t) ?? 2 ** 53 - 1;
		return n === r ? e < t ? -1 : +(e > t) : n - r;
	};
	getCodesSet() {
		return this.data.signs.map((e) => e.c);
	}
	getFamilies() {
		return this.families;
	}
	getCodesForFamily(e, t) {
		let n = e === "" ? void 0 : RegExp(`^(US[0-9]+)?${e}[0-9]+[a-zA-Z]*$`);
		return this.data.signs.filter((e) => (n === void 0 || n.test(e.c)) && (t || e.b === 1)).map((e) => e.c);
	}
	isAlwaysDisplayed(e) {
		return this.signs.get(e)?.b === 1;
	}
	getValuesFor(e) {
		return this.signs.get(e)?.v ?? X;
	}
	getTagsForSign(e) {
		return this.signs.get(e)?.t ?? X;
	}
	getVariants(e) {
		return (this.signs.get(e)?.var ?? []).map(([e, t]) => ({
			code: e,
			type: t
		}));
	}
	getSignsContaining(e) {
		return this.containing.get(e) ?? X;
	}
	getSignsIn(e) {
		return this.signs.get(e)?.in ?? X;
	}
	getDescriptionFor(e) {
		return this.signs.get(e)?.d ?? "";
	}
	getPossibilityFor(e) {
		return this.data.values[e.replaceAll("-", "")] ?? X;
	}
	getCodesStartingWith(e) {
		let t = RegExp(`^(US[0-9]+)?${Kn(e)}`);
		return this.getCodesSet().filter((e) => t.test(e));
	}
	getSuitableSignsForCode(e) {
		let t = RegExp(`^(US[0-9]+)?${Kn(e)}[a-zA-Z]*$`, "i"), n = e.toLowerCase();
		return [...this.getCodesSet().filter((e) => e.toLowerCase() === n), ...this.getCodesSet().filter((e) => e.toLowerCase() !== n && t.test(e))];
	}
	getPossibilityListFor(e) {
		let t = Wn.test(e) ? this.getSuitableSignsForCode(e) : this.data.keyboard?.[e.replaceAll("-", "")] ?? X;
		return t.length > 0 ? [...t] : [e];
	}
	getTallNarrowSigns() {
		return this.data.tallNarrow;
	}
	getLowBroadSigns() {
		return this.data.lowBroad;
	}
	getLowNarrowSigns() {
		return this.data.lowNarrow;
	}
};
function Kn(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// packages/glyphs/src/load.ts
function qn() {
	return new URL("../data/", "" + import.meta.url).href;
}
var Jn = /* @__PURE__ */ new Map();
function Yn(e = qn()) {
	let t = e.endsWith("/") ? e : e + "/", n = Jn.get(t);
	return n === void 0 && (n = Qn(t + "glyph-index.json").then((e) => new Un(e, (e) => Qn(`${t}glyphs/${e}.json`))), n.catch(() => Jn.delete(t)), Jn.set(t, n)), n;
}
var Xn = /* @__PURE__ */ new Map();
function Zn(e = qn()) {
	let t = e.endsWith("/") ? e : e + "/", n = Xn.get(t);
	return n === void 0 && (n = Qn(t + "sign-info.json").then((e) => new Gn(e)), n.catch(() => Xn.delete(t)), Xn.set(t, n)), n;
}
async function Qn(e) {
	let t = await fetch(e);
	if (!t.ok) throw Error(`${e}: ${t.status} ${t.statusText}`);
	return await t.json();
}
// packages/elements/src/config.ts
var $n = R(Ot, { geometry: {
	leftMargin: 1,
	topMargin: 1
} }), Z = {}, er, tr;
function nr(e) {
	Z = {
		...Z,
		...e
	}, tr = void 0;
}
function rr(e) {
	let t = typeof location > "u" ? void 0 : location.href, n = new URL(e ?? Z.glyphsUrl ?? qn(), t).href;
	return n.endsWith("/") ? n : n + "/";
}
async function ir(e) {
	return e === void 0 && Z.glyphs !== void 0 ? Z.glyphs : Yn(rr(e));
}
function ar(e) {
	let t = Z.style === void 0 ? $n : R($n, Z.style);
	return e === void 0 ? t : R(t, e);
}
function or(e) {
	if (tr === void 0) {
		if (typeof document > "u" || document.fonts === void 0) tr = Promise.resolve();
		else {
			if (typeof FontFace < "u") {
				let e = new FontFace("CharisSIL", `url(${rr()}fonts/CharisSIL-R.woff)`);
				document.fonts.add(e);
			}
			let t = e.fonts;
			tr = Promise.all([
				t.plainFont,
				t.boldFont,
				t.italicFont,
				t.superScriptFont,
				t.transliterationFont
			].map((e) => document.fonts.load(F(e), "aꜣ").catch(() => void 0)));
		}
	}
	return tr;
}
async function sr(e, t = {}) {
	let n = ar(t.style), [r] = await Promise.all([ir(t.glyphsUrl), or(n)]);
	return er ??= new kn(), In(e, {
		glyphs: r,
		style: n,
		measurer: er
	});
}
var cr = 0;
async function lr(e, t = {}) {
	return Rn(await sr(e, t), {
		cadratHeight: t.cadratHeight,
		title: e,
		idPrefix: `jsesh${cr++}`
	});
}
// packages/elements/src/jsesh-text.ts
var ur = ":host{display:inline-block;vertical-align:middle;line-height:0}svg{display:block}", dr = 0, fr = class extends HTMLElement {
	static observedAttributes = [
		"mdc",
		"cadrat-height",
		"direction",
		"orientation",
		"centered",
		"justified",
		"glyphs-url"
	];
	root;
	idPrefix = `jsesh-text${dr++}`;
	_style;
	renderPending = !1;
	generation = 0;
	contentObserver;
	constructor() {
		super(), this.root = this.attachShadow({ mode: "open" });
	}
	get mdc() {
		return this.getAttribute("mdc") ?? this.textContent ?? "";
	}
	set mdc(e) {
		this.setAttribute("mdc", e);
	}
	get jseshStyle() {
		return this._style;
	}
	set jseshStyle(e) {
		this._style = e, this.scheduleRender();
	}
	connectedCallback() {
		this.contentObserver ??= new MutationObserver(() => {
			this.hasAttribute("mdc") || this.scheduleRender();
		}), this.contentObserver.observe(this, {
			childList: !0,
			characterData: !0,
			subtree: !0
		}), this.scheduleRender();
	}
	disconnectedCallback() {
		this.contentObserver?.disconnect();
	}
	attributeChangedCallback() {
		this.scheduleRender();
	}
	scheduleRender() {
		!this.renderPending && this.isConnected && (this.renderPending = !0, queueMicrotask(() => {
			this.renderPending = !1, this.render();
		}));
	}
	styleChanges() {
		let e = {}, t = this.getAttribute("direction");
		t !== null && (e.textDirection = t.toLowerCase() === "rtl" ? "RIGHT_TO_LEFT" : "LEFT_TO_RIGHT");
		let n = this.getAttribute("orientation");
		return n !== null && (e.textOrientation = n.toLowerCase() === "vertical" ? "VERTICAL" : "HORIZONTAL"), this.hasAttribute("centered") && (e.smallSignCentered = !0), this.hasAttribute("justified") && (e.justified = !0), {
			...this._style,
			options: {
				...this._style?.options,
				...e
			}
		};
	}
	cadratHeight() {
		let e = Number.parseFloat(this.getAttribute("cadrat-height") ?? "");
		if (Number.isFinite(e) && e > 0) return e;
		let t = Number.parseFloat(getComputedStyle(this).fontSize);
		return Number.isFinite(t) ? t * 1.5 : 24;
	}
	async render() {
		let e = ++this.generation, t = this.mdc.trim();
		try {
			let n = await sr(t, {
				style: this.styleChanges(),
				glyphsUrl: this.getAttribute("glyphs-url") ?? void 0
			});
			if (e !== this.generation) return;
			let r = Rn(n, {
				cadratHeight: this.cadratHeight(),
				title: t,
				idPrefix: this.idPrefix
			});
			this.root.innerHTML = `<style>${ur}</style>${r}`, this.dispatchEvent(new CustomEvent("jsesh-render"));
		} catch (t) {
			if (e !== this.generation) return;
			this.root.innerHTML = `<style>${ur}</style><slot></slot>`, this.dispatchEvent(new CustomEvent("jsesh-error", { detail: t }));
		}
	}
}, pr = "mdc", mr = "hieroglyphs-processed";
function hr(e = {}) {
	let t = e.selector ?? `.${CSS.escape(e.className ?? "mdc")}`, n = e.root ?? document, r = () => Promise.all(Array.from(n.querySelectorAll(t)).filter((e) => !e.classList.contains(mr)).map((t) => gr(t, e))).then(() => void 0), i = r(), a;
	return e.observe && (a = new MutationObserver(() => void r()), a.observe(n instanceof Document ? n.documentElement : n, {
		childList: !0,
		subtree: !0
	})), {
		done: i,
		disconnect: () => a?.disconnect()
	};
}
async function gr(e, t) {
	e.classList.add(mr);
	let n = (e.textContent ?? "").trim(), r = Number.parseFloat(getComputedStyle(e).fontSize);
	try {
		let i = await lr(n, {
			style: t.style,
			cadratHeight: t.cadratHeight ?? (Number.isFinite(r) ? r * 1.5 : 24)
		});
		e.dataset.mdc = n, e.innerHTML = i, e.firstElementChild?.style.setProperty("vertical-align", "middle");
	} catch (e) {
		console.error(`Could not display ${n}`, e);
	}
}
// packages/elements/src/index.ts
function _r() {
	typeof customElements < "u" && customElements.get("jsesh-text") === void 0 && customElements.define("jsesh-text", fr);
}
_r();
// packages/editor/src/geometry.ts
var vr = 2;
function yr(e, t) {
	let n = t / e.style.geometry.standardSignHeight, r = e.view;
	return r.subviews.map((e, t) => {
		let i = r.getSubViewBounds(t);
		return {
			x: i.x * r.xScale * n,
			y: i.y * r.yScale * n,
			width: i.width * r.xScale * n,
			height: i.height * r.yScale * n
		};
	});
}
function br(e, t, n, r) {
	if (e.length === 0) return 0;
	let i = 0, a = Infinity;
	e.forEach((e, o) => {
		let s = Math.max(e.x - t, 0, t - (e.x + e.width)), c = Math.max(e.y - n, 0, n - (e.y + e.height)), l = r.vertical ? s * 4 + c : c * 4 + s;
		l < a && (a = l, i = o);
	});
	let o = e[i], s;
	return s = r.vertical ? n > o.y + o.height / 2 : r.rightToLeft ? t < o.x + o.width / 2 : t > o.x + o.width / 2, s ? i + 1 : i;
}
function xr(e, t, n, r, i) {
	let a = r, o = e[t], s = e[t - 1];
	if (o === void 0 && s === void 0) return n.vertical ? {
		x: i,
		y: i,
		width: a,
		height: 2
	} : {
		x: i,
		y: i,
		width: 2,
		height: a
	};
	let c = o ?? s;
	return n.vertical ? {
		x: c.x,
		y: o === void 0 ? c.y + c.height : c.y - 2,
		width: Math.max(c.width, a / 2),
		height: 2
	} : {
		x: o !== void 0 === n.rightToLeft ? c.x + c.width : c.x - 2,
		y: c.y,
		width: 2,
		height: Math.max(c.height, a / 2)
	};
}
// packages/editor/src/view.ts
var Sr = 6, Cr = 0, wr = "\n.caret, .selection-box { position: absolute; pointer-events: none; }\n.caret { background: var(--jsesh-caret-color, #c00); }\n.selection-box { background: var(--jsesh-selection-color, rgb(74 127 212 / 25%)); }\n.surface:focus .caret { animation: jsesh-blink 1s step-end infinite; }\n.surface:not(:focus) .caret { background: var(--jsesh-inactive-caret-color, #999); }\n@keyframes jsesh-blink { 50% { opacity: 0; } }\n", Tr = class {
	session;
	surface;
	_cadratHeight;
	style;
	glyphsUrl;
	onError;
	idPrefix = `jsesh-editor${Cr++}`;
	laidOut;
	_areas = [];
	generation = 0;
	unsubscribe;
	onKeyDown = (e) => {
		this.session.handleKey(e) && e.preventDefault();
	};
	onMouseDown = (e) => {
		e.preventDefault(), this.surface.focus();
		let t = this.surface.getBoundingClientRect(), n = e.clientX - t.left + this.surface.scrollLeft, r = e.clientY - t.top + this.surface.scrollTop;
		this.session.moveCaret(br(this._areas, n, r, this.flow()), e.shiftKey);
	};
	constructor(e, t, n = {}) {
		this.session = e, this.surface = t, this._cadratHeight = n.cadratHeight ?? 45, this.style = n.style, this.glyphsUrl = n.glyphsUrl, this.onError = n.onError ?? ((e) => console.error("jsesh editor:", e)), getComputedStyle(t).position === "static" && (t.style.position = "relative"), t.addEventListener("keydown", this.onKeyDown), t.addEventListener("mousedown", this.onMouseDown), this.unsubscribe = e.subscribe(({ layout: e }) => {
			e ? this.renderSafely() : this.drawCaret();
		}), queueMicrotask(() => this.renderSafely());
	}
	destroy() {
		this.generation++, this.unsubscribe(), this.surface.removeEventListener("keydown", this.onKeyDown), this.surface.removeEventListener("mousedown", this.onMouseDown);
	}
	get cadratHeight() {
		return this._cadratHeight;
	}
	set cadratHeight(e) {
		this._cadratHeight = e, this.renderSafely();
	}
	setStyle(e) {
		this.style = e, this.renderSafely();
	}
	get areas() {
		return this._areas;
	}
	focus() {
		this.surface.focus();
	}
	renderSafely() {
		this.render().catch((e) => this.onError(e));
	}
	async render() {
		let e = ++this.generation, t = this.session.options, n = await sr(this.session.text, {
			style: {
				...this.style,
				geometry: {
					leftMargin: Sr,
					topMargin: Sr,
					...this.style?.geometry
				},
				options: {
					...this.style?.options,
					...t
				}
			},
			glyphsUrl: this.glyphsUrl
		});
		e === this.generation && (this.laidOut = n, this.surface.innerHTML = Rn(n, {
			cadratHeight: this._cadratHeight,
			idPrefix: this.idPrefix
		}), this._areas = yr(n, this._cadratHeight), this.drawCaret());
	}
	flow() {
		return {
			vertical: this.session.isVertical,
			rightToLeft: this.session.isRightToLeft
		};
	}
	drawCaret() {
		if (this.laidOut === void 0) return;
		for (let e of this.surface.querySelectorAll(".caret, .selection-box")) e.remove();
		let e = this.session.state;
		for (let t = e.selectionStart; t < e.selectionEnd && t < this._areas.length; t++) this.addBox("selection-box", this._areas[t]);
		let t = this._cadratHeight / this.laidOut.style.geometry.standardSignHeight;
		this.addBox("caret", xr(this._areas, e.caret, this.flow(), this._cadratHeight, Sr * t)).scrollIntoView?.({
			block: "nearest",
			inline: "nearest"
		});
	}
	addBox(e, { x: t, y: n, width: r, height: i }) {
		let a = document.createElement("div");
		return a.className = e, Object.assign(a.style, {
			left: `${t}px`,
			top: `${n}px`,
			width: `${r}px`,
			height: `${i}px`
		}), this.surface.append(a), a;
	}
}, Er = 200, Dr = class {
	_text = new Ce();
	_caret = 0;
	_mark = null;
	_code = "";
	_separator = " ";
	_error;
	_options = {};
	undoStack = [];
	redoStack = [];
	listeners = /* @__PURE__ */ new Set();
	cachedState;
	retry;
	possibilities = (e) => [e];
	subscribe(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
	get state() {
		if (this.cachedState === void 0) {
			let [e, t] = this.selectionRange();
			this.cachedState = {
				mdc: Qe(this._text),
				code: this._code,
				separator: this._separator,
				caret: this._caret,
				length: this._text.topItems.length,
				selection: t - e,
				selectionStart: e,
				selectionEnd: t,
				error: this._error,
				canUndo: this.undoStack.length > 0,
				canRedo: this.redoStack.length > 0
			};
		}
		return this.cachedState;
	}
	get text() {
		return this._text;
	}
	get options() {
		return this._options;
	}
	get isVertical() {
		return this._options.textOrientation === "VERTICAL";
	}
	get isRightToLeft() {
		return this._options.textDirection === "RIGHT_TO_LEFT";
	}
	setOptions(e) {
		this._options = {
			...this._options,
			...e
		}, this.changed();
	}
	setMdc(e, { undoable: t = !0 } = {}) {
		let n;
		try {
			n = Ge(e);
		} catch {
			return !1;
		}
		return this.setText(n, { undoable: t }), !0;
	}
	setText(e, { undoable: t = !0 } = {}) {
		t && this.saveForUndo(), this._text = e, this._caret = e.topItems.length, this._mark = null, this.clearCode(), this.changed();
	}
	document() {
		return ut({
			preferences: it,
			text: this._text
		});
	}
	insertSign(e) {
		this._code !== "" && this.acceptSeparator(this._separator), this._code = e, this.accept(" ", {
			propose: !1,
			cycle: !1
		});
	}
	insertMdc(e) {
		this._code !== "" && this.acceptSeparator(" ");
		let t = this.read(e);
		t !== void 0 && (this.saveForUndo(), this.replaceSelection(t), this.clearCode(), this.changed());
	}
	group(e) {
		this._code !== "" && this.acceptSeparator(" ");
		let [t, n] = this._mark === null ? [Math.max(0, this._caret - 2), this._caret] : this.selectionRange(), r = this.buildGroup(this._text.topItems.slice(t, n), e);
		r !== void 0 && (this.saveForUndo(), this.replaceRange(t, n, r), this.changed());
	}
	cartouche() {
		this._code !== "" && this.acceptSeparator(" ");
		let [e, t] = this.selectionOrPrevious();
		if (e === t) return;
		let n = this.read("<-" + this._text.topItems.slice(e, t).map(Or).join("-") + "->");
		n !== void 0 && (this.saveForUndo(), this.replaceRange(e, t, n), this.changed());
	}
	toggleRed() {
		let [e, t] = this.selectionOrPrevious();
		if (e === t) return;
		this.saveForUndo();
		let n = this._text.topItems.slice(e, t), r = !n[0].isRed;
		for (let e of n) e.state.isRed = r;
		this.changed();
	}
	undo() {
		this.swapWith(this.undoStack, this.redoStack);
	}
	redo() {
		this.swapWith(this.redoStack, this.undoStack);
	}
	refresh() {
		this.changed({
			layout: !1,
			keepRetry: !0
		});
	}
	acceptSeparator(e) {
		this.accept(e, {
			propose: !0,
			cycle: e === " "
		});
	}
	accept(e, { propose: t, cycle: n }) {
		let r;
		if (this._code !== "") {
			let e = t ? this.possibilities(this._code) : [this._code], i = this.read(e[0] ?? this._code);
			if (i === void 0) return;
			this.saveForUndo();
			let [a, o] = this.selectionRange();
			this.insertAndGroup(a, o, i, this._separator), n && e.length > 1 && (r = {
				candidates: e,
				index: 0,
				separator: this._separator,
				start: a,
				end: o
			}), this._code = "";
		} else this._separator !== " " && (this.saveForUndo(), this.groupBeforeCaret(this._separator));
		this._separator = e, this.changed(), this.retry = r;
	}
	nextPossibility() {
		let e = this.retry, t = this.undoStack.at(-1);
		if (e === void 0 || t === void 0) return !1;
		let n = (e.index + 1) % e.candidates.length, r = this.read(e.candidates[n]);
		return r === void 0 || (this._text = t.text.deepCopy(), this.insertAndGroup(e.start, e.end, r, e.separator), this.changed(), this.retry = {
			...e,
			index: n,
			end: e.start + r.length
		}), !0;
	}
	typeCharacter(e) {
		this._code += e, this._error = void 0, this.changed({ layout: !1 });
	}
	escape() {
		this.clearCode(), this._mark = null, this.changed({ layout: !1 });
	}
	backspace() {
		if (this._code !== "") this._code = this._code.slice(0, -1), this.changed({ layout: !1 });
		else if (this._separator !== " ") this._separator = " ", this.changed({ layout: !1 });
		else {
			if (this._mark !== null) this.saveForUndo(), this.replaceSelection([]);
			else if (this._caret > 0) this.saveForUndo(), this.replaceRange(this._caret - 1, this._caret, []);
			else return;
			this.changed();
		}
	}
	delete() {
		if (this._code === "" && this._separator === " ") {
			if (this._mark !== null) this.saveForUndo(), this.replaceSelection([]);
			else if (this._caret < this._text.topItems.length) this.saveForUndo(), this._text.removeItems(this._caret, this._caret + 1);
			else return;
			this.changed();
		}
	}
	handleKey(e) {
		let t = e.key;
		if (e.ctrlKey || e.metaKey) {
			let n = t.toLowerCase();
			if (n === "z") e.shiftKey ? this.redo() : this.undo();
			else if (n === "y") this.redo();
			else if (n === "a") this.selectAll();
			else return !1;
			return !0;
		}
		if (this.moveKey(t, e.shiftKey === !0)) return !0;
		switch (t) {
			case "Backspace": return this.backspace(), !0;
			case "Delete": return this.delete(), !0;
			case "Escape": return this.escape(), !0;
			case " ": return this._code === "" && this._separator === " " && this.nextPossibility() || this.acceptSeparator(" "), !0;
			case "-":
			case "Enter": return this.accept(" ", {
				propose: !0,
				cycle: !1
			}), !0;
			case ":":
			case "*":
			case "&": return this.acceptSeparator(t), !0;
			case "!": return this.insertMdc("!"), !0;
		}
		return t.length === 1 && !e.altKey && (this.typeCharacter(t), !0);
	}
	moveKey(e, t) {
		let n = this.isRightToLeft, r = {
			ArrowRight: n ? -1 : 1,
			ArrowLeft: n ? 1 : -1
		}, i = this.isVertical ? {
			ArrowDown: 1,
			ArrowUp: -1,
			...r
		} : r, a;
		if (e in i) a = this._caret + i[e];
		else if (e === "Home") a = 0;
		else if (e === "End") a = this._text.topItems.length;
		else return !1;
		return this.moveCaret(a, t), !0;
	}
	moveCaret(e, t = !1) {
		this._code !== "" && this.acceptSeparator(" "), this._separator = " ", t && this._mark === null && (this._mark = this._caret), t || (this._mark = null), this._caret = Math.max(0, Math.min(e, this._text.topItems.length)), this._mark === this._caret && (this._mark = null), this.changed({ layout: !1 });
	}
	selectAll() {
		this._mark = 0, this._caret = this._text.topItems.length, this.changed({ layout: !1 });
	}
	read(e) {
		try {
			let t = [...Ge(e).topItems];
			return this._error = void 0, t;
		} catch (t) {
			this._error = `Can't read “${e}”: ${t instanceof Error ? t.message : String(t)}`, this.changed({ layout: !1 });
			return;
		}
	}
	buildGroup(e, t) {
		if (e.length < 2 || !e.every((e) => e instanceof we)) return;
		let n = e.map(Or);
		if (t === "*" && (n = n.map((e) => e.includes(":") ? `(${e})` : e)), t === "&" && !n.every((e) => /^[A-Za-z0-9]+$/.test(e))) return;
		let r = this.read(n.join(t));
		if (r !== void 0 && e[0].isRed) for (let e of r) e.state.isRed = !0;
		return r;
	}
	insertAndGroup(e, t, n, r) {
		this.replaceRange(e, t, n), r !== " " && n.length === 1 && this.groupBeforeCaret(r);
	}
	groupBeforeCaret(e) {
		let t = this._caret - 2;
		if (t < 0) return;
		let n = this.buildGroup(this._text.topItems.slice(t, this._caret), e);
		n !== void 0 && this.replaceRange(t, this._caret, n);
	}
	replaceRange(e, t, n) {
		this._text.removeItems(e, t), this._text.insertItemsAt(e, n), this._caret = e + n.length, this._mark = null;
	}
	replaceSelection(e) {
		let [t, n] = this.selectionRange();
		this.replaceRange(t, n, e);
	}
	selectionRange() {
		return this._mark === null ? [this._caret, this._caret] : [Math.min(this._caret, this._mark), Math.max(this._caret, this._mark)];
	}
	selectionOrPrevious() {
		return this._mark === null ? [Math.max(0, this._caret - 1), this._caret] : this.selectionRange();
	}
	clearCode() {
		this._code = "", this._separator = " ";
	}
	saveForUndo() {
		this.undoStack.push(this.snapshot()), this.undoStack.length > Er && this.undoStack.shift(), this.redoStack.length = 0;
	}
	snapshot() {
		return {
			text: this._text.deepCopy(),
			caret: this._caret
		};
	}
	swapWith(e, t) {
		let n = e.pop();
		n !== void 0 && (t.push(this.snapshot()), this._text = n.text, this._caret = n.caret, this._mark = null, this.clearCode(), this.changed());
	}
	changed({ layout: e = !0, keepRetry: t = !1 } = {}) {
		this.cachedState = void 0, t || (this.retry = void 0);
		for (let t of [...this.listeners]) t({ layout: e });
	}
};
function Or(e) {
	return Qe(new Ce([e.deepCopy()])).replace(/\$[rb]-?/g, "").replace(/-+$/, "").trim();
}
// packages/editor/src/jsesh-editor.ts
var kr = `
:host { display: block; }
.surface {
  position: relative;
  box-sizing: border-box;
  min-height: var(--jsesh-editor-min-height, 6rem);
  overflow: auto;
  cursor: text;
  line-height: 0;
  border: var(--jsesh-editor-border, 1px solid #aaa);
  border-radius: 4px;
  background: var(--jsesh-editor-background, white);
}
.surface:focus { outline: 2px solid #4a7fd4; outline-offset: 1px; }
.surface svg { display: block; }
${wr}
`, Ar = class extends HTMLElement {
	static observedAttributes = [
		"mdc",
		"cadrat-height",
		"direction",
		"orientation",
		"glyphs-url"
	];
	session = new Dr();
	surface;
	view;
	_cadratHeight = 45;
	_style;
	initialized = !1;
	unsubscribe;
	constructor() {
		super();
		let e = this.attachShadow({
			mode: "open",
			delegatesFocus: !0
		});
		e.innerHTML = `<style>${kr}</style>`, this.surface = document.createElement("div"), this.surface.className = "surface", this.surface.setAttribute("part", "surface"), this.surface.tabIndex = 0, this.surface.setAttribute("role", "textbox"), this.surface.setAttribute("aria-multiline", "true"), this.surface.setAttribute("aria-label", "Hieroglyphic text"), e.append(this.surface);
	}
	get mdc() {
		return this.session.state.mdc;
	}
	set mdc(e) {
		e !== this.session.state.mdc && this.session.setMdc(e, { undoable: this.initialized });
	}
	get state() {
		return this.session.state;
	}
	get cadratHeight() {
		return this._cadratHeight;
	}
	set cadratHeight(e) {
		this._cadratHeight = e, this.view !== void 0 && (this.view.cadratHeight = e);
	}
	get jseshStyle() {
		return this._style;
	}
	set jseshStyle(e) {
		this._style = e, this.view?.setStyle(e);
	}
	focus() {
		this.surface.focus();
	}
	insertSign(e) {
		this.session.insertSign(e);
	}
	insertMdc(e) {
		this.session.insertMdc(e);
	}
	group(e) {
		this.session.group(e);
	}
	cartouche() {
		this.session.cartouche();
	}
	toggleRed() {
		this.session.toggleRed();
	}
	undo() {
		this.session.undo();
	}
	redo() {
		this.session.redo();
	}
	document() {
		return this.session.document();
	}
	connectedCallback() {
		if (!this.initialized) {
			this.initialized = !0;
			let e = this.getAttribute("mdc") ?? this.textContent?.trim() ?? "";
			e !== "" && this.session.state.length === 0 && this.session.setMdc(e, { undoable: !1 });
		}
		this.view = new Tr(this.session, this.surface, {
			cadratHeight: this._cadratHeight,
			style: this._style,
			glyphsUrl: this.getAttribute("glyphs-url") ?? void 0,
			onError: (e) => this.dispatchEvent(new CustomEvent("jsesh-error", { detail: e }))
		}), this.unsubscribe = this.session.subscribe(() => this.dispatchEvent(new CustomEvent("jsesh-change", {
			detail: this.session.state,
			bubbles: !0
		}))), Promise.resolve().then(() => Zn(rr(this.getAttribute("glyphs-url") ?? void 0))).then((e) => {
			this.session.possibilities = (t) => e.getPossibilityListFor(t);
		}, () => void 0);
	}
	disconnectedCallback() {
		this.view?.destroy(), this.view = void 0, this.unsubscribe?.();
	}
	attributeChangedCallback(e, t, n) {
		switch (e) {
			case "mdc":
				this.initialized && n !== null && (this.mdc = n);
				break;
			case "cadrat-height": {
				let e = Number.parseFloat(n ?? "");
				Number.isFinite(e) && e > 0 && (this.cadratHeight = e);
				break;
			}
			case "direction":
			case "orientation": this.session.setOptions(this.optionsFromAttributes());
		}
	}
	optionsFromAttributes() {
		let e = {}, t = this.getAttribute("direction");
		t !== null && (e.textDirection = t.toLowerCase() === "rtl" ? "RIGHT_TO_LEFT" : "LEFT_TO_RIGHT");
		let n = this.getAttribute("orientation");
		return n !== null && (e.textOrientation = n.toLowerCase() === "vertical" ? "VERTICAL" : "HORIZONTAL"), e;
	}
};
// packages/editor/src/index.ts
function jr() {
	typeof customElements < "u" && customElements.get("jsesh-editor") === void 0 && customElements.define("jsesh-editor", Ar);
}
jr();
// packages/palette/src/labels.ts
var Mr = {
	selectFamily: "Select a sign family",
	lastUsed: "Latest signs",
	userPalette: "User palette",
	allSigns: "All signs",
	tallNarrowSigns: "Tall narrow signs",
	lowBroadSigns: "Low broad signs",
	lowNarrowSigns: "Low narrow signs",
	allTags: "All",
	otherTags: "Others",
	variantTypes: {
		FULL: "full variant",
		PARTIAL: "partial variant",
		OTHER: "other variant",
		NO: "graphical variant only",
		UNSPECIFIED: "variant"
	},
	part: "part",
	showAllVariants: "show all variants",
	searchPlaceholder: "value or code, then Enter",
	containingPlaceholder: "containing…",
	signCount: (e) => `${e} sign${e === 1 ? "" : "s"}`,
	choose: "Choose",
	variantsButton: "Variants",
	variantsHint: "Show the variants of the sign (again: variants of variants)",
	containingButton: "Containing",
	containingHint: "Show the signs containing this one (again: one level further)",
	back: "Back",
	backHint: "Previous sign",
	inUserPalette: "in my palette",
	values: "Values",
	tags: "Tags",
	variants: "Variants",
	contains: "Contains",
	loading: "Loading the sign database…"
}, Nr = {
	load(e) {
		try {
			let t = JSON.parse(localStorage.getItem(e) ?? "[]");
			return Array.isArray(t) ? t.filter((e) => typeof e == "string") : [];
		} catch {
			return [];
		}
	},
	save(e, t) {
		try {
			localStorage.setItem(e, JSON.stringify(t));
		} catch {}
	}
};
function Pr(e = {}) {
	let t = new Map(Object.entries(e));
	return {
		load: (e) => [...t.get(e) ?? []],
		save: (e, n) => void t.set(e, [...n])
	};
}
// packages/palette/src/controller.ts
var Q = {
	LAST_USED: "*last",
	USER_PALETTE: "*user",
	ALL: "*all",
	TALL_NARROW: "*tallNarrow",
	LOW_BROAD: "*lowBroad",
	LOW_NARROW: "*lowNarrow"
}, Fr = "jsesh-palette-last", Ir = "jsesh-palette-user", Lr = 6, Rr = class {
	database;
	storage;
	labels;
	lastUsed;
	userPalette;
	listeners = /* @__PURE__ */ new Set();
	chosenListeners = /* @__PURE__ */ new Set();
	history = [];
	variantSet;
	partSet;
	cachedState;
	family = "";
	showAllVariants = !1;
	tags = [];
	tag = "";
	secondaryTags = [];
	secondaryTag = "";
	containingOptions = [];
	displayed = [];
	selected;
	constructor(e, t = {}) {
		this.database = e, this.storage = t.storage ?? Nr, this.labels = {
			...Mr,
			...t.labels
		}, this.lastUsed = new Set(this.storage.load(Fr)), this.userPalette = new Set(this.storage.load(Ir)), this.family = t.initialFamily ?? "A", this.selectCategory();
	}
	subscribe(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
	onSignChosen(e) {
		return this.chosenListeners.add(e), () => this.chosenListeners.delete(e);
	}
	get state() {
		return this.cachedState ??= {
			family: this.family,
			showAllVariants: this.showAllVariants,
			tags: this.tags,
			tag: this.tag,
			secondaryTags: this.secondaryTags,
			secondaryTag: this.secondaryTag,
			containingOptions: this.containingOptions,
			displayed: this.displayed,
			selected: this.selected,
			info: this.selected === void 0 ? void 0 : this.signInfo(this.selected),
			canGoBack: this.history.length >= 2
		}, this.cachedState;
	}
	get familyOptions() {
		let e = this.labels;
		return [
			{
				value: Q.LAST_USED,
				label: e.lastUsed
			},
			{
				value: Q.USER_PALETTE,
				label: e.userPalette
			},
			...this.database.getFamilies().map((e) => ({
				value: e.code,
				label: `${e.code}. ${e.description}`
			})),
			{
				value: Q.ALL,
				label: e.allSigns
			},
			{
				value: Q.TALL_NARROW,
				label: e.tallNarrowSigns
			},
			{
				value: Q.LOW_BROAD,
				label: e.lowBroadSigns
			},
			{
				value: Q.LOW_NARROW,
				label: e.lowNarrowSigns
			}
		];
	}
	setFamily(e) {
		this.family = e, this.selectCategory(), this.changed();
	}
	setShowAllVariants(e) {
		this.showAllVariants = e, this.selectCategory(), this.changed();
	}
	setTag(e) {
		this.tag = e;
		let t = this.signsForTag(e);
		this.setDisplayedSigns(t);
		let n = new Set(t.flatMap((e) => this.database.getTagsForSign(e)));
		n.delete(e), this.secondaryTags = n.size === 0 ? [] : ["", ...[...n].sort()], this.secondaryTag = "", this.changed();
	}
	setSecondaryTag(e) {
		this.secondaryTag = e;
		let t = this.signsForTag(this.tag);
		e !== "" && (t = t.filter((t) => this.database.getTagsForSign(t).includes(e))), this.setDisplayedSigns(t), this.changed();
	}
	search(e) {
		if (e = e.trim(), e === "") return;
		let t;
		t = /^[a-zA-Z].*[0-9]/.test(e) ? [.../* @__PURE__ */ new Set([...this.database.getSuitableSignsForCode(e), ...this.database.getCodesStartingWith(e)])] : [...this.database.getPossibilityFor(e)], this.selectNoFamily(), this.setDisplayedSigns(t), t.length > 0 ? this.select(t[0]) : this.changed();
	}
	showVariants() {
		if (this.selected !== void 0) {
			this.variantSet === void 0 && (this.variantSet = /* @__PURE__ */ new Set([this.selected]), this.partSet = void 0);
			for (let e of [...this.variantSet]) for (let t of this.database.getVariants(e)) this.variantSet.add(t.code);
			this.selectNoFamily(), this.setDisplayedSigns([...this.variantSet].sort(this.database.compareCodes), { keepClosures: !0 }), this.changed();
		}
	}
	showContaining() {
		if (this.selected !== void 0) {
			this.partSet === void 0 && (this.partSet = /* @__PURE__ */ new Set([this.selected]), this.variantSet = void 0);
			for (let e of [...this.partSet]) for (let t of this.database.getSignsContaining(e)) this.partSet.add(t);
			this.selectNoFamily(), this.setDisplayedSigns([...this.partSet].sort(this.database.compareCodes), { keepClosures: !0 }), this.changed();
		}
	}
	filterContaining(e) {
		if (e === "") return;
		let t = /* @__PURE__ */ new Set(), n = [e];
		for (; n.length > 0;) {
			let e = n.pop();
			t.has(e) || (t.add(e), n.push(...this.database.getSignsContaining(e)));
		}
		this.selectNoFamily(), this.setDisplayedSigns(this.displayed.filter((e) => t.has(e))), this.changed();
	}
	reveal(e) {
		this.displayed.includes(e) || (this.selectNoFamily(), this.setDisplayedSigns([e, ...this.displayed])), this.select(e);
	}
	select(e) {
		e !== this.history[this.history.length - 1] && (this.history.push(e), this.history.length > Lr && this.history.shift()), this.selected = e, this.changed();
	}
	move(e) {
		if (this.displayed.length === 0) return;
		let t = this.selected === void 0 ? -1 : this.displayed.indexOf(this.selected), n = Math.max(0, Math.min(this.displayed.length - 1, t + e));
		this.select(this.displayed[n]);
	}
	back() {
		if (this.history.length < 2) return;
		this.history.pop();
		let e = this.history[this.history.length - 1];
		this.displayed.includes(e) || (this.selectNoFamily(), this.setDisplayedSigns([e, ...this.displayed])), this.selected = e, this.changed();
	}
	setInUserPalette(e, t = this.selected) {
		t !== void 0 && (e ? this.userPalette.add(t) : this.userPalette.delete(t), this.storage.save(Ir, [...this.userPalette]), this.family === Q.USER_PALETTE && this.selectCategory(), this.changed());
	}
	choose(e = this.selected) {
		if (e !== void 0) {
			this.lastUsed.add(e), this.storage.save(Fr, [...this.lastUsed]);
			for (let t of [...this.chosenListeners]) t(e);
		}
	}
	signsInFamily() {
		let e = this.database, t = (t) => [...t].sort(e.compareCodes);
		switch (this.family) {
			case "": return [];
			case Q.LAST_USED: return t(this.lastUsed);
			case Q.USER_PALETTE: return t(this.userPalette);
			case Q.ALL: return e.getCodesForFamily("", !0);
			case Q.TALL_NARROW: return [...e.getTallNarrowSigns()];
			case Q.LOW_BROAD: return [...e.getLowBroadSigns()];
			case Q.LOW_NARROW: return [...e.getLowNarrowSigns()];
			default: return e.getCodesForFamily(this.family, this.showAllVariants);
		}
	}
	signsForTag(e) {
		let t = this.signsInFamily();
		return e === this.labels.allTags ? t : e === this.labels.otherTags ? t.filter((e) => this.database.getTagsForSign(e).length === 0) : t.filter((t) => this.database.getTagsForSign(t).includes(e));
	}
	selectCategory() {
		let e = this.signsInFamily();
		this.setDisplayedSigns(e);
		let t = new Set(e.flatMap((e) => this.database.getTagsForSign(e)));
		this.tags = this.family === "" ? [] : [
			this.labels.allTags,
			...[...t].sort(),
			this.labels.otherTags
		], this.tag = this.family === "" ? "" : this.labels.allTags, this.secondaryTags = [], this.secondaryTag = "";
	}
	selectNoFamily() {
		this.family = "", this.tags = [], this.tag = "", this.secondaryTags = [], this.secondaryTag = "";
	}
	setDisplayedSigns(e, { keepClosures: t = !1 } = {}) {
		t || (this.variantSet = void 0, this.partSet = void 0), this.displayed = e, this.selected !== void 0 && e.includes(this.selected) || (this.selected = e[0]);
		let n = new Set(e.flatMap((e) => this.database.getSignsIn(e)));
		this.containingOptions = n.size === 0 ? [] : ["", ...[...n].sort(this.database.compareCodes)];
	}
	signInfo(e) {
		let t = this.database;
		return {
			code: e,
			values: t.getValuesFor(e),
			tags: t.getTagsForSign(e),
			variants: t.getVariants(e).map((e) => ({
				code: e.code,
				type: e.type,
				typeLabel: this.labels.variantTypes[e.type] ?? e.type
			})),
			parts: t.getSignsIn(e),
			description: t.getDescriptionFor(e),
			inUserPalette: this.userPalette.has(e)
		};
	}
	changed() {
		this.cachedState = void 0;
		for (let e of [...this.listeners]) e();
	}
}, zr = "\n:host { display: block; container-type: inline-size; line-height: 1.4; }\n[hidden] { display: none !important; }\n.palette {\n  border: 1px solid var(--jsesh-palette-border, #aaa);\n  border-radius: 4px;\n  padding: 0.5rem;\n  background: var(--jsesh-palette-background, white);\n}\n.row { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.4rem; }\n[data-palette=\"family\"] { max-width: 22rem; }\n.spacer { flex: 1; }\n.body { display: grid; grid-template-columns: minmax(0, 1fr) var(--jsesh-palette-info-width, 18rem); gap: 0.5rem; }\n@container (max-width: 40rem) {\n  .body { grid-template-columns: 1fr; }\n  [data-palette=\"info\"] { border-left: none !important; padding-left: 0 !important; max-height: none !important; }\n}\n[data-palette=\"signs\"] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(4.2rem, 1fr));\n  gap: 2px;\n  height: var(--jsesh-palette-grid-height, 24rem);\n  overflow-y: auto;\n  align-content: start;\n  background: var(--jsesh-palette-muted-background, #f4f4f4);\n  padding: 2px;\n}\n.sign {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: space-between;\n  height: 4.2rem;\n  padding: 2px;\n  background: var(--jsesh-palette-background, white);\n  border: 1px solid transparent;\n  cursor: pointer;\n  font-size: 0.7rem;\n}\n.sign .picture { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; width: 100%; }\n.sign svg { max-width: 100%; max-height: 100%; height: auto; }\n.sign:hover { border-color: #9bb5e0; }\n.sign.selected {\n  background: var(--jsesh-palette-selected-background, #dbe6f8);\n  border-color: var(--jsesh-palette-selected-border, #4a7fd4);\n}\n[data-palette=\"info\"] {\n  border-left: 1px solid #ddd;\n  padding-left: 0.5rem;\n  font-size: 0.9rem;\n  overflow: auto;\n  max-height: var(--jsesh-palette-grid-height, 24rem);\n}\n.big { display: flex; align-items: center; gap: 0.75rem; }\n.big [data-palette=\"code\"] { font-size: 1.4rem; font-weight: 600; }\ndl { display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.5rem; margin: 0.5rem 0; }\ndt { color: #666; }\ndd { margin: 0; }\n.code-link {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.2rem;\n  margin: 0 0.2rem 0.2rem 0;\n  padding: 0.1rem 0.3rem;\n  font-size: 0.75rem;\n  background: var(--jsesh-palette-background, white);\n  border: 1px solid #ccc;\n  border-radius: 3px;\n  cursor: pointer;\n}\n[data-palette=\"description\"] { overflow-x: auto; border-top: 1px solid #ddd; padding-top: 0.4rem; }\n.message { padding: 0.5rem; }\n";
function Br(e) {
	return `
<div class="row" data-palette="filters">
  <select data-palette="family" aria-label="${$(e.selectFamily)}"></select>
  <label><input type="checkbox" data-palette="show-all" /> ${$(e.showAllVariants)}</label>
  <select data-palette="tag" aria-label="${$(e.tags)}"></select>
  <select data-palette="secondary-tag" aria-label="${$(e.tags)}"></select>
</div>
<div class="row" data-palette="search-row">
  <input data-palette="search" type="search" placeholder="${$(e.searchPlaceholder)}" size="22" />
  <select data-palette="contains" aria-label="${$(e.containingPlaceholder)}"></select>
  <span class="spacer"></span>
  <span data-palette="count"></span>
</div>
<div class="body">
  <div data-palette="signs" role="listbox" aria-label="Signs"></div>
  <div data-palette="info">
    <div class="big">
      <jsesh-text data-palette="picture" cadrat-height="70"></jsesh-text>
      <span data-palette="code"></span>
    </div>
    <div class="row">
      <button data-palette="choose">${$(e.choose)}</button>
      <button data-palette="variants" title="${$(e.variantsHint)}">${$(e.variantsButton)}</button>
      <button data-palette="containing" title="${$(e.containingHint)}">${$(e.containingButton)}</button>
      <button data-palette="back" title="${$(e.backHint)}">${$(e.back)}</button>
    </div>
    <label><input type="checkbox" data-palette="in-user-palette" /> ${$(e.inUserPalette)}</label>
    <dl>
      <dt>${$(e.values)}</dt>
      <dd data-palette="values"></dd>
      <dt>${$(e.tags)}</dt>
      <dd data-palette="tags"></dd>
      <dt>${$(e.variants)}</dt>
      <dd data-palette="variant-list"></dd>
      <dt>${$(e.contains)}</dt>
      <dd data-palette="parts"></dd>
    </dl>
    <div data-palette="description">
      <jsesh-text data-palette="description-text" cadrat-height="18"></jsesh-text>
    </div>
  </div>
</div>`;
}
function $(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function Vr(e, t) {
	let n = t.map((e) => e.value + "\0" + e.label).join("");
	e.dataset.options !== n && (e.dataset.options = n, e.replaceChildren(...t.map((e) => new Option(e.label, e.value)))), e.disabled = t.length === 0;
}
var Hr = class extends HTMLElement {
	static observedAttributes = ["glyphs-url"];
	root;
	_database;
	_controller;
	_labels = Mr;
	_storage;
	loading = 0;
	ui = /* @__PURE__ */ new Map();
	observer;
	unsubscribe;
	shownSigns;
	cells = /* @__PURE__ */ new Map();
	shownSelected;
	shownInfoCode;
	constructor() {
		super(), this.root = this.attachShadow({ mode: "open" });
	}
	get database() {
		return this._database;
	}
	set database(e) {
		this._database = e, this.isConnected && this.start();
	}
	get controller() {
		return this._controller;
	}
	get labels() {
		return this._labels;
	}
	set labels(e) {
		this._labels = {
			...Mr,
			...e
		}, this.isConnected && this.start();
	}
	get storage() {
		return this._storage;
	}
	set storage(e) {
		this._storage = e, this.isConnected && this.start();
	}
	choose(e) {
		this._controller?.choose(e);
	}
	connectedCallback() {
		this.start();
	}
	disconnectedCallback() {
		this.stop();
	}
	attributeChangedCallback() {
		this.isConnected && this.getAttribute("glyphs-url") !== null && (this._database = void 0, this.start());
	}
	stop() {
		this.unsubscribe?.(), this.unsubscribe = void 0, this.observer?.disconnect(), this.observer = void 0, this._controller = void 0;
	}
	start() {
		this.stop();
		let e = ++this.loading;
		this._database === void 0 ? (this.root.innerHTML = `<style>${zr}</style><div class="message">${$(this._labels.loading)}</div>`, Promise.resolve().then(() => Zn(rr(this.getAttribute("glyphs-url") ?? void 0))).then((t) => {
			e === this.loading && (this._database = t, this.build(t));
		}, (t) => {
			e === this.loading && (this.root.innerHTML = `<style>${zr}</style><div class="message" role="alert">${$(String(t))}</div>`, this.dispatchEvent(new CustomEvent("jsesh-error", { detail: t })));
		})) : this.build(this._database);
	}
	build(e) {
		let t = new Rr(e, {
			storage: this._storage,
			labels: this._labels
		});
		this._controller = t, this.root.innerHTML = `<style>${zr}</style><div class="palette" part="palette">${Br(this._labels)}</div>`, this.ui = /* @__PURE__ */ new Map();
		for (let e of this.root.querySelectorAll("[data-palette]")) {
			let t = e.dataset.palette;
			this.ui.set(t, e), e.part.add(t);
		}
		this.shownSigns = void 0, this.shownSelected = void 0, this.shownInfoCode = void 0, this.cells = /* @__PURE__ */ new Map();
		let n = (e) => this.ui.get(e), r = this._labels, i = n("family");
		i.add(new Option(r.selectFamily, ""));
		for (let e of t.familyOptions) i.add(new Option(e.label, e.value));
		this.observer = new IntersectionObserver((e) => this.drawVisibleCells(e), {
			root: n("signs"),
			rootMargin: "200px"
		}), i.addEventListener("change", () => t.setFamily(i.value)), n("show-all").addEventListener("change", (e) => t.setShowAllVariants(e.target.checked));
		let a = n("tag");
		a.addEventListener("change", () => t.setTag(a.value));
		let o = n("secondary-tag");
		o.addEventListener("change", () => t.setSecondaryTag(o.value));
		let s = n("search");
		s.addEventListener("keydown", (e) => {
			e.key === "Enter" && t.search(s.value);
		});
		let c = n("contains");
		c.addEventListener("change", () => t.filterContaining(c.value)), n("variants").addEventListener("click", () => t.showVariants()), n("containing").addEventListener("click", () => t.showContaining()), n("back").addEventListener("click", () => t.back()), n("choose").addEventListener("click", () => t.choose()), n("in-user-palette").addEventListener("change", (e) => t.setInUserPalette(e.target.checked)), n("signs").addEventListener("keydown", (e) => this.gridKey(e)), t.onSignChosen((e) => this.dispatchEvent(new CustomEvent("sign-chosen", {
			detail: e,
			bubbles: !0,
			composed: !0
		}))), this.unsubscribe = t.subscribe(() => this.update()), this.update();
	}
	update() {
		let e = this._controller;
		if (e === void 0) return;
		let t = e.state, n = (e) => this.ui.get(e), r = this._labels, i = (e, t = "") => e.map((e) => ({
			value: e,
			label: e === "" ? t : e
		}));
		n("family").value = t.family, n("show-all").checked = t.showAllVariants, Vr(n("tag"), i(t.tags)), n("tag").value = t.tag, Vr(n("secondary-tag"), i(t.secondaryTags)), n("secondary-tag").value = t.secondaryTag, Vr(n("contains"), i(t.containingOptions, r.containingPlaceholder)), n("contains").value = "", n("count").textContent = r.signCount(t.displayed.length), n("back").disabled = !t.canGoBack, t.displayed !== this.shownSigns && this.showSigns(t.displayed), this.showSelected(t), this.showInfo(t);
	}
	showSigns(e) {
		this.shownSigns = e, this.shownSelected = void 0;
		let t = this.ui.get("signs"), n = this._controller;
		this.observer?.disconnect(), t.scrollTop = 0, this.cells = /* @__PURE__ */ new Map();
		let r = e.map((e) => {
			let t = document.createElement("button");
			return t.className = "sign", t.part.add("sign"), t.dataset.code = e, t.title = e, t.tabIndex = -1, t.setAttribute("role", "option"), t.innerHTML = `<span class="picture"></span><span class="code">${$(e)}</span>`, t.addEventListener("click", () => n.select(e)), t.addEventListener("dblclick", () => n.choose(e)), this.cells.set(e, t), this.observer?.observe(t), t;
		});
		t.replaceChildren(...r);
	}
	showSelected(e) {
		if (e.selected === this.shownSelected) return;
		let t = this.ui.get("signs"), n = this.root.activeElement !== null && t.contains(this.root.activeElement), r = this.shownSelected === void 0 ? void 0 : this.cells.get(this.shownSelected);
		r !== void 0 && (r.classList.remove("selected"), r.part.remove("selected"), r.tabIndex = -1, r.setAttribute("aria-selected", "false")), this.shownSelected = e.selected;
		let i = e.selected === void 0 ? void 0 : this.cells.get(e.selected);
		i !== void 0 && (i.classList.add("selected"), i.part.add("selected"), i.tabIndex = 0, i.setAttribute("aria-selected", "true"), i.scrollIntoView({ block: "nearest" }), n && i.focus());
	}
	showInfo(e) {
		let t = (e) => this.ui.get(e), n = e.info;
		if (t("info").hidden = n === void 0, n === void 0) {
			this.shownInfoCode = void 0;
			return;
		}
		if (t("in-user-palette").checked = n.inUserPalette, n.code === this.shownInfoCode) return;
		this.shownInfoCode = n.code;
		let r = this._controller, i = this._labels;
		t("picture").mdc = n.code, t("code").textContent = n.code, t("values").textContent = n.values.join(", ") || "—", t("tags").textContent = n.tags.join(", ") || "—";
		let a = (e, t) => {
			let n = document.createElement("button");
			return n.className = "code-link", n.part.add("code-link"), n.title = `${e} (${t})`, n.innerHTML = `<jsesh-text cadrat-height="22">${$(e)}</jsesh-text>${$(e)}`, n.addEventListener("click", () => r.reveal(e)), n;
		};
		t("variant-list").replaceChildren(...n.variants.map((e) => a(e.code, e.typeLabel))), t("parts").replaceChildren(...n.parts.map((e) => a(e, i.part))), t("description").hidden = n.description === "", t("description-text").mdc = n.description;
	}
	drawVisibleCells(e) {
		for (let t of e) {
			if (!t.isIntersecting) continue;
			let e = t.target;
			this.observer?.unobserve(e);
			let n = e.firstElementChild;
			lr(e.dataset.code, { cadratHeight: 34 }).then((e) => n.innerHTML = e, () => n.textContent = "?");
		}
	}
	gridKey(e) {
		let t = this._controller, n = this.ui.get("signs"), r = n.firstElementChild, i = Math.max(1, Math.round(n.clientWidth / (r?.offsetWidth || 1))), a = {
			ArrowRight: 1,
			ArrowLeft: -1,
			ArrowDown: i,
			ArrowUp: -i
		};
		if (e.key in a) t.move(a[e.key]);
		else if (e.key === "Enter" || e.key === " ") t.choose();
		else return;
		e.preventDefault();
	}
};
// packages/palette/src/index.ts
function Ur() {
	typeof customElements < "u" && customElements.get("jsesh-palette") === void 0 && customElements.define("jsesh-palette", Hr);
}
Ur();
export { ke as AbsoluteGroup, O as AlphabeticCharacter, An as ApproximateTextMeasurer, xe as BasicItem, Me as BasicItemList, vr as CARET_THICKNESS, we as Cadrat, kn as CanvasTextMeasurer, Pe as Cartouche, je as ComplexLigature, pr as DEFAULT_CLASS, it as DEFAULT_DOCUMENT_PREFERENCES, Dt as DEFAULT_FONTS, wt as DEFAULT_GEOMETRY, Tt as DEFAULT_LAYOUT_OPTIONS, Et as DEFAULT_PAINTING, Mr as DEFAULT_PALETTE_LABELS, Ot as DEFAULT_STYLE, wr as EDITOR_VIEW_CSS, Dr as EditorSession, Tr as EditorView, Un as GlyphIndexProvider, Te as HBox, We as HRule, D as Hieroglyph, St as HieroglyphDrawer, Ce as HieroglyphicText, Se as HorizontalListElement, E as InnerGroup, Ar as JSeshEditorElement, Hr as JSeshPaletteElement, fr as JSeshTextElement, Fr as LAST_USED_KEY, Oe as Ligature, ze as LineBreak, dt as MDCView, Le as MdcComment, se as MdcParser, y as MdcSyntaxError, C as ModelElement, S as ModelElementAdapter, Ee as Modifier, De as ModifiersList, Ae as Overwrite, mr as PROCESSED_CLASS, Be as PageBreak, Rr as PaletteController, Fe as Philology, Q as PseudoFamily, A as Rect, x as ShadingCode, Gn as SignDatabase, Ne as SubCadrat, Re as Superscript, b as SymbolCodes, Ve as TabStop, He as Tabbing, Ue as TabbingClear, It as TextRun, T as TopItem, w as TopItemState, Ir as USER_PALETTE_KEY, kt as applyDocumentPreferences, hr as autoRender, Lt as buildView, xr as caretArea, de as cartoucheTypeCode, fe as cartoucheTypeForCode, be as closeCodeForPhilology, _e as codeForLexicalItem, At as computeCartouchePartLength, jt as computeCartoucheSecondaryLength, nr as configureJSesh, Ie as convertWindowsTransliteration, F as cssFont, qn as defaultGlyphDataUrl, jr as defineJSeshEditor, _r as defineJSeshElements, Ur as defineJSeshPalette, Pt as displayString, ot as documentPreferencesFromMap, st as documentPreferencesToMap, Rn as drawLaidOutText, yn as drawSvg, Bn as fileNameForCode, L as fontForScript, Nt as isRightToLeft, yr as itemAreas, sr as layOutInPage, In as layOutText, Fn as layOutTextSync, Yn as loadGlyphProvider, Zn as loadSignDatabase, Nr as localStoragePaletteStorage, Pr as memoryPaletteStorage, ye as openCodeForPhilology, Ge as parseMdc, oe as parseMdcAst, Mt as philologyWidth, br as positionAt, lt as readMdcDocument, lr as renderMdc, zn as renderToSvg, rr as resolveGlyphsUrl, N as scaleZone, me as scriptForMdcCode, le as shadingToString, qt as signCodes, nt as stripJSeshHeader, Qe as toMdc, Ft as transliterationString, ve as typeForCode, R as withStyle, rt as writeJSeshHeader, ut as writeMdcDocument };
