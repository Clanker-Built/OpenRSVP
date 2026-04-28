# OpenRSVP — todo

Plan: `~/.claude/plans/cuddly-greeting-hearth.md`

## Build order
- [x] 1. Scaffold project (package.json, tsconfig, vite, electron-builder)
- [x] 2. Engine: tokenize, ORP, pacing, chunker (pure TS)
- [x] 3. Parsers: text/md, docx, doc, html (Readability), epub, pdf
- [x] 4. PDF column/sidebar heuristics
- [x] 5. Main process (window, IPC, store, drag-drop, file dialog, URL fetch)
- [x] 6. Preload (typed contextBridge)
- [x] 7. Renderer: Library + DropZone + Player + PivotWord + Controls + Settings
- [x] 8. Persistence (electron-store: settings, library, positions)
- [x] 9. Keyboard shortcuts (space, arrows, +/-)
- [x] 10. electron-builder targets (Linux AppImage/deb, Windows NSIS)
- [x] 11. `npm install` and smoke test (electron launches; build clean)
- [x] 12. Engine unit tests (vitest) — 8/8 passing
- [ ] 13. Parser fixture tests (deferred — needs sample PDFs/EPUBs)

## Review

- TypeScript main + renderer compile clean; vite build produces 152 KB renderer bundle.
- 8/8 engine tests pass: ORP table, tokenizer punctuation, pacing multipliers + 3× cap, chunker doesn't span sentence boundaries.
- Electron launches without runtime errors (SIGTERM after timeout = app was running normally).
- Layout note: `tsc rootDir=src` puts the main entry at `dist/main/main/index.js`, preload at `dist/main/preload/preload.js`, renderer at `dist/renderer/index.html`. Paths in `package.json` and `BrowserWindow` config wired accordingly.
- Dev script passes `--no-sandbox` because the unprivileged chrome-sandbox install fails on stock Linux without `chown root && chmod 4755`. Production AppImage handles its own sandbox so this only matters in `npm run dev`.

### Deferred for v1.1
- Parser fixture tests (need golden files: 2-col PDF, magazine PDF, EPUB novel, Wikipedia URL, .docx).
- RegionPicker fallback UI for low-confidence PDF column detection.
- OCR for scanned PDFs (tesseract.js).
- Settings drawer for pivot color, font preset, etc. (currently inline in player controls + library topbar).
