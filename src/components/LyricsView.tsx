import React, { useEffect, useRef, useState } from 'react';
import { LyricLine, Track } from '../types';
import {
  fetchLyricsForTrack,
  fetchLyricVariantsForTrack,
  searchAllLyricVariants,
  applyLyricVariant,
  saveCustomLyrics,
  cleanTrackSearchTerms,
  LyricVariant,
  stripLRC,
} from '../utils/lyricsService';
import { haptics } from '../utils/haptics';
import {
  RefreshCw,
  Edit3,
  Check,
  X,
  Clock,
  Search,
  Globe,
  Copy,
  FileText,
  AlignLeft,
  Clipboard,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

interface LyricsViewProps {
  track: Track;
  currentTime: number;
  onSeek: (time: number) => void;
  onRenameTrack?: (trackId: string, newTitle: string, newArtist: string) => void;
  className?: string;
}

type LyricsDisplayMode = 'plain' | 'synced';

export const LyricsView: React.FC<LyricsViewProps> = ({
  track,
  currentTime,
  onSeek,
  onRenameTrack,
  className = '',
}) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainText, setPlainText] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [source, setSource] = useState<string>('not_found');
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<LyricsDisplayMode>('plain');
  const [loading, setLoading] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Auto-rename track in player when user chooses a variant
  const [autoRenameInPlayer, setAutoRenameInPlayer] = useState<boolean>(true);

  // Active variant tracking & variant list
  const [activeVariantId, setActiveVariantId] = useState<string | undefined>(undefined);
  const [variants, setVariants] = useState<LyricVariant[]>([]);
  const [showVariantsModal, setShowVariantsModal] = useState<boolean>(false);
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);

  // Quick Paste Modal state & input
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteModalInput, setPasteModalInput] = useState<string>('');
  const [pasteModalError, setPasteModalError] = useState<string | null>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Variant searching inside modal
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [isSearchingVariants, setIsSearchingVariants] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editInput, setEditInput] = useState<string>('');

  // Synchronized playback controls
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [timeOffset, setTimeOffset] = useState<number>(0);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  };

  useEffect(() => {
    if (showPasteModal) {
      const timer = setTimeout(() => {
        pasteTextareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showPasteModal]);

  const prevTrackIdRef = useRef<string>(track.id);

  // Load lyrics & candidates when track changes
  useEffect(() => {
    let isCancelled = false;
    const isNewTrack = prevTrackIdRef.current !== track.id;
    prevTrackIdRef.current = track.id;

    // If only title/artist was renamed in the player for the same track, don't re-trigger loading
    if (!isNewTrack && (lyrics.length > 0 || plainText || rawText)) {
      return;
    }

    setLoading(true);
    setSearchError(null);
    setExpandedVariantId(null);

    // Initial query
    fetchLyricsForTrack(track).then((data) => {
      if (!isCancelled) {
        setLyrics(data.synced || []);
        setPlainText(data.plainText || '');
        setRawText(data.raw || '');
        setSource(data.source);
        setIsSynced(data.isSynced);
        setActiveVariantId(data.activeVariantId);
        setDisplayMode(data.isSynced ? 'synced' : 'plain');
        setEditInput(data.raw || data.plainText || '');
        setLoading(false);
      }
    });

    // Also load variants list for track
    fetchLyricVariantsForTrack(track).then((vars) => {
      if (!isCancelled) {
        setVariants(vars);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [track.id, track.title, track.artist]);

  // Find active line index in synced mode
  const adjustedTime = Math.max(0, currentTime + timeOffset);
  let activeIndex = -1;
  if (isSynced && lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= adjustedTime) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Auto-scroll to active line in synced mode
  useEffect(() => {
    if (displayMode !== 'synced' || !autoScroll || isEditing || activeIndex === -1) return;
    const container = containerRef.current;
    const activeEl = activeLineRef.current;
    if (container && activeEl) {
      const containerHeight = container.clientHeight;
      const elOffsetTop = activeEl.offsetTop;
      const elHeight = activeEl.clientHeight;
      const targetScroll = elOffsetTop - containerHeight / 2 + elHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeIndex, autoScroll, isEditing, displayMode]);

  const handleLineClick = (time: number) => {
    haptics.tick();
    onSeek(time);
    setAutoScroll(true);
  };

  const handleSelectVariant = (variant: LyricVariant, userInitiated = false) => {
    haptics.clack();
    const updated = applyLyricVariant(track.id, variant);
    setLyrics(updated.synced || []);
    setPlainText(updated.plainText || '');
    setRawText(updated.raw || '');
    setSource(updated.source);
    setIsSynced(updated.isSynced);
    setActiveVariantId(variant.id);
    setDisplayMode(updated.isSynced ? 'synced' : 'plain');
    setEditInput(updated.raw || updated.plainText || '');

    // Auto-rename track in player if user chosen and enabled
    if (userInitiated && autoRenameInPlayer && onRenameTrack) {
      const newTitle = variant.title?.trim();
      const newArtist = variant.artist?.trim();

      const candidateTitle = newTitle && newTitle.length > 0 ? newTitle : track.title;
      const candidateArtist =
        newArtist &&
        newArtist.length > 0 &&
        newArtist !== 'УСТРОЙСТВО' &&
        newArtist !== 'Unknown Artist' &&
        newArtist !== 'DEVICE_AUDIO' &&
        newArtist !== 'Android Audio'
          ? newArtist
          : track.artist;

      if (
        candidateTitle &&
        (candidateTitle !== track.title || candidateArtist !== track.artist)
      ) {
        onRenameTrack(track.id, candidateTitle, candidateArtist);
        showToast(`Вариант применён • В плеере: «${candidateTitle}»`);
        return;
      }
    }

    showToast(`Применён вариант: ${variant.title}`);
  };

  const applyCustomLyrics = (rawContent: string) => {
    const trimmed = rawContent.trim();
    if (!trimmed) {
      showToast('Текст песни пуст');
      return;
    }
    haptics.click();
    const updated = saveCustomLyrics(track.id, trimmed);
    setLyrics(updated.synced || []);
    setPlainText(updated.plainText || '');
    setRawText(updated.raw || '');
    setSource('custom');
    setIsSynced(updated.isSynced);
    setActiveVariantId('custom-pasted');
    setDisplayMode(updated.isSynced ? 'synced' : 'plain');
    setEditInput(trimmed);
    setIsEditing(false);
    setShowVariantsModal(false);
    setShowPasteModal(false);
    setPasteModalInput('');

    // Update variants list so this custom variant is visible and selected
    setVariants((prev) => {
      const customVar: LyricVariant = {
        id: 'custom-pasted',
        title: 'Пользовательский текст',
        artist: 'Вручную / Буфер',
        source: 'custom',
        isSynced: updated.isSynced,
        synced: updated.synced,
        plainText: updated.plainText,
        raw: trimmed,
        preview: trimmed.split('\n').filter(Boolean).slice(0, 2).join(' / '),
      };
      return [customVar, ...prev.filter((v) => v.id !== 'custom-pasted')];
    });

    const linesCount = trimmed.split('\n').filter(Boolean).length;
    showToast(`✓ Текст применён (${linesCount} ${linesCount === 1 ? 'строка' : linesCount < 5 ? 'строки' : 'строк'})`);
  };

  const handleSaveEdit = () => {
    applyCustomLyrics(editInput);
  };

  const handleReload = () => {
    haptics.click();
    setLoading(true);
    setSearchError(null);
    fetchLyricVariantsForTrack(track).then((vars) => {
      setVariants(vars);
      if (vars.length > 0) {
        const best = vars[0];
        handleSelectVariant(best);
      }
      setLoading(false);
      showToast('Варианты обновлены из сети');
    });
  };

  const handleModalSearchSubmit = async (customQ?: string) => {
    const q = customQ !== undefined ? customQ : modalSearchQuery;
    if (!q.trim()) return;

    haptics.clack();
    setIsSearchingVariants(true);
    setSearchError(null);

    try {
      const results = await searchAllLyricVariants(q);
      setIsSearchingVariants(false);

      if (results.length > 0) {
        setVariants(results);
        showToast(`Найдено вариантов: ${results.length}`);
      } else {
        setSearchError('По данному запросу вариантов не найдено. Попробуйте изменить формулировку.');
      }
    } catch {
      setIsSearchingVariants(false);
      setSearchError('Ошибка сети при поиске. Проверьте подключение.');
    }
  };

  const handlePasteFromClipboard = async () => {
    haptics.tick();
    let clipboardText = '';
    let readSucceeded = false;

    // 1. Try modern Async Clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        clipboardText = await navigator.clipboard.readText();
        readSucceeded = true;
      } catch (err) {
        console.warn('Direct clipboard reading denied or not supported by browser:', err);
      }
    }

    // 2. If readText succeeded with non-empty text:
    if (readSucceeded && clipboardText && clipboardText.trim().length > 0) {
      if (isEditing) {
        setEditInput(clipboardText.trim());
        showToast('✓ Текст вставлен в редактор');
      } else {
        applyCustomLyrics(clipboardText);
      }
      return;
    }

    // 3. If clipboard reading was blocked by browser permissions, or if clipboard is empty:
    if (isEditing) {
      editTextareaRef.current?.focus();
      showToast('Удерживайте палец на поле ввода и нажмите «Вставить»');
    } else {
      setShowVariantsModal(false);
      setPasteModalInput(clipboardText || '');
      setPasteModalError(
        readSucceeded
          ? 'Буфер обмена пуст. Вставьте скопированный текст песни в поле ниже:'
          : 'Браузер защищает буфер обмена. Удерживайте палец на поле ниже и нажмите «Вставить»:'
      );
      setShowPasteModal(true);
    }
  };

  const handleCopyText = async () => {
    try {
      haptics.tick();
      const textToCopy = plainText || rawText;
      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        showToast('Текст скопирован в буфер');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const formatSeconds = (secs?: number) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const cleaned = cleanTrackSearchTerms(track.title, track.artist);
  const hasAnyLyrics = (plainText && plainText.trim().length > 0) || lyrics.length > 0;

  return (
    <div
      className={`relative flex flex-col h-full bg-black/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden ${className}`}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed sm:absolute top-4 sm:top-2 left-1/2 -translate-x-1/2 z-[70] bg-white text-black text-[11px] sm:text-xs font-tech font-bold px-4 py-1.5 rounded-full shadow-2xl border border-white flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 pointer-events-none max-w-[90vw]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#D71920] shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-neutral-950/60 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isSynced ? 'bg-[#D71920] animate-pulse' : 'bg-white/70'
            }`}
          />
          <div className="truncate flex items-center gap-1.5">
            <span className="font-ndot text-white uppercase tracking-widest text-[10px]">
              ТЕКСТ ПЕСНИ
            </span>
            <span className="font-tech text-[9px] px-1.5 py-0.2 rounded border border-white/10 bg-white/5 text-white/70">
              {isSynced ? 'СИНХРОН (LRC)' : 'ПРОСТОЙ ТЕКСТ'}
            </span>
            <span className="font-tech text-[9px] text-white/40 hidden sm:inline truncate">
              {source === 'lrclib'
                ? '// LRCLIB'
                : source === 'ovh'
                ? '// LYRICS.OVH'
                : source === 'demo'
                ? '// NOTHING'
                : source === 'custom'
                ? '// СВОЙ'
                : '// ИНТЕРНЕТ'}
            </span>
          </div>
        </div>

        {/* Action icons & Mode Switcher */}
        <div className="flex items-center gap-1 shrink-0">
          {/* VARIANTS BUTTON: Allows user to choose between different lyric versions */}
          <button
            onClick={() => {
              haptics.click();
              const initialQ = `${cleaned.trackName} ${cleaned.artistName}`.trim() || track.title;
              setModalSearchQuery(initialQ);
              setSearchError(null);
              setShowVariantsModal(true);
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-tech border transition flex items-center gap-1 ${
              variants.length > 1
                ? 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
            title="Выбрать другой вариант текста или выполнить поиск"
          >
            <Layers className="w-2.5 h-2.5 text-[#D71920]" />
            <span className="font-bold">ВАРИАНТЫ</span>
            {variants.length > 0 && (
              <span className="bg-[#D71920] text-white text-[8px] px-1 rounded-full font-mono">
                {variants.length}
              </span>
            )}
          </button>

          {/* If synced lyrics exist, allow toggling between plain reading mode and synced karaoke */}
          {isSynced && (
            <button
              onClick={() => {
                haptics.tick();
                setDisplayMode((prev) => (prev === 'synced' ? 'plain' : 'synced'));
              }}
              className={`px-2 py-0.5 rounded text-[9px] font-tech border transition flex items-center gap-1 ${
                displayMode === 'plain'
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-white/5 text-white/70 border-white/20 hover:text-white'
              }`}
              title="Переключить режим: Текст или Синхронизация"
            >
              {displayMode === 'plain' ? (
                <>
                  <AlignLeft className="w-2.5 h-2.5" /> ВЕСЬ ТЕКСТ
                </>
              ) : (
                <>
                  <Clock className="w-2.5 h-2.5 text-[#D71920]" /> СИНХРОН
                </>
              )}
            </button>
          )}

          {/* Time Offset adjuster (only when in synced mode) */}
          {isSynced && displayMode === 'synced' && (
            <div className="flex items-center gap-0.5 font-tech text-[9px] text-white/60 bg-neutral-900 px-1.5 py-0.5 rounded-full border border-white/10">
              <Clock className="w-2.5 h-2.5" />
              <button
                onClick={() => {
                  haptics.tick();
                  setTimeOffset((prev) => +(prev - 0.5).toFixed(1));
                }}
                className="hover:text-white px-0.5"
                title="-0.5с"
              >
                -
              </button>
              <span className="text-white">
                {timeOffset >= 0 ? `+${timeOffset}s` : `${timeOffset}s`}
              </span>
              <button
                onClick={() => {
                  haptics.tick();
                  setTimeOffset((prev) => +(prev + 0.5).toFixed(1));
                }}
                className="hover:text-white px-0.5"
                title="+0.5с"
              >
                +
              </button>
            </div>
          )}

          {/* Copy Text Button */}
          {hasAnyLyrics && (
            <button
              onClick={handleCopyText}
              className="p-1.5 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition"
              title="Скопировать текст"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Edit / Enter Lyrics */}
          <button
            onClick={() => {
              haptics.click();
              setEditInput(rawText || plainText || '');
              setIsEditing(!isEditing);
            }}
            className="p-1.5 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition"
            title="Редактировать / Добавить свой текст"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Reload from Internet */}
          <button
            onClick={handleReload}
            className={`p-1.5 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition ${
              loading ? 'animate-spin' : ''
            }`}
            title="Перезагрузить текст из сети"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isEditing ? (
        <div className="flex-1 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between font-tech text-[11px] text-white/60">
            <span>Вставьте текст песни (обычный текст или с таймингами LRC):</span>
            <button
              onClick={handlePasteFromClipboard}
              className="text-[#D71920] hover:text-white flex items-center gap-1 font-bold"
            >
              <Clipboard className="w-3 h-3" /> ВСТАВИТЬ ИЗ БУФЕРА
            </button>
          </div>
          <textarea
            ref={editTextareaRef}
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            className="flex-1 w-full p-3 bg-neutral-900 border border-white/20 rounded-xl text-xs font-tech text-white leading-relaxed resize-none focus:outline-none focus:border-white"
            placeholder="Вставьте любой текст песни сюда..."
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-tech text-white/70 hover:bg-white/10 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> ОТМЕНА
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-tech font-bold hover:bg-neutral-200 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> СОХРАНИТЬ
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="w-2 h-2 rounded-full bg-white/60 animate-ping delay-150" />
            <span className="w-2 h-2 rounded-full bg-[#D71920] animate-ping delay-300" />
          </div>
          <p className="font-ndot text-xs text-white/80 uppercase tracking-widest flex items-center gap-1.5 justify-center">
            <Globe className="w-3.5 h-3.5 text-[#D71920]" />
            ПОИСК ТЕКСТА ПО ВСЕМУ ИНТЕРНЕТУ...
          </p>
          <p className="font-tech text-[10px] text-white/40">
            Сканирование LRCLIB, Lyrics.ovh и открытых каталогов
          </p>
        </div>
      ) : !hasAnyLyrics || source === 'not_found' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center text-white/50 space-y-3">
          <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/40 mb-1">
            <FileText className="w-5 h-5" />
          </div>
          <p className="font-ndot text-xs tracking-wider text-white/80">ТЕКСТ В СЕТИ НЕ ОБНАРУЖЕН</p>
          <p className="font-tech text-[11px] text-white/50 max-w-xs leading-relaxed">
            Поиск искал:{' '}
            <span className="text-white/80">
              «{cleaned.trackName}» {cleaned.artistName ? `(${cleaned.artistName})` : ''}
            </span>
            . Вы можете выбрать другой вариант, изменить запрос или вставить свой текст.
          </p>

          <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
            <button
              onClick={() => {
                haptics.click();
                setModalSearchQuery(`${cleaned.trackName} ${cleaned.artistName}`.trim() || track.title);
                setSearchError(null);
                setShowVariantsModal(true);
              }}
              className="w-full py-2 px-3 rounded-full bg-white text-black font-tech font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-neutral-200 transition"
            >
              <Layers className="w-3.5 h-3.5 text-[#D71920]" /> ВЫБРАТЬ ВАРИАНТ / ПОИСК В СЕТИ
            </button>
            <button
              onClick={handlePasteFromClipboard}
              className="w-full py-2 px-3 rounded-full bg-white/10 border border-white/20 text-white font-tech font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-white/20 transition"
            >
              <Clipboard className="w-3 h-3 text-[#D71920]" /> ВСТАВИТЬ ТЕКСТ ИЗ БУФЕРА
            </button>
          </div>
        </div>
      ) : displayMode === 'plain' || !isSynced ? (
        /* ============================================================ */
        /* PLAIN LYRICS VIEW (NO TIMESTAMPS REQUIRED / CLEAN READING)   */
        /* ============================================================ */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader info pill */}
          <div className="px-4 py-1.5 bg-neutral-950/40 border-b border-white/5 flex items-center justify-between text-[10px] font-tech text-white/40">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                ЧИСТЫЙ ТЕКСТ ПЕСНИ
              </span>
              {variants.length > 1 && (
                <button
                  onClick={() => setShowVariantsModal(true)}
                  className="text-white/60 hover:text-white underline decoration-dotted flex items-center gap-0.5"
                >
                  (доступно {variants.length} версий)
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span>ШРИФТ:</span>
              <button
                onClick={() => setFontSize('sm')}
                className={`px-1 rounded ${fontSize === 'sm' ? 'text-white font-bold bg-white/20' : 'text-white/40'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-1 rounded ${fontSize === 'base' ? 'text-white font-bold bg-white/20' : 'text-white/40'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-1 rounded ${fontSize === 'lg' ? 'text-white font-bold bg-white/20' : 'text-white/40'}`}
              >
                A+
              </button>
            </div>
          </div>

          {/* Plain lyrics text container */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 select-text">
            {plainText.split('\n\n').map((stanza, sIdx) => (
              <div
                key={sIdx}
                className="bg-white/[0.02] p-3 rounded-xl border border-white/5 hover:border-white/10 transition"
              >
                {stanza.split('\n').map((line, lIdx) => (
                  <p
                    key={lIdx}
                    className={`font-nothing text-white/90 leading-relaxed tracking-wide ${
                      fontSize === 'sm'
                        ? 'text-xs leading-5'
                        : fontSize === 'lg'
                        ? 'text-base leading-7'
                        : 'text-sm leading-6'
                    }`}
                  >
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* SYNCHRONIZED KARAOKE VIEW (LRC TIMESTAMPS)                   */
        /* ============================================================ */
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 py-8 space-y-4 scroll-smooth"
        >
          {lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => handleLineClick(line.time)}
                className={`group cursor-pointer transition-all duration-300 select-none flex items-start gap-3 py-1 px-2 rounded-xl ${
                  isActive
                    ? 'scale-[1.02] bg-white/5 border-l-2 border-[#D71920] pl-2.5'
                    : 'hover:bg-white/5 opacity-80'
                }`}
              >
                {/* Time Indicator & Dot Marker */}
                <div className="flex items-center gap-1.5 pt-0.5 min-w-[42px] font-tech text-[10px] text-white/30 group-hover:text-white/60">
                  {isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D71920] animate-pulse" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                  )}
                  <span>{formatSeconds(line.time)}</span>
                </div>

                {/* Lyric Text Line */}
                <p
                  className={`flex-1 transition-colors duration-200 ${
                    isActive
                      ? 'font-nothing text-white font-semibold text-[15px] leading-snug tracking-wide'
                      : isPast
                      ? 'font-nothing text-white/40 text-[13px] leading-relaxed'
                      : 'font-nothing text-white/60 text-[13px] leading-relaxed'
                  }`}
                >
                  {line.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Bar: Mode Details and Action Toggles */}
      <div className="px-3 py-1.5 border-t border-white/5 bg-neutral-950/60 flex items-center justify-between text-[9px] font-tech text-white/40">
        {isSynced && displayMode === 'synced' ? (
          <>
            <span>НАЖМИТЕ НА СТРОКУ ДЛЯ ПЕРЕХОДА</span>
            <button
              onClick={() => {
                haptics.tick();
                setAutoScroll(!autoScroll);
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                autoScroll
                  ? 'border-white/30 text-white bg-white/5'
                  : 'border-white/10 text-white/40'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${autoScroll ? 'bg-white' : 'bg-white/30'}`} />
              АВТОСКРОЛЛ: {autoScroll ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </>
        ) : (
          <>
            <span className="truncate">
              {hasAnyLyrics ? 'ТЕКСТ СОХРАНЁН В ПЛЕЕРЕ' : 'ПОИСК ТЕКСТА ПО ВСЕМУ ИНТЕРНЕТУ'}
            </span>
            <div className="flex items-center gap-2">
              {hasAnyLyrics && (
                <button
                  onClick={handleCopyText}
                  className="hover:text-white flex items-center gap-0.5"
                >
                  {copied ? 'СКОПИРОВАНО' : 'СКОПИРОВАТЬ'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* VARIANTS SELECTION MODAL (MOBILE-OPTIMIZED BOTTOM SHEET/MODAL)*/}
      {/* ============================================================ */}
      {showVariantsModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/85 backdrop-blur-md sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-lg bg-neutral-900 border-t sm:border border-white/20 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[93vh] sm:h-[84vh] max-h-[95vh] overflow-hidden">
            {/* Mobile drag handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2 mb-1 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#D71920]/20 border border-[#D71920]/40 flex items-center justify-center text-[#D71920] shrink-0">
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-ndot text-xs sm:text-sm text-white uppercase tracking-wider truncate">
                      ВАРИАНТЫ ТЕКСТА
                    </h3>
                    <span className="font-tech text-[10px] bg-white/10 text-white/80 px-1.5 py-0.2 rounded-full">
                      {variants.length}
                    </span>
                  </div>
                  <p className="font-tech text-[10px] text-white/40 truncate hidden sm:block">
                    Выберите подходящую версию или выполните поиск
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVariantsModal(false)}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 shrink-0"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar (Sticky Top) */}
            <div className="px-3 py-2 sm:px-5 sm:py-2.5 border-b border-white/10 bg-neutral-950/60 shrink-0 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => {
                      setModalSearchQuery(e.target.value);
                      setSearchError(null);
                    }}
                    placeholder="ПОИСК: НАПР. КИНО ПАЧКА СИГАРЕТ"
                    className="w-full pl-7 pr-7 py-1.5 sm:py-2 bg-black border border-white/20 rounded-xl text-xs font-tech text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleModalSearchSubmit();
                    }}
                  />
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {modalSearchQuery && (
                    <button
                      onClick={() => setModalSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
                      title="Очистить"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleModalSearchSubmit()}
                  disabled={isSearchingVariants || !modalSearchQuery.trim()}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-black font-bold font-tech text-xs rounded-xl disabled:opacity-30 hover:bg-neutral-200 transition flex items-center gap-1 shrink-0"
                >
                  {isSearchingVariants ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'ИСКАТЬ'
                  )}
                </button>
              </div>

              {/* Quick Search Chips - Single-line horizontal scroll on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap text-[9px] font-tech">
                <span className="text-white/40 shrink-0 hidden sm:inline">ПОДСКАЗКИ:</span>
                {cleaned.trackName && (
                  <button
                    onClick={() => {
                      haptics.tick();
                      setModalSearchQuery(cleaned.trackName);
                      handleModalSearchSubmit(cleaned.trackName);
                    }}
                    className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/30 shrink-0 truncate max-w-[160px]"
                    title={`Только «${cleaned.trackName}»`}
                  >
                    Только «{cleaned.trackName}»
                  </button>
                )}
                {cleaned.trackName && cleaned.artistName && (
                  <button
                    onClick={() => {
                      haptics.tick();
                      const q = `${cleaned.artistName} - ${cleaned.trackName}`;
                      setModalSearchQuery(q);
                      handleModalSearchSubmit(q);
                    }}
                    className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/30 shrink-0 truncate max-w-[190px]"
                    title={`${cleaned.artistName} - ${cleaned.trackName}`}
                  >
                    {cleaned.artistName} - {cleaned.trackName}
                  </button>
                )}
                {track.title !== cleaned.trackName && (
                  <button
                    onClick={() => {
                      haptics.tick();
                      setModalSearchQuery(track.title);
                      handleModalSearchSubmit(track.title);
                    }}
                    className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/30 shrink-0 truncate max-w-[160px]"
                    title={track.title}
                  >
                    Оригинал: {track.title}
                  </button>
                )}
              </div>

              {/* Auto-rename in player toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    haptics.tick();
                    setAutoRenameInPlayer(!autoRenameInPlayer);
                  }}
                  className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-tech text-white/70 hover:text-white transition cursor-pointer select-none text-left"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                      autoRenameInPlayer
                        ? 'bg-[#D71920] border-[#D71920] text-white'
                        : 'bg-black/60 border-white/30 text-transparent'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="truncate">
                    Переименовывать трек при выборе
                  </span>
                </button>
                <span className="text-[8px] font-tech text-white/40 tracking-wider uppercase shrink-0 bg-white/5 px-1.5 py-0.5 rounded">
                  только в плеере
                </span>
              </div>

              {searchError && (
                <div className="p-1.5 bg-red-950/60 border border-red-500/40 rounded-lg text-[10px] font-tech text-red-200">
                  {searchError}
                </div>
              )}
            </div>

            {/* Variants List (Flex-1 scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 sm:px-5 sm:py-3 space-y-2 overscroll-contain">
              <div className="flex items-center justify-between text-[10px] font-tech text-white/40 px-0.5 pb-0.5">
                <span>НАЙДЕННЫЕ ВЕРСИИ ({variants.length})</span>
                <span className="hidden sm:inline">НАЖМИТЕ «ВЫБРАТЬ» ДЛЯ ПРИМЕНЕНИЯ</span>
              </div>

              {variants.length === 0 ? (
                <div className="text-center py-8 text-white/40 font-tech text-xs space-y-2">
                  <FileText className="w-6 h-6 mx-auto opacity-30" />
                  <p>Варианты пока не загружены.</p>
                  <p className="text-[10px] text-white/30">
                    Введите название песни в строку поиска выше и нажмите «ИСКАТЬ»
                  </p>
                </div>
              ) : (
                variants.map((v, idx) => {
                  const isActive = activeVariantId === v.id;
                  const isExpanded = expandedVariantId === v.id;

                  return (
                    <div
                      key={v.id || idx}
                      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-white/10 border-white/40 shadow-sm ring-1 ring-white/30'
                          : 'bg-black/50 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Top Row: Title, Artist + Badges & Select Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-nothing text-white text-xs font-semibold truncate leading-tight">
                              {v.title}
                            </span>
                            {v.artist && (
                              <span className="font-tech text-white/60 text-[10px] sm:text-[11px] truncate">
                                // {v.artist}
                              </span>
                            )}
                          </div>
                          {v.album && (
                            <p className="font-tech text-[9px] text-white/40 truncate leading-tight">
                              Альбом: {v.album}
                            </p>
                          )}
                          {/* Player rename preview indicator */}
                          {autoRenameInPlayer &&
                            (v.title !== track.title || (v.artist && v.artist !== track.artist)) && (
                              <p className="font-tech text-[9px] text-[#D71920]/90 truncate leading-tight mt-0.5 flex items-center gap-1">
                                <span>↳ В плеере:</span>
                                <span className="text-white/80 font-medium truncate">
                                  {v.title} {v.artist ? `// ${v.artist}` : ''}
                                </span>
                              </p>
                            )}
                        </div>

                        {/* Action / Active Badge in Header */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-tech border flex items-center gap-1 ${
                              v.isSynced
                                ? 'bg-[#D71920]/20 border-[#D71920]/40 text-[#D71920]'
                                : 'bg-white/5 border-white/10 text-white/60'
                            }`}
                          >
                            {v.isSynced ? (
                              <>
                                <span className="w-1 h-1 rounded-full bg-[#D71920] animate-pulse" />
                                LRC
                              </>
                            ) : (
                              'ТЕКСТ'
                            )}
                          </span>

                          <button
                            onClick={() => {
                              handleSelectVariant(v, true);
                              setShowVariantsModal(false);
                            }}
                            disabled={isActive}
                            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-tech font-bold transition flex items-center gap-1 shrink-0 ${
                              isActive
                                ? 'bg-white/15 text-white/70 cursor-default border border-white/20'
                                : 'bg-white text-black hover:bg-neutral-200 active:scale-95'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Check className="w-3 h-3 text-[#D71920]" /> АКТИВЕН
                              </>
                            ) : (
                              'ВЫБРАТЬ'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Preview Box */}
                      <div className="bg-black/60 p-2 rounded-lg border border-white/5 font-tech text-[10px] text-white/70 my-1.5 leading-relaxed">
                        {isExpanded ? (
                          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap select-text pr-1 font-nothing text-xs">
                            {stripLRC(v.raw || v.plainText)}
                          </div>
                        ) : (
                          <p className="italic line-clamp-2 select-text text-[10px] text-white/70">
                            «{v.preview || 'Текст песни...'}»
                          </p>
                        )}
                      </div>

                      {/* Bottom Info: Expand & Source */}
                      <div className="flex items-center justify-between text-[9px] font-tech text-white/40 pt-0.5">
                        <button
                          onClick={() => {
                            haptics.tick();
                            setExpandedVariantId(isExpanded ? null : v.id);
                          }}
                          className="text-[10px] font-tech text-white/50 hover:text-white flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" /> СВЕРНУТЬ
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" /> ЧИТАТЬ ПОЛНОСТЬЮ
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {v.duration && <span>{formatSeconds(v.duration)}</span>}
                          <span>
                            {v.source === 'lrclib'
                              ? '// LRCLIB'
                              : v.source === 'ovh'
                              ? '// OVH'
                              : v.source === 'demo'
                              ? '// ДЕМО'
                              : v.source === 'custom'
                              ? '// СВОЙ'
                              : '// СЕТЬ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="px-3.5 py-2 sm:px-5 sm:py-2.5 border-t border-white/10 bg-neutral-950/70 shrink-0 flex items-center justify-between gap-2">
              <button
                onClick={handlePasteFromClipboard}
                className="px-3 py-1.5 text-xs font-tech font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 rounded-lg active:scale-95 transition"
              >
                <Clipboard className="w-3.5 h-3.5 text-[#D71920]" />
                <span className="truncate">Вставить из буфера</span>
              </button>

              <button
                onClick={() => setShowVariantsModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-white/20 text-xs font-tech text-white hover:bg-white/10"
              >
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUICK PASTE MODAL (FALLBACK & SEAMLESS CLIPBOARD INPUT)      */}
      {/* ============================================================ */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-950/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#D71920]/20 border border-[#D71920]/40 flex items-center justify-center text-[#D71920] shrink-0">
                  <Clipboard className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-ndot text-xs sm:text-sm text-white uppercase tracking-wider">
                  ВСТАВИТЬ ТЕКСТ ПЕСНИ
                </h3>
              </div>
              <button
                onClick={() => {
                  haptics.tick();
                  setShowPasteModal(false);
                }}
                className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction banner */}
            <div className="px-4 py-2.5 bg-neutral-950/40 border-b border-white/5 text-[11px] font-tech text-white/70 leading-relaxed">
              {pasteModalError ? (
                <div className="flex items-start gap-1.5 text-white/80">
                  <span className="text-[#D71920] font-bold">ℹ</span>
                  <span>{pasteModalError}</span>
                </div>
              ) : (
                <span>Вставьте скопированный текст (обычный или LRC с таймингами):</span>
              )}
            </div>

            {/* Textarea container */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2 min-h-[180px]">
              <div className="relative flex-1 flex flex-col">
                <textarea
                  ref={pasteTextareaRef}
                  value={pasteModalInput}
                  onChange={(e) => setPasteModalInput(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.trim()) {
                      setPasteModalInput(pasted.trim());
                      haptics.tick();
                    }
                  }}
                  autoFocus
                  rows={8}
                  placeholder="Удерживайте палец здесь и выберите «Вставить»..."
                  className="w-full flex-1 p-3 bg-black/60 border border-white/20 rounded-xl text-xs font-tech text-white leading-relaxed placeholder:text-white/30 focus:outline-none focus:border-[#D71920] resize-none"
                />
              </div>

              {/* Status footer with line count & quick clipboard button */}
              <div className="flex items-center justify-between text-[10px] font-tech text-white/50 px-1">
                <span>
                  {pasteModalInput.trim().length > 0 ? (
                    <span className="text-emerald-400 font-bold">
                      ✓ Строк: {pasteModalInput.split('\n').filter(Boolean).length} ({pasteModalInput.length} симв.)
                    </span>
                  ) : (
                    'Ожидание текста...'
                  )}
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    haptics.tick();
                    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                      try {
                        const txt = await navigator.clipboard.readText();
                        if (txt && txt.trim()) {
                          setPasteModalInput(txt.trim());
                          showToast('✓ Текст прочитан из буфера');
                        } else {
                          showToast('Буфер обмена пуст');
                        }
                      } catch {
                        showToast('Доступ к буферу заблокирован браузером');
                      }
                    } else {
                      showToast('Буфер не поддерживается браузером');
                    }
                  }}
                  className="hover:text-white flex items-center gap-1 underline decoration-dotted text-[10px]"
                >
                  <Clipboard className="w-3 h-3 text-[#D71920]" /> Попробовать прочитать буфер
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  haptics.tick();
                  setShowPasteModal(false);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-tech text-white/70 hover:bg-white/10"
              >
                ОТМЕНА
              </button>

              <button
                type="button"
                disabled={!pasteModalInput.trim()}
                onClick={() => applyCustomLyrics(pasteModalInput)}
                className={`px-4 py-1.5 rounded-xl text-xs font-tech font-bold flex items-center gap-1.5 transition ${
                  pasteModalInput.trim()
                    ? 'bg-white text-black hover:bg-neutral-200 shadow-md cursor-pointer'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-[#D71920]" />
                ПРИМЕНИТЬ ТЕКСТ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
