import { contextBridge, ipcRenderer } from 'electron';
import type { ParsedDocument } from '../parsers/types';
import type { Settings, LibraryEntry } from '../main/store';

const api = {
  listLibrary: (): Promise<LibraryEntry[]> => ipcRenderer.invoke('library:list'),
  removeLibrary: (id: string): Promise<LibraryEntry[]> => ipcRenderer.invoke('library:remove', id),
  loadDoc: (id: string): Promise<ParsedDocument> => ipcRenderer.invoke('library:loadDoc', id),
  setPosition: (id: string, position: number): Promise<void> =>
    ipcRenderer.invoke('library:setPosition', id, position),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  patchSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:set', patch),
  ingestFile: (filePath: string): Promise<LibraryEntry> => ipcRenderer.invoke('ingest:file', filePath),
  ingestUrl: (url: string): Promise<LibraryEntry> => ipcRenderer.invoke('ingest:url', url),
  pickFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile')
};

contextBridge.exposeInMainWorld('rsvp', api);

export type RsvpApi = typeof api;
