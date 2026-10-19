import { LyricLine, Track } from '../types';
import { localSettings } from './storage';

export interface LyricVariant {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  source: 'lrclib' | 'ovh' | 'demo' | 'custom';
  isSynced: boolean;
  synced: LyricLine[];
  plainText: string;
  raw: string;
  preview: string;
}

export interface LyricsResult {
  synced: LyricLine[];
  raw: string;
  plainText: string;
  source: 'lrclib' | 'ovh' | 'demo' | 'custom' | 'not_found';
  isSynced: boolean;
  activeVariantId?: string;
  variantsCount?: number;
}

// Pre-packaged synchronized lyrics for demo Nothing tracks
const DEMO_LYRICS: Record<string, string> = {
  'demo-1': `[00:00.00] // NOTHING (AUDIO) — GLYPH_PULSE 01
[00:04.00] Zero to one. The signal awakens.
[00:08.50] Dots of white cutting through pure darkness.
[00:13.00] Bass resonance detected in the chassis.
[00:17.20] Synchronizing frequency with light.
[00:21.80] Glyph strip: C-ring active.
[00:26.40] Nothing exists in the silence before the beat.
[00:31.00] Monochrome rhythm, uncorrupted, unfiltered.
[00:35.50] 124 BPM — mechanical precision.
[00:40.00] Transparent design. You hear what is inside.
[00:44.80] Feel the vibration on your fingertips.
[00:49.00] Pulsing glyphs illuminate the room.
[00:53.60] The loop continues into the void.
[00:58.00] Pure form. Pure audio. Pure Nothing.`,

  'demo-2': `[00:00.00] // MONOCHROME DREAMS
[00:05.00] In a world cluttered with color...
[00:10.50] We choose the absence of noise.
[00:16.00] Black and white tape rolling in reverse.
[00:22.00] Warm analog circuitry under frosted glass.
[00:28.50] Low frequency pulses comfort the mind.
[00:34.00] Dream in binary, wake in clarity.
[00:40.50] Minimal lines. Maximum depth.
[00:47.00] Echoes fading slowly into shadows.
[00:54.00] Silence is also a sound.
[01:00.00] Nothing is everything.`,

  'demo-3': `[00:00.00] // NEON DOT MATRIX
[00:03.20] Initializing 8-bit glyph array.
[00:07.00] Red dot locked on target.
[00:11.00] Cybernetic heartbeat accelerating.
[00:15.50] Fast arpeggio climbing through the wires.
[00:19.80] Light reflections on brutalist aluminium.
[00:24.00] Synthesizer cutoff opened wide.
[00:28.50] Velocity: 132 beats per minute.
[00:33.00] Every pixel sings in unison.
[00:37.50] Tactile response confirmed.
[00:42.00] Overload averted. Harmony restored.`,

  'demo-4': `[00:00.00] // TRANSPARENT NIGHT
[00:06.00] Looking through the casing at the quiet stars.
[00:13.50] Screws, magnets, and copper coils at rest.
[00:21.00] A delicate bell chimes in empty space.
[00:29.00] Slow deep breathing of the soundscape.
[00:37.00] Nothing between you and the music.
[00:45.00] Night closes in, stripped of excess.
[00:53.00] Rest your eyes. Let the glyph fade out.
[01:01.00] Sleep timer countdown active.`
};

export function parseLRC(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const time = minutes * 60 + seconds;
        result.push({ time, text: text || '...' });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

export function stripLRC(lrcText: string): string {
  if (!lrcText) return '';
  const lines = lrcText.split('\n');
  const cleaned: string[] = [];
  const timeRegex = /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g;
  const metaRegex = /^\[[a-z]{2}:.*\]$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || metaRegex.test(trimmed)) continue;
    const textOnly = trimmed.replace(timeRegex, '').trim();
    cleaned.push(textOnly);
  }

  return cleaned
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanPlainText(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generatePreview(text: string, maxLines = 3): string {
  if (!text) return '';
  const cleaned = stripLRC(text);
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));
  return lines.slice(0, maxLines).join(' / ') || cleaned.slice(0, 100);
}

export function cleanTrackSearchTerms(title: string, artist: string): { trackName: string; artistName: string } {
  // Strip file extensions
  let cleanTitle = title.replace(/\.(mp3|wav|flac|m4a|ogg|aac|webm|opus)$/i, '').trim();
  let cleanArtist = artist ? artist.trim() : '';

  // Replace underscores with spaces
  cleanTitle = cleanTitle.replace(/_/g, ' ');

  // Remove leading track numbers (e.g., "01. ", "02 - ", "01 ")
  cleanTitle = cleanTitle.replace(/^\d+[\s.\-_]+/, '').trim();

  // If title has "Artist - Song", separate them
  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    if (
      !cleanArtist ||
      cleanArtist === 'УСТРОЙСТВО' ||
      cleanArtist === 'Unknown Artist' ||
      cleanArtist === 'DEVICE_AUDIO' ||
      cleanArtist === 'Android Audio'
    ) {
      cleanArtist = parts[0].trim();
      cleanTitle = parts.slice(1).join(' - ').trim();
    }
  }

  // Remove common YouTube/tag extras in parentheses or brackets
  cleanTitle = cleanTitle.replace(
    /\[(official|video|audio|lyrics|hd|4k|hq|remastered|320kbps|explicit|music video|clip).*?\]/gi,
    ''
  );
  cleanTitle = cleanTitle.replace(
    /\((official|video|audio|lyrics|hd|4k|hq|remastered|320kbps|explicit|music video|clip).*?\)/gi,
    ''
  );
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

  if (
    cleanArtist === 'УСТРОЙСТВО' ||
    cleanArtist === 'Unknown Artist' ||
    cleanArtist === 'DEVICE_AUDIO' ||
    cleanArtist === 'Android Audio'
  ) {
    cleanArtist = '';
  }

  return { trackName: cleanTitle, artistName: cleanArtist };
}

// In-memory cache for active lyrics
const lyricsCache = new Map<string, LyricsResult>();
// In-memory cache for track variant lists
const variantsCache = new Map<string, LyricVariant[]>();

export function getCachedVariants(trackId: string): LyricVariant[] | null {
  return variantsCache.get(trackId) || null;
}

/**
 * Searches and returns all candidate lyric variants from LRCLIB and OVH for a custom query.
 */
export async function searchAllLyricVariants(
  query: string,
  artistHint?: string
): Promise<LyricVariant[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const variants: LyricVariant[] = [];
  const seenTexts = new Set<string>();

  // 1. Query LRCLIB search
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanQ)}`, {
      headers: { 'User-Agent': 'NothingAudioPlayer/1.0.0 (https://nothing.tech)' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const raw = item.syncedLyrics || item.plainLyrics;
          if (!raw || !raw.trim()) continue;

          const plainText = item.plainLyrics ? cleanPlainText(item.plainLyrics) : stripLRC(item.syncedLyrics);
          // Deduplication key
          const preview = generatePreview(raw, 2);
          const dedupKey = preview.toLowerCase().slice(0, 50);
          if (seenTexts.has(dedupKey)) continue;
          seenTexts.add(dedupKey);

          const synced = item.syncedLyrics ? parseLRC(item.syncedLyrics) : [];
          const isSynced = synced.length > 0;

          variants.push({
            id: `lrclib-${item.id}`,
            title: item.name || item.trackName || cleanQ,
            artist: item.artistName || artistHint || '',
            album: item.albumName || undefined,
            duration: typeof item.duration === 'number' ? Math.round(item.duration) : undefined,
            source: 'lrclib',
            isSynced,
            synced,
            plainText,
            raw,
            preview,
          });
        }
      }
    }
  } catch {}

  // 2. Query Lyrics.ovh if query has " - " or artistHint is supplied
  const effectiveArtist = artistHint || (cleanQ.includes(' - ') ? cleanQ.split(' - ')[0].trim() : '');
  const effectiveTitle = cleanQ.includes(' - ') ? cleanQ.split(' - ').slice(1).join(' - ').trim() : cleanQ;

  if (effectiveArtist && effectiveTitle) {
    try {
      const ovhRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(effectiveArtist)}/${encodeURIComponent(effectiveTitle)}`
      );
      if (ovhRes.ok) {
        const ovhData = await ovhRes.json();
        if (ovhData.lyrics && ovhData.lyrics.trim().length > 0) {
          const plainText = cleanPlainText(ovhData.lyrics);
          const preview = generatePreview(plainText, 2);
          const dedupKey = preview.toLowerCase().slice(0, 50);
          if (!seenTexts.has(dedupKey)) {
            seenTexts.add(dedupKey);
            variants.push({
              id: `ovh-${Date.now()}`,
              title: effectiveTitle,
              artist: effectiveArtist,
              source: 'ovh',
              isSynced: false,
              synced: [],
              plainText,
              raw: ovhData.lyrics,
              preview,
            });
          }
        }
      }
    } catch {}
  }

  // Sort variants: synced first, then by duration availability
  variants.sort((a, b) => {
    if (a.isSynced && !b.isSynced) return -1;
    if (!a.isSynced && b.isSynced) return 1;
    return 0;
  });

  return variants;
}

/**
 * Gathers all possible lyric variants for a given track, including embedded, demo, custom, and internet candidates.
 */
export async function fetchLyricVariantsForTrack(track: Track): Promise<LyricVariant[]> {
  const variants: LyricVariant[] = [];
  const seenTexts = new Set<string>();

  // A. Demo track variant
  if (DEMO_LYRICS[track.id]) {
    const raw = DEMO_LYRICS[track.id];
    const synced = parseLRC(raw);
    const plainText = stripLRC(raw);
    const preview = generatePreview(raw, 2);
    seenTexts.add(preview.toLowerCase().slice(0, 50));
    variants.push({
      id: `demo-${track.id}`,
      title: track.title,
      artist: track.artist,
      source: 'demo',
      isSynced: true,
      synced,
      plainText,
      raw,
      preview,
    });
  }

  // B. Embedded file lyrics
  if (track.lyrics && track.lyrics.trim().length > 0) {
    const hasTimestamps = /\[\d{1,2}:\d{2}/.test(track.lyrics);
    const synced = hasTimestamps ? parseLRC(track.lyrics) : [];
    const plainText = hasTimestamps ? stripLRC(track.lyrics) : cleanPlainText(track.lyrics);
    const preview = generatePreview(track.lyrics, 2);
    seenTexts.add(preview.toLowerCase().slice(0, 50));
    variants.push({
      id: `embedded-${track.id}`,
      title: track.title,
      artist: track.artist,
      source: 'custom',
      isSynced: synced.length > 0,
      synced,
      plainText,
      raw: track.lyrics,
      preview: `[Встроенный файл] ${preview}`,
    });
  }

  // C. Search Internet
  const { trackName, artistName } = cleanTrackSearchTerms(track.title, track.artist);
  const primaryQuery = `${trackName} ${artistName}`.trim() || track.title;

  const internetVariants = await searchAllLyricVariants(primaryQuery, artistName);
  for (const iv of internetVariants) {
    const key = iv.preview.toLowerCase().slice(0, 50);
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      variants.push(iv);
    }
  }

  // If few variants and artistName was present, also search trackName alone
  if (variants.length < 3 && trackName && artistName) {
    const titleOnlyVariants = await searchAllLyricVariants(trackName, artistName);
    for (const iv of titleOnlyVariants) {
      const key = iv.preview.toLowerCase().slice(0, 50);
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        variants.push(iv);
      }
    }
  }

  variantsCache.set(track.id, variants);
  return variants;
}

/**
 * Fetches the active lyrics for a track, or selects the best candidate automatically.
 */
export async function fetchLyricsForTrack(track: Track): Promise<LyricsResult> {
  // 1. Check memory cache
  if (lyricsCache.has(track.id)) {
    const cached = lyricsCache.get(track.id)!;
    // ensure variants are fetched in background if missing
    if (!variantsCache.has(track.id)) {
      fetchLyricVariantsForTrack(track).then((v) => {
        variantsCache.set(track.id, v);
      });
    }
    return cached;
  }

  // 2. Check persistent localStorage cache
  const cached = localSettings.loadCachedLyrics(track.id);
  if (cached && (cached.synced?.length > 0 || cached.plainText || cached.raw)) {
    lyricsCache.set(track.id, cached);
    if (!variantsCache.has(track.id)) {
      fetchLyricVariantsForTrack(track).then((v) => {
        variantsCache.set(track.id, v);
      });
    }
    return cached;
  }

  // 3. Fetch all variants from internet & file sources
  const variants = await fetchLyricVariantsForTrack(track);

  if (variants.length > 0) {
    // Pick the best candidate (synced preferred, or matching duration)
    let best = variants[0];
    if (track.duration && track.duration > 0) {
      // Find candidate with closest duration if available
      const withDuration = variants.filter((v) => v.duration && Math.abs(v.duration - track.duration!) < 5);
      if (withDuration.length > 0) {
        best = withDuration.find((v) => v.isSynced) || withDuration[0];
      }
    }

    const result: LyricsResult = {
      synced: best.synced,
      raw: best.raw,
      plainText: best.plainText,
      source: best.source,
      isSynced: best.isSynced,
      activeVariantId: best.id,
      variantsCount: variants.length,
    };

    lyricsCache.set(track.id, result);
    localSettings.saveCachedLyrics(track.id, result);
    return result;
  }

  // 4. Fallback: Not found
  const notFoundResult: LyricsResult = {
    synced: [],
    raw: '',
    plainText: '',
    source: 'not_found',
    isSynced: false,
    variantsCount: 0,
  };

  return notFoundResult;
}

/**
 * Applies a selected variant to the track and stores it persistently.
 */
export function applyLyricVariant(trackId: string, variant: LyricVariant): LyricsResult {
  const result: LyricsResult = {
    synced: variant.synced,
    raw: variant.raw,
    plainText: variant.plainText,
    source: variant.source,
    isSynced: variant.isSynced,
    activeVariantId: variant.id,
    variantsCount: (variantsCache.get(trackId) || []).length,
  };

  lyricsCache.set(trackId, result);
  localSettings.saveCachedLyrics(trackId, result);
  return result;
}

/**
 * User-triggered direct custom internet search query.
 */
export async function searchInternetLyricsDirect(query: string, trackId: string): Promise<LyricsResult | null> {
  const cleanQ = query.trim();
  if (!cleanQ) return null;

  const variants = await searchAllLyricVariants(cleanQ);
  if (variants.length > 0) {
    variantsCache.set(trackId, variants);
    return applyLyricVariant(trackId, variants[0]);
  }
  return null;
}

/**
 * Saves manually pasted or edited text for a track.
 */
export function saveCustomLyrics(trackId: string, text: string): LyricsResult {
  const timeRegex = /\[\d{1,2}:\d{2}/;
  const hasTimestamps = timeRegex.test(text);

  let result: LyricsResult;
  if (hasTimestamps) {
    const synced = parseLRC(text);
    const plainText = stripLRC(text);
    result = {
      synced,
      raw: text,
      plainText,
      source: 'custom',
      isSynced: synced.length > 0,
      activeVariantId: 'custom-pasted',
    };
  } else {
    const plainText = cleanPlainText(text);
    result = {
      synced: [],
      raw: text,
      plainText,
      source: 'custom',
      isSynced: false,
      activeVariantId: 'custom-pasted',
    };
  }

  lyricsCache.set(trackId, result);
  localSettings.saveCachedLyrics(trackId, result);

  // Add custom variant to list
  const existingVariants = variantsCache.get(trackId) || [];
  const customVariant: LyricVariant = {
    id: 'custom-pasted',
    title: 'Пользовательский текст',
    artist: 'Вручную',
    source: 'custom',
    isSynced: result.isSynced,
    synced: result.synced,
    plainText: result.plainText,
    raw: text,
    preview: generatePreview(text, 2),
  };
  variantsCache.set(trackId, [customVariant, ...existingVariants.filter((v) => v.id !== 'custom-pasted')]);

  return result;
}
