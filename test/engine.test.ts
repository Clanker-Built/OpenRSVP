import { describe, it, expect } from 'vitest';
import { pivotIndex } from '../src/engine/orp';
import { tokenizeParagraphs } from '../src/engine/tokenize';
import { tokenDuration } from '../src/engine/pacing';
import { chunk } from '../src/engine/chunker';

describe('ORP', () => {
  it('places pivot per Spritz table', () => {
    expect(pivotIndex('a')).toBe(0);
    expect(pivotIndex('to')).toBe(1);
    expect(pivotIndex('hello')).toBe(1);
    expect(pivotIndex('reading')).toBe(2);
    expect(pivotIndex('comprehension')).toBe(3);
    expect(pivotIndex('antidisestablishmentarianism')).toBe(4);
  });
});

describe('tokenize', () => {
  it('flags sentence/clause/paragraph endings', () => {
    const t = tokenizeParagraphs(['Hello, world. Cool!']);
    expect(t[0].endsClause).toBe(true);   // Hello,
    expect(t[1].endsSentence).toBe(true); // world.
    expect(t[2].endsSentence).toBe(true); // Cool!
    expect(t[t.length - 1].endsParagraph).toBe(true);
  });
  it('handles multiple paragraphs', () => {
    const t = tokenizeParagraphs(['First para.', 'Second one.']);
    const paraEnds = t.filter((x) => x.endsParagraph);
    expect(paraEnds.length).toBe(2);
  });
});

describe('pacing', () => {
  const base = (wpm: number) => 60000 / wpm;
  it('returns base when smartPacing is off', () => {
    const t = tokenizeParagraphs(['Hello.'])[0];
    expect(tokenDuration(t, { wpm: 300, smartPacing: false, paragraphPause: false })).toBeCloseTo(base(300));
  });
  it('lengthens on sentence end', () => {
    const t = tokenizeParagraphs(['Hello.'])[0];
    const d = tokenDuration(t, { wpm: 300, smartPacing: true, paragraphPause: false });
    expect(d).toBeGreaterThan(base(300) * 1.5);
  });
  it('caps at 3x base', () => {
    const t = tokenizeParagraphs(['Antidisestablishmentarianism.'])[0];
    const d = tokenDuration(t, { wpm: 300, smartPacing: true, paragraphPause: true });
    expect(d).toBeLessThanOrEqual(base(300) * 3 + 0.001);
  });
});

describe('chunker', () => {
  it('passes through size=1', () => {
    const t = tokenizeParagraphs(['one two three']);
    expect(chunk(t, 1)).toEqual(t);
  });
  it('groups into 2 but does not span sentence boundary', () => {
    const t = tokenizeParagraphs(['Hello world. Goodbye now.']);
    const c = chunk(t, 2);
    // First chunk would naively be "Hello world." — fine because period is at chunk end.
    // But "world. Goodbye" must NOT happen.
    for (const ch of c) {
      const words = ch.display.split(/\s+/);
      const innerHasSentenceEnd = words.slice(0, -1).some((w) => /[.!?]$/.test(w));
      expect(innerHasSentenceEnd).toBe(false);
    }
  });
});
