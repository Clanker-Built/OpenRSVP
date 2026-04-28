import { useEffect, useRef, useState } from 'react';
import type { Token } from '../../engine/tokenize';
import { tokenDuration, type PacingOptions } from '../../engine/pacing';

export interface PlayerState {
  index: number;
  playing: boolean;
}

export function usePlayer(
  tokens: Token[],
  pacing: PacingOptions,
  initialIndex: number,
  onPositionChange?: (i: number) => void
) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  const pacingRef = useRef(pacing);
  pacingRef.current = pacing;

  // requestAnimationFrame-based scheduler for drift-free pacing.
  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let nextTick = performance.now() + currentDuration();

    function currentDuration() {
      const t = tokens[indexRef.current];
      return t ? tokenDuration(t, pacingRef.current) : 250;
    }

    const loop = (now: number) => {
      if (now >= nextTick) {
        const ni = indexRef.current + 1;
        if (ni >= tokens.length) {
          setPlaying(false);
          return;
        }
        setIndex(ni);
        indexRef.current = ni;
        nextTick = now + currentDuration();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playing, tokens]);

  // Persist position throttled.
  useEffect(() => {
    if (!onPositionChange) return;
    const id = setTimeout(() => onPositionChange(index), 300);
    return () => clearTimeout(id);
  }, [index, onPositionChange]);

  const seekBy = (delta: number) =>
    setIndex((i) => Math.max(0, Math.min(tokens.length - 1, i + delta)));
  const seekToFraction = (f: number) =>
    setIndex(Math.max(0, Math.min(tokens.length - 1, Math.round(tokens.length * f))));

  return {
    index,
    setIndex,
    playing,
    setPlaying,
    seekBy,
    seekToFraction,
    toggle: () => setPlaying((p) => !p)
  };
}
