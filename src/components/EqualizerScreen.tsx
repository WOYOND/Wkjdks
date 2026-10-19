import React, { useState } from 'react';
import { EqualizerPreset, EQ_FREQUENCIES, EQ_FREQUENCY_LABELS } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { localSettings } from '../utils/storage';
import { haptics } from '../utils/haptics';
import { Sliders, Plus, Trash2, Check, RotateCcw, Volume2, Sparkles } from 'lucide-react';

interface EqualizerScreenProps {
  onBack: () => void;
}

export const EqualizerScreen: React.FC<EqualizerScreenProps> = ({ onBack }) => {
  const [presets, setPresets] = useState<EqualizerPreset[]>(() => localSettings.loadEqPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => localSettings.loadActivePresetId());
  const [bands, setBands] = useState<number[]>(() => audioEngine.getEqBands());
  const [bassBoost, setBassBoost] = useState<boolean>(() => audioEngine.isBassBoost());
  const [trebleBoost, setTrebleBoost] = useState<boolean>(() => audioEngine.isTrebleBoost());

  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const handleSelectPreset = (preset: EqualizerPreset) => {
    haptics.click();
    setActivePresetId(preset.id);
    localSettings.saveActivePresetId(preset.id);
    setBands([...preset.bands]);
    audioEngine.setAllEqBands(preset.bands);
  };

  const handleBandChange = (index: number, val: number) => {
    haptics.tick();
    const updated = [...bands];
    updated[index] = val;
    setBands(updated);
    audioEngine.setEqBand(index, val);
    // Mark as custom preset
    setActivePresetId('custom');
  };

  const handleToggleBassBoost = () => {
    haptics.click();
    const next = !bassBoost;
    setBassBoost(next);
    audioEngine.setBassBoost(next);
  };

  const handleToggleTrebleBoost = () => {
    haptics.click();
    const next = !trebleBoost;
    setTrebleBoost(next);
    audioEngine.setTrebleBoost(next);
  };

  const handleResetBands = () => {
    haptics.clack();
    const flat = [0, 0, 0, 0, 0];
    setBands(flat);
    audioEngine.setAllEqBands(flat);
    setActivePresetId('flat');
    localSettings.saveActivePresetId('flat');
  };

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    haptics.clack();
    const newPreset: EqualizerPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim().toUpperCase(),
      bands: [...bands],
      isCustom: true,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localSettings.saveEqPresets(updated);
    setActivePresetId(newPreset.id);
    localSettings.saveActivePresetId(newPreset.id);
    setNewPresetName('');
    setShowSaveModal(false);
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.click();
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localSettings.saveEqPresets(updated);
    if (activePresetId === id) {
      setActivePresetId('flat');
      localSettings.saveActivePresetId('flat');
    }
  };

  // Generate SVG curve points for frequency response curve
  // Width 280, Height 90, Center Y = 45
  const svgWidth = 280;
  const svgHeight = 90;
  const paddingX = 24;
  const usableWidth = svgWidth - paddingX * 2;
  const stepX = usableWidth / (bands.length - 1);

  const points = bands.map((db, idx) => {
    const x = paddingX + idx * stepX;
    // -12 dB is bottom (svgHeight - 12), +12 dB is top (12), 0 dB is svgHeight / 2
    const normalized = (db / 12); // -1 to 1
    const y = svgHeight / 2 - normalized * (svgHeight / 2 - 12);
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div className="flex flex-col h-full bg-black text-white px-4 py-3 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptics.click();
              onBack();
            }}
            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 text-white/80"
          >
            ←
          </button>
          <div>
            <h1 className="font-ndot text-sm tracking-wider uppercase flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#D71920]" />
              EQUALIZER // ЭКВАЛАЙЗЕР
            </h1>
            <p className="font-tech text-[10px] text-white/40">ПАРАМЕТРИЧЕСКИЙ 5-ПОЛОСНЫЙ ФИЛЬТР</p>
          </div>
        </div>

        <button
          onClick={handleResetBands}
          className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1 font-tech"
          title="Сбросить в 0 dB"
        >
          <RotateCcw className="w-3 h-3" /> СБРОС
        </button>
      </div>

      {/* Preset Chips Carousel */}
      <div className="my-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-ndot text-[11px] text-white/60 uppercase tracking-widest">
            ПРЕСЕТЫ ЗВУЧАНИЯ
          </span>
          <button
            onClick={() => {
              haptics.click();
              setShowSaveModal(true);
            }}
            className="flex items-center gap-1 font-tech text-[11px] text-[#D71920] hover:text-white transition"
          >
            <Plus className="w-3 h-3" /> СОХРАНИТЬ СВОЙ
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`flex-shrink-0 cursor-pointer px-3 py-1.5 rounded-full border transition-all flex items-center gap-2 text-xs font-tech select-none ${
                  isActive
                    ? 'border-white bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                    : 'border-white/20 text-white/70 hover:border-white/50 hover:bg-white/5'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D71920]" />}
                <span>{preset.name}</span>
                {preset.isCustom && (
                  <button
                    onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                    className="ml-1 p-0.5 rounded-full hover:bg-red-500/20 text-red-400"
                    title="Удалить пресет"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Frequency Response Visual Curve */}
      <div className="relative rounded-2xl bg-neutral-950/80 border border-white/10 p-3 mb-4">
        <div className="flex items-center justify-between text-[10px] font-tech text-white/40 mb-1">
          <span>+12 dB</span>
          <span className="font-ndot uppercase text-[9px] text-white/50">ЧАСТОТНЫЙ ОТКЛИК</span>
          <span>-12 dB</span>
        </div>

        <div className="w-full flex justify-center">
          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            {/* Background grid lines */}
            <line x1={0} y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#333" strokeDasharray="3 3" />
            <line x1={0} y1={12} x2={svgWidth} y2={12} stroke="#1f1f1f" strokeDasharray="2 2" />
            <line x1={0} y1={svgHeight - 12} x2={svgWidth} y2={svgHeight - 12} stroke="#1f1f1f" strokeDasharray="2 2" />

            {/* Glowing EQ curve */}
            <path d={pathD} fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
            <path d={pathD} fill="none" stroke="#D71920" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            {/* Points on curve */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r={5} fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx={pt.x} cy={pt.y} r={2} fill={bands[i] !== 0 ? '#D71920' : '#FFFFFF'} />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* 5 Vertical Band Sliders */}
      <div className="grid grid-cols-5 gap-2 px-1 mb-5">
        {EQ_FREQUENCIES.map((freq, idx) => {
          const val = bands[idx] || 0;
          return (
            <div key={freq} className="flex flex-col items-center select-none">
              {/* Value indicator in dB */}
              <span
                className={`font-ndot text-[11px] mb-2 tracking-tight ${
                  val > 0
                    ? 'text-white font-bold'
                    : val < 0
                    ? 'text-white/60'
                    : 'text-white/30'
                }`}
              >
                {val > 0 ? `+${val}` : val}
              </span>

              {/* Vertical Slider Track Container */}
              <div className="relative h-44 w-10 flex items-center justify-center bg-neutral-900/60 rounded-2xl border border-white/10 p-1">
                {/* Center 0 dB marker */}
                <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-white/20 pointer-events-none" />

                {/* HTML vertical input */}
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={val}
                  onChange={(e) => handleBandChange(idx, parseInt(e.target.value, 10))}
                  className="h-36 w-6 -rotate-90 cursor-pointer accent-white"
                />
              </div>

              {/* Frequency Label */}
              <span className="font-tech text-[10px] text-white/50 mt-2 text-center">
                {EQ_FREQUENCY_LABELS[idx]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sound Enhancers / Hardware Toggles */}
      <div className="space-y-2 mt-auto pt-2 border-t border-white/10">
        <span className="font-ndot text-[10px] text-white/50 uppercase tracking-widest">
          АППАРАТНЫЕ УСИЛИТЕЛИ
        </span>

        <div className="grid grid-cols-2 gap-3">
          {/* Bass Boost Toggle Card */}
          <div
            onClick={handleToggleBassBoost}
            className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-center justify-between select-none ${
              bassBoost
                ? 'border-[#D71920] bg-neutral-950 shadow-[0_0_15px_rgba(215,25,32,0.2)]'
                : 'border-white/10 bg-neutral-950/60 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Volume2 className={`w-4 h-4 ${bassBoost ? 'text-[#D71920]' : 'text-white/40'}`} />
              <div>
                <p className="font-ndot text-[11px] text-white uppercase">BASS BOOST</p>
                <p className="font-tech text-[9px] text-white/40">+7.5 dB SUB-BASS</p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                bassBoost ? 'border-[#D71920] bg-[#D71920]' : 'border-white/30'
              }`}
            >
              {bassBoost && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>

          {/* Treble Boost Toggle Card */}
          <div
            onClick={handleToggleTrebleBoost}
            className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-center justify-between select-none ${
              trebleBoost
                ? 'border-white bg-neutral-950 shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                : 'border-white/10 bg-neutral-950/60 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${trebleBoost ? 'text-white' : 'text-white/40'}`} />
              <div>
                <p className="font-ndot text-[11px] text-white uppercase">TREBLE</p>
                <p className="font-tech text-[9px] text-white/40">+5.5 dB 8kHz</p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                trebleBoost ? 'border-white bg-white' : 'border-white/30'
              }`}
            >
              {trebleBoost && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </div>
          </div>
        </div>
      </div>

      {/* Save Custom Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-neutral-900 border border-white/20 rounded-2xl p-5 shadow-2xl">
            <h2 className="font-ndot text-sm text-white uppercase tracking-wider mb-2">
              СОХРАНИТЬ ПРЕСЕТ
            </h2>
            <p className="font-tech text-xs text-white/50 mb-3">
              Текущие параметры полос будут сохранены в память плеера:
            </p>
            <input
              type="text"
              autoFocus
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="НАПРИМЕР: CLUB BASS 01"
              className="w-full px-3 py-2 bg-black border border-white/30 rounded-xl text-xs font-tech text-white uppercase placeholder:text-white/30 focus:outline-none focus:border-white mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCustomPreset();
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-tech text-white/70 hover:bg-white/10"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleSaveCustomPreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-1.5 rounded-lg bg-white text-black font-bold text-xs font-tech disabled:opacity-30 hover:bg-neutral-200 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> СОХРАНИТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
