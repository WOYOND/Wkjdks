import { Track } from '../types';
import { saveImportedTrackToDB } from './storage';

const DIR_HANDLE_KEY = 'nothing_music_dir_handle';
const DB_HANDLE_STORE = 'fs_handles';

// IndexedDB helper for FileSystemDirectoryHandle (which cannot be stored in localStorage)
function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nothing_fs_handles_db', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_HANDLE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(DB_HANDLE_STORE, 'readwrite');
    tx.objectStore(DB_HANDLE_STORE).put(handle, DIR_HANDLE_KEY);
  } catch (err) {
    console.warn('Cannot persist dir handle', err);
  }
}

export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(DB_HANDLE_STORE, 'readonly');
    const req = tx.objectStore(DB_HANDLE_STORE).get(DIR_HANDLE_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Convert a File object to our Track model
export async function fileToTrack(file: File): Promise<Track> {
  let title = file.name.replace(/\.mp3$/i, '');
  let artist = 'УСТРОЙСТВО';

  // Strip leading track numbers like "01. ", "01 - ", "01_"
  const strippedNumber = title.replace(/^\d+[\s\.\-_]+/, '');
  if (strippedNumber.includes(' - ')) {
    const parts = strippedNumber.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  } else if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  } else if (strippedNumber.trim().length > 0) {
    title = strippedNumber.trim();
  }

  const audioUrl = URL.createObjectURL(file);

  // Measure audio duration via temporary Audio element
  let duration = 180;
  try {
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.src = audioUrl;
    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
            duration = Math.round(tempAudio.duration);
          }
          resolve();
        }
      };
      tempAudio.onloadedmetadata = done;
      tempAudio.onerror = done;
      setTimeout(done, 250); // 250ms fast timeout
    });
  } catch {}

  const track: Track = {
    id: `local_${file.name}_${file.size}_${file.lastModified}`,
    title,
    artist,
    album: 'DEVICE_AUDIO',
    duration,
    audioUrl,
    rawFile: file,
    isCustom: true,
  };

  return track;
}

// Scan a DirectoryHandle recursively for .mp3 / audio files
export async function scanDirectoryForMp3s(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (count: number, currentFileName: string) => void
): Promise<Track[]> {
  const foundTracks: Track[] = [];

  async function scan(handle: FileSystemDirectoryHandle) {
    // @ts-ignore
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const name = fileHandle.name.toLowerCase();
        if (name.endsWith('.mp3')) {
          try {
            const file = await fileHandle.getFile();
            const track = await fileToTrack(file);
            foundTracks.push(track);
            await saveImportedTrackToDB(track);
            if (onProgress) {
              onProgress(foundTracks.length, file.name);
            }
          } catch (e) {
            console.warn('Skipping file due to read error', e);
          }
        }
      } else if (entry.kind === 'directory') {
        try {
          await scan(entry as FileSystemDirectoryHandle);
        } catch {}
      }
    }
  }

  await scan(dirHandle);
  return foundTracks;
}
