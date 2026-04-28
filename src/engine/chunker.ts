import { pivotIndex } from './orp';
import type { Token } from './tokenize';

// Group N consecutive tokens into a single display unit.
// Never spans sentence/paragraph boundaries.
export function chunk(tokens: Token[], size: 1 | 2 | 3): Token[] {
  if (size === 1) return tokens;
  const out: Token[] = [];
  let i = 0;
  while (i < tokens.length) {
    const group: Token[] = [tokens[i]];
    while (
      group.length < size &&
      i + group.length < tokens.length &&
      !group[group.length - 1].endsSentence &&
      !group[group.length - 1].endsParagraph
    ) {
      group.push(tokens[i + group.length]);
    }
    const display = group.map((t) => t.display).join(' ');
    // Pivot the chunk based on its visual midpoint (use the first word's pivot).
    const firstCore = group[0].text;
    const merged: Token = {
      text: group.map((t) => t.text).join(' '),
      display,
      pivotIdx: pivotIndex(firstCore),
      endsClause: group.some((t) => t.endsClause),
      endsSentence: group[group.length - 1].endsSentence,
      endsParagraph: group[group.length - 1].endsParagraph,
      isLong: display.length > 12,
      isNumeric: group.every((t) => t.isNumeric)
    };
    out.push(merged);
    i += group.length;
  }
  return out;
}
