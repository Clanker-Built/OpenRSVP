import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WordExtractor = require('word-extractor');
import type { ParsedDocument } from './types';

export async function parseDoc(filePath: string): Promise<ParsedDocument> {
  const buf = await fs.readFile(filePath);
  const id = crypto.createHash('sha256').update(buf).digest('hex');
  const extractor = new WordExtractor();
  const doc = await extractor.extract(filePath);
  const body: string = doc.getBody();
  const paragraphs = body
    .split(/\r?\n+/)
    .map((p: string) => p.replace(/\s+/g, ' ').trim())
    .filter((p: string) => p.length > 0);
  return {
    id,
    title: path.basename(filePath),
    source: filePath,
    format: 'doc',
    paragraphs
  };
}
