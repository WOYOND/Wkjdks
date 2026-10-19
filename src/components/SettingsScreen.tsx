import React, { useState } from 'react';
import { AppSettings, DEFAULT_APP_SETTINGS, FontSizeSetting, PlayerTheme, AccentColor, PlayerCenterMode } from '../types';
import { haptics } from '../utils/haptics';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  ArrowLeft,
  Moon,
  Sun,
  Type,
  Palette,
  Vibrate,
  Globe,
  Disc,
  Activity,
  FileText,
  RotateCcw,
  Sparkles,
  Check,
  Smartphone,
  Download,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onBack,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyAppUrl = () => {
    haptics.clack();
    const url = window.location.href.split('?')[0];
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleInstallClick = async () => {
    haptics.clack();
    if (isInstallable) {
      await install();
    }
  };

  const update = (patch: Partial<AppSettings>) => {
    haptics.click();
    const next = { ...settings, ...patch };
    if (patch.hapticsEnabled !== undefined) {
      haptics.setHapticsEnabled(patch.hapticsEnabled);
      haptics.setSoundEnabled(patch.hapticsEnabled);
    }
    onUpdateSettings(next);
  };

  const handleReset = () => {
    haptics.clack();
    haptics.setHapticsEnabled(DEFAULT_APP_SETTINGS.hapticsEnabled);
    haptics.setSoundEnabled(DEFAULT_APP_SETTINGS.hapticsEnabled);
    onUpdateSettings(DEFAULT_APP_SETTINGS);
  };

  return (
    <div className="flex flex-col h-full bg-black text-white px-4 py-2 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3 shrink-0">
        <div className="flex items-center gap-2">
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
          <div>
            <h2 className="font-ndot text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D71920] animate-pulse" />
              NOTHING OS // НАСТРОЙКИ
            </h2>
            <p className="font-tech text-[10px] text-white/40">СТИЛЬ ПЛЕЕРА И ИНТЕРФЕЙС</p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/40 transition text-xs font-tech flex items-center gap-1"
          title="Сбросить все настройки"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-4 pb-6">
        {/* SECTION 1: THEME SELECTOR (BLACK / WHITE) */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#D71920]" /> ТЕМА ОФОРМЛЕНИЯ ПЛЕЕРА
            </span>
            <span className="font-tech text-[10px] text-white/50 uppercase">
              {settings.theme === 'black' ? 'ЧЕРНАЯ (OLED)' : 'БЕЛАЯ (LIGHT)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Black Theme Card */}
            <div
              onClick={() => update({ theme: 'black' })}
              className={`cursor-pointer rounded-2xl p-3 border transition relative flex flex-col justify-between ${
                settings.theme === 'black'
                  ? 'border-white bg-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'border-white/15 bg-black/60 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-5 h-5 rounded-full bg-black border border-white/40 flex items-center justify-center">
                  <Moon className="w-3 h-3 text-white" />
                </div>
                {settings.theme === 'black' && (
                  <span className="w-2 h-2 rounded-full bg-[#D71920]" />
                )}
              </div>
              <div>
                <p className="font-ndot text-xs text-white uppercase tracking-wider">ЧЕРНАЯ ТЕМА</p>
                <p className="font-tech text-[9px] text-white/50">Глубокий OLED черный</p>
              </div>
            </div>

            {/* White Theme Card */}
            <div
              onClick={() => update({ theme: 'white' })}
              className={`cursor-pointer rounded-2xl p-3 border transition relative flex flex-col justify-between ${
                settings.theme === 'white'
                  ? 'border-white bg-[#ececec] text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                  : 'border-white/20 bg-neutral-800/80 hover:border-white/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-5 h-5 rounded-full bg-white border border-black/20 flex items-center justify-center">
                  <Sun className="w-3 h-3 text-black" />
                </div>
                {settings.theme === 'white' && (
                  <span className="w-2 h-2 rounded-full bg-[#D71920]" />
                )}
              </div>
              <div>
                <p className={`font-ndot text-xs uppercase tracking-wider ${settings.theme === 'white' ? 'text-black' : 'text-white'}`}>
                  БЕЛАЯ ТЕМА
                </p>
                <p className={`font-tech text-[9px] ${settings.theme === 'white' ? 'text-black/60' : 'text-white/50'}`}>
                  Светлый Nothing OS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: FONT SIZE SELECTOR */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#D71920]" /> РАЗМЕР ШРИФТА
            </span>
            <span className="font-tech text-[10px] text-white/50 uppercase">
              {settings.fontSize === 'small'
                ? 'МЕЛКИЙ'
                : settings.fontSize === 'medium'
                ? 'СТАНДАРТНЫЙ'
                : 'КРУПНЫЙ'}
            </span>
          </div>

          {/* Segmented Buttons */}
          <div className="flex gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
            {(
              [
                { id: 'small', label: 'МЕЛКИЙ' },
                { id: 'medium', label: 'СТАНДАРТ' },
                { id: 'large', label: 'КРУПНЫЙ' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => update({ fontSize: item.id as FontSizeSetting })}
                className={`flex-1 py-1.5 rounded-lg font-tech text-xs transition ${
                  settings.fontSize === item.id
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Real-time typography preview */}
          <div className="p-2.5 rounded-xl bg-black border border-white/10 space-y-0.5">
            <span className="font-tech text-[9px] text-white/40 block">// ПРЕВЬЮ ТЕКСТА:</span>
            <p className="font-nothing font-bold text-white truncate">
              Nothing Track // High Fidelity Audio
            </p>
            <p className="font-tech text-white/60 truncate">
              Artist: Nothing Sounds Ltd.
            </p>
            <p className="font-ndot text-xs text-[#D71920] truncate pt-0.5">
              [00:15] «Голос звучит кристально чисто...»
            </p>
          </div>
        </div>

        {/* SECTION 3: ACCENT COLOR */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-2.5">
          <span className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D71920]" /> АКЦЕНТНЫЙ ИНДИКАТОР
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'red' as AccentColor, label: 'NOTHING RED', color: '#D71920' },
              { id: 'white' as AccentColor, label: 'МОНОХРОМ', color: '#FFFFFF' },
              { id: 'orange' as AccentColor, label: 'ОРАНЖЕВЫЙ', color: '#FF5722' },
            ].map((acc) => (
              <button
                key={acc.id}
                onClick={() => update({ accentColor: acc.id })}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  settings.accentColor === acc.id
                    ? 'border-white bg-black/80 shadow-md'
                    : 'border-white/10 bg-black/30 hover:border-white/25'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shadow-inner"
                  style={{ backgroundColor: acc.color }}
                />
                <span className="font-tech text-[9px] text-white/80 whitespace-nowrap">
                  {acc.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 4: DEFAULT CENTER MODE */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-2.5">
          <span className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-[#D71920]" /> ЦЕНТРАЛЬНЫЙ ЭКРАН ПО УМОЛЧАНИЮ
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'disc' as PlayerCenterMode, label: 'ВИНИЛ', icon: Disc },
              { id: 'visualizer' as PlayerCenterMode, label: 'ЭКВАЛАЙЗЕР', icon: Activity },
              { id: 'lyrics' as PlayerCenterMode, label: 'ТЕКСТ ПЕСНИ', icon: FileText },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => update({ defaultCenterMode: m.id })}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition ${
                    settings.defaultCenterMode === m.id
                      ? 'border-white bg-white text-black font-bold shadow-md'
                      : 'border-white/10 bg-black/40 text-white/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-tech text-[9px] whitespace-nowrap">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: BEHAVIOR & HAPTICS */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-3">
          <span className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
            <Vibrate className="w-3.5 h-3.5 text-[#D71920]" /> ОТКЛИК И ИНТЕРНЕТ
          </span>

          {/* Haptics toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="pr-2">
              <p className="font-tech text-xs text-white">Виброотклик и механический щелчок</p>
              <p className="font-tech text-[10px] text-white/40">Тактильный щелчок переключателей Nothing OS</p>
            </div>
            <button
              onClick={() => update({ hapticsEnabled: !settings.hapticsEnabled })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                settings.hapticsEnabled ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full transition-transform ${
                  settings.hapticsEnabled
                    ? 'translate-x-5 bg-black'
                    : 'translate-x-0 bg-white/40'
                }`}
              />
            </button>
          </div>

          {/* Auto search lyrics toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="pr-2">
              <p className="font-tech text-xs text-white">Автопоиск текстов песен</p>
              <p className="font-tech text-[10px] text-white/40">Автоматически искать синхронные слова в сети</p>
            </div>
            <button
              onClick={() => update({ autoLyricsSearch: !settings.autoLyricsSearch })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                settings.autoLyricsSearch ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full transition-transform ${
                  settings.autoLyricsSearch
                    ? 'translate-x-5 bg-black'
                    : 'translate-x-0 bg-white/40'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SECTION 6: ANDROID / APK / PWA INSTALLATION */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-ndot text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#D71920]" /> УСТАНОВКА НА ANDROID (APK / PWA)
            </span>
            <span className="font-tech text-[9px] px-2 py-0.5 rounded bg-[#D71920]/20 text-[#D71920] font-bold uppercase">
              ANDROID OS
            </span>
          </div>

          <p className="font-tech text-xs text-white/70 leading-relaxed">
            Плеер работает как полноценное системное приложение смартфона с офлайн-доступом и воспроизведением музыки в фоне.
          </p>

          {/* Quick Install Button */}
          {isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 px-3 rounded-xl bg-white text-black font-tech font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95"
            >
              <Download className="w-4 h-4 text-[#D71920]" />
              <span>УСТАНОВИТЬ НА СМАРТФОН СЕЙЧАС</span>
            </button>
          ) : isInstalled ? (
            <div className="w-full py-2 px-3 rounded-xl bg-green-950/40 border border-green-500/40 flex items-center justify-center gap-2 text-xs font-tech text-green-400">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>ПРИЛОЖЕНИЕ УЖЕ УСТАНОВЛЕНО НА ЭКРАН</span>
            </div>
          ) : null}

          {/* Instructions Block */}
          <div className="space-y-2 pt-1 border-t border-white/10 font-tech text-xs">
            {/* Method 1: WebAPK direct install */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span className="text-[#D71920]">01.</span> Установка без скачивания лишних файлов (WebAPK)
              </p>
              <p className="text-white/60 text-[11px] leading-relaxed">
                Откройте эту страницу в мобильном браузере <strong className="text-white">Chrome</strong> или <strong className="text-white">Nothing Browser</strong> на смартфоне → нажмите меню «<strong className="text-white">⋮</strong>» (три точки в углу) → выберите <strong className="text-white">«Установить приложение»</strong> (или «Добавить на главный экран»). Android создаст нативный ярлык и приложение появится в меню вместе с другими программами.
              </p>
            </div>

            {/* Method 2: Standalone .APK via PWABuilder */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1.5">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span className="text-[#D71920]">02.</span> Получение классического файла .APK
              </p>
              <p className="text-white/60 text-[11px] leading-relaxed">
                Чтобы упаковать проект в самостоятельный установочный файл <strong className="text-white">.apk</strong>: скопируйте ссылку плеера, откройте официальный сервис <strong className="text-white">pwabuilder.com</strong> (проект Microsoft) и нажмите <strong className="text-white">«Package for Android»</strong> — сервис мгновенно скомпилирует APK.
              </p>
              <button
                onClick={handleCopyAppUrl}
                className="w-full py-2 px-3 rounded-lg border border-white/20 bg-neutral-900 hover:bg-neutral-800 text-white font-tech text-[11px] flex items-center justify-center gap-2 active:scale-95 transition"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 font-bold">ССЫЛКА СКОПИРОВАНА В БУФЕР!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#D71920]" />
                    <span>СКОПИРОВАТЬ ССЫЛКУ ПРИЛОЖЕНИЯ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SYSTEM INFO */}
        <div className="p-3 text-center rounded-2xl bg-neutral-950 border border-white/10 space-y-1">
          <p className="font-ndot text-[10px] text-white/60 uppercase tracking-widest">
            NOTHING (AUDIO) PLAYER OS // v2.5
          </p>
          <p className="font-tech text-[9px] text-white/30">
            Designed in Nothing style • Чистый звук без рекламы
          </p>
        </div>
      </div>
    </div>
  );
};
