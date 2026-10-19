import React, { useRef, useState } from 'react';
import { Playlist, Track } from '../types';
import { fileToTrack, scanDirectoryForMp3s, saveDirectoryHandle } from '../utils/deviceScanner';
import { saveImportedTrackToDB, saveImportedTracksToDB, deleteImportedTrackFromDB, localSettings } from '../utils/storage';
import { haptics } from '../utils/haptics';
import {
  Search,
  FolderSearch,
  Heart,
  Plus,
  Trash2,
  Disc,
  Play,
  ListPlus,
  Check,
  X,
  Smartphone,
  RotateCcw,
  ArrowLeft,
  Pencil,
  CheckSquare,
  Square,
  CheckCheck,
  Shuffle,
} from 'lucide-react';

interface LibraryScreenProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrackId?: string;
  isPlaying: boolean;
  onBack?: () => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onShufflePlay?: (tracks: Track[]) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddTracks: (newTracks: Track[]) => void;
  onRemoveTrack: (trackId: string) => void;
  onRemoveMultipleTracks?: (trackIds: string[]) => void;
  onUpdateTrack?: (trackId: string, newTitle: string, newArtist: string) => void;
  onUpdatePlaylists: (pls: Playlist[]) => void;
  onRestoreSystemTracks?: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  tracks,
  playlists,
  currentTrackId,
  isPlaying,
  onBack,
  onPlayTrack,
  onShufflePlay,
  onToggleFavorite,
  onAddTracks,
  onRemoveTrack,
  onRemoveMultipleTracks,
  onUpdateTrack,
  onUpdatePlaylists,
  onRestoreSystemTracks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'imported'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // In-player track renaming state
  const [renamingTrack, setRenamingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  // Multi-selection for batch deletion state
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  // Add to playlist modal state
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Check if browser supports directory picker (must be top-level window, not restricted iframe)
  const canUseDirectoryPicker = () => {
    try {
      return (
        typeof window !== 'undefined' &&
        'showDirectoryPicker' in window &&
        window.self === window.top
      );
    } catch {
      return false;
    }
  };

  // Universal Audio Files Processor (Batch, Fast, IndexedDB Persisted)
  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    haptics.clack();
    setIsScanning(true);
    setScanMessage(`ОБРАБОТКА ${fileList.length} ФАЙЛОВ...`);

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isMp3 =
        file.name.toLowerCase().endsWith('.mp3') ||
        file.type === 'audio/mpeg' ||
        file.type === 'audio/mp3';
      if (isMp3) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setScanMessage('MP3 ФАЙЛЫ НЕ НАЙДЕНЫ');
      setIsScanning(false);
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    setScanMessage(`ЗАГРУЗКА ${validFiles.length} MP3 ТРЕКОВ...`);

    // Process files into tracks with progress indicator
    const newTracks: Track[] = [];
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const track = await fileToTrack(file);
        newTracks.push(track);
        if ((i + 1) % 4 === 0 || i === validFiles.length - 1) {
          setScanMessage(`ЗАГРУЗКА: [${newTracks.length} / ${validFiles.length}] ТРЕКОВ`);
        }
      } catch (err) {
        console.warn('Error reading audio file', err);
      }
    }

    if (newTracks.length > 0) {
      await saveImportedTracksToDB(newTracks);
      onAddTracks(newTracks);
      setScanMessage(`ПАПКА: ДОБАВЛЕНО +${newTracks.length} MP3 ТРЕКОВ!`);
      setTimeout(() => setScanMessage(null), 4000);
    } else {
      setScanMessage('ОШИБКА ЧТЕНИЯ MP3 ФАЙЛОВ');
      setTimeout(() => setScanMessage(null), 2500);
    }
    setIsScanning(false);
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Directory Scanner: Select folder with MP3 files
  const triggerFolderScan = async () => {
    haptics.clack();

    if (canUseDirectoryPicker()) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker({
          id: 'nothing_music_picker',
          mode: 'read',
        });
        await saveDirectoryHandle(dirHandle);
        setIsScanning(true);
        setScanMessage('СКАНИРОВАНИЕ MP3 В ПАПКЕ...');

        const foundTracks = await scanDirectoryForMp3s(dirHandle, (count, fileName) => {
          setScanMessage(`СКАНИРОВАНИЕ: [${count}] ${fileName}`);
        });

        if (foundTracks.length > 0) {
          onAddTracks(foundTracks);
          setScanMessage(`НАЙДЕНО И ДОБАВЛЕНО +${foundTracks.length} MP3 ТРЕКОВ!`);
        } else {
          setScanMessage('В ВЫБРАННОЙ ПАПКЕ НЕТ MP3 ФАЙЛОВ');
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker error, falling back to folder input', err);
      } finally {
        setIsScanning(false);
        setTimeout(() => setScanMessage(null), 3500);
      }
    }

    // Direct synchronous fallback: native folder input
    folderInputRef.current?.click();
  };

  // Add track to a playlist
  const handleAddToPlaylist = (playlistId: string) => {
    if (!trackToAddToPlaylist) return;
    haptics.click();
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        if (!p.trackIds.includes(trackToAddToPlaylist.id)) {
          return { ...p, trackIds: [...p.trackIds, trackToAddToPlaylist.id] };
        }
      }
      return p;
    });
    onUpdatePlaylists(updated);
    localSettings.savePlaylists(updated);
    setTrackToAddToPlaylist(null);
  };

  // Save in-player metadata renaming
  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingTrack) return;
    const title = editTitle.trim();
    const artist = editArtist.trim() || 'НЕИЗВЕСТНЫЙ ИСПОЛНИТЕЛЬ';
    if (!title) return;

    haptics.clack();
    if (onUpdateTrack) {
      onUpdateTrack(renamingTrack.id, title, artist);
    }
    setRenamingTrack(null);
  };

  // Batch delete selected tracks
  const handleConfirmBatchDelete = () => {
    if (selectedTrackIds.size === 0) return;
    haptics.clack();
    const ids = Array.from(selectedTrackIds);
    if (onRemoveMultipleTracks) {
      onRemoveMultipleTracks(ids);
    } else {
      ids.forEach((id) => onRemoveTrack(id));
    }
    setSelectedTrackIds(new Set());
    setIsSelectMode(false);
    setShowDeleteConfirmModal(false);
  };

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'favorites') return !!t.isFavorite;
    if (filterMode === 'imported') return !!t.isCustom;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-black text-white px-4 py-3 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="pb-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && !isSelectMode && (
              <button
                onClick={() => {
                  haptics.clack();
                  onBack();
                }}
                className="p-1.5 rounded-full border border-white/20 hover:border-white/60 bg-neutral-950 text-white/80 hover:text-white transition active:scale-95 flex items-center justify-center shrink-0"
                title="Назад"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="font-ndot text-sm text-white uppercase tracking-wider truncate">
                {isSelectMode ? `ВЫБРАНО: ${selectedTrackIds.size}` : 'БИБЛИОТЕКА // LIBRARY'}
              </h2>
              <p className="font-tech text-[10px] text-white/40 truncate">
                {isSelectMode ? 'ВЫБЕРИТЕ ТРЕКИ ДЛЯ УДАЛЕНИЯ' : `ВСЕГО В ПАМЯТИ: ${tracks.length} ТРЕКОВ`}
              </p>
            </div>
          </div>

          {/* Hidden HTML input: Strictly MP3 folder picking */}
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            accept=".mp3,audio/mpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Top Actions: Select Mode or Folder Scan */}
          {isSelectMode ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  haptics.tick();
                  if (selectedTrackIds.size === filteredTracks.length) {
                    setSelectedTrackIds(new Set());
                  } else {
                    setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
                  }
                }}
                className="px-2.5 py-1.5 rounded-full border border-white/20 hover:border-white text-xs font-tech text-white/90 hover:text-white flex items-center gap-1 transition"
                title={selectedTrackIds.size === filteredTracks.length ? 'Снять выбор' : 'Выбрать все'}
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#D71920]" />
                <span>{selectedTrackIds.size === filteredTracks.length ? 'СНЯТЬ' : 'ВСЕ'}</span>
              </button>

              <button
                onClick={() => {
                  haptics.clack();
                  setIsSelectMode(false);
                  setSelectedTrackIds(new Set());
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                title="Отменить режим удаления"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Batch selection button for deleting tracks */}
              <button
                onClick={() => {
                  haptics.clack();
                  setIsSelectMode(true);
                  setSelectedTrackIds(new Set());
                }}
                className="p-1.5 rounded-full border border-white/20 hover:border-white/50 text-white/60 hover:text-white flex items-center justify-center active:scale-95 transition"
                title="Отметить треки для удаления из списка"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              {/* Single direct folder scan button */}
              <button
                onClick={triggerFolderScan}
                className="px-3.5 py-1.5 rounded-full bg-white text-black font-tech font-bold text-xs hover:bg-neutral-200 flex items-center gap-1.5 shadow-md active:scale-95 transition"
                title="Выбрать папку с MP3 музыкой на устройстве"
              >
                <FolderSearch className="w-3.5 h-3.5 text-[#D71920]" />
                <span>ВЫБРАТЬ ПАПКУ</span>
              </button>
            </div>
          )}
        </div>

        {/* Live scanning message indicator */}
        {scanMessage && (
          <div className="mt-2 p-2 rounded-xl bg-neutral-900 border border-[#D71920]/60 flex items-center gap-2 font-tech text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-[#D71920] animate-ping" />
            <span className="truncate">{scanMessage}</span>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative my-2.5">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ПОИСК ТРЕКА ИЛИ ИСПОЛНИТЕЛЯ..."
          className="w-full pl-9 pr-8 py-2 bg-neutral-950 border border-white/15 rounded-2xl text-xs font-tech text-white placeholder:text-white/30 focus:outline-none focus:border-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 mb-2.5">
        <button
          onClick={() => {
            haptics.tick();
            setFilterMode('all');
          }}
          className={`flex-1 py-1 rounded-full text-xs font-tech border transition ${
            filterMode === 'all'
              ? 'border-white bg-white text-black font-bold'
              : 'border-white/10 text-white/60 hover:border-white/30'
          }`}
        >
          ВСЕ ({tracks.length})
        </button>
        <button
          onClick={() => {
            haptics.tick();
            setFilterMode('favorites');
          }}
          className={`flex-1 py-1 rounded-full text-xs font-tech border transition flex items-center justify-center gap-1 ${
            filterMode === 'favorites'
              ? 'border-white bg-white text-black font-bold'
              : 'border-white/10 text-white/60 hover:border-white/30'
          }`}
        >
          <Heart className="w-3 h-3 text-[#D71920]" /> ИЗБРАННОЕ
        </button>
        <button
          onClick={() => {
            haptics.tick();
            setFilterMode('imported');
          }}
          className={`flex-1 py-1 rounded-full text-xs font-tech border transition flex items-center justify-center gap-1 ${
            filterMode === 'imported'
              ? 'border-white bg-white text-black font-bold'
              : 'border-white/10 text-white/60 hover:border-white/30'
          }`}
        >
          <Smartphone className="w-3 h-3" /> MP3 С ТЕЛЕФОНА
        </button>
      </div>

      {/* Dedicated Shuffle Button (Random & Non-repeating) */}
      {!isSelectMode && (
        <div className="mb-2.5">
          <button
            onClick={() => {
              haptics.clack();
              if (onShufflePlay) {
                onShufflePlay(filteredTracks);
              }
            }}
            disabled={filteredTracks.length === 0}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-neutral-900 border border-white/20 hover:border-white/50 text-white font-tech text-xs flex items-center justify-between shadow-md active:scale-98 transition group disabled:opacity-40"
            title="Перемешать библиотеку и воспроизводить в случайном порядке без повторений"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#D71920] flex items-center justify-center text-white shadow-[0_0_10px_rgba(215,25,32,0.4)] group-hover:scale-105 transition-transform">
                <Shuffle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="font-nothing text-xs font-bold text-white block">ПЕРЕМЕШАТЬ ВСЕ ТРЕКИ</span>
                <span className="font-tech text-[10px] text-white/40 block">БЕЗ ПОВТОРЕНИЙ • {filteredTracks.length} ТРЕКОВ</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-tech text-white/70 uppercase">
              СЛУЧАЙНО
            </span>
          </button>
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 space-y-1.5 pb-4">
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 my-3 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Disc className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <p className="font-ndot text-xs text-white uppercase tracking-wider">
                {searchQuery ? 'ТРЕКИ НЕ НАЙДЕНЫ' : 'БИБЛИОТЕКА ПУСТА'}
              </p>
              <p className="font-tech text-[11px] text-white/40 mt-1">
                {searchQuery
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Добавьте аудиофайлы с телефона или устройства'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
              <button
                onClick={triggerFolderScan}
                className="w-full py-2.5 rounded-xl bg-white text-black font-tech font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition shadow-lg active:scale-95"
              >
                <FolderSearch className="w-4 h-4 text-[#D71920]" />
                <span>ВЫБРАТЬ ПАПКУ С MP3</span>
              </button>

              {localSettings.loadDeletedSystemTrackIds().length > 0 && onRestoreSystemTracks && (
                <button
                  onClick={() => {
                    haptics.click();
                    onRestoreSystemTracks();
                  }}
                  className="w-full py-2 rounded-xl border border-white/20 font-tech text-xs text-white/70 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D71920]" />
                  <span>ВОССТАНОВИТЬ СИСТЕМНЫЕ ТРЕКИ</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredTracks.map((track, idx) => {
            const isCurrent = track.id === currentTrackId;
            const isSelected = selectedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                onClick={() => {
                  if (isSelectMode) {
                    haptics.tick();
                    setSelectedTrackIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(track.id)) next.delete(track.id);
                      else next.add(track.id);
                      return next;
                    });
                    return;
                  }
                  haptics.click();
                  onPlayTrack(track, filteredTracks);
                }}
                className={`group cursor-pointer p-2.5 rounded-2xl border transition-all flex items-center justify-between select-none ${
                  isSelected
                    ? 'border-[#D71920] bg-[#D71920]/15 shadow-[0_0_15px_rgba(215,25,32,0.2)]'
                    : isCurrent
                    ? 'border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                    : 'border-white/5 bg-neutral-950/60 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator or Checkbox in Select Mode */}
                  <div className="w-5 flex justify-center shrink-0">
                    {isSelectMode ? (
                      isSelected ? (
                        <div className="w-4 h-4 rounded bg-[#D71920] flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-white/40 hover:border-white bg-black/40" />
                      )
                    ) : isCurrent && isPlaying ? (
                      <span className="w-2 h-2 rounded-full bg-[#D71920] animate-ping" />
                    ) : (
                      <span className="font-ndot text-xs text-white/30">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`font-nothing text-xs font-bold truncate ${
                        isSelected ? 'text-white' : isCurrent ? 'text-white' : 'text-white/90'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="font-tech text-[10px] text-white/50 truncate flex items-center gap-1.5">
                      <span>{track.artist}</span>
                      {track.isCustom && (
                        <span className="text-[9px] px-1 rounded bg-white/10 text-white/70">
                          MP3
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!isSelectMode ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-tech text-[10px] text-white/40 mr-1">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>

                    {/* Rename in player button (User Request) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.click();
                        setRenamingTrack(track);
                        setEditTitle(track.title);
                        setEditArtist(track.artist);
                      }}
                      className="p-1 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition"
                      title="Переименовать в плеере"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Add to Playlist button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.click();
                        setTrackToAddToPlaylist(track);
                      }}
                      className="p-1 rounded-full text-white/30 hover:text-white hover:bg-white/10"
                      title="Добавить в плейлист"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                    </button>

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.click();
                        onToggleFavorite(track.id);
                      }}
                      className="p-1 rounded-full text-white/40 hover:text-[#D71920]"
                      title="В избранное"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          track.isFavorite ? 'fill-[#D71920] text-[#D71920]' : 'text-white/30'
                        }`}
                      />
                    </button>

                    {/* Delete button (for all tracks, both system and imported) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.click();
                        onRemoveTrack(track.id);
                        if (track.isCustom) {
                          deleteImportedTrackFromDB(track.id);
                        } else {
                          localSettings.saveDeletedSystemTrackId(track.id);
                        }
                      }}
                      className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-white/5 transition"
                      title="Удалить трек"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="font-tech text-[10px] shrink-0">
                    {isSelected ? (
                      <span className="text-[#D71920] font-bold px-1.5 py-0.5 rounded bg-[#D71920]/20">ВЫБРАН</span>
                    ) : (
                      <span className="text-white/30">ВЫБРАТЬ</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Sticky Bottom Action Bar for Multi-Delete (User Request) */}
        {isSelectMode && (
          <div className="sticky bottom-1 inset-x-0 mt-3 p-3 bg-neutral-900/95 border border-white/20 rounded-2xl backdrop-blur-md flex items-center justify-between shadow-2xl z-20">
            <div className="font-tech text-xs text-white/80">
              Выбрано: <span className="font-bold text-white font-ndot">{selectedTrackIds.size}</span> трек(ов)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  haptics.clack();
                  setIsSelectMode(false);
                  setSelectedTrackIds(new Set());
                }}
                className="px-3 py-1.5 rounded-full border border-white/20 text-xs font-tech text-white/70 hover:text-white"
              >
                ОТМЕНА
              </button>
              <button
                disabled={selectedTrackIds.size === 0}
                onClick={() => {
                  haptics.clack();
                  setShowDeleteConfirmModal(true);
                }}
                className={`px-3.5 py-1.5 rounded-full font-tech font-bold text-xs flex items-center gap-1.5 transition ${
                  selectedTrackIds.size > 0
                    ? 'bg-[#D71920] text-white hover:bg-red-700 shadow-lg active:scale-95'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>УДАЛИТЬ ({selectedTrackIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Rename Track Modal (User Request: "функцию переименовывания песен и артистов, чтобы оно менялось только в плеере") */}
        {renamingTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <form
              onSubmit={handleSaveRename}
              className="w-full max-w-xs bg-neutral-900 border border-white/20 rounded-3xl p-5 shadow-2xl space-y-3.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#D71920]" />
                  <h3 className="font-ndot text-xs text-white uppercase tracking-wider">
                    ПЕРЕИМЕНОВАТЬ ТРЕК
                  </h3>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-tech text-white/70">
                  ТОЛЬКО В ПЛЕЕРЕ
                </span>
              </div>

              <p className="font-tech text-[11px] text-white/50 leading-tight">
                Название изменится только внутри плеера. Оригинальный файл на устройстве не перезаписывается.
              </p>

              <div className="space-y-2">
                <div>
                  <label className="block font-tech text-[10px] text-white/60 uppercase mb-1">
                    НАЗВАНИЕ ПЕСНИ
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Название..."
                    autoFocus
                    required
                    className="w-full px-3 py-2 bg-black border border-white/20 rounded-xl text-xs font-tech text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block font-tech text-[10px] text-white/60 uppercase mb-1">
                    ИСПОЛНИТЕЛЬ / АРТИСТ
                  </label>
                  <input
                    type="text"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                    placeholder="Исполнитель..."
                    className="w-full px-3 py-2 bg-black border border-white/20 rounded-xl text-xs font-tech text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingTrack(null)}
                  className="flex-1 py-2 rounded-xl border border-white/15 text-xs font-tech text-white/60 hover:bg-white/5"
                >
                  ОТМЕНА
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim()}
                  className="flex-1 py-2 rounded-xl bg-white text-black font-tech font-bold text-xs hover:bg-neutral-200 transition disabled:opacity-40"
                >
                  СОХРАНИТЬ
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Batch Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs bg-neutral-900 border border-white/20 rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-white">
                <Trash2 className="w-4 h-4 text-[#D71920]" />
                <h3 className="font-ndot text-xs uppercase tracking-wider">
                  УДАЛИТЬ ИЗ БИБЛИОТЕКИ?
                </h3>
              </div>

              <p className="font-tech text-xs text-white/80">
                Вы уверены, что хотите удалить <strong className="text-white font-bold">{selectedTrackIds.size}</strong> трек(ов) из библиотеки плеера?
              </p>

              <p className="font-tech text-[11px] text-white/50 leading-tight">
                Они будут скрыты из библиотеки и удалены из плейлистов. (Системные треки можно будет восстановить в любое время).
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 py-2 rounded-xl border border-white/15 text-xs font-tech text-white/60 hover:bg-white/5"
                >
                  ОТМЕНА
                </button>
                <button
                  onClick={handleConfirmBatchDelete}
                  className="flex-1 py-2 rounded-xl bg-[#D71920] text-white font-tech font-bold text-xs hover:bg-red-700 transition shadow-lg active:scale-95"
                >
                  УДАЛИТЬ ({selectedTrackIds.size})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restore System Tracks button if any are deleted */}
        {localSettings.loadDeletedSystemTrackIds().length > 0 && onRestoreSystemTracks && (
          <div className="pt-4 pb-2 flex justify-center">
            <button
              onClick={() => {
                haptics.click();
                onRestoreSystemTracks();
              }}
              className="px-3.5 py-1.5 rounded-full border border-white/15 bg-neutral-950 font-tech text-[10px] text-white/60 hover:text-white hover:border-white/40 transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <RotateCcw className="w-3 h-3 text-[#D71920]" />
              <span>ВОССТАНОВИТЬ СИСТЕМНЫЕ ТРЕКИ</span>
            </button>
          </div>
        )}
      </div>

      {/* Add To Playlist Modal */}
      {trackToAddToPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-neutral-900 border border-white/20 rounded-3xl p-5 shadow-2xl">
            <h3 className="font-ndot text-sm text-white uppercase tracking-wider mb-1">
              ДОБАВИТЬ В ПЛЕЙЛИСТ
            </h3>
            <p className="font-tech text-xs text-white/50 mb-4 truncate">
              {trackToAddToPlaylist.title}
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {playlists.map((pl) => {
                const alreadyIn = pl.trackIds.includes(trackToAddToPlaylist.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-black/50 hover:bg-white/10 flex items-center justify-between text-xs font-tech text-white text-left"
                  >
                    <span className="truncate">{pl.name}</span>
                    {alreadyIn ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-white/50" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setTrackToAddToPlaylist(null)}
              className="w-full py-2 rounded-xl border border-white/20 text-xs font-tech text-white/70 hover:bg-white/10"
            >
              ЗАКРЫТЬ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
