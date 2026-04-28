// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store');

export interface Settings {
  wpm: number;
  chunkSize: 1 | 2 | 3;
  smartPacing: boolean;
  paragraphPause: boolean;
  pivotColor: string;
  fontSizePx: number;
  theme: 'dark' | 'light';
}

export interface LibraryEntry {
  id: string;
  title: string;
  source: string;
  format: string;
  tokenCount: number;
  position: number;
  lastOpened: string;
}

interface Schema {
  settings: Settings;
  library: LibraryEntry[];
}

const defaults: Schema = {
  settings: {
    wpm: 350,
    chunkSize: 1,
    smartPacing: true,
    paragraphPause: true,
    pivotColor: '#ef4444',
    fontSizePx: 64,
    theme: 'dark'
  },
  library: []
};

const s = new Store({ defaults });

export const store = {
  getSettings(): Settings {
    return s.get('settings');
  },
  patchSettings(patch: Partial<Settings>): Settings {
    const next = { ...s.get('settings'), ...patch };
    s.set('settings', next);
    return next;
  },
  getLibrary(): LibraryEntry[] {
    return s.get('library');
  },
  upsertLibrary(entry: LibraryEntry) {
    const list = s.get('library') as LibraryEntry[];
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...entry };
    else list.unshift(entry);
    s.set('library', list);
  },
  setPosition(id: string, position: number) {
    const list = s.get('library') as LibraryEntry[];
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) {
      list[idx].position = position;
      list[idx].lastOpened = new Date().toISOString();
      s.set('library', list);
    }
  },
  removeLibrary(id: string) {
    const list = (s.get('library') as LibraryEntry[]).filter((e) => e.id !== id);
    s.set('library', list);
  }
};
