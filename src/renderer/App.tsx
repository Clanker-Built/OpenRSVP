import { useEffect, useState } from 'react';
import type { LibraryEntry, Settings } from '../main/store';
import type { ParsedDocument } from '../parsers/types';
import { Library } from './components/Library';
import { Player } from './components/Player';

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [openDoc, setOpenDoc] = useState<{ doc: ParsedDocument; entry: LibraryEntry } | null>(null);

  useEffect(() => {
    void window.rsvp.getSettings().then(setSettings);
    void window.rsvp.listLibrary().then(setLibrary);
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.theme;
  }, [settings?.theme]);

  if (!settings) return <div style={{ padding: 24 }}>Loading…</div>;

  const updateSettings = async (patch: Partial<Settings>) => {
    const next = await window.rsvp.patchSettings(patch);
    setSettings(next);
  };

  const openEntry = async (entry: LibraryEntry) => {
    const doc = await window.rsvp.loadDoc(entry.id);
    setOpenDoc({ doc, entry });
  };

  const closePlayer = async () => {
    setOpenDoc(null);
    setLibrary(await window.rsvp.listLibrary());
  };

  return (
    <div className="app">
      {!openDoc && (
        <Library
          settings={settings}
          updateSettings={updateSettings}
          library={library}
          setLibrary={setLibrary}
          onOpen={openEntry}
        />
      )}
      {openDoc && (
        <Player
          doc={openDoc.doc}
          entry={openDoc.entry}
          settings={settings}
          updateSettings={updateSettings}
          onExit={closePlayer}
        />
      )}
    </div>
  );
}
