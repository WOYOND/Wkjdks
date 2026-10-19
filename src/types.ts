export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // seconds
  audioUrl: string;
  coverArt?: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  rawFile?: Blob;
  lyrics?: string;
  syncedLyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type MainTab = 'player' | 'playlists' | 'library' | 'widgets' | 'equalizer' | 'settings';

export type PlayerCenterMode = 'disc' | 'visualizer' | 'lyrics';
export type PlayerTheme = 'black' | 'white';
export type FontSizeSetting = 'small' | 'medium' | 'large';
export type AccentColor = 'red' | 'white' | 'orange';

export interface AppSettings {
  theme: PlayerTheme;
  fontSize: FontSizeSetting;
  accentColor: AccentColor;
  hapticsEnabled: boolean;
  autoLyricsSearch: boolean;
  defaultCenterMode: PlayerCenterMode;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'black',
  fontSize: 'medium',
  accentColor: 'red',
  hapticsEnabled: true,
  autoLyricsSearch: true,
  defaultCenterMode: 'disc',
};

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: number[]; // 5 frequency bands in dB (-12 to +12)
  isCustom?: boolean;
}

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000]; // Hz
export const EQ_FREQUENCY_LABELS = ['60 Hz', '230 Hz', '910 Hz', '3.6 kHz', '14 kHz'];
