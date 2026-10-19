import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../utils/audioEngine';

interface VisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numCols = 16;
    const dotsPerCol = 10;
    const dotSize = 4;
    const gap = 3;

    let peakLevels = new Array(numCols).fill(0);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let freqs: Uint8Array = new Uint8Array(numCols);
      if (isPlaying) {
        const raw = audioEngine.getFrequencyData();
        // Sample 16 bins across spectrum
        const step = Math.floor(raw.length / numCols);
        for (let i = 0; i < numCols; i++) {
          freqs[i] = raw[i * step] || 0;
        }
      } else {
        // Idle heartbeat dot pattern
        const time = Date.now() / 1000;
        for (let i = 0; i < numCols; i++) {
          freqs[i] = Math.floor((Math.sin(time * 2 + i * 0.4) + 1) * 20 + 10);
        }
      }

      const totalWidth = numCols * (dotSize + gap) - gap;
      const startX = Math.floor((canvas.width - totalWidth) / 2);
      const totalHeight = dotsPerCol * (dotSize + gap) - gap;
      const startY = Math.floor((canvas.height - totalHeight) / 2);

      for (let col = 0; col < numCols; col++) {
        const val = freqs[col] / 255; // 0..1
        const activeDots = Math.min(dotsPerCol, Math.round(val * dotsPerCol * 1.2));

        if (activeDots > peakLevels[col]) {
          peakLevels[col] = activeDots;
        } else {
          peakLevels[col] = Math.max(0, peakLevels[col] - 0.08);
        }

        for (let row = 0; row < dotsPerCol; row++) {
          // Bottom to top: row 0 is bottom
          const dotRowFromBottom = dotsPerCol - 1 - row;
          const x = startX + col * (dotSize + gap);
          const y = startY + row * (dotSize + gap);

          const isActive = dotRowFromBottom < activeDots;
          const isPeak = Math.floor(peakLevels[col]) === dotRowFromBottom && activeDots > 1;

          if (isPeak && isPlaying) {
            ctx.fillStyle = '#D71920'; // Nothing Red peak indicator
            ctx.fillRect(x, y, dotSize, dotSize);
          } else if (isActive) {
            // Bright white for active
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x, y, dotSize, dotSize);
          } else {
            // Muted dark dot for matrix background
            ctx.fillStyle = '#1c1c1c';
            ctx.fillRect(x, y, dotSize, dotSize);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-950/80 border border-white/10 ${className}`}>
      <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[9px] font-ndot text-white/50 tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        SPECTRUM // 16-BAND
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={90}
        className="w-full h-full max-h-[100px] object-contain my-2"
      />
    </div>
  );
};
