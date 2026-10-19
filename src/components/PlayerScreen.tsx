import React, { useState } from 'react';
import { PlayerCenterMode, RepeatMode, Track } from '../types';
import { Visualizer } from './Visualizer';
import { LyricsView } from './LyricsView';
import { haptics } from '../utils/haptics';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Moon,
  ListMusic,
  Disc,
  Activity,
  FileText,
  Pencil,
  Clock,
  Settings,
} from 'lucide-react';

interface PlayerScreenProps {
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  sleepTimerRemaining: number | null;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateTrack?: (trackId: string, newTitle: string, newArtist: string) => void;
  onOpenEqualizer: () => void;
  onOpenSleepTimer: () => void;
  onOpenSettings?: () => void;
  defaultCenterMode?: PlayerCenterMode;
  onSelectFromQueue: (track: Track) => void;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  queue,
  sleepTimerRemaining,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onUpdateTrack,
  onOpenEqualizer,
  onOpenSleepTimer,
  onOpenSettings,
  defaultCenterMode,
  onSelectFromQueue,
}) => {
  const [centerMode, setCenterMode] = useState<PlayerCenterMode>(defaultCenterMode || 'disc');
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);

  // In-player track renaming state
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArtist, setEditArtist] = useState<string>('');

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Total queue duration calculation (for user request)
  const totalQueueSeconds = queue.reduce((acc, t) => acc + (t.duration || 0), 0);
  const formatTotalQueueDuration = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = Math.floor(totalSecs % 60);
    if (hours > 0) {
      return `${hours} ч ${minutes} мин`;
    }
    return `${minutes} мин ${seconds.toString().padStart(2, '0')} сек`;
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = editTitle.trim();
    const artist = editArtist.trim() || 'НЕИЗВЕСТНЫЙ ИСПОЛНИТЕЛЬ';
    if (!title || !onUpdateTrack) return;

    haptics.clack();
    onUpdateTrack(currentTrack.id, title, artist);
    setShowRenameModal(false);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const currentTrackIndex = queue.findIndex((t) => t.id === currentTrack.id);
  const trackCounterText =
    currentTrackIndex !== -1
      ? `${(currentTrackIndex + 1).toString().padStart(2, '0')} / ${queue.length.toString().padStart(2, '0')}`
      : '01 / 01';

  return (
    <div className="flex flex-col h-full bg-black text-white px-4 py-2 select-none relative overflow-hidden">
      {/* Top Bar Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 min-w-[32px]">
          <span className="font-ndot text-[10px] text-white/40 tracking-wider">NOTHING (R)</span>
        </div>

        {/* Center Mode Switcher (Vinyl / Visualizer / Lyrics) */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-full border border-white/10">
          <button
            onClick={() => {
              haptics.tick();
              setCenterMode('disc');
            }}
            className={`p-1.5 rounded-full transition ${
              centerMode === 'disc' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            }`}
            title="Диск"
          >
            <Disc className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              haptics.tick();
              setCenterMode('visualizer');
            }}
            className={`p-1.5 rounded-full transition ${
              centerMode === 'visualizer' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            }`}
            title="Спектр эквалайзера"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              haptics.tick();
              setCenterMode('lyrics');
            }}
            className={`p-1.5 rounded-full transition ${
              centerMode === 'lyrics' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            }`}
            title="Текст песни"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Tools (Sleep Timer & Settings) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              haptics.click();
              onOpenSleepTimer();
            }}
            className={`p-1.5 rounded-full border transition relative ${
              sleepTimerRemaining !== null
                ? 'border-[#D71920] text-[#D71920] bg-neutral-950'
                : 'border-white/20 text-white/60 hover:text-white'
            }`}
            title="Таймер сна"
          >
            <Moon className="w-3.5 h-3.5" />
            {sleepTimerRemaining !== null && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#D71920]" />
            )}
          </button>

          {onOpenSettings && (
            <button
              onClick={() => {
                haptics.click();
                onOpenSettings();
              }}
              className="p-1.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition active:scale-95"
              title="Настройки плеера и стиля"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Area */}
      <div className="flex-1 min-h-[220px] max-h-[340px] my-2 flex items-center justify-center relative">
        {centerMode === 'disc' && (
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            {/* Ambient subtle back ring */}
            <div className="absolute w-56 h-56 rounded-full border border-white/5 border-dashed pointer-events-none" />

            {/* Industrial Turntable Vinyl Record */}
            <div
              onClick={() => {
                haptics.clack();
                onTogglePlay();
              }}
              className="relative cursor-pointer group flex items-center justify-center active:scale-95 transition-transform"
            >
              {/* Outer acrylic chassis */}
              <div className="w-52 h-52 rounded-full bg-[#0d0d0d] border border-white/20 p-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center">
                {/* Rotating Vinyl Disc */}
                <div
                  className={`w-48 h-48 rounded-full bg-[#111] border-2 border-neutral-800 flex items-center justify-center relative shadow-inner ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '8s' }}
                >
                  {/* Micro concentric vinyl grooves */}
                  <div className="absolute inset-2 rounded-full border border-white/5" />
                  <div className="absolute inset-5 rounded-full border border-white/10" />
                  <div className="absolute inset-8 rounded-full border border-dashed border-white/15" />
                  <div className="absolute inset-12 rounded-full border border-white/10" />

                  {/* Center Nothing Label */}
                  <div className="w-16 h-16 rounded-full bg-black border-2 border-white/30 flex flex-col items-center justify-center relative shadow-lg">
                    <span className="font-ndot text-[7px] text-white/60 tracking-widest uppercase">
                      NOTHING
                    </span>
                    <div className="w-3 h-3 rounded-full bg-[#D71920] my-0.5" />
                    <span className="font-tech text-[6px] text-white/40">33 RPM</span>
                  </div>
                </div>
              </div>

              {/* Tonearm head simulation */}
              <div
                className={`absolute top-2 right-4 w-12 h-1 bg-white/40 origin-top-right transition-transform duration-700 pointer-events-none ${
                  isPlaying ? 'rotate-12' : '-rotate-12 opacity-30'
                }`}
              >
                <div className="w-2.5 h-2 bg-[#D71920] -ml-1 -mt-0.5 rounded-sm" />
              </div>
            </div>

            {/* Micro label below disc */}
            <div className="mt-3 flex items-center gap-2">
              <span className="font-ndot text-[10px] text-white/40 tracking-wider">
                {trackCounterText}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="font-tech text-[10px] text-white/40 uppercase">
                {currentTrack.album || 'NOTHING AUDIO'}
              </span>
            </div>
          </div>
        )}

        {centerMode === 'visualizer' && (
          <div className="w-full h-full flex flex-col justify-center">
            <Visualizer isPlaying={isPlaying} className="h-full" />
          </div>
        )}

        {centerMode === 'lyrics' && (
          <div className="w-full h-full">
            <LyricsView
              track={currentTrack}
              currentTime={currentTime}
              onSeek={onSeek}
              onRenameTrack={onUpdateTrack}
            />
          </div>
        )}
      </div>

      {/* Track Info (Title, Artist, Heart, Queue) */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-1.5 group">
            <h2 className="font-nothing text-lg font-bold text-white truncate tracking-tight">
              {currentTrack.title}
            </h2>
            {onUpdateTrack && currentTrack.id !== 'empty' && (
              <button
                onClick={() => {
                  haptics.click();
                  setEditTitle(currentTrack.title);
                  setEditArtist(currentTrack.artist);
                  setShowRenameModal(true);
                }}
                className="p-1 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition shrink-0"
                title="Переименовать трек в плеере"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="font-tech text-xs text-white/60 truncate mt-0.5">
            {currentTrack.artist}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Favorite Heart */}
          <button
            onClick={() => {
              haptics.click();
              onToggleFavorite(currentTrack.id);
            }}
            className="p-2 rounded-full border border-white/10 hover:border-white/30 text-white/40 hover:text-white transition"
          >
            <Heart
              className={`w-4 h-4 ${
                currentTrack.isFavorite ? 'fill-[#D71920] text-[#D71920]' : 'text-white/40'
              }`}
            />
          </button>

          {/* Queue Drawer Button */}
          <button
            onClick={() => {
              haptics.click();
              setShowQueueDrawer(!showQueueDrawer);
            }}
            className={`p-2 rounded-full border transition ${
              showQueueDrawer
                ? 'border-white bg-white text-black'
                : 'border-white/10 hover:border-white/30 text-white/60 hover:text-white'
            }`}
            title="Очередь воспроизведения"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dotted Progress Bar & Timers */}
      <div className="space-y-1 my-2">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newPct = Math.max(0, Math.min(1, clickX / rect.width));
            haptics.tick();
            onSeek(newPct * duration);
          }}
          className="relative h-6 flex items-center cursor-pointer group"
        >
          {/* Background track */}
          <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden border border-white/10">
            {/* Progress filled bar */}
            <div
              className="h-full bg-white relative transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Dotted line texture */}
              <div className="absolute inset-0 bg-dot-matrix-dense opacity-40" />
            </div>
          </div>

          {/* Scrubber Thumb Indicator with Nothing Red center */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D71920]" />
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex justify-between items-center text-[10px] font-ndot text-white/50 tracking-wider">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      {/* Main Playback Controls Bar */}
      <div className="flex items-center justify-between py-2 px-1">
        {/* Shuffle Button */}
        <button
          onClick={() => {
            haptics.click();
            onToggleShuffle();
          }}
          className={`p-2 rounded-full border transition relative ${
            isShuffle
              ? 'border-white text-white bg-white/10'
              : 'border-white/10 text-white/40 hover:text-white'
          }`}
          title="Случайный порядок"
        >
          <Shuffle className="w-4 h-4" />
          {isShuffle && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#D71920]" />
          )}
        </button>

        {/* Skip Previous */}
        <button
          onClick={() => {
            haptics.click();
            onPrev();
          }}
          className="p-3 rounded-full text-white/80 hover:text-white active:scale-95 transition"
          title="Предыдущий трек"
        >
          <SkipBack className="w-6 h-6 fill-white" />
        </button>

        {/* GIANT CENTRAL PLAY / PAUSE BUTTON */}
        <button
          onClick={() => {
            haptics.clack();
            onTogglePlay();
          }}
          className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)]"
          title={isPlaying ? 'Пауза' : 'Воспроизведение'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-black text-black" />
          ) : (
            <Play className="w-7 h-7 fill-black text-black ml-1" />
          )}
        </button>

        {/* Skip Next */}
        <button
          onClick={() => {
            haptics.click();
            onNext();
          }}
          className="p-3 rounded-full text-white/80 hover:text-white active:scale-95 transition"
          title="Следующий трек"
        >
          <SkipForward className="w-6 h-6 fill-white" />
        </button>

        {/* Repeat Mode Button */}
        <button
          onClick={() => {
            haptics.click();
            onCycleRepeat();
          }}
          className={`p-2 rounded-full border transition relative ${
            repeatMode !== 'off'
              ? 'border-white text-white bg-white/10'
              : 'border-white/10 text-white/40 hover:text-white'
          }`}
          title="Режим повтора"
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-4 h-4 text-[#D71920]" />
          ) : (
            <Repeat className="w-4 h-4" />
          )}
          {repeatMode !== 'off' && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#D71920]" />
          )}
        </button>
      </div>

      {/* Queue Drawer Overlay */}
      {showQueueDrawer && (
        <div className="absolute inset-x-0 bottom-0 top-12 z-30 bg-black/95 backdrop-blur-xl border-t border-white/20 p-4 flex flex-col rounded-t-3xl shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-[#D71920]" />
                <span>ОЧЕРЕДЬ ВОСПРОИЗВЕДЕНИЯ</span>
              </h3>
              <div className="flex items-center gap-2 mt-1 font-tech text-[10px] text-white/50">
                <span>{queue.length} ТРЕКОВ</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-white/90">
                  <Clock className="w-3 h-3 text-[#D71920]" />
                  <span>ОБЩЕЕ ВРЕМЯ: {formatTotalQueueDuration(totalQueueSeconds)}</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowQueueDrawer(false)}
              className="text-xs font-tech px-2.5 py-1 rounded-full border border-white/20 hover:bg-white/10"
            >
              ЗАКРЫТЬ
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 py-3">
            {queue.map((track, idx) => {
              const isCurr = track.id === currentTrack.id;
              return (
                <div
                  key={track.id}
                  onClick={() => {
                    haptics.click();
                    onSelectFromQueue(track);
                    setShowQueueDrawer(false);
                  }}
                  className={`p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer border transition ${
                    isCurr
                      ? 'border-white bg-white/10 text-white font-bold'
                      : 'border-transparent hover:bg-white/5 text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-ndot text-[10px] text-white/30 w-4">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="font-nothing text-xs truncate">{track.title}</p>
                      <p className="font-tech text-[10px] text-white/40 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-tech text-[10px] text-white/30">
                      {formatTime(track.duration)}
                    </span>
                    {isCurr && <span className="w-1.5 h-1.5 rounded-full bg-[#D71920] shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Queue Total Duration Footer */}
          <div className="pt-2.5 mt-auto border-t border-white/10 flex items-center justify-between font-tech text-[11px] text-white/60">
            <span>В ОЧЕРЕДИ: <strong className="text-white">{queue.length}</strong> ТРЕК(ОВ)</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D71920]" />
              <span>ОБЩАЯ ДЛИТЕЛЬНОСТЬ:</span>
              <strong className="text-white font-mono">{formatTotalQueueDuration(totalQueueSeconds)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* In-Player Rename Track Modal */}
      {showRenameModal && (
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
                  placeholder="Введите название..."
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
                onClick={() => setShowRenameModal(false)}
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
    </div>
  );
};
