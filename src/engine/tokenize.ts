import { pivotIndex } from './orp';

export interface Token {
  text: string;          // word with trailing/leading punctuation kept attached visually
  display: string;       // the raw unit shown to the user (== text by default)
  pivotIdx: number;      // ORP within display
  endsClause: boolean;   // , ; :  — slight pause
  endsSentence: boolean; // . ! ? — strong pause
  endsParagraph: boolean;
  isLong: boolean;       // > 8 visible chars
  isNumeric: boolean;
}

const CLAUSE_END = /[,;:—–]$/;
const SENTENCE_END = /[.!?…]+["')\]]?$/;
const NUMERIC = /^[\d.,/$%-]+$/;

// Split a paragraph into whitespace-separated tokens, then annotate.
export function tokenizeParagraph(text: string, isLast = false): Token[] {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  const tokens: Token[] = [];
  raw.forEach((word, i) => {
    const isParaEnd = isLast && i === raw.length - 1;
    const isSentEnd = SENTENCE_END.test(word);
    const isClauseEnd = !isSentEnd && CLAUSE_END.test(word);
    // For pivot calc, ignore trailing punctuation so the pivot sits in the word body.
    const core = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || word;
    tokens.push({
      text: core,
      display: word,
      pivotIdx: Math.min(pivotIndex(core), Math.max(0, [...word].length - 1)),
      endsClause: isClauseEnd,
      endsSentence: isSentEnd,
      endsParagraph: isParaEnd,
      isLong: [...core].length > 8,
      isNumeric: NUMERIC.test(core)
    });
  });
  return tokens;
}

export function tokenizeParagraphs(paragraphs: string[]): Token[] {
  const out: Token[] = [];
  paragraphs.forEach((p, i) => {
    const toks = tokenizeParagraph(p, true /* mark last token of paragraph */);
    if (toks.length) toks[toks.length - 1].endsParagraph = true;
    out.push(...toks);
    void i;
  });
  return out;
}
