import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ParsedDocument } from './types';

// pdfjs-dist v4+ is ESM-only; load it dynamically from CJS main process.
// The legacy build runs in plain Node without DOM.
type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (Function('m', 'return import(m)') as (m: string) => Promise<PdfjsModule>)(
      'pdfjs-dist/legacy/build/pdf.mjs'
    );
  }
  return pdfjsPromise;
}

interface Item {
  str: string;
  x: number;        // left edge
  y: number;        // top (we flip from PDF bottom-origin)
  width: number;
  height: number;   // ~ font size
  page: number;
}

export async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const buf = await fs.readFile(filePath);
  const id = crypto.createHash('sha256').update(buf).digest('hex');
  const data = new Uint8Array(buf);
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false })
    .promise;

  const allItems: Item[] = [];
  const pageHeights: number[] = [];
  const pageWidths: number[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    pageHeights.push(viewport.height);
    pageWidths.push(viewport.width);
    const content = await page.getTextContent();
    for (const it of content.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>) {
      if (!it.str || !it.str.trim()) continue;
      allItems.push({
        str: it.str,
        x: it.transform[4],
        y: viewport.height - it.transform[5], // top-origin
        width: it.width,
        height: it.height || Math.abs(it.transform[3]) || 10,
        page: p
      });
    }
  }

  const paragraphs = extractMainText(allItems, pageHeights, pageWidths);
  const warnings: string[] = [];
  if (paragraphs.length < 2) warnings.push('Very little text recovered from PDF — may be scanned/image-based (OCR not yet supported).');

  return {
    id,
    title: path.basename(filePath),
    source: filePath,
    format: 'pdf',
    paragraphs,
    warnings: warnings.length ? warnings : undefined
  };
}

// Heuristic main-text extraction:
// 1. Drop tiny font items (< 0.75x median) — footnotes, captions, sidebars.
// 2. Drop items in top/bottom 7% of pages if their text repeats across many pages (running headers/footers, page #s).
// 3. Detect 1- or 2-column layout per page from x-position clustering of body items.
// 4. Within each column, sort by y then x; concatenate columns left-to-right.
// 5. Group lines into paragraphs by vertical gap and indentation.
function extractMainText(
  items: Item[],
  pageHeights: number[],
  pageWidths: number[]
): string[] {
  if (!items.length) return [];

  // ---- 1. font-size filter ------------------------------------------------
  const sizes = items.map((i) => i.height).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] || 10;
  const minSize = median * 0.75;
  let kept = items.filter((i) => i.height >= minSize);

  // ---- 2. running header/footer dedup ------------------------------------
  const repeatThreshold = Math.max(3, Math.floor(pageHeights.length * 0.4));
  const textCounts = new Map<string, Set<number>>();
  for (const it of kept) {
    const ph = pageHeights[it.page - 1];
    if (it.y < ph * 0.07 || it.y > ph * 0.93) {
      const key = it.str.trim().toLowerCase().replace(/\d+/g, '#');
      if (!key) continue;
      if (!textCounts.has(key)) textCounts.set(key, new Set());
      textCounts.get(key)!.add(it.page);
    }
  }
  const repeatedRunning = new Set(
    [...textCounts.entries()].filter(([, pages]) => pages.size >= repeatThreshold).map(([k]) => k)
  );
  kept = kept.filter((it) => {
    const ph = pageHeights[it.page - 1];
    if (it.y < ph * 0.07 || it.y > ph * 0.93) {
      const key = it.str.trim().toLowerCase().replace(/\d+/g, '#');
      if (repeatedRunning.has(key)) return false;
      // Also drop bare page numbers anywhere near the margin
      if (/^\d+$/.test(it.str.trim())) return false;
    }
    return true;
  });

  // ---- 3-4. per-page column detection + ordering -------------------------
  const pageGroups = new Map<number, Item[]>();
  for (const it of kept) {
    if (!pageGroups.has(it.page)) pageGroups.set(it.page, []);
    pageGroups.get(it.page)!.push(it);
  }

  const orderedLines: { text: string; page: number; indent: boolean; gapAbove: number }[] = [];

  for (const [pageNum, pageItems] of [...pageGroups.entries()].sort((a, b) => a[0] - b[0])) {
    const pw = pageWidths[pageNum - 1];

    // Detect 2-column: are item x-starts bimodal around the page's left/middle?
    const xs = pageItems.map((i) => i.x).sort((a, b) => a - b);
    const isTwoColumn = looksLikeTwoColumn(xs, pw);

    let columns: Item[][];
    if (isTwoColumn) {
      const splitX = pw / 2;
      columns = [
        pageItems.filter((i) => i.x < splitX),
        pageItems.filter((i) => i.x >= splitX)
      ];
    } else {
      // Drop items whose x is far from the dominant left margin (sidebar callouts).
      const leftMode = mode(xs.map((x) => Math.round(x / 10) * 10));
      columns = [pageItems.filter((i) => Math.abs(i.x - leftMode) < pw * 0.35 || i.width > pw * 0.3)];
    }

    for (const col of columns) {
      // Group items into lines by y-coordinate (within ~ font height).
      col.sort((a, b) => a.y - b.y || a.x - b.x);
      const lines: Item[][] = [];
      let current: Item[] = [];
      let currentY = -Infinity;
      for (const it of col) {
        if (current.length === 0 || Math.abs(it.y - currentY) < it.height * 0.6) {
          current.push(it);
          currentY = it.y;
        } else {
          lines.push(current);
          current = [it];
          currentY = it.y;
        }
      }
      if (current.length) lines.push(current);

      let prevY = -Infinity;
      let prevHeight = median;
      for (const line of lines) {
        line.sort((a, b) => a.x - b.x);
        const text = line
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!text) continue;
        const lineY = line[0].y;
        const lineH = line[0].height;
        const gap = prevY === -Infinity ? 0 : lineY - prevY;
        const isIndented = line[0].x > median * 1.5; // crude indent flag
        orderedLines.push({ text, page: pageNum, indent: isIndented, gapAbove: gap });
        prevY = lineY;
        prevHeight = lineH;
        void prevHeight;
      }
    }
  }

  // ---- 5. line → paragraph grouping --------------------------------------
  const paragraphs: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) {
      paragraphs.push(buf.join(' ').replace(/-\s+/g, '').replace(/\s+/g, ' ').trim());
      buf = [];
    }
  };
  let prevHeight = median;
  for (const ln of orderedLines) {
    const bigGap = ln.gapAbove > prevHeight * 1.6;
    if (bigGap || ln.indent) flush();
    buf.push(ln.text);
  }
  flush();

  return paragraphs.filter((p) => p.split(/\s+/).length >= 3); // drop stray short fragments
}

function looksLikeTwoColumn(xs: number[], pageWidth: number): boolean {
  if (xs.length < 30) return false;
  const left = xs.filter((x) => x < pageWidth * 0.45).length;
  const right = xs.filter((x) => x > pageWidth * 0.5).length;
  const ratio = Math.min(left, right) / Math.max(left, right);
  return ratio > 0.5 && right > xs.length * 0.2 && left > xs.length * 0.2;
}

function mode(arr: number[]): number {
  const counts = new Map<number, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = arr[0];
  let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) (best = v), (bestCount = c);
  return best;
}
