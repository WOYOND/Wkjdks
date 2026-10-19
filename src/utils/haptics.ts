// Nothing OS Tactile Haptics & Mechanical Sound Engine

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let hapticsEnabled = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const haptics = {
  isSoundEnabled: () => soundEnabled,
  setSoundEnabled: (enabled: boolean) => {
    soundEnabled = enabled;
  },
  isHapticsEnabled: () => hapticsEnabled,
  setHapticsEnabled: (enabled: boolean) => {
    hapticsEnabled = enabled;
  },

  // Subtle mechanical Nothing OS switch click
  click: (frequency = 1200) => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Ignore audio autoplay restrictions
    }
  },

  // Rotary / wheel tick
  tick: () => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(6);
    }
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    } catch {
      // silent
    }
  },

  // Deep mechanical clack (e.g. play / pause)
  clack: () => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([18, 10, 12]);
    }
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.045);
    } catch {
      // silent
    }
  }
};
