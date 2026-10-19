import React, { useEffect, useRef, useState } from 'react';
import { AppSettings, MainTab, Playlist, RepeatMode, Track } from './types';
import { DEFAULT_PLAYLISTS, DEFAULT_TRACKS, getActiveDefaultTracks, loadImportedTracksFromDB, saveImportedTrackToDB, deleteImportedTrackFromDB, deleteImportedTracksFromDB, localSettings } from './utils/storage';
import { audioEngine } from './utils/audioEngine';
import { getSavedDirectoryHandle, scanDirectoryForMp3s } from './utils/deviceScanner';
import { haptics } from './utils/haptics';
import { PhoneFrame } from './components/PhoneFrame';
import { PlayerScreen } from './components/PlayerScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { PlaylistsScreen } from './components/PlaylistsScreen';
import { HomeScreenWidgets } from './components/HomeScreenWidgets';
import { EqualizerScreen } from './components/EqualizerScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SleepTimerModal } from './components/SleepTimerModal';
import { fetchLyricsForTrack } from './utils/lyricsService';

const EMPTY_TRACK: Track = {
  id: 'empty',
  title: 'БИБЛИОТЕКА ПУСТА',
  artist: 'НАЖМИТЕ «СКАНИРОВАТЬ» ЧТОБЫ ДОБАВИТЬ МУЗЫКУ',
  album: 'NOTHING (AUDIO)',
  duration: 0,
  audioUrl: '',
};

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(() => {
    return getActiveDefaultTracks();
  });
  const [playlists, setPlaylists] = useState<Playlist[]>(() => localSettings.loadPlaylists());
  const [currentTrack, setCurrentTrack] = useState<Track>(() => {
    const active = getActiveDefaultTracks();
    return active.length > 0 ? active[0] : EMPTY_TRACK;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(64);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [queue, setQueue] = useState<Track[]>(() => {
    return getActiveDefaultTracks();
  });
  const [currentTab, setCurrentTab] = useState<MainTab>('player');
  const [navHistory, setNavHistory] = useState<MainTab[]>([]);

  const navigateToTab = (newTab: MainTab) => {
    if (newTab !== currentTab) {
      if (newTab === 'player') {
        setNavHistory([]);
      } else {
        setNavHistory((prev) => [...prev, currentTab]);
      }
      setCurrentTab(newTab);
    }
  };

  const handleGoBack = () => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((h) => h.slice(0, -1));
      setCurrentTab(prev);
    } else {
      setCurrentTab('player');
    }
  };

  // App Settings (Theme, Font Scale, Accent, Haptics, Auto Lyrics)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const s = localSettings.loadAppSettings();
    haptics.setHapticsEnabled(s.hapticsEnabled);
    haptics.setSoundEnabled(s.hapticsEnabled);
    return s;
  });

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localSettings.saveAppSettings(newSettings);
  };

  // Sleep timer state
  const [showSleepTimerModal, setShowSleepTimerModal] = useState<boolean>(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Auto-scan notification toast
  const [autoScanToast, setAutoScanToast] = useState<string | null>(null);

  // Refs for tracking values inside callbacks
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // 1. Initial Load & Auto-Scan on App Launch
  useEffect(() => {
    // Load previously imported tracks from IndexedDB
    loadImportedTracksFromDB().then((imported) => {
      if (imported.length > 0) {
        setTracks((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const toAdd = imported.filter((t) => !ids.has(t.id));
          const updated = [...prev, ...toAdd];
          if (currentTrackRef.current.id === 'empty' && updated.length > 0) {
            setCurrentTrack(updated[0]);
          }
          return updated;
        });
        setQueue((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const toAdd = imported.filter((t) => !ids.has(t.id));
          return [...prev, ...toAdd];
        });
      }
    });

    // Automatically check for saved directory handle and run MP3 auto-scan
    getSavedDirectoryHandle().then(async (handle) => {
      if (handle) {
        setAutoScanToast('АВТОПОИСК: СКАНИРОВАНИЕ MP3 НА УСТРОЙСТВЕ...');
        try {
          const found = await scanDirectoryForMp3s(handle);
          if (found.length > 0) {
            setTracks((prev) => {
              const ids = new Set(prev.map((t) => t.id));
              const newTracks = found.filter((t) => !ids.has(t.id));
              return [...prev, ...newTracks];
            });
            setAutoScanToast(`АВТОПОИСК: НАЙДЕНО И ОБНОВЛЕНО ${found.length} MP3 ТРЕКОВ`);
          } else {
            setAutoScanToast('АВТОПОИСК: УСТРОЙСТВО СИНХРОНИЗИРОВАНО');
          }
        } catch {
          setAutoScanToast(null);
        } finally {
          setTimeout(() => setAutoScanToast(null), 4000);
        }
      }
    });
  }, []);

  // 2. Setup Audio Engine & HTML5 Audio Event Listeners
  useEffect(() => {
    audioEngine.init();
    audioEngine.setVolume(1.0);

    const audioEl = audioEngine.getAudioElement();
    if (!audioEl) return;

    const onTimeUpdate = () => {
      if (!audioEngine.isSynthActive()) {
        setCurrentTime(audioEl.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (!audioEngine.isSynthActive() && audioEl.duration && isFinite(audioEl.duration)) {
        setDuration(audioEl.duration);
      }
    };

    const onEnded = () => {
      handleTrackEnded();
    };

    audioEl.addEventListener('timeupdate', onTimeUpdate);
    audioEl.addEventListener('loadedmetadata', onLoadedMetadata);
    audioEl.addEventListener('ended', onEnded);

    return () => {
      audioEl.removeEventListener('timeupdate', onTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioEl.removeEventListener('ended', onEnded);
    };
  }, []);

  // 3. MediaSession API integration for native mobile lock screen widget
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album || 'Nothing OS Music',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => handleTogglePlay());
        navigator.mediaSession.setActionHandler('pause', () => handleTogglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) handleSeek(details.seekTime);
        });
      } catch (err) {
        console.warn('MediaSession error', err);
      }
    }

    // Automatically search lyrics in the internet in background for current track
    if (appSettings.autoLyricsSearch) {
      fetchLyricsForTrack(currentTrack).catch(() => {});
    }
  }, [currentTrack, appSettings.autoLyricsSearch]);

  // 4. Sleep timer countdown loop
  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    if (sleepTimerRemaining <= 0) {
      // Pause playback
      pauseCurrent();
      setSleepTimerRemaining(null);
      return;
    }
    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  // Track playback methods
  const playTrack = (track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 60);

    if (newQueue) {
      setQueue(newQueue);
    } else if (!queue.some((t) => t.id === track.id)) {
      setQueue((prev) => [...prev, track]);
    }

    if (track.audioUrl.startsWith('synth:')) {
      const audioEl = audioEngine.getAudioElement();
      if (audioEl) audioEl.pause();
      audioEngine.startSynthTrack(track.id, 0, (time) => {
        setCurrentTime(time);
        if (time >= track.duration) {
          handleTrackEnded();
        }
      });
      setIsPlaying(true);
    } else {
      audioEngine.stopSynth();
      const audioEl = audioEngine.getAudioElement();
      if (audioEl) {
        audioEl.src = track.audioUrl;
        audioEl.currentTime = 0;
        audioEl.play().catch((e) => console.warn('Audio play error', e));
        setIsPlaying(true);
      }
    }
  };

  const pauseCurrent = () => {
    if (audioEngine.isSynthActive()) {
      audioEngine.stopSynth();
    }
    const audioEl = audioEngine.getAudioElement();
    if (audioEl) {
      audioEl.pause();
    }
    setIsPlaying(false);
  };

  const resumeCurrent = () => {
    if (currentTrack.audioUrl.startsWith('synth:')) {
      audioEngine.startSynthTrack(currentTrack.id, currentTime, (time) => {
        setCurrentTime(time);
        if (time >= currentTrack.duration) {
          handleTrackEnded();
        }
      });
      setIsPlaying(true);
    } else {
      const audioEl = audioEngine.getAudioElement();
      if (audioEl) {
        if (!audioEl.src || audioEl.src !== currentTrack.audioUrl) {
          audioEl.src = currentTrack.audioUrl;
          audioEl.currentTime = currentTime;
        }
        audioEl.play().catch((e) => console.warn('Resume error', e));
        setIsPlaying(true);
      }
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseCurrent();
    } else {
      resumeCurrent();
    }
  };

  const handleNext = () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * q.length);
      playTrack(q[randomIdx]);
      return;
    }

    const currentIdx = q.findIndex((t) => t.id === currentTrackRef.current.id);
    const nextIdx = (currentIdx + 1) % q.length;
    playTrack(q[nextIdx]);
  };

  const handlePrev = () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    // If more than 3 seconds in, seek to beginning
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }

    const currentIdx = q.findIndex((t) => t.id === currentTrackRef.current.id);
    const prevIdx = (currentIdx - 1 + q.length) % q.length;
    playTrack(q[prevIdx]);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (currentTrack.audioUrl.startsWith('synth:')) {
      if (isPlaying) {
        audioEngine.startSynthTrack(currentTrack.id, time, (t) => {
          setCurrentTime(t);
          if (t >= currentTrack.duration) handleTrackEnded();
        });
      }
    } else {
      const audioEl = audioEngine.getAudioElement();
      if (audioEl) {
        audioEl.currentTime = time;
      }
    }
  };

  const handleTrackEnded = () => {
    const rMode = repeatModeRef.current;
    if (rMode === 'one') {
      handleSeek(0);
      resumeCurrent();
    } else {
      handleNext();
    }
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleCycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleToggleFavorite = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
    if (currentTrack.id === trackId) {
      setCurrentTrack((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  const handleAddTracks = (newTracks: Track[]) => {
    setTracks((prev) => {
      const ids = new Set(prev.map((t) => t.id));
      const fresh = newTracks.filter((t) => !ids.has(t.id));
      if (currentTrackRef.current.id === 'empty' && fresh.length > 0) {
        setCurrentTrack(fresh[0]);
      }
      return [...prev, ...fresh];
    });
    setQueue((prev) => {
      const ids = new Set(prev.map((t) => t.id));
      const fresh = newTracks.filter((t) => !ids.has(t.id));
      return [...prev, ...fresh];
    });
  };

  const handleRemoveTrack = (trackId: string) => {
    // Record deletion for persistence
    const isSystem = DEFAULT_TRACKS.some((t) => t.id === trackId);
    if (isSystem) {
      localSettings.saveDeletedSystemTrackId(trackId);
    } else {
      deleteImportedTrackFromDB(trackId);
    }

    setTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackId);
      if (currentTrack.id === trackId) {
        if (updated.length > 0) {
          playTrack(updated[0], updated);
        } else {
          pauseCurrent();
          setCurrentTrack(EMPTY_TRACK);
        }
      }
      return updated;
    });
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
    // Also remove from all playlists
    setPlaylists((prev) => {
      const updated = prev.map((pl) => ({
        ...pl,
        trackIds: pl.trackIds.filter((id) => id !== trackId),
      }));
      localSettings.savePlaylists(updated);
      return updated;
    });
  };

  const handleUpdateTrack = (trackId: string, newTitle: string, newArtist: string) => {
    const title = newTitle.trim();
    const artist = newArtist.trim();
    if (!title) return;

    // Save in-player metadata override
    localSettings.saveTrackOverride(trackId, { title, artist });

    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const updated = { ...t, title, artist };
          if (t.isCustom) {
            saveImportedTrackToDB(updated);
          }
          return updated;
        }
        return t;
      })
    );

    setQueue((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, title, artist } : t))
    );

    if (currentTrack.id === trackId) {
      setCurrentTrack((prev) => ({ ...prev, title, artist }));
    }

    setAutoScanToast(`ТРЕК ПЕРЕИМЕНОВАН: ${title}`);
    setTimeout(() => setAutoScanToast(null), 2500);
  };

  const handleRemoveMultipleTracks = (trackIds: string[]) => {
    if (trackIds.length === 0) return;

    const idsSet = new Set(trackIds);

    // Split system tracks vs custom tracks
    const systemIds = trackIds.filter((id) => DEFAULT_TRACKS.some((t) => t.id === id));
    if (systemIds.length > 0) {
      localSettings.saveDeletedSystemTrackIds(systemIds);
    }
    const customIds = trackIds.filter((id) => !DEFAULT_TRACKS.some((t) => t.id === id));
    if (customIds.length > 0) {
      deleteImportedTracksFromDB(customIds);
    }

    setTracks((prev) => {
      const updated = prev.filter((t) => !idsSet.has(t.id));
      if (idsSet.has(currentTrack.id)) {
        if (updated.length > 0) {
          playTrack(updated[0], updated);
        } else {
          pauseCurrent();
          setCurrentTrack(EMPTY_TRACK);
        }
      }
      return updated;
    });

    setQueue((prev) => prev.filter((t) => !idsSet.has(t.id)));

    setPlaylists((prev) => {
      const updated = prev.map((pl) => ({
        ...pl,
        trackIds: pl.trackIds.filter((id) => !idsSet.has(id)),
      }));
      localSettings.savePlaylists(updated);
      return updated;
    });

    setAutoScanToast(`УДАЛЕНО: ${trackIds.length} ТРЕКОВ`);
    setTimeout(() => setAutoScanToast(null), 3000);
  };

  const handleRestoreSystemTracks = () => {
    localSettings.restoreDefaultTracks();
    setTracks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const toRestore = DEFAULT_TRACKS.filter((t) => !existingIds.has(t.id));
      const combined = [...toRestore, ...prev];
      if ((prev.length === 0 || currentTrack.id === 'empty') && toRestore.length > 0) {
        setCurrentTrack(toRestore[0]);
      }
      return combined;
    });
    setQueue((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const toRestore = DEFAULT_TRACKS.filter((t) => !existingIds.has(t.id));
      return [...toRestore, ...prev];
    });
    setAutoScanToast('СИСТЕМНЫЕ ТРЕКИ ВОССТАНОВЛЕНЫ');
    setTimeout(() => setAutoScanToast(null), 3000);
  };

  const handleShuffleTracks = (trackList: Track[]) => {
    if (trackList.length === 0) return;
    // Fisher-Yates uniform shuffle (non-repeating random order)
    const shuffled = [...trackList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setIsShuffle(true);
    setQueue(shuffled);
    playTrack(shuffled[0], shuffled);
    navigateToTab('player');
    setAutoScanToast(`ПЕРЕМЕШАНО: ${shuffled.length} ТРЕКОВ`);
    setTimeout(() => setAutoScanToast(null), 2500);
  };

  const handleShufflePlaylist = (playlistTracks: Track[]) => {
    handleShuffleTracks(playlistTracks);
  };

  const handleSetSleepTimer = (minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerRemaining(minutes * 60);
    }
  };

  return (
    <PhoneFrame
      currentTab={currentTab}
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      settings={appSettings}
      onTabChange={navigateToTab}
      onTogglePlay={handleTogglePlay}
      onNext={handleNext}
      onPrev={handlePrev}
    >
      {/* Auto-scan feedback banner */}
      {autoScanToast && (
        <div className="absolute top-2 inset-x-3 z-50 p-2.5 rounded-2xl bg-black/90 border border-[#D71920] shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#D71920] animate-ping" />
          <span className="font-tech text-xs text-white truncate flex-1">{autoScanToast}</span>
        </div>
      )}

      {/* Main Screens */}
      {currentTab === 'player' && (
        <PlayerScreen
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          queue={queue}
          sleepTimerRemaining={sleepTimerRemaining}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={handleSeek}
          onToggleShuffle={handleToggleShuffle}
          onCycleRepeat={handleCycleRepeat}
          onToggleFavorite={handleToggleFavorite}
          onUpdateTrack={handleUpdateTrack}
          onOpenEqualizer={() => navigateToTab('equalizer')}
          onOpenSleepTimer={() => setShowSleepTimerModal(true)}
          onOpenSettings={() => navigateToTab('settings')}
          defaultCenterMode={appSettings.defaultCenterMode}
          onSelectFromQueue={(t) => playTrack(t)}
        />
      )}

      {currentTab === 'library' && (
        <LibraryScreen
          tracks={tracks}
          playlists={playlists}
          currentTrackId={currentTrack.id}
          isPlaying={isPlaying}
          onBack={handleGoBack}
          onPlayTrack={(t, q) => {
            playTrack(t, q);
            navigateToTab('player');
          }}
          onShufflePlay={(tracksToShuffle) => {
            handleShuffleTracks(tracksToShuffle);
          }}
          onToggleFavorite={handleToggleFavorite}
          onAddTracks={handleAddTracks}
          onRemoveTrack={handleRemoveTrack}
          onRemoveMultipleTracks={handleRemoveMultipleTracks}
          onUpdateTrack={handleUpdateTrack}
          onUpdatePlaylists={setPlaylists}
          onRestoreSystemTracks={handleRestoreSystemTracks}
        />
      )}

      {currentTab === 'playlists' && (
        <PlaylistsScreen
          playlists={playlists}
          allTracks={tracks}
          onBack={handleGoBack}
          onUpdatePlaylists={setPlaylists}
          onPlayTrack={(t, q) => {
            playTrack(t, q);
            navigateToTab('player');
          }}
          onShufflePlaylist={(shuffledTracks) => {
            handleShufflePlaylist(shuffledTracks);
          }}
        />
      )}

      {currentTab === 'widgets' && (
        <HomeScreenWidgets
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onBack={handleGoBack}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onOpenPlayer={() => navigateToTab('player')}
          onOpenEqualizer={() => navigateToTab('equalizer')}
        />
      )}

      {currentTab === 'equalizer' && (
        <EqualizerScreen onBack={handleGoBack} />
      )}

      {currentTab === 'settings' && (
        <SettingsScreen
          settings={appSettings}
          onUpdateSettings={handleUpdateSettings}
          onBack={handleGoBack}
        />
      )}

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={showSleepTimerModal}
        activeSeconds={sleepTimerRemaining}
        onClose={() => setShowSleepTimerModal(false)}
        onSetTimer={handleSetSleepTimer}
      />
    </PhoneFrame>
  );
}
