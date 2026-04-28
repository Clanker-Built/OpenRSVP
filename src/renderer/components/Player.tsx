import { useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryEntry, Settings } from '../../main/store';
import type { ParsedDocument } from '../../parsers/types';
import { tokenizeParagraphs } from '../../engine/tokenize';
import { chunk } from '../../engine/chunker';
import { PivotWord } from './PivotWord';
import { TextPicker } from './TextPicker';
import { usePlayer } from '../hooks/usePlayer';

// Convert a word index (in the original paragraph stream) to a chunk index.
function wordIndexToChunkIndex(
  paragraphs: string[],
  chunkedTokensCount: number,
  chunkedTokens: { display: string }[],
  wordIndex: number
): number {
  let consumed = 0;
  for (let i = 0; i < chunkedTokens.length; i++) {
    if (consumed >= wordIndex) return i;
    consumed += chunkedTokens[i].display.split(/\s+/).length;
  }
  return Math.max(0, chunkedTokensCount - 1);
}

interface Props {
  doc: ParsedDocument;
  entry: LibraryEntry;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  onExit: () => void;
}

export function Player({ doc, entry, settings, updateSettings, onExit }: Props) {
  const baseTokens = useMemo(() => tokenizeParagraphs(doc.paragraphs), [doc]);
  const tokens = useMemo(() => chunk(baseTokens, settings.chunkSize), [baseTokens, settings.chunkSize]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [livePosition, setLivePosition] = useState(entry.position);

  // Map saved word-position to potentially-different chunk-index space.
  const initialChunkIndex = useMemo(
    () => wordIndexToChunkIndex(doc.paragraphs, tokens.length, tokens, livePosition),
    [tokens, doc.paragraphs, livePosition]
  );

  const positionRef = useRef(entry.position);
  const player = usePlayer(
    tokens,
    {
      wpm: settings.wpm,
      smartPacing: settings.smartPacing,
      paragraphPause: settings.paragraphPause
    },
    initialChunkIndex,
    (chunkIdx) => {
      // Translate chunk index back to word index for persistence.
      let words = 0;
      for (let i = 0; i < chunkIdx; i++) words += tokens[i].display.split(/\s+/).length;
      positionRef.current = words;
      void window.rsvp.setPosition(doc.id, words);
    }
  );

  const handlePick = (wordIndex: number) => {
    const chunkIdx = wordIndexToChunkIndex(doc.paragraphs, tokens.length, tokens, wordIndex);
    player.setPlaying(false);
    player.setIndex(chunkIdx);
    setLivePosition(wordIndex);
    void window.rsvp.setPosition(doc.id, wordIndex);
    setPickerOpen(false);
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          player.toggle();
          break;
        case 'ArrowRight':
          player.seekBy(e.shiftKey ? 25 : 1);
          break;
        case 'ArrowLeft':
          player.seekBy(e.shiftKey ? -25 : -1);
          break;
        case 'ArrowUp':
          void updateSettings({ wpm: Math.min(1200, settings.wpm + 25) });
          break;
        case 'ArrowDown':
          void updateSettings({ wpm: Math.max(80, settings.wpm - 25) });
          break;
        case 'Escape':
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, settings.wpm, updateSettings, onExit]);

  const t = tokens[player.index];
  const pct = tokens.length ? (player.index / tokens.length) * 100 : 0;

  return (
    <div className="player">
      <div className="title-strip">
        <button onClick={onExit}>← Library</button>
        <span className="title">{doc.title}</span>
        <span className="grow" />
        <button onClick={() => setPickerOpen(true)} title="Pick start position visually">📍 Pick start</button>
        <span>{Math.round(pct)}%</span>
        <span>· {player.index.toLocaleString()} / {tokens.length.toLocaleString()}</span>
      </div>
      <div className="progress-bar"><span style={{ width: `${pct}%` }} /></div>

      <div className="stage">
        {t && (
          <PivotWord
            display={t.display}
            pivotIdx={t.pivotIdx}
            fontSizePx={settings.fontSizePx}
            pivotColor={settings.pivotColor}
          />
        )}
        {/* Crosshair guides — keep eye locked on pivot column */}
        <div className="crosshair" style={{ top: '38%' }}>▼</div>
        <div className="crosshair" style={{ bottom: '38%' }}>▲</div>
      </div>

      <div className="controls">
        <button className="primary" onClick={player.toggle}>
          {player.playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => player.seekBy(-25)} title="Back 25 (Shift+←)">«</button>
        <button onClick={() => player.seekBy(-1)} title="Back 1 (←)">‹</button>
        <button onClick={() => player.seekBy(1)} title="Forward 1 (→)">›</button>
        <button onClick={() => player.seekBy(25)} title="Forward 25 (Shift+→)">»</button>

        <label>
          WPM
          <input
            type="range"
            min={80}
            max={1200}
            step={10}
            value={settings.wpm}
            onChange={(e) => updateSettings({ wpm: Number(e.target.value) })}
          />
          <span className="wpm-display">{settings.wpm}</span>
        </label>

        <label>
          Chunk
          <select
            value={settings.chunkSize}
            onChange={(e) => updateSettings({ chunkSize: Number(e.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>

        <label>
          Size
          <input
            type="range"
            min={28}
            max={120}
            step={2}
            value={settings.fontSizePx}
            onChange={(e) => updateSettings({ fontSizePx: Number(e.target.value) })}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.smartPacing}
            onChange={(e) => updateSettings({ smartPacing: e.target.checked })}
          />
          Smart pacing
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.paragraphPause}
            onChange={(e) => updateSettings({ paragraphPause: e.target.checked })}
          />
          ¶ pause
        </label>

        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          space play/pause · ←→ step · ⇧←→ jump · ↑↓ wpm · esc exit
        </span>
      </div>

      {pickerOpen && (
        <TextPicker
          title={doc.title}
          paragraphs={doc.paragraphs}
          currentWordIndex={positionRef.current}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
