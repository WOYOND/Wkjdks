import React, { useState, useEffect } from 'react';
import { MainTab, Track, AppSettings } from '../types';
import { haptics } from '../utils/haptics';
import {
  Disc,
  ListMusic,
  FolderHeart,
  LayoutGrid,
  Sliders,
  Settings,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Smartphone,
} from 'lucide-react';

interface PhoneFrameProps {
  currentTab: MainTab;
  currentTrack: Track;
  isPlaying: boolean;
  settings?: AppSettings;
  onTabChange: (tab: MainTab) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  currentTab,
  currentTrack,
  isPlaying,
  settings,
  onTabChange,
  onTogglePlay,
  onNext,
  onPrev,
  children,
}) => {
  const [forceMobileFrame, setForceMobileFrame] = useState<boolean>(true);
  const [isRealMobile, setIsRealMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsRealMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showMiniPlayer = currentTab !== 'player';

  return (
    <div className={`w-full h-screen ${settings?.theme === 'white' ? 'bg-[#e2e2e2]' : 'bg-[#050505]'} flex flex-col items-center justify-center overflow-hidden p-0 sm:p-2 select-none`}>
      {/* Desktop Helper Bar: Only shown on larger screens to let user toggle Phone frame */}
      {!isRealMobile && (
        <div className="mb-2 hidden sm:flex items-center gap-3 font-tech text-xs text-white/50 bg-neutral-950 px-3 py-1 rounded-full border border-white/10">
          <div className="flex items-center gap-1.5 text-white/80">
            <Smartphone className="w-3.5 h-3.5 text-[#D71920]" />
            <span className="font-ndot text-[11px] text-white">NOTHING PHONE (2)</span>
          </div>
          <span className="text-white/20">|</span>
          <button
            onClick={() => {
              haptics.tick();
              setForceMobileFrame(!forceMobileFrame);
            }}
            className="hover:text-white flex items-center gap-1 transition"
          >
            {forceMobileFrame ? (
              <>
                <Maximize2 className="w-3 h-3" /> Развернуть на весь экран
              </>
            ) : (
              <>
                <Minimize2 className="w-3 h-3" /> В рамку телефона
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Container: On mobile edge-to-edge, on desktop styled as Nothing Phone */}
      <div
        className={`relative flex flex-col bg-black overflow-hidden transition-all duration-300 theme-${settings?.theme || 'black'} font-scale-${settings?.fontSize || 'medium'} accent-${settings?.accentColor || 'red'} ${
          isRealMobile || !forceMobileFrame
            ? 'w-full h-full max-w-none rounded-none border-none'
            : 'w-[390px] h-[844px] max-h-[96vh] rounded-[48px] border-[6px] border-neutral-800 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_0_2px_rgba(255,255,255,0.15)] ring-1 ring-white/10'
        }`}
      >
        {/* Viewport Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-black pt-2 sm:pt-3">
          {children}
        </div>

        {/* Mini Player Bar (shown when browsing Library / Playlists / Widgets) */}
        {showMiniPlayer && (
          <div
            onClick={() => {
              haptics.click();
              onTabChange('player');
            }}
            className="cursor-pointer mx-3 mb-1.5 p-2 rounded-2xl bg-neutral-900/95 border border-white/15 backdrop-blur-md flex items-center justify-between shadow-xl active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Disc with rotation */}
              <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0">
                <Disc className={`w-5 h-5 text-[#D71920] ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-nothing text-xs font-bold text-white truncate">
                  {currentTrack.title}
                </p>
                <p className="font-tech text-[10px] text-white/50 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.click();
                  onPrev();
                }}
                className="p-1 rounded-full text-white/60 hover:text-white active:scale-95 transition"
                title="Предыдущий трек"
              >
                <SkipBack className="w-3.5 h-3.5 fill-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.clack();
                  onTogglePlay();
                }}
                className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold active:scale-95 transition"
                title={isPlaying ? "Пауза" : "Воспроизведение"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.click();
                  onNext();
                }}
                className="p-1 rounded-full text-white/60 hover:text-white active:scale-95 transition"
                title="Следующий трек"
              >
                <SkipForward className="w-3.5 h-3.5 fill-white" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <div className="h-14 px-3 flex items-center justify-around bg-neutral-950/90 border-t border-white/10 backdrop-blur-lg z-30 select-none pb-safe">
          {/* Player Tab */}
          <button
            onClick={() => {
              haptics.click();
              onTabChange('player');
            }}
            className={`flex flex-col items-center gap-1 p-1 transition ${
              currentTab === 'player' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span className="font-ndot text-[8px] uppercase tracking-wider">ПЛЕЕР</span>
            {currentTab === 'player' && <span className="w-1 h-1 rounded-full bg-[#D71920]" />}
          </button>

          {/* Library Tab */}
          <button
            onClick={() => {
              haptics.click();
              onTabChange('library');
            }}
            className={`flex flex-col items-center gap-1 p-1 transition ${
              currentTab === 'library' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span className="font-ndot text-[8px] uppercase tracking-wider">БИБЛИОТЕКА</span>
            {currentTab === 'library' && <span className="w-1 h-1 rounded-full bg-[#D71920]" />}
          </button>

          {/* Playlists Tab */}
          <button
            onClick={() => {
              haptics.click();
              onTabChange('playlists');
            }}
            className={`flex flex-col items-center gap-1 p-1 transition ${
              currentTab === 'playlists' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <FolderHeart className="w-4 h-4" />
            <span className="font-ndot text-[8px] uppercase tracking-wider">ПЛЕЙЛИСТЫ</span>
            {currentTab === 'playlists' && <span className="w-1 h-1 rounded-full bg-[#D71920]" />}
          </button>

          {/* Widgets Tab (Requested feature) */}
          <button
            onClick={() => {
              haptics.click();
              onTabChange('widgets');
            }}
            className={`flex flex-col items-center gap-1 p-1 transition ${
              currentTab === 'widgets' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="font-ndot text-[8px] uppercase tracking-wider">ВИДЖЕТЫ</span>
            {currentTab === 'widgets' && <span className="w-1 h-1 rounded-full bg-[#D71920]" />}
          </button>

          {/* Equalizer Tab */}
          <button
            onClick={() => {
              haptics.click();
              onTabChange('equalizer');
            }}
            className={`flex flex-col items-center gap-1 p-1 transition ${
              currentTab === 'equalizer' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="font-ndot text-[8px] uppercase tracking-wider">EQ</span>
            {currentTab === 'equalizer' && <span className="w-1 h-1 rounded-full bg-[#D71920]" />}
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => {
              haptics.click();
              onTabChange('settings');
            }}
            className={`flex flex-col items-center gap-1 p-1 transition ${
              currentTab === 'settings' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
            title="Настройки"
          >
            <Settings className="w-4 h-4" />
            <span className="font-ndot text-[8px] uppercase tracking-wider">ОПЦИИ</span>
            {currentTab === 'settings' && <span className="w-1 h-1 rounded-full bg-[#D71920]" />}
          </button>
        </div>
      </div>
    </div>
  );
};
