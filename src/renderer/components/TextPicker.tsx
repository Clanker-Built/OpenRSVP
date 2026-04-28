import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Props {
  title: string;
  paragraphs: string[];
  currentWordIndex: number;
  onPick: (wordIndex: number) => void;
  onClose: () => void;
}

// Pick a starting word visually. We render each paragraph as one plain-text
// <p> (one DOM node per paragraph, not per word) so even 100k-word books stay
// responsive. Click resolution uses caretPositionFromPoint to map a click to a
// character offset, then walks word boundaries.
export function TextPicker({ title, paragraphs, currentWordIndex, onPick, onClose }: Props) {
  // Precompute word-count prefix sum so we can map (paraIdx, wordInPara) → globalIndex.
  const paraWordOffsets = useMemo(() => {
    const offs = new Array<number>(paragraphs.length);
    let total = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      offs[i] = total;
      total += paragraphs[i].split(/\s+/).filter(Boolean).length;
    }
    return offs;
  }, [paragraphs]);

  // Find which paragraph contains currentWordIndex (so we can scroll to it
  // and display a highlight marker).
  const currentPara = useMemo(() => {
    if (paraWordOffsets.length === 0) return 0;
    let lo = 0;
    let hi = paraWordOffsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (paraWordOffsets[mid] <= currentWordIndex) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }, [paraWordOffsets, currentWordIndex]);

  const wordInCurrentPara = currentWordIndex - (paraWordOffsets[currentPara] ?? 0);

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const currentParaRef = useRef<HTMLParagraphElement | null>(null);

  // Virtualized rendering: only mount paragraphs in/near the viewport.
  // Simple windowed approach — keep a scroll-position-based slice.
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const ESTIMATED_PARA_HEIGHT = 60; // rough; serif paragraph at 16px/1.7
  const OVERSCAN = 10;

  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    setContainerHeight(bodyRef.current.clientHeight);
  }, []);

  const totalEstimatedHeight = paragraphs.length * ESTIMATED_PARA_HEIGHT;
  const firstVisible = Math.max(0, Math.floor(scrollTop / ESTIMATED_PARA_HEIGHT) - OVERSCAN);
  const lastVisible = Math.min(
    paragraphs.length,
    Math.ceil((scrollTop + containerHeight) / ESTIMATED_PARA_HEIGHT) + OVERSCAN
  );
  const topPad = firstVisible * ESTIMATED_PARA_HEIGHT;
  const bottomPad = Math.max(0, totalEstimatedHeight - lastVisible * ESTIMATED_PARA_HEIGHT);

  // Jump to current position once mounted.
  const didJumpRef = useRef(false);
  useLayoutEffect(() => {
    if (didJumpRef.current || !bodyRef.current) return;
    if (paragraphs.length === 0) return;
    const target = Math.max(0, currentPara * ESTIMATED_PARA_HEIGHT - containerHeight / 3);
    bodyRef.current.scrollTop = target;
    setScrollTop(target);
    didJumpRef.current = true;
  }, [currentPara, containerHeight, paragraphs.length]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Click → resolve to global word index using caretPositionFromPoint.
  const handleClick = (paraIdx: number) => (e: React.MouseEvent<HTMLParagraphElement>) => {
    const text = paragraphs[paraIdx];
    if (!text) return;

    type CaretPosFn = (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    const docAny = document as Document & {
      caretPositionFromPoint?: CaretPosFn;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };

    let charOffset = -1;
    if (typeof docAny.caretPositionFromPoint === 'function') {
      const pos = docAny.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) charOffset = pos.offset;
    } else if (typeof docAny.caretRangeFromPoint === 'function') {
      const range = docAny.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) charOffset = range.startOffset;
    }

    let wordInPara = 0;
    if (charOffset >= 0 && charOffset <= text.length) {
      // Count whitespace runs strictly before the caret position.
      let inWord = false;
      let words = 0;
      for (let i = 0; i < charOffset && i < text.length; i++) {
        const isSpace = /\s/.test(text[i]);
        if (!isSpace && !inWord) {
          if (i > 0) words++;
          inWord = true;
        } else if (isSpace) {
          inWord = false;
        }
      }
      wordInPara = words;
    }

    const globalIdx = (paraWordOffsets[paraIdx] ?? 0) + wordInPara;
    onPick(globalIdx);
  };

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-title">{title}</div>
            <div className="picker-hint">
              Click anywhere in the text to start reading from that word. Esc to cancel.
            </div>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div
          className="picker-body"
          ref={bodyRef}
          onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        >
          <div style={{ height: topPad }} />
          {paragraphs.slice(firstVisible, lastVisible).map((para, i) => {
            const pi = firstVisible + i;
            const isCurrent = pi === currentPara;
            return (
              <p
                key={pi}
                ref={isCurrent ? currentParaRef : undefined}
                className={`picker-para${isCurrent ? ' current' : ''}`}
                onClick={handleClick(pi)}
                data-current-word={isCurrent ? wordInCurrentPara : undefined}
              >
                {para}
              </p>
            );
          })}
          <div style={{ height: bottomPad }} />
        </div>
      </div>
    </div>
  );
}
