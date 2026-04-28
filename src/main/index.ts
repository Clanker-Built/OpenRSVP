import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { parseFile, parseUrlSource, type ParsedDocument } from '../parsers';
import { store, type LibraryEntry } from './store';

const DEV = process.env.NODE_ENV === 'development';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#0b0b0d',
    title: 'OpenRSVP',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.setMenuBarVisibility(false);

  if (DEV) {
    await win.loadURL('http://localhost:5173');
  } else {
    await win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------- IPC ----------

async function cacheDir(): Promise<string> {
  const dir = path.join(app.getPath('userData'), 'cache');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function ingestParsed(doc: ParsedDocument): Promise<LibraryEntry> {
  const dir = await cacheDir();
  const file = path.join(dir, `${doc.id}.json`);
  await fs.writeFile(file, JSON.stringify(doc), 'utf8');

  const tokenCount = doc.paragraphs.reduce((s, p) => s + p.split(/\s+/).filter(Boolean).length, 0);

  const existing = store.getLibrary().find((e) => e.id === doc.id);
  const entry: LibraryEntry = {
    id: doc.id,
    title: doc.title,
    source: doc.source,
    format: doc.format,
    tokenCount,
    position: existing?.position ?? 0,
    lastOpened: new Date().toISOString()
  };
  store.upsertLibrary(entry);
  return entry;
}

ipcMain.handle('library:list', () => store.getLibrary());

ipcMain.handle('library:remove', (_e, id: string) => {
  store.removeLibrary(id);
  return store.getLibrary();
});

ipcMain.handle('library:loadDoc', async (_e, id: string): Promise<ParsedDocument> => {
  const file = path.join(await cacheDir(), `${id}.json`);
  const data = await fs.readFile(file, 'utf8');
  return JSON.parse(data) as ParsedDocument;
});

ipcMain.handle('library:setPosition', (_e, id: string, position: number) => {
  store.setPosition(id, position);
});

ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:set', (_e, patch: Record<string, unknown>) => store.patchSettings(patch));

ipcMain.handle('ingest:file', async (_e, filePath: string) => {
  const doc = await parseFile(filePath);
  return ingestParsed(doc);
});

ipcMain.handle('ingest:url', async (_e, url: string) => {
  const doc = await parseUrlSource(url);
  return ingestParsed(doc);
});

ipcMain.handle('dialog:openFile', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Open document',
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'markdown', 'doc', 'docx', 'epub', 'html', 'htm'] }
    ]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return r.filePaths[0];
});
