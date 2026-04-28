import { useState } from 'react';
import type { LibraryEntry, Settings } from '../../main/store';

interface Props {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  library: LibraryEntry[];
  setLibrary: (l: LibraryEntry[]) => void;
  onOpen: (entry: LibraryEntry) => void;
}

export function Library({ settings, updateSettings, library, setLibrary, onOpen }: Props) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ingest = async (fn: () => Promise<LibraryEntry>, label: string) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      setLibrary(await window.rsvp.listLibrary());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) {
      const filePath = (f as unknown as { path?: string }).path;
      if (!filePath) continue;
      await ingest(() => window.rsvp.ingestFile(filePath), `Reading ${f.name}…`);
    }
  };

  const onPick = async () => {
    const filePath = await window.rsvp.pickFile();
    if (filePath) await ingest(() => window.rsvp.ingestFile(filePath), 'Reading file…');
  };

  const onUrl = async () => {
    if (!url.trim()) return;
    await ingest(() => window.rsvp.ingestUrl(url.trim()), 'Fetching article…');
    setUrl('');
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLibrary(await window.rsvp.removeLibrary(id));
  };

  return (
    <>
      <div className="topbar">
        <div className="brand">OpenRSVP</div>
        <div className="grow" />
        <label>
          <input
            type="checkbox"
            checked={settings.smartPacing}
            onChange={(e) => updateSettings({ smartPacing: e.target.checked })}
          />
          Smart pacing
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
        <button onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
          {settings.theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      <div className="content">
        <div
          className={`dropzone ${over ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <div style={{ fontSize: 16, marginBottom: 6 }}>
            {busy ?? 'Drag & drop a document here'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            PDF · TXT · MD · DOC · DOCX · EPUB · HTML
          </div>
          <div style={{ marginTop: 14 }}>
            <button onClick={onPick} disabled={!!busy}>Choose file…</button>
          </div>
          <div className="url-row">
            <input
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onUrl();
              }}
            />
            <button className="primary" onClick={onUrl} disabled={!!busy || !url.trim()}>
              Add URL
            </button>
          </div>
          {error && (
            <div style={{ color: 'var(--accent)', marginTop: 12, fontSize: 13 }}>{error}</div>
          )}
        </div>

        {library.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            No documents yet — drop one above to begin.
          </div>
        ) : (
          <div className="library">
            {library.map((e) => {
              const pct = e.tokenCount ? Math.min(100, Math.round((e.position / e.tokenCount) * 100)) : 0;
              return (
                <div key={e.id} className="libcard" onClick={() => onOpen(e)}>
                  <button className="remove" title="Remove" onClick={(ev) => remove(e.id, ev)}>×</button>
                  <h3>{e.title}</h3>
                  <div className="meta">
                    {e.format.toUpperCase()} · {e.tokenCount.toLocaleString()} words · {pct}% read
                  </div>
                  <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
