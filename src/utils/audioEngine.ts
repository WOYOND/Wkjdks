// Audio Engine with Web Audio Synth, Multi-Band Equalizer, Analyser & HTML5 Audio

import { EQ_FREQUENCIES } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private synthInterval: number | null = null;
  private isSynthesizing = false;
  private synthGainNode: GainNode | null = null;
  private currentEqGains: number[] = [0, 0, 0, 0, 0];
  private isBassBoosted = false;
  private isTrebleBoosted = false;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Analyser node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.82;

    // Master volume gain
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Dedicated Bass booster (sub-bass shelf at 100Hz)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(100, this.ctx.currentTime);
    this.bassFilter.gain.setValueAtTime(0, this.ctx.currentTime);

    // Dedicated Treble booster (high shelf at 8000Hz)
    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(8000, this.ctx.currentTime);
    this.trebleFilter.gain.setValueAtTime(0, this.ctx.currentTime);

    // Build 5-band Equalizer filter chain
    this.eqFilters = EQ_FREQUENCIES.map((freq, index) => {
      const filter = this.ctx!.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.setValueAtTime(1.4, this.ctx!.currentTime);
      }
      filter.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      filter.gain.setValueAtTime(this.currentEqGains[index] || 0, this.ctx!.currentTime);
      return filter;
    });

    // Audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    try {
      this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
      // Connect chain: source -> eq[0] -> ... -> eq[4] -> bassFilter -> trebleFilter -> gainNode -> analyser -> dest
      let previousNode: AudioNode = this.mediaSourceNode;
      for (const filter of this.eqFilters) {
        previousNode.connect(filter);
        previousNode = filter;
      }
      previousNode.connect(this.bassFilter);
      this.bassFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch {
      // Audio element CORS or multiple connect fallback
    }
  }

  public getContext(): AudioContext | null {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getAudioElement(): HTMLAudioElement | null {
    if (!this.audioElement) this.init();
    return this.audioElement;
  }

  public setEqBand(index: number, gainDb: number) {
    this.currentEqGains[index] = gainDb;
    if (this.eqFilters[index] && this.ctx) {
      this.eqFilters[index].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  public setAllEqBands(gains: number[]) {
    this.currentEqGains = [...gains];
    if (this.ctx) {
      this.eqFilters.forEach((filter, index) => {
        if (gains[index] !== undefined) {
          filter.gain.setTargetAtTime(gains[index], this.ctx!.currentTime, 0.05);
        }
      });
    }
  }

  public getEqBands(): number[] {
    return [...this.currentEqGains];
  }

  public setBassBoost(enabled: boolean) {
    this.isBassBoosted = enabled;
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setTargetAtTime(enabled ? 7.5 : 0, this.ctx.currentTime, 0.1);
    }
  }

  public isBassBoost(): boolean {
    return this.isBassBoosted;
  }

  public setTrebleBoost(enabled: boolean) {
    this.isTrebleBoosted = enabled;
    if (this.trebleFilter && this.ctx) {
      this.trebleFilter.gain.setTargetAtTime(enabled ? 5.5 : 0, this.ctx.currentTime, 0.1);
    }
  }

  public isTrebleBoost(): boolean {
    return this.isTrebleBoosted;
  }

  public setVolume(val: number) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, val));
    }
    if (this.synthGainNode && this.ctx) {
      this.synthGainNode.gain.setTargetAtTime(val * 0.4, this.ctx.currentTime, 0.05);
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(16);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  // Synthesize demo tracks with real audio hooked into the EQ
  public startSynthTrack(trackKey: string, initialOffset = 0, onTimeUpdate?: (time: number) => void) {
    this.stopSynth();
    const ctx = this.getContext();
    if (!ctx) return;

    this.isSynthesizing = true;
    const synthGain = ctx.createGain();
    synthGain.gain.setValueAtTime(0.35, ctx.currentTime);
    this.synthGainNode = synthGain;

    // Connect synth output to first EQ band filter
    if (this.eqFilters.length > 0) {
      synthGain.connect(this.eqFilters[0]);
    } else if (this.analyser) {
      synthGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    } else {
      synthGain.connect(ctx.destination);
    }

    const scaleA = [110, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];
    const scaleB = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16];
    const scaleC = [98.00, 123.47, 146.83, 174.61, 196.00, 246.94, 293.66, 349.23, 392.00, 493.88];

    let currentScale = scaleA;
    let bpm = 124;
    let rhythmType = 'synthwave';

    if (trackKey.includes('02') || trackKey.includes('monochrome')) {
      currentScale = scaleB;
      bpm = 98;
      rhythmType = 'ambient';
    } else if (trackKey.includes('03') || trackKey.includes('neon')) {
      currentScale = scaleC;
      bpm = 132;
      rhythmType = 'cyber';
    } else if (trackKey.includes('04') || trackKey.includes('transparent')) {
      currentScale = scaleA;
      bpm = 85;
      rhythmType = 'deep';
    }

    const stepDuration = 60 / bpm / 2;
    let step = Math.floor(initialOffset / stepDuration);
    let currentTimeSec = initialOffset;

    const playStep = () => {
      if (!this.isSynthesizing || !this.ctx) return;
      const t = this.ctx.currentTime;

      // Kick
      if (step % 4 === 0 || (rhythmType === 'cyber' && step % 2 === 0)) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

        kickGain.gain.setValueAtTime(0.7, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        kickOsc.connect(kickGain);
        kickGain.connect(synthGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.22);
      }

      // Snare
      if (step % 8 === 4) {
        const snareNoise = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
        const data = snareNoise.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = snareNoise;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, t);

        const snareGain = this.ctx.createGain();
        snareGain.gain.setValueAtTime(0.28, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        noiseNode.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(synthGain);
        noiseNode.start(t);
        noiseNode.stop(t + 0.14);
      }

      // Lead Synth
      const noteIndex = (step * 3) % currentScale.length;
      const noteFreq = currentScale[noteIndex];

      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = rhythmType === 'ambient' ? 'sine' : 'sawtooth';
      leadOsc.frequency.setValueAtTime(noteFreq, t);

      leadGain.gain.setValueAtTime(0.18, t);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

      leadOsc.connect(leadGain);
      leadGain.connect(synthGain);
      leadOsc.start(t);
      leadOsc.stop(t + stepDuration);

      // Bass drone
      if (step % 8 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        const rootBass = currentScale[0] / 2;
        bassOsc.frequency.setValueAtTime(rootBass, t);
        bassGain.gain.setValueAtTime(0.35, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 7.5);

        bassOsc.connect(bassGain);
        bassGain.connect(synthGain);
        bassOsc.start(t);
        bassOsc.stop(t + stepDuration * 8);
      }

      step++;
      currentTimeSec += stepDuration;
      if (onTimeUpdate) {
        onTimeUpdate(currentTimeSec);
      }
    };

    this.synthInterval = window.setInterval(playStep, stepDuration * 1000);
  }

  public stopSynth() {
    this.isSynthesizing = false;
    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthGainNode && this.ctx) {
      try {
        this.synthGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        this.synthGainNode.disconnect();
      } catch {}
      this.synthGainNode = null;
    }
  }

  public isSynthActive(): boolean {
    return this.isSynthesizing;
  }
}

export const audioEngine = new AudioEngine();
