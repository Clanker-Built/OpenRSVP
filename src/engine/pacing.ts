import type { Token } from './tokenize';

export interface PacingOptions {
  wpm: number;
  smartPacing: boolean;
  paragraphPause: boolean;
}

// Returns ms to display this token before advancing.
export function tokenDuration(t: Token, opts: PacingOptions): number {
  const base = 60000 / Math.max(60, Math.min(1500, opts.wpm));
  if (!opts.smartPacing) return base;

  let mult = 1;
  if (t.isLong) mult *= 1.4;
  if (t.isNumeric) mult *= 1.3;
  if (t.endsClause) mult *= 1.7;
  if (t.endsSentence) mult *= 2.4;
  if (opts.paragraphPause && t.endsParagraph) mult *= 1.4;

  // Hard cap so we never freeze on a hyper-long word.
  return Math.min(base * 3, base * mult);
}
