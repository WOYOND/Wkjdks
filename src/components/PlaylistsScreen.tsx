import React, { useState } from 'react';
import { Playlist, Track } from '../types';
import { localSettings } from '../utils/storage';
import { haptics } from '../utils/haptics';
import { Plus, Play, Shuffle, Trash2, Music2, FolderHeart, Disc, ArrowLeft } from 'lucide-react';

interface PlaylistsScreenProps {
  playlists: Playlist[];
  allTracks: Track[];
  onBack?: () => void;
  onUpdatePlaylists: (pls: Playlist[]) => void;
  onPlayTrack: (track: Track, fromQueue?: Track[]) => void;
  onShufflePlaylist: (tracks: Track[]) => void;
}

export const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({
  playlists,
  allTracks,
  onBack,
  onUpdatePlaylists,
  onPlayTrack,
  onShufflePlaylist,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const playlistTracks = selectedPlaylist
    ? selectedPlaylist.trackIds
        .map((id) => allTracks.find((t) => t.id === id))
        .filter((t): t is Track => t !== undefined)
    : [];

  const handleCreate = () => {
    if (!newPlaylistName.trim()) return;
    haptics.clack();
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      name: newPlaylistName.trim().toUpperCase(),
      trackIds: [],
      createdAt: Date.now(),
    };
    const updated = [...playlists, newPl];
    onUpdatePlaylists(updated);
    localSettings.savePlaylists(updated);
    setNewPlaylistName('');
    setShowCreateModal(false);
    setSelectedPlaylistId(newPl.id);
  };

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.click();
    const updated = playlists.filter((p) => p.id !== id);
    onUpdatePlaylists(updated);
    localSettings.savePlaylists(updated);
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
  };

  const handleRemoveTrackFromPlaylist = (trackId: string) => {
    if (!selectedPlaylist) return;
    haptics.click();
    const updatedTrackIds = selectedPlaylist.trackIds.filter((id) => id !== trackId);
    const updated = playlists.map((p) => (p.id === selectedPlaylist.id ? { ...p, trackIds: updatedTrackIds } : p));
    onUpdatePlaylists(updated);
    localSettings.savePlaylists(updated);
  };

  const formatTotalTime = (tracks: Track[]) => {
    const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins} МИН ${secs} СЕК`;
  };

  return (
    <div className="flex flex-col h-full bg-black text-white px-4 py-3 overflow-y-auto select-none">
      {selectedPlaylist ? (
        // Playlist Details View
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              onClick={() => {
                haptics.click();
                setSelectedPlaylistId(null);
              }}
              className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-ndot text-sm text-white uppercase tracking-wider truncate max-w-[200px]">
              {selectedPlaylist.name}
            </h3>
            <div className="w-8" />
          </div>

          {/* Playlist Hero Info Card */}
          <div className="p-4 rounded-3xl bg-neutral-900/80 border border-white/15 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black border border-white/20 flex items-center justify-center relative">
              <Disc className="w-8 h-8 text-[#D71920]" />
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D71920]" />
            </div>
            <div>
              <div className="font-ndot text-[10px] text-white/50 uppercase">ПЛЕЙЛИСТ</div>
              <h2 className="font-nothing font-bold text-base text-white">{selectedPlaylist.name}</h2>
              <p className="font-tech text-xs text-white/60">
                {playlistTracks.length} ТРЕКОВ // {formatTotalTime(playlistTracks)}
              </p>
            </div>
          </div>

          {/* Play All & Shuffle Buttons */}
          <div className="flex gap-2">
            <button
              disabled={playlistTracks.length === 0}
              onClick={() => {
                haptics.clack();
                if (playlistTracks.length > 0) onPlayTrack(playlistTracks[0], playlistTracks);
              }}
              className="flex-1 py-2.5 rounded-full bg-white text-black font-tech font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 disabled:opacity-30"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> СЛУШАТЬ ВСЕ
            </button>
            <button
              disabled={playlistTracks.length === 0}
              onClick={() => {
                haptics.clack();
                if (playlistTracks.length > 0) onShufflePlaylist(playlistTracks);
              }}
              className="px-4 py-2.5 rounded-full border border-white/20 text-white font-tech text-xs flex items-center gap-2 hover:bg-white/10 disabled:opacity-30"
            >
              <Shuffle className="w-3.5 h-3.5" /> ВПЕРЕМЕШКУ
            </button>
          </div>

          {/* Track List */}
          <div className="space-y-1.5 pt-2">
            {playlistTracks.length === 0 ? (
              <div className="text-center py-10 text-white/40 font-tech text-xs">
                В этом плейлисте пока нет треков.<br />
                Добавьте музыку из раздела «Библиотека».
              </div>
            ) : (
              playlistTracks.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => {
                    haptics.click();
                    onPlayTrack(track, playlistTracks);
                  }}
                  className="group cursor-pointer p-2.5 rounded-2xl bg-neutral-950/60 border border-white/5 hover:border-white/20 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-ndot text-xs text-white/30 w-4 text-center">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="font-nothing text-xs font-bold text-white truncate">{track.title}</p>
                      <p className="font-tech text-[10px] text-white/50 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-tech text-[10px] text-white/40">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTrackFromPlaylist(track.id);
                      }}
                      className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-white/5"
                      title="Убрать из плейлиста"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // All Playlists Grid
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={() => {
                    haptics.clack();
                    onBack();
                  }}
                  className="p-1.5 rounded-full border border-white/20 hover:border-white/60 bg-neutral-950 text-white/80 hover:text-white transition active:scale-95 flex items-center justify-center"
                  title="Назад"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <div>
                <h2 className="font-ndot text-sm text-white uppercase tracking-wider">
                  ПЛЕЙЛИСТЫ // PLAYLISTS
                </h2>
                <p className="font-tech text-[10px] text-white/40">КОЛЛЕКЦИИ И ИЗБРАННОЕ</p>
              </div>
            </div>
            <button
              onClick={() => {
                haptics.click();
                setShowCreateModal(true);
              }}
              className="px-3 py-1.5 rounded-full border border-white/20 text-white font-tech text-xs hover:bg-white/10 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#D71920]" /> СОЗДАТЬ
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {playlists.map((pl) => {
              const count = pl.trackIds.length;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    haptics.click();
                    setSelectedPlaylistId(pl.id);
                  }}
                  className="cursor-pointer group relative p-3.5 rounded-3xl bg-neutral-900/80 border border-white/15 hover:border-white/40 transition flex flex-col justify-between aspect-square"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-2xl bg-black border border-white/20 flex items-center justify-center">
                      {pl.id === 'pl-favorites' ? (
                        <FolderHeart className="w-4 h-4 text-[#D71920]" />
                      ) : (
                        <Music2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    {pl.id !== 'pl-favorites' && pl.id !== 'pl-essentials' && (
                      <button
                        onClick={(e) => handleDeletePlaylist(pl.id, e)}
                        className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-white/5"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="font-nothing text-xs font-bold text-white group-hover:text-white line-clamp-2">
                      {pl.name}
                    </h4>
                    <p className="font-tech text-[10px] text-white/50 mt-0.5">
                      {count} ТРЕКОВ
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-neutral-900 border border-white/20 rounded-3xl p-5 shadow-2xl">
            <h3 className="font-ndot text-sm text-white uppercase tracking-wider mb-2">
              НОВЫЙ ПЛЕЙЛИСТ
            </h3>
            <p className="font-tech text-xs text-white/50 mb-3">
              Введите название плейлиста:
            </p>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="НАПРИМЕР: NIGHT RUN"
              className="w-full px-3 py-2 bg-black border border-white/30 rounded-xl text-xs font-tech text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-tech text-white/70 hover:bg-white/10"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleCreate}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-1.5 rounded-lg bg-white text-black font-bold text-xs font-tech disabled:opacity-30 hover:bg-neutral-200"
              >
                СОЗДАТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
