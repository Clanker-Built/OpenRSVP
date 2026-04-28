// Optimal Recognition Point — pivot index inside a word.
// Spritz-style table: pivot sits slightly left of center, capped for long words.
export function pivotIndex(word: string): number {
  const len = [...word].length; // be unicode-safe for CJK / accents
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}
