import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import MarkdownIt from 'markdown-it';
import type { ParsedDocument } from './types';

const md = new MarkdownIt();

export async function parseText(filePath: string, isMarkdown: boolean): Promise<ParsedDocument> {
  const buf = await fs.readFile(filePath);
  const id = crypto.createHash('sha256').update(buf).digest('hex');
  let text = buf.toString('utf8');
  if (isMarkdown) {
    // Render to HTML then strip tags — quick way to drop code fences, links syntax, etc.
    const html = md.render(text);
    text = html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ');
  }
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return {
    id,
    title: path.basename(filePath),
    source: filePath,
    format: isMarkdown ? 'markdown' : 'text',
    paragraphs
  };
}
