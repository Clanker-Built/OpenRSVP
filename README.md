# OpenRSVP

A world-class **Rapid Serial Visual Presentation** reader for desktop. Drop a PDF, EPUB, DOCX, TXT, Markdown, HTML, or paste a URL — OpenRSVP extracts the main reading text (no sidebars, page numbers, or running headers), then plays it word-by-word at your chosen WPM with Spritz-style **Optimal Recognition Point** highlighting.

## Features

- **ORP highlighting** — pivot letter rendered in a fixed column so your eye never moves.
- **Smart pacing** — pauses on commas, longer on sentences, paragraph breaks insert breathing room.
- **1 / 2 / 3-word chunks** — read phrases instead of single words for higher comprehension.
- **Per-document bookmarks** — close the app, reopen, resume right where you stopped.
- **Drag & drop** — PDFs, EPUBs, DOC/DOCX, TXT/MD, HTML files, or paste a URL.
- **Cross-platform** — Linux (AppImage, .deb) and Windows (NSIS installer, portable .exe).
- **Fully offline** — no API keys, no telemetry. Only network call is fetching URLs you paste.

## Reading-text extraction

| Format | Strategy |
| --- | --- |
| PDF | `pdfjs-dist` text items + per-page column detection (1/2-col), font-size filtering for footnotes & captions, repeating header/footer dedup, page-number stripping, indentation-based paragraph grouping. |
| Web URL / HTML | Mozilla **Readability** (Firefox Reader Mode algorithm) over a JSDOM. |
| EPUB | Spine traversal → per-chapter Readability cleanup. |
| DOCX | `mammoth` raw text. |
| DOC (legacy) | `word-extractor`. |
| TXT / MD | Markdown rendered + tags stripped, paragraphs split on blank lines. |

## Keyboard shortcuts (player)

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `→` / `←` | Step ±1 word |
| `Shift + →/←` | Jump ±25 words |
| `↑` / `↓` | WPM ±25 |
| `Esc` | Back to library |

## Develop

```bash
npm install
npm run dev
```

## Build installers

```bash
npm run dist:linux   # AppImage + .deb
npm run dist:win     # NSIS + portable .exe
```

## Project layout

```
src/
├── engine/         Pure TS: tokenize, ORP, pacing, chunker (unit-tested)
├── parsers/        Document → ParsedDocument (paragraphs[])
├── main/           Electron main: window, IPC, electron-store
├── preload/        contextBridge API surface
└── renderer/       React UI: Library, Player, PivotWord
```

## Tests

```bash
npm test
```

## License

MIT
