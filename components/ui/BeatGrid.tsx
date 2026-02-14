import React, { useRef, useEffect } from 'react';

interface BeatGridProps {
  lyrics: string;
  bpm: number;
  timeSignature?: string;
  isPlaying?: boolean;
}

export const BeatGrid: React.FC<BeatGridProps> = ({ 
  lyrics, 
  bpm, 
  timeSignature = '4/4',
  isPlaying = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const lines = lyrics.split('\n').filter(l => l.trim());
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]) || 4;
  const msPerBeat = (60 / bpm) * 1000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const lineHeight = height / Math.max(lines.length, 1);
    const beatWidth = width / beatsPerMeasure;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < beatsPerMeasure; i++) {
      ctx.strokeStyle = i === 0 ? '#8b5cf6' : '#334155';
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(i * beatWidth, 0);
      ctx.lineTo(i * beatWidth, height);
      ctx.stroke();
    }

    ctx.font = '12px JetBrains Mono';
    lines.forEach((line, idx) => {
      const y = idx * lineHeight + lineHeight / 2;
      const words = line.split(/\s+/);
      
      let currentX = 10;
      words.forEach((word, wordIdx) => {
        const syllableCount = (word.match(/[aeiouáéíóúůýě]/gi) || []).length || 1;
        const estimatedBeats = Math.min(syllableCount, 4);
        
        const wordWidth = ctx.measureText(word).width;
        
        const isTag = word.startsWith('[');
        if (isTag) {
          ctx.fillStyle = '#8b5cf6';
          ctx.font = 'bold 12px JetBrains Mono';
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px JetBrains Mono';
        }
        
        ctx.fillText(word, currentX, y);
        currentX += wordWidth + 8;
      });
    });

  }, [lyrics, bpm, beatsPerMeasure, lines.length]);

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-surface-200">🎵 Beat Grid</h4>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-surface-400">{bpm} BPM</span>
          <span className="text-surface-500">{timeSignature}</span>
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        className="w-full rounded-lg"
        style={{ height: Math.max(200, lines.length * 28) }}
      />
      <div className="flex justify-between mt-2 text-xs text-surface-500">
        <span>1</span>
        <span>{beatsPerMeasure}</span>
      </div>
    </div>
  );
};

export const MiniBeatGrid: React.FC<{ bpm: number; timeSignature?: string }> = ({ 
  bpm, 
  timeSignature = '4/4' 
}) => {
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]) || 4;
  const msPerBeat = (60 / bpm) * 1000;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: beatsPerMeasure }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-6 rounded-full transition-all ${
            i === 0 
              ? 'bg-primary-500' 
              : 'bg-surface-600'
          }`}
        />
      ))}
    </div>
  );
};

export default BeatGrid;
