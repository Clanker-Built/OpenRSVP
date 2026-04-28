import * as crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { ParsedDocument } from './types';

export async function parseUrl(url: string): Promise<ParsedDocument> {
  const res = await fetch(url, {
    headers: {
      // Pretend to be a real browser so paywalled-light sites cooperate.
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return parseHtmlString(html, url);
}

export function parseHtmlString(html: string, source: string): ParsedDocument {
  const id = crypto.createHash('sha256').update(source).digest('hex');
  const dom = new JSDOM(html, { url: source });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (!article) {
    throw new Error('Could not extract main article content from page.');
  }
  // article.textContent already strips nav/sidebars/ads. Split into paragraphs
  // by re-walking the parsed content DOM for cleaner paragraph boundaries.
  const articleDom = new JSDOM(article.content);
  const ps: string[] = [];
  articleDom.window.document
    .querySelectorAll('p, h1, h2, h3, h4, li, blockquote')
    .forEach((el) => {
      const t = el.textContent?.replace(/\s+/g, ' ').trim();
      if (t && t.length > 0) ps.push(t);
    });
  return {
    id,
    title: article.title || source,
    source,
    format: 'html',
    paragraphs: ps.length ? ps : article.textContent.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  };
}
