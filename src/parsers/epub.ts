import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EPub = require('epub2').EPub;
import { parseHtmlString } from './html';
import type { ParsedDocument } from './types';

export async function parseEpub(filePath: string): Promise<ParsedDocument> {
  const buf = await fs.readFile(filePath);
  const id = crypto.createHash('sha256').update(buf).digest('hex');

  const epub = await EPub.createAsync(filePath);
  const paragraphs: string[] = [];
  const title: string = epub.metadata?.title || path.basename(filePath);

  for (const chapter of epub.flow as Array<{ id: string }>) {
    const html: string = await new Promise((resolve, reject) =>
      epub.getChapter(chapter.id, (err: Error | null, text: string) =>
        err ? reject(err) : resolve(text)
      )
    );
    try {
      const doc = parseHtmlString(`<html><body>${html}</body></html>`, filePath);
      paragraphs.push(...doc.paragraphs);
    } catch {
      /* skip unparseable chapter */
    }
  }

  return {
    id,
    title,
    source: filePath,
    format: 'epub',
    paragraphs
  };
}
