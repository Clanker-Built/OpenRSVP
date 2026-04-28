import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import mammoth from 'mammoth';
import type { ParsedDocument } from './types';

export async function parseDocx(filePath: string): Promise<ParsedDocument> {
  const buf = await fs.readFile(filePath);
  const id = crypto.createHash('sha256').update(buf).digest('hex');
  const { value } = await mammoth.extractRawText({ buffer: buf });
  const paragraphs = value
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
  return {
    id,
    title: path.basename(filePath),
    source: filePath,
    format: 'docx',
    paragraphs
  };
}
