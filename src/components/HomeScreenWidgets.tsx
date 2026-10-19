import React, { useState } from 'react';
import { Track } from '../types';
import { usePWAInstall } from '../utils/usePWAInstall';
import { haptics } from '../utils/haptics';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Download,
  Smartphone,
  CheckCircle,
  Disc3,
  ArrowLeft,
} from 'lucide-react';

interface HomeScreenWidgetsProps {
  currentTrack: Track;
  isPlaying: boolean;
  onBack?: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onOpenPlayer: () => void;
  onOpenEqualizer?: () => void;
}

export const HomeScreenWidgets: React.FC<HomeScreenWidgetsProps> = ({
  currentTrack,
  isPlaying,
  onBack,
  onTogglePlay,
  onNext,
  onPrev,
  onOpenPlayer,
  onOpenEqualizer,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [selectedWidgetStyle, setSelectedWidgetStyle] = useState<'cassette' | 'disc' | 'pill'>('cassette');

  const handleInstallClick = async () => {
    haptics.clack();
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white px-4 py-2 overflow-y-auto select-none">
      {/* Top Header with Back button */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
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
              NOTHING OS // ВИДЖЕТЫ
            </h2>
            <p className="font-tech text-[10px] text-white/40">ГЛАВНЫЙ ЭКРАН И ПРИЛОЖЕНИЕ</p>
          </div>
        </div>
      </div>

      {/* Top Banner / Install Action */}
      <div className="p-3 mb-3 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-white/15 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#D71920] flex items-center justify-center text-white">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-ndot text-xs text-white uppercase tracking-wider">
              ПРИЛОЖЕНИЕ И ВИДЖЕТЫ
            </h3>
            <p className="font-tech text-[10px] text-white/50">
              {isInstalled ? 'УСТАНОВЛЕНО НА ГЛАВНЫЙ ЭКРАН' : 'БЫСТРЫЙ ДОСТУП К ПЛЕЕРУ'}
            </p>
          </div>
        </div>

        {(isInstallable || isInstalled) && (
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-full bg-white text-black font-tech font-bold text-xs hover:bg-neutral-200 transition flex items-center gap-1 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
          >
            {isInstalled ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-600" /> ДОБАВЛЕНО
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> УСТАНОВИТЬ
              </>
            )}
          </button>
        )}
      </div>

      {/* Widget Style Switcher */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="font-ndot text-[10px] text-white/50 uppercase tracking-widest">
          СТИЛЬ ВИДЖЕТА
        </span>
        <div className="flex gap-1 bg-neutral-900 p-0.5 rounded-full border border-white/10">
          <button
            onClick={() => {
              haptics.tick();
              setSelectedWidgetStyle('cassette');
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-tech whitespace-nowrap transition ${
              selectedWidgetStyle === 'cassette' ? 'bg-white text-black font-bold' : 'text-white/60'
            }`}
          >
            КАССЕТА 4x2
          </button>
          <button
            onClick={() => {
              haptics.tick();
              setSelectedWidgetStyle('disc');
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-tech whitespace-nowrap transition ${
              selectedWidgetStyle === 'disc' ? 'bg-white text-black font-bold' : 'text-white/60'
            }`}
          >
            ВИНИЛ 2x2
          </button>
          <button
            onClick={() => {
              haptics.tick();
              setSelectedWidgetStyle('pill');
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-tech whitespace-nowrap transition ${
              selectedWidgetStyle === 'pill' ? 'bg-white text-black font-bold' : 'text-white/60'
            }`}
          >
            ПИЛЮЛЯ 2x1
          </button>
        </div>
      </div>

      {/* SIMULATED NOTHING OS HOME SCREEN DESKTOP */}
      <div className="relative rounded-3xl p-4 bg-[#0a0a0a] border border-white/10 shadow-2xl space-y-4">
        {/* Subtle Nothing dot grid pattern */}
        <div className="absolute inset-0 bg-dot-matrix opacity-20 pointer-events-none rounded-3xl" />

        {/* THE INTERACTIVE MUSIC WIDGET */}
        {selectedWidgetStyle === 'cassette' && (
          <div className="relative rounded-3xl bg-neutral-900/90 border border-white/20 p-4 shadow-xl backdrop-blur-md overflow-hidden">
            {/* Red recording accent dot */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <span className="font-ndot text-[8px] text-white/40 uppercase">TAPE // 01</span>
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#D71920] animate-pulse' : 'bg-[#D71920]/40'}`} />
            </div>

            {/* Tape spools & info */}
            <div className="flex items-center gap-3 mb-3">
              {/* Spinning spools visual */}
              <div className="relative w-14 h-14 rounded-2xl bg-black border border-white/20 flex items-center justify-center">
                <div
                  className={`w-10 h-10 rounded-full border-2 border-dashed border-white/80 flex items-center justify-center ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '4s' }}
                >
                  <div className="w-3 h-3 rounded-full bg-[#D71920]" />
                </div>
              </div>

              <div className="flex-1 min-w-0" onClick={onOpenPlayer}>
                <div className="font-ndot text-[10px] text-white/40 uppercase tracking-wider">
                  СЕЙЧАС ИГРАЕТ
                </div>
                <h4 className="font-nothing text-sm font-bold text-white truncate">
                  {currentTrack.title}
                </h4>
                <p className="font-tech text-xs text-white/60 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Interactive Widget Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={onOpenPlayer}
                className="font-ndot text-[10px] text-white/60 hover:text-white uppercase tracking-wider flex items-center gap-1"
              >
                ОТКРЫТЬ ПЛЕЕР →
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    haptics.click();
                    onPrev();
                  }}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/10 active:scale-95"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    haptics.clack();
                    onTogglePlay();
                  }}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold hover:bg-neutral-200 active:scale-95 shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    haptics.click();
                    onNext();
                  }}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/10 active:scale-95"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedWidgetStyle === 'disc' && (
          <div className="grid grid-cols-2 gap-3">
            {/* 2x2 Spinning Vinyl Widget */}
            <div
              onClick={() => {
                haptics.clack();
                onTogglePlay();
              }}
              className="relative cursor-pointer aspect-square rounded-3xl bg-neutral-900/90 border border-white/20 p-3 flex flex-col items-center justify-center shadow-xl group hover:border-white/40"
            >
              <div
                className={`relative w-24 h-24 rounded-full bg-neutral-950 border-4 border-neutral-800 flex items-center justify-center shadow-2xl ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              >
                {/* Grooves */}
                <div className="absolute inset-2 rounded-full border border-white/10" />
                <div className="absolute inset-4 rounded-full border border-dashed border-white/20" />
                {/* Center red sticker */}
                <div className="w-8 h-8 rounded-full bg-[#D71920] flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                </div>
              </div>

              <div className="absolute bottom-2 text-center w-full px-2">
                <span className="font-ndot text-[9px] text-white/70 uppercase truncate block">
                  {isPlaying ? '▶ ВОСПРОИЗВЕДЕНИЕ' : '❚❚ ПАУЗА'}
                </span>
              </div>
            </div>

            {/* Track info card next to it */}
            <div
              onClick={onOpenPlayer}
              className="cursor-pointer aspect-square rounded-3xl bg-neutral-900/80 border border-white/20 p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="w-2 h-2 rounded-full bg-[#D71920]" />
                <span className="font-ndot text-[8px] text-white/40">NOTHING OS</span>
              </div>
              <div>
                <h5 className="font-nothing text-sm font-bold text-white line-clamp-2">
                  {currentTrack.title}
                </h5>
                <p className="font-tech text-xs text-white/50 truncate">
                  {currentTrack.artist}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.click();
                    onNext();
                  }}
                  className="font-tech text-[11px] text-white/70 hover:text-white flex items-center gap-1"
                >
                  СЛЕДУЮЩИЙ <SkipForward className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedWidgetStyle === 'pill' && (
          <div className="rounded-full bg-neutral-900 border border-white/20 p-2 px-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={onOpenPlayer}>
              <div className="w-7 h-7 rounded-full bg-[#D71920] flex items-center justify-center">
                <Disc3 className={`w-4 h-4 text-white ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <p className="font-nothing text-xs font-bold text-white truncate max-w-[130px]">
                  {currentTrack.title}
                </p>
                <p className="font-tech text-[10px] text-white/50 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  haptics.clack();
                  onTogglePlay();
                }}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold hover:bg-neutral-200"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
