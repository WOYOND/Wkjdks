import { AppSettings, DEFAULT_APP_SETTINGS, EqualizerPreset, Playlist, Track } from '../types';

export const DEFAULT_TRACKS: Track[] = [
  {
    id: 'demo-1',
    title: 'GLYPH_PULSE // 01',
    artist: 'NOTHING OS',
    album: 'SYSTEM_AUDIO',
    duration: 64,
    audioUrl: 'synth:demo-1',
    coverArt: 'glyph-1',
    isFavorite: true,
  },
  {
    id: 'demo-2',
    title: 'MONOCHROME DREAMS',
    artist: 'CARL PEI & TE',
    album: 'DESIGN_STUDIO',
    duration: 70,
    audioUrl: 'synth:demo-2',
    coverArt: 'glyph-2',
    isFavorite: false,
  },
  {
    id: 'demo-3',
    title: 'NEON DOT MATRIX',
    artist: 'CYBERSPACE',
    album: 'HARDWARE_TAPE',
    duration: 52,
    audioUrl: 'synth:demo-3',
    coverArt: 'glyph-3',
    isFavorite: true,
  },
  {
    id: 'demo-4',
    title: 'TRANSPARENT NIGHT',
    artist: 'PHONIC LAB',
    album: 'EAR (OPEN)',
    duration: 72,
    audioUrl: 'synth:demo-4',
    coverArt: 'glyph-4',
    isFavorite: false,
  },
];

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-favorites',
    name: 'ИЗБРАННОЕ [ • ]',
    trackIds: ['demo-1', 'demo-3'],
    createdAt: Date.now() - 100000,
  },
  {
    id: 'pl-essentials',
    name: 'NOTHING ESSENTIALS',
    trackIds: ['demo-1', 'demo-2', 'demo-3', 'demo-4'],
    createdAt: Date.now() - 80000,
  },
  {
    id: 'pl-night',
    name: 'NIGHT // ТРАНСПАРЕНТ',
    trackIds: ['demo-2', 'demo-4'],
    createdAt: Date.now() - 50000,
  },
];

export const DEFAULT_EQ_PRESETS: EqualizerPreset[] = [
  { id: 'flat', name: 'FLAT // ПЛОСКИЙ', bands: [0, 0, 0, 0, 0], isCustom: false },
  { id: 'nothing_pure', name: 'NOTHING PURE // ФИРМЕННЫЙ', bands: [4, 2, -1, 3, 5], isCustom: false },
  { id: 'bass_boost', name: 'BASS BOOST // МОЩНЫЙ БАС', bands: [8, 5, 1, 0, -1], isCustom: false },
  { id: 'electronic', name: 'ELECTRONIC // ЭЛЕКТРОНИКА', bands: [6, 3, -1, 3, 6], isCustom: false },
  { id: 'vocal', name: 'VOCAL // ЧЕТКИЙ ВОКАЛ', bands: [-2, 1, 5, 4, 1], isCustom: false },
  { id: 'rock', name: 'ROCK // ДРАЙВ', bands: [5, 3, -2, 4, 6], isCustom: false },
  { id: 'acoustic', name: 'ACOUSTIC // АКУСТИКА', bands: [3, 2, 2, 3, 4], isCustom: false },
];

const DB_NAME = 'nothing_audio_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'imported_tracks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveImportedTrackToDB(track: Track): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.put(track);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to store track to IndexedDB', err);
  }
}

export async function saveImportedTracksToDB(tracks: Track[]): Promise<void> {
  if (tracks.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    tracks.forEach((track) => {
      try {
        store.put(track);
      } catch (e) {
        console.warn('Failed to put track in IndexedDB', e);
      }
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to store batch tracks to IndexedDB', err);
  }
}

export async function loadImportedTracksFromDB(): Promise<Track[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const tracks: Track[] = request.result || [];
        const overrides = localSettings.loadTrackOverrides();
        // Re-create object URLs for blobs and apply user renaming overrides
        const restored = tracks.map((t) => {
          const ov = overrides[t.id];
          return {
            ...t,
            title: ov?.title ?? t.title,
            artist: ov?.artist ?? t.artist,
            audioUrl: t.rawFile ? URL.createObjectURL(t.rawFile) : t.audioUrl,
          };
        });
        resolve(restored);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteImportedTrackFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.delete(id);
  } catch {}
}

export async function deleteImportedTracksFromDB(ids: string[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    ids.forEach((id) => store.delete(id));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export const localSettings = {
  loadPlaylists: (): Playlist[] => {
    try {
      const saved = localStorage.getItem('nothing_playlists');
      return saved ? JSON.parse(saved) : DEFAULT_PLAYLISTS;
    } catch {
      return DEFAULT_PLAYLISTS;
    }
  },
  savePlaylists: (pls: Playlist[]) => {
    try {
      localStorage.setItem('nothing_playlists', JSON.stringify(pls));
    } catch {}
  },
  loadEqPresets: (): EqualizerPreset[] => {
    try {
      const saved = localStorage.getItem('nothing_eq_presets');
      return saved ? JSON.parse(saved) : DEFAULT_EQ_PRESETS;
    } catch {
      return DEFAULT_EQ_PRESETS;
    }
  },
  saveEqPresets: (presets: EqualizerPreset[]) => {
    try {
      localStorage.setItem('nothing_eq_presets', JSON.stringify(presets));
    } catch {}
  },
  loadActivePresetId: (): string => {
    return localStorage.getItem('nothing_active_eq_preset') || 'nothing_pure';
  },
  saveActivePresetId: (id: string) => {
    localStorage.setItem('nothing_active_eq_preset', id);
  },
  loadVolume: (): number => {
    const v = localStorage.getItem('nothing_volume');
    return v !== null ? parseFloat(v) : 0.85;
  },
  saveVolume: (v: number) => {
    localStorage.setItem('nothing_volume', v.toString());
  },
  loadDeletedSystemTrackIds: (): string[] => {
    try {
      const saved = localStorage.getItem('nothing_deleted_system_tracks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },
  saveDeletedSystemTrackId: (id: string) => {
    try {
      const list = localSettings.loadDeletedSystemTrackIds();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('nothing_deleted_system_tracks', JSON.stringify(list));
      }
    } catch {}
  },
  saveDeletedSystemTrackIds: (ids: string[]) => {
    try {
      const list = localSettings.loadDeletedSystemTrackIds();
      const set = new Set(list);
      ids.forEach((id) => set.add(id));
      localStorage.setItem('nothing_deleted_system_tracks', JSON.stringify(Array.from(set)));
    } catch {}
  },
  restoreDefaultTracks: () => {
    try {
      localStorage.removeItem('nothing_deleted_system_tracks');
    } catch {}
  },
  // In-player track metadata overrides (title / artist renaming)
  loadTrackOverrides: (): Record<string, { title?: string; artist?: string }> => {
    try {
      const saved = localStorage.getItem('nothing_track_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  },
  saveTrackOverride: (trackId: string, override: { title?: string; artist?: string }) => {
    try {
      const all = localSettings.loadTrackOverrides();
      all[trackId] = { ...(all[trackId] || {}), ...override };
      localStorage.setItem('nothing_track_overrides', JSON.stringify(all));
    } catch {}
  },
  // Persistent lyrics cache for tracks (both synced and plain lyrics)
  loadCachedLyrics: (trackId: string): any | null => {
    try {
      const saved = localStorage.getItem(`nothing_lyrics_${trackId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },
  saveCachedLyrics: (trackId: string, data: any) => {
    try {
      localStorage.setItem(`nothing_lyrics_${trackId}`, JSON.stringify(data));
    } catch {}
  },
  removeCachedLyrics: (trackId: string) => {
    try {
      localStorage.removeItem(`nothing_lyrics_${trackId}`);
    } catch {}
  },
  loadAppSettings: (): AppSettings => {
    try {
      const saved = localStorage.getItem('nothing_app_settings');
      return saved ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) } : DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  },
  saveAppSettings: (settings: AppSettings) => {
    try {
      localStorage.setItem('nothing_app_settings', JSON.stringify(settings));
    } catch {}
  },
};

export function getActiveDefaultTracks(): Track[] {
  const deletedIds = new Set(localSettings.loadDeletedSystemTrackIds());
  const overrides = localSettings.loadTrackOverrides();
  return DEFAULT_TRACKS
    .filter((t) => !deletedIds.has(t.id))
    .map((t) => {
      const ov = overrides[t.id];
      if (ov) {
        return {
          ...t,
          title: ov.title ?? t.title,
          artist: ov.artist ?? t.artist,
        };
      }
      return t;
    });
}
