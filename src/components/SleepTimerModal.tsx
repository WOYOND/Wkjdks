import React from 'react';
import { haptics } from '../utils/haptics';
import { Moon, Clock, X, Check } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  activeSeconds: number | null; // null if not active
  onClose: () => void;
  onSetTimer: (minutes: number | null) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  activeSeconds,
  onClose,
  onSetTimer,
}) => {
  if (!isOpen) return null;

  const timerOptions = [
    { label: '5 МИНУТ', minutes: 5 },
    { label: '15 МИНУТ', minutes: 15 },
    { label: '30 МИНУТ', minutes: 30 },
    { label: '45 МИНУТ', minutes: 45 },
    { label: '60 МИНУТ', minutes: 60 },
  ];

  const formatRemaining = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs bg-neutral-900 border border-white/20 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-[#D71920]" />
            <h3 className="font-ndot text-sm text-white uppercase tracking-wider">
              ТАЙМЕР СНА
            </h3>
          </div>
          <button
            onClick={() => {
              haptics.click();
              onClose();
            }}
            className="p-1 rounded-full text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeSeconds !== null && (
          <div className="p-3 mb-3 rounded-2xl bg-black border border-white/15 flex items-center justify-between">
            <div>
              <p className="font-tech text-[10px] text-white/50 uppercase">ДО ВЫКЛЮЧЕНИЯ:</p>
              <p className="font-ndot text-lg text-white font-bold tracking-widest">
                {formatRemaining(activeSeconds)}
              </p>
            </div>
            <button
              onClick={() => {
                haptics.click();
                onSetTimer(null);
              }}
              className="px-2.5 py-1 rounded-lg border border-red-500/30 text-red-400 font-tech text-xs hover:bg-red-500/10"
            >
              СБРОСИТЬ
            </button>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {timerOptions.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => {
                haptics.clack();
                onSetTimer(opt.minutes);
                onClose();
              }}
              className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 hover:border-white/30 flex items-center justify-between text-xs font-tech text-white"
            >
              <span>{opt.label}</span>
              <Clock className="w-3.5 h-3.5 text-white/40" />
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            haptics.click();
            onClose();
          }}
          className="w-full py-2 rounded-xl border border-white/20 text-xs font-tech text-white/70 hover:bg-white/10"
        >
          ЗАКРЫТЬ
        </button>
      </div>
    </div>
  );
};
