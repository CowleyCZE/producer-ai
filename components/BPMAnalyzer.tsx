import React, { useState, useEffect } from 'react';
import { analyzeBPM, getFlowIntensity } from '../utils/bpmAnalysis';
import { BeatGrid, MiniBeatGrid } from './ui/BeatGrid';
import { LyricSegment } from '../types';

interface BPMAnalyzerProps {
  lyrics: string;
  context: string;
  segments: LyricSegment[];
}

export const BPMAnalyzer: React.FC<BPMAnalyzerProps> = ({ lyrics, context, segments }) => {
  const [bpm, setBpm] = useState(100);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [confidence, setConfidence] = useState(0);
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    if (!lyrics.trim()) return;
    const result = analyzeBPM(lyrics, context);
    setBpm(result.bpm);
    setTimeSignature(result.timeSignature);
    setConfidence(result.confidence);
  }, [lyrics, context]);

  const flowIntensity = getFlowIntensity(segments);

  const adjustBpm = (delta: number) => {
    setBpm(prev => Math.max(40, Math.min(220, prev + delta)));
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-surface-200">🎵 BPM Analyzer</h3>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="btn-ghost text-xs py-1 px-2"
        >
          {showGrid ? 'Skrýt grid' : 'Zobrazit grid'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 mb-6">
        <button
          onClick={() => adjustBpm(-5)}
          className="w-10 h-10 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-xl"
        >
          -
        </button>
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">{bpm}</div>
          <div className="text-xs text-surface-500 uppercase tracking-widest">BPM</div>
        </div>
        <button
          onClick={() => adjustBpm(5)}
          className="w-10 h-10 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-xl"
        >
          +
        </button>
      </div>

      <div className="flex justify-center mb-4">
        <MiniBeatGrid bpm={bpm} timeSignature={timeSignature} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-surface-800 rounded-lg">
          <div className="text-xs text-surface-500 mb-1">Time Signature</div>
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.target.value)}
            className="w-full bg-surface-700 border-none rounded px-2 py-1 text-sm"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
            <option value="2/4">2/4</option>
          </select>
        </div>
        <div className="p-3 bg-surface-800 rounded-lg">
          <div className="text-xs text-surface-500 mb-1">Jistota</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-surface-400">{Math.round(confidence * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-surface-800 rounded-lg mb-4">
        <div className="text-xs text-surface-500 mb-1">Flow Intensity</div>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <button
              key={level}
              onClick={() => {}}
              className={`flex-1 py-2 rounded text-xs font-semibold transition-all ${
                flowIntensity === level
                  ? level === 'low' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                    level === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                    'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-surface-700 text-surface-500'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {showGrid && lyrics.trim() && (
        <BeatGrid lyrics={lyrics} bpm={bpm} timeSignature={timeSignature} />
      )}
    </div>
  );
};

export default BPMAnalyzer;
