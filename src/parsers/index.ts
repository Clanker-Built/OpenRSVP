import * as path from 'node:path';
import { parseText } from './text';
import { parseDocx } from './docx';
import { parseDoc } from './doc';
import { parseEpub } from './epub';
import { parsePdf } from './pdf';
import { parseUrl } from './html';
import type { ParsedDocument } from './types';

export type { ParsedDocument };

export async function parseFile(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.txt':
      return parseText(filePath, false);
    case '.md':
    case '.markdown':
      return parseText(filePath, true);
    case '.docx':
      return parseDocx(filePath);
    case '.doc':
      return parseDoc(filePath);
    case '.epub':
      return parseEpub(filePath);
    case '.pdf':
      return parsePdf(filePath);
    case '.html':
    case '.htm': {
      const fs = await import('node:fs/promises');
      const html = await fs.readFile(filePath, 'utf8');
      const { parseHtmlString } = await import('./html');
      return parseHtmlString(html, filePath);
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

export async function parseUrlSource(url: string): Promise<ParsedDocument> {
  return parseUrl(url);
}
