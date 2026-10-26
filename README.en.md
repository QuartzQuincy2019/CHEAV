# CHEAV — Cyrene's Hierograph Editor and Viewer

**English** · [简体中文](README.md)

A browser-based editor for typing, editing and reading Ancient Egyptian hieroglyphic texts.
Pure static front end: **no build step, no package manager, no third-party runtime dependencies** —
open `index.html` and you are ready to go.

> **Try it online: <https://quartzquincy2019.github.io/CHEAV/>**
> (hosted on GitHub Pages; see below for local use)

- Version: **1.0.0** (since 2025-12-27)
- Author: **Quincy K. / Quartz Studio ©2019-2026**
- The rendering engine is a single-file plugin, [`js/plugin/MdCRndr.js`](js/plugin/MdCRndr.js), that can be
  embedded in other projects on its own

---

## Quick start

**Online**: open <https://quartzquincy2019.github.io/CHEAV/>.

**Locally**:

```text
1. Open index.html in a browser            ← simplest
2. Or serve the folder locally (recommended; fonts and styles behave better):
     python -m http.server 8000
   then visit http://localhost:8000/
```

Force-refresh with **Ctrl+F5** after updating the code (browsers cache scripts and fonts).

Type `nfr` in the input buffer → press <kbd>Tab</kbd> to accept the candidate (writing `F35`) → press
<kbd>Enter</kbd> to send it to the text, and the glyphs appear below.

---

## Interface and controls

| Area | Purpose |
|---|---|
| **IB** (input buffer) | Type pronunciations (`nfr`), Gardiner codes (`F35`) or code sequences; <kbd>Enter</kbd> sends to the text |
| **IB preview** | Live rendering of the input plus its normalised MdC string |
| **VMBox** | Vocabulary and ligature matches (candidate: pronunciation / glyph / code + meaning) |
| **PDMBox** | Phonemes (letter → single glyph); typing `;` switches it to determinatives |
| **GMBox** | Gardiner-code lookup, case-insensitive |
| **Text** | The final text; accepts raw MdC rendering strings only |
| **Render area** | Read-only rendering of the text |
| **Settings** | Key bindings, page size, feature toggles (applied immediately and remembered) |

| Key | Effect (all rebindable in Settings) |
|---|---|
| <kbd>Alt</kbd> | Cycle focus between the three candidate boxes (skips boxes with no candidates) |
| <kbd>Tab</kbd> | Accept the current candidate and write it into the IB |
| <kbd>Enter</kbd> | IB → text |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>←</kbd> <kbd>→</kbd> | Move between options / turn pages |
| <kbd>Backspace</kbd> | When the IB is empty, delete directly from the text |

Docs need not take you away from the editor: the footer's 使用说明 / 开发者文档 links open them in an **in-page overlay** (close with Esc, ✕ or a click on the backdrop); index.html#doc=instructions and #doc=for_developers are shareable deep links.

---

## Input syntax (the MdC rendering subset)

| Notation | Meaning | Example |
|---|---|---|
| `N35` | Gardiner code → single glyph | `N35` |
| `1313F` | Hexadecimal code point (U+13000–U+143FF) | `1313F` |
| `*` | Side by side inside one quadrat | `W24*X1:N1` |
| `:` | Move one layer down (vertical stacking) | `D21:N35` |
| `-` | Horizontal separation between quadrats (not allowed inside a stack) | `D58-G43` |
| `{name}` | Ligature reference | `{I10-D46}` |
| `<text>` | Inline text | `F35-<good>` |
| `$` | Manual line break | `D21-$-D46` |

Notes:

- Stacks (VRGs) follow dictionary scaling: signs are only scaled **down**, never up, so that an
  over-full quadrat is shrunk as a whole.
- `J…` is an equivalent shorthand for the `AA…`/`Aa…` group (`J1` ≡ `AA1`, `J80` ≡ `Aa80`); when written
  into the text it is normalised to `AA…`/`Aa…`.
- Codes the font does not contain (e.g. `S95`, `A133a`) are **not errors**: they render as a boxed
  placeholder showing the code, occupying their normal position.
- Only "things that are not codes" (a pronunciation such as `nfr`, or a determinative name such as
  `;eye` typed directly into the text) and unclosed parentheses are genuinely invalid.

---

## Features

- **Three-way matching**: vocabulary/ligatures, phonemes/determinatives, Gardiner codes; candidates are
  ranked by how well they match and paginated
- **PIC (primary implicit conversion)**: pronunciation fragments are automatically converted to the
  primary character's code (`nfr` → `F35`); can be switched off
- **Ligatures**: two or three signs merged into one quadrat at fixed relative positions (the geometry
  lives in the plugin)
- **Vocabulary variants**: entries that are variants of one another **share the same meaning object**, so
  editing one updates the whole family
- **Settings panel**: rebindable keys, VM page size (1–9), PIC toggle, key-cast toggle (shown only when the plugin is present), reset
- **Key cast**: a translucent overlay for screen recording (recent-key history plus the current
  combination); usable as a standalone embed as well
- **Warnings and tolerance**: invalid fragments turn the border red and rendering is aborted (the previous
  frame is kept) — no half-rendered output

---

## Project structure

```text
CHEAV/
├─ index.html               main editor page (18 scripts, plain <script> tags in order)
├─ instructions.html        user documentation
├─ for_developers.html      developer documentation (MdCRndr external API)
├─ README.md                Chinese README
├─ README.en.md             this file
├─ LICENSE                  MIT (project code and documentation)
├─ NOTICE.md                third-party components and data sources (incl. full Unicode license)
├─ fonts/
│   ├─ NewGardiner.ttf      OFL 1.1 licensed font
│   └─ OFL.txt              full font license text
├─ css/general.css          UI styles (rendering styles are injected by the plugin)
├─ lib/visumetrics.js       compatibility shim: metrics table binding
├─ js/
│   ├─ plugin/
│   │   ├─ MdCRndr.js       rendering engine plugin (single file, zero deps: parse / render / codes / metrics)
│   │   └─ keycast.js       key-cast plugin (single file, zero deps; git-ignored, not distributed)
│   ├─ database/            data and semantics layer (vocabulary, phonemes, determinatives, ligatures, i18n, settings)
│   ├─ engine/              engine layer (compat shims, PIC, matching)
│   └─ ui/                  UI integration (apply.js state machine, docs.js docs overlay)
├─ tools/entries.js         maintenance CLI (query / add / modify)
└─ CPlugin_Test/index.html  rendering plugin test bench (depends on the plugin only)
```

> **Development-time material and local backups are not distributed with the repository**: the Unicode
> source data (`Unikemet.txt`), the signature ↔ code-point table, screenshots, the metrics extraction
> scripts (`g.py`, `gen_metrics.py`) with the generated `visumetrics.json`, and the local backup directory
> `backup/` all live outside the repository in `..\_tem_dd\cheav\` (its `README.md` explains each item and
> its licensing). None of it is needed at runtime — metrics and code tables are inlined in
> [`js/plugin/MdCRndr.js`](js/plugin/MdCRndr.js).

---

## Renderer plugin (usable standalone)

`js/plugin/MdCRndr.js` is a **single-file, zero-dependency** MdC rendering engine that registers its own
font and injects the styles it needs. Copy it into any web project:

```html
<script src="js/plugin/MdCRndr.js"></script>
<script>
  MdCRndr.init({ fontUrl: "fonts/NewGardiner.ttf" });
  MdCRndr.renderText(document.getElementById("out"), "S34-N35:AA1");
</script>
```

The full API (`init` / `set` / `config` / `parse` / `render` / `renderText` / `splitLines` / `charOf` /
`codeOf` / `canonicalize` / `defineLigature` / `internals`, …) is documented in
[for_developers.html](for_developers.html); a standalone demo is
[CPlugin_Test/index.html](CPlugin_Test/index.html).

---

## Data maintenance

```bash
node tools/entries.js "/s -v /p anx"                    # query: vocabulary whose pronunciation contains anx
node tools/entries.js "/a -p -prim /p a /g D36"          # add: make D36 the primary code of phoneme a
node tools/entries.js "/m -v /bf /r -e S34-N35:AA1 /ef /m -en \"live, life\" -chs \"生活，生命\""
node tools/entries.js                                    # interactive mode (:h for help)
```

It handles ordering (vocabulary by MdC natural order, determinatives by Gardiner code, phonemes grouped by
first letter), backs up automatically before writing, and reloads the data to verify afterwards.

Backups go to `backup/` inside the repository by default (listed in `.gitignore`, never committed); set the
environment variable to keep them outside the repository:

```bash
CHEAV_BACKUP_DIR=../_tem_dd/cheav/backup  node tools/entries.js "/s -v /p anx"
```

---

## Requirements

| Purpose | Requirement |
|---|---|
| Using the editor | A modern browser with ES2017+ (recent Chrome / Edge / Firefox / Safari) — **nothing to install** |
| Maintenance CLI | Node.js ≥ 16 (no third-party dependencies) |
| Regenerating metrics | Python 3 + [fontTools](https://github.com/fonttools/fonttools); `gen_metrics.py` / `g.py` and `visumetrics.json` are not distributed with the repository |

---

## License

| Content | License |
|---|---|
| Project code and documentation (`index.html`, `js/`, `lib/`, `css/`, `tools/`, …) | **MIT**, see [LICENSE](LICENSE) |
| `NewGardiner.ttf` and the glyph metrics derived from it | **SIL OFL 1.1** (© Mark-Jan Nederhof, University of St Andrews), see [fonts/OFL.txt](fonts/OFL.txt) |
| Gardiner code table and the extended-block mapping (generated from Unicode data) | **Unicode License V3** (© Unicode, Inc.), full text in [NOTICE.md](NOTICE.md) |

The repository does **not** include JSesh glyph material (its licence forbids use in other hieroglyphic
word processors), the Unicode code-chart PDF (redistribution is not permitted), or the development-time
Unicode source data and metrics scripts (moved outside the repository). See [NOTICE.md](NOTICE.md).

---

## Status and limitations

- The font is **NewGardiner v3.06**, covering the 1071 signs of the basic block plus the *core* signs of the
  extended block (about 3427 of the 3995 in Unicode 16); the remaining **568 non-core signs have no glyph**
  and appear as placeholder boxes.
- Signs in the extended block have no Gardiner number; refer to them by code point (`13460`–`143FF`) or by
  their UniKemet identifier (e.g. `A1d`). JSesh-style extended signatures (e.g. `F35A`) are registered too.
- 24 of the longer English glosses in the vocabulary follow dictionary conventions; verify their provenance
  before public redistribution (see section 6 of NOTICE.md).

---

## Acknowledgements

- **NewGardiner** font and glyph data — Mark-Jan Nederhof (University of St Andrews), OFL 1.1
- **Unicode / Unikemet (UAX #57)** — Unicode, Inc.
- This is an independent implementation; no JSesh glyph material is included. Credit is due to JSesh and
  Serge Rosmorduc for their pioneering work on hieroglyphic typesetting.
